import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyPHP } from "@/lib/utils";
import { JobOrderCommission } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

interface CommissionSummaryProps {
  commissions: JobOrderCommission[];
}

export default function CommissionSummary({ commissions }: CommissionSummaryProps) {
  const { user } = useAuth();

  // Filter commissions based on user role
  const filteredCommissions = user?.role === "recruiter"
    ? commissions.filter(
        (commission) => commission.joborder_applicant?.author?.username === user?.username
      )
    : commissions;

  // Calculate totals
  const totalCurrentCommission = filteredCommissions.reduce(
    (sum, commission) => sum + (commission.current_commission || 0),
    0
  );

  const totalReceivedCommission = filteredCommissions.reduce(
    (sum, commission) => sum + (commission.received_commission || 0),
    0
  );

  const pendingCommission = totalCurrentCommission - totalReceivedCommission;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Commission
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrencyPHP(totalCurrentCommission)}
          </div>
          <p className="text-xs text-muted-foreground">
            {user?.role === "recruiter" 
              ? "Your total current commission" 
              : "Total current commission for all recruiters"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Received Commission
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrencyPHP(totalReceivedCommission)}
          </div>
          <p className="text-xs text-muted-foreground">
            {user?.role === "recruiter" 
              ? "Your total received commission" 
              : "Total received commission for all recruiters"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Pending Commission
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrencyPHP(pendingCommission)}
          </div>
          <p className="text-xs text-muted-foreground">
            {user?.role === "recruiter" 
              ? "Your commission waiting for payment" 
              : "Total commission waiting for payment"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 