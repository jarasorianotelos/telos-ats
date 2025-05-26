import { useEffect, useState, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { supabase } from "./lib/supabase";
import { User } from "./types";
import { toast } from "@/components/ui/use-toast";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoadingSpinner from "@/components/LoadingSpinner";
import React from "react";
import Commission from "@/pages/Commission";

// Lazy load pages
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const JobOrders = lazy(() => import("@/pages/JobOrders"));
const JobOrderDetail = lazy(() => import("@/pages/JobOrderDetail"));
const Applicants = lazy(() => import("@/pages/Applicants"));
const Clients = lazy(() => import("@/pages/Clients"));
const Users = lazy(() => import("@/pages/Users"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Pipeline = lazy(() => import("@/pages/Pipeline"));
const Settings = lazy(() => import("@/pages/Settings"));
const Logs = lazy(() => import("@/pages/Logs"));
const Favorites = lazy(() => import("@/pages/Favorites"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for user session on initial load
    const checkUser = async () => {
      try {
        const { data } = await supabase.auth.getSession();

        if (data.session?.user) {
          try {
            // Get user metadata from auth user
            const { data: authData } = await supabase.auth.getUser();

            if (authData.user) {
              const userData: User = {
                id: authData.user.id,
                email: authData.user.email || "",
                first_name: authData.user.user_metadata.first_name || "",
                last_name: authData.user.user_metadata.last_name || "",
                username: authData.user.user_metadata.username || "",
                role: authData.user.user_metadata.role || "recruiter",
                created_at: authData.user.created_at,
                updated_at: null,
                deleted_at: null,
              };

              setUser(userData);
            }
          } catch (profileError) {
            console.error("Error fetching user profile:", profileError);
            // Sign out if profile cannot be fetched
            await supabase.auth.signOut();
            setUser(null);
            toast({
              title: "Authentication Error",
              description: "Please sign in again.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error("Error checking auth state:", error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          try {
            // Get user metadata from auth user
            const userData: User = {
              id: session.user.id,
              email: session.user.email || "",
              first_name: session.user.user_metadata.first_name || "",
              last_name: session.user.user_metadata.last_name || "",
              username: session.user.user_metadata.username || "",
              role: session.user.user_metadata.role || "recruiter",
              created_at: session.user.created_at || new Date().toISOString(),
              updated_at: null,
              deleted_at: null,
            };

            setUser(userData);
          } catch (error) {
            console.error("Error fetching user profile on auth change:", error);
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Auth guard component
  const ProtectedRouteComponent = ({
    children,
  }: {
    children: React.ReactNode;
  }) => {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ats-blue-600"></div>
        </div>
      );
    }

    if (!user) {
      return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route
                path="/login"
                element={!user ? <Login /> : <Navigate to="/" replace />}
              />
              <Route
                path="/register"
                element={!user ? <Register /> : <Navigate to="/" replace />}
              />

              <Route
                path="/"
                element={
                  <ProtectedRouteComponent>
                    <Dashboard />
                  </ProtectedRouteComponent>
                }
              />

              <Route
                path="/job-orders"
                element={
                  <ProtectedRouteComponent>
                    <JobOrders />
                  </ProtectedRouteComponent>
                }
              />

              <Route
                path="/favorites"
                element={
                  <ProtectedRouteComponent>
                    <Favorites />
                  </ProtectedRouteComponent>
                }
              />

              <Route
                path="/job-orders/:id"
                element={
                  <ProtectedRouteComponent>
                    <JobOrderDetail />
                  </ProtectedRouteComponent>
                }
              />

              <Route
                path="/applicants"
                element={
                  <ProtectedRouteComponent>
                    <Applicants />
                  </ProtectedRouteComponent>
                }
              />

              <Route
                path="/clients"
                element={
                  <ProtectedRouteComponent>
                    <Clients />
                  </ProtectedRouteComponent>
                }
              />

              <Route
                path="/pipeline"
                element={
                  <ProtectedRouteComponent>
                    <Pipeline />
                  </ProtectedRouteComponent>
                }
              />

              <Route
                path="/users"
                element={
                  <ProtectedRouteComponent>
                    <Users />
                  </ProtectedRouteComponent>
                }
              />

              <Route
                path="/settings"
                element={
                  <ProtectedRouteComponent>
                    <Settings />
                  </ProtectedRouteComponent>
                }
              />

              <Route
                path="/commission"
                element={
                  <ProtectedRouteComponent>
                    <Commission user={user} />
                  </ProtectedRouteComponent>
                }
              />

              <Route
                path="/logs"
                element={
                  <ProtectedRouteComponent>
                    <Logs user={user} />
                    </ProtectedRouteComponent>
                }
              />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <Toaster />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
