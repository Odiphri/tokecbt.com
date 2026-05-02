import { useGetTeacherExams } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Users, Eye, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function TeacherExams() {
  const { user } = useAuth();
  const { data: exams, isLoading } = useGetTeacherExams();

  const canViewAll = user?.role === "admin" || !!user?.permissions?.view_all_exams;
  const canManageExams = user?.role === "admin" || !!user?.permissions?.manage_exams;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            {canViewAll ? "All School Exams" : "My Exams"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {canViewAll
              ? "Viewing all exams across all staff members."
              : "Create and manage your computer based tests."}
          </p>
        </div>
        {canManageExams && (
          <Link href="/teacher/exams/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Exam
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{canViewAll ? "All Exams" : "My Exams"}</CardTitle>
          <CardDescription>
            {canViewAll
              ? "All exams created by any staff member."
              : "A list of all exams you have created."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !exams || exams.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {canManageExams
                ? 'No exams yet. Click "Create Exam" to get started.'
                : "No exams are available yet."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Class</TableHead>
                  {canViewAll && <TableHead>Created By</TableHead>}
                  <TableHead>Questions</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Avg Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">{exam.subject}</TableCell>
                    <TableCell>{exam.class}</TableCell>
                    {canViewAll && (
                      <TableCell className="font-mono text-xs text-muted-foreground">{exam.createdBy}</TableCell>
                    )}
                    <TableCell>{exam.questionCount}</TableCell>
                    <TableCell>{exam.attemptCount}</TableCell>
                    <TableCell>
                      {exam.averageScore != null ? `${exam.averageScore.toFixed(1)}%` : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/teacher/exams/${exam.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Questions
                          </Button>
                        </Link>
                        <Link href={`/teacher/exams/${exam.id}/results`}>
                          <Button variant="ghost" size="sm">
                            <Users className="h-4 w-4 mr-2" />
                            Results
                          </Button>
                        </Link>
                        {(canManageExams || canViewAll) && (
                          <Link href={`/teacher/exams/${exam.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4 mr-2" />
                              Settings
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
