import Link from "next/link";
import { Pencil } from "lucide-react";
import { DAYS_OF_WEEK, PERIODS, type DayOfWeek } from "./constants";

export type TimetableCell = {
  id: string;
  subjectName: string;
  subjectGrade?: string;
  teacherName?: string | null;
  className?: string | null;
  classId?: string | null;
  teacherId?: string | null;
  notes?: string | null;
};

export type TimetableMap = Map<string, TimetableCell>;

export function makeTimetableMap(
  entries: Array<{
    id: string;
    dayOfWeek: string;
    period: number;
    subjectName: string;
    subjectGrade?: string;
    teacherName?: string | null;
    className?: string | null;
    classId?: string | null;
    teacherId?: string | null;
    notes?: string | null;
  }>,
): TimetableMap {
  const map: TimetableMap = new Map();
  for (const entry of entries) {
    map.set(`${entry.dayOfWeek}__${entry.period}`, {
      id: entry.id,
      subjectName: entry.subjectName,
      subjectGrade: entry.subjectGrade,
      teacherName: entry.teacherName ?? null,
      className: entry.className ?? null,
      classId: entry.classId ?? null,
      teacherId: entry.teacherId ?? null,
      notes: entry.notes ?? null,
    });
  }
  return map;
}

export function TimetableGrid({
  entries,
  mode,
  showEditLinks = false,
}: {
  entries: TimetableMap;
  mode: "class" | "teacher";
  showEditLinks?: boolean;
}) {
  return (
    <div className="timetable-wrap">
      <table className="timetable">
        <thead>
          <tr>
            <th className="timetable-corner">اليوم \ الحصة</th>
            {PERIODS.map((period) => (
              <th key={period}>الحصة {period}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS_OF_WEEK.map((day) => (
            <tr key={day}>
              <th scope="row" className="timetable-day">
                {day}
              </th>
              {PERIODS.map((period) => {
                const cell = entries.get(`${day as DayOfWeek}__${period}`);
                if (!cell) {
                  return (
                    <td key={period} className="timetable-cell empty">
                      —
                    </td>
                  );
                }
                return (
                  <td key={period} className="timetable-cell filled">
                    <div className="timetable-subject">{cell.subjectName}</div>
                    {mode === "class" && cell.teacherName ? (
                      <div className="timetable-meta">{cell.teacherName}</div>
                    ) : null}
                    {mode === "teacher" && cell.className ? (
                      <div className="timetable-meta">{cell.className}</div>
                    ) : null}
                    {showEditLinks ? (
                      <Link
                        className="timetable-edit"
                        href={`/schedules/${cell.id}/edit`}
                        aria-label={`تعديل حصة ${cell.subjectName}`}
                      >
                        <Pencil size={12} strokeWidth={2} />
                      </Link>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
