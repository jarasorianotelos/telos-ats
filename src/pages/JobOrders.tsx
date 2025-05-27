import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { User, JobOrder } from "@/types";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Plus, Filter } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import JobOrderCard from "@/components/job-orders/JobOrderCard";
import CreateJobOrderDialog from "@/components/job-orders/CreateJobOrderDialog";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const JobOrders = () => {
  const { user } = useAuth();
  const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const navigate = useNavigate();

  const fetchJobOrders = useCallback(async () => {
    try {
      setLoading(true);

      // Conditionally build the select statement based on user role
      const selectQuery = user?.role === "recruiter" 
        ? "*" // Only select joborder fields for recruitment role
        : `*, clients(first_name, last_name, company)`; // Select with client details for other roles

      let query = supabase
        .from("joborder")
        .select(selectQuery)
        .is('deleted_at', null)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") query = query.eq("status", statusFilter);

      query = query.eq("archived", showArchived);

      const { data, error } = await query;

      if (error) throw error;

      const jobOrdersWithCounts = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data || []).map(async (job: any) => {
          const { count } = await supabase
            .from("joborder_applicant")
            .select("*", { count: "exact", head: true })
            .eq("joborder_id", job.id)
            .is('deleted_at', null);

          return {
            ...job,
            applicant_count: count || 0,
          } as JobOrder;
        })
      );

      setJobOrders(jobOrdersWithCounts);
    } catch (error) {
      console.error("Error fetching job orders:", error);
      toast({
        title: "Error",
        description: "Failed to load job orders. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showArchived, user?.role]);

  useEffect(() => {
    fetchJobOrders();

    const jobOrderSubscription = supabase
      .channel("job-order-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "joborder" }, () => {
        fetchJobOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(jobOrderSubscription);
    };
  }, [fetchJobOrders]);

  const handleCardClick = (jobId: string) => {
    navigate(`/job-orders/${jobId}`);
  };

  const filteredJobOrders = jobOrders.filter((job) =>
    job.job_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h2 className="text-xl font-semibold">Job Orders</h2>

              <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full sm:w-auto mt-3 sm:mt-0">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search job titles..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <SelectValue placeholder="Filter by status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {[
                      "Kickoff",
                      "Sourcing",
                      "Internal Interview",
                      "Internal Assessment",
                      "Client Endorsement",
                      "Client Assessment",
                      "Client Interview",
                      "Offer",
                      "Hire",
                      "On-hold",
                      "Canceled",
                    ].map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                  <>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="show-archived"
                        checked={showArchived}
                        onCheckedChange={setShowArchived}
                      />
                      <Label htmlFor="show-archived">Show Archived</Label>
                    </div>

                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Job
                    </Button>
                  </>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-rows-1 md:grid-rows-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="h-[200px]">
                    <CardContent className="p-6">
                      <div className="w-2/3 h-6 bg-gray-200 animate-pulse rounded mb-4"></div>
                      <div className="w-full h-4 bg-gray-200 animate-pulse rounded mb-2"></div>
                      <div className="w-5/6 h-4 bg-gray-200 animate-pulse rounded mb-4"></div>
                      <div className="flex justify-between mt-6">
                        <div className="w-20 h-6 bg-gray-200 animate-pulse rounded"></div>
                        <div className="w-24 h-6 bg-gray-200 animate-pulse rounded"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredJobOrders.length > 0 ? (
              <div className="flex flex-wrap gap-6">
                {["High", "Mid", "Low"].map((priority) => {
                  const priorityJobs = filteredJobOrders.filter(
                    (job) => job.priority === priority
                  );

                  if (priorityJobs.length === 0) return null;

                  return (
                    <div key={priority} className="flex-1 min-w-[300px]">
                      <div className="bg-white rounded-lg shadow p-4">
                        <h3 className="text-lg font-semibold mb-4">{priority} Priority</h3>
                        <div className="space-y-4">
                          {priorityJobs.map((job) => (
                            <JobOrderCard
                              key={job.id}
                              jobOrder={job}
                              onClick={() => handleCardClick(job.id)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  {searchTerm || statusFilter !== "all"
                    ? "No job orders match your search criteria."
                    : "No job orders found. Create your first job order to get started."}
                </p>
                  <Button
                    className="mt-4"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Job Order
                  </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      <CreateJobOrderDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          setIsCreateDialogOpen(false);
          fetchJobOrders();
        }}
        user={user}
      />
    </div>
  );
};

export default JobOrders;

