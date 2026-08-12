# استكشاف أخطاء تسجيل دخول المدير

## المشكلة

عند محاولة تسجيل الدخول بحساب المدير، يظهر خطأ "Invalid credentials".

## خطوات الحل

### 1. التحقق من وجود المدير

```bash
curl -X GET http://localhost:8000/api/check-manager
```

**الاستجابة المتوقعة:**

```json
{
  "exists": true,
  "user": {
    "id": 2,
    "email": "manager@example.com",
    "name": "Manager",
    "role": "manger"
  }
}
```

### 2. إنشاء حساب المدير يدوياً

إذا لم يكن المدير موجوداً:

```bash
curl -X POST http://localhost:8000/api/create-manager
```

**الاستجابة المتوقعة:**

```json
{
  "message": "Manager account created successfully",
  "user": {
    "id": 2,
    "email": "manager@example.com",
    "name": "Manager",
    "role": "manger"
  }
}
```

### 3. التحقق من متغيرات البيئة

تأكد من وجود المتغيرات التالية في ملف `.env`:

```env
MANAGER_EMAIL=manager@example.com
MANAGER_PASSWORD=manager123456
```

### 4. إعادة تشغيل المايجريشن

```bash
npm run migrate
# أو
yarn migrate
```

### 5. اختبار تسجيل الدخول

```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@example.com","password":"manager123456"}'
```

**الاستجابة المتوقعة:**

```json
{
  "user": {
    "id": 2,
    "name": "Manager",
    "email": "manager@example.com",
    "phone": null,
    "role": "manger"
  },
  "token": "JWT_TOKEN"
}
```

## الأخطاء الشائعة

### 1. "Manager credentials not configured"

- **السبب**: متغيرات البيئة غير موجودة
- **الحل**: أضف `MANAGER_EMAIL` و `MANAGER_PASSWORD` إلى `.env`

### 2. "Manager account already exists"

- **السبب**: المدير موجود بالفعل
- **الحل**: استخدم `/check-manager` للتحقق من البيانات

### 3. "Invalid credentials"

- **السبب**: كلمة المرور خاطئة أو المدير غير موجود
- **الحل**:
  1. تحقق من وجود المدير بـ `/check-manager`
  2. أنشئ المدير بـ `/create-manager`
  3. تأكد من كلمة المرور الصحيحة

## نصائح إضافية

1. **تأكد من إعادة تشغيل الخادم** بعد إضافة متغيرات البيئة
2. **تحقق من قاعدة البيانات** مباشرة إذا استمرت المشكلة
3. **استخدم `/check-manager`** للتأكد من البيانات قبل تسجيل الدخول
