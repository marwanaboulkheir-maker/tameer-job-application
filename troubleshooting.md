# 🔧 حل مشاكل عدم ظهور الطلبات في Admin Panel

## المشكلة
لا تظهر الطلبات في لوحة التحكم (Admin Dashboard)

## الحل - خطوات محددة

### الخطوة 1: تحديث Firebase Realtime Database Rules

1. افتح الرابط: https://console.firebase.google.com/project/job-application-9f212/database
2. اضغط على "Rules" في الأعلى
3. احذف القواعد الموجودة وضع هذا الكود:

```json
{
  "rules": {
    ".read": true,
    ".write": true,
    "applications": {
      ".read": true,
      ".write": true,
      ".indexOn": ["jobPosition", "submittedAt"]
    }
  }
}
```

4. اضغط "Publish" (نشر)

---

### الخطوة 2: إرسال طلب جديد من النموذج

1. افتح `index.html` 
2. املأ نموذج الطلب
3. اضغط "ارسال نموذج الطلب"
4. تأكد من ظهور رسالة "تم حفظ الطلب في قاعدة البيانات"

---

### الخطوة 3: فتح لوحة التحكم

1. افتح `admin.html`
2. يجب أن تظهر الطلبات تلقائياً

---

## إذا لم تظهر الطلبات بعد ذلك:

### افتح Firebase Console للتحقق

1. https://console.firebase.google.com/project/job-application-9f212/database/data

2. يجب أن ترى مجلد "applications" يحتوي على الطلبات

### فحص أخطاء المتصفح

1. افتح `admin.html`
2. اضغط F12
3. اضغط على "Console"
4. إذا وجدت أخطاء،截图ها وأرسلها

---

## ملفات المساعدة تم إنشاؤها:

- `disable-grammarly.bat` - لتعطيل Grammarly
- `open-form.ps1` - لفتح نموذج التقديم
- `open-firebase-console.bat` - لفتح Firebase Console

---

**آخر تحديث:** 2026-06-04
