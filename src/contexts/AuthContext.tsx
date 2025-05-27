import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const userData: User = {
          id: session.user.id,
          email: session.user.email || "",
          first_name: session.user.user_metadata.first_name || "",
          last_name: session.user.user_metadata.last_name || "",
          username: session.user.user_metadata.username || "",
          role: session.user.user_metadata.role || "administrator",
          created_at: session.user.created_at,
          updated_at: null,
          deleted_at: null,
        };
        setUser(userData);
      }
      setLoading(false);
    });

    // Listen for changes on auth state
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const userData: User = {
          id: session.user.id,
          email: session.user.email || "",
          first_name: session.user.user_metadata.first_name || "",
          last_name: session.user.user_metadata.last_name || "",
          username: session.user.user_metadata.username || "",
          role: session.user.user_metadata.role || "administrator",
          created_at: session.user.created_at,
          updated_at: null,
          deleted_at: null,
        };
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
} 