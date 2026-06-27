const firebaseConfig = {
  apiKey: "AIzaSyAi7RmDZ6Wqv5wBL8VNLlZP5wZCyp5lJNQ",
  authDomain: "job-application-7f8d4.firebaseapp.com",
  projectId: "job-application-7f8d4",
  storageBucket: "job-application-7f8d4.firebasestorage.app",
  messagingSenderId: "198258398221",
  appId: "1:198258398221:web:596c028f9d99a4ecaaf144",
  databaseURL: "https://job-application-7f8d4-default-rtdb.firebaseio.com",
  measurementId: "G-F9JCR0CG58"
};

let db = null;
let rtdb = null;
let auth = null;
let applications = [];
let filtered = [];
let authInitialized = false;

const authGate = document.getElementById('authGate');
const adminApp = document.getElementById('adminApp');
const adminEmail = document.getElementById('adminEmail');
const adminPassword = document.getElementById('adminPassword');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const authError = document.getElementById('authError');
const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
const logoutBtn = document.getElementById('logoutBtn');

const grid = document.getElementById('applicationsGrid');
const emptyState = document.getElementById('emptyState');
const totalCount = document.getElementById('totalCount');
const filteredCount = document.getElementById('filteredCount');
const jobFilter = document.getElementById('jobFilter');
const searchInput = document.getElementById('searchInput');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const modal = document.getElementById('detailsModal');
const modalBody = document.getElementById('modalBody');
const closeModalBtn = document.getElementById('closeModalBtn');

bootstrap();

function bootstrap() {
  initFirebaseApp();
  bindAuthEvents();
  bindEvents();
  observeAuthState();
}

function initFirebaseApp() {
  if (!firebase?.apps?.length) {
    firebase.initializeApp(firebaseConfig);
  }
  if (firebase?.database) {
    rtdb = firebase.database();
  }
  if (firebase?.auth) {
    auth = firebase.auth();
  }
  authInitialized = true;
}

function bindAuthEvents() {
  if (adminLoginBtn) {
    adminLoginBtn.addEventListener('click', handleAdminLogin);
  }

  [adminEmail, adminPassword].forEach((input) => {
    if (!input) return;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdminLogin();
      }
    });
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', handleForgotPassword);
  }
}

function observeAuthState() {
  if (!authInitialized || !auth) {
    showAuthError('Firebase Authentication غير متاح');
    showAuthGate();
    return;
  }

  auth.onAuthStateChanged((user) => {
    if (user) {
      hideAuthError();
      showAdminApp();
      listenRealtimeApplicationsRTDB();
    } else {
      applications = [];
      filtered = [];
      renderStats();
      renderApplications();
      showAuthGate();
    }
  });
}

async function handleAdminLogin() {
  hideAuthError();
  const email = String(adminEmail?.value || '').trim();
  const password = String(adminPassword?.value || '');

  if (!email || !password) {
    showAuthError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
    return;
  }

  if (!auth) {
    showAuthError('خدمة Authentication غير مهيأة');
    return;
  }

  adminLoginBtn.disabled = true;
  adminLoginBtn.textContent = 'جاري تسجيل الدخول...';

  try {
    await auth.signInWithEmailAndPassword(email, password);
    adminPassword.value = '';
  } catch (err) {
    console.error('Login failed:', err);
    showAuthError(resolveAuthError(err));
  } finally {
    adminLoginBtn.disabled = false;
    adminLoginBtn.textContent = 'دخول';
  }
}

async function handleLogout() {
  if (!auth) return;
  try {
    await auth.signOut();
  } catch (err) {
    console.error('Logout failed:', err);
    showAuthError('تعذر تسجيل الخروج، حاول مرة أخرى');
  }
}

async function handleForgotPassword() {
  hideAuthError();

  const email = String(adminEmail?.value || '').trim();
  if (!email) {
    showAuthError('يرجى إدخال البريد الإلكتروني أولاً');
    return;
  }

  if (!auth || typeof auth.sendPasswordResetEmail !== 'function') {
    showAuthError('خدمة استعادة كلمة المرور غير متاحة حالياً');
    return;
  }

  if (forgotPasswordBtn) {
    forgotPasswordBtn.disabled = true;
    forgotPasswordBtn.style.opacity = '0.6';
    forgotPasswordBtn.style.cursor = 'not-allowed';
  }

  try {
    const actionCodeSettings = buildPasswordResetActionCodeSettings();
    await auth.sendPasswordResetEmail(email, actionCodeSettings);
    showAuthSuccess('تم استلام الطلب. إذا كان البريد مسجلاً ومفعلاً ستصلك رسالة إعادة التعيين خلال دقائق. يرجى فحص Inbox و Spam/Junk.');
  } catch (err) {
    console.error('Password reset failed:', err);
    showAuthError(resolvePasswordResetError(err));
  } finally {
    if (forgotPasswordBtn) {
      forgotPasswordBtn.disabled = false;
      forgotPasswordBtn.style.opacity = '1';
      forgotPasswordBtn.style.cursor = 'pointer';
    }
  }
}

function resolvePasswordResetError(err) {
  const code = String(err?.code || '');
  if (code.includes('auth/invalid-email')) return 'صيغة البريد الإلكتروني غير صحيحة';
  if (code.includes('auth/user-not-found')) return 'هذا البريد غير مسجل';
  if (code.includes('auth/too-many-requests')) return 'محاولات كثيرة، حاول لاحقًا';
  if (code.includes('auth/network-request-failed')) return 'مشكلة في الاتصال بالإنترنت';
  if (code.includes('auth/unauthorized-continue-uri')) {
    return 'رابط إعادة التعيين غير مصرح به. أضف الدومين المستخدم في Firebase > Authentication > Settings > Authorized domains (مثل: localhost و job-application-7f8d4.web.app).';
  }
  if (code.includes('auth/missing-continue-uri')) return 'إعداد رابط إعادة التعيين غير مكتمل';
  if (code.includes('auth/operation-not-allowed')) return 'يجب تفعيل Email/Password من Firebase Authentication';
  return `تعذر إرسال رابط إعادة التعيين (${code || 'unknown-error'})`;
}

function buildPasswordResetActionCodeSettings() {
  const configuredUrl = typeof window.PASSWORD_RESET_CONTINUE_URL === 'string'
    ? window.PASSWORD_RESET_CONTINUE_URL.trim()
    : '';

  const defaultUrl = 'https://job-application-7f8d4.web.app/admin.html';
  const candidateUrl = configuredUrl || defaultUrl;

  let safeUrl = defaultUrl;
  try {
    const parsed = new URL(candidateUrl);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      safeUrl = parsed.toString();
    }
  } catch (e) {
    safeUrl = defaultUrl;
  }

  return {
    url: safeUrl,
    handleCodeInApp: false
  };
}

function showAuthGate() {
  if (authGate) authGate.style.display = 'block';
  if (adminApp) adminApp.style.display = 'none';
}

function showAdminApp() {
  if (authGate) authGate.style.display = 'none';
  if (adminApp) adminApp.style.display = 'block';
}

function showAuthError(message) {
  if (!authError) return;
  authError.style.display = 'block';
  authError.textContent = message;
}

function hideAuthError() {
  if (!authError) return;
  authError.style.display = 'none';
  authError.style.color = '#b91c1c';
  authError.textContent = '';
}

function showAuthSuccess(message) {
  if (!authError) return;
  authError.style.display = 'block';
  authError.style.color = '#166534';
  authError.textContent = message;
}

function resolveAuthError(err) {
  const code = String(err?.code || '');
  if (code.includes('auth/invalid-email')) return 'صيغة البريد الإلكتروني غير صحيحة';
  if (code.includes('auth/user-disabled')) return 'هذا المستخدم معطل';
  if (code.includes('auth/user-not-found')) return 'المستخدم غير موجود';
  if (code.includes('auth/wrong-password')) return 'كلمة المرور غير صحيحة';
  if (code.includes('auth/too-many-requests')) return 'محاولات كثيرة، حاول لاحقًا';
  if (code.includes('auth/network-request-failed')) return 'مشكلة في الاتصال بالإنترنت';
  if (code.includes('auth/invalid-credential')) return 'بيانات الدخول غير صحيحة';
  return 'فشل تسجيل الدخول، تحقق من البيانات';
}

// Job reference mapping - value to Arabic label
const jobLabels = {
  // Engineers
  'civil_engineer': 'مهندس مدني',
  'architect': 'مهندس عمارة',
  'electrical_engineer': 'مهندس كهرباء',
  'mechanical_engineer': 'مهندس ميكانيكا',
  'planning_engineer': 'مهندس تخطيط',
  'technical_office_engineer': 'مهندس مكتب فني',
  'execution_engineer': 'مهندس تنفيذ',
  'project_manager': 'مهندس إدارة مشروعات',
  'systems_engineer': 'مهندس نظم وتحول رقمي',
  'cybersecurity_engineer': 'مهندس أمن سيبراني',
  'network_engineer': 'مهندس شبكات',
  // Accountants
  'financial_accountant': 'محاسب مالية',
  'cost_accountant': 'محاسب تكاليف',
  'treasury_accountant': 'محاسب خزينة',
  'audit_accountant': 'محاسب مراجعة',
  'tax_accountant': 'محاسب ضرائب',
  'bank_accountant': 'محاسب بنوك',
  // Administration & HR
  'hr': 'موارد بشرية',
  'admin_affairs': 'شؤون إدارية',
  'secretary': 'سكرتارية',
  'follow_up': 'متابعة',
  'marketing_business': 'متخصص تسويق وتطوير أعمال',
  // Supervisors
  'site_supervisor': 'مشرف مواقع',
  'execution_supervisor': 'مشرف تنفيذ',
  // Technicians
  'plumbing_technician': 'فني سباكة',
  'electrical_technician': 'فني كهرباء',
  'ac_technician': 'فني تكييف',
  'operation_maintenance': 'فني تشغيل وصيانة',
  'carpentry_technician': 'فني نجارة',
  'welding_technician': 'فني حدادة',
  'finishing_technician': 'فني تشطيبات'
};

