"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Save } from "lucide-react";
import {
  recordGradesAction,
  type GradesFormState,
} from "../../actions";
import { bandFor, pctFromScore } from "../../constants";

type StudentRow = {
  id: string;
  fullName: string;
  nationalId: string;
};

type ExistingMap = Record<string, { score: number | null; notes: string }>;

type Props = {
  assessmentId: string;
  maxScore: number;
  students: StudentRow[];
  existing: ExistingMap;
};

const initial: GradesFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="button" disabled={pending}>
      <Save size={16} strokeWidth={2} />
      {pending ? "جاري الحفظ…" : "حفظ الدرجات"}
    </button>
  );
}

export default function RecordGradesForm({
  assessmentId,
  maxScore,
  students,
  existing,
}: Props) {
  const action = recordGradesAction.bind(null, assessmentId);
  const [state, formAction] = useActionState(action, initial);

  const [scores, setScores] = useState<Record<string, string>>(() => {
    const initialScores: Record<string, string> = {};
    for (const student of students) {
      const value = existing[student.id]?.score;
      initialScores[student.id] = value === null || value === undefined ? "" : String(value);
    }
    return initialScores;
  });

  const numericScores = Object.values(scores)
    .map((s) => (s === "" ? null : Number(s)))
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const graded = numericScores.length;
  const avg = graded > 0
    ? numericScores.reduce((a, b) => a + b, 0) / graded
    : 0;
  const avgPct = graded > 0 ? Math.round((avg / maxScore) * 1000) / 10 : 0;

  return (
    <article className="card">
      <form action={formAction} className="grades-form">
        {state?.error && <div className="form-error">{state.error}</div>}

        <div className="attendance-toolbar">
          <div className="legend-row">
            <span className="pill">المرصودات: {graded}/{students.length}</span>
            <span className="pill tone-mint">متوسط: {avgPct}%</span>
            <span className="pill">الدرجة العظمى: {maxScore}</span>
          </div>
        </div>

        <label className="recorder-field">
          <span>اسم المسجِّلة (اختياري)</span>
          <input
            type="text"
            name="recordedBy"
            placeholder="مثلاً: أ. نورة الرياضيات"
            maxLength={120}
          />
        </label>

        <table className="data-table grades-table">
          <thead>
            <tr>
              <th>#</th>
              <th>الطالبة</th>
              <th>الدرجة (من {maxScore})</th>
              <th>النسبة</th>
              <th>التقدير</th>
              <th>ملاحظة</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, idx) => {
              const value = scores[student.id] ?? "";
              const numeric = value === "" ? null : Number(value);
              const pct = pctFromScore(numeric, maxScore);
              const band = bandFor(pct);
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
                    <input
                      type="number"
                      name={`score_${student.id}`}
                      min={0}
                      max={maxScore}
                      step={1}
                      value={value}
                      onChange={(event) =>
                        setScores((prev) => ({
                          ...prev,
                          [student.id]: event.target.value,
                        }))
                      }
                      placeholder="—"
                      className="score-input"
                    />
                  </td>
                  <td>{pct !== null ? `${pct}%` : "—"}</td>
                  <td>
                    <span className={`pill tone-${band.tone}`}>
                      {band.label}
                    </span>
                  </td>
                  <td>
                    <input
                      type="text"
                      name={`notes_${student.id}`}
                      defaultValue={note}
                      placeholder="ملاحظة"
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
