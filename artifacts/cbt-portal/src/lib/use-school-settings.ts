import { useQuery } from "@tanstack/react-query";

export interface SchoolSettings {
  schoolName: string;
  portalTagline: string;
  schoolLogo: string;
}

async function fetchSchoolSettings(): Promise<SchoolSettings> {
  const res = await fetch("/api/settings/school/public");
  if (!res.ok) throw new Error("Failed to load school settings");
  return res.json();
}

export function useSchoolSettings() {
  const { data } = useQuery<SchoolSettings>({
    queryKey: ["school-settings-public"],
    queryFn: fetchSchoolSettings,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return {
    schoolName: data?.schoolName ?? "Toke Schools",
    portalTagline: data?.portalTagline ?? "Computer Based Testing Portal",
    schoolLogo: data?.schoolLogo ?? "",
  };
}
