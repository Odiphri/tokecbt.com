import { useState, useEffect } from "react";
import {
  useGetAdminStaff,
  useCreateAdminStaff,
  useUpdateAdminStaffMember,
  useDeleteAdminStaffMember,
  useAssignStaffClass,
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
import { Loader2, Plus, Pencil, Trash2, X, ShieldCheck, Zap, ArrowLeft, School, BookOpen } from "lucide-react";
import { CLASS_SECTIONS } from "@/lib/class-sections";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";
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

const API_BASE = "/api";
async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem("cbt_token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Request failed");
  }
  return res.json();
}

type StaffPermissions = {
  manage_exams: boolean;
  view_all_exams: boolean;
  view_all_results: boolean;
  manage_students: boolean;
  reset_student_exam: boolean;
  manage_student_roles: boolean;
  manage_bursary: boolean;
  mark_attendance: boolean;
  override_exam_access: boolean;
};

type SubjectEntry = { subject: string; section: "junior" | "senior" };

const ROLE_PRESETS: Record<string, { label: string; permissions: StaffPermissions }> = {
  teacher: {
    label: "Teacher",
    permissions: { manage_exams: true, view_all_exams: false, view_all_results: false, manage_students: false, reset_student_exam: false, manage_student_roles: false, manage_bursary: false, mark_attendance: true, override_exam_access: false },
  },
  hod: {
    label: "HOD",
    permissions: { manage_exams: true, view_all_exams: true, view_all_results: true, manage_students: true, reset_student_exam: true, manage_student_roles: true, manage_bursary: false, mark_attendance: true, override_exam_access: true },
  },
  librarian: {
    label: "Librarian",
    permissions: { manage_exams: false, view_all_exams: false, view_all_results: false, manage_students: false, reset_student_exam: false, manage_student_roles: false, manage_bursary: false, mark_attendance: false, override_exam_access: false },
  },
  cbt_personnel: {
    label: "CBT Officer",
    permissions: { manage_exams: true, view_all_exams: true, view_all_results: true, manage_students: false, reset_student_exam: true, manage_student_roles: false, manage_bursary: false, mark_attendance: false, override_exam_access: false },
  },
  bursary_manager: {
    label: "Bursary Manager",
    permissions: { manage_exams: false, view_all_exams: false, view_all_results: false, manage_students: false, reset_student_exam: false, manage_student_roles: false, manage_bursary: true, mark_attendance: false, override_exam_access: false },
  },
};

const EMPTY_PERMISSIONS: StaffPermissions = {
  manage_exams: false,
  view_all_exams: false,
  view_all_results: false,
  manage_students: false,
  reset_student_exam: false,
  manage_student_roles: false,
  manage_bursary: false,
  mark_attendance: false,
  override_exam_access: false,
};

const PERMISSION_LABELS: Record<keyof StaffPermissions, { label: string; description: string }> = {
  manage_exams: {
    label: "Manage Own Exams",
    description: "Create, edit and delete their own exams and questions",
  },
  view_all_exams: {
    label: "View & Edit All Exams",
    description: "Access and modify all exams across all staff members",
  },
  view_all_results: {
    label: "View All Results",
    description: "See student results for any exam school-wide",
  },
  manage_students: {
    label: "Manage Students",
    description: "Add, edit and delete student accounts",
  },
  reset_student_exam: {
    label: "Allow Retakes",
    description: "Delete a student's exam result so they can retake it",
  },
  manage_student_roles: {
    label: "Manage Student Roles",
    description: "Add new roles, edit role names, and assign roles to students",
  },
  manage_bursary: {
    label: "Manage Bursary",
    description: "Create fee types, record payments and manage the fee structure",
  },
  mark_attendance: {
    label: "Mark Attendance",
    description: "Record daily attendance for their assigned class",
  },
  override_exam_access: {
    label: "Override Exam Access",
    description: "Grant exam access to students with outstanding fees",
  },
};

type AddForm = {
  staffId: string;
  name: string;
  subject: string;
  staffRole: string;
  permissions: StaffPermissions;
  password: string;
  subjects: SubjectEntry[];
};

type EditForm = {
  name: string;
  subject: string;
  staffRole: string;
  permissions: StaffPermissions;
  newPassword: string;
  subjects: SubjectEntry[];
};

