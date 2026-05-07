import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DollarSign, Search, ShieldCheck, Trash2, Plus, ChevronDown, ChevronUp, Receipt, BookOpen, X } from "lucide-react";
import { CLASS_SECTIONS } from "@/lib/class-sections";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

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

function fmt(n: number) { return `₦${n.toLocaleString()}`; }

type PaymentStatus = "paid" | "unpaid" | "partial";
type FeeRecordStatus = "paid" | "unpaid" | "partial" | "waived";

interface BursaryRecord {
  regNumber: string;
  name: string;
  class: string;
  paymentStatus: PaymentStatus;
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

interface FeeType {
  id: number;
  name: string;
  description: string | null;
  amount: number;
  isMandatory: boolean;
  academicYear: string;
  targetClass: string | null;
  createdBy: string;
  createdAt: string;
}

interface StudentFeeRecord {
  id: number;
  feeTypeId: number;
  feeName: string;
  amountDue: number;
  amountPaid: number;
  status: FeeRecordStatus;
  dueDate: string | null;
  notes: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

interface StudentFeeRow {
  regNumber: string;
  name: string;
  class: string;
  totalDue: number;
  totalPaid: number;
  balance: number;
  fees: StudentFeeRecord[];
}

function statusBadge(status: string) {
  if (status === "paid") return <Badge className="bg-green-100 text-green-700 border-green-300 hover:bg-green-100">Paid</Badge>;
  if (status === "partial") return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-100">Partial</Badge>;
  if (status === "waived") return <Badge className="bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-100">Waived</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-300 hover:bg-red-100">Unpaid</Badge>;
}

type Tab = "payments" | "fees" | "student-fees" | "overrides";

export default function BursaryPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("payments");

  // ── Payments (legacy) ──
  const [records, setRecords] = useState<BursaryRecord[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [studentFees, setStudentFees] = useState<StudentFeeRow[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [editRecord, setEditRecord] = useState<BursaryRecord | null>(null);
  const [editStatus, setEditStatus] = useState<PaymentStatus>("unpaid");
  const [editNotes, setEditNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // ── Fee types ──
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [editFee, setEditFee] = useState<FeeType | null>(null);
  const [feeForm, setFeeForm] = useState({ name: "", description: "", amount: 0, isMandatory: true, academicYear: "", targetClass: "" });
  const [isSavingFee, setIsSavingFee] = useState(false);
  const [applyingFeeId, setApplyingFeeId] = useState<number | null>(null);

  // ── Student fee record edit ──
  const [editFeeRecord, setEditFeeRecord] = useState<{ record: StudentFeeRecord; studentName: string } | null>(null);
  const [feeRecordForm, setFeeRecordForm] = useState({ amountPaid: 0, status: "unpaid" as FeeRecordStatus, notes: "", dueDate: "" });
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  // ── Override modal ──
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideStudentReg, setOverrideStudentReg] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideExpiry, setOverrideExpiry] = useState("");
  const [isOverriding, setIsOverriding] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [bursary, ovr, fees, sf] = await Promise.all([
        apiFetch("/admin/bursary"),
        apiFetch("/admin/bursary/overrides"),
        apiFetch("/admin/bursary/fees"),
        apiFetch("/admin/bursary/student-fees"),
      ]);
      setRecords(bursary);
      setOverrides(ovr);
      setFeeTypes(fees);
      setStudentFees(sf);
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
        body: JSON.stringify({ studentReg: overrideStudentReg, reason: overrideReason, expiresAt: overrideExpiry || undefined }),
      });
      toast({ title: "Override granted successfully" });
      setShowOverrideModal(false);
      setOverrideStudentReg(""); setOverrideReason(""); setOverrideExpiry("");
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

  function openFeeModal(fee?: FeeType) {
    if (fee) {
      setEditFee(fee);
      setFeeForm({ name: fee.name, description: fee.description ?? "", amount: fee.amount, isMandatory: fee.isMandatory, academicYear: fee.academicYear, targetClass: fee.targetClass ?? "" });
    } else {
      setEditFee(null);
      setFeeForm({ name: "", description: "", amount: 0, isMandatory: true, academicYear: "", targetClass: "" });
    }
    setShowFeeModal(true);
  }

