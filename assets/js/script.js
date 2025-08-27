// Smart Travel - Enhanced JavaScript File  
// Enhanced with multilingual support, authentication overlay for search section, and improved functionality

// ===== GLOBAL CONFIGURATION SYSTEM =====

// Global configuration variables
let globalConfig = null;
let userDefinedTheme = null; // Store user's intended theme

// Load global configuration from server
async function loadGlobalConfig() {
    try {
        console.log('🔧 Loading global configuration...');
        
        const response = await fetch('/api/config');
        const data = await response.json();
        
        if (data.success && data.config) {
            globalConfig = data.config;
            console.log('✅ Global config loaded:', globalConfig);
            
            // Store user's intended theme before applying
            if (globalConfig.theme && globalConfig.theme.name) {
                userDefinedTheme = globalConfig.theme.name;
                console.log(`🎯 User defined theme stored: ${userDefinedTheme}`);
            }
            
            // Apply configuration immediately
            applyGlobalConfig();
            
            // Setup theme protection against Youware script overrides
            setupThemeProtection();
            
            return globalConfig;
        } else {
            console.warn('⚠️ Failed to load config, using defaults');
            return useDefaultConfig();
        }
    } catch (error) {
        console.error('❌ Error loading global config:', error);
        return useDefaultConfig();
    }
}

// Apply global configuration to the page
function applyGlobalConfig() {
    if (!globalConfig) return;
    
    // Apply language settings from server config only
    if (globalConfig.language && globalConfig.language.default) {
        currentLanguage = globalConfig.language.default;
        console.log(`🌐 Applied language: ${currentLanguage}`);
    }
    
    // Apply currency settings from server config only
    if (globalConfig.currency && globalConfig.currency.default) {
        currentCurrency = globalConfig.currency.default;
        console.log(`💰 Applied currency: ${currentCurrency}`);
    }
    
    // Apply theme settings
    if (globalConfig.theme) {
        applyThemeSettings(globalConfig.theme);
        // Also call the theme system for consistency
        if (globalConfig.theme.name) {
            applyTheme(globalConfig.theme.name);
        }
    }
    
    // Apply homepage content
    if (globalConfig.homepage) {
        applyHomepageContent(globalConfig.homepage);
    }
    
    // Trigger updates
    updateLanguageDisplay();
    updateCurrencyDisplay();
}

// Apply theme settings to page with protection
function applyThemeSettings(themeConfig) {
    if (!themeConfig) {
        console.warn('⚠️ No theme config provided');
        return;
    }
    
    const root = document.documentElement;
    
    // Apply theme name as data-theme attribute
    if (themeConfig.name) {
        root.setAttribute('data-theme', themeConfig.name);
        console.log(`🎨 Theme applied: ${themeConfig.name}`);
        
        // Mark this as user-defined theme with timestamp
        root.setAttribute('data-user-theme', themeConfig.name);
        root.setAttribute('data-theme-timestamp', Date.now());
    }
    
    // Apply custom colors if provided (fallback for custom themes)
    if (themeConfig.primaryColor) {
        root.style.setProperty('--theme-primary', themeConfig.primaryColor);
    }
    
    if (themeConfig.secondaryColor) {
        root.style.setProperty('--theme-secondary', themeConfig.secondaryColor);
    }
    
    if (themeConfig.accentColor) {
        root.style.setProperty('--theme-accent', themeConfig.accentColor);
    }
}

// NUCLEAR OPTION: Total override của Youware platform scripts
function setupThemeProtection() {
    // Get theme from user config cookie only
    try {
        // Check cookie for user's preference from welcome-setup
        const cookies = document.cookie.split(';');
        const configCookie = cookies.find(cookie => 
            cookie.trim().startsWith('vietnam_travel_ui_config=')
        );
        
        if (configCookie) {
            const configValue = decodeURIComponent(configCookie.split('=')[1]);
            const config = JSON.parse(configValue);
            
            // If welcome-setup has saved a theme, prioritize it
            if (config.theme) {
                userDefinedTheme = config.theme;
                console.log(`🔄 Updated theme from user cookie: ${userDefinedTheme}`);
            }
        }
    } catch (error) {
        console.log('⚠️ Error loading theme from cookie:', error);
    }
    
    if (!userDefinedTheme) {
        console.log('🛡️ No user theme to protect');
        return;
    }
    
    // Make sure userDefinedTheme is one of our valid themes
    const validThemes = ['arctic', 'sakura', 'cosmic', 'sunset'];
    if (!validThemes.includes(userDefinedTheme)) {
        console.warn(`❌ Invalid theme for protection: ${userDefinedTheme}. Falling back to default 'sunset' theme.`);
        userDefinedTheme = 'sunset';
    }
    
    console.log(`🚀 NUCLEAR THEME PROTECTION ACTIVATED for: ${userDefinedTheme}`);
    
    // Method 1: Create override function with high priority (FIXED TO PREVENT SPAM)
    let lastForceApplyTime = 0;
    const forceApplyUserTheme = () => {
        const now = Date.now();
        // Prevent rapid repeated applications (debounce 500ms)
        if (now - lastForceApplyTime < 500) {
            return;
        }
        lastForceApplyTime = now;
        
        const root = document.documentElement;
        const currentTheme = root.getAttribute('data-theme');
        
        // Force apply theme with maximum priority
        root.setAttribute('data-theme', userDefinedTheme);
        root.setAttribute('data-user-theme', userDefinedTheme);
        root.setAttribute('data-theme-timestamp', now);
        root.style.setProperty('--data-theme', userDefinedTheme, 'important');
        
        // Override all possible CSS classes
        root.className = root.className.replace(/theme-\w+/g, '') + ` theme-${userDefinedTheme}`;
        
        if (currentTheme !== userDefinedTheme) {
            console.log(`🔥 NUCLEAR OVERRIDE: ${currentTheme} → ${userDefinedTheme}`);
        }
        
        // Apply CSS variables with !important
        applyThemeForcefully(userDefinedTheme);
        
        // Fix icons when forcing theme
        setTimeout(() => {
            applyThemeSpecificStyling(userDefinedTheme);
        }, 50);
    };
    
    // Method 2: Hijack window.addEventListener to block Youware events
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = function(event, handler, options) {
        if (typeof handler === 'function') {
            const handlerString = handler.toString();
            // Block suspicious Youware event handlers
            if (handlerString.includes('data-theme') || 
                handlerString.includes('theme') && handlerString.includes('forest') ||
                handlerString.includes('theme') && handlerString.includes('ocean')) {
                console.log('🚫 BLOCKED Youware theme event listener');
                return;
            }
        }
        return originalAddEventListener.call(this, event, handler, options);
    };
    
    // Method 3: Override Youware's functions
    window.applyTheme = function(theme) {
        // Only allow our valid themes
        if (validThemes.includes(theme)) {
            console.log(`🔄 Valid theme request: ${theme}`);
            userDefinedTheme = theme;
            forceApplyUserTheme();
            return;
        }
        
        console.log(`🚫 BLOCKED theme change request: ${theme}, forcing ${userDefinedTheme}`);
        forceApplyUserTheme();
    };
    
    // Method 4: Continuous force application - LESS AGGRESSIVE
    const protectionInterval = setInterval(forceApplyUserTheme, 500); // Every 500ms instead of 100ms
    
    // Safety timeout to reduce resource usage after 2 minutes
    setTimeout(() => {
        clearInterval(protectionInterval);
        console.log('🛡️ Reduced theme protection frequency after initial protection period');
        // Switch to less frequent checking
        setInterval(forceApplyUserTheme, 2000);
    }, 120000);
    
    // Method 5: Mutation observer with controlled response (FIXED TO PREVENT LOOPS)
    let isUpdatingTheme = false; // Flag to prevent infinite loops
    const observer = new MutationObserver((mutations) => {
        if (isUpdatingTheme) return; // Skip if we're updating theme ourselves
        
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && 
                mutation.attributeName === 'data-theme' && 
                mutation.target === document.documentElement) {
                
                const newTheme = mutation.target.getAttribute('data-theme');
                
                // If new theme is valid but not current user choice, update user choice
                if (validThemes.includes(newTheme) && newTheme !== userDefinedTheme) {
                    console.log(`✅ Valid theme change detected: ${newTheme}`);
                    userDefinedTheme = newTheme;
                    // Allow this change but still apply our styling
                    applyThemeSpecificStyling(newTheme);
                    return;
                }
                
                // Otherwise, restore our theme (but prevent loops)
                if (newTheme !== userDefinedTheme && !isUpdatingTheme) {
                    console.log(`🚨 IMMEDIATE COUNTER-ATTACK: ${newTheme} → ${userDefinedTheme}`);
                    isUpdatingTheme = true; // Set flag before update
                    
                    // Immediate restore - no delay
                    mutation.target.setAttribute('data-theme', userDefinedTheme);
                    applyThemeForcefully(userDefinedTheme);
                    
                    // Fix icons and reset flag
                    setTimeout(() => {
                        applyThemeSpecificStyling(userDefinedTheme);
                        isUpdatingTheme = false; // Reset flag after update
                    }, 100);
                }
            }
        });
    });
    
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'class'],
        subtree: false
    });
    
    // Method 6: Block all external script injections
    const originalSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, value) {
        if (this === document.documentElement && name === 'data-theme') {
            // If it's a valid theme request, update our user choice
            if (validThemes.includes(value)) {
                // Only log if theme actually changed to prevent spam
                if (userDefinedTheme !== value) {
                    console.log(`✅ Valid setAttribute data-theme=${value}`);
                    userDefinedTheme = value;
                    // Apply our enhanced theme styling
                    setTimeout(() => {
                        applyThemeSpecificStyling(value);
                    }, 50);
                }
                return originalSetAttribute.call(this, name, value);
            }
            
            // Otherwise block the change
            console.log(`🚫 BLOCKED setAttribute data-theme=${value}, keeping ${userDefinedTheme}`);
            return originalSetAttribute.call(this, name, userDefinedTheme);
        }
        return originalSetAttribute.call(this, name, value);
    };
    
    // Initial force application
    forceApplyUserTheme();
    
    console.log('💣 NUCLEAR THEME PROTECTION FULLY DEPLOYED');
}

// Apply theme with maximum force
function applyThemeForcefully(themeName) {
    const root = document.documentElement;
    
    // Validate theme name - only allow our themes
    const validThemes = ['arctic', 'sakura', 'cosmic', 'sunset'];
    if (!validThemes.includes(themeName)) {
        console.warn(`❌ Invalid theme in forceful application: ${themeName}. Falling back to default 'sunset' theme.`);
        themeName = 'sunset';
    }
    
    // Method 1: Data attribute
    root.setAttribute('data-theme', themeName);
    
    // Method 2: CSS Class
    root.className = root.className.replace(/theme-\w+/g, '') + ` theme-${themeName}`;
    
    // Method 3: CSS Variables override
    const themeVars = {
        arctic: {
            '--theme-primary': '#0EA5E9',
            '--theme-secondary': '#0284C7',
            '--theme-accent': '#38BDF8',
            '--theme-bg-start': '#F0F9FF',
            '--theme-bg-end': '#E0F2FE',
            '--theme-gradient': 'linear-gradient(135deg, #0EA5E9 0%, #3B82F6 35%, #1E40AF 70%, #1E3A8A 100%)',
            '--theme-gradient-bg': 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 25%, #BAE6FD 50%, #E0F2FE 75%, #F0F9FF 100%)',
            '--theme-glass': 'rgba(14, 165, 233, 0.08)',
            '--theme-text': '#0F172A',
            '--theme-text-light': '#475569',
            '--theme-body-bg': '#FAFCFF',
            '--theme-shadow': '0 25px 50px -12px rgba(14, 165, 233, 0.25)',
            '--theme-shadow-hover': '0 35px 60px -12px rgba(14, 165, 233, 0.4)',
            '--arctic-ice': '#E0F2FE',
            '--arctic-frost': '#BAE6FD',
            '--arctic-deep': '#0C4A6E',
            '--arctic-glow': 'rgba(56, 189, 248, 0.6)'
        },
        sakura: {
            '--theme-primary': '#EC4899',
            '--theme-secondary': '#DB2777',
            '--theme-accent': '#F472B6',
            '--theme-bg-start': '#FDF2F8',
            '--theme-bg-end': '#FCE7F3',
            '--theme-gradient': 'linear-gradient(135deg, #EC4899 0%, #BE185D 35%, #9D174D 70%, #831843 100%)',
            '--theme-gradient-bg': 'linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 25%, #FBCFE8 50%, #FCE7F3 75%, #FDF2F8 100%)',
            '--theme-glass': 'rgba(236, 72, 153, 0.08)',
            '--theme-text': '#1F1937',
            '--theme-text-light': '#64748B',
            '--theme-body-bg': '#FFFCFD',
            '--theme-shadow': '0 25px 50px -12px rgba(236, 72, 153, 0.25)',
            '--theme-shadow-hover': '0 35px 60px -12px rgba(236, 72, 153, 0.4)',
            '--sakura-petal': '#FBCFE8',
            '--sakura-blossom': '#F9A8D4',
            '--sakura-deep': '#9D174D',
            '--sakura-glow': 'rgba(244, 114, 182, 0.6)'
        },
        cosmic: {
            '--theme-primary': '#8B5CF6',
            '--theme-secondary': '#7C3AED',
            '--theme-accent': '#A78BFA',
            '--theme-bg-start': '#1E1B4B',
            '--theme-bg-end': '#312E81',
            '--theme-gradient': 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 25%, #6366F1 50%, #4F46E5 75%, #3730A3 100%)',
            '--theme-gradient-bg': 'linear-gradient(135deg, #1E1B4B 0%, #312E81 25%, #1E1B4B 50%, #0F0F23 75%, #1E1B4B 100%)',
            '--theme-glass': 'rgba(139, 92, 246, 0.15)',
            '--theme-text': '#E0E7FF',
            '--theme-text-light': '#C7D2FE',
            '--theme-body-bg': '#0F0F23',
            '--theme-shadow': '0 25px 50px -12px rgba(139, 92, 246, 0.4)',
            '--theme-shadow-hover': '0 35px 60px -12px rgba(139, 92, 246, 0.6)',
            '--cosmic-nebula': '#312E81',
            '--cosmic-star': '#A78BFA',
            '--cosmic-void': '#0F0F23',
            '--cosmic-glow': 'rgba(167, 139, 250, 0.8)'
        },
        sunset: {
            '--theme-primary': '#F59E0B',
            '--theme-secondary': '#D97706',
            '--theme-accent': '#FBBF24',
            '--theme-bg-start': '#FEF3C7',
            '--theme-bg-end': '#FDE68A',
            '--theme-gradient': 'linear-gradient(135deg, #F59E0B 0%, #EF4444 50%, #D97706 100%)',
            '--theme-gradient-bg': 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #FEF3C7 100%)',
            '--theme-glass': 'rgba(245, 158, 11, 0.1)',
            '--theme-text': '#374151',
            '--theme-text-light': '#6B7280',
            '--theme-body-bg': '#FFF7E6'
        }
    };
    
    // Check if this theme is already applied to prevent unnecessary re-applications
    const currentAppliedTheme = root.getAttribute('data-applied-theme');
    if (currentAppliedTheme === themeName) {
        return; // Skip if already applied
    }
    
    const vars = themeVars[themeName];
    if (vars) {
        Object.entries(vars).forEach(([prop, value]) => {
            root.style.setProperty(prop, value, 'important');
        });
    }
    
    // Mark this theme as applied to prevent re-application
    root.setAttribute('data-applied-theme', themeName);
    
    console.log(`🎨 FORCEFULLY APPLIED THEME: ${themeName}`);
}

// Apply homepage content from config
function applyHomepageContent(homepageConfig) {
    // Update page title
    if (homepageConfig.title && homepageConfig.title[currentLanguage]) {
        const titleElement = document.querySelector('title');
        if (titleElement) {
            titleElement.textContent = homepageConfig.title[currentLanguage];
        }
    }
    
    // Update hero title
    if (homepageConfig.heroTitle && homepageConfig.heroTitle[currentLanguage]) {
        const heroTitle = document.querySelector('h1[data-en][data-vi]');
        if (heroTitle) {
            heroTitle.textContent = homepageConfig.heroTitle[currentLanguage];
        }
    }
    
    // Update tagline
    if (homepageConfig.tagline && homepageConfig.tagline[currentLanguage]) {
        const taglineElements = document.querySelectorAll('[data-en*="beauty"][data-vi*="đẹp"]');
        taglineElements.forEach(el => {
            el.textContent = homepageConfig.tagline[currentLanguage];
        });
    }
    
    console.log('🏠 Homepage content applied for language:', currentLanguage);
}

// Fallback default configuration
function useDefaultConfig() {
    globalConfig = {
        "language": {
            "default": "en",
            "available": ["en", "vi"]
        },
        "currency": {
            "default": "USD",
            "available": ["USD", "VND", "EUR"]
        },
        "theme": {
            "name": "sunset",
            "primaryColor": "#3B82F6",
            "secondaryColor": "#10B981",
            "accentColor": "#F59E0B",
            "layout": "modern"
        },
        "homepage": {
            "title": {
                "en": "Vietnam Travel",
                "vi": "Du Lịch Việt Nam"
            },
            "tagline": {
                "en": "Discover the beauty of Vietnam",
                "vi": "Khám phá vẻ đẹp Việt Nam"
            },
            "heroTitle": {
                "en": "Explore Vietnam, Live Your Journey!",
                "vi": "Khám phá Việt Nam, Sống Hành Trình Của Bạn!"
            }
        }
    };
    
    // Store user's intended theme
    if (globalConfig.theme && globalConfig.theme.name) {
        userDefinedTheme = globalConfig.theme.name;
        console.log(`🎯 Default theme stored: ${userDefinedTheme}`);
    }
    
    applyGlobalConfig();
    
    // Setup theme protection for default config too
    setupThemeProtection();
    
    return globalConfig;
}

// Check if user needs initial setup - only use server/cookie data
async function checkUserSetupStatus() {
    try {
        // Check if user has saved configuration in cookie only
        const cookies = document.cookie.split(';');
        const configCookie = cookies.find(cookie => 
            cookie.trim().startsWith('vietnam_travel_ui_config=')
        );
        
        if (configCookie) {
            const configValue = decodeURIComponent(configCookie.split('=')[1]);
            const config = JSON.parse(configValue);
            
            // If setup is completed, no need for setup
            if (config.setupCompleted) {
                console.log('✅ User setup already completed');
                return false;
            }
        }
        
        console.log('🎯 User needs initial setup');
        return true;
        
    } catch (error) {
        console.error('❌ Error checking setup status:', error);
        // If error, assume setup is needed to be safe
        return true;
    }
}

// ===== AUTHENTICATION SYSTEM =====

// Note: Authentication system được khởi tạo trong main DOMContentLoaded listener ở cuối file

function initializeAuthSystem() {
    console.log('🔐 Initializing authentication system...');
    
    // Get modal elements
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    // Sign in/up button handlers
    setupAuthButtons();
    
    // Login form handler - handled by initializeFormSubmissions()
    
    // Register form handler - handled by initializeFormSubmissions()
    
    // Modal switch handlers
    setupModalSwitches();
    
    // Check if user is already authenticated
    checkAuthenticationStatus();
}

function setupAuthButtons() {
    // Sign in button
    const signInBtn = document.getElementById('signInBtn');
    if (signInBtn) {
        signInBtn.addEventListener('click', () => {
            openModal('loginModal');
        });
    }
    
    // Sign up button
    const signUpBtn = document.getElementById('signUpBtn');
    if (signUpBtn) {
        signUpBtn.addEventListener('click', () => {
            openModal('registerModal');
        });
    }
    
    // Close modal buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.fixed');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });
}

function setupModalSwitches() {
    // Switch to register from login
    const switchToRegister = document.getElementById('switchToRegister');
    if (switchToRegister) {
        switchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal('loginModal');
            setTimeout(() => openModal('registerModal'), 300);
        });
    }
    
    // Switch to login from register
    const switchToLogin = document.getElementById('switchToLogin');
    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal('registerModal');
            setTimeout(() => openModal('loginModal'), 300);
        });
    }
}

function handleSignIn(e) {
    console.log('🔵 ==> FRONTEND LOGIN CALLED <==');
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    console.log(`🔍 Login form data - Email: '${email}', Password: '${'*'.repeat(password.length)}'`);
    
    if (!email || !password) {
        console.log('❌ Validation failed - missing fields');
        showAuthError('loginError', 'Please fill in all fields', 'Vui lòng điền đầy đủ thông tin');
        return;
    }
    
    console.log('✅ Frontend validation passed');
    showAuthLoading('loginForm', true);
    
    // Show immediate feedback to user
    const notificationEl = document.createElement('div');
    notificationEl.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
    notificationEl.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-circle-notch fa-spin mr-2"></i>
            <span>${currentLanguage === 'vi' ? 'Đang đăng nhập...' : 'Logging in...'}</span>
        </div>
    `;
    document.body.appendChild(notificationEl);
    
    const requestBody = { email, password };
    console.log('🔍 Sending request to /api/login with:', requestBody);
    
    fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
    })
    .then(response => {
        console.log('🔍 Login API response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('🔍 Login API response data:', data);
        showAuthLoading('loginForm', false);
        
        // Remove processing notification
        document.body.removeChild(notificationEl);
        
        if (data.success) {
            console.log('✅ Login successful:', data);
            isAuthenticated = true;
            
            // Store admin status
            if (data.is_admin) {
                sessionStorage.setItem('is_admin', 'true');
                console.log('👑 User is admin - admin panel will be available');
            } else {
                sessionStorage.removeItem('is_admin');
                console.log('👤 User is regular user - no admin access');
            }
            
            // Display success message prominently
            const successNotification = document.createElement('div');
            successNotification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
            successNotification.innerHTML = `
                <div class="flex items-center">
                    <i class="fas fa-check-circle mr-2"></i>
                    <span>${currentLanguage === 'vi' ? 'Đăng nhập thành công!' : 'Login successful!'}</span>
                </div>
            `;
            document.body.appendChild(successNotification);
            
            // Also show in form
            showAuthError('loginError', 'Login successful! Redirecting...', 'Đăng nhập thành công! Đang chuyển hướng...', 'success');
            
            // Check if user needs initial setup before redirecting
            console.log('🔍 Checking user setup status...');
            checkUserSetupStatus().then(needsSetup => {
                if (needsSetup) {
                    console.log('🎯 First time login - redirecting to welcome setup');
                    setTimeout(() => {
                        window.location.href = 'welcome-setup.html';
                    }, 1500);
                } else {
                    console.log(`🔄 Redirecting to: ${data.redirect || 'dashboard.html'}`);
                    setTimeout(() => {
                        window.location.href = data.redirect || 'dashboard.html';
                    }, 1500);
                }
            });
        } else {
            console.log('❌ Login failed:', data);
            
            // Display error message prominently
            const errorNotification = document.createElement('div');
            errorNotification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
            errorNotification.innerHTML = `
                <div class="flex items-center">
                    <i class="fas fa-exclamation-circle mr-2"></i>
                    <span>${data.message || (currentLanguage === 'vi' ? 'Thông tin đăng nhập không đúng' : 'Invalid credentials')}</span>
                </div>
            `;
            document.body.appendChild(errorNotification);
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                if (document.body.contains(errorNotification)) {
                    document.body.removeChild(errorNotification);
                }
            }, 5000);
            
            showAuthError('loginError', data.message || 'Invalid credentials. Please try again.', data.message || 'Thông tin đăng nhập không đúng. Vui lòng thử lại.');
        }
    })
    .catch(error => {
        console.error('❌ Login error:', error);
        showAuthLoading('loginForm', false);
        
        // Remove processing notification if it exists
        if (document.body.contains(notificationEl)) {
            document.body.removeChild(notificationEl);
        }
        
        // Display network error message prominently
        const errorNotification = document.createElement('div');
        errorNotification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
        errorNotification.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-exclamation-circle mr-2"></i>
                <span>${currentLanguage === 'vi' ? 'Lỗi kết nối. Vui lòng thử lại.' : 'Network error. Please try again.'}</span>
            </div>
        `;
        document.body.appendChild(errorNotification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(errorNotification)) {
                document.body.removeChild(errorNotification);
            }
        }, 5000);
        
        showAuthError('loginError', 'Network error. Please try again.', 'Lỗi kết nối. Vui lòng thử lại.');
    });
}

