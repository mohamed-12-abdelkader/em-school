# نظام المصروفات والأقساط (حسب الصف الدراسي) — توثيق API

هذا الملف يصف **ما هو مُنفَّذ حاليًا** في الباكند: خطة مصروفات على مستوى **الصف الدراسي** (`school_grades`)، ثم تطبيقها كـ **رسوم + أقساط** لكل طالب في ذلك الصف.

---

## 1) المفاهيم

| المصطلح | المعنى |
|--------|--------|
| **خطة الصف** (`grade_fee_plans`) | لكل مدرسة + صف دراسي واحد: إجمالي المصروفات السنوية/الدراسية. |
| **جدول القالب** (`grade_fee_plan_installments`) | تقسيم الإجمالي إلى أقساط: رقم القسط، المبلغ، تاريخ الاستحقاق. |
| **رسوم الطالب** (`fees`) | سجل واحد (حسب التنفيذ الحالي) يربط الطالب بالخطة عبر `grade_fee_plan_id`. |
| **أقساط الطالب** (`installments`) | صفوف مرتبطة بـ `fee_id`: مبلغ، استحقاق، حالة `paid` / `unpaid`. |

**من يطبّق الخطة؟**  
كل الطلاب الذين `class_id` يشير إلى فصل تابع للصف `grade_id` (أي مسجّلون في فصول هذا الصف).

**صلاحية الـ API:** جميع المسارات أدناه تتطلب مستخدمًا بدور **`school`** (حساب المدرسة في `users`)، وليس سوبر أدمن المنصّة.

**Base URL:** `/api/school`  
**Headers:** `Authorization: Bearer <token>`  
**Content-Type (للـ JSON):** `application/json`

---

## 2) قاعدة البيانات (مرجع)

- Migration: `migrations/1764000000000_grade_fee_plans.sql`
- جداول قديمة للطلاب: `fees`, `installments` (من `migrations/1763000000000_student_affairs.sql`) + عمود `fees.grade_fee_plan_id`.

قيود مهمة على `fees`:

- `paid_amount + remaining_amount = total_amount`
- الأقساط تُحدَّث عند التسديد لتحافظ على هذا التوازن.

---

## 3) جلب خطة مصروفات صف

```http
GET /api/school/grades/:gradeId/fee-plan
```

**الوصف:** يعيد بيانات الصف (للتحقق)، وإن وُجدت خطة: `plan` + مصفوفة `installments` القالبية.

**Response 200 (مثال — توجد خطة)**

```json
{
  "grade": {
    "id": 1,
    "school_id": 5,
    "name": "الأول الثانوي",
    "stage": "secondary",
    "description": null,
    "created_at": "...",
    "updated_at": "..."
  },
  "plan": {
    "id": 10,
    "school_id": 5,
    "grade_id": 1,
    "total_amount": "12000.00",
    "created_at": "...",
    "updated_at": "..."
  },
  "installments": [
    {
      "id": 101,
      "plan_id": 10,
      "installment_number": 1,
      "due_date": "2026-09-01",
      "amount": "4000.00"
    }
  ]
}
```

**Response 200 (لا توجد خطة بعد)**

```json
{
  "grade": { "...": "..." },
  "plan": null,
  "installments": []
}
```

**أخطاء شائعة:** `404` إذا الصف لا يخص المدرسة.

---

## 4) حفظ / تحديث خطة الصف وتطبيقها على الطلاب

```http
PUT /api/school/grades/:gradeId/fee-plan
```

**Body (JSON)**

```json
{
  "totalAmount": 12000,
  "installments": [
    { "dueDate": "2026-09-01", "amount": 4000 },
    { "dueDate": "2026-12-01", "amount": 4000 },
    { "dueDate": "2027-03-01", "amount": 4000 }
  ]
}
```

**Validation**

- `totalAmount`: رقم موجب.
- `installments`: مصفوفة غير فارغة؛ كل عنصر: `dueDate` (نص تاريخ)، `amount` موجب.
- **مجموع** `installments[].amount` يجب أن يساوي `totalAmount` (هامش رقمي `0.02` مسموح لتفادي أخطاء الفاصلة العشرية).

**منطق التطبيق على الطلاب (بعد حفظ القالب)**

