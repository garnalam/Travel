/**
 * AJAX Core System
 * Tối ưu hóa hệ thống AJAX cho toàn bộ ứng dụng Vietnam Travel
 */

// AJAX System Configuration
const AjaxConfig = {
    // Base URL for API endpoints
    baseUrl: '',
    
    // Default headers for all requests
    defaultHeaders: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    },
    
    // Default timeout in milliseconds
    timeout: 30000,
    
    // Cache duration in milliseconds (5 minutes)
    cacheDuration: 5 * 60 * 1000,
    
    // Enable response caching
    enableCache: true,
    
    // Loading indicator settings
    loadingIndicator: {
        show: true,
        delay: 300, // ms before showing loading indicator
        elementId: 'ajaxLoadingIndicator'
    },
    
    // Global error handling
    errorHandler: (error, url) => {
        console.error(`AJAX Error on ${url}:`, error);
        showNotification(
            typeof error === 'string' ? error : 'Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.',
            'error',
            5000
        );
    }
};

// AJAX Cache System
const AjaxCache = {
    cache: new Map(),
    
    // Get cached response
    get(url) {
        if (!AjaxConfig.enableCache) return null;
        
        const cachedData = this.cache.get(url);
        if (!cachedData) return null;
        
        const { timestamp, data } = cachedData;
        const now = Date.now();
        
        // Check if cache is still valid
        if (now - timestamp < AjaxConfig.cacheDuration) {
            console.log(`✅ Using cached data for ${url}`);
            return data;
        }
        
        // Cache expired, remove it
        console.log(`⏰ Cache expired for ${url}`);
        this.cache.delete(url);
        return null;
    },
    
    // Set response in cache
    set(url, data) {
        if (!AjaxConfig.enableCache) return;
        
        this.cache.set(url, {
            timestamp: Date.now(),
            data
        });
        
        console.log(`💾 Cached data for ${url}`);
    },
    
    // Clear entire cache or specific URL
    clear(url) {
        if (url) {
            this.cache.delete(url);
            console.log(`🧹 Cleared cache for ${url}`);
        } else {
            this.cache.clear();
            console.log('🧹 Cleared entire AJAX cache');
        }
    },
    
    // Clear expired cache entries
    clearExpired() {
        const now = Date.now();
        let expiredCount = 0;
        
        this.cache.forEach((cachedData, url) => {
            if (now - cachedData.timestamp > AjaxConfig.cacheDuration) {
                this.cache.delete(url);
                expiredCount++;
            }
        });
        
        if (expiredCount > 0) {
            console.log(`🧹 Cleared ${expiredCount} expired cache entries`);
        }
    }
};

