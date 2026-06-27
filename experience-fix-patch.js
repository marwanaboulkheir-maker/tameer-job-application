/**
 * Experience Fix Patch for admin.js
 * 
 * This file fixes the issue where "Previous Experiences" (الخبرات السابقة) 
 * don't appear in the PDF.
 * 
 * INCLUDE THIS FILE AFTER admin.js IN YOUR HTML TO FIX THE BUG:
 * <script src="admin.js"></script>
 * <script src="experience-fix-patch.js"></script>
 */

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

// Helper to find value using aliases
function findFieldValue(obj, keys) {
  for (const k of keys) {
    const v = obj[k];
    if (v && typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

// FIXED: collectIndexedGroups - properly handle all experience field formats
function collectIndexedGroups(app, baseKeys) {
  const indexSet = new Set();
  const foundItems = {};

  if (!app) return [];

  // FIRST: Try to match indexed fields (e.g., 'company1', 'jobTitle1', 'company0', etc.)
  Object.keys(app || {}).forEach((k) => {
    if (!k || typeof k !== 'string') return;
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

  // If indexed matches found, return them directly (with filter)
  if (indexSet.size > 0) {
    const result = Array.from(indexSet).sort((a, b) => a - b).map((idx) => foundItems[idx] || {});
    // Filter out empty entries
    return result.filter(entry => {
      return entry && Object.values(entry).some(v => v && String(v).trim());
    });
  }

  // SECOND: Try non-indexed field names using fieldAliases
  baseKeys.forEach((base) => {
    const aliases = fieldAliases[base] || [base];
    const val = findFieldValue(app, aliases);
    if (val) {
      indexSet.add(0);
      if (!foundItems[0]) foundItems[0] = {};
      foundItems[0][base] = val;
    }
  });

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
            if (base === 'company') itemData.company = val;
            else if (base === 'jobTitle') itemData.jobTitle = val;
            else if (base === 'workDuration' || base === 'employmentDuration') itemData.workDuration = val;
            else if (base === 'experienceDescription') itemData.experienceDescription = val;
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

  // FOURTH: Handle legacy non-indexed field names (company, jobTitle without numbers)
  if (indexSet.size === 0) {
    baseKeys.forEach((base) => {
      const val = app[base];
      if (val && typeof val === 'string' && val.trim()) {
        indexSet.add(0);
        if (!foundItems[0]) foundItems[0] = {};
        foundItems[0][base] = val;
      }
    });
  }

  // FIFTH: Handle comma-separated values as fallback
  if (indexSet.size === 0) {
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
  }

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

console.log('✅ Experience Fix Patch loaded - collectIndexedGroups has been fixed');
