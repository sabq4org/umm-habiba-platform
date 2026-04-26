export const TERMS = [
  "الفصل الأول",
  "الفصل الثاني",
  "الفصل الثالث",
] as const;

export type Term = (typeof TERMS)[number];

export const DEFAULT_TERM: Term = "الفصل الأول";

export const ASSESSMENT_KINDS = [
  { value: "quiz", label: "اختبار قصير" },
  { value: "monthly", label: "اختبار شهري" },
  { value: "midterm", label: "اختبار نصفي" },
  { value: "final", label: "اختبار نهائي" },
  { value: "homework", label: "واجب" },
  { value: "project", label: "مشروع" },
  { value: "participation", label: "مشاركة" },
] as const;

export type AssessmentKind = (typeof ASSESSMENT_KINDS)[number]["value"];

export const KIND_VALUES = ASSESSMENT_KINDS.map((k) => k.value);

export function kindLabel(value: string): string {
  return ASSESSMENT_KINDS.find((k) => k.value === value)?.label ?? value;
}

export const PASS_THRESHOLD_PCT = 50;

export type GradeBand = {
  min: number;
  label: string;
  tone: "ok" | "amber" | "danger" | "muted";
};

export const GRADE_BANDS: GradeBand[] = [
  { min: 90, label: "ممتاز", tone: "ok" },
  { min: 80, label: "جيد جدًا", tone: "ok" },
  { min: 70, label: "جيد", tone: "amber" },
  { min: 60, label: "مقبول", tone: "amber" },
  { min: 50, label: "ضعيف", tone: "amber" },
  { min: 0, label: "راسب", tone: "danger" },
];

export function bandFor(percent: number | null): GradeBand {
  if (percent === null || Number.isNaN(percent)) {
    return { min: 0, label: "—", tone: "muted" };
  }
  for (const band of GRADE_BANDS) {
    if (percent >= band.min) return band;
  }
  return GRADE_BANDS[GRADE_BANDS.length - 1];
}

export function pctFromScore(
  score: number | null,
  maxScore: number,
): number | null {
  if (score === null || score === undefined || maxScore <= 0) return null;
  return Math.round((score / maxScore) * 1000) / 10;
}
