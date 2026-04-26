"use client";

import { AlertCircle, Save } from "lucide-react";
import { useFormStatus } from "react-dom";
import type { AdminFormState } from "./actions";

const departments = [
  "الإدارة العليا",
  "الشؤون التعليمية",
  "الشؤون الإدارية",
  "الشؤون الطلابية",
  "الشؤون المالية",
  "الإرشاد الطلابي",
  "تقنية المعلومات",
  "خدمات المرافق",
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

export function AdminFormFields({
  state,
  submitLabel,
  showStatus = false,
}: {
  state: AdminFormState;
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
          placeholder="مثال: هيا عبدالرحمن العنزي"
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
        <label htmlFor="jobTitle">المسمى الوظيفي *</label>
        <input
          id="jobTitle"
          name="jobTitle"
          required
          defaultValue={v.jobTitle ?? ""}
          placeholder="مثال: سكرتيرة"
        />
      </div>

      <div className="field">
        <label htmlFor="department">القسم *</label>
        <select
          id="department"
          name="department"
          required
          defaultValue={v.department ?? ""}
        >
          <option value="" disabled>
            اختاري القسم
          </option>
          {departments.map((item) => (
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
          placeholder="مثال: بكالوريوس"
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
        <label htmlFor="responsibilities">المهام المسندة</label>
        <textarea
          id="responsibilities"
          name="responsibilities"
          rows={3}
          defaultValue={v.responsibilities ?? ""}
          placeholder="اذكري أبرز المهام الموكلة"
        />
      </div>

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
