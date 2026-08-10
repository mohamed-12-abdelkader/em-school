## تسجيل الدخول (Login API)

- Base URL: `/api`
- المصادقة بعد تسجيل الدخول: أرسل التوكن في الهيدر `Authorization: Bearer <token>`

### تسجيل الدخول

- POST `/login`

### الوصف

- تسجيل الدخول باستخدام الإيميل أو رقم الهاتف مع كلمة المرور.
- يجب إرسال أحد الحقلين: `email` أو `phone` بالإضافة إلى `password`.
- يدعم جميع الأدوار: `student`, `teacher`, `admin`, `manager`

### الطلب (Request)

- Login بواسطة الإيميل:

```json
{
  "email": "user@example.com",
  "password": "yourPassword"
}
```

- Login بواسطة الهاتف (للطلاب):

```json
{
  "phone": "+201234567890",
  "password": "yourPassword",
  "admin_id": 3
}
```

ملاحظات:
- صيغة الهاتف يجب أن تكون أرقام فقط مع كود الدولة إن لزم (8–15 رقم).
- لا يمكن الجمع بين `email` و`phone` في نفس الطلب، اختر أحدهما فقط.
- **للطلاب**: `admin_id` مطلوب لتحديد أي حساب من حسابات الطالب المتعددة.
- **للأدمن/المعلم/المدير**: استخدم `email` بدلاً من `phone`.

### الاستجابة (Response)

- 200 OK:

```json
{
  "user": {
    "id": 1,
    "name": "User Name",
    "email": "user@example.com",
    "phone": "+201234567890",
    "role": "student"
  },
  "token": "<JWT>"
}
```

- 400 Bad Request (بيانات غير صحيحة أو حساب غير موجود):

```json
{ "message": "Invalid credentials" }
```

### أمثلة cURL

```bash
# تسجيل الدخول بالإيميل (للأدمن/المعلم/المدير)
curl -X POST https://your-host/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"yourPassword"}'

# تسجيل الدخول بالهاتف للطالب مع أدمن محدد
curl -X POST https://your-host/api/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+201234567890","password":"yourPassword","admin_id":3}'

# تسجيل الدخول بالهاتف للطالب بدون أدمن
curl -X POST https://your-host/api/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+201234567890","password":"yourPassword"}'

# استخدام التوكن بعد تسجيل الدخول
curl -X GET https://your-host/api/user/me \
  -H "Authorization: Bearer <JWT>"
```

## نظام الحسابات المتعددة للطلاب

### كيف يعمل النظام:

1. **الطالب يمكنه إنشاء عدة حسابات** بنفس رقم الهاتف ورقم ولي الأمر
2. **كل حساب مرتبط بأدمن مختلف** عبر `admin_id`
3. **عند تسجيل الدخول**، الطالب يجب أن يحدد `admin_id` ليتم تسجيل دخوله للحساب الصحيح

### مثال عملي:

```json
// حساب الطالب مع أدمن رقم 1
{
  "phone": "+201234567890",
  "guardian_phone": "+201098765432",
  "admin_id": 1
}

// حساب الطالب مع أدمن رقم 2 (نفس البيانات!)
{
  "phone": "+201234567890", 
  "guardian_phone": "+201098765432",
  "admin_id": 2
}
```

### تسجيل الدخول:

```bash
# تسجيل دخول للحساب الأول (مع أدمن 1)
curl -X POST https://your-host/api/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+201234567890","password":"password","admin_id":1}'

# تسجيل دخول للحساب الثاني (مع أدمن 2)
curl -X POST https://your-host/api/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+201234567890","password":"password","admin_id":2}'
```

## الحصول على قائمة الأدمن المتاحين

- GET `/api/available-admins`

### الوصف
يعرض قائمة بجميع الأدمن النشطين المتاحين للطلاب للانضمام إليهم.

### الاستجابة:
- 200 OK:
```json
{
  "admins": [
    {
      "id": 1,
      "name": "أدمن المدرسة الأولى",
      "email": "admin1@school.com",
      "status": "active",
      "created_at": "2025-10-03T10:00:00.000Z"
    },
    {
      "id": 2,
      "name": "أدمن المدرسة الثانية", 
      "email": "admin2@school.com",
      "status": "active",
      "created_at": "2025-10-03T11:00:00.000Z"
    }
  ]
}
```

