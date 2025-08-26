/**
 * Resource Loader System
 * Hệ thống tải tài nguyên thông minh cho ứng dụng Vietnam Travel
 */

// Loader Configuration
const LoaderConfig = {
    // Default timeout for all resource loading (ms)
    timeout: 30000,
    
    // Resource cache duration (ms) - 1 hour
    cacheDuration: 60 * 60 * 1000,
    
    // Enable cache
    enableCache: true,
    
    // Load scripts asynchronously
    async: true,
    
    // Load scripts with defer attribute
    defer: true,
    
    // Resource versioning
    version: '1.0.0',
    
    // Base URLs
    baseUrls: {
        scripts: '',
        styles: '',
        images: ''
    },
    
    // Critical resources to preload (will load before DOM ready)
    criticalResources: [],
    
    // Error handling
    onError: (error, resource) => {
        console.error(`Failed to load ${resource.type}: ${resource.url}`, error);
    }
};

// Resource Loader Cache
const LoaderCache = {
    cache: new Map(),
    
    // Get resource from cache
    get(url) {
        if (!LoaderConfig.enableCache) return null;
        
        const resource = this.cache.get(url);
        if (!resource) return null;
        
        const { timestamp, data } = resource;
        const now = Date.now();
        
        // Check if cache is still valid
        if (now - timestamp < LoaderConfig.cacheDuration) {
            return data;
        }
        
        // Cache expired, remove it
        this.cache.delete(url);
        return null;
    },
    
    // Set resource in cache
    set(url, data) {
        if (!LoaderConfig.enableCache) return;
        
        this.cache.set(url, {
            timestamp: Date.now(),
            data
        });
    },
    
    // Clear cache
    clear(url) {
        if (url) {
            this.cache.delete(url);
        } else {
            this.cache.clear();
        }
    }
};

// Resource Loader Class
class ResourceLoader {
    constructor(config = {}) {
        this.config = { ...LoaderConfig, ...config };
        this.loadedResources = new Set();
        this.loadingPromises = new Map();
        this.readyCallbacks = [];
        this.isReady = false;
    }
    
