export const STUDENT_POSITIONS = [
  "Student",
  "Head Boy",
  "Head Girl",
  "Assistant Head Boy",
  "Assistant Head Girl",
  "Prefect",
  "Class Captain",
  "Assistant Class Captain",
  "Library Prefect",
  "Sports Prefect",
  "Social Prefect",
] as const;

export type StudentPosition = typeof STUDENT_POSITIONS[number];
