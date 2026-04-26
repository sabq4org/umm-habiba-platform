"use client";

import { useState } from "react";
import { ASSESSMENT_KINDS, TERMS } from "./constants";

type ClassOption = {
  id: string;
  grade: string;
  section: string;
  academicYear: string;
};

type SubjectOption = {
  id: string;
  name: string;
  code: string | null;
  grade: string;
};

type Values = {
  classId?: string;
  subjectId?: string;
  name?: string;
  kind?: string;
  term?: string;
  maxScore?: string;
  weight?: string;
  dueDate?: string;
  notes?: string;
};

type Props = {
  classes: ClassOption[];
  subjects: SubjectOption[];
  initialClassId?: string;
  initialSubjectId?: string;
  values?: Values;
  lockedTargets?: boolean;
};

export default function AssessmentFormFields({
  classes,
  subjects,
  initialClassId,
  initialSubjectId,
  values,
  lockedTargets,
}: Props) {
  const [classId, setClassId] = useState<string>(
    values?.classId ?? initialClassId ?? "",
  );
  const [subjectId, setSubjectId] = useState<string>(
    values?.subjectId ?? initialSubjectId ?? "",
  );

  const selectedClass = classes.find((c) => c.id === classId);
  const filteredSubjects = selectedClass
    ? subjects.filter((s) => s.grade === selectedClass.grade)
    : subjects;

  return (
    <div className="grid form-grid">
      <label>
        <span>الفصل *</span>
        <select
          name="classId"
          value={classId}
          onChange={(event) => {
            setClassId(event.target.value);
            setSubjectId("");
          }}
          required
          disabled={lockedTargets}
        >
          <option value="">— اختاري الفصل —</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.grade} — {cls.section} ({cls.academicYear})
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>المادة *</span>
        <select
          name="subjectId"
          value={subjectId}
          onChange={(event) => setSubjectId(event.target.value)}
          required
          disabled={!classId || lockedTargets}
        >
          <option value="">— اختاري المادة —</option>
          {filteredSubjects.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.name}
              {sub.code ? ` · ${sub.code}` : ""}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>اسم التقييم *</span>
        <input
          type="text"
          name="name"
          defaultValue={values?.name ?? ""}
          required
          maxLength={120}
          placeholder="مثلاً: اختبار شهري 1"
        />
      </label>

      <label>
        <span>النوع *</span>
        <select name="kind" defaultValue={values?.kind ?? "quiz"}>
          {ASSESSMENT_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>الفصل الدراسي *</span>
        <select name="term" defaultValue={values?.term ?? "الفصل الأول"}>
          {TERMS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>الدرجة العظمى *</span>
        <input
          type="number"
          name="maxScore"
          min={1}
          max={1000}
          defaultValue={values?.maxScore ?? "100"}
          required
        />
      </label>

      <label>
        <span>الوزن في المعدل (%)</span>
        <input
          type="number"
          name="weight"
          min={0}
          max={100}
          defaultValue={values?.weight ?? "0"}
        />
      </label>

      <label>
        <span>تاريخ التسليم</span>
        <input
          type="date"
          name="dueDate"
          defaultValue={values?.dueDate ?? ""}
        />
      </label>

      <label className="field-full">
        <span>ملاحظات</span>
        <textarea
          name="notes"
          defaultValue={values?.notes ?? ""}
          rows={3}
          maxLength={500}
          placeholder="ملاحظات للمعلمة أو ولي الأمر"
        />
      </label>
    </div>
  );
}
