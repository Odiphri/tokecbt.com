import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/lib/auth";
import { useChangePassword, useUpdateProfilePicture, getGetMeQueryKey } from "@workspace/api-client-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, KeyRound, User, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const changeMutation = useChangePassword();
  const profilePicMutation = useUpdateProfilePicture();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploadingPic, setIsUploadingPic] = useState(false);

  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Image too large", description: "Please choose an image smaller than 2MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      setPreviewUrl(dataUrl);
      setIsUploadingPic(true);
      profilePicMutation.mutate(
        { data: { profilePicture: dataUrl } },
        {
          onSuccess: () => {
            toast({ title: "Profile picture updated" });
            qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
            setIsUploadingPic(false);
          },
          onError: () => {
            toast({ variant: "destructive", title: "Failed to update profile picture" });
            setIsUploadingPic(false);
          },
        }
      );
    };
    reader.readAsDataURL(file);
  }

  function onSubmit(values: z.infer<typeof passwordSchema>) {
    changeMutation.mutate(
      { data: { currentPassword: values.currentPassword, newPassword: values.newPassword } },
      {
        onSuccess: () => {
          toast({ title: "Password updated successfully" });
          form.reset();
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

  const dashboardUrl =
    user?.role === "student" ? "/student/dashboard"
    : user?.role === "staff" ? "/teacher/dashboard"
    : "/admin/dashboard";

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={dashboardUrl}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your profile and security settings.</p>
        </div>
      </div>

      {/* Profile Picture */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Picture
          </CardTitle>
          <CardDescription>Upload a photo to display on your profile.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-20 w-20 text-lg">
                <AvatarImage src={previewUrl ?? user?.profilePicture ?? undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {isUploadingPic && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPic}
              >
                <Camera className="mr-2 h-4 w-4" />
                {isUploadingPic ? "Uploading..." : "Change Photo"}
              </Button>
              <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max 2MB.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your account password.</CardDescription>
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
              <Button type="submit" disabled={changeMutation.isPending}>
                {changeMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</>
                ) : "Update Password"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
