import { useState } from "react";
import {
  useGetTeacherStudents,
  useCreateTeacherStudent,
  useUpdateTeacherStudent,
  useDeleteTeacherStudent,
  getGetTeacherStudentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, RotateCcw, X, ShieldOff, Check, ChevronsUpDown } from "lucide-react";
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
import { CLASS_SECTIONS } from "@/lib/class-sections";
import { STUDENT_POSITIONS } from "@/lib/student-positions";
import { cn } from "@/lib/utils";

type StudentForm = { regNumber: string; name: string; class: string; password: string; studentRole: string };
type EditForm = { name: string; class: string; newPassword: string; resetPassword: boolean; studentRole: string };

function SearchableClassSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className={cn("w-full justify-between", !value && "text-muted-foreground")}>
          {value || "Select class section"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Search class..." />
          <CommandList>
            <CommandEmpty>No class found.</CommandEmpty>
            <CommandGroup>
              {CLASS_SECTIONS.map(cls => (
                <CommandItem key={cls} value={cls} onSelect={() => { onChange(cls); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", value === cls ? "opacity-100" : "opacity-0")} />
                  {cls}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function SearchablePositionSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className={cn("w-full justify-between", !value && "text-muted-foreground")}>
          {value || "Select position"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Search position..." />
          <CommandList>
            <CommandEmpty>No position found.</CommandEmpty>
            <CommandGroup>
              {STUDENT_POSITIONS.map(pos => (
                <CommandItem key={pos} value={pos} onSelect={() => { onChange(pos); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", value === pos ? "opacity-100" : "opacity-0")} />
                  {pos}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function StaffStudents() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (!user?.permissions?.manage_students) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <ShieldOff className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground max-w-xs">
          You don't have permission to manage students. Contact your administrator.
        </p>
        <Button variant="outline" onClick={() => setLocation("/teacher/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return <StudentsContent />;
}

function StudentsContent() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: students, isLoading } = useGetTeacherStudents();
  const createMutation = useCreateTeacherStudent();
  const updateMutation = useUpdateTeacherStudent();
  const deleteMutation = useDeleteTeacherStudent();

  const [showAdd, setShowAdd] = useState(false);
  const [editStudent, setEditStudent] = useState<{ regNumber: string; name: string; class: string; studentRole?: string | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [addForm, setAddForm] = useState<StudentForm>({ regNumber: "", name: "", class: "", password: "12345", studentRole: "Student" });
  const [editForm, setEditForm] = useState<EditForm>({ name: "", class: "", newPassword: "", resetPassword: false, studentRole: "Student" });

  const filtered = (students ?? []).filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.regNumber.toLowerCase().includes(search.toLowerCase()) ||
    s.class.toLowerCase().includes(search.toLowerCase())
  );

  function openEdit(student: { regNumber: string; name: string; class: string; studentRole?: string | null }) {
    setEditStudent(student);
    setEditForm({ name: student.name, class: student.class, newPassword: "", resetPassword: false, studentRole: student.studentRole ?? "Student" });
  }

  function handleAdd() {
    if (!addForm.regNumber || !addForm.name || !addForm.class || !addForm.password) {
      toast({ variant: "destructive", title: "All fields are required" });
      return;
    }
    createMutation.mutate(
      { data: { regNumber: addForm.regNumber, name: addForm.name, class: addForm.class, password: addForm.password, studentRole: addForm.studentRole } },
      {
        onSuccess: () => {
          toast({ title: "Student created successfully" });
          qc.invalidateQueries({ queryKey: getGetTeacherStudentsQueryKey() });
          setShowAdd(false);
          setAddForm({ regNumber: "", name: "", class: "", password: "12345", studentRole: "Student" });
        },
        onError: (e: any) =>
          toast({ variant: "destructive", title: "Error", description: e.data?.error || "Failed to create student" }),
      }
    );
  }

  function handleUpdate() {
    if (!editStudent || !editForm.name || !editForm.class) {
      toast({ variant: "destructive", title: "Name and class are required" });
      return;
    }
    updateMutation.mutate(
      {
        regNumber: editStudent.regNumber,
        data: {
          name: editForm.name,
          class: editForm.class,
          password: editForm.newPassword || undefined,
          resetPassword: editForm.resetPassword,
          studentRole: editForm.studentRole,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Student updated successfully" });
          qc.invalidateQueries({ queryKey: getGetTeacherStudentsQueryKey() });
          setEditStudent(null);
        },
        onError: (e: any) =>
          toast({ variant: "destructive", title: "Error", description: e.data?.error || "Failed to update student" }),
      }
    );
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(
      { regNumber: deleteTarget },
      {
        onSuccess: () => {
          toast({ title: "Student deleted successfully" });
          qc.invalidateQueries({ queryKey: getGetTeacherStudentsQueryKey() });
          setDeleteTarget(null);
        },
        onError: (e: any) =>
          toast({ variant: "destructive", title: "Error", description: e.data?.error || "Failed to delete student" }),
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Students</h1>
          <p className="text-muted-foreground mt-1">Manage student accounts and passwords</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Student
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search by name, ID or class..."
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
              {filtered.length} student{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {search ? "No students match your search." : "No students found."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Password Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(student => (
                  <TableRow key={student.regNumber}>
                    <TableCell className="font-mono text-sm">{student.regNumber}</TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{student.class}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${student.studentRole && student.studentRole !== "Student" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"}`}>
                        {student.studentRole ?? "Student"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {student.isDefaultPassword ? (
                        <Badge variant="destructive">Default</Badge>
                      ) : (
                        <Badge variant="secondary">Changed</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(student)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(student.regNumber)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Student ID</Label>
              <Input
                value={addForm.regNumber}
                onChange={e => setAddForm(f => ({ ...f, regNumber: e.target.value }))}
                placeholder="e.g. 10500"
              />
            </div>
            <div>
              <Label>Full Name</Label>
              <Input
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. John Doe"
              />
            </div>
            <div>
              <Label>Class / Section</Label>
              <SearchableClassSelect value={addForm.class} onChange={v => setAddForm(f => ({ ...f, class: v }))} />
            </div>
            <div>
              <Label>Position / Role</Label>
              <SearchablePositionSelect value={addForm.studentRole} onChange={v => setAddForm(f => ({ ...f, studentRole: v }))} />
            </div>
            <div>
              <Label>Initial Password</Label>
              <Input
                value={addForm.password}
                onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                placeholder="12345"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editStudent} onOpenChange={v => { if (!v) setEditStudent(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student — {editStudent?.regNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Class / Section</Label>
              <SearchableClassSelect value={editForm.class} onChange={v => setEditForm(f => ({ ...f, class: v }))} />
            </div>
            <div>
              <Label>Position / Role</Label>
              <SearchablePositionSelect value={editForm.studentRole} onChange={v => setEditForm(f => ({ ...f, studentRole: v }))} />
            </div>
            <div>
              <Label>New Password <span className="text-muted-foreground text-xs">(leave blank to keep current)</span></Label>
              <Input
                type="password"
                value={editForm.newPassword}
                onChange={e => setEditForm(f => ({ ...f, newPassword: e.target.value }))}
                placeholder="New password"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="reset-pw-teacher"
                checked={editForm.resetPassword}
                onChange={e => setEditForm(f => ({ ...f, resetPassword: e.target.checked }))}
                className="h-4 w-4"
              />
              <label htmlFor="reset-pw-teacher" className="text-sm cursor-pointer flex items-center gap-1">
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to default password (12345)
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStudent(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete student <strong>{deleteTarget}</strong> and all their exam results. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
