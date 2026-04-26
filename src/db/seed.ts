import { config as loadEnv } from "dotenv";
import { eq } from "drizzle-orm";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env", override: false });

const sample = [
  {
    fullName: "نوف عبدالله العتيبي",
    nationalId: "1100000001",
    grade: "الأول متوسط",
    section: "1/1",
    guardianName: "عبدالله العتيبي",
    guardianPhone: "0500000001",
    dateOfBirth: "2013-03-14",
    nationality: "سعودية",
    bloodType: "O+",
    email: "nouf@ummhabiba.edu.sa",
    address: "حي النرجس، شارع الأمير سلطان، صبيا",
    chronicDiseases: null,
    allergies: "حساسية فول سوداني",
    emergencyContactName: "خالة الطالبة - منى العتيبي",
    emergencyContactPhone: "0530000001",
    enrollmentDate: "2025-09-01",
    previousSchool: "ابتدائية النور",
  },
  {
    fullName: "ريم سعد الدوسري",
    nationalId: "1100000002",
    grade: "الأول متوسط",
    section: "1/2",
    guardianName: "سعد الدوسري",
    guardianPhone: "0500000002",
    dateOfBirth: "2013-07-22",
    nationality: "سعودية",
    bloodType: "A+",
    email: "reem@ummhabiba.edu.sa",
    address: "حي الياسمين، صبيا",
    chronicDiseases: "ربو خفيف",
    allergies: null,
    emergencyContactName: "العم - فهد الدوسري",
    emergencyContactPhone: "0530000002",
    enrollmentDate: "2025-09-01",
    previousSchool: "ابتدائية الفرسان",
  },
  {
    fullName: "ليان محمد الشمري",
    nationalId: "1100000003",
    grade: "الثاني متوسط",
    section: "2/1",
    guardianName: "محمد الشمري",
    guardianPhone: "0500000003",
    dateOfBirth: "2012-11-08",
    nationality: "سعودية",
    bloodType: "B+",
    email: "layan@ummhabiba.edu.sa",
    address: "حي المروج، شارع التحلية، صبيا",
    chronicDiseases: null,
    allergies: null,
    emergencyContactName: "الأم - فاطمة الشمري",
    emergencyContactPhone: "0530000003",
    enrollmentDate: "2024-09-01",
    previousSchool: "ابتدائية الأمير سلطان",
  },
  {
    fullName: "سارة فهد القحطاني",
    nationalId: "1100000004",
    grade: "الثاني متوسط",
    section: "2/3",
    guardianName: "فهد القحطاني",
    guardianPhone: "0500000004",
    dateOfBirth: "2012-05-30",
    nationality: "سعودية",
    bloodType: "AB+",
    email: "sara@ummhabiba.edu.sa",
    address: "حي الورود، صبيا",
    chronicDiseases: null,
    allergies: "حساسية لاكتوز",
    emergencyContactName: "الجد - عبدالله القحطاني",
    emergencyContactPhone: "0530000004",
    enrollmentDate: "2024-09-01",
    previousSchool: "ابتدائية الفيصل",
  },
  {
    fullName: "غلا ناصر الزهراني",
    nationalId: "1100000005",
    grade: "الثالث متوسط",
    section: "3/1",
    guardianName: "ناصر الزهراني",
    guardianPhone: "0500000005",
    dateOfBirth: "2011-01-19",
    nationality: "سعودية",
    bloodType: "O-",
    email: "ghala@ummhabiba.edu.sa",
    address: "حي العليا، صبيا",
    chronicDiseases: "سكري نوع 1",
    allergies: null,
    emergencyContactName: "الخالة - نورة الزهراني",
    emergencyContactPhone: "0530000005",
    enrollmentDate: "2023-09-01",
    previousSchool: "ابتدائية الخلود",
  },
];

