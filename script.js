// Storage key for form data
const STORAGE_KEY = 'jobApplicationForm';
const FILES_STORAGE_KEY = 'jobApplicationFiles';
let experienceCount = 1;
let certificateFieldCount = 1;
let additionalCertificateCount = 1;

// ============ WAIT FOR CONFIG MODULE TO LOAD ============
// When running as ES modules, config.js loads first and sets window globals
// This ensures we have access to the configuration
function waitForConfig(maxAttempts = 50) {
    return new Promise((resolve) => {
        let attempts = 0;
        const check = () => {
            if (window.FIREBASE_CONFIG && window.FORM_CONFIG) {
                resolve(true);
                return;
            }
            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(check, 10); // Wait 10ms between checks
            } else {
                console.warn('Config module not loaded, using fallback values');
                resolve(false);
            }
        };
        check();
    });
}

// Firebase Configuration - shared with config.js when available
// Use window globals set by config.js module, with fallback to hardcoded values
const firebaseConfig = (window.FIREBASE_CONFIG)
    ? window.FIREBASE_CONFIG
    : {
        apiKey: "AIzaSyAi7RmDZ6Wqv5wBL8VNLlZP5wZCyp5lJNQ",
        authDomain: "job-application-7f8d4.firebaseapp.com",
        projectId: "job-application-7f8d4",
        storageBucket: "job-application-7f8d4.firebasestorage.app",
        messagingSenderId: "198258398221",
        appId: "1:198258398221:web:596c028f9d99a4ecaaf144",
        databaseURL: "https://job-application-7f8d4-default-rtdb.firebaseio.com",
        measurementId: "G-F9JCR0CG58"
    };

const firebaseRuntimeConfig = (window.FORM_CONFIG?.firebase)
    ? window.FORM_CONFIG.firebase
    : {
        enabled: true,
        database: { mode: 'rtdb', enableFirestoreFallback: false },
        auth: { enabled: false, provider: 'email', requireAuthForAdminRead: true }
    };

// Initialize Firebase safely (compatible mode)
let firebaseApp = null;
let firebaseDb = null;
let firebaseRtdb = null;
let firebaseInitialized = false;

// Initialize Firebase after config is ready
async function initializeFirebaseWithConfig() {
    try {
        // Wait for config module to load first
        const configLoaded = await waitForConfig(100);
        
        // Re-read config from window in case it just loaded
        const runtimeConfig = (window.FORM_CONFIG?.firebase) ? window.FORM_CONFIG.firebase : firebaseRuntimeConfig;
        
        if (runtimeConfig.enabled && typeof firebase !== 'undefined' && firebase.initializeApp) {
            // Re-read firebase config from window
            const runtimeFirebaseConfig = window.FIREBASE_CONFIG || firebaseConfig;
            
            firebaseApp = firebase.initializeApp(runtimeFirebaseConfig);

            // Initialize Realtime Database
            if (firebase.database) {
                firebaseRtdb = firebase.database();
            }

            firebaseInitialized = true;
            console.log('✅ Firebase initialized successfully (RTDB)');
        }
    } catch (error) {
        console.warn('Firebase initialization warning (this is normal offline):', error.message);
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Start Firebase initialization (async, will auto-complete)
    initializeFirebaseWithConfig();
    
    // Initialize app UI
    initializeApp();
});

// Initialize app functionality
function initializeApp() {
    // Set current date if not set
    const dateEl = document.getElementById('date');
    if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
    
    // Load saved form data
    loadFormData();
    
    // Auto-save form on input change
    const form = document.getElementById('applicationForm');
    if (form) {
        form.addEventListener('input', autoSaveForm);
        form.addEventListener('change', autoSaveForm);
    }
    
    // Setup section change notifications
    setupSectionNotifications();
    
    // Handle military status visibility based on gender
    handleMilitaryStatusVisibility();
    
    // Handle URL parameters (pre-select job position)
    handleURLParams();
    
    // Initialize job description modal
    initJobDescriptionModal();

    // Profile photo preview (reliable event listener — doesn't depend on global scope)
    const photoInput = document.getElementById('profilePhoto');
    if (photoInput) {
        photoInput.addEventListener('change', function() {
            previewProfilePhoto(this);
        });
    }
}

// Generate QR Code
function generateQRCode() {
    // QR code removed in new design
    console.log('QR code generation skipped');
}

// Preview profile photo before upload
function previewProfilePhoto(input) {
    const preview = document.getElementById('profilePhotoPreview');
    const uploadText = document.getElementById('photoUploadText');
    if (!input || !input.files || !input.files.length) return;
    const file = input.files[0];
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        if (preview) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        if (uploadText) uploadText.textContent = file.name;
    };
    reader.readAsDataURL(file);
}

// Read and compress a photo file to a base64 JPEG string (max 300×400 px)
async function readPhotoAsBase64(inputId, maxWidth = 300, maxHeight = 400) {
    const input = document.getElementById(inputId);
    if (!input || !input.files || !input.files.length) return null;
    const file = input.files[0];
    if (!file.type.startsWith('image/')) return null;
    if (file.size > 2 * 1024 * 1024) {
        showNotification('حجم الصورة يتجاوز 2MB. يرجى اختيار صورة أصغر.', 'error');
        return null;
    }
    console.log('[Photo] Reading:', file.name, 'size:', (file.size/1024).toFixed(1), 'KB');
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                const ratio = Math.min(maxWidth / w, maxHeight / h, 1);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                const result = canvas.toDataURL('image/jpeg', 0.82);
                console.log('[Photo] Compressed to', (result.length / 1024).toFixed(1), 'KB base64');
                resolve(result);
            };
            img.onerror = () => { console.warn('[Photo] Image load error'); resolve(null); };
            img.src = e.target.result;
        };
        reader.onerror = () => { console.warn('[Photo] FileReader error'); resolve(null); };
        reader.readAsDataURL(file);
    });
}

// Handle military status visibility based on gender
function handleMilitaryStatusVisibility() {
    const genderSelect = document.getElementById('gender');
    const militaryGroup = document.getElementById('militaryStatusGroup');
    
    if (!genderSelect || !militaryGroup) return;
    
    function updateMilitaryStatus() {
        const gender = genderSelect.value;
        if (gender === 'male') {
            militaryGroup.style.display = 'block';
        } else {
            militaryGroup.style.display = 'none';
            // Clear the value when hiding
            const militaryStatus = document.getElementById('militaryStatus');
            if (militaryStatus) militaryStatus.value = '';
        }
    }
    
    genderSelect.addEventListener('change', updateMilitaryStatus);
    // Check on load as well
    updateMilitaryStatus();
}

// Handle URL parameters
function handleURLParams() {
    const params = new URLSearchParams(window.location.search);
    
    // Pre-select job if provided
    if (params.has('job')) {
        const jobValue = params.get('job');
        const jobSelect = document.getElementById('jobPosition');
        if (!jobSelect) return;
        const options = Array.from(jobSelect.options).map(o => o.value);
        
        if (options.includes(jobValue)) {
            jobSelect.value = jobValue;
        }
    }
}

// Setup section change notifications
function setupSectionNotifications() {
    let currentSection = null;
    // Updated sectionMap to match actual form sections in index.html
    const sectionMap = {
        'jobPosition': '1. الوظيفة المطلوبة',
        'fullName': '2. البيانات الشخصية',
        'availableFrom': '3. البيانات الإضافية',
        'qualification': '4. المؤهل العلمي',
        'company0': '5. الخبرات السابقة',
        'languages': '6. المهارات والقدرات',
        'additionalCertificateName': '7. الشهادات الإضافية',
        'declaration': '8. الإقرار والتوقيع'
    };
    
    const form = document.getElementById('applicationForm');
    if (!form) return;
    
    const formElements = form.querySelectorAll('input, select, textarea');
    
    formElements.forEach(element => {
        element.addEventListener('focus', function() {
            // Find which section this element belongs to
            let section = null;
            for (let fieldName in sectionMap) {
                const candidate = form.elements[fieldName];
                if (!candidate) continue;
                if (candidate === element || (candidate && candidate.contains && candidate.contains(element))) {
                    section = fieldName;
                    break;
                }
            }
            
            // If no direct match, try parent containment
            if (!section) {
                const fieldNames = Object.keys(sectionMap);
                for (let fieldName of fieldNames) {
                    try {
                        const candidate = form.elements[fieldName];
                        if (candidate && candidate.contains && candidate.contains(element)) {
                            section = fieldName;
                            break;
                        }
                    } catch (e) {}
                }
            }
            
            // Show notification on section change
            if (section && section !== currentSection) {
                currentSection = section;
                showNotification(`تم الانتقال إلى ${sectionMap[section]}`, 'success');
            }
        });
    });
}

// Auto-save form data to localStorage
function autoSaveForm() {
    const form = document.getElementById('applicationForm');
    if (!form) return;

    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        if (key === 'declaration') {
            const el = form.elements[key];
            data[key] = el ? el.checked : false;
        } else {
            data[key] = value;
        }
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Update Job Reference Number when job position is selected
function updateJobRefNumber() {
    const jobSelect = document.getElementById('jobPosition');
    const jobRefInput = document.getElementById('jobRefNumber');
    
    if (!jobSelect || !jobRefInput) return;
    
    const selectedOption = jobSelect.options[jobSelect.selectedIndex];
    const refNumber = selectedOption?.getAttribute('data-ref');
    const description = selectedOption?.getAttribute('data-description');
    
    if (refNumber) {
        jobRefInput.value = refNumber;
    } else {
        jobRefInput.value = '';
    }
    
    // Show job description modal
    if (description) {
        showJobDescriptionModal(selectedOption.text, description);
    }
    
    // Auto-save after selection change
    autoSaveForm();
}

// Show job description modal
function showJobDescriptionModal(jobTitle, description) {
    const modal = document.getElementById('jobDescriptionModal');
    const titleElement = document.getElementById('jobDescriptionTitle');
    const textElement = document.getElementById('jobDescriptionText');
    
    if (!modal || !titleElement || !textElement) return;
    
    titleElement.textContent = jobTitle;
    textElement.textContent = description;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Hide job description modal
function hideJobDescriptionModal() {
    const modal = document.getElementById('jobDescriptionModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Initialize job description modal handlers
function initJobDescriptionModal() {
    const closeBtn = document.getElementById('closeDescriptionModal');
    const confirmBtn = document.getElementById('confirmJobSelection');
    const modal = document.getElementById('jobDescriptionModal');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', hideJobDescriptionModal);
    }
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', hideJobDescriptionModal);
    }
    
    // Close modal when clicking outside of it
    if (modal) {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                hideJobDescriptionModal();
            }
        });
    }
    
    // Hide modal when user starts filling the form
    const formInputs = document.querySelectorAll('#applicationForm input[type="text"], #applicationForm input[type="email"], #applicationForm input[type="tel"], #applicationForm textarea, #applicationForm select');
    formInputs.forEach(input => {
        // Skip the jobPosition select itself
        if (input.id !== 'jobPosition') {
            input.addEventListener('focus', hideJobDescriptionModal);
            input.addEventListener('change', hideJobDescriptionModal);
        }
    });
}

// Load form data from localStorage
function loadFormData() {
    const savedData = localStorage.getItem(STORAGE_KEY);
    
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            const form = document.getElementById('applicationForm');
            if (!form) return;
            
            for (let key in data) {
                const element = form.elements[key];
                if (element) {
                    // Skip file inputs - they cannot be set programmatically
                    if (element.type === 'file') {
                        continue;
                    } else if (element.type === 'checkbox') {
                        element.checked = data[key];
                    } else {
                        element.value = data[key];
                    }
                }
            }
            
            showNotification('تم تحميل البيانات المحفوظة', 'success');
        } catch (error) {
            console.error('Error loading form data:', error);
        }
    }
}

