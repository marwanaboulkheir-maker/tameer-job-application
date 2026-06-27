# ⚙️ إعدادات تطبيق نموذج التقديم للوظائف
## Job Application Form - Complete Settings Guide

---

## 🔑 1. Firebase Configuration
**Status:** ✅ CONFIGURED

```javascript
// File: config.js (Lines 8-15)
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCz9bUZYqem1zdqP-QJb10CaQx3RB7vUFE",
    authDomain: "job-application-9f212.firebaseapp.com",
    projectId: "job-application-9f212",
    storageBucket: "job-application-9f212.appspot.com",
    messagingSenderId: "401296652443",
    appId: "1:401296652443:web:8dbc04f1160fcd686aae3e"
};
```

---

## 🏢 2. Organization Configuration
**Status:** ✅ CONFIGURED

```javascript
organization: {
    nameAr: "شركة التعمير لإدارة المرافق",
    nameEn: "Tameer Facility Management",
    ministriesAr: "وزارة الإسكان والمرافق",
    ministriesEn: "Ministry of Housing & Facilities",
    email: "Tameer_facility@mhud.gov.eg",
    phone: "+20 2 xxxx xxxx",
    address: "Cairo, Egypt"
}
```

**Can be customized for your organization.**

---

## 📋 3. Form Sections
**Status:** ✅ CONFIGURED

**Enabled Sections:**
- ✅ Job Position Selection
- ✅ Personal Information
- ✅ Education Details
- ✅ Work Experience
- ✅ File Attachments
- ✅ Declaration & Agreement

---

## 📁 4. File Upload Configuration
**Status:** ✅ CONFIGURED

```javascript
files: {
    enabled: true,
    maxFileSize: 10 * 1024 * 1024,  // 10 MB
    allowedFormats: {
        cv: ['pdf', 'doc', 'docx'],
        qualification: ['pdf', 'jpg', 'jpeg', 'png'],
        idCard: ['pdf', 'jpg', 'jpeg', 'png'],
        certificates: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']
    }
}
```

---

## 💾 5. Auto-Save Configuration
**Status:** ✅ CONFIGURED

```javascript
autoSave: {
    enabled: true,
    interval: 30000  // 30 seconds
}
```

**How it works:**
- Form data saves to browser `localStorage` every 30 seconds
- Automatically saves when user leaves a field
- User can continue form later

---

## 💼 6. Job Positions
**Status:** ✅ CONFIGURED

Configured Positions:
1. مهندس (Engineer)
2. مدير مشروع (Project Manager)
3. محاسب (Accountant)
4. موظف إداري (Administrative Officer)
5. مشرف (Supervisor)
6. فني (Technician)
7. أخرى (Other)

**To add/modify:** Edit `FORM_CONFIG.jobPositions` in config.js

---

## 📧 7. Email Configuration
**Status:** ✅ CONFIGURED

```javascript
email: {
    recipients: ['Tameer_facility@mhud.gov.eg'],
    subjectAr: 'طلب التحاق بوظيفة',
    subjectEn: 'Job Application',
    signatureAr: 'مع أطيب التحيات',
    signatureEn: 'Best Regards',
    apiSendEnabled: false,
    apiSendEndpoint: '/email/send'
}
```

**How it works:**
1. User submits form
2. Browser opens email client with pre-filled data
3. User attaches documents and sends

---

## 🎨 8. UI/UX Configuration
**Status:** ✅ CONFIGURED

```javascript
ui: {
    language: 'ar',  // Default language
    colors: {
        primary: '#003366',      // Navy blue
        secondary: '#006633',    // Dark green
        accent: '#ff9900',       // Orange
        success: '#28a745',      // Green
        error: '#dc3545',        // Red
        warning: '#ffc107'       // Yellow
    },
    showQRCode: true,
    showPrintButton: true,
    showEmailButton: true,
    showExportButton: true,
    notifications: {
        autoHideDuration: 4000,
        position: 'top-right'
    }
}
```

---

## ✅ 9. Required Fields
**Status:** ✅ CONFIGURED

| Field | Required |
|-------|----------|
| Job Position | ✅ Yes |
| Full Name | ✅ Yes |
| Date of Birth | ✅ Yes |
| Address | ✅ Yes |
| Phone | ✅ Yes |
| Email | ✅ Yes |
| Qualification | ✅ Yes |
| University | ✅ Yes |
| Graduation Year | ✅ Yes |
| Company Name | ❌ No |
| Job Title | ❌ No |
| Work Duration | ❌ No |
| Declaration | ✅ Yes |
| Signature Name | ✅ Yes |
| Date | ✅ Yes |
| Notes | ❌ No |

---

## 🔐 10. Validation Rules
**Status:** ✅ CONFIGURED

```javascript
validation: {
    phoneRegex: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
    minAge: 18,
    emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    nameMinLength: 3,
    graduationYearMin: 1950,
    graduationYearMax: 2027  // Current year + 1
}
```

