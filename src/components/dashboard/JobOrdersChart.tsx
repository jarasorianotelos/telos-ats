import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface JobOrderData {
  month: string;
  count: number;
}

const JobOrdersChart = () => {
  const [jobOrdersData, setJobOrdersData] = useState<JobOrderData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobOrdersData = async () => {
      try {
        // Get the last 6 months of data
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const { data, error } = await supabase
          .from("joborder")
          .select("created_at")
          .gte("created_at", sixMonthsAgo.toISOString())
          .order("created_at", { ascending: true });

        if (error) throw error;

        // Process the data to get counts per month
        const monthlyData = data.reduce((acc: { [key: string]: number }, item) => {
          const date = new Date(item.created_at);
          const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
          acc[monthYear] = (acc[monthYear] || 0) + 1;
          return acc;
        }, {});

        // Convert to array format
        const formattedData = Object.entries(monthlyData).map(([month, count]) => ({
          month,
          count,
        }));

        setJobOrdersData(formattedData);
      } catch (error) {
        console.error("Error fetching job orders data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobOrdersData();
  }, []);

  const chartData = {
    labels: jobOrdersData.map((item) => item.month),
    datasets: [
      {
        label: "Job Orders",
        data: jobOrdersData.map((item) => item.count),
        backgroundColor: "rgba(167, 77, 74, 0.5)", // ATS blue color with transparency
        borderColor: "rgb(167, 77, 74)", // ATS blue color
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Job Orders per Month",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job Orders per Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-gray-500">Loading chart data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Orders per Month</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] overflow-y-auto">
          <div className="min-h-full">
            <Bar data={chartData} options={{
              ...options,
              maintainAspectRatio: false,
              responsive: true
            }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default JobOrdersChart; 