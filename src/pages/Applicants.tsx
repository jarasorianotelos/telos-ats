import { useEffect, useState } from "react";
import { User, Applicant } from "@/types";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, FileText, FileUser, Pencil, Trash2, LinkedinIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import CreateApplicantDialog from "@/components/Applicants/CreateApplicantDialog";
import EditApplicantDialog from "@/components/Applicants/EditApplicantDialog";
import { formatDateToEST } from "@/lib/utils";
import ViewResumeDialog from "@/components/job-orders/ViewResumeDialog";
import ApplicantJobOrdersDialog from "@/components/Applicants/ApplicantJobOrdersDialog";
import { useAuth } from "@/contexts/AuthContext";

export default function Applicants() {
  const { user } = useAuth();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(
    null
  );
  const [isResumeDialogOpen, setIsResumeDialogOpen] = useState(false);
  const [isJobOrdersDialogOpen, setIsJobOrdersDialogOpen] = useState(false);

  useEffect(() => {
    fetchApplicants();

    // Set up real-time subscription
    const applicantsSubscription = supabase
      .channel("applicants-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "applicants" },
        () => {
          fetchApplicants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(applicantsSubscription);
    };
  }, []);

  const fetchApplicants = async () => {
    try {
      const { data, error } = await supabase
        .from("applicants")
        .select(
          `
          *,
          author:users!applicants_author_id_fkey (
            first_name,
            last_name,
            username
          ),
          joborder_applicant(count)
        `
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplicants(data || []);
    } catch (error) {
      console.error("Error fetching applicants:", error);
      toast({
        title: "Error",
        description: "Failed to fetch applicants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteApplicant = async (id: string) => {
    try {
      // Soft delete by setting deleted_at
      const { error } = await supabase
        .from("applicants")
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Applicant deleted successfully!",
      });

      // Refresh the list
      fetchApplicants();
    } catch (error) {
      console.error("Error deleting applicant:", error);
      toast({
        title: "Error",
        description: "Failed to delete applicant. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewResume = (applicant: Applicant) => {
    setSelectedApplicant(applicant);
    setIsResumeDialogOpen(true);
  };

  // Remove filtering - show all applicants
  const filteredApplicants = applicants;

  return (
    <div className="flex h-screen">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} />

        <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h2 className="text-xl font-semibold">Candidates</h2>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-3 sm:mt-0">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Candidate
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-md shadow overflow-hidden">
                <div className="animate-pulse">
                  <div className="h-14 bg-gray-200"></div>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 border-t border-gray-200">
                      <div className="flex p-4">
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="w-24 h-8 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredApplicants.length > 0 ? (
              <div className="bg-white rounded-md shadow overflow-hidden">
                <Table>
                  <TableHeader className="bg-primary text-primary-foreground font-bold">
                    <TableRow>
                      <TableHead className="text-white">Name</TableHead>
                      <TableHead className="text-white">Email</TableHead>
                      <TableHead className="text-white">Phone</TableHead>
                      <TableHead className="text-white">Location</TableHead>
                      <TableHead className="text-white">Resume</TableHead>
                      <TableHead className="text-white">LinkedIn</TableHead>
                      <TableHead className="text-white">Added By</TableHead>
                      <TableHead className="text-white">Jobs</TableHead>
                      <TableHead className="text-center text-white">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplicants.map((applicant) => (
                      <TableRow key={applicant.id}>
                        <TableCell className="font-medium">
                          {applicant.first_name} {applicant.last_name}
                        </TableCell>
                        <TableCell>{applicant.email}</TableCell>
                        <TableCell>{applicant.phone || "N/A"}</TableCell>
                        <TableCell>{applicant.location || "N/A"}</TableCell>
                        <TableCell>
                          {applicant.cv_link && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewResume(applicant)}
                            >
                              <FileText className="h-4 w-4" />
                              <span className="sr-only">View Resume</span>
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          {applicant.linkedin_profile && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(applicant.linkedin_profile, "_blank")}
                            >
                              <LinkedinIcon className="h-4 w-4" />
                              <span className="sr-only">View LinkedIn</span>
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {applicant.author
                                ? user?.role === "administrator"
                                  ? `${applicant.author.first_name} ${applicant.author.last_name}`
                                  : applicant.author.username
                                : "N/A"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {applicant.created_at
                                ? formatDateToEST(applicant.created_at)
                                : "N/A"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {applicant.joborder_applicant && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedApplicant(applicant);
                                setIsJobOrdersDialogOpen(true);
                              }}
                            >
                              <span className="text-sm font-medium">
                                {applicant.joborder_applicant[0].count}
                              </span>
                              <span className="sr-only">View Job Orders</span>
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {(user?.role === "administrator" ||
                            user?.id === applicant.author_id) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mr-2"
                              onClick={() => {
                                setSelectedApplicant(applicant);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {user?.role === "administrator" && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleDeleteApplicant(applicant.id)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  {searchTerm
                    ? "No applicants match your search criteria."
                    : "No applicants found. Add your first applicant to get started."}
                </p>
                <Button
                  className="mt-4"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Applicant
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      <CreateApplicantDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          setIsCreateDialogOpen(false);
          fetchApplicants();
        }}
        user={user}
      />

      {selectedApplicant && (
        <>
          <ViewResumeDialog
            open={isResumeDialogOpen}
            onOpenChange={setIsResumeDialogOpen}
            applicantName={`${selectedApplicant.first_name} ${selectedApplicant.last_name}`}
            cvLink={selectedApplicant.cv_link}
            applicantId={selectedApplicant.id}
            onSuccess={() => {
              fetchApplicants();
            }}
          />
          <ApplicantJobOrdersDialog
            open={isJobOrdersDialogOpen}
            onOpenChange={setIsJobOrdersDialogOpen}
            applicant={selectedApplicant}
            user={user}
          />
          <EditApplicantDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            applicant={selectedApplicant}
            onSuccess={() => {
              fetchApplicants();
            }}
            user={user}
          />
        </>
      )}
    </div>
  );
}
