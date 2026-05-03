import { db, rolesTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const DEFAULT_ROLES: Array<{ name: string; type: "prefect" | "normal" | "custom" }> = [
  { name: "Student", type: "normal" },
  { name: "Class Captain", type: "normal" },
  { name: "Assistant Class Captain", type: "normal" },
  { name: "Head Boy", type: "prefect" },
  { name: "Head Girl", type: "prefect" },
  { name: "Assistant Head Boy", type: "prefect" },
  { name: "Assistant Head Girl", type: "prefect" },
  { name: "Labour Prefect", type: "prefect" },
  { name: "Assistant Labour Prefect", type: "prefect" },
  { name: "Social Prefect", type: "prefect" },
  { name: "Assistant Social Prefect", type: "prefect" },
  { name: "Time Keeper", type: "prefect" },
  { name: "Assistant Time Keeper", type: "prefect" },
  { name: "Health Prefect", type: "prefect" },
  { name: "Assistant Health Prefect", type: "prefect" },
  { name: "Lab Prefect", type: "prefect" },
  { name: "Assistant Lab Prefect", type: "prefect" },
  { name: "ICT Prefect", type: "prefect" },
  { name: "Assistant ICT Prefect", type: "prefect" },
  { name: "Sports Prefect", type: "prefect" },
  { name: "Assistant Sports Prefect", type: "prefect" },
  { name: "Library Prefect", type: "prefect" },
  { name: "Assistant Library Prefect", type: "prefect" },
  { name: "Discipline Prefect", type: "prefect" },
  { name: "Assistant Discipline Prefect", type: "prefect" },
  { name: "Sanitation Prefect", type: "prefect" },
  { name: "Assistant Sanitation Prefect", type: "prefect" },
  { name: "Food Prefect", type: "prefect" },
  { name: "Assistant Food Prefect", type: "prefect" },
  { name: "Dining Hall Prefect", type: "prefect" },
  { name: "Assistant Dining Hall Prefect", type: "prefect" },
  { name: "Chapel Prefect", type: "prefect" },
  { name: "Assistant Chapel Prefect", type: "prefect" },
  { name: "Islamic Affairs Prefect", type: "prefect" },
  { name: "Assistant Islamic Affairs Prefect", type: "prefect" },
  { name: "Hostel Prefect", type: "prefect" },
  { name: "Assistant Hostel Prefect", type: "prefect" },
  { name: "Boarding House Prefect", type: "prefect" },
  { name: "Assistant Boarding House Prefect", type: "prefect" },
  { name: "Gate Prefect", type: "prefect" },
  { name: "Assistant Gate Prefect", type: "prefect" },
  { name: "Security Prefect", type: "prefect" },
  { name: "Assistant Security Prefect", type: "prefect" },
  { name: "Transport Prefect", type: "prefect" },
  { name: "Assistant Transport Prefect", type: "prefect" },
  { name: "Press Prefect", type: "prefect" },
  { name: "Assistant Press Prefect", type: "prefect" },
  { name: "Debate Prefect", type: "prefect" },
  { name: "Assistant Debate Prefect", type: "prefect" },
  { name: "Cultural Prefect", type: "prefect" },
  { name: "Assistant Cultural Prefect", type: "prefect" },
  { name: "Entertainment Prefect", type: "prefect" },
  { name: "Assistant Entertainment Prefect", type: "prefect" },
  { name: "Environmental Prefect", type: "prefect" },
  { name: "Assistant Environmental Prefect", type: "prefect" },
  { name: "Maintenance Prefect", type: "prefect" },
  { name: "Assistant Maintenance Prefect", type: "prefect" },
  { name: "Utility Prefect", type: "prefect" },
  { name: "Assistant Utility Prefect", type: "prefect" },
];

export async function seedRoles(): Promise<void> {
  const [{ count }] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(rolesTable);
  if ((count ?? 0) > 0) return;

  await db.insert(rolesTable).values(
    DEFAULT_ROLES.map(r => ({ name: r.name, type: r.type, createdBy: null }))
  );
}