1. لكل طالب في الصف: إن وُجدت له رسوم و`paid_amount > 0` → **لا يُعدَّل** ويُضاف `studentId` إلى `skippedStudentIds`.
2. وإلا: يُحذف سجل الرسوم السابق (إن وجد) ويُنشأ رسوم جديدة + أقساط مطابقة للقالب.

**Response 200 (مثال)**

```json
{
  "grade": { "...": "..." },
  "plan": { "id": 10, "total_amount": "12000.00", "...": "..." },
  "installments": [ "... قالب الأقساط ..." ],
  "application": {
    "studentsInGrade": 45,
    "feesCreatedOrUpdated": 40,
    "skippedStudentsWithPayments": 5,
    "skippedStudentIds": [12, 15, 18, 20, 22]
  }
}
```

**أخطاء شائعة**

- `400`: مجموع الأقساط لا يساوي الإجمالي، أو لا توجد أقساط.
- `404`: الصف غير موجود أو لا يخص المدرسة.

---

## 5) عرض رسوم طالب وأقساطه (حسابات)

```http
GET /api/school/students/:studentId/fees
```

**Response 200**

- `fee`: آخر سجل رسوم للطالب ضمن المدرسة، أو `null` إن لم يُنشأ بعد.
- `installments`: قائمة الأقساط مع `installmentNumber` تسلسليًا حسب ترتيب الاستعلام (عادة حسب تاريخ الاستحقاق).

```json
{
  "fee": {
    "id": 500,
    "student_id": 99,
    "total_amount": "12000.00",
    "paid_amount": "4000.00",
    "remaining_amount": "8000.00",
    "grade_fee_plan_id": 10,
    "created_at": "...",
    "updated_at": "..."
  },
  "installments": [
    {
      "installmentNumber": 1,
      "id": 1001,
      "amount": "4000.00",
      "due_date": "2026-09-01",
      "status": "paid",
      "paid_at": "2026-09-05T10:00:00.000Z"
    },
    {
      "installmentNumber": 2,
      "id": 1002,
      "amount": "4000.00",
      "due_date": "2026-12-01",
      "status": "unpaid",
      "paid_at": null
    }
  ]
}
```

إن لم توجد رسوم: `"fee": null` و`"installments": []`.

---

## 6) تسديد قسط

```http
POST /api/school/installments/:installmentId/pay
```

**Body:** لا يُرسل جسم (أو `{}`).

**Response 200**

```json
{
  "ok": true,
  "feeId": 500,
  "studentId": 99
}
```

**منطق:** يضبط القسط `paid` و`paid_at`، ويحدّث `paid_amount` و`remaining_amount` في `fees`.

**أخطاء شائعة**

- `404`: القسط غير موجود، أو لا يخص طالبًا في مدرستك، أو مدفوع مسبقًا.
- `400`: منطق الحماية من تجاوز المبلغ المتبقي (نادر إذا البيانات متسقة).

---

## 7) طالب جديد تلقائيًا

عند نجاح **`POST /api/school/students`** (تسجيل طالب بصف/فصل):

- إن وُجدت **خطة صف** للـ `gradeId` المُرسل مع أقساط قالب، يُحاول النظام إنشاء رسوم + أقساط للطالب الجديد.
- قد يظهر في استجابة التسجيل حقل **`feePlan`** يوضح ما إذا طُبّقت الخطة (أو سبب التخطي إن وُجد).

---

## 8) ملاحظات للواجهة (Frontend)

- **شاشة إعداد مصروفات الصف:** نموذج يعبّئ `totalAmount` + جدول ديناميكي للأقساط (تاريخ + مبلغ)، ثم `PUT .../fee-plan`.
- **شاشة حسابات الطالب:** `GET .../fees` ثم لكل قسط `unpaid` زر يستدعي `POST .../installments/:installmentId/pay`.
- عند `PUT` الخطة، اعرض للمستخدم `application.skippedStudentIds` إن وُجدت حتى يعرف من لديه دفعات سابقة ولم تُستبدل رسومه.

---

## 9) رموز HTTP مختصرة

| Code | معنى تقريبي |
|------|-------------|
| 200 | نجاح |
| 400 | تحقق من البيانات (مجموع الأقساط، إلخ) |
| 401 / 403 | توكن أو صلاحية |
| 404 | صف/طالب/قسط غير موجود أو خارج المدرسة |

---

*آخر تحديث يتوافق مع الكود الحالي في المشروع (مسارات تحت `/api/school` ودور `school`).*
