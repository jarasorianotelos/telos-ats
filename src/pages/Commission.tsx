import { useEffect, useState, useCallback } from "react";
import { User } from "@/types";
import { type JobOrderCommission } from "@/types";
import { Layout } from "@/components/layout/Layout";
import CommissionTable from "@/components/commission/CommissionTable";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { formatCurrency, formatCurrencyPHP } from "@/lib/utils";
import CommissionSummary from "@/components/commission/CommissionSummary";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface CommissionPageProps {
  user: User | null;
}

const Commission = ({ user }: CommissionPageProps) => {
  const [commissions, setCommissions] = useState<JobOrderCommission[]>([]);
  const [filteredCommissions, setFilteredCommissions] = useState<JobOrderCommission[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCommission, setTotalCommission] = useState(0);
  const [pendingCommission, setPendingCommission] = useState(0);

  const fetchCommissionData = useCallback(async () => {
    try {
      setLoading(true);
      
      // First, get the joborder_applicant IDs for the current user if they're a recruiter
      let joborderApplicantIds: string[] = [];
      if (user?.role === "recruiter") {
        const { data: joborderApplicants, error: joborderError } = await supabase
          .from("joborder_applicant")
          .select("id")
          .eq("author_id", user.id);

        if (joborderError) throw joborderError;
        joborderApplicantIds = joborderApplicants?.map(ja => ja.id) || [];
      }

      // Build the main query
      let query = supabase
        .from("joborder_commission")
        .select(`
          *,
          joborder_applicant:joborder_applicant_id (
            *,
            joborder:joborder_id (
              job_title
            ),
            applicant:applicant_id (
              first_name,
              last_name
            ),
            author:author_id (
              username
            )
          )
        `)
        .is("deleted_at", null);

      // Add role-based filtering
      if (user?.role === "recruiter" && joborderApplicantIds.length > 0) {
        query = query.in("joborder_applicant_id", joborderApplicantIds);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Sort the data by candidate_start_date
      const sortedData = [...(data || [])].sort((a, b) => {
        const dateA = new Date(a.joborder_applicant?.candidate_start_date || 0);
        const dateB = new Date(b.joborder_applicant?.candidate_start_date || 0);
        return dateA.getTime() - dateB.getTime();
      });

      setCommissions(sortedData);
      
      // Calculate total and pending commissions
      let total = 0;
      let pending = 0;
      
      sortedData?.forEach(commission => {
        try {
          if (commission.commission_details) {
            const details = JSON.parse(commission.commission_details);
            const totalAmount = Array.isArray(details) 
              ? details.reduce((sum, detail) => sum + (detail.amount || 0), 0)
              : details.amount || 0;
            total += totalAmount;
            // Calculate pending as current_commission - received_commission
            pending += (commission.current_commission || 0) - (commission.received_commission || 0);
          } else {
            total += commission.received_commission || 0;
            // Calculate pending as current_commission - received_commission
            pending += (commission.current_commission || 0) - (commission.received_commission || 0);
          }
        } catch (error) {
          console.error("Error calculating commission amount:", error);
          total += commission.received_commission || 0;
          // Calculate pending as current_commission - received_commission
          pending += (commission.current_commission || 0) - (commission.received_commission || 0);
        }
      });
      
      setTotalCommission(total);
      setPendingCommission(pending);
      
    } catch (error) {
      console.error("Error fetching commission data:", error);
      toast({
        title: "Error",
        description: "Failed to load commission data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchAdminUsers = useCallback(async () => {
    try {
      if (user?.role === "recruiter") {
        setAdminUsers([]);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "administrator");

      if (error) throw error;

      setAdminUsers(data || []);
    } catch (error) {
      console.error("Error fetching admin users:", error);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchCommissionData();
    fetchAdminUsers();
  }, [fetchCommissionData, fetchAdminUsers]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredCommissions(commissions);
      return;
    }

    const filtered = commissions.filter((commission) => {
      const searchLower = searchTerm.toLowerCase();
      const candidateName = `${commission.joborder_applicant?.applicant?.first_name || ""} ${commission.joborder_applicant?.applicant?.last_name || ""}`.toLowerCase();
      const recruiterUsername = commission.joborder_applicant?.author?.username?.toLowerCase() || "";
      const jobTitle = commission.joborder_applicant?.joborder?.job_title?.toLowerCase() || "";

      return (
        candidateName.includes(searchLower) ||
        recruiterUsername.includes(searchLower) ||
        jobTitle.includes(searchLower)
      );
    });

    setFilteredCommissions(filtered);
  }, [searchTerm, commissions]);

  // Update the access control check 
    return (
      <Layout pageTitle="Access Denied" user={user}>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>You do not have permission to view this page.</p>
        </div>
      </Layout>
    );


  return (
    <Layout pageTitle="Commission" user={user}>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by candidate name, recruiter username, or job title..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <CommissionSummary commissions={filteredCommissions} />
        <CommissionTable
          commissions={filteredCommissions}
          onUpdate={fetchCommissionData}
          adminUsers={adminUsers}
        />
      </div>
    </Layout>
  );
};

export default Commission;
