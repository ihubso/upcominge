




// ============================================================
//  TRANSLATION FUNCTIONS
// ============================================================

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

    // Handle nested keys
    const keys = key.split('.');
    let translationObj = translations[currentLanguage];
    
    for (let i = 0; i < keys.length; i++) {
        if (translationObj && translationObj[keys[i]] !== undefined) {
            translationObj = translationObj[keys[i]];
        } else {
            console.warn(`⚠️ Translation key not found: "${key}" in language: ${currentLanguage}`);
            return key;
        }
    }
    
    let translation = translationObj;
    
    // Replace parameters
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
    // Check if translations are loaded
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
 * @param {string} elementId - Element ID
 * @param {string} translationKey - Translation key
 * @param {object} dynamicValues - Dynamic parameters
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
 * @param {string} elementId - Element ID
 * @param {*} value - Dynamic value to display
 * @param {string} translationKey - Translation key with {value} placeholder
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
 * @param {string} elementId - Element ID
 * @param {number} rating - Rating value (1-5)
 * @param {string} translationKey - Translation key with {rating} placeholder
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

// --- Language Detection ---
function detectUserLanguage() {
    // Get browser language
    const browserLang = navigator.language || navigator.userLanguage || 'en';
    
    // Check if it's French (fr, fr-FR, fr-CA, etc.)
    if (browserLang.toLowerCase().startsWith('fr')) {
        return 'fr';
    }
    
    // Default to French for testing purposes
    return 'fr';
}


function initTranslation() {
    // Detect language from browser
    currentLanguage = detectUserLanguage();
    
    // Save to localStorage for persistence
    localStorage.setItem('language', currentLanguage);
    
    console.log(`🌐 Translation initialized: ${currentLanguage}`);
    
    // Apply translations to UI
    translateUI();
}



