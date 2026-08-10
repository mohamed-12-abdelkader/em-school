# واجهات API — الصفوف والفصول (School)

جميع المسارات مرتبطة بمدرسة واحدة (multi-tenant): البيانات معزولة حسب مستخدم المدرسة في JWT.

**البادئة الأساسية:** `/api/school`  
**الخادم الافتراضي (محلي):** `http://localhost:8000`

---

## المصادقة

| Header | القيمة |
|--------|--------|
| `Authorization` | `Bearer <access_token>` |
| `Content-Type` | `application/json` (لطلبات JSON) |

يجب أن يكون المستخدم **`role: school`** (تسجيل الدخول الموحد: `POST /api/auth/login` أو `/api/login` بحساب مدرسة).

---

## المراحل الدراسية (`stage`)

| القيمة في API | المعنى |
|----------------|--------|
| `primary` | ابتدائي |
| `preparatory` | إعدادي |
| `secondary` | ثانوي |

---

## Pagination (قوائم)

معاملات اختيارية على طلبات **GET** للقوائم:

| المعامل | الوصف | الافتراضي |
|---------|--------|-----------|
| `limit` | عدد العناصر | `20` (حد أقصى `100`) |
| `skip` | عدد العناصر التي تُتخطى من البداية | `0` |

**مثال:** `GET /api/school/grades?limit=10&skip=0`

---

# الصفوف الدراسية (Grades)

### 1) جلب كل صفوف المدرسة

```http
GET /api/school/grades
```

**Response 200 (مثال):**

```json
{
  "grades": [
    {
      "id": 1,
      "school_id": 5,
      "name": "أولى إعدادي",
      "stage": "preparatory",
      "description": null,
      "created_at": "2026-03-24T12:00:00.000Z",
      "updated_at": "2026-03-24T12:00:00.000Z"
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

---

### 2) إنشاء صف جديد

```http
POST /api/school/grades
```

**Body:**

```json
{
  "name": "أولى إعدادي",
  "stage": "preparatory",
  "description": "وصف اختياري"
}
```

| الحقل | نوع | إلزامي |
|-------|-----|--------|
| `name` | string (1–200) | نعم |
| `stage` | `primary` \| `preparatory` \| `secondary` | نعم |
| `description` | string (حتى 2000) | لا |

**Response 201:** `{ "grade": { ... } }`

**أخطاء شائعة:** `409` إذا كان اسم الصف مكرراً لنفس المدرسة.

---

### 3) جلب صف بالمعرف

```http
GET /api/school/grades/:gradeId
```

**Response 200:** `{ "grade": { ... } }`  
**404:** الصف غير موجود أو لا يخص هذه المدرسة.

---

### 4) تعديل صف

```http
PATCH /api/school/grades/:gradeId
```

**Body:** حقل واحد على الأقل:

```json
{
  "name": "ثانية إعدادي",
  "stage": "preparatory",
  "description": null
}
```

| الحقل | نوع |
|-------|-----|
| `name` | string (اختياري) |
| `stage` | نفس قيم المراحل (اختياري) |
| `description` | string أو `null` (اختياري) |

**Response 200:** `{ "grade": { ... } }`

---

### 5) حذف صف

```http
DELETE /api/school/grades/:gradeId
```

**Response 204:** بدون محتوى.

> عند الحذف، تُحذف **جميع الفصول** التابعة لهذا الصف تلقائياً (CASCADE في قاعدة البيانات).

---

# الفصول (Classes)

### 6) جلب كل فصول صف معين

```http
GET /api/school/grades/:gradeId/classes
```

يدعم `limit` و `skip` كما في قوائم الصفوف.

**Response 200 (مثال):**

```json
{
  "classes": [
    {
      "id": 10,
      "grade_id": 1,
      "name": "فصل 1/1",
      "capacity": 35,
      "created_at": "2026-03-24T12:00:00.000Z",
      "updated_at": "2026-03-24T12:00:00.000Z"
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

**404:** إذا كان `:gradeId` غير موجود أو لا يخص المدرسة.

---

### 7) إنشاء فصل داخل صف

```http
POST /api/school/grades/:gradeId/classes
```

**Body:**

```json
{
  "name": "فصل 1/2",
  "capacity": 30
}
```

| الحقل | نوع | إلزامي |
|-------|-----|--------|
| `name` | string (1–200) | نعم |
| `capacity` | عدد صحيح 0–1000000 أو `null` | لا |

**Response 201:** `{ "class": { ... } }`

**أخطاء:** `409` إذا كان اسم الفصل مكرراً داخل نفس الصف.

---

### 8) جلب فصل بالمعرف

```http
GET /api/school/classes/:classId
```

**Response 200:** `{ "class": { ... } }`  
**404:** الفصل غير موجود أو لا يخص صفاً تابعة لهذه المدرسة.

---

### 9) تعديل فصل

```http
PATCH /api/school/classes/:classId
```

**Body:** حقل واحد على الأقل:

```json
{
  "name": "فصل 1/3",
  "capacity": 40
}
```

**Response 200:** `{ "class": { ... } }`

---

### 10) حذف فصل

```http
DELETE /api/school/classes/:classId
```

**Response 204:** بدون محتوى.

---

## رموز HTTP مختصرة

| الرمز | الحالة |
|-------|--------|
| `200` | نجاح (جلب / تعديل) |
| `201` | إنشاء ناجح |
| `204` | حذف ناجح |
| `400` | مدخلات غير صالحة (validation أو معرف غير صحيح) |
| `401` | غير مصرّح (توكن مفقود أو غير صالح) |
| `403` | ممنوع (ليس حساب مدرسة) |
| `404` | مورد غير موجود أو لا يخص المدرسة |
| `409` | تعارض (اسم مكرر ضمن نفس النطاق) |

---

## مثال سريع (curl)

تسجيل الدخول ثم استدعاء قائمة الصفوف:

```bash
# 1) الحصول على التوكن (حساب مدرسة)
curl -s -X POST http://localhost:8000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"school@example.com\",\"password\":\"secret\"}"

# 2) جلب الصفوف
curl -s http://localhost:8000/api/school/grades ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## الملفات ذات الصلة في المشروع

| الملف | الوصف |
|-------|--------|
| `src/routes/school.routes.ts` | تعريف المسارات |
| `src/controllers/schoolGrade.controller.ts` | منطق الصفوف |
| `src/controllers/schoolClass.controller.ts` | منطق الفصول |
| `migrations/1761000000000_school_grades_and_classes.sql` | الجداول والقيود |
