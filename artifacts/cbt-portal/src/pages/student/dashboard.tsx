import { useAuth } from "@/lib/auth";
import { useGetStudentExams, useGetStudentResults } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Calendar, CheckCircle2, ChevronRight, Award } from "lucide-react";
import { format } from "date-fns";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data: exams, isLoading: isExamsLoading } = useGetStudentExams();
  const { data: results, isLoading: isResultsLoading } = useGetStudentResults();

  const recentResults = results?.slice(0, 3);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Welcome, {user?.name}</h1>
        <p className="text-muted-foreground mt-1">Here's your dashboard and upcoming exams.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1 border-t-4 border-t-primary shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Available Exams
            </CardTitle>
            <CardDescription>Exams currently open for your class.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isExamsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))
            ) : exams?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                No exams available at the moment.
              </div>
            ) : (
              exams?.map((exam) => (
                <div key={exam.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-card hover:bg-slate-50 transition-colors">
                  <div className="space-y-1 mb-4 sm:mb-0">
                    <h3 className="font-semibold text-lg">{exam.subject}</h3>
                    <div className="flex items-center text-sm text-muted-foreground gap-4">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {exam.durationMinutes} mins
                      </span>
                      <span>{exam.questionCount} Questions</span>
                    </div>
                  </div>
                  <Link href={`/student/exam/${exam.id}`}>
                    <Button>
                      Start Exam
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 border-t-4 border-t-accent shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-accent" />
              Recent Results
            </CardTitle>
            <CardDescription>Your latest exam performances.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isResultsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))
            ) : !recentResults?.length ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                No recent results.
              </div>
            ) : (
              recentResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between p-3 border-b last:border-0">
                  <div className="space-y-1">
                    <p className="font-medium">{result.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(result.submittedAt), "PPP")}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg flex items-center gap-1 justify-end">
                      {result.score}/{result.total}
                    </div>
                    <div className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 inline-block">
                      Grade: {result.grade}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
          <CardFooter>
            <Link href="/student/results" className="w-full">
              <Button variant="outline" className="w-full">View All Results</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
