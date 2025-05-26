import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

interface LogsPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthenticated: () => void;
}

const LogsPasswordModal = ({
  open,
  onOpenChange,
  onAuthenticated,
}: LogsPasswordModalProps) => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First get the password hash from the log_access_control table
      const { data: accessControlData, error: accessError } = await supabase
        .from("log_access_control")
        .select("password_hash")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (accessError || !accessControlData) {
        throw new Error("Failed to verify password");
      }

      // Now verify the password using our RPC function
      const { data: verificationResult, error: verificationError } =
        await supabase.rpc("verify_password", {
          input_password: password,
          hashed_password: accessControlData.password_hash,
        });

      if (verificationError) {
        throw new Error("Password verification failed");
      }

      if (verificationResult === true) {
        onAuthenticated();
      } else {
        setError("Invalid password");
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Password verification error:", err);
      setError(err.message || "An error occurred during verification");
      toast({
        title: "Authentication Error",
        description: err.message || "Failed to verify password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>System Logs Authentication</DialogTitle>
          <DialogDescription>
            Please enter the administrator password to view the system logs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleVerifyPassword} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter the logs access password"
              disabled={loading}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Access Logs
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LogsPasswordModal;
