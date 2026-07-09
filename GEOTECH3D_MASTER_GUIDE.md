# 🌍 GEOTECH 3D — GEOSPATIAL HUB — الدليل الشامل

> آخر تحديث: 2026-07-09
> الحالة: **🟢 لايف وشغّال مع الفريق على السحابة**

هذا الملف فيه **كل حاجة** عن المشروع: الرابط، الحسابات، طريقة الشغل، البنية التقنية، وطريقة التعديل والنشر.

---

## 1) 🔗 الرابط اللي تديه لزمايلك

```
https://geotech3d-hub.vercel.app
```

- أي حد يفتح الرابط ده من أي جهاز (موبايل / لابتوب) ويسجّل دخول بحسابه.
- كل الناس بيشوفوا **نفس البيانات لحظياً** (لو حد ضاف/عدّل تاسك، الباقي يشوفه فوراً).
- الموقع مبني على **Vercel** (استضافة) + **Supabase** (قاعدة بيانات + تسجيل دخول حقيقي على السحابة).

---

## 2) 🔑 طريقة الدخول

- تسجيل الدخول بـ **اسم المستخدم أو الإيميل** + كلمة السر.
- الإيميلات كلها على الشكل: `<username>@geotech3d.local`
- **كلمة السر الموحّدة لكل الحسابات حالياً:** `Geo@123456`
- في خانة "Remember me" لو حب المستخدم يفضل داخل.

> ⚠️ **مهم أمنياً:** كل الناس لهم نفس الباسورد المؤقت `Geo@123456`. المفروض في مرحلة جاية نضيف خاصية "تغيير كلمة السر" عشان كل واحد يحط باسورد خاص بيه. (مذكور في قسم الخطوات الجاية تحت.)

---

## 3) 👥 حسابات الفريق (كلها جاهزة على السحابة)

| الاسم | Username | الإيميل | الدور (Role) |
|------|----------|---------|--------------|
| Mona Hassan | `mona.hassan` | mona.hassan@geotech3d.local | **Admin** (مدير عام) |
| Abdelrahman Soliman | `abdelrahman.soliman` | abdelrahman.soliman@geotech3d.local | **Manager** (مدير العمليات — صاحب الاعتمادات) |
| Islam Saied | `islam.saied` | islam.saied@geotech3d.local | Manager |
| Mayar Abd Elazeem | `mayar.abd.elazeem` | mayar.abd.elazeem@geotech3d.local | Manager / Team Lead |
| Engy Yosry | `engy.yosry` | engy.yosry@geotech3d.local | Manager |
| Mahmoud Elkady | `mahmoud.elkady` | mahmoud.elkady@geotech3d.local | Manager |
| Mahmoud Mohamed | `mahmoud.mohamed` | mahmoud.mohamed@geotech3d.local | Employee |
| Mahmoud Emad | `mahmoud.emad` | mahmoud.emad@geotech3d.local | Employee |
| Yasmin Abdelgwad | `yasmin.abdelgwad` | yasmin.abdelgwad@geotech3d.local | Employee |
| Norhan Shaaban | `norhan.shaaban` | norhan.shaaban@geotech3d.local | Employee |
| Ahmed Khalaf | `ahmed.khalaf` | ahmed.khalaf@geotech3d.local | Employee |
| Abdelrahman Khaled | `abdelrahman.khaled` | abdelrahman.khaled@geotech3d.local | Employee |
| Rahma Alaa Magdi | `rahma.alaa.magdi` | rahma.alaa.magdi@geotech3d.local | Employee |
| Beshoy Ataf | `beshoy.ataf` | beshoy.ataf@geotech3d.local | Employee |
| Mostafa Khaled | `mostafa.khaled.mohamed` | mostafa.khaled.mohamed@geotech3d.local | Employee |
| Eng. Waleed | `waleed` | waleed@geotech3d.local | **CEO** (مراقبة تنفيذية) |
| Omar | `omar` | omar@geotech3d.local | External Project Monitor |
| Qarani | `qarani` | qarani@geotech3d.local | Regional Follow-up Access |
| Nawar | `nawar` | nawar@geotech3d.local | Management Monitoring Access |