// Loading indicator management
const LoadingIndicator = {
    timers: new Map(),
    
    // Create or get loading indicator element
    getIndicatorElement() {
        let indicator = document.getElementById(AjaxConfig.loadingIndicator.elementId);
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = AjaxConfig.loadingIndicator.elementId;
            indicator.className = 'ajax-loading-indicator';
            indicator.innerHTML = `
                <div class="loading-spinner"></div>
                <div class="loading-text" data-en="Loading..." data-vi="Đang tải...">Loading...</div>
            `;
            document.body.appendChild(indicator);
            
            // Add styles if not already present
            if (!document.querySelector('#ajax-loading-styles')) {
                const style = document.createElement('style');
                style.id = 'ajax-loading-styles';
                style.textContent = `
                    .ajax-loading-indicator {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background-color: rgba(0, 0, 0, 0.3);
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        z-index: 9999;
                        opacity: 0;
                        visibility: hidden;
                        transition: opacity 0.3s, visibility 0.3s;
                    }
                    
                    .ajax-loading-indicator.visible {
                        opacity: 1;
                        visibility: visible;
                    }
                    
                    .ajax-loading-indicator .loading-spinner {
                        border: 3px solid #f3f3f3;
                        border-top: 3px solid #3498db;
                        border-radius: 50%;
                        width: 40px;
                        height: 40px;
                        animation: spin 1s linear infinite;
                        margin-bottom: 10px;
                    }
                    
                    .ajax-loading-indicator .loading-text {
                        color: white;
                        font-size: 18px;
                        font-weight: bold;
                    }
                    
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }
        }
        
        return indicator;
    },
    
    // Show loading indicator after delay
    show(requestId) {
        if (!AjaxConfig.loadingIndicator.show) return;
        
        const timer = setTimeout(() => {
            const indicator = this.getIndicatorElement();
            indicator.classList.add('visible');
            
            // Update text based on current language
            if (window.currentLanguage) {
                const textElement = indicator.querySelector('.loading-text');
                if (textElement) {
                    textElement.textContent = window.currentLanguage === 'vi' ? 'Đang tải...' : 'Loading...';
                }
            }
            
            // Remove timer reference
            this.timers.delete(requestId);
        }, AjaxConfig.loadingIndicator.delay);
        
        this.timers.set(requestId, timer);
    },
    
    // Hide loading indicator
    hide(requestId) {
        // Clear pending timer if exists
        if (this.timers.has(requestId)) {
            clearTimeout(this.timers.get(requestId));
            this.timers.delete(requestId);
        }
        
        // Check if there are any active timers
        if (this.timers.size === 0) {
            const indicator = document.getElementById(AjaxConfig.loadingIndicator.elementId);
            if (indicator) {
                indicator.classList.remove('visible');
            }
        }
    }
};

// Main Ajax class
class Ajax {
    /**
     * Make a GET request
     * @param {string} url - The endpoint URL
     * @param {Object} options - Optional settings
     * @returns {Promise<any>} Response data
     */
    static async get(url, options = {}) {
        return this.request(url, { 
            method: 'GET', 
            ...options 
        });
    }
    
    /**
     * Make a POST request
     * @param {string} url - The endpoint URL
     * @param {Object} data - Data to send
     * @param {Object} options - Optional settings
     * @returns {Promise<any>} Response data
     */
    static async post(url, data = {}, options = {}) {
        return this.request(url, { 
            method: 'POST', 
            body: JSON.stringify(data),
            ...options
        });
    }
    
    /**
     * Make a PUT request
     * @param {string} url - The endpoint URL
     * @param {Object} data - Data to send
     * @param {Object} options - Optional settings
     * @returns {Promise<any>} Response data
     */
    static async put(url, data = {}, options = {}) {
        return this.request(url, { 
            method: 'PUT', 
            body: JSON.stringify(data),
            ...options
        });
    }
    
    /**
     * Make a DELETE request
     * @param {string} url - The endpoint URL
     * @param {Object} options - Optional settings
     * @returns {Promise<any>} Response data
     */
    static async delete(url, options = {}) {
        return this.request(url, { 
            method: 'DELETE', 
            ...options
        });
    }
    
    /**
     * Make a generic request with full configuration
     * @param {string} url - The endpoint URL
     * @param {Object} options - Request options
     * @returns {Promise<any>} Response data
     */
    static async request(url, options = {}) {
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const fullUrl = AjaxConfig.baseUrl + url;
        
        // Check cache for GET requests
        if (options.method === 'GET' && !options.noCache) {
            const cachedData = AjaxCache.get(fullUrl);
            if (cachedData) return Promise.resolve(cachedData);
        }
        
        // Show loading indicator
        LoadingIndicator.show(requestId);
        
        // Prepare fetch options
        const fetchOptions = {
            method: options.method || 'GET',
            headers: { 
                ...AjaxConfig.defaultHeaders,
                ...options.headers 
            },
            ...options
        };
        
        // Remove custom properties from fetch options
        delete fetchOptions.noCache;
        
        try {
            // Set up timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), AjaxConfig.timeout);
            });
            
            // Make request with timeout
            const response = await Promise.race([
                fetch(fullUrl, fetchOptions),
                timeoutPromise
            ]);
            
            // Hide loading indicator
            LoadingIndicator.hide(requestId);
            
            // Check for HTTP errors
            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage;
                
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorData.error || `Error ${response.status}`;
                } catch (e) {
                    errorMessage = errorText || `Error ${response.status}`;
                }
                
                throw new Error(errorMessage);
            }
            
            // Parse response based on content type
            const contentType = response.headers.get('Content-Type') || '';
            let data;
            
            if (contentType.includes('application/json')) {
                data = await response.json();
            } else if (contentType.includes('text/')) {
                data = await response.text();
            } else {
                data = await response.blob();
            }
            
            // Cache successful GET responses
            if (options.method === 'GET' && !options.noCache) {
                AjaxCache.set(fullUrl, data);
            }
            
            return data;
        } catch (error) {
            // Hide loading indicator
            LoadingIndicator.hide(requestId);
            
            // Handle error
            if (options.errorHandler) {
                options.errorHandler(error, url);
            } else {
                AjaxConfig.errorHandler(error, url);
            }
            
            throw error;
        }
    }
    
    /**
     * Load HTML content from a URL and insert into an element
     * @param {string} url - The URL to load HTML from
     * @param {string|HTMLElement} targetElement - Element to insert HTML into
     * @param {Object} options - Request options
     * @returns {Promise<HTMLElement>} The populated element
     */
    static async loadHTML(url, targetElement, options = {}) {
        try {
            const html = await this.get(url, { 
                headers: { 'Accept': 'text/html' },
                ...options
            });
            
            // Get target element if string was provided
            const element = typeof targetElement === 'string'
                ? document.querySelector(targetElement)
                : targetElement;
            
            if (!element) {
                throw new Error(`Target element not found: ${targetElement}`);
            }
            
            // Insert HTML
            element.innerHTML = html;
            
            // Execute scripts if requested
            if (options.executeScripts !== false) {
                const scripts = element.querySelectorAll('script');
                scripts.forEach(oldScript => {
                    const newScript = document.createElement('script');
                    Array.from(oldScript.attributes).forEach(attr => {
                        newScript.setAttribute(attr.name, attr.value);
                    });
                    newScript.textContent = oldScript.textContent;
                    oldScript.parentNode.replaceChild(newScript, oldScript);
                });
            }
            
            // Update language display after loading HTML
            if (typeof updateLanguageDisplay === 'function') {
                updateLanguageDisplay();
            }
            
            return element;
        } catch (error) {
            if (options.errorHandler) {
                options.errorHandler(error, url);
            } else {
                AjaxConfig.errorHandler(error, url);
            }
            throw error;
        }
    }
    
    /**
     * Submit a form via AJAX
     * @param {HTMLFormElement|string} form - The form element or form selector
     * @param {Object} options - Request options
     * @returns {Promise<any>} Response data
     */
    static async submitForm(form, options = {}) {
        // Get form element if string was provided
        const formElement = typeof form === 'string'
            ? document.querySelector(form)
            : form;
        
        if (!formElement || !(formElement instanceof HTMLFormElement)) {
            throw new Error('Invalid form element');
        }
        
        // Get form data
        const formData = new FormData(formElement);
        
        // Convert FormData to JSON if needed
        let body;
        const contentType = options.headers?.['Content-Type'] || AjaxConfig.defaultHeaders['Content-Type'];
        
        if (contentType.includes('application/json')) {
            const formObject = {};
            formData.forEach((value, key) => {
                formObject[key] = value;
            });
            body = JSON.stringify(formObject);
        } else {
            body = formData;
            // Remove default content-type to let browser set it with boundary
            if (options.headers) {
                delete options.headers['Content-Type'];
            }
        }
        
        // Get form method and action
        const method = formElement.getAttribute('method')?.toUpperCase() || 'POST';
        const action = formElement.getAttribute('action') || window.location.href;
        
        // Make request
        return this.request(action, {
            method,
            body,
            ...options
        });
    }
}

// Export to global scope
window.Ajax = Ajax;
window.AjaxCache = AjaxCache;