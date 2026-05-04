import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, School, Upload } from "lucide-react";

const API_BASE = "/api";

async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem("cbt_token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Request failed");
  }
  return res.json();
}

export default function SchoolSettingsPage() {
  const { toast } = useToast();
  const [schoolName, setSchoolName] = useState("Toke Schools");
  const [portalTagline, setPortalTagline] = useState("Computer Based Testing Portal");
  const [schoolLogo, setSchoolLogo] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    apiFetch("/settings/school")
      .then((data: any) => {
        setSchoolName(data.schoolName ?? "Toke Schools");
        setPortalTagline(data.portalTagline ?? "Computer Based Testing Portal");
        setSchoolLogo(data.schoolLogo ?? "");
      })
      .catch(() => toast({ variant: "destructive", title: "Failed to load settings" }))
      .finally(() => setIsLoading(false));
  }, []);

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Image too large", description: "Please use an image under 2MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSchoolLogo(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function saveSettings() {
    setIsSaving(true);
    try {
      await apiFetch("/admin/settings/school", {
        method: "PUT",
        body: JSON.stringify({ schoolName, portalTagline, schoolLogo }),
      });
      toast({ title: "School settings saved successfully" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to save settings", description: err.message });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">School Settings</h1>
        <p className="text-muted-foreground mt-1">Customize your school's branding and portal settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><School className="h-5 w-5" /> School Logo</CardTitle>
          <CardDescription>Upload your school logo. Shown on the login page and dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 rounded-xl border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden bg-primary/5">
              {schoolLogo ? (
                <img src={schoolLogo} alt="School logo" className="h-full w-full object-contain" />
              ) : (
                <School className="h-10 w-10 text-primary/30" />
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="logo-upload" className="cursor-pointer">
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Logo
                  </span>
                </Button>
              </label>
              <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              {schoolLogo && (
                <Button variant="ghost" size="sm" className="text-destructive block" onClick={() => setSchoolLogo("")}>
                  Remove logo
                </Button>
              )}
              <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Portal Identity</CardTitle>
          <CardDescription>Set the school name and portal tagline shown to all users.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">School Name</label>
            <Input className="mt-1" value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="e.g. Toke Schools" />
          </div>
          <div>
            <label className="text-sm font-medium">Portal Tagline</label>
            <Input className="mt-1" value={portalTagline} onChange={e => setPortalTagline(e.target.value)} placeholder="e.g. Computer Based Testing Portal" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>How your login page branding will appear.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-6 bg-slate-50 rounded-lg border">
            {schoolLogo ? (
              <img src={schoolLogo} alt="Logo preview" className="h-16 w-16 object-contain" />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
                <School className="h-8 w-8 text-primary" />
              </div>
            )}
            <div className="text-center">
              <div className="font-bold text-xl text-primary">{schoolName || "School Name"}</div>
              <div className="text-sm text-muted-foreground">{portalTagline || "Portal Tagline"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
