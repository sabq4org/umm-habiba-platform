"use client";

import { AlertCircle, Save } from "lucide-react";
import { useFormStatus } from "react-dom";
import type { TeacherFormState } from "./actions";

const specialties = [
  "اللغة العربية",
  "اللغة الإنجليزية",
  "الرياضيات",
  "الكيمياء",
  "الفيزياء",
  "الأحياء",
  "الحاسب الآلي",
  "الدراسات الاجتماعية",
  "الدين",
  "التربية الفنية",
];

const statuses = [
  { value: "active", label: "على رأس العمل" },
  { value: "leave", label: "في إجازة" },
  { value: "transferred", label: "منقولة" },
  { value: "resigned", label: "مستقيلة" },
];

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="button" type="submit" disabled={pending}>
      <Save size={18} strokeWidth={2} />
      {pending ? "جاري الحفظ..." : label}
    </button>
  );
}

export function TeacherFormFields({
  state,
  submitLabel,
  showStatus = false,
}: {
  state: TeacherFormState;
  submitLabel: string;
  showStatus?: boolean;
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
        <label htmlFor="fullName">الاسم الكامل *</label>
        <input
          id="fullName"
          name="fullName"
          required
          defaultValue={v.fullName ?? ""}
          placeholder="مثال: نورة عبدالعزيز السبيعي"
        />
      </div>

      <div className="field">
        <label htmlFor="nationalId">رقم الهوية *</label>
        <input
          id="nationalId"
          name="nationalId"
          required
          inputMode="numeric"
          pattern="[0-9]{8,15}"
          defaultValue={v.nationalId ?? ""}
          placeholder="10 أرقام"
        />
      </div>

      <div className="field">
        <label htmlFor="specialty">التخصص *</label>
        <select
          id="specialty"
          name="specialty"
          required
          defaultValue={v.specialty ?? ""}
        >
          <option value="" disabled>
            اختاري التخصص
          </option>
          {specialties.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="qualification">المؤهل العلمي</label>
        <input
          id="qualification"
          name="qualification"
          defaultValue={v.qualification ?? ""}
          placeholder="مثال: بكالوريوس رياضيات"
        />
      </div>

      <div className="field field-full">
        <label htmlFor="subjects">المواد التي تدرّسها</label>
        <input
          id="subjects"
          name="subjects"
          defaultValue={v.subjects ?? ""}
          placeholder="افصلي بين المواد بفاصلة، مثال: رياضيات 1، رياضيات 2"
        />
      </div>

      <div className="field">
        <label htmlFor="yearsOfService">سنوات الخدمة</label>
        <input
          id="yearsOfService"
          name="yearsOfService"
          type="number"
          min={0}
          max={60}
          defaultValue={v.yearsOfService ?? "0"}
        />
      </div>

      <div className="field">
        <label htmlFor="weeklyLoad">النصاب الأسبوعي (حصص)</label>
        <input
          id="weeklyLoad"
          name="weeklyLoad"
          type="number"
          min={0}
          max={40}
          defaultValue={v.weeklyLoad ?? "0"}
        />
      </div>

      <div className="field">
        <label htmlFor="phone">الجوال</label>
        <input
          id="phone"
          name="phone"
          inputMode="tel"
          defaultValue={v.phone ?? ""}
          placeholder="05XXXXXXXX"
        />
      </div>

      <div className="field">
        <label htmlFor="email">البريد الإلكتروني</label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={v.email ?? ""}
          placeholder="name@ummhabiba.edu.sa"
          dir="ltr"
        />
      </div>

      {showStatus ? (
        <div className="field">
          <label htmlFor="status">الحالة الوظيفية</label>
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
          placeholder="أي ملاحظات إدارية"
        />
      </div>

      <div className="form-actions">
        <SubmitButton label={submitLabel} />
      </div>
    </>
  );
}
