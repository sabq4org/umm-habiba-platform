# دليل منصة أم حبيبة التعليمية الشامل

> ملف مرجعي يجمع كل ما يخص المشروع: التعريفات، البنية، الوحدات، الصلاحيات، السكيما،
> الصفحات، الأمان، التشغيل، والحسابات التجريبية. هذا الملف هو نقطة البداية لأي شخص
> ينضم للمشروع أو يريد فهم أي جزء منه.

---

## 1. التعريف العام

| الحقل | القيمة |
|------|--------|
| الاسم الرسمي | متوسطة أم حبيبة التعليمية - صبيا |
| الاسم القصير | منصة أم حبيبة التعليمية |
| الاسم التقني | `umm-habiba-platform` |
| الوصف | منصة داخلية متكاملة لإدارة العمليات المدرسية |
| اللغة | العربية (واجهة RTL) |
| المستخدمات المستهدفات | المديرة، الإداريات، المعلمات، أولياء الأمور |
| النموذج | تطبيق Next.js يعتمد على قاعدة بيانات PostgreSQL |

### الهدف
توحيد بيانات المدرسة وعملياتها اليومية في نظام واضح وآمن، مع صلاحيات دقيقة لكل
فئة مستخدمة، وسجل متابعة للعمليات الحساسة، ودعم التقارير والتصدير.

---

## 2. التقنيات (Tech Stack)

| الطبقة | التقنية |
|------|--------|
| الإطار | Next.js 16 (App Router + Server Components + Server Actions + Turbopack) |
| اللغة | TypeScript |
| الواجهة | React 19 + CSS عالمي مخصص (RTL) |
| الأيقونات | lucide-react |
| قاعدة البيانات | PostgreSQL (Neon Serverless) |
| ORM | Drizzle ORM (`drizzle-orm` + `drizzle-kit`) |
| المصادقة | جلسات HMAC SHA-256 موقّعة في كوكي + scrypt لكلمات المرور |
| التحقق | درايزل + تحقق يدوي في الـ Server Actions |
| التدقيق | جدول `audit_logs` يدوي عبر `logAudit` |
| الترميز | UTF-8 (دعم كامل للعربية) |
| النشر المقترح | Vercel + Neon |

---

## 3. هيكل المشروع

```
umm-habiba-platform/
├─ 01-docs/                  # وثائق الفكرة والمتطلبات والصلاحيات
├─ 02-design/                # الهوية البصرية والألوان
├─ 03-data-model/            # تصور البيانات المبدئي
├─ 04-modules/               # تقسيم الوحدات الوظيفية
├─ 05-ui-pages/              # وصف الصفحات
├─ 06-security/              # سياسات الأمان والخصوصية
├─ 07-reports/               # التقارير والتحليلات
├─ 08-future-features/       # أفكار مستقبلية
├─ drizzle.config.ts         # إعداد Drizzle Kit
├─ next.config.ts            # إعداد Next.js
├─ src/
│  ├─ app/
│  │  ├─ (app)/              # كل الصفحات بعد تسجيل الدخول (محمية)
│  │  ├─ (auth)/             # صفحة تسجيل الدخول
│  │  ├─ change-password/    # تغيير كلمة المرور (إجباري عند أول دخول)
│  │  ├─ api/export/         # تصدير CSV
│  │  ├─ globals.css         # كل ستايل المنصة
│  │  └─ layout.tsx          # تخطيط الجذر
│  ├─ components/
│  │  ├─ AppShell.tsx        # الإطار العام (شريط جانبي + شريط علوي)
│  │  └─ Sidebar.tsx         # قائمة التنقل
│  ├─ db/
│  │  ├─ index.ts            # اتصال Neon
│  │  ├─ schema.ts           # تعريف كل الجداول
│  │  └─ seed.ts             # بيانات تجريبية
│  ├─ lib/
│  │  ├─ audit.ts            # تسجيل العمليات في audit_logs
│  │  ├─ auth.ts             # المصادقة وإدارة الجلسة
│  │  ├─ csrf.ts             # حماية CSRF
│  │  ├─ csv.ts              # توليد ملفات CSV
│  │  ├─ loginGuard.ts       # تحديد المعدل وقفل الحسابات
│  │  ├─ passwordPolicy.ts   # سياسة كلمة المرور
│  │  ├─ permissions.ts      # نظام الصلاحيات (RBAC)
│  │  ├─ requestSecurity.ts  # تحقق Origin/Referer واستخراج IP
│  │  ├─ roles.ts            # الأدوار ومصفوفة العرض
│  │  └─ scope.ts            # تقييد البيانات حسب الدور
│  └─ middleware.ts          # حماية المسارات (طبقة 1)
├─ PROJECT_GUIDE.md          # هذا الملف
└─ README.md                 # تعريف مختصر
```

