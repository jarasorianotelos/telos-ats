import { useEffect, useState } from "react";
import { Applicant, JobOrderApplicant, User } from "@/types";
import { supabase } from "@/lib/supabase";
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
import { Badge } from "@/components/ui/badge";
import { formatDateToEST } from "@/lib/utils";

interface ApplicantJobOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicant: Applicant;
  user?: User | null;
}

const ApplicantJobOrdersDialog = ({
  open,
  onOpenChange,
  applicant,
  user,
}: ApplicantJobOrdersDialogProps) => {
  const [jobOrders, setJobOrders] = useState<JobOrderApplicant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && applicant) {
      fetchJobOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, applicant]);

  const fetchJobOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("joborder_applicant")
        .select(
          `
          *,
          joborder:joborder_id (
            id,
            job_title,
            status
          ),
          author:users!joborder_applicant_author_id_fkey (
            first_name,
            last_name,
            username
          )
        `
        )
        .eq("applicant_id", applicant.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJobOrders(data || []);
    } catch (error) {
      console.error("Error fetching job orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const getApplicationStageColor = (stage: string): string => {
    const stageColors: Record<string, string> = {
      Sourced: "bg-cyan-100 text-cyan-800",
      "Internal Interview": "bg-purple-100 text-purple-800",
      "Internal Assessment": "bg-indigo-100 text-indigo-800",
      "Client Endorsement": "bg-amber-100 text-amber-800",
      "Client Assessment": "bg-yellow-100 text-yellow-800",
      "Client Interview": "bg-pink-100 text-pink-800",
      Offer: "bg-orange-100 text-orange-800",
      Hire: "bg-green-100 text-green-800",
      "on-hold": "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
    };

    return stageColors[stage] || "bg-gray-100 text-gray-800";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            Job Orders for {applicant.first_name} {applicant.last_name}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : jobOrders.length > 0 ? (
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Client Feedback</TableHead>
                  <TableHead>Endorsed By</TableHead>
                  
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobOrders.map((jobOrder) => (
                  <TableRow key={jobOrder.id}>
                    <TableCell className="font-medium">
                      {jobOrder.joborder?.job_title}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={getApplicationStageColor(
                          jobOrder.application_stage
                        )}
                      >
                        {jobOrder.application_stage}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {jobOrder.application_status}
                      </Badge>
                    </TableCell>
                    <TableCell>{jobOrder.client_feedback || "N/A"}</TableCell>
                    <TableCell>
                      <div>
                        {jobOrder.author ? 
                          user?.role === 'administrator' 
                            ? `${jobOrder.author.first_name} ${jobOrder.author.last_name}`
                            : jobOrder.author.first_name
                          : "N/A"}
                      </div>
                      <div>
                      {formatDateToEST(jobOrder.created_at)}
                      </div>
                    </TableCell>
                    
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">
            No job orders found for this applicant.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ApplicantJobOrdersDialog;
