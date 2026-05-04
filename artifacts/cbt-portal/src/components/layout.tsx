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
import {
  BookOpen,
  LayoutDashboard,
  LogOut,
  FileText,
  CheckSquare,
  Users,
  GraduationCap,
  Shield,
  Settings,
  ClipboardList,
  Inbox,
  School,
  ShieldCheck,
  CalendarCheck,
  DollarSign,
  UsersRound,
  GalleryHorizontalEnd,
  UserCircle,
} from "lucide-react";

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
                    <SidebarMenuButton asChild isActive={location === "/student/teachers"}>
                      <Link href="/student/teachers">
                        <GraduationCap />
                        <span>Teachers</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/student/directory"}>
                      <Link href="/student/directory">
                        <UsersRound />
                        <span>Students</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/student/profile"}>
                      <Link href="/student/profile">
                        <UserCircle />
                        <span>My Profile</span>
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
              <Link href="/student/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.profilePicture ?? undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">{user.name}</span>
                  <span className="text-xs text-muted-foreground">Class {user.class}</span>
                </div>
              </Link>
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
                <span className="ml-2 text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">{user.studentRole}</span>
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
    ? user.staffRole === "cbt_personnel" ? "CBT Officer"
    : user.staffRole.charAt(0).toUpperCase() + user.staffRole.slice(1)
    : "Staff";

  const initials = user.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "SF";

  const canMarkAttendance = !!(user as any).permissions?.mark_attendance || !!(user as any).assignedClass;

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
                  {(user.permissions?.manage_exams || user.permissions?.view_all_exams) && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.startsWith("/teacher/exams")}>
                        <Link href="/teacher/exams">
                          <FileText />
                          <span>{user.permissions?.manage_exams ? "Manage Exams" : "All Exams"}</span>
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
                  {canMarkAttendance && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/teacher/attendance"}>
                        <Link href="/teacher/attendance">
                          <CalendarCheck />
                          <span>Attendance</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/teacher/profile"}>
                      <Link href="/teacher/profile">
                        <UserCircle />
                        <span>My Profile</span>
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
              <Link href="/teacher/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.profilePicture ?? undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">{user.name}</span>
                  <span className="text-xs text-muted-foreground">{staffRoleLabel}</span>
                </div>
              </Link>
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
          <SidebarHeader className="border-b bg-primary text-primary-foreground p-4">
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
                    <SidebarMenuButton asChild isActive={location.startsWith("/admin/bursary")}>
                      <Link href="/admin/bursary">
                        <DollarSign />
                        <span>Bursary</span>
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
                    <SidebarMenuButton asChild isActive={location.startsWith("/admin/school-settings")}>
                      <Link href="/admin/school-settings">
                        <GalleryHorizontalEnd />
                        <span>School Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/settings"}>
                      <Link href="/settings">
                        <Settings />
                        <span>My Settings</span>
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
            <div className="text-sm font-medium text-primary hidden sm:block font-semibold">
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
