# GEOTECH 3D / GEOSPATIAL HUB — تشغيل النظام لايف مع الفريق

الدليل ده بياخدك خطوة بخطوة من نسخة محلية (localStorage) لنظام **مشترك على السحابة**:
بيانات واحدة للكل + تسجيل دخول حقيقي + مزامنة لحظية.

المكونات: **Supabase** (قاعدة بيانات + تسجيل دخول + realtime) و **Vercel** (استضافة الواجهة).
الاتنين مجانيين للحجم بتاعكم.

> ملاحظة مهمة: طول ما مفيش مفاتيح Supabase، البرنامج بيشتغل بالظبط زي الأول (localStorage).
> أول ما تحط المفاتيح، بيتحوّل تلقائياً للوضع المشترك. مفيش أي حاجة بتتكسر في النص.

---

## الخطوة 1 — إنشاء مشروع Supabase (≈ 5 دقائق)

1. ادخل [supabase.com](https://supabase.com) واعمل حساب (بجوجل أو إيميل).
2. اضغط **New Project**:
   - **Name:** `geotech3d-hub`
   - **Database Password:** اختار باسورد قوي واحفظه (مش هنحتاجه كتير بس مهم).
   - **Region:** اختار الأقرب ليكم (مثلاً `Central EU (Frankfurt)` أو `Middle East`).
3. استنى دقيقتين لحد ما المشروع يجهز.

### هات المفاتيح
من **Project Settings** (الترس تحت) → **API**:

| المفتاح | مكانه | بيتحط فين |
|---------|-------|-----------|
| **Project URL** | `https://xxxx.supabase.co` | الواجهة (public) |
| **anon public** | تحت *Project API keys* | الواجهة (public) |
| **service_role** | نفس الصفحة (اضغط Reveal) | **سري** — للـ seed بس على جهازك |

> ⚠️ الـ **service_role** مفتاح أدمن كامل. متحطهوش في الواجهة ولا في git ولا تبعته لحد.

---

## الخطوة 2 — إنشاء الجداول (≈ 2 دقيقة)

1. في Supabase من القائمة الجنب اختار **SQL Editor** → **New query**.
2. افتح الملف `supabase/migrations/0001_init.sql` (جوه المشروع)، انسخ محتواه كله والصقه.
3. اضغط **Run**. المفروض يظهر *Success*.

ده بيعمل الجداول (`projects`, `tasks`, `comments`, `notifications`, `attendance`,
`audit_log`, `profiles`, `app_state`) + الصلاحيات (RLS) + المزامنة اللحظية.

---

## الخطوة 3 — تعبئة البيانات والحسابات (≈ 2 دقيقة)

ده بينشئ حساب دخول حقيقي لكل موظف + بيحمّل الـ 3 مشاريع والمهام.

في PowerShell جوه فولدر المشروع:

```powershell
$env:SUPABASE_URL="https://YOUR-PROJECT-REF.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR-SERVICE-ROLE-KEY"
npm run seed
```

بعد ما يخلص:
- بيطبع ملخص (كام حساب اتعمل).
- بيكتب ملف حسابات جاهز توزّعه على الفريق:
  `scripts/seed-output/team-accounts.csv`
- كل الحسابات باسوردها الافتراضي **`Geo@123456`** (زي دلوقتي). كل واحد يغيّره بعد أول دخول.

> الأمر آمن لو اشتغل أكتر من مرة — مبيعملش تكرار.

---

## الخطوة 4 — ربط الواجهة بالـ backend وتجربة محلية

1. اعمل نسخة من `.env.example` باسم `.env.local` وحط فيها:

   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
   ```

2. شغّل محلياً:

   ```powershell
   npm run dev
   ```

3. افتح `http://127.0.0.1:5173/` وسجّل دخول بإيميل أي حساب + `Geo@123456`.
4. جرّب: افتح البرنامج في متصفحين مختلفين بحسابين، عدّل مهمة في واحد،
   المفروض تظهر في التاني فوراً (مزامنة لحظية ✅).

---

## الخطوة 5 — النشر على Vercel (≈ 5 دقائق)

### أسهل طريقة (من GitHub)
1. ارفع المشروع على GitHub (repo خاص).
2. ادخل [vercel.com](https://vercel.com) → **Add New → Project** → اختر الـ repo.
3. Vercel هيتعرف تلقائياً إنه Vite (فيه `vercel.json` جاهز).
4. في **Environment Variables** ضيف:
   - `VITE_SUPABASE_URL` = نفس الـ URL
   - `VITE_SUPABASE_ANON_KEY` = نفس الـ anon key
5. اضغط **Deploy**. بعد دقيقة هيديك رابط زي `https://geotech3d-hub.vercel.app`.

### بديل (بدون GitHub — Vercel CLI)
```powershell
npm i -g vercel
vercel            # أول مرة: بيربط المشروع
vercel --prod     # النشر النهائي
```
وبعدها ضيف نفس الـ 2 env vars من إعدادات المشروع على vercel.com وأعد النشر.

### آخر خطوة على Supabase
في Supabase → **Authentication → URL Configuration** ضيف رابط Vercel في
**Site URL** و **Redirect URLs** (مثلاً `https://geotech3d-hub.vercel.app`).

---

## تمّت! 🎉
وزّع الرابط + ملف `team-accounts.csv` على الفريق. كل واحد يدخل بإيميله والباسورد،
ويغيّره من أول دخول.

---

## ملاحظات وحدود النسخة الأولى (v1)
- **الصلاحيات (RLS):** حالياً أي موظف مسجّل دخول يقدر يقرأ ويكتب البيانات التشغيلية
  (النظام داخلي وموثوق)، وبس الأدمن يقدر يعدّل جدول المستخدمين/الأدوار. نقدر نضيّق
  الصلاحيات أكتر (كل موظف يشوف مهامه بس) لاحقاً — الأساس موجود في `0001_init.sql`.
- **إضافة موظف جديد بحساب دخول:** تغيير أدوار الموجودين شغّال من داخل البرنامج.
  لكن إنشاء حساب **دخول** جديد لسه محتاج تشغيل `npm run seed` تاني (أو نعمل زر أدمن
  آمن عبر Supabase Edge Function في مرحلة تانية).
- **مشروع Supabase المجاني** بيتوقف بعد ~7 أيام خمول؛ مع استخدام يومي مفيش مشكلة.
- **الديمو المحمول (offline HTML)** لسه شغّال زي ما هو (بيستخدم localStorage) — البـ backend
  اختياري بالكامل.
