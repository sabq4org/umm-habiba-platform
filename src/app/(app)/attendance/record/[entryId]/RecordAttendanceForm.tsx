"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, RefreshCcw, Save } from "lucide-react";
import {
  recordAttendanceAction,
  type AttendanceFormState,
} from "../../actions";
import { ATTENDANCE_STATUSES } from "../../constants";

type StudentRow = {
  id: string;
  fullName: string;
  nationalId: string;
};

type ExistingMap = Record<string, { status: string; notes: string }>;

type Props = {
  scheduleEntryId: string;
  attendanceDate: string;
  students: StudentRow[];
  existing: ExistingMap;
};

const initial: AttendanceFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="button" disabled={pending}>
      <Save size={16} strokeWidth={2} />
      {pending ? "جاري الحفظ…" : "حفظ الحضور"}
    </button>
  );
}

export default function RecordAttendanceForm({
  scheduleEntryId,
  attendanceDate,
  students,
  existing,
}: Props) {
  const action = recordAttendanceAction.bind(
    null,
    scheduleEntryId,
    attendanceDate,
  );
  const [state, formAction] = useActionState(action, initial);

  const [statuses, setStatuses] = useState<Record<string, string>>(() => {
    const initialStatuses: Record<string, string> = {};
    for (const student of students) {
      initialStatuses[student.id] =
        existing[student.id]?.status ?? "present";
    }
    return initialStatuses;
  });

  const counts = students.reduce(
    (acc, student) => {
      const status = statuses[student.id] ?? "present";
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  function setAll(status: string) {
    setStatuses((prev) => {
      const next: Record<string, string> = { ...prev };
      for (const student of students) {
        next[student.id] = status;
      }
      return next;
    });
  }

  return (
    <article className="card">
      <form action={formAction} className="attendance-form">
        {state?.error && <div className="form-error">{state.error}</div>}

        <div className="attendance-toolbar">
          <div className="legend-row">
            {ATTENDANCE_STATUSES.map((s) => (
              <span key={s.value} className={`pill tone-${s.color}`}>
                {s.label}: {counts[s.value] ?? 0}
              </span>
            ))}
          </div>
          <div className="attendance-bulk">
            <button
              type="button"
              className="ghost-button"
              onClick={() => setAll("present")}
            >
              <CheckCircle2 size={14} strokeWidth={2} />
              الكل حاضرات
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => setAll("absent")}
            >
              <RefreshCcw size={14} strokeWidth={2} />
              الكل غائبات
            </button>
          </div>
        </div>

        <label className="recorder-field">
          <span>اسم المسجِّلة (اختياري)</span>
          <input
            type="text"
            name="recordedBy"
            placeholder="مثلاً: أ. سارة المراقبة"
            maxLength={120}
          />
        </label>

        <table className="data-table attendance-table">
          <thead>
            <tr>
              <th>#</th>
              <th>الطالبة</th>
              <th>الحالة</th>
              <th>ملاحظة</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, idx) => {
              const value = statuses[student.id] ?? "present";
              const note = existing[student.id]?.notes ?? "";
              return (
                <tr key={student.id}>
                  <td>{idx + 1}</td>
                  <td>
                    <div>
                      <strong>{student.fullName}</strong>
                    </div>
                    <span className="muted-text">{student.nationalId}</span>
                  </td>
                  <td>
                    <div className="status-toggle">
                      {ATTENDANCE_STATUSES.map((s) => {
                        const checked = value === s.value;
                        return (
                          <label
                            key={s.value}
                            className={`status-chip tone-${s.color} ${
                              checked ? "checked" : ""
                            }`}
                          >
                            <input
                              type="radio"
                              name={`status_${student.id}`}
                              value={s.value}
                              checked={checked}
                              onChange={() =>
                                setStatuses((prev) => ({
                                  ...prev,
                                  [student.id]: s.value,
                                }))
                              }
                            />
                            <span>{s.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </td>
                  <td>
                    <input
                      type="text"
                      name={`notes_${student.id}`}
                      defaultValue={note}
                      placeholder="ملاحظة مختصرة"
                      maxLength={500}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="form-actions">
          <SubmitButton />
        </div>
      </form>
    </article>
  );
}
