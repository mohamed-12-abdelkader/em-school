# وحدة إدارة الطلاب (Students Module) — ملخص سريع

> **التوثيق التفصيلي لإضافة وإدارة الطلاب:**  
> [`students-management-api.md`](./students-management-api.md)

Base: `/api/school`  
Auth: `Authorization: Bearer <token>` مع `role = school`  
كل الاستعلامات مقيّدة بـ `school_id = req.user.id`.

---

## السنة الدراسية (مطلوبة قبل إنشاء طالب)

| Method | Path | الوصف |
|--------|------|--------|
| GET | `/academic-years` | قائمة + pagination |
| POST | `/academic-years` | إنشاء |
| GET | `/academic-years/:yearId` | تفاصيل |
| PUT | `/academic-years/:yearId` | تعديل |
| DELETE | `/academic-years/:yearId` | حذف (مرفوض إن وُجد طلاب) |

**POST body**

```json
{
  "name": "2025/2026",
  "startDate": "2025-09-01",
  "endDate": "2026-08-31",
  "isCurrent": true
}
```

---

## الطلاب

| Method | Path | الوصف |
|--------|------|--------|
| GET | `/students` | قائمة مع بحث/فلاتر/pagination |
| GET | `/students/:studentId` | طالب + علاقات (سنة/صف/فصل/ولي أمر) |
| POST | `/students` | إنشاء (JSON أو multipart) |
| PUT | `/students/:studentId` | تعديل |
| PATCH | `/students/:studentId` | نفس التعديل (توافق) |
| DELETE | `/students/:studentId` | Soft delete (`deleted_at`) |

### Query params (GET list)

| Param | الوصف |
|-------|--------|
| `q` | بحث بالاسم / الرقم القومي / هاتف ولي الأمر |
| `studentCode` | بحث بكود الطالب |
| `gradeId` | فلتر الصف |
| `classroomId` أو `classId` | فلتر الفصل |
| `academicYearId` | فلتر السنة |
| `status` | `active` \| `suspended` \| `graduated` \| `transferred` |
| `limit` / `skip` | Pagination (افتراضي 20، حد 100) |

### POST — إنشاء طالب

**Validation قبل الإدراج**
- السنة الدراسية تخص المدرسة
- الصف يخص المدرسة
- الفصل يخص المدرسة ويتبع الصف
- الرقم القومي فريد داخل المدرسة (إن وُجد)
- كود الطالب يُولَّد تلقائيًا: `ST-{year}-000001` (فريد عالميًا)
- حساب مستخدم: `username = student_code`, `role = student`، كلمة مرور مولَّدة أو من `password`

**Body (JSON مثال)**

```json
{
  "firstName": "أحمد",
  "lastName": "محمد",
  "gender": "male",
  "birthDate": "2012-05-10",
  "nationalId": "30105101234567",
  "address": "القاهرة",
  "studentPhone": "01000000000",
  "academicYearId": 1,
  "gradeId": 2,
  "classroomId": 5,
  "parentName": "محمد أحمد",
  "parentPhone": "01011111111",
  "parentEmail": "parent@example.com",
  "relationship": "father",
  "status": "active",
  "password": "optionalPass1"
}
```

- إن لم يُرسل `academicYearId` تُستخدم السنة ذات `isCurrent = true`.
- يمكن إرسال `fullName` بدل `firstName`/`lastName`، و`classId` بدل `classroomId`.
- يمكن استنتاج `birthDate`/`gender` من الرقم القومي المصري (14 رقمًا).
- Multipart اختياري: حقول `avatar` و `birthCertificate` (صور).

**Response 201** يتضمن `student`, علاقات مختصرة، `loginCodes.student.username/password`, و QR.

### GET واحد

يرجع:

```json
{
  "student": { "...resource..." },
  "academicYear": { "id": 1, "name": "2025/2026", "...": "..." },
  "grade": { "id": 2, "name": "الصف الأول", "stage": "primary" },
  "classroom": { "id": 5, "name": "أ", "capacity": 30 },
  "parent": {
    "name": "...",
    "phone": "...",
    "email": "...",
    "relationship": "father"
  },
  "loginCodes": { "studentCode": "ST-2026-000001", "parentCode": "PAR-..." },
  "qr": { "payload": "...", "studentId": "ST-2026-000001" }
}
```

### PUT — تعديل

يسمح بتغيير الصف/الفصل مع التحقق أن الفصل يتبع الصف الجديد، بالإضافة للحقول الشخصية وولي الأمر و`status`.

### DELETE

Soft delete: يضع `deleted_at` ويعطّل حساب المستخدم (`status = inactive`). لا يظهر في القوائم.

---

## Indexes

على: `school_id`, `academic_year_id`, `grade_id`, `class_id`, `student_code`, `parent_phone`, `status` (مع استبعاد المحذوفين Soft).

---

## ملاحظات توافق

- عمود الفصل في DB: `class_id`؛ في الـ API: `classroomId`.
- `student_code` يُزامَن مع `student_id` لدعم QR والحضور الحاليين.
- مسارات الرسوم والحضور وQR تبقى كما هي تحت `/students/:studentId/...`.
