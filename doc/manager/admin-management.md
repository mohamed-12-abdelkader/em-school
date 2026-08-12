# إدارة الأدمن للمدير (Manager Admin Management API)

- Base URL: `/api`
- المصادقة: يجب إرسال `Authorization: Bearer <manager_token>`

## إنشاء أدمن جديد

- POST `/api/create-admin`

### الوصف

يسمح للمدير بإنشاء حساب أدمن جديد في النظام.

### المعاملات المطلوبة:

```json
{
  "name": "Admin Name",
  "email": "admin@example.com",
  "password": "admin123456",
  "status": "active"
}
```

### المعاملات الاختيارية:

- `status`: حالة الحساب - `"active"` (نشط) أو `"inactive"` (غير نشط) - الافتراضي: `"active"`

### الاستجابة:

- 201 Created:

```json
{
  "message": "Admin created successfully",
  "admin": {
    "id": 3,
    "email": "admin@example.com",
    "name": "Admin Name",
    "role": "admin",
    "status": "active",
    "created_at": "2025-10-03T12:00:00.000Z"
  }
}
```

- 400 Bad Request (إيميل موجود مسبقاً):

```json
{
  "message": "Admin with this email already exists"
}
```

### مثال cURL:

```bash
curl -X POST https://your-host/api/create-admin \
  -H "Authorization: Bearer <MANAGER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin Name",
    "email": "admin@example.com",
    "password": "admin123456",
    "status": "active"
  }'
```

## تحديث حالة الأدمن

- PATCH `/api/admin/:id/status`

### الوصف

يسمح للمدير بتحديث حالة الأدمن (نشط/غير نشط).

### المعاملات المطلوبة:

```json
{
  "status": "inactive"
}
```

### الاستجابة:

- 200 OK:

```json
{
  "message": "Admin status updated to inactive",
  "admin": {
    "id": 3,
    "name": "Admin Name",
    "email": "admin@example.com",
    "status": "inactive",
    "updated_at": "2025-10-03T12:30:00.000Z"
  }
}
```

### مثال cURL:

```bash
curl -X PATCH https://your-host/api/admin/3/status \
  -H "Authorization: Bearer <MANAGER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status": "inactive"}'
```

## قائمة الأدمن

- GET `/api/admins`

### الوصف

يعرض قائمة بجميع الأدمن مع حالتهم.

### المعاملات الاختيارية:

- `limit`: عدد النتائج (افتراضي: 10)
- `skip`: عدد النتائج المراد تخطيها (افتراضي: 0)
- `q`: البحث بالاسم أو الإيميل

### الاستجابة:

- 200 OK:

```json
{
  "admins": [
    {
      "id": 1,
      "name": "Admin One",
      "email": "admin1@example.com",
      "status": "active",
      "created_at": "2025-10-03T12:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Admin Two",
      "email": "admin2@example.com",
      "status": "inactive",
      "created_at": "2025-10-03T11:00:00.000Z"
    }
  ]
}
```

### مثال cURL:

```bash
curl -X GET "https://your-host/api/admins?limit=20&q=admin" \
  -H "Authorization: Bearer <MANAGER_TOKEN>"
```

## ملاحظات مهمة

- **الصلاحيات**: المدير فقط يمكنه إنشاء وتحديث حالة الأدمن
- **التفرد**: لا يمكن إنشاء أدمن بنفس الإيميل مرتين
- **الأمان**: كلمة المرور يتم تشفيرها تلقائياً
- **التحقق**: يتم التحقق من صحة البيانات قبل الإنشاء
- **الحالة**: الحسابات غير النشطة لا يمكنها تسجيل الدخول
- **الافتراضي**: الحسابات الجديدة تُنشأ بحالة "نشط" افتراضياً
