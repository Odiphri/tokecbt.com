import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DollarSign, Search, ShieldCheck, Trash2, Plus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const API_BASE = "/api";

async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem("cbt_token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Request failed");
  }
  return res.json();
}

interface BursaryRecord {
  regNumber: string;
  name: string;
  class: string;
  paymentStatus: "paid" | "unpaid" | "partial";
  amountPaid: number;
  notes: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

interface Override {
  id: number;
  studentReg: string;
  examId: string | null;
  overriddenBy: string;
  overriderRole: string;
  reason: string;
  expiresAt: string | null;
  createdAt: string;
}

function statusBadge(status: string) {
  if (status === "paid") return <Badge className="bg-green-100 text-green-700 border-green-300 hover:bg-green-100">Paid</Badge>;
  if (status === "partial") return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-100">Partial</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-300 hover:bg-red-100">Unpaid</Badge>;
}

export default function BursaryPage() {
  const { toast } = useToast();
  const [records, setRecords] = useState<BursaryRecord[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"payments" | "overrides">("payments");

  const [editRecord, setEditRecord] = useState<BursaryRecord | null>(null);
  const [editStatus, setEditStatus] = useState<"paid" | "unpaid" | "partial">("unpaid");
  const [editNotes, setEditNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideStudentReg, setOverrideStudentReg] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideExpiry, setOverrideExpiry] = useState("");
  const [isOverriding, setIsOverriding] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [bursary, ovr] = await Promise.all([
        apiFetch("/admin/bursary"),
        apiFetch("/admin/bursary/overrides"),
      ]);
      setRecords(bursary);
      setOverrides(ovr);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to load bursary data", description: err.message });
    } finally {
      setIsLoading(false);
    }
  }

  function openEdit(rec: BursaryRecord) {
    setEditRecord(rec);
    setEditStatus(rec.paymentStatus);
    setEditNotes(rec.notes ?? "");
  }

  async function savePayment() {
    if (!editRecord) return;
    setIsSaving(true);
    try {
      await apiFetch(`/admin/bursary/${editRecord.regNumber}`, {
        method: "PUT",
        body: JSON.stringify({ status: editStatus, notes: editNotes }),
      });
      toast({ title: "Payment status updated" });
      setEditRecord(null);
      loadData();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to update", description: err.message });
    } finally {
      setIsSaving(false);
    }
  }

  async function createOverride() {
    if (!overrideStudentReg || !overrideReason) return;
    setIsOverriding(true);
    try {
      await apiFetch("/teacher/bursary/override", {
        method: "POST",
        body: JSON.stringify({
          studentReg: overrideStudentReg,
          reason: overrideReason,
          expiresAt: overrideExpiry || undefined,
        }),
      });
      toast({ title: "Override granted successfully" });
      setShowOverrideModal(false);
      setOverrideStudentReg("");
      setOverrideReason("");
      setOverrideExpiry("");
      loadData();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to create override", description: err.message });
    } finally {
      setIsOverriding(false);
    }
  }

  async function deleteOverride(id: number) {
    if (!confirm("Remove this override?")) return;
    try {
      await apiFetch(`/admin/bursary/overrides/${id}`, { method: "DELETE" });
      toast({ title: "Override removed" });
      loadData();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to remove override", description: err.message });
    }
  }

  const filtered = records.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.regNumber.toLowerCase().includes(search.toLowerCase()) ||
    r.class.toLowerCase().includes(search.toLowerCase())
  );

  const paidCount = records.filter(r => r.paymentStatus === "paid").length;
  const partialCount = records.filter(r => r.paymentStatus === "partial").length;
  const unpaidCount = records.filter(r => r.paymentStatus === "unpaid").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Bursary</h1>
        <p className="text-muted-foreground mt-1">Manage student payment status and exam access overrides.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-t-4 border-t-green-500">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{paidCount}</div>
            <div className="text-sm text-muted-foreground">Paid</div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-yellow-500">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{partialCount}</div>
            <div className="text-sm text-muted-foreground">Partial</div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-red-500">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{unpaidCount}</div>
            <div className="text-sm text-muted-foreground">Unpaid</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "payments" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("payments")}
        >
          <DollarSign className="h-4 w-4 inline mr-1" />
          Payments
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "overrides" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("overrides")}
        >
          <ShieldCheck className="h-4 w-4 inline mr-1" />
          Overrides ({overrides.length})
        </button>
      </div>

      {activeTab === "payments" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle>Student Payments</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 w-64"
                  placeholder="Search students..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(rec => (
                  <div key={rec.regNumber} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{rec.name}</span>
                        <Badge variant="outline" className="text-xs">{rec.class}</Badge>
                        {statusBadge(rec.paymentStatus)}
                      </div>
                      {rec.notes && <p className="text-xs text-muted-foreground">{rec.notes}</p>}
                      {rec.updatedBy && <p className="text-xs text-muted-foreground">Updated by {rec.updatedBy}</p>}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openEdit(rec)}>Edit</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "overrides" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Exam Access Overrides</CardTitle>
                <CardDescription>Grant exam access to students regardless of payment status.</CardDescription>
              </div>
              <Button onClick={() => setShowOverrideModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Override
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {overrides.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                No overrides have been granted.
              </div>
            ) : (
              <div className="space-y-2">
                {overrides.map(o => (
                  <div key={o.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{o.studentReg}</span>
                        <Badge variant="secondary" className="text-xs capitalize">{o.overriderRole}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Reason: {o.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        By {o.overriddenBy} · {new Date(o.createdAt).toLocaleDateString()}
                        {o.expiresAt && ` · Expires ${new Date(o.expiresAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteOverride(o.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {editRecord && (
        <Dialog open={!!editRecord} onOpenChange={() => setEditRecord(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Payment — {editRecord.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Payment Status</label>
                <Select value={editStatus} onValueChange={v => setEditStatus(v as any)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea className="mt-1" value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Any notes about this payment..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditRecord(null)}>Cancel</Button>
              <Button onClick={savePayment} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showOverrideModal} onOpenChange={setShowOverrideModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Exam Access Override</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Student Reg. Number</label>
              <Input className="mt-1" value={overrideStudentReg} onChange={e => setOverrideStudentReg(e.target.value)} placeholder="e.g. STU001" />
            </div>
            <div>
              <label className="text-sm font-medium">Reason</label>
              <Textarea className="mt-1" value={overrideReason} onChange={e => setOverrideReason(e.target.value)} placeholder="Reason for granting access..." />
            </div>
            <div>
              <label className="text-sm font-medium">Expiry Date (optional)</label>
              <Input type="date" className="mt-1" value={overrideExpiry} onChange={e => setOverrideExpiry(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverrideModal(false)}>Cancel</Button>
            <Button onClick={createOverride} disabled={isOverriding || !overrideStudentReg || !overrideReason}>
              {isOverriding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Grant Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
