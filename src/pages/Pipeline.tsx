import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { User } from "@/types";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PipelineCard } from "@/components/pipeline/PipelineCard";
import { CreateCardDialog } from "@/components/pipeline/CreateCardDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";

export default function Pipeline() {
  const { user } = useAuth();
  const [isCreateCardDialogOpen, setIsCreateCardDialogOpen] = useState(false);

  // Fetch pipeline cards
  const { data: pipelineCards, isLoading, refetch } = useQuery({
    queryKey: ["pipeline-cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_cards")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load pipeline cards",
          variant: "destructive",
        });
        throw error;
      }

      return data || [];
    },
  });

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
    
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Pipeline</h1>
            <Button onClick={() => setIsCreateCardDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Card
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-52 animate-pulse bg-gray-100">
                  <CardHeader className="bg-gray-200 h-12" />
                  <CardContent className="bg-gray-100 h-40" />
                </Card>
              ))}
            </div>
          ) : pipelineCards && pipelineCards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pipelineCards.map((card) => (
                <PipelineCard key={card.id} card={card} onUpdate={refetch} />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-gray-500 mb-4">No pipeline cards found.</p>
              <Button onClick={() => setIsCreateCardDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create Your First Card
              </Button>
            </Card>
          )}
        </div>

        <CreateCardDialog
          open={isCreateCardDialogOpen}
          onOpenChange={setIsCreateCardDialogOpen}
          onCardCreated={() => {
            refetch();
          }}
        />
     
      </div>
    </div>
  );
}