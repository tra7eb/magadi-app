# 🛒 تطبيق مقاضي — دليل التثبيت والنشر

## خطوات النشر على Vercel (مجاناً)

### الخطوة 1 — رفع المشروع على GitHub
1. افتح [github.com](https://github.com) وسجّل دخول (أو أنشئ حساباً مجاناً)
2. اضغط **"New repository"**
3. الاسم: `maqadi-app` → اضغط **"Create repository"**
4. على جهازك افتح **Terminal** أو **Command Prompt** داخل مجلد المشروع وشغّل:
```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/USERNAME/maqadi-app.git
git push -u origin main
```

### الخطوة 2 — النشر على Vercel
1. افتح [vercel.com](https://vercel.com) وسجّل دخول بحساب GitHub
2. اضغط **"Add New Project"**
3. اختر repository **maqadi-app**
4. اضغط **"Deploy"** — انتظر دقيقة
5. ستحصل على رابط مثل: `https://maqadi-app.vercel.app`

### الخطوة 3 — تثبيت على iPhone
1. افتح Safari وادخل رابط التطبيق
2. اضغط أيقونة **المشاركة** (الصندوق بالسهم للأعلى)
3. اختر **"Add to Home Screen"** / **"إضافة إلى الشاشة الرئيسية"**
4. اضغط **"Add"** — سيظهر التطبيق على شاشتك

### الخطوة 4 — تثبيت على Samsung Galaxy
1. افتح Chrome وادخل رابط التطبيق
2. ستظهر رسالة تلقائية **"Add to Home Screen"** في الأسفل
3. أو اضغط **⋮** (القائمة) → **"Add to Home Screen"**
4. اضغط **"Add"** — سيظهر التطبيق

## التزامن
- التطبيق يتزامن تلقائياً بين جميع الأجهزة عبر Firebase
- يعمل بدون إنترنت ويتزامن عند عودة الاتصال

## ملاحظات
- Firebase Spark (المجاني) يكفي للاستخدام العائلي
- الحد المجاني: 50,000 قراءة و20,000 كتابة يومياً