---

## 4. الأدوار (Roles) — أربع فئات

| القيمة | التسمية | الوصف |
|------|--------|--------|
| `admin` | مديرة | صلاحيات كاملة على كل شيء بما فيها إدارة المستخدمات |
| `staff` | إدارية / وكيلة | كل شيء عدا إدارة المستخدمات وحذف المعلمات والإداريات |
| `teacher` | معلمة | فصولها فقط: حضورها، درجات طالباتها، جدولها |
| `guardian` | ولية أمر | بيانات طالبتها فقط: درجات، حضور، شهادات، رسائل، إعلانات |

ملف التعريف: `src/lib/roles.ts`.

---

## 5. الصلاحيات (Permissions / RBAC)

### المفاتيح
يوجد ٣٤ مفتاح صلاحية مُعرَّف في `src/lib/permissions.ts` بصيغة `<entity>.<action>`:

```
dashboard.read
students.read | students.write | students.delete
teachers.read | teachers.write | teachers.delete
admins.read | admins.write | admins.delete
classes.read | classes.write | classes.delete
subjects.read | subjects.write | subjects.delete
schedules.read | schedules.write | schedules.delete
attendance.read | attendance.write
grades.read | grades.write
announcements.read | announcements.write | announcements.delete
messages.read | messages.write
reports.read
search.read
audit.read
settings.read
users.read | users.write | users.delete
export.run
```

### مصفوفة الصلاحيات

| المفتاح | admin | staff | teacher | guardian |
|--------|:-----:|:-----:|:-------:|:--------:|
| dashboard.read | ✅ | ✅ | ✅ | ✅ |
| students.read | ✅ | ✅ | ✅ (فصولها) | ✅ (طالبتها) |
| students.write/delete | ✅ | ✅ | ❌ | ❌ |
| teachers.read | ✅ | ✅ | ✅ | ❌ |
| teachers.write | ✅ | ✅ | ❌ | ❌ |
| teachers.delete | ✅ | ❌ | ❌ | ❌ |
| admins.read | ✅ | ✅ | ❌ | ❌ |
| admins.write/delete | ✅ | ❌ | ❌ | ❌ |
| classes.* | ✅ | ✅ (read/write/delete) | ✅ (read) | ❌ |
| subjects.* | ✅ | ✅ | ✅ (read) | ❌ |
| schedules.* | ✅ | ✅ | ✅ (read فقط جدولها) | ❌ |
| attendance.read/write | ✅ | ✅ | ✅ (فصولها) | ✅ (read طالبتها) |
| grades.read/write | ✅ | ✅ | ✅ (طالباتها) | ✅ (read طالبتها) |
| announcements.* | ✅ | ✅ | ✅ (read) | ✅ (read) |
| messages.read/write | ✅ | ✅ | ✅ | ✅ |
| reports.read | ✅ | ✅ | ✅ (محدود) | ❌ |
| search.read | ✅ | ✅ | ✅ | ❌ |
| audit.read | ✅ | ✅ | ❌ | ❌ |
| settings.read | ✅ | ✅ | ❌ | ❌ |
| users.* | ✅ | ❌ | ❌ | ❌ |
| export.run | ✅ | ✅ | ❌ | ❌ |

### الدوال المساعدة

