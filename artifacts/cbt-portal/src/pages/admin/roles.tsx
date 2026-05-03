import { useState } from "react";
import {
  useGetAdminRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  getGetAdminRolesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, Check, X, ArrowLeft, Search, ShieldCheck, Star } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type RoleType = "prefect" | "normal" | "custom";
type RoleRecord = { id: number; name: string; type: RoleType; createdBy?: string | null };

const TYPE_LABELS: Record<RoleType, { label: string; variant: string; icon: React.ReactNode }> = {
  prefect: { label: "Prefect", variant: "bg-amber-100 text-amber-800", icon: <ShieldCheck className="h-3 w-3" /> },
  normal: { label: "Normal", variant: "bg-slate-100 text-slate-700", icon: <Star className="h-3 w-3" /> },
  custom: { label: "Custom", variant: "bg-blue-100 text-blue-800", icon: <Plus className="h-3 w-3" /> },
};

function TypeBadge({ type }: { type: RoleType }) {
  const { label, variant, icon } = TYPE_LABELS[type] ?? TYPE_LABELS.custom;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium", variant)}>
      {icon}{label}
    </span>
  );
}

export default function AdminRoles() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: roles, isLoading } = useGetAdminRoles();
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const deleteMutation = useDeleteRole();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<RoleType | "all">("all");

  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addType, setAddType] = useState<RoleType>("prefect");

  const [editRole, setEditRole] = useState<RoleRecord | null>(null);
  const [editName, setEditName] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<RoleRecord | null>(null);

  const filtered = (roles ?? []).filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || r.type === filterType;
    return matchSearch && matchType;
  }) as RoleRecord[];

  const prefectCount = (roles ?? []).filter(r => r.type === "prefect").length;
  const normalCount = (roles ?? []).filter(r => r.type === "normal").length;
  const customCount = (roles ?? []).filter(r => r.type === "custom").length;

  function handleCreate() {
    if (!addName.trim()) { toast({ variant: "destructive", title: "Role name is required" }); return; }
    createMutation.mutate(
      { data: { name: addName.trim(), type: addType } },
      {
        onSuccess: () => {
          toast({ title: "Role created successfully" });
          qc.invalidateQueries({ queryKey: getGetAdminRolesQueryKey() });
          setShowAdd(false);
          setAddName("");
          setAddType("prefect");
        },
        onError: (e: any) =>
          toast({ variant: "destructive", title: "Error", description: e.data?.error || "Failed to create role" }),
      }
    );
  }

  function openEdit(role: RoleRecord) {
    setEditRole(role);
    setEditName(role.name);
  }

  function handleUpdate() {
    if (!editRole || !editName.trim()) { toast({ variant: "destructive", title: "Role name is required" }); return; }
    updateMutation.mutate(
      { id: editRole.id, data: { name: editName.trim() } },
      {
        onSuccess: () => {
          toast({ title: "Role updated successfully" });
          qc.invalidateQueries({ queryKey: getGetAdminRolesQueryKey() });
          setEditRole(null);
        },
        onError: (e: any) =>
          toast({ variant: "destructive", title: "Error", description: e.data?.error || "Failed to update role" }),
      }
    );
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          toast({ title: "Role deleted" });
          qc.invalidateQueries({ queryKey: getGetAdminRolesQueryKey() });
          setDeleteTarget(null);
        },
        onError: (e: any) =>
          toast({ variant: "destructive", title: "Cannot delete", description: e.data?.error || "Failed to delete role" }),
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
            <h1 className="text-2xl font-bold text-gray-900">Student Roles</h1>
            <p className="text-muted-foreground">Manage prefect titles and student positions</p>
          </div>
        </div>
        <Button className="bg-rose-700 hover:bg-rose-800" onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Role
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-amber-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{prefectCount}</p>
                <p className="text-xs text-muted-foreground">Prefect Roles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center">
                <Star className="h-4 w-4 text-slate-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{normalCount}</p>
                <p className="text-xs text-muted-foreground">Normal Roles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
                <Plus className="h-4 w-4 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customCount}</p>
                <p className="text-xs text-muted-foreground">Custom Roles</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search roles..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
            <Select value={filterType} onValueChange={v => setFilterType(v as RoleType | "all")}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="prefect">Prefect</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground ml-auto">
              {filtered.length} role{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-rose-700" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              {search ? `No roles matching "${search}"` : "No roles found"}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(role => (
                <div key={role.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <TypeBadge type={role.type} />
                    <span className="font-medium truncate">{role.name}</span>
                    {role.createdBy && (
                      <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">
                        added by {role.createdBy}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => openEdit(role)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700"
                      onClick={() => setDeleteTarget(role)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Role Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Role Name</Label>
              <Input
                value={addName}
                onChange={e => setAddName(e.target.value)}
                placeholder="e.g. Environment Prefect"
                onKeyDown={e => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={addType} onValueChange={v => setAddType(v as RoleType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prefect">Prefect</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Prefect = leadership role · Normal = standard position · Custom = school-specific
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button
              className="bg-rose-700 hover:bg-rose-800"
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!editRole} onOpenChange={v => { if (!v) setEditRole(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Role Name</Label>
            <Input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleUpdate()}
            />
            {editRole && (
              <p className="text-xs text-muted-foreground">Type: <TypeBadge type={editRole.type} /></p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRole(null)}>Cancel</Button>
            <Button
              className="bg-rose-700 hover:bg-rose-800"
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the role <strong>{deleteTarget?.name}</strong>. Students currently assigned this role will keep their role label but it will no longer appear in the role list. Roles assigned to active students cannot be deleted.
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
