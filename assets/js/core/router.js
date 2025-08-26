/**
 * Router System
 * Hệ thống điều hướng client-side cho ứng dụng Vietnam Travel
 */

// Router Configuration
const RouterConfig = {
    baseUrl: '',
    container: '#app-content',
    defaultRoute: '/',
    errorTemplate: (error) => `
        <div class="error-container p-8 text-center">
            <div class="error-icon text-6xl text-red-500 mb-4">
                <i class="fas fa-exclamation-circle"></i>
            </div>
            <h2 class="text-2xl font-bold mb-4" data-en="Page Error" data-vi="Lỗi Trang">Page Error</h2>
            <p class="text-gray-700 mb-4">${error}</p>
            <a href="#/" class="btn-primary" data-en="Back to Home" data-vi="Quay về Trang chủ">Back to Home</a>
        </div>
    `,
    loadingTemplate: `
        <div class="loading-container p-8 text-center">
            <div class="loading-spinner mx-auto mb-4"></div>
            <p class="text-gray-700" data-en="Loading page content..." data-vi="Đang tải nội dung trang...">Loading page content...</p>
        </div>
    `,
    // Scroll to top after navigation
    scrollToTop: true,
    
    // Animation settings
    animation: {
        enabled: true,
        duration: 300, // ms
        outClass: 'page-exit',
        inClass: 'page-enter'
    },
    
    // Page transition hooks
    hooks: {
        beforeNavigation: null, // (from, to) => boolean
        afterNavigation: null   // (route) => void
    }
};

// Route definitions
const routes = [];

// Router Class
class Router {
    constructor(config = {}) {
        this.config = { ...RouterConfig, ...config };
        this.currentRoute = null;
        this.container = null;
    }
    
    /**
     * Initialize the router
     */
    init() {
        this.container = document.querySelector(this.config.container);
        
        if (!this.container) {
            console.error(`Router container not found: ${this.config.container}`);
            return;
        }
        
        // Add necessary styles
        this._addStyles();
        
        // Handle initial navigation and listen for changes
        window.addEventListener('popstate', (e) => this._handleNavigation(window.location.pathname));
        
        // Delegate click event to handle all link clicks
        document.addEventListener('click', (e) => {
            // Find closest anchor tag
            const link = e.target.closest('a');
            if (!link) return;
            
            // Check if link should be handled by router
            const href = link.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('//') || link.hasAttribute('target')) {
                return; // External link or hash link
            }
            
            // Prevent default behavior
            e.preventDefault();
            
            // Navigate to link
            this.navigate(href);
        });
        
