import { redirect } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import {
  Award,
  BookOpen,
  Cake,
  CalendarDays,
  ClipboardCheck,
  Droplet,
  Globe,
  GraduationCap,
  Heart,
  IdCard,
  LogOut,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  ShieldCheck,
  StickyNote,
  UserRound,
  Users,
} from "lucide-react";
import { db, schema } from "@/db";
import { getInquiryStudentId } from "@/lib/inquiry";
import {
  bandFor,
  pctFromScore,
  TERMS,
  kindLabel,
} from "@/app/(app)/grades/constants";
import { endInquiryAction } from "../actions";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

function maskNationalId(id: string): string {
  if (id.length <= 4) return id;
  return `${"•".repeat(id.length - 4)}${id.slice(-4)}`;
}

function formatDay(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "long" }).format(date);
}

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years -= 1;
  return years;
}

export default async function InquiryProfilePage() {
  const studentId = await getInquiryStudentId();
  if (!studentId) {
    redirect("/inquiry");
  }

  const [student] = await db
    .select()
    .from(schema.students)
    .where(eq(schema.students.id, studentId))
    .limit(1);

  if (!student) {
    redirect("/inquiry");
  }

  /* ---------------- Attendance summary ---------------- */
  const attendanceBreakdown = await db
    .select({
      status: schema.attendanceRecords.status,
      total: count(schema.attendanceRecords.id),
    })
    .from(schema.attendanceRecords)
    .where(eq(schema.attendanceRecords.studentId, student.id))
    .groupBy(schema.attendanceRecords.status);

  const attMap = new Map(
    attendanceBreakdown.map((row) => [row.status, Number(row.total)]),
  );
  const attTotal = Array.from(attMap.values()).reduce((s, v) => s + v, 0);
  const attPresent = attMap.get("present") ?? 0;
  const attAbsent = attMap.get("absent") ?? 0;
  const attLate = attMap.get("late") ?? 0;
  const attExcused = attMap.get("excused") ?? 0;
  const attPct =
    attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 0;

  /* ---------------- Grades by term + subject ---------------- */
  const gradesRows = await db
    .select({
      assessmentId: schema.assessments.id,
      assessmentName: schema.assessments.name,
      kind: schema.assessments.kind,
      term: schema.assessments.term,
      maxScore: schema.assessments.maxScore,
      weight: schema.assessments.weight,
      subjectName: schema.subjects.name,
      score: schema.studentGrades.score,
    })
    .from(schema.assessments)
    .innerJoin(
      schema.classes,
      eq(schema.assessments.classId, schema.classes.id),
    )
    .innerJoin(
      schema.subjects,
      eq(schema.assessments.subjectId, schema.subjects.id),
    )
    .leftJoin(
      schema.studentGrades,
      and(
        eq(schema.studentGrades.assessmentId, schema.assessments.id),
        eq(schema.studentGrades.studentId, student.id),
      ),
    )
    .where(
      and(
        eq(schema.classes.grade, student.grade),
        eq(schema.classes.section, student.section),
      ),
    );

  type AssessmentRow = (typeof gradesRows)[number];
  const byTermSubject = new Map<string, Map<string, AssessmentRow[]>>();
  for (const row of gradesRows) {
    if (!byTermSubject.has(row.term)) byTermSubject.set(row.term, new Map());
    const inner = byTermSubject.get(row.term)!;
    if (!inner.has(row.subjectName)) inner.set(row.subjectName, []);
    inner.get(row.subjectName)!.push(row);
  }

  const totalAvgPct = (() => {
    const pcts = gradesRows
      .filter((r) => r.score !== null)
      .map((r) => pctFromScore(r.score, r.maxScore))
      .filter((p): p is number => p !== null);
    if (pcts.length === 0) return null;
    return (
      Math.round((pcts.reduce((s, v) => s + v, 0) / pcts.length) * 10) / 10
    );
  })();
  const totalBand = bandFor(totalAvgPct);

  return (
    <div className="inquiry-shell">
      <div className="inquiry-container">
        <header className="inquiry-topbar">
          <div>
            <p className="eyebrow">
              <ShieldCheck size={14} strokeWidth={2} />
              تم التحقق
            </p>
            <h1 className="page-title">{student.fullName}</h1>
            <p className="page-subtitle">
              ملف بيانات الطالبة كما هو مسجل في منصة متوسطة أم حبيبة التعليمية.
            </p>
          </div>
          <div className="top-actions inquiry-top-actions">
            <PrintButton />
            <form action={endInquiryAction}>
              <button type="submit" className="ghost-button">
                <LogOut size={16} strokeWidth={2} />
                إنهاء الاستعلام
              </button>
            </form>
          </div>
        </header>

        {/* Hero */}
        <section className="card profile-hero">
          <div className="profile-avatar">{student.fullName.charAt(0)}</div>
          <div className="profile-hero-body">
            <div className="profile-hero-row">
              <h3>{student.fullName}</h3>
              <span className="status good">فعّالة</span>
            </div>
            <div className="profile-meta">
              <span>
                <IdCard size={16} strokeWidth={1.8} />
                <span className="mono">{maskNationalId(student.nationalId)}</span>
              </span>
              <span>
                <BookOpen size={16} strokeWidth={1.8} />
                {student.grade}
              </span>
              <span>
                <Users size={16} strokeWidth={1.8} />
                شعبة {student.section}
              </span>
            </div>
          </div>
        </section>

        <section className="grid profile-grid">
          {/* Personal */}
          <article className="card">
            <div className="section-heading">
              <h2>البيانات الشخصية</h2>
              <span className="pill">أساسية</span>
            </div>
            <dl className="info-list">
              <div>
                <dt>
                  <UserRound size={16} strokeWidth={1.8} />
                  الاسم الكامل
                </dt>
                <dd>{student.fullName}</dd>
              </div>
              <div>
                <dt>
                  <IdCard size={16} strokeWidth={1.8} />
                  رقم الهوية
                </dt>
                <dd className="mono">{maskNationalId(student.nationalId)}</dd>
              </div>
              <div>
                <dt>
                  <Cake size={16} strokeWidth={1.8} />
                  تاريخ الميلاد
                </dt>
                <dd>
                  {formatDay(student.dateOfBirth)}
                  {ageFromDob(student.dateOfBirth) !== null
                    ? ` (${ageFromDob(student.dateOfBirth)} سنة)`
                    : ""}
                </dd>
              </div>
              <div>
                <dt>
                  <Globe size={16} strokeWidth={1.8} />
                  الجنسية
                </dt>
                <dd>{student.nationality ?? "—"}</dd>
              </div>
              <div>
                <dt>
                  <Droplet size={16} strokeWidth={1.8} />
                  فصيلة الدم
                </dt>
                <dd>{student.bloodType ?? "—"}</dd>
              </div>
            </dl>
          </article>

          {/* Academic */}
          <article className="card">
            <div className="section-heading">
              <h2>الشأن الأكاديمي</h2>
              <span className="pill">دراسي</span>
            </div>
            <dl className="info-list">
              <div>
                <dt>
                  <BookOpen size={16} strokeWidth={1.8} />
                  الصف
                </dt>
                <dd>{student.grade}</dd>
              </div>
              <div>
                <dt>
                  <Users size={16} strokeWidth={1.8} />
                  الشعبة
                </dt>
                <dd>{student.section}</dd>
              </div>
              <div>
                <dt>
                  <CalendarDays size={16} strokeWidth={1.8} />
                  تاريخ الالتحاق
                </dt>
                <dd>{formatDay(student.enrollmentDate)}</dd>
              </div>
              <div>
                <dt>
                  <GraduationCap size={16} strokeWidth={1.8} />
                  المدرسة السابقة
                </dt>
                <dd>{student.previousSchool ?? "—"}</dd>
              </div>
            </dl>
          </article>

          {/* Contact */}
          <article className="card">
            <div className="section-heading">
              <h2>بيانات التواصل</h2>
              <span className="pill tone-mint">للتواصل</span>
            </div>
            <dl className="info-list">
              <div>
                <dt>
                  <Phone size={16} strokeWidth={1.8} />
                  الجوال
                </dt>
                <dd className="mono">{student.phone ?? "—"}</dd>
              </div>
              <div>
                <dt>
                  <Mail size={16} strokeWidth={1.8} />
                  البريد الإلكتروني
                </dt>
                <dd className="mono">{student.email ?? "—"}</dd>
              </div>
              <div>
                <dt>
                  <MapPin size={16} strokeWidth={1.8} />
                  العنوان
                </dt>
                <dd>{student.address ?? "—"}</dd>
              </div>
            </dl>
          </article>

          {/* Guardian */}
          <article className="card">
            <div className="section-heading">
              <h2>ولي الأمر</h2>
              <span className="pill tone-mint">للتواصل</span>
            </div>
            <dl className="info-list">
              <div>
                <dt>
                  <UserRound size={16} strokeWidth={1.8} />
                  الاسم
                </dt>
                <dd>{student.guardianName ?? "—"}</dd>
              </div>
              <div>
                <dt>
                  <Phone size={16} strokeWidth={1.8} />
                  الجوال
                </dt>
                <dd className="mono">{student.guardianPhone ?? "—"}</dd>
              </div>
            </dl>
          </article>

          {/* Emergency */}
          <article className="card">
            <div className="section-heading">
              <h2>جهة الاتصال للطوارئ</h2>
              <ShieldAlert
                size={18}
                strokeWidth={1.8}
                color="var(--accent-strong)"
              />
            </div>
            <dl className="info-list">
              <div>
                <dt>
                  <UserRound size={16} strokeWidth={1.8} />
                  الاسم
                </dt>
                <dd>{student.emergencyContactName ?? "—"}</dd>
              </div>
              <div>
                <dt>
                  <Phone size={16} strokeWidth={1.8} />
                  الجوال
                </dt>
                <dd className="mono">
                  {student.emergencyContactPhone ?? "—"}
                </dd>
              </div>
            </dl>
          </article>

          {/* Health */}
          <article className="card">
            <div className="section-heading">
              <h2>البيانات الصحية</h2>
              <Heart size={18} strokeWidth={1.8} color="var(--accent-strong)" />
            </div>
            <dl className="info-list">
              <div>
                <dt>
                  <Droplet size={16} strokeWidth={1.8} />
                  فصيلة الدم
                </dt>
                <dd>{student.bloodType ?? "—"}</dd>
              </div>
              <div>
                <dt>
                  <Heart size={16} strokeWidth={1.8} />
                  أمراض مزمنة
                </dt>
                <dd>{student.chronicDiseases ?? "—"}</dd>
              </div>
              <div>
                <dt>
                  <ShieldAlert size={16} strokeWidth={1.8} />
                  الحساسية
                </dt>
                <dd>{student.allergies ?? "—"}</dd>
              </div>
            </dl>
          </article>

          {/* Attendance summary */}
          <article className="card">
            <div className="section-heading">
              <h2>الحضور والغياب</h2>
              <CalendarDays
                size={18}
                strokeWidth={1.8}
                color="var(--accent-strong)"
              />
            </div>
            {attTotal === 0 ? (
              <div className="placeholder">
                <CalendarDays size={28} strokeWidth={1.6} />
                <p>لم تُسجّل أي حصة لك بعد.</p>
              </div>
            ) : (
              <>
                <div className="profile-progress">
                  <div className="profile-progress-label">
                    <span>نسبة الحضور</span>
                    <strong>{attPct}%</strong>
                  </div>
                  <div className="profile-progress-bar">
                    <div
                      className="profile-progress-fill"
                      style={{ width: `${attPct}%` }}
                    />
                  </div>
                  <p className="muted-text">
                    {attPresent} حاضرة من أصل {attTotal} حصة مسجلة
                  </p>
                </div>
                <div className="legend-row">
                  <span className="pill tone-mint">حاضرة: {attPresent}</span>
                  <span className="pill tone-rose">غائبة: {attAbsent}</span>
                  <span className="pill tone-amber">متأخرة: {attLate}</span>
                  <span className="pill">بعذر: {attExcused}</span>
                </div>
              </>
            )}
          </article>

          {/* Grades summary card */}
          <article className="card">
            <div className="section-heading">
              <h2>المعدّل العام</h2>
              <Award size={18} strokeWidth={1.8} color="var(--accent-strong)" />
            </div>
            {gradesRows.length === 0 ? (
              <div className="placeholder">
                <ClipboardCheck size={28} strokeWidth={1.6} />
                <p>لا توجد تقييمات مرصودة لفصلك بعد.</p>
              </div>
            ) : (
              <>
                <div className="profile-progress">
                  <div className="profile-progress-label">
                    <span>المعدل العام</span>
                    <strong>
                      {totalAvgPct !== null ? `${totalAvgPct}%` : "—"}
                    </strong>
                  </div>
                  <div className="profile-progress-bar">
                    <div
                      className="profile-progress-fill"
                      style={{ width: `${totalAvgPct ?? 0}%` }}
                    />
                  </div>
                </div>
                <div className="legend-row">
                  <span className={`pill tone-${totalBand.tone}`}>
                    {totalBand.label}
                  </span>
                </div>
              </>
            )}
          </article>
        </section>

        {/* Grades by term */}
        <section className="card field-full">
          <div className="section-heading">
            <h2>الدرجات حسب الفترات</h2>
            <ClipboardCheck
              size={18}
              strokeWidth={1.8}
              color="var(--accent-strong)"
            />
          </div>

          {gradesRows.length === 0 ? (
            <div className="empty-state">
              <h3>لا توجد درجات مرصودة بعد</h3>
              <p>سيتم عرض درجاتك هنا فور رصدها من قِبل المعلمات.</p>
            </div>
          ) : (
            <div className="inquiry-terms">
              {TERMS.map((term) => {
                const termSubjects = byTermSubject.get(term);
                if (!termSubjects || termSubjects.size === 0) return null;
                return (
                  <div key={term} className="inquiry-term">
                    <h3 className="inquiry-term-title">{term}</h3>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>المادة</th>
                            <th>التقييم</th>
                            <th>النوع</th>
                            <th>الدرجة</th>
                            <th>من</th>
                            <th>النسبة</th>
                            <th>التقدير</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from(termSubjects.entries()).map(
                            ([subject, rows]) =>
                              rows.map((row, idx) => {
                                const pct = pctFromScore(row.score, row.maxScore);
                                const band = bandFor(pct);
                                return (
                                  <tr key={`${subject}-${row.assessmentId}`}>
                                    <td>
                                      {idx === 0 ? (
                                        <strong>{subject}</strong>
                                      ) : (
                                        <span className="muted-text">
                                          {subject}
                                        </span>
                                      )}
                                    </td>
                                    <td>{row.assessmentName}</td>
                                    <td>{kindLabel(row.kind)}</td>
                                    <td className="mono">
                                      {row.score ?? "—"}
                                    </td>
                                    <td className="mono">{row.maxScore}</td>
                                    <td className="mono">
                                      {pct !== null ? `${pct}%` : "—"}
                                    </td>
                                    <td>
                                      <span className={`pill tone-${band.tone}`}>
                                        {band.label}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              }),
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Notes */}
        {student.notes ? (
          <section className="card field-full">
            <div className="section-heading">
              <h2>ملاحظات</h2>
              <StickyNote
                size={18}
                strokeWidth={1.8}
                color="var(--accent-strong)"
              />
            </div>
            <p className="notes-text">{student.notes}</p>
          </section>
        ) : null}

        <p className="inquiry-footer no-print">
          هذا الاستعلام آمن بإذن الله، تنتهي صلاحية الجلسة تلقائيا بعد 30 دقيقة
          من عدم النشاط.
        </p>
      </div>
    </div>
  );
}