    /**
     * Initialize the loader
     */
    init() {
        // Load critical resources immediately
        if (this.config.criticalResources.length > 0) {
            const promises = this.config.criticalResources.map(resource => {
                if (typeof resource === 'string') {
                    // Convert string to resource object
                    if (resource.endsWith('.js')) {
                        return this.loadScript(resource);
                    } else if (resource.endsWith('.css')) {
                        return this.loadStyle(resource);
                    } else {
                        return Promise.resolve();
                    }
                } else {
                    // Resource object with type
                    if (resource.type === 'script') {
                        return this.loadScript(resource.url, resource.options);
                    } else if (resource.type === 'style') {
                        return this.loadStyle(resource.url, resource.options);
                    } else {
                        return Promise.resolve();
                    }
                }
            });
            
            // Wait for critical resources
            Promise.all(promises)
                .then(() => {
                    console.log('Critical resources loaded');
                })
                .catch(error => {
                    console.error('Error loading critical resources:', error);
                });
        }
        
        // Mark as ready when DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            this.isReady = true;
            this._executeReadyCallbacks();
        });
    }
    
    /**
     * Load a script
     * @param {string} url - Script URL
     * @param {Object} options - Loading options
     * @returns {Promise<void>} Loading promise
     */
    loadScript(url, options = {}) {
        const fullUrl = this._buildUrl(url, 'scripts', options);
        
        // Return existing promise if script is already loading
        if (this.loadingPromises.has(fullUrl)) {
            return this.loadingPromises.get(fullUrl);
        }
        
        // Return immediately if script is already loaded
        if (this.loadedResources.has(fullUrl)) {
            return Promise.resolve();
        }
        
        // Create loading promise
        const promise = new Promise((resolve, reject) => {
            // Create script element
            const script = document.createElement('script');
            script.src = fullUrl;
            script.async = options.async !== undefined ? options.async : this.config.async;
            script.defer = options.defer !== undefined ? options.defer : this.config.defer;
            
            // Add attributes
            if (options.attributes) {
                Object.entries(options.attributes).forEach(([key, value]) => {
                    script.setAttribute(key, value);
                });
            }
            
            // Set up timeout
            const timeoutId = setTimeout(() => {
                reject(new Error(`Script loading timeout: ${fullUrl}`));
                this.loadingPromises.delete(fullUrl);
            }, options.timeout || this.config.timeout);
            
            // Handle load and error events
            script.onload = () => {
                clearTimeout(timeoutId);
                this.loadedResources.add(fullUrl);
                this.loadingPromises.delete(fullUrl);
                resolve();
            };
            
            script.onerror = (error) => {
                clearTimeout(timeoutId);
                this.loadingPromises.delete(fullUrl);
                
                if (options.onError) {
                    options.onError(error, { type: 'script', url: fullUrl });
                } else if (this.config.onError) {
                    this.config.onError(error, { type: 'script', url: fullUrl });
                }
                
                reject(error);
            };
            
            // Add script to document
            document.head.appendChild(script);
        });
        
        // Store promise
        this.loadingPromises.set(fullUrl, promise);
        
        return promise;
    }
    
    /**
     * Load a CSS stylesheet
     * @param {string} url - Style URL
     * @param {Object} options - Loading options
     * @returns {Promise<void>} Loading promise
     */
    loadStyle(url, options = {}) {
        const fullUrl = this._buildUrl(url, 'styles', options);
        
        // Return existing promise if style is already loading
        if (this.loadingPromises.has(fullUrl)) {
            return this.loadingPromises.get(fullUrl);
        }
        
        // Return immediately if style is already loaded
        if (this.loadedResources.has(fullUrl)) {
            return Promise.resolve();
        }
        
        // Create loading promise
        const promise = new Promise((resolve, reject) => {
            // Create link element
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = fullUrl;
            
            // Add attributes
            if (options.attributes) {
                Object.entries(options.attributes).forEach(([key, value]) => {
                    link.setAttribute(key, value);
                });
            }
            
            // Set up timeout
            const timeoutId = setTimeout(() => {
                reject(new Error(`Style loading timeout: ${fullUrl}`));
                this.loadingPromises.delete(fullUrl);
            }, options.timeout || this.config.timeout);
            
            // Handle load and error events
            link.onload = () => {
                clearTimeout(timeoutId);
                this.loadedResources.add(fullUrl);
                this.loadingPromises.delete(fullUrl);
                resolve();
            };
            
            link.onerror = (error) => {
                clearTimeout(timeoutId);
                this.loadingPromises.delete(fullUrl);
                
                if (options.onError) {
                    options.onError(error, { type: 'style', url: fullUrl });
                } else if (this.config.onError) {
                    this.config.onError(error, { type: 'style', url: fullUrl });
                }
                
                reject(error);
            };
            
            // Add link to document
            document.head.appendChild(link);
        });
        
        // Store promise
        this.loadingPromises.set(fullUrl, promise);
        
        return promise;
    }
    
    /**
     * Preload an image
     * @param {string} url - Image URL
     * @param {Object} options - Loading options
     * @returns {Promise<HTMLImageElement>} Loading promise
     */
    preloadImage(url, options = {}) {
        const fullUrl = this._buildUrl(url, 'images', options);
        
        // Return existing promise if image is already loading
        if (this.loadingPromises.has(fullUrl)) {
            return this.loadingPromises.get(fullUrl);
        }
        
        // Check cache
        const cachedImage = LoaderCache.get(fullUrl);
        if (cachedImage) {
            return Promise.resolve(cachedImage);
        }
        
        // Create loading promise
        const promise = new Promise((resolve, reject) => {
            const image = new Image();
            
            // Set up timeout
            const timeoutId = setTimeout(() => {
                reject(new Error(`Image loading timeout: ${fullUrl}`));
                this.loadingPromises.delete(fullUrl);
            }, options.timeout || this.config.timeout);
            
            // Handle load and error events
            image.onload = () => {
                clearTimeout(timeoutId);
                this.loadedResources.add(fullUrl);
                this.loadingPromises.delete(fullUrl);
                LoaderCache.set(fullUrl, image);
                resolve(image);
            };
            
            image.onerror = (error) => {
                clearTimeout(timeoutId);
                this.loadingPromises.delete(fullUrl);
                
                if (options.onError) {
                    options.onError(error, { type: 'image', url: fullUrl });
                } else if (this.config.onError) {
                    this.config.onError(error, { type: 'image', url: fullUrl });
                }
                
                reject(error);
            };
            
            // Start loading
            image.src = fullUrl;
        });
        
        // Store promise
        this.loadingPromises.set(fullUrl, promise);
        
        return promise;
    }
    
    /**
     * Load multiple resources
     * @param {Array} resources - Array of resources to load
     * @returns {Promise<void>} Loading promise
     */
    loadResources(resources) {
        const promises = resources.map(resource => {
            if (typeof resource === 'string') {
                // Convert string to resource object
                if (resource.endsWith('.js')) {
                    return this.loadScript(resource);
                } else if (resource.endsWith('.css')) {
                    return this.loadStyle(resource);
                } else if (resource.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
                    return this.preloadImage(resource);
                } else {
                    return Promise.resolve();
                }
            } else {
                // Resource object with type
                if (resource.type === 'script') {
                    return this.loadScript(resource.url, resource.options);
                } else if (resource.type === 'style') {
                    return this.loadStyle(resource.url, resource.options);
                } else if (resource.type === 'image') {
                    return this.preloadImage(resource.url, resource.options);
                } else {
                    return Promise.resolve();
                }
            }
        });
        
        return Promise.all(promises);
    }
    
    /**
     * Execute callback when DOM is ready
     * @param {Function} callback - Function to call when ready
     */
    ready(callback) {
        if (this.isReady) {
            // Execute immediately if already ready
            callback();
        } else {
            // Store callback for later execution
            this.readyCallbacks.push(callback);
        }
    }
    
    /**
     * Execute all ready callbacks
     * @private
     */
    _executeReadyCallbacks() {
        this.readyCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Error in ready callback:', error);
            }
        });
        
        // Clear callbacks
        this.readyCallbacks = [];
    }
    
    /**
     * Build full URL for resource
     * @param {string} url - Resource URL
     * @param {string} type - Resource type
     * @param {Object} options - Options
     * @returns {string} Full URL
     * @private
     */
    _buildUrl(url, type, options) {
        // Return as is if absolute URL
        if (url.match(/^(https?:)?\/\//i)) {
            return url;
        }
        
        // Build URL with base and version
        let fullUrl = url;
        
        // Add base URL if defined
        if (this.config.baseUrls[type]) {
            fullUrl = this.config.baseUrls[type] + '/' + fullUrl;
        }
        
        // Add version if enabled
        if ((options.version !== false) && this.config.version) {
            const separator = fullUrl.includes('?') ? '&' : '?';
            fullUrl += `${separator}v=${this.config.version}`;
        }
        
        return fullUrl;
    }
}

// Create global loader instance
window.resourceLoader = new ResourceLoader();