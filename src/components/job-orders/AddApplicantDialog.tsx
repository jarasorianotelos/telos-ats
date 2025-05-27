import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { JobOrder, User } from "@/types";
import { supabaseAdmin } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, toZonedTime } from "date-fns-tz";

interface AddApplicantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobOrder: JobOrder;
  user: User | null;
  onSuccess: () => void;
}

const applicantFormSchema = z.object({
  first_name: z.string().min(1, { message: "First name is required" }),
  last_name: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string().optional(),
  location: z.string().optional(),
  cv_link: z.string().optional(),
});

const applicationFormSchema = z.object({
  asking_salary: z.string().optional(),
  interview_notes: z.string().optional(),
  application_stage: z.string({ required_error: "Please select a stage" }),
  application_status: z.string({ required_error: "Please select a status" }),
});

const AddApplicantDialog = ({ 
  open, 
  onOpenChange, 
  jobOrder,
  user,
  onSuccess 
}: AddApplicantDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  const applicantForm = useForm<z.infer<typeof applicantFormSchema>>({
    resolver: zodResolver(applicantFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      location: "",
      cv_link: "",
    },
  });
  
  const applicationForm = useForm<z.infer<typeof applicationFormSchema>>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      asking_salary: "",
      interview_notes: "",
      application_stage: "Sourced",
      application_status: "Pending",
    },
  });
  
  const resetForms = () => {
    applicantForm.reset();
    applicationForm.reset({
      asking_salary: "",
      interview_notes: "",
      application_stage: "Sourced",
      application_status: "Pending",
    });
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      // Format timestamp in EST timezone
      const now = new Date();
      const estDate = toZonedTime(now, "America/New_York");
      const timestamp = format(estDate, "MM-dd-yyyy hh:mm a");

      // Create file path and name
      const fileExt = uploadedFile.name.split('.').pop();
      const sanitizedName = `${applicantForm.getValues('first_name')} ${applicantForm.getValues('last_name')}`.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
      const fileName = `${timestamp}.${fileExt}`;
      const filePath = `${sanitizedName}/${fileName}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('resumes')
        .upload(filePath, uploadedFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(uploadError.message);
      }

      // Get the public URL
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('resumes')
        .getPublicUrl(filePath);

      // Update the form with the URL
      applicantForm.setValue('cv_link', publicUrl);
      
      toast({
        title: "Success",
        description: "Resume uploaded successfully!",
      });
    } catch (error) {
      console.error("Error uploading resume:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add an applicant.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // First validate both forms
      const applicantData = await applicantForm.trigger();
      const applicationData = await applicationForm.trigger();
      
      if (!applicantData || !applicationData) {
        return;
      }
      
      const applicantValues = applicantForm.getValues();
      const applicationValues = applicationForm.getValues();
      
      let cvLink = null;
      
      // Upload resume if file is selected
      if (uploadedFile) {
        // Format timestamp in EST timezone
        const now = new Date();
        const estDate = toZonedTime(now, "America/New_York");
        const timestamp = format(estDate, "MM-dd-yyyy hh:mm a");

        // Create file path and name
        const fileExt = uploadedFile.name.split('.').pop();
        const sanitizedName = `${applicantValues.first_name} ${applicantValues.last_name}`.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
        const fileName = `${timestamp}.${fileExt}`;
        const filePath = `${sanitizedName}/${fileName}`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from('resumes')
          .upload(filePath, uploadedFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw new Error(uploadError.message);
        }

        // Get the public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('resumes')
          .getPublicUrl(filePath);

        cvLink = publicUrl;
      }
      
      // 1. Create the applicant
      const { data: applicantResult, error: applicantError } = await supabaseAdmin
        .from("applicants")
        .insert({
          first_name: applicantValues.first_name,
          last_name: applicantValues.last_name,
          email: applicantValues.email,
          phone: applicantValues.phone || null,
          location: applicantValues.location || null,
          cv_link: cvLink,
          author_id: user.id,
        })
        .select("id")
        .single();
      
      if (applicantError) throw applicantError;
      
      const applicantId = applicantResult.id;
      
      // 2. Create the job order applicant entry
      const { error: applicationError } = await supabaseAdmin
        .from("joborder_applicant")
        .insert({
          joborder_id: jobOrder.id,
          client_id: jobOrder.client_id,
          applicant_id: applicantId,
          author_id: user.id,
          asking_salary: applicationValues.asking_salary ? 
            Number(applicationValues.asking_salary.replace(/[^0-9]/g, '')) : null,
          interview_notes: applicationValues.interview_notes || null,
          application_stage: "Sourced",
          application_status: "Pending",
        });
      
      if (applicationError) throw applicationError;
      
      toast({
        title: "Success",
        description: "Applicant added successfully!",
      });
      
      onSuccess();
      resetForms();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding applicant:", error);
      toast({
        title: "Error",
        description: "Failed to add applicant. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) resetForms();
      onOpenChange(value);
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Candidate</DialogTitle>
        </DialogHeader>
        
        <Form {...applicantForm}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={applicantForm.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name*</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={applicantForm.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name*</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={applicantForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email*</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={applicantForm.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={applicantForm.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="City, Country" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={applicantForm.control}
              name="cv_link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CV/Resume</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                      />
                      {uploadedFile && (
                        <p className="text-sm text-muted-foreground">
                          Resume will be uploaded when you save
                        </p>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Form>

        <Form {...applicationForm}>
          <div className="space-y-4">
            <FormField
              control={applicationForm.control}
              name="asking_salary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salary (USD)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex:$1,000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={applicationForm.control}
              name="interview_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profiler</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder=""
                      className="resize-y min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Form>
        
        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForms();
              onOpenChange(false);
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isLoading}
          >
            {isLoading ? "Adding..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddApplicantDialog;