        // Initial navigation
        this._handleNavigation(window.location.pathname);
    }
    
    /**
     * Define a route
     * @param {string} path - Route path (supports parameters like /user/:id)
     * @param {Function|Object} handler - Route handler function or configuration object
     */
    route(path, handler) {
        if (typeof handler === 'function') {
            handler = { render: handler };
        }
        
        routes.push({
            path,
            handler,
            regex: this._pathToRegex(path),
            params: this._extractPathParams(path)
        });
    }
    
    /**
     * Navigate to specific path
     * @param {string} path - Path to navigate to
     * @param {Object} options - Navigation options
     */
    navigate(path, options = {}) {
        const fullPath = this.config.baseUrl + path;
        
        // Check if navigation is to the same page
        if (fullPath === window.location.pathname && !options.force) {
            return;
        }
        
        // Update browser history
        if (options.replace) {
            window.history.replaceState({}, '', fullPath);
        } else {
            window.history.pushState({}, '', fullPath);
        }
        
        // Handle the navigation
        this._handleNavigation(fullPath);
    }
    
    /**
     * Reload the current page
     */
    reload() {
        this._handleNavigation(window.location.pathname, { force: true });
    }
    
    /**
     * Handle navigation to path
     * @param {string} path - Path to navigate to
     * @param {Object} options - Navigation options
     * @private
     */
    async _handleNavigation(path, options = {}) {
        if (path.startsWith(this.config.baseUrl)) {
            path = path.slice(this.config.baseUrl.length);
        }
        
        if (path === '') path = '/';
        
        const fromRoute = this.currentRoute;
        let matchedRoute = null;
        
        // Find matching route
        for (const route of routes) {
            const match = path.match(route.regex);
            if (match) {
                // Extract params from path
                const params = {};
                if (route.params.length > 0) {
                    route.params.forEach((param, i) => {
                        params[param] = match[i + 1];
                    });
                }
                
                matchedRoute = {
                    ...route,
                    params,
                    query: this._parseQueryString(window.location.search)
                };
                break;
            }
        }
        
        // Use default route if no match found
        if (!matchedRoute) {
            if (this.config.notFoundPath) {
                return this.navigate(this.config.notFoundPath);
            } else {
                matchedRoute = {
                    handler: {
                        render: () => `
                            <div class="not-found p-8 text-center">
                                <h1 class="text-4xl font-bold mb-4" data-en="404 - Page Not Found" data-vi="404 - Trang Không Tìm Thấy">404 - Page Not Found</h1>
                                <p class="text-gray-700 mb-6" data-en="The page you are looking for does not exist or has been moved." data-vi="Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.">
                                    The page you are looking for does not exist or has been moved.
                                </p>
                                <a href="#/" class="btn-primary" data-en="Back to Home" data-vi="Quay về Trang chủ">Back to Home</a>
                            </div>
                        `
                    },
                    params: {},
                    query: this._parseQueryString(window.location.search)
                };
            }
        }
        
        // Execute beforeNavigation hook if defined
        if (this.config.hooks.beforeNavigation) {
            const shouldContinue = await this.config.hooks.beforeNavigation(fromRoute, matchedRoute);
            if (shouldContinue === false) {
                return;
            }
        }
        
        // Show loading state
        if (matchedRoute.handler.loading !== false) {
            this._showLoading();
        }
        
        try {
            // Render the route content
            const content = await this._renderRoute(matchedRoute);
            
            // Update current route
            this.currentRoute = matchedRoute;
            
            // Update page content with animation if enabled
            if (this.config.animation.enabled && fromRoute) {
                await this._animatePageTransition(content);
            } else {
                this.container.innerHTML = content;
            }
            
            // Execute afterRender handler if defined
            if (typeof matchedRoute.handler.afterRender === 'function') {
                matchedRoute.handler.afterRender(this.container, matchedRoute.params, matchedRoute.query);
            }
            
            // Scroll to top if enabled
            if (this.config.scrollToTop) {
                window.scrollTo(0, 0);
            }
            
            // Execute afterNavigation hook if defined
            if (this.config.hooks.afterNavigation) {
                this.config.hooks.afterNavigation(matchedRoute);
            }
            
            // Update language display
            if (typeof updateLanguageDisplay === 'function') {
                updateLanguageDisplay();
            }
            
            // Update app state if using state management
            if (window.appState) {
                window.appState.set('app.currentPage', path);
            }
        } catch (error) {
            console.error('Navigation error:', error);
            this.container.innerHTML = this.config.errorTemplate(error.message);
            
            // Update language display
            if (typeof updateLanguageDisplay === 'function') {
                updateLanguageDisplay();
            }
        }
    }
    
    /**
     * Render route content
     * @param {Object} route - Route object
     * @returns {Promise<string>} Rendered HTML
     * @private
     */
    async _renderRoute(route) {
        const { handler, params, query } = route;
        
        try {
            // Different ways to render content
            if (typeof handler.render === 'function') {
                // Function renderer
                const content = handler.render(params, query);
                
                // Handle promises
                if (content instanceof Promise) {
                    return await content;
                }
                
                return content;
            } else if (handler.template) {
                // Static template
                return handler.template;
            } else if (handler.component) {
                // Component renderer (for use with state management)
                const component = handler.component;
                
                if (typeof component.render === 'function') {
                    // Mount component to temporary container
                    const tempContainer = document.createElement('div');
                    
                    // Wait for component to render
                    const unmount = component.mount(tempContainer);
                    
                    // Return component HTML
                    return tempContainer.innerHTML;
                }
            } else if (handler.url) {
                // Load from URL (AJAX)
                if (!window.Ajax) {
                    throw new Error('Ajax module not loaded');
                }
                
                // Build URL with params
                let url = handler.url;
                Object.keys(params).forEach(key => {
                    url = url.replace(`:${key}`, params[key]);
                });
                
                // Load HTML from URL
                return await window.Ajax.get(url, { 
                    headers: { 'Accept': 'text/html' },
                    noCache: handler.noCache
                });
            }
            
            // Default to empty string if no renderer found
            return '';
        } catch (error) {
            console.error('Error rendering route:', error);
            throw error;
        }
    }
    
    /**
     * Show loading template
     * @private
     */
    _showLoading() {
        this.container.innerHTML = this.config.loadingTemplate;
        
        // Update language display
        if (typeof updateLanguageDisplay === 'function') {
            updateLanguageDisplay();
        }
    }
    
    /**
     * Animate page transition
     * @param {string} newContent - New page content
     * @returns {Promise<void>} Promise that resolves when animation is complete
     * @private
     */
    async _animatePageTransition(newContent) {
        return new Promise(resolve => {
            // Create temporary container for new content
            const newPage = document.createElement('div');
            newPage.innerHTML = newContent;
            newPage.className = this.config.animation.inClass;
            newPage.style.opacity = '0';
            
            // Add transition class to current content
            this.container.className = this.config.animation.outClass;
            
            // Animate old content out
            setTimeout(() => {
                this.container.style.opacity = '0';
                
                // Replace content after old content fades out
                setTimeout(() => {
                    this.container.innerHTML = newContent;
                    this.container.className = '';
                    this.container.style.opacity = '1';
                    
                    resolve();
                }, this.config.animation.duration);
            }, 10);
        });
    }
    
    /**
     * Add required styles for animations
     * @private
     */
    _addStyles() {
        if (!document.getElementById('router-styles')) {
            const style = document.createElement('style');
            style.id = 'router-styles';
            style.textContent = `
                .page-exit {
                    opacity: 1;
                    transition: opacity ${this.config.animation.duration}ms ease-out;
                }
                
                .page-enter {
                    opacity: 0;
                    transition: opacity ${this.config.animation.duration}ms ease-in;
                }
                
                /* Loading spinner */
                .loading-spinner {
                    border: 3px solid rgba(0, 0, 0, 0.1);
                    border-top: 3px solid #3498db;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    /**
     * Convert path to regex for matching
     * @param {string} path - Route path
     * @returns {RegExp} Path regex
     * @private
     */
    _pathToRegex(path) {
        // Escape special characters except for path parameters
        return new RegExp('^' + path
            .replace(/\//g, '\\/')
            .replace(/:\w+/g, '([^/]+)')
            + '$');
    }
    
    /**
     * Extract parameter names from path
     * @param {string} path - Route path
     * @returns {Array<string>} Parameter names
     * @private
     */
    _extractPathParams(path) {
        const paramNames = [];
        const paramRegex = /:(\w+)/g;
        let match;
        
        while ((match = paramRegex.exec(path)) !== null) {
            paramNames.push(match[1]);
        }
        
        return paramNames;
    }
    
    /**
     * Parse query string into object
     * @param {string} queryString - Query string
     * @returns {Object} Query parameters
     * @private
     */
    _parseQueryString(queryString) {
        const query = {};
        
        if (!queryString || queryString === '?') {
            return query;
        }
        
        const search = queryString.substring(1);
        const pairs = search.split('&');
        
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i].split('=');
            query[decodeURIComponent(pair[0])] = pair[1] ? decodeURIComponent(pair[1]) : '';
        }
        
        return query;
    }
}

// Create global router instance
window.router = new Router();

// Define convenient helper function
window.route = function(path, handler) {
    window.router.route(path, handler);
};