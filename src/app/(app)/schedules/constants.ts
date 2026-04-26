export const DAYS_OF_WEEK = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const TOTAL_PERIODS = 7;

export const PERIODS = Array.from({ length: TOTAL_PERIODS }, (_, i) => i + 1);