// Add new experience
function addExperience() {
    const container = document.getElementById('experiences-container');
    if (!container) return;

    const newId = experienceCount + 1;
    
const experienceHTML = `
    <div class="experience-item" data-experience-id="${newId}">
        <div class="experience-header">
            <h4>الخبرة ${newId}</h4>
            <button type="button" class="btn btn-danger btn-sm" onclick="removeExperience(${newId})">حذف</button>
        </div>

        <div class="form-group">
            <label for="company${newId}">جهة العمل</label>
            <input type="text" id="company${newId}" name="company${newId}" placeholder="اسم الشركة">
        </div>

        <div class="form-row">
            <div class="form-group">
                <label for="jobTitle${newId}">الوظيفة</label>
                <input type="text" id="jobTitle${newId}" name="jobTitle${newId}" placeholder="المسمى الوظيفي">
            </div>

            <div class="form-group">
                <label for="workDuration${newId}">مدة العمل</label>
                <input type="text" id="workDuration${newId}" name="workDuration${newId}" placeholder="مثال: 2023–2025">
            </div>
        </div>

        <div class="form-group">
            <label for="experienceDescription${newId}">الوصف التفصيلي للخبرة | Experience Description</label>
            <textarea id="experienceDescription${newId}" name="experienceDescription${newId}" placeholder="اذكر أهم Achievements والإنجازات والمهام التي قمت بها" rows="3"></textarea>
        </div>
    </div>
    `;
    
    container.insertAdjacentHTML('beforeend', experienceHTML);
    experienceCount = newId;
    
    // Add event listeners to new inputs
    const newInputs = container.querySelectorAll(`input[id*="${newId}"]`);
    newInputs.forEach(input => {
        input.addEventListener('input', autoSaveForm);
        input.addEventListener('change', autoSaveForm);
    });
    
    autoSaveForm();
    showNotification('تمت إضافة خبرة جديدة', 'success');
}

// Remove experience
function removeExperience(id) {
    const element = document.querySelector(`[data-experience-id="${id}"]`);
    if (element) {
        element.remove();
        autoSaveForm();
        showNotification('تم حذف الخبرة', 'success');
    }
}

// Add new certificate (for the new certificates section)
let certificateCount = 1;
function addCertificate() {
    const container = document.getElementById('certificates-section-container');
    if (!container) return;

    const newId = certificateCount + 1;
    
    const certificateHTML = `
    <div class="experience-item" data-certificate-id="${newId}">
        <div class="experience-header">
            <h4>الشهادة ${newId}</h4>
            <button type="button" class="btn btn-danger btn-sm" onclick="removeCertificate(${newId})">حذف</button>
        </div>

        <div class="form-group">
            <label for="certificateName${newId}">اسم الشهادة | Certificate Name</label>
            <input type="text" id="certificateName${newId}" name="certificateName${newId}" placeholder="مثال: شهادة إدارة مشروعات PMP">
        </div>

        <div class="form-row">
            <div class="form-group">
                <label for="certificateIssuer${newId}">جهة الإصدار | Issuing Organization</label>
                <input type="text" id="certificateIssuer${newId}" name="certificateIssuer${newId}" placeholder="مثال: معهد الإدارة PMI">
            </div>

            <div class="form-group">
                <label for="certificateDate${newId}">تاريخ الإصدار | Issue Date</label>
                <input type="date" id="certificateDate${newId}" name="certificateDate${newId}">
            </div>
        </div>

    </div>
    `;
    
    container.insertAdjacentHTML('beforeend', certificateHTML);
    certificateCount = newId;
    
    // Show delete button for first certificate
    const firstDeleteBtn = document.querySelector('#certificates-section-container [data-certificate-id="0"] .btn-danger');
    if (firstDeleteBtn) firstDeleteBtn.style.display = 'inline-block';
    
    // Add event listeners to new inputs
    const newInputs = container.querySelectorAll(`input[id*="${newId}"]`);
    newInputs.forEach(input => {
        input.addEventListener('input', autoSaveForm);
        input.addEventListener('change', autoSaveForm);
    });
    
    autoSaveForm();
    showNotification('تمت إضافة شهادة جديدة', 'success');
}

// Remove certificate
function removeCertificate(id) {
    const element = document.querySelector(`#certificates-section-container [data-certificate-id="${id}"]`);
    if (element) {
        element.remove();
        autoSaveForm();
        showNotification('تم حذف الشهادة', 'success');
        
        // Hide delete button if only one certificate remains
        const remaining = document.querySelectorAll('#certificates-section-container .experience-item[data-certificate-id]');
        if (remaining.length <= 1) {
            const firstDeleteBtn = document.querySelector('#certificates-section-container [data-certificate-id="0"] .btn-danger');
            if (firstDeleteBtn) firstDeleteBtn.style.display = 'none';
        }
    }
}

// File selection handler
function addCertificateField() {
    const certificatesInput = document.getElementById('certificates');
    if (!certificatesInput) return;

    const certificatesGroup = certificatesInput.closest('.file-upload-group');
    if (!certificatesGroup) return;

    certificateFieldCount += 1;
    const newId = `certificates-extra-${certificateFieldCount}`;

    const wrapper = document.createElement('div');
    wrapper.className = 'file-input-wrapper extra-certificate-wrapper';
    wrapper.style.marginTop = '10px';

    wrapper.innerHTML = `
        <div style="display:flex; gap:8px; align-items:center;">
            <input type="file" id="${newId}" name="${newId}" accept="image/*" multiple onchange="fileSelected(this)" style="flex:1;">
            <span class="file-name" id="${newId}-name">لم يتم اختيار ملف</span>
        </div>
    `;

    const addRemoveButtonsRow = certificatesGroup.querySelector('div[style*="display:flex"][style*="align-items:center"]');
    if (addRemoveButtonsRow && addRemoveButtonsRow.parentElement === certificatesGroup) {
        certificatesGroup.insertBefore(wrapper, addRemoveButtonsRow);
    } else {
        certificatesGroup.appendChild(wrapper);
    }

    toggleRemoveLastCertificateButton();
    showNotification('تمت إضافة حقل مرفق خبرة جديد', 'success');
}

function removeLastCertificateField() {
    const fields = document.querySelectorAll('.extra-certificate-wrapper');
    if (!fields.length) {
        toggleRemoveLastCertificateButton();
        showNotification('لا يوجد حقول إضافية للحذف', 'warning');
        return;
    }

    fields[fields.length - 1].remove();
    toggleRemoveLastCertificateButton();
    showNotification('تم حذف آخر حقل مرفق', 'success');
}

function toggleRemoveLastCertificateButton() {
    const removeBtn = document.getElementById('remove-last-certificate-btn');
    if (!removeBtn) return;

    const hasExtraFields = document.querySelectorAll('.extra-certificate-wrapper').length > 0;
    removeBtn.style.display = hasExtraFields ? 'inline-flex' : 'none';
}

// Add new additional certificate (with file upload support)
function addAdditionalCertificate() {
    const container = document.getElementById('additional-certificates-container');
    if (!container) return;

    const newId = additionalCertificateCount + 1;

    const certificateHTML = `
    <div class="additional-certificate-item" data-certificate-id="${newId}" style="padding: 15px; background: white; border-radius: 6px; margin-bottom: 10px; border: 1px solid #e2e8f0;">
        <div class="certificate-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h5 style="margin: 0; color: #334155;">شهادة ${newId}</h5>
            <button type="button" class="btn btn-danger btn-sm" onclick="removeAdditionalCertificate(${newId})">حذف</button>
        </div>

        <div class="form-group">
            <label for="additionalCertificateName${newId}">اسم الشهادة | Certificate Name</label>
            <input type="text" id="additionalCertificateName${newId}" name="additionalCertificateName${newId}" placeholder="مثال: شهادة إدارة مشروعات PMP">
        </div>

        <div class="form-row">
            <div class="form-group">
                <label for="additionalCertificateIssuer${newId}">جهة الإصدار | Issuing Organization</label>
                <input type="text" id="additionalCertificateIssuer${newId}" name="additionalCertificateIssuer${newId}" placeholder="مثال: معهد الإدارة PMI">
            </div>

            <div class="form-group">
                <label for="additionalCertificateDate${newId}">تاريخ الإصدار | Issue Date</label>
                <input type="date" id="additionalCertificateDate${newId}" name="additionalCertificateDate${newId}">
            </div>
        </div>
    </div>
    `;

    container.insertAdjacentHTML('beforeend', certificateHTML);
    additionalCertificateCount = newId;

    // Show delete button for first certificate
    const firstDeleteBtn = document.querySelector('[data-certificate-id="0"] .btn-danger');
    if (firstDeleteBtn) firstDeleteBtn.style.display = 'inline-block';

    // Add event listeners to new inputs
    const newInputs = container.querySelectorAll(`input[id*="${newId}"]`);
    newInputs.forEach(input => {
        input.addEventListener('input', autoSaveForm);
        input.addEventListener('change', autoSaveForm);
    });

    autoSaveForm();
    showNotification('تمت إضافة شهادة جديدة', 'success');
}

// Remove additional certificate
function removeAdditionalCertificate(id) {
    const element = document.querySelector(`[data-certificate-id="${id}"]`);
    if (element) {
        element.remove();
        autoSaveForm();
        showNotification('تم حذف الشهادة', 'success');

        // Hide delete button if only one certificate remains
        const remaining = document.querySelectorAll('.additional-certificate-item');
        if (remaining.length <= 1) {
            const firstDeleteBtn = document.querySelector('[data-certificate-id="0"] .btn-danger');
            if (firstDeleteBtn) firstDeleteBtn.style.display = 'none';
        }
    }
}

function fileSelected(input) {
    const fileNameSpan = document.getElementById(input.id + '-name');
    if (!fileNameSpan) return;
    
    if (input.files.length > 0) {
        if (input.multiple) {
            fileNameSpan.textContent = `تم اختيار ${input.files.length} ملف | ${input.files.length} file(s) selected`;
        } else {
            const fileName = input.files[0].name;
            const fileSize = (input.files[0].size / 1024 / 1024).toFixed(2);
            fileNameSpan.textContent = `${fileName} (${fileSize} MB)`;
        }
        fileNameSpan.classList.add('uploaded');
        
        // Store file info in localStorage
        storeFileInfo(input);
    } else {
        fileNameSpan.textContent = 'لم يتم اختيار ملف | No file selected';
        fileNameSpan.classList.remove('uploaded');
    }
}

// Store file information
function storeFileInfo(input) {
    const filesData = JSON.parse(localStorage.getItem(FILES_STORAGE_KEY) || '{}');
    
    if (input.files.length > 0) {
        if (input.multiple) {
            filesData[input.id] = Array.from(input.files).map(f => ({
                name: f.name,
                size: f.size,
                type: f.type,
                lastModified: f.lastModified
            }));
        } else {
            const file = input.files[0];
            filesData[input.id] = {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified
            };
        }
    }
    
    localStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(filesData));
}

