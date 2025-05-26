import { useState, useEffect, lazy, Suspense } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, File, Trash2, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Applicant } from "@/types";

// Dynamic imports
const AddApplicantDialog = lazy(() => import("./AddApplicantDialog"));
const ViewResumeDialog = lazy(() => import("./ViewResumeDialog"));
const CardDetailsDialog = lazy(() => import("./CardDetailsDialog"));

// Loading component for Suspense
const DialogLoading = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
  </div>
);

interface PipelineCardProps {
  card: {
    id: string;
    title: string;
    created_at: string;
  };
  onUpdate: () => void;
}

export const PipelineCard = ({ card, onUpdate }: PipelineCardProps) => {
  const [isAddApplicantDialogOpen, setIsAddApplicantDialogOpen] =
    useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(
    null
  );
  const [isResumeDialogOpen, setIsResumeDialogOpen] = useState(false);
  const [isCardDetailsDialogOpen, setIsCardDetailsDialogOpen] = useState(false);

  // Fetch applicants in this card
  const {
    data: applicants,
    isLoading: isLoadingApplicants,
    refetch,
  } = useQuery({
    queryKey: ["pipeline-card-applicants", card.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_card_applicants")
        .select(`
          id,
          applicant_id,
          added_at,
          applicant:applicant_id (
            id,
            first_name,
            last_name,
            email,
            phone,
            location,
            cv_link,
            author_id,
            created_at
          )
        `)
        .eq("card_id", card.id)
        .order("added_at", { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load applicants",
          variant: "destructive",
        });
        throw error;
      }

      return data || [];
    },
    enabled: !!card.id,
  });

  const handleRemoveApplicant = async (applicantId: string) => {
    const { error } = await supabase
      .from("pipeline_card_applicants")
      .delete()
      .eq("card_id", card.id)
      .eq("applicant_id", applicantId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove applicant",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Applicant removed from card",
    });
    refetch();
  };

  const handleDeleteCard = async () => {
    const { error } = await supabase
      .from("pipeline_cards")
      .delete()
      .eq("id", card.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete card",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Card deleted successfully",
    });
    onUpdate();
  };

  return (
    <>
      <Card
        className="h-full flex flex-col cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setIsCardDetailsDialogOpen(true)}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2 ">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl truncate ">{card.title}</CardTitle>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Card</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this card? This action cannot
                  be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteCard}
                  className="bg-destructive text-destructive-foreground"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardHeader>
        <div className="px-6 pb-2 text-xs text-gray-500">
          Created {format(new Date(card.created_at), "MMM d, yyyy")}
        </div>
        <CardContent className="flex-grow ">
          <div className="space-y-4">
            {isLoadingApplicants ? (
              <div className="animate-pulse space-y-2">
                <div className="h-12 bg-gray-100 rounded"></div>
                <div className="h-12 bg-gray-100 rounded"></div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <Users className="h-5 w-5" />
                <span className="text-lg font-medium">{applicants?.length || 0}</span>
                <span>candidates</span>
              </div>
            )}
          </div>
        </CardContent>
        <div className="p-4 border-t mt-auto">
          <Button
            variant="outline"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              setIsAddApplicantDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Candidates
          </Button>
        </div>
      </Card>

      <Suspense fallback={<DialogLoading />}>
        <CardDetailsDialog
          open={isCardDetailsDialogOpen}
          onOpenChange={setIsCardDetailsDialogOpen}
          cardTitle={card.title}
          applicants={applicants || []}
          isLoading={isLoadingApplicants}
          onRemoveApplicant={handleRemoveApplicant}
          onViewResume={(applicant) => {
            setSelectedApplicant(applicant);
            setIsResumeDialogOpen(true);
          }}
        />
      </Suspense>

      <Suspense fallback={<DialogLoading />}>
        <AddApplicantDialog
          open={isAddApplicantDialogOpen}
          onOpenChange={setIsAddApplicantDialogOpen}
          cardId={card.id}
          onApplicantAdded={() => {
            refetch();
          }}
        />
      </Suspense>

      {selectedApplicant && (
        <Suspense fallback={<DialogLoading />}>
          <ViewResumeDialog
            open={isResumeDialogOpen}
            onOpenChange={setIsResumeDialogOpen}
            applicant={selectedApplicant}
            onResumeUpdated={() => {
              refetch();
            }}
          />
        </Suspense>
      )}
    </>
  );
};
