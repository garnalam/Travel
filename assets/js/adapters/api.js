/**
 * API Adapter
 * Lớp bọc (wrapper) cho các API endpoint của Vietnam Travel
 */

// API Configuration
const ApiConfig = {
    // Base URL for API
    baseUrl: '/api',
    
    // Default headers
    defaultHeaders: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    },
    
    // Request timeout (ms)
    timeout: 30000,
    
    // Enable API caching
    enableCache: true,
    
    // Cache duration (ms) - 5 minutes
    cacheDuration: 5 * 60 * 1000,
    
    // Error messages
    errorMessages: {
        en: {
            network: 'Network error. Please check your connection.',
            timeout: 'Request timed out. Please try again.',
            server: 'Server error. Please try again later.',
            auth: 'Authentication error. Please log in again.',
            notFound: 'Resource not found.',
            validation: 'Validation error. Please check your input.',
            default: 'An unexpected error occurred. Please try again.'
        },
        vi: {
            network: 'Lỗi mạng. Vui lòng kiểm tra kết nối của bạn.',
            timeout: 'Yêu cầu đã hết thời gian chờ. Vui lòng thử lại.',
            server: 'Lỗi máy chủ. Vui lòng thử lại sau.',
            auth: 'Lỗi xác thực. Vui lòng đăng nhập lại.',
            notFound: 'Không tìm thấy tài nguyên.',
            validation: 'Lỗi xác nhận. Vui lòng kiểm tra dữ liệu nhập vào.',
            default: 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.'
        }
    }
};

// API Adapter Class
class ApiAdapter {
    constructor(config = {}) {
        this.config = { ...ApiConfig, ...config };
        this.ajax = window.Ajax; // Use global Ajax instance
    }
    
    /**
     * Get user-friendly error message based on error
     * @param {Error|Object} error - Error object
     * @param {string} lang - Language code
     * @returns {string} Error message
     */
    getErrorMessage(error, lang = 'en') {
        if (!this.config.errorMessages[lang]) {
            lang = 'en'; // Fallback to English
        }
        
        const messages = this.config.errorMessages[lang];
        
        if (typeof error === 'string') {
            return error;
        }
        
        if (error instanceof Error) {
            if (error.message.includes('timeout')) {
                return messages.timeout;
            }
            
            if (error.message.includes('network')) {
                return messages.network;
            }
            
            return error.message;
        }
        
        if (error.status) {
            switch (error.status) {
                case 401:
                case 403:
                    return messages.auth;
                case 404:
                    return messages.notFound;
                case 422:
                    return messages.validation;
                case 500:
                    return messages.server;
                default:
                    return error.message || messages.default;
            }
        }
        
        return messages.default;
    }
    
    /**
     * Build API URL
     * @param {string} endpoint - API endpoint
     * @returns {string} Full API URL
     */
    buildUrl(endpoint) {
        // Remove leading slash if present
        if (endpoint.startsWith('/')) {
            endpoint = endpoint.substring(1);
        }
        
        return `${this.config.baseUrl}/${endpoint}`;
    }
    
    /**
     * Make API request
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request data
     * @param {Object} options - Request options
     * @returns {Promise<any>} Response data
     */
    async request(method, endpoint, data = null, options = {}) {
        try {
            const url = this.buildUrl(endpoint);
            
            // Prepare options
            const requestOptions = {
                method,
                headers: { ...this.config.defaultHeaders, ...options.headers },
                timeout: options.timeout || this.config.timeout,
                noCache: !this.config.enableCache
            };
            
            // Add data if present
            if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                requestOptions.body = JSON.stringify(data);
            }
            
            // Make request
            const response = await this.ajax.request(url, requestOptions);
            
            return response;
        } catch (error) {
            const lang = window.currentLanguage || 'en';
            const message = this.getErrorMessage(error, lang);
            
            // Show notification if enabled
            if (options.showError !== false && typeof showNotification === 'function') {
                showNotification(message, 'error');
            }
            
            throw new Error(message);
        }
    }
    
    /**
     * Make GET request
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<any>} Response data
     */
    async get(endpoint, options = {}) {
        return this.request('GET', endpoint, null, options);
    }
    
    /**
     * Make POST request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request data
     * @param {Object} options - Request options
     * @returns {Promise<any>} Response data
     */
    async post(endpoint, data, options = {}) {
        return this.request('POST', endpoint, data, options);
    }
    
    /**
     * Make PUT request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request data
     * @param {Object} options - Request options
     * @returns {Promise<any>} Response data
     */
    async put(endpoint, data, options = {}) {
        return this.request('PUT', endpoint, data, options);
    }
    
    /**
     * Make DELETE request
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<any>} Response data
     */
    async delete(endpoint, options = {}) {
        return this.request('DELETE', endpoint, null, options);
    }
    
    /* API-specific methods */
    
    /**
     * Load configuration
     * @returns {Promise<Object>} Configuration data
     */
    async loadConfig() {
        return this.get('config');
    }
    
    /**
     * Search hotels
     * @param {Object} params - Search parameters
     * @returns {Promise<Array>} Hotel results
     */
    async searchHotels(params) {
        return this.post('hotels/search', params);
    }
    
    /**
     * Search restaurants
     * @param {Object} params - Search parameters
     * @returns {Promise<Array>} Restaurant results
     */
    async searchRestaurants(params) {
        return this.post('restaurants/search', params);
    }
    
    /**
     * Get tour history
     * @param {number} page - Page number
     * @param {number} limit - Results per page
     * @returns {Promise<Object>} Tour history data
     */
    async getTourHistory(page = 1, limit = 10) {
        return this.get(`tour-history?page=${page}&limit=${limit}`);
    }
    
    /**
     * Get tour details
     * @param {string} tourId - Tour ID
     * @returns {Promise<Object>} Tour details
     */
    async getTourDetails(tourId) {
        return this.get(`tour-history/${tourId}`);
    }
    
    /**
     * Get hotel details
     * @param {string} hotelId - Hotel ID
     * @returns {Promise<Object>} Hotel details
     */
    async getHotelDetails(hotelId) {
        return this.get(`hotels/${hotelId}`);
    }
    
    /**
     * Get restaurant details
     * @param {string} restaurantId - Restaurant ID
     * @returns {Promise<Object>} Restaurant details
     */
    async getRestaurantDetails(restaurantId) {
        return this.get(`restaurants/${restaurantId}`);
    }
    
    /**
     * Login user
     * @param {Object} credentials - User credentials
     * @returns {Promise<Object>} Login response
     */
    async login(credentials) {
        return this.post('login', credentials);
    }
    
    /**
     * Register user
     * @param {Object} userData - User data
     * @returns {Promise<Object>} Registration response
     */
    async register(userData) {
        return this.post('register', userData);
    }
    
    /**
     * Logout user
     * @returns {Promise<Object>} Logout response
     */
    async logout() {
        return this.post('logout');
    }
}

// Create global instance
window.api = new ApiAdapter();