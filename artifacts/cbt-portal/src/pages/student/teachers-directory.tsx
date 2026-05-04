import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TeacherEntry {
  name: string;
  subject: string;
  staffRole: string;
  profilePicture: string | null;
  assignedClass: string | null;
}

async function apiFetch(path: string) {
  const token = localStorage.getItem("cbt_token");
  const res = await fetch(`/api${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load");
  return res.json();
}

function roleLabel(role: string) {
  const map: Record<string, string> = {
    teacher: "Teacher",
    hod: "HOD",
    librarian: "Librarian",
    cbt_personnel: "CBT Officer",
  };
  return map[role] ?? role.charAt(0).toUpperCase() + role.slice(1);
}

export default function TeachersDirectory() {
  const { toast } = useToast();
  const [teachers, setTeachers] = useState<TeacherEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiFetch("/directory/teachers")
      .then(setTeachers)
      .catch(() => toast({ variant: "destructive", title: "Failed to load teachers" }))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = teachers.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase()) ||
    (t.assignedClass ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Teachers Directory</h1>
        <p className="text-muted-foreground mt-1">Meet your teachers and their subjects.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by name or subject..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-lg">
          <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-30" />
          No teachers found.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t, i) => {
            const initials = t.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
            return (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14 border-2 border-primary/20">
                      <AvatarImage src={t.profilePicture ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-semibold text-base leading-tight">{t.name}</h3>
                      <p className="text-sm text-muted-foreground">{t.subject}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="secondary" className="text-xs">{roleLabel(t.staffRole)}</Badge>
                        {t.assignedClass && (
                          <Badge variant="outline" className="text-xs">Class {t.assignedClass}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
