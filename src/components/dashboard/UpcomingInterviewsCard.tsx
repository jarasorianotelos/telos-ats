import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Interview {
  candidate: string;
  position: string;
  date: string;
  time: string;
}

const UpcomingInterviewsCard = () => {
  const interviews: Interview[] = [
    {
      candidate: "Sarah Johnson",
      position: "Frontend Developer",
      date: "Today",
      time: "2:00 PM",
    },
    {
      candidate: "Robert Lee",
      position: "DevOps Engineer",
      date: "Tomorrow",
      time: "11:30 AM",
    },
    {
      candidate: "Emily Davis",
      position: "Product Manager",
      date: "May 15",
      time: "3:15 PM",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Interviews</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {interviews.map((interview, index) => (
            <div
              key={index}
              className="flex justify-between items-center border-b pb-2 last:border-b-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium">{interview.candidate}</p>
                <p className="text-xs text-gray-500">{interview.position}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium">{interview.date}</p>
                <p className="text-xs text-ats-blue-600">{interview.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default UpcomingInterviewsCard; 