| الدالة | الموقع | الاستخدام |
|------|--------|--------|
| `can(role, key)` | داخل أي مكان | فحص بسيط بدون أثر جانبي |
| `canAny(role, [keys])` | داخل أي مكان | فحص لأي مفتاح من قائمة |
| `requirePermission(key)` | في الصفحات | إن لم تتوفر يحوّل إلى `/forbidden` |
| `requireAnyPermission([keys])` | في الصفحات | تحويل إذا لم يملك أي مفتاح |
| `requireRole(role)` | في الصفحات | تحويل إذا لم يطابق الدور |
| `assertPermission(key)` | في Server Actions | يرمي `ForbiddenError` بدل التحويل |

### تقييد البيانات حسب الدور (`src/lib/scope.ts`)
- `resolveSession()`: يضمّ `studentId/teacherId/adminId` المرتبطة بالحساب.
- `isUnrestricted(role)`: true لـ admin/staff.
- `teacherStudentIds(teacherId)`: قائمة طالبات معلمة معينة عبر فصولها.
- `teacherClassIds(teacherId)`: قائمة فصول معلمة معينة.
- `canTeacherAccessScheduleEntry(...)`: تأكيد وصول المعلمة لحصة.
- `guardianCanAccessStudent(session, studentId)`: تأكيد وصول ولية الأمر للطالبة.

---

## 6. السكيما (قاعدة البيانات)

### الجداول الأساسية

#### `students` — الطالبات
| الحقل | النوع | ملاحظات |
|------|------|--------|
| id | uuid | PK |
| full_name | varchar(160) | اسم الطالبة |
| national_id | varchar(20) | unique |
| grade | varchar(40) | المرحلة |
| section | varchar(20) | الشعبة |
| phone | varchar(20) | nullable |
| guardian_name | varchar(160) | nullable |
| guardian_phone | varchar(20) | nullable |
| status | varchar(30) | active/inactive |
| notes | text | ملاحظات |
| created_at, updated_at | timestamptz | تلقائي |

#### `teachers` — المعلمات
يضم: `full_name, national_id, specialty, subjects, qualification, years_of_service, weekly_load, phone, email, status, notes`.

#### `admins` — الإداريات
يضم: `full_name, national_id, job_title, department, responsibilities, qualification, years_of_service, phone, email, status, notes`.

#### `classes` — الفصول
يضم: `grade, section, academic_year, homeroom_teacher_id (FK→teachers), capacity, room, status, notes`. مفتاح فريد على (grade+section+academic_year).

#### `subjects` — المواد
يضم: `name, code, grade, weekly_periods, teacher_id (FK→teachers), description, status, notes`. مفتاح فريد على (name+grade).

#### `schedule_entries` — حصص الجداول
يضم: `class_id (FK→classes, cascade), subject_id (FK→subjects, cascade), teacher_id (FK→teachers), day_of_week, period, notes`. مفتاح فريد على (class_id+day_of_week+period).

#### `attendance_records` — سجلات الحضور
يضم: `student_id (FK→students, cascade), schedule_entry_id (FK, cascade), attendance_date, status (present/absent/late/excused), notes, recorded_by`. مفتاح فريد على (student_id+schedule_entry_id+attendance_date).

#### `assessments` — التقييمات
يضم: `class_id, subject_id, name, kind (quiz/monthly/final/...), term, max_score, weight, due_date, notes`. مفتاح فريد على (class_id+subject_id+term+name).

#### `student_grades` — درجات الطالبات
يضم: `assessment_id (FK, cascade), student_id (FK, cascade), score, notes, recorded_by`. مفتاح فريد على (assessment_id+student_id).

#### `users` — حسابات الدخول
| الحقل | النوع | ملاحظات |
|------|------|--------|
| id | uuid | PK |
| username | varchar(60) | unique, lowercase |
| password_hash | varchar(200) | scrypt |
| full_name | varchar(160) | |
| role | varchar(30) | admin/staff/teacher/guardian |
| teacher_id | uuid | FK→teachers (set null) |
| student_id | uuid | FK→students (set null) — لولية الأمر |
| admin_id | uuid | FK→admins (set null) |
| status | varchar(20) | active/disabled |
| **must_change_password** | boolean | إجبار تغيير عند أول دخول |
| **password_changed_at** | timestamptz | آخر تغيير |
| **failed_login_attempts** | integer | عدد المحاولات الفاشلة المتتالية |
| **locked_until** | timestamptz | متى يُفتح القفل |
| **last_login_ip** | varchar(64) | آخر IP |
| last_login_at | timestamptz | آخر دخول |
| created_at, updated_at | timestamptz | |