function handleSignUp(e) {
    console.log('🔵 ==> FRONTEND REGISTER CALLED <==');
    e.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value.trim();
    const phone = document.getElementById('registerPhone') ? document.getElementById('registerPhone').value.trim() : '';
    const gender = document.getElementById('registerGender') ? document.getElementById('registerGender').value : '';
    const birthYear = document.getElementById('registerBirthYear') ? document.getElementById('registerBirthYear').value : '';
    
    console.log(`🔍 Register form data:`);
    console.log(`  - Name: '${name}'`);
    console.log(`  - Email: '${email}'`);
    console.log(`  - Password: '${'*'.repeat(password.length)}'`);
    console.log(`  - Phone: '${phone}'`);
    console.log(`  - Gender: '${gender}'`);
    console.log(`  - Birth Year: '${birthYear}'`);
    
    if (!name || !email || !password) {
        console.log('❌ Validation failed - missing required fields');
        showAuthError('registerError', 'Please fill in required fields', 'Vui lòng điền đầy đủ các trường bắt buộc');
        return;
    }
    
    console.log('✅ Frontend validation passed');
    showAuthLoading('registerForm', true);
    
    // Show immediate feedback to user
    const notificationEl = document.createElement('div');
    notificationEl.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
    notificationEl.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-circle-notch fa-spin mr-2"></i>
            <span>${currentLanguage === 'vi' ? 'Đang đăng ký...' : 'Registering...'}</span>
        </div>
    `;
    document.body.appendChild(notificationEl);
    
    const requestBody = { 
        name, 
        email, 
        password, 
        phone_number: phone,
        gender: gender || null,
        birth_year: birthYear || null
    };
    
    console.log('🔍 Sending request to /api/register with:', requestBody);
    
    fetch('/api/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
    })
    .then(response => {
        console.log('🔍 Register API response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('🔍 Register API response data:', data);
        showAuthLoading('registerForm', false);
        
        // Remove processing notification
        document.body.removeChild(notificationEl);
        
        if (data.success) {
            console.log('✅ Registration successful:', data);
            isAuthenticated = true;
            
            // New users are not admin by default
            console.log('👤 New user registered - no admin access');
            
            // Display success message prominently
            const successNotification = document.createElement('div');
            successNotification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
            successNotification.innerHTML = `
                <div class="flex items-center">
                    <i class="fas fa-check-circle mr-2"></i>
                    <span>${currentLanguage === 'vi' ? 'Đăng ký thành công!' : 'Registration successful!'}</span>
                </div>
            `;
            document.body.appendChild(successNotification);
            
            // Also show in form
            showAuthError('registerError', 'Registration successful! Redirecting to dashboard...', 'Đăng ký thành công! Đang chuyển đến dashboard...', 'success');
            
            // New users always need initial setup, redirect to welcome setup
            console.log('🎯 New user registration - redirecting to welcome setup');
            setTimeout(() => {
                window.location.href = 'welcome-setup.html';
            }, 2000);
        } else {
            console.log('❌ Registration failed:', data);
            
            // Display error message prominently
            const errorNotification = document.createElement('div');
            errorNotification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
            errorNotification.innerHTML = `
                <div class="flex items-center">
                    <i class="fas fa-exclamation-circle mr-2"></i>
                    <span>${data.message || (currentLanguage === 'vi' ? 'Đăng ký thất bại' : 'Registration failed')}</span>
                </div>
            `;
            document.body.appendChild(errorNotification);
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                if (document.body.contains(errorNotification)) {
                    document.body.removeChild(errorNotification);
                }
            }, 5000);
            
            showAuthError('registerError', data.message || 'Registration failed', data.message || 'Đăng ký thất bại');
        }
    })
    .catch(error => {
        console.error('❌ Registration error:', error);
        showAuthLoading('registerForm', false);
        
        // Remove processing notification if it exists
        if (document.body.contains(notificationEl)) {
            document.body.removeChild(notificationEl);
        }
        
        // Display network error message prominently
        const errorNotification = document.createElement('div');
        errorNotification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
        errorNotification.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-exclamation-circle mr-2"></i>
                <span>${currentLanguage === 'vi' ? 'Lỗi kết nối. Vui lòng thử lại.' : 'Network error. Please try again.'}</span>
            </div>
        `;
        document.body.appendChild(errorNotification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(errorNotification)) {
                document.body.removeChild(errorNotification);
            }
        }, 5000);
        
        showAuthError('registerError', 'Network error. Please try again.', 'Lỗi kết nối. Vui lòng thử lại.');
    });
}

function checkAuthenticationStatus() {
    // Check if we're on a page that requires auth
    const currentPage = window.location.pathname;
    if (currentPage.includes('dashboard') || currentPage.includes('admin')) {
        
        fetch('/api/check-admin', {
            method: 'GET',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            if (data.user_id) {
                isAuthenticated = true;
                console.log('✅ User authenticated:', data.user_name);
                
                // Update user display information
                updateUserDisplay(data.user_name, data.email);
                
                if (data.is_admin) {
                    sessionStorage.setItem('is_admin', 'true');
                    console.log('👑 Admin user detected');
                } else {
                    sessionStorage.removeItem('is_admin');
                    console.log('👤 Regular user');
                }
            } else {
                // Not authenticated, redirect to home
                if (currentPage.includes('dashboard') || currentPage.includes('admin')) {
                    window.location.href = '/';
                }
            }
        })
        .catch(error => {
            console.log('❌ Auth check failed:', error);
            // Redirect to home on auth check failure
            if (currentPage.includes('dashboard') || currentPage.includes('admin')) {
                window.location.href = '/';
            }
        });
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.style.opacity = '1';
            modal.querySelector('.bg-white').style.transform = 'scale(1)';
        }, 10);
        
        // Clear any previous errors
        const errorElement = modal.querySelector('[id$="Error"]');
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.opacity = '0';
        modal.querySelector('.bg-white').style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
}

function showAuthError(errorId, englishMessage, vietnameseMessage, type = 'error') {
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
        const messageSpan = errorElement.querySelector('.error-message');
        if (messageSpan) {
            messageSpan.textContent = currentLanguage === 'vi' ? vietnameseMessage : englishMessage;
        }
        
        // Change color based on type
        if (type === 'success') {
            errorElement.className = errorElement.className.replace('bg-red-', 'bg-green-').replace('text-red-', 'text-green-');
        } else {
            errorElement.className = errorElement.className.replace('bg-green-', 'bg-red-').replace('text-green-', 'text-red-');
        }
        
        errorElement.classList.remove('hidden');
        setTimeout(() => {
            errorElement.style.transform = 'translateY(0)';
            errorElement.style.opacity = '1';
        }, 10);
    }
}

function showAuthLoading(formId, isLoading) {
    const form = document.getElementById(formId);
    if (form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const btnText = submitBtn.querySelector('.btn-text');
        const loadingIcon = submitBtn.querySelector('.loading');
        
        if (isLoading) {
            submitBtn.disabled = true;
            btnText.style.opacity = '0';
            loadingIcon.classList.remove('hidden');
        } else {
            submitBtn.disabled = false;
            btnText.style.opacity = '1';
            loadingIcon.classList.add('hidden');
        }
    }
}

// Global language and currency management
let currentLanguage = 'en';
let currentCurrency = 'USD';
let isAuthenticated = false;
let currentRestaurantData = []; // Store current restaurant search results
let currentHotelData = []; // Store current hotel search results

// Xử lý ngôn ngữ và tiền tệ
function setupLanguageAndCurrency() {
    console.log('🌐 Setting up language and currency system...');
    
    // Currency & Language Toggle Button
    const currencyLanguageBtn = document.getElementById('currencyLanguageBtn');
    const currencyLanguageDropdown = document.getElementById('currencyLanguageDropdown');
    
    if (currencyLanguageBtn && currencyLanguageDropdown) {
        // Toggle dropdown
        currencyLanguageBtn.addEventListener('click', function() {
            currencyLanguageDropdown.classList.toggle('hidden');
        });
        
        // Hide dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!currencyLanguageBtn.contains(e.target) && !currencyLanguageDropdown.contains(e.target)) {
                currencyLanguageDropdown.classList.add('hidden');
            }
        });
        
        // Language Selection
        document.querySelectorAll('[data-lang]').forEach(btn => {
            btn.addEventListener('click', function() {
                const lang = this.getAttribute('data-lang');
                updateLanguage(lang);
                currencyLanguageDropdown.classList.add('hidden');
                
                // Show success notification
                showNotification(
                    lang === 'vi' ? 'Đã thay đổi ngôn ngữ thành Tiếng Việt' : 'Language changed to English',
                    'success'
                );
            });
        });
        
        // Currency Selection
        document.querySelectorAll('[data-currency]').forEach(btn => {
            btn.addEventListener('click', function() {
                const currency = this.getAttribute('data-currency');
                updateCurrency(currency);
                currencyLanguageDropdown.classList.add('hidden');
                
                // Show success notification
                const currencyNames = {
                    'USD': currentLanguage === 'vi' ? 'Đô la Mỹ' : 'US Dollar',
                    'VND': currentLanguage === 'vi' ? 'Việt Nam Đồng' : 'Vietnamese Dong',
                    'EUR': currentLanguage === 'vi' ? 'Euro' : 'Euro'
                };
                
                showNotification(
                    currentLanguage === 'vi' 
                        ? `Đã thay đổi tiền tệ thành ${currencyNames[currency] || currency}`
                        : `Currency changed to ${currencyNames[currency] || currency}`,
                    'success'
                );
            });
        });
    }
    
    // Check unified preferences cookie first, then global config
    const prefs = getUserPreferences();
    
    if (prefs.language && (prefs.language === 'vi' || prefs.language === 'en')) {
        currentLanguage = prefs.language;
        console.log('🍪 Language loaded from preferences cookie:', prefs.language);
    } else if (globalConfig && globalConfig.language && globalConfig.language.default) {
        currentLanguage = globalConfig.language.default;
        console.log('🌐 Language loaded from server config:', globalConfig.language.default);
    }
    
    if (prefs.currency && ['USD', 'VND', 'EUR'].includes(prefs.currency)) {
        currentCurrency = prefs.currency;
        console.log('🍪 Currency loaded from preferences cookie:', prefs.currency);
    } else if (globalConfig && globalConfig.currency && globalConfig.currency.default) {
        currentCurrency = globalConfig.currency.default;
        console.log('💰 Currency loaded from server config:', globalConfig.currency.default);
    }
}

// Update language across the site
function updateLanguage(lang) {
    currentLanguage = lang;
    
    // Save to unified preferences cookie
    const prefs = getUserPreferences();
    prefs.language = lang;
    saveUserPreferences(prefs);
    
    // Update display
    const currentLanguageEl = document.getElementById('currentLanguage');
    if (currentLanguageEl) {
        currentLanguageEl.textContent = lang.toUpperCase();
    }
    
    // Update all text elements that have data-en and data-vi attributes
    document.querySelectorAll('[data-en][data-vi]').forEach(el => {
        el.textContent = el.getAttribute(`data-${lang}`) || el.getAttribute('data-en');
    });
    
    // Update all placeholders that have data-en-placeholder and data-vi-placeholder attributes
    document.querySelectorAll('[data-en-placeholder][data-vi-placeholder]').forEach(el => {
        el.placeholder = el.getAttribute(`data-${lang}-placeholder`) || el.getAttribute('data-en-placeholder');
    });
    
    // Update all titles that have data-en-title and data-vi-title attributes
    document.querySelectorAll('[data-en-title][data-vi-title]').forEach(el => {
        el.title = el.getAttribute(`data-${lang}-title`) || el.getAttribute('data-en-title');
    });
    
    // Update all aria-labels that have data-en-label and data-vi-label attributes
    document.querySelectorAll('[data-en-label][data-vi-label]').forEach(el => {
        el.setAttribute('aria-label', el.getAttribute(`data-${lang}-label`) || el.getAttribute('data-en-label'));
    });
    
    console.log(`🌐 Language changed to: ${lang.toUpperCase()}`);
}

// Helper function to get cookie with enhanced error handling
function getCookie(name) {
    try {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            const cookieValue = parts.pop().split(';').shift();
            return cookieValue;
        }
        return null;
    } catch (error) {
        console.error(`❌ Error getting cookie '${name}':`, error);
        return null;
    }
}

