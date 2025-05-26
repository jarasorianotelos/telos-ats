import { useEffect, useState } from "react";
import { User, Client } from "@/types";
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
import CreateClientDialog from "@/components/clients/CreateClientDialog";
import EditClientDialog from "@/components/clients/EditClientDialog";
import { formatDateToEST } from "@/lib/utils";
import ClientJobOrdersDialog from "@/components/clients/ClientJobOrdersDialog";
import { useAuth } from "@/contexts/AuthContext";

export default function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isJobOrdersDialogOpen, setIsJobOrdersDialogOpen] = useState(false);

  // Check if user has admin rights
  const isAdmin = user?.role === "administrator";

  useEffect(() => {
    fetchClients();

    // Set up real-time subscription
    const clientsSubscription = supabase
      .channel("clients-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        () => {
          fetchClients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(clientsSubscription);
    };
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("clients")
        .select(
          `
          *,
          author:users(first_name, last_name),
          joborder(count)
        `
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Error",
        description: "Failed to load clients. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClient = async (id: string) => {
    try {
      // Soft delete by setting deleted_at
      const { error } = await supabase
        .from("clients")
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Client deleted successfully!",
      });

      // Refresh the list
      fetchClients();
    } catch (error) {
      console.error("Error deleting client:", error);
      toast({
        title: "Error",
        description: "Failed to delete client. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      client.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // If user is not an admin, redirect or show access denied
  if (!isAdmin) {
    return (
      <div className="flex h-screen">
        <Sidebar />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />

          <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
            <div className="max-w-7xl mx-auto text-center py-12">
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                You don't have permission to access the Clients Management page.
                This page is only available to administrators.
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header  />

        <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h2 className="text-xl font-semibold">Clients Management</h2>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-3 sm:mt-0">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search clients..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Client
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
            ) : filteredClients.length > 0 ? (
              <div className="bg-white rounded-md shadow overflow-hidden">
                <Table>
                  <TableHeader className="bg-primary text-primary-foreground font-bold">
                    <TableRow>
                      <TableHead className="text-white">Name</TableHead>
                      <TableHead className="text-white">Company</TableHead>
                      <TableHead className="text-white">Position</TableHead>
                      <TableHead className="text-white">Contact</TableHead>
                      <TableHead className="text-white">Location</TableHead>
                      <TableHead className="text-white text-center">
                        Job Orders
                      </TableHead>
                      <TableHead className="text-white">Added By</TableHead>
                      <TableHead className="text-white">Created Date</TableHead>
                      <TableHead className="text-center text-white">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">
                          {client.first_name} {client.last_name}
                        </TableCell>
                        <TableCell>{client.company}</TableCell>
                        <TableCell>{client.position}</TableCell>
                        <TableCell>
                          <div>
                            <p>{client.email}</p>
                            {client.phone && (
                              <p className="text-xs text-muted-foreground">
                                {client.phone}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{client.location}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="link"
                            className="p-0 h-auto "
                            onClick={() => {
                              setSelectedClient(client);
                              setIsJobOrdersDialogOpen(true);
                            }}
                          >
                            {client.joborder?.[0]?.count || 0}
                          </Button>
                        </TableCell>
                        <TableCell>
                          {client.author.first_name} {client.author.last_name}
                        </TableCell>
                        <TableCell>
                          {client.created_at
                            ? formatDateToEST(client.created_at, "MMM d, yyyy")
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedClient(client);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClient(client.id)}
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
                    ? "No clients match your search criteria."
                    : "No clients found. Add your first client to get started."}
                </p>
                <Button
                  className="mt-4"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Client
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      <CreateClientDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          setIsCreateDialogOpen(false);
          fetchClients();
        }}
        user={user}
      />

      {selectedClient && (
        <>
          <EditClientDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            client={selectedClient}
            onSuccess={() => {
              setIsEditDialogOpen(false);
              setSelectedClient(null);
              fetchClients();
            }}
          />
          <ClientJobOrdersDialog
            open={isJobOrdersDialogOpen}
            onOpenChange={setIsJobOrdersDialogOpen}
            client={selectedClient}
          />
        </>
      )}
    </div>
  );
}
