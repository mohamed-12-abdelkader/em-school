# نظام المسابقات - API Documentation

## نظرة عامة

نظام المسابقات يسمح للأدمن بإنشاء وإدارة المسابقات للطلاب المسجلين لديه، مع إمكانية ربط المسابقات بصفوف محددة.

## الجداول

### جدول المسابقات (contests)

- `id`: معرف فريد للمسابقة
- `title`: عنوان المسابقة (مطلوب)
- `description`: وصف المسابقة (اختياري)
- `image_url`: رابط صورة المسابقة (اختياري)
- `grade_id`: معرف الصف (مطلوب)
- `admin_id`: معرف الأدمن المنشئ للمسابقة (مطلوب)
- `created_at`: تاريخ الإنشاء
- `updated_at`: تاريخ آخر تحديث

## API Endpoints

### 1. إنشاء مسابقة جديدة (للأدمن)

**POST** `/api/contests`

**Headers:**

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (Form Data):**

- `title` (string, required): عنوان المسابقة
- `description` (string, optional): وصف المسابقة
- `image` (file, optional): صورة المسابقة (JPEG, PNG, GIF - حد أقصى 5MB)
- `grade_id` (number, required): معرف الصف

**Response:**

```json
{
  "message": "تم إنشاء المسابقة بنجاح",
  "contest": {
    "id": 1,
    "title": "مسابقة الرياضيات",
    "description": "مسابقة في مادة الرياضيات للصف الأول الثانوي",
    "image_url": "/uploads/1234567890-image.jpg",
    "grade_id": 4,
    "admin_id": 1,
    "created_at": "2024-01-01T10:00:00.000Z",
    "updated_at": "2024-01-01T10:00:00.000Z"
  }
}
```

### 2. عرض جميع مسابقات الأدمن

**GET** `/api/contests/admin`

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "contests": [
    {
      "id": 1,
      "title": "مسابقة الرياضيات",
      "description": "مسابقة في مادة الرياضيات",
      "image_url": "/uploads/1234567890-image.jpg",
      "grade_id": 4,
      "admin_id": 1,
      "created_at": "2024-01-01T10:00:00.000Z",
      "updated_at": "2024-01-01T10:00:00.000Z",
      "grade_name": "أولى ثانوي"
    }
  ]
}
```

### 3. عرض مسابقة واحدة (للأدمن)

**GET** `/api/contests/admin/:id`

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "contest": {
    "id": 1,
    "title": "مسابقة الرياضيات",
    "description": "مسابقة في مادة الرياضيات",
    "image_url": "/uploads/1234567890-image.jpg",
    "grade_id": 4,
    "admin_id": 1,
    "created_at": "2024-01-01T10:00:00.000Z",
    "updated_at": "2024-01-01T10:00:00.000Z",
    "grade_name": "أولى ثانوي"
  }
}
```

### 4. تحديث مسابقة (للأدمن)

**PUT** `/api/contests/admin/:id`

**Headers:**

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (Form Data):**

- `title` (string, optional): عنوان المسابقة
- `description` (string, optional): وصف المسابقة
- `image` (file, optional): صورة جديدة للمسابقة
- `grade_id` (number, optional): معرف الصف

**Response:**

```json
{
  "message": "تم تحديث المسابقة بنجاح",
  "contest": {
    "id": 1,
    "title": "مسابقة الرياضيات المحدثة",
    "description": "وصف محدث",
    "image_url": "/uploads/new-image.jpg",
    "grade_id": 5,
    "admin_id": 1,
    "created_at": "2024-01-01T10:00:00.000Z",
    "updated_at": "2024-01-01T11:00:00.000Z"
  }
}
```

### 5. حذف مسابقة (للأدمن)

**DELETE** `/api/contests/admin/:id`

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "message": "تم حذف المسابقة بنجاح"
}
```

### 6. استرجاع المسابقات للطلاب

**GET** `/api/contests/student`

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "contests": [
    {
      "id": 1,
      "title": "مسابقة الرياضيات",
      "description": "مسابقة في مادة الرياضيات",
      "image_url": "/uploads/1234567890-image.jpg",
      "grade_id": 4,
      "admin_id": 1,
      "created_at": "2024-01-01T10:00:00.000Z",
      "updated_at": "2024-01-01T10:00:00.000Z",
      "grade_name": "أولى ثانوي"
    }
  ]
}
```

## ملاحظات مهمة

### للطلاب:

- الطلاب يرون فقط مسابقات الأدمن المسجلين لديه
- بالإضافة إلى مسابقات الصف الخاص بهم (إذا كانوا مسجلين في صف)

### للأدمن:

- يمكن للأدمن إنشاء مسابقات لطلابه فقط
- يمكن ربط المسابقة بصف محدد
- يمكن رفع صورة للمسابقة (اختياري)

### رفع الصور:

- أنواع الملفات المدعومة: JPEG, JPG, PNG, GIF
- الحد الأقصى لحجم الملف: 5MB
- **إذا كان Cloudinary مُكوّن**: الصور تُرفع إلى Cloudinary تلقائياً
- **إذا لم يكن Cloudinary مُكوّن**: الصور تُحفظ محلياً في مجلد `uploads/`
- الصور تُحفظ في مجلد `contests/` على Cloudinary (إذا كان مُكوّن)
- رابط الصورة يُرجع في الاستجابة (Cloudinary أو محلي)
- الصور تُحذف تلقائياً عند حذف المسابقة

### الأخطاء الشائعة:

- `401`: غير مصرح بالوصول (مطلوب تسجيل دخول)
- `403`: ممنوع (مطلوب دور أدمن للعمليات الإدارية)
- `400`: بيانات غير صحيحة
- `404`: المسابقة غير موجودة
- `500`: خطأ في الخادم

## تشغيل Migration

```bash
npm run migrate
```

هذا سيقوم بتشغيل migration لإنشاء جدول المسابقات في قاعدة البيانات.

## تكوين Cloudinary (اختياري)

### إذا كنت تريد استخدام Cloudinary:

أضف هذه المتغيرات إلى ملف `.env`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

يمكنك الحصول على هذه القيم من [Cloudinary Dashboard](https://cloudinary.com/console).

### إذا لم تكن تريد استخدام Cloudinary:

- الصور ستُحفظ محلياً في مجلد `uploads/`
- لا حاجة لإضافة متغيرات Cloudinary
- النظام سيعمل بشكل طبيعي مع التخزين المحلي

## معلومات مهمة

- **الخادم يعمل على المنفذ 8000** (وليس 3000)
- **جميع المسارات تحت `/api`**
- **يحتاج إلى token صحيح للتحقق من الهوية**

**مثال على الاختبار:**

```bash
GET http://localhost:8000/api/contests/admin
Authorization: Bearer <admin_token>
```
