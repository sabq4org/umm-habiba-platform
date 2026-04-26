import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  integer,
  uniqueIndex,
  date,
  boolean,
  index,
} from "drizzle-orm/pg-core";

export const students = pgTable("students", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: varchar("full_name", { length: 160 }).notNull(),
  nationalId: varchar("national_id", { length: 20 }).notNull().unique(),
  grade: varchar("grade", { length: 40 }).notNull(),
  section: varchar("section", { length: 20 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  guardianName: varchar("guardian_name", { length: 160 }),
  guardianPhone: varchar("guardian_phone", { length: 20 }),
  // Personal data
  dateOfBirth: date("date_of_birth"),
  nationality: varchar("nationality", { length: 60 }),
  bloodType: varchar("blood_type", { length: 5 }),
  // Contact
  email: varchar("email", { length: 160 }),
  address: text("address"),
  // Health
  chronicDiseases: text("chronic_diseases"),
  allergies: text("allergies"),
  // Emergency contact
  emergencyContactName: varchar("emergency_contact_name", { length: 160 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 20 }),
  // Academic history
  enrollmentDate: date("enrollment_date"),
  previousSchool: varchar("previous_school", { length: 160 }),
  status: varchar("status", { length: 30 }).default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;

export const teachers = pgTable("teachers", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: varchar("full_name", { length: 160 }).notNull(),
  nationalId: varchar("national_id", { length: 20 }).notNull().unique(),
  specialty: varchar("specialty", { length: 80 }).notNull(),
  subjects: text("subjects"),
  qualification: varchar("qualification", { length: 120 }),
  yearsOfService: integer("years_of_service").default(0).notNull(),
  weeklyLoad: integer("weekly_load").default(0).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 160 }),
  status: varchar("status", { length: 30 }).default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Teacher = typeof teachers.$inferSelect;
export type NewTeacher = typeof teachers.$inferInsert;

export const admins = pgTable("admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: varchar("full_name", { length: 160 }).notNull(),
  nationalId: varchar("national_id", { length: 20 }).notNull().unique(),
  jobTitle: varchar("job_title", { length: 120 }).notNull(),
  department: varchar("department", { length: 120 }).notNull(),
  responsibilities: text("responsibilities"),
  qualification: varchar("qualification", { length: 120 }),
  yearsOfService: integer("years_of_service").default(0).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 160 }),
  status: varchar("status", { length: 30 }).default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;

export const classes = pgTable(
  "classes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    grade: varchar("grade", { length: 40 }).notNull(),
    section: varchar("section", { length: 20 }).notNull(),
    academicYear: varchar("academic_year", { length: 20 }).notNull(),
    homeroomTeacherId: uuid("homeroom_teacher_id").references(() => teachers.id, {
      onDelete: "set null",
    }),
    capacity: integer("capacity").default(30).notNull(),
    room: varchar("room", { length: 40 }),
    status: varchar("status", { length: 30 }).default("active").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    gradeSectionYearUnique: uniqueIndex("classes_grade_section_year_unique").on(
      table.grade,
      table.section,
      table.academicYear,
    ),
  }),
);

export type ClassRow = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;

export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    code: varchar("code", { length: 30 }),
    grade: varchar("grade", { length: 40 }).notNull(),
    weeklyPeriods: integer("weekly_periods").default(3).notNull(),
    teacherId: uuid("teacher_id").references(() => teachers.id, {
      onDelete: "set null",
    }),
    description: text("description"),
    status: varchar("status", { length: 30 }).default("active").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    nameGradeUnique: uniqueIndex("subjects_name_grade_unique").on(
      table.name,
      table.grade,
    ),
  }),
);

export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;

export const scheduleEntries = pgTable(
  "schedule_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id").references(() => teachers.id, {
      onDelete: "set null",
    }),
    dayOfWeek: varchar("day_of_week", { length: 20 }).notNull(),
    period: integer("period").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    classDayPeriodUnique: uniqueIndex("schedule_class_day_period_unique").on(
      table.classId,
      table.dayOfWeek,
      table.period,
    ),
  }),
);

