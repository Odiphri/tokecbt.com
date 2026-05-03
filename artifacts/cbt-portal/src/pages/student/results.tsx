import { useGetStudentResults } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Clock, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function StudentResults() {
  const { data: results, isLoading } = useGetStudentResults();

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/student/dashboard">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">My Results</h1>
          <p className="text-muted-foreground mt-1">Review your past examination performances.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Results</CardTitle>
          <CardDescription>A complete history of your exams.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : results?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              You haven't completed any exams yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results?.map((result) => {
                  if (!result.resultsReleased) {
                    return (
                      <TableRow key={result.id}>
                        <TableCell>{format(new Date(result.submittedAt), "PPP")}</TableCell>
                        <TableCell className="font-medium">{result.subject}</TableCell>
                        <TableCell colSpan={3}>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm italic">Results not yet released</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">Pending</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  }
                  const isPass = result.percentage >= 50;
                  return (
                    <TableRow key={result.id}>
                      <TableCell>{format(new Date(result.submittedAt), "PPP")}</TableCell>
                      <TableCell className="font-medium">{result.subject}</TableCell>
                      <TableCell>{result.score} / {result.total}</TableCell>
                      <TableCell>{result.percentage.toFixed(1)}%</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium ${
                          result.grade === 'A' ? 'bg-green-100 text-green-800' :
                          result.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                          result.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                          result.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {result.grade}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isPass ? (
                          <div className="flex items-center text-green-600 gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm font-medium">Pass</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600 gap-1">
                            <XCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">Fail</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