const jobReferenceByPosition = {
  // Engineers
  'civil_engineer': 'ENG-001',
  'architect': 'ENG-002',
  'electrical_engineer': 'ENG-003',
  'mechanical_engineer': 'ENG-004',
  'planning_engineer': 'ENG-005',
  'technical_office_engineer': 'ENG-006',
  'execution_engineer': 'ENG-007',
  'project_manager': 'ENG-008',
  'systems_engineer': 'ENG-009',
  'cybersecurity_engineer': 'ENG-010',
  'network_engineer': 'ENG-011',

  // Accountants
  'financial_accountant': 'ACC-001',
  'cost_accountant': 'ACC-002',
  'treasury_accountant': 'ACC-003',
  'audit_accountant': 'ACC-004',
  'tax_accountant': 'ACC-005',
  'bank_accountant': 'ACC-006',

  // Administration & HR
  'hr': 'ADM-001',
  'admin_affairs': 'ADM-002',
  'secretary': 'ADM-003',
  'follow_up': 'ADM-004',
  'marketing_business': 'ADM-005',

  // Supervisors
  'site_supervisor': 'SUP-001',
  'execution_supervisor': 'SUP-002',

// Technicians
  'plumbing_technician': 'TECH-001',
  'electrical_technician': 'TECH-002',
  'ac_technician': 'TECH-003',
  'operation_maintenance': 'TECH-004',
  'carpentry_technician': 'TECH-005',
  'welding_technician': 'TECH-006',
  'finishing_technician': 'TECH-007'
};


// Helper function to convert job value to Arabic label
function getJobLabel(jobValue) {
  if (!jobValue) return '—';
  // If already in Arabic, return as is
  if (!jobLabels[jobValue]) return jobValue;
  return jobLabels[jobValue] || jobValue;
}

function bindEvents() {
  jobFilter.addEventListener('change', applyFilters);
  searchInput.addEventListener('input', applyFilters);
  clearFiltersBtn.addEventListener('click', () => {
    jobFilter.value = '';
    searchInput.value = '';
    applyFilters();
  });

  closeModalBtn.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });
}

function listenRealtimeApplicationsRTDB() {
  if (!rtdb) {
    grid.innerHTML = '<div class="empty-state" style="display:block;color:#b91c1c;">Firebase Realtime Database غير متاح</div>';
    return;
  }

  const ref = rtdb.ref('applications');

  ref.on('value', (snapshot) => {
    const val = snapshot.val() || {};
    applications = Object.entries(val).map(([id, data]) => ({ id, ...(data || {}) }));

    applications.sort((a, b) => {
      const ta = getTimestampValue(a.submittedAt || a.lastUpdated || a.createdAt);
      const tb = getTimestampValue(b.submittedAt || b.lastUpdated || b.createdAt);
      return tb - ta;
    });

    populateJobFilter(applications);
    applyFilters();
  }, (err) => {
    console.error('RTDB realtime error:', err);
    const code = err?.code ? ` (${err.code})` : '';
    grid.innerHTML = `<div class="empty-state" style="display:block;color:#b91c1c;">تعذر تحميل البيانات من Realtime Database${code}</div>`;
  });
}

function populateJobFilter(items) {
  const jobs = [...new Set(items.map(i => (i.jobPosition || '').trim()).filter(Boolean))];
  const current = jobFilter.value;
  jobFilter.innerHTML = '<option value="">الكل</option>';
  jobs.forEach(job => {
    const opt = document.createElement('option');
    opt.value = job;
    opt.textContent = job;
    jobFilter.appendChild(opt);
  });
  jobFilter.value = current;
}

function applyFilters() {
  const job = jobFilter.value.trim().toLowerCase();
  const q = searchInput.value.trim().toLowerCase();

  filtered = applications.filter(app => {
    const jobOk = !job || String(app.jobPosition || '').toLowerCase() === job;
    const text = `${app.fullName || ''} ${app.phone || ''} ${app.email || ''}`.toLowerCase();
    const qOk = !q || text.includes(q);
    return jobOk && qOk;
  });

  renderStats();
  renderApplications();
}

function renderStats() {
  totalCount.textContent = applications.length;
  filteredCount.textContent = filtered.length;
}

function getTemplateClass(jobPosition = '') {
  const v = jobPosition.toLowerCase();
  if (v.includes('engineer') || v.includes('مهندس')) return 'template-engineering';
  if (v.includes('account') || v.includes('محاسب')) return 'template-finance';
  if (v.includes('hr') || v.includes('admin') || v.includes('إداري')) return 'template-admin';
  return 'template-default';
}

