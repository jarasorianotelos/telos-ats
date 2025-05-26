import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDistanceToNow, subHours } from "date-fns";

interface Update {
  id: string;
  type: "joborder" | "applicant";
  title: string;
  description: string;
  updated_at: string;
  joborder_id: string;
}

const RecentUpdatesDialog = () => {
  const [open, setOpen] = useState(false);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [hasUpdates, setHasUpdates] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecentUpdates();
  }, []);

  const fetchRecentUpdates = async () => {
    try {
      const fortyEightHoursAgo = subHours(new Date(), 48).toISOString();

      // Get recent system logs within 48 hours
      const { data: systemLogs, error: logsError } = await supabase
        .from("system_logs")
        .select(`
          id,
          action,
          entity_type,
          entity_id,
          details,
          created_at,
          users!inner(id, first_name, last_name)
        `)
        .gte('created_at', fortyEightHoursAgo)
        .order("created_at", { ascending: false })
        .limit(6);

      if (logsError) throw logsError;

      const formattedUpdates: Update[] = systemLogs?.map(log => {
        const changes = log.details.changes || {};
        const changesList = Object.entries(changes)
          .filter(([key]) => key !== 'updated_at')
          .map(([key, value]) => {
            const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return `${formattedKey}: ${value}`;
          });

        return {
          id: log.id,
          type: log.entity_type as "joborder" | "applicant",
          title: log.entity_type === "joborder" 
            ? log.details.new?.job_title || "Job Order"
            : `${log.details.new?.first_name || ""} ${log.details.new?.last_name || ""}`,
          description: changesList.length > 0 
            ? `Changes:\n${changesList.map(c => `- ${c}`).join('\n')}`
            : 'No changes recorded',
          updated_at: log.created_at,
          joborder_id: log.entity_id
        };
      }) || [];

      setUpdates(formattedUpdates);
      setHasUpdates(formattedUpdates.length > 0);
    } catch (error) {
      console.error("Error fetching updates:", error);
    }
  };

  const handleUpdateClick = (joborderId: string) => {
    setOpen(false);
    navigate(`/job-orders/${joborderId}`);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative p-2 hover:bg-gray-100 rounded-full"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={hasUpdates ? "text-green-500" : "text-gray-500"}
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {hasUpdates && (
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-green-500 ring-2 ring-white" />
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Recent Updates (Last 48 Hours)</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] space-y-4 pr-2">
            {updates.length > 0 ? (
              updates.map((update) => (
                <div
                  key={update.id}
                  className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleUpdateClick(update.joborder_id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{update.title}</p>
                      <p className="text-sm text-gray-600 whitespace-pre-line">{update.description}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(update.updated_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500">No updates in the last 48 hours</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RecentUpdatesDialog; 