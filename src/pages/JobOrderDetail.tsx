import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import {
  User,
  JobOrder,
  JobOrderApplicant,
  Applicant,
  ApplicantWithDetails,
} from "@/types";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  Edit,
  UserPlus,
  Upload,
  Eye,
  FileText,
  Pencil,
  Save,
  Loader2,
  GitCompareArrows,
  LinkedinIcon,
  FlagTriangleRight,
  Trash2,
  Archive,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import EditJobOrderDialog from "@/components/job-orders/EditJobOrderDialog";
import AddApplicantDialog from "@/components/job-orders/AddApplicantDialog";
import EndorseApplicantDialog from "@/components/job-orders/EndorseApplicantDialog";
import { formatDateToEST } from "@/lib/utils";
import ViewResumeDialog from "@/components/job-orders/ViewResumeDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import JobOrderApplicantDialog from "@/components/job-orders/JobOrderApplicantDialog";
import ViewJobDescriptionDialog from "@/components/job-orders/ViewJobDescriptionDialog";
import ProfilerDialog from "@/components/job-orders/ProfilerDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import EditNotesDialog from "@/components/job-orders/EditNotesDialog";

interface JobOrderDetailProps {
  user: User | null;
}

interface JobOrderWithClient extends JobOrder {
  clients: {
    id: string;
    first_name: string;
    last_name: string;
    company: string;
    position: string;
    email: string;
    phone?: string;
  };
  sourcing_preference: string[] | null;
}

interface JobOrderApplicantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicant: ApplicantWithDetails;
}

