# إدارة طلاب الأدمن (Admin Students Management API)

- Base URL: `/api`
- المصادقة: يجب إرسال `Authorization: Bearer <admin_token>`

## عرض طلاب الأدمن

- GET `/api/my-students`

### الوصف
يعرض قائمة بجميع الطلاب المسجلين مع الأدمن المحدد.

### المعاملات الاختيارية:
- `limit`: عدد النتائج (افتراضي: 20)
- `skip`: عدد النتائج المراد تخطيها (افتراضي: 0)
- `q`: البحث بالاسم أو رقم الهاتف
- `grade_id`: تصفية حسب الصف
- `status`: تصفية حسب الحالة (`active` أو `inactive`)

### الاستجابة:
- 200 OK:
```json
{
  "students": [
    {
      "id": 10,
      "name": "أحمد محمد",
      "phone": "+201234567890",
      "guardian_phone": "+201098765432",
      "status": "active",
      "created_at": "2025-10-03T12:00:00.000Z",
      "updated_at": "2025-10-03T12:00:00.000Z",
      "grade_name": "أولى ثانوي",
      "grade_id": 4
    },
    {
      "id": 11,
      "name": "فاطمة علي",
      "phone": "+201234567891",
      "guardian_phone": "+201098765433",
      "status": "active",
      "created_at": "2025-10-03T11:30:00.000Z",
      "updated_at": "2025-10-03T11:30:00.000Z",
      "grade_name": "ثانية ثانوي",
      "grade_id": 5
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 20,
    "skip": 0,
    "hasMore": true
  }
}
```

### أمثلة الاستخدام:

#### البحث عن طالب:
```bash
curl -X GET "https://your-host/api/my-students?q=أحمد" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

#### تصفية حسب الصف:
```bash
curl -X GET "https://your-host/api/my-students?grade_id=4" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

#### تصفية حسب الحالة:
```bash
curl -X GET "https://your-host/api/my-students?status=active" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

#### التصفح:
```bash
curl -X GET "https://your-host/api/my-students?limit=10&skip=20" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

## إحصائيات الطلاب

- GET `/api/my-students/stats`

### الوصف
يعرض إحصائيات شاملة عن طلاب الأدمن.

### الاستجابة:
- 200 OK:
```json
{
  "total_students": 25,
  "active_students": 23,
  "inactive_students": 2,
  "students_by_grade": [
    {
      "grade_id": 1,
      "grade_name": "أولى إعدادي",
      "student_count": 5
    },
    {
      "grade_id": 4,
      "grade_name": "أولى ثانوي",
      "student_count": 8
    },
    {
      "grade_id": 5,
      "grade_name": "ثانية ثانوي",
      "student_count": 7
    },
    {
      "grade_id": 6,
      "grade_name": "ثالثة ثانوي",
      "student_count": 5
    }
  ]
}
```

### مثال cURL:
```bash
curl -X GET "https://your-host/api/my-students/stats" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

## تحديث حالة الطالب

- PATCH `/api/my-students/:id/status`

### الوصف
يسمح للأدمن بتحديث حالة طالب من طلابه (نشط/غير نشط).

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
  "message": "Student status updated to inactive",
  "student": {
    "id": 10,
    "name": "أحمد محمد",
    "phone": "+201234567890",
    "status": "inactive",
    "updated_at": "2025-10-03T12:30:00.000Z"
  }
}
```

- 404 Not Found (طالب غير موجود أو لا ينتمي للأدمن):
```json
{
  "message": "Student not found or does not belong to you"
}
```

### مثال cURL:
```bash
curl -X PATCH "https://your-host/api/my-students/10/status" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status": "inactive"}'
```

## ملاحظات مهمة

- **الصلاحيات**: الأدمن فقط يمكنه عرض وإدارة طلابه
- **الخصوصية**: كل أدمن يرى طلابه فقط (المسجلين معه)
- **البحث**: يمكن البحث بالاسم أو رقم الهاتف
- **التصفية**: متعددة المعايير (الصف، الحالة، البحث)
- **التصفح**: يدعم التصفح مع معلومات العدد الإجمالي
- **الإحصائيات**: عرض شامل لتوزيع الطلاب
- **إدارة الحالة**: يمكن للأدمن تفعيل/إلغاء تفعيل طلابه
- **الأمان**: لا يمكن للأدمن الوصول لطلاب أدمن آخر

## الأخطاء الشائعة

- `401`: غير مصرح بالوصول (مطلوب تسجيل دخول أدمن)
- `403`: ممنوع (مطلوب دور أدمن)
- `500`: خطأ في الخادم

## أمثلة متقدمة

### البحث والتصفية معاً:
```bash
curl -X GET "https://your-host/api/my-students?q=محمد&grade_id=4&status=active&limit=10" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### الحصول على الصفحة الثانية:
```bash
curl -X GET "https://your-host/api/my-students?limit=10&skip=10" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### عرض الطلاب غير النشطين فقط:
```bash
curl -X GET "https://your-host/api/my-students?status=inactive" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### تفعيل طالب:
```bash
curl -X PATCH "https://your-host/api/my-students/10/status" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
```

### إلغاء تفعيل طالب:
```bash
curl -X PATCH "https://your-host/api/my-students/10/status" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status": "inactive"}'
```
