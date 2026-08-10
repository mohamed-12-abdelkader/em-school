# تسجيل الطلاب المتعدد (Multiple Student Accounts)

## نظرة عامة
يمكن للطلاب إنشاء أكثر من حساب بنفس رقم الهاتف ورقم ولي الأمر، بشرط أن يكون لكل حساب `admin_id` مختلف.

## تسجيل الطالب مع admin_id

- POST `/api/user/register`

### المعاملات:
```json
{
  "phone": "+201234567890",
  "guardian_phone": "+201098765432",
  "password": "student123",
  "name": "Student Name",
  "grade_id": 4,
  "admin_id": 3
}
```

### قواعد التكرار:
- ✅ **مسموح**: نفس الهاتف + نفس ولي الأمر + `admin_id` مختلف
- ❌ **ممنوع**: نفس الهاتف + نفس ولي الأمر + نفس `admin_id`
- ✅ **مسموح**: نفس الهاتف + نفس ولي الأمر + بدون `admin_id` (إذا لم يكن هناك حساب بدون `admin_id`)

### أمثلة:

#### مسموح:
```json
// حساب 1
{
  "phone": "+201234567890",
  "guardian_phone": "+201098765432",
  "admin_id": 3
}

// حساب 2 (admin_id مختلف)
{
  "phone": "+201234567890",
  "guardian_phone": "+201098765432",
  "admin_id": 5
}
```

#### ممنوع:
```json
// محاولة إنشاء حساب بنفس admin_id
{
  "phone": "+201234567890",
  "guardian_phone": "+201098765432",
  "admin_id": 3  // نفس admin_id السابق
}
```

### الاستجابة:
- 201 Created:
```json
{
  "user": {
    "id": 10,
    "phone": "+201234567890",
    "name": "Student Name",
    "role": "student",
    "guardian_phone": "+201098765432",
    "admin_id": 3,
    "grade_id": 4
  },
  "token": "JWT_TOKEN"
}
```

- 400 Bad Request (تكرار):
```json
{
  "message": "Student with same phone, guardian phone, and admin already exists"
}
```

## عرض الكورسات حسب الأدمن

- GET `/api/student/courses`

### الوصف
يعرض الكورسات المتاحة للطالب حسب الأدمن المخصص له.

### الاستجابة:
```json
{
  "courses": [
    {
      "id": 1,
      "title": "Physics 101",
      "description": "Introduction to Physics",
      "price": 199.99,
      "grade_id": 4,
      "image_url": "https://...",
      "created_at": "2025-10-03T12:00:00.000Z",
      "status": "available",
      "enrolled_at": null,
      "admin_name": "Admin Name"
    }
  ],
  "admin_id": 3,
  "admin_name": "Admin Name"
}
```

## ملاحظات مهمة

1. **admin_id اختياري**: يمكن تسجيل طالب بدون `admin_id`
2. **التحقق من الأدمن**: إذا تم توفير `admin_id`، يجب أن يكون أدمن صالح
3. **عرض الكورسات**: الطالب يرى فقط الكورسات الخاصة بالأدمن المخصص له
4. **التكرار**: النظام يمنع التكرار بناءً على الهاتف + ولي الأمر + admin_id


