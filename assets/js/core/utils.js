/**
 * Utility Functions
 * Các hàm tiện ích chung cho ứng dụng Vietnam Travel
 */

// Global utils object
const Utils = {
    /**
     * Throttle function execution
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        let lastResult;
        
        return function(...args) {
            const context = this;
            
            if (!inThrottle) {
                lastResult = func.apply(context, args);
                inThrottle = true;
                setTimeout(() => {
                    inThrottle = false;
                }, limit);
            }
            
            return lastResult;
        };
    },
    
    /**
     * Debounce function execution
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @param {boolean} immediate - Execute immediately
     * @returns {Function} Debounced function
     */
    debounce(func, wait, immediate = false) {
        let timeout;
        
        return function(...args) {
            const context = this;
            
            const later = () => {
                timeout = null;
                if (!immediate) {
                    func.apply(context, args);
                }
            };
            
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            
            if (callNow) {
                return func.apply(context, args);
            }
        };
    },
    
    /**
     * Create a DOM element with attributes and children
     * @param {string} tagName - Element tag name
     * @param {Object} attributes - Element attributes
     * @param {Array|string} children - Child elements or text content
     * @returns {HTMLElement} Created element
     */
    createElement(tagName, attributes = {}, children = []) {
        const element = document.createElement(tagName);
        
        // Set attributes
        Object.keys(attributes).forEach(key => {
            if (key === 'style' && typeof attributes[key] === 'object') {
                Object.assign(element.style, attributes[key]);
            } else if (key === 'dataset' && typeof attributes[key] === 'object') {
                Object.keys(attributes[key]).forEach(dataKey => {
                    element.dataset[dataKey] = attributes[key][dataKey];
                });
            } else if (key === 'class' || key === 'className') {
                if (Array.isArray(attributes[key])) {
                    element.className = attributes[key].join(' ');
                } else {
                    element.className = attributes[key];
                }
            } else if (key === 'onClick') {
                element.addEventListener('click', attributes[key]);
            } else if (key === 'events' && typeof attributes[key] === 'object') {
                Object.keys(attributes[key]).forEach(eventName => {
                    element.addEventListener(eventName, attributes[key][eventName]);
                });
            } else {
                element.setAttribute(key, attributes[key]);
            }
        });
        
        // Add children
        if (Array.isArray(children)) {
            children.forEach(child => {
                if (child instanceof Node) {
                    element.appendChild(child);
                } else if (child !== undefined && child !== null) {
                    element.appendChild(document.createTextNode(child.toString()));
                }
            });
        } else if (typeof children === 'string') {
            element.textContent = children;
        }
        
        return element;
    },
    
    /**
     * Format currency
     * @param {number} amount - Amount to format
     * @param {string} currency - Currency code
     * @returns {string} Formatted currency
     */
    formatCurrency(amount, currency = 'USD') {
        if (typeof amount !== 'number') {
            amount = parseFloat(amount) || 0;
        }
        
        switch (currency) {
            case 'VND':
                return new Intl.NumberFormat('vi-VN', { 
                    style: 'currency', 
                    currency: 'VND',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).format(amount);
            
            case 'EUR':
                return new Intl.NumberFormat('de-DE', { 
                    style: 'currency', 
                    currency: 'EUR'
                }).format(amount);
            
            case 'USD':
            default:
                return new Intl.NumberFormat('en-US', { 
                    style: 'currency', 
                    currency: 'USD'
                }).format(amount);
        }
    },
    
    /**
     * Format date
     * @param {string|Date} date - Date to format
     * @param {string} format - Format string
     * @param {string} locale - Locale code
     * @returns {string} Formatted date
     */
    formatDate(date, format = 'short', locale = 'en-US') {
        if (!date) return '';
        
        const dateObj = date instanceof Date ? date : new Date(date);
        
        if (isNaN(dateObj.getTime())) {
            return '';
        }
        
        switch (format) {
            case 'full':
                return new Intl.DateTimeFormat(locale, { 
                    dateStyle: 'full' 
                }).format(dateObj);
            
            case 'long':
                return new Intl.DateTimeFormat(locale, { 
                    dateStyle: 'long' 
                }).format(dateObj);
            
            case 'medium':
                return new Intl.DateTimeFormat(locale, { 
                    dateStyle: 'medium' 
                }).format(dateObj);
            
            case 'short':
            default:
                return new Intl.DateTimeFormat(locale, { 
                    dateStyle: 'short' 
                }).format(dateObj);
        }
    },
    
    /**
     * Get date difference in days
     * @param {string|Date} date1 - Start date
     * @param {string|Date} date2 - End date
     * @returns {number} Difference in days
     */
    getDateDiff(date1, date2) {
        const d1 = date1 instanceof Date ? date1 : new Date(date1);
        const d2 = date2 instanceof Date ? date2 : new Date(date2);
        
        const diffTime = Math.abs(d2 - d1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    },
    
    /**
     * Deep clone object
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }
        
        if (obj instanceof Object) {
            const copy = {};
            Object.keys(obj).forEach(key => {
                copy[key] = this.deepClone(obj[key]);
            });
            return copy;
        }
        
        throw new Error("Unable to copy object");
    },
    
    /**
     * Get query parameters from URL
     * @param {string} url - URL to parse
     * @returns {Object} Query parameters
     */
    getQueryParams(url) {
        const params = {};
        const query = url ? url.split('?')[1] : window.location.search.slice(1);
        
        if (!query) {
            return params;
        }
        
        query.split('&').forEach(item => {
            const [key, value] = item.split('=');
            params[key] = value ? decodeURIComponent(value) : '';
        });
        
        return params;
    },
    
    /**
     * Build URL with query parameters
     * @param {string} baseUrl - Base URL
     * @param {Object} params - Query parameters
     * @returns {string} URL with query string
     */
    buildUrl(baseUrl, params = {}) {
        const url = new URL(baseUrl, window.location.origin);
        
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                url.searchParams.append(key, params[key]);
            }
        });
        
        return url.toString();
    },
    
    /**
     * Sanitize HTML string
     * @param {string} html - HTML string to sanitize
     * @returns {string} Sanitized HTML
     */
    sanitizeHTML(html) {
        const temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML;
    },
    
    /**
     * Truncate text to specific length
     * @param {string} text - Text to truncate
     * @param {number} length - Maximum length
     * @param {string} suffix - Suffix to add
     * @returns {string} Truncated text
     */
    truncateText(text, length = 100, suffix = '...') {
        if (!text || text.length <= length) {
            return text;
        }
        
        return text.substring(0, length).trim() + suffix;
    },
    
    /**
     * Generate random ID
     * @param {string} prefix - ID prefix
     * @returns {string} Random ID
     */
    generateId(prefix = '') {
        return `${prefix}${Math.random().toString(36).substr(2, 9)}`;
    },
    
    /**
     * Check if element is visible in viewport
     * @param {HTMLElement} element - Element to check
     * @param {number} offset - Offset from viewport edge
     * @returns {boolean} True if element is visible
     */
    isElementInViewport(element, offset = 0) {
        const rect = element.getBoundingClientRect();
        
        return (
            rect.top >= 0 - offset &&
            rect.left >= 0 - offset &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + offset &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth) + offset
        );
    },
    
    /**
     * Add event listener with automatic removal
     * @param {HTMLElement} element - Element to listen on
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @returns {Function} Function to remove listener
     */
    addEventListenerWithCleanup(element, event, handler) {
        element.addEventListener(event, handler);
        
        return () => {
            element.removeEventListener(event, handler);
        };
    }
};

// Export to global scope
window.Utils = Utils;