// Helper function to set cookie
function setCookie(name, value, days = 30) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    
    // Set domain for sharing across subdomains if needed
    let domain = '';
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        const parts = window.location.hostname.split('.');
        if (parts.length > 1) {
            // Use domain like .example.com to work across subdomains
            domain = `;domain=.${parts.slice(-2).join('.')}`;
        }
    }
    
    // Set the cookie with SameSite=Lax for better security while still allowing normal navigation
    // Do not encode to ensure compatibility with welcome-setup
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/${domain};SameSite=Lax`;
    console.log(`🍪 Cookie set: ${name} (expires: ${expires.toDateString()})`);
}

// Unified preferences management - language and currency in one cookie
function getUserPreferences() {
    // Try to load from localStorage first
    try {
        const storedPrefs = localStorage.getItem('vietnam_travel_ui_config');
        if (storedPrefs) {
            const prefs = JSON.parse(storedPrefs);
            console.log('✅ Preferences loaded from localStorage:', prefs);
            return prefs;
        }
    } catch (error) {
        console.warn('⚠️ Error reading localStorage, falling back to cookie', error);
    }
    
    // Then try cookie
    const prefsCookie = getCookie('vietnam_travel_ui_config');
    if (prefsCookie) {
        try {
            // Có thể cookie đã được encodeURIComponent hoặc không
            // Thử parse trực tiếp trước
            let parsedPrefs;
            try {
                parsedPrefs = JSON.parse(prefsCookie);
            } catch {
                // Nếu không parse được trực tiếp, thử decode rồi parse
                parsedPrefs = JSON.parse(decodeURIComponent(prefsCookie));
            }
            
            // Store in localStorage for future use
            try {
                localStorage.setItem('vietnam_travel_ui_config', JSON.stringify(parsedPrefs));
            } catch (e) {
                console.warn('⚠️ Could not save to localStorage:', e);
            }
            
            console.log('✅ Preferences loaded from cookie:', parsedPrefs);
            return parsedPrefs;
        } catch (error) {
            console.warn('🍪 Invalid preferences cookie, using defaults');
            return { language: 'en', currency: 'USD' };
        }
    }
    
    // Kiểm tra và di chuyển dữ liệu từ các cookie cũ sang cookie mới thống nhất
    const legacyNames = ['vietnam_travel_preferences', 'vietnam_travel_user_config'];
    for (let name of legacyNames) {
        if (name === 'vietnam_travel_ui_config') continue; // Bỏ qua nếu trùng với cookieName hiện tại
        
        const legacyCookie = getCookie(name);
        if (legacyCookie) {
            console.log(`🔄 Migrating legacy cookie: ${name} to vietnam_travel_ui_config`);
            try {
                // Cũng thử cả hai cách (decode và không decode)
                let config;
                try {
                    config = JSON.parse(legacyCookie);
                } catch {
                    config = JSON.parse(decodeURIComponent(legacyCookie));
                }
                
                // Giữ cấu hình theme và setup nếu đang có trong cookie mới
                const currentPrefs = { language: 'en', currency: 'USD' }; // Avoid recursive call
                if (config.theme) {
                    currentPrefs.theme = config.theme;
                }
                if (config.setupCompleted) {
                    currentPrefs.setupCompleted = config.setupCompleted;
                    currentPrefs.setupDate = config.setupDate;
                }
                
                // Merge with legacy data
                const mergedConfig = {...currentPrefs, ...config};
                
                // Lưu vào cookie mới và localStorage
                saveUserPreferences(mergedConfig);
                
                // Xóa cookie cũ
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                console.log(`🗑️ Removed legacy cookie: ${name}`);
                return mergedConfig;
            } catch (e) {
                console.error(`Error migrating ${name} cookie:`, e);
            }
        }
    }
    
    // Default preferences
    const defaultPrefs = { 
        language: 'en', 
        currency: 'USD',
        // Add default preferences to ensure consistency
        theme: 'sunset',
        setupCompleted: false
    };
    
    // Save default preferences
    saveUserPreferences(defaultPrefs);
    
    return defaultPrefs;
}

function saveUserPreferences(preferences) {
    // Validate preferences object
    if (!preferences || typeof preferences !== 'object') {
        console.error('❌ Invalid preferences object:', preferences);
        return;
    }
    
    // Ensure required fields are present
    if (!preferences.language) preferences.language = 'en';
    if (!preferences.currency) preferences.currency = 'USD';
    
    // Ensure the timestamp is updated whenever preferences are saved
    preferences.lastUpdated = new Date().toISOString();
    
    const prefsString = JSON.stringify(preferences);
    
    // Lưu vào cookie mà không encode để tương thích với welcome-setup
    setCookie('vietnam_travel_ui_config', prefsString, 365);
    
    // Lưu song song vào localStorage để truy cập nhanh hơn và dùng khi offline
    try {
        localStorage.setItem('vietnam_travel_ui_config', prefsString);
    } catch (e) {
        console.warn('⚠️ Could not save to localStorage:', e);
    }
    
    // Lưu vào sessionStorage để sử dụng trong phiên hiện tại
    try {
        sessionStorage.setItem('vietnam_travel_ui_config', prefsString);
    } catch (e) {
        console.warn('⚠️ Could not save to sessionStorage:', e);
    }
    
    // Broadcast the changes to other tabs/windows
    try {
        if (window.BroadcastChannel) {
            const bc = new BroadcastChannel('vietnam_travel_preferences_channel');
            bc.postMessage({
                type: 'preferences_updated',
                data: preferences
            });
        }
    } catch (e) {
        console.warn('⚠️ Could not broadcast preference change:', e);
    }
    
    console.log('💾 User preferences saved:', preferences);
    
    // Trigger a custom event that other components can listen for
    window.dispatchEvent(new CustomEvent('userPreferencesUpdated', {
        detail: preferences
    }));
}

// Update currency across the site
function updateCurrency(currency) {
    currentCurrency = currency;
    
    // Save to unified preferences cookie
    const prefs = getUserPreferences();
    prefs.currency = currency;
    saveUserPreferences(prefs);
    
    // Update display
    const currentCurrencyEl = document.getElementById('currentCurrency');
    if (currentCurrencyEl) {
        currentCurrencyEl.textContent = currency;
    }
    
    // Update prices displayed on the page
    updatePriceDisplay();
    
    console.log(`💰 Currency changed to: ${currency}`);
}

// Update price displays based on selected currency
function updatePriceDisplay() {
    // Get user preferences from localStorage
    const prefs = getUserPreferences();
    
    // Currency conversion rates (simplified)
    const rates = {
        'USD': 1,
        'VND': 24000,
        'EUR': 0.85
    };
    
    // Currency symbols
    const symbols = {
        'USD': '$',
        'VND': '₫',
        'EUR': '€'
    };
    
    // Currency format options
    const formatOptions = {
        'USD': {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        },
        'VND': {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        },
        'EUR': {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    };
    
    // Get language code for number formatting
    const langCode = currentLanguage === 'vi' ? 'vi-VN' : 'en-US';
    
    // Function to format price according to locale and currency
    const formatPrice = (basePrice, currency) => {
        const convertedPrice = basePrice * rates[currency];
        
        // Try to use Intl.NumberFormat for better formatting
        try {
            return new Intl.NumberFormat(langCode, formatOptions[currency]).format(convertedPrice);
        } catch (error) {
            // Fallback to basic formatting
            const formattedPrice = currency === 'VND' 
                ? Math.round(convertedPrice).toLocaleString(langCode) 
                : convertedPrice.toFixed(0);
            
            return `${symbols[currency]}${formattedPrice}`;
        }
    };
    
    // Update all elements with data-price attribute
    document.querySelectorAll('[data-price]').forEach(el => {
        const basePrice = parseFloat(el.getAttribute('data-price') || '0');
        if (!isNaN(basePrice)) {
            el.textContent = formatPrice(basePrice, currentCurrency);
        }
    });
    
    // Update specific price elements by class
    const priceElementClasses = [
        '.hotel-price', '.restaurant-price', '.tour-price', 
        '.price', '.product-price', '.service-price'
    ];
    
    priceElementClasses.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            if (el.hasAttribute('data-price')) return; // Skip if already processed
            
            const basePrice = parseFloat(el.getAttribute('data-price-usd') || el.getAttribute('data-price') || '0');
            if (basePrice) {
                el.textContent = formatPrice(basePrice, currentCurrency);
                
                // Store formatted price as data attribute for future use
                el.setAttribute('data-formatted-price', formatPrice(basePrice, currentCurrency));
            }
        });
    });
    
    // Trigger an event that other components can listen for
    window.dispatchEvent(new CustomEvent('pricesUpdated', {
        detail: { currency: currentCurrency }
    }));
}

// ===== AUTO-COMPLETE GHOST TEXT CLASS =====
class GhostTextAutoComplete {
    constructor(inputElement, options = {}) {
        this.input = inputElement;
        this.options = {
            minLength: 2,
            debounceDelay: 200,
            apiEndpoint: options.apiEndpoint,
            placeholder: options.placeholder || '',
            onSelect: options.onSelect || (() => {}),
            ...options
        };
        
        this.currentSuggestion = '';
        this.ghostTextElement = null;
        this.tabHintElement = null;
        this.debounceTimer = null;
        
        this.init();
    }
    
    init() {
        this.setupGhostTextContainer();
        this.bindEvents();
    }
    
    setupGhostTextContainer() {
        // Wrap input in container
        const container = document.createElement('div');
        container.className = 'input-with-ghost';
        
        this.input.parentNode.insertBefore(container, this.input);
        container.appendChild(this.input);
        
        // Create ghost text element
        this.ghostTextElement = document.createElement('div');
        this.ghostTextElement.className = 'ghost-text';
        this.ghostTextElement.innerHTML = '<span class="ghost-text-content"></span>';
        container.appendChild(this.ghostTextElement);
        
        // Create tab hint
        this.tabHintElement = document.createElement('div');
        this.tabHintElement.className = 'tab-hint';
        this.tabHintElement.innerHTML = '<i class="fas fa-keyboard"></i>Press Tab to complete';
        container.appendChild(this.tabHintElement);
        
        this.container = container;
    }
    
    bindEvents() {
        // Input events
        this.input.addEventListener('input', (e) => this.handleInput(e));
        this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.input.addEventListener('focus', () => this.handleFocus());
        this.input.addEventListener('blur', () => this.handleBlur());
        
        // Clear suggestion when input changes
        this.input.addEventListener('change', () => this.clearSuggestion());
    }
    
    handleInput(e) {
        const value = e.target.value.trim();
        
        // Clear suggestion if input is too short
        if (value.length < this.options.minLength) {
            this.clearSuggestion();
            return;
        }
        
        // Debounce API calls
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.fetchSuggestion(value);
        }, this.options.debounceDelay);
    }
    
    handleKeyDown(e) {
        // Handle Tab key for completion
        if (e.key === 'Tab' && this.currentSuggestion) {
            e.preventDefault();
            this.completeSuggestion();
            return;
        }
        
        // Handle Escape to clear suggestion
        if (e.key === 'Escape') {
            this.clearSuggestion();
            return;
        }
        
        // Clear suggestion on other navigation keys
        if (['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
            this.clearSuggestion();
        }
    }
    
    handleFocus() {
        if (this.currentSuggestion) {
            this.showTabHint();
        }
    }
    
    handleBlur() {
        // Delay to allow tab completion
        setTimeout(() => {
            this.hideTabHint();
        }, 150);
    }
    
    async fetchSuggestion(query) {
        try {
            // Determine the correct API endpoint based on input type
            let apiEndpoint = this.getApiEndpoint();
            
            if (!apiEndpoint) {
                console.warn('No API endpoint configured for this input type');
                this.clearSuggestion();
                return;
            }
            
            // Build API URL with query parameter
            let apiUrl = `${apiEndpoint}?q=${encodeURIComponent(query)}`;
            
            // For city inputs, add country context if available
            if (this.input.id.includes('city') || this.input.id.includes('City')) {
                const countryInput = this.getCountryContextInput();
                if (countryInput && countryInput.value.trim()) {
                    apiUrl += `&country=${encodeURIComponent(countryInput.value.trim())}`;
                }
            }
            
            console.log(`Ghost text API call: ${apiUrl}`);
            
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.suggestion && data.suggestion.trim()) {
                const suggestion = data.suggestion.trim();
                
                // Only show suggestion if it's different from current input
                if (suggestion.toLowerCase() !== query.toLowerCase()) {
                    this.showSuggestion(query, suggestion);
                } else {
                    this.clearSuggestion();
                }
            } else {
                this.clearSuggestion();
            }
            
        } catch (error) {
            console.warn(`Ghost text API error for ${this.input.id}:`, error);
            this.clearSuggestion();
        }
    }
    
    getApiEndpoint() {
        // Determine API endpoint based on input ID and type
        const inputId = this.input.id.toLowerCase();
        
        if (inputId.includes('country')) {
            return '/api/ghost/countries';
        }
        
        if (inputId.includes('city')) {
            return '/api/ghost/cities';
        }
        
        if (inputId.includes('restaurant')) {
            return '/api/ghost/restaurants';
        }
        
        if (inputId.includes('hotel')) {
            return '/api/ghost/hotels';
        }
        
        return null;
    }
    
    getCountryContextInput() {
        // For city inputs, try to find the corresponding country input
        if (this.input.id.includes('City')) {
            const countryInputId = this.input.id.replace('City', 'Country');
            return document.getElementById(countryInputId);
        }
        
        if (this.input.id.includes('city')) {
            const countryInputId = this.input.id.replace('city', 'country');
            return document.getElementById(countryInputId);
        }
        
        return null;
    }
    
    handleFallbackSuggestion(query) {
        // Early exit if query is too short
        if (!query || query.length < 2) {
            this.clearSuggestion();
            return;
        }
        
        // Fallback suggestions based on input type
        const suggestions = this.getFallbackSuggestions();
        
        // Find matches that start with the query (case insensitive)
        const matches = suggestions.filter(item => 
            item.toLowerCase().startsWith(query.toLowerCase())
        );
        
        // If no exact matches, try to find partial matches in the middle of words
        if (matches.length === 0) {
            const partialMatches = suggestions.filter(item => 
                item.toLowerCase().includes(query.toLowerCase()) && 
                !item.toLowerCase().startsWith(query.toLowerCase())
            );
            
            if (partialMatches.length > 0) {
                // Use the first partial match
                this.showSuggestion(query, partialMatches[0]);
                return;
            }
            
            // If still no matches, try fuzzy matching (allowing 1 character difference)
            const fuzzyMatches = suggestions.filter(item => {
                const lowercaseItem = item.toLowerCase();
                const lowercaseQuery = query.toLowerCase();
                
                // Simple Levenshtein distance for short queries
                if (lowercaseQuery.length <= 3) {
                    let differentChars = 0;
                    for (let i = 0; i < Math.min(lowercaseQuery.length, 3); i++) {
                        if (lowercaseItem[i] !== lowercaseQuery[i]) {
                            differentChars++;
                        }
                    }
                    return differentChars <= 1 && lowercaseItem.length >= lowercaseQuery.length;
                }
                
                return false;
            });
            
            if (fuzzyMatches.length > 0) {
                this.showSuggestion(query, fuzzyMatches[0]);
                return;
            }
            
            // No matches found
            this.clearSuggestion();
            return;
        }
        
        // Use the first match if there are multiple
        const bestMatch = matches[0];
        
        // Only show suggestion if it's different from the query
        if (bestMatch.toLowerCase() !== query.toLowerCase()) {
            this.showSuggestion(query, bestMatch);
        } else {
            this.clearSuggestion();
        }
    }
    
    getFallbackSuggestions() {
        const fallbackData = {
            countries: [
                'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
                'Bahrain', 'Bangladesh', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
                'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
                'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
                'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia',
                'Fiji', 'Finland', 'France',
                'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
                'Haiti', 'Honduras', 'Hungary',
                'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
                'Jamaica', 'Japan', 'Jordan',
                'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan',
                'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
                'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
                'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway',
                'Oman',
                'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
                'Qatar',
                'Romania', 'Russia', 'Rwanda',
                'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
                'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
                'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan',
                'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam',
                'Yemen',
                'Zambia', 'Zimbabwe'
            ],
            cities: {
                vietnam: ['Ha Noi', 'Ho Chi Minh', 'Da Nang', 'Hoi An', 'Nha Trang', 'Phu Quoc', 'Can Tho', 'Hue', 'Dalat', 'Vung Tau', 'Haiphong', 'Quy Nhon', 'Sa Pa', 'Ha Long', 'Buon Ma Thuot', 'Vinh', 'Thai Nguyen', 'Cao Bang', 'Lang Son', 'Dien Bien Phu'],
                thailand: ['Bangkok', 'Phuket', 'Chiang Mai', 'Pattaya', 'Krabi', 'Koh Samui', 'Hua Hin', 'Ayutthaya', 'Kanchanaburi', 'Koh Phi Phi', 'Chiang Rai', 'Sukhothai', 'Udon Thani', 'Koh Chang', 'Rayong'],
                china: ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Hangzhou', 'Chengdu', 'Xian', 'Suzhou', 'Nanjing', 'Wuhan', 'Chongqing', 'Tianjin', 'Shenyang', 'Harbin', 'Kunming', 'Dalian', 'Qingdao', 'Xiamen', 'Ningbo', 'Changsha'],
                usa: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Boston', 'El Paso', 'Nashville', 'Detroit', 'Oklahoma City', 'Portland', 'Las Vegas', 'Memphis', 'Louisville', 'Baltimore', 'Milwaukee'],
                japan: ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Hiroshima', 'Sendai', 'Chiba', 'Kitakyushu', 'Sakai', 'Niigata', 'Hamamatsu', 'Okayama', 'Sagamihara', 'Kumamoto', 'Shizuoka', 'Kagoshima'],
                singapore: ['Singapore', 'Jurong', 'Tampines', 'Woodlands', 'Sengkang', 'Hougang', 'Yishun', 'Bedok', 'Punggol', 'Ang Mo Kio'],
                malaysia: ['Kuala Lumpur', 'George Town', 'Ipoh', 'Shah Alam', 'Petaling Jaya', 'Johor Bahru', 'Malacca', 'Kota Kinabalu', 'Kuching', 'Seremban'],
                indonesia: ['Jakarta', 'Surabaya', 'Bandung', 'Bekasi', 'Medan', 'Depok', 'Tangerang', 'Palembang', 'Semarang', 'Makassar', 'Batam', 'Bogor', 'Pekanbaru', 'Bandar Lampung', 'Padang'],
                philippines: ['Manila', 'Quezon City', 'Caloocan', 'Las Piñas', 'Makati', 'Taguig', 'Pasig', 'Antipolo', 'Parañaque', 'Muntinlupa', 'Cebu City', 'Davao City', 'Iloilo City', 'Cagayan de Oro', 'Zamboanga City'],
                southkorea: ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon', 'Gwangju', 'Suwon', 'Ulsan', 'Changwon', 'Goyang', 'Yongin', 'Seongnam', 'Bucheon', 'Cheongju', 'Ansan'],
                india: ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Visakhapatnam', 'Indore', 'Thane', 'Bhopal', 'Pimpri-Chinchwad', 'Patna', 'Vadodara'],
                australia: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Canberra', 'Newcastle', 'Wollongong', 'Logan City', 'Geelong', 'Hobart', 'Townsville', 'Cairns', 'Toowoomba'],
                unitedkingdom: ['London', 'Birmingham', 'Manchester', 'Glasgow', 'Liverpool', 'Leeds', 'Sheffield', 'Edinburgh', 'Bristol', 'Cardiff', 'Leicester', 'Wakefield', 'Coventry', 'Nottingham', 'Belfast'],
                france: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Le Havre', 'Saint-Étienne', 'Toulon'],
                germany: ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig', 'Bremen', 'Dresden', 'Hanover', 'Nuremberg', 'Duisburg'],
                italy: ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Bologna', 'Florence', 'Bari', 'Catania', 'Venice', 'Verona', 'Messina', 'Padua', 'Trieste'],
                spain: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Las Palmas', 'Bilbao', 'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Gijón'],
                canada: ['Toronto', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton', 'Mississauga', 'Winnipeg', 'Vancouver', 'Brampton', 'Hamilton', 'Quebec City', 'Surrey', 'Laval', 'Halifax', 'London'],
                brazil: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Manaus', 'Curitiba', 'Recife', 'Goiânia', 'Belém', 'Porto Alegre', 'Guarulhos', 'Campinas', 'São Luís'],
                general: ['Tokyo', 'New York', 'London', 'Paris', 'Sydney', 'Rome', 'Barcelona', 'Berlin', 'Toronto', 'Cairo', 'Dubai', 'Istanbul', 'Moscow', 'Buenos Aires', 'Mexico City']
            },
            restaurants: [
                'Pho Hanoi Traditional', 'Sakura Sushi Premium', 'Italian Garden Bistro', 
                'Royal Thai Palace', 'French Elegance Café', 'Spicy Indian Curry House',
                'Mediterranean Delight', 'Seafood Harbor', 'Steakhouse Premium', 
                'Vegetarian Oasis', 'Coffee & Dessert Paradise', 'Asian Fusion',
                'Mexican Cantina', 'American Diner', 'BBQ Smokehouse'
            ],
            hotels: [
                'Luxury Resort & Spa', 'Grand Hotel Premium', 'Boutique Hotel Elite', 
                'Beach Resort Paradise', 'City Center Hotel', 'Mountain View Lodge',
                'Business Hotel Executive', 'Family Resort & Suites', 'Heritage Hotel', 
                'Airport Hotel Express', 'Riverside Inn', 'Budget Hotel Comfort',
                'Eco Resort & Spa', 'Urban Loft Hotel', 'Skyline Tower Hotel'
            ]
        };

        // First, determine suggestion type based on input ID
        let suggestionType = '';
        
        if (this.input.id.includes('country') || this.input.id.includes('Country')) {
            return fallbackData.countries;
        }
        
        if (this.input.id.includes('city') || this.input.id.includes('City')) {
            // Check if we can determine country context
            const countryInput = document.getElementById(this.input.id.replace('City', 'Country'));
            if (countryInput && countryInput.value) {
                const country = countryInput.value.toLowerCase().replace(/\s+/g, '');
                
                // Match country with city data
                const countryMappings = {
                    'vietnam': 'vietnam',
                    'thailand': 'thailand', 
                    'china': 'china',
                    'usa': 'usa',
                    'unitedstates': 'usa',
                    'japan': 'japan',
                    'singapore': 'singapore',
                    'malaysia': 'malaysia',
                    'indonesia': 'indonesia',
                    'philippines': 'philippines',
                    'southkorea': 'southkorea',
                    'korea': 'southkorea',
                    'india': 'india',
                    'australia': 'australia',
                    'unitedkingdom': 'unitedkingdom',
                    'uk': 'unitedkingdom',
                    'england': 'unitedkingdom',
                    'britain': 'unitedkingdom',
                    'france': 'france',
                    'germany': 'germany',
                    'italy': 'italy',
                    'spain': 'spain',
                    'canada': 'canada',
                    'brazil': 'brazil'
                };
                
                const mappedCountry = countryMappings[country];
                if (mappedCountry && fallbackData.cities[mappedCountry]) {
                    return fallbackData.cities[mappedCountry];
                }
            }
            
            // If no country context or no specific mapping, return all cities from major countries
            return [
                ...fallbackData.cities.vietnam,
                ...fallbackData.cities.thailand,
                ...fallbackData.cities.china,
                ...fallbackData.cities.usa,
                ...fallbackData.cities.japan,
                ...fallbackData.cities.singapore,
                ...fallbackData.cities.malaysia,
                ...fallbackData.cities.indonesia,
                ...fallbackData.cities.philippines,
                ...fallbackData.cities.southkorea,
                ...fallbackData.cities.india,
                ...fallbackData.cities.australia,
                ...fallbackData.cities.unitedkingdom,
                ...fallbackData.cities.france,
                ...fallbackData.cities.germany,
                ...fallbackData.cities.italy,
                ...fallbackData.cities.spain,
                ...fallbackData.cities.canada,
                ...fallbackData.cities.brazil,
                ...fallbackData.cities.general
            ];
        }
        
        if (this.input.id.includes('restaurant') || this.input.id.includes('Restaurant')) {
            return fallbackData.restaurants;
        }
        
        if (this.input.id.includes('hotel') || this.input.id.includes('Hotel')) {
            return fallbackData.hotels;
        }
        
        // Default fallback
        return [];
    }
    
    showSuggestion(userInput, suggestion) {
        if (suggestion.toLowerCase().startsWith(userInput.toLowerCase())) {
            const remainingText = suggestion.substring(userInput.length);
            
            this.currentSuggestion = suggestion;
            
            // Update ghost text
            const ghostContent = this.ghostTextElement.querySelector('.ghost-text-content');
            ghostContent.textContent = userInput + remainingText;
            
            // Add visual indicators
            this.container.classList.add('has-suggestion');
            this.showTabHint();
        } else {
            this.clearSuggestion();
        }
    }
    
    clearSuggestion() {
        this.currentSuggestion = '';
        
        const ghostContent = this.ghostTextElement.querySelector('.ghost-text-content');
        ghostContent.textContent = '';
        
        this.container.classList.remove('has-suggestion');
        this.hideTabHint();
    }
    
    completeSuggestion() {
        if (this.currentSuggestion) {
            this.input.value = this.currentSuggestion;
            this.clearSuggestion();
            
            // Trigger change event
            this.input.dispatchEvent(new Event('change', { bubbles: true }));
            this.input.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Call onSelect callback
            this.options.onSelect(this.currentSuggestion);
            
            // Visual feedback
            this.input.style.background = 'rgba(34, 197, 94, 0.1)';
            setTimeout(() => {
                this.input.style.background = '';
            }, 500);
        }
    }
    
    showTabHint() {
        if (this.currentSuggestion && this.input === document.activeElement) {
            this.tabHintElement.classList.add('show');
        }
    }
    
    hideTabHint() {
        this.tabHintElement.classList.remove('show');
    }
    
    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.insertBefore(this.input, this.container);
            this.container.remove();
        }
        clearTimeout(this.debounceTimer);
    }
}

// Pagination state
let hotelPagination = {
    currentPage: 1,
    totalPages: 1,
    itemsPerPage: 10,
    allItems: []
};

let restaurantPagination = {
    currentPage: 1,
    totalPages: 1,
    itemsPerPage: 10,
    allItems: []
};

// Test account removed - using real API authentication

// Language translations
const translations = {
    en: {
        // Common
        'login': 'Login',
        'logout': 'Logout',
        'email': 'Email',
        'password': 'Password',
        'name': 'Name',
        'search': 'Search',
        'currency': 'Currency',
        'language': 'Language',
        
        // Auth
        'signIn': 'Sign In',
        'signUp': 'Sign Up',
        'enterEmail': 'Enter your email',
        'enterPassword': 'Enter your password',
        'enterFullName': 'Enter your full name',
        'authRequired': 'Authentication Required',
        'signInToAccess': 'Please sign in to access travel search features',
        
        // Success/Error messages
        'loginSuccess': 'Login successful! Redirecting to dashboard...',
        'loginFailed': 'Invalid credentials. Please try again.',
        'registerSuccess': 'Registration successful! Please login.',
        'downloadComplete': 'Source code download complete!',
        'downloadError': 'Download failed. Please try again.',
        'searchInProgress': 'Loading search again...',
        'logoutConfirm': 'Are you sure you want to logout?'
    },
    vi: {
        // Common
        'login': 'Đăng nhập',
        'logout': 'Đăng xuất',
        'email': 'Email',
        'password': 'Mật khẩu',
        'name': 'Tên',
        'search': 'Tìm kiếm',
        'currency': 'Tiền tệ',
        'language': 'Ngôn ngữ',
        
        // Auth
        'signIn': 'Đăng Nhập',
        'signUp': 'Đăng Ký',
        'enterEmail': 'Nhập email của bạn',
        'enterPassword': 'Nhập mật khẩu',
        'enterFullName': 'Nhập họ tên của bạn',
        'authRequired': 'Yêu Cầu Đăng Nhập',
        'signInToAccess': 'Vui lòng đăng nhập để sử dụng tính năng tìm kiếm',
        
        // Success/Error messages
        'loginSuccess': 'Đăng nhập thành công! Đang chuyển đến dashboard...',
        'loginFailed': 'Thông tin đăng nhập không hợp lệ. Vui lòng thử lại.',
        'registerSuccess': 'Đăng ký thành công! Vui lòng đăng nhập.',
        'downloadComplete': 'Tải source code hoàn tất!',
        'downloadError': 'Tải thất bại. Vui lòng thử lại.',
        'searchInProgress': 'Đang tải lại tìm kiếm...',
        'logoutConfirm': 'Bạn có chắc muốn đăng xuất?'
    }
};

// Exchange rates (simplified)
const exchangeRates = {
    USD_TO_VND: 24000,
    USD_TO_EUR: 0.85,
    VND_TO_USD: 1/24000,
    EUR_TO_USD: 1/0.85
};

// Theme System - Load and Apply Theme Configuration
async function loadThemeConfiguration() {
    try {
        // Try to load theme from site_config.json directly (for file:// protocol)
        if (window.location.protocol === 'file:') {
            try {
                const response = await fetch('./site_config.json');
                if (response.ok) {
                    const config = await response.json();
                    if (config.theme && config.theme.name) {
                        applyTheme(config.theme.name);
                        console.log('✅ Theme loaded from site_config.json:', config.theme.name);
                        return;
                    }
                }
            } catch (error) {
                console.log('Failed to load from site_config.json:', error);
            }
        } else {
            // Try to load theme from new global config API
            try {
                const response = await fetch('/api/config');
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.config && result.config.theme) {
                        applyTheme(result.config.theme.name || 'sunset');
                        console.log('✅ Theme loaded from server:', result.config.theme.name);
                        return;
                    } else {
                        console.log('✅ Theme loaded from server: undefined (using default)');
                    }
                }
            } catch (error) {
                console.log('Server config API not available:', error);
            }
            
            // Fallback to admin config API
            try {
                const response = await fetch('/api/admin/load-config');
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.config && result.config.theme) {
                        applyTheme(result.config.theme.name || 'sunset');
                        console.log('✅ Theme loaded from admin config:', result.config.theme.name);
                        return;
                    }
                }
            } catch (error) {
                console.log('Admin config API not available:', error);
            }
        }
    } catch (error) {
        console.log('Server not available, trying localStorage...');
    }
    
    // No localStorage fallback needed - rely on server only
    
    // Default theme
    applyTheme('sunset');
    console.log('✅ Using default theme: sunset');
}

// Apply theme to the document - ENHANCED WITH NEW THEMES
function applyTheme(themeName) {
    // Validate theme name - only allow arctic, sakura, cosmic, and sunset (default)
    const validThemes = ['arctic', 'sakura', 'cosmic', 'sunset'];
    if (!validThemes.includes(themeName)) {
        console.warn(`❌ Invalid theme: ${themeName}. Falling back to default 'sunset' theme.`);
        themeName = 'sunset';
    }
    
    // Remove existing theme classes - UPDATED WITH NEW THEMES
    const themes = ['arctic', 'sakura', 'cosmic', 'sunset'];
    themes.forEach(theme => {
        document.documentElement.classList.remove(`data-theme-${theme}`);
        document.body.classList.remove(`data-theme-${theme}`);
    });
    
    // Apply new theme
    document.documentElement.setAttribute('data-theme', themeName);
    document.body.setAttribute('data-theme', themeName);
    
    // No localStorage storage needed - server manages state
    
    // Add theme-specific classes for enhanced styling
    document.body.classList.add(`theme-${themeName}`);
    
    // Apply theme-specific fonts dynamically
    applyThemeSpecificStyling(themeName);
    
    console.log(`🎨 Enhanced Theme applied: ${themeName}`);
}

// Apply theme-specific dynamic styling
function applyThemeSpecificStyling(themeName) {
    const root = document.documentElement;
    
    // Remove existing font family overrides
    root.style.removeProperty('--theme-font-family');
    root.style.removeProperty('--theme-heading-font');
    
    // First, cleanup any previous theme effects
    removeThemeEffects();
    
    // Store all the theme's icons reference
    const allIcons = document.querySelectorAll('i.fas, i.far, i.fab, i.fa');
    
    switch(themeName) {
        case 'arctic':
            // Arctic theme specific enhancements
            root.style.setProperty('--theme-font-family', '"Segoe UI", "Helvetica Neue", Arial, sans-serif');
            root.style.setProperty('--theme-heading-font', '"SF Pro Display", "Segoe UI", Arial, sans-serif');
            
            // Fix icons for this theme - ensure they're visible
            allIcons.forEach(icon => {
                // Save original color if not already saved
                if (!icon.getAttribute('data-original-color')) {
                    icon.setAttribute('data-original-color', window.getComputedStyle(icon).color);
                }
                
                // Make sure icons are visible against the arctic background
                if (icon.classList.contains('fa-calendar') || 
                    icon.classList.contains('fa-clock') || 
                    icon.classList.contains('fa-search') ||
                    icon.classList.contains('fa-chevron-down')) {
                    icon.style.color = '#0EA5E9';
                }
            });
            
            // Add dynamic ice crystal effect
            addArcticEffects();
            break;
            
        case 'sakura':
            // Sakura theme specific enhancements  
            root.style.setProperty('--theme-font-family', '"Playfair Display", Georgia, "Times New Roman", serif');
            root.style.setProperty('--theme-heading-font', '"Playfair Display", Georgia, serif');
            
            // Fix icons for this theme
            allIcons.forEach(icon => {
                // Save original color if not already saved
                if (!icon.getAttribute('data-original-color')) {
                    icon.setAttribute('data-original-color', window.getComputedStyle(icon).color);
                }
                
                // Make sure icons are visible against the sakura background
                if (icon.classList.contains('fa-calendar') || 
                    icon.classList.contains('fa-clock') || 
                    icon.classList.contains('fa-search') ||
                    icon.classList.contains('fa-chevron-down')) {
                    icon.style.color = '#EC4899';
                }
            });
            
            // Add floating petals effect
            addSakuraEffects();
            break;
            
        case 'cosmic':
            // Cosmic theme specific enhancements
            root.style.setProperty('--theme-font-family', '"Fira Code", Monaco, Consolas, monospace');
            root.style.setProperty('--theme-heading-font', 'Orbitron, "Fira Code", monospace');
            
            // Fix icons for this theme - need to be brighter against dark background
            allIcons.forEach(icon => {
                // Save original color if not already saved
                if (!icon.getAttribute('data-original-color')) {
                    icon.setAttribute('data-original-color', window.getComputedStyle(icon).color);
                }
                
                // Make sure icons are visible against the dark cosmic background
                if (icon.classList.contains('fa-calendar') || 
                    icon.classList.contains('fa-clock') || 
                    icon.classList.contains('fa-search') ||
                    icon.classList.contains('fa-chevron-down') ||
                    icon.classList.contains('fa-user') ||
                    icon.classList.contains('fa-cog') ||
                    icon.classList.contains('fa-globe') ||
                    icon.classList.contains('fa-chevron-right') ||
                    icon.classList.contains('fa-chevron-left')) {
                    icon.style.color = '#A78BFA';
                } else {
                    // Make all other icons visible too
                    icon.style.color = '#E0E7FF';
                }
            });
            
            // Add starfield effect
            addCosmicEffects();
            break;
            
        default: // sunset theme (default)
            // Reset all icon colors to their original values
            allIcons.forEach(icon => {
                const originalColor = icon.getAttribute('data-original-color');
                if (originalColor) {
                    icon.style.color = originalColor;
                } else {
                    icon.style.color = ''; // Reset to default if no original saved
                }
            });
            break;
    }
}

// Add Arctic ice crystal effects
function addArcticEffects() {
    // Remove existing effects first
    removeThemeEffects();
    
    // Create ice crystal particles
    const arcticEffect = document.createElement('div');
    arcticEffect.className = 'arctic-effect';
    arcticEffect.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
        background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="10" cy="10" r="1" fill="%2338BDF8" opacity="0.3"/><circle cx="90" cy="20" r="0.8" fill="%230EA5E9" opacity="0.4"/><circle cx="50" cy="90" r="1.2" fill="%2338BDF8" opacity="0.5"/><circle cx="20" cy="70" r="0.6" fill="%230284C7" opacity="0.3"/></svg>');
        animation: arcticGlitter 12s linear infinite;
    `;
    document.body.appendChild(arcticEffect);
}

