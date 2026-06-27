/**
 * Job Application Form - Configuration
 * Easily customize the form for your organization
 * 
 * This is an ES Module that:
 * 1. Works with Vite bundler (import statement)
 * 2. Works directly in browser with type="module"
 * 3. Exposes globals for inline HTML event handlers
 */

// ============ FIREBASE CONFIGURATION ============
// Configured for local development AND Firebase cloud storage
// Works offline (localStorage) and syncs to Firebase when online
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAi7RmDZ6Wqv5wBL8VNLlZP5wZCyp5lJNQ",
    authDomain: "job-application-7f8d4.firebaseapp.com",
    projectId: "job-application-7f8d4",
    storageBucket: "job-application-7f8d4.firebasestorage.app",
    messagingSenderId: "198258398221",
    appId: "1:198258398221:web:596c028f9d99a4ecaaf144",

    // Optional keys (set if needed)
    // IMPORTANT for RTDB: set databaseURL to https://<PROJECT_ID>-default-rtdb.firebaseio.com
    databaseURL: "https://job-application-7f8d4-default-rtdb.firebaseio.com",
    measurementId: "G-F9JCR0CG58"
};

// LOCAL STORAGE (Offline Mode)
// ✓ Works without internet connection
// ✓ Automatically saves form drafts to browser storage
// ✓ Data persists across sessions

// FIREBASE STORAGE (Online Mode)
// ✓ Syncs PDFs to cloud when internet is available
// ✓ Accessible from Firebase Console
// ✓ Automatic backup to cloud storage

const FORM_CONFIG = {
    // ============ Organization Details ============
    organization: {
        nameAr: "شركة التعمير لإدارة المرافق",
        nameEn: "Tameer Facility Management",
        ministriesAr: "وزارة الإسكان والمرافق",
        ministriesEn: "Ministry of Housing & Facilities",
        email: "Tameer_facility@mhud.gov.eg",
        phone: "+20 2 xxxx xxxx",
        address: "Cairo, Egypt"
    },

    // ============ Form Configuration ============
    form: {
        // Form sections to display
        enabledSections: [
            'jobPosition',
            'personalInfo',
            'education',
            'experience',
            'attachments',
            'declaration'
        ],

        // Make experience section required or optional
        experienceRequired: false,

        // File upload configuration
        files: {
            enabled: true,
            maxFileSize: 10 * 1024 * 1024, // 10 MB
            allowedFormats: {
                cv: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'],
                qualification: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'],
                idCard: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'],
                certificates: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp']
            }
        },

        // Auto-save configuration
        autoSave: {
            enabled: true,
            interval: 30000 // 30 seconds
        }
    },

    // ============ Job Positions ============
    jobPositions: [
        {
            id: 'engineer',
            nameAr: 'مهندس',
            nameEn: 'Engineer',
            department: 'Engineering'
        },
        {
            id: 'manager',
            nameAr: 'مدير مشروع',
            nameEn: 'Project Manager',
            department: 'Management'
        },
        {
            id: 'accountant',
            nameAr: 'محاسب',
            nameEn: 'Accountant',
            department: 'Finance'
        },
        {
            id: 'admin',
            nameAr: 'موظف إداري',
            nameEn: 'Administrative Officer',
            department: 'Administration'
        },
        {
            id: 'supervisor',
            nameAr: 'مشرف',
            nameEn: 'Supervisor',
            department: 'Operations'
        },
        {
            id: 'technician',
            nameAr: 'فني',
            nameEn: 'Technician',
            department: 'Technical'
        },
        {
            id: 'other',
            nameAr: 'أخرى',
            nameEn: 'Other',
            department: 'Other'
        }
    ],

    // ============ API Configuration ============
    api: {
        enabled: false,
        baseUrl: 'https://api.example.com',
        endpoints: {
            submit: '/applications/submit',
            upload: '/files/upload',
            validate: '/validation',
            positions: '/positions',
            analytics: '/analytics'
        },
        apiKey: '', // Set via environment variable
        timeout: 30000
    },

    // ============ Email Configuration ============
    email: {
        // Email addresses for submissions
        recipients: [
            'Tameer_facility@mhud.gov.eg'
        ],
        
        // Email subject
        subjectAr: 'طلب التحاق بوظيفة',
        subjectEn: 'Job Application',

        // Signature
        signatureAr: 'مع أطيب التحيات',
        signatureEn: 'Best Regards',

        // Enable email sending through API
        apiSendEnabled: false,
        apiSendEndpoint: '/email/send'
    },

    // ============ UI/UX Configuration ============
    ui: {
        // Language settings
        language: 'ar', // 'ar' or 'en'
        
        // Theme colors
        colors: {
            primary: '#003366',
            secondary: '#006633',
            accent: '#ff9900',
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107'
        },

        // Show/hide elements
        showQRCode: true,
        showPrintButton: true,
        showEmailButton: true,
        showExportButton: true,

        // Notifications
        notifications: {
            autoHideDuration: 4000,
            position: 'top-right'
        }
    },

    // ============ Required Fields ============
    requiredFields: {
        jobPosition: true,
        fullName: true,
        dateOfBirth: true,
        address: true,
        phone: true,
        email: true,
        qualification: true,
        university: true,
        graduationYear: true,
        company: false, // Optional
        jobTitle: false, // Optional
        workDuration: false, // Optional
        declaration: true,
        signatureName: true,
        date: true,
        notes: false // Optional
    },

    // ============ Validation Rules ============
    validation: {
        // Phone number format
        phoneRegex: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
        
        // Minimum age
        minAge: 18,
        
        // Email validation (standard)
        emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

        // Name minimum length
        nameMinLength: 3,

        // Graduation year range
        graduationYearMin: 1950,
        graduationYearMax: new Date().getFullYear() + 1
    },

    // ============ Announcement Content ============
    announcement: {
        // Main description
        descriptionAr: `تعلن شركة التعمير لإدارة المرافق عن فتح باب الانضمام لفرق العمل بها بالتعاقد لعدد من الكفاءات والخبرات المختلفة، للعمل ضمن فريق احترافي في بيئة قائمة على التطوير والالتزام والجودة.`,
        
        descriptionEn: `Tameer Facility Management Company announces the opening of recruitment for various positions. We are looking for talented professionals to join our team in a professional environment focused on development, commitment, and quality.`,

        // Requirements
        requirementsAr: [
            'مؤهل مناسب للتخصص المطلوب',
            'يفضل وجود خبرة سابقة في المجالات ذات الصلة',
            'إجادة استخدام الحاسب الآلي',
            'القدرة على العمل ضمن فريق',
            'الالتزام والانضباط المهني'
        ],

        requirementsEn: [
            'Appropriate qualification for the required specialization',
            'Previous experience in related fields preferred',
            'Proficiency in computer usage',
            'Ability to work as a team member',
            'Professional commitment and discipline'
        ],

        // Benefits
        benefitsAr: [
            'فرص تطوير وظيفي وتدريب مستمر',
            'بيئة عمل احترافية ومشروعات متنوعة'
        ],

        benefitsEn: [
            'Career development and continuous training',
            'Professional work environment with diverse projects'
        ],

        // Application steps
        stepsAr: [
            'املأ النموذج بالبيانات الصحيحة',
            'اضغط "تجهيز الطلب للإرسال"',
            'افتح البريد وأرفق المستندات المطلوبة ثم أرسل'
        ],

        stepsEn: [
            'Fill the form with correct information',
            'Click "Prepare for Submission"',
            'Attach documents and send via email'
        ]
    },

    // ============ Firebase Runtime Options ============
    firebase: {
        enabled: true,

        // Database mode:
        // - 'rtdb' (default): uses Realtime Database as primary store
        // - 'firestore': optional mode for future expansion
        database: {
            mode: 'rtdb',
            enableFirestoreFallback: false
        },

        // Auth scaffolding (disabled by default)
        auth: {
            enabled: false,
            provider: 'email', // email | google | phone
            requireAuthForAdminRead: true
        }
    },

    // ============ Storage Configuration ============
    storage: {
        // Use localStorage for auto-save
        enabled: true,
        
        // Local storage keys
        formDataKey: 'jobApplicationForm',
        filesDataKey: 'jobApplicationFiles',

        // Clear storage after submission
        clearOnSubmit: true,

        // Auto-backup to server
        autoBackupToServer: false
    },

    // ============ Analytics ============
    analytics: {
        // Enable form analytics
        enabled: false,
        
        // Track these events
        events: [
            'form_view',
            'form_start',
            'form_complete',
            'form_submit',
            'form_error',
            'file_upload'
        ]
    },

    // ============ Security ============
    security: {
        // Enable CSRF token
        enableCSRF: false,

        // Rate limiting (submissions per hour)
        rateLimit: null, // null = disabled

        // Validate submission origin
        validateOrigin: false,

        // Encrypt stored data
        encryptStorage: false
    }
};

