// User Interface Configuration Manager
// Quản lý cấu hình giao diện người dùng, theme, ngôn ngữ và tiền tệ

class UserInterfaceConfig {
    constructor() {
        this.config = {
            theme: 'sunset',
            setupCompleted: false
        };
        // Sử dụng tên cookie thống nhất cho tất cả các trang
        this.cookieName = 'vietnam_travel_ui_config';
        this.localStorageKey = 'vietnam_travel_ui_config';
        
        // Theme definitions
        this.themes = {
            sunset: {
                name: 'sunset',
                displayName: { en: 'Default Theme', vi: 'Giao diện Mặc định' },
                colors: {
                    primary: '#F59E0B',
                    secondary: '#D97706',
                    accent: '#FCD34D',
                    background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                    text: '#1F2937'
                }
            },
            arctic: {
                name: 'arctic',
                displayName: { en: 'Arctic Snow', vi: 'Tuyết Bắc Cực' },
                colors: {
                    primary: '#3B82F6',
                    secondary: '#1E40AF',
                    accent: '#60A5FA',
                    background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                    text: '#1F2937'
                }
            },
            cosmic: {
                name: 'cosmic',
                displayName: { en: 'Cosmic Space', vi: 'Không gian Vũ trụ' },
                colors: {
                    primary: '#8B5CF6',
                    secondary: '#7C3AED',
                    accent: '#A78BFA',
                    background: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)',
                    text: '#1F2937'
                }
            }
        };
        
