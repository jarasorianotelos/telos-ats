import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

interface CommissionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any[];
}

export default function CommissionDetailsDialog({
  open,
  onOpenChange,
  details,
}: CommissionDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Commission Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {details.map((detail, index) => (
            <div key={index} className="space-y-2">
              <p>Type: {detail.payment_type?.replace("day", " day")}</p>
              <p>Amount: Php {detail.amount?.toLocaleString()}</p>
              {detail.receipt_path && (
                <a
                  href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/transaction-receipts/${detail.receipt_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  View Receipt
                </a>
              )}
              {index < details.length - 1 && <hr className="my-2" />}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
} 