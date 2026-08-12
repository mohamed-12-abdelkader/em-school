# نظام شؤون الطلاب (Student Affairs) — توثيق API (تفصيلي)

هذا الملف عبارة عن **مواصفة تفصيلية** لنظام شؤون الطلاب داخل المشروع، مع توضيح ما هو:

- **موجود فعلياً** الآن (Auth + DB Migration)
- و**محدد كمواصفات REST** لباقي النظام

> **تنبيه (الحالة الحالية)**: قاعدة البيانات تم تجهيزها عبر `migrations/1763000000000_student_affairs.sql`،  
> لكن endpoints شؤون الطلاب نفسها (Students/Parents/Attendance/Fees/...) **لم تُنفذ بعد** داخل السيرفر.  
> لذلك اعتبر الأقسام 3.x أدناه “API Spec” جاهز للتنفيذ.

---

## 1) Authentication (موجود فعلياً)

### 1.1 تسجيل الدخول الموحد

يوجد مساران لنفس الوظيفة:

- `POST /api/login`
- `POST /api/auth/login`

**Headers**

- `Content-Type: application/json`

**Body**

```json
{
  "username": "admin@next.com",
  "password": "adminnext123"
}
```

**`username`** يمكن أن يكون:

- `email` أو `users.username` أو `phone`

**Response 200 (مثال)**

```json
{
  "token": "JWT_TOKEN_HERE",
  "user": {
    "id": 1,
    "name": "next school",
    "email": "admin@next.com",
    "role": "admin",
    "description": null,
    "logo": null
  }
}
```

**أخطاء شائعة**

- `401`: بيانات دخول غير صحيحة
- `403`: الحساب `inactive`

---

### 1.2 بيانات المستخدم الحالي

```http
GET /api/auth/me
```

**Headers**

- `Authorization: Bearer <token>`

---

## 2) Database (موجود فعلياً)

Migration:

- `migrations/1763000000000_student_affairs.sql`

يضيف:

- Role: `parent`
- `users.username` (Unique)
- جداول: `students`, `parents`, `parent_students`, `student_documents`, `attendance`, `fees`, `installments`, `student_grades`, `student_notes`

قيود مهمّة:

- عدم تكرار حضور نفس الطالب في نفس اليوم: `UNIQUE(student_id, date)`
- مصروفات: `paid_amount + remaining_amount = total_amount`

---

## 3) Student Affairs API Spec (تفصيلي للتنفيذ)

### 3.0 معلومات عامة

**Base URL:** `/api/school`  
**Auth:** `Authorization: Bearer <token>` (لازم `role = school`)  
**Pagination (GET lists):**

- `limit` (افتراضي 20، حد أقصى 100)
- `skip` (افتراضي 0)

**Multi-tenant:** لا يُسمح برؤية/تعديل إلا بيانات نفس المدرسة.

---

## 3.1 Students

### 3.1.1 إنشاء طالب

```http
POST /api/school/students
```

**الوصف**

- إنشاء طالب وربطه بفصل (`classId` إجباري).
- إنشاء حساب دخول للطالب وولي الأمر تلقائياً (roles: `student` / `parent`) مع `username/password`.

**Body (JSON)**

```json
{
  "fullName": "اسم الطالب بالكامل",
  "nationalId": "12345678901234",
  "dateOfBirth": "2010-05-12",
  "gender": "male",
  "address": "عنوان الطالب",
  "phone": "01000000000",
  "parentPhone": "01000000001",
  "email": "student@example.com",
  "classId": 10,
  "parent": {
    "fullName": "ولي الأمر",
    "phone": "01000000001",
    "email": "parent@example.com",
    "relation": "father"
  }
}
```

**Validation (مختصر)**

- `nationalId`: 14 رقم (مفضل)
- `dateOfBirth`: تاريخ صحيح
- `gender`: `male|female`
- `classId`: رقم صحيح

**Business Rules**

- لا يمكن إضافة طالب بدون فصل
- `nationalId` فريد داخل المدرسة
- إنشاء حسابات login: الطالب وولي الأمر (مرتبطة بـ `student_id` و`parent_id`)

**Response 201 (مقترح)**

```json
{
  "student": { "id": 1, "full_name": "..." },
  "parent": { "id": 1, "full_name": "..." },
  "credentials": {
    "student": { "username": "STU-...", "password": "..." },
    "parent": { "username": "PAR-...", "password": "..." }
  }
}
```

