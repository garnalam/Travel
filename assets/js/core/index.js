/**
 * Core Application System
 * Tập hợp các chức năng cốt lõi cho ứng dụng Vietnam Travel
 */

// Core Module Configuration
const CoreConfig = {
    // Debug mode
    debug: true,
    
    // Log prefix
    logPrefix: '🚀 [Core]',
    
    // Default components to initialize
    defaultInitComponents: [
        'ajax',
        'state',
        'router',
        'loader'
    ],
    
    // Auto initialize when DOM loaded
    autoInit: true,
    
    // Enable performance logging
    perfLogging: true,
    
    // Initialize in order
    orderedInit: true,
    
    // Translation base URLs
    translationUrls: {
        en: '/api/translations/en',
        vi: '/api/translations/vi'
    }
};

// Core Module
class Core {
    constructor(config = {}) {
        this.config = { ...CoreConfig, ...config };
        this.modules = new Map();
        this.initialized = false;
        this.translations = {};
        this.currentLanguage = document.documentElement.lang || 'en';
    }
    
    /**
     * Initialize core system
     * @param {Array} components - Components to initialize
     * @returns {Promise<void>} Initialization promise
     */
    async init(components = null) {
        if (this.initialized) {
            this.log('Core already initialized');
            return;
        }
        
        this.logPerf('Core initialization start');
        
        // Components to initialize
        const toInit = components || this.config.defaultInitComponents;
        
        try {
            // Initialize core modules
            if (this.config.orderedInit) {
                // Sequential initialization
                for (const component of toInit) {
                    await this.initComponent(component);
                }
            } else {
                // Parallel initialization
                await Promise.all(toInit.map(component => this.initComponent(component)));
            }
            
            this.initialized = true;
            this.logPerf('Core initialization complete');
            
            // Load translations if available
            this.loadTranslations(this.currentLanguage);
            
            return true;
        } catch (error) {
            this.logError('Core initialization failed', error);
            return false;
        }
    }
    
    /**
     * Initialize a single component
     * @param {string} name - Component name
     * @returns {Promise<void>} Initialization promise
     */
    async initComponent(name) {
        const startTime = performance.now();
        
        try {
            this.log(`Initializing ${name}`);
            
            switch (name) {
                case 'ajax':
                    if (window.Ajax) {
                        this.modules.set('ajax', window.Ajax);
                        this.log('Ajax module initialized');
                    } else {
                        throw new Error('Ajax module not found');
                    }
                    break;
                    
                case 'state':
                    if (window.appState) {
                        this.modules.set('state', window.appState);
                        this.log('State module initialized');
                    } else {
                        throw new Error('State module not found');
                    }
                    break;
                    
                case 'router':
                    if (window.router) {
                        this.modules.set('router', window.router);
                        // Init routes later
                        this.log('Router module initialized');
                    } else {
                        throw new Error('Router module not found');
                    }
                    break;
                    
                case 'loader':
                    if (window.resourceLoader) {
                        this.modules.set('loader', window.resourceLoader);
                        window.resourceLoader.init();
                        this.log('ResourceLoader module initialized');
                    } else {
                        throw new Error('ResourceLoader module not found');
                    }
                    break;
                    
                default:
                    this.log(`Unknown component: ${name}`);
            }
            
            const duration = performance.now() - startTime;
            this.logPerf(`Component ${name} initialized in ${duration.toFixed(2)}ms`);
            
            return true;
        } catch (error) {
            this.logError(`Failed to initialize ${name}`, error);
            return false;
        }
    }
    
    /**
     * Load translations for a language
     * @param {string} lang - Language code
     * @returns {Promise<Object>} Translation promise
     */
    async loadTranslations(lang) {
        if (!this.config.translationUrls[lang]) {
            this.log(`No translation URL for language: ${lang}`);
            return null;
        }
        
        // Skip if already loaded
        if (this.translations[lang]) {
            this.log(`Using cached translations for: ${lang}`);
            return this.translations[lang];
        }
        
        try {
            this.log(`Loading translations for: ${lang}`);
            
            // Get Ajax module
            const ajax = this.getModule('ajax');
            
            if (!ajax) {
                throw new Error('Ajax module not available');
            }
            
            const translations = await ajax.get(this.config.translationUrls[lang]);
            
            if (translations) {
                this.translations[lang] = translations;
                this.currentLanguage = lang;
                this.log(`Translations loaded for: ${lang}`);
                
                // Update app state
                const state = this.getModule('state');
                if (state) {
                    state.set('app.language', lang);
                }
                
                return translations;
            } else {
                throw new Error(`Failed to load translations for: ${lang}`);
            }
        } catch (error) {
            this.logError(`Translation loading error for ${lang}`, error);
            return null;
        }
    }
    
    /**
     * Translate a key
     * @param {string} key - Translation key
     * @param {Object} params - Parameters to interpolate
     * @returns {string} Translated string
     */
    translate(key, params = {}) {
        const translations = this.translations[this.currentLanguage];
        
        if (!translations) {
            return key;
        }
        
        // Find translation
        const parts = key.split('.');
        let result = translations;
        
        for (const part of parts) {
            if (result[part] === undefined) {
                return key;
            }
            result = result[part];
        }
        
        // Return key if not found
        if (typeof result !== 'string') {
            return key;
        }
        
        // Interpolate parameters
        let translated = result;
        
        Object.entries(params).forEach(([param, value]) => {
            translated = translated.replace(new RegExp(`{${param}}`, 'g'), value);
        });
        
        return translated;
    }
    
    /**
     * Get a module
     * @param {string} name - Module name
     * @returns {Object} Module instance
     */
    getModule(name) {
        return this.modules.get(name);
    }
    
    /**
     * Log a message
     * @param {string} message - Message to log
     */
    log(message) {
        if (this.config.debug) {
            console.log(`${this.config.logPrefix} ${message}`);
        }
    }
    
    /**
     * Log an error
     * @param {string} message - Error message
     * @param {Error} error - Error object
     */
    logError(message, error) {
        console.error(`${this.config.logPrefix} ${message}`, error);
    }
    
    /**
     * Log performance info
     * @param {string} message - Message to log
     */
    logPerf(message) {
        if (this.config.debug && this.config.perfLogging) {
            console.log(`${this.config.logPrefix} ⏱️ ${message}`);
        }
    }
}

// Create global core instance
window.core = new Core();

// Auto-initialize core when DOM is loaded
if (CoreConfig.autoInit) {
    document.addEventListener('DOMContentLoaded', () => {
        window.core.init();
    });
}