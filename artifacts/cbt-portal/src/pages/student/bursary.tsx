import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, CheckCircle2, AlertCircle, Clock, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = "/api";
function apiFetch(path: string) {
  const token = localStorage.getItem("cbt_token");
  return fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(async r => {
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Request failed");
    return r.json();
  });
}

type FeeStatus = "paid" | "unpaid" | "partial" | "waived";

interface FeeItem {
  id: number;
  feeName: string;
  description: string | null;
  isMandatory: boolean;
  academicYear: string;
  amountDue: number;
  amountPaid: number;
  balance: number;
  status: FeeStatus;
  dueDate: string | null;
  notes: string | null;
  updatedAt: string;
}

interface BursaryData {
  fees: FeeItem[];
  totalDue: number;
  totalPaid: number;
  balance: number;
  legacyStatus: string | null;
}

function fmt(n: number) {
  return `₦${n.toLocaleString()}`;
}

function statusBadge(status: FeeStatus) {
  const map: Record<FeeStatus, { label: string; class: string }> = {
    paid: { label: "Paid", class: "bg-green-100 text-green-700 border-green-300" },
    partial: { label: "Partial", class: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    unpaid: { label: "Unpaid", class: "bg-red-100 text-red-700 border-red-300" },
    waived: { label: "Waived", class: "bg-slate-100 text-slate-600 border-slate-300" },
  };
  const s = map[status] ?? map.unpaid;
  return <Badge variant="outline" className={s.class}>{s.label}</Badge>;
}

export default function StudentBursary() {
  const { toast } = useToast();
  const [data, setData] = useState<BursaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch("/student/bursary")
      .then(setData)
      .catch(err => toast({ variant: "destructive", title: "Failed to load fees", description: err.message }))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const fees = data?.fees ?? [];
  const allClear = data ? data.balance <= 0 && fees.length > 0 : false;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">My Fees</h1>
        <p className="text-muted-foreground mt-1">View your school fee obligations and payment status.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-t-4 border-t-primary">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide mb-1">
              <DollarSign className="h-3.5 w-3.5" /> Total Due
            </div>
            <div className="text-2xl font-bold text-primary">{fmt(data?.totalDue ?? 0)}</div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide mb-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Total Paid
            </div>
            <div className="text-2xl font-bold text-green-600">{fmt(data?.totalPaid ?? 0)}</div>
          </CardContent>
        </Card>
        <Card className={`border-t-4 ${(data?.balance ?? 0) > 0 ? "border-t-red-500" : "border-t-green-500"}`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide mb-1">
              <CreditCard className="h-3.5 w-3.5" /> Outstanding Balance
            </div>
            <div className={`text-2xl font-bold ${(data?.balance ?? 0) > 0 ? "text-red-600" : "text-green-600"}`}>
              {fmt(data?.balance ?? 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status banner */}
      {allClear ? (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">All fees cleared</p>
            <p className="text-sm">You have no outstanding balance. You have full access to all exams.</p>
          </div>
        </div>
      ) : (data?.balance ?? 0) > 0 ? (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Outstanding balance: {fmt(data?.balance ?? 0)}</p>
            <p className="text-sm">Please visit the bursary office to make payment and unlock exam access.</p>
          </div>
        </div>
      ) : null}

      {/* Fee list */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Breakdown</CardTitle>
          <CardDescription>All fees assigned to your account for this academic session.</CardDescription>
        </CardHeader>
        <CardContent>
          {fees.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No fees have been assigned to your account yet.</p>
              <p className="text-xs mt-1">Check back later or contact the bursary office.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fees.map(fee => (
                <div key={fee.id} className="p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{fee.feeName}</span>
                        {statusBadge(fee.status)}
                        {!fee.isMandatory && (
                          <Badge variant="outline" className="text-xs text-slate-500 border-slate-300">Optional</Badge>
                        )}
                        {fee.academicYear && (
                          <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">{fee.academicYear}</Badge>
                        )}
                      </div>
                      {fee.description && <p className="text-sm text-muted-foreground">{fee.description}</p>}
                      {fee.dueDate && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Due: {fee.dueDate}
                        </p>
                      )}
                      {fee.notes && <p className="text-xs text-muted-foreground italic">{fee.notes}</p>}
                    </div>
                    <div className="text-right flex-shrink-0 space-y-0.5 min-w-[120px]">
                      <div className="text-sm text-muted-foreground">Due: <span className="font-medium text-foreground">{fmt(fee.amountDue)}</span></div>
                      <div className="text-sm text-muted-foreground">Paid: <span className="font-medium text-green-600">{fmt(fee.amountPaid)}</span></div>
                      {fee.balance > 0 && (
                        <div className="text-sm font-semibold text-red-600">Balance: {fmt(fee.balance)}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        For payment issues or corrections, please visit the school bursary office or contact an administrator.
      </p>
    </div>
  );
}
