import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { User } from "@/types";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  company: string;
}

interface CreateJobOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  user: User | null;
}

const formSchema = z.object({
  job_title: z.string().min(1, "Job title is required"),
  client_id: z.string().min(1, "Client is required"),
  status: z.string().min(1, "Status is required"),
  priority: z.string().min(1, "Priority is required"),
  job_description: z.any(),
  schedule: z.string().optional(),
  client_budget: z.string().optional(),
  sourcing_preference: z.array(z.string()).default([]),
});

const sourcingOptions = [
  "LATAM",
  "Philippines",
  "India",
  "Europe",
  "South Africa",
  "Malaysia",
  "Global",
];

const CreateJobOrderDialog = ({
  open,
  onOpenChange,
  onSuccess,
  user,
}: CreateJobOrderDialogProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [sourcingPreferences, setSourcingPreferences] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      job_title: "",
      client_id: "",
      priority: "",
      status: "",
      job_description: null,
      schedule: "",
      client_budget: "",
      sourcing_preference: [],
    },
  });

  useEffect(() => {
    if (open) {
      fetchClients();
      form.reset();
    }
  }, [open, form]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, first_name, last_name, company")
        .order("company", { ascending: true });

      if (error) {
        throw error;
      }

      setClients(data);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Error",
        description: "Failed to load clients. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      let jobDescriptionUrl = null;

      // Upload job description if provided
      if (uploadedFile) {
        const fileExt = uploadedFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from('job-descriptions')
          .upload(filePath, uploadedFile);

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('job-descriptions')
          .getPublicUrl(filePath);

        jobDescriptionUrl = publicUrl;
      }

      // Create job order using admin client
      const { error: insertError } = await supabaseAdmin
        .from('joborder')
        .insert({
          job_title: values.job_title,
          client_id: values.client_id,
          priority: values.priority,
          status: values.status,
          job_description: jobDescriptionUrl,
          schedule: values.schedule,
          client_budget: values.client_budget,
          sourcing_preference: sourcingPreferences,
          author_id: user?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Error creating job order:', insertError);
        throw insertError;
      }

      toast({
        title: "Success",
        description: "Job order created successfully",
      });

      onOpenChange(false);
      onSuccess();
      form.reset();
      setUploadedFile(null);
    } catch (error) {
      console.error('Error creating job order:', error);
      toast({
        title: "Error",
        description: "Failed to create job order. Please try again.",
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
          <DialogTitle>Create New Job Order</DialogTitle>
          <DialogDescription>
            Create a new job order to track open positions
          </DialogDescription>
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
                    <Input
                      placeholder="e.g., Senior Frontend Developer"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.length > 0 ? (
                        clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.first_name} {client.last_name} -{" "}
                            {client.company}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-clients" disabled>
                          No clients available
                        </SelectItem>
                      )}
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Mid">Mid</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
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
                      <SelectItem value="Hire">Hire</SelectItem>
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
                            field.onChange(file);
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

            <FormField
              control={form.control}
              name="schedule"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schedule</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Full-time, Remote" {...field} />
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
                    <Input placeholder="e.g., $100,000 - $120,000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sourcing_preference"
              render={() => (
                <FormItem>
                  <FormLabel>Sourcing Preferences</FormLabel>
                  <div className="grid grid-cols-2 gap-4">
                    {sourcingOptions.map((option) => (
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
                                  checked={sourcingPreferences.includes(option)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSourcingPreferences([
                                        ...sourcingPreferences,
                                        option,
                                      ]);
                                      field.onChange([
                                        ...sourcingPreferences,
                                        option,
                                      ]);
                                    } else {
                                      setSourcingPreferences(
                                        sourcingPreferences.filter(
                                          (item) => item !== option
                                        )
                                      );
                                      field.onChange(
                                        sourcingPreferences.filter(
                                          (item) => item !== option
                                        )
                                      );
                                    }
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>{option}</FormLabel>
                              </div>
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
                {isLoading ? "Creating..." : "Create Job Order"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateJobOrderDialog;
