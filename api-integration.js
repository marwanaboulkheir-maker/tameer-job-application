/**
 * Job Application Form - API Integration Module
 * This module provides backend integration capabilities
 */

// Configuration
const API_CONFIG = {
    // Set your API endpoint here
    endpoint: process.env.API_ENDPOINT || 'https://your-api.com/applications',
    
    // Email address for form submission
    email: process.env.API_EMAIL || 'Tameer_facility@mhud.gov.eg',
    
    // API key for authentication
    apiKey: process.env.API_KEY || '',
    
    // Request timeout in milliseconds
    timeout: 30000,
    
    // Enable/disable backend submission
    enabled: false
};

/**
 * Initialize API Configuration
 * Call this function once when the page loads
 */
function initializeAPI(config) {
    Object.assign(API_CONFIG, config);
    console.log('API Configuration initialized:', {
        endpoint: API_CONFIG.endpoint,
        enabled: API_CONFIG.enabled
    });
}

/**
 * Submit form data to backend
 * @param {Object} formData - Form data object
 * @returns {Promise}
 */
async function submitApplicationToBackend(formData) {
    if (!API_CONFIG.enabled) {
        console.warn('Backend submission is disabled');
        return null;
    }

    try {
        const response = await fetch(API_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_CONFIG.apiKey}`,
                'X-Requested-With': 'XMLHttpRequest',
                'X-Application-Version': '1.0.0'
            },
            timeout: API_CONFIG.timeout,
            body: JSON.stringify({
                ...formData,
                submittedAt: new Date().toISOString(),
                formVersion: '1.0',
                clientInfo: {
                    userAgent: navigator.userAgent,
                    language: navigator.language,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Backend submission error:', error);
        throw error;
    }
}

/**
 * Get application status from backend
 * @param {string} applicationId - Application ID
 * @returns {Promise}
 */
async function getApplicationStatus(applicationId) {
    if (!API_CONFIG.enabled) {
        return null;
    }

    try {
        const response = await fetch(`${API_CONFIG.endpoint}/${applicationId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_CONFIG.apiKey}`,
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching application status:', error);
        throw error;
    }
}

/**
 * Upload files to backend
 * @param {FormData} files - FormData object with files
 * @returns {Promise}
 */
async function uploadAttachments(files) {
    if (!API_CONFIG.enabled) {
        return null;
    }

    try {
        const response = await fetch(`${API_CONFIG.endpoint}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_CONFIG.apiKey}`,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: files
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('File upload error:', error);
        throw error;
    }
}

/**
 * Validate email with backend
 * @param {string} email - Email to validate
 * @returns {Promise<boolean>}
 */
async function validateEmail(email) {
    try {
        const response = await fetch(`${API_CONFIG.endpoint}/validate-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_CONFIG.apiKey}`
            },
            body: JSON.stringify({ email })
        });

        if (!response.ok) {
            return false;
        }

        const result = await response.json();
        return result.valid === true;
    } catch (error) {
        console.error('Email validation error:', error);
        return false;
    }
}

/**
 * Get available job positions from backend
 * @returns {Promise<Array>}
 */
async function getJobPositions() {
    if (!API_CONFIG.enabled) {
        return [];
    }

    try {
        const response = await fetch(`${API_CONFIG.endpoint}/positions`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_CONFIG.apiKey}`,
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching positions:', error);
        return [];
    }
}

/**
 * Track form submission analytics
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
async function trackAnalytics(event, data = {}) {
    if (!API_CONFIG.enabled) {
        return;
    }

    try {
        await fetch(`${API_CONFIG.endpoint}/analytics`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_CONFIG.apiKey}`
            },
            body: JSON.stringify({
                event,
                data,
                timestamp: new Date().toISOString()
            })
        });
    } catch (error) {
        console.error('Analytics tracking error:', error);
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeAPI,
        submitApplicationToBackend,
        getApplicationStatus,
        uploadAttachments,
        validateEmail,
        getJobPositions,
        trackAnalytics
    };
}
