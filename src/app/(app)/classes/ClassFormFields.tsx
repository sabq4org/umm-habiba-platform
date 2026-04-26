"use client";

import { AlertCircle, Save } from "lucide-react";
import { useFormStatus } from "react-dom";
import type { ClassFormState } from "./actions";

const grades = ["الأول متوسط", "الثاني متوسط", "الثالث متوسط"];

const statuses = [
  { value: "active", label: "نشط" },
  { value: "archived", label: "مؤرشف" },
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

export function ClassFormFields({
  state,
  submitLabel,
  showStatus = false,
  teachers,
}: {
  state: ClassFormState;
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
        <label htmlFor="section">رمز الشعبة *</label>
        <input
          id="section"
          name="section"
          required
          defaultValue={v.section ?? ""}
          placeholder="مثال: 1/1"
        />
      </div>

      <div className="field">
        <label htmlFor="academicYear">العام الدراسي *</label>
        <input
          id="academicYear"
          name="academicYear"
          required
          defaultValue={v.academicYear ?? "1447هـ"}
          placeholder="مثال: 1447هـ"
        />
      </div>

      <div className="field">
        <label htmlFor="capacity">السعة</label>
        <input
          id="capacity"
          name="capacity"
          type="number"
          min={1}
          max={60}
          defaultValue={v.capacity ?? "30"}
        />
      </div>

      <div className="field">
        <label htmlFor="room">الغرفة</label>
        <input
          id="room"
          name="room"
          defaultValue={v.room ?? ""}
          placeholder="مثال: A-101"
        />
      </div>

      <div className="field">
        <label htmlFor="homeroomTeacherId">معلمة الفصل (رائدة الفصل)</label>
        <select
          id="homeroomTeacherId"
          name="homeroomTeacherId"
          defaultValue={v.homeroomTeacherId ?? ""}
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
        <label htmlFor="notes">ملاحظات</label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={v.notes ?? ""}
          placeholder="أي ملاحظات حول هذا الفصل"
        />
      </div>

      <div className="form-actions">
        <SubmitButton label={submitLabel} />
      </div>
    </>
  );
}
