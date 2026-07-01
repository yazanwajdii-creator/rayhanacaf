# ريحانة كافيه — النسخة الويب

تطبيق محاسبي للكافيه — معماريّة سيرفر/قاعدة بيانات حقيقية.

## لماذا إعادة البناء؟

النسخة السابقة (`/index.html` كملف واحد + Capacitor APK) واجهت مشاكل متكررة:
- فقد بيانات في المزامنة (3 طبقات تخزين: localStorage + IndexedDB + Supabase)
- مستوى الخدمة المجانية على Supabase يتوقّف عند الخمول
- ملف 19,000 سطر — كل تعديل صغير قد يكسر شيئاً بعيداً
- دورة بناء APK بطيئة (تعديل → بناء → تنزيل → تثبيت)

## المعماريّة الجديدة

```
المتصفّح (هاتف/كمبيوتر)
   ↓ HTTPS
Express API على Render
   ↓
PostgreSQL على Render
```

- مصدر واحد للحقيقة: قاعدة البيانات
- لا snapshot/merge — INSERT/UPDATE ذرّية
- نسخ احتياطية يومية تلقائية من Render
- تكلفة متوقّعة: ~14$/شهر

## البنية

```
webapp/
├── server/                  Backend (Node.js + Express)
│   ├── index.js             نقطة الدخول
│   ├── db.js                اتصال PostgreSQL
│   ├── auth.js              مصادقة (كلمة مرور واحدة)
│   ├── routes/              نقاط API
│   └── migrations/          SQL — تشغّل بترتيب رقمي
├── public/                  Frontend (HTML/CSS/JS)
├── scripts/
│   └── import-legacy-json.js  ترحيل بيانات JSON القديمة
├── package.json
├── .env.example
└── docker-compose.yml       تشغيل محلّي مع Postgres
```

## التشغيل محلّياً

```bash
cd webapp
cp .env.example .env
# عدّل .env (DATABASE_URL, APP_PASSWORD)

# خيار 1: عبر Docker (يشغّل Postgres تلقائياً)
docker compose up -d
npm install
npm run migrate
npm start

# خيار 2: Postgres محلّي مثبّت
npm install
npm run migrate
npm start
```

## النشر على Render

1. أنشئ Web Service جديدة على render.com
2. أنشئ PostgreSQL جديدة
3. اربط `DATABASE_URL` من Postgres إلى Web Service
4. اضبط `APP_PASSWORD` ككلمة مرور للدخول
5. Build command: `npm install && npm run migrate`
6. Start command: `npm start`

## ترحيل البيانات القديمة

```bash
# صدّر JSON من APK القديم (زر "أرشيف شامل")
# انقل الملف إلى webapp/data/legacy.json
npm run import-legacy
```