// Add Sakura petal effects
function addSakuraEffects() {
    removeThemeEffects();
    
    // Create multiple petal layers for depth
    for (let i = 0; i < 3; i++) {
        const sakuraEffect = document.createElement('div');
        sakuraEffect.className = 'sakura-effect';
        sakuraEffect.style.cssText = `
            position: fixed;
            top: -10%;
            left: 0;
            width: 100%;
            height: 120%;
            pointer-events: none;
            z-index: ${i + 1};
            background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 30 C60 40, 60 50, 50 50 C60 50, 70 60, 50 70 C50 60, 40 60, 50 50 C40 50, 30 40, 50 30" fill="%23F9A8D4" opacity="${0.3 + i * 0.1}"/></svg>');
            animation: sakuraDrift ${15 + i * 3}s linear infinite;
            animation-delay: ${i * 2}s;
        `;
        document.body.appendChild(sakuraEffect);
    }
}

// Add Cosmic starfield effects  
function addCosmicEffects() {
    removeThemeEffects();
    
    // Create starfield background
    const cosmicEffect = document.createElement('div');
    cosmicEffect.className = 'cosmic-effect';
    cosmicEffect.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
        background: 
            radial-gradient(2px 2px at 20px 30px, #A78BFA, transparent),
            radial-gradient(2px 2px at 40px 70px, #C7D2FE, transparent),
            radial-gradient(1px 1px at 90px 40px, #8B5CF6, transparent),
            radial-gradient(1px 1px at 130px 80px, #A78BFA, transparent),
            radial-gradient(2px 2px at 160px 30px, #C7D2FE, transparent);
        background-repeat: repeat;
        background-size: 200px 100px;
        animation: cosmicTwinkle 8s ease-in-out infinite alternate;
    `;
    document.body.appendChild(cosmicEffect);
    
    // Add nebula glow effect
    const nebulaEffect = document.createElement('div');
    nebulaEffect.className = 'nebula-effect';
    nebulaEffect.style.cssText = `
        position: fixed;
        top: 20%;
        left: 20%;
        width: 60%;
        height: 60%;
        pointer-events: none;
        z-index: 0;
        background: radial-gradient(ellipse at center, rgba(139, 92, 246, 0.1) 0%, transparent 70%);
        animation: nebulaPulse 10s ease-in-out infinite;
    `;
    document.body.appendChild(nebulaEffect);
}

// Remove all theme effects
function removeThemeEffects() {
    const effects = document.querySelectorAll('.arctic-effect, .sakura-effect, .cosmic-effect, .nebula-effect');
    effects.forEach(effect => effect.remove());
}

// Add CSS animations for theme effects
function addThemeAnimations() {
    if (document.getElementById('theme-animations')) return;
    
    const style = document.createElement('style');
    style.id = 'theme-animations';
    style.textContent = `
        @keyframes arcticGlitter {
            0% { transform: translateY(-10px) rotate(0deg); }
            100% { transform: translateY(calc(100vh + 10px)) rotate(360deg); }
        }
        
        @keyframes sakuraDrift {
            0% { transform: translateY(-10%) rotate(0deg); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(110%) rotate(180deg); opacity: 0; }
        }
        
        @keyframes cosmicTwinkle {
            0% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        @keyframes nebulaPulse {
            0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.3; }
            50% { transform: scale(1.2) rotate(180deg); opacity: 0.6; }
        }
    `;
    document.head.appendChild(style);
}

// Listen for theme changes from admin panel and live preview
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'configUpdated') {
        const config = event.data.config;
        if (config.theme && config.theme.name) {
            applyTheme(config.theme.name);
            console.log('✅ Theme updated from admin panel:', config.theme.name);
        }
    }
    
    // Handle live preview theme application
    if (event.data && event.data.type === 'applyTheme') {
        const config = event.data.config;
        if (config.theme && config.theme.name) {
            applyTheme(config.theme.name);
            
            // Also update content if provided
            if (config.homepage) {
                updatePageContent(config);
            }
            
            console.log('✅ Live preview theme applied:', config.theme.name);
        }
    }
});

// Update page content for live preview
function updatePageContent(config) {
    const currentLang = (config.language && config.language.default) ? config.language.default : 'en';
    
    // Update page title if available
    if (config.homepage && config.homepage.title && config.homepage.title[currentLang]) {
        const titleElements = document.querySelectorAll('[data-en="Vietnam Travel"], [data-vi="Du Lịch Việt Nam"]');
        titleElements.forEach(el => {
            if (el.tagName === 'TITLE') {
                el.textContent = config.homepage.title[currentLang];
            } else {
                el.textContent = config.homepage.title[currentLang];
            }
        });
    }
    
    // Update tagline if available
    if (config.homepage && config.homepage.tagline && config.homepage.tagline[currentLang]) {
        const taglineElements = document.querySelectorAll('[data-en="Discover the beauty of Vietnam"], [data-vi="Khám phá vẻ đẹp Việt Nam"]');
        taglineElements.forEach(el => {
            el.textContent = config.homepage.tagline[currentLang];
        });
    }
    
    // Update hero title if available
    if (config.homepage && config.homepage.heroTitle && config.homepage.heroTitle[currentLang]) {
        const heroElements = document.querySelectorAll('[data-en*="Explore Vietnam"], [data-vi*="Khám phá Việt Nam"]');
        heroElements.forEach(el => {
            el.textContent = config.homepage.heroTitle[currentLang];
        });
    }
}

// Image cache and preloading system
const ImageCache = {
    cache: new Map(),
    preloadPromises: new Map(),
    
    // Preload critical images
    preloadImages: function() {
        const criticalImages = [
            'assets/images/danang.jpg',
            'assets/images/danang.png',
            'assets/images/hanoi.jpg',
            'assets/images/hochiminh.jpg'
        ];
        
        criticalImages.forEach(src => {
            if (!this.cache.has(src) && !this.preloadPromises.has(src)) {
                const promise = new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        this.cache.set(src, true);
                        console.log(`✅ Preloaded: ${src}`);
                        resolve();
                    };
                    img.onerror = () => {
                        console.warn(`❌ Failed to preload: ${src}`);
                        reject();
                    };
                    img.src = src;
                });
                
                this.preloadPromises.set(src, promise);
            }
        });
    },
    
    // Check if image is cached
    isImageCached: function(src) {
        return this.cache.has(src);
    },
    
    // Optimized image loading for DOM elements
    loadImage: function(imgElement, src, fallbackSrc = null) {
        // Prevent multiple loads of the same image
        if (imgElement.dataset.loading === 'true') {
            return;
        }
        
        imgElement.dataset.loading = 'true';
        
        // If already cached, load immediately
        if (this.isImageCached(src)) {
            imgElement.src = src;
            imgElement.dataset.loading = 'false';
            return;
        }
        
        // Add loading attribute for lazy loading
        imgElement.loading = 'lazy';
        
        // Set up error handling with fallback
        if (fallbackSrc && fallbackSrc !== src) {
            imgElement.onerror = () => {
                if (imgElement.src !== fallbackSrc && !this.isImageCached(fallbackSrc)) {
                    console.warn(`Image failed, trying fallback: ${src} → ${fallbackSrc}`);
                    this.loadImage(imgElement, fallbackSrc, null);
                }
            };
        }
        
        // Load the image
        imgElement.onload = () => {
            this.cache.set(src, true);
            imgElement.dataset.loading = 'false';
        };
        
        imgElement.src = src;
    }
};

// Make ImageCache globally available
window.ImageCache = ImageCache;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔵 ==> PAGE LOADED: ' + window.location.pathname);
    
    // Preload critical images first to prevent multiple requests
    ImageCache.preloadImages();
    
    // Initialize theme system first
    loadThemeConfiguration();
    
    // Add theme animations
    addThemeAnimations();
    
    // Load global configuration
    loadGlobalConfig();
    
    // Make user preference functions globally available for UserInterfaceConfig
    window.getUserPreferences = getUserPreferences;
    window.saveUserPreferences = saveUserPreferences;
    window.updateLanguageDisplay = updateLanguageDisplay;
    window.updateCurrency = updateCurrency;
    
    // Shared initialization for all pages
    initializeCurrencyLanguageModal();
    setupLanguageAndCurrency(); // Initialize language and currency system
    initializeAuthSystem();
    initializeDownloadFeature();
    initializeTabSystem();
    initializeAuthDropdown();
    initializeDateInputs();
    initializeHotelSearch(); // Add hotel search functionality
    initializeRestaurantSearch(); // Add restaurant search functionality
    initializePagination(); // Add pagination support
    initializeGhostTextAutocomplete(); // Initialize ghost text autocomplete for all inputs
    initializePreviewMode(); // Initialize preview mode detection
    
    // Update language and currency display after global config is loaded
    updateLanguageDisplay();
    updateCurrencyDisplay();
    checkAuthenticationStatus();
    resetDownloadButtonState(); // Đảm bảo nút download reset về trạng thái ban đầu
    
    // Page-specific initialization
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('dashboard.html') || currentPage.includes('/dashboard')) {
        console.log('🔍 Dashboard page detected - initializing admin panel');
        // Only initialize admin panel on dashboard page
        initializeAdminPanel();
    }
    
    // Initialize Travel Tour Search functionality if available
    if (typeof initializeTravelTourSearch === 'function') {
        initializeTravelTourSearch();
    }
});

// REMOVED localStorage theme listener - using unified cookie system

// Check authentication status and show/hide overlay
function checkAuthenticationStatus() {
    const authOverlay = document.getElementById('authOverlay');
    const searchContent = document.getElementById('searchContent');
    
    if (!isAuthenticated) {
        // Show overlay, hide search functionality
        if (authOverlay) authOverlay.classList.remove('hidden');
        if (searchContent) searchContent.classList.add('blur-content');
    } else {
        // Hide overlay, show search functionality
        if (authOverlay) authOverlay.classList.add('hidden');
        if (searchContent) searchContent.classList.remove('blur-content');
    }
}

// Update user display information
function updateUserDisplay(userName, userEmail) {
    // Update user name display
    const userNameElement = document.getElementById('currentUserName');
    if (userNameElement) {
        userNameElement.textContent = userName;
        userNameElement.setAttribute('data-en', userName);
        userNameElement.setAttribute('data-vi', userName);
    }
    
    // Update user email display
    const userEmailElement = document.getElementById('currentUserEmail');
    if (userEmailElement) {
        userEmailElement.textContent = userEmail;
    }
    
    // Update welcome message
    const welcomeElement = document.getElementById('welcomeMessage');
    if (welcomeElement) {
        const currentLang = currentLanguage || 'en';
        if (currentLang === 'vi') {
            welcomeElement.textContent = `Chào mừng trở lại, ${userName}!`;
        } else {
            welcomeElement.textContent = `Welcome back, ${userName}!`;
        }
        welcomeElement.setAttribute('data-en', `Welcome back, ${userName}!`);
        welcomeElement.setAttribute('data-vi', `Chào mừng trở lại, ${userName}!`);
    }
    
    // Update avatar initial
    const avatarElement = document.querySelector('.w-8.h-8.bg-gradient-to-r.from-blue-500.to-purple-600.rounded-full');
    if (avatarElement && userName) {
        avatarElement.textContent = userName.charAt(0).toUpperCase();
    }
}

// Initialize preview mode detection
function initializePreviewMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const isPreview = urlParams.get('preview');
    
    if (isPreview === 'true') {
        console.log('🎨 Preview mode detected');
        
        // Apply preview settings
        const previewTheme = urlParams.get('theme');
        const previewLang = urlParams.get('lang');
        const previewCurrency = urlParams.get('currency');
        
        if (previewTheme) {
            console.log('🎨 Applying preview theme:', previewTheme);
            applyThemePreview(previewTheme);
        }
        
        if (previewLang) {
            console.log('🌐 Applying preview language:', previewLang);
            currentLanguage = previewLang;
            // Save to unified preferences cookie
            const prefs = getUserPreferences();
            prefs.language = previewLang;
            saveUserPreferences(prefs);
            updateLanguageDisplay();
        }
        
        if (previewCurrency) {
            console.log('💰 Applying preview currency:', previewCurrency);
            currentCurrency = previewCurrency;
            updateCurrencyDisplay();
        }
        
        // Add preview indicator
        addPreviewIndicator();
    }
}

// Apply theme preview
function applyThemePreview(themeName) {
    // Define theme configurations
    const themes = {
        'modern-blue': {
            primary: '#3B82F6',
            secondary: '#1E40AF',
            accent: '#60A5FA',
            background: '#F8FAFC'
        },
        'warm-orange': {
            primary: '#F97316',
            secondary: '#EA580C',
            accent: '#FB923C',
            background: '#FFF7ED'
        },
        'nature-green': {
            primary: '#10B981',
            secondary: '#059669',
            accent: '#34D399',
            background: '#F0FDF4'
        },
        'elegant-purple': {
            primary: '#8B5CF6',
            secondary: '#7C3AED',
            accent: '#A78BFA',
            background: '#FAF5FF'
        }
    };
    
    const theme = themes[themeName];
    if (!theme) return;
    
    // Apply CSS custom properties
    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.primary);
    root.style.setProperty('--color-secondary', theme.secondary);
    root.style.setProperty('--color-accent', theme.accent);
    root.style.setProperty('--color-background', theme.background);
    
    // Apply to specific elements
    const buttons = document.querySelectorAll('button, .btn');
    buttons.forEach(btn => {
        if (btn.classList.contains('bg-blue-600') || btn.classList.contains('bg-blue-500')) {
            btn.style.backgroundColor = theme.primary;
        }
    });
    
    // Apply to hero section
    const heroSection = document.querySelector('.hero-section, .bg-gradient-to-r');
    if (heroSection) {
        heroSection.style.background = `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`;
    }
}

// Add preview indicator
function addPreviewIndicator() {
    const indicator = document.createElement('div');
    indicator.innerHTML = `
        <div style="position: fixed; top: 10px; right: 10px; z-index: 9999; 
                    background: rgba(255, 165, 0, 0.9); color: white; 
                    padding: 8px 16px; border-radius: 20px; font-weight: bold;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3); backdrop-filter: blur(10px);">
            🎨 PREVIEW MODE
        </div>
    `;
    document.body.appendChild(indicator);
}

// Currency and Language Modal (for index.html)
function initializeCurrencyLanguageModal() {
    const toggleBtn = document.getElementById('currencyLanguageBtn');
    const modal = document.getElementById('currencyLanguageModal');
    const closeBtn = document.getElementById('closeModal');
    const confirmBtn = document.getElementById('confirmSettings');
    
    if (toggleBtn && modal) {
        toggleBtn.addEventListener('click', function() {
            modal.classList.add('show');
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.classList.remove('show');
        });
    }
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', function() {
            // Get selected currency
            const selectedCurrency = document.querySelector('input[name="currency"]:checked');
            if (selectedCurrency) {
                currentCurrency = selectedCurrency.value;
                updateCurrencyDisplay();
            }
            
            // Get selected language
            const selectedLanguage = document.querySelector('input[name="language"]:checked');
            if (selectedLanguage) {
                currentLanguage = selectedLanguage.value;
                // Save to unified preferences cookie
                const prefs = getUserPreferences();
                prefs.language = selectedLanguage.value;
                saveUserPreferences(prefs);
                updateLanguageDisplay();
            }
            
            modal.classList.remove('show');
        });
    }
    
    // Close modal when clicking outside
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    }
}

// Currency and Language Dropdown (for dashboard.html)
function initializeCurrencyLanguageDropdown() {
    const toggleBtn = document.getElementById('currencyLanguageBtn');
    const dropdown = document.getElementById('currencyLanguageDropdown');
    
    if (toggleBtn && dropdown) {
        toggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });
        
        // Currency options
        dropdown.querySelectorAll('.currency-option').forEach(option => {
            option.addEventListener('click', function() {
                currentCurrency = this.getAttribute('data-currency');
                updateCurrencyDisplay();
                dropdown.classList.add('hidden');
            });
        });
        
        // Language options
        dropdown.querySelectorAll('.language-option').forEach(option => {
            option.addEventListener('click', function() {
                const selectedLang = this.getAttribute('data-lang');
                currentLanguage = selectedLang;
                // Save to unified preferences cookie
                const prefs = getUserPreferences();
                prefs.language = selectedLang;
                saveUserPreferences(prefs);
                updateLanguageDisplay();
                dropdown.classList.add('hidden');
            });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            dropdown.classList.add('hidden');
        });
    }
}

// Auth dropdown functionality
function initializeAuthDropdown() {
    const authDropdownBtn = document.getElementById('authDropdownBtn');
    const authDropdownContent = document.getElementById('authDropdownContent');
    const loginLink = document.getElementById('loginLink');
    const signupLink = document.getElementById('signupLink');
    
    if (authDropdownBtn) {
        authDropdownBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            authDropdownContent.classList.toggle('show');
        });
    }
    
    if (loginLink) {
        loginLink.addEventListener('click', function(e) {
            e.preventDefault();
            showLoginModal();
            authDropdownContent.classList.remove('show');
        });
    }
    
    if (signupLink) {
        signupLink.addEventListener('click', function(e) {
            e.preventDefault();
            showRegisterModal();
            authDropdownContent.classList.remove('show');
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
        if (authDropdownContent) {
            authDropdownContent.classList.remove('show');
        }
    });
}

// Enhanced Authentication System
function initializeAuthSystem() {
    // Initialize overlay auth buttons
    const showSignInBtn = document.getElementById('showSignInBtn');
    const showSignUpBtn = document.getElementById('showSignUpBtn');
    
    if (showSignInBtn) {
        showSignInBtn.addEventListener('click', function() {
            showLoginModal();
        });
    }
    
    if (showSignUpBtn) {
        showSignUpBtn.addEventListener('click', function() {
            showRegisterModal();
        });
    }
    
    // Initialize modal close functionality
    initializeModalCloseHandlers();
    
    // Initialize form submissions
    initializeFormSubmissions();
    
    // Initialize modal switching
    initializeModalSwitching();
}

function showLoginModal() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.classList.remove('hidden');
        setTimeout(() => {
            loginModal.style.opacity = '1';
            loginModal.querySelector('.bg-white').style.transform = 'scale(1)';
        }, 10);
        document.body.style.overflow = 'hidden';
    }
}

function showRegisterModal() {
    const registerModal = document.getElementById('registerModal');
    if (registerModal) {
        registerModal.classList.remove('hidden');
        setTimeout(() => {
            registerModal.style.opacity = '1';
            registerModal.querySelector('.bg-white').style.transform = 'scale(1)';
        }, 10);
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modal) {
    if (modal) {
        modal.style.opacity = '0';
        modal.querySelector('.bg-white').style.transform = 'scale(0.95)';
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
        document.body.style.overflow = 'auto';
    }
}

function initializeModalCloseHandlers() {
    // Close modal buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.fixed');
            hideModal(modal);
        });
    });
    
    // Close modals when clicking outside
    document.querySelectorAll('#loginModal, #registerModal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                hideModal(modal);
            }
        });
    });
}

function initializeFormSubmissions() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleSignIn(e);
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleSignUp(e);
        });
    }
}

function initializeModalSwitching() {
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');
    
    if (switchToRegister) {
        switchToRegister.addEventListener('click', function() {
            hideModal(document.getElementById('loginModal'));
            setTimeout(() => {
                showRegisterModal();
            }, 300);
        });
    }
    
    if (switchToLogin) {
        switchToLogin.addEventListener('click', function() {
            hideModal(document.getElementById('registerModal'));
            setTimeout(() => {
                showLoginModal();
            }, 300);
        });
    }
}

// Handle sign in - this duplicate function has been removed, using the real API version at the top of the file



// Tab system for search forms
function initializeTabSystem() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Function để switch tab với better error handling
    function switchToTab(targetTab) {
        if (!targetTab) {
            console.warn('❌ No target tab specified');
            return;
        }
        
        try {
            // Update button states
            tabButtons.forEach(btn => {
                const btnTab = btn.getAttribute('data-tab');
                if (btnTab === targetTab) {
                    btn.classList.add('tab-active');
                    btn.classList.remove('tab-inactive');
                    btn.setAttribute('aria-selected', 'true');
                } else {
                    btn.classList.remove('tab-active');
                    btn.classList.add('tab-inactive');
                    btn.setAttribute('aria-selected', 'false');
                }
            });
            
            // Update content visibility với fade effect
            tabContents.forEach(content => {
                content.classList.add('hidden');
                content.setAttribute('aria-hidden', 'true');
            });
            
            const targetContent = document.getElementById(targetTab + '-tab');
            if (targetContent) {
                targetContent.classList.remove('hidden');
                targetContent.setAttribute('aria-hidden', 'false');
                
                // Focus first input trong tab mới
                const firstInput = targetContent.querySelector('input, select, textarea');
                if (firstInput) {
                    setTimeout(() => firstInput.focus(), 150);
                }
            } else {
                console.warn(`❌ Target content not found: ${targetTab}-tab`);
            }
            
            console.log(`✅ Switched to tab: ${targetTab}`);
        } catch (error) {
            console.error('❌ Error switching tab:', error);
        }
    }
    
    // Add click handlers cho tab buttons với debounce để tránh double click
    tabButtons.forEach(button => {
        let clickTimeout = null;
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Clear previous timeout
            if (clickTimeout) {
                clearTimeout(clickTimeout);
            }
            
            // Debounce click để tránh multiple triggers
            clickTimeout = setTimeout(() => {
                const targetTab = this.getAttribute('data-tab');
                if (targetTab) {
                    switchToTab(targetTab);
                    // Update URL hash without page reload
                    history.replaceState(null, '', `#${targetTab}`);
                }
            }, 100);
        });
    });
    
    // Check URL hash để auto-activate tab
    function checkHashAndActivateTab() {
        const hash = window.location.hash.substring(1); // Remove #
        if (hash) {
            // Find button with matching data-tab
            const targetButton = document.querySelector(`.tab-button[data-tab="${hash}"]`);
            if (targetButton) {
                switchToTab(hash);
                console.log(`🔗 Auto-activated tab from URL hash: ${hash}`);
            }
        }
    }
    
    // Check hash on page load
    checkHashAndActivateTab();
    
    // Listen for hash changes
    window.addEventListener('hashchange', checkHashAndActivateTab);
    
    // Initialize Travel Form Step System
    initializeTravelFormSteps();
}

