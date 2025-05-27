import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import StatsCards from "@/components/dashboard/StatsCards";
import ChartSection from "@/components/dashboard/ChartSection";
import RecentActivityCard from "@/components/dashboard/RecentActivityCard";
import UpcomingInterviewsCard from "@/components/dashboard/UpcomingInterviewsCard";
import JobOrdersChart from "@/components/dashboard/JobOrdersChart";

export default function Dashboard() {
  const { user } = useAuth();
  
  return (
    <div className="flex h-screen">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <h2 className="text-xl font-semibold mb-6">Dashboard</h2>
            
            <StatsCards />
            
            <div className="mt-6 grid grid-cols-12 gap-4">
              <div className="col-span-12 xl:col-span-8 space-y-4">
                <div className="min-h-[400px]">
                  <JobOrdersChart />
                </div>
                <ChartSection />
              </div>
              
              <div className="col-span-12 xl:col-span-4 space-y-4">
                <RecentActivityCard />
                <UpcomingInterviewsCard />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
