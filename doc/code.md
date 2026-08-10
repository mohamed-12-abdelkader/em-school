# APIs أكواد التفعيل والتسجيل في الكورسات

## نظرة عامة
هذا الدليل يحتوي على APIs أكواد التفعيل والتسجيل في الكورسات التي تم إنشاؤها مؤخراً.

---

## 1. APIs أكواد التفعيل (للإدمن)

### إنشاء أكواد التفعيل للكورس
- **المسار**: `POST /api/courses/:id/invite-codes`
- **المصادقة**: `Authorization: Bearer <admin_token>`
- **Content-Type**: `application/json`
- **الوصف**: إنشاء أكواد تفعيل للكورس المحدد (استخدام واحد فقط لكل كود)

#### المعاملات:
```json
{
  "count": 5  // عدد الأكواد المطلوب إنشاؤها (1-100، افتراضي: 1)
}
```

#### مثال cURL:
```bash
# إنشاء كود واحد
curl -X POST https://your-host/api/courses/1/invite-codes \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{}'

# إنشاء 5 أكواد
curl -X POST https://your-host/api/courses/1/invite-codes \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"count": 5}'
```

#### الاستجابة:
```json
{
  "message": "Generated 5 invite code(s) for course",
  "codes": [
    { "id": 1, "code": "ABC123" },
    { "id": 2, "code": "DEF456" },
    { "id": 3, "code": "GHI789" },
    { "id": 4, "code": "JKL012" },
    { "id": 5, "code": "MNO345" }
  ]
}
```

### عرض أكواد التفعيل للكورس
- **المسار**: `GET /api/courses/:id/invite-codes`
- **المصادقة**: `Authorization: Bearer <admin_token>`

#### مثال cURL:
```bash
curl -X GET https://your-host/api/courses/1/invite-codes \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

#### الاستجابة:
```json
{
  "invite_codes": [
    {
      "id": 1,
      "code": "ABC123",
      "course_id": 1,
      "max_uses": 1,
      "uses": 0,
      "expires_at": null,
      "created_at": "2025-10-03T12:00:00.000Z",
      "course_title": "Physics 101"
    }
  ]
}
```

### حذف كود التفعيل
- **المسار**: `DELETE /api/courses/invite-codes/:codeId`
- **المصادقة**: `Authorization: Bearer <admin_token>`

#### مثال cURL:
```bash
curl -X DELETE https://your-host/api/courses/invite-codes/1 \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

#### الاستجابة:
- **204 No Content**: تم الحذف بنجاح
- **404 Not Found**: الكود غير موجود

---

## 2. APIs أكواد التفعيل (للمدرسين)

### إنشاء كود تفعيل
- **المسار**: `POST /api/teacher/invite-codes`
- **المصادقة**: `Authorization: Bearer <teacher_token>`
- **Content-Type**: `application/json`
- **الوصف**: إنشاء كود تفعيل للكورس (يمكن تحديد عدد الاستخدامات وتاريخ الانتهاء)

#### المعاملات:
```json
{
  "course_id": 1,
  "max_uses": 5,
  "expires_at": "2025-12-31T23:59:59.000Z"
}
```

#### مثال cURL:
```bash
curl -X POST https://your-host/api/teacher/invite-codes \
  -H "Authorization: Bearer <TEACHER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"course_id": 1, "max_uses": 5}'
```

#### الاستجابة:
```json
{
  "invite_code": {
    "id": 1,
    "code": "ABC123",
    "course_id": 1,
    "max_uses": 5,
    "uses": 0,
    "expires_at": "2025-12-31T23:59:59.000Z",
    "created_at": "2025-10-03T12:00:00.000Z"
  }
}
```

### عرض أكواد التفعيل
- **المسار**: `GET /api/teacher/invite-codes`
- **المصادقة**: `Authorization: Bearer <teacher_token>`

#### مثال cURL:
```bash
curl -X GET https://your-host/api/teacher/invite-codes \
  -H "Authorization: Bearer <TEACHER_TOKEN>"
```