const teacherSample = [
  {
    fullName: "نورة عبدالعزيز السبيعي",
    nationalId: "1200000001",
    specialty: "الرياضيات",
    subjects: "رياضيات الأول والثاني والثالث متوسط",
    qualification: "بكالوريوس رياضيات",
    yearsOfService: 9,
    weeklyLoad: 22,
    phone: "0551111111",
    email: "noura@ummhabiba.edu.sa",
  },
  {
    fullName: "سارة محمد الحربي",
    nationalId: "1200000002",
    specialty: "اللغة العربية",
    subjects: "لغتي الخالدة، النحو، الإملاء",
    qualification: "ماجستير لغة عربية",
    yearsOfService: 12,
    weeklyLoad: 24,
    phone: "0551111112",
    email: "sara@ummhabiba.edu.sa",
  },
  {
    fullName: "مها خالد الدوسري",
    nationalId: "1200000003",
    specialty: "العلوم",
    subjects: "علوم الأول والثاني والثالث متوسط",
    qualification: "بكالوريوس أحياء",
    yearsOfService: 6,
    weeklyLoad: 20,
    phone: "0551111113",
    email: "maha@ummhabiba.edu.sa",
  },
  {
    fullName: "ريم فيصل القحطاني",
    nationalId: "1200000004",
    specialty: "اللغة الإنجليزية",
    subjects: "إنجليزي الأول والثاني والثالث متوسط",
    qualification: "بكالوريوس لغة إنجليزية",
    yearsOfService: 4,
    weeklyLoad: 22,
    phone: "0551111114",
    email: "reem@ummhabiba.edu.sa",
  },
];

const adminSample = [
  {
    fullName: "فاطمة عبدالفتاح",
    nationalId: "1300000001",
    jobTitle: "مديرة المدرسة",
    department: "الإدارة العليا",
    responsibilities: "الإشراف العام، اعتماد القرارات، متابعة الأداء",
    qualification: "بكالوريوس إدارة تربوية",
    yearsOfService: 18,
    phone: "0552222221",
    email: "fatima@ummhabiba.edu.sa",
  },
  {
    fullName: "أمل سلطان الراشد",
    nationalId: "1300000002",
    jobTitle: "وكيلة المدرسة",
    department: "الشؤون التعليمية",
    responsibilities: "متابعة الجداول والمعلمات والطالبات",
    qualification: "بكالوريوس تربية",
    yearsOfService: 14,
    phone: "0552222222",
    email: "amal@ummhabiba.edu.sa",
  },
  {
    fullName: "نوال إبراهيم الغامدي",
    nationalId: "1300000003",
    jobTitle: "سكرتيرة",
    department: "الشؤون الإدارية",
    responsibilities: "تنظيم الملفات، استقبال المراجعين، المراسلات",
    qualification: "دبلوم سكرتارية",
    yearsOfService: 7,
    phone: "0552222223",
    email: "nawal@ummhabiba.edu.sa",
  },
  {
    fullName: "هند ماجد الزهراني",
    nationalId: "1300000004",
    jobTitle: "أمينة المكتبة",
    department: "الشؤون التعليمية",
    responsibilities: "إدارة المكتبة، الإعارة، البرامج القرائية",
    qualification: "بكالوريوس مكتبات",
    yearsOfService: 5,
    phone: "0552222224",
    email: "hind@ummhabiba.edu.sa",
  },
  {
    fullName: "روان فهد المالكي",
    nationalId: "1300000005",
    jobTitle: "محاسبة",
    department: "الشؤون المالية",
    responsibilities: "الميزانية، المصروفات، التقارير المالية",
    qualification: "بكالوريوس محاسبة",
    yearsOfService: 9,
    phone: "0552222225",
    email: "rawan@ummhabiba.edu.sa",
  },
];

const classSample: Array<{
  grade: string;
  section: string;
  academicYear: string;
  capacity: number;
  room: string;
}> = [
  { grade: "الأول متوسط", section: "1/1", academicYear: "1447هـ", capacity: 35, room: "A-101" },
  { grade: "الأول متوسط", section: "1/2", academicYear: "1447هـ", capacity: 35, room: "A-102" },
  { grade: "الأول متوسط", section: "1/3", academicYear: "1447هـ", capacity: 35, room: "A-103" },
  { grade: "الأول متوسط", section: "1/4", academicYear: "1447هـ", capacity: 35, room: "A-104" },
  { grade: "الأول متوسط", section: "1/5", academicYear: "1447هـ", capacity: 35, room: "A-105" },
  { grade: "الأول متوسط", section: "1/6", academicYear: "1447هـ", capacity: 35, room: "A-106" },
  { grade: "الثاني متوسط", section: "2/1", academicYear: "1447هـ", capacity: 28, room: "B-201" },
  { grade: "الثاني متوسط", section: "2/2", academicYear: "1447هـ", capacity: 28, room: "B-202" },
  { grade: "الثاني متوسط", section: "2/3", academicYear: "1447هـ", capacity: 28, room: "B-203" },
  { grade: "الثالث متوسط", section: "3/1", academicYear: "1447هـ", capacity: 26, room: "C-301" },
  { grade: "الثالث متوسط", section: "3/2", academicYear: "1447هـ", capacity: 26, room: "C-302" },
];