#### `login_attempts` — سجل محاولات الدخول
يضم: `bucket (ip+username), occurred_at, success, username, ip, user_agent`. فهارس على (bucket) و (occurred_at).

#### `announcements` — الإعلانات
يضم: `title, body, audience (all/teachers/guardians/students), pinned, expires_at, created_by_user_id, created_by_label`.

#### `messages` — الرسائل الداخلية
يضم: `sender_user_id, sender_label, recipient_user_id, recipient_role, subject, body, read_at`.

#### `audit_logs` — سجل التدقيق
يضم: `actor_user_id, actor_label, action, entity, entity_id, summary, metadata, created_at`. فهارس على (entity, action, created_at).

---

## 7. الوحدات (Modules) — ١٤ وحدة

| الوحدة | المسار | المسؤولية |
|------|------|--------|
| لوحة التحكم | `/` | مؤشرات سريعة + اختصارات + حالة العمل |
| الطالبات | `/students` | CRUD + ملف شخصي + ربط بولي الأمر |
| المعلمات | `/teachers` | CRUD + جدول كل معلمة + ربط بحساب |
| الإداريات | `/admins` | CRUD للكادر الإداري |
| الفصول | `/classes` | فصول وشعب وروّاد فصل |
| المواد | `/subjects` | مواد دراسية مرتبطة بمعلمات |
| الجداول | `/schedules` | بناء الجداول الأسبوعية + جدول كل فصل/معلمة |
| الحضور | `/attendance` | تسجيل ومتابعة حضور كل حصة |
| الدرجات | `/grades` | تقييمات + رصد الدرجات + شهادات |
| الإعلانات | `/announcements` | إعلانات داخلية مع جمهور وصلاحية |
| الرسائل | `/messages` | تواصل بين الفئات |
| التقارير | `/reports` | لوحات تحليلية: متفوقات، حضور، أداء |
| البحث الموحّد | `/search` | بحث في كل الكيانات |
| سجل التدقيق | `/audit` | كل العمليات الحساسة |
| الصلاحيات | `/permissions` | عرض مصفوفة الصلاحيات |
| الإعدادات | `/settings` و `/settings/users` | إدارة المستخدمات |

---

## 8. الصفحات (Routes) — جميع المسارات

### المصادقة
| المسار | الوصف |
|------|--------|
| `/login` | تسجيل الدخول (مع CSRF) |
| `/change-password` | تغيير كلمة المرور (إجباري أو طوعي) |

### لوحة الإدارة
| المسار | الوصف |
|------|--------|
| `/` | لوحة التحكم الرئيسية |
| `/forbidden` | صفحة "ليس لديك صلاحية" |
| `/permissions` | عرض مصفوفة الصلاحيات |

### الطالبات
- `/students` — قائمة + زر تصدير CSV
- `/students/new` — إضافة طالبة
- `/students/[id]` — ملف الطالبة الكامل
- `/students/[id]/edit` — تعديل + حذف

### المعلمات
- `/teachers`, `/teachers/new`, `/teachers/[id]`, `/teachers/[id]/edit`

### الإداريات
- `/admins`, `/admins/new`, `/admins/[id]`, `/admins/[id]/edit`

### الفصول
- `/classes`, `/classes/new`, `/classes/[id]`, `/classes/[id]/edit`

### المواد
- `/subjects`, `/subjects/new`, `/subjects/[id]`, `/subjects/[id]/edit`

### الجداول
- `/schedules` — فهرس
- `/schedules/new`, `/schedules/[id]/edit`
- `/schedules/class/[classId]` — جدول فصل معين
- `/schedules/teacher/[teacherId]` — جدول معلمة معينة

