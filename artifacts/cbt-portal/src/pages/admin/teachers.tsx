import { useState } from "react";
import { useGetAdminTeachers, useCreateAdminTeacher, useUpdateAdminTeacher, useDeleteAdminTeacher } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, X } from "lucide-react";
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

type TeacherForm = { teacherId: string; name: string; subject: string; password: string };
type EditForm = { name: string; subject: string; newPassword: string };

export default function AdminTeachers() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: teachers, isLoading } = useGetAdminTeachers();
  const createMutation = useCreateAdminTeacher();
  const updateMutation = useUpdateAdminTeacher();
  const deleteMutation = useDeleteAdminTeacher();

  const [showAdd, setShowAdd] = useState(false);
  const [editTeacher, setEditTeacher] = useState<{ teacherId: string; name: string; subject: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [addForm, setAddForm] = useState<TeacherForm>({ teacherId: "", name: "", subject: "", password: "teacher123" });
  const [editForm, setEditForm] = useState<EditForm>({ name: "", subject: "", newPassword: "" });

  const filtered = (teachers ?? []).filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.teacherId.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase())
  );

  function openEdit(teacher: { teacherId: string; name: string; subject: string }) {
    setEditTeacher(teacher);
    setEditForm({ name: teacher.name, subject: teacher.subject, newPassword: "" });
  }

  function handleAdd() {
    if (!addForm.teacherId || !addForm.name || !addForm.subject || !addForm.password) {
      toast({ variant: "destructive", title: "All fields are required" });
      return;
    }
    createMutation.mutate({ data: { teacherId: addForm.teacherId, name: addForm.name, subject: addForm.subject, password: addForm.password } }, {
      onSuccess: () => {
        toast({ title: "Teacher created successfully" });
        qc.invalidateQueries({ queryKey: ["/api/admin/teachers"] });
        setShowAdd(false);
        setAddForm({ teacherId: "", name: "", subject: "", password: "teacher123" });
      },
      onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.data?.error || "Failed to create teacher" }),
    });
  }

  function handleUpdate() {
    if (!editTeacher || !editForm.name || !editForm.subject) {
      toast({ variant: "destructive", title: "Name and subject are required" });
      return;
    }
    updateMutation.mutate(
      {
        teacherId: editTeacher.teacherId,
        data: {
          name: editForm.name,
          subject: editForm.subject,
          password: editForm.newPassword || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Teacher updated successfully" });
          qc.invalidateQueries({ queryKey: ["/api/admin/teachers"] });
          setEditTeacher(null);
        },
        onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.data?.error || "Failed to update teacher" }),
      }
    );
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate({ teacherId: deleteTarget }, {
      onSuccess: () => {
        toast({ title: "Teacher deleted successfully" });
        qc.invalidateQueries({ queryKey: ["/api/admin/teachers"] });
        setDeleteTarget(null);
      },
      onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.data?.error || "Failed to delete teacher" }),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="text-muted-foreground">Manage teacher accounts</p>
        </div>
        <Button className="bg-rose-700 hover:bg-rose-800" onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Teacher
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search by name, ID or subject..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-sm"
            />
            {search && (
              <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
                <X className="h-4 w-4" />
              </Button>
            )}
            <span className="text-sm text-muted-foreground ml-auto">{filtered.length} teacher{filtered.length !== 1 ? "s" : ""}</span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-rose-700" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No teachers found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(teacher => (
                  <TableRow key={teacher.teacherId}>
                    <TableCell className="font-mono text-sm">{teacher.teacherId}</TableCell>
                    <TableCell className="font-medium">{teacher.name}</TableCell>
                    <TableCell>{teacher.subject}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(teacher)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-rose-600 hover:text-rose-700" onClick={() => setDeleteTarget(teacher.teacherId)}>
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
            <DialogTitle>Add New Teacher</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Teacher ID</Label>
              <Input value={addForm.teacherId} onChange={e => setAddForm(f => ({ ...f, teacherId: e.target.value }))} placeholder="e.g. TCH002" />
            </div>
            <div>
              <Label>Full Name</Label>
              <Input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Mrs. Jane Doe" />
            </div>
            <div>
              <Label>Subject</Label>
              <Input value={addForm.subject} onChange={e => setAddForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. English Language" />
            </div>
            <div>
              <Label>Initial Password</Label>
              <Input value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} placeholder="teacher123" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button className="bg-rose-700 hover:bg-rose-800" onClick={handleAdd} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Teacher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTeacher} onOpenChange={v => { if (!v) setEditTeacher(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Teacher — {editTeacher?.teacherId}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Subject</Label>
              <Input value={editForm.subject} onChange={e => setEditForm(f => ({ ...f, subject: e.target.value }))} />
            </div>
            <div>
              <Label>New Password (leave blank to keep current)</Label>
              <Input type="password" value={editForm.newPassword} onChange={e => setEditForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="New password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTeacher(null)}>Cancel</Button>
            <Button className="bg-rose-700 hover:bg-rose-800" onClick={handleUpdate} disabled={updateMutation.isPending}>
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
            <AlertDialogTitle>Delete Teacher?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete teacher <strong>{deleteTarget}</strong>. All their exams will remain but will no longer be linked to this teacher. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-700 hover:bg-rose-800" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
