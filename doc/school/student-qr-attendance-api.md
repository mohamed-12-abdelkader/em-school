# واجهات الطالب — QR، الحضور، كلمة المرور عند أول دخول

**البادئة الأساسية:** جميع المسارات أدناه تُستدعى تحت `/api` (مثال: `POST /api/auth/login`).

**الترويسة للمسارات المحمية:**

```http
Authorization: Bearer <JWT>
Content-Type: application/json
```

---

## 1) المصادقة العامة

### `POST /api/auth/login`

أيضاً: `POST /api/login` (نفس المنطق).

**Body (JSON):**

| الحقل      | النوع  | الوصف                                                          |
| ---------- | ------ | -------------------------------------------------------------- |
| `username` | string | بريد أو `username` (كود الطالب/ولي الأمر) أو هاتف حسب المستخدم |
| `password` | string | كلمة المرور                                                    |

**Response 200:**

| الحقل                | الوصف                                                                  |
| -------------------- | ---------------------------------------------------------------------- |
| `token`              | JWT                                                                    |
| `mustChangePassword` | `true` إذا كان يجب تغيير كلمة المرور (حسابات طالب/ولي أمر جديدة عادةً) |
| `user`               | `{ id, name, email, role, description, logo }`                         |

---

### `GET /api/auth/me`

يتطلب `Authorization`.

**Response 200:**

| الحقل                | الوصف                                                              |
| -------------------- | ------------------------------------------------------------------ |
| `mustChangePassword` | boolean                                                            |
| `user`               | `{ id, name, email, role, description, logo, status, created_at }` |

---

### `PATCH /api/auth/password`

تغيير كلمة المرور للمستخدم الحالي (بعد أول دخول أو في أي وقت).

**Body (JSON):**

| الحقل         | النوع  | القيود               |
| ------------- | ------ | -------------------- |
| `oldPassword` | string | مطلوب                |
| `newPassword` | string | **8 أحرف على الأقل** |

**Response 200:**

| الحقل                | الوصف    |
| -------------------- | -------- |
| `token`              | JWT جديد |
| `mustChangePassword` | `false`  |

---

## 2) بوابة المدرسة (`role: school`)

جميع المسارات تحت `/api/school/*` تتطلب JWT لمستخدم دوره `school`.

---

### `POST /api/school/attendance/scan`

تسجيل حضور من نص الـ QR (القيمة التي يقرأها الماسح كسلسلة نصية).

**Body (JSON):**

| الحقل | النوع  | الوصف                                                                               |
| ----- | ------ | ----------------------------------------------------------------------------------- |
| `raw` | string | النص الكامل المقروء من QR (JSON مثل `{"v":1,"schoolId":1,"studentId":"STU-1-..."}`) |

**Response 201:**

```json
{
  "attendance": {
    "id": 1,
    "student_id": "STU-1-AB12CD34",
    "student_name": "اسم الطالب",
    "date": "2026-04-06",
    "time": "14:30:00",
    "status": "present"
  },
  "alreadyCheckedInToday": false
}
```

- إذا كان الطالب قد سُجّل حضوره **نفس اليوم** مسبقاً، يُحدَّث وقت آخر مسح ويظهر `alreadyCheckedInToday: true`.

**أخطاء شائعة:** `400` نص QR غير صالح، `403` الرمز لا يخص مدرسة المستخدم، `404` الطالب غير موجود.

---

### `GET /api/school/attendance`

قائمة سجلات الحضور للمدرسة.

**Query (اختياري):**

| المعامل     | الوصف                                          |
| ----------- | ---------------------------------------------- |
| `from`      | تاريخ بداية `YYYY-MM-DD`                       |
| `to`        | تاريخ نهاية `YYYY-MM-DD`                       |
| `studentId` | الرقم الداخلي للطالب في النظام (`students.id`) |
| `limit`     | افتراضي `20`، أقصى `100`                       |
| `skip`      | إزاحة للصفحات (افتراضي `0`)                    |

**Response 200:**

```json
{
  "records": [
    {
      "id": 1,
      "student_id": "STU-1-...",
      "student_internal_id": 5,
      "date": "2026-04-06",
      "time": "08:15:00",
      "status": "present",
      "created_at": "..."
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 20,
    "skip": 0,
    "hasMore": true
  }
}
```

---

### `GET /api/school/students/:studentId/attendance-days`

عدد الأيام التي سُجّل فيها الطالب **حاضراً** (`status = present`) ضمن نطاق اختياري.

