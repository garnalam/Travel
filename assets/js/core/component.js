/**
 * Component System
 * Hệ thống component nhẹ cho ứng dụng Vietnam Travel
 */

// Component Template Cache
const TemplateCache = {
    cache: new Map(),
    
    // Get template from cache
    get(id) {
        return this.cache.get(id);
    },
    
    // Set template in cache
    set(id, template) {
        this.cache.set(id, template);
    },
    
    // Check if template exists in cache
    has(id) {
        return this.cache.has(id);
    },
    
    // Clear cache
    clear(id) {
        if (id) {
            this.cache.delete(id);
        } else {
            this.cache.clear();
        }
    }
};

// DOM Utilities
const DOMUtils = {
    // Create element from HTML string
    createFromHTML(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html.trim();
        return temp.firstChild;
    },
    
    // Render template with data
    renderTemplate(template, data) {
        // Simple template rendering
        return template.replace(/\\{\\{([^}]+)\\}\\}/g, (match, key) => {
            const keys = key.trim().split('.');
            let value = data;
            
            for (const k of keys) {
                value = value[k];
                if (value === undefined || value === null) {
                    return '';
                }
            }
            
            return value;
        });
    },
    
    // Create document fragment from elements
    createFragment(elements) {
        const fragment = document.createDocumentFragment();
        elements.forEach(element => fragment.appendChild(element));
        return fragment;
    }
};

// Component Class
class Component {
    constructor(options = {}) {
        this.id = options.id || `component-${Math.random().toString(36).substr(2, 9)}`;
        this.template = options.template || '';
        this.data = options.data || {};
        this.methods = options.methods || {};
        this.hooks = options.hooks || {};
        this.events = options.events || {};
        this.children = options.children || {};
        
        // Element references
        this.element = null;
        this.refs = {};
        
        // Store bound methods to avoid rebinding
        this._boundMethods = {};
        
        // Cache component template
        if (options.template && !TemplateCache.has(this.id)) {
            TemplateCache.set(this.id, options.template);
        }
        
        // Bind methods
        Object.keys(this.methods).forEach(methodName => {
            this._boundMethods[methodName] = this.methods[methodName].bind(this);
        });
    }
    
    /**
     * Render component to element
     * @param {string|HTMLElement} selector - CSS selector or element
     * @returns {Component} Component instance
     */
    mount(selector) {
        // Get parent element
        const parent = typeof selector === 'string'
            ? document.querySelector(selector)
            : selector;
        
        if (!parent) {
            console.error(`Mount failed: Element not found for selector "${selector}"`);
            return this;
        }
        
        // Call beforeMount hook
        if (this.hooks.beforeMount) {
            this.hooks.beforeMount.call(this);
        }
        
        // Render component
        this.element = this._render();
        
        // Clear parent and append component
        parent.innerHTML = '';
        parent.appendChild(this.element);
        
        // Store element references
        this._storeRefs();
        
        // Set up event listeners
        this._setupEvents();
        
        // Mount children
        this._mountChildren();
        
        // Call mounted hook
        if (this.hooks.mounted) {
            this.hooks.mounted.call(this);
        }
        
        return this;
    }
    
    /**
     * Update component with new data
     * @param {Object} data - New data to merge
     * @returns {Component} Component instance
     */
    update(data = {}) {
        // Call beforeUpdate hook
        if (this.hooks.beforeUpdate) {
            this.hooks.beforeUpdate.call(this, data);
        }
        
        // Merge data
        Object.assign(this.data, data);
        
        if (!this.element) {
            console.warn('Update failed: Component not mounted');
            return this;
        }
        
        // Re-render component
        const newElement = this._render();
        
        // Replace element
        this.element.parentNode.replaceChild(newElement, this.element);
        this.element = newElement;
        
        // Store refs
        this._storeRefs();
        
        // Set up event listeners
        this._setupEvents();
        
        // Mount children
        this._mountChildren();
        
        // Call updated hook
        if (this.hooks.updated) {
            this.hooks.updated.call(this, data);
        }
        
        return this;
    }
    
    /**
     * Remove component from DOM
     * @returns {Component} Component instance
     */
    unmount() {
        if (!this.element) {
            return this;
        }
        
        // Call beforeUnmount hook
        if (this.hooks.beforeUnmount) {
            this.hooks.beforeUnmount.call(this);
        }
        
        // Remove event listeners
        this._removeEvents();
        
        // Remove element
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        // Clear references
        this.element = null;
        this.refs = {};
        
        // Call unmounted hook
        if (this.hooks.unmounted) {
            this.hooks.unmounted.call(this);
        }
        
        return this;
    }
    