const JobOrderDetail = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [jobOrder, setJobOrder] = useState<JobOrderWithClient | null>(null);
  const [applicants, setApplicants] = useState<ApplicantWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddApplicantOpen, setIsAddApplicantOpen] = useState(false);
  const [isEndorseOpen, setIsEndorseOpen] = useState(false);
  const [selectedApplicant, setSelectedApplicant] =
    useState<ApplicantWithDetails | null>(null);
  const [isResumeDialogOpen, setIsResumeDialogOpen] = useState(false);
  const [isApplicantDialogOpen, setIsApplicantDialogOpen] = useState(false);
  const [isJobDescriptionDialogOpen, setIsJobDescriptionDialogOpen] =
    useState(false);
  const [selectedJobOrder, setSelectedJobOrder] = useState<JobOrder | null>(
    null
  );
  const [isProfilerDialogOpen, setIsProfilerDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedApplicant, setEditedApplicant] =
    useState<ApplicantWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchJobOrderDetails();
      fetchJobOrderApplicants();

      // Set up real-time subscriptions
      const jobOrderSubscription = supabase
        .channel("job-order-detail-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "joborder",
            filter: `id=eq.${id}`,
          },
          () => {
            fetchJobOrderDetails();
          }
        )
        .subscribe();

      const applicantsSubscription = supabase
        .channel("job-order-applicants-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "joborder_applicant",
            filter: `joborder_id=eq.${id}`,
          },
          () => {
            fetchJobOrderApplicants();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(jobOrderSubscription);
        supabase.removeChannel(applicantsSubscription);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchJobOrderDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Build the query based on user role
      const { data, error } = await supabase
        .from("joborder")
        .select(user?.role !== "recruiter" ? `*, clients(*)` : `*`)
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("No job order found");
      }

      setJobOrder(data as unknown as JobOrderWithClient);
    } catch (error) {
      console.error("Error fetching job order details:", error);
      toast({
        title: "Error",
        description: "Failed to load job order details. Please try again.",
        variant: "destructive",
      });
      navigate("/job-orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchJobOrderApplicants = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("joborder_applicant")
        .select(
          `
          *,
          applicant:applicants(*),
          author:users!joborder_applicant_author_id_fkey (
            first_name,
            last_name,
            username
          )
        `
        )
        .eq("joborder_id", id);

      if (error) {
        throw error;
      }

      // Sort applicants by first name and last name in ascending order
      const sortedApplicants = [...(data as ApplicantWithDetails[])].sort(
        (a, b) => {
          const nameA = `${a.applicant?.first_name || ""} ${
            a.applicant?.last_name || ""
          }`.toLowerCase();
          const nameB = `${b.applicant?.first_name || ""} ${
            b.applicant?.last_name || ""
          }`.toLowerCase();
          return nameA.localeCompare(nameB);
        }
      );

      setApplicants(sortedApplicants);
    } catch (error) {
      console.error("Error fetching job order applicants:", error);
    }
  };

  const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      Kickoff: "bg-[#0085ca] text-white",
      Sourcing: "bg-cyan-100 text-cyan-800",
      "Internal Interview": "bg-purple-100 text-purple-800",
      "Internal Assessment": "bg-indigo-100 text-indigo-800",
      "Client Endorsement": "bg-amber-100 text-amber-800",
      "Client Assessment": "bg-yellow-100 text-yellow-800",
      "Client Interview": "bg-pink-100 text-pink-800",
      Offer: "bg-orange-100 text-orange-800",
      Hired: "bg-green-100 text-green-800",
      "On-Hold": "bg-gray-100 text-gray-800",
      Cancelled: "bg-red-100 text-red-800",
    };

    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  const getApplicationStageColor = (stage: string): string => {
    const stageColors: Record<string, string> = {
      Sourced: "bg-cyan-100 text-cyan-800",
      "Internal Interview": "bg-purple-100 text-purple-800",
      "Internal Assessment": "bg-indigo-100 text-indigo-800",
      "Client Endorsement": "bg-amber-100 text-amber-800",
      "Client Assessment": "bg-yellow-100 text-yellow-800",
      "Client Interview": "bg-pink-100 text-pink-800",
      Offer: "bg-orange-100 text-orange-800",
      Hired: "bg-green-100 text-green-800",
      "on-hold": "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
    };

    return stageColors[stage] || "bg-gray-100 text-gray-800";
  };

  const getApplicationStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      Pending: "bg-yellow-100 text-yellow-800",
      Pass: "bg-green-100 text-green-800",
      Fail: "bg-red-100 text-red-800",
    };

    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  const handleViewResume = (applicant: ApplicantWithDetails) => {
    setSelectedApplicant(applicant);
    setIsResumeDialogOpen(true);
  };

  const handleViewJobDescription = (jobOrder: JobOrder) => {
    setSelectedJobOrder(jobOrder);
    setIsJobDescriptionDialogOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedApplicant || !editedApplicant) {
      console.error("Missing required data:", {
        selectedApplicant,
        editedApplicant,
      });
      return;
    }

    try {
      setIsLoading(true);
      console.log("Starting update process with data:", {
        selectedApplicantId: selectedApplicant.id,
        editedData: {
          application_stage: editedApplicant.application_stage,
          application_status: editedApplicant.application_status,
          asking_salary: editedApplicant.asking_salary,
          client_feedback: editedApplicant.client_feedback,
          candidate_start_date: editedApplicant.candidate_start_date,
        }
      });

      // First, verify the record exists
      const { data: existingRecord, error: fetchError } = await supabase
        .from("joborder_applicant")
        .select("*")
        .eq("id", selectedApplicant.id)
        .single();

      if (fetchError) {
        console.error("Error fetching existing record:", fetchError);
        throw fetchError;
      }

      console.log("Existing record found:", existingRecord);

      // Check if there are actual changes
      const hasChanges = 
        existingRecord.application_stage !== editedApplicant.application_stage ||
        existingRecord.application_status !== editedApplicant.application_status ||
        existingRecord.asking_salary !== editedApplicant.asking_salary ||
        existingRecord.client_feedback !== editedApplicant.client_feedback ||
        existingRecord.candidate_start_date !== editedApplicant.candidate_start_date;

      if (!hasChanges) {
        console.log("No changes detected, skipping update");
        toast({
          title: "Info",
          description: "No changes were made to update.",
        });
        setIsEditing(false);
        return;
      }

      // Prepare the update data
      const updateData = {
        application_stage: editedApplicant.application_stage,
        application_status: editedApplicant.application_status,
        asking_salary: editedApplicant.asking_salary,
        client_feedback: editedApplicant.client_feedback,
        candidate_start_date: editedApplicant.candidate_start_date,
        updated_at: new Date().toISOString(),
      };

      console.log("Attempting to update with data:", updateData);

      // Perform the update with explicit error handling
      const { data: updateResult, error: updateError } = await supabase
        .from("joborder_applicant")
        .update(updateData)
        .eq("id", selectedApplicant.id)
        .select()
        .single();

      if (updateError) {
        console.error("Update error:", updateError);
        throw new Error(`Failed to update record: ${updateError.message}`);
      }

      if (!updateResult) {
        throw new Error("Update operation returned no data");
      }

      console.log("Update result:", updateResult);

      // Add a small delay to ensure the update has propagated
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Fetch the updated record with a simpler query first
      const { data: updatedRecord, error: fetchUpdatedError } = await supabase
        .from("joborder_applicant")
        .select("*")
        .eq("id", selectedApplicant.id)
        .single();

      if (fetchUpdatedError) {
        console.error("Error fetching updated record:", fetchUpdatedError);
        throw new Error(`Failed to fetch updated record: ${fetchUpdatedError.message}`);
      }

      if (!updatedRecord) {
        throw new Error("Failed to fetch updated record");
      }

      console.log("Updated record:", updatedRecord);

      // Verify the update was successful
      const verificationFailed = 
        updatedRecord.application_stage !== editedApplicant.application_stage ||
        updatedRecord.application_status !== editedApplicant.application_status ||
        updatedRecord.asking_salary !== editedApplicant.asking_salary ||
        updatedRecord.client_feedback !== editedApplicant.client_feedback ||
        updatedRecord.candidate_start_date !== editedApplicant.candidate_start_date;

      if (verificationFailed) {
        console.error("Update verification failed:", {
          expected: updateData,
          actual: {
            application_stage: updatedRecord.application_stage,
            application_status: updatedRecord.application_status,
            asking_salary: updatedRecord.asking_salary,
            client_feedback: updatedRecord.client_feedback,
            candidate_start_date: updatedRecord.candidate_start_date,
            updated_at: updatedRecord.updated_at
          }
        });

        // Try one more time with a different approach
        const { data: retryResult, error: retryError } = await supabase
          .from("joborder_applicant")
          .update({
            application_status: editedApplicant.application_status
          })
          .eq("id", selectedApplicant.id)
          .select()
          .single();

        if (retryError) {
          console.error("Retry update error:", retryError);
          throw new Error(`Failed to update application_status: ${retryError.message}`);
        }

        if (!retryResult) {
          throw new Error("Retry update returned no data");
        }

        console.log("Retry result:", retryResult);

        if (retryResult.application_status !== editedApplicant.application_status) {
          throw new Error(`Failed to update application_status. Expected: ${editedApplicant.application_status}, Got: ${retryResult.application_status}`);
        }
      }

      // Fetch the complete updated record with relations
      const { data: finalRecord, error: finalError } = await supabase
        .from("joborder_applicant")
        .select(`
          *,
          applicant:applicants(*),
          author:users!joborder_applicant_author_id_fkey (
            first_name,
            last_name,
            username
          )
        `)
        .eq("id", selectedApplicant.id)
        .single();

      if (finalError) {
        throw new Error(`Failed to fetch final record: ${finalError.message}`);
      }

      // Update the local state with the final record
      setApplicants((prevApplicants) =>
        prevApplicants.map((applicant) =>
          applicant.id === selectedApplicant.id
            ? finalRecord
            : applicant
        )
      );

      // Reset states
      setSelectedApplicant(null);
      setIsEditing(false);
      setEditedApplicant(null);

      toast({
        title: "Success",
        description: "Applicant details updated successfully!",
      });

      // Refresh the applicants list
      await fetchJobOrderApplicants();
    } catch (error) {
      console.error("Error saving changes:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!jobOrder) return;

    try {
      setIsDeleting(true);
      const now = new Date().toISOString();

      // First, soft delete all related joborder_applicant records
      const { error: updateApplicantsError } = await supabase
        .from("joborder_applicant")
        .update({
          deleted_at: now,
          updated_at: now
        })
        .eq("joborder_id", jobOrder.id);

      if (updateApplicantsError) {
        console.error("Error soft deleting related applicants:", updateApplicantsError);
        throw updateApplicantsError;
      }

      // Then soft delete the job order
      const { error: updateJobOrderError } = await supabase
        .from("joborder")
        .update({
          deleted_at: now,
          updated_at: now
        })
        .eq("id", jobOrder.id);

      if (updateJobOrderError) {
        console.error("Error soft deleting job order:", updateJobOrderError);
        throw updateJobOrderError;
      }

      toast({
        title: "Success",
        description: "Job order deleted successfully",
      });
      navigate("/job-orders");
    } catch (error) {
      console.error("Error in delete operation:", error);
      toast({
        title: "Error",
        description: "Failed to delete job order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchive = async () => {
    if (!jobOrder) return;

    try {
      setIsArchiving(true);
      const { error } = await supabase
        .from("joborder")
        .update({ archived: !jobOrder.archived })
        .eq("id", jobOrder.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Job order ${
          jobOrder.archived ? "unarchived" : "archived"
        } successfully`,
      });
      fetchJobOrderDetails();
    } catch (error) {
      console.error("Error archiving job order:", error);
      toast({
        title: "Error",
        description: `Failed to ${
          jobOrder.archived ? "unarchive" : "archive"
        } job order`,
        variant: "destructive",
      });
    } finally {
      setIsArchiving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header user={user} />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
            <div className="max-w-7xl mx-auto">
              <div className="animate-pulse space-y-4">
                <div className="h-8 w-48 bg-gray-200 rounded"></div>
                <div className="h-64 w-full bg-gray-200 rounded"></div>
                <div className="h-96 w-full bg-gray-200 rounded"></div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!jobOrder) {
    return (
      <div className="flex h-screen">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header user={user} />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
            <div className="max-w-7xl mx-auto text-center py-12">
              <h2 className="text-xl font-semibold mb-2">
                Job Order Not Found
              </h2>
              <p className="text-muted-foreground mb-6">
                The job order you're looking for doesn't exist or has been
                removed.
              </p>
              <Button onClick={() => navigate("/job-orders")}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Job Orders
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} />

        <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/job-orders")}
                className="mr-2"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>

              <h2 className="text-xl font-semibold flex-1">
                {jobOrder.job_title}
              </h2>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleArchive}
                  disabled={isArchiving}
                >
                  {isArchiving ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Archive className="h-4 w-4 mr-1" />
                  )}
                  {jobOrder.archived ? "Unarchive" : "Archive"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  Delete
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Job Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Status
                      </p>
                      <Badge className={getStatusColor(jobOrder.status)}>
                        {jobOrder.status}
                      </Badge>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Created
                      </p>
                      <p>
                        {jobOrder.created_at
                          ? formatDateToEST(jobOrder.created_at, "PPP")
                          : "N/A"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Schedule
                      </p>
                      <p>{jobOrder.schedule || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Maturity
                      </p>
                      <p>
                        {jobOrder.created_at
                          ? `${differenceInDays(
                              new Date(),
                              new Date(jobOrder.created_at)
                            )} day/s`
                          : "N/A"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Sourcing Preferences
                      </p>
                      {jobOrder.sourcing_preference &&
                      jobOrder.sourcing_preference.length > 0 ? (
                        <ul className="list-disc list-inside">
                          {jobOrder.sourcing_preference.map(
                            (preference, index) => (
                              <li key={index} className="text-sm">
                                {preference}
                              </li>
                            )
                          )}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Not specified
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Budget
                      </p>
                      <p>{jobOrder.client_budget || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Priority
                      </p>
                      <p>{jobOrder.priority || "Not specified"}</p>
                    </div>
                    <div className="mt-6">
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Job Description
                      </p>
                      <div className="flex justify-start gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewJobDescription(jobOrder)}
                        >
                          <FileText className="h-4 w-4" />
                          <span className="sr-only">View Job Description</span>
                        </Button>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Notes / Updates
                        </p>
                        <EditNotesDialog
                          jobOrderId={jobOrder.id}
                          currentNotes={jobOrder.updates || ""}
                          onSuccess={() => {
                            fetchJobOrderDetails();
                          }}
                        />
                      </div>
                      <p>{jobOrder.updates || "Not specified"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Client Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Name
                        </p>
                        <p>
                          {jobOrder.clients?.first_name || "N/A"}{" "}
                          {jobOrder.clients?.last_name || ""}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Company
                        </p>
                        <p>{jobOrder.clients?.company || "N/A"}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Position
                        </p>
                        <p>{jobOrder.clients?.position || "N/A"}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Email
                        </p>
                        <p className="truncate">{jobOrder.clients?.email || "N/A"}</p>
                      </div>

                      {jobOrder.clients?.phone && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Phone
                          </p>
                          <p>{jobOrder.clients.phone}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Candidates</CardTitle>
                <div className="flex gap-2">
                  <Button
                    className="bg-[#EAE6E1] text-black font-bold"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEndorseOpen(true)}
                  >
                    <GitCompareArrows className="h-4 w-4 mr-1" />
                    Cross-endorse Candidate
                  </Button>

                  <Button size="sm" onClick={() => setIsAddApplicantOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-1" />
                    Add New Candidate
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {applicants.length > 0 ? (
                  <Table>
                    <TableHeader className="bg-[#0085ca] text-white font-bold">
                      <TableRow>
                        <TableHead className="text-start  text-white font-bold">
                          Endorsed by
                        </TableHead>
                        <TableHead className="text-start  text-white font-bold">
                          Name
                        </TableHead>
                        <TableHead className="text-start  text-white font-bold">
                          Contact
                        </TableHead>
                        <TableHead className="text-start  text-white font-bold">
                          Resume
                        </TableHead>
                        <TableHead className="text-start  text-white font-bold">
                          LinkedIn
                        </TableHead>
                        <TableHead className="text-start  text-white font-bold">
                          Profiler
                        </TableHead>
                        <TableHead className="text-center  text-white font-bold">
                          Stage
                        </TableHead>
                        <TableHead className="text-center  text-white font-bold">
                          Status
                        </TableHead>
                        <TableHead className="text-center  text-white font-bold">
                          Salary
                        </TableHead>
                        <TableHead className="text-center  text-white font-bold">
                          Client Feedback
                        </TableHead>
                        <TableHead className="text-center  text-white font-bold">
                          Candidate Start Date
                        </TableHead>
                          <TableHead className="text-center  text-white font-bold">
                            Edit
                          </TableHead>

                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applicants.map((applicant) => (
                        <TableRow key={applicant.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-start">
                                {applicant.author
                                  ? user?.role === "administrator"
                                    ? `${applicant.author.first_name} ${applicant.author.last_name}`
                                    : applicant.author.username
                                  : "N/A"}
                              </p>
                              <p className="text-sm text-muted-foreground  text-start">
                                {applicant.created_at
                                  ? formatDateToEST(applicant.created_at)
                                  : "N/A"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium  text-start">
                                {applicant.applicant?.first_name}{" "}
                                {applicant.applicant?.last_name}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-start">
                              {applicant.applicant?.email}
                            </p>
                            {applicant.applicant?.phone && (
                              <p className="text-xs text-muted-foreground text-start">
                                {applicant.applicant.phone}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewResume(applicant)}
                              >
                                <FileText className="h-4 w-4" />
                                <span className="sr-only">View Resume</span>
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            {applicant.applicant?.linkedin_profile && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  window.open(
                                    applicant.applicant?.linkedin_profile,
                                    "_blank"
                                  )
                                }
                              >
                                <LinkedinIcon className="h-4 w-4" />
                                <span className="sr-only">View LinkedIn</span>
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedApplicant(applicant);
                                  setIsProfilerDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">View Profiler</span>
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {isEditing &&
                            selectedApplicant?.id === applicant.id ? (
                              <Select
                                value={editedApplicant.application_stage}
                                onValueChange={(
                                  value:
                                    | "Sourced"
                                    | "Interview"
                                    | "Assessment"
                                    | "Client Endorsement"
                                    | "Client Interview"
                                    | "Offer"
                                    | "Hired"
                                ) =>
                                  setEditedApplicant((prev) => ({
                                    ...prev,
                                    application_stage: value,
                                  }))
                                }
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Select stage" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Sourced">
                                    Sourced
                                  </SelectItem>
                                  <SelectItem value="Internal Interview">
                                    Internal Interview{" "}
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
                                  <SelectItem value="Hired">Hired</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge
                                className={getApplicationStageColor(
                                  applicant.application_stage
                                )}
                              >
                                {applicant.application_stage}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {isEditing &&
                            selectedApplicant?.id === applicant.id ? (
                              <Select
                                value={editedApplicant.application_status}
                                onValueChange={(
                                  value: "Pending" | "Pass" | "Fail"
                                ) =>
                                  setEditedApplicant((prev) => ({
                                    ...prev,
                                    application_status: value,
                                  }))
                                }
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Pending">
                                    Pending
                                  </SelectItem>
                                  <SelectItem value="Pass">Pass</SelectItem>
                                  <SelectItem value="Fail">Fail</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge
                                className={getApplicationStatusColor(
                                  applicant.application_status
                                )}
                              >
                                {applicant.application_status}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {isEditing &&
                            selectedApplicant?.id === applicant.id ? (
                              <Input
                                type="number"
                                value={editedApplicant.asking_salary || ""}
                                onChange={(e) =>
                                  setEditedApplicant((prev) => ({
                                    ...prev,
                                    asking_salary: e.target.value
                                      ? Number(e.target.value)
                                      : null,
                                  }))
                                }
                                className="w-[180px]"
                              />
                            ) : applicant.asking_salary ? (
                              `$${applicant.asking_salary.toLocaleString()}`
                            ) : (
                              "N/A"
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {isEditing &&
                            selectedApplicant?.id === applicant.id ? (
                              <Textarea
                                value={editedApplicant.client_feedback || ""}
                                onChange={(e) =>
                                  setEditedApplicant((prev) => ({
                                    ...prev,
                                    client_feedback: e.target.value,
                                  }))
                                }
                                className="w-[180px]"
                              />
                            ) : (
                              applicant.client_feedback || "N/A"
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {isEditing &&
                            selectedApplicant?.id === applicant.id ? (
                              <Input
                                type="date"
                                value={
                                  editedApplicant.candidate_start_date || ""
                                }
                                onChange={(e) =>
                                  setEditedApplicant((prev) => ({
                                    ...prev,
                                    candidate_start_date: e.target.value,
                                  }))
                                }
                                className="w-[180px]"
                              />
                            ) : (
                              applicant.candidate_start_date || "N/A"
                            )}
                          </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {isEditing &&
                                selectedApplicant?.id === applicant.id ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleSaveChanges}
                                    disabled={isLoading}
                                  >
                                    {isLoading ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Save className="h-4 w-4" />
                                    )}
                                    <span className="sr-only">
                                      Save Changes
                                    </span>
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedApplicant(applicant);
                                      setEditedApplicant(applicant);
                                      setIsEditing(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                    <span className="sr-only">Edit Status</span>
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      No applicants have been added to this job order yet.
                    </p>
                    <Button
                      className="mt-4"
                      onClick={() => setIsAddApplicantOpen(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add First Candidate
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {jobOrder && (
        <>
          <EditJobOrderDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            jobOrder={jobOrder}
            onSuccess={() => {
              setIsEditDialogOpen(false);
              fetchJobOrderDetails();
            }}
          />

          <AddApplicantDialog
            open={isAddApplicantOpen}
            onOpenChange={setIsAddApplicantOpen}
            jobOrder={jobOrder}
            user={user}
            onSuccess={() => {
              setIsAddApplicantOpen(false);
              fetchJobOrderApplicants();
            }}
          />

          <EndorseApplicantDialog
            open={isEndorseOpen}
            onOpenChange={setIsEndorseOpen}
            jobOrder={jobOrder}
            user={user}
            onSuccess={() => {
              setIsEndorseOpen(false);
              fetchJobOrderApplicants();
            }}
          />

          {selectedApplicant && (
            <ViewResumeDialog
              open={isResumeDialogOpen}
              onOpenChange={setIsResumeDialogOpen}
              applicantName={`${selectedApplicant.applicant?.first_name} ${selectedApplicant.applicant?.last_name}`}
              cvLink={selectedApplicant.applicant?.cv_link || null}
              applicantId={selectedApplicant.applicant?.id || ""}
              onSuccess={() => {
                fetchJobOrderApplicants();
              }}
            />
          )}

          {selectedApplicant && (
            <JobOrderApplicantDialog
              open={isApplicantDialogOpen}
              onOpenChange={setIsApplicantDialogOpen}
              applicant={selectedApplicant}
              userRole={user?.role}
              onSuccess={() => {
                fetchJobOrderApplicants();
              }}
            />
          )}

          {selectedJobOrder && (
            <ViewJobDescriptionDialog
              open={isJobDescriptionDialogOpen}
              onOpenChange={setIsJobDescriptionDialogOpen}
              jobTitle={selectedJobOrder.job_title}
              jobDescriptionLink={selectedJobOrder.job_description}
              jobOrderId={selectedJobOrder.id}
              onSuccess={() => {
                fetchJobOrderDetails();
              }}
              user={user}
            />
          )}

          <ProfilerDialog
            open={isProfilerDialogOpen}
            onOpenChange={setIsProfilerDialogOpen}
            applicant={selectedApplicant}
            onSuccess={() => {
              fetchJobOrderApplicants();
            }}
          />
        </>
      )}
    </div>
  );
};

export default JobOrderDetail;
