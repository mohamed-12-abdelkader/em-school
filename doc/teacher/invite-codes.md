## إدارة أكواد التفعيل للمدرسين (Teacher Invite Codes API)

- Base URL: `/api`
- المصادقة: يجب إرسال `Authorization: Bearer <teacher token>`

### إنشاء كود تفعيل

- POST `/teacher/invite-codes`

#### الحقول المطلوبة:

- `course_id` (رقم): معرف الكورس
- `max_uses` (رقم، اختياري): عدد الاستخدامات المسموحة (افتراضي: 1)
- `expires_at` (تاريخ، اختياري): تاريخ انتهاء الكود

#### مثال الطلب:

```json
{
  "course_id": 1,
  "max_uses": 5,
  "expires_at": "2025-12-31T23:59:59.000Z"
}
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

- GET `/teacher/invite-codes`

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

- DELETE `/teacher/invite-codes/:id`

#### الاستجابة:

- 204 No Content: تم الحذف بنجاح
- 404 Not Found: الكود غير موجود

### أمثلة cURL

```bash
# إنشاء كود تفعيل
curl -X POST https://your-host/api/teacher/invite-codes \
  -H "Authorization: Bearer <TEACHER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"course_id": 1, "max_uses": 5}'

# عرض أكواد التفعيل
curl -X GET https://your-host/api/teacher/invite-codes \
  -H "Authorization: Bearer <TEACHER_TOKEN>"

# حذف كود تفعيل
curl -X DELETE https://your-host/api/teacher/invite-codes/1 \
  -H "Authorization: Bearer <TEACHER_TOKEN>"
```

### ملاحظات

- المدرس يمكنه إنشاء أكواد فقط للكورسات في الصفوف المسؤول عنها
- الكود يتم توليده تلقائياً (6 أحرف عشوائية)
- يمكن تحديد عدد الاستخدامات وتاريخ الانتهاء
- يتم تتبع عدد الاستخدامات تلقائياً
