import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ApplicantWithDetails } from "@/types";

interface ProfilerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicant: ApplicantWithDetails | null;
  onSuccess: () => void;
}

const profilerFormSchema = z.object({
  interview_notes: z.string().optional(),
});

const ProfilerDialog = ({ open, onOpenChange, applicant, onSuccess }: ProfilerDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<z.infer<typeof profilerFormSchema>>({
    resolver: zodResolver(profilerFormSchema),
    defaultValues: {
      interview_notes: "",
    },
  });

  // Update form values when applicant changes
  useEffect(() => {
    if (applicant) {
      form.reset({
        interview_notes: applicant.interview_notes || "",
      });
    }
  }, [applicant, form]);

  const onSubmit = async (values: z.infer<typeof profilerFormSchema>) => {
    if (!applicant) return;

    try {
      setIsLoading(true);

      const { error } = await supabase
        .from("joborder_applicant")
        .update({
          interview_notes: values.interview_notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", applicant.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Profiler updated successfully!",
      });

      onSuccess();
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profiler. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!applicant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Profiler - {applicant.applicant?.first_name} {applicant.applicant?.last_name}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="interview_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interview Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter profiler notes..."
                      className="resize-y min-h-[200px]"
                      readOnly={!isEditing}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter className="pt-2">
          {isEditing ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  // Reset form to original values
                  form.reset({
                    interview_notes: applicant.interview_notes || "",
                  });
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
              className="bg-green-500 hover:bg-green-600"
                type="button"
                onClick={() => form.handleSubmit(onSubmit)()}
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : "Save"}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfilerDialog; 