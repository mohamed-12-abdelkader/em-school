## عرض الكورسات للطالب (Student Courses API)

- Base URL: `/api`
- المصادقة: يجب إرسال `Authorization: Bearer <student token>`

### عرض الكورسات المتاحة للطالب

- GET `/student/courses`

### الوصف

- يعرض الكورسات المتاحة للطالب حسب الصف الدراسي المسجل فيه
- **يعرض فقط الكورسات التي أضافها الأدمن الذي سجل الطالب عنده**
- يظهر حالة الكورس: `enrolled` (مسجل) أو `available` (متاح للتسجيل)
- الكورسات مرتبة حسب تاريخ الإنشاء (الأحدث أولاً)
- يتطلب أن يكون الطالب مسجل مع أدمن محدد

### الاستجابة (Response)

- 200 OK:

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
      "admin_id": 3,
      "created_at": "2025-10-03T12:00:00.000Z",
      "status": "available",
      "enrolled_at": null,
      "admin_name": "أدمن المدرسة"
    },
    {
      "id": 2,
      "title": "Mathematics Advanced",
      "description": "Advanced Mathematics Course",
      "price": 299.99,
      "grade_id": 4,
      "image_url": "https://...",
      "admin_id": 3,
      "created_at": "2025-10-02T10:00:00.000Z",
      "status": "enrolled",
      "enrolled_at": "2025-10-03T14:30:00.000Z",
      "admin_name": "أدمن المدرسة"
    }
  ],
  "admin_id": 3,
  "admin_name": "أدمن المدرسة"
}
```

- 400 Bad Request (الطالب غير مسجل مع أي أدمن):

```json
{ "message": "Student is not assigned to any admin. Please contact your administrator." }
```

- 404 Not Found (الطالب غير مسجل في أي صف):

```json
{ "message": "Student is not assigned to any grade." }
```

### أمثلة cURL

```bash
# عرض الكورسات للطالب
curl -X GET https://your-host/api/student/courses \
  -H "Authorization: Bearer <STUDENT_TOKEN>"
```

### ملاحظات

- `status`: حالة الكورس
  - `"available"`: متاح للتسجيل
  - `"enrolled"`: مسجل فيه الطالب
- `enrolled_at`: تاريخ التسجيل (null إذا لم يكن مسجل)
- `admin_id`: معرف الأدمن الذي أضاف الكورس
- `admin_name`: اسم الأدمن الذي أضاف الكورس
- **الكورسات تظهر فقط للصفوف الدراسية المسجل فيها الطالب**
- **الكورسات تظهر فقط التي أضافها الأدمن الذي سجل الطالب عنده**
- يتطلب أن يكون الطالب مسجل مع أدمن محدد
