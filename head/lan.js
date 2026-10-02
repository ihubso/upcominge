// ============================================================
//  TRANSLATION FUNCTIONS
// ============================================================

/**
 * Helper to safely get nested translation values
 */
function getNestedValue(obj, keys) {
    let current = obj;
    for (let i = 0; i < keys.length; i++) {
        if (current && current[keys[i]] !== undefined) {
            current = current[keys[i]];
        } else {
            return undefined;
        }
    }
    return current;
}

/**
 * Translate a key to the current language
 * @param {string} key - Translation key (e.g., 'nav.home')
 * @param {object} params - Dynamic parameters to replace in translation
 * @returns {string} Translated text
 */
function translate(key, params = {}) {
    if (!translations) {
        console.error('Translations object is undefined!');
        return key;
    }

    const keys = key.split('.');
    
    // 1. Try to get translation in the current language
    let translation = getNestedValue(translations[currentLanguage], keys);
    
    // 2. Fallback to English if not found in current language (and current is not English)
    if (translation === undefined && currentLanguage !== 'en') {
        translation = getNestedValue(translations['en'], keys);
    }
    
    // 3. If still not found, return the original key as a last resort
    if (translation === undefined) {
        return key;
    }
    
    // Replace parameters (e.g., {name} -> John)
    if (typeof translation === 'string') {
        Object.keys(params).forEach(paramKey => {
            translation = translation.replace(`{${paramKey}}`, params[paramKey]);
        });
    }
    
    return translation;
}

// ============================================================
//  UI TRANSLATION FUNCTIONS
// ============================================================

/**
 * Translate all elements with data-translate attributes
 */
function translateUI() {
    // Check if translations are loaded for the current language
    if (!translations || !translations[currentLanguage]) {
        console.error('Translations not loaded for language:', currentLanguage);
        return;
    }

    console.log(`🔄 Translating UI to: ${currentLanguage}`);

    // Translate regular text content
    document.querySelectorAll("[data-translate]").forEach(el => {
        const key = el.getAttribute("data-translate");
        const translatedText = translate(key);
        
        if (translatedText && translatedText !== key) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.value = translatedText;
            } else if (el.tagName === 'OPTION') {
                el.textContent = translatedText;
            } else {
                el.innerHTML = translatedText;
            }
        }
    });

    // Translate placeholder text
    document.querySelectorAll("[data-translate-placeholder]").forEach(el => {
        const key = el.getAttribute("data-translate-placeholder");
        const translatedText = translate(key);
        if (translatedText && translatedText !== key) {
            el.setAttribute("placeholder", translatedText);
        }
    });

    // Translate title attributes
    document.querySelectorAll("[data-translate-title]").forEach(el => {
        const key = el.getAttribute("data-translate-title");
        const translatedText = translate(key);
        if (translatedText && translatedText !== key) {
            el.setAttribute("title", translatedText);
        }
    });

    // Translate alt attributes
    document.querySelectorAll("[data-translate-alt]").forEach(el => {
        const key = el.getAttribute("data-translate-alt");
        const translatedText = translate(key);
        if (translatedText && translatedText !== key) {
            el.setAttribute("alt", translatedText);
        }
    });

    // Translate aria-label attributes
    document.querySelectorAll("[data-translate-aria-label]").forEach(el => {
        const key = el.getAttribute("data-translate-aria-label");
        const translatedText = translate(key);
        if (translatedText && translatedText !== key) {
            el.setAttribute("aria-label", translatedText);
        }
    });

    // Handle data-translate-rating for dynamic values
    document.querySelectorAll("[data-translate-rating]").forEach(el => {
        const key = el.getAttribute("data-translate");
        const rating = el.getAttribute("data-translate-rating");
        const translatedText = translate(key, { rating });
        if (translatedText && translatedText !== key) {
            el.textContent = translatedText;
        }
    });

    // Handle data-translate-value for numeric values
    document.querySelectorAll("[data-translate-value]").forEach(el => {
        const key = el.getAttribute("data-translate");
        const value = el.getAttribute("data-translate-value");
        const translatedText = translate(key, { value });
        if (translatedText && translatedText !== key) {
            el.textContent = translatedText;
        }
    });

    // Update language selector if exists
    const languageSelector = document.getElementById('languageSelector');
    if (languageSelector) {
        languageSelector.value = currentLanguage;
    }
}

