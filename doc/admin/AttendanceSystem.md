## نظام الحضور والغياب (Attendance System API)

- Base URL: `/api`
- المصادقة: جميع النقاط تتطلب `Authorization: Bearer <ADMIN_TOKEN>` (role: admin)
- التنسيق: JSON إلا إذا ذُكر غير ذلك

### نماذج البيانات (Schemas)
- المجموعات `groups`:
  - `id`, `admin_id`, `name`, `days` (JSON مثل ["Saturday","Tuesday"]), `start_time` (HH:mm:ss), `end_time` (HH:mm:ss), `created_at`, `updated_at`
- طلاب المجموعة `group_students`:
  - `id`, `group_id`, `name`, `phone`, `parent_phone`, `student_code`, `qr_code` (فريد), `created_at`, `updated_at`
- الحضور `attendance`:
  - `id`, `group_id`, `student_id`, `date` (YYYY-MM-DD), `status` (present|absent), `recorded_by`, `created_at`

### أخطاء شائعة (Error format)
الاستجابة في الأخطاء تكون غالبًا:
```json
{ "message": "..." }
```

---

### المجموعات (Groups)
- إنشاء مجموعة
  - POST `/groups`
  - Body:
    ```json
    {
      "name": "Group A",
      "days": ["Saturday", "Tuesday"],
      "start_time": "16:00",
      "end_time": "18:00"
    }
    ```
  - Response 201:
    ```json
    { "group": { "id": 1, "name": "Group A", "days": ["Saturday","Tuesday"], "start_time": "16:00:00", "end_time": "18:00:00" } }
    ```
  - ملاحظات التحقق: `name` إجباري، `days` مصفوفة غير فارغة، `start_time` < `end_time` (منطقيًا).

- عرض مجموعات الإدمن
  - GET `/groups`
  - Response 200:
    ```json
    { "groups": [ { "id": 1, "name": "Group A", ... } ] }
    ```

- عرض مجموعة واحدة + الطلاب
  - GET `/groups/:id`
  - Response 200:
    ```json
    { "group": { "id": 1, ... }, "students": [ { "id": 10, "qr_code": "..." } ] }
    ```

- تعديل مجموعة
  - PUT `/groups/:id`
  - Body (اختياري):
    ```json
    { "name": "Group A2", "days": ["Saturday"], "start_time": "15:30", "end_time": "17:30" }
    ```
  - Response 200: `{ "group": { ... } }`

- حذف مجموعة
  - DELETE `/groups/:id`
  - Response 204 (بدون جسم)
  - أثر جانبي: حذف الطلاب وسجلات الحضور المرتبطة (Cascade)

أمثلة cURL:
```bash
curl -X POST http://localhost:8000/api/groups \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Group A","days":["Saturday","Tuesday"],"start_time":"16:00","end_time":"18:00"}'
```

---

### طلاب المجموعة (Group Students)

#### إضافة طالب موجود مسبقًا (من قاعدة البيانات)
- POST `/groups/:id/students/existing`
- Body:
  ```json
  { "student_id": 123 }
  ```
- يحصل على بيانات الطالب من جدول `users` (name, phone, guardian_phone)
- يولَّد `qr_code` فريد تلقائيًا
- Response 201: `{ "student": { "id": 10, "qr_code": "uuid-...", "qr_code_image": "data:image/png;base64,...", ... } }`

#### إضافة طالب يدويًا (بيانات جديدة)
- POST `/groups/:id/students/manual`
- Body:
  ```json
  { "name": "Ahmed Ali", "phone": "01000000000", "parent_phone": "01011111111" }
  ```
- يولَّد `qr_code` فريد تلقائيًا
- Response 201: `{ "student": { "id": 10, "qr_code": "uuid-...", "qr_code_image": "data:image/png;base64,...", ... } }`