/**
 * Update configuration at runtime
 * @param {Object} updates - Configuration updates
 */
function updateConfig(updates) {
    Object.assign(FORM_CONFIG, updates);
    console.log('Configuration updated:', updates);
}

/**
 * Get configuration value
 * @param {string} path - Configuration path (e.g., 'organization.email')
 * @returns {*} Configuration value
 */
function getConfig(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], FORM_CONFIG);
}

// ============ EXPORTS FOR MODULE USAGE ============
// Export for ES Module loaders (Vite, Rollup, etc.)
export { FIREBASE_CONFIG, FORM_CONFIG, updateConfig, getConfig };

// ============ GLOBALS FOR INLINE EVENT HANDLERS ============
// Make available globally so onclick="functionName()" works in HTML
// This runs immediately when the module loads
if (typeof window !== 'undefined') {
    window.FIREBASE_CONFIG = FIREBASE_CONFIG;
    window.FORM_CONFIG = FORM_CONFIG;
    window.updateConfig = updateConfig;
    window.getConfig = getConfig;
}

// ============ ENSURE GLOBALS ARE SET ============
// Force attach to window immediately for backward compatibility
// This ensures the values are available even before module loading completes
(function() {
    if (typeof window !== 'undefined') {
        // Check if already set, if not set again
        if (!window.FIREBASE_CONFIG) window.FIREBASE_CONFIG = FIREBASE_CONFIG;
        if (!window.FORM_CONFIG) window.FORM_CONFIG = FORM_CONFIG;
        if (!window.updateConfig) window.updateConfig = updateConfig;
        if (!window.getConfig) window.getConfig = getConfig;
    }
})();
