import { User } from "@/types";
import { useState } from "react";
import Sidebar from "../layout/Sidebar";
import { signOut } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface LayoutProps {
  user: User | null;
  children: React.ReactNode;
  pageTitle?: string;
}

export const Layout = ({ user, children, pageTitle }: LayoutProps) => {
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login");
      toast({
        title: "Signed out successfully",
      });
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 border-b bg-white shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
            <div className="ml-auto flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
              >
                Sign out
              </Button>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
};