/**
 * Update a specific element with translation
 */
function updateDynamicTranslation(elementId, translationKey, dynamicValues = {}) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const translatedText = translate(translationKey, dynamicValues);
    if (translatedText) {
        element.textContent = translatedText;
    }
}

/**
 * Set a translated value with dynamic content
 */
function setTranslatedValue(elementId, value, translationKey) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.setAttribute("data-translate-value", value);
    element.setAttribute("data-translate", translationKey);
    
    const translatedText = translate(translationKey, { value });
    if (translatedText) {
        element.textContent = translatedText;
    }
}

/**
 * Set a translated rating with dynamic stars
 */
function setTranslatedRating(elementId, rating, translationKey) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.setAttribute("data-translate-rating", rating);
    element.setAttribute("data-translate", translationKey);
    
    const translatedText = translate(translationKey, { rating });
    if (translatedText) {
        element.textContent = translatedText;
    }
}

// ============================================================
//  LANGUAGE DETECTION & INITIALIZATION
// ============================================================

/**
 * Detects the user's browser language with English fallback
 */
function detectUserLanguage() {
    // Get browser language (e.g., 'en-US', 'fr-FR', 'es')
    const browserLang = navigator.language || navigator.userLanguage || 'en';
    
    // Extract the base language code (e.g., 'en' from 'en-US')
    // Handles both '-' and '_' separators
    const langCode = browserLang.toLowerCase().split(/[-_]/)[0];
    
    // Define supported languages (ADD YOUR SUPPORTED LANGUAGES HERE)
    const supportedLanguages = ['en', 'fr', 'es', 'de']; 
    
    // If the browser's base language is supported, return it
    if (supportedLanguages.includes(langCode)) {
        return langCode;
    }
    
    // Fallback to English if the browser language is not supported
    return 'en';
}

/**
 * Initialize the translation system
 * 
 * 🎯 BROWSER ALWAYS WINS POLICY:
 * The browser's language is always used on page load.
 * localStorage is only used as a fallback if browser detection fails.
 * This means a user's manual language toggle won't persist across page loads.
 */
function initTranslation() {
    // 🐛 DEBUG BLOCK
    console.log('=== 🌐 TRANSLATION DEBUG ===');
    console.log('navigator.language:', navigator.language);
    console.log('navigator.languages:', navigator.languages);
    console.log('detectUserLanguage() returned:', detectUserLanguage());
    console.log('localStorage language (ignored):', localStorage.getItem('language'));
    console.log('translations object exists?', typeof translations);
    console.log('available languages:', translations ? Object.keys(translations) : 'NONE');
    
    if (!translations) {
        console.error('❌ FATAL: translations is undefined!');
        return;
    }
    
    // ✅ OPTION B: BROWSER ALWAYS WINS
    // Always detect from the browser — do NOT trust the saved value
    currentLanguage = detectUserLanguage();
    console.log('✅ Browser-detected language:', currentLanguage);
    
    // 🛡️ SAFETY FALLBACK: Only if detection somehow produces an unsupported language,
    // then check localStorage as a backup, then finally fall back to 'en'
    if (!translations[currentLanguage]) {
        const saved = localStorage.getItem('language');
        if (saved && translations[saved]) {
            console.warn(`⚠️ Browser detection failed, using saved: ${saved}`);
            currentLanguage = saved;
        } else {
            console.warn(`⚠️ Falling back to 'en'`);
            currentLanguage = 'en';
        }
    }
    
    // Keep localStorage in sync (useful for other scripts, but never read as source of truth)
    localStorage.setItem('language', currentLanguage);
    
    console.log(`🌐 Final language: ${currentLanguage}`);
    translateUI();
}