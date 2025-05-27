import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { supabase } from "@/lib/supabase";
import {
  JobOrderStatus,
  ApplicantsPerJobOrder,
  UserAverageCompletion,
} from "@/types";

// Sample data in case of error or empty data from database
const sampleStatusData = [
  { status: "Open", count: 4, color: "#3b82f6" },
  { status: "In Progress", count: 7, color: "#f59e0b" },
  { status: "Closed", count: 3, color: "#10b981" },
];

const sampleApplicantsData = [
  { job_title: "Frontend Developer", applicants_count: 12 },
  { job_title: "Backend Engineer", applicants_count: 8 },
  { job_title: "UX Designer", applicants_count: 15 },
  { job_title: "Product Manager", applicants_count: 6 },
  { job_title: "DevOps Engineer", applicants_count: 4 },
];

const sampleCompletionData = [
  { user_name: "John D.", average_days: 15 },
  { user_name: "Sarah M.", average_days: 12 },
  { user_name: "Robert K.", average_days: 18 },
  { user_name: "Emma T.", average_days: 10 },
];

const ChartSection = () => {
  const [statusData, setStatusData] =
    useState<JobOrderStatus[]>(sampleStatusData);
  const [applicantsData, setApplicantsData] =
    useState<ApplicantsPerJobOrder[]>(sampleApplicantsData);
  const [completionData, setCompletionData] =
    useState<UserAverageCompletion[]>(sampleCompletionData);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("job-stats");

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);

        // Fetch job order status data - fixing the group method error
        const { data: statusData, error: statusError } = await supabase
          .from("joborder")
          .select("status, count")
          .select("status"); // Use select instead of group
        // Count will be calculated manually after fetching the data

        if (!statusError && statusData) {
          // Process the data to get counts by status
          const statusCounts: Record<string, number> = {};
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          statusData.forEach((item: any) => {
            const status = item.status;
            statusCounts[status] = (statusCounts[status] || 0) + 1;
          });

          // Convert to the format we need
          const processedStatusData: JobOrderStatus[] = Object.entries(
            statusCounts
          ).map(([status, count]) => ({
            status,
            count,
            color: getStatusColor(status),
          }));

          setStatusData(
            processedStatusData.length > 0
              ? processedStatusData
              : sampleStatusData
          );
        }

        // Fetch applicants per job order data
        const { data: applicantsData, error: applicantsError } =
          await supabase.from("joborder").select(`
            id, 
            job_title
          `);

        if (!applicantsError && applicantsData) {
          // For each job order, we need to get the count of applicants
          const jobApplicantCounts = await Promise.all(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            applicantsData.map(async (job: any) => {
              const { count } = await supabase
                .from("joborder_applicant")
                .select("*", { count: "exact", head: true })
                .eq("joborder_id", job.id);

              return {
                job_title: job.job_title,
                applicants_count: count || 0,
              };
            })
          );

          setApplicantsData(
            jobApplicantCounts.length > 0
              ? jobApplicantCounts
              : sampleApplicantsData
          );
        }

        // This would be a more complex query for average completion time
        // For now we just use sample data
      } catch (error) {
        console.error("Error fetching chart data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, []);

  const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      Kickoff: "#D64541", // Softer red for better contrast
      Sourcing: "#00B3B3", // Less neon cyan, easier on the eyes
      "Internal Interview": "#CBA6F7", // Slightly deeper purple
      "Internal Assessment": "#A5B4FC", // More saturated indigo
      "Client Endorsement": "#FAD02E", // Warmer yellow for better readability
      "Client Assessment": "#FFDD75", // Softer golden yellow
      "Client Interview": "#F79AC0", // More visible pink
      Offer: "#FFB870", // Warmer pastel orange
      Hired: "#6FCF97", // Balanced green for contrast
      "On-Hold": "#BDBDBD", // Neutral gray for better differentiation
      Cancelled: "#EB5757", // More readable red
    };

    return statusColors[status] || "#6b7280"; // default gray
  };

  return (
    <Card className="col-span-12 xl:col-span-8">
      <CardHeader className="pb-3">
        <CardTitle>Analytics Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="job-stats">Job Order Status</TabsTrigger>
            <TabsTrigger value="applicant-stats">Candidates Per Job</TabsTrigger>
            <TabsTrigger value="completion-stats">Avg. Completion Time</TabsTrigger>
          </TabsList>

          <TabsContent value="job-stats" className="h-[300px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0085ca]"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="status"
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} job orders`, null]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </TabsContent>

          <TabsContent value="applicant-stats" className="h-[300px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0085ca]"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={applicantsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="job_title"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) =>
                      value.length > 15 ? `${value.substring(0, 15)}...` : value
                    }
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      `${value} applicants`,
                      "Count",
                    ]}
                    labelFormatter={(label) => `Job: ${label}`}
                  />
                  <Bar
                    dataKey="applicants_count"
                    fill="#3b82f6"
                    name="Applicants"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </TabsContent>

          <TabsContent value="completion-stats" className="h-[300px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0085ca]"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={completionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="user_name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      `${value} days`,
                      "Average Time",
                    ]}
                    labelFormatter={(label) => `User: ${label}`}
                  />
                  <Bar
                    dataKey="average_days"
                    fill="#8b5cf6"
                    name="Average Completion Days"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ChartSection;