// Prepare for submission
function prepareForSubmission() {
    const form = document.getElementById('applicationForm');
    if (!form) return;

    // Validate form
    if (!form.checkValidity()) {
        form.reportValidity();
        showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    // Check declaration checkbox
    if (!document.getElementById('declaration')?.checked) {
        showNotification('يرجى الموافقة على الإقرار', 'error');
        return;
    }
    
    const summary = generateSubmissionSummary();
    showSubmissionOptions(summary);
}

// Submit application directly
function submitApplication() {
    const form = document.getElementById('applicationForm');
    if (!form) return;

    if (!form.checkValidity()) {
        form.reportValidity();
        showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    if (!document.getElementById('declaration')?.checked) {
        showNotification('يرجى الموافقة على الإقرار', 'error');
        return;
    }
    
    openEmailWithData();
}

// Generate submission summary
function generateSubmissionSummary() {
    const form = document.getElementById('applicationForm');
    if (!form) return '';

    const formData = new FormData(form);
    
    let summary = '================================\n';
    summary += 'نموذج طلب الالتحاق بوظيفة\n';
    summary += 'Job Application Form\n';
    summary += '================================\n\n';
    
    summary += 'الوظيفة المطلوبة | Required Position:\n';
    summary += `- ${formData.get('jobPosition')}\n\n`;
    
    summary += 'البيانات الشخصية | Personal Information:\n';
    summary += `- الاسم | Name: ${formData.get('fullName')}\n`;
    summary += `- تاريخ الميلاد | Date of Birth: ${formData.get('dateOfBirth')}\n`;
    summary += `- العنوان | Address: ${formData.get('address')}\n`;
    summary += `- الهاتف | Phone: ${formData.get('phone')}\n`;
    summary += `- البريد | Email: ${formData.get('email')}\n\n`;
    
    summary += 'المؤهل العلمي | Education:\n';
    summary += `- المؤهل | Qualification: ${formData.get('qualification')}\n`;
    summary += `- الجامعة | University: ${formData.get('university')}\n`;
    summary += `- سنة التخرج | Graduation Year: ${formData.get('graduationYear')}\n\n`;
    
    return summary;
}

// Show submission options
function showSubmissionOptions(summary) {
    const options = `
    <div style="padding: 20px; background: white; border-radius: 8px; max-width: 600px;">
        <h3>خيارات الإرسال | Submission Options</h3>
        <p>يمكنك:</p>
        <ul>
            <li>تحميل ملخص الطلب | Download Summary</li>
            <li>فتح البريد الإلكتروني مع نسخ البيانات | Open Email with Data</li>
        </ul>
        <div style="display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
            <button class="btn btn-primary" onclick="downloadSummary()">تحميل | Download</button>
            <button class="btn btn-warning" onclick="downloadPDFNow()">تنزيل PDF</button>
            <button class="btn btn-success" onclick="openEmailWithData()">إرسال البريد | Send Email</button>
            <button class="btn btn-secondary" onclick="this.parentElement.parentElement.remove()">إغلاق | Close</button>
        </div>
    </div>
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9998;
    `;
    modal.innerHTML = options;
    modal.onclick = function(e) {
        if (e.target === modal) modal.remove();
    };
    
    document.body.appendChild(modal);
}

// Download submission summary
function downloadSummary() {
    const summary = generateSubmissionSummary();
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(summary));
    element.setAttribute('download', `job-application-${new Date().getTime()}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    showNotification('تم تحميل ملخص الطلب', 'success');
    document.querySelector('div[style*="position: fixed"]')?.remove();
}

async function generateArabicImagePdfFromForm() {
    const form = document.getElementById('applicationForm');
    if (!form) throw new Error('النموذج غير موجود');

    const target = document.querySelector('.form-section');
    if (!target) throw new Error('منطقة النموذج غير متاحة');

    const formData = new FormData(form);

    const canvas = await html2canvas(target, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.scrollWidth
    });

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 8;
    const usableWidth = pageWidth - (margin * 2);
    const usableHeight = pageHeight - (margin * 2);

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let renderedHeight = 0;
    let pageIndex = 0;

    while (renderedHeight < imgHeight) {
        if (pageIndex > 0) {
            pdf.addPage();
        }

        const y = margin - renderedHeight;
        pdf.addImage(imgData, 'JPEG', margin, y, imgWidth, imgHeight);
        renderedHeight += usableHeight;
        pageIndex += 1;
    }

    const safeName = sanitizeFileName(formData.get('fullName') || 'application');
    const fileName = `job-application-image-${safeName}-${Date.now()}.pdf`;
    pdf.save(fileName);
}

// Download comprehensive PDF مباشرة من زر واضح
async function downloadPDFNow() {
    const form = document.getElementById('applicationForm');
    if (!form) return;

    if (!form.checkValidity()) {
        form.reportValidity();
        showNotification('يرجى ملء جميع الحقول الإلزامية أولاً', 'error');
        return;
    }

    if (!document.getElementById('declaration')?.checked) {
        showNotification('يرجى الموافقة على الإقرار قبل إنشاء PDF', 'error');
        return;
    }

    try {
        showNotification('جاري إنشاء PDF بطريقة صورة للحفاظ على العربية...', 'info');
        await generateArabicImagePdfFromForm();
        showNotification('تم تنزيل ملف PDF بنجاح', 'success');
        document.querySelector('div[style*="position: fixed"]')?.remove();
    } catch (error) {
        console.error('PDF generation error:', error);
        showNotification('تعذر إنشاء PDF: ' + error.message, 'error');
    }
}

// Open email with data
function openEmailWithData() {
    const form = document.getElementById('applicationForm');
    if (!form) return;

    const email = 'Tameer_facility@mhud.gov.eg';
    const jobPosition = getSelectedJobLabel() || 'وظيفة';
    const subject = `طلب التحاق بوظيفة: ${jobPosition}`;

    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;

    const box = document.createElement('div');
    box.style.cssText = `
        background: #fff;
        color: #222;
        padding: 20px;
        border-radius: 10px;
        max-width: 520px;
        width: 100%;
        text-align: center;
    `;

    box.innerHTML = `
        <h3 style="margin-top:0; margin-bottom:8px">تحضير الإرسال</h3>
        <p style="margin:0 0 14px; color:#555">سيتم إنشاء ملف PDF شامل بتصميم احترافي ودمج ملفات الـ CV والصور المرفقة ثم فتح البريد الإلكتروني.</p>
        <button id="__open_email_button" class="btn btn-success" style="min-width:200px;">إنشاء وفتح البريد الإلكتروني</button>
        <button id="__close_email_modal" class="btn btn-secondary" style="margin-left:10px;">إلغاء</button>
    `;

    modal.appendChild(box);
    document.body.appendChild(modal);

    if (!form.checkValidity()) {
        form.reportValidity();
        modal.remove();
        showNotification('يرجى ملء جميع الحقول الإلزامية أولاً', 'error');
        return;
    }

    if (!document.getElementById('declaration')?.checked) {
        modal.remove();
        showNotification('يرجى الموافقة على الإقرار قبل الإرسال', 'error');
        return;
    }

    document.getElementById('__open_email_button').addEventListener('click', async function() {
        try {
            showNotification('يتم إنشاء ملف PDF الشامل...', 'info');
            await generateComprehensivePDF();
            showNotification('تم إنشاء ملف PDF بنجاح، الآن سيتم فتح البريد...', 'success');
            const body = generateEmailBody();
            openGmailCompose(email, subject, body);
            modal.remove();
        } catch (e) {
            console.error('Error:', e);
            showNotification('حدث خطأ في إنشاء الملف: ' + e.message, 'error');
        }
    });

    document.getElementById('__close_email_modal').addEventListener('click', function() {
        modal.remove();
    });
}

// Open Gmail compose in a new tab with prefilled fields
function openGmailCompose(email, subject, body) {
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}&tf=1`;
    window.open(url, '_blank');
    showNotification('تم فتح Gmail', 'success');
}

function ensureLibrary(url, globalName) {
    return new Promise((resolve, reject) => {
        if (window[globalName]) {
            resolve(window[globalName]);
            return;
        }

        const existing = document.querySelector(`script[data-lib="${globalName}"]`);
        if (existing) {
            existing.addEventListener('load', () => resolve(window[globalName]));
            existing.addEventListener('error', () => reject(new Error(`تعذر تحميل المكتبة: ${globalName}`)));
            return;
        }

        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.dataset.lib = globalName;
        script.onload = () => {
            if (window[globalName]) resolve(window[globalName]);
            else reject(new Error(`تم تحميل الملف لكن ${globalName} غير متاح`));
        };
        script.onerror = () => reject(new Error(`تعذر تحميل المكتبة: ${globalName}`));
        document.head.appendChild(script);
    });
}

async function ensurePDFDependencies() {
    await ensureLibrary('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js', 'PDFLib');
    if (!window.jspdf || !window.jspdf.jsPDF) {
        throw new Error('مكتبة إنشاء PDF غير متاحة حالياً');
    }
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sanitizeFileName(value) {
    return String(value || 'application')
        .replace(/[\/:*?"<>|]+/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
}

function formatDateForDisplay(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('ar-EG');
}

function formatFileSize(size) {
    if (!size && size !== 0) return '';
    const mb = size / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(size / 1024).toFixed(0)} KB`;
}

function getSelectedJobLabel() {
    const select = document.getElementById('jobPosition');
    if (!select) return '';
    const selectedOption = select.options[select.selectedIndex];
    if (!selectedOption) return '';
    // Get the text content and extract Arabic name (before the |)
    const text = selectedOption.textContent || '';
    const arabicName = text.split('|')[0]?.trim();
    return arabicName || selectedOption.value || '';
}

// Helper function to get job label by value
function getJobLabelByValue(jobValue) {
    const select = document.getElementById('jobPosition');
    if (!select || !jobValue) return jobValue || '';
    for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === jobValue) {
            const text = select.options[i].textContent || '';
            return text.split('|')[0]?.trim() || jobValue;
        }
    }
    return jobValue;
}

function collectExperienceEntries(formData) {
    const entries = [];
    for (let i = 0; i <= 100; i++) {
        const company = (formData.get(`company${i}`) || '').trim();
        const jobTitle = (formData.get(`jobTitle${i}`) || '').trim();
        const duration = (formData.get(`workDuration${i}`) || '').trim();
        const description = (formData.get(`experienceDescription${i}`) || '').trim();
        if (company || jobTitle || duration || description) {
            entries.push({ company, jobTitle, duration, description });
        }
    }
    return entries;
}

// Collect additional certificate entries (from both old and new sections)
function collectAdditionalCertificateEntries(formData) {
    const entries = [];
    
    // First collect the non-indexed first certificate (additionalCertificateName without number)
    const firstCertName = (formData.get('additionalCertificateName') || '').trim();
    const firstCertIssuer = (formData.get('additionalCertificateIssuer') || '').trim();
    const firstCertDate = (formData.get('additionalCertificateDate') || '').trim();
    if (firstCertName || firstCertIssuer || firstCertDate) {
        entries.push({ name: firstCertName, issuer: firstCertIssuer, date: firstCertDate });
    }
    
    // Then collect from indexed additional certificates (additionalCertificateName0, additionalCertificateName2, additionalCertificateName3, etc.)
    for (let i = 0; i <= 100; i++) {
        // Skip index 1 since addAdditionalCertificate creates from 2 onwards
        if (i === 1) continue;
        
        // Collect from old additional certificates section (in attachments)
        const name = (formData.get(`additionalCertificateName${i}`) || '').trim();
        const issuer = (formData.get(`additionalCertificateIssuer${i}`) || '').trim();
        const date = (formData.get(`additionalCertificateDate${i}`) || '').trim();
        if (name || issuer || date) {
            entries.push({ name, issuer, date });
        }
        
        // Collect from new certificates section (Section 5 - certificateName0, certificateIssuer0, certificateDate0)
        const certName = (formData.get(`certificateName${i}`) || '').trim();
        const certIssuer = (formData.get(`certificateIssuer${i}`) || '').trim();
        const certDate = (formData.get(`certificateDate${i}`) || '').trim();
        if (certName || certIssuer || certDate) {
            // Only add if not already added from additionalCertificate fields
            if (!entries.find(e => e.name === certName)) {
                entries.push({ name: certName, issuer: certIssuer, date: certDate });
            }
        }
    }
    return entries;
}

function getAttachmentSources() {
    const sources = [
        { id: 'cv', label: 'السيرة الذاتية (CV)', required: true },
        { id: 'qualification-doc', label: 'صورة المؤهل', required: true },
        { id: 'id-card', label: 'صورة بطاقة الرقم القومي', required: true },
        { id: 'certificates', label: 'شهادات الخبرة', multiple: true }
    ];

    document.querySelectorAll('.extra-certificate-wrapper input[type="file"]').forEach((input, index) => {
        sources.push({ id: input.id, label: `مرفق خبرة إضافي ${index + 1}`, multiple: true });
    });

    // Collect from Section 5 certificates (with file upload)
    for (let i = 0; i <= 100; i++) {
        const certInput = document.getElementById(`certificateDoc${i}`);
        if (certInput && certInput.files && certInput.files.length > 0) {
            sources.push({ id: `certificateDoc${i}`, label: `شهادة ${i} - صورة`, multiple: false });
        }
    }

    // Collect from Additional Certificates in Attachments section (with file upload)
    for (let i = 0; i <= 100; i++) {
        const additionalCertInput = document.getElementById(`additionalCertificateDoc${i}`);
        if (additionalCertInput && additionalCertInput.files && additionalCertInput.files.length > 0) {
            sources.push({ id: `additionalCertificateDoc${i}`, label: `شهادة إضافية ${i} - صورة`, multiple: false });
        }
    }

    return sources;
}

function collectAttachments() {
    const attachments = [];

    getAttachmentSources().forEach(source => {
        const input = document.getElementById(source.id);
        if (!input || !input.files || !input.files.length) return;

        Array.from(input.files).forEach((file, fileIndex) => {
            const type = detectAttachmentType(file);
            attachments.push({
                inputId: source.id,
                label: source.multiple ? `${source.label} ${fileIndex + 1}` : source.label,
                file,
                type,
                required: !!source.required
            });
        });
    });

    return attachments;
}

function detectAttachmentType(file) {
    const name = (file?.name || '').toLowerCase();
    const mime = (file?.type || '').toLowerCase();

    if (mime.startsWith('image/')) return 'image';
    if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
    if (name.endsWith('.doc') || name.endsWith('.docx')) return 'document';
    return 'other';
}

function buildApplicantPayload(formData) {
    const jobValue = formData.get('jobPosition') || '';
    return {
        requestRefNumber: `APP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        issueDate: new Date().toLocaleDateString('ar-EG'),
        jobPosition: getJobLabelByValue(jobValue) || 'غير محدد',
        jobRefNumber: formData.get('jobRefNumber') || '',
        fullName: formData.get('fullName') || '—',
        dateOfBirth: formatDateForDisplay(formData.get('dateOfBirth')),
        address: formData.get('address') || '—',
        phone: formData.get('phone') || '—',
        email: formData.get('email') || '—',
        maritalStatus: formData.get('maritalStatus') || '—',
        gender: formData.get('gender') || '—',
        nationality: formData.get('nationality') || '—',
        militaryStatus: formData.get('militaryStatus') || '—',
        qualification: formData.get('qualification') || '—',
        specialization: formData.get('specialization') || '—',
        university: formData.get('university') || '—',
        graduationYear: formData.get('graduationYear') || '—',
        languages: formData.get('languages') || '—',
        computerSkills: formData.get('computerSkills') || '—',
        trainingCourses: formData.get('trainingCourses') || '—',
        technicalSkills: formData.get('technicalSkills') || '—',
        availableFrom: formData.get('availableFrom') || '—',
        drivingLicense: formData.get('drivingLicense') || '—',
        relocate: formData.get('relocate') || '—',
        signatureName: formData.get('signatureName') || '—',
        signatureDate: formatDateForDisplay(formData.get('date')),
        notes: formData.get('notes') || 'لا توجد ملاحظات إضافية',
        experiences: collectExperienceEntries(formData),
        additionalCertificates: collectAdditionalCertificateEntries(formData)
    };
}

const sectionColors = {
    personal: [15, 52, 96],        // Navy Blue
    education: [0, 82, 73],        // Teal
    experience: [124, 45, 18],   // Brown
    notes: [75, 85, 99],          // Gray
    attachments: [34, 197, 94],   // Green
    declaration: [233, 69, 96]    // Pink
};

function normalizeArabicForCanvas(text) {
    return String(text || '')
        .replace(/ﻻ/g, 'لا')
        .replace(/أ/g, 'أ')
        .replace(/إ/g, 'إ')
        .replace(/آ/g, 'آ');
}

function renderArabicTitleAsImage(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 220;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const title = normalizeArabicForCanvas(text);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    ctx.font = '900 116px "Tahoma","Arial","Segoe UI",sans-serif';
    ctx.fillText(title, canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL('image/png');
}

function addSectionTitle(pdf, text, y, sectionType = '') {
    pdf.setFillColor(59, 130, 246);
    pdf.roundedRect(15, y, 180, 10, 3, 3, 'F');

    const titleImg = renderArabicTitleAsImage(text);
    if (titleImg) {
        // Bigger rendered image improves Arabic glyph readability in jsPDF output
        pdf.addImage(titleImg, 'PNG', 42, y + 1.1, 126, 7.6, undefined, 'FAST');
    } else {
        // Fallback in case canvas context fails
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text(String(text || ''), 105, y + 6.6, { align: 'center' });
    }

    pdf.setTextColor(34, 34, 34);
    pdf.setFont('helvetica', 'normal');
    return y + 14;
}
function addKeyValueRows(pdf, rows, startY) {
    let y = startY;
    rows.forEach((row, index) => {
        if (y > 268) {
            pdf.addPage();
            y = 20;
        }

        // Alternate row colors for better readability
        if (index % 2 === 0) {
            pdf.setFillColor(255, 255, 255);
            pdf.roundedRect(15, y, 180, 12, 2, 2, 'F');
        } else {
            pdf.setFillColor(248, 250, 252);
            pdf.roundedRect(15, y, 180, 12, 2, 2, 'F');
        }

        pdf.setDrawColor(226, 232, 240);
        pdf.roundedRect(15, y, 180, 12, 2, 2, 'S');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9.5);
        pdf.setTextColor(100, 116, 139);
        pdf.text(row.label, 188, y + 5, { align: 'right' });

        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(30, 41, 59);
        pdf.setFontSize(10.5);
        const valueLines = pdf.splitTextToSize(String(row.value || '—'), 110);
        pdf.text(valueLines, 188, y + 10, { align: 'right' });

        if (valueLines.length > 1) {
            const extraHeight = (valueLines.length - 1) * 4.5;
            pdf.roundedRect(15, y, 180, 12 + extraHeight, 2, 2, 'S');
            y += extraHeight;
        }

        y += 16;
    });
    return y;
}

function addParagraphBlock(pdf, title, body, y, sectionType = '') {
    if (y > 250) {
        pdf.addPage();
        y = 20;
    }

    y = addSectionTitle(pdf, title, y, sectionType || 'notes');
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(String(body || '—'), 170);
    pdf.text(lines, 188, y, { align: 'right' });
    return y + lines.length * 5 + 6;
}

function getAttachmentTypeLabel(type) {
    if (type === 'pdf') return 'PDF';
    if (type === 'image') return 'صورة';
    if (type === 'document') return 'DOC / DOCX';
    return 'ملف آخر';
}

function appendAttachmentsOverviewPage(pdf, attachments) {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.addPage();
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Modern header for attachments page
    pdf.setFillColor(34, 197, 94);  // Green
    pdf.roundedRect(0, 0, pageWidth, 28, 0, 0, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text('📎ملف المرفقات', pageWidth - 15, 17, { align: 'right' });

    pdf.setTextColor(100, 116, 139);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10.5);
    pdf.text('Attachments Overview', pageWidth - 15, 36, { align: 'right' });

    if (!attachments.length) {
        pdf.setFontSize(12);
        pdf.text('لا توجد مرفقات مضافة داخل هذا الطلب.', pageWidth - 15, 52, { align: 'right' });
        return;
    }

    let y = 48;
    const rowHeight = 16;

    // Table header with colored background
    pdf.setFillColor(15, 52, 96);  // Navy
    pdf.roundedRect(15, y, 180, 12, 2, 2, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('#', 185, y + 8, { align: 'right' });
    pdf.text('النوع', 150, y + 8, { align: 'right' });
    pdf.text('الوصف', 105, y + 8, { align: 'right' });
    pdf.text('اسم الملف', 65, y + 8, { align: 'right' });
    y += 16;

    attachments.forEach((attachment, index) => {
        if (y > 272) {
            pdf.addPage();
            pdf.setFillColor(248, 250, 252);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
            y = 20;
        }

        // Modern row styling
        if (index % 2 === 0) {
            pdf.setFillColor(255, 255, 255);
        } else {
            pdf.setFillColor(240, 245, 250);
        }
        pdf.roundedRect(15, y, 180, rowHeight, 2, 2, 'F');
        pdf.setDrawColor(226, 232, 240);
        pdf.roundedRect(15, y, 180, rowHeight, 2, 2, 'S');

        pdf.setTextColor(30, 41, 59);
        pdf.setFont('helvetica', 'bold');
        pdf.text(String(index + 1), 185, y + 9.5, { align: 'right' });

        // Type badge
        const typeColor = attachment.type === 'image' ? [59, 130, 246] : attachment.type === 'pdf' ? [239, 68, 68] : [100, 116, 139];
        pdf.setFillColor(...typeColor);
        pdf.roundedRect(142, y + 4, 20, 8, 1, 1, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(7);
        pdf.text(getAttachmentTypeLabel(attachment.type).substring(0, 3), 152, y + 9.5, { align: 'center' });

        pdf.setFontSize(10);
        pdf.setTextColor(30, 41, 59);
        pdf.setFont('helvetica', 'normal');
        const labelLines = pdf.splitTextToSize(attachment.label || '—', 35);
        const nameLines = pdf.splitTextToSize(attachment.file?.name || '—', 55);
        pdf.text(labelLines, 115, y + 6.5, { align: 'right' });
        pdf.text(nameLines, 68, y + 6.5, { align: 'right' });

        y += Math.max(rowHeight, Math.max(labelLines.length, nameLines.length) * 4.8 + 5);
    });
}

async function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error(`تعذر قراءة الملف: ${file.name}`));
        reader.readAsDataURL(file);
    });
}

async function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error(`تعذر قراءة الملف: ${file.name}`));
        reader.readAsArrayBuffer(file);
    });
}

