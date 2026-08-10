## نظام السوشيال (Posts API)

- Base URL: `/api`
- المصادقة: `Authorization: Bearer <token>` (الأدوار: admin, student)
- الرفع: صورة البوست اختيارية عبر `multipart/form-data` بالحقل `image`

### إنشاء بوست
- POST `/posts`
- Content-Type: `multipart/form-data`
- الحقول:
  - `text` (اختياري)
  - `image` (اختياري)
- الاستجابة 201: `{ post }`

### عرض البوستات
- GET `/posts`
- الاستجابة 200: `{ posts: [{..., reactions: { like, support }}] }`

### عرض بوست محدد
- GET `/posts/:id`
- الاستجابة 200: `{ post, comments: [شجري], reactions: { like, support } }`

### تعديل بوست
- PUT `/posts/:id`
- Content-Type: `multipart/form-data`
- من المالك أو admin
- الحقول (اختيارية): `text`, `image`
- الاستجابة 200: `{ post }`

### حذف بوست
- DELETE `/posts/:id`
- من المالك أو admin
- الاستجابة 204 بدون جسم

### تثبيت/إلغاء تثبيت بوست (admin فقط)
- POST `/posts/:id/pin`
- POST `/posts/:id/unpin`
- الاستجابة 200: `{ post }`

### التفاعل مع بوست
- POST `/posts/:id/react`
- Body JSON: `{ "type": "like" | "support" }`
- الاستجابة 200: `{ created | updated | removed }`

### إضافة تعليق
- POST `/posts/:id/comments`
- Body JSON: `{ "text": "..." }`
- الاستجابة 201: `{ comment }`

### الرد على تعليق
- POST `/comments/:id/reply`
- Body JSON: `{ "text": "...", "postId": <post_id> }`
- الاستجابة 201: `{ comment }`

### تعديل تعليق
- PUT `/comments/:id`
- Body JSON: `{ "text": "..." }`
- المالك أو admin
- الاستجابة 200: `{ comment }`

### حذف تعليق
- DELETE `/comments/:id`
- المالك أو admin
- الاستجابة 204 بدون جسم

### جلب التعليقات لبوسط
- GET `/posts/:id/comments`
- الاستجابة 200: `{ comments: [شجري] }`

ملاحظات:
- حذف بوست يحذف تعليقاته وتفاعلاته تلقائياً (Cascade).
- كل مستخدم تفاعل واحد لكل بوست؛ ضغط نفس النوع مرة أخرى يلغي التفاعل.


