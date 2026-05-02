import { useAuth } from "@/lib/auth";
import { Redirect, Route } from "wouter";
import { StudentLayout, StaffLayout, AdminLayout } from "@/components/layout";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({
  component: Component,
  role,
  path,
}: {
  component: any;
  role: "student" | "staff" | "admin";
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
    const dest =
      user.role === "student"
        ? "/student/dashboard"
        : user.role === "staff"
        ? "/teacher/dashboard"
        : "/admin/dashboard";
    return <Redirect to={dest} />;
  }

  if (user.isDefaultPassword && user.role !== "admin" && path !== "/change-password") {
    return <Redirect to="/change-password" />;
  }

  const Layout =
    role === "student" ? StudentLayout : role === "staff" ? StaffLayout : AdminLayout;

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
