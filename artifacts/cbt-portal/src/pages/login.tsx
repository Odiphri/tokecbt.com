import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/lib/auth";
import { useLogin } from "@workspace/api-client-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const { user, login } = useAuth();
  const [role, setRole] = useState<"student" | "staff">("student");
  const loginMutation = useLogin();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  if (user) {
    const dest =
      user.role === "student"
        ? "/student/dashboard"
        : user.role === "staff"
        ? "/teacher/dashboard"
        : "/admin/dashboard";
    return <Redirect to={dest} />;
  }

  function onSubmit(values: z.infer<typeof loginSchema>) {
    loginMutation.mutate(
      { data: { username: values.username, password: values.password, role } },
      {
        onSuccess: (data) => {
          login(data.token, {
            id: data.id,
            name: data.name ?? "",
            role: data.role as any,
            isDefaultPassword: data.isDefaultPassword,
            staffRole: data.staffRole ?? undefined,
            permissions: data.permissions ?? undefined,
          } as any);
        },
        onError: (err: any) => {
          toast({
            variant: "destructive",
            title: "Login failed",
            description: err.data?.error || "Please check your credentials and try again.",
          });
        },
      }
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-pink-50 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center space-y-2 text-primary">
          <BookOpen className="h-12 w-12" />
          <h1 className="text-3xl font-bold tracking-tight">TOKE SCHOOLS</h1>
          <p className="text-muted-foreground font-medium">Computer Based Testing Portal</p>
        </div>

        <Card className="border-t-4 border-t-primary shadow-lg">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials to access the portal</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={role} onValueChange={(v) => setRole(v as "student" | "staff")} className="w-full mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="student">Student</TabsTrigger>
                <TabsTrigger value="staff">Staff</TabsTrigger>
              </TabsList>
            </Tabs>

            {role === "staff" && (
              <p className="text-xs text-muted-foreground mb-4 bg-blue-50 border border-blue-100 rounded-md p-2">
                Staff includes teachers, HODs, librarians, and administrators.
              </p>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{role === "student" ? "Student ID" : "Staff ID"}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={role === "student" ? "Enter your student ID" : "Enter your staff ID"}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
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
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
