import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CLASS_SECTIONS } from "@/lib/class-sections";

interface StudentEntry {
  name: string;
  class: string;
  studentRole: string;
  profilePicture: string | null;
}

async function apiFetch(path: string) {
  const token = localStorage.getItem("cbt_token");
  const res = await fetch(`/api${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load");
  return res.json();
}

function roleBadge(role: string) {
  if (role === "Student") return null;
  const colorMap: Record<string, string> = {
    "Head Boy": "bg-blue-100 text-blue-700 border-blue-300",
    "Head Girl": "bg-pink-100 text-pink-700 border-pink-300",
    "Prefect": "bg-purple-100 text-purple-700 border-purple-300",
    "Class Captain": "bg-orange-100 text-orange-700 border-orange-300",
    "Library Prefect": "bg-teal-100 text-teal-700 border-teal-300",
    "Sports Prefect": "bg-green-100 text-green-700 border-green-300",
    "Social Prefect": "bg-yellow-100 text-yellow-700 border-yellow-300",
  };
  const cls = colorMap[role] ?? "bg-gray-100 text-gray-700 border-gray-300";
  return <Badge variant="outline" className={`text-xs ${cls}`}>{role}</Badge>;
}

export default function StudentsDirectory() {
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState<string>("all");

  useEffect(() => {
    apiFetch("/directory/students")
      .then(setStudents)
      .catch(() => toast({ variant: "destructive", title: "Failed to load students" }))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchesClass = filterClass === "all" || s.class === filterClass;
    return matchesSearch && matchesClass;
  });

  const classes = [...new Set(students.map(s => s.class))].sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Students Directory</h1>
        <p className="text-muted-foreground mt-1">{students.length} students enrolled.</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map(cls => (
              <SelectItem key={cls} value={cls}>{cls}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-lg">
          <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
          No students found.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s, i) => {
            const initials = s.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
            return (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-primary/10">
                      <AvatarImage src={s.profilePicture ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{s.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <Badge variant="secondary" className="text-xs">{s.class}</Badge>
                        {roleBadge(s.studentRole)}
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
