import { useEffect, useState } from "react";
import { User } from "@/types";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import CreateUserDialog from "@/components/Users/CreateUserDialog";
import EditUserDialog from "@/components/Users/EditUserDialog";
import { formatDateToEST } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();

    // Set up real-time subscription
    const usersSubscription = supabase
      .channel("users-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(usersSubscription);
    };
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h2 className="text-xl font-semibold">Users</h2>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-3 sm:mt-0">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or username..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New User
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-md shadow overflow-hidden">
                <div className="animate-pulse">
                  <div className="h-14 bg-gray-200"></div>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 border-t border-gray-200">
                      <div className="flex p-4">
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="w-24 h-8 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="bg-white rounded-md shadow overflow-hidden">
                <Table>
                  <TableHeader className="bg-primary text-primary-foreground font-bold">
                    <TableRow>
                      <TableHead className="text-white">Name</TableHead>
                      <TableHead className="text-white">Email</TableHead>
                      <TableHead className="text-white">Username</TableHead>
                      <TableHead className="text-white">Role</TableHead>
                      <TableHead className="text-white">Created At</TableHead>
                      <TableHead className="text-center text-white">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.first_name} {user.last_name}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell className="capitalize">
                          {user.role}
                        </TableCell>
                        <TableCell>
                          {formatDateToEST(user.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const { error } = await supabase
                                    .from("users")
                                    .update({
                                      deleted_at: new Date().toISOString(),
                                    })
                                    .eq("id", user.id);

                                  if (error) throw error;

                                  toast({
                                    title: "Success",
                                    description: "User deleted successfully",
                                  });

                                  // Refresh the users list
                                  fetchUsers();
                                } catch (error) {
                                  console.error("Error deleting user:", error);
                                  toast({
                                    title: "Error",
                                    description: "Failed to delete user",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  {searchTerm
                    ? "No users match your search criteria."
                    : "No users found. Add your first user to get started."}
                </p>
                <Button
                  className="mt-4"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      <CreateUserDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          setIsCreateDialogOpen(false);
          fetchUsers();
        }}
      />

      {selectedUser && (
        <EditUserDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          user={selectedUser}
          onSuccess={() => {
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}
