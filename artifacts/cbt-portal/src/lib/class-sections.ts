export const CLASS_SECTIONS = [
  "JSS1A", "JSS1B", "JSS1C",
  "JSS2A", "JSS2B", "JSS2C",
  "JSS3A", "JSS3B", "JSS3C",
  "SS1A",  "SS1B",  "SS1C",
  "SS2A",  "SS2B",  "SS2C",
  "SS3A",  "SS3B",  "SS3C",
] as const;

export type ClassSection = typeof CLASS_SECTIONS[number];
