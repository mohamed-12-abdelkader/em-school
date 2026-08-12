# إضافة وإدارة الطلاب (Students Management API)

توثيق واجهات إضافة الطلاب وإدارتهم داخل بوابة المدرسة.

**البادئة:** `/api/school`  
**الخادم المحلي:** `http://localhost:8000`  
**الصلاحية:** حساب `role = school` فقط  
**العزل:** كل الاستعلامات مقيّدة بـ `school_id` من التوكن — لا يمكن لمدرسة الوصول لطلاب مدرسة أخرى.

> ملف مرتبط (مختصر): `doc/school/students-module-api.md`  
> هذا الملف هو المرجع التفصيلي للإضافة والإدارة.

---

## 1) المصادقة

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "username": "school@next.com",
  "password": "school123"
}
```

استخدم التوكن في كل الطلبات:

| Header          | القيمة                                                    |
| --------------- | --------------------------------------------------------- |
| `Authorization` | `Bearer <token>`                                          |
| `Content-Type`  | `application/json` (أو `multipart/form-data` عند رفع صور) |

---

## 2) التسلسل الإلزامي قبل إضافة طالب

لا يُسمح بإضافة طالب خارج هذا الترتيب:

```
School → Academic Year → Grade → Classroom → Student
```

| الخطوة | ماذا تحتاج؟                      | المسار                                     |
| ------ | -------------------------------- | ------------------------------------------ |
| 1      | سنة دراسية                       | `POST /api/school/academic-years`          |
| 2      | صف دراسي                         | `POST /api/school/grades`                  |
| 3      | فصل داخل الصف                    | `POST /api/school/grades/:gradeId/classes` |
| 4      | طالب مربوط بالسنة + الصف + الفصل | `POST /api/school/students`                |

عند الإنشاء يتحقق السيرفر من:

- السنة تخص نفس المدرسة
- الصف يخص نفس المدرسة
- الفصل يخص نفس المدرسة
- الفصل يتبع الصف المختار

أي خلل → `400` Validation / Business Error.

---

## 3) السنة الدراسية (Academic Years)

| Method   | Path                                 | الوصف                            |
| -------- | ------------------------------------ | -------------------------------- |
| `GET`    | `/api/school/academic-years`         | قائمة + pagination               |
| `POST`   | `/api/school/academic-years`         | إنشاء سنة                        |
| `GET`    | `/api/school/academic-years/:yearId` | تفاصيل سنة                       |
| `PUT`    | `/api/school/academic-years/:yearId` | تعديل سنة                        |
| `DELETE` | `/api/school/academic-years/:yearId` | حذف (مرفوض إن وُجد طلاب مرتبطون) |

### إنشاء سنة دراسية

```http
POST /api/school/academic-years
```

```json
{
  "name": "2025/2026",
  "startDate": "2025-09-01",
  "endDate": "2026-08-31",
  "isCurrent": true
}
```

| الحقل       | نوع          | إلزامي | ملاحظات                                  |
| ----------- | ------------ | ------ | ---------------------------------------- |
| `name`      | string       | نعم    | فريد داخل المدرسة                        |
| `startDate` | `YYYY-MM-DD` | نعم    |                                          |
| `endDate`   | `YYYY-MM-DD` | نعم    | ≥ `startDate`                            |
| `isCurrent` | boolean      | لا     | إن `true` تُلغى الحالية السابقة تلقائيًا |

**Response 201**

```json
{
  "academicYear": {
    "id": 1,
    "school_id": 57,
    "name": "2025/2026",
    "start_date": "2025-09-01",
    "end_date": "2026-08-31",
    "is_current": true,
    "created_at": "2026-08-06T06:21:31.059Z",
    "updated_at": "2026-08-06T06:21:31.059Z"
  }
}
```

---

## 4) إدارة الطلاب — نظرة عامة

| Method   | Path                              | الوصف                                   |
| -------- | --------------------------------- | --------------------------------------- |
| `GET`    | `/api/school/students`            | قائمة الطلاب (بحث + فلاتر + pagination) |
| `GET`    | `/api/school/students/:studentId` | تفاصيل طالب + علاقات                    |
| `POST`   | `/api/school/students`            | إضافة طالب                              |
| `PUT`    | `/api/school/students/:studentId` | تعديل طالب                              |
| `PATCH`  | `/api/school/students/:studentId` | نفس التعديل (توافق)                     |
| `DELETE` | `/api/school/students/:studentId` | Soft Delete                             |

مسارات مرتبطة (موجودة مسبقًا):

| Method | Path                                              | الوصف          |
| ------ | ------------------------------------------------- | -------------- |
| `GET`  | `/api/school/students/:studentId/qr`              | QR للطالب      |
| `GET`  | `/api/school/students/:studentId/fees`            | مصروفات الطالب |
| `GET`  | `/api/school/students/:studentId/attendance-days` | أيام الحضور    |

---

## 5) Pagination

على قوائم `GET`:

| المعامل | الافتراضي | الحد       |
| ------- | --------- | ---------- |
| `limit` | `20`      | أقصى `100` |
| `skip`  | `0`       | —          |

شكل الاستجابة المشترك:

```json
{
  "pagination": {
    "total": 3,
    "limit": 20,
    "skip": 0,
    "hasMore": false
  }
}
```

---

## 6) عرض قائمة الطلاب

```http
GET /api/school/students
```

### Query Parameters

| المعامل                    | الوصف                                                   |
| -------------------------- | ------------------------------------------------------- |
| `q`                        | بحث بالاسم / الرقم القومي / هاتف ولي الأمر / كود الطالب |
| `studentCode`              | بحث جزئي بكود الطالب                                    |
| `gradeId`                  | فلتر حسب الصف                                           |
| `classroomId` أو `classId` | فلتر حسب الفصل                                          |
| `academicYearId`           | فلتر حسب السنة الدراسية                                 |
| `status`                   | `active` \| `suspended` \| `graduated` \| `transferred` |
| `limit` / `skip`           | Pagination                                              |

### أمثلة

```http
GET /api/school/students?q=أحمد&limit=20&skip=0
GET /api/school/students?gradeId=2&classroomId=5&status=active
GET /api/school/students?studentCode=ST-2026
GET /api/school/students?academicYearId=1
```

### Response 200 (مثال)

```json
{
  "students": [
    {
      "id": 4,
      "schoolId": 57,
      "academicYearId": 1,
      "gradeId": 2,
      "classroomId": 2,
      "studentCode": "ST-2026-000001",
      "firstName": "أحمد",
      "lastName": "محمد",
      "fullName": "أحمد محمد",
      "gender": "male",
      "birthDate": "2015-01-15",
      "nationalId": null,
      "photo": null,
      "address": null,
      "parentName": "محمد أحمد",
      "parentPhone": "01011111111",
      "parentEmail": null,
      "relationship": "father",
      "studentPhone": null,
      "status": "active",
      "createdAt": "2026-08-06T06:30:00.000Z",
      "updatedAt": "2026-08-06T06:30:00.000Z",
      "studentId": "ST-2026-000001",
      "gradeLabel": "أولى إعدادي",
      "qrCode": "{\"v\":1,\"schoolId\":57,\"studentId\":\"ST-2026-000001\"}",
      "userId": 200
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 20,
    "skip": 0,
    "hasMore": false
  }
}
```

> الطلاب المحذوفون Soft Delete **لا يظهرون** في القائمة.

---

## 7) عرض طالب واحد

```http
GET /api/school/students/:studentId
```

`:studentId` = الرقم الداخلي (`id`) وليس `studentCode`.

### Response 200

يرجع بيانات الطالب + علاقات (Eager Loading في استعلام واحد):

```json
{
  "student": {
    "id": 4,
    "schoolId": 57,
    "academicYearId": 1,
    "gradeId": 2,
    "classroomId": 2,
    "studentCode": "ST-2026-000001",
    "firstName": "أحمد",
    "lastName": "محمد",
    "fullName": "أحمد محمد",
    "gender": "male",
    "birthDate": "2015-01-15",
    "nationalId": null,
    "photo": null,
    "address": null,
    "parentName": "محمد أحمد",
    "parentPhone": "01011111111",
    "parentEmail": "parent@example.com",
    "relationship": "father",
    "studentPhone": null,
    "status": "active",
    "createdAt": "2026-08-06T06:30:00.000Z",
    "updatedAt": "2026-08-06T06:30:00.000Z",
    "studentId": "ST-2026-000001",
    "gradeLabel": "أولى إعدادي",
    "qrCode": "...",
    "userId": 200
  },
  "academicYear": {
    "id": 1,
    "name": "2025/2026",
    "start_date": "2025-09-01",
    "end_date": "2026-08-31",
    "is_current": true
  },
  "grade": {
    "id": 2,
    "name": "أولى إعدادي",
    "stage": "preparatory"
  },
  "classroom": {
    "id": 2,
    "name": "1/2",
    "capacity": 20
  },
  "parent": {
    "name": "محمد أحمد",
    "phone": "01011111111",
    "email": "parent@example.com",
    "relationship": "father"
  },
  "loginCodes": {
    "studentCode": "ST-2026-000001",
    "parentCode": "PAR-XXXXXXXX"
  },
  "qr": {
    "payload": "{\"v\":1,\"schoolId\":57,\"studentId\":\"ST-2026-000001\"}",
    "studentId": "ST-2026-000001"
  }
}
```

**أخطاء:** `404` إن لم يوجد أو يخص مدرسة أخرى أو محذوف.

---

## 8) إضافة طالب جديد

```http
POST /api/school/students
```

يدعم:

1. **JSON** (`Content-Type: application/json`)
2. **Multipart** لرفع صور اختيارية: `avatar` + `birthCertificate`

### ما يحدث تلقائيًا عند الإنشاء

1. التحقق من السنة / الصف / الفصل والعلاقات بينها
2. توليد **كود طالب فريد**: `ST-{year}-000001`
3. إنشاء حساب دخول للطالب:
   - `username` = `studentCode`
   - `role` = `student`
   - كلمة مرور مولَّدة أو من الحقل `password`
   - `password_change_required = true`
4. إنشاء/إعادة استخدام حساب ولي الأمر حسب `parentPhone`
5. إنشاء QR payload مرتبط بالكود
6. تطبيق خطة مصروفات الصف إن وُجدت

### Body — الحقول

#### البيانات الشخصية

| الحقل          | نوع                | إلزامي  | ملاحظات                             |
| -------------- | ------------------ | ------- | ----------------------------------- |
| `firstName`    | string             | نعم\*   | مع `lastName`                       |
| `lastName`     | string             | نعم\*   | مع `firstName`                      |
| `fullName`     | string             | بديل\*  | يمكن بدل الاسمين                    |
| `gender`       | `male` \| `female` | نعم\*\* | أو من الرقم القومي                  |
| `birthDate`    | `YYYY-MM-DD`       | نعم\*\* | أو `dateOfBirth` أو من الرقم القومي |
| `nationalId`   | string (14 رقم)    | لا      | فريد داخل المدرسة إن وُجد           |
| `address`      | string             | لا      |                                     |
| `studentPhone` | string             | لا      | أو `phone`                          |
| `status`       | enum               | لا      | افتراضي `active`                    |
| `password`     | string (8+)        | لا      | إن لم يُرسل تُولَّد تلقائيًا        |

\* يجب `firstName`+`lastName` **أو** `fullName`  
\*\* إن وُجد `nationalId` مصري صالح يمكن استنتاج الميلاد والنوع

#### الربط الأكاديمي

| الحقل            | نوع    | إلزامي    | ملاحظات                                   |
| ---------------- | ------ | --------- | ----------------------------------------- |
| `academicYearId` | number | لا        | إن لم يُرسل → السنة الحالية (`isCurrent`) |
| `gradeId`        | number | **نعم**   | يجب أن يخص المدرسة                        |
| `classroomId`    | number | نعم\*\*\* | أو `classId`                              |
| `classId`        | number | نعم\*\*\* | توافق خلفي لنفس الفصل                     |

\*\*\* أحدهما مطلوب

#### بيانات ولي الأمر

| الحقل            | نوع    | إلزامي  | ملاحظات                                                          |
| ---------------- | ------ | ------- | ---------------------------------------------------------------- |
| `parentName`     | string | لا      | افتراضي «ولي أمر»؛ أو `parentFullName`                           |
| `parentPhone`    | string | **نعم** | 8–20 حرفًا، أرقام/رموز هاتف                                      |
| `parentEmail`    | email  | لا      |                                                                  |
| `relationship`   | enum   | لا      | `father` \| `mother` \| `guardian` \| `other` (افتراضي `father`) |
| `parentRelation` | enum   | لا      | توافق: `father` \| `mother` \| `other`                           |

### مثال JSON

```json
{
  "firstName": "أحمد",
  "lastName": "محمد علي",
  "gender": "male",
  "birthDate": "2015-01-15",
  "nationalId": "30105101234567",
  "address": "القاهرة - مدينة نصر",
  "studentPhone": "01000000000",
  "academicYearId": 1,
  "gradeId": 2,
  "classroomId": 5,
  "parentName": "محمد أحمد علي",
  "parentPhone": "01011111111",
  "parentEmail": "parent@example.com",
  "relationship": "father",
  "status": "active",
  "password": "Student@123"
}
```

### مثال curl (JSON)

```bash
curl -X POST "http://localhost:8000/api/school/students" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "أحمد",
    "lastName": "محمد",
    "gender": "male",
    "birthDate": "2015-01-15",
    "gradeId": 2,
    "classroomId": 5,
    "parentName": "محمد أحمد",
    "parentPhone": "01011111111",
    "relationship": "father"
  }'
