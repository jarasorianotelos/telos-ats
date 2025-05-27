import { useState } from "react";
import { JobOrderCommission } from "@/types";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

const formSchema = z.object({
  current_commission: z.number().min(0),
  payment_type: z.enum(["30day", "60day", "90day"]),
  amount: z.number().min(0),
  receipt_file: z.instanceof(File).optional(),
  commission_details: z.string().optional(),
});

interface EditCommissionDialogProps {
  commission: JobOrderCommission;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export default function EditCommissionDialog({
  commission,
  open,
  onOpenChange,
  onUpdate,
}: EditCommissionDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      current_commission: commission.current_commission || 0,
      payment_type: "30day",
      amount: 0,
      commission_details: commission.commission_details || "",
    },
  });

  const handleFileUpload = async (file: File) => {
    try {
      setUploadProgress(0);
      setIsUploading(true);

      // Get applicant and job order details
      const { data: joborderApplicant, error: joborderError } = await supabase
        .from("joborder_applicant")
        .select(`
          *,
          applicant:applicant_id (
            id,
            first_name,
            last_name
          ),
          joborder:joborder_id (
            id
          )
        `)
        .eq("id", commission.joborder_applicant_id)
        .single();

      if (joborderError) {
        console.error("Error fetching job order applicant:", joborderError);
        throw new Error("Failed to fetch applicant details");
      }

      if (!joborderApplicant?.applicant || !joborderApplicant?.joborder) {
        throw new Error("Could not find applicant or job order details");
      }

      const { applicant, joborder } = joborderApplicant;
      const timestamp = format(new Date(), "MM-dd-yyyy hh:mm a");
      const fileExtension = file.name.split(".").pop();
      const fileName = `${applicant.first_name} ${applicant.last_name} (${applicant.id})/${joborder.id}/${timestamp}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("transaction-receipts")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        throw new Error("Failed to upload file");
      }

      return fileName;
    } catch (error) {
      console.error("Error in handleFileUpload:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      let receiptPath = null;
      let updatedDetails = null;

      // Only process commission details if amount is greater than 0
      if (values.amount > 0) {
        if (values.receipt_file) {
          try {
            receiptPath = await handleFileUpload(values.receipt_file);
          } catch (error) {
            console.error("Error in file upload:", error);
            toast({
              title: "Error",
              description: "Failed to upload receipt file",
              variant: "destructive",
            });
            return;
          }
        }

        const newCommissionDetails = {
          payment_type: values.payment_type,
          amount: values.amount,
          receipt_path: receiptPath,
          timestamp: new Date().toISOString()
        };

        // Get existing commission details
        const existingDetails = commission.commission_details 
          ? JSON.parse(commission.commission_details)
          : [];

        // Ensure existingDetails is an array
        const detailsArray = Array.isArray(existingDetails) ? existingDetails : [existingDetails];
        
        // Add new details to the array
        updatedDetails = [...detailsArray, newCommissionDetails];
      }

      // Calculate total received commission
      const totalReceivedCommission = updatedDetails 
        ? updatedDetails.reduce((sum, detail) => sum + (detail.amount || 0), 0)
        : commission.received_commission || 0;

      const { error } = await supabase
        .from("joborder_commission")
        .update({
          current_commission: values.current_commission,
          received_commission: totalReceivedCommission,
          ...(updatedDetails && { commission_details: JSON.stringify(updatedDetails) })
        })
        .eq("id", commission.id);

      if (error) {
        console.error("Error updating commission:", error);
        throw new Error("Failed to update commission");
      }

      toast({
        title: "Success",
        description: "Commission updated successfully",
      });
      onOpenChange(false);
      onUpdate();
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update commission",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Commission</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <div className="grid gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Job Title</p>
                <p className="text-sm text-muted-foreground">
                  {commission.joborder_applicant?.joborder?.job_title || "N/A"}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Candidate Name</p>
                <p className="text-sm text-muted-foreground">
                  {commission.joborder_applicant?.applicant?.first_name ||
                    "N/A"}{" "}
                  {commission.joborder_applicant?.applicant?.last_name || "N/A"}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Candidate Start Date</p>
                <p className="text-sm text-muted-foreground">
                  {commission.joborder_applicant?.candidate_start_date || "N/A"}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Received Commission</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(commission.received_commission || 0)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Status</p>
                <p className="text-sm text-muted-foreground">
                  {commission.status || "N/A"}
                </p>
              </div>
              <div>
                <FormField
                  control={form.control}
                  name="current_commission"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Commission (PHP)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPaymentForm(!showPaymentForm)}
                >
                  {showPaymentForm ? "Hide Payment Form" : "Add Payment"}
                </Button>
              </div>

              {showPaymentForm && (
                <div className="bg-[#0085ca] rounded-xl p-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Commission Details</p>
                    {commission.commission_details ? (
                      <div className="text-sm text-muted-foreground space-y-1">
                        {(() => {
                          try {
                            const details = JSON.parse(commission.commission_details);
                            return (
                              <>
                                <p>Type: {details.payment_type?.replace("day", " day")}</p>
                                <p>Amount: Php {details.amount?.toLocaleString()}</p>
                                {details.receipt_path && (
                                  <a
                                    href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/transaction-receipts/${details.receipt_path}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline"
                                  >
                                    View Receipt
                                  </a>
                                )}
                              </>
                            );
                          } catch (error) {
                            console.error("Error parsing commission details:", error);
                            return <p className="text-red-500">Error displaying details</p>;
                          }
                        })()}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No details available</p>
                    )}
                  </div>
                  <FormField
                    control={form.control}
                    name="payment_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="30day">30 Days</SelectItem>
                            <SelectItem value="60day">60 Days</SelectItem>
                            <SelectItem value="90day">90 Days</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (PHP)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="receipt_file"
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem>
                        <FormLabel>Transaction Receipt</FormLabel>
                        <FormControl>
                          <Input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                onChange(file);
                              }
                            }}
                            {...field}
                          />
                        </FormControl>
                        {isUploading && (
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-blue-600 h-2.5 rounded-full"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUploading}>
                Save
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
