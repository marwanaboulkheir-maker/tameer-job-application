# تحديث قواعس Firestore الأمان

## المشكلة
خطأ: `Missing or insufficient permissions` عند محاولة حذف الطلبات من لوحة المراقبة.

## السبب
قواعس Firestore السابقة كانت تمنع الحذف والتعديل:
```
allow update, delete: if false;  ❌
```

## الحل
تم تحديث قواعس الأمان لتسمح بحذف الطلبات للمستخدمين المصرحين.

## كيفية تطبيق القواعس الجديدة

### الخطوة 1: دخول Firebase Console
1. اذهب إلى [Firebase Console](https://console.firebase.google.com)
2. اختر مشروعك `job-application-9f212`

### الخطوة 2: الذهاب إلى قسم الأمان
1. في القائمة اليسرى: اختر **Firestore Database**
2. انقر على تبويب **Rules**

### الخطوة 3: استبدال القواعس
احذف القواعس الحالية والصق القواعس الجديدة:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Applications Collection
    match /applications/{appId} {
      // Anyone can create new applications
      allow create: if true;
      
      // Anyone can read
      allow read: if true;
      
      // Authenticated users (admin panel) can update and delete
      allow update, delete: if request.auth != null;
    }
    
    // Admin Data (protected)
    match /admin/{adminId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### الخطوة 4: نشر القواعس
1. انقر على زر **Publish** أو **Deploy**
2. انتظر التأكيد

## الميزات الجديدة ✅
- ✅ يمكن إنشاء طلبات جديدة (أي شخص)
- ✅ يمكن قراءة الطلبات (أي شخص)
- ✅ يمكن حذف الطلبات (المستخدمون المصرحون في Firebase)
- ✅ يمكن تعديل الطلبات (المستخدمون المصرحون في Firebase)

## ملاحظات الأمان
- هذه القواعس توازن بين الأمان والوظائف
- الحذف والتعديل يتطلب مصادقة Firebase (authentication)
- لاستخدام أكثر أماناً، يمكن إضافة التحقق من رقم المسؤول برمز محدد

## ملفات التحديث
- ✅ `FIRESTORE_RULES_PROD.txt` - القواعس المحدثة
- ✅ `FIREBASE_SETUP.md` - التوثيق المحدث
- ✅ `admin.js` - دالة الحذف الجديدة