export type ScheduleEntry = typeof scheduleEntries.$inferSelect;
export type NewScheduleEntry = typeof scheduleEntries.$inferInsert;

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    scheduleEntryId: uuid("schedule_entry_id")
      .notNull()
      .references(() => scheduleEntries.id, { onDelete: "cascade" }),
    attendanceDate: date("attendance_date").notNull(),
    status: varchar("status", { length: 20 }).default("present").notNull(),
    notes: text("notes"),
    recordedBy: varchar("recorded_by", { length: 120 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    studentEntryDateUnique: uniqueIndex(
      "attendance_student_entry_date_unique",
    ).on(table.studentId, table.scheduleEntryId, table.attendanceDate),
  }),
);

export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type NewAttendanceRecord = typeof attendanceRecords.$inferInsert;

export const assessments = pgTable(
  "assessments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    kind: varchar("kind", { length: 30 }).default("quiz").notNull(),
    term: varchar("term", { length: 30 }).default("الفصل الأول").notNull(),
    maxScore: integer("max_score").default(100).notNull(),
    weight: integer("weight").default(0).notNull(),
    dueDate: date("due_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    classSubjectTermNameUnique: uniqueIndex(
      "assessments_class_subject_term_name_unique",
    ).on(table.classId, table.subjectId, table.term, table.name),
  }),
);

export type Assessment = typeof assessments.$inferSelect;
export type NewAssessment = typeof assessments.$inferInsert;

export const studentGrades = pgTable(
  "student_grades",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    score: integer("score"),
    notes: text("notes"),
    recordedBy: varchar("recorded_by", { length: 120 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    assessmentStudentUnique: uniqueIndex(
      "student_grades_assessment_student_unique",
    ).on(table.assessmentId, table.studentId),
  }),
);

export type StudentGrade = typeof studentGrades.$inferSelect;
export type NewStudentGrade = typeof studentGrades.$inferInsert;

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: varchar("username", { length: 60 }).notNull(),
    passwordHash: varchar("password_hash", { length: 200 }).notNull(),
    fullName: varchar("full_name", { length: 160 }).notNull(),
    role: varchar("role", { length: 30 }).default("admin").notNull(),
    teacherId: uuid("teacher_id").references(() => teachers.id, {
      onDelete: "set null",
    }),
    studentId: uuid("student_id").references(() => students.id, {
      onDelete: "set null",
    }),
    adminId: uuid("admin_id").references(() => admins.id, {
      onDelete: "set null",
    }),
    status: varchar("status", { length: 20 }).default("active").notNull(),
    mustChangePassword: boolean("must_change_password").default(false).notNull(),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
    failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    lastLoginIp: varchar("last_login_ip", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    usernameUnique: uniqueIndex("users_username_unique").on(table.username),
  }),
);

export type UserRow = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bucket: varchar("bucket", { length: 120 }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    success: boolean("success").default(false).notNull(),
    username: varchar("username", { length: 60 }),
    ip: varchar("ip", { length: 64 }),
    userAgent: varchar("user_agent", { length: 200 }),
  },
  (table) => ({
    bucketIdx: index("login_attempts_bucket_idx").on(table.bucket),
    occurredAtIdx: index("login_attempts_occurred_idx").on(table.occurredAt),
  }),
);

export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type NewLoginAttempt = typeof loginAttempts.$inferInsert;

export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 180 }).notNull(),
    body: text("body").notNull(),
    audience: varchar("audience", { length: 30 }).default("all").notNull(),
    pinned: boolean("pinned").default(false).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdByLabel: varchar("created_by_label", { length: 120 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pinnedIdx: index("announcements_pinned_idx").on(table.pinned),
    audienceIdx: index("announcements_audience_idx").on(table.audience),
  }),
);

export type Announcement = typeof announcements.$inferSelect;
export type NewAnnouncement = typeof announcements.$inferInsert;

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    actorLabel: varchar("actor_label", { length: 160 }),
    action: varchar("action", { length: 60 }).notNull(),
    entity: varchar("entity", { length: 60 }).notNull(),
    entityId: varchar("entity_id", { length: 60 }),
    summary: text("summary"),
    metadata: text("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    entityIdx: index("audit_logs_entity_idx").on(table.entity),
    actionIdx: index("audit_logs_action_idx").on(table.action),
    createdIdx: index("audit_logs_created_idx").on(table.createdAt),
  }),
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    senderUserId: uuid("sender_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    senderLabel: varchar("sender_label", { length: 160 }),
    recipientUserId: uuid("recipient_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    recipientRole: varchar("recipient_role", { length: 30 }),
    subject: varchar("subject", { length: 200 }).notNull(),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    recipientIdx: index("messages_recipient_idx").on(table.recipientUserId),
  }),
);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
