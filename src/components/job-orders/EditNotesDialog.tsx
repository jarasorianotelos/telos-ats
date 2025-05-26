import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil } from "lucide-react";

interface EditNotesDialogProps {
  jobOrderId: string;
  currentNotes: string;
  onSuccess: () => void;
}

const EditNotesDialog = ({ jobOrderId, currentNotes, onSuccess }: EditNotesDialogProps) => {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(currentNotes);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from("joborder")
        .update({ 
          updates: notes,
          updated_at: new Date().toISOString()
        })
        .eq("id", jobOrderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notes updated successfully!",
      });

      onSuccess();
      setOpen(false);
    } catch (error) {
      console.error("Error updating notes:", error);
      toast({
        title: "Error",
        description: "Failed to update notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-4 w-4"
        onClick={() => setOpen(true)}
      >
        <Pencil className="h-3 w-3" />
        <span className="sr-only">Edit notes</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter notes or updates..."
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditNotesDialog; 