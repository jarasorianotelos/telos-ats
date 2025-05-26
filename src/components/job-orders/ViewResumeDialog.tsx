import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

interface ViewResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicantName: string;
  cvLink: string | null;
  applicantId: string;
  onSuccess: () => void;
}

const ViewResumeDialog = ({ 
  open, 
  onOpenChange, 
  applicantName,
  cvLink,
  applicantId,
  onSuccess
}: ViewResumeDialogProps) => {
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
      const fileExt = file.name.split('.').pop();
      const sanitizedName = applicantName.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
      const folderPath = `${sanitizedName} (${applicantId})`;
      const fileName = `${timestamp}.${fileExt}`;
      const filePath = `${folderPath}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(uploadError.message);
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      // Update the applicant's cv_link
      const { error: updateError } = await supabase
        .from('applicants')
        .update({ cv_link: publicUrl })
        .eq('id', applicantId);

      if (updateError) {
        console.error("Update error:", updateError);
        throw new Error(updateError.message);
      }

      toast({
        title: "Success",
        description: "Resume updated successfully!",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error uploading resume:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload resume. Please try again.",
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
          <DialogTitle>Resume - {applicantName}</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {cvLink ? (
            <div className="space-y-4">
              <iframe
                src={cvLink}
                className="w-full h-[600px] border rounded-lg"
                title="Resume Preview"
              />
              <div className="flex justify-between items-center">
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
                <Button
                  variant="outline"
                  onClick={() => window.open(cvLink, '_blank')}
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
                  No resume available for this applicant.
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
                    {isUploading ? "Uploading..." : "Upload Resume"}
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

export default ViewResumeDialog; 