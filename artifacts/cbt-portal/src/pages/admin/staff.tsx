import { useState } from "react";
import {
  useGetAdminStaff,
  useCreateAdminStaff,
  useUpdateAdminStaffMember,
  useDeleteAdminStaffMember,
  getGetAdminStaffQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, X, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StaffPermissions = {
  manage_exams: boolean;
  view_all_results: boolean;
  manage_students: boolean;
};

const STAFF_ROLES = ["teacher", "hod", "librarian", "custom"] as const;
type StaffRole = typeof STAFF_ROLES[number];

const ROLE_LABELS: Record<StaffRole, string> = {
  teacher: "Teacher",
  hod: "Head of Department (HOD)",
  librarian: "Librarian",
  custom: "Custom",
};

const ROLE_BADGE_COLORS: Record<StaffRole, string> = {
  teacher: "bg-blue-100 text-blue-800",
  hod: "bg-purple-100 text-purple-800",
  librarian: "bg-green-100 text-green-800",
  custom: "bg-gray-100 text-gray-800",
};

const DEFAULT_PERMISSIONS: Record<StaffRole, StaffPermissions> = {
  teacher: { manage_exams: true, view_all_results: false, manage_students: false },
  hod: { manage_exams: true, view_all_results: true, manage_students: true },
  librarian: { manage_exams: false, view_all_results: false, manage_students: false },
  custom: { manage_exams: false, view_all_results: false, manage_students: false },
};

const PERMISSION_LABELS: Record<keyof StaffPermissions, string> = {
  manage_exams: "Manage Exams (create, edit, delete)",
  view_all_results: "View All Student Results",
  manage_students: "Manage Student Accounts",
};

type AddForm = {
  staffId: string;
  name: string;
  subject: string;
  staffRole: StaffRole;
  permissions: StaffPermissions;
  password: string;
};

type EditForm = {
  name: string;
  subject: string;
  staffRole: StaffRole;
  permissions: StaffPermissions;
  newPassword: string;
};

type StaffItem = {
  staffId: string;
  name: string;
  subject: string;
  staffRole: string;
  permissions: StaffPermissions;
};

function PermissionsEditor({
  permissions,
  onChange,
}: {
  permissions: StaffPermissions;
  onChange: (p: StaffPermissions) => void;
}) {
  return (
    <div className="space-y-2 border rounded-md p-3 bg-slate-50">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Permissions</p>
      {(Object.keys(PERMISSION_LABELS) as Array<keyof StaffPermissions>).map(key => (
        <div key={key} className="flex items-center gap-3">
          <Checkbox
            id={key}
            checked={permissions[key]}
            onCheckedChange={(checked) =>
              onChange({ ...permissions, [key]: !!checked })
            }
          />
          <label htmlFor={key} className="text-sm cursor-pointer select-none">
            {PERMISSION_LABELS[key]}
          </label>
        </div>
      ))}
    </div>
  );
}

export default function AdminStaff() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: staff, isLoading } = useGetAdminStaff();
  const createMutation = useCreateAdminStaff();
  const updateMutation = useUpdateAdminStaffMember();
  const deleteMutation = useDeleteAdminStaffMember();

  const [showAdd, setShowAdd] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [addForm, setAddForm] = useState<AddForm>({
    staffId: "",
    name: "",
    subject: "",
    staffRole: "teacher",
    permissions: DEFAULT_PERMISSIONS.teacher,
    password: "staff123",
  });

  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    subject: "",
    staffRole: "teacher",
    permissions: DEFAULT_PERMISSIONS.teacher,
    newPassword: "",
  });

  const filtered = (staff ?? []).filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.staffId.toLowerCase().includes(search.toLowerCase()) ||
    s.subject.toLowerCase().includes(search.toLowerCase()) ||
    s.staffRole.toLowerCase().includes(search.toLowerCase())
  );

  function handleRoleChange(role: StaffRole, form: "add" | "edit") {
    const perms = DEFAULT_PERMISSIONS[role] ?? DEFAULT_PERMISSIONS.custom;
    if (form === "add") {
      setAddForm(f => ({ ...f, staffRole: role, permissions: perms }));
    } else {
      setEditForm(f => ({ ...f, staffRole: role, permissions: perms }));
    }
  }

  function openEdit(s: StaffItem) {
    setEditStaff(s);
    const role = (STAFF_ROLES.includes(s.staffRole as StaffRole) ? s.staffRole : "custom") as StaffRole;
    setEditForm({
      name: s.name,
      subject: s.subject,
      staffRole: role,
      permissions: s.permissions,
      newPassword: "",
    });
  }

  function handleAdd() {
    if (!addForm.staffId || !addForm.name || !addForm.subject || !addForm.password) {
      toast({ variant: "destructive", title: "All fields are required" });
      return;
    }
    createMutation.mutate(
      {
        data: {
          staffId: addForm.staffId,
          name: addForm.name,
          subject: addForm.subject,
          staffRole: addForm.staffRole,
          permissions: addForm.permissions,
          password: addForm.password,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Staff member created successfully" });
          qc.invalidateQueries({ queryKey: getGetAdminStaffQueryKey() });
          setShowAdd(false);
          setAddForm({ staffId: "", name: "", subject: "", staffRole: "teacher", permissions: DEFAULT_PERMISSIONS.teacher, password: "staff123" });
        },
        onError: (e: any) =>
          toast({ variant: "destructive", title: "Error", description: e.data?.error || "Failed to create staff member" }),
      }
    );
  }

  function handleUpdate() {
    if (!editStaff || !editForm.name || !editForm.subject) {
      toast({ variant: "destructive", title: "Name and subject are required" });
      return;
    }
    updateMutation.mutate(
      {
        staffId: editStaff.staffId,
        data: {
          name: editForm.name,
          subject: editForm.subject,
          staffRole: editForm.staffRole,
          permissions: editForm.permissions,
          password: editForm.newPassword || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Staff member updated successfully" });
          qc.invalidateQueries({ queryKey: getGetAdminStaffQueryKey() });
          setEditStaff(null);
        },
        onError: (e: any) =>
          toast({ variant: "destructive", title: "Error", description: e.data?.error || "Failed to update staff member" }),
      }
    );
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(
      { staffId: deleteTarget },
      {
        onSuccess: () => {
          toast({ title: "Staff member deleted successfully" });
          qc.invalidateQueries({ queryKey: getGetAdminStaffQueryKey() });
          setDeleteTarget(null);
        },
        onError: (e: any) =>
          toast({ variant: "destructive", title: "Error", description: e.data?.error || "Failed to delete staff member" }),
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-muted-foreground">Manage staff accounts, roles and permissions</p>
        </div>
        <Button className="bg-rose-700 hover:bg-rose-800" onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Staff
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search by name, ID, subject or role..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-sm"
            />
            {search && (
              <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
                <X className="h-4 w-4" />
              </Button>
            )}
            <span className="text-sm text-muted-foreground ml-auto">
              {filtered.length} staff member{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-rose-700" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No staff members found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(member => {
                  const role = member.staffRole as StaffRole;
                  const roleLabel = ROLE_LABELS[role] ?? member.staffRole;
                  const badgeClass = ROLE_BADGE_COLORS[role] ?? "bg-gray-100 text-gray-800";
                  const perms = member.permissions ?? {};
                  return (
                    <TableRow key={member.staffId}>
                      <TableCell className="font-mono text-sm">{member.staffId}</TableCell>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{member.subject}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}>
                          {roleLabel}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {perms.manage_exams && (
                            <Badge variant="outline" className="text-xs py-0 h-5">Exams</Badge>
                          )}
                          {perms.view_all_results && (
                            <Badge variant="outline" className="text-xs py-0 h-5">Results</Badge>
                          )}
                          {perms.manage_students && (
                            <Badge variant="outline" className="text-xs py-0 h-5">Students</Badge>
                          )}
                          {!perms.manage_exams && !perms.view_all_results && !perms.manage_students && (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(member as StaffItem)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-rose-600 hover:text-rose-700"
                          onClick={() => setDeleteTarget(member.staffId)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Staff ID</Label>
                <Input
                  value={addForm.staffId}
                  onChange={e => setAddForm(f => ({ ...f, staffId: e.target.value }))}
                  placeholder="e.g. TCH002"
                />
              </div>
              <div>
                <Label>Initial Password</Label>
                <Input
                  value={addForm.password}
                  onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="staff123"
                />
              </div>
            </div>
            <div>
              <Label>Full Name</Label>
              <Input
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Mrs. Jane Doe"
              />
            </div>
            <div>
              <Label>Subject / Department</Label>
              <Input
                value={addForm.subject}
                onChange={e => setAddForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="e.g. English Language"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={addForm.staffRole}
                onValueChange={(v) => handleRoleChange(v as StaffRole, "add")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map(r => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <PermissionsEditor
              permissions={addForm.permissions}
              onChange={p => setAddForm(f => ({ ...f, permissions: p }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button
              className="bg-rose-700 hover:bg-rose-800"
              onClick={handleAdd}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Staff Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editStaff} onOpenChange={v => { if (!v) setEditStaff(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-rose-600" />
                Edit Staff — {editStaff?.staffId}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Subject / Department</Label>
              <Input
                value={editForm.subject}
                onChange={e => setEditForm(f => ({ ...f, subject: e.target.value }))}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={editForm.staffRole}
                onValueChange={(v) => handleRoleChange(v as StaffRole, "edit")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map(r => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <PermissionsEditor
              permissions={editForm.permissions}
              onChange={p => setEditForm(f => ({ ...f, permissions: p }))}
            />
            <div>
              <Label>New Password (leave blank to keep current)</Label>
              <Input
                type="password"
                value={editForm.newPassword}
                onChange={e => setEditForm(f => ({ ...f, newPassword: e.target.value }))}
                placeholder="New password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStaff(null)}>Cancel</Button>
            <Button
              className="bg-rose-700 hover:bg-rose-800"
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete staff member <strong>{deleteTarget}</strong>. Their exams
              will remain but will no longer be linked to this account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-700 hover:bg-rose-800"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
