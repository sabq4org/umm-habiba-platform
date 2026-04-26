"use client";

import { AlertCircle, Save } from "lucide-react";
import { useFormStatus } from "react-dom";
import type { SubjectFormState } from "./actions";

const grades = ["الأول متوسط", "الثاني متوسط", "الثالث متوسط"];

const statuses = [
  { value: "active", label: "نشطة" },
  { value: "archived", label: "مؤرشفة" },
];

export type TeacherOption = { id: string; fullName: string; specialty: string };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="button" type="submit" disabled={pending}>
      <Save size={18} strokeWidth={2} />
      {pending ? "جاري الحفظ..." : label}
    </button>
  );
}

export function SubjectFormFields({
  state,
  submitLabel,
  showStatus = false,
  teachers,
}: {
  state: SubjectFormState;
  submitLabel: string;
  showStatus?: boolean;
  teachers: TeacherOption[];
}) {
  const v = state.values ?? {};

  return (
    <>
      {state.error ? (
        <div className="form-error" role="alert">
          <AlertCircle size={18} strokeWidth={2} />
          <span>{state.error}</span>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="name">اسم المادة *</label>
        <input
          id="name"
          name="name"
          required
          defaultValue={v.name ?? ""}
          placeholder="مثال: الرياضيات"
        />
      </div>

      <div className="field">
        <label htmlFor="code">رمز المادة</label>
        <input
          id="code"
          name="code"
          defaultValue={v.code ?? ""}
          placeholder="مثال: MATH-1"
          dir="ltr"
        />
      </div>

      <div className="field">
        <label htmlFor="grade">الصف *</label>
        <select id="grade" name="grade" required defaultValue={v.grade ?? ""}>
          <option value="" disabled>
            اختاري الصف
          </option>
          {grades.map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="weeklyPeriods">الحصص الأسبوعية</label>
        <input
          id="weeklyPeriods"
          name="weeklyPeriods"
          type="number"
          min={1}
          max={15}
          defaultValue={v.weeklyPeriods ?? "3"}
        />
      </div>

      <div className="field">
        <label htmlFor="teacherId">المعلمة المسؤولة</label>
        <select
          id="teacherId"
          name="teacherId"
          defaultValue={v.teacherId ?? ""}
        >
          <option value="">— غير معينة —</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.fullName} ({teacher.specialty})
            </option>
          ))}
        </select>
      </div>

      {showStatus ? (
        <div className="field">
          <label htmlFor="status">الحالة</label>
          <select id="status" name="status" defaultValue={v.status ?? "active"}>
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="field field-full">
        <label htmlFor="description">وصف المادة</label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={v.description ?? ""}
          placeholder="ملخص قصير عن محتوى المادة"
        />
      </div>

      <div className="field field-full">
        <label htmlFor="notes">ملاحظات</label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={v.notes ?? ""}
          placeholder="أي ملاحظات تخص هذه المادة"
        />
      </div>

      <div className="form-actions">
        <SubmitButton label={submitLabel} />
      </div>
    </>
  );
}