### الحضور
- `/attendance` — فهرس بالفصول
- `/attendance/class/[classId]` — فصل معين
- `/attendance/record/[entryId]` — تسجيل حصة
- `/attendance/student/[studentId]` — تاريخ طالبة

### الدرجات
- `/grades`, `/grades/assessment/new`
- `/grades/assessment/[id]` — رصد درجات
- `/grades/assessment/[id]/edit` — تعديل تقييم
- `/grades/class/[classId]` — درجات فصل
- `/grades/class/[classId]/subject/[subjectId]` — مادة معينة
- `/grades/student/[studentId]` — درجات طالبة
- `/grades/student/[studentId]/certificate` — شهادة قابلة للطباعة

### الباقي
- `/announcements`, `/messages`
- `/reports`, `/search`, `/audit`
- `/settings`, `/settings/users`

### API
- `/api/export/students` (CSV)
- `/api/export/teachers` (CSV)
- `/api/export/admins` (CSV)
- `/api/export/attendance?classId=&from=&to=` (CSV)
- `/api/export/grades?classId=&subjectId=&term=` (CSV)

---

## 9. الأمان (طبقات متعددة)

### 9.1 المصادقة
- كلمات المرور: scrypt مع salt عشوائي 16 بايت ومخرج 64 بايت.
- الجلسات: كوكي `umh_session` تحتوي JSON موقّع HMAC-SHA-256 صلاحيتها 7 أيام.
- متغير البيئة `AUTH_SECRET` يُستخدم لتوقيع الجلسات (إلزامي في الإنتاج).

### 9.2 الميدلوير (`src/middleware.ts`)
طبقة أولى تحمي كل المسارات (عدا `/login`)؛ تطلب وجود كوكي الجلسة وإلا تحول إلى `/login?from=...`.

### 9.3 الصلاحيات على مستوى الإجراء/الصفحة
- كل صفحة حساسة تستدعي `requirePermission(key)`.
- كل Server Action يستدعي `assertPermission(key)`.
- المعلمات وولي الأمر يخضعون لتقييد بيانات إضافي عبر `src/lib/scope.ts`.

### 9.4 سياسة كلمة المرور (`src/lib/passwordPolicy.ts`)
| القيد | القيمة |
|------|--------|
| الطول الأدنى | 10 أحرف |
| الطول الأقصى | 128 |
| حروف لاتينية كبيرة | إلزامي |
| حروف لاتينية صغيرة | إلزامي |
| أرقام | إلزامي |
| رموز خاصة | إلزامي |
| مسافات | ممنوعة |

### 9.5 إجبار تغيير كلمة المرور
- عند إنشاء حساب من `/settings/users` → `must_change_password = true`.
- عند إعادة التعيين بواسطة المسؤولة → `must_change_password = true`.
- عند الدخول، إذا كانت `mustChangePassword`، يحوَّل المستخدم إلى `/change-password?required=1` قبل الوصول لأي صفحة (الفحص في `AppShell`).

### 9.6 قفل الحساب وتحديد المعدل (`src/lib/loginGuard.ts`)
| المعيار | القيمة |
|------|--------|
| قفل الحساب | بعد 5 محاولات فاشلة → 15 دقيقة |
| تحديد المعدل (IP+username) | 8 محاولات فاشلة في 15 دقيقة |
| تنظيف المحاولات القديمة | كل ما هو أقدم من 24 ساعة |

تُسجَّل كل محاولة في `login_attempts`. الإدارة تستطيع فك القفل من `/settings/users`.

### 9.7 حماية CSRF (`src/lib/csrf.ts`)
- توكن double-submit في كوكي `umh_csrf` + حقل مخفي.
- مقارنة `timingSafeEqual` لمنع timing attacks.
- صلاحيته 12 ساعة.

### 9.8 تحقق Origin/Referer (`src/lib/requestSecurity.ts`)
كل طلب لـ `signInAction` يُتحقق فيه أن `Origin` (أو `Referer` كاحتياطي) يطابق الـ `Host` الحالي. يمكن إضافة origins إضافية عبر متغير البيئة `AUTH_ALLOWED_ORIGINS`.