**حسابات دخول سريعة إضافية (نفس الأشخاص بأدوار):** `gm` (Mona), `ceo` (Waleed), `abdelrahman` (Abdelrahman).

الباسورد للكل: `Geo@123456`

---

## 4) 🎭 الأدوار — كل واحد بيشوف إيه؟

النظام بيدّي كل دور **مساحة مختلفة** عشان محدش يتشتت:

### 👷 موظف / عضو فريق (Employee / team_member)
- بيشوف **بس**: **My Tasks** (تاسكاته اليومية) + **الحضور** + **الإشعارات**.
- مفيش عنده داشبورد ولا مشاريع ولا خرائط — شاشة نضيفة يركّز فيها على شغله.
- لما يخلّص تاسك → بيضغط **Submit for Review** → تروح للـ Team Lead يراجع ويعتمد.
- في تاب My Tasks شريط ملخّص "My Day": (مفتوح / مستحق النهاردة / متأخر / بانتظار المراجعة / مكتمل).

### 👨‍💼 قائد فريق (Team Lead)
- رؤية أوسع: بيشوف **كل تاسكات فريقه** في المشاريع اللي هو مسؤول عنها.
- عنده **Review Queue** يعتمد فيها شغل أعضاء فريقه (QC).
- بيقدر ينشئ مشاريع، يدير التاسكات، يستخدم سلة المهملات.

### 🧑‍💼 الإدارة (Admin / GM / Manager)
- رؤية كاملة: داشبورد، مشاريع، خرائط، تقارير، Gantt، الحضور، سجل التدقيق (Audit).
- Admin/GM كمان: إدارة المستخدمين والإعدادات.

### 👁️ المراقبون (CEO / External / Regional / Management Monitor)
- رؤية للقراءة غالباً (تقارير وداشبورد).
- بعضهم يقدر **يطلب** تاسك بس محتاج **اعتماد** من مدير العمليات (Abdelrahman) عشان يتنفّذ.

---

## 5) ✨ المميزات الموجودة

- **إدارة مشاريع وتاسكات** كاملة (إنشاء، تعديل، إسناد، متابعة).
- **مزامنة لحظية** (Realtime) — أي تغيير يظهر لكل الفريق فوراً.
- **مسار مراجعة (QC):** الموظف يسلّم → القائد يعتمد.
- **سلة مهملات (Recycle Bin):** أي مشروع/تاسك بيتمسح **مايختفيش** — بيروح مكان منفصل ويتقدر يترجع أو يتحذف نهائياً. (متاح للإدارة وقادة الفرق بس.)
- **الحضور (Attendance):** تسجيل حضور/انصراف، تأخير بعد 09:30، تصدير CSV.
- **سجل تدقيق (Audit Log):** بيسجّل كل حركة (دخول/خروج، تعديل تاسك، اعتماد، إلخ).
- **تقارير احترافية PDF** (بشعار الشركة والألوان): تقرير الشركة + تقرير Gantt للمشروع + التقرير اليومي.
- **خريطة المشاريع (Geospatial Map)** + **مخطط زمني (Gantt)** + **أعباء العمل (Workload)**.
- **تصدير CSV** للمشاريع والتاسكات والتقارير.
- **نسخة أوفلاين محمولة (Portable)** — ملف HTML واحد يشتغل من غير إنترنت (`npm run build:portable`).

---

## 6) 🏗️ البنية التقنية (باختصار)

| الطبقة | التقنية |
|--------|---------|
| الواجهة (Frontend) | React + Vite + JavaScript + CSS |
| الاستضافة | **Vercel** → https://geotech3d-hub.vercel.app |
| قاعدة البيانات + المصادقة | **Supabase** (PostgreSQL + Auth + Realtime + RLS) |
| مستودع الكود | **GitHub** (خاص/Private) → github.com/asoliman-crypto/geotech3d-hub |

**تصميم ذكي:** لو مفاتيح Supabase مش موجودة، البرنامج بيرجع تلقائياً لوضع محلي (localStorage) — فالنسخة المحمولة الأوفلاين بتفضل شغّالة زي ماهي.