type SubjectSeed = {
  name: string;
  code: string;
  grade: string;
  weeklyPeriods: number;
  description: string;
};

const subjectSample: SubjectSeed[] = [
  { name: "الرياضيات", code: "MATH-1", grade: "الأول متوسط", weeklyPeriods: 5, description: "الأعداد والأنماط، الكسور، الهندسة الأساسية" },
  { name: "اللغة العربية", code: "ARA-1", grade: "الأول متوسط", weeklyPeriods: 4, description: "لغتي الخالدة - النحو والإملاء والقراءة" },
  { name: "اللغة الإنجليزية", code: "ENG-1", grade: "الأول متوسط", weeklyPeriods: 4, description: "Lift Off Level 1" },
  { name: "العلوم", code: "SCI-1", grade: "الأول متوسط", weeklyPeriods: 4, description: "العلوم الطبيعية - الكائنات الحية والمادة" },
  { name: "الرياضيات", code: "MATH-2", grade: "الثاني متوسط", weeklyPeriods: 5, description: "الجبر والمعادلات والإحصاء" },
  { name: "اللغة العربية", code: "ARA-2", grade: "الثاني متوسط", weeklyPeriods: 4, description: "لغتي الخالدة - الأدب والتعبير" },
  { name: "العلوم", code: "SCI-2", grade: "الثاني متوسط", weeklyPeriods: 4, description: "علوم الأرض والفضاء والطاقة" },
  { name: "الرياضيات", code: "MATH-3", grade: "الثالث متوسط", weeklyPeriods: 5, description: "الجبر المتقدم والهندسة وحل المعادلات" },
  { name: "اللغة الإنجليزية", code: "ENG-3", grade: "الثالث متوسط", weeklyPeriods: 4, description: "Super Goal Level 3" },
];

