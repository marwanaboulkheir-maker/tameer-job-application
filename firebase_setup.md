# Firebase Setup Guide | دليل تكوين Firebase

## English

### 1. Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create Project"
3. Enter your project name (e.g., "Job Application Form")
4. Follow the setup steps

### 2. Enable Firebase Storage
1. In Firebase Console, go to **Storage**
2. Click **Get Started**
3. Keep the default security rules for now (or customize them)

### 3. Get Your Firebase Credentials
1. Go to **Project Settings** (gear icon)
2. Click on your app or create a new web app
3. Copy the Firebase config object that looks like:
```javascript
{
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
}
```

### 4. Update Configuration
1. Open `config.js`
2. Update `FIREBASE_CONFIG` with your actual Firebase credentials
3. (Optional) Set `FORM_CONFIG.firebase.database.mode`:
   - `'rtdb'` (default)
   - `'firestore'` (optional mode scaffold)
4. (Optional) Enable auth scaffold from:
   - `FORM_CONFIG.firebase.auth.enabled = true`
5. Save the file

> Note: `script.js` now reads Firebase config from `config.js` automatically.

### 5. Security Rules (Optional)
For development and production, update your Firebase rules in Firebase Console:

**Firestore Rules (for test mode - development):**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Test mode - anyone can read/write (NO EXPIRATION)
    }
  }
}
```

**Firestore Rules (for production - recommended):**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /applications/{appId} {
      allow create: if true;
      allow read: if true;
      allow update, delete: if request.auth != null;
    }
  }
}
```

**Storage Rules (for test mode):**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true; // Test mode
    }
  }
}
```

**Storage Rules (for production):**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /job-applications/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## العربية

### 1. إنشاء مشروع Firebase
1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. اضغط على "Create Project"
3. أدخل اسم المشروع (مثل: "Job Application Form")
4. اتبع خطوات الإعداد

### 2. تفعيل Firebase Storage
1. في Firebase Console، اذهب إلى **Storage**
2. اضغط على **Get Started**
3. احتفظ بقواعد الأمان الافتراضية للآن (أو خصصها)

### 3. احصل على بيانات اعتماد Firebase
1. اذهب إلى **Project Settings** (أيقونة الترس)
2. اضغط على تطبيقك أو أنشئ تطبيق ويب جديد
3. انسخ كائن إعدادات Firebase الذي يبدو هكذا:
```javascript
{
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
}
```

### 4. تحديث الإعدادات
1. افتح ملف `config.js`
2. حدّث كائن `FIREBASE_CONFIG` ببيانات مشروع Firebase الفعلية
3. (اختياري) حدّد وضع قاعدة البيانات من:
   - `FORM_CONFIG.firebase.database.mode = 'rtdb'` (الافتراضي)
   - أو `'firestore'` (كتجهيز اختياري)
4. (اختياري) فعّل إعدادات المصادقة المبدئية:
   - `FORM_CONFIG.firebase.auth.enabled = true`
5. احفظ الملف

> ملاحظة: ملف `script.js` يقرأ الإعدادات تلقائياً من `config.js`.

### 5. قواعد الأمان (اختياري)
للإنتاج، حدّث قواعد أمان Firestore/Storage في Firebase Console:

**قواعد التخزين:**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /job-applications/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## Features | الميزات

✅ **Automatic PDF Saving** - تحفظ ملفات PDF تلقائياً عند تحديث النموذج
✅ **Cloud Storage** - جميع الملفات محفوظة بأمان في Firebase
✅ **Automatic Backups** - نسخ احتياطية تلقائية للبيانات
✅ **Easy Access** - يمكنك الوصول للملفات من أي مكان

---

## Troubleshooting | استكشاف الأخطاء

### PDF not saving to Firebase?
- Check browser console (F12 > Console tab)
- Verify Firebase credentials are correct
- Make sure Firebase Storage is enabled
- Check internet connection

### لا يتم حفظ PDF في Firebase؟
- تحقق من وحدة تحكم المتصفح (F12 > Console)
- تحقق من صحة بيانات اعتماد Firebase
- تأكد من تفعيل Firebase Storage
- تحقق من اتصال الإنترنت
