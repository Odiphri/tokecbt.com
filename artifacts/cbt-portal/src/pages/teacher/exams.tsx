import { useGetTeacherExams } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Users, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function TeacherExams() {
  const { data: exams, isLoading } = useGetTeacherExams();

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Manage Exams</h1>
          <p className="text-muted-foreground mt-1">Create and manage your computer based tests.</p>
        </div>
        <Link href="/teacher/exams/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Exam
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Exams</CardTitle>
          <CardDescription>A list of all exams you have created.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : exams?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              You haven't created any exams yet. Click "Create Exam" to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Avg Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams?.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">{exam.subject}</TableCell>
                    <TableCell>{exam.class}</TableCell>
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
                        <Link href={`/teacher/exams/${exam.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4 mr-2" />
                            Settings
                          </Button>
                        </Link>
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