**أخطاء شائعة**

- `400`: Validation failed
- `404`: الفصل غير موجود/لا يخص المدرسة
- `409`: `nationalId` مكرر

---

### 3.1.2 جلب كل الطلاب

```http
GET /api/school/students?limit=&skip=&q=&classId=
```

**Query**

- `q` (اختياري): بحث بالاسم/الرقم القومي/الهاتف
- `classId` (اختياري): فلترة حسب فصل

**Response 200 (مقترح)**

```json
{
  "students": [{ "id": 1, "full_name": "..." }],
  "pagination": { "total": 1, "limit": 20, "skip": 0, "hasMore": false }
}
```

---

### 3.1.3 جلب طالب واحد

```http
GET /api/school/students/:studentId
```

---

### 3.1.4 تعديل طالب

```http
PATCH /api/school/students/:studentId
```

---

### 3.1.5 حذف طالب

```http
DELETE /api/school/students/:studentId
```

**Response 204**  
**Cascade:** حذف الوثائق/الحضور/الدرجات/الملاحظات/الرسوم/الأقساط.

---

## 3.2 Student Documents (Cloudinary)

### 3.2.1 رفع ملف لطالب

```http
POST /api/school/students/:studentId/documents
```

**Content-Type:** `multipart/form-data`  
**Fields**

- `file`: الملف
- `fileType`: `avatar` | `birth_certificate` | `document`

**Response 201 (مقترح)**

```json
{ "document": { "id": 1, "file_url": "https://...", "file_type": "avatar" } }
```

---

### 3.2.2 جلب ملفات طالب

```http
GET /api/school/students/:studentId/documents
```

---

### 3.2.3 حذف ملف

```http
DELETE /api/school/students/:studentId/documents/:documentId
```

---

## 3.3 Parents

### 3.3.1 إنشاء ولي أمر

```http
POST /api/school/parents
```

**Body**

```json
{ "fullName": "ولي الأمر", "phone": "010...", "email": "p@example.com", "relation": "father" }
```

---

### 3.3.2 ربط ولي أمر بطالب (إخوة)

```http
POST /api/school/parents/:parentId/students
```

**Body**

```json
{ "studentIds": [1, 2] }
```

---

## 3.4 Attendance

### 3.4.1 تسجيل/تعديل حضور فصل ليوم محدد

```http
POST /api/school/classes/:classId/attendance
```

**Body**

```json
{
  "date": "2026-03-25",
  "records": [
    { "studentId": 1, "status": "present" },
    { "studentId": 2, "status": "absent" }
  ]
}
```

**Business Rule**

- لا يمكن تسجيل حضور لنفس الطالب أكثر من مرة في نفس اليوم.

---

### 3.4.2 سجل حضور طالب

```http
GET /api/school/students/:studentId/attendance?limit=&skip=
```

---

## 3.5 Fees & Installments

### 3.5.1 إنشاء مصروفات لطالب + أقساط

```http
POST /api/school/students/:studentId/fees
```

**Body**

```json
{
  "totalAmount": 5000,
  "installments": [
    { "amount": 2000, "dueDate": "2026-04-01" },
    { "amount": 3000, "dueDate": "2026-06-01" }
  ]
}
```

---

### 3.5.2 دفع قسط

```http
POST /api/school/installments/:installmentId/pay
```

**Body**

```json
{ "amount": 2000 }
```

**Business Rule**

- لا يمكن دفع أكبر من المبلغ المتبقي.

---

## 3.6 Grades

### 3.6.1 إضافة درجة

```http
POST /api/school/students/:studentId/grades
```

**Body**

```json
{ "subjectId": 1, "examType": "midterm", "score": 18.5 }
```

---

## 3.7 Notes

### 3.7.1 إضافة ملاحظة

```http
POST /api/school/students/:studentId/notes
```

**Body**

```json
{ "content": "ملاحظة..." }
```

---

## 3.8 Dashboard (Bonus)

### 3.8.1 ملخص

```http
GET /api/school/dashboard/summary
```

**Response (مقترح)**

```json
{
  "studentsCount": 120,
  "attendanceRate": 0.92,
  "totalPaid": 250000
}
```