---

## 📢 11. Announcement Content
**Status:** ✅ CONFIGURED

**Arabic Description:**
> تعلن شركة التعمير لإدارة المرافق عن فتح باب الانضمام لفرق العمل بها بالتعاقد لعدد من الكفاءات والخبرات المختلفة...

**English Description:**
> Tameer Facility Management Company announces the opening of recruitment for various positions...

**Requirements (Arabic & English):**
- مؤهل مناسب (Appropriate qualification)
- خبرة سابقة (Previous experience preferred)
- إجادة الحاسب (Computer proficiency)
- العمل ضمن فريق (Teamwork ability)
- الالتزام المهني (Professional commitment)

---

## 🗄️ 12. Storage Configuration
**Status:** ✅ CONFIGURED

```javascript
storage: {
    enabled: true,
    formDataKey: 'jobApplicationForm',
    filesDataKey: 'jobApplicationFiles',
    clearOnSubmit: true,          // Clear localStorage after submit
    autoBackupToServer: false     // Can be enabled for cloud backup
}
```

---

## 📊 13. Analytics Configuration
**Status:** ⚠️ DISABLED (Optional)

```javascript
analytics: {
    enabled: false,
    events: [
        'form_view',
        'form_start',
        'form_complete',
        'form_submit',
        'form_error',
        'file_upload'
    ]
}
```

To enable analytics, set `enabled: true` and configure tracking.

---

## 🔐 14. Security Configuration
**Status:** ✅ CONFIGURED

```javascript
security: {
    enableCSRF: false,
    rateLimit: null,           // null = disabled
    validateOrigin: false,
    encryptStorage: false      // Can be enabled for sensitive data
}
```

---

## 🔥 15. Firebase Security Rules
**Status:** ⚠️ NEEDS UPDATE

### Current Rules (Temporary)
The Firestore has temporary test rules with timestamp expiration.

### Recommended Development Rules
```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Development/Test Mode - Allow all reads/writes
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### Production Rules (Recommended)
```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Applications collection - allow all for form submission
    match /applications/{appId} {
      allow create: if true;                    // Anyone can submit
      allow read: if request.auth != null;      // Only authenticated users can view
      allow update, delete: if false;           // Prevent modification
    }
  }
}
```

**To Update Rules:**
1. Go to Firebase Console: https://console.firebase.google.com
2. Select project: "job-application-9f212"
3. Go to Firestore → Rules
4. Replace the code with one of the above
5. Click "Publish"

---

## 📱 16. Admin Panel Configuration
**Status:** ✅ CONFIGURED

**Access:**
- File: admin.html
- Default Access Code: `admin2026`

**Can be changed in:**
- admin.js → `checkAdminAccess()` function

---

## 🛠️ 17. Helper Functions
**Status:** ✅ CONFIGURED

Available in `config.js`:

```javascript
// Update configuration at runtime
updateConfig({ organization: { nameEn: "New Name" } });

// Get configuration value
getConfig('organization.email');  // Returns email value
getConfig('ui.colors.primary');   // Returns primary color
```

---

## 📋 Checklist - What's Configured

- [x] Firebase Project Created
- [x] Firestore Database Initialized
- [x] Organization Details (AR/EN)
- [x] Form Sections Setup
- [x] File Upload Settings
- [x] Auto-Save Configuration
- [x] Job Positions (7 positions)
- [x] Email Settings
- [x] UI Colors & Language
- [x] Validation Rules
- [x] Required Fields
- [x] Announcement Content
- [x] Storage Configuration
- [x] Admin Access Code
- [x] Real-time Listener Setup
- [ ] Firebase Security Rules (⚠️ PENDING)
- [ ] Firebase Storage Rules (Optional)
- [ ] Email API Integration (Optional)
- [ ] Analytics (Optional)

---

## 🚀 Quick Start

### 1. **View the Form**
```
Open: index.html in browser
```

### 2. **Submit a Test Application**
```
Fill form → Click "تجهيز الطلب للإرسال"
```

### 3. **Access Admin Panel**
```
Open: admin.html
Access Code: admin2026
```

### 4. **View Submissions in Firebase Console**
```
https://console.firebase.google.com/project/job-application-9f212/firestore
```

---

## 🔗 Useful Links

- **Firebase Console:** https://console.firebase.google.com/project/job-application-9f212
- **Firestore Database:** https://console.firebase.google.com/u/0/project/job-application-9f212/firestore/databases
- **Security Rules Editor:** https://console.firebase.google.com/u/0/project/job-application-9f212/firestore/databases/-default-/security/rules

---

## 📞 Support

For any issues or questions:
- Check [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for Firebase configuration help
- Check [README.md](README.md) for project overview
- Check [TODO.md](TODO.md) for implementation status

---

**Last Updated:** May 27, 2026  
**Configuration Status:** 85% Complete ✅
