# إدارة المدرسين وتوزيع المواد (Teachers Management API)

توثيق وحدة المدرسين وتوزيع المواد على الفصول داخل بوابة المدرسة.

**البادئة (المدرسة):** `/api/school`  
**بوابة المدرس:** `/api/teacher`  
**الصلاحية:** `role = school` للإدارة، `role = teacher` لبوابة المدرس  
**العزل:** كل العمليات مقيّدة بـ `school_id`

---

## 1) المصادقة

```http
POST /api/auth/login
```

**مدرسة:**
```json
{ "username": "school@next.com", "password": "school123" }
```

**مدرس (بعد الإنشاء):**
```json
{ "username": "TCH-000001", "password": "<generated>" }
```

---

## 2) التسلسل الإلزامي

```
School → Academic Year → Grade → Classroom → Subject (على الفصل)
→ Teacher → Teacher Assignment (مدرس + مادة + فصل + صف + سنة)
```

المدرس **لا يُسند لفصل كامل**، بل لمادة داخل فصل محدد.

---

## 3) المدرسون — `/api/school/teachers`

| Method | Path | الوصف |
|--------|------|--------|
| `GET` | `/teachers` | قائمة + بحث + فلتر حالة |
| `GET` | `/teachers/:teacherId` | تفاصيل + كل التوزيعات |
| `POST` | `/teachers` | إضافة مدرس + حساب دخول |
| `PUT` / `PATCH` | `/teachers/:teacherId` | تعديل |
| `DELETE` | `/teachers/:teacherId` | Soft delete |

### Query (GET list)

| Param | الوصف |
|-------|--------|
| `q` | بحث بالاسم / الكود / الهاتف / التخصص |
| `status` | `active` \| `suspended` |
| `limit` / `skip` | Pagination |

### POST — إنشاء مدرس

```json
{
  "firstName": "محمد",
  "lastName": "أحمد",
  "gender": "male",
  "phone": "01000000000",
  "hireDate": "2024-09-01",
  "email": "teacher@example.com",
  "nationalId": "30105101234567",
  "specialization": "كيمياء",
  "status": "active",
  "password": "optionalPass1"
}
```

**تلقائيًا:**
- `employeeCode` مثل `TCH-000145` (فريد عالميًا)
- `username` = `employeeCode`
- `role` = `teacher`
- كلمة مرور مولَّدة إن لم تُرسل

**Response 201:**
```json
{
  "teacher": { "employeeCode": "TCH-000145", "...": "..." },
  "login": {
    "username": "TCH-000145",
    "password": "xYz9AbCdEfGh",
    "hint": "..."
  }
}
```

### GET واحد

يرجع `teacher` + `assignments[]` (كل المواد والفصول المسندة).

### DELETE

Soft delete (`deleted_at`) + تعطيل حساب المستخدم.

---

## 4) توزيع المدرسين — `/api/school/teacher-assignments`

يربط: **سنة + مدرس + صف + فصل + مادة**

| Method | Path | الوصف |
|--------|------|--------|
| `GET` | `/teacher-assignments` | قائمة التوزيعات |
| `GET` | `/teacher-assignments/:assignmentId` | تفاصيل |
| `POST` | `/teacher-assignments` | إسناد |
| `PUT` | `/teacher-assignments/:assignmentId` | تعديل |
| `DELETE` | `/teacher-assignments/:assignmentId` | حذف (soft) |

### Query (GET list)

| Param | الوصف |
|-------|--------|
| `teacherId` | فلتر مدرس |
| `academicYearId` | فلتر سنة |
| `gradeId` | فلتر صف |
| `classroomId` | فلتر فصل |
| `subjectId` | فلتر مادة |
| `q` | بحث |
| `limit` / `skip` | Pagination |

### POST — إسناد مادة لمدرس

```json
{
  "academicYearId": 1,
  "teacherId": 3,
  "gradeId": 2,
  "classroomId": 5,
  "subjectId": 4
}
```

**Validation:**
- المدرس / الصف / الفصل / السنة تخص نفس المدرسة
- الفصل يتبع الصف
- المادة مفعّلة على الفصل (`school_class_subjects`)
- **لا تكرار** لنفس (سنة + مدرس + صف + فصل + مادة)

**Response 201:**
```json
{
  "assignment": {
    "id": 10,
    "teacherId": 3,
    "teacherName": "محمد أحمد",
    "teacherEmployeeCode": "TCH-000145",
    "gradeId": 2,
    "gradeName": "ثالثة ثانوي",
    "classroomId": 5,
    "classroomName": "3A",
    "subjectId": 4,
    "subjectName": "كيمياء",
    "academicYearId": 1,
    "academicYearName": "2025/2026"
  }
}
```

### أمثلة مسموحة

| المدرس | المادة | الفصل |
|--------|--------|-------|
| محمد | كيمياء | 3A |
| محمد | كيمياء | 3B |
| محمد | كيمياء | 2A |
| محمد | فيزياء | 2B |

### مثال ممنوع (تكرار)

محمد → كيمياء → ثالثة ثانوي → 3A **مرتين** → `409`

---

## 5) بوابة المدرس — `/api/teacher`

| Method | Path | الوصف |
|--------|------|--------|
| `GET` | `/me` | بيانات المدرس الحالي |
| `GET` | `/assignments` | توزيعاتي فقط |

> وحدات الحضور / الدرجات / الواجبات المستقبلية تعتمد على `teacher_assignments` عبر:
> `assertTeacherCanAccess({ teacherId, schoolId, classroomId, subjectId })`

---

## 6) الصلاحيات (Authorization)

بعد تسجيل دخول المدرس:

- **لا** يرى بيانات المدرسة كاملة
- يرى فقط السجلات في `teacher_assignments` الخاصة به
- كل وحدة مستقبلية (حضور، درجات، واجبات) تتحقق من:
  - `classroomId`
  - `subjectId`
  - `schoolId`

---

## 7) مسارات Legacy (توافق)

| Method | Path | ملاحظة |
|--------|------|--------|
| `POST` | `/teachers/:teacherId/classes` | يتطلب `subject_id` على المدرس |
| `DELETE` | `/teachers/:teacherId/classes/:classId` | |
| `GET` | `/teachers/:teacherId/classes` | |

يفضّل استخدام `/teacher-assignments` للتوزيع الجديد.

---

## 8) أخطاء شائعة

| Status | السبب |
|--------|--------|
| `400` | علاقات غير صحيحة (فصل≠صف، مادة غير مفعّلة على الفصل) |
| `403` | صلاحية غير كافية |
| `404` | مورد غير موجود أو خارج المدرسة |
| `409` | توزيع مكرر / تعارض |

---

## 9) الجداول

| الجدول | الوظيفة |
|--------|---------|
| `school_teachers` | بيانات المدرس + `employee_code` |
| `teacher_assignments` | ربط مدرس + مادة + فصل + صف + سنة |
| `users` | حساب الدخول (`username` = `employee_code`) |

**Indexes:** `school_id`, `teacher_id`, `subject_id`, `classroom_id`, `grade_id`, `academic_year_id`
