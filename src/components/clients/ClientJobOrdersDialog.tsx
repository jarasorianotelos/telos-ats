import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Client } from "@/types";
import { formatDateToEST } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface JobOrder {
  id: string;
  job_title: string;
  client_budget: string;
  location: string;
  schedule: string;
  sourcing_preference: string[];
  status: string;
  created_at: string;
  joborder_applicant: { count: number }[];
  author: {
    first_name: string;
    last_name: string;
  };
}

interface ClientJobOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
}

const statusColors = {
  Kickoff: "bg-[#0085ca] text-white",
  Sourcing: "bg-cyan-100 text-cyan-800",
  "Internal Interview": "bg-purple-100 text-purple-800",
  "Internal Assessment": "bg-indigo-100 text-indigo-800",
  "Client Endorsement": "bg-amber-100 text-amber-800",
  "Client Assessment": "bg-yellow-100 text-yellow-800",
  "Client Interview": "bg-pink-100 text-pink-800",
  Offer: "bg-orange-100 text-orange-800",
  Hired: "bg-green-100 text-green-800",
  "On-Hold": "bg-gray-100 text-gray-800",
  Cancelled: "bg-red-100 text-red-800",
} as const;

const ClientJobOrdersDialog = ({
  open,
  onOpenChange,
  client,
}: ClientJobOrdersDialogProps) => {
  const navigate = useNavigate();
  const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobOrders = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("joborder")
        .select(
          `
          *,
          author:users(first_name, last_name),
          joborder_applicant(count)
        `
        )
        .eq("client_id", client.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJobOrders(data || []);
    } catch (error) {
      console.error("Error fetching job orders:", error);
      toast({
        title: "Error",
        description: "Failed to load job orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [client.id]);

  useEffect(() => {
    if (open) {
      fetchJobOrders();
    }
  }, [open, fetchJobOrders]);

  const formatSourcingPreference = (
    preference: string[] | null | undefined
  ) => {
    if (!preference || !Array.isArray(preference)) return "N/A";
    try {
      return preference.map((item) => `• ${item}`).join("\n");
    } catch (error) {
      return "N/A";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Job Orders for {client.company}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : jobOrders.length > 0 ? (
          <div className="mt-4">
            <Table>
              <TableHeader className="bg-[#0085ca] text-white font-bold">
                <TableRow>
                  <TableHead className="text-white">Job Title</TableHead>
                  <TableHead className="text-white">Job Budget</TableHead>
                  <TableHead className="text-white">Job Schedule</TableHead>
                  <TableHead className="text-white">
                    Job Sourcing Preference
                  </TableHead>
                  <TableHead className="text-white">Status</TableHead>
                  <TableHead className="text-white"># of Candidates</TableHead>
                  <TableHead className="text-white">Created By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobOrders.map((jobOrder) => (
                  <TableRow key={jobOrder.id}>
                    <TableCell>
                      <button
                        onClick={() => {
                          onOpenChange(false);
                          navigate(`/job-orders/${jobOrder.id}`);
                        }}
                        className="font-medium text-left hover:text-[#0085ca] transition-colors"
                      >
                        {jobOrder.job_title}
                      </button>
                    </TableCell>
                    <TableCell>{jobOrder.client_budget}</TableCell>
                    <TableCell>{jobOrder.schedule}</TableCell>
                    <TableCell>
                      <div className="whitespace-pre-line">
                        {formatSourcingPreference(jobOrder.sourcing_preference)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          statusColors[
                            jobOrder.status as keyof typeof statusColors
                          ] || "bg-gray-100 text-gray-800"
                        )}
                      >
                        {jobOrder.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {jobOrder.joborder_applicant?.[0]?.count || 0}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div>
                          {jobOrder.author.first_name}{" "}
                          {jobOrder.author.last_name}
                        </div>
                        <div>
                          {formatDateToEST(jobOrder.created_at, "MMM d, yyyy")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No job orders found for this client.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClientJobOrdersDialog;