function getImageFormatFromDataUrl(dataUrl) {
    if (dataUrl.startsWith('data:image/png')) return 'PNG';
    if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
    return 'JPEG';
}

async function appendImageAttachmentPage(pdf, attachment) {
    const dataUrl = await readFileAsDataURL(attachment.file);
    const format = getImageFormatFromDataUrl(dataUrl);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.addPage();
    pdf.setFillColor(245, 248, 251);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    pdf.setFillColor(10, 61, 98);
    pdf.rect(0, 0, pageWidth, 24, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.text(`مرفق مصور: ${attachment.label}`, pageWidth - 15, 15, { align: 'right' });

    pdf.setTextColor(70, 70, 70);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`${attachment.file.name} • ${formatFileSize(attachment.file.size)}`, pageWidth - 15, 31, { align: 'right' });

    const props = pdf.getImageProperties(dataUrl);
    const maxWidth = pageWidth - 30;
    const maxHeight = pageHeight - 55;
    const ratio = Math.min(maxWidth / props.width, maxHeight / props.height);
    const renderWidth = props.width * ratio;
    const renderHeight = props.height * ratio;
    const x = (pageWidth - renderWidth) / 2;
    const y = 40 + ((maxHeight - renderHeight) / 2);

    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x - 3, y - 3, renderWidth + 6, renderHeight + 6, 3, 3, 'F');
    pdf.setDrawColor(220, 228, 236);
    pdf.roundedRect(x - 3, y - 3, renderWidth + 6, renderHeight + 6, 3, 3, 'S');
    pdf.addImage(dataUrl, format, x, y, renderWidth, renderHeight);
}