// Travel Form Step System
function initializeTravelFormSteps() {
    const step1 = document.getElementById('travel-step-1');
    const step2 = document.getElementById('travel-step-2');
    const continueBtn = document.getElementById('continue-to-step-2');
    const backBtn = document.getElementById('back-to-step-1');
    
    // Travel form data storage
    let travelFormData = {
        step1: {},
        step2: {}
    };
    
    // Validate Step 1 and enable/disable continue button
    function validateStep1() {
        const requiredFields = ['departureTime', 'departureDate', 'transport'];
        let isValid = true;
        
        requiredFields.forEach(fieldName => {
            const field = step1.querySelector(`[name="${fieldName}"]`);
            if (field && (!field.value || field.value.trim() === '')) {
                isValid = false;
            }
        });
        
        continueBtn.disabled = !isValid;
        continueBtn.classList.toggle('opacity-50', !isValid);
        continueBtn.classList.toggle('cursor-not-allowed', !isValid);
        
        return isValid;
    }
    
    // Save Step 1 data
    function saveStep1Data() {
        const formData = new FormData();
        const inputs = step1.querySelectorAll('input, select');
        
        inputs.forEach(input => {
            if (input.value) {
                travelFormData.step1[input.name] = input.value;
                formData.append(input.name, input.value);
            }
        });
        
        console.log('💾 Step 1 data saved:', travelFormData.step1);
        return formData;
    }
    
    // Save Step 2 data
    function saveStep2Data() {
        const formData = new FormData();
        const inputs = step2.querySelectorAll('input, select');
        
        inputs.forEach(input => {
            if (input.value) {
                travelFormData.step2[input.name] = input.value;
                formData.append(input.name, input.value);
            }
        });
        
        console.log('💾 Step 2 data saved:', travelFormData.step2);
        return formData;
    }
    
    // Restore Step 1 data
    function restoreStep1Data() {
        Object.keys(travelFormData.step1).forEach(fieldName => {
            const field = step1.querySelector(`[name="${fieldName}"]`);
            if (field) {
                field.value = travelFormData.step1[fieldName];
            }
        });
        validateStep1();
        console.log('🔄 Step 1 data restored');
    }
    
    // Restore Step 2 data
    function restoreStep2Data() {
        Object.keys(travelFormData.step2).forEach(fieldName => {
            const field = step2.querySelector(`[name="${fieldName}"]`);
            if (field) {
                field.value = travelFormData.step2[fieldName];
            }
        });
        console.log('🔄 Step 2 data restored');
    }
    
    // Show Step 2, Hide Step 1
    function showStep2() {
        const container = document.querySelector('.travel-form-container');
        
        step1.classList.add('hidden');
        step2.classList.remove('hidden');
        
        // Update container layout for step 2
        if (container) {
            container.style.display = 'block';
            container.style.maxWidth = '100%';
        }
        
        // Restore any previously entered Step 2 data
        restoreStep2Data();
        
        console.log('👀 Showing Step 2');
    }
    
    // Show Step 1, Hide Step 2
    function showStep1() {
        const container = document.querySelector('.travel-form-container');
        
        step2.classList.add('hidden');
        step1.classList.remove('hidden');
        
        // Update container layout for step 1
        if (container) {
            container.style.display = 'block';
            container.style.maxWidth = '600px';
            container.style.margin = '0 auto';
        }
        
        // Restore Step 1 data
        restoreStep1Data();
        
        console.log('👀 Showing Step 1');
    }
    
    // Add event listeners for Step 1 validation
    const step1Inputs = step1.querySelectorAll('input[required], select[required]');
    step1Inputs.forEach(input => {
        input.addEventListener('change', validateStep1);
        input.addEventListener('input', validateStep1);
    });
    
    // Continue to Step 2 button
    continueBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        if (validateStep1()) {
            saveStep1Data();
            showStep2();
        }
    });
    
    // Back to Step 1 button
    backBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Save Step 2 data before going back
        saveStep2Data();
        showStep1();
    });
    
    // Initial validation and setup
    validateStep1();
    
    // Initialize with step 1 layout
    showStep1();
    
    console.log('✅ Travel form steps initialized');
}

// Enhanced Download Source Code Feature
function initializeDownloadFeature() {
    const downloadBtn = document.getElementById('downloadSourceBtn');
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            downloadSourceCode();
        });
    }
}

// Reset download button state - Called on page load to ensure proper state
function resetDownloadButtonState() {
    const downloadBtn = document.getElementById('downloadSourceBtn');
    
    if (downloadBtn) {
        // Force reset to initial state
        downloadBtn.disabled = false;
        downloadBtn.classList.remove('opacity-75', 'bg-green-500', 'bg-red-500');
        downloadBtn.classList.add('bg-green-600', 'hover:bg-green-700');
        
        const iconSpan = '<i class="fas fa-download mr-2"></i>';
        const textSpan = '<span data-en="Download Source" data-vi="Tải Mã Nguồn">Download Source</span>';
        downloadBtn.innerHTML = iconSpan + textSpan;
        
        // Ensure language is updated after reset
        setTimeout(() => {
            updateLanguageDisplay();
        }, 100);
    }
}

