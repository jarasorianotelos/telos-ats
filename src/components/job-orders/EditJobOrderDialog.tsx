import { JobOrder } from "@/types";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";

interface EditJobOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobOrder: JobOrder;
  onSuccess: () => void;
}

const formSchema = z.object({
  job_title: z
    .string()
    .min(3, { message: "Job title must be at least 3 characters" }),
  status: z.string().min(1, { message: "Please select a status" }),
  priority: z.string().min(1, { message: "Please select a priority" }),
  job_description: z.any().optional(),
  schedule: z.string().optional(),
  client_budget: z.string().optional(),
  sourcing_preference: z.array(z.string()).optional(),
});

const PRIORITY_OPTIONS = ["Low", "Mid", "High"];

const SOURCING_OPTIONS = [
  "LATAM",
  "Philippines",
  "India",
  "Europe",
  "South Africa",
  "Malaysia",
  "Global",
];

const EditJobOrderDialog = ({
  open,
  onOpenChange,
  jobOrder,
  onSuccess,
}: EditJobOrderDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      job_title: jobOrder.job_title || "",
      status: jobOrder.status || "Kickoff",
      priority: jobOrder.priority || "Medium",
      schedule: jobOrder.schedule || "",
      client_budget: jobOrder.client_budget || "",
      sourcing_preference: Array.isArray(jobOrder.sourcing_preference)
        ? jobOrder.sourcing_preference
        : jobOrder.sourcing_preference
        ? [jobOrder.sourcing_preference]
        : [],
    },
  });

  useEffect(() => {
    if (open && jobOrder) {
      form.reset({
        job_title: jobOrder.job_title || "",
        status: jobOrder.status || "Kickoff",
        priority: jobOrder.priority || "Medium",
        schedule: jobOrder.schedule || "",
        client_budget: jobOrder.client_budget || "",
        sourcing_preference: Array.isArray(jobOrder.sourcing_preference)
          ? jobOrder.sourcing_preference
          : jobOrder.sourcing_preference
          ? [jobOrder.sourcing_preference]
          : [],
      });
    }
  }, [open, jobOrder, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);

      console.log("Form values:", values);
      console.log("Original job order:", jobOrder);
      console.log("Updating job order with ID:", jobOrder.id);

      let jobDescriptionUrl = jobOrder.job_description;

      if (uploadedFile) {
        // Format timestamp in EST timezone
        const now = new Date();
        const estDate = toZonedTime(now, "America/New_York");
        const timestamp = format(estDate, "MM-dd-yyyy hh:mm a");

        // Create file path and name
        const fileExt = uploadedFile.name.split(".").pop();
        const sanitizedName = jobOrder.job_title
          .replace(/[^a-zA-Z0-9\s-]/g, "")
          .trim();
        const folderPath = `${sanitizedName} (${jobOrder.id})`;
        const fileName = `${timestamp}.${fileExt}`;
        const filePath = `${folderPath}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("job-descriptions")
          .upload(filePath, uploadedFile, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw new Error(uploadError.message);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("job-descriptions").getPublicUrl(filePath);

        jobDescriptionUrl = publicUrl;
      }

      const updateData = {
        job_title: values.job_title,
        status: values.status,
        priority: values.priority,
        job_description: jobDescriptionUrl,
        schedule: values.schedule || null,
        client_budget: values.client_budget || null,
        sourcing_preference: values.sourcing_preference || null,
        updated_at: new Date().toISOString(),
      };

      console.log("Update data being sent:", updateData);

      const { data: updateResponse, error: updateError } = await supabase
        .from("joborder")
        .update(updateData)
        .eq("id", jobOrder.id)
        .select();

      if (updateError) {
        console.error("Update error:", updateError);
        throw updateError;
      }

      console.log("Update response:", updateResponse);

      toast({
        title: "Success",
        description: "Job order updated successfully!",
      });

      onSuccess();
    } catch (error) {
      console.error("Error updating job order:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update job order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Job Order</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="job_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Kickoff">Kickoff</SelectItem>
                      <SelectItem value="Sourcing">Sourcing</SelectItem>
                      <SelectItem value="Internal Interview">
                        Internal Interview
                      </SelectItem>
                      <SelectItem value="Internal Assessment">
                        Internal Assessment
                      </SelectItem>
                      <SelectItem value="Client Endorsement">
                        Client Endorsement
                      </SelectItem>
                      <SelectItem value="Client Assessment">
                        Client Assessment
                      </SelectItem>
                      <SelectItem value="Client Interview">
                        Client Interview
                      </SelectItem>
                      <SelectItem value="Offer">Offer</SelectItem>
                      <SelectItem value="Hire">Hired</SelectItem>
                      <SelectItem value="On-hold">On-hold</SelectItem>
                      <SelectItem value="Canceled">Canceled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="job_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Description</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadedFile(file);
                          }
                        }}
                      />
                      <p className="text-sm text-muted-foreground">
                        Upload a PDF or Word document containing the job
                        description
                      </p>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="schedule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Schedule</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="client_budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Budget</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="sourcing_preference"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">
                      Sourcing Preference
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Select preferred locations for sourcing candidates
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {SOURCING_OPTIONS.map((option) => (
                      <FormField
                        key={option}
                        control={form.control}
                        name="sourcing_preference"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={option}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(option)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, option])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== option
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {option}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditJobOrderDialog;
