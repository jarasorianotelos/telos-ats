import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut, updateUserProfile } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { User } from "@/types";
import { LogOut, Settings, User as UserIcon, Inbox } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import RecentUpdatesDialog from "@/components/updates/RecentUpdatesDialog";

interface HeaderProps {
  user: User | null;
}

const Header: React.FC<HeaderProps> = ({ user }) => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    email: user?.email || "",
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not sign out. Please try again.",
      });
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    setIsUpdating(true);
    try {
      const { error } = await updateUserProfile(user.id, {
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      setIsProfileOpen(false);

      // Force refresh to update user data
      window.location.reload();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update profile. Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-4 flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome, {user?.first_name || "User"}!
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <RecentUpdatesDialog />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {user?.username || "User"}
          </h1>
        </div>

        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full"
              >
                <Avatar className="h-10 w-10 cursor-pointer">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback className="bg-ats-blue-600 text-white">
                    {user?.first_name?.charAt(0)}
                    {user?.last_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Edit Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-center mb-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback className="bg-ats-blue-600 text-white text-xl">
                  {user?.first_name?.charAt(0)}
                  {user?.last_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={profileData.first_name}
                  onChange={handleProfileChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={profileData.last_name}
                  onChange={handleProfileChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                value={profileData.email}
                onChange={handleProfileChange}
                disabled
              />
              <p className="text-xs text-gray-500">
                Email cannot be changed. Contact an administrator for
                assistance.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={user?.username || ""} disabled />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProfileOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProfile} disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Header;