  async function saveFeeType() {
    if (!feeForm.name) return;
    setIsSavingFee(true);
    try {
      const payload = { ...feeForm, targetClass: feeForm.targetClass || null };
      if (editFee) {
        await apiFetch(`/admin/bursary/fees/${editFee.id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast({ title: "Fee type updated" });
      } else {
        await apiFetch("/admin/bursary/fees", { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Fee type created" });
      }
      setShowFeeModal(false);
      loadData();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    } finally {
      setIsSavingFee(false);
    }
  }

  async function deleteFeeType(id: number) {
    if (!confirm("Delete this fee type? This will also remove all associated student records.")) return;
    try {
      await apiFetch(`/admin/bursary/fees/${id}`, { method: "DELETE" });
      toast({ title: "Fee type deleted" });
      loadData();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    }
  }

  async function applyFeeToAll(id: number, name: string) {
    if (!confirm(`Apply "${name}" to all students? Students already assigned this fee will not be duplicated.`)) return;
    setApplyingFeeId(id);
    try {
      const result = await apiFetch(`/admin/bursary/fees/${id}/apply`, { method: "POST" });
      toast({ title: "Fee applied", description: `Applied to ${result.applied} new students. ${result.alreadyExisted} already had this fee.` });
      loadData();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    } finally {
      setApplyingFeeId(null);
    }
  }

  function openFeeRecordEdit(record: StudentFeeRecord, studentName: string) {
    setEditFeeRecord({ record, studentName });
    setFeeRecordForm({ amountPaid: record.amountPaid, status: record.status, notes: record.notes ?? "", dueDate: record.dueDate ?? "" });
  }

  async function saveFeeRecord() {
    if (!editFeeRecord) return;
    setIsSavingRecord(true);
    try {
      await apiFetch(`/admin/bursary/student-fees/${editFeeRecord.record.id}`, {
        method: "PUT",
        body: JSON.stringify(feeRecordForm),
      });
      toast({ title: "Fee record updated" });
      setEditFeeRecord(null);
      loadData();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    } finally {
      setIsSavingRecord(false);
    }
  }

  const filtered = records.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.regNumber.toLowerCase().includes(search.toLowerCase()) ||
    r.class.toLowerCase().includes(search.toLowerCase())
  );
  const filteredStudentFees = studentFees.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.regNumber.toLowerCase().includes(search.toLowerCase())
  );

  const paidCount = records.filter(r => r.paymentStatus === "paid").length;
  const partialCount = records.filter(r => r.paymentStatus === "partial").length;
  const unpaidCount = records.filter(r => r.paymentStatus === "unpaid").length;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "payments", label: "Payment Status", icon: <DollarSign className="h-4 w-4 inline mr-1" /> },
    { id: "fees", label: "Fee Structure", icon: <BookOpen className="h-4 w-4 inline mr-1" /> },
    { id: "student-fees", label: "Student Fees", icon: <Receipt className="h-4 w-4 inline mr-1" /> },
    { id: "overrides", label: `Overrides (${overrides.length})`, icon: <ShieldCheck className="h-4 w-4 inline mr-1" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Bursary</h1>
        <p className="text-muted-foreground mt-1">Manage school fees, student payments and exam access overrides.</p>
      </div>

      {/* Stats */}
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

      {/* Tabs */}
      <div className="flex gap-0 border-b overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Payment Status tab ── */}
      {activeTab === "payments" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle>Student Payment Status</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 w-64" placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
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

      {/* ── Fee Structure tab ── */}
      {activeTab === "fees" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Fee Structure</CardTitle>
                <CardDescription>Create and manage the school fee categories for each academic year.</CardDescription>
              </div>
              <Button onClick={() => openFeeModal()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Fee
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : feeTypes.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>No fee types created yet.</p>
                <p className="text-sm mt-1">Click "Add Fee" to create your first fee category.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {feeTypes.map(fee => (
                  <div key={fee.id} className="p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{fee.name}</span>
                          <span className="font-bold text-primary">{fmt(fee.amount)}</span>
                          {fee.isMandatory ? (
                            <Badge className="bg-red-100 text-red-700 border-red-300 hover:bg-red-100 text-xs">Mandatory</Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-500 text-xs">Optional</Badge>
                          )}
                          {fee.academicYear && <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">{fee.academicYear}</Badge>}
                          {fee.targetClass && <Badge variant="outline" className="text-purple-600 border-purple-300 text-xs">{fee.targetClass}</Badge>}
                        </div>
                        {fee.description && <p className="text-sm text-muted-foreground">{fee.description}</p>}
                        <p className="text-xs text-muted-foreground">Created by {fee.createdBy}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 hover:text-blue-700"
                          onClick={() => applyFeeToAll(fee.id, fee.name)}
                          disabled={applyingFeeId === fee.id}
                        >
                          {applyingFeeId === fee.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                          Apply to All
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openFeeModal(fee)}>Edit</Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteFeeType(fee.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Student Fees tab ── */}
      {activeTab === "student-fees" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle>Student Fee Records</CardTitle>
                <CardDescription>Per-student breakdown of all assigned fees and payment progress.</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 w-64" placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : filteredStudentFees.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg">
                No student fee records found. Create fee types and apply them to students first.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredStudentFees.map(s => (
                  <div key={s.regNumber} className="border rounded-lg overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors text-left"
                      onClick={() => setExpandedStudent(expandedStudent === s.regNumber ? null : s.regNumber)}
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-medium">{s.name}</span>
                        <Badge variant="outline" className="text-xs">{s.class}</Badge>
                        <span className="text-sm text-muted-foreground">Due: <span className="text-foreground font-medium">{fmt(s.totalDue)}</span></span>
                        <span className="text-sm text-muted-foreground">Paid: <span className="text-green-600 font-medium">{fmt(s.totalPaid)}</span></span>
                        {s.balance > 0 ? (
                          <span className="text-sm font-semibold text-red-600">Balance: {fmt(s.balance)}</span>
                        ) : s.totalDue > 0 ? (
                          <Badge className="bg-green-100 text-green-700 border-green-300 hover:bg-green-100 text-xs">Cleared</Badge>
                        ) : null}
                      </div>
                      {expandedStudent === s.regNumber ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                    </button>
                    {expandedStudent === s.regNumber && s.fees.length > 0 && (
                      <div className="border-t bg-slate-50 divide-y">
                        {s.fees.map(fee => (
                          <div key={fee.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-white transition-colors">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{fee.feeName}</span>
                                {statusBadge(fee.status)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Due: {fmt(fee.amountDue)} · Paid: {fmt(fee.amountPaid)}
                                {(fee.amountDue - fee.amountPaid) > 0 && ` · Balance: ${fmt(fee.amountDue - fee.amountPaid)}`}
                              </div>
                              {fee.notes && <p className="text-xs text-muted-foreground italic">{fee.notes}</p>}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <Button size="sm" variant="outline" onClick={() => openFeeRecordEdit(fee, s.name)}>
                                Record Payment
                              </Button>
                              {!feeTypes.find(ft => ft.id === fee.feeTypeId)?.isMandatory && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  title="Remove optional fee from this student"
                                  onClick={async () => {
                                    if (!confirm(`Remove "${fee.feeName}" from ${s.name}?`)) return;
                                    try {
                                      await apiFetch(`/admin/bursary/student-fees/${fee.id}`, { method: "DELETE" });
                                      toast({ title: "Fee removed" });
                                      loadData();
                                    } catch (err: any) {
                                      toast({ variant: "destructive", title: "Failed", description: err.message });
                                    }
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Overrides tab ── */}
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
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">No overrides have been granted.</div>
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

      {/* ── Edit payment dialog ── */}
      {editRecord && (
        <Dialog open={!!editRecord} onOpenChange={() => setEditRecord(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Update Payment — {editRecord.name}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Payment Status</Label>
                <Select value={editStatus} onValueChange={v => setEditStatus(v as PaymentStatus)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Textarea className="mt-1" value={editNotes} onChange={e => setEditNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditRecord(null)}>Cancel</Button>
              <Button onClick={savePayment} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Fee type modal ── */}
      <Dialog open={showFeeModal} onOpenChange={setShowFeeModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editFee ? "Edit Fee Type" : "Create Fee Type"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fee Name *</Label>
              <Input className="mt-1" value={feeForm.name} onChange={e => setFeeForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. School Fees, Development Levy…" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea className="mt-1" value={feeForm.description} onChange={e => setFeeForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of this fee…" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount (₦) *</Label>
                <Input className="mt-1" type="number" min={0} value={feeForm.amount} onChange={e => setFeeForm(f => ({ ...f, amount: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label>Academic Year</Label>
                <Input className="mt-1" value={feeForm.academicYear} onChange={e => setFeeForm(f => ({ ...f, academicYear: e.target.value }))} placeholder="e.g. 2024/2025" />
              </div>
            </div>
            <div>
              <Label>Target Class <span className="text-muted-foreground font-normal">(optional — leave blank to apply to all classes)</span></Label>
              <Select value={feeForm.targetClass || "__all__"} onValueChange={v => setFeeForm(f => ({ ...f, targetClass: v === "__all__" ? "" : v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All classes</SelectItem>
                  {CLASS_SECTIONS.map(cls => (
                    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox id="mandatory" checked={feeForm.isMandatory} onCheckedChange={v => setFeeForm(f => ({ ...f, isMandatory: !!v }))} />
              <div>
                <label htmlFor="mandatory" className="text-sm font-medium cursor-pointer">Mandatory fee</label>
                <p className="text-xs text-muted-foreground">Mandatory fees block exam access if unpaid</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeeModal(false)}>Cancel</Button>
            <Button onClick={saveFeeType} disabled={isSavingFee || !feeForm.name}>
              {isSavingFee && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editFee ? "Save Changes" : "Create Fee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Fee record edit dialog ── */}
      {editFeeRecord && (
        <Dialog open={!!editFeeRecord} onOpenChange={() => setEditFeeRecord(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment — {editFeeRecord.studentName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-md text-sm">
                <span className="font-medium">{editFeeRecord.record.feeName}</span>
                <span className="text-muted-foreground ml-2">Amount due: {fmt(editFeeRecord.record.amountDue)}</span>
              </div>
              <div>
                <Label>Amount Paid (₦)</Label>
                <Input className="mt-1" type="number" min={0} max={editFeeRecord.record.amountDue} value={feeRecordForm.amountPaid}
                  onChange={e => setFeeRecordForm(f => ({ ...f, amountPaid: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={feeRecordForm.status} onValueChange={v => setFeeRecordForm(f => ({ ...f, status: v as FeeRecordStatus }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid in full</SelectItem>
                    <SelectItem value="partial">Partial payment</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="waived">Waived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due Date (optional)</Label>
                <Input type="date" className="mt-1" value={feeRecordForm.dueDate} onChange={e => setFeeRecordForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Textarea className="mt-1" value={feeRecordForm.notes} onChange={e => setFeeRecordForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. paid via POS, receipt no. 12345" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditFeeRecord(null)}>Cancel</Button>
              <Button onClick={saveFeeRecord} disabled={isSavingRecord}>
                {isSavingRecord && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Override modal ── */}
      <Dialog open={showOverrideModal} onOpenChange={setShowOverrideModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Grant Exam Access Override</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Student Reg. Number</Label>
              <Input className="mt-1" value={overrideStudentReg} onChange={e => setOverrideStudentReg(e.target.value)} placeholder="e.g. STU001" />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea className="mt-1" value={overrideReason} onChange={e => setOverrideReason(e.target.value)} placeholder="Reason for granting access…" />
            </div>
            <div>
              <Label>Expiry Date (optional)</Label>
              <Input type="date" className="mt-1" value={overrideExpiry} onChange={e => setOverrideExpiry(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverrideModal(false)}>Cancel</Button>
            <Button onClick={createOverride} disabled={isOverriding || !overrideStudentReg || !overrideReason}>
              {isOverriding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Grant Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
