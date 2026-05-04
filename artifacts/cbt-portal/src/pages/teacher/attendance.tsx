import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Clock, Users, CalendarDays } from "lucide-react";
import { CLASS_SECTIONS } from "@/lib/class-sections";
import { format } from "date-fns";

interface StudentRecord {
  regNumber: string;
  name: string;
  class: string;
  status: "present" | "absent" | "late";
}

interface ExistingRecord {
  studentReg: string;
  status: "present" | "absent" | "late";
  date: string;
}

const API_BASE = "/api";

async function getToken() {
  return localStorage.getItem("cbt_token");
}

async function apiFetch(path: string, options?: RequestInit) {
  const token = await getToken();
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

export default function AttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedClass, setSelectedClass] = useState<string>(
    user?.role === "staff" && (user as any).assignedClass ? (user as any).assignedClass : ""
  );
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  const assignedClass = (user as any)?.assignedClass ?? null;
  const canViewAllClasses = user?.role === "admin" || !!user?.permissions?.manage_students || !!user?.permissions?.view_all_results;

  useEffect(() => {
    if (selectedClass) loadStudents();
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && students.length > 0) loadExisting();
  }, [selectedDate, selectedClass]);

  async function loadStudents() {
    setIsLoadingStudents(true);
    try {
      const data = await apiFetch("/teacher/attendance/classes");
      const classStudents = (canViewAllClasses ? data.students : data.students.filter((s: any) => s.class === selectedClass))
        .filter((s: any) => s.class === selectedClass);
      setStudents(classStudents.map((s: any) => ({ regNumber: s.regNumber, name: s.name, class: s.class, status: "present" as const })));
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to load students", description: err.message });
    } finally {
      setIsLoadingStudents(false);
    }
  }

  async function loadExisting() {
    if (!selectedClass || !selectedDate) return;
    setIsLoading(true);
    try {
      const records: ExistingRecord[] = await apiFetch(`/teacher/attendance?class=${encodeURIComponent(selectedClass)}&date=${selectedDate}`);
      if (records.length > 0) {
        setStudents(prev => prev.map(s => {
          const existing = records.find(r => r.studentReg === s.regNumber);
          return existing ? { ...s, status: existing.status } : s;
        }));
      } else {
        setStudents(prev => prev.map(s => ({ ...s, status: "present" })));
      }
    } catch {
      /* ignore */
    } finally {
      setIsLoading(false);
    }
  }

  function setStatus(regNumber: string, status: "present" | "absent" | "late") {
    setStudents(prev => prev.map(s => s.regNumber === regNumber ? { ...s, status } : s));
  }

  function markAll(status: "present" | "absent") {
    setStudents(prev => prev.map(s => ({ ...s, status })));
  }

  async function saveAttendance() {
    if (!selectedClass || !selectedDate || students.length === 0) return;
    setIsSaving(true);
    try {
      await apiFetch("/teacher/attendance", {
        method: "POST",
        body: JSON.stringify({
          class: selectedClass,
          date: selectedDate,
          records: students.map(s => ({ studentReg: s.regNumber, studentName: s.name, status: s.status })),
        }),
      });
      toast({ title: "Attendance saved successfully" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to save attendance", description: err.message });
    } finally {
      setIsSaving(false);
    }
  }

  const presentCount = students.filter(s => s.status === "present").length;
  const absentCount = students.filter(s => s.status === "absent").length;
  const lateCount = students.filter(s => s.status === "late").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Attendance</h1>
        <p className="text-muted-foreground mt-1">Mark and view student attendance records.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Select Class & Date</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {canViewAllClasses ? (
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {CLASS_SECTIONS.map(cls => (
                    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Class:</span>
                <Badge variant="secondary">{assignedClass ?? "None assigned"}</Badge>
              </div>
            )}
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
              max={format(new Date(), "yyyy-MM-dd")}
            />
          </div>
        </CardContent>
      </Card>

      {selectedClass && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {selectedClass} — {format(new Date(selectedDate + "T12:00:00"), "MMMM d, yyyy")}
                </CardTitle>
                <CardDescription>
                  {students.length} students
                  {students.length > 0 && (
                    <span className="ml-2">
                      · <span className="text-green-600">{presentCount} Present</span>
                      · <span className="text-red-600">{absentCount} Absent</span>
                      {lateCount > 0 && <span className="text-yellow-600"> · {lateCount} Late</span>}
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => markAll("present")} className="text-green-600 border-green-300">Mark All Present</Button>
                <Button variant="outline" size="sm" onClick={() => markAll("absent")} className="text-red-600 border-red-300">Mark All Absent</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingStudents || isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                No students found in {selectedClass}.
              </div>
            ) : (
              <div className="space-y-2">
                {students.map((s, i) => (
                  <div key={s.regNumber} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    s.status === "present" ? "bg-green-50 border-green-200" :
                    s.status === "absent" ? "bg-red-50 border-red-200" :
                    "bg-yellow-50 border-yellow-200"
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-6">{i + 1}.</span>
                      <span className="font-medium">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={s.status === "present" ? "default" : "outline"}
                        className={s.status === "present" ? "bg-green-600 hover:bg-green-700" : "text-green-600 border-green-300"}
                        onClick={() => setStatus(s.regNumber, "present")}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Present
                      </Button>
                      <Button
                        size="sm"
                        variant={s.status === "late" ? "default" : "outline"}
                        className={s.status === "late" ? "bg-yellow-500 hover:bg-yellow-600" : "text-yellow-600 border-yellow-300"}
                        onClick={() => setStatus(s.regNumber, "late")}
                      >
                        <Clock className="h-4 w-4 mr-1" />
                        Late
                      </Button>
                      <Button
                        size="sm"
                        variant={s.status === "absent" ? "default" : "outline"}
                        className={s.status === "absent" ? "bg-red-600 hover:bg-red-700" : "text-red-600 border-red-300"}
                        onClick={() => setStatus(s.regNumber, "absent")}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Absent
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {students.length > 0 && (
              <div className="mt-4 flex justify-end">
                <Button onClick={saveAttendance} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Attendance
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