### 9.9 سجل التدقيق
كل عملية حساسة (إنشاء/تعديل/حذف/دخول/خروج/تغيير كلمة مرور) تُكتب في `audit_logs` عبر `logAudit({ action, entity, entityId, summary, actor })`.

---

## 10. التصدير (CSV) — `src/lib/csv.ts` و `/api/export/*`

- يولد UTF-8 مع BOM لدعم العربية في Excel.
- يقتبس الحقول التي تحتوي فاصلة/علامة اقتباس/سطر جديد.
- محمي بالصلاحية `export.run` (admin + staff فقط).
- الكيانات المدعومة: students, teachers, admins, attendance (مع فلاتر from/to/classId), grades (مع فلاتر classId/subjectId/term).

---

## 11. التشغيل والتطوير

### 11.1 المتطلبات
- Node.js ≥ 20
- قاعدة بيانات PostgreSQL (يفضل Neon)

### 11.2 متغيرات البيئة (`.env.local`)
```
DATABASE_URL=postgresql://...
AUTH_SECRET=<عشوائي طويل>
AUTH_ALLOWED_ORIGINS=https://your-prod-domain   # اختياري
AUTH_ALLOW_MISSING_ORIGIN=0                     # لا تفعّليه إلا للضرورة
```

### 11.3 الأوامر
| الأمر | الوصف |
|------|--------|
| `npm install` | تثبيت الحزم |
| `npm run dev` | تشغيل الخادم محلياً (Turbopack) |
| `npm run build` | بناء النسخة الإنتاجية |
| `npm start` | تشغيل النسخة الإنتاجية |
| `npm run lint` | فحص ESLint |
| `npm run db:push` | تطبيق السكيما على Neon |
| `npm run db:studio` | فتح Drizzle Studio |
| `npm run db:seed` | بذر بيانات تجريبية |
| `SEED_REGRADE=1 npm run db:seed` | إعادة بذر الدرجات بتوزيع متنوع |

### 11.4 التطوير اليومي
1. أي تعديل على السكيما: حدّث `src/db/schema.ts` → `npx drizzle-kit push --force`.
2. أي صفحة جديدة محمية: ضع `requirePermission(...)` في أعلى الصفحة.
3. أي Server Action: ضع `assertPermission(...)` كأول سطر.
4. للتصدير: أضف route تحت `/api/export/...` يستخدم `assertPermission("export.run")` و`csvResponse`.

### 11.5 النشر على Vercel (الموصى به)
1. ربط المستودع من Vercel Dashboard (Import → اختيار `umm-habiba-platform`).
2. ضبط متغيرات البيئة في Project Settings → Environment Variables:
   - `DATABASE_URL` (من Neon Console، يفضّل سلسلة `pooler`).
   - `AUTH_SECRET` (سلسلة عشوائية طويلة، مثلاً `openssl rand -hex 32`).
   - `AUTH_ALLOWED_ORIGINS` (اختياري) إذا استخدمتِ نطاقاً مخصصاً.
3. أول دفع للسكيما والبيانات (مرة واحدة، من جهازك):
   ```bash
   DATABASE_URL="<قيمة Neon>" npx drizzle-kit push --force
   DATABASE_URL="<قيمة Neon>" npm run db:seed
   ```
4. عند كل دفع لـ `main`، يبني Vercel نسخة الإنتاج تلقائياً.

> ملاحظة: تم إصلاح خلل `ETIMEDOUT` المحتمل عبر `dns.setDefaultResultOrder("ipv4first")` في `src/db/index.ts`.

### 11.6 فحص صحة النشر
- `GET /api/healthz` — فحص خفيف بدون قاعدة بيانات (ينفع لمراقبة وقت التشغيل).
- `GET /api/healthz/db?key=<AUTH_SECRET>` — يتأكد من وجود الجداول وأن المسؤولة `admin` موجودة.

---

## 12. الحسابات التجريبية (بعد `npm run db:seed`)

