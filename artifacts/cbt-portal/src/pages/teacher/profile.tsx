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
import {
  Camera, Loader2, User, BookOpen, School, Shield, Edit2,
  KeyRound, AlertTriangle, Lock, IdCard,
} from "lucide-react";
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

  // Edit name modal
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameForm, setNameForm] = useState({ name: "" });
  const [isSavingName, setIsSavingName] = useState(false);

  // Change Staff ID modal
  const [showIdModal, setShowIdModal] = useState(false);
  const [idForm, setIdForm] = useState({ newStaffId: "", currentPassword: "" });
  const [isSavingId, setIsSavingId] = useState(false);

  // Change password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [isSavingPw, setIsSavingPw] = useState(false);

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

  async function saveName() {
    if (!nameForm.name.trim()) return;
    setIsSavingName(true);
    try {
      await apiFetch("/teacher/my-profile", { method: "PUT", body: JSON.stringify({ name: nameForm.name.trim() }) });
      toast({ title: "Name updated" });
      setShowNameModal(false);
      qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update failed", description: err.message });
    } finally {
      setIsSavingName(false);
    }
  }

  async function saveStaffId() {
    if (!idForm.newStaffId.trim()) return;
    if (!idForm.currentPassword) {
      toast({ variant: "destructive", title: "Current password required" });
      return;
    }
    setIsSavingId(true);
    try {
      const result = await apiFetch("/teacher/my-profile", {
        method: "PUT",
        body: JSON.stringify({ newStaffId: idForm.newStaffId.trim(), currentPassword: idForm.currentPassword }),
      });
      toast({ title: "Staff ID changed — logging you out" });
      setShowIdModal(false);
      if (result.staffIdChanged) {
        setTimeout(() => logout(), 1200);
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Change failed", description: err.message });
    } finally {
      setIsSavingId(false);
    }
  }

  async function savePassword() {
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      toast({ variant: "destructive", title: "All password fields are required" });
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast({ variant: "destructive", title: "Passwords do not match" });
      return;
    }
    if (pwForm.newPassword.length < 6) {
      toast({ variant: "destructive", title: "New password must be at least 6 characters" });
      return;
    }
    setIsSavingPw(true);
    try {
      await apiFetch("/teacher/my-profile", {
        method: "PUT",
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      });
      toast({ title: "Password changed successfully" });
      setShowPasswordModal(false);
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Change failed", description: err.message });
    } finally {
      setIsSavingPw(false);
    }
  }

  const perms = user.permissions;
  const permissionList = perms
    ? Object.entries(perms)
        .filter(([, val]) => val === true)
        .map(([key]) => key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()))
    : [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">My Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account information and login details.</p>
      </div>

      {/* Profile Card */}
      <Card className="border-t-4 border-t-primary">
        <CardContent className="pt-8 pb-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
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
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="gap-1.5">
                <Camera className="h-3.5 w-3.5" />
                {isUploading ? "Uploading..." : "Change Photo"}
              </Button>
              <p className="text-xs text-muted-foreground">JPG, PNG — Max 2MB</p>
            </div>

            <div className="flex-1 space-y-4 text-center sm:text-left">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-2xl font-bold text-primary">{user.name}</h2>
                  <Badge variant="outline" className={`mt-1 ${roleColor}`}>
                    <Shield className="h-3 w-3 mr-1" />
                    {roleLabel}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setNameForm({ name: user.name ?? "" }); setShowNameModal(true); }}
                  className="flex-shrink-0"
                >
                  <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                  Edit Name
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

      {/* Login & Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Login & Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 divide-y">
          {/* Staff ID row */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <IdCard className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium">Staff ID (Login Username)</div>
                <div className="text-xs text-muted-foreground font-mono mt-0.5">{user.id}</div>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setIdForm({ newStaffId: "", currentPassword: "" }); setShowIdModal(true); }}
            >
              Change
            </Button>
          </div>

          {/* Password row */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <KeyRound className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium">Password</div>
                <div className="text-xs text-muted-foreground mt-0.5">••••••••</div>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); setShowPasswordModal(true); }}
            >
              Change
            </Button>
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

      {/* Edit Name Modal */}
      <Dialog open={showNameModal} onOpenChange={setShowNameModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Display Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Full Name</Label>
              <Input
                className="mt-1"
                value={nameForm.name}
                onChange={e => setNameForm({ name: e.target.value })}
                placeholder="Your full name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNameModal(false)}>Cancel</Button>
            <Button onClick={saveName} disabled={isSavingName || !nameForm.name.trim()}>
              {isSavingName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Staff ID Modal */}
      <Dialog open={showIdModal} onOpenChange={setShowIdModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Staff ID</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              Your Staff ID is what you use to log in. After changing it, you will be logged out and must sign in with the new ID.
            </div>
            <div>
              <Label>Current Staff ID</Label>
              <div className="mt-1 px-3 py-2 bg-slate-50 border rounded-md text-sm font-mono text-muted-foreground">{user.id}</div>
            </div>
            <div>
              <Label>New Staff ID</Label>
              <Input
                className="mt-1"
                value={idForm.newStaffId}
                onChange={e => setIdForm(f => ({ ...f, newStaffId: e.target.value }))}
                placeholder="Enter new Staff ID"
              />
            </div>
            <div>
              <Label>Current Password <span className="text-muted-foreground font-normal text-xs">(to confirm)</span></Label>
              <Input
                className="mt-1"
                type="password"
                value={idForm.currentPassword}
                onChange={e => setIdForm(f => ({ ...f, currentPassword: e.target.value }))}
                placeholder="Enter your current password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIdModal(false)}>Cancel</Button>
            <Button
              onClick={saveStaffId}
              disabled={isSavingId || !idForm.newStaffId.trim() || !idForm.currentPassword}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSavingId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change ID & Log Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Current Password</Label>
              <Input
                className="mt-1"
                type="password"
                value={pwForm.currentPassword}
                onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                placeholder="Enter your current password"
              />
            </div>
            <div>
              <Label>New Password</Label>
              <Input
                className="mt-1"
                type="password"
                value={pwForm.newPassword}
                onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <Input
                className="mt-1"
                type="password"
                value={pwForm.confirmPassword}
                onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="Repeat new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
            <Button onClick={savePassword} disabled={isSavingPw}>
              {isSavingPw && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