async function buildBaseApplicationPdfArrayBuffer() {
    await ensurePDFDependencies();
    const form = document.getElementById('applicationForm');
    if (!form) throw new Error('النموذج غير موجود');

    const formData = new FormData(form);
    const applicant = buildApplicantPayload(formData);
    const attachments = collectAttachments();
    const imageAttachments = attachments.filter(item => item.type === 'image');
    const pdfAttachments = attachments.filter(item => item.type === 'pdf');
    const unsupportedAttachments = attachments.filter(item => !['image', 'pdf'].includes(item.type));

    // PDF Color Palette - Professional Design
    const colors = {
        primary: [15, 52, 96],        // Deep Navy Blue
        secondary: [0, 82, 73],      // Teal Green
        accent: [233, 69, 96],       // Modern Pink/Red
        lightBg: [248, 250, 252],      // Very Light Blue-Gray
        white: [255, 255, 255],
        darkText: [30, 41, 59],
        lightText: [100, 116, 139],
        border: [226, 232, 240],
        cardBg: [255, 255, 255],
        success: [34, 197, 94],
        warning: [234, 179, 8],
        info: [59, 130, 246]
    };

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Main background (official light)
    pdf.setFillColor(248, 251, 255);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Official blue header (close to reference style)
    pdf.setFillColor(59, 130, 246);
    pdf.roundedRect(0, 0, pageWidth, 50, 0, 0, 'F');
    pdf.setFillColor(41, 112, 224);
    pdf.rect(0, 50, pageWidth, 8, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text('نموذج رسمي من القطاع الفني لمكتب رئيس مجلس الإدارة', 105, 20, { align: 'center' });
    pdf.setFontSize(12);
    pdf.text('قطاع تكنولوجيا النظم والمعلومات بشركة التعمير لإدارة المرافق', 105, 30, { align: 'center' });
    pdf.setFontSize(14);
    pdf.text('ملف بيانات المتقدم', 105, 38, { align: 'center' });

    // Reference number and date block
    pdf.setFillColor(239, 246, 255);
    pdf.setDrawColor(191, 219, 254);
    pdf.roundedRect(15, 50, 180, 24, 3, 3, 'FD');

    pdf.setTextColor(37, 99, 235);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('الرقم المرجعي', 188, 58, { align: 'right' });
    pdf.setFontSize(16);
    pdf.text(applicant.requestRefNumber, 188, 67, { align: 'right' });

    pdf.setFontSize(10);
    pdf.setTextColor(71, 85, 105);
    pdf.text(`تاريخ الإنشاء: ${applicant.issueDate}`, 25, 67, { align: 'left' });

    // Applicant name card
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(191, 219, 254);
    pdf.roundedRect(15, 78, 180, 12, 3, 3, 'FD');
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(`اسم المتقدم: ${applicant.fullName}`, 188, 86, { align: 'right' });

    // Job details block
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(191, 219, 254);
    pdf.roundedRect(15, 93, 180, 20, 3, 3, 'FD');
    pdf.setTextColor(30, 58, 138);
    pdf.setFontSize(10.5);
    pdf.text(`الوظيفة المتقدم إليها: ${applicant.jobPosition}`, 188, 101, { align: 'right' });
    if (applicant.jobRefNumber) {
        pdf.text(`الرقم المرجعي للوظيفة: ${applicant.jobRefNumber}`, 188, 109, { align: 'right' });
    } else {
        pdf.text(`الرقم المرجعي للوظيفة: —`, 188, 109, { align: 'right' });
    }

let y = 120;
    y = addSectionTitle(pdf, 'البيانات الشخصية', y, 'personal');
    y = addKeyValueRows(pdf, [
        { label: 'الاسم رباعي', value: applicant.fullName },
        { label: 'تاريخ الميلاد', value: applicant.dateOfBirth },
        { label: 'العنوان', value: applicant.address },
        { label: 'الهاتف', value: applicant.phone },
        { label: 'البريد الإلكتروني', value: applicant.email },
        { label: 'الحالة الاجتماعية', value: applicant.maritalStatus },
        { label: 'النوع', value: applicant.gender }
    ], y);

pdf.addPage();
    pdf.setFillColor(250, 252, 255);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    y = 20;
y = addSectionTitle(pdf, 'المؤهل العلمي', y, 'education');
    y = addKeyValueRows(pdf, [
        { label: 'المؤهل', value: applicant.qualification },
        { label: 'التخصص', value: applicant.specialization },
        { label: 'جهة التخرج', value: applicant.university },
        { label: 'سنة التخرج', value: applicant.graduationYear },
        { label: 'التوقيع', value: applicant.signatureName },
        { label: 'تاريخ الإقرار', value: applicant.signatureDate }
    ], y);

y = addSectionTitle(pdf, 'الخبرات السابقة', y + 2, 'experience');
    if (applicant.experiences.length) {
        applicant.experiences.forEach((exp, index) => {
            if (y > 255) {
                pdf.addPage();
                y = 20;
            }
            pdf.setFillColor(255, 255, 255);
            pdf.roundedRect(15, y, 180, 24, 3, 3, 'F');
            pdf.setDrawColor(220, 228, 236);
            pdf.roundedRect(15, y, 180, 24, 3, 3, 'S');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(11);
            pdf.text(`خبرة رقم ${index + 1}`, 190, y + 7, { align: 'right' });
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10.5);
            pdf.text(`جهة العمل: ${exp.company || '—'}`, 188, y + 13, { align: 'right' });
            pdf.text(`المسمى الوظيفي: ${exp.jobTitle || '—'}`, 188, y + 18, { align: 'right' });
            pdf.text(`مدة العمل: ${exp.duration || '—'}`, 188, y + 23, { align: 'right' });
            y += 30;
        });
    } else {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        pdf.text('لا توجد خبرات سابقة مضافة.', 190, y + 4, { align: 'right' });
        y += 12;
    }

// Additional certificates in PDF
    if (applicant.additionalCertificates && applicant.additionalCertificates.length) {
        y = addSectionTitle(pdf, 'الشهادات الإضافية', y + 3, 'experience');
        applicant.additionalCertificates.forEach((cert, index) => {
            if (y > 240) {
                pdf.addPage();
                y = 20;
            }
            pdf.setFillColor(255, 255, 255);
            pdf.roundedRect(15, y, 180, 20, 3, 3, 'F');
            pdf.setDrawColor(220, 228, 236);
            pdf.roundedRect(15, y, 180, 20, 3, 3, 'S');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10.5);
            pdf.text(`شهادة رقم ${index + 1}`, 190, y + 6, { align: 'right' });
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            pdf.text(`اسم الشهادة: ${cert.name || '—'}`, 188, y + 11, { align: 'right' });
            pdf.text(`جهة الإصدار: ${cert.issuer || '—'}`, 188, y + 16, { align: 'right' });
            y += 26;
        });
    }

y = addParagraphBlock(pdf, 'ملاحظات إضافية', applicant.notes, y + 3, 'notes');

    y = addSectionTitle(pdf, 'ملخص المرفقات', Math.min(y + 2, 255), 'attachments');
    const attachmentLines = attachments.length
        ? attachments.map((item, index) => `${index + 1}. ${item.label} — ${item.file.name}`)
        : ['لا توجد مرفقات'];
    pdf.setFontSize(10.5);
    pdf.setFont('helvetica', 'normal');
    pdf.text(pdf.splitTextToSize(attachmentLines.join('   |   '), 170), 188, y, { align: 'right' });

    appendAttachmentsOverviewPage(pdf, attachments);

    if (unsupportedAttachments.length) {
        pdf.addPage();
        pdf.setFillColor(252, 248, 239);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
let warningY = addSectionTitle(pdf, 'مرفقات غير قابلة للدمج المباشر', 20, 'notes');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        const warningText = [
            'هذه الملفات تم تضمين أسمائها داخل الطلب، لكنها ليست PDF أو صوراً قابلة للدمج المباشر داخل المتصفح.',
            'إذا رغبت لاحقاً يمكن دعم تحويل DOC/DOCX عبر خدمة خادمية أو معالجة مكتبية منفصلة.'
        ];
        pdf.text(warningText, 188, warningY, { align: 'right' });
        warningY += 18;
        unsupportedAttachments.forEach((item, index) => {
            pdf.text(`${index + 1}. ${item.label}: ${item.file.name}`, 188, warningY, { align: 'right' });
            warningY += 8;
        });
    }

    for (const attachment of imageAttachments) {
        await appendImageAttachmentPage(pdf, attachment);
    }

    return {
        arrayBuffer: pdf.output('arraybuffer'),
        attachments,
        pdfAttachments,
        fileName: `job-application-${sanitizeFileName(applicant.fullName)}-${applicant.requestRefNumber}.pdf`
    };
}

async function mergePdfBuffers(baseArrayBuffer, pdfAttachments) {
    await ensurePDFDependencies();
    const mergedPdf = await window.PDFLib.PDFDocument.create();

    const basePdf = await window.PDFLib.PDFDocument.load(baseArrayBuffer);
    const basePages = await mergedPdf.copyPages(basePdf, basePdf.getPageIndices());
    basePages.forEach(page => mergedPdf.addPage(page));

    for (const attachment of pdfAttachments) {
        const buffer = await readFileAsArrayBuffer(attachment.file);
        const attachmentPdf = await window.PDFLib.PDFDocument.load(buffer, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(attachmentPdf, attachmentPdf.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
    }

    return await mergedPdf.save();
}

// Generate PDF + upload to Firebase and return a download URL (best-effort)
async function uploadPDFFromFormAndGetLink() {
    if (!firebaseInitialized || typeof firebase === 'undefined') {
        throw new Error('Firebase not initialized');
    }

    const form = document.getElementById('applicationForm');
    if (!form) throw new Error('Form not found');
    // Storage upload removed — not used
    return '';
}

// Generate PDF as Blob with merged PDF attachments and image pages
async function generatePDFFromFormBlob() {
    const { arrayBuffer, pdfAttachments, fileName } = await buildBaseApplicationPdfArrayBuffer();
    const mergedBytes = await mergePdfBuffers(arrayBuffer, pdfAttachments);
    return {
        blob: new Blob([mergedBytes], { type: 'application/pdf' }),
        fileName
    };
}

// Generate Comprehensive PDF with all data, merged PDFs, and image pages
async function generateComprehensivePDF() {
    const { blob, fileName } = await generatePDFFromFormBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showNotification(`تم إنشاء ملف PDF: ${fileName}`, 'success');
}

// Generate email body (مختصر + رقم مرجعي + روابط PDF)
function generateEmailBody() {
    const form = document.getElementById('applicationForm');
    if (!form) {
        return generateDefaultEmailBody();
    }

    const formData = new FormData(form);
    const jobValue = formData.get('jobPosition') || '';
    const jobPosition = getJobLabelByValue(jobValue) || 'وظيفة';
    const jobRefNumber = formData.get('jobRefNumber') || '';
    const fullName = formData.get('fullName') || '[الاسم]';
    const qualification = formData.get('qualification') || '[المؤهل]';
    const company = formData.get('company1') || '[الخبرات السابقة]';
    
    // Generate application request number (format: 202-6-XXX based on timestamp)
    const appNumber = `202-6-${String(new Date().getMilliseconds()).padStart(3, '0')}`;
    
    // Include job reference number in email if available
    const jobRefText = jobRefNumber ? `\nرقم المرجعي للوظيفة: ${jobRefNumber}` : '';
    
    // Get uploaded file names for attachments list
    const attachmentsList = [];
    
    // CV File
    const cvFile = document.getElementById('cv');
    if (cvFile && cvFile.files.length > 0) {
        attachmentsList.push(`- السيرة الذاتية (CV): ${cvFile.files[0].name}`);
    }
    
    // Qualification Document
    const qualDoc = document.getElementById('qualification-doc');
    if (qualDoc && qualDoc.files.length > 0) {
        attachmentsList.push(`- صورة المؤهل العلمي: ${qualDoc.files[0].name}`);
    }
    
    // ID Card
    const idCard = document.getElementById('id-card');
    if (idCard && idCard.files.length > 0) {
        attachmentsList.push(`- صورة بطاقة الرقم القومي: ${idCard.files[0].name}`);
    }
    
    // Certificates (multiple possible)
    const certFiles = document.getElementById('certificates');
    if (certFiles && certFiles.files.length > 0) {
        for (let i = 0; i < certFiles.files.length; i++) {
            attachmentsList.push(`- شهادة/خبرة ${i + 1}: ${certFiles.files[i].name}`);
        }
    }
    
    // Extra certificate fields
    const extraCerts = document.querySelectorAll('.extra-certificate-wrapper input[type="file"]');
    extraCerts.forEach((input) => {
        if (input.files.length > 0) {
            attachmentsList.push(`- شهادة إضافية: ${input.files[0].name}`);
        }
    });
    
    const attachmentsText = attachmentsList.length > 0 
        ? attachmentsList.join('\n') 
        : '- لا توجد مرفقات';
    
const body = `الموضوع: طلب التحاق بوظيفة ${jobPosition} – رقم الطلب ${appNumber}

السلام عليكم ورحمة الله وبركاته،

أرفق لسيادتكم طلب الالتحاق بوظيفة: ${jobPosition}${jobRefText}

رقم الطلب: ${appNumber}

البيانات الأساسية من النموذج (بالمختصر):

البيانات الشخصية | Personal Information
الاسم | Name: ${fullName}
البريد الإلكتروني | Email: ${formData.get('email') || '[البريد الإلكتروني]'}
رقم الهاتف | Phone: ${formData.get('phone') || '[رقم الهاتف]'}

الوظيفة المطلوبة | Required Position
${jobPosition}

المؤهل العلمي | Education
${qualification}

الخبرات السابقة (إن وجدت) | Previous Experience (if any)
${company || '[لم يتم تحديد خبرات سابقة]'}

مرفقات الطلب التي تم إرفاقها | Attached Documents
${attachmentsText}

وتفضلوا بقبول فائق الاحترام والتقدير.

قطاع تكنولوجيا النظم والمعلومات بشركة التعمير لإدارة المرافق
Technology and Information Systems Sector - Tameer Facility Management Company`;

    return body;
}

function generateDefaultEmailBody() {
    const appNumber = `202-6-${String(new Date().getMilliseconds()).padStart(3, '0')}`;
    
    return `الموضوع: طلب التحاق بوظيفة – رقم الطلب ${appNumber}

السلام عليكم ورحمة الله وبركاته،

أرفق لسيادتكم طلب الالتحاق بالوظيفة

رقم الطلب: ${appNumber}

يرجى العثور على النموذج الكامل مفصلاً بالملف المرفق PDF والذي يتضمن جميع البيانات والمستندات المطلوبة.

وتفضلوا بقبول فائق الاحترام والتقدير.

قطاع تكنولوجيا النظم والمعلومات بشركة التعمير لإدارة المرافق
Technology and Information Systems Sector - Tameer Facility Management Company`;
}

// Copy form link
function copyFormLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        showNotification('تم نسخ الرابط', 'success');
    }).catch(() => {
        showNotification('فشل نسخ الرابط', 'error');
    });
}

