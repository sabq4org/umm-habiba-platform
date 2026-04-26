import {
  BookMarked,
  BookOpen,
  Briefcase,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  Lightbulb,
  Megaphone,
  Plus,
  Sparkles,
  UserRound,
  History,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, count, countDistinct, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { resolveSession } from "@/lib/scope";
import { roleLabel } from "@/lib/roles";

export const dynamic = "force-dynamic";

type Tone = "default" | "mint" | "rose";

type Stat = {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  tone?: Tone;
};

type ModuleItem = {
  title: string;
  description: string;
  progress: number;
  icon: LucideIcon;
  href: string;
};

async function loadStats(): Promise<Stat[]> {
  const [studentsRow] = await db
    .select({
      total: count(schema.students.id),
      sections: countDistinct(schema.students.section),
    })
    .from(schema.students);

  const [teachersRow] = await db
    .select({
      total: count(schema.teachers.id),
      specialties: countDistinct(schema.teachers.specialty),
    })
    .from(schema.teachers);

  const [adminsRow] = await db
    .select({
      total: count(schema.admins.id),
      departments: countDistinct(schema.admins.department),
    })
    .from(schema.admins);

  const [classesRow] = await db
    .select({
      total: count(schema.classes.id),
      years: countDistinct(schema.classes.academicYear),
    })
    .from(schema.classes);

  const [schedulesRow] = await db
    .select({ total: count(schema.scheduleEntries.id) })
    .from(schema.scheduleEntries);

  const [assessmentsRow] = await db
    .select({ total: count(schema.assessments.id) })
    .from(schema.assessments);

  const [gradesRow] = await db
    .select({ total: count(schema.studentGrades.id) })
    .from(schema.studentGrades);

  const studentsTotal = Number(studentsRow?.total ?? 0);
  const sectionsTotal = Number(studentsRow?.sections ?? 0);
  const teachersTotal = Number(teachersRow?.total ?? 0);
  const specialtiesTotal = Number(teachersRow?.specialties ?? 0);
  const adminsTotal = Number(adminsRow?.total ?? 0);
  const departmentsTotal = Number(adminsRow?.departments ?? 0);
  const classesTotal = Number(classesRow?.total ?? 0);
  const yearsTotal = Number(classesRow?.years ?? 0);
  const schedulesTotal = Number(schedulesRow?.total ?? 0);
  const assessmentsTotal = Number(assessmentsRow?.total ?? 0);
  const gradesTotal = Number(gradesRow?.total ?? 0);

  // Use Western Arabic numerals (0-9) with thousands separator; Eastern Arabic
  // digits (٠-٩) read awkwardly in stat cards alongside the Latin-looking icons.
  const fmt = (n: number): string => n.toLocaleString("en-US");

  return [
    {
      label: "الطالبات",
      value: fmt(studentsTotal),
      note: sectionsTotal ? `موزعات على ${fmt(sectionsTotal)} شعبة` : "لم يتم التسجيل بعد",
      icon: GraduationCap,
    },
    {
      label: "المعلمات",
      value: fmt(teachersTotal),
      note: specialtiesTotal ? `${fmt(specialtiesTotal)} تخصص` : "لم يتم التسجيل بعد",
      icon: UserRound,
      tone: "mint",
    },
    {
      label: "الإداريات",
      value: fmt(adminsTotal),
      note: departmentsTotal ? `${fmt(departmentsTotal)} قسم إداري` : "لم يتم التسجيل بعد",
      icon: Briefcase,
      tone: "rose",
    },
    {
      label: "الفصول",
      value: fmt(classesTotal),
      note: schedulesTotal
        ? `${fmt(schedulesTotal)} حصة في الجداول${yearsTotal ? ` · ${fmt(yearsTotal)} عام` : ""}`
        : yearsTotal
        ? `${fmt(yearsTotal)} عام دراسي`
        : "لم يتم التسجيل بعد",
      icon: BookOpen,
    },
    {
      label: "التقييمات",
      value: fmt(assessmentsTotal),
      note: gradesTotal
        ? `${fmt(gradesTotal)} درجة مرصودة`
        : "لم يتم رصد درجات بعد",
      icon: ClipboardCheck,
      tone: "mint",
    },
  ];
}

const modules: ModuleItem[] = [
  {
    title: "ملفات الطالبات",
    description: "بيانات أساسية، ولي الأمر، الحضور، الدرجات، الشهادات، والملاحظات.",
    progress: 72,
    icon: GraduationCap,
    href: "/students",
  },
  {
    title: "ملفات المعلمات",
    description: "التخصص، المواد، النصاب الأسبوعي، الجداول، المؤهلات، والتقييمات.",
    progress: 64,
    icon: UserRound,
    href: "/teachers",
  },
  {
    title: "ملفات الإداريات",
    description: "المسميات الوظيفية، الأقسام، المهام المسندة، وسنوات الخدمة.",
    progress: 60,
    icon: Briefcase,
    href: "/admins",
  },
  {
    title: "الفصول والشعب",
    description: "الصفوف، الشعب، الأعوام، رائدة الفصل، السعة، وقوائم الطالبات.",
    progress: 58,
    icon: BookOpen,
    href: "/classes",
  },
  {
    title: "المواد الدراسية",
    description: "المواد المعتمدة لكل صف، النصاب الأسبوعي، والمعلمة المسؤولة.",
    progress: 55,
    icon: BookMarked,
    href: "/subjects",
  },
  {
    title: "الجداول الدراسية",
    description: "جدول المعلمة والفصل، توزيع الحصص، ومتابعة التعارضات.",
    progress: 65,
    icon: CalendarDays,
    href: "/schedules",
  },
  {
    title: "الحضور والغياب",
    description: "تسجيل الحضور حصة بحصة، متابعة الغياب، وتقارير لكل طالبة.",
    progress: 50,
    icon: ClipboardList,
    href: "/attendance",
  },
  {
    title: "الدرجات والشهادات",
    description: "رصد، مراجعة، اعتماد، إشعار، وإصدار شهادات وتقارير أداء.",
    progress: 75,
    icon: ClipboardCheck,
    href: "/grades",
  },
];

async function loadRecentSubjects() {
  return await db
    .select({
      id: schema.subjects.id,
      name: schema.subjects.name,
      grade: schema.subjects.grade,
      weeklyPeriods: schema.subjects.weeklyPeriods,
      teacherName: schema.teachers.fullName,
    })
    .from(schema.subjects)
    .leftJoin(schema.teachers, eq(schema.subjects.teacherId, schema.teachers.id))
    .orderBy(asc(schema.subjects.grade), asc(schema.subjects.name))
    .limit(6);
}

const educationalTips: Array<{ tip: string; author: string }> = [
  {
    tip: "الكلمة الطيبة من المعلمة قد تغيّر مسار حياة طالبة بأكملها.",
    author: "حكمة تربوية",
  },
  {
    tip: "أفضل الدروس ما حُضِّرت بقلب قبل أن تُلقى بلسان.",
    author: "من رسائل التعليم",
  },
  {
    tip: "الإنصاف بين الطالبات أساس الثقة، وأولى دعائم النجاح في الفصل.",
    author: "من سُنن المربّيات",
  },
  {
    tip: "الاستماع لطالباتك نصف التعليم، والنصف الآخر إيمانك بقدراتهن.",
    author: "حكمة تربوية",
  },
  {
    tip: "اجعلي يومك الدراسي يبدأ بابتسامة، فهي أبسط أدوات النجاح وأبلغها.",
    author: "من فنون التربية",
  },
  {
    tip: "العلم ما نفع لا ما حُفظ. اجعلي درسك يصل القلب قبل أن يصل العقل.",
    author: "حكمة تربوية",
  },
  {
    tip: "كلّ طالبة فيها بصمة فريدة، اكتشفيها لا تُنمّطيها.",
    author: "من رسائل التعليم",
  },
  {
    tip: "التعليم رسالة قبل أن يكون مهنة، وأمانة قبل أن يكون وظيفة.",
    author: "حكمة تربوية",
  },
  {
    tip: "ابدئي حصتك بسؤال يوقظ الفضول، لا بقاعدة تُملّ.",
    author: "من فنون التدريس",
  },
  {
    tip: "احتفلي بالتقدم الصغير، فكل خطوة في الطريق الصحيح إنجاز.",
    author: "من فنون التربية",
  },
  {
    tip: "اللين في الإدارة يفتح أبواباً يعجز عنها كل تشدّد.",
    author: "من سُنن القيادة",
  },
  {
    tip: "الصمت أحياناً أفصح من ألف كلمة في الصف، فاستثمري لحظات التأمل.",
    author: "من فنون التدريس",
  },
];

function pickEducationalTip(): { tip: string; author: string } {
  const minutes = Math.floor(Date.now() / (60 * 1000));
  return educationalTips[minutes % educationalTips.length];
}

function hijriGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "مساء الخير";
  if (hour < 12) return "صباح الخير";
  if (hour < 17) return "مساء النور";
  return "مساء الخير";
}