function renderApplications() {
  grid.innerHTML = '';

  if (!filtered.length) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

filtered.forEach(app => {
    const jobDisplay = getJobLabel(app.jobPosition);
    const jobCode = getJobCode(app);
    
    // Count attachments
    const attachments = Array.isArray(app.attachments) ? app.attachments : [];
    const attCount = attachments.length;
    const attCountText = attCount > 0 ? `${attCount} مرفق` : 'بدون مرفقات';
    
    const card = document.createElement('article');
    card.className = `app-card ${getTemplateClass(app.jobPosition)}`;
    card.innerHTML = `
      <div class="title">${escapeHtml(app.fullName || 'بدون اسم')}</div>
      <div class="meta">الوظيفة: ${escapeHtml(jobDisplay)}</div>
      <div class="meta">الكود الوظيفي: ${escapeHtml(jobCode)}</div>
      <div class="meta">الهاتف: ${escapeHtml(app.phone || '—')}</div>
      <div class="meta">البريد: ${escapeHtml(app.email || '—')}</div>
      <div class="meta">رقم الطلب: ${escapeHtml(app.requestRefNumber || app.id || '—')}</div>
      <div class="meta">تاريخ التقديم: ${escapeHtml(formatSubmittedAt(app.submittedAt || app.lastUpdated || app.createdAt))}</div>
      <div class="meta status-row">
        <label class="status-label" for="status-${app.id}">الحالة:</label>
        <select class="status-select" id="status-${app.id}" data-status-id="${app.id}">
          ${buildStatusOptions(app.status)}
        </select>
      </div>
<div class="actions">
        <button class="view-btn" data-id="${app.id}">عرض التفاصيل</button>
        <button class="pdf-btn" data-pdf-id="${app.id}">تنزيل PDF</button>
        <button class="delete-btn" data-delete-id="${app.id}" style="background:#dc2626;color:white;padding:6px 12px;border:none;border-radius:4px;cursor:pointer;">حذف</button>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => openDetails(btn.dataset.id));
  });

grid.querySelectorAll('.pdf-btn').forEach(btn => {
    btn.addEventListener('click', () => downloadApplicationPDF(btn.dataset.pdfId));
  });

  grid.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteApplication(btn.dataset.deleteId));
  });

  grid.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', () => updateApplicationStatus(select.dataset.statusId, select.value));
  });
}

// Delete application from RTDB
function deleteApplication(id) {
  if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
  
  if (!rtdb) {
    alert('قاعدة البيانات غير متاحة');
    return;
  }

  const appRef = rtdb.ref('applications/' + id);
  appRef.remove()
    .then(() => {
      alert('تم حذف الطلب بنجاح');
    })
    .catch((err) => {
      console.error('Error deleting:', err);
      alert('خطأ في حذف الطلب: ' + err.message);
    });
}

function openDetails(id) {
  const app = applications.find(a => a.id === id);
  if (!app) return;

  const jobDisplay = getJobLabel(app.jobPosition);
  const jobCode = getJobCode(app);
  const isMale = (app.gender || app.sex || '').toLowerCase() === 'male';

  // Build experiences HTML
  const experiences = collectIndexedGroups(app, ['company', 'jobTitle', 'workDuration', 'employmentDuration', 'experienceDescription']);
  let experiencesHtml = '';
  if (experiences.length > 0) {
    experiences.forEach((exp, i) => {
      if (exp.company || exp.jobTitle) {
        experiencesHtml += `
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:8px;">
            <p style="margin:0 0 4px 0;font-weight:bold;color:#1e3a8a;">الخبرة ${i + 1}</p>
            <p style="margin:2px 0;"><strong>جهة العمل:</strong> ${escapeHtml(exp.company || '—')}</p>
            <p style="margin:2px 0;"><strong>الوظيفة:</strong> ${escapeHtml(exp.jobTitle || '—')}</p>
            <p style="margin:2px 0;"><strong>مدة العمل:</strong> ${escapeHtml(exp.workDuration || exp.employmentDuration || '—')}</p>
            <p style="margin:2px 0;"><strong>الوصف:</strong> ${escapeHtml(exp.experienceDescription || '—')}</p>
          </div>
        `;
      }
    });
  }

// Build certificate/training courses HTML
  const courses = app.trainingCourses || app.certificates || app.courses || '';
  const coursesHtml = courses ? `<p style="margin:4px 0;"><strong>الدورات التدريبية:</strong> ${escapeHtml(courses)}</p>` : '';

  // Build additional certificates HTML
  const additionalCerts = collectIndexedGroups(app, ['additionalCertificateName', 'additionalCertificateIssuer', 'additionalCertificateDate']);
  let additionalCertsHtml = '';
  if (additionalCerts.length > 0) {
    additionalCerts.forEach((cert, i) => {
      if (cert.additionalCertificateName) {
        additionalCertsHtml += `
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px;margin-bottom:8px;">
            <p style="margin:0 0 4px 0;font-weight:bold;color:#166534;">شهادة ${i + 1}</p>
            <p style="margin:2px 0;"><strong>اسم الشهادة:</strong> ${escapeHtml(cert.additionalCertificateName || '—')}</p>
            <p style="margin:2px 0;"><strong>جهة الإصدار:</strong> ${escapeHtml(cert.additionalCertificateIssuer || '—')}</p>
            <p style="margin:2px 0;"><strong>تاريخ الإصدار:</strong> ${escapeHtml(cert.additionalCertificateDate || '—')}</p>
          </div>
        `;
      }
    });
  }

modalBody.innerHTML = `
    <h2 style="margin:0 0 16px 0;color:#1e3a8a;border-bottom:2px solid #3b82f6;padding-bottom:8px;">${escapeHtml(app.fullName || 'تفاصيل المتقدم')}</h2>
    
    <!-- البيانات الشخصية -->
    <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:10px;padding:14px;margin-bottom:14px;">
      <h3 style="margin:0 0 12px 0;color:#1d4ed8;font-size:15px;">📋 البيانات الشخصية</h3>
      <div style="display:flex;gap:14px;align-items:flex-start;flex-direction:row-reverse;">
        ${app.profilePhoto ? `<div style="flex-shrink:0;"><img src="${app.profilePhoto}" style="width:110px;height:140px;object-fit:cover;border-radius:8px;border:2px solid #1d4ed8;box-shadow:0 4px 12px rgba(29,78,216,.2);"></div>` : ''}
        <div style="flex:1;">
          <p><strong>الاسم:</strong> ${escapeHtml(app.fullName || '—')}</p>
          <p><strong>الرقم القومي:</strong> ${escapeHtml(app.nationalId || '—')}</p>
          <p><strong>الهاتف:</strong> ${escapeHtml(app.phone || '—')}</p>
          <p><strong>البريد الإلكتروني:</strong> ${escapeHtml(app.email || '—')}</p>
          <p><strong>العنوان:</strong> ${escapeHtml(app.address || '—')}</p>
        </div>
      </div>
    </div>

    <!-- البيانات الإضافية -->
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px;margin-bottom:14px;">
      <h3 style="margin:0 0 12px 0;color:#166534;font-size:15px;">📋 البيانات الإضافية</h3>
      <p><strong>تاريخ الميلاد:</strong> ${escapeHtml(app.dateOfBirth || '—')}</p>
      <p><strong>الحالة الاجتماعية:</strong> ${escapeHtml(getMaritalStatusLabel(app.maritalStatus || app.socialStatus || ''))}</p>
      <p><strong>النوع:</strong> ${escapeHtml(getGenderLabel(app.gender || app.sex || ''))}</p>
      ${isMale ? `<p><strong>الموقف من التجنيد:</strong> ${escapeHtml(getMilitaryStatusLabel(app.militaryStatus || ''))}</p>` : ''}
    </div>

    <!-- المؤهل العلمي -->
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:14px;margin-bottom:14px;">
      <h3 style="margin:0 0 12px 0;color:#92400e;font-size:15px;">🎓 المؤهل العلمي</h3>
      <p><strong>المؤهل:</strong> ${escapeHtml(app.degree || app.qualification || '—')}</p>
      <p><strong>التخصص:</strong> ${escapeHtml(app.specialization || '—')}</p>
      <p><strong>الجامعة/المعهد:</strong> ${escapeHtml(app.university || '—')}</p>
      <p><strong>سنة التخرج:</strong> ${escapeHtml(app.graduationYear || '—')}</p>
    </div>

    <!-- المهارات -->
    <div style="background:#fdf4fe;border:1px solid #e879f9;border-radius:10px;padding:14px;margin-bottom:14px;">
      <h3 style="margin:0 0 12px 0;color:#a21caf;font-size:15px;">💼 المهارات</h3>
      <p><strong>اللغات:</strong> ${escapeHtml(app.languages || '—')}</p>
      <p><strong>برامج الحاسب:</strong> ${escapeHtml(app.computerSkills || '—')}</p>
      <p><strong>المهارات الفنية:</strong> ${escapeHtml(app.technicalSkills || '—')}</p>
      ${coursesHtml}
    </div>

<!-- بيانات إضافية -->
    <div style="background:#e0e7ff;border:1px solid #a5b4fc;border-radius:10px;padding:14px;margin-bottom:14px;">
      <h3 style="margin:0 0 12px 0;color:#4338ca;font-size:15px;">🚗 بيانات إضافية</h3>
      <p><strong>تاريخ التفرغ للعمل | Available From:</strong> ${escapeHtml(app.availableFrom || '—')}</p>
      <p><strong>هل تمتلك رخصة قيادة؟ | Driving License:</strong> ${escapeHtml(app.drivingLicense === 'yes' ? 'نعم' : app.drivingLicense === 'no' ? 'لا' : '—')}</p>
      <p><strong>هل تقبل العمل خارج محل الإقامة؟ | Will you relocate?:</strong> ${escapeHtml(getRelocateLabel(app.relocate || ''))}</p>
      <p><strong>الجنسية | Nationality:</strong> ${escapeHtml(app.nationality || '—')}</p>
    </div>

<!-- الخبرات السابقة -->
    <div style="background:#fff7ed;border:1px solid #fdba74;border-radius:10px;padding:14px;margin-bottom:14px;">
      <h3 style="margin:0 0 12px 0;color:#c2410c;font-size:15px;">💼 الخبرات السابقة</h3>
      ${experiencesHtml || '<p style="color:#64748b;">لا توجد خبرات مسجلة</p>'}
    </div>

    <!-- الشهادات الإضافية -->
    ${additionalCerts.length > 0 ? `
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px;margin-bottom:14px;">
      <h3 style="margin:0 0 12px 0;color:#166534;font-size:15px;">🏆 الشهادات الإضافية</h3>
      ${additionalCertsHtml}
    </div>
    ` : ''}

    <!-- ملاحظات -->
    <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:14px;margin-bottom:14px;">
      <h3 style="margin:0 0 12px 0;color:#475569;font-size:15px;">📝 ملاحظات</h3>
      <p>${escapeHtml(app.notes || 'لا توجد ملاحظات')}</p>
    </div>

    <!-- البيانات العامة -->
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:14px;">
      <h3 style="margin:0 0 12px 0;color:#0f172a;font-size:15px;">📋 البيانات العامة</h3>
      <p><strong>الوظيفة المطلوبة:</strong> ${escapeHtml(jobDisplay)}</p>
      <p><strong>الكود الوظيفي:</strong> ${escapeHtml(jobCode)}</p>
      <p><strong>رقم الطلب المرجعي:</strong> ${escapeHtml(app.requestRefNumber || app.id || '—')}</p>
      <p><strong>تاريخ التقديم:</strong> ${escapeHtml(formatSubmittedAt(app.submittedAt || app.lastUpdated || app.createdAt))}</p>
      <p><strong>الحالة:</strong> ${escapeHtml(toArabicStatus(app.status || 'في انتظار'))}</p>
    </div>
  `;
  modal.classList.remove('hidden');
}

async function downloadApplicationPDF(id) {
  const app = applications.find(a => a.id === id);
  if (!app) return;

  try {
    // Generate THREE pages - Page 1, 2, and 3
    const [canvasPage1, canvasPage2, canvasPage3] = await Promise.all([
      renderArabicSummaryCanvas(app, 1),
      renderArabicSummaryCanvas(app, 2),
      renderArabicSummaryCanvas(app, 3)
    ]);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageW = 210;
    const pageH = 297;
    const margin = 10;
    const targetW = pageW - margin * 2;

    // Add Page 1
    const ratio1 = canvasPage1.height / canvasPage1.width;
    let targetH1 = targetW * ratio1;
    if (targetH1 > pageH - margin * 2) targetH1 = pageH - margin * 2;
    const x1 = (pageW - targetW) / 2;
    const y1 = margin;
    pdf.addImage(canvasPage1.toDataURL('image/png', 1.0), 'PNG', x1, y1, targetW, targetH1);

    // Add Page 2
    pdf.addPage();
    const ratio2 = canvasPage2.height / canvasPage2.width;
    let targetH2 = targetW * ratio2;
    if (targetH2 > pageH - margin * 2) targetH2 = pageH - margin * 2;
    const x2 = (pageW - targetW) / 2;
    const y2 = margin;
    pdf.addImage(canvasPage2.toDataURL('image/png', 1.0), 'PNG', x2, y2, targetW, targetH2);

    // Add Page 3
    pdf.addPage();
    const ratio3 = canvasPage3.height / canvasPage3.width;
    let targetH3 = targetW * ratio3;
    if (targetH3 > pageH - margin * 2) targetH3 = pageH - margin * 2;
    const x3 = (pageW - targetW) / 2;
    const y3 = margin;
    pdf.addImage(canvasPage3.toDataURL('image/png', 1.0), 'PNG', x3, y3, targetW, targetH3);

    const baseBytes = pdf.output('arraybuffer');
    const merged = await mergeAttachmentsIntoPdf(baseBytes, app.attachments || []);
    const blob = new Blob([merged], { type: 'application/pdf' });

    triggerPdfDownload(blob, app.fullName || app.id);
  } catch (error) {
    console.error('PDF generation error:', error);

    // Fallback مضمون إذا فشل html2canvas - generate 3 pages fallback
    try {
      const { jsPDF } = window.jspdf;
      const fallbackPdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Page 1 content
      const page1Sections = [
        { title: '1 - الوظيفة المطلوبة', rows: [
          { label: 'الوظيفة المتقدم إليها', value: safe(getJobLabel(app.jobPosition)) },
          { label: 'الكود الوظيفي', value: safe(getJobCode(app)) }
        ]},
        { title: '2 - البيانات الشخصية', rows: [
          { label: 'الاسم رباعي', value: safe(app.fullName) },
          { label: 'الرقم القومي', value: safe(app.nationalId) },
          { label: 'تاريخ الميلاد', value: safe(app.dateOfBirth) },
          { label: 'محل الإقامة', value: safe(app.address) },
          { label: 'رقم الهاتف', value: safe(app.phone) },
          { label: 'البريد الإلكتروني', value: safe(app.email) },
          { label: 'الحالة الاجتماعية', value: safe(getMaritalStatusLabel(app.maritalStatus || app.socialStatus || '')) },
          { label: 'النوع', value: safe(getGenderLabel(app.gender || app.sex || '')) }
        ]},
        { title: '3 - البيانات الإضافية', rows: [
          { label: 'تاريخ التفرغ للعمل', value: safe(app.availableFrom) },
          { label: 'رخصة القيادة', value: safe(app.drivingLicense === 'yes' ? 'نعم' : app.drivingLicense === 'no' ? 'لا' : '—') },
          { label: 'العمل خارج المحافظة', value: safe(getRelocateLabel(app.relocate || '')) },
          { label: 'الجنسية', value: safe(app.nationality || '—') }
        ]}
      ];

      let y = 15;
      fallbackPdf.setFontSize(11);
      page1Sections.forEach(section => {
        fallbackPdf.setFontSize(12);
        fallbackPdf.setFont('helvetica', 'bold');
        fallbackPdf.text(section.title, 15, y);
        y += 8;
        fallbackPdf.setFontSize(10);
        fallbackPdf.setFont('helvetica', 'normal');
        section.rows.forEach(row => {
          if (y > 270) { fallbackPdf.addPage(); y = 15; }
          fallbackPdf.text(`${row.label}: ${row.value}`, 15, y);
          y += 6;
        });
        y += 4;
      });

      // Page 2 content
      fallbackPdf.addPage();
      y = 15;

      const page2Sections = [
        { title: '4 - المؤهل العلمي', rows: [
          { label: 'المؤهل', value: safe(app.qualification || app.degree) },
          { label: 'التخصص', value: safe(app.specialization) },
          { label: 'جهة التخرج', value: safe(app.university) },
          { label: 'سنة التخرج', value: safe(app.graduationYear) }
        ]},
        { title: '5 - الخبرات السابقة', rows: [] },
        { title: '6 - المهارات والقدرات', rows: [
          { label: 'اللغات', value: safe(app.languages) },
          { label: 'برامج الحاسب', value: safe(app.computerSkills || app.programs) },
          { label: 'المهارات الفنية', value: safe(app.technicalSkills) },
          { label: 'الدورات التدريبية', value: safe(app.trainingCourses || app.courses) }
        ]}
      ];

      page2Sections.forEach(section => {
        fallbackPdf.setFontSize(12);
        fallbackPdf.setFont('helvetica', 'bold');
        fallbackPdf.text(section.title, 15, y);
        y += 8;
        fallbackPdf.setFontSize(10);
        fallbackPdf.setFont('helvetica', 'normal');
        if (section.rows.length === 0) {
          if (y > 270) { fallbackPdf.addPage(); y = 15; }
          fallbackPdf.text('لا توجد بيانات', 15, y);
          y += 6;
        } else {
          section.rows.forEach(row => {
            if (y > 270) { fallbackPdf.addPage(); y = 15; }
            fallbackPdf.text(`${row.label}: ${row.value}`, 15, y);
            y += 6;
          });
        }
        y += 4;
      });

      // Page 3 content
      fallbackPdf.addPage();
      y = 15;

      const page3Sections = [
        { title: '7 - الشهادات الإضافية', rows: [] },
        { title: '8 - الإقرار والتوقيع', rows: [
          { label: 'حالة الإقرار', value: safe(resolveDeclarationAccepted(app) ? 'موافق' : 'غير موافق') },
          { label: 'اسم المقرر', value: safe(app.signatureName || app.fullName) },
          { label: 'التاريخ', value: safe(app.date || formatSubmittedAt(app.submittedAt || app.lastUpdated || app.createdAt)) }
        ]}
      ];

      page3Sections.forEach(section => {
        fallbackPdf.setFontSize(12);
        fallbackPdf.setFont('helvetica', 'bold');
        fallbackPdf.text(section.title, 15, y);
        y += 8;
        fallbackPdf.setFontSize(10);
        fallbackPdf.setFont('helvetica', 'normal');
        if (section.rows.length === 0) {
          if (y > 270) { fallbackPdf.addPage(); y = 15; }
          fallbackPdf.text('لا توجد بيانات', 15, y);
          y += 6;
        } else {
          section.rows.forEach(row => {
            if (y > 270) { fallbackPdf.addPage(); y = 15; }
            fallbackPdf.text(`${row.label}: ${row.value}`, 15, y);
            y += 6;
          });
        }
        y += 4;
      });

      const baseBytes = fallbackPdf.output('arraybuffer');
      const merged = await mergeAttachmentsIntoPdf(baseBytes, app.attachments || []);
      const blob = new Blob([merged], { type: 'application/pdf' });
      triggerPdfDownload(blob, app.fullName || app.id);
    } catch (fallbackError) {
      console.error('Fallback PDF error:', fallbackError);
      alert('تعذر إنشاء PDF: ' + fallbackError.message);
    }
  }
}

async function mergeAttachmentsIntoPdf(baseArrayBuffer, attachments) {
  const mergedPdf = await PDFLib.PDFDocument.create();

  const basePdf = await PDFLib.PDFDocument.load(baseArrayBuffer);
  const basePages = await mergedPdf.copyPages(basePdf, basePdf.getPageIndices());
  basePages.forEach(p => mergedPdf.addPage(p));

  if (!attachments || !Array.isArray(attachments)) {
    return await mergedPdf.save();
  }

  // Process ALL attachments - NO SKIPPING
  const supportedImageTypes = ['data:image/png', 'data:image/jpeg', 'data:image/jpg', 'data:image/jpe', 'data:image/gif', 'data:image/bmp', 'data:image/webp'];

  for (const item of attachments) {
    try {
      const dataUrl = item?.dataUrl;
      const name = item?.name || 'attachment';
      
      // If no dataUrl, skip this attachment but log it
      if (!dataUrl || typeof dataUrl !== 'string') {
        console.log('[MISSING DATA] Attachment has no dataUrl:', name);
        continue;
      }

      const isPdf = dataUrl.startsWith('data:application/pdf');
      const isImage = supportedImageTypes.some(t => dataUrl.startsWith(t));
      
      if (isPdf) {
        // Process PDF - try without minimum size check
        const bytes = dataURLToUint8Array(dataUrl);
        
        try {
          const srcPdf = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
          const pageCount = srcPdf.getPageCount();
          const pages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
          pages.forEach(p => mergedPdf.addPage(p));
          console.log(`[ADDED] PDF: ${name} (${pageCount} pages)`);
        } catch (pdfErr) {
          console.log('[PDF ERROR] Could not load PDF:', name, pdfErr.message);
          // Try to embed as image as fallback
        }
        continue;
      }

      if (isImage) {
        // Process image - try to embed no matter what
        const imageBytes = dataURLToUint8Array(dataUrl);
        
        const imgPdf = await PDFLib.PDFDocument.create();
        const page = imgPdf.addPage([595.28, 841.89]); // A4 points

        let image;
        try {
          // Try PNG first
          if (dataUrl.startsWith('data:image/png') || dataUrl.startsWith('data:image/gif') || dataUrl.startsWith('data:image/bmp')) {
            image = await imgPdf.embedPng(imageBytes);
          } else {
            // Try JPEG
            image = await imgPdf.embedJpg(imageBytes);
          }
        } catch (imgError) {
          // If JPEG fails, try PNG
          try {
            console.log('[RETRY] Trying PNG for:', name);
            image = await imgPdf.embedPng(imageBytes);
          } catch (pngError) {
            // Last resort - create a page with text placeholder
            console.log('[FAILED] Could not embed image:', name, imgError.message);
            page.drawText('Attachment: ' + name, { x: 50, y: 750, size: 12 });
            const imgPdfBytes = await imgPdf.save();
            const imgDoc = await PDFLib.PDFDocument.load(imgPdfBytes);
            const imgPages = await mergedPdf.copyPages(imgDoc, imgDoc.getPageIndices());
            imgPages.forEach(p => mergedPdf.addPage(p));
            continue;
          }
        }

        const dims = image.scale(1);
        const maxW = 535;
        const maxH = 760;
        const scale = Math.min(maxW / dims.width, maxH / dims.height, 1);
        const w = dims.width * scale;
        const h = dims.height * scale;
        const x = (595.28 - w) / 2;
        const y = (841.89 - h) / 2;

        page.drawImage(image, { x, y, width: w, height: h });

        const imgPdfBytes = await imgPdf.save();
        const imgDoc = await PDFLib.PDFDocument.load(imgPdfBytes);
        const imgPages = await mergedPdf.copyPages(imgDoc, imgDoc.getPageIndices());
        imgPages.forEach(p => mergedPdf.addPage(p));
        console.log(`[ADDED] Image: ${name}`);
      }
      
      // If neither PDF nor image, just log and skip
      if (!isPdf && !isImage) {
        console.log('[SKIP TYPE] Unsupported type:', name);
      }
    } catch (attachmentError) {
      console.log('[ERROR] Could not process:', item?.name, attachmentError.message);
      // Continue with other attachments
    }
  }

  return await mergedPdf.save();
}

async function renderArabicSummaryCanvas(app, pageNum) {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-99999px';
  wrapper.style.top = '0';
  wrapper.style.width = '1400px';
  wrapper.style.background = '#ffffff';
  wrapper.style.color = '#0f172a';
  wrapper.style.padding = '40px';
  wrapper.style.direction = 'rtl';
  wrapper.style.fontFamily = "'Tahoma','Arial','Segoe UI',sans-serif";
  wrapper.style.lineHeight = '1.8';

  const allSections = buildApplicantSummarySections(app);
  let summary;
  
if (pageNum === 1) {
    // Page 1: الوظيفة المطلوبة + البيانات الشخصية + البيانات الإضافية (sections 0-2)
    summary = { sections: allSections.sections.filter((s, i) => i < 3) };
  } else if (pageNum === 2) {
    // Page 2: المؤهل العلمي + الخبرات + المهارات (sections 3-5)
    summary = { sections: allSections.sections.filter((s, i) => i >= 3 && i < 6) };
  } else if (pageNum === 3) {
    // Page 3: الشهادات + الإقرار (sections 6-7)
    summary = { sections: allSections.sections.filter((s, i) => i >= 6) };
  } else {
    summary = allSections;
  }
  
  const metaDate = formatSubmittedAt(app.submittedAt || app.lastUpdated || app.createdAt);
  const refNo = safe(app.requestRefNumber || app.id);
  const statusText = safe(toArabicStatus(app.status || 'جديد'));
  const statusStyle = getStatusBadgeStyle(statusText);

const renderArabicTitleAsImage = (titleText) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1400;
    canvas.height = 220;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#3b82f6';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    ctx.font = '900 110px "Tahoma","Arial","Segoe UI",sans-serif';
    ctx.fillText(String(titleText || ''), canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL('image/png');
  };

  const sectionHtml = summary.sections.map(section => {
    const sectionTitleImg = renderArabicTitleAsImage(section.title);
    const isPersonalSection = section.title === 'البيانات الشخصية';

const rowsHtml = isPersonalSection
      ? `
        <div style="background:#ffffff;border:1px solid #3b82f6;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(59,130,246,.15);">
          ${section.rows.map((row, idx) => `
            <div style="display:grid;grid-template-columns:300px 1fr;align-items:center;min-height:58px;border-bottom:${idx === section.rows.length - 1 ? '0' : '1px solid #dbeafe'};">
              <div style="padding:14px 16px;font-size:22px;font-weight:800;color:#1e3a8a;background:#eff6ff;">
                ${escapeHtml(row.label)}
              </div>
<div style="padding:14px 16px;font-size:32px;font-weight:700;color:#1e2937;text-align:right;background:#ffffff;">
                ${escapeHtml(row.value)}
              </div>
            </div>
          `).join('')}
        </div>
      `
      : `
        <div style="background:#ffffff;border:1px solid #3b82f6;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(59,130,246,.15);">
          ${section.rows.map((row, idx) => `
            <div style="display:grid;grid-template-columns:280px 1fr;gap:0;align-items:center;min-height:54px;border-bottom:${idx === section.rows.length - 1 ? '0' : '1px solid #dbeafe'};">
              <div style="padding:12px 16px;font-size:22px;font-weight:800;color:#1e3a8a;background:#eff6ff;border-left:2px solid #3b82f6;">
                ${escapeHtml(row.label)}
              </div>
              <div style="padding:12px 16px;font-size:32px;font-weight:700;color:#1e2937;">
                ${escapeHtml(row.value)}
              </div>
            </div>
          `).join('')}
        </div>
      `;

return `
      <section style="background:#ffffff;border:2px solid #3b82f6;border-radius:14px;padding:16px 16px 12px;margin-bottom:14px;box-shadow:0 6px 20px rgba(37,99,235,.12);">
        <div style="background:linear-gradient(180deg,#4fa0f5 0%,#2563eb 100%);color:#ffffff;border-radius:10px;padding:12px 16px;margin-bottom:12px;text-align:center;box-shadow:0 4px 10px rgba(59,130,246,.3);">
          <span style="font-size:36px;font-weight:900;font-family:Tahoma,Arial,sans-serif;">${escapeHtml(section.title)}</span>
        </div>
        ${rowsHtml || '<div style="color:#64748b;padding:10px;font-size:20px;">لا توجد بيانات</div>'}
      </section>
    `;
  }).join('');

// Build header HTML - only for Page 1 (CV-style layout)
  const headerHtml = pageNum === 1 ? `
    <!-- Company Header -->
    <div style="background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);border-radius:18px 18px 0 0;padding:18px 28px;color:#ffffff;box-shadow:0 6px 16px rgba(59,130,246,.35);">
      <div style="text-align:center;">
        <div style="font-size:30px;font-weight:900;line-height:1.4;margin-bottom:4px;">نموذج رسمي — قطاع تكنولوجيا النظم والمعلومات</div>
        <div style="font-size:22px;font-weight:700;opacity:.92;">شركة التعمير لإدارة المرافق | وزارة الإسكان المصرية</div>
      </div>
    </div>

    <!-- CV Applicant Card -->
    <div style="background:#eff6ff;border:2px solid #3b82f6;border-top:0;border-radius:0 0 18px 18px;padding:22px 24px 20px;margin-bottom:20px;">
      <div style="display:flex;gap:22px;align-items:stretch;flex-direction:row-reverse;">

        <!-- Photo block (right side in RTL) -->
        ${app.profilePhoto ? `
        <div style="flex-shrink:0;display:flex;align-items:center;justify-content:center;">
          <div style="position:relative;">
            <img src="${app.profilePhoto}"
              style="width:185px;height:230px;object-fit:cover;border-radius:14px;border:4px solid #3b82f6;box-shadow:0 6px 20px rgba(59,130,246,.35);display:block;">
            <div style="position:absolute;bottom:-10px;left:50%;transform:translateX(-50%);background:#3b82f6;color:white;font-size:14px;font-weight:800;padding:4px 14px;border-radius:999px;white-space:nowrap;">صورة شخصية</div>
          </div>
        </div>` : ''}

        <!-- Applicant info (left side in RTL) -->
        <div style="flex:1;display:flex;flex-direction:column;justify-content:space-between;gap:12px;">

          <!-- Name + position -->
          <div>
            <div style="font-size:38px;font-weight:900;color:#1e3a8a;line-height:1.3;margin-bottom:6px;">${escapeHtml(app.fullName || '—')}</div>
            <div style="font-size:22px;font-weight:700;color:#2563eb;background:#dbeafe;display:inline-block;padding:4px 16px;border-radius:8px;">
              ${escapeHtml(app.jobPosition || '—')}
            </div>
          </div>

          <!-- Info grid -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div style="background:#ffffff;border:1.5px solid #bfdbfe;border-radius:10px;padding:10px 14px;">
              <div style="font-size:16px;color:#64748b;font-weight:700;margin-bottom:2px;">رقم الهاتف</div>
              <div style="font-size:20px;font-weight:800;color:#1e3a8a;">${escapeHtml(app.phone || '—')}</div>
            </div>
            <div style="background:#ffffff;border:1.5px solid #bfdbfe;border-radius:10px;padding:10px 14px;">
              <div style="font-size:16px;color:#64748b;font-weight:700;margin-bottom:2px;">الرقم القومي</div>
              <div style="font-size:20px;font-weight:800;color:#1e3a8a;">${escapeHtml(app.nationalId || '—')}</div>
            </div>
            <div style="background:#ffffff;border:1.5px solid #bfdbfe;border-radius:10px;padding:10px 14px;">
              <div style="font-size:16px;color:#64748b;font-weight:700;margin-bottom:2px;">الرقم المرجعي</div>
              <div style="font-size:22px;font-weight:900;color:#0b5ed7;">${escapeHtml(refNo)}</div>
            </div>
            <div style="background:#ffffff;border:1.5px solid #bfdbfe;border-radius:10px;padding:10px 14px;">
              <div style="font-size:16px;color:#64748b;font-weight:700;margin-bottom:2px;">حالة الطلب</div>
              <div style="font-size:18px;font-weight:800;"><span style="${statusStyle};padding:3px 12px;border-radius:999px;">${escapeHtml(statusText)}</span></div>
            </div>
          </div>

          <!-- Date -->
          <div style="color:#64748b;font-size:16px;font-weight:600;text-align:left;">
            📅 تاريخ التقديم: ${escapeHtml(metaDate)}
          </div>
        </div>

      </div>
    </div>
  ` : '';

// Build footer HTML - only for Page 3
  const footerHtml = pageNum === 3 ? `
    <div style="border:2px solid #3b82f6;border-radius:18px;padding:18px 22px;background:#ffffff;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;font-size:22px;color:#374151;font-weight:700;">
        <div style="text-align:right;">تاريخ التقديم: ${escapeHtml(metaDate)}</div>
        <div style="text-align:left;">آخر تحديث للحالة: ${escapeHtml(metaDate)}</div>
      </div>
      <div style="margin-top:18px;text-align:center;color:#64748b;font-size:22px;font-weight:700;">
        قطاع تكنولوجيا النظم والمعلومات بشركة التعمير لإدارة المرافق
      </div>
    </div>
  ` : '';

  wrapper.innerHTML = `
    ${headerHtml}
    ${sectionHtml}
    ${footerHtml}
  `;

  document.body.appendChild(wrapper);
  const canvas = await html2canvas(wrapper, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    foreignObjectRendering: false,
    backgroundColor: '#f8fafc',
    logging: false,
    imageTimeout: 15000,
    onclone: (doc) => {
      // Ensure all img elements in clone have crossOrigin set
      doc.querySelectorAll('img').forEach(img => {
        if (img.src && img.src.startsWith('data:')) {
          img.crossOrigin = null; // data URLs don't need CORS
        }
      });
    }
  });
  document.body.removeChild(wrapper);
  return canvas;
}

function buildApplicantModelRows(app) {
  const rows = [];

  buildApplicantSummarySections(app).sections.forEach((section) => {
    section.rows.forEach((row) => rows.push({ label: `${section.title} - ${row.label}`, value: row.value }));
  });

  return rows;
}

function buildApplicantSummarySections(app) {
  const isMale = (app.gender || app.sex || '').toLowerCase() === 'male';

  // Section 1: Job Position - الوظيفة المطلوبة
  const jobRows = [
    { label: 'الوظيفة المتقدم إليها', value: safe(getJobLabel(app.jobPosition)) },
    { label: 'الكود الوظيفي', value: safe(getJobCode(app)) }
  ];

// Section 2: Personal Data - البيانات الشخصية
const personalRows = [
    { label: 'الاسم رباعي', value: safe(app.fullName) },
    { label: 'تاريخ الميلاد', value: safe(app.dateOfBirth) },
    { label: 'محل الإقامة', value: safe(app.address) },
    { label: 'رقم الهاتف', value: safe(app.phone) },
    { label: 'البريد الإلكتروني', value: safe(app.email) },
    { label: 'الحالة الاجتماعية', value: safe(getMaritalStatusLabel(app.maritalStatus || app.socialStatus || '')) },
    { label: 'جنس المتقدم', value: safe(getGenderLabel(app.gender || app.sex || '')) },
    { label: 'الرقم القومي', value: safe(app.nationalId) },
    ...(isMale ? [{ label: 'الموقف من التجنيد', value: safe(getMilitaryStatusLabel(app.militaryStatus || '')) }] : [])
];

// Section 2-1: Additional Data - البيانات الإضافية (General Data)
const additionalDataRows = [
    { label: 'تاريخ التفرغ للعمل | Available From', value: safe(app.availableFrom) },
    { label: 'هل تمتلك رخصة قيادة؟ | Driving License', value: safe(app.drivingLicense === 'yes' ? 'نعم' : app.drivingLicense === 'no' ? 'لا' : '—') },
    { label: 'هل تقبل العمل خارج محل الإقامة؟ | Will you relocate?', value: safe(getRelocateLabel(app.relocate || '')) },
    { label: 'الجنسية | Nationality', value: safe(app.nationality || '—') }
];

// Section 3: Education - المؤهل العلمي
const educationRows = [
    { label: 'المؤهل', value: safe(app.qualification || app.degree) },
    { label: 'جهة التخرج', value: safe(app.university) },
    { label: 'التخصص', value: safe(app.specialization) },
    { label: 'سنة التخرج', value: safe(app.graduationYear) }
];

const notesRows = [
    { label: 'الملاحظات', value: safe(app.notes) }
  ];

// Section 4: Previous Experience - الخبرات السابقة
  const experienceRows = [];
  
  // Try to get experiences from multiple sources
  let experiences = [];
  
  // First try indexed groups (company0, jobTitle0, etc. - starts from 0)
  experiences = collectIndexedGroups(app, ['company', 'jobTitle', 'workDuration', 'employmentDuration', 'experienceDescription']);
  
  // If no experiences found, try array field
  if (!experiences || experiences.length === 0) {
    if (app.experiences && Array.isArray(app.experiences)) {
      experiences = app.experiences;
    }
  }
  
  // If still no experiences, try legacy field names
  if (!experiences || experiences.length === 0) {
    for (let i = 0; i <= 10; i++) {
      const company = app['company' + i] || app['company'];
      const jobTitle = app['jobTitle' + i] || app['jobTitle'];
      const workDuration = app['workDuration' + i] || app['workDuration'] || app['employmentDuration'];
      const description = app['experienceDescription' + i] || app['experienceDescription'];
      if (company || jobTitle || workDuration) {
        experiences.push({
          company: company,
          jobTitle: jobTitle,
          workDuration: workDuration,
          experienceDescription: description
        });
      }
    }
  }
  
  // If still no experiences, check non-indexed fields
  if (!experiences || experiences.length === 0) {
    if (app.company || app.jobTitle || app.workDuration) {
      experiences.push({
        company: app.company || '',
        jobTitle: app.jobTitle || '',
        workDuration: app.workDuration || app.employmentDuration || '',
        experienceDescription: app.experienceDescription || ''
      });
    }
  }
  
  if (experiences && experiences.length > 0) {
    experiences.forEach((exp, i) => {
      if (exp.company || exp.jobTitle || exp.workDuration || exp.duration) {
        experienceRows.push({ label: `خبرة ${i + 1} - جهة العمل`, value: safe(exp.company || exp.employer || '—') });
        experienceRows.push({ label: `خبرة ${i + 1} - الوظيفة`, value: safe(exp.jobTitle || exp.position || exp.title || '—') });
        experienceRows.push({ label: `خبرة ${i + 1} - مدة العمل`, value: safe(exp.workDuration || exp.employmentDuration || exp.duration || '—') });
        if (exp.experienceDescription || exp.description) {
          experienceRows.push({ label: `خبرة ${i + 1} - الوصف`, value: safe(exp.experienceDescription || exp.description) });
        }
      }
    });
  }
  
  if (experienceRows.length === 0) {
    experienceRows.push({ label: 'الخبرات', value: 'لا توجد خبرات سابقة' });
  }

  // Section 5: Skills and Capabilities - المهارات والقدرات
  const section5SkillsRows = [
    { label: 'اللغات', value: safe(app.languages) },
    { label: 'برامج الحاسب الآلي', value: safe(app.computerSkills || app.programs) },
    { label: 'الدورات التدريبية والشهادات', value: safe(app.trainingCourses || app.courses) },
    { label: 'المهارات الفنية', value: safe(app.technicalSkills) }
  ];

  // Section 6: Additional Certificates - الشهادات الإضافية
  const section6CertificateRows = [];
  
  // Collect from indexed groups (additionalCertificateName0, additionalCertificateName2, additionalCertificateName3, etc.)
  const newCerts = collectIndexedGroups(app, ['additionalCertificateName', 'additionalCertificateIssuer', 'additionalCertificateDate']);
  
  // If indexed certificates not found, check for non-indexed first certificate
  if (!newCerts || newCerts.length === 0) {
    const firstCert = {
      additionalCertificateName: app.additionalCertificateName || app.certificateName || '',
      additionalCertificateIssuer: app.additionalCertificateIssuer || app.certificateIssuer || '',
      additionalCertificateDate: app.additionalCertificateDate || app.certificateDate || ''
    };
    
    if (firstCert.additionalCertificateName) {
      newCerts.push(firstCert);
    }
  }
  
  newCerts.forEach((c, i) => {
    if (c.additionalCertificateName) {
      section6CertificateRows.push({ label: `شهادة ${i + 1} - الاسم`, value: safe(c.additionalCertificateName) });
      section6CertificateRows.push({ label: `شهادة ${i + 1} - جهة الإصدار`, value: safe(c.additionalCertificateIssuer) });
      section6CertificateRows.push({ label: `شهادة ${i + 1} - التاريخ`, value: safe(c.additionalCertificateDate) });
    }
  });
  
  const oldCerts = collectIndexedGroups(app, ['additionalCertificateName', 'additionalCertificateFileName']);
  oldCerts.forEach((c, i) => {
    if (c.additionalCertificateName && !newCerts.find(nc => nc.additionalCertificateName === c.additionalCertificateName)) {
      section6CertificateRows.push({ label: `شهادة ${i + newCerts.length + 1} - الاسم`, value: safe(c.additionalCertificateName) });
      section6CertificateRows.push({ label: `شهادة ${i + newCerts.length + 1} - الملف`, value: safe(c.additionalCertificateFileName) });
    }
  });
  if (section6CertificateRows.length === 0) {
    section6CertificateRows.push({ label: 'الشهادات الإضافية', value: 'لا توجد شهادات إضافية' });
  }

  // Check if we have actual certificates (not just the empty message)
  const hasCertificates = section6CertificateRows.length > 0 && 
    !(section6CertificateRows.length === 1 && section6CertificateRows[0].value === 'لا توجد شهادات إضافية');

  // Section 7: Declaration & Signature - الإقرار والتوقيع
  const declarationAccepted = resolveDeclarationAccepted(app);
  const fixedDeclarationText = 'أقر بان البيانات والمستندات المقدمة والموافقة على مشاركة البيانات بشكل واضح مع الشركة لغرض التوظيف';
  const declarationRows = [
    { label: 'الإقرار', value: declarationAccepted ? 'موافق' : 'غير موافق' },
    { label: 'نص الإقرار', value: safe(fixedDeclarationText) },
    { label: 'اسم المقرر', value: safe(app.signatureName || app.fullName) },
    { label: 'التاريخ', value: safe(app.date || formatSubmittedAt(app.submittedAt || app.lastUpdated || app.createdAt)) },
    { label: 'ملاحظات إضافية', value: safe(app.notes) }
  ];

  // Attachments count
  const atts = Array.isArray(app.attachments) ? app.attachments : [];
  const visibleAtts = atts.filter((a) => !isSystemLogoAttachment(a));
  const attachmentSectionRows = visibleAtts.length > 0 
    ? [{ label: 'عدد المرفقات', value: String(visibleAtts.length) }]
    : [];

return {
    sections: [
      { title: '1 - الوظيفة المطلوبة', rows: jobRows },
      { title: '2 - البيانات الشخصية', rows: personalRows },
      { title: '3 - البيانات الإضافية', rows: additionalDataRows },
      { title: '4 - المؤهل العلمي', rows: educationRows },
      { title: '5 - الخبرات السابقة', rows: experienceRows },
      { title: '6 - المهارات والقدرات', rows: section5SkillsRows },
      ...(hasCertificates ? [{ title: '7 - الشهادات الإضافية', rows: section6CertificateRows }] : []),
      { title: '8 - الإقرار والتوقيع', rows: declarationRows },
      ...(visibleAtts.length > 0 ? [{ title: 'المرفقات', rows: attachmentSectionRows }] : [])
    ]
  };
}

// Helper to find value using aliases
function findFieldValue(obj, keys) {
  for (const k of keys) {
    const v = obj[k];
    if (v && typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

// FIXED: collectIndexedGroups - handles ALL experience field formats
// Supports: company0, company2, company (non-indexed), experiences[] array, employer alias, etc.
function collectIndexedGroups(app, baseKeys) {
  const indexSet = new Set();
  const foundItems = {};

  if (!app) return [];

  // FIRST: Try to match indexed fields ONLY (e.g., 'company0', 'jobTitle1', 'company2', etc.)
  Object.keys(app || {}).forEach((k) => {
    baseKeys.forEach((base) => {
      const m = k.match(new RegExp(`^${base}(\\d+)$`));
      if (m) {
        const idx = Number(m[1]);
        indexSet.add(idx);
        if (!foundItems[idx]) foundItems[idx] = {};
        foundItems[idx][base] = app[k];
      }
    });
  });

  // If indexed matches found, return them directly (do NOT include non-indexed, even if they exist)
  if (indexSet.size > 0) {
    return Array.from(indexSet).sort((a, b) => a - b).map((idx) => foundItems[idx] || {}).filter(entry => {
      return entry && Object.values(entry).some(v => v && String(v).trim());
    });
  }

  // SECOND: Try non-indexed field names using aliases ONLY if no indexed fields were found
  baseKeys.forEach((base) => {
    const aliases = fieldAliases[base] || [base];
    const val = findFieldValue(app, aliases);
    if (val) {
      indexSet.add(0);
      if (!foundItems[0]) foundItems[0] = {};
      foundItems[0][base] = val;
    }
  });

  if (indexSet.size > 0) {
    return Array.from(indexSet).sort((a, b) => a - b).map((idx) => foundItems[idx] || {});
  }

  // THIRD: Handle array-type fields (experiences[], certificates[], additionalCertificates[])
  const arrayFields = ['experiences', 'certificates', 'additionalCertificates'];
  arrayFields.forEach((arrayField) => {
    if (app[arrayField] && Array.isArray(app[arrayField])) {
      app[arrayField].forEach((item, idx) => {
        if (item && (item.company || item.jobTitle || item.name || item.certificateName || item.position || item.employer)) {
          indexSet.add(idx);
          const itemData = {};
          baseKeys.forEach(base => {
            const aliases = fieldAliases[base] || [base];
            const val = findFieldValue(item, aliases);
            
            // Map to correct key name
            if (base === 'company') itemData.company = val || item.employer;
            else if (base === 'jobTitle') itemData.jobTitle = val || item.position || item.title;
            else if (base === 'workDuration' || base === 'employmentDuration') itemData.workDuration = val || item.duration;
            else if (base === 'experienceDescription') itemData.experienceDescription = val || item.description;
            else if (base === 'additionalCertificateName') itemData.additionalCertificateName = val;
            else if (base === 'additionalCertificateIssuer') itemData.additionalCertificateIssuer = val;
            else if (base === 'additionalCertificateDate') itemData.additionalCertificateDate = val;
          });
          if (!foundItems[idx]) foundItems[idx] = {};
          Object.assign(foundItems[idx], itemData);
        }
      });
    }
  });

  if (indexSet.size > 0) {
    return Array.from(indexSet).sort((a, b) => a - b).map((idx) => foundItems[idx] || {});
  }

  // FOURTH: Handle comma-separated values as fallback
  baseKeys.forEach((base) => {
    const aliases = fieldAliases[base] || [base];
    const val = findFieldValue(app, aliases);
    if (val && val.includes(',')) {
      const parts = val.split(',').map(s => s.trim()).filter(Boolean);
      parts.forEach((part, idx) => {
        indexSet.add(idx);
        if (!foundItems[idx]) foundItems[idx] = {};
        if (base === 'company') foundItems[idx].company = part;
        else if (base === 'jobTitle') foundItems[idx].jobTitle = part;
        else if (base === 'workDuration' || base === 'employmentDuration') foundItems[idx].workDuration = part;
        else if (base === 'additionalCertificateName') foundItems[idx].additionalCertificateName = part;
      });
    }
  });

  return Array.from(indexSet).sort((a, b) => a - b).map((idx) => {
    if (foundItems[idx]) return foundItems[idx];
    const item = {};
    baseKeys.forEach((base) => {
      const aliases = fieldAliases[base] || [base];
      item[base] = findFieldValue(app, aliases);
    });
    return item;
  });
}

function normalizeStatusValue(status) {
  const s = String(status || '').toLowerCase().trim();

  if (s.includes('accept') || s.includes('approved') || s.includes('مقبول')) return 'مقبول';
  if (s.includes('reject') || s.includes('رفض') || s.includes('مرفوض')) return 'مرفوض';
  if (s === 'new' || s.includes('new') || s.includes('جديد')) return 'جديد';
  if (s.includes('review') || s.includes('pending') || s.includes('قيد') || s.includes('انتظار')) return 'في انتظار';

  if (status === 'جديد' || status === 'في انتظار' || status === 'مقبول' || status === 'مرفوض') return status;
  if (status === 'في الانتظار') return 'في انتظار';
  return 'جديد';
}

function buildStatusOptions(status) {
  const current = normalizeStatusValue(status);
  const options = ['جديد', 'في انتظار', 'مقبول', 'مرفوض'];
  return options.map(opt => `<option value="${opt}" ${opt === current ? 'selected' : ''}>${opt}</option>`).join('');
}

async function updateApplicationStatus(id, status) {
  if (!id || !rtdb) return;

  try {
    const normalized = normalizeStatusValue(status);
    await rtdb.ref(`applications/${id}`).update({
      status: normalized,
      lastUpdated: new Date().toISOString()
    });

    const idx = applications.findIndex(a => a.id === id);
    if (idx >= 0) {
      applications[idx].status = normalized;
      applications[idx].lastUpdated = new Date().toISOString();
    }
  } catch (err) {
    console.error('Status update failed:', err);
    alert('تعذر تحديث الحالة');
    applyFilters();
  }
}

function toArabicStatus(status) {
  const s = String(status || '').toLowerCase().trim();

  if (!s) return 'جديد';
  if (s.includes('accept') || s.includes('approved') || s.includes('مقبول')) return 'مقبول';
  if (s.includes('reject') || s.includes('رفض') || s.includes('مرفوض')) return 'مرفوض';
  if (s === 'new' || s.includes('new') || s.includes('جديد')) return 'جديد';
  if (s.includes('review') || s.includes('pending') || s.includes('قيد') || s.includes('انتظار')) return 'في انتظار';

  return 'جديد';
}

function getStatusBadgeStyle(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('accept') || s.includes('approved') || s.includes('مقبول')) {
    return 'background:#dcfce7;color:#166534;border:1px solid #86efac;';
  }
  if (s.includes('reject') || s.includes('رفض') || s.includes('مرفوض')) {
    return 'background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;';
  }
  if (s.includes('review') || s.includes('pending') || s.includes('قيد')) {
    return 'background:#fef3c7;color:#92400e;border:1px solid #fcd34d;';
  }
  return 'background:#dbeafe;color:#1e3a8a;border:1px solid #93c5fd;';
}

function isSystemLogoAttachment(att) {
  const name = String(att?.name || '').toLowerCase().trim();
  const logoNames = ['tameer-logo.png', 'ministry-logo.png'];
  return logoNames.includes(name);
}

function triggerPdfDownload(blob, fileBaseName) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `application-${sanitizeFileName(fileBaseName)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

function dataURLToUint8Array(dataURL) {
  const base64 = dataURL.split(',')[1] || '';
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function resolveDeclarationAccepted(app) {
  const candidates = [
    app?.declaration,
    app?.declarationAccepted,
    app?.acceptDeclaration,
    app?.agreeDeclaration,
    app?.isDeclarationAccepted,
    app?.acknowledged
  ];

  for (const v of candidates) {
    if (v === true) return true;
    const s = String(v || '').toLowerCase().trim();
    if (['true', '1', 'yes', 'on', 'موافق', 'تمت الموافقة'].includes(s)) return true;
  }

  return false;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#39;');
}

function sanitizeFileName(value) {
  return String(value || 'application')
    .replace(/[\/:*?"<>|]+/g, '-')
    .trim();
}

function safe(v) {
  return String(v || '—');
}

function getMaritalStatusLabel(value) {
  const v = String(value || '').trim().toLowerCase();
  const map = {
    single: 'أعزب / عزباء',
    married: 'متزوج / متزوجة',
    divorced: 'مطلق / مطلقة',
    widowed: 'أرمل / أرملة'
  };
  return map[v] || (value ? String(value) : '—');
}

function getGenderLabel(value) {
  const v = String(value || '').trim().toLowerCase();
  const map = {
    male: 'ذكر',
    female: 'أنثى'
  };
  return map[v] || (value ? String(value) : '—');
}

function getMilitaryStatusLabel(value) {
  const v = String(value || '').trim().toLowerCase();
  const map = {
    exempted: 'معفي',
    completed: 'أدى الخدمة',
    postponed: 'مؤجل',
    not_due: 'لم يحن الوقت'
  };
  return map[v] || (value ? String(value) : '—');
}

function getRelocateLabel(value) {
  const v = String(value || '').trim().toLowerCase();
  const map = {
    yes: 'نعم، أقبل العمل في أي مكان',
    within_city: 'أفضل العمل داخل المحافظة فقط',
    no: 'لا، أفضّل العمل في نفس المدينة'
  };
  return map[v] || (value ? String(value) : '—');
}

function normalizeJobKey(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[\u200f\u200e]/g, '')
    .replace(/[\s\-\/]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const arabicJobAliases = {
  'مهندس مدني': 'civil_engineer',
  'مهندس عمارة': 'architect',
  'مهندس كهرباء': 'electrical_engineer',
  'مهندس ميكانيكا': 'mechanical_engineer',
  'مهندس تخطيط': 'planning_engineer',
  'مهندس مكتب فني': 'technical_office_engineer',
  'مهندس تنفيذ': 'execution_engineer',
  'مهندس إدارة مشروعات': 'project_manager',
  'مهندس نظم وتحول رقمي': 'systems_engineer',
  'مهندس أمن سيبراني': 'cybersecurity_engineer',
  'مهندس شبكات': 'network_engineer',
  'محاسب مالية': 'financial_accountant',
  'محاسب تكاليف': 'cost_accountant',
  'محاسب خزينة': 'treasury_accountant',
  'محاسب مراجعة': 'audit_accountant',
  'محاسب ضرائب': 'tax_accountant',
  'محاسب بنوك': 'bank_accountant',
  'موارد بشرية': 'hr',
  'شؤون إدارية': 'admin_affairs',
  'سكرتارية': 'secretary',
  'متابعة': 'follow_up',
  'متخصص تسويق وتطوير أعمال': 'marketing_business',
  'مشرف مواقع': 'site_supervisor',
  'مشرف تنفيذ': 'execution_supervisor',
  'فني سباكة': 'plumbing_technician',
  'فني كهرباء': 'electrical_technician',
  'فني تكييف': 'ac_technician',
  'فني تشغيل وصيانة': 'operation_maintenance',
  'فني نجارة': 'carpentry_technician',
  'فني حدادة': 'welding_technician',
  'فني تشطيبات': 'finishing_technician'
};

// Field aliases - map different possible field names to standard keys
const fieldAliases = {
  'company': ['company', 'companyName', 'employer', 'previousCompany'],
  'jobTitle': ['jobTitle', 'position', 'title', 'job_title'],
  'workDuration': ['workDuration', 'employmentDuration', 'duration', 'period'],
  'experienceDescription': ['experienceDescription', 'description', 'responsibilities', 'achievements'],
  'additionalCertificateName': ['additionalCertificateName', 'certificateName', 'certName', 'name'],
  'additionalCertificateIssuer': ['additionalCertificateIssuer', 'certificateIssuer', 'issuer'],
  'additionalCertificateDate': ['additionalCertificateDate', 'certificateDate', 'issueDate', 'date']
};

// Helper to find value from aliases
function findFieldValue(obj, keys) {
  for (const k of keys) {
    const v = obj[k];
    if (v && typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function getJobCode(app) {
  const fromApplication = (
    app?.jobRefNumber ||
    app?.jobCode ||
    app?.jobReference ||
    app?.jobId
  );

  if (fromApplication) return safe(fromApplication);

  const positionRaw = String(app?.jobPosition || '').trim();
  const normalizedPosition = normalizeJobKey(positionRaw);

  const directMapping =
    jobReferenceByPosition[positionRaw] ||
    jobReferenceByPosition[positionRaw.toLowerCase()] ||
    jobReferenceByPosition[normalizedPosition];

  if (directMapping) return safe(directMapping);

  const arabicAliasKey = arabicJobAliases[positionRaw] || arabicJobAliases[getJobLabel(positionRaw)];
  if (arabicAliasKey && jobReferenceByPosition[arabicAliasKey]) {
    return safe(jobReferenceByPosition[arabicAliasKey]);
  }

  const normalizedMapEntry = Object.keys(jobReferenceByPosition).find(
    (k) => normalizeJobKey(k) === normalizedPosition
  );
  if (normalizedMapEntry) return safe(jobReferenceByPosition[normalizedMapEntry]);

  return 'N/A';
}

function formatSubmittedAt(ts) {
  const ms = getTimestampValue(ts);
  if (!ms) return '—';
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('ar-EG');
}

function getTimestampValue(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  const parsed = Date.parse(ts);
  return Number.isNaN(parsed) ? 0 : parsed;
}

// Download individual section PDF
async function downloadSectionPDF(id, sectionId) {
  const app = applications.find(a => a.id === id);
  if (!app) return;

  const sectionInfo = {
    'section1': { title: 'الوظيفة المطلوبة', rows: [
      { label: 'الوظيفة المتقدم إليها', value: safe(getJobLabel(app.jobPosition)) },
      { label: 'الكود الوظيفي', value: safe(getJobCode(app)) }
    ]},
    'section2': { title: 'البيانات الشخصية', rows: [
      { label: 'الاسم رباعي', value: safe(app.fullName) },
      { label: 'الرقم القومي', value: safe(app.nationalId) },
      { label: 'محل الإقامة', value: safe(app.address) },
      { label: 'رقم الهاتف', value: safe(app.phone) },
      { label: 'البريد الإلكتروني', value: safe(app.email) }
    ]},
    'section3': { title: 'البيانات الإضافية', rows: [
      { label: 'تاريخ الميلاد', value: safe(app.dateOfBirth) },
      { label: 'الحالة الاجتماعية', value: safe(getMaritalStatusLabel(app.maritalStatus || app.socialStatus || '')) },
      { label: 'النوع', value: safe(getGenderLabel(app.gender || app.sex || '')) },
      { label: 'الموقف من التجنيد', value: safe((app.gender || app.sex || '').toLowerCase() === 'male' ? getMilitaryStatusLabel(app.militaryStatus || '') : '—') }
    ]},
    'section4': { title: 'المؤهل العلمي', rows: [
      { label: 'المؤهل', value: safe(app.qualification || app.degree) },
      { label: 'التخصص', value: safe(app.specialization) },
      { label: 'جهة التخرج', value: safe(app.university) },
      { label: 'سنة التخرج', value: safe(app.graduationYear) }
    ]},
    'section5': { title: 'الخبرات السابقة', rows: []},
    'section6': { title: 'المهارات والقدرات', rows: [
      { label: 'اللغات', value: safe(app.languages) },
      { label: 'برامج الحاسب', value: safe(app.computerSkills || app.programs) },
      { label: 'المهارات الفنية', value: safe(app.technicalSkills) },
      { label: 'الدورات التدريبية', value: safe(app.trainingCourses || app.courses) }
    ]},
    'section7': { title: 'الشهادات الإضافية', rows: []},
    'section8': { title: 'الإقرار والتوقيع', rows: [
      { label: 'حالة الإقرار', value: safe(resolveDeclarationAccepted(app) ? 'موافق' : 'غير موافق') },
      { label: 'اسم المقرر', value: safe(app.signatureName || app.fullName) },
      { label: 'التاريخ', value: safe(app.date || formatSubmittedAt(app.submittedAt || app.lastUpdated || app.createdAt)) }
    ]}
  };

  const info = sectionInfo[sectionId];
  if (!info) {
    alert('القسم غير موجود');
    return;
  }

  // Build experiences and certificates for sections 5 and 7
  if (sectionId === 'section5') {
    const experiences = collectIndexedGroups(app, ['company', 'jobTitle', 'workDuration', 'employmentDuration', 'experienceDescription']);
    experiences.forEach((exp, i) => {
      if (exp.company || exp.jobTitle) {
        info.rows.push({ label: `خبرة ${i + 1} - جهة العمل`, value: safe(exp.company) });
        info.rows.push({ label: `خبرة ${i + 1} - الوظيفة`, value: safe(exp.jobTitle) });
        info.rows.push({ label: `خبرة ${i + 1} - المدة`, value: safe(exp.workDuration || exp.employmentDuration) });
      }
    });
    if (info.rows.length === 0) {
      info.rows.push({ label: 'الخبرات', value: 'لا توجد خبرات سابقة' });
    }
  }

  if (sectionId === 'section7') {
    const certs = collectIndexedGroups(app, ['additionalCertificateName', 'additionalCertificateIssuer', 'additionalCertificateDate']);
    certs.forEach((cert, i) => {
      if (cert.additionalCertificateName) {
        info.rows.push({ label: `شهادة ${i + 1} - الاسم`, value: safe(cert.additionalCertificateName) });
        info.rows.push({ label: `شهادة ${i + 1} - جهة الإصدار`, value: safe(cert.additionalCertificateIssuer) });
        info.rows.push({ label: `شهادة ${i + 1} - التاريخ`, value: safe(cert.additionalCertificateDate) });
      }
    });
    if (info.rows.length === 0) {
      info.rows.push({ label: 'الشهادات', value: 'لا توجد شهادات إضافية' });
    }
  }

  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const margin = 15;

    // Header
    pdf.setFillColor(59, 130, 246);
    pdf.rect(0, 0, pageW, 25, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('نموذج رسمي - من قطاع الفني لمكتب رئيس مجلس الادارة', pageW / 2, 10, { align: 'center' });
    pdf.setFontSize(12);
    pdf.text(info.title, pageW / 2, 18, { align: 'center' });

    // Ref number
    pdf.setFillColor(239, 246, 255);
    pdf.rect(margin, 28, pageW - margin * 2, 15, 'F');
    pdf.setFillColor(37, 99, 235);
    pdf.setFontSize(10);
    pdf.setTextColor(37, 99, 235);
    pdf.text('الرقم المرجعي:', margin + 70, 35, { align: 'right' });
    pdf.setFontSize(14);
    pdf.setTextColor(15, 23, 42);
    pdf.text(safe(app.requestRefNumber || app.id), margin + 68, 35, { align: 'right' });
    pdf.setFontSize(10);
    pdf.setTextColor(37, 99, 235);
    pdf.text('اسم المتقدم:', margin + 35, 35, { align: 'right' });
    pdf.setFontSize(12);
    pdf.setTextColor(15, 23, 42);
    pdf.text(safe(app.fullName), margin + 33, 35, { align: 'right' });

    // Content
    let y = 50;
    pdf.setFontSize(11);

    info.rows.forEach((row, idx) => {
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }

      const labelText = row.label + ':';
      const valueText = row.value;

      pdf.setFillColor(idx % 2 === 0 ? 255 : 248);
      pdf.rect(margin, y, pageW - margin * 2, 12, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.rect(margin, y, pageW - margin * 2, 12, 'S');

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(100, 116, 139);
      pdf.text(labelText, pageW - margin - 5, y + 7.5, { align: 'right' });

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(30, 41, 59);
      const wrapped = pdf.splitTextToSize(valueText, 80);
      pdf.text(wrapped, pageW - margin - 60, y + 7.5, { align: 'right' });

      y += 14;
    });

    // Footer
    pdf.setFillColor(59, 130, 246);
    pdf.rect(0, 285, pageW, 12, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.text('قطاع تكنولوجيا النظم والمعلومات بشركة التعمير لإدارة المرافق', pageW / 2, 292, { align: 'center' });

    const blob = pdf.output('blob');
    triggerPdfDownload(blob, `${info.title}-${app.fullName || app.id}`);
  } catch (error) {
    console.error('Section PDF error:', error);
    alert('تعذر إنشاء PDF للقسم: ' + error.message);
  }
}