async function run() {
  const { db, schema } = await import("./index");

  const existingStudents = await db.select().from(schema.students);
  if (existingStudents.length === 0) {
    await db.insert(schema.students).values(sample);
    console.log(`تمت إضافة ${sample.length} طالبة`);
  } else {
    // Backfill the new personal/health/contact fields for existing seeded
    // students whenever they're still null. Looks them up by national_id so
    // it stays idempotent and won't overwrite real edits.
    let backfilled = 0;
    for (const seedRow of sample) {
      const existing = existingStudents.find(
        (s) => s.nationalId === seedRow.nationalId,
      );
      if (!existing) continue;
      const updates: Record<string, unknown> = {};
      if (!existing.dateOfBirth && seedRow.dateOfBirth)
        updates.dateOfBirth = seedRow.dateOfBirth;
      if (!existing.nationality && seedRow.nationality)
        updates.nationality = seedRow.nationality;
      if (!existing.bloodType && seedRow.bloodType)
        updates.bloodType = seedRow.bloodType;
      if (!existing.email && seedRow.email) updates.email = seedRow.email;
      if (!existing.address && seedRow.address) updates.address = seedRow.address;
      if (!existing.chronicDiseases && seedRow.chronicDiseases)
        updates.chronicDiseases = seedRow.chronicDiseases;
      if (!existing.allergies && seedRow.allergies)
        updates.allergies = seedRow.allergies;
      if (!existing.emergencyContactName && seedRow.emergencyContactName)
        updates.emergencyContactName = seedRow.emergencyContactName;
      if (!existing.emergencyContactPhone && seedRow.emergencyContactPhone)
        updates.emergencyContactPhone = seedRow.emergencyContactPhone;
      if (!existing.enrollmentDate && seedRow.enrollmentDate)
        updates.enrollmentDate = seedRow.enrollmentDate;
      if (!existing.previousSchool && seedRow.previousSchool)
        updates.previousSchool = seedRow.previousSchool;
      if (Object.keys(updates).length > 0) {
        await db
          .update(schema.students)
          .set(updates)
          .where(eq(schema.students.id, existing.id));
        backfilled += 1;
      }
    }
    if (backfilled > 0) {
      console.log(`تم تعبئة الحقول الإضافية لـ ${backfilled} طالبة موجودة`);
    } else {
      console.log(`تخطي الطالبات: يوجد ${existingStudents.length} مسجلة`);
    }
  }

  const existingTeachers = await db.select().from(schema.teachers);
  if (existingTeachers.length === 0) {
    await db.insert(schema.teachers).values(teacherSample);
    console.log(`تمت إضافة ${teacherSample.length} معلمة`);
  } else {
    console.log(`تخطي المعلمات: يوجد ${existingTeachers.length} مسجلة`);
  }

  const existingAdmins = await db.select().from(schema.admins);
  if (existingAdmins.length === 0) {
    await db.insert(schema.admins).values(adminSample);
    console.log(`تمت إضافة ${adminSample.length} إدارية`);
  } else {
    // Backfill: rename the seeded principal to the current name when she
    // still carries an older placeholder from a previous seed.
    const adminUpdates: Array<Promise<unknown>> = [];
    const oldPrincipalNames = new Set([
      "هيا عبدالرحمن العنزي",
      "د. حنان المطيري",
    ]);
    for (const a of existingAdmins) {
      if (
        a.jobTitle === "مديرة المدرسة" &&
        oldPrincipalNames.has(a.fullName)
      ) {
        adminUpdates.push(
          db
            .update(schema.admins)
            .set({
              fullName: "فاطمة عبدالفتاح",
              qualification: "بكالوريوس إدارة تربوية",
              email: "fatima@ummhabiba.edu.sa",
            })
            .where(eq(schema.admins.id, a.id)),
        );
      }
    }
    if (adminUpdates.length > 0) {
      await Promise.all(adminUpdates);
      console.log(`تم تحديث ${adminUpdates.length} سجل إدارية`);
    } else {
      console.log(`تخطي الإداريات: يوجد ${existingAdmins.length} مسجلة`);
    }
  }

  const existingClasses = await db.select().from(schema.classes);
  if (existingClasses.length === 0) {
    await db.insert(schema.classes).values(classSample);
    console.log(`تمت إضافة ${classSample.length} فصل`);
  } else {
    console.log(`تخطي الفصول: يوجد ${existingClasses.length} مسجل`);
  }

  const existingSubjects = await db.select().from(schema.subjects);
  if (existingSubjects.length === 0) {
    const allTeachers = await db.select().from(schema.teachers);
    const findTeacher = (specialty: string) =>
      allTeachers.find((teacher) => teacher.specialty === specialty)?.id ?? null;

    const enriched = subjectSample.map((subject) => {
      let teacherId: string | null = null;
      if (subject.name === "الرياضيات") teacherId = findTeacher("الرياضيات");
      else if (subject.name === "اللغة العربية")
        teacherId = findTeacher("اللغة العربية");
      else if (subject.name === "اللغة الإنجليزية")
        teacherId = findTeacher("اللغة الإنجليزية");
      else if (subject.name === "العلوم") teacherId = findTeacher("العلوم");

      return { ...subject, teacherId };
    });

    await db.insert(schema.subjects).values(enriched);
    console.log(`تمت إضافة ${enriched.length} مادة`);
  } else {
    console.log(`تخطي المواد: يوجد ${existingSubjects.length} مسجلة`);
  }

  const existingSchedules = await db.select().from(schema.scheduleEntries);
  if (existingSchedules.length === 0) {
    const allClasses = await db.select().from(schema.classes);
    const allSubjects = await db.select().from(schema.subjects);

    const findClass = (grade: string, section: string) =>
      allClasses.find((c) => c.grade === grade && c.section === section);
    const findSubject = (name: string, grade: string) =>
      allSubjects.find((s) => s.name === name && s.grade === grade);

    const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];

    const scheduleEntries: Array<{
      classId: string;
      subjectId: string;
      teacherId: string | null;
      dayOfWeek: string;
      period: number;
    }> = [];

    type Plan = { grade: string; section: string; subjectsOrder: string[] };

    const plans: Plan[] = [
      {
        grade: "الأول متوسط",
        section: "1/1",
        subjectsOrder: ["الرياضيات", "اللغة العربية", "اللغة الإنجليزية", "العلوم"],
      },
      {
        grade: "الثاني متوسط",
        section: "2/1",
        subjectsOrder: ["الرياضيات", "اللغة العربية", "العلوم"],
      },
      {
        grade: "الثالث متوسط",
        section: "3/1",
        subjectsOrder: ["الرياضيات", "اللغة الإنجليزية"],
      },
    ];

    for (const plan of plans) {
      const cls = findClass(plan.grade, plan.section);
      if (!cls) continue;

      const dayForClass = plan.grade === "الأول متوسط"
        ? "الأحد"
        : plan.grade === "الثاني متوسط"
        ? "الاثنين"
        : "الثلاثاء";

      const dayIndex = days.indexOf(dayForClass);
      const dayName = dayIndex >= 0 ? days[dayIndex] : days[0];

      plan.subjectsOrder.forEach((subjectName, idx) => {
        const subj = findSubject(subjectName, plan.grade);
        if (!subj) return;
        scheduleEntries.push({
          classId: cls.id,
          subjectId: subj.id,
          teacherId: subj.teacherId ?? null,
          dayOfWeek: dayName,
          period: idx + 1,
        });
      });
    }

    if (scheduleEntries.length > 0) {
      await db.insert(schema.scheduleEntries).values(scheduleEntries);
      console.log(`تمت إضافة ${scheduleEntries.length} حصة في الجداول`);
    } else {
      console.log("تخطي جداول الحصص: لم يتم إنشاء بيانات نموذجية");
    }
  } else {
    console.log(`تخطي جداول الحصص: يوجد ${existingSchedules.length} حصة مسجلة`);
  }

  const existingAttendance = await db.select().from(schema.attendanceRecords);
  if (existingAttendance.length === 0) {
    const allEntries = await db.select().from(schema.scheduleEntries);
    const allClasses = await db.select().from(schema.classes);
    const allStudents = await db.select().from(schema.students);

    const dayMap: Record<string, number> = {
      "الأحد": 0,
      "الاثنين": 1,
      "الثلاثاء": 2,
      "الأربعاء": 3,
      "الخميس": 4,
    };

    function nearestDate(targetDow: number): string {
      const today = new Date();
      const todayDow = today.getDay();
      const diff = ((todayDow - targetDow) + 7) % 7;
      const date = new Date(today);
      date.setDate(today.getDate() - (diff === 0 ? 7 : diff));
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    type AttRow = {
      studentId: string;
      scheduleEntryId: string;
      attendanceDate: string;
      status: string;
      recordedBy: string;
    };

    const records: AttRow[] = [];
    for (const entry of allEntries) {
      const cls = allClasses.find((c) => c.id === entry.classId);
      if (!cls) continue;
      const studentsInClass = allStudents.filter(
        (s) => s.grade === cls.grade && s.section === cls.section,
      );
      if (studentsInClass.length === 0) continue;
      const dow = dayMap[entry.dayOfWeek] ?? 0;
      const date = nearestDate(dow);
      studentsInClass.forEach((student, idx) => {
        const status =
          idx === 0 ? "absent" : idx === 1 ? "late" : "present";
        records.push({
          studentId: student.id,
          scheduleEntryId: entry.id,
          attendanceDate: date,
          status,
          recordedBy: "نظام البذر",
        });
      });
    }

    if (records.length > 0) {
      await db.insert(schema.attendanceRecords).values(records);
      console.log(`تمت إضافة ${records.length} سجل حضور تجريبي`);
    } else {
      console.log("تخطي الحضور: لا توجد بيانات كافية");
    }
  } else {
    console.log(
      `تخطي الحضور: يوجد ${existingAttendance.length} سجل حضور`,
    );
  }

  const existingAssessments = await db.select().from(schema.assessments);
  if (existingAssessments.length === 0) {
    const allClasses = await db.select().from(schema.classes);
    const allSubjects = await db.select().from(schema.subjects);

    type AssessmentRow = {
      classId: string;
      subjectId: string;
      name: string;
      kind: string;
      term: string;
      maxScore: number;
      weight: number;
    };

    const rows: AssessmentRow[] = [];
    for (const cls of allClasses.slice(0, 5)) {
      const subs = allSubjects.filter((s) => s.grade === cls.grade);
      for (const sub of subs.slice(0, 3)) {
        rows.push({
          classId: cls.id,
          subjectId: sub.id,
          name: "اختبار قصير 1",
          kind: "quiz",
          term: "الفصل الأول",
          maxScore: 20,
          weight: 20,
        });
        rows.push({
          classId: cls.id,
          subjectId: sub.id,
          name: "اختبار شهري",
          kind: "monthly",
          term: "الفصل الأول",
          maxScore: 30,
          weight: 30,
        });
        rows.push({
          classId: cls.id,
          subjectId: sub.id,
          name: "اختبار نهائي",
          kind: "final",
          term: "الفصل الأول",
          maxScore: 50,
          weight: 50,
        });
      }
    }

    if (rows.length > 0) {
      await db.insert(schema.assessments).values(rows);
      console.log(`تمت إضافة ${rows.length} تقييم`);
    } else {
      console.log("تخطي التقييمات: لا توجد بيانات كافية");
    }
  } else {
    console.log(
      `تخطي التقييمات: يوجد ${existingAssessments.length} تقييم`,
    );
  }

  const existingUsers = await db.select().from(schema.users);
  const allTeachers = await db.select().from(schema.teachers);
  const allStudents = await db.select().from(schema.students);
  const linkTeacher =
    allTeachers.find((t) => t.fullName === "نورة عبدالعزيز السبيعي") ??
    allTeachers[0];
  const linkStudent = allStudents[0];

  if (existingUsers.length === 0) {
    const { hashPassword } = await import("../lib/auth");
    const adminPass = await hashPassword("admin1234");
    const staffPass = await hashPassword("staff1234");
    const teacherPass = await hashPassword("teacher1234");
    const guardianPass = await hashPassword("guardian1234");

    await db.insert(schema.users).values([
      {
        username: "admin",
        passwordHash: adminPass,
        fullName: "فاطمة عبدالفتاح",
        role: "admin",
      },
      {
        username: "staff",
        passwordHash: staffPass,
        fullName: "وكيلة المدرسة",
        role: "staff",
      },
      {
        username: "teacher",
        passwordHash: teacherPass,
        fullName: linkTeacher?.fullName ?? "نورة عبدالعزيز السبيعي",
        role: "teacher",
        teacherId: linkTeacher?.id ?? null,
      },
      ...(linkStudent
        ? [
            {
              username: "guardian",
              passwordHash: guardianPass,
              fullName: linkStudent.guardianName ?? "ولي أمر",
              role: "guardian",
              studentId: linkStudent.id,
            },
          ]
        : []),
    ]);
    console.log(
      `تمت إضافة حسابات تجريبية: admin / staff / teacher${
        linkStudent ? " / guardian" : ""
      }`,
    );
  } else {
    // Backfill links/role for existing demo accounts (idempotent).
    const updates: Array<Promise<unknown>> = [];
    for (const u of existingUsers) {
      if (u.username === "teacher" && !u.teacherId && linkTeacher?.id) {
        updates.push(
          db
            .update(schema.users)
            .set({ teacherId: linkTeacher.id, role: "teacher" })
            .where(eq(schema.users.id, u.id)),
        );
      }
      // Replace older principal placeholders with the current name.
      if (
        u.username === "admin" &&
        (u.fullName === "مديرة المدرسة" || u.fullName === "د. حنان المطيري")
      ) {
        updates.push(
          db
            .update(schema.users)
            .set({ fullName: "فاطمة عبدالفتاح" })
            .where(eq(schema.users.id, u.id)),
        );
      }
      if (u.username === "staff" && u.fullName === "وكيلة المدرسة") {
        updates.push(
          db
            .update(schema.users)
            .set({ fullName: "أ. أمل الراشد" })
            .where(eq(schema.users.id, u.id)),
        );
      }
    }
    // Optionally add a guardian demo user if missing.
    const hasGuardian = existingUsers.some((u) => u.username === "guardian");
    if (!hasGuardian && linkStudent) {
      const { hashPassword } = await import("../lib/auth");
      const guardianPass = await hashPassword("guardian1234");
      updates.push(
        db.insert(schema.users).values({
          username: "guardian",
          passwordHash: guardianPass,
          fullName: linkStudent.guardianName ?? "ولي أمر",
          role: "guardian",
          studentId: linkStudent.id,
        }),
      );
    }
    if (updates.length > 0) {
      await Promise.all(updates);
      console.log(
        `تم تحديث ${updates.length} حساب لربط الدور (teacher/guardian)`,
      );
    } else {
      console.log(`تخطي المستخدمات: يوجد ${existingUsers.length} حساب`);
    }
  }

  const existingAnnouncements = await db.select().from(schema.announcements);
  if (existingAnnouncements.length === 0) {
    await db.insert(schema.announcements).values([
      {
        title: "بدء الفصل الدراسي الأول",
        body: "نرحب بطالباتنا وأسرة المدرسة في عام دراسي جديد، ونتمنى للجميع التوفيق.",
        audience: "all",
        pinned: true,
        createdByLabel: "مديرة المدرسة",
      },
      {
        title: "تذكير بمواعيد اختبارات منتصف الفصل",
        body: "تبدأ اختبارات منتصف الفصل بعد أسبوعين، يرجى الاستعداد ومراجعة الجداول.",
        audience: "students",
        createdByLabel: "وكيلة المدرسة",
      },
      {
        title: "اجتماع المعلمات الأسبوعي",
        body: "اجتماع المعلمات يوم الأحد القادم في الساعة 12:00 ظهراً بقاعة الاجتماعات.",
        audience: "teachers",
        createdByLabel: "وكيلة المدرسة",
      },
    ]);
    console.log("تمت إضافة 3 إعلانات");
  } else {
    console.log(
      `تخطي الإعلانات: يوجد ${existingAnnouncements.length} إعلان`,
    );
  }

  const regrade = process.env.SEED_REGRADE === "1";
  const existingGrades = await db.select().from(schema.studentGrades);
  if (existingGrades.length === 0 || regrade) {
    if (regrade && existingGrades.length > 0) {
      await db.delete(schema.studentGrades);
      console.log(
        `حذف ${existingGrades.length} درجة قديمة لإعادة الرصد (SEED_REGRADE=1)`,
      );
    }
    const allAssessments = await db.select().from(schema.assessments);
    const allClasses = await db.select().from(schema.classes);
    const allStudents = await db.select().from(schema.students);

    // Per-student baseline performance, deterministic but spread across all
    // grade bands so reports show a realistic mix (ممتاز / جيد جدًا / جيد / مقبول / ضعيف).
    const performanceProfile: Record<string, number> = {};
    const profileBands = [0.96, 0.91, 0.86, 0.78, 0.7, 0.62, 0.56];
    allStudents.forEach((student, idx) => {
      performanceProfile[student.id] = profileBands[idx % profileBands.length];
    });

    type GradeRow = {
      assessmentId: string;
      studentId: string;
      score: number;
      recordedBy: string;
    };

    const rows: GradeRow[] = [];
    for (const a of allAssessments) {
      const cls = allClasses.find((c) => c.id === a.classId);
      if (!cls) continue;
      const studentsInClass = allStudents.filter(
        (s) => s.grade === cls.grade && s.section === cls.section,
      );
      studentsInClass.forEach((student) => {
        const baseline = performanceProfile[student.id] ?? 0.75;
        // Small assessment-specific variation (-4 .. +4 percentage points)
        // so not every score is identical, but the band stays consistent.
        const variation =
          (((student.id.charCodeAt(0) + a.maxScore + a.weight) % 9) - 4) / 100;
        const ratio = Math.min(1, Math.max(0, baseline + variation));
        const score = Math.min(
          a.maxScore,
          Math.max(0, Math.round(a.maxScore * ratio)),
        );
        rows.push({
          assessmentId: a.id,
          studentId: student.id,
          score,
          recordedBy: "نظام البذر",
        });
      });
    }

    if (rows.length > 0) {
      await db.insert(schema.studentGrades).values(rows);
      console.log(`تمت إضافة ${rows.length} درجة طالبة`);
    } else {
      console.log("تخطي الدرجات: لا توجد بيانات كافية");
    }
  } else {
    console.log(
      `تخطي الدرجات: يوجد ${existingGrades.length} درجة (SEED_REGRADE=1 لإعادة الرصد)`,
    );
  }
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("فشل الـ seed:", error);
    process.exit(1);
  });
