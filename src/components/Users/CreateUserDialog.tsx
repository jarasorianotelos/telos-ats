import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  username: z.string().min(1, "Username is required"),
  role: z.enum(["administrator", "recruiter", "client"]),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CreateUserDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: CreateUserDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [nextUsername, setNextUsername] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      username: "",
      role: "administrator",
      password: "",
    },
  });

  useEffect(() => {
    const fetchLatestUsername = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("username")
          .like("username", "Recruiter%")
          .order("username", { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          const lastUsername = data[0].username;
          const lastNumber = parseInt(lastUsername.replace("Recruiter", ""));
          const nextNumber = (lastNumber + 1).toString().padStart(2, "0");
          const newUsername = `Recruiter${nextNumber}`;
          setNextUsername(newUsername);
          form.setValue("username", newUsername);
        } else {
          const newUsername = "Recruiter01";
          setNextUsername(newUsername);
          form.setValue("username", newUsername);
        }
      } catch (error) {
        console.error("Error fetching latest username:", error);
      }
    };

    if (open) {
      fetchLatestUsername();
    }
  }, [open, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);

      // First, create the user using signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            first_name: values.first_name,
            last_name: values.last_name,
            username: values.username,
            role: values.role,
          },
        },
      });

      if (authError) throw authError;

      // Then, create the user in public.users with the same ID
      const { error: dbError } = await supabase
        .from("users")
        .insert([{
          id: authData.user?.id,
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email,
          username: values.username,
          role: values.role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "User created successfully!",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating user:", error);
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter first name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter last name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter username" {...field} disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Administrator</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Grant administrator privileges
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value === "administrator"}
                      onCheckedChange={(checked) => {
                        field.onChange(checked ? "administrator" : "recruiter");
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Enter password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create User
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserDialog; 