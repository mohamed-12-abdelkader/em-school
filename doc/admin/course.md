## إدارة الكورسات (Admin Courses API)

- Base URL: `/api`
- المصادقة: يجب إرسال `Authorization: Bearer <admin token>`
- الرفع: صورة الكورس اختيارية عبر `multipart/form-data` بالحقل `image`

### إنشاء كورس

- POST `api/courses`
- Content-Type: `multipart/form-data`
- الحقول:
  - `title` (نص إجباري)
  - `description` (نص اختياري)
  - `price` (رقم ≥ 0)
  - `grade_id` (اختياري: رقم يشير إلى صف دراسي من `/utils/grades`)
  - `image` (اختياري: ملف صورة من الجهاز)

مثال cURL:

```bash
curl -X POST https://your-host/api/courses \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -F "image=@C:/path/to/course.jpg" \
  -F "title=Physics 101" \
  -F "description=Intro to physics" \
  -F "price=199.99" \
  -F "grade_id=4"
```

Response 201:

```json
{
  "course": {
    "id": 1,
    "title": "Physics 101",
    "description": "Intro to physics",
    "price": 199.99,
    "grade_id": 4,
    "image_url": "https://...",
    "created_at": "2025-10-03T12:00:00.000Z"
  }
}
```

### عرض الكورسات

- GET `api/courses?limit=10&skip=0&grade_id=`
- باراميترات:
  - `limit` (افتراضي 10)
  - `skip` (افتراضي 0)
  - `grade_id` (اختياري لتصفية الكورسات حسب الصف الدراسي)

مثال cURL:

```bash
curl -X GET "https://your-host/api/courses?limit=10&skip=0&grade_id=4" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Response 200:

```json
{
  "courses": [
    {
      "id": 1,
      "title": "Physics 101",
      "description": "Intro...",
      "price": 199.99,
      "grade_id": 4,
      "image_url": "https://...",
      "created_at": "..."
    }
  ]
}
```

### تعديل كورس

- PUT `api/courses/:id`
- Content-Type: `multipart/form-data`
- الحقول (اختيارية): `title`, `description`, `price`, `grade_id`, `image`

مثال cURL:

```bash
curl -X PUT https://your-host/api/courses/1 \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -F "image=@C:/path/to/new.jpg" \
  -F "title=Physics Basics" \
  -F "price=149.99"
```

Response 200:

```json
{
  "course": {
    "id": 1,
    "title": "Physics Basics",
    "price": 149.99,
    "grade_id": 4,
    "image_url": "https://...",
    "created_at": "..."
  }
}
```

### عرض تفاصيل الكورس

- GET `/courses/:id`
- المصادقة: `admin` (جميع الكورسات) أو `student` (الكورسات المسجل فيها فقط)

مثال cURL:

```bash
# للادمن
curl -X GET https://your-host/api/courses/1 \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

# للطالب
curl -X GET https://your-host/api/courses/1 \
  -H "Authorization: Bearer <STUDENT_TOKEN>"
```

Response 200:

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

Response 403 (للطالب غير المسجل):

```json
{ "message": "Access denied. You must be enrolled in this course." }
```

Response 404:

```json
{ "message": "Course not found" }
```

### إنشاء أكواد التفعيل للكورس

- POST `/courses/:id/invite-codes`
- الحقول:
  - `count` (رقم، اختياري): عدد الأكواد المطلوب إنشاؤها (افتراضي: 1، حد أقصى: 100)

مثال cURL:

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

Response 201:

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

- GET `/courses/:id/invite-codes`

مثال cURL:

```bash
curl -X GET https://your-host/api/courses/1/invite-codes \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Response 200:

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

- DELETE `/courses/invite-codes/:codeId`

مثال cURL:

```bash
curl -X DELETE https://your-host/api/courses/invite-codes/1 \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Response 204: بدون محتوى

### عرض الطلاب المشتركين في الكورس

- GET `/courses/:id/students`
- المعاملات:
  - `limit` (اختياري): عدد الطلاب في الصفحة (افتراضي: 50)
  - `skip` (اختياري): عدد الطلاب المراد تخطيها (افتراضي: 0)

مثال cURL:

```bash
curl -X GET "https://your-host/api/courses/1/students?limit=20&skip=0" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Response 200:

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

- DELETE `/courses/:id/students/:studentId`

مثال cURL:

```bash
curl -X DELETE https://your-host/api/courses/1/students/5 \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Response 200:

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

Response 404 (طالب غير موجود أو غير مشترك):

```json
{ "message": "Student not found or not enrolled in this course" }
```

### حذف كورس

- DELETE `/courses/:id`

مثال cURL:

```bash
curl -X DELETE https://your-host/api/courses/1 \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Response 204: بدون محتوى