// Enhanced download functionality with full project ZIP and comprehensive file collection
    async function downloadSourceCode() {
        // Set timeout to 5 minutes for large downloads
        const downloadTimeout = setTimeout(() => {
            showNotification('Download is taking longer than expected. Please check console for details.', 'warning', 10000);
        }, 300000); // 5 minutes
        
        const downloadBtn = document.getElementById('downloadSourceBtn');
        
        // Thông báo cho người dùng để sẵn sàng cho quá trình tải dài
        showNotification('Đang chuẩn bị tải toàn bộ source code. Vui lòng đợi...', 'info', 5000);
        
        // Recursive function to get all files in directory
        async function getAllFiles(directory) {
            try {
                console.log(`Scanning directory: ${directory}`);
                const allFiles = [];
                
                // Logic for automatically getting all files would go here
                // This is simplified as we're using a static file list approach
                
                return allFiles;
            } catch (error) {
                console.error(`Error scanning directory ${directory}:`, error);
                return [];
            }
        }
        
        try {
            // Show loading state with animation
            const originalHTML = downloadBtn.innerHTML;
            downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Preparing download...';
            downloadBtn.disabled = true;
            downloadBtn.classList.add('opacity-75');

            // Create ZIP file with JSZip
            const zip = new JSZip();
            
            // Complete list of ALL files to include in download - UPDATED v3.5 Full Project
            console.log('📦 Preparing file list for complete download');
            showNotification('Đang chuẩn bị danh sách file...', 'info', 3000);
            
            // Quét thư mục tự động nếu có thể
            const autoDetectedFiles = await getAllFiles('.');
            if (autoDetectedFiles.length > 0) {
                console.log(`✅ Auto-detected ${autoDetectedFiles.length} files`);
                showNotification(`Tìm thấy ${autoDetectedFiles.length} files tự động`, 'success', 3000);
            }
            
            // Danh sách đầy đủ các file để tải
            const filesToDownload = [
                // Main files
                { name: 'index.html', url: 'index.html' },
                { name: 'dashboard.html', url: 'dashboard.html' },
                { name: 'admin.html', url: 'admin.html' },
                { name: 'welcome-setup.html', url: 'welcome-setup.html' },
                { name: 'YOUWARE.md', url: 'YOUWARE.md' },
                { name: 'INSTALL.md', url: 'INSTALL.md' },
                { name: 'requirements.txt', url: 'requirements.txt' },
                { name: 'travel (1).sql', url: 'travel (1).sql' },
                { name: 'app.py', url: 'app.py' },
                { name: 'recommendation.py', url: 'recommendation.py' },
                { name: 'site_config.json', url: 'site_config.json' },
                
                // Assets - CSS (All CSS files)
                { name: 'assets/css/style.css', url: 'assets/css/style.css' },
                { name: 'assets/css/tour-history.css', url: 'assets/css/tour-history.css' },
                
                // Assets - JavaScript (All JS files)
                { name: 'assets/js/script.js', url: 'assets/js/script.js' },
                { name: 'assets/js/auth.js', url: 'assets/js/auth.js' },
                { name: 'assets/js/tour-search.js', url: 'assets/js/tour-search.js' },
                { name: 'assets/js/tour-form.js', url: 'assets/js/tour-form.js' },
                { name: 'assets/js/restaurant-manager.js', url: 'assets/js/restaurant-manager.js' },
                { name: 'assets/js/restaurant-form.js', url: 'assets/js/restaurant-form.js' },
                { name: 'assets/js/hotel-form.js', url: 'assets/js/hotel-form.js' },
                { name: 'assets/js/hotel-manager.js', url: 'assets/js/hotel-manager.js' },
                { name: 'assets/js/personalized-v2.js', url: 'assets/js/personalized-v2.js' },
                { name: 'assets/js/libs/script-local.js', url: 'assets/js/libs/script-local.js' },
                { name: 'assets/js/libs/jszip.min.js', url: 'assets/js/libs/jszip.min.js' },
                { name: 'assets/js/libs/user_interface_config.js', url: 'assets/js/libs/user_interface_config.js' },
                { name: 'assets/js/libs/youware-lib.js', url: 'assets/js/libs/youware-lib.js' },
                { name: 'assets/js/libs/flatpickr.min.js', url: 'assets/js/libs/flatpickr.min.js' },
                { name: 'assets/js/libs/flatpickr.min.css', url: 'assets/js/libs/flatpickr.min.css' },
                { name: 'assets/js/pickers/datepicker.js', url: 'assets/js/pickers/datepicker.js' },
                { name: 'assets/js/pickers/ghost-text.js', url: 'assets/js/pickers/ghost-text.js' },
                { name: 'assets/js/components/tour-history.js', url: 'assets/js/components/tour-history.js' },
                { name: 'assets/js/components/tour-detail.js', url: 'assets/js/components/tour-detail.js' },
                { name: 'assets/js/core/ajax.js', url: 'assets/js/core/ajax.js' },
                { name: 'assets/js/core/component.js', url: 'assets/js/core/component.js' },
                { name: 'assets/js/core/index.js', url: 'assets/js/core/index.js' },
                { name: 'assets/js/core/loader.js', url: 'assets/js/core/loader.js' },
                { name: 'assets/js/core/router.js', url: 'assets/js/core/router.js' },
                { name: 'assets/js/core/state.js', url: 'assets/js/core/state.js' },
                { name: 'assets/js/core/utils.js', url: 'assets/js/core/utils.js' },
                { name: 'assets/js/adapters/api.js', url: 'assets/js/adapters/api.js' },
                { name: 'assets/js/search/hotel-search.js', url: 'assets/js/search/hotel-search.js' },
                
                // Assets - Images (All image files)
                { name: 'assets/images/hanoi.jpg', url: 'assets/images/hanoi.jpg' },
                { name: 'assets/images/hochiminh.jpg', url: 'assets/images/hochiminh.jpg' },
                { name: 'assets/images/danang.jpg', url: 'assets/images/danang.jpg' },
                { name: 'assets/images/danang.png', url: 'assets/images/danang.png' },
                
                // Package.json for easy setup
                { name: 'package.json', content: JSON.stringify({
                    "name": "vietnam-travel-website-admin",
                    "version": "3.4.0",
                    "description": "Smart Travel Vietnam Website with Admin Panel, Tour History & User Interface Config",
                    "main": "index.html",
                    "scripts": {
                        "start": "python app.py",
                        "dev": "python app.py",
                        "install": "pip install -r requirements.txt"
                    },
                    "dependencies": {
                        "flask": "^2.3.3",
                        "flask-cors": "^4.0.0",
                        "mysql-connector-python": "^8.1.0"
                    },
                    "keywords": ["travel", "vietnam", "hotel-search", "ajax", "autocomplete", "admin-panel", "user-interface", "welcome-setup"],
                    "author": "Vietnam Travel Team",
                    "license": "MIT"
                }, null, 2) },
                
                // Installation guide
                { name: 'INSTALL.md', content: `# Vietnam Travel Website with Admin Panel & User Interface Config - Installation Guide

## Features
- ✅ AJAX Autocomplete Hotel & Restaurant Search
- ✅ Flexible Search (name, country, city, dates)  
- ✅ Real-time Suggestions
- ✅ Multi-language Support (EN/VI)
- ✅ Currency Conversion (USD/VND/EUR)
- ✅ MySQL Database Integration
- ✅ Admin Panel with Site Configuration
- ✅ User Management & Role-based Access
- ✅ Welcome Setup for New Users
- ✅ Personal Interface Configuration (Theme, Language, Currency)
- ✅ Cookie-based Settings Storage

## Quick Start

### 1. Backend Setup
\`\`\`bash
# Install Python dependencies
pip install -r requirements.txt

# Setup MySQL database
mysql -u root -p < new_travel.sql

# Update database credentials in app.py
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root', 
    'password': 'your_password',
    'database': 'new_travel'
}

# Run Flask server
python app.py
\`\`\`

### 2. Access Website
- Open browser: http://localhost:8386
- Test account: test@example.com / test123 (Admin)

### 3. Admin Panel
- Login with admin account
- Access Admin Panel from dashboard
- Configure site settings, language, theme
- Manage user roles and permissions

## Search Features
✅ Hotel name + dates
✅ Restaurant search with cuisine filters
✅ Country + city search
✅ Flexible date ranges
✅ AJAX autocomplete suggestions

## API Endpoints
### General
- GET /api/countries
- GET /api/cities?country=
- GET /api/check-admin

### Hotels
- POST /api/hotels/search  
- GET /api/hotels/autocomplete

### Restaurants
- POST /api/restaurants/search
- GET /api/restaurants/autocomplete
- GET /api/restaurants/cuisines

### Admin
- POST /api/admin/save-config
- GET /api/admin/load-config

## Admin Features
- 🔧 Site configuration management
- 🎨 Theme and color customization
- 🌍 Language and currency settings
- 👥 User role management
- 📊 Dashboard analytics

Happy coding! 🚀
` }
        ];

        // Update progress
        downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Collecting files...';

        // Add files to zip with progress tracking
        let processed = 0;
        const totalFiles = filesToDownload.length;
        
        for (const file of filesToDownload) {
            try {
                let content = file.content;
                
                if (file.url && !content) {
                    try {
                        // Thêm retry logic cho việc fetch file
                        let attempts = 0;
                        const maxAttempts = 3;
                        let success = false;
                        
                        while (!success && attempts < maxAttempts) {
                            try {
                                attempts++;
                                console.log(`Fetching ${file.name} (attempt ${attempts}/${maxAttempts})...`);
                                
                                const response = await fetch(file.url, {
                                    method: 'GET',
                                    cache: 'no-store', // Tránh cache để đảm bảo lấy file mới nhất
                                    headers: {
                                        'Cache-Control': 'no-cache',
                                        'Pragma': 'no-cache'
                                    }
                                });
                                
                                if (response.ok) {
                                    content = await response.text();
                                    zip.file(file.name, content);
                                    success = true;
                                    console.log(`✅ Successfully added ${file.name} to zip`);
                                } else {
                                    console.warn(`⚠️ Failed to fetch ${file.name}: ${response.status} ${response.statusText}`);
                                    await new Promise(resolve => setTimeout(resolve, 500)); // Chờ 500ms trước khi thử lại
                                }
                            } catch (retryError) {
                                console.warn(`⚠️ Fetch error for ${file.name}:`, retryError);
                                await new Promise(resolve => setTimeout(resolve, 500)); // Chờ 500ms trước khi thử lại
                            }
                        }
                        
                        if (!success) {
                            console.error(`❌ Failed to fetch ${file.name} after ${maxAttempts} attempts`);
                            showNotification(`Failed to fetch ${file.name}. Download may be incomplete.`, 'warning');
                        }
                    } catch (fetchError) {
                        console.error(`❌ Critical error fetching ${file.name}:`, fetchError);
                        // Continue without this file
                    }
                } else if (content) {
                    zip.file(file.name, content);
                    console.log(`✅ Added ${file.name} from content`);
                }
                
                processed++;
                
                // Update progress
                const progress = Math.round((processed / totalFiles) * 100);
                downloadBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>Processing... ${progress}%`;
            } catch (error) {
                console.log(`Could not process ${file.name}:`, error);
                processed++;
            }
        }

        // Generate ZIP file
        downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating zip file...';
        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 6
            }
        });
        
        // Create download link
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vietnam-travel-website-v3.4-admin-complete.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Success animation
        downloadBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Download Complete!';
        downloadBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
        downloadBtn.classList.add('bg-green-500');
        
        setTimeout(() => {
            showNotification(getTranslation('downloadComplete'), 'success');
        }, 500);
        
    } catch (error) {
        console.error('Download failed:', error);
        showNotification(getTranslation('downloadError'), 'error');
        
        // Error state
        downloadBtn.innerHTML = '<i class="fas fa-exclamation-triangle mr-2"></i>Download Failed';
        downloadBtn.classList.add('bg-red-500');
    } finally {
        // Reset button state after 3 seconds
        setTimeout(() => {
            downloadBtn.disabled = false;
            downloadBtn.classList.remove('opacity-75', 'bg-green-500', 'bg-red-500');
            downloadBtn.classList.add('bg-green-600', 'hover:bg-green-700');
            
            const iconSpan = '<i class="fas fa-download mr-2"></i>';
            const textSpan = '<span data-en="Download Source" data-vi="Tải Mã Nguồn">Download Source</span>';
            downloadBtn.innerHTML = iconSpan + textSpan;
            
            updateLanguageDisplay(); // Refresh language
        }, 3000);
    }
}

// Update language display with enhanced support and global config
function updateLanguageDisplay() {
    // PRIORITY 1: Check unified preferences cookie first
    const prefs = getUserPreferences();
    if (prefs.language && (prefs.language === 'vi' || prefs.language === 'en')) {
        currentLanguage = prefs.language;
        console.log('🍪 Using user preference from cookie:', prefs.language);
    } else if (globalConfig && globalConfig.language && globalConfig.language.default) {
        // PRIORITY 2: Use global config from server only if no cookie preference
        currentLanguage = globalConfig.language.default;
        console.log('🌐 Using global config language:', globalConfig.language.default);
    }
    
    // Update data-attribute elements
    document.querySelectorAll('[data-en][data-vi]').forEach(element => {
        const enText = element.getAttribute('data-en');
        const viText = element.getAttribute('data-vi');
        
        if (currentLanguage === 'vi' && viText) {
            element.textContent = viText;
        } else if (enText) {
            element.textContent = enText;
        }
    });

    // Update placeholders
    document.querySelectorAll('[data-en-placeholder][data-vi-placeholder]').forEach(element => {
        const enPlaceholder = element.getAttribute('data-en-placeholder');
        const viPlaceholder = element.getAttribute('data-vi-placeholder');
        
        if (currentLanguage === 'vi' && viPlaceholder) {
            element.placeholder = viPlaceholder;
        } else if (enPlaceholder) {
            element.placeholder = enPlaceholder;
        }
    });

    // Update language indicator
    const languageIndicator = document.getElementById('currentLanguage');
    if (languageIndicator) {
        languageIndicator.textContent = currentLanguage.toUpperCase();
    }
    
    console.log(`🌐 Language display updated to: ${currentLanguage.toUpperCase()}`);
    console.log(`🍪 Preferences cookie: ${JSON.stringify(prefs)}`);
    console.log(`⚙️ Global config language: ${globalConfig?.language?.default || 'not set'}`);
    console.log(`🎯 Final currentLanguage: ${currentLanguage}`);
}

// REMOVED DEPRECATED FUNCTION - now updateLanguage(lang) is the main function

// Update currency display
function updateCurrencyDisplay() {
    // Get current currency from global config if available
    if (globalConfig && globalConfig.currency && globalConfig.currency.default) {
        currentCurrency = globalConfig.currency.default;
    }
    
    const currencyIndicator = document.getElementById('currentCurrency');
    if (currencyIndicator) {
        currencyIndicator.textContent = currentCurrency;
    }

    // Update all price displays
    document.querySelectorAll('[data-price]').forEach(element => {
        const basePrice = parseFloat(element.getAttribute('data-price'));
        let convertedPrice = basePrice;
        let symbol = '$';

        switch(currentCurrency) {
            case 'VND':
                convertedPrice = basePrice * exchangeRates.USD_TO_VND;
                symbol = '₫';
                convertedPrice = Math.round(convertedPrice);
                break;
            case 'EUR':
                convertedPrice = basePrice * exchangeRates.USD_TO_EUR;
                symbol = '€';
                convertedPrice = Math.round(convertedPrice * 100) / 100;
                break;
            default:
                symbol = '$';
                convertedPrice = Math.round(convertedPrice * 100) / 100;
        }

        element.textContent = `${symbol}${convertedPrice.toLocaleString()}`;
    });
}

// Get translation helper
function getTranslation(key) {
    return translations[currentLanguage][key] || translations['en'][key] || key;
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 transform translate-x-full transition-transform duration-300 ${
        type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500'
    }`;
    notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'} mr-2"></i>${message}`;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Initialize date inputs with better defaults
function initializeDateInputs() {
    const dateInputs = document.querySelectorAll('input[type="date"]');
    const today = new Date().toISOString().split('T')[0];
    
    dateInputs.forEach(input => {
        if (!input.value) {
            input.value = today;
        }
    });
}

// Hotel Search Functionality
function initializeHotelSearch() {
    const hotelForm = document.getElementById('hotelSearchForm');
    const searchInput = document.getElementById('hotelSearchInput');
    
    if (!hotelForm) return;
    
    // Initialize autocomplete for location inputs
    initializeLocationAutocomplete('hotel');
    
    // Initialize main search autocomplete
    if (searchInput) {
        initializeAutocomplete();
    }
    
    // Form submission handler
    hotelForm.addEventListener('submit', function(e) {
        e.preventDefault();
        searchHotels();
    });
    
    // Search hotels from API - FLEXIBLE SEARCH
    function searchHotels() {
        const formData = new FormData(hotelForm);
        const searchInput = document.getElementById('hotelSearchInput');
        
        console.log('🔍 FLEXIBLE SEARCH - searchHotels called');
        
        const searchQuery = searchInput ? searchInput.value.trim() : '';
        
        // BUILD SEARCH PARAMS
        const searchParams = {
            country: formData.get('country') || '',
            city: formData.get('city') || '',
            checkin: formData.get('checkin') || '',
            checkout: formData.get('checkout') || '',
            searchQuery: searchQuery,
            searchType: 'flexible_search'
        };
        
        console.log('🔍 SEARCH PARAMS:', searchParams);
        
        // VALIDATION - CHỈ CHECK-IN/CHECK-OUT LÀ BẮT BUỘC
        const hasCheckin = searchParams.checkin && searchParams.checkin !== '';
        const hasCheckout = searchParams.checkout && searchParams.checkout !== '';
        
        if (!hasCheckin || !hasCheckout) {
            const message = currentLanguage === 'vi' ? 
                'Vui lòng chọn ngày check-in và check-out' : 
                'Please select check-in and check-out dates';
            showNotification(message, 'error');
            return;
        }
        
        // Validate dates
        if (new Date(searchParams.checkin) >= new Date(searchParams.checkout)) {
            const message = currentLanguage === 'vi' ? 
                'Ngày check-out phải sau ngày check-in' : 
                'Check-out date must be after check-in date';
            showNotification(message, 'error');
            return;
        }
        
        console.log('✅ Validation passed, starting search...');
        showLoadingState();
        
        // Search hotels from backend API
        fetch('/api/hotels/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(searchParams)
        })
            .then(response => {
                console.log('📡 Form search response status:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('📊 Form search data received:', data);
                if (data && data.hotels) {
                    console.log(`✅ Found ${data.hotels.length} hotels from database`);
                    displayHotelResults(data.hotels, searchParams);
                } else {
                    console.log('⚠️ No hotels found');
                    displayHotelResults([], searchParams);
                }
            })
            .catch(error => {
                console.error('❌ Error searching hotels:', error);
                
                // Hiển thị no results khi lỗi database
                displayHotelResults([], searchParams);
                
                const message = currentLanguage === 'vi' ? 
                    'Lỗi kết nối server. Không thể tìm kiếm khách sạn.' : 
                    'Server connection error. Cannot search hotels.';
                showNotification(message, 'error');
            });
    }
    
    function showLoadingState() {
        document.getElementById('hotelResults').classList.add('hidden');
        document.getElementById('hotelNoResults').classList.add('hidden');
        document.getElementById('hotelLoading').classList.remove('hidden');
    }
    
    function displayHotelResults(hotels, searchParams) {
        console.log('🏨 Display hotel results:', hotels.length, 'hotels');
        
        currentHotelData = hotels;
        hotelPagination.allItems = hotels;
        hotelPagination.currentPage = 1;
        hotelPagination.totalPages = Math.ceil(hotels.length / hotelPagination.itemsPerPage);
        hotelPagination.searchParams = searchParams;
        
        document.getElementById('hotelLoading').classList.add('hidden');
        
        if (hotels.length === 0) {
            document.getElementById('hotelNoResults').classList.remove('hidden');
            return;
        }
        
        showHotelResults();
        displayHotelPage(1);
        updateHotelPagination();
        
        // Update search info
        const resultsInfo = getSearchDisplayInfo(searchParams);
        updateHotelCount(hotels.length, resultsInfo);
    }
    
    // Make displayHotelPage available globally
    window.displayHotelPage = function(page) {
        const startIndex = (page - 1) * hotelPagination.itemsPerPage;
        const endIndex = startIndex + hotelPagination.itemsPerPage;
        const pageItems = hotelPagination.allItems.slice(startIndex, endIndex);
        
        const hotelList = document.getElementById('hotelList');
        if (!hotelList) return;
        
        hotelList.innerHTML = '';
        
        pageItems.forEach(hotel => {
            const hotelCard = createHotelCard(hotel, hotelPagination.searchParams || {});
            hotelList.appendChild(hotelCard);
        });
        
        updateLanguageDisplay(); // Update language for new content
    }
    
    // Local reference for internal use
    function displayHotelPage(page) {
        window.displayHotelPage(page);
    }
    
    // Make updateHotelPagination available globally
    window.updateHotelPagination = function() {
        const pagination = document.getElementById('hotelPagination');
        const pageInfo = document.getElementById('hotelPageInfo');
        const prevBtn = document.getElementById('prevHotelPage');
        const nextBtn = document.getElementById('nextHotelPage');
        
        if (!pagination || !pageInfo || !prevBtn || !nextBtn) return;
        
        if (hotelPagination.totalPages > 1) {
            pagination.classList.remove('hidden');
            pageInfo.textContent = `${hotelPagination.currentPage} / ${hotelPagination.totalPages}`;
            
            prevBtn.disabled = hotelPagination.currentPage <= 1;
            nextBtn.disabled = hotelPagination.currentPage >= hotelPagination.totalPages;
        } else {
            pagination.classList.add('hidden');
        }
    }
    
    function updateHotelPagination() {
        window.updateHotelPagination();
    }
    
    function updateHotelCount(count, searchInfo) {
        const hotelCount = document.getElementById('hotelCount');
        if (!hotelCount) return;
        
        // Ensure we use user's chosen language, not global config
        const prefs = getUserPreferences();
        const userLanguage = prefs.language || currentLanguage;
        
        hotelCount.textContent = userLanguage === 'vi' ? 
            `Tìm thấy ${count} khách sạn ${searchInfo}` : 
            `Found ${count} hotels ${searchInfo}`;
    }
    
    function showHotelResults() {
        const resultsContainer = document.getElementById('hotelResults');
        if (resultsContainer) {
            resultsContainer.classList.remove('hidden');
        }
    }
    
    function getSearchDisplayInfo(searchParams) {
        const parts = [];
        // Ensure we use user's chosen language, not global config
        const prefs = getUserPreferences();
        const userLanguage = prefs.language || currentLanguage;
        
        if (searchParams.country && searchParams.city) {
            parts.push(userLanguage === 'vi' ? 
                `tại ${searchParams.city}, ${searchParams.country}` : 
                `in ${searchParams.city}, ${searchParams.country}`);
        } else if (searchParams.country) {
            parts.push(userLanguage === 'vi' ? 
                `tại ${searchParams.country}` : 
                `in ${searchParams.country}`);
        } else if (searchParams.city) {
            parts.push(userLanguage === 'vi' ? 
                `tại ${searchParams.city}` : 
                `in ${searchParams.city}`);
        }
        
        if (searchParams.checkin && searchParams.checkout) {
            const checkinDate = formatDate(searchParams.checkin);
            const checkoutDate = formatDate(searchParams.checkout);
            parts.push(userLanguage === 'vi' ? 
                `từ ${checkinDate} đến ${checkoutDate}` : 
                `from ${checkinDate} to ${checkoutDate}`);
        }
        
        return parts.join(', ');
    }
    
    function createHotelCard(hotel, searchParams) {
        const div = document.createElement('div');
        div.className = 'hotel-card-modern';
        
        // Calculate nights - only if both dates available
        let nights = 1;
        let totalPrice = hotel.price_per_night;
        let showDateInfo = false;
        
        if (searchParams.checkin && searchParams.checkout) {
            const checkin = new Date(searchParams.checkin);
            const checkout = new Date(searchParams.checkout);
            nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));
            totalPrice = hotel.price_per_night * nights;
            showDateInfo = true;
        }
        
        // Convert price based on current currency
        let displayPrice = hotel.price_per_night;
        let displayTotal = totalPrice;
        let currencySymbol = '$';
        
        switch(currentCurrency) {
            case 'VND':
                displayPrice = Math.round(hotel.price_per_night * exchangeRates.USD_TO_VND);
                displayTotal = Math.round(totalPrice * exchangeRates.USD_TO_VND);
                currencySymbol = '₫';
                break;
            case 'EUR':
                displayPrice = Math.round(hotel.price_per_night * exchangeRates.USD_TO_EUR * 100) / 100;
                displayTotal = Math.round(totalPrice * exchangeRates.USD_TO_EUR * 100) / 100;
                currencySymbol = '€';
                break;
        }
        
        // Get display city name
        const cityName = getCityDisplayName(hotel.city);
        
        // Get rating badge color
        const ratingClass = hotel.rating >= 4.5 ? 'excellent' : hotel.rating >= 4.0 ? 'very-good' : 'good';
        
        div.innerHTML = `
            <div class="hotel-card-content">
                <!-- Hotel Info -->
                <div class="hotel-info-section">
                    <div class="hotel-header">
                        <h3 class="hotel-name">${hotel.name}</h3>
                        <div class="hotel-meta">
                            <div class="hotel-stars">
                                ${Array(hotel.stars).fill().map(() => '<i class="fas fa-star text-yellow-400"></i>').join('')}
                                <span class="stars-text">${hotel.stars} ${(() => {
                                    const prefs = getUserPreferences();
                                    return (prefs.language || currentLanguage) === 'vi' ? 'sao' : 'stars';
                                })()}</span>
                            </div>
                            <div class="hotel-rating-badge ${ratingClass}">
                                <i class="fas fa-star text-xs"></i>
                                <span class="font-semibold">${hotel.rating}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="hotel-location">
                        <i class="fas fa-map-marker-alt text-blue-500"></i>
                        <span>${cityName}, ${hotel.country}</span>
                    </div>
                    
                    <!-- Date Info - only show if dates available -->
                    ${showDateInfo ? `
                    <div class="hotel-dates">
                        <div class="date-item">
                            <i class="fas fa-calendar-check text-green-500"></i>
                            <span>${formatDate(searchParams.checkin)}</span>
                        </div>
                        <div class="date-arrow">
                            <i class="fas fa-arrow-right text-gray-400"></i>
                        </div>
                        <div class="date-item">
                            <i class="fas fa-calendar-times text-red-500"></i>
                            <span>${formatDate(searchParams.checkout)}</span>
                        </div>
                        <div class="nights-info">
                            ${nights} ${(() => {
                                const prefs = getUserPreferences();
                                return (prefs.language || currentLanguage) === 'vi' ? 'đêm' : 'nights';
                            })()}
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <!-- Price Section -->
                <div class="hotel-price-section">
                    <div class="price-per-night">
                        <span class="price-amount">${currencySymbol}${displayPrice.toLocaleString()}</span>
                        <span class="price-unit" data-en="per night" data-vi="mỗi đêm">per night</span>
                    </div>
                    
                    ${showDateInfo ? `
                    <div class="total-price">
                        <span class="total-label" data-en="Total" data-vi="Tổng cộng">Total</span>
                        <span class="total-amount">${currencySymbol}${displayTotal.toLocaleString()}</span>
                    </div>
                    ` : ''}
                    
                    <button class="view-details-btn" onclick="showHotelInfoPanel('${hotel.hotel_id}')">
                        <span data-en="View Details" data-vi="Xem Chi Tiết">View Details</span>
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
        
        return div;
    }
}

// Helper functions
function getCityDisplayName(city) {
    // Check if city is a numeric ID value (from city_id)
    if (/^\d+$/.test(city)) {
        console.log(`⚠️ City appears to be an ID instead of name: ${city}`);
        
        // Try to find city name in cities database if available
        const citiesData = window.citiesData || [];
        if (citiesData.length > 0) {
            const cityData = citiesData.find(c => c.city_id === parseInt(city));
            if (cityData) {
                console.log(`✅ Found city name for ID ${city}: ${cityData.name}`);
                city = cityData.name;
            }
        }
        
        // Fallback to common cities based on ID
        const cityIdMap = {
            '1702341327': 'Singapore',
            '1702341328': 'Bangkok',
            '1702341329': 'Ho Chi Minh City',
            '1702341330': 'Hanoi',
            '1702341331': 'Kuala Lumpur',
            '1702341332': 'Jakarta',
            '1702341333': 'Bali',
            '1702341334': 'Manila',
            '1702341335': 'Tokyo',
            '1702341336': 'Seoul'
        };
        
        return cityIdMap[city] || `City ID ${city}`;
    }
    
    // Normal city name processing
    if (currentLanguage === 'vi') {
        const cityMap = {
            'Ho Chi Minh City': 'TP. Hồ Chí Minh',
            'Hanoi': 'Hà Nội',
            'Da Nang': 'Đà Nẵng',
            'Hoi An': 'Hội An',
            'Nha Trang': 'Nha Trang',
            'Phu Quoc': 'Phú Quốc',
            'Can Tho': 'Cần Thơ',
            'Hue': 'Huế',
            'Vung Tau': 'Vũng Tàu',
            'Dalat': 'Đà Lạt',
            'Halong': 'Hạ Long',
            'Sapa': 'Sa Pa',
            'Long Beach': 'Long Beach',
            'Los Angeles': 'Los Angeles',
            'Bangkok': 'Bangkok',
            'Singapore': 'Singapore'
        };
        return cityMap[city] || city;
    }
    return city;
}

function formatPrice(price) {
    let displayPrice = price;
    let symbol = '$';
    
    switch(currentCurrency) {
        case 'VND':
            displayPrice = Math.round(price * exchangeRates.USD_TO_VND);
            symbol = '₫';
            break;
        case 'EUR':
            displayPrice = Math.round(price * exchangeRates.USD_TO_EUR * 100) / 100;
            symbol = '€';
            break;
    }
    
    return `${symbol}${displayPrice.toLocaleString()}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { 
        day: '2-digit', 
        month: '2-digit'
    };
    return date.toLocaleDateString(currentLanguage === 'vi' ? 'vi-VN' : 'en-US', options);
}

function highlightMatch(text, query) {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
}

// AJAX Autocomplete Functionality
function initializeAutocomplete() {
    const searchInput = document.getElementById('hotelSearchInput');
    const dropdown = document.getElementById('autocompleteDropdown');
    const resultsContainer = document.getElementById('autocompleteResults');
    const spinner = document.getElementById('searchSpinner');
    
    if (!searchInput || !dropdown || !resultsContainer || !spinner) return;
    
    let searchTimeout;
    let currentSelectedIndex = -1;
    let currentSuggestions = [];
    
    // Input event listener với debounce
    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        
        clearTimeout(searchTimeout);
        
        if (query.length < 2) {
            hideDropdown();
            return;
        }
        
        // Debounce search requests
        searchTimeout = setTimeout(() => {
            performAutocompleteSearch(query);
        }, 300);
    });
    
    // Keyboard navigation
    searchInput.addEventListener('keydown', function(e) {
        const suggestions = dropdown.querySelectorAll('.autocomplete-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            currentSelectedIndex = Math.min(currentSelectedIndex + 1, suggestions.length - 1);
            updateSelectedItem();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            currentSelectedIndex = Math.max(currentSelectedIndex - 1, -1);
            updateSelectedItem();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (currentSelectedIndex >= 0 && suggestions[currentSelectedIndex]) {
                selectSuggestion(currentSuggestions[currentSelectedIndex]);
            }
        } else if (e.key === 'Tab') {
            // Tab key functionality - select current highlighted suggestion
            if (currentSelectedIndex >= 0 && suggestions[currentSelectedIndex]) {
                e.preventDefault();
                selectSuggestion(currentSuggestions[currentSelectedIndex]);
            }
        } else if (e.key === 'Escape') {
            hideDropdown();
        }
    });
    
    // Click outside to close
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
            hideDropdown();
        }
    });
    
    function performAutocompleteSearch(query) {
        showSpinner();
        
        // Search both hotels and cities
        Promise.all([
            fetch(`/api/hotels/autocomplete?q=${encodeURIComponent(query)}&limit=3`).catch(() => ({ json: () => ({ suggestions: [] }) })),
            fetch(`/api/cities/autocomplete?q=${encodeURIComponent(query)}&limit=2`).catch(() => ({ json: () => ({ suggestions: [] }) }))
        ])
        .then(responses => Promise.all(responses.map(r => r.json())))
        .then(([hotelData, cityData]) => {
            hideSpinner();
            
            const hotelSuggestions = hotelData.suggestions || [];
            const citySuggestions = cityData.suggestions || [];
            
            // Combine suggestions
            currentSuggestions = [...hotelSuggestions, ...citySuggestions];
            
            displaySuggestions(currentSuggestions);
        })
        .catch(error => {
            console.error('Autocomplete search error:', error);
            hideSpinner();
            displayNoResults();
        });
    }
    
    function displaySuggestions(suggestions) {
        resultsContainer.innerHTML = '';
        currentSelectedIndex = -1;
        
        if (suggestions.length === 0) {
            displayNoResults();
            return;
        }
        
        suggestions.forEach((suggestion, index) => {
            const item = createSuggestionItem(suggestion, index);
            resultsContainer.appendChild(item);
        });
        
        showDropdown();
    }
    
    function createSuggestionItem(suggestion, index) {
        const div = document.createElement('div');
        div.className = `autocomplete-item ${suggestion.type === 'city' ? 'city-item' : ''}`;
        div.setAttribute('data-index', index);
        
        if (suggestion.type === 'hotel') {
            div.innerHTML = `
                <div class="hotel-name">${highlightMatch(suggestion.name, searchInput.value)}</div>
                <div class="hotel-location">${suggestion.city}, ${suggestion.country}</div>
                <div class="hotel-meta">
                    <div class="hotel-rating">
                        <i class="fas fa-star mr-1"></i>
                        <span>${suggestion.rating}</span>
                        <span class="ml-2">${'⭐'.repeat(suggestion.stars)}</span>
                    </div>
                    <div class="hotel-price">
                        ${formatPrice(suggestion.price_per_night)}/${currentLanguage === 'vi' ? 'đêm' : 'night'}
                    </div>
                </div>
            `;
        } else if (suggestion.type === 'city') {
            div.innerHTML = `
                <div class="city-name">
                    <i class="fas fa-map-marker-alt mr-2"></i>
                    ${highlightMatch(suggestion.city, searchInput.value)}, ${suggestion.country}
                </div>
                <div class="city-info">${suggestion.hotel_count} ${currentLanguage === 'vi' ? 'khách sạn' : 'hotels'}</div>
            `;
        }
        
        // Click handler
        div.addEventListener('click', () => selectSuggestion(suggestion));
        
        return div;
    }
    
    function selectSuggestion(suggestion) {
        console.log('🎯 selectSuggestion called with:', suggestion);
        searchInput.value = suggestion.name || suggestion.city;
        hideDropdown();
    }
    
    function updateSelectedItem() {
        const items = dropdown.querySelectorAll('.autocomplete-item');
        items.forEach((item, index) => {
            if (index === currentSelectedIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
    
    function showDropdown() {
        dropdown.classList.remove('hidden');
    }
    
    function hideDropdown() {
        dropdown.classList.add('hidden');
        currentSelectedIndex = -1;
    }
    
    function showSpinner() {
        spinner.classList.remove('hidden');
    }
    
    function hideSpinner() {
        spinner.classList.add('hidden');
    }
    
    function displayNoResults() {
        resultsContainer.innerHTML = `
            <div class="autocomplete-no-results">
                <i class="fas fa-search text-gray-400 mr-2"></i>
                <span data-en="No suggestions found" data-vi="Không tìm thấy gợi ý">No suggestions found</span>
            </div>
        `;
        showDropdown();
        updateLanguageDisplay(); // Update language for new content
    }
}

// Hotel Information Panel Functions
function showHotelInfoPanel(hotelId) {
    console.log('🏨 Show hotel info panel for ID:', hotelId);
    
    // Find hotel data
    const hotel = currentHotelData.find(h => h.hotel_id == hotelId);
    if (!hotel) {
        // Try searching in pagination data if not found
        const paginationHotel = hotelPagination.allItems.find(h => h.hotel_id == hotelId);
        if (!paginationHotel) {
            showNotification('Hotel not found', 'error');
            return;
        }
        populateHotelInfo(paginationHotel);
    } else {
        populateHotelInfo(hotel);
    }
    
    const panel = document.getElementById('hotelInfoPanel');
    if (panel) {
        panel.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeHotelInfoPanel() {
    const panel = document.getElementById('hotelInfoPanel');
    if (panel) {
        panel.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function populateHotelInfo(hotel) {
    const content = document.getElementById('hotelInfoContent');
    if (!content) return;
    
    // Convert price based on current currency
    let displayPrice = hotel.price_per_night;
    let currencySymbol = '$';
    
    switch(currentCurrency) {
        case 'VND':
            displayPrice = Math.round(hotel.price_per_night * exchangeRates.USD_TO_VND);
            currencySymbol = '₫';
            break;
        case 'EUR':
            displayPrice = Math.round(hotel.price_per_night * exchangeRates.USD_TO_EUR * 100) / 100;
            currencySymbol = '€';
            break;
    }
    
    // Handle both city name and city_id
    const cityName = getCityDisplayName(hotel.city);
    const country = hotel.country || '';
    
    // Fetch city name from database if needed
    if (/^\d+$/.test(hotel.city)) {
        console.log(`🔍 Attempting to fetch city data for ID: ${hotel.city}`);
        fetch(`/api/cities?id=${hotel.city}`)
            .then(response => response.json())
            .then(data => {
                if (data && data.city) {
                    console.log(`✅ Found city data:`, data.city);
                    
                    // Update the city display
                    const cityDisplay = content.querySelector('.location-value');
                    if (cityDisplay) {
                        const displayName = getCityDisplayName(data.city.name);
                        cityDisplay.textContent = `${displayName}, ${data.city.country || country}`;
                    }
                }
            })
            .catch(error => {
                console.error(`❌ Error fetching city data: ${error}`);
            });
    }
    
    content.innerHTML = `
        <div class="info-cards-grid">
            <div class="info-card">
                <div class="info-card-label">
                    <i class="fas fa-hotel"></i>
                    <span data-en="Hotel Name" data-vi="Tên khách sạn">Hotel Name</span>
                </div>
                <div class="info-card-value">${hotel.name}</div>
            </div>
            
            <div class="info-card">
                <div class="info-card-label">
                    <i class="fas fa-map-marker-alt"></i>
                    <span data-en="Location" data-vi="Địa điểm">Location</span>
                </div>
                <div class="info-card-value location-value">${cityName}, ${country}</div>
            </div>
            
            <div class="info-card">
                <div class="info-card-label">
                    <i class="fas fa-star"></i>
                    <span data-en="Star Rating" data-vi="Xếp hạng sao">Star Rating</span>
                </div>
                <div class="info-card-value rating">
                    <span class="rating-stars">${'★'.repeat(hotel.stars)}</span>
                    <span>${hotel.stars} ${currentLanguage === 'vi' ? 'sao' : 'stars'}</span>
                </div>
            </div>
            
            <div class="info-card">
                <div class="info-card-label">
                    <i class="fas fa-dollar-sign"></i>
                    <span data-en="Price per Night" data-vi="Giá mỗi đêm">Price per Night</span>
                </div>
                <div class="info-card-value price">${currencySymbol}${displayPrice.toLocaleString()}</div>
            </div>
            
            <div class="info-card">
                <div class="info-card-label">
                    <i class="fas fa-thumbs-up"></i>
                    <span data-en="Guest Rating" data-vi="Đánh giá">Guest Rating</span>
                </div>
                <div class="info-card-value rating">
                    <span class="rating-stars">★</span>
                    <span>${hotel.rating}/10</span>
                </div>
            </div>
            
            <div class="info-card">
                <div class="info-card-label">
                    <i class="fas fa-map"></i>
                    <span data-en="Coordinates" data-vi="Tọa độ">Coordinates</span>
                </div>
                <div class="info-card-value">${hotel.latitude}, ${hotel.longitude}</div>
            </div>
            
            <div class="info-card">
                <div class="info-card-label">
                    <i class="fas fa-route"></i>
                    <span data-en="Directions" data-vi="Chỉ đường">Directions</span>
                </div>
                <div class="info-card-value">
                    <a href="https://www.google.com/maps/dir/?api=1&destination=${hotel.latitude},${hotel.longitude}" 
                       class="text-blue-500 hover:underline flex items-center" 
                       target="_blank">
                        <span data-en="View on Google Maps" data-vi="Xem trên Google Maps">View on Google Maps</span>
                        <i class="fas fa-external-link-alt ml-1"></i>
                    </a>
                </div>
            </div>
        </div>
        
        ${hotel.description ? `
        <div class="info-description">
            <h3 class="text-lg font-semibold mb-4" data-en="About This Hotel" data-vi="Về khách sạn này">About This Hotel</h3>
            <p class="text-gray-600 leading-relaxed">${hotel.description}</p>
        </div>
        ` : ''}
    `;
    
    updateLanguageDisplay(); // Update language for new content
}

// Restaurant Information Panel Functions
function showRestaurantInfoPanel(restaurantId) {
    console.log('🍽️ Show restaurant info panel for ID:', restaurantId);
    
    // Find restaurant data
    const restaurant = currentRestaurantData.find(r => r.restaurant_id == restaurantId);
    if (!restaurant) {
        // Try searching in pagination data if not found
        const paginationRestaurant = restaurantPagination.allItems.find(r => r.restaurant_id == restaurantId);
        if (!paginationRestaurant) {
            showNotification('Restaurant not found', 'error');
            return;
        }
        populateRestaurantInfo(paginationRestaurant);
    } else {
        populateRestaurantInfo(restaurant);
    }
    
    const panel = document.getElementById('restaurantInfoPanel');
    if (panel) {
        panel.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeRestaurantInfoPanel() {
    const panel = document.getElementById('restaurantInfoPanel');
    if (panel) {
        panel.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Restaurant Admin Functions - Edit & Delete

// Current restaurant ID being edited or deleted
let currentRestaurantId = null;

// Function to edit restaurant
function editRestaurant(restaurantId) {
    currentRestaurantId = restaurantId;
    
    // Show loading state
    const editModal = document.getElementById('editRestaurantModal');
    editModal.classList.remove('hidden');
    
    // Fetch restaurant data
    fetch(`/api/restaurants/details/${restaurantId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.restaurant) {
                const restaurant = data.restaurant;
                
                // Fill form with restaurant data
                document.getElementById('edit_restaurant_id').value = restaurant.restaurant_id;
                document.getElementById('edit_name').value = restaurant.name;
                document.getElementById('edit_city_id').value = restaurant.city_id;
                document.getElementById('edit_city').value = restaurant.city;
                document.getElementById('edit_country').value = restaurant.country;
                document.getElementById('edit_price_avg').value = restaurant.price_avg || '';
                document.getElementById('edit_cuisine_type').value = restaurant.cuisine_type || '';
                document.getElementById('edit_rating').value = restaurant.rating || '';
                document.getElementById('edit_latitude').value = restaurant.latitude || '';
                document.getElementById('edit_longitude').value = restaurant.longitude || '';
                document.getElementById('edit_description').value = restaurant.description || '';
            } else {
                alert(window.currentLanguage === 'vi' ? 
                    'Không thể tải thông tin nhà hàng' : 
                    'Could not load restaurant information');
                closeEditRestaurantModal();
            }
        })
        .catch(error => {
            console.error('Error fetching restaurant details:', error);
            alert(window.currentLanguage === 'vi' ? 
                'Lỗi khi tải thông tin nhà hàng' : 
                'Error loading restaurant information');
            closeEditRestaurantModal();
        });
}