- جلب جميع الطلاب في المجموعة مع حالة الحضور
  - GET `/groups/:id/students`
  - Response 200: 
    ```json
    { 
      "students": [ 
        { 
          "id": 10, 
          "name": "Ahmed Ali", 
          "phone": "01000000000", 
          "parent_phone": "01011111111", 
          "qr_code": "uuid-...", 
          "qr_code_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
          "attendance_status": "present",
          "attendance_date": "2025-01-27"
        } 
      ],
      "date": "2025-01-27"
    }
    ```
  - ملاحظات: 
    - `attendance_status` يمكن أن يكون: `"present"` (حاضر)، `"absent"` (غايب)، أو `"not_taken"` (لم يتم أخذ الغياب بعد)
    - `attendance_date` و `date` يحتويان على تاريخ اليوم الحالي
    - يتم إرجاع حالة الحضور لجميع الطلاب في المجموعة لتاريخ اليوم

- تعديل بيانات طالب
  - PUT `/students/:id`
  - Body (اختياري):
    ```json
    { "name": "Ahmed M.", "phone": "01022222222", "parent_phone": "01033333333", "student_code": "STD-123" }
    ```
  - Response 200: `{ "student": { ... } }`

- حذف طالب
  - DELETE `/students/:id`
  - Response 204

---

### الحضور والغياب (Attendance)
- تسجيل يدوي (دفعة)
  - POST `/attendance/manual`
  - Body:
    ```json
    {
      "group_id": 1,
      "date": "2025-10-10",
      "records": [
        { "student_id": 10, "status": "present" },
        { "student_id": 11, "status": "absent" }
      ]
    }
    ```
  - Response 201: `{ "attendance": [ {"id":1,...}, {"id":2,...} ] }`
  - ملاحظات: في حال عدم إرسال `date` يستخدم تاريخ اليوم تلقائيًا.

- تسجيل عبر QR
  - POST `/attendance/qr`
  - Body:
    ```json
    { "qr_code": "uuid-...", "group_id": 1, "date": "2025-10-10" }
    ```
  - ملاحظة: `date` اختياري، إذا لم يُرسل يستخدم تاريخ اليوم
  - Response 201: `{ "attendance": { "id": 3, "status": "present", "date": "2025-10-10" } }`
  - منع التكرار: في حال المسح أكثر من مرة بنفس اليوم لنفس الطالب يتم تحديث السجل أو تجاهل التكرار (لا تتكرر القيود الفريدة).

- سجل حضور المجموعة
  - GET `/attendance/group/:group_id?date=YYYY-MM-DD`
  - Response 200: `{ "attendance": [ { "student_id": 10, "status": "present", "date": "..." }, ... ] }`

- سجل الطالب
  - GET `/attendance/student/:student_id`
  - Response 200: `{ "attendance": [ { "group_id": 1, "status": "present", "date": "..." }, ... ] }`

- إحصائيات المجموعة
  - GET `/attendance/stats/:group_id`
  - Response 200:
    ```json
    { "stats": [ { "student_id": 10, "present": 8, "absent": 2 }, { "student_id": 11, "present": 7, "absent": 3 } ] }
    ```

أمثلة cURL إضافية:
```bash
# إضافة طالب موجود
curl -X POST http://localhost:8000/api/groups/1/students/existing \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"student_id":123}'

# إضافة طالب يدويًا
curl -X POST http://localhost:8000/api/groups/1/students/manual \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Ahmed Ali","phone":"01000000000","parent_phone":"01011111111"}'

curl -X POST http://localhost:8000/api/attendance/manual \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"group_id":1,"records":[{"student_id":10,"status":"present"}]}'

curl -X POST http://localhost:8000/api/attendance/qr \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"qr_code":"uuid-...","group_id":1,"date":"2025-10-10"}'
```

---

### ملاحظات عامة
- التحكم في النطاق: كل إدمن يرى ويدير مجموعاته فقط عبر حقل `admin_id`.
- الحذف المتسلسل: حذف مجموعة يحذف الطلاب وسجلات الحضور المرتبطة (ON DELETE CASCADE).
- فريد يوميًا: لا يتكرر سجل الحضور لنفس (`group_id`, `student_id`, `date`).
- الوقت والتواريخ: يقبل `date` بصيغة `YYYY-MM-DD`. يتم استخدام تاريخ اليوم عند عدم الإرسال.

