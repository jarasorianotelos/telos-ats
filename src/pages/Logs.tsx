import { useState, useEffect, useCallback } from "react";
import { User } from "@/types";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import LogsTable from "@/components/log/LogsTable";
import LogsFilterBar from "@/components/log/LogsFilterBar";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface LogsPageProps {
  user: User | null;
}

const Logs = ({ user }: LogsPageProps) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [entityType, setEntityType] = useState<string>("all");
  const [action, setAction] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from("system_logs")
        .select(`
          *,
          users:user_id(id, first_name, last_name, email)
        `)
        .order("created_at", { ascending: false });
      
      // Apply entity type filter
      if (entityType !== "all") {
        query = query.eq("entity_type", entityType);
      }
      
      // Apply action filter
      if (action !== "all") {
        query = query.eq("action", action);
      }
      
      // Apply date range filter
      if (startDate) {
        const startDateISO = startDate.toISOString();
        query = query.gte("created_at", startDateISO);
      }
      
      if (endDate) {
        // Add one day to include the entire end date
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const endDateISO = nextDay.toISOString();
        query = query.lt("created_at", endDateISO);
      }
      
      // Apply search query filter on JSON details
      if (searchQuery) {
        // Search in the JSONB details field
        query = query.or(`details.ilike.%${searchQuery}%`);
      }
      
      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setLogs(data || []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error fetching logs:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [entityType, action, startDate, endDate, searchQuery]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Ensure only admins can access this page as a double-layer of security

    return (
      <Layout pageTitle="Access Denied" user={user}>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>You do not have permission to view this page.</p>
        </div>
      </Layout>
    );


  return (
    <Layout pageTitle="System Logs" user={user}>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">System Logs</h1>
        
        <LogsFilterBar
          entityType={entityType}
          setEntityType={setEntityType}
          action={action}
          setAction={setAction}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
        
        {loading ? (
          <Card className="mt-6">
            <CardContent className="pt-6 flex items-center justify-center h-80">
              <div className="flex flex-col items-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading logs...</p>
              </div>
            </CardContent>
          </Card>
        ) : logs.length > 0 ? (
          <LogsTable logs={logs} />
        ) : (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="text-center p-6">
                <p className="text-muted-foreground">No logs found matching the selected filters.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Logs;