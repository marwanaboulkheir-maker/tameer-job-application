# Job Application Form - ES Module Fix Plan

## Problem
- `<script src="config.js">` and `<script src="script.js">` in index.html can't be bundled without `type="module"` attribute
- Scripts don't work in program

## Root Cause
- Previous HTML used `<script src="config.js">` without type="module"
- ES modules export variables that need to be attached to `window` for inline HTML event handlers to work
- When using `type="module"`, the scripts load asynchronously

## Solution Applied

### 1. config.js Changes
- Added IIFE to ensure globals are set on window even before module loading completes:
```javascript
(function() {
    if (typeof window !== 'undefined') {
        if (!window.FIREBASE_CONFIG) window.FIREBASE_CONFIG = FIREBASE_CONFIG;
        if (!window.FORM_CONFIG) window.FORM_CONFIG = FORM_CONFIG;
    }
})();
```

### 2. script.js Changes
- Converted from using `typeof FIREBASE_CONFIG` to using `window.FIREBASE_CONFIG`
- Added `waitForConfig()` function to wait for config module to load
- Created `initializeFirebaseWithConfig()` async function to initialize Firebase after config loads
- Updated DOMContentLoaded to call the async initialization

### 3. index.html (Already Fixed)
- Already has `type="module"` on both script tags:
```html
<script src="config.js" type="module"></script>
<script src="script.js" type="module"></script>
```

## Files Modified
1. `config.js` - Added IIFE for immediate global assignment
2. `script.js` - Updated to use window globals and async initialization

## Testing
- Open index.html in browser
- Check console for "Firebase initialized successfully" message
- Test form submission functionality
