import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { Applicant } from "@/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Download, Loader2, Upload } from "lucide-react";

interface ViewResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicant: Applicant;
  onResumeUpdated: () => void;
}

export default function ViewResumeDialog({ open, onOpenChange, applicant, onResumeUpdated }: ViewResumeDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isReplaceDialogOpen, setIsReplaceDialogOpen] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      toast({
        title: "Invalid file",
        description: "Please select a PDF file",
        variant: "destructive",
      });
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    
    try {
      // Delete the old file if exists
      if (applicant.cv_link) {
        const oldPath = applicant.cv_link.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('resumes').remove([oldPath]);
        }
      }
      
      // Upload the new file
      const fileName = `${applicant.id}_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }
      
      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('resumes')
        .getPublicUrl(fileName);
      
      // Update the applicant record
      const { error: updateError } = await supabase
        .from('applicants')
        .update({ cv_link: publicUrlData.publicUrl })
        .eq('id', applicant.id);

      if (updateError) {
        throw updateError;
      }
      
      toast({
        title: "Success",
        description: "Resume uploaded successfully",
      });
      
      onResumeUpdated();
      setFile(null);
      setIsReplaceDialogOpen(false);
    } catch (err) {
      console.error('Error uploading resume:', err);
      toast({
        title: "Error",
        description: "Failed to upload resume",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {applicant.first_name} {applicant.last_name}'s Resume
          </DialogTitle>
          <DialogDescription>
            View and manage the applicant's resume
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4 py-4">
          {applicant.cv_link ? (
            <>
              <div className="border rounded-md overflow-hidden h-80">
                <iframe
                  src={`${applicant.cv_link}#toolbar=0`}
                  className="w-full h-full"
                  title={`${applicant.first_name} ${applicant.last_name}'s resume`}
                />
              </div>
              
              <div className="flex space-x-2 justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => window.open(applicant.cv_link, '_blank')}
                >
                  <Download className="mr-2 h-4 w-4" /> Open in New Tab
                </Button>
                
                <AlertDialog 
                  open={isReplaceDialogOpen}
                  onOpenChange={setIsReplaceDialogOpen}
                >
                  <AlertDialogTrigger asChild>
                    <Button variant="default">
                      <Upload className="mr-2 h-4 w-4" /> Replace Resume
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Replace Resume</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will replace the existing resume. Are you sure you want to continue?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                      <Label htmlFor="resume-file">Upload PDF</Label>
                      <Input
                        id="resume-file"
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          "Upload"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          ) : (
            <div className="space-y-4 text-center py-8">
              <p className="text-gray-500">No resume uploaded yet</p>
              <div>
                <Label htmlFor="resume-file">Upload PDF</Label>
                <Input
                  id="resume-file"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                />
              </div>
              <Button 
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="mt-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload Resume"
                )}
              </Button>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}