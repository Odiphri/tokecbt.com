import { useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useUpdateProfilePicture, getGetMeQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, User, BookOpen, School, Shield, Edit2, KeyRound, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ROLE_LABELS: Record<string, string> = {
  teacher: "Teacher",
  hod: "Head of Department",
  librarian: "Librarian",
  cbt_personnel: "CBT Officer",
};

const ROLE_COLORS: Record<string, string> = {
  teacher: "bg-blue-100 text-blue-800 border-blue-300",
  hod: "bg-purple-100 text-purple-800 border-purple-300",
  librarian: "bg-green-100 text-green-800 border-green-300",
  cbt_personnel: "bg-amber-100 text-amber-800 border-amber-300",
};

async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem("cbt_token");
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export default function TeacherProfile() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const profilePicMutation = useUpdateProfilePicture();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", newStaffId: "", currentPassword: "", newPassword: "", confirmPassword: "" });
  const [isSaving, setIsSaving] = useState(false);

  if (!user) return null;

  const initials = user.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "SF";

  const staffRole = user.staffRole ?? "teacher";
  const roleLabel = ROLE_LABELS[staffRole] ?? staffRole;
  const roleColor = ROLE_COLORS[staffRole] ?? "bg-slate-100 text-slate-700 border-slate-300";

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

  function openEditModal() {
    if (!user) return;
    setEditForm({ name: user.name ?? "", newStaffId: "", currentPassword: "", newPassword: "", confirmPassword: "" });
    setShowEditModal(true);
  }

  async function saveProfile() {
    if (editForm.newPassword && editForm.newPassword !== editForm.confirmPassword) {
      toast({ variant: "destructive", title: "Passwords do not match" });
      return;
    }
    setIsSaving(true);
    try {
      const payload: Record<string, string> = { name: editForm.name };
      if (editForm.newStaffId.trim()) payload.newStaffId = editForm.newStaffId.trim();
      if (editForm.newPassword) {
        payload.currentPassword = editForm.currentPassword;
        payload.newPassword = editForm.newPassword;
      }
      const result = await apiFetch("/teacher/my-profile", { method: "PUT", body: JSON.stringify(payload) });
      toast({ title: "Profile updated successfully" });
      setShowEditModal(false);
      if (result.staffIdChanged) {
        toast({ title: "Staff ID changed — please log in again", description: "You will be logged out now." });
        setTimeout(() => logout(), 1500);
      } else {
        qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update failed", description: err.message });
    } finally {
      setIsSaving(false);
    }
  }

  const perms = user.permissions;
  const permissionList = perms ? Object.entries(perms)
    .filter(([, val]) => val === true)
    .map(([key]) => key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()))
    : [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">My Profile</h1>
        <p className="text-muted-foreground mt-1">Your staff information and permissions.</p>
      </div>

      {/* Profile Card */}
      <Card className="border-t-4 border-t-primary">
        <CardContent className="pt-8 pb-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3 flex-shrink-0">
              <div className="relative">
                <Avatar className="h-28 w-28 shadow-md ring-4 ring-accent/30">
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
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-2xl font-bold text-primary">{user.name}</h2>
                  <Badge variant="outline" className={`mt-1 ${roleColor}`}>
                    <Shield className="h-3 w-3 mr-1" />
                    {roleLabel}
                  </Badge>
                </div>
                <Button size="sm" variant="outline" onClick={openEditModal} className="flex-shrink-0">
                  <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-50 rounded-lg p-3 border">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide mb-1">
                    <User className="h-3.5 w-3.5" />
                    Staff ID
                  </div>
                  <div className="font-semibold text-primary font-mono">{user.id}</div>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 border">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide mb-1">
                    <Shield className="h-3.5 w-3.5" />
                    Role
                  </div>
                  <div className="font-semibold text-primary">{roleLabel}</div>
                </div>

                {(user as any).assignedClass && (
                  <div className="bg-slate-50 rounded-lg p-3 border">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide mb-1">
                      <School className="h-3.5 w-3.5" />
                      Assigned Class
                    </div>
                    <div className="font-semibold text-primary">{(user as any).assignedClass}</div>
                  </div>
                )}

                <div className="bg-slate-50 rounded-lg p-3 border">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide mb-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    Account Type
                  </div>
                  <div className="font-semibold text-primary">Staff</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions */}
      {permissionList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Your Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {permissionList.map(p => (
                <Badge key={p} variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  {p}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Profile Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input className="mt-1" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Your full name" />
            </div>
            <div>
              <Label>
                New Staff ID
                <span className="text-muted-foreground font-normal text-xs ml-2">(leave blank to keep current: {user.id})</span>
              </Label>
              <Input className="mt-1" value={editForm.newStaffId} onChange={e => setEditForm(f => ({ ...f, newStaffId: e.target.value }))} placeholder={user.id} />
              {editForm.newStaffId.trim() && editForm.newStaffId.trim() !== user.id && (
                <div className="flex items-start gap-2 mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  Changing your Staff ID will log you out immediately. You will need to log back in with the new ID.
                </div>
              )}
            </div>
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
                <KeyRound className="h-4 w-4" />
                Change Password (optional)
              </div>
              <div className="space-y-3">
                <div>
                  <Label>Current Password</Label>
                  <Input className="mt-1" type="password" value={editForm.currentPassword} onChange={e => setEditForm(f => ({ ...f, currentPassword: e.target.value }))} placeholder="Required only if setting a new password" />
                </div>
                <div>
                  <Label>New Password</Label>
                  <Input className="mt-1" type="password" value={editForm.newPassword} onChange={e => setEditForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="At least 6 characters" />
                </div>
                <div>
                  <Label>Confirm New Password</Label>
                  <Input className="mt-1" type="password" value={editForm.confirmPassword} onChange={e => setEditForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Repeat new password" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={saveProfile} disabled={isSaving || !editForm.name.trim()}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
