import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { ApplicantWithDetails } from "@/types";

interface JobOrderApplicantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicant: ApplicantWithDetails;
  userRole?: string;
  onSuccess?: () => void;
}

const JobOrderApplicantDialog = ({
  open,
  onOpenChange,
  applicant,
  userRole,
  onSuccess,
}: JobOrderApplicantDialogProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedApplicant, setEditedApplicant] = useState(applicant);
  const [isLoading, setIsLoading] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);

      // First, perform the update
      const { error: updateError } = await supabase
        .from("joborder_applicant")
        .update({
          interview_notes: editedApplicant.interview_notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editedApplicant.id);

      if (updateError) {
        throw updateError;
      }

      // Then, fetch the updated record
      const { data: updatedData, error: fetchError } = await supabase
        .from("joborder_applicant")
        .select(
          `
          *,
          applicant:applicants(*),
          author:users!joborder_applicant_author_id_fkey (
            first_name,
            last_name,
            username
          )
        `
        )
        .eq("id", editedApplicant.id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (!updatedData) {
        throw new Error("Failed to fetch updated data");
      }

      // Update local state with the fetched data
      setEditedApplicant(updatedData);

      toast({
        title: "Success",
        description: "Applicant details updated successfully!",
      });

      setIsEditing(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update applicant details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedApplicant(applicant);
    setIsEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold underline">
            Profiler: {applicant.applicant?.first_name}{" "}
            {applicant.applicant?.last_name}
          </DialogTitle>
          <DialogDescription>
            View and manage applicant information for this job order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            {isEditing ? (
              <Textarea
                value={editedApplicant.interview_notes || ""}
                onChange={(e) =>
                  setEditedApplicant({
                    ...editedApplicant,
                    interview_notes: e.target.value,
                  })
                }
                className="mt-2"
                placeholder="Enter client feedback..."
              />
            ) : (
              <p className="mt-2 whitespace-pre-wrap">
                {editedApplicant.interview_notes ||
                  "No client feedback available"}
              </p>
            )}
          </div>
        </div>        
          <DialogFooter>
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <Button onClick={handleEdit}>Edit Details</Button>
            )}
          </DialogFooter>
     
      </DialogContent>
    </Dialog>
  );
};

export default JobOrderApplicantDialog;
