import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { JobOrder, User, Applicant } from "@/types";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText } from "lucide-react";

interface EndorseApplicantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobOrder: JobOrder;
  user: User | null;
  onSuccess: () => void;
}

const formSchema = z.object({
  applicant_id: z.string({ required_error: "Please select a candidate" }),
  joborder_id: z.string({ required_error: "Please select a job order" }),
  asking_salary: z.string().optional(),
  interview_notes: z.string().optional(),
});

const EndorseApplicantDialog = ({
  open,
  onOpenChange,
  jobOrder,
  user,
  onSuccess,
}: EndorseApplicantDialogProps) => {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(
    null
  );
  const [isResumeDialogOpen, setIsResumeDialogOpen] = useState(false);
  const [jobOrderSearch, setJobOrderSearch] = useState("");
  const [applicantSearch, setApplicantSearch] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      applicant_id: "",
      joborder_id: "",
      asking_salary: "",
      interview_notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset();
      fetchJobOrders();
    }
  }, [open]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value.joborder_id) {
        fetchApplicants();
      }
    });

    return () => subscription.unsubscribe();
  }, [form.watch]);

  const fetchJobOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("joborder")
        .select(`*`)
        .not("status", "in", "('Hire','On-hold','Canceled')")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJobOrders(data || []);
    } catch (error) {
      console.error("Error fetching job orders:", error);
      toast({
        title: "Error",
        description: "Failed to load job orders. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchApplicants = async () => {
    try {
      setIsLoading(true);

      // Get the selected job order ID from the form
      const selectedJobOrderId = form.getValues("joborder_id");

      if (!selectedJobOrderId) {
        setApplicants([]);
        return;
      }

      // Get existing applicants associated with the selected job order
      const { data: existingApplicantIds } = await supabase
        .from("joborder_applicant")
        .select("applicant_id")
        .eq("joborder_id", selectedJobOrderId);

      const existingIds =
        existingApplicantIds?.map((item) => item.applicant_id) || [];

      // Fetch all candidates that are not already associated with the selected job order
      // and were created by the current user
      const { data, error } = await supabase
        .from("applicants")
        .select("*")
        .not("id", "in", `(${existingIds.join(",")})`)
        .eq("author_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplicants(data || []);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      toast({
        title: "Error",
        description: "Failed to load candidates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter job orders based on search
  const filteredJobOrders = jobOrders.filter((jobOrder) =>
    jobOrder.job_title.toLowerCase().includes(jobOrderSearch.toLowerCase())
  );

  // Filter applicants based on search
  const filteredApplicants = applicants.filter(
    (applicant) =>
      applicant.first_name.toLowerCase().includes(applicantSearch.toLowerCase()) ||
      applicant.last_name.toLowerCase().includes(applicantSearch.toLowerCase()) ||
      applicant.email.toLowerCase().includes(applicantSearch.toLowerCase())
  );

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to endorse a candidate.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const selectedJobOrder = jobOrders.find(
        (j) => j.id === values.joborder_id
      );
      if (!selectedJobOrder) {
        throw new Error("Selected job order not found");
      }

      const { error } = await supabase.from("joborder_applicant").insert({
        joborder_id: values.joborder_id,
        client_id: selectedJobOrder.client_id,
        applicant_id: values.applicant_id,
        author_id: user.id,
        application_stage: "Sourced",
        application_status: "Pending",
        asking_salary: values.asking_salary
          ? Number(values.asking_salary.replace(/[^0-9]/g, ""))
          : null,
        interview_notes: values.interview_notes || null,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Candidate endorsed successfully!",
      });

      onSuccess();
      form.reset();
    } catch (error) {
      console.error("Error endorsing candidate:", error);
      toast({
        title: "Error",
        description: "Failed to endorse candidate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cross-endorse Candidate</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

          <FormField
              control={form.control}
              name="joborder_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Job Order</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a job order" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          placeholder="Search job orders..."
                          value={jobOrderSearch}
                          onChange={(e) => setJobOrderSearch(e.target.value)}
                          className="mb-2"
                        />
                      </div>
                      {filteredJobOrders.map((jobOrder) => (
                        <SelectItem key={jobOrder.id} value={jobOrder.id}>
                          {jobOrder.job_title}
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
              name="applicant_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Candidate</FormLabel>
                  <div className="flex gap-2">
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        const applicant = applicants.find(
                          (a) => a.id === value
                        );
                        setSelectedApplicant(applicant || null);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a candidate" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <div className="p-2">
                          <Input
                            placeholder="Search candidates..."
                            value={applicantSearch}
                            onChange={(e) => setApplicantSearch(e.target.value)}
                            className="mb-2"
                          />
                        </div>
                        {filteredApplicants.map((applicant) => (
                          <SelectItem key={applicant.id} value={applicant.id}>
                            {applicant.first_name} {applicant.last_name} -{" "}
                            {applicant.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedApplicant && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsResumeDialogOpen(true)}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            

            <FormField
              control={form.control}
              name="asking_salary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asking Salary (USD)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: $1,000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="interview_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profiler</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add updated profiler"
                      className="resize-y min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || applicants.length === 0}
              >
                {isSubmitting ? "Endorsing..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>

        {/* Secondary Dialog for Resume */}
        <Dialog open={isResumeDialogOpen} onOpenChange={setIsResumeDialogOpen}>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>View Resume</DialogTitle>
            </DialogHeader>
            {selectedApplicant && (
              <div className="h-[600px]">
                <iframe
                  src={selectedApplicant.cv_link || ""}
                  className="w-full h-full"
                  title="Resume"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default EndorseApplicantDialog;
