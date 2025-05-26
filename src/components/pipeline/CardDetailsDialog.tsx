import { Button } from "@/components/ui/button";
import { File, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { useEffect } from "react";

interface CardDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardTitle: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applicants: any[];
  isLoading: boolean;
  onRemoveApplicant: (applicantId: string) => void;
  onViewResume: (applicant: Applicant) => void;
}

export default function CardDetailsDialog({
  open,
  onOpenChange,
  cardTitle,
  applicants,
  isLoading,
  onRemoveApplicant,
  onViewResume,
}: CardDetailsDialogProps) {
  // Add debug logging
  useEffect(() => {
    if (open) {
      if (applicants?.length > 0) { /* empty */ }
    }
  }, [open, applicants]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{cardTitle}</DialogTitle>
          <DialogDescription>
            {applicants?.length || 0} candidates in this pipeline
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-12 bg-gray-100 rounded"></div>
              <div className="h-12 bg-gray-100 rounded"></div>
            </div>
          ) : applicants && applicants.length > 0 ? (
            <div className="space-y-2">
              {applicants.map((item) => {
                const applicantData = item.applicant;

                if (!applicantData) return null;

                return (
                  <div
                    key={item.id}
                    className="p-4 bg-gray-50 rounded-md flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium">
                        {applicantData.first_name} {applicantData.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {applicantData.email}
                      </div>
                      {applicantData.phone && (
                        <div className="text-sm text-gray-500">
                          {applicantData.phone}
                        </div>
                      )}
                      {applicantData.location && (
                        <div className="text-sm text-gray-500">
                          {applicantData.location}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {applicantData.cv_link && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewResume(applicantData)}
                        >
                          <File className="h-4 w-4 mr-2" /> View Resume
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Remove
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Remove Candidate
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove this candidate
                              from the card? This won't delete the candidate
                              from your system.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                onRemoveApplicant(applicantData.id)
                              }
                              className="bg-red-500 text-white hover:bg-red-600"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No candidates in this pipeline</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
