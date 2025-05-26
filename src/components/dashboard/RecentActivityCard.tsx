import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ActivityItem {
  type: string;
  title: string;
  description: string;
  color: string;
}

const RecentActivityCard = () => {
  const activities: ActivityItem[] = [
    {
      type: "job_order",
      title: "New job order created",
      description: "Senior Developer - Tech Inc.",
      color: "border-ats-blue-500",
    },
    {
      type: "hire",
      title: "Applicant hired",
      description: "John Doe - UX Designer",
      color: "border-green-500",
    },
    {
      type: "interview",
      title: "Interview scheduled",
      description: "Emma Wilson - Backend Developer",
      color: "border-amber-500",
    },
    {
      type: "endorsement",
      title: "New applicant endorsed",
      description: "Michael Brown - Product Manager",
      color: "border-purple-500",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div
              key={index}
              className={`border-l-4 ${activity.color} pl-3 py-1`}
            >
              <p className="text-sm font-medium">{activity.title}</p>
              <p className="text-xs text-gray-500">{activity.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivityCard; 