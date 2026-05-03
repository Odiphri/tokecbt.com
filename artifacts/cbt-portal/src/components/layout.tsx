import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { BookOpen, LayoutDashboard, LogOut, FileText, CheckSquare, Users, GraduationCap, Shield, Settings, ClipboardList, Inbox, School, ShieldCheck } from "lucide-react";

export function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user || user.role !== "student") return null;

  const initials = user.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "ST";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50/50">
        <Sidebar>
          <SidebarHeader className="border-b bg-primary text-primary-foreground p-4">
            <div className="flex items-center gap-2 font-bold text-lg">
              <BookOpen className="h-6 w-6" />
              <span>TOKE SCHOOLS</span>
            </div>
            <div className="mt-4 text-sm font-medium opacity-90">Student Portal</div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/student/dashboard"}>
                      <Link href="/student/dashboard">
                        <LayoutDashboard />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/student/results"}>
                      <Link href="/student/results">
                        <CheckSquare />
                        <span>My Results</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/settings"}>
                      <Link href="/settings">
                        <Settings />
                        <span>Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t p-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.profilePicture ?? undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">{user.name}</span>
                  <span className="text-xs text-muted-foreground">Class {user.class}</span>
                </div>
              </div>
              <Button variant="outline" className="w-full justify-start" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6 shadow-sm">
            <SidebarTrigger />
            <div className="flex-1" />
            <div className="text-sm font-medium text-primary hidden sm:block">
              {user.name} ({user.class})
              {user.studentRole && user.studentRole !== "Student" && (
                <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{user.studentRole}</span>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/50">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export function StaffLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user || user.role !== "staff") return null;

  const staffRoleLabel = user.staffRole
    ? user.staffRole.charAt(0).toUpperCase() + user.staffRole.slice(1)
    : "Staff";

  const initials = user.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "SF";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50/50">
        <Sidebar>
          <SidebarHeader className="border-b bg-primary text-primary-foreground p-4">
            <div className="flex items-center gap-2 font-bold text-lg">
              <BookOpen className="h-6 w-6" />
              <span>TOKE SCHOOLS</span>
            </div>
            <div className="mt-4 text-sm font-medium opacity-90">Staff Portal</div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/teacher/dashboard"}>
                      <Link href="/teacher/dashboard">
                        <LayoutDashboard />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {user.permissions?.manage_exams && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.startsWith("/teacher/exams")}>
                        <Link href="/teacher/exams">
                          <FileText />
                          <span>Manage Exams</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {user.permissions?.view_all_exams && !user.permissions?.manage_exams && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.startsWith("/teacher/exams")}>
                        <Link href="/teacher/exams">
                          <FileText />
                          <span>All Exams</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {user.permissions?.manage_students && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.startsWith("/teacher/students")}>
                        <Link href="/teacher/students">
                          <GraduationCap />
                          <span>Students</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {(user as any).assignedClass && !user.permissions?.manage_students && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/teacher/class"}>
                        <Link href="/teacher/class">
                          <School />
                          <span>My Class</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/settings"}>
                      <Link href="/settings">
                        <Settings />
                        <span>Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t p-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.profilePicture ?? undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">{user.name}</span>
                  <span className="text-xs text-muted-foreground">{staffRoleLabel}</span>
                </div>
              </div>
              <Button variant="outline" className="w-full justify-start" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6 shadow-sm">
            <SidebarTrigger />
            <div className="flex-1" />
            <div className="text-sm font-medium text-primary hidden sm:block">{user.name}</div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/50">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user || user.role !== "admin") return null;

  const initials = user.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "AD";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50/50">
        <Sidebar>
          <SidebarHeader className="border-b bg-rose-700 text-white p-4">
            <div className="flex items-center gap-2 font-bold text-lg">
              <BookOpen className="h-6 w-6" />
              <span>TOKE SCHOOLS</span>
            </div>
            <div className="mt-4 text-sm font-medium opacity-90 flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" />
              Admin Portal
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/admin/dashboard"}>
                      <Link href="/admin/dashboard">
                        <LayoutDashboard />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/admin/students")}>
                      <Link href="/admin/students">
                        <GraduationCap />
                        <span>Students</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/admin/staff")}>
                      <Link href="/admin/staff">
                        <Users />
                        <span>Staff</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/admin/exams")}>
                      <Link href="/admin/exams">
                        <ClipboardList />
                        <span>Exams</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/admin/requests")}>
                      <Link href="/admin/requests">
                        <Inbox />
                        <span>Requests</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/admin/roles")}>
                      <Link href="/admin/roles">
                        <ShieldCheck />
                        <span>Roles</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/settings"}>
                      <Link href="/settings">
                        <Settings />
                        <span>Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t p-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.profilePicture ?? undefined} />
                  <AvatarFallback className="bg-rose-100 text-rose-700 text-sm font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">{user.name}</span>
                  <span className="text-xs text-muted-foreground">Administrator</span>
                </div>
              </div>
              <Button variant="outline" className="w-full justify-start" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6 shadow-sm">
            <SidebarTrigger />
            <div className="flex-1" />
            <div className="text-sm font-medium text-rose-700 hidden sm:block font-semibold">
              {user.name} — Administrator
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/50">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export { StaffLayout as TeacherLayout };