### مثال cURL:
```bash
curl -X GET "https://your-host/api/available-admins"
```

---

## إنشاء أدمن جديد (Manager Only)

- POST `/api/create-admin`
- المصادقة: `Authorization: Bearer <manager_token>`

### الوصف

- يسمح للمدير بإنشاء حساب أدمن جديد في النظام.
- المدير فقط يمكنه استخدام هذا API.

### الطلب (Request)

```json
{
  "name": "Admin Name",
  "email": "admin@example.com",
  "password": "admin123456"
}
```

### الاستجابة (Response)

- 201 Created:

```json
{
  "message": "Admin created successfully",
  "admin": {
    "id": 3,
    "email": "admin@example.com",
    "name": "Admin Name",
    "role": "admin",
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

- 401 Unauthorized (غير مصرح):

```json
{
  "message": "Forbidden: insufficient role"
}
```

### مثال cURL

```bash
curl -X POST https://your-host/api/create-admin \
  -H "Authorization: Bearer <MANAGER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin Name",
    "email": "admin@example.com",
    "password": "admin123456"
  }'
```

---

## إنشاء حساب المدير (للاختبار)

- POST `/api/create-manager-test`

### الوصف

- إنشاء حساب مدير بقيم ثابتة للاختبار.
- يستخدم الإيميل: `manager@example.com` وكلمة المرور: `manager123456`

### الاستجابة (Response)

- 201 Created:

```json
{
  "message": "Manager account created successfully",
  "user": {
    "id": 2,
    "email": "manager@example.com",
    "name": "Manager",
    "role": "manager"
  },
  "credentials": {
    "email": "manager@example.com",
    "password": "manager123456"
  }
}
```

- 400 Bad Request (المدير موجود مسبقاً):

```json
{
  "message": "Manager account already exists"
}
```

### مثال cURL

```bash
curl -X POST https://your-host/api/create-manager-test
```

---

## التحقق من وجود المدير

- GET `/api/check-manager`

### الوصف

- للتحقق من وجود حساب المدير في النظام.

### الاستجابة (Response)

- 200 OK (المدير موجود):

```json
{
  "exists": true,
  "user": {
    "id": 2,
    "email": "manager@example.com",
    "name": "Manager",
    "role": "manager"
  }
}
```

- 200 OK (المدير غير موجود):

```json
{
  "exists": false,
  "message": "Manager account not found"
}
```

### مثال cURL

```bash
curl -X GET https://your-host/api/check-manager
```

---

## عرض جميع المستخدمين (للاختبار)

- GET `/api/debug/users`

### الوصف

- يعرض جميع المستخدمين في النظام (للاستكشاف والاختبار).

### الاستجابة (Response)

```json
{
  "users": [
    {
      "id": 1,
      "email": "admin@example.com",
      "name": "Admin",
      "role": "admin",
      "created_at": "2025-10-03T12:00:00.000Z"
    },
    {
      "id": 2,
      "email": "manager@example.com",
      "name": "Manager",
      "role": "manager",
      "created_at": "2025-10-03T12:00:00.000Z"
    }
  ],
  "total": 2
}
```

### مثال cURL

```bash
curl -X GET https://your-host/api/debug/users
```

---

## ملاحظات مهمة

### الأدوار المدعومة:
- **student**: الطالب
- **teacher**: المدرس
- **admin**: الأدمن
- **manager**: المدير

### الصلاحيات:
- **المدير**: يمكنه إنشاء أدمن جديد
- **الأدمن**: يمكنه إدارة الكورسات والطلاب
- **المدرس**: يمكنه إدارة الكورسات في صفوفه
- **الطالب**: يمكنه التسجيل في الكورسات

### الأمان:
- جميع كلمات المرور يتم تشفيرها تلقائياً
- التوكنات صالحة لمدة 7 أيام
- التحقق من الصلاحيات في كل API


