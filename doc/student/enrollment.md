## تسجيل الطلاب في الكورسات (Student Enrollment API)

- Base URL: `/api`
- المصادقة: يجب إرسال `Authorization: Bearer <student token>`

### التسجيل في الكورس باستخدام كود التفعيل

- POST `/student/enroll`

#### الحقول المطلوبة:
- `course_id` (رقم): معرف الكورس
- `code` (نص): كود التفعيل

#### مثال الطلب:
```json
{
  "course_id": 1,
  "code": "ABC123"
}
```

#### الاستجابة:
- 201 Created:
```json
{
  "message": "Successfully enrolled in course"
}
```

- 400 Bad Request (كود غير صحيح):
```json
{
  "message": "Invalid invite code"
}
```

- 400 Bad Request (كود منتهي الصلاحية):
```json
{
  "message": "Invite code has expired"
}
```

- 400 Bad Request (كود وصل للحد الأقصى):
```json
{
  "message": "Invite code has reached maximum uses"
}
```

- 400 Bad Request (مسجل مسبقاً):
```json
{
  "message": "You are already enrolled in this course"
}
```

### عرض الكورسات المسجل فيها

- GET `/student/enrolled-courses`

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

### أمثلة cURL

```bash
# التسجيل في الكورس
curl -X POST https://your-host/api/student/enroll \
  -H "Authorization: Bearer <STUDENT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"course_id": 1, "code": "ABC123"}'

# عرض الكورسات المسجل فيها
curl -X GET https://your-host/api/student/enrolled-courses \
  -H "Authorization: Bearer <STUDENT_TOKEN>"
```

### ملاحظات

- الطالب يحتاج كود تفعيل صحيح للتسجيل في الكورس
- لا يمكن التسجيل في نفس الكورس مرتين
- الكود يجب أن يكون صالح وغير منتهي الصلاحية
- الكود يجب ألا يكون وصل للحد الأقصى من الاستخدامات

