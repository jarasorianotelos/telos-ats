import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText, Linkedin, Pencil, Trash2 } from "lucide-react";
import { formatDateToEST } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import ViewResumeDialog from "@/components/Applicants/ViewResumeDialog";
import EditApplicantDialog from "@/components/Applicants/EditApplicantDialog";
import ApplicantJobOrdersDialog from "@/components/Applicants/ApplicantJobOrdersDialog";
import { Database } from "@/types/supabase";

type Applicant = Database['public']['Tables']['applicants']['Row'] & {
  author?: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
  };
  joborder_applicant: Array<{
    id: string;
    joborder: {
      id: string;
      title: string;
      client: {
        name: string;
      };
      status: string;
      candidate_start_date: string;
    };
    status: string;
    count: number;
  }>;
  linkedin_profile: string;
};

interface ApplicantsTableProps {
  applicants: Applicant[];
  onDelete: (id: string) => void;
  onEdit: (applicant: Applicant) => void;
  onViewResume: (applicant: Applicant) => void;
  onViewJobOrders: (applicant: Applicant) => void;
}

const ApplicantsTable = ({
  applicants,
  onDelete,
  onEdit,
  onViewResume,
  onViewJobOrders,
}: ApplicantsTableProps) => {
  const { user } = useAuth();
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [isResumeDialogOpen, setIsResumeDialogOpen] = useState(false);
  const [isJobOrdersDialogOpen, setIsJobOrdersDialogOpen] = useState(false);

  // Filter applicants to only show those added by the current user
  const filteredApplicants = applicants.filter(
    (applicant) => applicant.author_id === user?.id
  );

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredApplicants.map((applicant) => (
            <TableRow key={applicant.id}>
              <TableCell>
                {applicant.first_name} {applicant.last_name}
              </TableCell>
              <TableCell>{applicant.email}</TableCell>
              <TableCell>{applicant.phone || "N/A"}</TableCell>
              <TableCell>{applicant.location || "N/A"}</TableCell>
              <TableCell>{formatDateToEST(applicant.created_at)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewResume(applicant)}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  {applicant.linkedin_profile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(applicant.linkedin_profile, "_blank")}
                    >
                      <Linkedin className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(applicant)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(applicant.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedApplicant && (
        <>
          <ViewResumeDialog
            open={isResumeDialogOpen}
            onOpenChange={setIsResumeDialogOpen}
            applicantId={selectedApplicant.id}
            applicantName={`${selectedApplicant.first_name} ${selectedApplicant.last_name}`}
            cvLink={selectedApplicant.cv_link}
            onSuccess={() => {}}
          />
          <ApplicantJobOrdersDialog
            open={isJobOrdersDialogOpen}
            onOpenChange={setIsJobOrdersDialogOpen}
            applicant={selectedApplicant}
            user={user}
          />
        </>
      )}
    </>
  );
};

export default ApplicantsTable; 