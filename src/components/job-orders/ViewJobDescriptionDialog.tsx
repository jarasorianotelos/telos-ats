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
import { ExternalLink, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { User } from "@/types";

interface ViewJobDescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobTitle: string;
  jobDescriptionLink: string | null;
  jobOrderId: string;
  onSuccess: () => void;
  user: User | null;
}

const ViewJobDescriptionDialog = ({
  open,
  onOpenChange,
  jobTitle,
  jobDescriptionLink,
  jobOrderId,
  onSuccess,
  user,
}: ViewJobDescriptionDialogProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);

      // Format timestamp in EST timezone
      const now = new Date();
      const estDate = toZonedTime(now, "America/New_York");
      const timestamp = format(estDate, "MM-dd-yyyy hh:mm a");

      // Create file path and name
      const fileExt = file.name.split(".").pop();
      const sanitizedName = jobTitle.replace(/[^a-zA-Z0-9\s-]/g, "").trim();
      const folderPath = `${sanitizedName} (${jobOrderId})`;
      const fileName = `${timestamp}.${fileExt}`;
      const filePath = `${folderPath}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("job-descriptions")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(uploadError.message);
      }

      // Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("job-descriptions").getPublicUrl(filePath);

      // Update the job order's job_description
      const { error: updateError } = await supabase
        .from("joborder")
        .update({ job_description: publicUrl })
        .eq("id", jobOrderId);

      if (updateError) {
        console.error("Update error:", updateError);
        throw new Error(updateError.message);
      }

      toast({
        title: "Success",
        description: "Job description updated successfully!",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error uploading job description:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to upload job description. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Job Description - {jobTitle}</DialogTitle>
          <DialogDescription>
            View and manage the job description for this position
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {jobDescriptionLink ? (
            <div className="space-y-4">
              <iframe
                src={jobDescriptionLink}
                className="w-full h-[600px] border rounded-lg"
                title="Job Description Preview"
              />
              <div className="flex justify-between items-center">
              {user?.role === 'administrator' && (
                <div className="flex items-center space-x-2">
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="max-w-[200px]"
                  />
                  <Button
                    variant="outline"
                    onClick={handleUpload}
                    disabled={isUploading || !file}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? "Uploading..." : "Upload New"}
                  </Button>
                </div>
                    )}        
                <Button
                  variant="outline"
                  onClick={() => window.open(jobDescriptionLink, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  No job description available for this position.
                </p>
                <div className="flex items-center justify-center space-x-2">
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="max-w-[200px]"
                  />
                  <Button
                    variant="outline"
                    onClick={handleUpload}
                    disabled={isUploading || !file}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? "Uploading..." : "Upload Job Description"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewJobDescriptionDialog;
