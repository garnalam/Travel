/**
 * Youware Library - Local Implementation
 * Thay thế cho https://lib.youware.com/youware-lib.1747145198.js
 * Tối ưu hóa cho project Smart Travel Vietnam
 */

(function(window) {
    'use strict';

    // Youware Namespace
    window.Youware = window.Youware || {};

    // Global utilities
    Youware.Utils = {
        // DOM helpers
        getElementById: function(id) {
            return document.getElementById(id);
        },

        // Class manipulation
        addClass: function(element, className) {
            if (element && className) {
                element.classList.add(className);
            }
        },

        removeClass: function(element, className) {
            if (element && className) {
                element.classList.remove(className);
            }
        },

        // Event helpers
        addEventListener: function(element, event, callback) {
            if (element && event && callback) {
                element.addEventListener(event, callback);
            }
        },

        // AJAX helper
        ajax: function(options) {
            const defaults = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 10000
            };

            const config = Object.assign({}, defaults, options);

            return fetch(config.url, {
                method: config.method,
                headers: config.headers,
                body: config.data ? JSON.stringify(config.data) : undefined
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .catch(error => {
                console.error('Youware AJAX Error:', error);
                throw error;
            });
        },

        // Local storage helpers
        setItem: function(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
                console.warn('LocalStorage set failed:', e);
            }
        },

        getItem: function(key) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } catch (e) {
                console.warn('LocalStorage get failed:', e);
                return null;
            }
        },

        removeItem: function(key) {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.warn('LocalStorage remove failed:', e);
            }
        },

        // Animation helpers
        fadeIn: function(element, duration = 300) {
            if (!element) return;
            
            element.style.opacity = '0';
            element.style.display = 'block';
            
            let opacity = 0;
            const timer = setInterval(() => {
                opacity += 50 / duration;
                if (opacity >= 1) {
                    clearInterval(timer);
                    opacity = 1;
                }
                element.style.opacity = opacity;
            }, 50);
        },

        fadeOut: function(element, duration = 300) {
            if (!element) return;
            
            let opacity = 1;
            const timer = setInterval(() => {
                opacity -= 50 / duration;
                if (opacity <= 0) {
                    clearInterval(timer);
                    element.style.display = 'none';
                    opacity = 0;
                }
                element.style.opacity = opacity;
            }, 50);
        }
    };

    // Animation library
    Youware.Animate = {
        // Smooth scroll
        scrollTo: function(target, duration = 800) {
            const targetPosition = target.offsetTop;
            const startPosition = window.pageYOffset;
            const distance = targetPosition - startPosition;
            let startTime = null;

            function animation(currentTime) {
                if (startTime === null) startTime = currentTime;
                const timeElapsed = currentTime - startTime;
                const run = ease(timeElapsed, startPosition, distance, duration);
                window.scrollTo(0, run);
                if (timeElapsed < duration) requestAnimationFrame(animation);
            }

            function ease(t, b, c, d) {
                t /= d / 2;
                if (t < 1) return c / 2 * t * t + b;
                t--;
                return -c / 2 * (t * (t - 2) - 1) + b;
            }

            requestAnimationFrame(animation);
        },

        // Bounce effect
        bounce: function(element) {
            if (!element) return;
            
            element.style.transform = 'scale(1.1)';
            element.style.transition = 'transform 0.3s ease';
            
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 300);
        },

        // Pulse effect  
        pulse: function(element) {
            if (!element) return;
            
            let scale = 1;
            let growing = true;
            let pulseCount = 0;
            
            const pulseInterval = setInterval(() => {
                if (growing) {
                    scale += 0.05;
                    if (scale >= 1.2) {
                        growing = false;
                    }
                } else {
                    scale -= 0.05;
                    if (scale <= 1) {
                        growing = true;
                        pulseCount++;
                    }
                }
                
                element.style.transform = `scale(${scale})`;
                
                if (pulseCount >= 2) {
                    clearInterval(pulseInterval);
                    element.style.transform = 'scale(1)';
                }
            }, 50);
        }
    };

    // Notification system
    Youware.Notification = {
        show: function(message, type = 'info', duration = 3000) {
            const notification = document.createElement('div');
            notification.className = `youware-notification youware-${type}`;
            notification.innerHTML = `
                <div class="youware-notification-content">
                    <span class="youware-notification-message">${message}</span>
                    <button class="youware-notification-close">&times;</button>
                </div>
            `;

            // Add styles
            this.addNotificationStyles();

            // Add to DOM
            document.body.appendChild(notification);

            // Show animation
            setTimeout(() => {
                notification.classList.add('youware-show');
            }, 10);

            // Auto remove
            const autoRemove = setTimeout(() => {
                this.remove(notification);
            }, duration);

            // Manual close
            const closeBtn = notification.querySelector('.youware-notification-close');
            closeBtn.addEventListener('click', () => {
                clearTimeout(autoRemove);
                this.remove(notification);
            });
        },

        remove: function(notification) {
            notification.classList.remove('youware-show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        },

        addNotificationStyles: function() {
            if (document.getElementById('youware-notification-styles')) return;

            const styles = document.createElement('style');
            styles.id = 'youware-notification-styles';
            styles.textContent = `
                .youware-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    max-width: 400px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 9999;
                    transform: translateX(100%);
                    transition: transform 0.3s ease;
                }
                .youware-notification.youware-show {
                    transform: translateX(0);
                }
                .youware-notification-content {
                    padding: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .youware-notification.youware-success {
                    border-left: 4px solid #10b981;
                }
                .youware-notification.youware-error {
                    border-left: 4px solid #ef4444;
                }
                .youware-notification.youware-warning {
                    border-left: 4px solid #f59e0b;
                }
                .youware-notification.youware-info {
                    border-left: 4px solid #3b82f6;
                }
                .youware-notification-close {
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    margin-left: 12px;
                    color: #6b7280;
                }
                .youware-notification-close:hover {
                    color: #374151;
                }
            `;
            document.head.appendChild(styles);
        }
    };

    // Loading system
    Youware.Loading = {
        show: function(message = 'Loading...') {
            const loader = document.createElement('div');
            loader.id = 'youware-loader';
            loader.innerHTML = `
                <div class="youware-loader-overlay">
                    <div class="youware-loader-content">
                        <div class="youware-spinner"></div>
                        <div class="youware-loader-message">${message}</div>
                    </div>
                </div>
            `;

            this.addLoaderStyles();
            document.body.appendChild(loader);
            
            setTimeout(() => {
                loader.classList.add('youware-show');
            }, 10);
        },

        hide: function() {
            const loader = document.getElementById('youware-loader');
            if (loader) {
                loader.classList.remove('youware-show');
                setTimeout(() => {
                    if (loader.parentNode) {
                        loader.parentNode.removeChild(loader);
                    }
                }, 300);
            }
        },

        addLoaderStyles: function() {
            if (document.getElementById('youware-loader-styles')) return;

            const styles = document.createElement('style');
            styles.id = 'youware-loader-styles';
            styles.textContent = `
                #youware-loader {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 10000;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                #youware-loader.youware-show {
                    opacity: 1;
                }
                .youware-loader-overlay {
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .youware-loader-content {
                    background: white;
                    padding: 30px;
                    border-radius: 8px;
                    text-align: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                .youware-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f4f6;
                    border-top: 4px solid #3b82f6;
                    border-radius: 50%;
                    animation: youware-spin 1s linear infinite;
                    margin: 0 auto 15px;
                }
                .youware-loader-message {
                    color: #374151;
                    font-size: 16px;
                }
                @keyframes youware-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(styles);
        }
    };

    // Initialize library
    Youware.init = function() {
        console.log('Youware Library initialized');
        
        // Auto-hide loading on page load
        window.addEventListener('load', function() {
            Youware.Loading.hide();
        });
    };

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', Youware.init);
    } else {
        Youware.init();
    }

})(window);