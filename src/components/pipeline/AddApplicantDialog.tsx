import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Applicant } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

interface AddApplicantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
  onApplicantAdded: () => void;
}

export default function AddApplicantDialog({
  open,
  onOpenChange,
  cardId,
  onApplicantAdded,
}: AddApplicantDialogProps) {
  const { user } = useAuth();
  const [selectedApplicantIds, setSelectedApplicantIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: applicants, isLoading } = useQuery({
    queryKey: ["applicants", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("applicants")
        .select("*")
        .eq("author_id", user?.id);

      if (searchQuery) {
        query = query.or(
          `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load applicants",
          variant: "destructive",
        });
        throw error;
      }

      return data as Applicant[];
    },
  });

  const handleAddApplicants = async () => {
    if (selectedApplicantIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one applicant",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("pipeline_card_applicants")
        .insert(
          selectedApplicantIds.map((applicantId) => ({
            card_id: cardId,
            applicant_id: applicantId,
            author_id: user.id,
          }))
        )
        .select();

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to add applicants",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Applicants added successfully",
      });

      onApplicantAdded();
      onOpenChange(false);
      setSelectedApplicantIds([]);
    } catch (err) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Candidates to Pipeline</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search candidates..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-12 bg-gray-100 rounded"></div>
                <div className="h-12 bg-gray-100 rounded"></div>
              </div>
            ) : applicants && applicants.length > 0 ? (
              applicants.map((applicant) => (
                <div
                  key={applicant.id}
                  className="flex items-center space-x-2 p-2 border rounded-md"
                >
                  <Checkbox
                    id={applicant.id}
                    checked={selectedApplicantIds.includes(applicant.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedApplicantIds([...selectedApplicantIds, applicant.id]);
                      } else {
                        setSelectedApplicantIds(
                          selectedApplicantIds.filter((id) => id !== applicant.id)
                        );
                      }
                    }}
                  />
                  <label
                    htmlFor={applicant.id}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="font-medium">
                      {applicant.first_name} {applicant.last_name}
                    </div>
                    <div className="text-sm text-gray-500">{applicant.email}</div>
                  </label>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No candidates found</p>
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setSelectedApplicantIds([]);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddApplicants}>
              Add Selected ({selectedApplicantIds.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
