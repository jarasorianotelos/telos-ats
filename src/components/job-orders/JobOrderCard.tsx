import { formatDistanceToNowEST } from "@/lib/utils";
import { JobOrder } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Star, FlagTriangleRight } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface JobOrderCardProps {
  jobOrder: JobOrder;
  onClick: () => void;
}

const JobOrderCard = ({ jobOrder, onClick }: JobOrderCardProps) => {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);

  const checkFavorite = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("joborder_favorites")
        .select("id")
        .eq("joborder_id", jobOrder.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking favorite:", error);
        return;
      }

      setIsFavorite(!!data);
    } catch (error) {
      console.error("Error checking favorite:", error);
      setIsFavorite(false);
    }
  }, [jobOrder.id, user]);

  useEffect(() => {
    checkFavorite();
  }, [checkFavorite]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when clicking star
    if (!user) return;

    try {
      if (isFavorite) {
        // Remove from favorites
        await supabase
          .from("joborder_favorites")
          .delete()
          .eq("joborder_id", jobOrder.id)
          .eq("user_id", user.id);
      } else {
        // Add to favorites
        await supabase.from("joborder_favorites").insert({
          joborder_id: jobOrder.id,
          user_id: user.id,
        });
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      Kickoff: "bg-[#A74D4A] text-white",
      Sourcing: "bg-cyan-100 text-cyan-800",
      "Internal Interview": "bg-purple-100 text-purple-800",
      "Internal Assessment": "bg-indigo-100 text-indigo-800",
      "Client Endorsement": "bg-amber-100 text-amber-800",
      "Client Assessment": "bg-yellow-100 text-yellow-800",
      "Client Interview": "bg-pink-100 text-pink-800",
      Offer: "bg-orange-100 text-orange-800",
      Hire: "bg-green-100 text-green-800",
      "On-hold": "bg-gray-100 text-gray-800",
      Canceled: "bg-red-100 text-red-800",
    };

    const color = statusColors[status] || "bg-gray-100 text-gray-800";
    return color;
  };

  const formattedDate = jobOrder.created_at
    ? formatDistanceToNowEST(jobOrder.created_at)
    : "Unknown date";

  // Extract client name from the clients relation
  const clientName = jobOrder.clients
    ? `${jobOrder.clients.first_name} ${jobOrder.clients.last_name}`
    : "Unknown client";

  const clientCompany = jobOrder.clients?.company || "Unknown company";

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-lg line-clamp-2">
              {jobOrder.job_title}
            </h3>
            <Badge className={getStatusColor(jobOrder.status)}>
              {jobOrder.status}
            </Badge>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <Users className={`h-4 w-4 mr-1 ${jobOrder.applicant_count > 0 ? "text-red-500" : ""}`} />
              <span className={jobOrder.applicant_count > 0 ? "text-red-500 font-bold" : ""}>
                {jobOrder.applicant_count || 0} candidates
              </span>
            </div>

            <div className="text-xs text-muted-foreground">
              Created {formattedDate}
            </div>
            <div className="flex flex-row justify-between items-center w-full">
              <div className="flex items-center text-sm text-muted-foreground">
                <FlagTriangleRight className="h-4 w-4 mr-1" />
                <span>{jobOrder.priority || "N/A"}</span>
              </div>
              <div className="flex items-right text-sm justify-center text-muted-foreground text-right">
                <div
                  className={`p-1 rounded-full ${
                    isFavorite ? "bg-[#A74D4A]" : ""
                  }`}
                  onClick={toggleFavorite}
                >
                  <Star
                    className={`h-4 w-4 cursor-pointer ${
                      isFavorite ? "text-white" : "text-gray-400"
                    }`}
                    onClick={toggleFavorite}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default JobOrderCard;
