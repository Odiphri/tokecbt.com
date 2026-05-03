import { useState } from "react";
import { useGetClassStudents, usePromoteStudent, useDemoteStudent, getGetClassStudentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
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
import { ArrowLeft, ArrowUp, ArrowDown, Search, School, ShieldOff } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function TeacherClass() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const assignedClass = (user as any)?.assignedClass;

  if (!assignedClass) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <ShieldOff className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">No Class Assigned</h2>
        <p className="text-muted-foreground max-w-xs">
          You have not been assigned as a class teacher. Contact your administrator.
        </p>
        <Button variant="outline" onClick={() => setLocation("/teacher/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return <ClassContent assignedClass={assignedClass} />;
}

function ClassContent({ assignedClass }: { assignedClass: string }) {
  const { data: students, isLoading } = useGetClassStudents();
  const promoteMutation = usePromoteStudent();
  const demoteMutation = useDemoteStudent();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [promoteTarget, setPromoteTarget] = useState<{ regNumber: string; name: string; class: string } | null>(null);
  const [demoteTarget, setDemoteTarget] = useState<{ regNumber: string; name: string; class: string } | null>(null);

  const filtered = (students ?? []).filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.regNumber.toLowerCase().includes(search.toLowerCase())
  );

  function handlePromote() {
    if (!promoteTarget) return;
    promoteMutation.mutate(
      { regNumber: promoteTarget.regNumber },
      {
        onSuccess: (data) => {
          toast({ title: "Student promoted", description: `${promoteTarget.name} moved to ${data.class}` });
          qc.invalidateQueries({ queryKey: getGetClassStudentsQueryKey() });
          setPromoteTarget(null);
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Failed to promote student", description: err.data?.error || "Please try again." });
          setPromoteTarget(null);
        },
      }
    );
  }

  function handleDemote() {
    if (!demoteTarget) return;
    demoteMutation.mutate(
      { regNumber: demoteTarget.regNumber },
      {
        onSuccess: (data) => {
          toast({ title: "Student demoted", description: `${demoteTarget.name} moved to ${data.class}` });
          qc.invalidateQueries({ queryKey: getGetClassStudentsQueryKey() });
          setDemoteTarget(null);
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Failed to demote student", description: err.data?.error || "Please try again." });
          setDemoteTarget(null);
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/teacher/dashboard">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <School className="h-7 w-7" />
            My Class — {assignedClass}
          </h1>
          <p className="text-muted-foreground mt-1">
            Students in your assigned class. You can promote or demote students to adjust their class level.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by name or reg. number..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <span className="text-sm text-muted-foreground ml-auto">
              {filtered.length} student{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12 text-muted-foreground">Loading students...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {search ? "No students match your search." : `No students in ${assignedClass} yet.`}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(student => {
                const initials = student.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <div key={student.regNumber} className="flex items-center gap-4 py-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={student.profilePicture ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{student.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground font-mono">{student.regNumber}</span>
                        {student.studentRole && student.studentRole !== "Student" && (
                          <Badge variant="secondary" className="text-xs h-4 px-1.5">{student.studentRole}</Badge>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">{student.class}</Badge>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1 text-green-700 border-green-200 hover:bg-green-50"
                        onClick={() => setPromoteTarget({ regNumber: student.regNumber, name: student.name, class: student.class })}
                      >
                        <ArrowUp className="h-3 w-3" />
                        Promote
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1 text-amber-700 border-amber-200 hover:bg-amber-50"
                        onClick={() => setDemoteTarget({ regNumber: student.regNumber, name: student.name, class: student.class })}
                      >
                        <ArrowDown className="h-3 w-3" />
                        Demote
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!promoteTarget} onOpenChange={v => { if (!v) setPromoteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote Student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move <strong>{promoteTarget?.name}</strong> from <strong>{promoteTarget?.class}</strong> to the next class level.
              This change takes effect immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePromote} disabled={promoteMutation.isPending}>
              Promote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!demoteTarget} onOpenChange={v => { if (!v) setDemoteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Demote Student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move <strong>{demoteTarget?.name}</strong> from <strong>{demoteTarget?.class}</strong> to the previous class level.
              This change takes effect immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDemote}
              disabled={demoteMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Demote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
