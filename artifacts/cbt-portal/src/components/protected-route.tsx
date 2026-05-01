import { useAuth } from "@/lib/auth";
import { Redirect, Switch, Route, useLocation } from "wouter";
import { StudentLayout, TeacherLayout } from "@/components/layout";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ 
  component: Component, 
  role,
  path 
}: { 
  component: any; 
  role: "student" | "teacher";
  path: string;
}) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/" />;
  }

  if (user.role !== role) {
    return <Redirect to={user.role === "student" ? "/student/dashboard" : "/teacher/dashboard"} />;
  }

  if (user.isDefaultPassword && path !== "/change-password") {
    return <Redirect to="/change-password" />;
  }

  const Layout = role === "student" ? StudentLayout : TeacherLayout;

  return (
    <Route path={path}>
      {path.includes("/student/exam/") && !path.includes("/results") ? (
        <Component />
      ) : (
        <Layout>
          <Component />
        </Layout>
      )}
    </Route>
  );
}
