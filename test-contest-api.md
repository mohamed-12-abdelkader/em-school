# اختبار API المسابقات

## 1. تسجيل دخول الأدمن
```bash
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

## 2. إنشاء مسابقة جديدة
```bash
POST http://localhost:3000/contests
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

title: مسابقة الرياضيات
description: مسابقة في مادة الرياضيات للصف الأول الثانوي
grade_id: 4
image: [اختياري - ملف صورة]
```

## 3. عرض مسابقات الأدمن
```bash
GET http://localhost:3000/contests/admin
Authorization: Bearer <admin_token>
```

## 4. تسجيل دخول الطالب
```bash
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "password123"
}
```

## 5. عرض مسابقات الطالب
```bash
GET http://localhost:3000/contests/student
Authorization: Bearer <student_token>
```

## 6. تحديث مسابقة
```bash
PUT http://localhost:3000/contests/admin/1
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

title: مسابقة الرياضيات المحدثة
description: وصف محدث
```

## 7. حذف مسابقة
```bash
DELETE http://localhost:3000/contests/admin/1
Authorization: Bearer <admin_token>
```

## ملاحظات:
- تأكد من تشغيل migration أولاً: `npx node-pg-migrate up`
- استبدل `<admin_token>` و `<student_token>` بالتوكن الفعلي
- للرفع: استخدم Postman أو أداة مشابهة تدعم multipart/form-data





