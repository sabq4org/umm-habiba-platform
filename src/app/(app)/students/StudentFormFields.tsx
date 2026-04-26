"use client";

import { AlertCircle, Save } from "lucide-react";
import { useFormStatus } from "react-dom";
import type { StudentFormState } from "./actions";

const grades = ["الأول متوسط", "الثاني متوسط", "الثالث متوسط"];
const statuses: { value: string; label: string }[] = [
  { value: "active", label: "فعّالة" },
  { value: "transferred", label: "محوّلة" },
  { value: "graduated", label: "متخرّجة" },
  { value: "withdrawn", label: "منسحبة" },
];

const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const nationalities = [
  "سعودية",
  "إماراتية",
  "كويتية",
  "بحرينية",
  "قطرية",
  "عُمانية",
  "يمنية",
  "مصرية",
  "أردنية",
  "سورية",
  "فلسطينية",
  "لبنانية",
  "عراقية",
  "سودانية",
  "مغربية",
  "تونسية",
  "جزائرية",
  "ليبية",
  "أخرى",
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

export function StudentFormFields({
  state,
  submitLabel,
  showStatus = false,
}: {
  state: StudentFormState;
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

      <div className="form-section-title field-full">البيانات الأساسية</div>

      <div className="field">
        <label htmlFor="fullName">الاسم الكامل *</label>
        <input
          id="fullName"
          name="fullName"
          required
          defaultValue={v.fullName ?? ""}
          placeholder="مثال: نوف عبدالله العتيبي"
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
        <label htmlFor="dateOfBirth">تاريخ الميلاد</label>
        <input
          id="dateOfBirth"
          name="dateOfBirth"
          type="date"
          defaultValue={v.dateOfBirth ?? ""}
        />
      </div>

      <div className="field">
        <label htmlFor="nationality">الجنسية</label>
        <select
          id="nationality"
          name="nationality"
          defaultValue={v.nationality ?? ""}
        >
          <option value="">— اختاري —</option>
          {nationalities.map((nat) => (
            <option key={nat} value={nat}>
              {nat}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="bloodType">فصيلة الدم</label>
        <select
          id="bloodType"
          name="bloodType"
          defaultValue={v.bloodType ?? ""}
        >
          <option value="">— غير محددة —</option>
          {bloodTypes.map((bt) => (
            <option key={bt} value={bt}>
              {bt}
            </option>
          ))}
        </select>
      </div>

      <div className="form-section-title field-full">البيانات الأكاديمية</div>

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
        <label htmlFor="section">الشعبة *</label>
        <input
          id="section"
          name="section"
          required
          defaultValue={v.section ?? ""}
          placeholder="مثال: 1/1"
        />
      </div>

      <div className="field">
        <label htmlFor="enrollmentDate">تاريخ الالتحاق</label>
        <input
          id="enrollmentDate"
          name="enrollmentDate"
          type="date"
          defaultValue={v.enrollmentDate ?? ""}
        />
      </div>

      <div className="field">
        <label htmlFor="previousSchool">المدرسة السابقة</label>
        <input
          id="previousSchool"
          name="previousSchool"
          defaultValue={v.previousSchool ?? ""}
          placeholder="اسم المدرسة"
        />
      </div>

      <div className="form-section-title field-full">بيانات التواصل</div>

      <div className="field">
        <label htmlFor="phone">جوال الطالبة</label>
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
          placeholder="example@mail.com"
          dir="ltr"
        />
      </div>

      <div className="field field-full">
        <label htmlFor="address">العنوان</label>
        <textarea
          id="address"
          name="address"
          rows={2}
          defaultValue={v.address ?? ""}
          placeholder="الحي - الشارع - المدينة"
        />
      </div>

      <div className="form-section-title field-full">ولي الأمر</div>

      <div className="field">
        <label htmlFor="guardianName">اسم ولي الأمر</label>
        <input
          id="guardianName"
          name="guardianName"
          defaultValue={v.guardianName ?? ""}
          placeholder="الاسم الثلاثي"
        />
      </div>

      <div className="field">
        <label htmlFor="guardianPhone">جوال ولي الأمر</label>
        <input
          id="guardianPhone"
          name="guardianPhone"
          inputMode="tel"
          defaultValue={v.guardianPhone ?? ""}
          placeholder="05XXXXXXXX"
        />
      </div>

      <div className="form-section-title field-full">جهة الاتصال للطوارئ</div>

      <div className="field">
        <label htmlFor="emergencyContactName">الاسم</label>
        <input
          id="emergencyContactName"
          name="emergencyContactName"
          defaultValue={v.emergencyContactName ?? ""}
          placeholder="مثال: العم/الخالة"
        />
      </div>

      <div className="field">
        <label htmlFor="emergencyContactPhone">الجوال</label>
        <input
          id="emergencyContactPhone"
          name="emergencyContactPhone"
          inputMode="tel"
          defaultValue={v.emergencyContactPhone ?? ""}
          placeholder="05XXXXXXXX"
        />
      </div>

      <div className="form-section-title field-full">البيانات الصحية</div>

      <div className="field field-full">
        <label htmlFor="chronicDiseases">الأمراض المزمنة</label>
        <textarea
          id="chronicDiseases"
          name="chronicDiseases"
          rows={2}
          defaultValue={v.chronicDiseases ?? ""}
          placeholder="مثال: ربو، سكري — اتركيها فارغة إن لم يوجد"
        />
      </div>

      <div className="field field-full">
        <label htmlFor="allergies">الحساسية</label>
        <textarea
          id="allergies"
          name="allergies"
          rows={2}
          defaultValue={v.allergies ?? ""}
          placeholder="مثال: حساسية فول سوداني، لاكتوز — اتركيها فارغة إن لم يوجد"
        />
      </div>

      {showStatus ? (
        <>
          <div className="form-section-title field-full">حالة السجل</div>
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
        </>
      ) : null}

      <div className="field field-full">
        <label htmlFor="notes">ملاحظات</label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={v.notes ?? ""}
          placeholder="أي ملاحظات إدارية أو تربوية"
        />
      </div>

      <div className="form-actions">
        <SubmitButton label={submitLabel} />
      </div>
    </>
  );
}