// Function to delete restaurant
function deleteRestaurant(restaurantId) {
    currentRestaurantId = restaurantId;
    
    // Show delete confirmation modal
    document.getElementById('deleteConfirmModal').classList.remove('hidden');
}

// Function to handle edit form submission
async function handleEditRestaurantFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const restaurantData = {};
    
    for (let [key, value] of formData.entries()) {
        restaurantData[key] = value || null;
    }
    
    try {
        const response = await fetch(`/api/admin/restaurants/edit/${restaurantData.restaurant_id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(restaurantData)
        });

        const result = await response.json();

        if (response.ok) {
            alert(window.currentLanguage === 'vi' ? 
                'Cập nhật nhà hàng thành công!' : 
                'Restaurant updated successfully!');
            closeEditRestaurantModal();
            
            // Refresh search results if available
            if (typeof refreshRestaurantSearchResults === 'function') {
                refreshRestaurantSearchResults();
            } else {
                // Fallback to full page reload
                window.location.reload();
            }
        } else {
            alert(result.message || (window.currentLanguage === 'vi' ? 
                'Có lỗi xảy ra khi cập nhật nhà hàng' : 
                'Error updating restaurant'));
        }
    } catch (error) {
        console.error('Error updating restaurant:', error);
        alert(window.currentLanguage === 'vi' ? 
            'Có lỗi xảy ra khi cập nhật nhà hàng' : 
            'Error updating restaurant');
    }
}

// Function to handle delete confirmation
async function handleDeleteRestaurant() {
    if (!currentRestaurantId) {
        closeDeleteConfirmModal();
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/restaurants/delete/${currentRestaurantId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const result = await response.json();

        if (response.ok) {
            alert(window.currentLanguage === 'vi' ? 
                'Xóa nhà hàng thành công!' : 
                'Restaurant deleted successfully!');
            closeDeleteConfirmModal();
            
            // Refresh search results if available
            if (typeof refreshRestaurantSearchResults === 'function') {
                refreshRestaurantSearchResults();
            } else {
                // Fallback to full page reload
                window.location.reload();
            }
        } else {
            alert(result.message || (window.currentLanguage === 'vi' ? 
                'Có lỗi xảy ra khi xóa nhà hàng' : 
                'Error deleting restaurant'));
            closeDeleteConfirmModal();
        }
    } catch (error) {
        console.error('Error deleting restaurant:', error);
        alert(window.currentLanguage === 'vi' ? 
            'Có lỗi xảy ra khi xóa nhà hàng' : 
            'Error deleting restaurant');
        closeDeleteConfirmModal();
    }
}

// Function to refresh restaurant search results
function refreshRestaurantSearchResults() {
    const form = document.getElementById('restaurantSearchForm');
    if (form) {
        form.dispatchEvent(new Event('submit'));
    }
}

// Function to close edit modal
function closeEditRestaurantModal() {
    document.getElementById('editRestaurantModal').classList.add('hidden');
    document.getElementById('editRestaurantForm').reset();
    currentRestaurantId = null;
}

// Function to close delete confirmation modal
function closeDeleteConfirmModal() {
    document.getElementById('deleteConfirmModal').classList.add('hidden');
    currentRestaurantId = null;
}

function populateRestaurantInfo(restaurant) {
    const content = document.getElementById('restaurantInfoContent');
    if (!content) return;
    
    // Convert price based on current currency
    let displayPrice = restaurant.price_avg;
    let currencySymbol = '$';
    
    switch(currentCurrency) {
        case 'VND':
            displayPrice = Math.round(restaurant.price_avg * exchangeRates.USD_TO_VND);
            currencySymbol = '₫';
            break;
        case 'EUR':
            displayPrice = Math.round(restaurant.price_avg * exchangeRates.USD_TO_EUR * 100) / 100;
            currencySymbol = '€';
            break;
    }
    
    const cityName = getCityDisplayName(restaurant.city);
    
    content.innerHTML = `
        <div class="info-cards-grid">
            <div class="info-card">
                <div class="info-card-label">
                    <i class="fas fa-utensils"></i>
                    <span data-en="Restaurant Name" data-vi="Tên nhà hàng">Restaurant Name</span>
                </div>
                <div class="info-card-value">${restaurant.name}</div>
            </div>
            
            <div class="info-card">
                <div class="info-card-label">
                    <i class="fas fa-concierge-bell"></i>
                    <span data-en="Cuisine Type" data-vi="Loại ẩm thực">Cuisine Type</span>
                </div>
                <div class="info-card-value">${restaurant.cuisine_type}</div>
            </div>
            
            <div class="info-card">
                <div class="info-card-label">
                    <i class="fas fa-map-marker-alt"></i>
                    <span data-en="Location" data-vi="Địa điểm">Location</span>
                </div>
                <div class="info-card-value">${restaurant.city}, ${restaurant.country}</div>
            </div>
            
            <div class="info-card">
                <div class="info-card-label">
                    <i class="fas fa-dollar-sign"></i>
                    <span data-en="Average Price" data-vi="Giá trung bình">Average Price</span>
                </div>
                <div class="info-card-value price">${currencySymbol}${displayPrice.toLocaleString()}</div>
            </div>
            
            <div class="info-card">
                <div class="info-card-label">
                    <i class="fas fa-star"></i>
                    <span data-en="Rating" data-vi="Đánh giá">Rating</span>
                </div>
                <div class="info-card-value rating">
                    <span class="rating-stars">★</span>
                    <span>${restaurant.rating}/10</span>
                </div>
            </div>
            
            <div class="info-card">
                <div class="info-card-label">
                    <i class="fas fa-map"></i>
                    <span data-en="Coordinates" data-vi="Tọa độ">Coordinates</span>
                </div>
                <div class="info-card-value">${restaurant.latitude}, ${restaurant.longitude}</div>
            </div>
        </div>
        
        ${restaurant.description ? `
        <div class="info-description">
            <h3 class="text-lg font-semibold mb-4" data-en="About This Restaurant" data-vi="Về nhà hàng này">About This Restaurant</h3>
            <p class="text-gray-600 leading-relaxed">${restaurant.description}</p>
        </div>
        ` : ''}
    `;
    
    updateLanguageDisplay(); // Update language for new content
}

// Pagination System
function initializePagination() {
    // Hotel pagination
    const prevHotelBtn = document.getElementById('prevHotelPage');
    const nextHotelBtn = document.getElementById('nextHotelPage');
    
    if (prevHotelBtn) {
        prevHotelBtn.addEventListener('click', () => {
            if (hotelPagination.currentPage > 1) {
                hotelPagination.currentPage--;
                // Use function reference from the global scope
                if (window.displayHotelPage) {
                    window.displayHotelPage(hotelPagination.currentPage);
                } else {
                    console.error("displayHotelPage function not found in global scope");
                }
                updateHotelPagination();
            }
        });
    }
    
    if (nextHotelBtn) {
        nextHotelBtn.addEventListener('click', () => {
            if (hotelPagination.currentPage < hotelPagination.totalPages) {
                hotelPagination.currentPage++;
                // Use function reference from the global scope
                if (window.displayHotelPage) {
                    window.displayHotelPage(hotelPagination.currentPage);
                } else {
                    console.error("displayHotelPage function not found in global scope");
                }
                updateHotelPagination();
            }
        });
    }
    
    // Restaurant pagination
    const prevRestaurantBtn = document.getElementById('prevRestaurantPage');
    const nextRestaurantBtn = document.getElementById('nextRestaurantPage');
    
    if (prevRestaurantBtn) {
        prevRestaurantBtn.addEventListener('click', () => {
            if (restaurantPagination.currentPage > 1) {
                restaurantPagination.currentPage--;
                // Use function reference from the global scope
                if (window.displayRestaurantPage) {
                    window.displayRestaurantPage(restaurantPagination.currentPage);
                } else {
                    console.error("displayRestaurantPage function not found in global scope");
                }
                updateRestaurantPagination();
            }
        });
    }
    
    if (nextRestaurantBtn) {
        nextRestaurantBtn.addEventListener('click', () => {
            if (restaurantPagination.currentPage < restaurantPagination.totalPages) {
                restaurantPagination.currentPage++;
                // Use function reference from the global scope
                if (window.displayRestaurantPage) {
                    window.displayRestaurantPage(restaurantPagination.currentPage);
                } else {
                    console.error("displayRestaurantPage function not found in global scope");
                }
                updateRestaurantPagination();
            }
        });
    }
}

// Initialize Admin Panel Functionality
function initializeAdminPanel() {
    console.log('🔵 ==> INITIALIZING ADMIN PANEL <==');
    
    // Admin Panel Button
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    console.log('🔍 Admin panel button element:', adminPanelBtn);
    
    if (adminPanelBtn) {
        console.log('✅ Admin panel button found, adding click listener');
        
        // Remove any existing event listeners (to avoid duplicates)
        const newAdminBtn = adminPanelBtn.cloneNode(true);
        adminPanelBtn.parentNode.replaceChild(newAdminBtn, adminPanelBtn);
        
        newAdminBtn.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent default behavior
            console.log('🔵 ==> ADMIN PANEL BUTTON CLICKED <==');
            console.log('🔄 Attempting to redirect to admin.html');
            
            // Show loading state
            const oldText = this.innerHTML;
            this.innerHTML = `<i class="fas fa-circle-notch fa-spin mr-2"></i> ${currentLanguage === 'vi' ? 'Đang chuyển hướng...' : 'Redirecting...'}`;
            this.disabled = true;
            
            // Add a small delay to ensure animation is visible
            setTimeout(() => {
                window.location.href = '/admin';
            }, 300);
            
            return false; // Extra safety
        });
        
        // Make sure the button is visible by adding inline style
        newAdminBtn.style.display = 'flex';
        newAdminBtn.classList.remove('hidden');
        
        console.log('✅ Admin button event listener attached');
    } else {
        console.log('❌ Admin panel button NOT found in DOM');
    }
    
    // Logout Button  
    const logoutBtn = document.getElementById('logoutBtn');
    console.log('🔍 Logout button element:', logoutBtn);
    
    if (logoutBtn) {
        console.log('✅ Logout button found, adding click listener');
        
        // Remove any existing event listeners (to avoid duplicates)
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        
        newLogoutBtn.addEventListener('click', function() {
            console.log('🔵 ==> LOGOUT BUTTON CLICKED <==');
            
            // Show loading state
            const oldText = this.innerHTML;
            this.innerHTML = `<i class="fas fa-circle-notch fa-spin mr-2"></i> ${currentLanguage === 'vi' ? 'Đang đăng xuất...' : 'Logging out...'}`;
            this.disabled = true;
            
            handleLogout();
        });
    } else {
        console.log('❌ Logout button NOT found in DOM');
    }
    
    // Check admin status and show/hide admin button
    console.log('🔍 Checking admin status...');
    checkAdminStatus();
    
    // Recheck after a short delay to ensure session data is loaded
    setTimeout(checkAdminStatus, 500);
}

// Check admin status and show/hide admin panel button
function checkAdminStatus() {
    console.log('🔵 ==> CHECKING ADMIN STATUS <==');
    
    // First check if we're on dashboard page
    const currentPage = window.location.pathname;
    if (!currentPage.includes('dashboard.html') && !currentPage.includes('/dashboard')) {
        console.log('⚠️ Not on dashboard page, skipping admin check');
        return;
    }
    
    // Also check if adminPanelBtn exists in DOM
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    if (!adminPanelBtn) {
        console.log('❌ Admin panel button NOT found in DOM, cannot perform admin check');
        return;
    }
    
    console.log('🔍 Checking session storage for admin status');
    const isAdminInStorage = sessionStorage.getItem('is_admin') === 'true';
    console.log('🔍 Session storage admin status:', isAdminInStorage);
    
    // First try to use the session storage value (faster)
    if (isAdminInStorage) {
        console.log('✅ User IS admin (from session storage) - showing admin panel button');
        adminPanelBtn.classList.remove('hidden');
        adminPanelBtn.style.display = 'flex'; // Make sure it's visible
        adminPanelBtn.setAttribute('data-admin-checked', 'true');
        console.log('🔍 Admin button classes after show:', adminPanelBtn.classList.toString());
    }
    
    // Then verify with server (more reliable)
    fetch('/api/check-admin', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => {
        console.log('🔍 Admin check API response status:', response.status);
        return response.json();
    })
    .then(data => {
        handleAdminStatusResponse(data, adminPanelBtn);
    })
    .catch(error => {
        console.error('❌ Error checking admin status:', error);
        const adminPanelBtn = document.getElementById('adminPanelBtn');
        if (adminPanelBtn) {
            console.log('❌ Error occurred - hiding admin button');
            adminPanelBtn.classList.add('hidden');
        }
    });
}

// Handle user logout
function handleLogout() {
    fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('✅ Logout successful');
            window.location.href = data.redirect || '/';
        }
    })
    .catch(error => {
        console.error('❌ Logout error:', error);
        // Force redirect to home even if API fails
        window.location.href = '/';
    });
}

// Helper function to handle admin status response
function handleAdminStatusResponse(data, adminPanelBtn) {
    console.log('🔍 Admin status check result from server:', data);
    
    // Get button again in case DOM has changed
    const currentAdminBtn = adminPanelBtn || document.getElementById('adminPanelBtn');
    console.log('🔍 Admin panel button in handleAdminStatusResponse:', currentAdminBtn);
    
    if (currentAdminBtn) {
        if (data.is_admin === 1) {
            console.log('✅ User IS admin (from server) - showing admin panel button');
            currentAdminBtn.classList.remove('hidden');
            currentAdminBtn.style.display = 'flex'; // Make sure it's visible
            currentAdminBtn.setAttribute('data-admin-checked', 'true');
            
            // Update session storage to match server
            sessionStorage.setItem('is_admin', 'true');
            
            console.log('🔍 Admin button classes after show:', currentAdminBtn.classList.toString());
            
            // Also show other admin-only elements
            document.querySelectorAll('.admin-only').forEach(el => {
                el.classList.remove('hidden');
                el.style.display = 'flex'; // Make sure it's visible
            });
        } else {
            console.log('❌ User is NOT admin (from server) - hiding admin panel button');
            currentAdminBtn.classList.add('hidden');
            currentAdminBtn.style.display = 'none';
            
            // Update session storage to match server
            sessionStorage.removeItem('is_admin');
            
            // Also hide other admin-only elements
            document.querySelectorAll('.admin-only').forEach(el => {
                el.classList.add('hidden');
                el.style.display = 'none';
            });
            
            console.log('🔍 Admin button classes after hide:', currentAdminBtn.classList.toString());
        }
    } else {
        console.log('❌ Admin panel button NOT found in handleAdminStatusResponse');
    }
}

// Initialize autocomplete for location inputs 
function initializeLocationAutocomplete(type) {
    // This is a placeholder function that can be expanded later
    console.log(`Location autocomplete initialized for: ${type}`);
}

// Restaurant Search Functionality
function initializeRestaurantSearch() {
    const restaurantForm = document.getElementById('restaurantSearchForm');
    const searchInput = document.getElementById('restaurantSearchInput');
    
    if (!restaurantForm) return;
    
    // Initialize autocomplete for restaurant location inputs
    initializeRestaurantLocationAutocomplete();
    
    // Initialize main restaurant search autocomplete
    if (searchInput) {
        initializeRestaurantAutocomplete();
    }
    
    // Form submission handler
    restaurantForm.addEventListener('submit', function(e) {
        e.preventDefault();
        searchRestaurants();
    });
    
    // Search restaurants from API - FLEXIBLE SEARCH
    function searchRestaurants() {
        const formData = new FormData(restaurantForm);
        const searchInput = document.getElementById('restaurantSearchInput');
        
        console.log('🔍 FLEXIBLE RESTAURANT SEARCH - searchRestaurants called');
        
        const searchQuery = searchInput ? searchInput.value.trim() : '';
        
        // BUILD SEARCH PARAMS
        const searchParams = {
            country: formData.get('country') || '',
            city: formData.get('city') || '',
            cuisine_type: formData.get('cuisine_type') || '',
            searchQuery: searchQuery,
            searchType: 'flexible_search'
        };
        
        console.log('🔍 RESTAURANT SEARCH PARAMS:', searchParams);
        
        console.log('✅ Restaurant search validation passed, starting search...');
        showRestaurantLoadingState();
        
        // Search restaurants from backend API
        fetch('/api/restaurants/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(searchParams)
        })
            .then(response => {
                console.log('📡 Restaurant search response status:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('📊 Restaurant search data received:', data);
                if (data && data.restaurants) {
                    console.log(`✅ Found ${data.restaurants.length} restaurants from database`);
                    displayRestaurantResults(data.restaurants, searchParams);
                } else {
                    console.log('⚠️ No restaurants found');
                    displayRestaurantResults([], searchParams);
                }
            })
            .catch(error => {
                console.error('❌ Error searching restaurants:', error);
                
                // Hiển thị no results khi lỗi database
                displayRestaurantResults([], searchParams);
                
                // Always use current language, not hardcoded check
                const message = (globalConfig && globalConfig.language && globalConfig.language.default === 'vi') ? 
                    'Lỗi kết nối server. Không thể tìm kiếm nhà hàng.' : 
                    'Server connection error. Cannot search restaurants.';
                showNotification(message, 'error');
            });
    }
    
    function showRestaurantLoadingState() {
        document.getElementById('restaurantResults').classList.add('hidden');
        document.getElementById('restaurantNoResults').classList.add('hidden');
        document.getElementById('restaurantLoading').classList.remove('hidden');
    }
    
    function displayRestaurantResults(restaurants, searchParams) {
        console.log('🍽️ Display restaurant results:', restaurants.length, 'restaurants');
        
        currentRestaurantData = restaurants;
        restaurantPagination.allItems = restaurants;
        restaurantPagination.currentPage = 1;
        restaurantPagination.totalPages = Math.ceil(restaurants.length / restaurantPagination.itemsPerPage);
        restaurantPagination.searchParams = searchParams;
        
        document.getElementById('restaurantLoading').classList.add('hidden');
        
        if (restaurants.length === 0) {
            document.getElementById('restaurantNoResults').classList.remove('hidden');
            return;
        }
        
        showRestaurantResults();
        displayRestaurantPage(1);
        updateRestaurantPagination();
        
        // Update search info
        const resultsInfo = getRestaurantSearchDisplayInfo(searchParams);
        updateRestaurantCount(restaurants.length, resultsInfo);
    }
    
    // Make displayRestaurantPage available globally
    window.displayRestaurantPage = function(page) {
        const startIndex = (page - 1) * restaurantPagination.itemsPerPage;
        const endIndex = startIndex + restaurantPagination.itemsPerPage;
        const pageItems = restaurantPagination.allItems.slice(startIndex, endIndex);
        
        const restaurantList = document.getElementById('restaurantList');
        if (!restaurantList) return;
        
        restaurantList.innerHTML = '';
        
        pageItems.forEach(restaurant => {
            const restaurantCard = createRestaurantCard(restaurant, restaurantPagination.searchParams || {});
            restaurantList.appendChild(restaurantCard);
        });
        
        updateLanguageDisplay(); // Update language for new content
    }
    
    // Local reference for internal use
    function displayRestaurantPage(page) {
        window.displayRestaurantPage(page);
    }
    
    function updateRestaurantPagination() {
        const pagination = document.getElementById('restaurantPagination');
        const pageInfo = document.getElementById('restaurantPageInfo');
        const prevBtn = document.getElementById('prevRestaurantPage');
        const nextBtn = document.getElementById('nextRestaurantPage');
        
        if (!pagination || !pageInfo || !prevBtn || !nextBtn) return;
        
        if (restaurantPagination.totalPages > 1) {
            pagination.classList.remove('hidden');
            pageInfo.textContent = `${restaurantPagination.currentPage} / ${restaurantPagination.totalPages}`;
            
            prevBtn.disabled = restaurantPagination.currentPage <= 1;
            nextBtn.disabled = restaurantPagination.currentPage >= restaurantPagination.totalPages;
        } else {
            pagination.classList.add('hidden');
        }
    }
    
    function updateRestaurantCount(count, searchInfo) {
        const restaurantCount = document.getElementById('restaurantCount');
        if (!restaurantCount) return;
        
        // Ensure we use user's chosen language, not global config
        const prefs = getUserPreferences();
        const userLanguage = prefs.language || currentLanguage;
        
        restaurantCount.textContent = userLanguage === 'vi' ? 
            `Tìm thấy ${count} nhà hàng ${searchInfo}` : 
            `Found ${count} restaurants ${searchInfo}`;
    }
    
    function showRestaurantResults() {
        const resultsContainer = document.getElementById('restaurantResults');
        if (resultsContainer) {
            resultsContainer.classList.remove('hidden');
        }
    }
    
    function getRestaurantSearchDisplayInfo(searchParams) {
        const parts = [];
        // Ensure we use user's chosen language, not global config
        const prefs = getUserPreferences();
        const userLanguage = prefs.language || currentLanguage;
        
        if (searchParams.country && searchParams.city) {
            parts.push(userLanguage === 'vi' ? 
                `tại ${searchParams.city}, ${searchParams.country}` : 
                `in ${searchParams.city}, ${searchParams.country}`);
        } else if (searchParams.country) {
            parts.push(userLanguage === 'vi' ? 
                `tại ${searchParams.country}` : 
                `in ${searchParams.country}`);
        } else if (searchParams.city) {
            parts.push(userLanguage === 'vi' ? 
                `tại ${searchParams.city}` : 
                `in ${searchParams.city}`);
        }
        
        if (searchParams.cuisine_type) {
            parts.push(userLanguage === 'vi' ? 
                `phục vụ ${searchParams.cuisine_type}` : 
                `serving ${searchParams.cuisine_type} cuisine`);
        }
        
        return parts.join(', ');
    }
    
    function createRestaurantCard(restaurant, searchParams) {
        const div = document.createElement('div');
        div.className = 'restaurant-card-modern';
        div.dataset.restaurantId = restaurant.restaurant_id;
        
        // Convert price based on current currency
        let displayPrice = restaurant.price_avg;
        let currencySymbol = '$';
        
        switch(currentCurrency) {
            case 'VND':
                displayPrice = Math.round(restaurant.price_avg * exchangeRates.USD_TO_VND);
                currencySymbol = '₫';
                break;
            case 'EUR':
                displayPrice = Math.round(restaurant.price_avg * exchangeRates.USD_TO_EUR * 100) / 100;
                currencySymbol = '€';
                break;
        }
        
        // Get display city name
        const cityName = getCityDisplayName(restaurant.city);
        
        // Get rating badge color
        const ratingClass = restaurant.rating >= 4.5 ? 'excellent' : restaurant.rating >= 4.0 ? 'very-good' : 'good';
        
        // Check if user is admin
        const isAdmin = sessionStorage.getItem('user_session_data') ? 
            JSON.parse(sessionStorage.getItem('user_session_data')).is_admin : false;
        
        // Add admin controls HTML if user is admin
        const adminControlsHTML = isAdmin ? `
            <div class="admin-controls absolute top-2 right-2 flex space-x-2">
                <button class="edit-restaurant-btn bg-blue-100 hover:bg-blue-200 p-1.5 rounded text-blue-700" 
                        onclick="editRestaurant('${restaurant.restaurant_id}'); event.stopPropagation();" 
                        title="Edit Restaurant">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-restaurant-btn bg-red-100 hover:bg-red-200 p-1.5 rounded text-red-700" 
                        onclick="deleteRestaurant('${restaurant.restaurant_id}'); event.stopPropagation();" 
                        title="Delete Restaurant">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        ` : '';
        
        div.innerHTML = `
            <div class="restaurant-card-content relative">
                ${adminControlsHTML}
                
                <!-- Restaurant Info -->
                <div class="restaurant-info-section">
                    <div class="restaurant-header">
                        <h3 class="restaurant-name">${restaurant.name}</h3>
                        <div class="restaurant-meta">
                            <div class="restaurant-cuisine">
                                <span class="cuisine-badge">${restaurant.cuisine_type}</span>
                            </div>
                            <div class="restaurant-rating-badge ${ratingClass}">
                                <i class="fas fa-star text-xs"></i>
                                <span class="font-semibold">${restaurant.rating}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="restaurant-location">
                        <i class="fas fa-map-marker-alt text-blue-500"></i>
                        <span>${cityName}, ${restaurant.country}</span>
                    </div>
                </div>
                
                <!-- Price Section -->
                <div class="restaurant-price-section">
                    <div class="price-per-person">
                        <span class="price-amount">${currencySymbol}${displayPrice.toLocaleString()}</span>
                        <span class="price-unit" data-en="avg per person" data-vi="TB/người">avg per person</span>
                    </div>
                    
                    <button class="view-details-btn" onclick="showRestaurantInfoPanel('${restaurant.restaurant_id}')">
                        <span data-en="View Details" data-vi="Xem Chi Tiết">View Details</span>
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
        
        return div;
    }
}