### تفاصيل Supabase
- **Project Ref:** `fsxxmaehyletvkxdzyif`
- **URL:** `https://fsxxmaehyletvkxdzyif.supabase.co`
- **Region:** eu-north-1 (ستوكهولم) — Free tier
- **الجداول:** projects, tasks, comments, notifications, attendance, audit_log, profiles, app_state
- كل صف متخزّن كـ `{ id, data(jsonb) }` — بيحافظ على شكل البيانات زي ما هي.
- **RLS (أمان الصفوف):** المستخدم المسجّل يقرا/يكتب في جداول العمل، والكتابة في `profiles` للـ Admin بس.

---

## 7) 🔐 المفاتيح والإعدادات (Environment Variables)

مضبوطة على Vercel (Production + Preview + Development):

```
VITE_SUPABASE_URL      = https://fsxxmaehyletvkxdzyif.supabase.co
VITE_SUPABASE_ANON_KEY = sb_publishable_xiyOlgF5oZidpKkqPUGD1Q_tjp-L1t7
```

- الـ `anon key` ده **آمن يتنشر** (مفتاح عام، محمي بالـ RLS).
- **⚠️ مفتاح الخدمة السري (`sb_secret_...`)** استُخدم مرة واحدة وقت إنشاء الحسابات — يُفضّل **تدويره (rotate)** من لوحة Supabase لأنه مرّ في المحادثة. البرنامج نفسه **مش محتاجه** (بيشتغل بالمفتاح العام بس).

محلياً المفاتيح متخزّنة في `.env.local` (مش بترفع على GitHub — محمية بالـ `.gitignore`).

---

## 8) 🚀 طريقة التعديل والنشر (المهم!)

### الوضع الحالي:
- الكود على **GitHub** (خاص).
- **Vercel مربوط بمجلد المشروع** — النشر بيتم بأمر واحد.

### إزاي أي تعديل يظهر للناس؟
الطريقة اللي بنشتغل بيها دلوقتي:

1. أنا (كلود) بعدّل الكود اللي إنت طالبه.
2. `npm run build` (بناء).
3. `git push` (رفع على GitHub — أرشفة نسخة).
4. `vercel --prod` (نشر لايف).
5. خلال **دقيقة** كل الفريق يشوف الجديد.

**يعني إنت بس تقولي "عايز أغيّر كذا" وأنا أعمل الباقي.** مفيش تحميل ولا سحب ملفات خالص. ✅

### لو حابب النشر يبقى تلقائي 100% (اختياري):
فيه **ضغطة واحدة** فاضلة على متصفحك عشان أي `git push` ينشر لوحده من غير أمر مني:

1. افتح: `vercel.com/abdelrahman-soliman/geotech3d-hub/settings/git`
2. اضغط **Connect Git Repository** → **GitHub**
3. لو ظهر **"Install"** أو **"Configure GitHub App"** → اضغطه → اختار حساب `asoliman-crypto` → **Only select repositories** → علّم `geotech3d-hub` → **Install**
4. ارجع واختار الريبو واضغط **Connect**

> بعد الخطوة دي: أي `git push` = نشر أوتوماتيك. **بس هي مش ضرورية** — الطريقة الحالية شغّالة تمام.

---

## 8.5) 🤖 Runbook للـ Claude/المساعد اللي بعدي (تعليمات تقنية دقيقة)

> **لو إنت كلود/مساعد جديد بتكمّل الشغل ده:** المشروع لايف ومربوط. اتبع ده بالظبط عشان تعدّل وتنشر لايف زي الأول.

**مجلد المشروع:**
```
C:\Users\pc\Documents\Codex\2026-05-23\files-mentioned-by-the-user-projects\projects-hub
```

### الخطوة أ — Preflight (اتأكد الأول إن كله متظبط)
```bash
cd "C:/Users/pc/Documents/Codex/2026-05-23/files-mentioned-by-the-user-projects/projects-hub"
vercel whoami            # المفروض يرجّع: asoliman-9433
cat .vercel/project.json # المفروض يبان projectName: geotech3d-hub
[ -f .env.local ] && echo "env ok"   # لازم يكون موجود
git remote get-url origin            # github.com/asoliman-crypto/geotech3d-hub.git
```
- لو `vercel whoami` فاضي → محتاج `vercel login` (**ده تفاعلي — لازم المستخدم يعمله بنفسه**).
- لو `.env.local` مش موجود → `vercel env pull .env.local`.
- لو `.vercel` مش موجود → `vercel link --project geotech3d-hub --yes`.

