/**
 * State Management System
 * Hệ thống quản lý trạng thái tập trung cho ứng dụng Vietnam Travel
 */

// State Store Class
class StateStore {
    constructor(initialState = {}) {
        this.state = { ...initialState };
        this.listeners = new Map(); // Map of component ID to callback functions
        this.components = new Map(); // Map of component ID to component info
    }
    
    /**
     * Get current state or specific path in state
     * @param {string} path - Optional dot notation path to specific state property
     * @returns {any} State or state property
     */
    get(path) {
        if (!path) return { ...this.state }; // Return clone of entire state
        
        return this._getNestedProperty(this.state, path);
    }
    
    /**
     * Update state with new values
     * @param {Object|string} pathOrState - Either path string or state object
     * @param {any} value - Value (if path provided)
     * @returns {Object} New state
     */
    set(pathOrState, value) {
        let newState;
        
        if (typeof pathOrState === 'string') {
            // Update specific path
            newState = { ...this.state };
            this._setNestedProperty(newState, pathOrState, value);
        } else {
            // Merge objects
            newState = { 
                ...this.state, 
                ...pathOrState 
            };
        }
        
        // Update state and notify listeners
        this.state = newState;
        this._notifyListeners();
        
        return { ...this.state };
    }
    
    /**
     * Register component with store
     * @param {string} componentId - Unique ID for component
     * @param {Function} updateFn - Function to call when state changes
     * @param {Array<string>} watchPaths - List of state paths to watch
     * @returns {Function} Unsubscribe function
     */
    connect(componentId, updateFn, watchPaths = []) {
        if (this.listeners.has(componentId)) {
            console.warn(`Component ${componentId} already connected to store. Replacing listener.`);
        }
        
        this.listeners.set(componentId, updateFn);
        this.components.set(componentId, { watchPaths });
        
        // Return unsubscribe function
        return () => {
            this.listeners.delete(componentId);
            this.components.delete(componentId);
        };
    }
    
    /**
     * Manually trigger update for specific component
     * @param {string} componentId - Component ID to update
     */
    triggerUpdate(componentId) {
        if (this.listeners.has(componentId)) {
            const listener = this.listeners.get(componentId);
            const component = this.components.get(componentId);
            
            if (component.watchPaths && component.watchPaths.length > 0) {
                // Get all watched paths
                const watchedState = {};
                component.watchPaths.forEach(path => {
                    watchedState[path] = this._getNestedProperty(this.state, path);
                });
                listener(watchedState);
            } else {
                // Pass entire state
                listener({ ...this.state });
            }
        }
    }
    
    /**
     * Reset state to initial values
     * @param {Object} initialState - New initial state (optional)
     */
    reset(initialState = {}) {
        this.state = { ...initialState };
        this._notifyListeners();
    }
    
    /**
     * Merge new state with existing state
     * @param {Object} partialState - Partial state to merge
     * @returns {Object} New state
     */
    merge(partialState) {
        return this.set(partialState);
    }
    
    /**
     * Notify all listeners of state change
     * @private
     */
    _notifyListeners() {
        this.listeners.forEach((updateFn, componentId) => {
            const component = this.components.get(componentId);
            
            if (component.watchPaths && component.watchPaths.length > 0) {
                // Check if any watched paths changed
                const watchedState = {};
                let hasChanged = false;
                
                component.watchPaths.forEach(path => {
                    const value = this._getNestedProperty(this.state, path);
                    watchedState[path] = value;
                    
                    // Track changes
                    if (!component.prevState || component.prevState[path] !== value) {
                        hasChanged = true;
                    }
                });
                
                // Only update if watched paths changed
                if (hasChanged) {
                    component.prevState = { ...watchedState };
                    updateFn(watchedState);
                }
            } else {
                // No specific paths to watch, always update
                updateFn({ ...this.state });
            }
        });
    }
    
    /**
     * Get nested property from object using dot notation
     * @param {Object} obj - Object to get property from
     * @param {string} path - Dot notation path
     * @returns {any} Property value
     * @private
     */
    _getNestedProperty(obj, path) {
        return path.split('.').reduce((prev, curr) => {
            return prev !== undefined ? prev[curr] : undefined;
        }, obj);
    }
    
    /**
     * Set nested property on object using dot notation
     * @param {Object} obj - Object to set property on
     * @param {string} path - Dot notation path
     * @param {any} value - Value to set
     * @private
     */
    _setNestedProperty(obj, path, value) {
        const parts = path.split('.');
        const lastKey = parts.pop();
        const lastObj = parts.reduce((prev, curr) => {
            if (prev[curr] === undefined) {
                prev[curr] = {};
            }
            return prev[curr];
        }, obj);
        
        lastObj[lastKey] = value;
    }
}

// Create global state instance
window.appState = new StateStore({
    // User preferences
    user: {
        preferences: getUserPreferences ? getUserPreferences() : {
            language: 'en',
            currency: 'USD',
            theme: 'sunset'
        },
        isLoggedIn: false,
        profile: null
    },
    
    // App state
    app: {
        isLoading: false,
        currentPage: window.location.pathname,
        activeTab: 'travel',
        notifications: []
    },
    
    // Search state
    search: {
        filters: {},
        results: [],
        pagination: {
            page: 1,
            perPage: 10,
            total: 0
        },
        lastQuery: ''
    },
    
    // Hotel state
    hotels: {
        list: [],
        selected: null,
        filters: {}
    },
    
    // Restaurant state
    restaurants: {
        list: [],
        selected: null,
        filters: {}
    },
    
    // Tour state
    tours: {
        history: [],
        active: null,
        recommendations: []
    }
});

/**
 * Create a component connected to the state store
 * 
 * @param {string} id - Component ID
 * @param {Function} renderFn - Function to render component
 * @param {Array<string>} watchPaths - State paths to watch
 * @returns {Object} Component methods
 */
function createComponent(id, renderFn, watchPaths = []) {
    if (!id || !renderFn) {
        throw new Error('Component ID and render function are required');
    }
    
    // Mount component to DOM
    function mount(selector) {
        const container = document.querySelector(selector);
        if (!container) {
            console.error(`Container not found: ${selector}`);
            return;
        }
        
        // Create update function
        const update = (state) => {
            const content = renderFn(state);
            
            if (typeof content === 'string') {
                container.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                container.innerHTML = '';
                container.appendChild(content);
            }
            
            // Initialize any functionality after render
            if (typeof component.afterRender === 'function') {
                component.afterRender(container);
            }
        };
        
        // Connect to store
        const disconnect = window.appState.connect(id, update, watchPaths);
        
        // Trigger initial render
        window.appState.triggerUpdate(id);
        
        // Return unmount function
        return () => {
            disconnect();
            container.innerHTML = '';
        };
    }
    
    // Create component object
    const component = {
        id,
        mount,
        render: () => window.appState.triggerUpdate(id),
        afterRender: null // Optional function to run after rendering
    };
    
    return component;
}

// Export to global scope
window.StateStore = StateStore;
window.createComponent = createComponent;