type StaffItem = {
  staffId: string;
  name: string;
  subject: string;
  staffRole: string;
  permissions: StaffPermissions;
  assignedClass?: string | null;
};

function PermissionsEditor({
  permissions,
  onChange,
}: {
  permissions: StaffPermissions;
  onChange: (p: StaffPermissions) => void;
}) {
  return (
    <div className="space-y-1 border rounded-md p-3 bg-slate-50">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Permissions</p>
      {(Object.keys(PERMISSION_LABELS) as Array<keyof StaffPermissions>).map(key => (
        <div key={key} className="flex items-start gap-3 py-1.5">
          <Checkbox
            id={key}
            checked={permissions[key]}
            onCheckedChange={(checked) =>
              onChange({ ...permissions, [key]: !!checked })
            }
            className="mt-0.5"
          />
          <div>
            <label htmlFor={key} className="text-sm font-medium cursor-pointer select-none block">
              {PERMISSION_LABELS[key].label}
            </label>
            <p className="text-xs text-muted-foreground">{PERMISSION_LABELS[key].description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function RolePresetButtons({ onSelect }: { onSelect: (role: string, permissions: StaffPermissions) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Zap className="h-3 w-3" /> Quick presets:
      </span>
      {Object.entries(ROLE_PRESETS).map(([key, preset]) => (
        <button
          key={key}
          type="button"
          onClick={() => onSelect(key, preset.permissions)}
          className="text-xs px-2 py-1 rounded border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
        >
          {preset.label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onSelect("", EMPTY_PERMISSIONS)}
        className="text-xs px-2 py-1 rounded border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
      >
        Clear / Custom
      </button>
    </div>
  );
}

function getPermissionBadges(perms: StaffPermissions) {
  const active: string[] = [];
  if (perms.manage_exams) active.push("Own Exams");
  if (perms.view_all_exams) active.push("All Exams");
  if (perms.view_all_results) active.push("All Results");
  if (perms.manage_students) active.push("Students");
  return active;
}

export default function AdminStaff() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: staff, isLoading } = useGetAdminStaff();
  const createMutation = useCreateAdminStaff();
  const updateMutation = useUpdateAdminStaffMember();
  const deleteMutation = useDeleteAdminStaffMember();

  const assignClassMutation = useAssignStaffClass();
  const [showAdd, setShowAdd] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [assignClassTarget, setAssignClassTarget] = useState<StaffItem | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [search, setSearch] = useState("");

  const [addForm, setAddForm] = useState<AddForm>({
    staffId: "",
    name: "",
    subject: "",
    staffRole: "teacher",
    permissions: ROLE_PRESETS.teacher.permissions,
    password: "staff123",
    subjects: [],
  });
  const [addSubjectInput, setAddSubjectInput] = useState({ subject: "", section: "junior" as "junior" | "senior" });

  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    subject: "",
    staffRole: "teacher",
    permissions: ROLE_PRESETS.teacher.permissions,
    newPassword: "",
    subjects: [],
  });
  const [editSubjectInput, setEditSubjectInput] = useState({ subject: "", section: "junior" as "junior" | "senior" });

  const filtered = (staff ?? []).filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.staffId.toLowerCase().includes(search.toLowerCase()) ||
    s.subject.toLowerCase().includes(search.toLowerCase()) ||
    s.staffRole.toLowerCase().includes(search.toLowerCase())
  );

  function openEdit(s: StaffItem) {
    setEditStaff(s);
    setEditForm({ name: s.name, subject: s.subject, staffRole: s.staffRole, permissions: s.permissions, newPassword: "", subjects: [] });
    // Fetch current subjects for this staff member
    apiFetch(`/admin/staff/${s.staffId}/subjects`)
      .then((subs: Array<{ subject: string; section: string }>) =>
        setEditForm(f => ({ ...f, subjects: subs.map(x => ({ subject: x.subject, section: x.section as "junior" | "senior" })) }))
      )
      .catch(() => {});
  }

  function handleAdd() {
    if (!addForm.staffId || !addForm.name || !addForm.subject || !addForm.password || !addForm.staffRole) {
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
        onSuccess: async () => {
          // Save subjects if any were added
          if (addForm.subjects.length > 0) {
            await apiFetch(`/admin/staff/${addForm.staffId}/subjects`, {
              method: "POST",
              body: JSON.stringify({ subjects: addForm.subjects }),
            }).catch(() => {});
          }
          toast({ title: "Staff member created successfully" });
          qc.invalidateQueries({ queryKey: getGetAdminStaffQueryKey() });
          setShowAdd(false);
          setAddForm({ staffId: "", name: "", subject: "", staffRole: "teacher", permissions: ROLE_PRESETS.teacher.permissions, password: "staff123", subjects: [] });
          setAddSubjectInput({ subject: "", section: "junior" });
        },
        onError: (e: any) =>
          toast({ variant: "destructive", title: "Error", description: e.data?.error || "Failed to create staff member" }),
      }
    );
  }

  function handleUpdate() {
    if (!editStaff || !editForm.name || !editForm.subject || !editForm.staffRole) {
      toast({ variant: "destructive", title: "Name, subject and role are required" });
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
        onSuccess: async () => {
          // Save subjects
          await apiFetch(`/admin/staff/${editStaff!.staffId}/subjects`, {
            method: "POST",
            body: JSON.stringify({ subjects: editForm.subjects }),
          }).catch(() => {});
          toast({ title: "Staff member updated successfully" });
          qc.invalidateQueries({ queryKey: getGetAdminStaffQueryKey() });
          setEditStaff(null);
        },
        onError: (e: any) =>
          toast({ variant: "destructive", title: "Error", description: e.data?.error || "Failed to update staff member" }),
      }
    );
  }

  function handleAssignClass() {
    if (!assignClassTarget) return;
    assignClassMutation.mutate(
      {
        staffId: assignClassTarget.staffId,
        data: { assignedClass: selectedClass || null },
      },
      {
        onSuccess: () => {
          toast({ title: selectedClass ? `Class ${selectedClass} assigned` : "Class assignment cleared" });
          qc.invalidateQueries({ queryKey: getGetAdminStaffQueryKey() });
          setAssignClassTarget(null);
          setSelectedClass("");
        },
        onError: (e: any) =>
          toast({ variant: "destructive", title: "Error", description: e.data?.error || "Failed to assign class" }),
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
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
            <p className="text-muted-foreground">Manage staff accounts, roles and permissions</p>
          </div>
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
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(member => {
                  const perms = (member.permissions ?? EMPTY_PERMISSIONS) as StaffPermissions;
                  const badges = getPermissionBadges(perms);
                  return (
                    <TableRow key={member.staffId}>
                      <TableCell className="font-mono text-sm">{member.staffId}</TableCell>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{member.subject}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                          {member.staffRole}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {badges.length === 0 ? (
                            <span className="text-xs text-muted-foreground">No permissions</span>
                          ) : (
                            badges.map(b => (
                              <Badge key={b} variant="outline" className="text-xs py-0 h-5">{b}</Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(member as StaffItem).assignedClass ? (
                          <Badge variant="secondary" className="text-xs font-mono">
                            {(member as StaffItem).assignedClass}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700"
                          onClick={() => {
                            setAssignClassTarget(member as StaffItem);
                            setSelectedClass((member as StaffItem).assignedClass ?? "");
                          }}
                          title="Assign class"
                        >
                          <School className="h-3.5 w-3.5" />
                        </Button>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
            <div className="space-y-2">
              <Label>Role Title</Label>
              <Input
                value={addForm.staffRole}
                onChange={e => setAddForm(f => ({ ...f, staffRole: e.target.value }))}
                placeholder="e.g. Teacher, HOD, Librarian, Counselor..."
              />
              <RolePresetButtons
                onSelect={(role, permissions) =>
                  setAddForm(f => ({ ...f, staffRole: role || f.staffRole, permissions }))
                }
              />
            </div>
            <PermissionsEditor
              permissions={addForm.permissions}
              onChange={p => setAddForm(f => ({ ...f, permissions: p }))}
            />

            {/* Subjects section */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-muted-foreground" />Teaching Subjects (optional)</Label>
              <div className="flex gap-2">
                <Select value={addSubjectInput.section} onValueChange={v => setAddSubjectInput(s => ({ ...s, section: v as "junior" | "senior" }))}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="junior">Junior</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="flex-1"
                  value={addSubjectInput.subject}
                  onChange={e => setAddSubjectInput(s => ({ ...s, subject: e.target.value }))}
                  placeholder="Subject name…"
                  onKeyDown={e => {
                    if (e.key === "Enter" && addSubjectInput.subject.trim()) {
                      e.preventDefault();
                      setAddForm(f => ({ ...f, subjects: [...f.subjects, { subject: addSubjectInput.subject.trim(), section: addSubjectInput.section }] }));
                      setAddSubjectInput(s => ({ ...s, subject: "" }));
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm"
                  disabled={!addSubjectInput.subject.trim()}
                  onClick={() => {
                    setAddForm(f => ({ ...f, subjects: [...f.subjects, { subject: addSubjectInput.subject.trim(), section: addSubjectInput.section }] }));
                    setAddSubjectInput(s => ({ ...s, subject: "" }));
                  }}>
                  Add
                </Button>
              </div>
              {addForm.subjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {addForm.subjects.map((s, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      <span className="capitalize text-xs text-muted-foreground mr-0.5">{s.section}</span>{s.subject}
                      <button type="button" onClick={() => setAddForm(f => ({ ...f, subjects: f.subjects.filter((_, j) => j !== i) }))} className="ml-0.5 rounded-sm hover:bg-slate-200 p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
            <div className="space-y-2">
              <Label>Role Title</Label>
              <Input
                value={editForm.staffRole}
                onChange={e => setEditForm(f => ({ ...f, staffRole: e.target.value }))}
                placeholder="e.g. Teacher, HOD, Librarian..."
              />
              <RolePresetButtons
                onSelect={(role, permissions) =>
                  setEditForm(f => ({ ...f, staffRole: role || f.staffRole, permissions }))
                }
              />
            </div>
            <PermissionsEditor
              permissions={editForm.permissions}
              onChange={p => setEditForm(f => ({ ...f, permissions: p }))}
            />
            {/* Subjects section */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-muted-foreground" />Teaching Subjects</Label>
              <div className="flex gap-2">
                <Select value={editSubjectInput.section} onValueChange={v => setEditSubjectInput(s => ({ ...s, section: v as "junior" | "senior" }))}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="junior">Junior</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="flex-1"
                  value={editSubjectInput.subject}
                  onChange={e => setEditSubjectInput(s => ({ ...s, subject: e.target.value }))}
                  placeholder="Subject name…"
                  onKeyDown={e => {
                    if (e.key === "Enter" && editSubjectInput.subject.trim()) {
                      e.preventDefault();
                      setEditForm(f => ({ ...f, subjects: [...f.subjects, { subject: editSubjectInput.subject.trim(), section: editSubjectInput.section }] }));
                      setEditSubjectInput(s => ({ ...s, subject: "" }));
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm"
                  disabled={!editSubjectInput.subject.trim()}
                  onClick={() => {
                    setEditForm(f => ({ ...f, subjects: [...f.subjects, { subject: editSubjectInput.subject.trim(), section: editSubjectInput.section }] }));
                    setEditSubjectInput(s => ({ ...s, subject: "" }));
                  }}>
                  Add
                </Button>
              </div>
              {editForm.subjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {editForm.subjects.map((s, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      <span className="capitalize text-xs text-muted-foreground mr-0.5">{s.section}</span>{s.subject}
                      <button type="button" onClick={() => setEditForm(f => ({ ...f, subjects: f.subjects.filter((_, j) => j !== i) }))} className="ml-0.5 rounded-sm hover:bg-slate-200 p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>New Password <span className="text-muted-foreground font-normal">(leave blank to keep current)</span></Label>
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

      {/* Assign Class Dialog */}
      <Dialog open={!!assignClassTarget} onOpenChange={v => { if (!v) { setAssignClassTarget(null); setSelectedClass(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <School className="h-4 w-4 text-blue-600" />
              Assign Class Teacher
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Assigning a class makes <strong>{assignClassTarget?.name}</strong> the class teacher for that group. They will be able to promote or demote students within the class.
            </p>
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {CLASS_SECTIONS.map(cls => (
                    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClass && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline"
                  onClick={() => setSelectedClass("")}
                >
                  Clear assignment (remove class teacher role)
                </button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignClassTarget(null); setSelectedClass(""); }}>Cancel</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleAssignClass}
              disabled={assignClassMutation.isPending}
            >
              {assignClassMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {selectedClass ? "Assign Class" : "Clear Assignment"}
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