function todayInArabic(): string {
  const today = new Date();
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(today);
}

async function loadAnnouncements() {
  return await db
    .select({
      id: schema.announcements.id,
      title: schema.announcements.title,
      body: schema.announcements.body,
      audience: schema.announcements.audience,
      createdAt: schema.announcements.createdAt,
    })
    .from(schema.announcements)
    .orderBy(desc(schema.announcements.pinned), desc(schema.announcements.createdAt))
    .limit(3);
}

async function loadRecentAudit() {
  return await db
    .select({
      id: schema.auditLogs.id,
      action: schema.auditLogs.action,
      entity: schema.auditLogs.entity,
      summary: schema.auditLogs.summary,
      actorLabel: schema.auditLogs.actorLabel,
      createdAt: schema.auditLogs.createdAt,
    })
    .from(schema.auditLogs)
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(5);
}

export default async function Home() {
  const session = await resolveSession();
  if (session?.role === "guardian") {
    if (session.studentRecordId) {
      redirect(`/students/${session.studentRecordId}`);
    }
    redirect("/forbidden");
  }
  if (session?.role === "teacher" && session.teacherRecordId) {
    redirect(`/teachers/${session.teacherRecordId}`);
  }

  const [stats, recentSubjects, announcements, audit] = await Promise.all([
    loadStats(),
    loadRecentSubjects(),
    loadAnnouncements(),
    loadRecentAudit(),
  ]);

  const greeting = hijriGreeting();
  const todayLabel = todayInArabic();
  const tip = pickEducationalTip();
  const userName = session?.fullName ?? "";
  const userRoleLabel = session ? roleLabel(session.role) : "";

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <Sparkles size={14} strokeWidth={2} />
            {todayLabel}
          </p>
          <h2 className="page-title">
            {greeting}، {userName}
          </h2>
          <p className="page-subtitle">
            {userRoleLabel
              ? `أهلاً بكِ في منصة أم حبيبة، ${userRoleLabel}. هذي خلاصة سريعة لمدرستك اليوم.`
              : "أهلاً بكِ في منصة أم حبيبة. هذي خلاصة سريعة لمدرستك اليوم."}
          </p>
        </div>

        <div className="top-actions">
          <Link className="button" href="/students/new">
            <Plus size={18} strokeWidth={2} />
            إضافة طالبة
          </Link>
        </div>
      </header>

      <section className="grid stats-grid" aria-label="إحصائيات عامة">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const tone = stat.tone ?? "default";
          return (
            <article className={`card stat-card tone-${tone}`} key={stat.label}>
              <div className="stat-header">
                <span>{stat.label}</span>
                <span className={`icon-badge tone-${tone}`}>
                  <Icon size={20} strokeWidth={1.8} />
                </span>
              </div>
              <div className="stat-value">{stat.value}</div>
              <p className="stat-note">{stat.note}</p>
            </article>
          );
        })}
      </section>

      <section className="grid content-grid">
        <div className="grid">
          <article className="card">
            <div className="section-heading">
              <h2>وحدات العمل الأساسية</h2>
              <span className="pill">MVP المرحلة الأولى</span>
            </div>

            <div className="grid module-grid">
              {modules.map((moduleItem) => {
                const Icon = moduleItem.icon;
                return (
                  <Link className="module-card" href={moduleItem.href} key={moduleItem.title}>
                    <span className="icon-badge">
                      <Icon size={20} strokeWidth={1.8} />
                    </span>
                    <h3>{moduleItem.title}</h3>
                    <p>{moduleItem.description}</p>
                    <div className="progress-row">
                      <span>الجاهزية</span>
                      <span>{moduleItem.progress}%</span>
                    </div>
                    <div className="progress" aria-label={`نسبة جاهزية ${moduleItem.title}`}>
                      <span style={{ width: `${moduleItem.progress}%` }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </article>

          <article className="card">
            <div className="section-heading">
              <h2>المواد المعتمدة حديثا</h2>
              <Link className="ghost-link" href="/subjects">
                عرض الكل
              </Link>
            </div>

            {recentSubjects.length === 0 ? (
              <div className="empty-state">
                <h3>لم يتم اعتماد أي مادة بعد</h3>
                <p>ابدئي بإضافة المواد الدراسية لكل صف.</p>
                <Link className="button" href="/subjects/new">
                  <Plus size={18} strokeWidth={2} />
                  إضافة مادة
                </Link>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>المادة</th>
                      <th>الصف</th>
                      <th>الحصص</th>
                      <th>المعلمة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSubjects.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <Link className="row-link" href={`/subjects/${row.id}`}>
                            {row.name}
                          </Link>
                        </td>
                        <td>{row.grade}</td>
                        <td>{row.weeklyPeriods}</td>
                        <td>{row.teacherName ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </div>

        <aside className="grid">
          <article className="card welcome-card">
            <div className="welcome-header">
              <span className="welcome-avatar">
                {(userName || "م").trim().charAt(0)}
              </span>
              <div>
                <h2>{greeting}، {userName}</h2>
                {userRoleLabel ? (
                  <span className="welcome-role">{userRoleLabel}</span>
                ) : null}
              </div>
            </div>

            <div className="welcome-tip">
              <span className="welcome-tip-badge">
                <Lightbulb size={14} strokeWidth={2} />
                نصيحة اليوم
              </span>
              <p className="welcome-tip-text">“{tip.tip}”</p>
              <span className="welcome-tip-author">— {tip.author}</span>
            </div>

            <div className="welcome-footer">
              <span>{todayLabel}</span>
            </div>
          </article>

          <article className="card">
            <div className="section-heading">
              <h2>آخر الإعلانات</h2>
              <Link href="/announcements" className="ghost-link">
                <Megaphone size={16} strokeWidth={1.8} />
                عرض الكل
              </Link>
            </div>

            <ul className="notice-list">
              {announcements.length === 0 ? (
                <li>
                  <strong>لا توجد إعلانات</strong>
                  <span>أضيفي أول إعلان من صفحة الإعلانات.</span>
                </li>
              ) : (
                announcements.map((a) => (
                  <li key={a.id}>
                    <strong>{a.title}</strong>
                    <span>{a.body.slice(0, 110)}{a.body.length > 110 ? "…" : ""}</span>
                  </li>
                ))
              )}
            </ul>
          </article>

          <article className="card">
            <div className="section-heading">
              <h2>آخر العمليات</h2>
              <Link href="/audit" className="ghost-link">
                <History size={16} strokeWidth={1.8} />
                سجل التدقيق
              </Link>
            </div>

            <ul className="notice-list">
              {audit.length === 0 ? (
                <li>
                  <strong>لا توجد عمليات بعد</strong>
                  <span>سيظهر هنا أي تعديل أو تسجيل دخول.</span>
                </li>
              ) : (
                audit.map((a) => (
                  <li key={a.id}>
                    <strong>{a.actorLabel ?? "النظام"}</strong>
                    <span>{a.summary ?? `${a.action} · ${a.entity}`}</span>
                  </li>
                ))
              )}
            </ul>
          </article>
        </aside>
      </section>
    </>
  );
}