| المستخدم | كلمة المرور | الدور | المرتبط بـ |
|------|------|------|--------|
| admin | admin1234 | مديرة | — |
| staff | staff1234 | إدارية | — |
| teacher | teacher1234 | معلمة | نورة عبدالعزيز السبيعي |
| guardian | guardian1234 | ولية أمر | نوف عبدالله العتيبي |

> ملاحظة: حسابات البذر لا تُجبر على تغيير كلمة المرور لتسهيل التجربة.
> أما أي حساب يُنشأ من `/settings/users` فسيُجبر على التغيير عند أول دخول.

---

## 13. عناصر الواجهة المهمة

### الشريط العلوي (`AppShell.tsx`)
- مربع البحث السريع.
- بطاقة هوية: «أهلاً، [الاسم]» + الدور.
- زر «تغيير كلمة المرور».
- زر «تسجيل الخروج» (وردي مميّز).

### الشريط الجانبي (`Sidebar.tsx`)
عناصر التنقل تُفلتر تلقائياً حسب الدور: ولية الأمر تشاهد فقط الإعلانات والرسائل وملف طالبتها، المعلمة تشاهد فصولها وحضورها ودرجاتها وجدولها، إلخ.

### النوتيس
- `notice ok` (أخضر مينت) للإجراءات الناجحة.
- `notice warn` للتحذيرات.
- `notice danger` للأخطاء.

---

## 14. الميزات المنجزة

- ✅ مصادقة كاملة + جلسات موقّعة.
- ✅ نظام صلاحيات RBAC على ٣٤ مفتاح.
- ✅ تقييد بيانات للمعلمة وولي الأمر.
- ✅ بوابة المعلمة (فصولها فقط).
- ✅ بوابة ولي الأمر (طالبتها فقط).
- ✅ سياسة كلمة مرور قوية + إجبار التغيير.
- ✅ قفل الحساب وتحديد المعدل + سجل المحاولات.
- ✅ حماية CSRF + تحقق Origin.
- ✅ تصدير CSV لـ ٥ كيانات.
- ✅ سجل تدقيق لكل عملية حساسة.
- ✅ ١٤ وحدة وظيفية.
- ✅ شهادات الطالبات قابلة للطباعة.
- ✅ تقارير تحليلية: متفوقات، أداء فصول، حضور.

---

## 15. تحسينات مستقبلية مقترحة

- 🔲 مصادقة ثنائية (TOTP) للأدوار الحساسة.
- 🔲 جلسة قابلة للإلغاء عن بعد (قائمة جلسات نشطة).
- 🔲 إشعارات داخل التطبيق + إيميل/SMS.
- 🔲 تصدير Excel أصلي (xlsx) بدل CSV.
- 🔲 استيراد طالبات من ملف CSV/Excel.
- 🔲 رفع صور الطالبات والملفات الداعمة.
- 🔲 لوحة تحكم لكل معلمة (ملفها الشخصي).
- 🔲 تطبيق جوال للمعلمات وأولياء الأمور.
- 🔲 نسخ احتياطية مجدولة وقابلة للاستعادة.
- 🔲 سجل ربط شخص-بحساب قابل للتعديل من واجهة المسؤولة.

---

## 16. مصادر سريعة داخل الكود

| تحتاج | افتح |
|------|------|
| إضافة جدول جديد | `src/db/schema.ts` ثم `npm run db:push` |
| إضافة صلاحية | `src/lib/permissions.ts` |
| تعديل قائمة جانبية | `src/components/Sidebar.tsx` |
| تخصيص ستايل | `src/app/globals.css` |
| تعديل سياسة كلمة المرور | `src/lib/passwordPolicy.ts` |
| تعديل فترة قفل الحساب | `LOGIN_POLICY` في `passwordPolicy.ts` |
| إضافة تصدير CSV | `src/app/api/export/<entity>/route.ts` |
| إضافة عملية في سجل التدقيق | `await logAudit({...})` بعد العملية |

---

> آخر تحديث: ٢٥ أبريل ٢٠٢٦ — كل ما سبق يعكس الحالة الفعلية للكود في هذا التاريخ.
> لأي استفسار أو إضافة، حدّثي هذا الملف ليبقى المرجع الموحّد للمنصة.
