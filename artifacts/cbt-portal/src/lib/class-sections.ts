export const CLASS_SECTIONS = [
  "JSS1A", "JSS1B",
  "JSS2A", "JSS2B",
  "JSS3A", "JSS3B",
  "SS1 Science", "SS1 Art", "SS1 Commercial",
  "SS2 Science", "SS2 Art", "SS2 Commercial",
  "SS3 Science", "SS3 Art", "SS3 Commercial",
] as const;

export type ClassSection = typeof CLASS_SECTIONS[number];

export const JSS_SECTIONS = CLASS_SECTIONS.filter(c => c.startsWith("JSS"));
export const SS_SECTIONS = CLASS_SECTIONS.filter(c => c.startsWith("SS"));