```

### مثال curl (Multipart + صور)

```bash
curl -X POST "http://localhost:8000/api/school/students" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "firstName=أحمد" \
  -F "lastName=محمد" \
  -F "gender=male" \
  -F "birthDate=2015-01-15" \
  -F "gradeId=2" \
  -F "classroomId=5" \
  -F "parentName=محمد أحمد" \
  -F "parentPhone=01011111111" \
  -F "relationship=father" \
  -F "avatar=@./photo.jpg" \
  -F "birthCertificate=@./birth.jpg"
```

### Response 201 (مثال مختصر)

```json
{
  "student": {
    "id": 4,
    "studentCode": "ST-2026-000001",
    "fullName": "أحمد محمد",
    "gradeId": 2,
    "classroomId": 5,
    "status": "active"
  },
  "parent": {
    "name": "محمد أحمد",
    "phone": "01011111111",
    "email": null,
    "relationship": "father"
  },
  "academicYear": { "id": 1, "name": "2025/2026", "is_current": true },
  "grade": { "id": 2, "name": "أولى إعدادي", "stage": "preparatory" },
  "classroom": { "id": 5 },
  "loginCodes": {
    "student": {
      "username": "ST-2026-000001",
      "password": "xYz9AbCdEfGh",
      "hint": "تسجيل الدخول بـ username = studentCode؛ يُنصح بتغيير كلمة المرور عند أول دخول (mustChangePassword)"
    },
    "parent": {
      "code": "PAR-A1B2C3D4",
      "password": "...."
    }
  },
  "qr": {
    "payload": "{\"v\":1,\"schoolId\":57,\"studentId\":\"ST-2026-000001\"}",
    "studentId": "ST-2026-000001"
  },
  "documents": {
    "avatarUrl": null,
    "birthCertificateUrl": null
  },
  "feePlan": null
}
```

> احفظ `loginCodes.student.password` فور الإنشاء — لا تُعاد لاحقًا بشكل نص واضح.

### أخطاء شائعة عند الإنشاء

| Status | السبب                                                  |
| ------ | ------------------------------------------------------ |
| `400`  | حقول ناقصة / فصل لا يتبع الصف / سنة غير موجودة للمدرسة |
| `400`  | لا توجد سنة حالية ولم يُرسل `academicYearId`           |
| `401`  | توكن غير صالح                                          |
| `403`  | ليس حساب مدرسة                                         |
| `409`  | رقم قومي مكرر أو تعارض فريد (كود/بريد/هاتف)            |

---

## 9) تعديل طالب

```http
PUT /api/school/students/:studentId
```

أو:

```http
PATCH /api/school/students/:studentId
```

يجب إرسال حقل واحد على الأقل.

### حقول قابلة للتعديل

| الحقل                                        | ملاحظات                                                 |
| -------------------------------------------- | ------------------------------------------------------- |
| `academicYearId`                             | يجب أن تخص المدرسة                                      |
| `gradeId`                                    | يجب أن يخص المدرسة                                      |
| `classroomId` / `classId`                    | يجب أن يتبع `gradeId` الجديد/الحالي                     |
| `firstName` / `lastName` / `fullName`        | يحدّث `fullName` واسم حساب المستخدم                     |
| `gender`                                     | `male` \| `female`                                      |
| `birthDate` / `dateOfBirth`                  | `YYYY-MM-DD`                                            |
| `nationalId`                                 | فريد داخل المدرسة إن وُجد                               |
| `address`                                    | أو `null` للمسح                                         |
| `studentPhone` / `phone`                     |                                                         |
| `parentName` / `parentPhone` / `parentEmail` |                                                         |
| `relationship`                               |                                                         |
| `status`                                     | `active` \| `suspended` \| `graduated` \| `transferred` |

### مثال: نقل طالب لفصل آخر

```json
{
  "gradeId": 2,
  "classroomId": 8
}
```

السيرفر يتحقق أن الفصل `8` يتبع الصف `2` ونفس المدرسة.

### مثال: إيقاف طالب

```json
{
  "status": "suspended"
}
```

### Response 200

```json
{
  "student": {
    "id": 4,
    "studentCode": "ST-2026-000001",
    "status": "suspended",
    "...": "..."
  }
}
```

---

## 10) حذف طالب (Soft Delete)

```http
DELETE /api/school/students/:studentId
```

**ما يحدث:**

- يُضبط `deleted_at = NOW()`
- لا يظهر في القوائم ولا في GET الفردي
- يُعطَّل حساب المستخدم: `users.status = inactive`
- لا يُحذف السجل فعليًا من قاعدة البيانات (مناسب للحضور/المصروفات/التقارير لاحقًا)

**Response:** `204 No Content`

**أخطاء:** `404` إن لم يوجد أو محذوف مسبقًا أو خارج المدرسة.

---

## 11) شكل مورد الطالب (Student Resource)

الحقول التي ترجعها القائمة والتفاصيل والتعديل:

| الحقل في API                                 | المعنى                        |
| -------------------------------------------- | ----------------------------- |
| `id`                                         | المعرف الداخلي                |
| `schoolId`                                   | المدرسة                       |
| `academicYearId`                             | السنة الدراسية                |
| `gradeId`                                    | الصف                          |
| `classroomId`                                | الفصل                         |
| `studentCode`                                | كود فريد مثل `ST-2026-000001` |
| `firstName` / `lastName` / `fullName`        | الاسم                         |
| `gender`                                     | النوع                         |
| `birthDate`                                  | تاريخ الميلاد                 |
| `nationalId`                                 | الرقم القومي (اختياري)        |
| `photo`                                      | رابط الصورة                   |
| `address`                                    | العنوان                       |
| `parentName` / `parentPhone` / `parentEmail` | ولي الأمر                     |
| `relationship`                               | صلة القرابة                   |
| `studentPhone`                               | هاتف الطالب                   |
| `status`                                     | الحالة                        |
| `createdAt` / `updatedAt`                    | الطوابع الزمنية               |
| `studentId`                                  | مرادف للكود (توافق QR/حضور)   |
| `gradeLabel`                                 | اسم الصف للعرض                |
| `qrCode`                                     | نص حمولة QR                   |
| `userId`                                     | حساب الدخول المرتبط           |

---

## 12) حالات الطالب (`status`)

| القيمة        | المعنى                    |
| ------------- | ------------------------- |
| `active`      | نشط (افتراضي عند الإنشاء) |
| `suspended`   | موقوف                     |
| `graduated`   | متخرج                     |
| `transferred` | منقول                     |

---

## 13) تسجيل دخول الطالب بعد الإنشاء

```http
POST /api/auth/login
```

```json
{
  "username": "ST-2026-000001",
  "password": "<password من loginCodes>"
}
```

الاستجابة تتضمن `mustChangePassword: true` عادةً.  
تغيير كلمة المرور:

```http
PATCH /api/auth/password
Authorization: Bearer <student_token>
```

```json
{
  "oldPassword": "...",
  "newPassword": "NewPass123"
}
```

---

## 14) أكواد الأخطاء السريعة

| Status | المعنى                                        |
| ------ | --------------------------------------------- |
| `400`  | Validation / قواعد عمل (فصل≠صف، سنة ناقصة، …) |
| `401`  | غير مصرّح                                     |
| `403`  | صلاحية غير كافية                              |
| `404`  | مورد غير موجود أو خارج المدرسة                |
| `409`  | تكرار (رقم قومي / كود / …)                    |
| `204`  | حذف ناجح بدون جسم                             |

---

## 15) سيناريو استخدام سريع (Frontend)

1. تسجيل دخول المدرسة → حفظ التوكن
2. التأكد من وجود سنة حالية (`GET /academic-years`) أو إنشاؤها
3. اختيار `gradeId` + `classroomId` من واجهات الصفوف/الفصول
4. `POST /students` بالبيانات
5. عرض `loginCodes` للمستخدم مرة واحدة (طباعة/نسخ)
6. القائمة: `GET /students?gradeId=&classroomId=&q=&status=`
7. التعديل: `PUT /students/:id`
8. الحذف: `DELETE /students/:id`

---

## 16) ملاحظات تقنية

- عمود الفصل في قاعدة البيانات: `class_id` — في الـ API: `classroomId`
- `student_code` يُزامَن مع `student_id` لدعم QR والحضور الحاليين
- البحث والفلاتر تستبعد `deleted_at IS NOT NULL`
- كل الاستعلامات تستخدم `school_id` من JWT ولا تعتمد على `id` وحده