**Query (اختياري):** `from`, `to` (`YYYY-MM-DD`).

**Response 200:**

```json
{
  "student_internal_id": 5,
  "present_days": 42,
  "from": "2026-01-01",
  "to": "2026-04-06"
}
```

---

### `GET /api/school/students/:studentId/qr`

إرجاع صورة QR للطباعة أو التحميل.

**Query:**

| المعامل  | الوصف                                                                        |
| -------- | ---------------------------------------------------------------------------- |
| `format` | غير محدد أو `json` → JSON يحتوي Data URL؛ `png` → استجابة `image/png` مباشرة |

**Response عند `format=json` أو بدون format (200):**

```json
{
  "qrDataUrl": "data:image/png;base64,...",
  "qrPayload": "{\"v\":1,\"schoolId\":1,\"studentId\":\"STU-1-...\"}",
  "student": {
    "student_id": "STU-1-...",
    "name": "اسم الطالب",
    "grade": "الصف ..."
  }
}
```

**Response عند `format=png`:** ملف PNG (مناسب للتحميل أو `<img src="...">` مع token في سيناريوهات محدودة؛ غالباً يُفضَّل `qrDataUrl` من JSON داخل التطبيق).

---

### إنشاء طالب واستجابة إضافية

عند **`POST /api/school/students`** (multipart مع `avatar` و `birthCertificate` كما في الوثائق السابقة)، تتضمن الاستجابة الناجحة حقولاً إضافية منطقية:

- **`student`:** يتضمن الأعمدة الجديدة مثل `student_id`, `grade`, `student_login_code`, `parent_login_code`, `qr_code`, إلخ.
- **`qr`:** `{ payload, studentId }` — نص الحمولة المخزَّن في QR.
- **`loginCodes`:** كود الطالب وكلمة مرور مؤقتة للعرض مرة واحدة؛ يُنصح بربط واجهة المستخدم بـ `mustChangePassword` بعد أول تسجيل دخول.

---

### `GET /api/school/students/:studentId`

عرض طالب واحد؛ يتضمن الآن أيضاً:

- `qr.payload` وحقول الطالب ذات الصلة بـ QR والأكواد.

---

## 3) بوابة ولي الأمر (`role: parent`)

### `GET /api/parent/attendance`

عرض سجلات حضور الأبناء المرتبطين بالحساب.

**Query (اختياري):**

| المعامل     | الوصف                                                |
| ----------- | ---------------------------------------------------- |
| `studentId` | الرقم الداخلي للطالب (`students.id`) لتصفية ابن محدد |
| `from`      | `YYYY-MM-DD`                                         |
| `to`        | `YYYY-MM-DD`                                         |
| `limit`     | افتراضي `20`، أقصى `100`                             |
| `skip`      | افتراضي `0`                                          |

**Response 200:**

```json
{
  "records": [
    {
      "id": 1,
      "student_id": "STU-1-...",
      "student_internal_id": 5,
      "student_name": "...",
      "grade": "...",
      "date": "2026-04-06",
      "time": "08:00:00",
      "status": "present",
      "created_at": "..."
    }
  ],
  "pagination": {
    "total": 10,
    "limit": 20,
    "skip": 0,
    "hasMore": false
  }
}
```

---

## 4) شكل حمولة QR (للمطورين)

النص المخزَّن في عمود `students.qr_code` ويُعاد توليد الصورة منه:

```json
{
  "v": 1,
  "schoolId": <رقم_مستخدم_المدرسة>,
  "studentId": "<student_id العام مثل STU-1-AB12CD34>"
}
```

الماسح الضوئي يمرّر هذا النص كاملاً في حقل `raw` لـ `POST /api/school/attendance/scan`.

---

## 5) ملخص مسارات سريع

| الطريقة | المسار                                            | الدور           |
| ------- | ------------------------------------------------- | --------------- |
| `POST`  | `/api/auth/login`                                 | عام             |
| `GET`   | `/api/auth/me`                                    | أي مستخدم مسجّل |
| `PATCH` | `/api/auth/password`                              | أي مستخدم مسجّل |
| `POST`  | `/api/school/attendance/scan`                     | school          |
| `GET`   | `/api/school/attendance`                          | school          |
| `GET`   | `/api/school/students/:studentId/attendance-days` | school          |
| `GET`   | `/api/school/students/:studentId/qr`              | school          |
| `GET`   | `/api/parent/attendance`                          | parent          |
