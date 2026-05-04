import { useAuth } from "@/lib/auth";
import { useGetStudentExams, useGetStudentResults } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Calendar, CheckCircle2, ChevronRight, Award, Lock, AlertTriangle, CreditCard } from "lucide-react";
import { format } from "date-fns";

function getExamStatus(exam: { startTime?: string | null; endTime?: string | null }) {
  const now = new Date();
  if (exam.startTime && new Date(exam.startTime) > now) return "upcoming";
  if (exam.endTime && new Date(exam.endTime) < now) return "expired";
  return "live";
}

function ExamStatusBadge({ status }: { status: string }) {
  if (status === "upcoming") return <Badge variant="outline" className="text-yellow-600 border-yellow-400 bg-yellow-50">Upcoming</Badge>;
  if (status === "expired") return <Badge variant="outline" className="text-gray-500 border-gray-300 bg-gray-50">Expired</Badge>;
  return <Badge variant="outline" className="text-green-600 border-green-400 bg-green-50">Live</Badge>;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: exams, isLoading: isExamsLoading } = useGetStudentExams();
  const { data: results, isLoading: isResultsLoading } = useGetStudentResults();

  const recentResults = results?.slice(0, 3);

  function handleExamClick(exam: NonNullable<typeof exams>[number]) {
    const status = getExamStatus(exam);
    if (status === "upcoming") return;
    if (status === "expired") return;
    if ((exam as any).paymentBlocked) return;

    if (exam.alreadySubmitted) {
      setLocation("/student/results");
      return;
    }
    setLocation(`/student/exam/${exam.id}`);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Welcome, {user?.name}</h1>
        <p className="text-muted-foreground mt-1">
          Here's your dashboard and available exams.
          {user?.studentRole && user.studentRole !== "Student" && (
            <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {user.studentRole}
            </span>
          )}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1 border-t-4 border-t-primary shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Available Exams
            </CardTitle>
            <CardDescription>Exams available for your class.</CardDescription>
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
              exams?.map((exam) => {
                const status = getExamStatus(exam);
                const isTimeLocked = status === "upcoming" || status === "expired";
                const isPaymentBlocked = !!(exam as any).paymentBlocked;
                const isBlocked = isTimeLocked || isPaymentBlocked;
                const isAttempted = exam.alreadySubmitted;

                return (
                  <div key={exam.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg transition-colors ${isBlocked ? "bg-gray-50 opacity-80" : "bg-card hover:bg-slate-50"}`}>
                    <div className="space-y-1 mb-4 sm:mb-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{exam.subject}</h3>
                        <ExamStatusBadge status={status} />
                        {isPaymentBlocked && (
                          <Badge variant="outline" className="text-red-600 border-red-400 bg-red-50">
                            <CreditCard className="h-3 w-3 mr-1" />
                            Fees Outstanding
                          </Badge>
                        )}
                        {isAttempted && (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-100">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Attempted
                          </Badge>
                        )}
                        {!isAttempted && !isBlocked && (
                          <Badge variant="outline" className="text-primary border-primary/40 bg-primary/5">New</Badge>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground gap-4 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {exam.durationMinutes} mins
                        </span>
                        <span>{exam.questionCount} Questions</span>
                        {exam.startTime && status === "upcoming" && (
                          <span className="flex items-center gap-1 text-yellow-600">
                            <AlertTriangle className="h-3 w-3" />
                            Starts {format(new Date(exam.startTime), "MMM d, h:mm a")}
                          </span>
                        )}
                        {exam.endTime && status === "expired" && (
                          <span className="text-gray-500">
                            Ended {format(new Date(exam.endTime), "MMM d, h:mm a")}
                          </span>
                        )}
                      </div>
                    </div>

                    {isPaymentBlocked && !isAttempted ? (
                      <Button variant="outline" disabled className="opacity-60 border-red-300 text-red-600">
                        <Lock className="mr-2 h-4 w-4" />
                        Access Restricted
                      </Button>
                    ) : isTimeLocked ? (
                      <Button variant="outline" disabled className="opacity-60">
                        <Lock className="mr-2 h-4 w-4" />
                        {status === "upcoming" ? "Not Started" : "Expired"}
                      </Button>
                    ) : isAttempted ? (
                      <Button
                        variant="outline"
                        onClick={() => setLocation("/student/results")}
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        {exam.resultsEnabled ? "View Result" : "Result Pending"}
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button onClick={() => handleExamClick(exam)}>
                        Start Exam
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })
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
                    {result.resultsReleased ? (
                      <>
                        <div className="font-bold text-lg">{result.score}/{result.total}</div>
                        <div className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 inline-block">
                          Grade: {result.grade}
                        </div>
                      </>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Pending</Badge>
                    )}
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
