# توثيق API المحاضرات (Lecture API)

## إضافة محاضرة إلى كورس

- **POST** `/api/courses/:courseId/lectures`
- **الوصول:** المدير فقط (admin)
- **Body:**
  - `title` (إجباري)
  - `description` (اختياري)
- **الاستجابة:** بيانات المحاضرة المضافة

---

## تعديل محاضرة

- **PUT** `/api/lectures/:lectureId`
- **الوصول:** المدير فقط (admin)
- **Body:**
  - `title` (اختياري)
  - `description` (اختياري)
  - `isVisible` (اختياري)
- **الاستجابة:** بيانات المحاضرة بعد التعديل

---

## حذف محاضرة

- **DELETE** `/api/lectures/:lectureId`
- **الوصول:** المدير فقط (admin)
- **الاستجابة:** `{ success: true }` عند نجاح الحذف

---

## عرض محاضرات الكورس

- **GET** `/api/courses/:courseId/lectures`
- **الوصول:**
  - المدير (admin): جميع المحاضرات
  - الطالب (student): المحاضرات الظاهرة فقط (`isVisible: true`) بشرط الاشتراك في الكورس
- **الاستجابة:** قائمة المحاضرات

---

## تغيير حالة ظهور المحاضرة

- **PATCH** `/api/lectures/:lectureId/visibility`
- **الوصول:** المدير فقط (admin)
- **Body:**
  - `isVisible` (boolean)
- **الاستجابة:** بيانات المحاضرة بعد التغيير

---

## ملاحظات الصلاحيات

- لا يمكن للطالب استخدام POST/PUT/DELETE/PATCH.
- الطالب لا يمكنه عرض محاضرات كورس إلا إذا كان مشتركًا فيه.

---

## نموذج بيانات المحاضرة (Lecture)

```json
{
  "id": 1,
  "title": "عنوان المحاضرة",
  "description": "وصف المحاضرة",
  "courseId": 2,
  "isVisible": false,
  "createdAt": "2025-10-05T12:00:00.000Z",
  "updatedAt": "2025-10-05T12:00:00.000Z"
}
```

---

## إضافة فيديو لمحاضرة

- **POST** `/api/lectures/:lectureId/videos`
- **الوصول:** المدير فقط (admin)
- **Body:**
  - `title` (إجباري)
  - `videoUrl` (إجباري)
- **الاستجابة:** بيانات الفيديو المضاف

## تعديل فيديو محاضرة

- **PUT** `/api/videos/:videoId`
- **الوصول:** المدير فقط (admin)
- **Body:**
  - `title` (اختياري)
  - `videoUrl` (اختياري)
- **الاستجابة:** بيانات الفيديو بعد التعديل

## حذف فيديو محاضرة

- **DELETE** `/api/videos/:videoId`
- **الوصول:** المدير فقط (admin)
- **الاستجابة:** `{ success: true }` عند نجاح الحذف

---

## إضافة PDF لمحاضرة

- **POST** `/api/lectures/:lectureId/files`
- **الوصول:** المدير فقط (admin)
- **Form Data:**
  - `file` (إجباري، ملف PDF)
  - `filename` (اختياري)
- **الاستجابة:** بيانات الملف المضاف

## تعديل PDF محاضرة

- **PUT** `/api/files/:fileId`
- **الوصول:** المدير فقط (admin)
- **Body:**
  - `filename` (اختياري)
  - `fileUrl` (اختياري)
- **الاستجابة:** بيانات الملف بعد التعديل

## حذف PDF محاضرة

- **DELETE** `/api/files/:fileId`
- **الوصول:** المدير فقط (admin)
- **الاستجابة:** `{ success: true }` عند نجاح الحذف

---

## إضافة امتحان لمحاضرة

- **POST** `/api/lectures/:lectureId/exams`
- **الوصول:** المدير فقط (admin)
- **Body:**
  - `title` (إجباري)
  - `duration` (إجباري، بالدقائق)
  - `questionsCount` (إجباري)
  - `totalGrade` (إجباري)
- **الاستجابة:** بيانات الامتحان المضاف

## تعديل امتحان محاضرة

- **PUT** `/api/exams/:examId`
- **الوصول:** المدير فقط (admin)
- **Body:**
  - `title` (اختياري)
  - `duration` (اختياري)
  - `questionsCount` (اختياري)
  - `totalGrade` (اختياري)
- **الاستجابة:** بيانات الامتحان بعد التعديل

## حذف امتحان محاضرة

- **DELETE** `/api/exams/:examId`
- **الوصول:** المدير فقط (admin)
- **الاستجابة:** `{ success: true }` عند نجاح الحذف

---

## عرض تفاصيل محاضرة (للادمن أو الطالب المشترك)

- **GET** `/api/lectures/:lectureId/details`
- **الوصول:** المدير أو الطالب المشترك في الكورس
- **الاستجابة:**

```json
{
	"lecture": { ... },
	"videos": [ ... ],
	"files": [ ... ],
	"exam": { ... } | null
}
```

```

```
