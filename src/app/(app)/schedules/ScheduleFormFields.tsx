"use client";

import { AlertCircle, Save } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { ScheduleFormState } from "./actions";
import { DAYS_OF_WEEK, PERIODS } from "./constants";

export type ClassOption = {
  id: string;
  grade: string;
  section: string;
  academicYear: string;
};

export type SubjectOption = {
  id: string;
  name: string;
  grade: string;
  teacherId: string | null;
};

export type TeacherOption = {
  id: string;
  fullName: string;
  specialty: string;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="button" type="submit" disabled={pending}>
      <Save size={18} strokeWidth={2} />
      {pending ? "جاري الحفظ..." : label}
    </button>
  );
}

export function ScheduleFormFields({
  state,
  submitLabel,
  classes,
  subjects,
  teachers,
  lockClassId,
}: {
  state: ScheduleFormState;
  submitLabel: string;
  classes: ClassOption[];
  subjects: SubjectOption[];
  teachers: TeacherOption[];
  lockClassId?: string;
}) {
  const v = state.values ?? {};

  const [classId, setClassId] = useState(v.classId ?? lockClassId ?? "");
  const [subjectId, setSubjectId] = useState(v.subjectId ?? "");
  const [teacherId, setTeacherId] = useState(v.teacherId ?? "");

  const selectedClass = classes.find((c) => c.id === classId);
  const filteredSubjects = selectedClass
    ? subjects.filter((s) => s.grade === selectedClass.grade)
    : subjects;

  function handleClassChange(value: string) {
    setClassId(value);
    if (subjectId) {
      const stillValid = subjects.find(
        (s) =>
          s.id === subjectId &&
          s.grade === classes.find((c) => c.id === value)?.grade,
      );
      if (!stillValid) {
        setSubjectId("");
        setTeacherId("");
      }
    }
  }

  function handleSubjectChange(value: string) {
    setSubjectId(value);
    const subject = subjects.find((s) => s.id === value);
    if (subject?.teacherId) {
      setTeacherId(subject.teacherId);
    }
  }

  return (
    <>
      {state.error ? (
        <div className="form-error" role="alert">
          <AlertCircle size={18} strokeWidth={2} />
          <span>{state.error}</span>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="classId">الفصل *</label>
        {lockClassId ? (
          <>
            <input type="hidden" name="classId" value={classId} />
            <input
              type="text"
              disabled
              value={
                selectedClass
                  ? `${selectedClass.grade} — ${selectedClass.section} (${selectedClass.academicYear})`
                  : ""
              }
            />
          </>
        ) : (
          <select
            id="classId"
            name="classId"
            required
            value={classId}
            onChange={(e) => handleClassChange(e.target.value)}
          >
            <option value="" disabled>
              اختاري الفصل
            </option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.grade} — {cls.section} ({cls.academicYear})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="field">
        <label htmlFor="subjectId">المادة *</label>
        <select
          id="subjectId"
          name="subjectId"
          required
          value={subjectId}
          onChange={(e) => handleSubjectChange(e.target.value)}
          disabled={!classId}
        >
          <option value="" disabled>
            {classId ? "اختاري المادة" : "اختاري الفصل أولاً"}
          </option>
          {filteredSubjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name} ({subject.grade})
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="teacherId">المعلمة</label>
        <select
          id="teacherId"
          name="teacherId"
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
        >
          <option value="">— غير معينة —</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.fullName} ({teacher.specialty})
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="dayOfWeek">اليوم *</label>
        <select
          id="dayOfWeek"
          name="dayOfWeek"
          required
          defaultValue={v.dayOfWeek ?? ""}
        >
          <option value="" disabled>
            اختاري اليوم
          </option>
          {DAYS_OF_WEEK.map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="period">رقم الحصة *</label>
        <select
          id="period"
          name="period"
          required
          defaultValue={v.period ?? ""}
        >
          <option value="" disabled>
            اختاري الحصة
          </option>
          {PERIODS.map((period) => (
            <option key={period} value={period}>
              الحصة {period}
            </option>
          ))}
        </select>
      </div>

      <div className="field field-full">
        <label htmlFor="notes">ملاحظات</label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={v.notes ?? ""}
          placeholder="أي ملاحظة عن هذه الحصة"
        />
      </div>

      <div className="form-actions">
        <SubmitButton label={submitLabel} />
      </div>
    </>
  );
}
