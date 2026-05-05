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
import Settings from "@/pages/settings";
import StudentDashboard from "@/pages/student/dashboard";
import StudentExam from "@/pages/student/exam";
import StudentResults from "@/pages/student/results";
import TeachersDirectory from "@/pages/student/teachers-directory";
import StudentsDirectory from "@/pages/student/students-directory";
import StudentProfile from "@/pages/student/profile";
import StudentBursary from "@/pages/student/bursary";
import TeacherProfile from "@/pages/teacher/profile";
import StaffDashboard from "@/pages/teacher/dashboard";
import StaffExams from "@/pages/teacher/exams";
import ExamForm from "@/pages/teacher/exam-form";
import ExamDetail from "@/pages/teacher/exam-detail";
import ExamResults from "@/pages/teacher/exam-results";
import StaffStudents from "@/pages/teacher/students";
import TeacherClass from "@/pages/teacher/class";
import AttendancePage from "@/pages/teacher/attendance";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminStudents from "@/pages/admin/students";
import AdminStaff from "@/pages/admin/staff";
import AdminExams from "@/pages/admin/exams";
import AdminRequests from "@/pages/admin/requests";
import AdminRoles from "@/pages/admin/roles";
import BursaryPage from "@/pages/admin/bursary";
import SchoolSettingsPage from "@/pages/admin/school-settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/change-password" component={ChangePassword} />

      {/* Shared Settings Route */}
      <ProtectedRoute path="/settings" role="any" component={Settings} />

      {/* Student Routes */}
      <ProtectedRoute path="/student/dashboard" role="student" component={StudentDashboard} />
      <ProtectedRoute path="/student/exam/:examId" role="student" component={StudentExam} />
      <ProtectedRoute path="/student/results" role="student" component={StudentResults} />
      <ProtectedRoute path="/student/teachers" role="student" component={TeachersDirectory} />
      <ProtectedRoute path="/student/directory" role="student" component={StudentsDirectory} />
      <ProtectedRoute path="/student/profile" role="student" component={StudentProfile} />
      <ProtectedRoute path="/student/bursary" role="student" component={StudentBursary} />

      {/* Staff Routes */}
      <ProtectedRoute path="/teacher/dashboard" role="staff" component={StaffDashboard} />
      <ProtectedRoute path="/teacher/exams" role="staff" component={StaffExams} />
      <ProtectedRoute path="/teacher/exams/new" role="staff" component={ExamForm} />
      <ProtectedRoute path="/teacher/exams/:examId" role="staff" component={ExamDetail} />
      <ProtectedRoute path="/teacher/exams/:examId/edit" role="staff" component={ExamForm} />
      <ProtectedRoute path="/teacher/exams/:examId/results" role="staff" component={ExamResults} />
      <ProtectedRoute path="/teacher/students" role="staff" component={StaffStudents} />
      <ProtectedRoute path="/teacher/class" role="staff" component={TeacherClass} />
      <ProtectedRoute path="/teacher/attendance" role="staff" component={AttendancePage} />
      <ProtectedRoute path="/teacher/profile" role="staff" component={TeacherProfile} />

      {/* Admin Routes */}
      <ProtectedRoute path="/admin/dashboard" role="admin" component={AdminDashboard} />
      <ProtectedRoute path="/admin/students" role="admin" component={AdminStudents} />
      <ProtectedRoute path="/admin/staff" role="admin" component={AdminStaff} />
      <ProtectedRoute path="/admin/exams" role="admin" component={AdminExams} />
      <ProtectedRoute path="/admin/requests" role="admin" component={AdminRequests} />
      <ProtectedRoute path="/admin/roles" role="admin" component={AdminRoles} />
      <ProtectedRoute path="/admin/bursary" role="admin" component={BursaryPage} />
      <ProtectedRoute path="/admin/school-settings" role="admin" component={SchoolSettingsPage} />

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
