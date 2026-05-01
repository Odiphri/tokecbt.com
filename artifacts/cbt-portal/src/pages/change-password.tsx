import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/lib/auth";
import { useChangePassword } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Redirect, useLocation } from "wouter";

const schema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function ChangePassword() {
  const { user, login } = useAuth();
  const changeMutation = useChangePassword();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  if (!user) return <Redirect to="/" />;
  if (!user.isDefaultPassword) return <Redirect to={user.role === "student" ? "/student/dashboard" : "/teacher/dashboard"} />;

  function onSubmit(values: z.infer<typeof schema>) {
    changeMutation.mutate(
      {
        data: {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "Password updated successfully",
            description: "You can now access the portal.",
          });
          // Update local user state
          const token = localStorage.getItem("cbt_token")!;
          login(token, { ...user!, isDefaultPassword: false });
          setLocation(user!.role === "student" ? "/student/dashboard" : "/teacher/dashboard");
        },
        onError: (err: any) => {
          toast({
            variant: "destructive",
            title: "Failed to change password",
            description: err.data?.error || "Please try again.",
          });
        },
      }
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <Card className="border-t-4 border-t-primary shadow-lg">
          <CardHeader>
            <CardTitle>Update Password</CardTitle>
            <CardDescription>
              For security reasons, you must change your default password before continuing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={changeMutation.isPending}>
                  {changeMutation.isPending ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