// Copy email
function copyEmail() {
    const email = 'Tameer_facility@mhud.gov.eg';
    navigator.clipboard.writeText(email).then(() => {
        showNotification('تم نسخ البريد', 'success');
    }).catch(() => {
        showNotification('فشل النسخ', 'error');
    });
}

// Open email (fallback)
function openEmail() {
    window.open(`mailto:Tameer_facility@mhud.gov.eg`);
}

// Print QR code
function printQR() {
    const printWindow = window.open('', '', 'height=500,width=500');
    const qrHtml = document.getElementById('qrcode')?.innerHTML;
    if (!qrHtml) return;

    printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <title>باركود | QR Code</title>
            <style>
                body { text-align: center; font-family: Arial; padding: 20px; }
                h3 { color: #003366; }
                #qrcode { display: inline-block; }
            </style>
        </head>
        <body>
            <h3>باركود نموذج التقديم | QR Code</h3>
            <div id="qrcode">${qrHtml}</div>
            <p>امسح الباركود للدخول للنموذج | Scan to access form</p>
        </body>
        </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 250);
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    const container = document.querySelector('.notifications');
    if (!container) return;
    container.appendChild(notification);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Setup language toggle
function setupLanguageToggle() {
    const preferredLang = localStorage.getItem('preferredLanguage') || 'ar';
    if (preferredLang === 'en') {
        document.documentElement.lang = 'en';
        document.body.dir = 'ltr';
        document.body.classList.add('en');
    }
}

// Export form data as JSON
function exportFormJSON() {
    const form = document.getElementById('applicationForm');
    if (!form) return;

    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    
    const json = JSON.stringify(data, null, 2);
    const element = document.createElement('a');
    element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(json));
    element.setAttribute('download', `job-application-${new Date().getTime()}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

// API Integration - Submit to backend
function submitToBackend(apiUrl, apiKey) {
    const form = document.getElementById('applicationForm');
    if (!form) return;

    const formData = new FormData(form);
    formData.append('timestamp', new Date().toISOString());
    formData.append('apiVersion', '1.0');

    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Success:', data);
        showNotification('تم إرسال الطلب بنجاح', 'success');
        if (data && data.success) {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(FILES_STORAGE_KEY);
        }
    })
    .catch((error) => {
        console.error('Error:', error);
        showNotification('فشل الإرسال: ' + error.message, 'error');
    });
}

// ============ REALTIME DATABASE FUNCTIONS ============

/**
 * Save application to Firestore database (realtime)
 */
async function buildEmbeddedAttachmentsFromForm(form) {
    const toMetadata = (file, inputId, label = '') => ({
        fieldId: inputId,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
        uploadMode: 'metadata_only',
        label
    });

    const readSingle = (inputId) => {
        const input = document.getElementById(inputId);
        if (!input || !input.files || !input.files.length) return null;
        const file = input.files[0];
        return toMetadata(file, inputId);
    };

    const readMultiple = (inputId, includeExtra = false) => {
        const out = [];
        const input = document.getElementById(inputId);
        if (input && input.files && input.files.length) {
            for (const file of Array.from(input.files)) {
                out.push(toMetadata(file, inputId));
            }
        }

        if (includeExtra) {
            const extraInputs = document.querySelectorAll('.extra-certificate-wrapper input[type="file"]');
            for (const extraInput of Array.from(extraInputs)) {
                if (!extraInput.files || !extraInput.files.length) continue;
                for (const file of Array.from(extraInput.files)) {
                    out.push(toMetadata(file, extraInput.id || 'certificates-extra'));
                }
            }
        }
        return out;
    };

    const readAdditionalCertificates = () => {
        const out = [];

        for (let i = 0; i <= 100; i++) {
            const inputId = `additionalCertificateDoc${i}`;
            const input = document.getElementById(inputId);
            if (input && input.files && input.files.length > 0) {
                for (const file of Array.from(input.files)) {
                    out.push(toMetadata(file, inputId, `شهادة إضافية ${i + 1}`));
                }
            }
        }

        for (let i = 0; i <= 100; i++) {
            const inputId = `certificateDoc${i}`;
            const input = document.getElementById(inputId);
            if (input && input.files && input.files.length > 0) {
                for (const file of Array.from(input.files)) {
                    out.push(toMetadata(file, inputId, `شهادة تدريب ${i + 1}`));
                }
            }
        }

        return out;
    };

    const cv = readSingle('cv');
    const qualificationDoc = readSingle('qualification-doc');
    const idCard = readSingle('id-card');
    const certificates = readMultiple('certificates', true);
    const additionalCerts = readAdditionalCertificates();

    const attachments = [cv, qualificationDoc, idCard, ...certificates, ...additionalCerts].filter(Boolean);

    return {
        cv,
        qualificationDoc,
        idCard,
        certificates,
        additionalCertificates: additionalCerts,
        attachments
    };
}

async function saveApplicationToRTDB() {
    if (!firebaseRtdb || !firebaseInitialized) {
        console.warn('RTDB not available, data will only be saved locally');
        return null;
    }

    const form = document.getElementById('applicationForm');
    if (!form) return null;

    try {
        const formData = new FormData(form);
        const requestRefNumber = '202-6-' + String(Math.floor(Math.random() * 900) + 100);
        const embedded = await buildEmbeddedAttachmentsFromForm(form);
        const attachments = embedded.attachments || [];
        const nowIso = new Date().toISOString();

        const jobValue = formData.get('jobPosition') || '';
        const jobLabel = getJobLabelByValue(jobValue);
        
// Collect experience fields dynamically with proper numbering
        const experienceFields = {};
        let expIndex = 0;
        
        // First check for standard indexed fields (company0, jobTitle0, workDuration0, etc.)
        for (let i = 0; i <= 100; i++) {
            const company = formData.get(`company${i}`);
            const jobTitle = formData.get(`jobTitle${i}`);
            const workDuration = formData.get(`workDuration${i}`);
            if (company || jobTitle || workDuration) {
                experienceFields[`company${i}`] = company || '';
                experienceFields[`jobTitle${i}`] = jobTitle || '';
                experienceFields[`workDuration${i}`] = workDuration || '';
                experienceFields[`experienceDescription${i}`] = formData.get(`experienceDescription${i}`) || '';
                expIndex = Math.max(expIndex, i);
            }
        }
        
        // Also check for "company" field without number (first experience)
        const firstCompany = formData.get('company');
        const firstJobTitle = formData.get('jobTitle');
        const firstWorkDuration = formData.get('workDuration');
        if ((firstCompany || firstJobTitle || firstWorkDuration) && expIndex === 0) {
            experienceFields['company'] = firstCompany || '';
            experienceFields['jobTitle'] = firstJobTitle || '';
            experienceFields['workDuration'] = firstWorkDuration || '';
            experienceFields['experienceDescription'] = '';
            // Also save as indexed for consistency
            if (firstCompany) experienceFields['company'] = firstCompany;
            if (firstJobTitle) experienceFields['jobTitle'] = firstJobTitle;
            if (firstWorkDuration) experienceFields['workDuration'] = firstWorkDuration;
        }
        
// Collect additional certificate fields (text fields for certificate info)
        const certificateFields = {};
        
        // Check for indexed certificates first (additionalCertificateName0, additionalCertificateName2, additionalCertificateName3, etc.)
        for (let i = 0; i <= 100; i++) {
            // Skip index 1 since addAdditionalCertificate creates from 2 onwards
            if (i === 1) continue;
            
            // Collect from old additional certificates section (in attachments)
            const name = formData.get(`additionalCertificateName${i}`);
            const issuer = formData.get(`additionalCertificateIssuer${i}`);
            const date = formData.get(`additionalCertificateDate${i}`);
            if (name || issuer || date) {
                certificateFields[`additionalCertificateName${i}`] = name || '';
                certificateFields[`additionalCertificateIssuer${i}`] = issuer || '';
                certificateFields[`additionalCertificateDate${i}`] = date || '';
            }
            
            // Collect from new certificates section (Section 5 - certificateName0, certificateIssuer0, certificateDate0)
            const certName = formData.get(`certificateName${i}`);
            const certIssuer = formData.get(`certificateIssuer${i}`);
            const certDate = formData.get(`certificateDate${i}`);
            if (certName || certIssuer || certDate) {
                // Only save if not already saved from additionalCertificate fields
                if (!certificateFields[`additionalCertificateName${i}`]) {
                    certificateFields[`additionalCertificateName${i}`] = certName || '';
                    certificateFields[`additionalCertificateIssuer${i}`] = certIssuer || '';
                    certificateFields[`additionalCertificateDate${i}`] = certDate || '';
                }
            }
        }
        
        // Also check for non-indexed certificate fields (for first certificate without number)
        const firstCertName = formData.get('certificateName');
        const firstCertIssuer = formData.get('certificateIssuer');
        const firstCertDate = formData.get('certificateDate');
        if (firstCertName || firstCertIssuer || firstCertDate) {
            if (!certificateFields['additionalCertificateName']) {
                certificateFields['additionalCertificateName'] = firstCertName || '';
                certificateFields['additionalCertificateIssuer'] = firstCertIssuer || '';
                certificateFields['additionalCertificateDate'] = firstCertDate || '';
            }
        }
        
        // Also collect from old additional certificates (additionalCertificateName without number)
        const oldCertName = formData.get('additionalCertificateName');
        const oldCertIssuer = formData.get('additionalCertificateIssuer');
        const oldCertDate = formData.get('additionalCertificateDate');
        if (oldCertName || oldCertIssuer || oldCertDate) {
            if (!certificateFields['additionalCertificateName']) {
                certificateFields['additionalCertificateName'] = oldCertName || '';
                certificateFields['additionalCertificateIssuer'] = oldCertIssuer || '';
                certificateFields['additionalCertificateDate'] = oldCertDate || '';
            }
        }
        
// Also collect attachment certificate fields (file uploads for backward compatibility)
        const extraCerts = document.querySelectorAll('.extra-certificate-wrapper input[type="file"]');
        extraCerts.forEach((input, idx) => {
            if (input.files && input.files.length > 0) {
                const certNum = idx + 1;
                certificateFields[`additionalCertificateName${certNum}`] = input.files[0].name;
                certificateFields[`additionalCertificateFileName${certNum}`] = input.id;
            }
        });
        
// Combine all certificates (regular + additional)
        const allCertificates = [...(embedded.certificates || []), ...(embedded.additionalCertificates || [])];

        // Read profile photo as compressed base64
        const profilePhoto = await readPhotoAsBase64('profilePhoto', 300, 400);
        
const applicationData = {
            // Primary fields
            fullName: formData.get('fullName') || '',
            nationalId: formData.get('nationalId') || '',
            dateOfBirth: formData.get('dateOfBirth') || '',
            address: formData.get('address') || '',
            phone: formData.get('phone') || '',
            email: formData.get('email') || '',
            nationality: formData.get('nationality') || '',
            jobPosition: jobLabel,
            jobRefNumber: formData.get('jobRefNumber') || '',
            // Personal details
            maritalStatus: formData.get('maritalStatus') || '',
            socialStatus: formData.get('maritalStatus') || '',
            gender: formData.get('gender') || '',
            sex: formData.get('gender') || '',
            militaryStatus: formData.get('militaryStatus') || '',
            // Education
            degree: formData.get('qualification') || '',
            qualification: formData.get('qualification') || '',
            specialization: formData.get('specialization') || '',
            university: formData.get('university') || '',
            graduationYear: formData.get('graduationYear') || '',
            // Skills & Languages
            languages: formData.get('languages') || '',
            computerSkills: formData.get('computerSkills') || '',
            trainingCourses: formData.get('trainingCourses') || '',
            technicalSkills: formData.get('technicalSkills') || '',
            // Experience
            yearsOfExperience: formData.get('yearsOfExperience') || '',
            experienceDescription: formData.get('experienceDescription') || '',
            // Additional data
            availableFrom: formData.get('availableFrom') || '',
            drivingLicense: formData.get('drivingLicense') || '',
            relocate: formData.get('relocate') || '',
            // Declaration
            signatureName: formData.get('signatureName') || '',
            date: formData.get('date') || '',
            notes: formData.get('notes') || '',
            declaration: !!formData.get('declaration'),
            // Files
            cv: embedded.cv || null,
            qualificationDoc: embedded.qualificationDoc || null,
            idCard: embedded.idCard || null,
            certificates: allCertificates,
            attachments: attachments,
            attachmentCount: attachments.length,
            // Profile photo (compressed base64)
            profilePhoto: profilePhoto || null,
            // System
            requestRefNumber: requestRefNumber,
            status: 'جديد',
            submittedAt: nowIso,
            lastUpdated: nowIso,
            // Include experience and certificate fields
            ...experienceFields,
            ...certificateFields
        };

        const newRef = firebaseRtdb.ref('applications').push();
        await newRef.set(applicationData);

        const submissionExperiences = collectExperienceEntries(formData);

console.log('✅ Application saved to RTDB:', newRef.key);
        console.log('📎 Attachments saved:', attachments.length);
        showNotification('تم حفظ الطلب في قاعدة البيانات', 'success');
        
        // Return ALL fields for the success modal
        return {
            applicationId: newRef.key,
            requestRefNumber,
            jobRefNumber: formData.get('jobRefNumber') || '',
            jobPosition: jobLabel || '',
            // All personal data fields
            personalData: {
                fullName: formData.get('fullName') || '',
                nationalId: formData.get('nationalId') || '',
                phone: formData.get('phone') || '',
                email: formData.get('email') || '',
                address: formData.get('address') || '',
                dateOfBirth: formData.get('dateOfBirth') || '',
                gender: formData.get('gender') || '',
                maritalStatus: formData.get('maritalStatus') || '',
                jobPosition: jobLabel || '',
                militaryStatus: formData.get('militaryStatus') || ''
            },
            // All education fields
            education: {
                qualification: formData.get('qualification') || '',
                specialization: formData.get('specialization') || '',
                university: formData.get('university') || '',
                graduationYear: formData.get('graduationYear') || ''
            },
            // Additional fields
personalExtra: {
                dateOfBirth: formData.get('dateOfBirth') || '',
                maritalStatus: formData.get('maritalStatus') || '',
                gender: formData.get('gender') || '',
                militaryStatus: formData.get('militaryStatus') || ''
            },
            // Skills and capabilities
            skills: {
                languages: formData.get('languages') || '',
                computerSkills: formData.get('computerSkills') || '',
                trainingCourses: formData.get('trainingCourses') || '',
                technicalSkills: formData.get('technicalSkills') || ''
            },
            // Additional data
            additionalData: {
                availableFrom: formData.get('availableFrom') || '',
                drivingLicense: formData.get('drivingLicense') || '',
                relocate: formData.get('relocate') || ''
            },
            // Notes and declaration
            notes: formData.get('notes') || '',
            signatureName: formData.get('signatureName') || '',
            declarationDate: formData.get('date') || '',
            // Experiences
            experiences: submissionExperiences,
            // Additional certificates
            additionalCertificates: collectAdditionalCertificateEntries(formData),
            // Nationality
            nationality: formData.get('nationality') || '',
            // Profile photo
            profilePhoto: profilePhoto || null,
            // Count of attachments
            attachmentCount: attachments.length
        };
    } catch (error) {
        console.error('Error saving to RTDB:', error);
        showNotification('خطأ في حفظ البيانات: ' + error.message, 'error');
        return null;
    }
}

/**
 * Submit application - saves to RTDB and opens email
 * يستخدم html2canvas لتصوير نافذة التأكيد كصورة كاملة (ليس لقطة شاشة)
 */
async function saveSubmissionCardAsImage(cardElement, result) {
    if (!cardElement) {
        showNotification('عنصر الصورة غير موجود', 'error');
        return;
    }

    // Check if html2canvas is loaded, if not try to load it
    if (typeof html2canvas === 'undefined') {
        showNotification('جاري تحميل أداة حفظ الصورة...', 'info');
        
        try {
            await ensureLibrary('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'html2canvas');
        } catch (e) {
            showNotification('تعذر تحميل أداة حفظ الصورة', 'error');
            return;
        }
    }

    // Wait for any animations to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
        // Save original styles to restore later
        const originalStyles = {
            overflow: cardElement.style.overflow,
            maxHeight: cardElement.style.maxHeight,
            height: cardElement.style.height,
            position: cardElement.style.position
        };
        
        // Get actual content dimensions
        const actualHeight = cardElement.scrollHeight;
        const actualWidth = cardElement.scrollWidth;
        
        console.log('Capturing full modal dimensions:', { width: actualWidth, height: actualHeight });

        // Use html2canvas to capture the COMPLETE modal content (not screenshot)
        const canvas = await html2canvas(cardElement, {
            backgroundColor: '#ffffff',
            scale: 2, // Higher scale for better quality
            useCORS: true,
            logging: false,
            allowTaint: true,
            // Capture complete content (not just visible area)
            windowWidth: actualWidth,
            windowHeight: actualHeight,
            // Ensure all content is captured
            onclone: (clonedDoc, clonedElement) => {
                // Expand the cloned element to show ALL content
                clonedElement.style.overflow = 'visible';
                clonedElement.style.maxHeight = 'none';
                clonedElement.style.height = 'auto';
                clonedElement.style.minHeight = actualHeight + 'px';
                clonedElement.style.position = 'relative';
                
                // Expand parent containers as well
                let parent = clonedElement.parentElement;
                while (parent) {
                    parent.style.overflow = 'visible';
                    parent.style.maxHeight = 'none';
                    parent = parent.parentElement;
                }
            }
        });

        const ref = result?.requestRefNumber || Date.now();
        const fullName = sanitizeFileName(result?.personalData?.fullName || 'applicant');
        
        // Convert canvas to image and download
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `submission-card-${fullName}-${ref}.png`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(link);
            if (link.href.startsWith('blob:')) {
                URL.revokeObjectURL(link.href);
            }
        }, 1000);

        showNotification('تم حفظ صورة التأكيد بنجاح', 'success');
    } catch (error) {
        console.error('Save image error:', error);
        showNotification('حدث خطأ أثناء حفظ الصورة: ' + error.message, 'error');
    }
}

function showSubmissionSuccessDetails(result) {
    // Get form data directly from the form element
    const form = document.getElementById('applicationForm');
    const formData = form ? new FormData(form) : null;
    
    // Helper to get form data value
    const getFormValue = (key) => {
        if (!formData) return '';
        return formData.get(key) || '';
    };
    
    // Extract all data from result object - support all possible paths
    const ref = result?.requestRefNumber || 'غير متوفر';
    const jobRef = result?.jobRefNumber || 'غير متوفر';
    
    // Personal data - all fields
    const fullName = result?.personalData?.fullName || 'غير متوفر';
    const nationalId = result?.personalData?.nationalId || 'غير متوفر';
    const phone = result?.personalData?.phone || 'غير متوفر';
    const email = result?.personalData?.email || 'غير متوفر';
    const address = result?.personalData?.address || 'غير متوفر';
    const dateOfBirth = result?.personalData?.dateOfBirth || 'غير متوفر';
    const gender = result?.personalData?.gender || 'غير متوفر';
    const maritalStatus = result?.personalData?.maritalStatus || 'غير متوفر';
    const jobPosition = result?.personalData?.jobPosition || 'غير متوفر';
    const nationality = result?.nationality || '';
    const additionalCertificates = Array.isArray(result?.additionalCertificates) ? result.additionalCertificates : [];
    const profilePhoto = result?.profilePhoto || null;
    
const qualification = result?.qualification || 'غير متوفر';
    const education = result?.education || {};
    const personalExtra = result?.personalExtra || {};
    const experiences = Array.isArray(result?.experiences) ? result.experiences : [];
const skills = result?.skills || {
        languages: getFormValue('languages'),
        computerSkills: getFormValue('computerSkills'),
        trainingCourses: getFormValue('trainingCourses'),
        technicalSkills: getFormValue('technicalSkills')
    };
    const additionalData = result?.additionalData || {
        availableFrom: getFormValue('availableFrom'),
        drivingLicense: getFormValue('drivingLicense'),
        relocate: getFormValue('relocate')
    };
    const notes = result?.notes || '';
    const signatureName = result?.signatureName || '';
    const declarationDate = result?.declarationDate || '';
    //jobPosition already defined above - use existing
    const attachmentCount = result?.attachmentCount || 0;

    const mapGenderToArabic = (value) => {
        const v = String(value || '').trim().toLowerCase();
        const dict = {
            male: 'ذكر',
            m: 'ذكر',
            female: 'أنثى',
            f: 'أنثى'
        };
        return dict[v] || (value ? String(value) : '—');
    };

    const mapMaritalStatusToArabic = (value) => {
        const v = String(value || '').trim().toLowerCase();
        const dict = {
            single: 'أعزب/عزباء',
            unmarried: 'أعزب/عزباء',
            married: 'متزوج/متزوجة',
            divorced: 'مطلق/مطلقة',
            widow: 'أرمل/أرملة',
            widowed: 'أرمل/أرملة'
        };
        return dict[v] || (value ? String(value) : '—');
    };

    const mapYesNoToArabic = (value) => {
        const v = String(value || '').trim().toLowerCase();
        if (v === 'yes' || v === 'نعم') return 'نعم';
        if (v === 'no' || v === 'لا') return 'لا';
        return v || '—';
    };

    const genderArabic = mapGenderToArabic(personalExtra.gender || gender);
    const maritalStatusArabic = mapMaritalStatusToArabic(personalExtra.maritalStatus || maritalStatus);

// Build education HTML (always show with all fields)
    const educationHtml = `
        <div style="padding:10px; border:1px solid #e5e7eb; border-radius:8px; margin-bottom:8px; background:#f8fafc;">
            <p style="margin:0;"><strong>المؤهل:</strong> ${escapeHtml(education?.qualification || qualification || '—')}</p>
            <p style="margin:0;"><strong>التخصص:</strong> ${escapeHtml(education?.specialization || '—')}</p>
            <p style="margin:0;"><strong>الجهة:</strong> ${escapeHtml(education?.university || '—')}</p>
            <p style="margin:0;"><strong>السنة:</strong> ${escapeHtml(education?.graduationYear || '—')}</p>
        </div>`;

// Build personal extra HTML (always show with all fields)
    const personalExtraHtml = `
        <div style="padding:10px; border:1px solid #e5e7eb; border-radius:8px; margin-bottom:8px; background:#f8fafc;">
            <p style="margin:0;"><strong>تاريخ الميلاد:</strong> ${escapeHtml(personalExtra?.dateOfBirth || dateOfBirth || '—')}</p>
            <p style="margin:0;"><strong>الحالة الاجتماعية:</strong> ${escapeHtml(maritalStatusArabic)}</p>
            <p style="margin:0;"><strong>النوع:</strong> ${escapeHtml(genderArabic)}</p>
            ${nationality ? `<p style="margin:0;"><strong>الجنسية:</strong> ${escapeHtml(nationality)}</p>` : ''}
            ${(personalExtra?.gender === 'male' || personalExtra?.militaryStatus) ? `<p style="margin:0;"><strong>الموقف من التجنيد:</strong> ${escapeHtml(personalExtra?.militaryStatus || '—')}</p>` : ''}
        </div>`;

    // Build skills HTML
    const skillsHtml = (skills.languages || skills.computerSkills || skills.trainingCourses || skills.technicalSkills)
        ? `
        <div style="padding:10px; border:1px solid #e5e7eb; border-radius:8px; margin-bottom:8px; background:#f8fafc;">
            ${skills.languages ? `<p style="margin:0;"><strong>اللغات:</strong> ${escapeHtml(skills.languages)}</p>` : ''}
            ${skills.computerSkills ? `<p style="margin:0;"><strong>برامج الحاسب:</strong> ${escapeHtml(skills.computerSkills)}</p>` : ''}
            ${skills.trainingCourses ? `<p style="margin:0;"><strong>الدورات:</strong> ${escapeHtml(skills.trainingCourses)}</p>` : ''}
            ${skills.technicalSkills ? `<p style="margin:0;"><strong>المهارات الفنية:</strong> ${escapeHtml(skills.technicalSkills)}</p>` : ''}
        </div>
        `
        : '<p style="margin:0; color:#9ca3af;">لا توجد مهارات مدخلة</p>';

    // Build additional data HTML
    const additionalDataHtml = (additionalData.availableFrom || additionalData.drivingLicense || additionalData.relocate)
        ? `
        <div style="padding:10px; border:1px solid #e5e7eb; border-radius:8px; margin-bottom:8px; background:#f8fafc;">
            ${additionalData.availableFrom ? `<p style="margin:0;"><strong>تاريخ التفرغ:</strong> ${escapeHtml(additionalData.availableFrom)}</p>` : ''}
            ${additionalData.drivingLicense ? `<p style="margin:0;"><strong>رخصة قيادة:</strong> ${mapYesNoToArabic(additionalData.drivingLicense)}</p>` : ''}
            ${additionalData.relocate ? `<p style="margin:0;"><strong>العمل خارج المحافظة:</strong> ${escapeHtml(additionalData.relocate)}</p>` : ''}
        </div>
        `
        : '';

    // Build notes HTML
    const notesHtml = notes
        ? `
        <div style="padding:10px; border:1px solid #e5e7eb; border-radius:8px; margin-bottom:8px; background:#f8fafc;">
            <p style="margin:0;"><strong>ملاحظات:</strong> ${escapeHtml(notes)}</p>
        </div>
        `
        : '';

// Build experiences HTML
    const experiencesHtml = experiences.length
        ? experiences.map((exp, index) => `
            <div style="padding:10px; border:1px solid #e5e7eb; border-radius:8px; margin-bottom:8px; background:#f8fafc;">
                <p style="margin:0 0 6px; color:#0f172a;"><strong>خبرة ${index + 1}: ${escapeHtml(exp.company || 'جهة العمل')}</strong></p>
                ${exp.jobTitle ? `<p style="margin:0;"><strong>المسمى الوظيفي:</strong> ${escapeHtml(exp.jobTitle)}</p>` : ''}
                ${exp.duration ? `<p style="margin:0;"><strong>مدة العمل:</strong> ${escapeHtml(exp.duration)}</p>` : ''}
                ${exp.description ? `<p style="margin:0;"><strong>الوصف:</strong> ${escapeHtml(exp.description)}</p>` : ''}
            </div>
        `).join('')
        : '<p style="margin:0; color:#9ca3af;">لا توجد خبرات مدخلة</p>';

    // Build additional certificates HTML
    const additionalCertificatesHtml = additionalCertificates.length
        ? additionalCertificates.map((cert, index) => `
            <div style="padding:10px; border:1px solid #e5e7eb; border-radius:8px; margin-bottom:8px; background:#f8fafc;">
                <p style="margin:0 0 6px; color:#0f172a;"><strong>شهادة ${index + 1}: ${escapeHtml(cert.name || '—')}</strong></p>
                ${cert.issuer ? `<p style="margin:0;"><strong>جهة الإصدار:</strong> ${escapeHtml(cert.issuer)}</p>` : ''}
                ${cert.date ? `<p style="margin:0;"><strong>تاريخ الإصدار:</strong> ${escapeHtml(cert.date)}</p>` : ''}
            </div>
        `).join('')
        : '<p style="margin:0; color:#9ca3af;">لا توجد شهادات إضافية</p>';

    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 16px;
    `;

modal.innerHTML = `
        <div id="submission-success-card" style="background:#fff; width:100%; max-width:720px; border-radius:14px; padding:24px; box-shadow:0 20px 50px rgba(0,0,0,0.2); max-height:90vh; overflow:auto;">
            <h3 style="margin-top:0; margin-bottom:14px; color:#0f172a;">✅ تم إرسال الطلب بنجاح</h3>
            <div style="line-height:1.8; color:#1f2937;">
                <p style="background:#f0f9ff; padding:8px; border-radius:6px; margin:8px 0;"><strong>الرقم المرجعي:</strong> <span style="color:#0284c7; font-weight:bold;">${escapeHtml(ref)}</span> | <strong>كود الوظيفة:</strong> <span style="color:#0284c7; font-weight:bold;">${escapeHtml(jobRef)}</span>${jobPosition ? ` | <strong>الوظيفة:</strong> <span style="color:#0284c7; font-weight:bold;">${escapeHtml(jobPosition)}</span>` : ''}</p>
                <hr style="border:none; border-top:1px solid #e5e7eb; margin:12px 0;">
                <h4 style="margin:0 0 10px; color:#0f172a;">👤 البيانات الشخصية</h4>
                <div style="display:flex; gap:14px; align-items:flex-start; flex-direction:row-reverse;">
                    ${profilePhoto ? `<div style="flex-shrink:0;"><img src="${profilePhoto}" style="width:100px;height:130px;object-fit:cover;border-radius:8px;border:2px solid #003366;box-shadow:0 3px 8px rgba(0,51,102,.2);"></div>` : ''}
                    <div style="flex:1; padding:10px; border:1px solid #e5e7eb; border-radius:8px; background:#f8fafc;">
                        <p style="margin:0;"><strong>الاسم:</strong> ${escapeHtml(fullName)}</p>
                        <p style="margin:0;"><strong>الرقم القومي:</strong> ${escapeHtml(nationalId)}</p>
                        <p style="margin:0;"><strong>الهاتف:</strong> ${escapeHtml(phone)}</p>
                        <p style="margin:0;"><strong>البريد:</strong> ${escapeHtml(email)}</p>
                        <p style="margin:0;"><strong>العنوان:</strong> ${escapeHtml(address)}</p>
                    </div>
                </div>
                <h4 style="margin:0 0 10px; color:#0f172a;">🎓 المؤهل العلمي</h4>
                ${educationHtml}
                <h4 style="margin:0 0 10px; color:#0f172a;">📋 البيانات الإضافية</h4>
                ${personalExtraHtml}
                <h4 style="margin:0 0 10px; color:#0f172a;">💼 المهارات والقدرات</h4>
                ${skillsHtml}
                ${additionalDataHtml ? `<h4 style="margin:0 0 10px; color:#0f172a;">🚗 بيانات إضافية</h4>` : ''}
                ${additionalDataHtml}
                ${notesHtml ? `<h4 style="margin:0 0 10px; color:#0f172a;">📝 ملاحظات</h4>` : ''}
                ${notesHtml}
                <hr style="border:none; border-top:1px solid #e5e7eb; margin:12px 0;">
                <h4 style="margin:0 0 10px; color:#0f172a;">💪 الخبرات السابقة</h4>
                ${experiencesHtml}
                <hr style="border:none; border-top:1px solid #e5e7eb; margin:12px 0;">
                <h4 style="margin:0 0 10px; color:#0f172a;">🏅 الشهادات الإضافية</h4>
                ${additionalCertificatesHtml}
                <p style="margin-top:8px; color:#6b7280; font-size:13px;">📎 عدد المرفقات: ${attachmentCount}</p>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:16px; flex-wrap:wrap;">
                <button type="button" class="btn btn-success" id="saveSuccessDetailsImageBtn">📷 حفظ كصورة</button>
                <button type="button" class="btn btn-primary" id="closeSuccessDetailsModal">إغلاق</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = document.getElementById('closeSuccessDetailsModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.remove());
    }

// Store result globally so saveSubmissionCardAsImage can access it
    window._lastSubmissionResult = result;
    
    const saveImageBtn = document.getElementById('saveSuccessDetailsImageBtn');
    if (saveImageBtn) {
        saveImageBtn.addEventListener('click', async () => {
            const card = document.getElementById('submission-success-card');
            await saveSubmissionCardAsImage(card, window._lastSubmissionResult);
        });
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

async function submitApplicationToRTDB() {
    const form = document.getElementById('applicationForm');
    if (!form) return;

    // Ensure job reference is always synced from selected option
    const jobSelect = document.getElementById('jobPosition');
    const jobRefInput = document.getElementById('jobRefNumber');
    if (jobSelect && jobRefInput) {
        const selectedOption = jobSelect.options[jobSelect.selectedIndex];
        const refNumber = selectedOption?.getAttribute('data-ref') || '';
        jobRefInput.value = refNumber;
    }

    // Validate form
    if (!form.checkValidity()) {
        form.reportValidity();
        showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }

    if (!document.getElementById('declaration')?.checked) {
        showNotification('يرجى الموافقة على الإقرار', 'error');
        return;
    }

    // Show loading
    showNotification('جاري حفظ الطلب...', 'info');

    try {
        // Save to Realtime Database
        const submissionResult = await saveApplicationToRTDB();

        if (submissionResult?.applicationId) {
            showNotification('✅ تم حفظ الطلب بنجاح!', 'success');
            showSubmissionSuccessDetails(submissionResult);

            // Clear local storage after successful submission
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(FILES_STORAGE_KEY);
        } else {
            showNotification('تعذر حفظ الطلب، حاول مرة أخرى', 'error');
        }

    } catch (error) {
        console.error('Error:', error);
        showNotification('حدث خطأ: ' + error.message, 'error');
    }
}

// Global API configuration (can be set externally)
window.jobApplicationAPI = {
    submitToBackend: submitToBackend,
    exportFormJSON: exportFormJSON,
    saveToRTDB: saveApplicationToRTDB,
    submitApplicationToRTDB: submitApplicationToRTDB
};

// Make functions available globally for both traditional and module scripts
if (typeof window !== 'undefined') {
    // Core functions
    window.initializeApp = initializeApp;
    window.autoSaveForm = autoSaveForm;
    window.loadFormData = loadFormData;
    window.updateJobRefNumber = updateJobRefNumber;
    window.handleMilitaryStatusVisibility = handleMilitaryStatusVisibility;
    window.handleURLParams = handleURLParams;
    window.setupSectionNotifications = setupSectionNotifications;
    
    // Experience management
    window.addExperience = addExperience;
    window.removeExperience = removeExperience;
    
    // Certificate management
    window.addCertificate = addCertificate;
    window.removeCertificate = removeCertificate;
    window.addCertificateField = addCertificateField;
    window.removeLastCertificateField = removeLastCertificateField;
    window.addAdditionalCertificate = addAdditionalCertificate;
    window.removeAdditionalCertificate = removeAdditionalCertificate;
    
    // File handling
    window.fileSelected = fileSelected;
    window.storeFileInfo = storeFileInfo;
    window.previewProfilePhoto = previewProfilePhoto;
    
    // Submission functions
    window.prepareForSubmission = prepareForSubmission;
    window.submitApplication = submitApplication;
    window.submitApplicationToRTDB = submitApplicationToRTDB;
    window.downloadPDFNow = downloadPDFNow;
    window.openEmailWithData = openEmailWithData;
    window.generateComprehensivePDF = generateComprehensivePDF;
    
    // Helper functions
    window.showNotification = showNotification;
    window.generateQRCode = generateQRCode;
    window.copyFormLink = copyFormLink;
    window.copyEmail = copyEmail;
    window.openEmail = openEmail;
    window.printQR = printQR;
    window.exportFormJSON = exportFormJSON;
    
    // Form builders
    window.generateSubmissionSummary = generateSubmissionSummary;
    window.buildApplicantPayload = buildApplicantPayload;
    window.collectExperienceEntries = collectExperienceEntries;
    window.collectAdditionalCertificateEntries = collectAdditionalCertificateEntries;
    window.getAttachmentSources = getAttachmentSources;
    window.collectAttachments = collectAttachments;
    
    // Job helpers
    window.getSelectedJobLabel = getSelectedJobLabel;
    window.getJobLabelByValue = getJobLabelByValue;
    
    // PDF helpers
    window.ensurePDFDependencies = ensurePDFDependencies;
    window.ensureLibrary = ensureLibrary;
    window.escapeHtml = escapeHtml;
    window.sanitizeFileName = sanitizeFileName;
    window.formatDateForDisplay = formatDateForDisplay;
    window.formatFileSize = formatFileSize;
    
    // Firebase helpers
    window.saveApplicationToRTDB = saveApplicationToRTDB;
    window.submitToBackend = submitToBackend;
    
    // UI helpers
    window.showSubmissionOptions = showSubmissionOptions;
    window.showSubmissionSuccessDetails = showSubmissionSuccessDetails;
}