#### الاستجابة:
```json
{
  "invite_codes": [
    {
      "id": 1,
      "code": "ABC123",
      "course_id": 1,
      "max_uses": 5,
      "uses": 2,
      "expires_at": "2025-12-31T23:59:59.000Z",
      "created_at": "2025-10-03T12:00:00.000Z",
      "course_title": "Physics 101"
    }
  ]
}
```

### حذف كود التفعيل
- **المسار**: `DELETE /api/teacher/invite-codes/:id`
- **المصادقة**: `Authorization: Bearer <teacher_token>`

#### مثال cURL:
```bash
curl -X DELETE https://your-host/api/teacher/invite-codes/1 \
  -H "Authorization: Bearer <TEACHER_TOKEN>"
```

#### الاستجابة:
- **204 No Content**: تم الحذف بنجاح
- **404 Not Found**: الكود غير موجود

---

## 3. APIs التسجيل في الكورسات (للطلاب)

### التسجيل في الكورس باستخدام كود التفعيل
- **المسار**: `POST /api/student/enroll`
- **المصادقة**: `Authorization: Bearer <student_token>`
- **Content-Type**: `application/json`
- **الوصف**: تسجيل الطالب في الكورس باستخدام كود التفعيل

#### المعاملات:
```json
{
  "course_id": 1,
  "code": "ABC123"
}
```

#### مثال cURL:
```bash
curl -X POST https://your-host/api/student/enroll \
  -H "Authorization: Bearer <STUDENT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"course_id": 1, "code": "ABC123"}'
```

#### الاستجابة:
- **201 Created**:
```json
{
  "message": "Successfully enrolled in course"
}
```

- **400 Bad Request** (كود غير صحيح):
```json
{
  "message": "Invalid invite code"
}
```

- **400 Bad Request** (كود منتهي الصلاحية):
```json
{
  "message": "Invite code has expired"
}
```

- **400 Bad Request** (كود وصل للحد الأقصى):
```json
{
  "message": "Invite code has reached maximum uses"
}
```

- **400 Bad Request** (مسجل مسبقاً):
```json
{
  "message": "You are already enrolled in this course"
}
```

### عرض الكورسات المسجل فيها الطالب
- **المسار**: `GET /api/student/enrolled-courses`
- **المصادقة**: `Authorization: Bearer <student_token>`

#### مثال cURL:
```bash
curl -X GET https://your-host/api/student/enrolled-courses \
  -H "Authorization: Bearer <STUDENT_TOKEN>"
```

#### الاستجابة:
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
      "enrolled_at": "2025-10-03T14:30:00.000Z"
    }
  ]
}
```

---

## 4. APIs عرض الكورسات للطلاب

### عرض الكورسات المتاحة للطالب
- **المسار**: `GET /api/student/courses`
- **المصادقة**: `Authorization: Bearer <student_token>`
- **الوصف**: يعرض الكورسات المتاحة للطالب حسب صفه الدراسي مع حالة التسجيل

#### مثال cURL:
```bash
curl -X GET https://your-host/api/student/courses \
  -H "Authorization: Bearer <STUDENT_TOKEN>"
```

#### الاستجابة:
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
      "status": "available",  // أو "enrolled"
      "enrolled_at": null
    }
  ]
}
```

### عرض تفاصيل الكورس
- **المسار**: `GET /api/courses/:id`
- **المصادقة**: `admin` (جميع الكورسات) أو `student` (الكورسات المسجل فيها فقط)
- **الوصف**: يعرض تفاصيل الكورس مع المحاضرات والفيديوهات والملفات

#### مثال cURL:
```bash
# للطالب
curl -X GET https://your-host/api/courses/1 \
  -H "Authorization: Bearer <STUDENT_TOKEN>"
```

