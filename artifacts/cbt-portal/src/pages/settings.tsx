import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/lib/auth";
import {
  useChangePassword,
  useUpdateProfilePicture,
  useUpdateName,
  useCreateRequest,
  useGetMyRequests,
  getGetMeQueryKey,
  getGetMyRequestsQueryKey,
} from "@workspace/api-client-react";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, KeyRound, User, ArrowLeft, Pencil, Send, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STUDENT_POSITIONS = [
  "Head Boy", "Head Girl", "Assistant Head Boy", "Assistant Head Girl",
  "Prefect", "Class Captain", "Assistant Class Captain",
  "Library Prefect", "Sports Prefect", "Social Prefect", "Student",
] as const;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const nameSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
});

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const changeMutation = useChangePassword();
  const profilePicMutation = useUpdateProfilePicture();
  const updateNameMutation = useUpdateName();
  const createRequestMutation = useCreateRequest();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const [requestType, setRequestType] = useState<"name_change" | "role_change">("name_change");
  const [requestedName, setRequestedName] = useState("");
  const [requestedRole, setRequestedRole] = useState<string>("");

  const { data: myRequests } = useGetMyRequests({ query: { enabled: user?.role === "student" } as any });

  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const nameForm = useForm<z.infer<typeof nameSchema>>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: user?.name ?? "" },
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

  function onPasswordSubmit(values: z.infer<typeof passwordSchema>) {
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

  function onNameSubmit(values: z.infer<typeof nameSchema>) {
    updateNameMutation.mutate(
      { data: { name: values.name } },
      {
        onSuccess: () => {
          toast({ title: "Name updated successfully", description: "Please log out and back in to see your new name." });
          qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
        },
        onError: (err: any) => {
          toast({
            variant: "destructive",
            title: "Failed to update name",
            description: err.data?.error || "Please try again.",
          });
        },
      }
    );
  }

  function submitRequest() {
    const requestedValue = requestType === "name_change" ? requestedName.trim() : requestedRole;
    if (!requestedValue) {
      toast({ variant: "destructive", title: "Please fill in the requested value" });
      return;
    }
    createRequestMutation.mutate(
      { data: { type: requestType, requestedValue } },
      {
        onSuccess: () => {
          toast({ title: "Request submitted", description: "An admin will review your request soon." });
          setRequestedName("");
          setRequestedRole("");
          qc.invalidateQueries({ queryKey: getGetMyRequestsQueryKey() });
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Failed to submit request", description: err.data?.error || "Please try again." });
        },
      }
    );
  }

  const dashboardUrl =
    user?.role === "student" ? "/student/dashboard"
    : user?.role === "staff" ? "/teacher/dashboard"
    : "/admin/dashboard";

  const isStudent = user?.role === "student";
  const isStaffOrAdmin = user?.role === "staff" || user?.role === "admin";

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

      {/* Name Update — staff/admin only */}
      {isStaffOrAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Update Name
            </CardTitle>
            <CardDescription>Change your display name.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...nameForm}>
              <form onSubmit={nameForm.handleSubmit(onNameSubmit)} className="flex gap-3">
                <FormField
                  control={nameForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input placeholder="Your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={updateNameMutation.isPending}>
                  {updateNameMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Student Requests — students only */}
      {isStudent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Submit a Request
            </CardTitle>
            <CardDescription>
              Request a name or role change. An admin will review and approve or reject it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Request Type</label>
              <Select value={requestType} onValueChange={v => setRequestType(v as "name_change" | "role_change")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_change">Name Change</SelectItem>
                  <SelectItem value="role_change">Role / Position Change</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {requestType === "name_change" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Requested Name</label>
                <Input
                  placeholder="Enter your desired full name"
                  value={requestedName}
                  onChange={e => setRequestedName(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Requested Role</label>
                <Select value={requestedRole} onValueChange={setRequestedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {STUDENT_POSITIONS.map(pos => (
                      <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={submitRequest} disabled={createRequestMutation.isPending} className="w-full">
              {createRequestMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Submit Request
            </Button>

            {/* Previous requests */}
            {myRequests && myRequests.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-sm font-medium text-muted-foreground">Your previous requests</p>
                {myRequests.slice(0, 5).map(r => (
                  <div key={r.id} className="flex items-center justify-between text-sm bg-muted/40 rounded-md px-3 py-2">
                    <div>
                      <span className="font-medium">{r.type === "name_change" ? "Name" : "Role"}: </span>
                      <span className="text-muted-foreground">{r.requestedValue}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {r.status === "pending" && <Badge variant="outline" className="text-amber-600 border-amber-400 text-xs"><Clock className="h-2.5 w-2.5 mr-0.5" />Pending</Badge>}
                      {r.status === "approved" && <Badge variant="outline" className="text-green-700 border-green-400 text-xs"><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Approved</Badge>}
                      {r.status === "rejected" && <Badge variant="outline" className="text-red-600 border-red-400 text-xs"><XCircle className="h-2.5 w-2.5 mr-0.5" />Rejected</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
            <form onSubmit={form.handleSubmit(onPasswordSubmit)} className="space-y-4">
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
