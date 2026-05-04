import { useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useUpdateProfilePicture, getGetMeQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, User, GraduationCap, Shield, Settings } from "lucide-react";
import { Link } from "wouter";

export default function StudentProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const profilePicMutation = useUpdateProfilePicture();

  if (!user) return null;

  const initials = user.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "ST";

  const roleColors: Record<string, string> = {
    "Head Boy": "bg-blue-100 text-blue-800 border-blue-300",
    "Head Girl": "bg-pink-100 text-pink-800 border-pink-300",
    "Prefect": "bg-purple-100 text-purple-800 border-purple-300",
    "Class Captain": "bg-amber-100 text-amber-800 border-amber-300",
    "Student": "bg-slate-100 text-slate-700 border-slate-300",
  };
  const roleBadgeClass = roleColors[user.studentRole ?? "Student"] ?? "bg-slate-100 text-slate-700 border-slate-300";

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Image too large", description: "Max size is 2MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      setPreviewUrl(dataUrl);
      setIsUploading(true);
      profilePicMutation.mutate(
        { data: { profilePicture: dataUrl } },
        {
          onSuccess: () => {
            toast({ title: "Profile picture updated" });
            qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
            setIsUploading(false);
          },
          onError: () => {
            toast({ variant: "destructive", title: "Upload failed" });
            setIsUploading(false);
          },
        }
      );
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">My Profile</h1>
        <p className="text-muted-foreground mt-1">Your personal information and school details.</p>
      </div>

      {/* Profile Card */}
      <Card className="border-t-4 border-t-primary">
        <CardContent className="pt-8 pb-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3 flex-shrink-0">
              <div className="relative">
                <Avatar className="h-28 w-28 text-2xl shadow-md ring-4 ring-accent/30">
                  <AvatarImage src={previewUrl ?? user.profilePicture ?? undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                    <Loader2 className="h-7 w-7 animate-spin text-white" />
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="gap-1.5"
              >
                <Camera className="h-3.5 w-3.5" />
                {isUploading ? "Uploading..." : "Change Photo"}
              </Button>
              <p className="text-xs text-muted-foreground">JPG, PNG — Max 2MB</p>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-4 text-center sm:text-left">
              <div>
                <h2 className="text-2xl font-bold text-primary">{user.name}</h2>
                {(user.studentRole && user.studentRole !== "Student") && (
                  <Badge variant="outline" className={`mt-1 ${roleBadgeClass}`}>
                    <Shield className="h-3 w-3 mr-1" />
                    {user.studentRole}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-50 rounded-lg p-3 border">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide mb-1">
                    <GraduationCap className="h-3.5 w-3.5" />
                    Class
                  </div>
                  <div className="font-semibold text-primary">{user.class}</div>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 border">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide mb-1">
                    <User className="h-3.5 w-3.5" />
                    Student ID
                  </div>
                  <div className="font-semibold text-primary font-mono">{user.id}</div>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 border">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide mb-1">
                    <Shield className="h-3.5 w-3.5" />
                    Role / Position
                  </div>
                  <div className="font-semibold text-primary">{user.studentRole ?? "Student"}</div>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 border">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide mb-1">
                    <User className="h-3.5 w-3.5" />
                    Account Type
                  </div>
                  <div className="font-semibold text-primary">Student</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Account Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/settings">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Change Password
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline">
              <User className="mr-2 h-4 w-4" />
              Submit a Request
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