#### الاستجابة:
```json
{
  "course": {
    "id": 1,
    "title": "Physics 101",
    "description": "Intro to physics",
    "price": 199.99,
    "grade_id": 4,
    "image_url": "https://...",
    "created_at": "2025-10-03T12:00:00.000Z",
    "lectures": [
      {
        "id": 1,
        "title": "Introduction to Physics",
        "description": "Basic concepts",
        "position": 1,
        "created_at": "2025-10-03T12:00:00.000Z",
        "videos": [
          {
            "id": 1,
            "video_url": "https://...",
            "title": "Video 1",
            "position": 1
          }
        ],
        "files": [
          {
            "id": 1,
            "file_url": "https://...",
            "filename": "notes.pdf",
            "uploaded_at": "2025-10-03T12:00:00.000Z"
          }
        ]
      }
    ],
    "teacher": {
      "id": 2,
      "name": "Dr. Ahmed",
      "avatar": "https://..."
    }
  }
}
```

---

## 6. APIs إدارة الطلاب في الكورسات (للإدمن)

### عرض الطلاب المشتركين في الكورس
- **المسار**: `GET /api/courses/:id/students`
- **المصادقة**: `Authorization: Bearer <admin_token>`
- **الوصف**: يعرض قائمة الطلاب المشتركين في الكورس المحدد

#### المعاملات:
- `limit` (اختياري): عدد الطلاب في الصفحة (افتراضي: 50)
- `skip` (اختياري): عدد الطلاب المراد تخطيها (افتراضي: 0)

#### مثال cURL:
```bash
curl -X GET "https://your-host/api/courses/1/students?limit=20&skip=0" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

#### الاستجابة:
```json
{
  "course": {
    "id": 1,
    "title": "Physics 101"
  },
  "students": [
    {
      "id": 5,
      "name": "أحمد محمد",
      "phone": "+201234567890",
      "email": "ahmed@example.com",
      "avatar": "https://...",
      "enrolled_at": "2025-10-03T14:30:00.000Z",
      "grade_name": "ثالثة ثانوي"
    }
  ],
  "total": 25,
  "limit": 20,
  "skip": 0
}
```

### حذف طالب من الكورس
- **المسار**: `DELETE /api/courses/:id/students/:studentId`
- **المصادقة**: `Authorization: Bearer <admin_token>`
- **الوصف**: يحذف الطالب من الكورس (يتم حذف التسجيل نهائياً)

#### مثال cURL:
```bash
curl -X DELETE https://your-host/api/courses/1/students/5 \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

#### الاستجابة:
- **200 OK**:
```json
{
  "message": "Student removed from course successfully",
  "student": {
    "id": 5,
    "name": "أحمد محمد"
  },
  "course": {
    "id": 1,
    "title": "Physics 101"
  }
}
```

- **404 Not Found** (طالب غير موجود أو غير مشترك):
```json
{
  "message": "Student not found or not enrolled in this course"
}
```

---

## 5. ملاحظات مهمة

### الفرق بين أكواد الإدمن والمدرسين:
- **أكواد الإدمن**: استخدام واحد فقط، بدون انتهاء صلاحية
- **أكواد المدرسين**: يمكن تحديد عدد الاستخدامات وتاريخ الانتهاء

### الأمان:
- كل كود يستخدم مرة واحدة فقط (للإدمن)
- التحقق من صحة الكود وانتهاء الصلاحية
- منع التسجيل المكرر في نفس الكورس
- تتبع من استخدم الكود ومتى

### الصلاحيات:
- **الإدمن**: يمكن إنشاء أكواد لأي كورس
- **المدرس**: يمكن إنشاء أكواد فقط للكورسات في الصفوف المسؤول عنها
- **الطالب**: يمكن استخدام الأكواد للتسجيل في الكورسات

### أكواد الاستجابة:
- **200**: نجح الطلب
- **201**: تم التسجيل بنجاح
- **204**: تم الحذف بنجاح
- **400**: خطأ في البيانات أو الكود
- **401**: غير مصرح (توكن غير صحيح)
- **403**: ممنوع (لا توجد صلاحية)
- **404**: العنصر غير موجود