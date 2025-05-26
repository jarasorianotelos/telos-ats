import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ViewResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicantName: string;
  cvLink: string;
  applicantId: string;
  onSuccess: () => void;
}

const ViewResumeDialog = ({
  open,
  onOpenChange,
  applicantName,
  cvLink,
  applicantId,
  onSuccess,
}: ViewResumeDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !applicantId) return;

    try {
      setUploading(true);

      // Format timestamp in EST timezone
      const now = new Date();
      const estDate = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      const timestamp = estDate.toISOString().replace(/[:.]/g, "-");

      // Create file path
      const filePath = `resumes/${applicantId}/${timestamp}-${file.name}`;

      // Upload file to Supabase storage
      const { error: uploadError } = await supabase
        .storage
        .from("resumes")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase
        .storage
        .from("resumes")
        .getPublicUrl(filePath);

      // Update applicant's cv_link
      const { error: updateError } = await supabase
        .from("applicant")
        .update({ cv_link: publicUrl })
        .eq("id", applicantId);

      if (updateError) {
        throw updateError;
      }

      setFile(null);
      setUploading(false);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error uploading resume:", error);
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Resume for {applicantName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {cvLink ? (
            <div className="flex flex-col space-y-2">
              <Label>Current Resume</Label>
              <a
                href={cvLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                View Resume
              </a>
            </div>
          ) : (
            <p className="text-muted-foreground">No resume uploaded yet.</p>
          )}
          <div className="flex flex-col space-y-2">
            <Label>Upload New Resume</Label>
            <div className="flex items-center space-x-2">
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="flex-1"
              />
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex items-center space-x-2"
              >
                <Upload className="h-4 w-4" />
                <span>{uploading ? "Uploading..." : "Upload"}</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewResumeDialog; 