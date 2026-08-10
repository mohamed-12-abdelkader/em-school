# واجهات API — المواد الدراسية + المدرسين + جدول الحصص (School)

كل المسارات ضمن نظام متعدد المستأجرين (multi-tenant): بيانات المدرستين معزولة حسب `school` في JWT.

**Base URL:** `/api/school`  
**Authentication:** `Authorization: Bearer <token>`  
يجب أن يكون المستخدم `role = school`.

---

## 0) ملاحظات عامة (Pagination)

بعض endpoints تدعم:
- `limit` (افتراضي: `20`)
- `skip` (افتراضي: `0`)

وغالباً الرد يكون بالشكل:
```json
{
  "rows": [ ... ],
  "total": 123
}
```

---

## 1) Subjects (مواد عالمية — Global)

### 1.1 جلب المواد
```http
GET /api/school/subjects?limit=&skip=&q=
```

**q** (اختياري): بحث بالاسم.

### 1.2 جلب مادة واحدة
```http
GET /api/school/subjects/:subjectId
```

> ملاحظة: الـ API الخاص بإنشاء/تعديل/حذف `subjects` غير موجود حالياً (المواد Global تُجهّز عبر Seeder/DB).

---

## 2) ربط المواد بالفصول (Classes ↔ Subjects) — Many-to-Many

### 2.1 جلب مواد فصل معين
```http
GET /api/school/classes/:classId/subjects?limit=&skip=
```

الرد:
```json
{
  "rows": [
    { "id": 1, "name": "الرياضيات", "description": "..." }
  ],
  "total": 10
}
```

### 2.2 إضافة مواد لفصل
```http
POST /api/school/classes/:classId/subjects
```

**Body**
```json
{
  "subjectIds": [1, 2, 3]
}
```

**Response 201**
```json
{ "message": "Subjects added to class successfully" }
```

### 2.3 تحديث مواد الفصل بالكامل (Replace)
```http
PUT /api/school/classes/:classId/subjects
```

**Body**
```json
{
  "subjectIds": [1, 2]
}
```

**Response 200**
```json
{ "message": "Class subjects updated successfully" }
```

---

## 3) المدرسين (Teachers)

المدرس مرتبط بالمدرسة (`school_teachers`) ويملك `subject_id` واحدة يدرسها.

### 3.1 جلب كل مدرسين المدرسة
```http
GET /api/school/teachers?limit=&skip=&q=
```

### 3.2 إنشاء مدرس
```http
POST /api/school/teachers
```

**Body**
```json
{
  "name": "أ. أحمد",
  "description": "نبذة (اختياري)",
  "subjectId": 1,
  "email": "teacher@example.com",
  "password": "strongPassword"
}
```

يمكن أيضاً استخدام `username` بدل `email` (لكن لازم يكون بصيغة بريد إلكتروني).

بعد إنشاء المدرس، يمكنه تسجيل الدخول كباقي المستخدمين باستخدام `POST /api/login` (أو `/api/auth/login`) عبر `email` و `password`، وسيتم إصدار `token` بدور `teacher`.

**Response 201**
```json
{ "teacher": { "...": "..." } }
```

### 3.3 تعديل بيانات مدرس
```http
PATCH /api/school/teachers/:teacherId
```

**Body (اختياريات)**
```json
{
  "name": "اسم جديد",
  "description": null,
  "subjectId": 2
}
```

> قاعدة مهمة: لا يمكن تغيير `subjectId` لو عند المدرس حصص/Slots بالفعل، وسيتم الرد بـ `409`.

### 3.4 حذف مدرس
```http
DELETE /api/school/teachers/:teacherId
```

**Response 204**

---

## 4) صلاحيات المدرسين على الفصول (Teacher ↔ Classes)

### 4.1 إسناد مدرس إلى فصول
```http
POST /api/school/teachers/:teacherId/classes
```

**Body**
```json
{
  "classIds": [10, 11]
}
```

**قاعدة مهمة:** لا يتم الإسناد إلا إذا كانت مواد الفصل تحتوي على مادة المدرس (`teacher.subject_id`).

**Response 201**
```json
{ "message": "Teacher assigned to classes successfully" }
```

### 4.2 إزالة مدرس من فصل
```http
DELETE /api/school/teachers/:teacherId/classes/:classId
```

**Response 204**

> يتم أيضاً حذف حصص (Schedule Slots) الخاصة بـ `(teacher, class)` للحفاظ على الاتساق.

### 4.3 جلب فصول مدرس معين
```http
GET /api/school/teachers/:teacherId/classes?limit=&skip=
```

### 4.4 جلب مدرسين فصل معين
```http
GET /api/school/classes/:classId/teachers?limit=&skip=
```

---

## 5) الجدول الدراسي (Schedule / Timetable)

### 5.1 جلب جدول فصل كامل
```http
GET /api/school/classes/:classId/schedule?dayOfWeek=1..7
```

**Response 200**
```json
{
  "schedule": [
    {
      "id": 1,
      "class_id": 10,
      "day_of_week": 1,
      "period": 1,
      "subject_id": 2,
      "subject_name": "الرياضيات",
      "teacher_id": 5,
      "teacher_name": "أ. أحمد"
    }
  ]
}
```

### 5.2 إنشاء حصة (Slot)
```http
POST /api/school/classes/:classId/schedule/slots
```

**Body**
```json
{
  "dayOfWeek": 1,
  "period": 3,
  "subjectId": 2,
  "teacherId": 5
}
```

**قواعد Business Logic:**
1. المدرس يجب أن يكون يدرس نفس المادة (`teacher.subject_id == subjectId`)
2. المادة يجب أن تكون مفعلة لهذا الفصل (`class contains subject`)
3. المدرس لازم يكون مُسند لهذا الفصل
4. ممنوع:
   - تكرار نفس الحصة لنفس الفصل (`day_of_week + period`)
   - أو تعارض وقت المدرس لنفسه (`day_of_week + period`)

**Response 201**
```json
{ "slot": { "...": "..." } }
```

> عند التعارض يتم الرد غالباً بـ `409`.

### 5.3 تعديل Slot
```http
PATCH /api/school/classes/:classId/schedule/slots/:slotId
```

**Body (اختياريات)**
```json
{
  "dayOfWeek": 2,
  "period": 4,
  "subjectId": 3,
  "teacherId": 6
}
```

**Response 200**

### 5.4 حذف حصة
```http
DELETE /api/school/classes/:classId/schedule/slots/:slotId
```

**Response 204**

---

## 6) Seeder للـ Subjects (Bonus)

أُضيف Seeder في الـ migrations لتعبئة مواد أساسية مثل:
- العربية
- الإنجليزية
- الرياضيات
- العلوم
- الكمبيوتر

يُنفّذ Seeder من خلال تشغيل migrations للسيرفر.