    /**
     * Find elements inside component
     * @param {string} selector - CSS selector
     * @returns {HTMLElement|null} Found element
     */
    find(selector) {
        return this.element ? this.element.querySelector(selector) : null;
    }
    
    /**
     * Find all elements inside component
     * @param {string} selector - CSS selector
     * @returns {NodeList} Found elements
     */
    findAll(selector) {
        return this.element ? this.element.querySelectorAll(selector) : [];
    }
    
    /**
     * Set event listener
     * @param {string} eventName - Event name
     * @param {string} selector - Element selector
     * @param {Function} handler - Event handler
     */
    on(eventName, selector, handler) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        
        this.events[eventName].push({ selector, handler });
        
        // Set up event if component is mounted
        if (this.element) {
            this._setupEvent(eventName, selector, handler);
        }
        
        return this;
    }
    
    /**
     * Remove event listener
     * @param {string} eventName - Event name
     * @param {string} selector - Element selector
     */
    off(eventName, selector) {
        if (!this.events[eventName]) {
            return this;
        }
        
        // Filter out events with matching selector
        this.events[eventName] = this.events[eventName].filter(event => {
            if (event.selector === selector) {
                // Remove event listener if component is mounted
                if (this.element) {
                    const elements = selector ? this.findAll(selector) : [this.element];
                    elements.forEach(element => {
                        element.removeEventListener(eventName, event.handler);
                    });
                }
                return false;
            }
            return true;
        });
        
        return this;
    }
    
    /**
     * Render template with data
     * @returns {HTMLElement} Rendered element
     * @private
     */
    _render() {
        // Get template from cache or component
        let template = TemplateCache.get(this.id) || this.template;
        
        // Apply data to template
        const html = DOMUtils.renderTemplate(template, this.data);
        
        // Create element from HTML
        return DOMUtils.createFromHTML(html);
    }
    
    /**
     * Store references to elements with data-ref attribute
     * @private
     */
    _storeRefs() {
        if (!this.element) return;
        
        // Clear existing refs
        this.refs = {};
        
        // Find elements with data-ref attribute
        const refElements = this.element.querySelectorAll('[data-ref]');
        
        refElements.forEach(element => {
            const ref = element.getAttribute('data-ref');
            this.refs[ref] = element;
        });
    }
    
    /**
     * Set up event listeners
     * @private
     */
    _setupEvents() {
        if (!this.element) return;
        
        // Set up events
        Object.keys(this.events).forEach(eventName => {
            this.events[eventName].forEach(event => {
                this._setupEvent(eventName, event.selector, event.handler);
            });
        });
    }
    
    /**
     * Set up single event listener
     * @param {string} eventName - Event name
     * @param {string} selector - Element selector
     * @param {Function} handler - Event handler
     * @private
     */
    _setupEvent(eventName, selector, handler) {
        const elements = selector ? this.findAll(selector) : [this.element];
        
        elements.forEach(element => {
            // Bind handler to component
            const boundHandler = typeof handler === 'string'
                ? this._boundMethods[handler] || (() => console.warn(`Method "${handler}" not found`))
                : handler.bind(this);
            
            element.addEventListener(eventName, boundHandler);
        });
    }
    
    /**
     * Remove all event listeners
     * @private
     */
    _removeEvents() {
        if (!this.element) return;
        
        // Remove events
        Object.keys(this.events).forEach(eventName => {
            this.events[eventName].forEach(event => {
                const elements = event.selector ? this.findAll(event.selector) : [this.element];
                
                elements.forEach(element => {
                    const boundHandler = typeof event.handler === 'string'
                        ? this._boundMethods[event.handler]
                        : event.handler.bind(this);
                    
                    element.removeEventListener(eventName, boundHandler);
                });
            });
        });
    }
    
    /**
     * Mount child components
     * @private
     */
    _mountChildren() {
        Object.keys(this.children).forEach(selector => {
            const child = this.children[selector];
            
            // Find container element
            const container = this.find(selector);
            if (container) {
                // Mount child component
                child.mount(container);
            }
        });
    }
}

// Export to global scope
window.Component = Component;
window.TemplateCache = TemplateCache;