        this.init();
    }
    
    // Initialize configuration
    init() {
        console.log('🎨 Initializing User Interface Config...');
        this.loadConfig();
        this.applyConfig();
        this.setupEventListeners();
    }
    
    // Load configuration from cookie/localStorage
    loadConfig() {
        try {
            // Try to load from cookie first
            const configFromCookie = this.getConfigFromCookie();
            if (configFromCookie) {
                this.config = { ...this.config, ...configFromCookie };
                console.log('✅ Configuration loaded from cookie:', this.config);
                return;
            }
            
            // Fallback to localStorage
            const configFromStorage = this.getConfigFromStorage();
            if (configFromStorage) {
                this.config = { ...this.config, ...configFromStorage };
                console.log('✅ Configuration loaded from localStorage:', this.config);
                return;
            }
            
            console.log('🎯 No saved configuration found, using defaults');
        } catch (error) {
            console.error('❌ Error loading configuration:', error);
        }
    }
    
    // Get config from cookie
    getConfigFromCookie() {
        try {
            // Sử dụng getUserPreferences nếu có
            if (window.getUserPreferences) {
                const prefs = window.getUserPreferences();
                // Lấy các trường cấu hình từ preferences
                return {
                    theme: prefs.theme || 'sunset',
                    language: prefs.language || 'en',
                    currency: prefs.currency || 'USD',
                    setupCompleted: prefs.setupCompleted || false
                };
            }
            
            // Fallback đến cách đọc cookie trực tiếp
            const cookies = document.cookie.split(';');
            const configCookie = cookies.find(cookie => 
                cookie.trim().startsWith(`${this.cookieName}=`)
            );
            
            if (configCookie) {
                const configValue = decodeURIComponent(configCookie.split('=')[1]);
                return JSON.parse(configValue);
            }
            
            // Kiểm tra và di chuyển dữ liệu từ các cookie cũ sang cookie mới thống nhất
            const legacyNames = ['vietnam_travel_preferences', 'vietnam_travel_user_config'];
            for (let name of legacyNames) {
                if (name === this.cookieName) continue; // Bỏ qua nếu trùng với cookieName hiện tại
                
                const legacyCookie = cookies.find(cookie => cookie.trim().startsWith(`${name}=`));
                if (legacyCookie) {
                    console.log(`🔄 Migrating legacy cookie: ${name} to ${this.cookieName}`);
                    const configValue = decodeURIComponent(legacyCookie.split('=')[1]);
                    const config = JSON.parse(configValue);
                    // Gộp dữ liệu từ cookie cũ vào config hiện tại
                    this.config = { ...this.config, ...config };
                    this.saveConfig(); // Lưu vào cookie mới
                    // Xóa cookie cũ
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                    console.log(`🗑️ Removed legacy cookie: ${name}`);
                    return this.config;
                }
            }
        } catch (error) {
            console.error('❌ Error reading cookie:', error);
        }
        return null;
    }
    
    // Get config from localStorage
    getConfigFromStorage() {
        try {
            const stored = localStorage.getItem(this.localStorageKey);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.error('❌ Error reading localStorage:', error);
            return null;
        }
    }
    
    // Save configuration to both cookie and localStorage
    saveConfig() {
        try {
            // Lấy cookie preferences hiện tại
            const prefs = window.getUserPreferences ? window.getUserPreferences() : { language: 'en', currency: 'USD' };
            
            // Gộp cấu hình theme và các thông tin khác vào chung
            prefs.theme = this.config.theme;
            prefs.setupCompleted = this.config.setupCompleted;
            
            // Lưu lại cookie
            if (window.saveUserPreferences) {
                window.saveUserPreferences(prefs);
            } else {
                // Lưu trực tiếp nếu không có hàm saveUserPreferences
                const configStr = JSON.stringify(prefs);
                const expiryDate = new Date();
                expiryDate.setFullYear(expiryDate.getFullYear() + 1);
                document.cookie = `${this.cookieName}=${encodeURIComponent(configStr)}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Strict`;
                
                // Lưu vào localStorage như bản backup
                localStorage.setItem(this.localStorageKey, configStr);
            }
            
            console.log('💾 Configuration saved:', prefs);
        } catch (error) {
            console.error('❌ Error saving configuration:', error);
        }
    }
    
    // Apply current configuration to the page
    applyConfig() {
        this.applyTheme();
        this.applyLanguage();
        this.applyCurrency();
        this.updateUI();
    }
    
    // Apply theme
    applyTheme() {
        if (!this.themes[this.config.theme]) {
            console.warn(`⚠️ Theme '${this.config.theme}' not found, using default`);
            this.config.theme = 'sunset';
        }
        
        const theme = this.themes[this.config.theme];
        
        // Ensure existing themes are removed first - with null checks
        document.documentElement.removeAttribute('data-theme');
        
        // Safe removal of theme classes from body
        if (document.body && document.body.className) {
            document.body.className = document.body.className.replace(/theme-\w+/g, '');
        }
        
        // Apply CSS custom properties for theme colors
        const root = document.documentElement;
        root.style.setProperty('--theme-primary', theme.colors.primary);
        root.style.setProperty('--theme-secondary', theme.colors.secondary);
        root.style.setProperty('--theme-accent', theme.colors.accent);
        root.style.setProperty('--theme-background', theme.colors.background);
        root.style.setProperty('--theme-text', theme.colors.text);
        
        // Set data-theme attribute
        document.documentElement.setAttribute('data-theme', this.config.theme);
        
        // Add theme class to body - with null check
        if (document.body) {
            document.body.classList.add(`theme-${this.config.theme}`);
        }
        
        console.log(`🎨 Applied theme: ${this.config.theme}`);
    }
    
    // Apply language
    applyLanguage() {
        // Update current language global variable
        window.currentLanguage = this.config.language;
        
        // Update all elements with data attributes
        document.querySelectorAll('[data-en]').forEach(element => {
            const key = this.config.language === 'vi' ? 'data-vi' : 'data-en';
            const text = element.getAttribute(key);
            if (text) {
                element.textContent = text;
            }
        });
        
        // Update placeholders
        document.querySelectorAll(`[data-${this.config.language}-placeholder]`).forEach(element => {
            const placeholder = element.getAttribute(`data-${this.config.language}-placeholder`);
            if (placeholder) {
                element.placeholder = placeholder;
            }
        });
        
        console.log(`🌐 Applied language: ${this.config.language}`);
    }
    
    // Apply currency
    applyCurrency() {
        // Update current currency global variable
        window.currentCurrency = this.config.currency;
        
        // Update all price elements
        document.querySelectorAll('[data-price]').forEach(element => {
            const price = parseFloat(element.getAttribute('data-price'));
            if (!isNaN(price)) {
                element.textContent = this.formatPrice(price);
            }
        });
        
        console.log(`💰 Applied currency: ${this.config.currency}`);
    }
    
    // Format price according to currency
    formatPrice(amount) {
        const currencySymbols = {
            USD: '$',
            VND: '₫',
            EUR: '€'
        };
        
        const symbol = currencySymbols[this.config.currency] || '$';
        
        if (this.config.currency === 'VND') {
            return `${(amount * 24000).toLocaleString('vi-VN')}${symbol}`;
        } else if (this.config.currency === 'EUR') {
            return `${symbol}${(amount * 0.85).toFixed(2)}`;
        } else {
            return `${symbol}${amount}`;
        }
    }
    
    // Update UI elements to reflect current config
    updateUI() {
        // Update currency/language button
        const currencyBtn = document.getElementById('currentCurrency');
        const languageBtn = document.getElementById('currentLanguage');
        
        if (currencyBtn) currencyBtn.textContent = this.config.currency;
        if (languageBtn) languageBtn.textContent = this.config.language.toUpperCase();
        
        // Update theme selection if available
        document.querySelectorAll('.theme-option').forEach(option => {
            const theme = option.getAttribute('data-theme');
            if (theme === this.config.theme) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
        
        // Update language selection if available
        document.querySelectorAll('.language-option').forEach(option => {
            const lang = option.getAttribute('data-lang');
            if (lang === this.config.language) {
                option.style.borderColor = '#3b82f6';
                option.classList.add('selected');
            } else {
                option.style.borderColor = '#e5e7eb';
                option.classList.remove('selected');
            }
        });
        
        // Update currency selection if available
        document.querySelectorAll('.currency-option').forEach(option => {
            const currency = option.getAttribute('data-currency');
            if (currency === this.config.currency) {
                option.style.borderColor = '#10b981';
                option.classList.add('selected');
            } else {
                option.style.borderColor = '#e5e7eb';
                option.classList.remove('selected');
            }
        });
    }
    
    // Update a specific config value
    updateConfig(key, value) {
        if (this.config.hasOwnProperty(key)) {
            this.config[key] = value;
            this.saveConfig();
            this.applyConfig();
            
            // Trigger custom event for other components
            window.dispatchEvent(new CustomEvent('uiConfigChanged', {
                detail: { key, value, config: this.config }
            }));
            
            console.log(`🔄 Updated ${key} to:`, value);
        } else {
            console.warn(`⚠️ Unknown config key: ${key}`);
        }
    }
    
    // Get current config
    getConfig() {
        return { ...this.config };
    }
    
    // Get theme info
    getTheme(themeName = null) {
        const name = themeName || this.config.theme;
        return this.themes[name] || this.themes.sunset;
    }
    
    // Setup event listeners for UI interactions
    setupEventListeners() {
        // Theme selection listeners
        document.addEventListener('click', (e) => {
            if (e.target.closest('.theme-option')) {
                const themeOption = e.target.closest('.theme-option');
                const theme = themeOption.getAttribute('data-theme');
                if (theme) {
                    this.updateConfig('theme', theme);
                }
            }
        });
        
        // Language/Currency dropdown listeners
        document.addEventListener('click', (e) => {
            if (e.target.closest('.language-option')) {
                const langOption = e.target.closest('.language-option');
                const lang = langOption.getAttribute('data-lang');
                if (lang) {
                    // Cập nhật ngôn ngữ trong cookie preferences
                    
                    // 1. Update language trong preferences cookie
                    const prefs = window.getUserPreferences ? window.getUserPreferences() : { language: 'en', currency: 'USD' };
                    prefs.language = lang;
                    
                    // Giữ các cài đặt theme và cấu hình khác nếu có
                    if (this.config && this.config.theme) {
                        prefs.theme = this.config.theme;
                    }
                    if (this.config && this.config.setupCompleted) {
                        prefs.setupCompleted = this.config.setupCompleted;
                        prefs.setupDate = this.config.setupDate;
                    }
                    
                    if (window.saveUserPreferences) {
                        window.saveUserPreferences(prefs);
                    }
                    
                    // 2. Cập nhật trong cấu hình hiện tại
                    this.config.language = lang;
                    
                    // 3. Cập nhật biến toàn cục currentLanguage cho hiển thị
                    window.currentLanguage = lang;
                    
                    // 4. Áp dụng ngôn ngữ vào UI
                    this.applyLanguage();
                    
                    // 5. Gọi hàm cập nhật hiển thị ngôn ngữ nếu có
                    if (window.updateLanguageDisplay) {
                        window.updateLanguageDisplay();
                    }
                    
                    console.log(`🔄 Ngôn ngữ đã được cập nhật: ${lang}`);
                }
            }
            
            if (e.target.closest('.currency-option')) {
                const currOption = e.target.closest('.currency-option');
                const currency = currOption.getAttribute('data-currency');
                if (currency) {
                    // Update currency in unified preferences cookie instead
                    const prefs = window.getUserPreferences ? window.getUserPreferences() : { language: 'en', currency: 'USD' };
                    prefs.currency = currency;
                    
                    // Giữ các cài đặt theme và cấu hình khác nếu có
                    if (this.config && this.config.theme) {
                        prefs.theme = this.config.theme;
                    }
                    if (this.config && this.config.setupCompleted) {
                        prefs.setupCompleted = this.config.setupCompleted;
                        prefs.setupDate = this.config.setupDate;
                    }
                    
                    if (window.saveUserPreferences) {
                        window.saveUserPreferences(prefs);
                    }
                    // Also update display
                    if (window.updateCurrency) {
                        window.updateCurrency(currency);
                    }
                }
            }
        });
    }
    
    // Check if setup is needed
    needsSetup() {
        return !this.config.setupCompleted;
    }
    
    // Mark setup as completed
    completeSetup() {
        this.config.setupCompleted = true;
        this.config.setupDate = new Date().toISOString();
        this.saveConfig();
    }
    
    // Show interface settings modal
    showInterfaceSettings() {
        const modal = this.createSettingsModal();
        document.body.appendChild(modal);
        
        // Setup modal event listeners
        this.setupModalEventListeners(modal);
        
        // Show modal with animation
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            modal.querySelector('.modal-content').style.transform = 'translate(-50%, -50%) scale(1)';
        });
    }
    
    // Create settings modal
    createSettingsModal() {
        const modal = document.createElement('div');
        modal.className = 'ui-settings-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        const currentTheme = this.getTheme();
        const currentLang = this.config.language;
        
        modal.innerHTML = `
            <div class="modal-content" style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.9);
                background: white;
                border-radius: 20px;
                padding: 30px;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                transition: transform 0.3s ease;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
            ">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h2 style="color: #1f2937; font-size: 1.5rem; font-weight: bold; margin-bottom: 10px;">
                        ${currentLang === 'vi' ? 'Tùy chỉnh Giao diện' : 'Customize Interface'}
                    </h2>
                    <p style="color: #6b7280;">
                        ${currentLang === 'vi' ? 'Thay đổi theme, ngôn ngữ và tiền tệ' : 'Change theme, language and currency'}
                    </p>
                </div>
                
                <!-- Theme Selection -->
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #1f2937; font-weight: 600; margin-bottom: 15px;">
                        ${currentLang === 'vi' ? 'Chọn Theme' : 'Choose Theme'}
                    </h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                        ${Object.values(this.themes).map(theme => `
                            <div class="modal-theme-option" data-theme="${theme.name}" style="
                                border: 3px solid ${theme.name === this.config.theme ? '#667eea' : '#e5e7eb'};
                                border-radius: 12px;
                                padding: 15px;
                                cursor: pointer;
                                transition: all 0.3s ease;
                                background: ${theme.name === this.config.theme ? 'rgba(102, 126, 234, 0.05)' : 'white'};
                                text-align: center;
                            ">
                                <div style="
                                    height: 40px;
                                    background: ${theme.colors.primary};
                                    border-radius: 8px;
                                    margin-bottom: 10px;
                                "></div>
                                <div style="font-weight: 600; color: #1f2937; font-size: 0.9rem;">
                                    ${theme.displayName[currentLang]}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Language & Currency -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
                    <div>
                        <h3 style="color: #1f2937; font-weight: 600; margin-bottom: 15px;">
                            ${currentLang === 'vi' ? 'Ngôn ngữ' : 'Language'}
                        </h3>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <div class="modal-language-option" data-lang="en" style="
                                border: 2px solid ${this.config.language === 'en' ? '#3b82f6' : '#e5e7eb'};
                                border-radius: 8px;
                                padding: 10px;
                                cursor: pointer;
                                transition: all 0.3s ease;
                                display: flex;
                                align-items: center;
                                gap: 10px;
                            ">
                                <span style="font-size: 1.2rem;">🇺🇸</span>
                                <span style="font-weight: 500;">English</span>
                            </div>
                            <div class="modal-language-option" data-lang="vi" style="
                                border: 2px solid ${this.config.language === 'vi' ? '#3b82f6' : '#e5e7eb'};
                                border-radius: 8px;
                                padding: 10px;
                                cursor: pointer;
                                transition: all 0.3s ease;
                                display: flex;
                                align-items: center;
                                gap: 10px;
                            ">
                                <span style="font-size: 1.2rem;">🇻🇳</span>
                                <span style="font-weight: 500;">Tiếng Việt</span>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h3 style="color: #1f2937; font-weight: 600; margin-bottom: 15px;">
                            ${currentLang === 'vi' ? 'Tiền tệ' : 'Currency'}
                        </h3>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            ${['USD', 'VND', 'EUR'].map(currency => `
                                <div class="modal-currency-option" data-currency="${currency}" style="
                                    border: 2px solid ${this.config.currency === currency ? '#10b981' : '#e5e7eb'};
                                    border-radius: 8px;
                                    padding: 10px;
                                    cursor: pointer;
                                    transition: all 0.3s ease;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-weight: 500;
                                ">
                                    ${currency}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <!-- Actions -->
                <div style="display: flex; gap: 15px; justify-content: end;">
                    <button class="modal-cancel" style="
                        background: #6b7280;
                        color: white;
                        padding: 12px 24px;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: background 0.3s ease;
                    ">
                        ${currentLang === 'vi' ? 'Hủy' : 'Cancel'}
                    </button>
                    <button class="modal-apply" style="
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 12px 24px;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: transform 0.3s ease;
                    ">
                        ${currentLang === 'vi' ? 'Áp dụng' : 'Apply'}
                    </button>
                </div>
            </div>
        `;
        
        return modal;
    }
    
    // Setup modal event listeners
    setupModalEventListeners(modal) {
        let pendingChanges = {};
        
        // Theme selection
        modal.querySelectorAll('.modal-theme-option').forEach(option => {
            option.addEventListener('click', () => {
                modal.querySelectorAll('.modal-theme-option').forEach(opt => {
                    opt.style.borderColor = '#e5e7eb';
                    opt.style.background = 'white';
                });
                option.style.borderColor = '#667eea';
                option.style.background = 'rgba(102, 126, 234, 0.05)';
                pendingChanges.theme = option.getAttribute('data-theme');
            });
        });
        
        // Language selection
        modal.querySelectorAll('.modal-language-option').forEach(option => {
            option.addEventListener('click', () => {
                modal.querySelectorAll('.modal-language-option').forEach(opt => {
                    opt.style.borderColor = '#e5e7eb';
                });
                option.style.borderColor = '#3b82f6';
                // Store in temp variable, will be saved later to unified preferences
                pendingChanges.language = option.getAttribute('data-lang');
            });
        });
        
        // Currency selection
        modal.querySelectorAll('.modal-currency-option').forEach(option => {
            option.addEventListener('click', () => {
                modal.querySelectorAll('.modal-currency-option').forEach(opt => {
                    opt.style.borderColor = '#e5e7eb';
                });
                option.style.borderColor = '#10b981';
                // Store in temp variable, will be saved later to unified preferences
                pendingChanges.currency = option.getAttribute('data-currency');
            });
        });
        
        // Cancel button
        modal.querySelector('.modal-cancel').addEventListener('click', () => {
            this.closeModal(modal);
        });
        
        // Apply button
        modal.querySelector('.modal-apply').addEventListener('click', () => {
            // Apply all pending changes
            Object.keys(pendingChanges).forEach(key => {
                if (key === 'language' || key === 'currency') {
                    // Special handling for language and currency - use unified preferences
                    const prefs = window.getUserPreferences ? window.getUserPreferences() : { language: 'en', currency: 'USD' };
                    prefs[key] = pendingChanges[key];
                    if (window.saveUserPreferences) {
                        window.saveUserPreferences(prefs);
                    }
                    // Also update display
                    if (key === 'language' && window.updateLanguageDisplay) {
                        window.updateLanguageDisplay();
                    }
                    if (key === 'currency' && window.updateCurrency) {
                        window.updateCurrency(pendingChanges[key]);
                    }
                } else {
                    // Normal config updates for theme and other properties
                    this.updateConfig(key, pendingChanges[key]);
                }
            });
            
            // Close modal
            this.closeModal(modal);
            
            // Refresh page if theme changed for full effect
            if (pendingChanges.theme) {
                setTimeout(() => {
                    window.location.reload();
                }, 300);
            }
        });
        
        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal);
            }
        });
    }
    
    // Close modal
    closeModal(modal) {
        modal.style.opacity = '0';
        modal.querySelector('.modal-content').style.transform = 'translate(-50%, -50%) scale(0.9)';
        
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }
}

// Initialize global UI config instance
window.uiConfig = new UserInterfaceConfig();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserInterfaceConfig;
}