import { useState } from "react";
import { JobOrderCommission, User } from "@/types";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { formatCurrencyPHP, formatDateToEST } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Edit } from "lucide-react";
import EditCommissionDialog from "./EditCommissionDialog";
import CommissionDetailsDialog from "./CommissionDetailsDialog";
import { useAuth } from "@/contexts/AuthContext";

interface CommissionTableProps {
  commissions: JobOrderCommission[];
  onUpdate: () => void;
  adminUsers: User[];
}

interface CommissionDetail {
  payment_type: string;
  amount: number;
  receipt_path?: string;
  timestamp: string;
}

export default function CommissionTable({
  commissions,
  onUpdate,
  adminUsers,
}: CommissionTableProps) {
  const { user } = useAuth();
  const [editingCommission, setEditingCommission] =
    useState<JobOrderCommission | null>(null);
  const [selectedCommission, setSelectedCommission] = useState<
    CommissionDetail[]
  >([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("joborder_commission")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Commission deleted successfully",
      });
      onUpdate();
    } catch (error) {
      console.error("Error deleting commission:", error);
      toast({
        title: "Error",
        description: "Failed to delete commission",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (commission: JobOrderCommission) => {
    try {
      const details = commission.commission_details
        ? JSON.parse(commission.commission_details)
        : [];
      setSelectedCommission(details);
      setIsDetailsOpen(true);
    } catch (error) {
      console.error("Error parsing commission details:", error);
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Recruiter Username</TableHead>
            <TableHead>Job Title</TableHead>
            <TableHead>Candidate Name</TableHead>
            <TableHead>Candidate Start Date</TableHead>
            <TableHead>Current Commission (PHP)</TableHead>
            <TableHead>Received Commission (PHP)</TableHead>
            <TableHead>Commission Details</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Updated Date</TableHead>
            <TableHead>Actions</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
          {commissions.map((commission) => (
            <TableRow key={commission.id}>
              <TableCell>
                {commission.joborder_applicant?.author?.username || "N/A"}
              </TableCell>
              <TableCell>
                {commission.joborder_applicant?.joborder?.job_title || "N/A"}
              </TableCell>
              <TableCell>
                {commission.joborder_applicant?.applicant?.first_name || "N/A"}{" "}
                {commission.joborder_applicant?.applicant?.last_name || "N/A"}
              </TableCell>
              <TableCell>
                {commission.joborder_applicant?.candidate_start_date || "N/A"}
              </TableCell>
              <TableCell>
                {formatCurrencyPHP(commission.current_commission || 0)}
              </TableCell>
              <TableCell>
                {(() => {
                  try {
                    if (commission.commission_details) {
                      const details = JSON.parse(commission.commission_details);
                      const totalAmount = Array.isArray(details)
                        ? details.reduce(
                            (sum, detail) => sum + (detail.amount || 0),
                            0
                          )
                        : details.amount || 0;
                      return formatCurrencyPHP(totalAmount);
                    }
                    return formatCurrencyPHP(
                      commission.received_commission || 0
                    );
                  } catch (error) {
                    console.error("Error calculating total amount:", error);
                    return formatCurrencyPHP(
                      commission.received_commission || 0
                    );
                  }
                })()}
              </TableCell>
              <TableCell>
                {commission.commission_details ? (
                  <button
                    onClick={() => handleViewDetails(commission)}
                    className="text-blue-500 hover:underline"
                  >
                    View
                  </button>
                ) : (
                  "N/A"
                )}
              </TableCell>
              <TableCell>{commission.status || "N/A"}</TableCell>
              <TableCell>{formatDateToEST(commission.updated_at)}</TableCell>
              <TableCell>                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingCommission(commission)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(commission.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>     
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {editingCommission && (
        <EditCommissionDialog
          commission={editingCommission}
          open={!!editingCommission}
          onOpenChange={(open) => !open && setEditingCommission(null)}
          onUpdate={onUpdate}
        />
      )}
      <CommissionDetailsDialog
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        details={selectedCommission || []}
      />
    </>
  );
}