// Restaurant Autocomplete Functionality
function initializeRestaurantAutocomplete() {
    const searchInput = document.getElementById('restaurantSearchInput');
    const dropdown = document.getElementById('restaurantAutocompleteDropdown');
    const resultsContainer = document.getElementById('restaurantAutocompleteResults');
    const spinner = document.getElementById('restaurantSearchSpinner');
    
    if (!searchInput || !dropdown || !resultsContainer || !spinner) return;
    
    let searchTimeout;
    let currentSelectedIndex = -1;
    let currentSuggestions = [];
    
    // Input event listener với debounce
    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        
        clearTimeout(searchTimeout);
        
        if (query.length < 2) {
            hideRestaurantDropdown();
            return;
        }
        
        // Debounce search requests
        searchTimeout = setTimeout(() => {
            performRestaurantAutocompleteSearch(query);
        }, 300);
    });
    
    // Keyboard navigation
    searchInput.addEventListener('keydown', function(e) {
        const suggestions = dropdown.querySelectorAll('.autocomplete-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            currentSelectedIndex = Math.min(currentSelectedIndex + 1, suggestions.length - 1);
            updateRestaurantSelectedItem();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            currentSelectedIndex = Math.max(currentSelectedIndex - 1, -1);
            updateRestaurantSelectedItem();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (currentSelectedIndex >= 0 && suggestions[currentSelectedIndex]) {
                selectRestaurantSuggestion(currentSuggestions[currentSelectedIndex]);
            }
        } else if (e.key === 'Tab') {
            // Tab key functionality - select current highlighted suggestion
            if (currentSelectedIndex >= 0 && suggestions[currentSelectedIndex]) {
                e.preventDefault();
                selectRestaurantSuggestion(currentSuggestions[currentSelectedIndex]);
            }
        } else if (e.key === 'Escape') {
            hideRestaurantDropdown();
        }
    });
    
    // Click outside to close
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
            hideRestaurantDropdown();
        }
    });
    
    function performRestaurantAutocompleteSearch(query) {
        showRestaurantSpinner();
        
        // Search both restaurants and cities
        Promise.all([
            fetch(`/api/restaurants/autocomplete?q=${encodeURIComponent(query)}&limit=3`).catch(() => ({ json: () => ({ suggestions: [] }) })),
            fetch(`/api/restaurants/cities/autocomplete?q=${encodeURIComponent(query)}&limit=2`).catch(() => ({ json: () => ({ suggestions: [] }) }))
        ])
        .then(responses => Promise.all(responses.map(r => r.json())))
        .then(([restaurantData, cityData]) => {
            hideRestaurantSpinner();
            
            const restaurantSuggestions = restaurantData.suggestions || [];
            const citySuggestions = cityData.suggestions || [];
            
            // Combine suggestions
            currentSuggestions = [...restaurantSuggestions, ...citySuggestions];
            
            displayRestaurantSuggestions(currentSuggestions);
        })
        .catch(error => {
            console.error('Restaurant autocomplete search error:', error);
            hideRestaurantSpinner();
            displayRestaurantNoResults();
        });
    }
    
    function displayRestaurantSuggestions(suggestions) {
        resultsContainer.innerHTML = '';
        currentSelectedIndex = -1;
        
        if (suggestions.length === 0) {
            displayRestaurantNoResults();
            return;
        }
        
        suggestions.forEach((suggestion, index) => {
            const item = createRestaurantSuggestionItem(suggestion, index);
            resultsContainer.appendChild(item);
        });
        
        showRestaurantDropdown();
    }
    
    function createRestaurantSuggestionItem(suggestion, index) {
        const div = document.createElement('div');
        div.className = `autocomplete-item ${suggestion.type === 'city' ? 'city-item' : ''}`;
        div.setAttribute('data-index', index);
        
        if (suggestion.type === 'restaurant') {
            div.innerHTML = `
                <div class="restaurant-name">${highlightMatch(suggestion.name, searchInput.value)}</div>
                <div class="restaurant-location">${suggestion.city}, ${suggestion.country}</div>
                <div class="restaurant-meta">
                    <div class="restaurant-rating">
                        <i class="fas fa-star mr-1"></i>
                        <span>${suggestion.rating}</span>
                        ${suggestion.cuisine_type ? `<span class="ml-2 cuisine-badge">${suggestion.cuisine_type}</span>` : ''}
                    </div>
                    <div class="restaurant-price">
                        $${suggestion.price_avg}/${currentLanguage === 'vi' ? 'người' : 'person'}
                    </div>
                </div>
            `;
        } else if (suggestion.type === 'city') {
            div.innerHTML = `
                <div class="city-name">
                    <i class="fas fa-map-marker-alt mr-2"></i>
                    ${highlightMatch(suggestion.city, searchInput.value)}, ${suggestion.country}
                </div>
                <div class="city-info">${suggestion.restaurant_count} ${currentLanguage === 'vi' ? 'nhà hàng' : 'restaurants'}</div>
            `;
        }
        
        // Click handler
        div.addEventListener('click', () => selectRestaurantSuggestion(suggestion));
        
        return div;
    }
    
    function selectRestaurantSuggestion(suggestion) {
        console.log('🎯 selectRestaurantSuggestion called with:', suggestion);
        searchInput.value = suggestion.name || suggestion.city;
        hideRestaurantDropdown();
    }
    
    function updateRestaurantSelectedItem() {
        const items = dropdown.querySelectorAll('.autocomplete-item');
        items.forEach((item, index) => {
            if (index === currentSelectedIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
    
    function showRestaurantDropdown() {
        dropdown.classList.remove('hidden');
    }
    
    function hideRestaurantDropdown() {
        dropdown.classList.add('hidden');
        currentSelectedIndex = -1;
    }
    
    function showRestaurantSpinner() {
        spinner.classList.remove('hidden');
    }
    
    function hideRestaurantSpinner() {
        spinner.classList.add('hidden');
    }
    
    function displayRestaurantNoResults() {
        resultsContainer.innerHTML = `
            <div class="autocomplete-no-results">
                <i class="fas fa-search text-gray-400 mr-2"></i>
                <span data-en="No suggestions found" data-vi="Không tìm thấy gợi ý">No suggestions found</span>
            </div>
        `;
        showRestaurantDropdown();
        updateLanguageDisplay(); // Update language for new content
    }
}

// Initialize autocomplete for restaurant location inputs 
function initializeRestaurantLocationAutocomplete() {
    console.log('Restaurant location autocomplete initialized');
    
    // Load cuisine types from API
    loadRestaurantCuisines();
}

// Load cuisine types from database API
function loadRestaurantCuisines() {
    const cuisineSelect = document.getElementById('restaurantCuisineSelect');
    if (!cuisineSelect) return;
    
    fetch('/api/restaurants/cuisines')
        .then(response => response.json())
        .then(data => {
            if (data && data.cuisines) {
                console.log(`✅ Loaded ${data.cuisines.length} cuisine types from database`);
                
                // Clear existing options except the first one (All Cuisines)
                const firstOption = cuisineSelect.querySelector('option[value=""]');
                cuisineSelect.innerHTML = '';
                cuisineSelect.appendChild(firstOption);
                
                // Add cuisine options from database
                data.cuisines.forEach(cuisine => {
                    const option = document.createElement('option');
                    option.value = cuisine.cuisine_type;
                    option.textContent = cuisine.cuisine_type;
                    cuisineSelect.appendChild(option);
                });
                
                console.log('✅ Cuisine dropdown populated with real data');
            }
        })
        .catch(error => {
            console.error('❌ Error loading cuisines:', error);
            console.log('⚠️ Using fallback cuisine options');
            
            // Fallback cuisine options
            const fallbackCuisines = [
                'Vietnamese', 'Thai', 'International', 'Seafood', 
                'Chinese', 'French', 'Italian', 'Southern',
                'Fine Dining', 'Molecular Gastronomy', 'Thai Street Food',
                'Royal Thai', 'Northern Thai', 'Japanese', 'Peranakan', 'Modern Asian'
            ];
            
            // Clear existing options except the first one
            const firstOption = cuisineSelect.querySelector('option[value=""]');
            cuisineSelect.innerHTML = '';
            cuisineSelect.appendChild(firstOption);
            
            // Add fallback options
            fallbackCuisines.forEach(cuisine => {
                const option = document.createElement('option');
                option.value = cuisine;
                option.textContent = cuisine;
                cuisineSelect.appendChild(option);
            });
        });
}

// ===== INITIALIZE GHOST TEXT AUTOCOMPLETE =====
function initializeGhostTextAutocomplete() {
    console.log('🚀 Initializing Ghost Text Autocomplete for all input fields...');
    
    // Detect environment
    const isLocalEnvironment = window.location.protocol === 'file:' || 
                              window.location.hostname === 'localhost' || 
                              window.location.hostname === '127.0.0.1';
    
    // Base API path - use empty for direct fallback in local environment
    const baseApiPath = isLocalEnvironment ? '' : '/api';
    
    // Array to store autocomplete instances for cleanup
    window.ghostAutoCompleteInstances = [];
    
    // Helper function to safely initialize
    function initializeAutoComplete(element, options) {
        if (!element) return null;
        
        try {
            // Remove apiEndpoint from options - now handled automatically by the class
            const instance = new GhostTextAutoComplete(element, options);
            window.ghostAutoCompleteInstances.push(instance);
            console.log(`✅ ${element.id} autocomplete initialized`);
            return instance;
        } catch (error) {
            console.error(`Error initializing autocomplete for ${element.id}:`, error);
            return null;
        }
    }
    
    // Restaurant Search Input
    initializeAutoComplete(
        document.getElementById('restaurantSearchInput'), 
        {
            placeholder: 'Type restaurant name...',
            onSelect: (value) => {
                console.log('Restaurant search selected:', value);
                // Optionally trigger search
                document.getElementById('restaurantSearchForm')?.dispatchEvent(new Event('submit'));
            }
        }
    );
    
    // Restaurant Country Input
    initializeAutoComplete(
        document.getElementById('restaurantCountryInput'),
        {
            placeholder: 'Type country name...',
            onSelect: (value) => {
                console.log('Restaurant country selected:', value);
                // Clear city input when country changes
                const cityInput = document.getElementById('restaurantCityInput');
                if (cityInput) cityInput.value = '';
                
                // Trigger a custom change event to update dependent fields
                const event = new Event('change', { bubbles: true });
                document.getElementById('restaurantCountryInput').dispatchEvent(event);
            }
        }
    );
    
    // Restaurant City Input
    initializeAutoComplete(
        document.getElementById('restaurantCityInput'),
        {
            placeholder: 'Type city name...',
            onSelect: (value) => {
                console.log('Restaurant city selected:', value);
                
                // Get the country value to help find the correct city_id
                const countryInput = document.getElementById('restaurantCountryInput');
                const countryValue = countryInput ? countryInput.value : '';
                
                if (countryValue && value) {
                    // Fetch city ID from API
                    fetch(`/api/cities/id?city=${encodeURIComponent(value)}&country=${encodeURIComponent(countryValue)}`)
                        .then(response => response.json())
                        .then(data => {
                            if (data.city_id) {
                                console.log(`Found city_id for ${value}: ${data.city_id}`);
                                // Store city_id in a hidden field if available
                                const cityIdField = document.getElementById('restaurant_city_id');
                                if (cityIdField) cityIdField.value = data.city_id;
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching city ID:', error);
                        });
                }
            }
        }
    );
    
    // Restaurant Cuisine Type Input
    initializeAutoComplete(
        document.getElementById('cuisine_type_input'),
        {
            placeholder: 'Type cuisine...',
            ghost: document.getElementById('cuisine_type_ghost'),
            apiEndpoint: '/api/ghost/cuisines',
            onSelect: (value) => {
                console.log('Cuisine type selected:', value);
            }
        }
    );
    
    // Hotel Search Input
    initializeAutoComplete(
        document.getElementById('hotelSearchInput'),
        {
            placeholder: 'Type hotel name...',
            onSelect: (value) => {
                console.log('Hotel search selected:', value);
                // Optionally trigger search
                document.getElementById('hotelSearchForm')?.dispatchEvent(new Event('submit'));
            }
        }
    );
    
    // Hotel Country Input
    initializeAutoComplete(
        document.getElementById('hotelCountryInput'),
        {
            placeholder: 'Type country name...',
            onSelect: (value) => {
                console.log('Hotel country selected:', value);
                // Clear city input when country changes
                const cityInput = document.getElementById('hotelCityInput');
                if (cityInput) cityInput.value = '';
                
                // Trigger a custom change event to update dependent fields
                const event = new Event('change', { bubbles: true });
                document.getElementById('hotelCountryInput').dispatchEvent(event);
            }
        }
    );
    
    // Hotel City Input
    initializeAutoComplete(
        document.getElementById('hotelCityInput'),
        {
            placeholder: 'Type city name...',
            onSelect: (value) => {
                console.log('Hotel city selected:', value);
                
                // Get the country value to help find the correct city_id
                const countryInput = document.getElementById('hotelCountryInput');
                const countryValue = countryInput ? countryInput.value : '';
                
                if (countryValue && value) {
                    // Fetch city ID from API
                    fetch(`/api/cities/id?city=${encodeURIComponent(value)}&country=${encodeURIComponent(countryValue)}`)
                        .then(response => response.json())
                        .then(data => {
                            if (data.city_id) {
                                console.log(`Found city_id for ${value}: ${data.city_id}`);
                                // Store city_id in a hidden field if available
                                const cityIdField = document.getElementById('hotel_city_id');
                                if (cityIdField) cityIdField.value = data.city_id;
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching city ID:', error);
                        });
                }
            }
        }
    );
    
    console.log(`🎉 Ghost Text Autocomplete initialized for ${window.ghostAutoCompleteInstances.length} input fields`);
    
    // Initialize travel tour search after all other initialization
    setTimeout(() => {
        if (typeof initializeTravelTourSearch === 'function') {
            initializeTravelTourSearch();
            console.log('🌟 Travel tour search initialized');
        }
    }, 100);
}

// Ensure the script ends properly without syntax errors
console.log('✅ Script loaded successfully');