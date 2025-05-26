import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";

interface CreateCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCardCreated: () => void;
}

export const CreateCardDialog = ({
  open,
  onOpenChange,
  onCardCreated,
}: CreateCardDialogProps) => {
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateCard = async () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a card title",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a card",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const { error } = await supabase
      .from("pipeline_cards")
      .insert({
        title: title.trim(),
        author_id: user.id
      });

    setIsLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create card",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Card created successfully",
    });
    setTitle("");
    onOpenChange(false);
    onCardCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Card</DialogTitle>
          <DialogDescription>
            Add a new card to organize applicants in your pipeline
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="card-title">Title</Label>
            <Input
              id="card-title"
              placeholder="Enter card title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleCreateCard} disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Card"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
