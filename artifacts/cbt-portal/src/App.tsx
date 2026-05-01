import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/protected-route";

// Pages
import Login from "@/pages/login";
import ChangePassword from "@/pages/change-password";
import StudentDashboard from "@/pages/student/dashboard";
import StudentExam from "@/pages/student/exam";
import StudentResults from "@/pages/student/results";
import TeacherDashboard from "@/pages/teacher/dashboard";
import TeacherExams from "@/pages/teacher/exams";
import ExamForm from "@/pages/teacher/exam-form";
import ExamDetail from "@/pages/teacher/exam-detail";
import ExamResults from "@/pages/teacher/exam-results";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminStudents from "@/pages/admin/students";
import AdminTeachers from "@/pages/admin/teachers";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/change-password" component={ChangePassword} />
      
      {/* Student Routes */}
      <ProtectedRoute path="/student/dashboard" role="student" component={StudentDashboard} />
      <ProtectedRoute path="/student/exam/:examId" role="student" component={StudentExam} />
      <ProtectedRoute path="/student/results" role="student" component={StudentResults} />

      {/* Teacher Routes */}
      <ProtectedRoute path="/teacher/dashboard" role="teacher" component={TeacherDashboard} />
      <ProtectedRoute path="/teacher/exams" role="teacher" component={TeacherExams} />
      <ProtectedRoute path="/teacher/exams/new" role="teacher" component={ExamForm} />
      <ProtectedRoute path="/teacher/exams/:examId" role="teacher" component={ExamDetail} />
      <ProtectedRoute path="/teacher/exams/:examId/edit" role="teacher" component={ExamForm} />
      <ProtectedRoute path="/teacher/exams/:examId/results" role="teacher" component={ExamResults} />

      {/* Admin Routes */}
      <ProtectedRoute path="/admin/dashboard" role="admin" component={AdminDashboard} />
      <ProtectedRoute path="/admin/students" role="admin" component={AdminStudents} />
      <ProtectedRoute path="/admin/teachers" role="admin" component={AdminTeachers} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
