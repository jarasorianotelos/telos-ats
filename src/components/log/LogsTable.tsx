import { useState } from "react";
import { User } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { format } from "date-fns";
import { Eye } from "lucide-react";

interface Log {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any;
  created_at: string;
  users?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface LogsTableProps {
  logs: Log[];
}

const LogsTable = ({ logs }: LogsTableProps) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Helper function to format the date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "PPP p");
  };

  // Helper function to get the user's name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getUserName = (log: any): string => {
    if (!log.users) return "System";
    return `${log.users.first_name} ${log.users.last_name}`;
  };

  // Helper function to get a readable entity name
  const getEntityName = (entityType: string): string => {
    switch (entityType) {
      case "users":
        return "User";
      case "joborder":
        return "Job Order";
      case "applicants":
        return "Applicant";
      case "clients":
        return "Client";
      case "joborder_applicant":
        return "Job Application";
      case "joborder_commission":
        return "Commission";
      default:
        return entityType;
    }
  };

  // Helper function to get action CSS class
  const getActionClass = (action: string): string => {
    switch (action) {
      case "created":
        return "text-green-600";
      case "updated":
        return "text-blue-600";
      case "deleted":
        return "text-red-600";
      default:
        return "";
    }
  };

  return (
    <Card className="mt-6">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Date & Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity Type</TableHead>
              <TableHead className="text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">
                  {formatDate(log.created_at)}
                </TableCell>
                <TableCell>{getUserName(log)}</TableCell>
                <TableCell>
                  <span className={getActionClass(log.action)}>
                    {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                  </span>
                </TableCell>
                <TableCell>{getEntityName(log.entity_type)}</TableCell>
                <TableCell className="text-right">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="h-4 w-4 mr-2" /> View
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle>Log Details</SheetTitle>
                      </SheetHeader>

                      {selectedLog && (
                        <div className="py-4">
                          <div className="space-y-4">
                            <div>
                              <h3 className="text-sm font-medium text-muted-foreground">
                                Timestamp
                              </h3>
                              <p>{formatDate(selectedLog.created_at)}</p>
                            </div>

                            <div>
                              <h3 className="text-sm font-medium text-muted-foreground">
                                User
                              </h3>
                              <p>{getUserName(selectedLog)}</p>
                            </div>

                            <div>
                              <h3 className="text-sm font-medium text-muted-foreground">
                                Action
                              </h3>
                              <p className={getActionClass(selectedLog.action)}>
                                {selectedLog.action.charAt(0).toUpperCase() +
                                  selectedLog.action.slice(1)}
                              </p>
                            </div>

                            <div>
                              <h3 className="text-sm font-medium text-muted-foreground">
                                Entity Type
                              </h3>
                              <p>{getEntityName(selectedLog.entity_type)}</p>
                            </div>

                            <div>
                              <h3 className="text-sm font-medium text-muted-foreground">
                                Entity ID
                              </h3>
                              <p className="font-mono text-xs">
                                {selectedLog.entity_id}
                              </p>
                            </div>

                            <div>
                              <h3 className="text-sm font-medium text-muted-foreground">
                                Details
                              </h3>
                              <div className="mt-2 p-4 bg-muted rounded-md overflow-x-auto">
                                <pre className="text-xs">
                                  {JSON.stringify(selectedLog.details, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </SheetContent>
                  </Sheet>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default LogsTable;