### الخطوة ب — عدّل وانشر لايف (الفلو الأساسي)
```bash
cd "C:/Users/pc/Documents/Codex/2026-05-23/files-mentioned-by-the-user-projects/projects-hub"
# 1) عدّل الكود اللي المستخدم طلبه (Edit tool)
# 2) ابنِ للتأكد إنه بيكمبايل:
npm run build
# 3) ارفع أرشيف على GitHub:
git add -A
git commit -m "وصف التعديل"
git push origin main
# 4) انشر لايف على Vercel:
vercel --prod --yes
```
خلال ~دقيقة التعديل يبقى على https://geotech3d-hub.vercel.app للفريق كله.

### الخطوة ج — تأكيد إن التعديل فعلاً لايف (البراوزر ساعات بيفصل، استخدم curl)
```bash
curl -s "https://geotech3d-hub.vercel.app/" -o /tmp/i.html -w "%{http_code}\n"
JS=$(grep -oE '/assets/[A-Za-z0-9_-]+\.js' /tmp/i.html | head -1)
curl -s "https://geotech3d-hub.vercel.app${JS}" | grep -o "النص الجديد اللي ضفته" && echo "LIVE ✅"
```

### مبادئ مهمة للمساعد
- **متقولش للمستخدم يرفع ملفات يدوي** — إنت بتنشر بـ `vercel --prod`.
- متعملش rebuild من الصفر ولا تعيد بذر البيانات القديمة (راجع working-rules).
- حافظ على الهوية البصرية (رمادي/أخضر + ذهبي).
- الـ `anon key` آمن يتنشر؛ الـ `sb_secret_` لأ.

---

## 9) 📁 الملفات والأماكن المهمة

- **مجلد المشروع:** `C:\Users\pc\Documents\Codex\2026-05-23\files-mentioned-by-the-user-projects\projects-hub`
- **كل الحسابات (CSV):** `scripts/seed-output/team-accounts.csv`
- **إعداد Supabase (شرح):** `SETUP_BACKEND.md`
- **مخطط قاعدة البيانات:** `supabase/migrations/0001_init.sql`
- **صفحة الدخول:** `src/components/LoginPage.jsx`
- **الصلاحيات والأدوار:** `src/auth/permissions.js`
- **بيانات المستخدمين:** `src/auth/authData.js` + `src/data/demoData.js`
- **المنطق الأساسي:** `src/App.jsx`

### أوامر مفيدة (لو حبيت تشغّله محلياً)
```bash
npm install          # تثبيت الحزم (أول مرة بس)
npm run dev          # تشغيل محلي على http://127.0.0.1:5173
npm run build        # بناء نسخة الإنتاج
npm run build:portable  # نسخة HTML واحدة أوفلاين
```

---

## 10) 📌 خطوات جاية مقترحة (لسه ماتعملتش)

1. **تغيير كلمة السر داخل البرنامج** — عشان كل موظف يحط باسورد خاص بدل `Geo@123456` الموحّد. (عن طريق `supabase.auth.updateUser`.)
2. **تدوير المفتاح السري** (`sb_secret_...`) من لوحة Supabase (احتياطي أمني).
3. **(اختياري)** إكمال ربط GitHub App للنشر التلقائي الكامل — قسم 8.

---

## ⚡ ملخص سريع جداً

- **الرابط:** https://geotech3d-hub.vercel.app
- **الدخول:** username/email + `Geo@123456`
- **التعديل:** قوللي عايز إيه → أعدّل وأنشر → الفريق يشوفه خلال دقيقة.
- **الأمان:** بدّلوا الباسوردات قريب + دوّروا المفتاح السري.

---
*تم إنشاء هذا الدليل بواسطة Claude — GEOTECH 3D Geospatial Hub.*
