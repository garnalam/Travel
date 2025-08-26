/**
 * Hotel Search Module with AJAX
 * Tối ưu hóa chức năng tìm kiếm khách sạn với AJAX
 */

// Hotel Search Component
class HotelSearch {
    constructor(options = {}) {
        // Component elements
        this.formElement = document.getElementById('hotelSearchForm');
        this.searchInput = document.getElementById('hotelSearchInput');
        this.resultsContainer = document.getElementById('hotelSearchResults');
        this.loaderElement = document.getElementById('hotelSearchLoader');
        
        // Search state
        this.searchParams = {};
        this.currentPage = 1;
        this.totalResults = 0;
        this.resultsPerPage = 10;
        this.isLoading = false;
        this.lastSearchQuery = '';
        
        // Cache for search results
        this.resultsCache = new Map();
        
        // Debounced search function
        this.debouncedSearch = Utils.debounce(() => this.performSearch(), 300);
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize hotel search
     */
    init() {
        if (!this.formElement) {
            console.error('Hotel search form not found');
            return;
        }
        
        // Initialize form events
        this.formElement.addEventListener('submit', (e) => {
            e.preventDefault();
            this.performSearch();
        });
        
        // Initialize input events
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => {
                this.debouncedSearch();
            });
        }
        
        // Initialize autocomplete
        this.initAutocomplete();
        
        console.log('🏨 Hotel search initialized');
    }
    
    /**
     * Initialize autocomplete functionality
     */
    initAutocomplete() {
        if (!this.searchInput) return;
        
        const dropdownId = 'hotelAutocompleteDropdown';
        
        // Create autocomplete dropdown if doesn't exist
        let dropdown = document.getElementById(dropdownId);
        
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = dropdownId;
            dropdown.className = 'autocomplete-dropdown hidden';
            this.searchInput.parentNode.appendChild(dropdown);
        }
        
        // Throttled autocomplete function
        const throttledAutocomplete = Utils.throttle((query) => {
            if (query.length < 2) {
                dropdown.classList.add('hidden');
                return;
            }
            
            // Show loading in dropdown
            dropdown.innerHTML = '<div class="p-2 text-gray-500">Loading...</div>';
            dropdown.classList.remove('hidden');
            
            // Fetch suggestions
            window.api.get(`hotels/autocomplete?query=${encodeURIComponent(query)}`)
                .then(data => {
                    if (!data || data.length === 0) {
                        dropdown.innerHTML = '<div class="p-2 text-gray-500">No results found</div>';
                        return;
                    }
                    
                    // Render suggestions
                    dropdown.innerHTML = '';
                    
                    data.forEach(item => {
                        const div = document.createElement('div');
                        div.className = 'autocomplete-item';
                        
                        if (item.type === 'hotel') {
                            div.innerHTML = `
                                <div class="hotel-name">${this._highlightMatch(item.name, query)}</div>
                                <div class="hotel-location">${item.city}, ${item.country}</div>
                                <div class="hotel-meta">
                                    <div class="hotel-rating">
                                        <i class="fas fa-star mr-1"></i>
                                        <span>${item.rating}</span>
                                        <span class="ml-2">${'⭐'.repeat(item.stars)}</span>
                                    </div>
                                    <div class="hotel-price">
                                        ${this._formatPrice(item.price_per_night)}/night
                                    </div>
                                </div>
                            `;
                        } else if (item.type === 'city') {
                            div.innerHTML = `
                                <div class="city-name">
                                    <i class="fas fa-map-marker-alt mr-2"></i>
                                    ${this._highlightMatch(item.city, query)}, ${item.country}
                                </div>
                                <div class="city-info">${item.hotel_count} hotels</div>
                            `;
                        }
                        
                        // Click handler
                        div.addEventListener('click', () => {
                            this.searchInput.value = item.name || item.city;
                            dropdown.classList.add('hidden');
                            this.performSearch();
                        });
                        
                        dropdown.appendChild(div);
                    });
                })
                .catch(error => {
                    dropdown.innerHTML = '<div class="p-2 text-red-500">Error loading suggestions</div>';
                    console.error('Autocomplete error:', error);
                });
        }, 300);
        
        // Bind input events
        this.searchInput.addEventListener('input', () => {
            const query = this.searchInput.value.trim();
            throttledAutocomplete(query);
        });
        
        // Hide dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.searchInput.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });
        
        // Show dropdown when input is focused
        this.searchInput.addEventListener('focus', () => {
            const query = this.searchInput.value.trim();
            if (query.length >= 2) {
                dropdown.classList.remove('hidden');
            }
        });
    }
    
    /**
     * Perform hotel search
     * @param {boolean} resetPage - Reset to first page
     */
    async performSearch(resetPage = true) {
        // Build search parameters
        const formData = new FormData(this.formElement);
        const searchQuery = this.searchInput ? this.searchInput.value.trim() : '';
        
        const params = {
            country: formData.get('country') || '',
            city: formData.get('city') || '',
            checkin: formData.get('checkin') || '',
            checkout: formData.get('checkout') || '',
            searchQuery: searchQuery,
            searchType: 'flexible_search',
            page: resetPage ? 1 : this.currentPage
        };
        
        // Don't search if required fields are missing
        const hasCheckin = params.checkin && params.checkin !== '';
        const hasCheckout = params.checkout && params.checkout !== '';
        
        if (!hasCheckin || !hasCheckout) {
            // Show validation message
            showNotification(
                currentLanguage === 'vi' ? 
                    'Vui lòng chọn ngày check-in và check-out' : 
                    'Please select check-in and check-out dates',
                'warning'
            );
            return;
        }
        
        // Cache key
        const cacheKey = JSON.stringify(params);
        
        // Check cache
        if (this.resultsCache.has(cacheKey)) {
            console.log('Using cached search results');
            this._renderResults(this.resultsCache.get(cacheKey));
            return;
        }
        
        // Show loader
        this._showLoader();
        
        try {
            // Set loading state
            this.isLoading = true;
            this.searchParams = params;
            
            if (resetPage) {
                this.currentPage = 1;
            }
            
            // Perform search
            const response = await window.api.post('hotels/search', params);
            
            // Cache results
            this.resultsCache.set(cacheKey, response);
            
            // Update state
            this.lastSearchQuery = searchQuery;
            this.totalResults = response.total || response.hotels.length;
            
            // Render results
            this._renderResults(response);
        } catch (error) {
            console.error('Search error:', error);
            
            // Show error message
            this._renderError(error.message);
        } finally {
            // Hide loader
            this._hideLoader();
            this.isLoading = false;
        }
    }
    
    /**
     * Load more results
     */
    loadMore() {
        if (this.isLoading) return;
        
        this.currentPage++;
        this.performSearch(false);
    }
    
    /**
     * Render search results
     * @param {Object} response - Search response
     */
    _renderResults(response) {
        if (!this.resultsContainer) return;
        
        // Clear results if first page
        if (this.currentPage === 1) {
            this.resultsContainer.innerHTML = '';
        }
        
        const hotels = response.hotels || [];
        
        if (hotels.length === 0) {
            this.resultsContainer.innerHTML = `
                <div class="empty-results">
                    <div class="empty-icon">
                        <i class="fas fa-search"></i>
                    </div>
                    <h3 data-en="No hotels found" data-vi="Không tìm thấy khách sạn">No hotels found</h3>
                    <p data-en="Try changing your search criteria" data-vi="Hãy thử thay đổi tiêu chí tìm kiếm">Try changing your search criteria</p>
                </div>
            `;
            return;
        }
        
        // Calculate dates
        const checkin = new Date(this.searchParams.checkin);
        const checkout = new Date(this.searchParams.checkout);
        const nights = Math.round((checkout - checkin) / (1000 * 60 * 60 * 24));
        const showDateInfo = nights > 0;
        
        // Get user preferences
        const preferences = getUserPreferences ? getUserPreferences() : { currency: 'USD', language: 'en' };
        const currencySymbol = preferences.currency === 'VND' ? '₫' : (preferences.currency === 'EUR' ? '€' : '$');
        
        // Append results
        hotels.forEach(hotel => {
            const hotelElement = this._createHotelElement(hotel, {
                nights,
                showDateInfo,
                currencySymbol,
                preferences
            });
            
            this.resultsContainer.appendChild(hotelElement);
        });
        
        // Update language display
        if (typeof updateLanguageDisplay === 'function') {
            updateLanguageDisplay();
        }
    }
    
    /**
     * Create hotel element
     * @param {Object} hotel - Hotel data
     * @param {Object} options - Render options
     * @returns {HTMLElement} Hotel element
     */
    _createHotelElement(hotel, options) {
        const { nights, showDateInfo, currencySymbol, preferences } = options;
        
        // Calculate prices
        const displayPrice = Math.round(hotel.price_per_night);
        const displayTotal = showDateInfo ? Math.round(hotel.price_per_night * nights) : 0;
        
        // Create element
        const div = document.createElement('div');
        div.className = 'hotel-card';
        div.setAttribute('data-hotel-id', hotel.hotel_id);
        
        div.innerHTML = `
            <div class="hotel-card-content">
                <div class="hotel-image">
                    <img 
                        alt="${hotel.name}" 
                        onload="if(window.ImageCache) window.ImageCache.loadImage(this, '${hotel.image || 'assets/images/hotel-placeholder.jpg'}', 'assets/images/danang.jpg');" 
                        src="${hotel.image || 'assets/images/hotel-placeholder.jpg'}"
                        loading="lazy" 
                    >
                </div>
                
                <div class="hotel-details">
                    <h3 class="hotel-name">${hotel.name}</h3>
                    <div class="hotel-rating">
                        <span class="stars">${'★'.repeat(Math.round(hotel.stars))}</span>
                        <span class="reviews">${hotel.rating}/10</span>
                    </div>
                    
                    <div class="hotel-location">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${this._getCityDisplayName(hotel.city)}, ${hotel.country}</span>
                    </div>
                    
                    ${showDateInfo ? `
                    <div class="hotel-dates">
                        <div class="date-item">
                            <i class="fas fa-calendar-check text-green-500"></i>
                            <span>${this._formatDate(this.searchParams.checkin)}</span>
                        </div>
                        <div class="date-arrow">
                            <i class="fas fa-arrow-right text-gray-400"></i>
                        </div>
                        <div class="date-item">
                            <i class="fas fa-calendar-times text-red-500"></i>
                            <span>${this._formatDate(this.searchParams.checkout)}</span>
                        </div>
                        <div class="nights-info">
                            ${nights} ${preferences.language === 'vi' ? 'đêm' : 'nights'}
                        </div>
                    </div>
                    ` : ''}
                </div>
                
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
    
    /**
     * Render error message
     * @param {string} message - Error message
     */
    _renderError(message) {
        if (!this.resultsContainer) return;
        
        this.resultsContainer.innerHTML = `
            <div class="error-message">
                <div class="error-icon">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <p>${message}</p>
                <button class="retry-btn" onclick="hotelSearch.performSearch()">
                    <span data-en="Try Again" data-vi="Thử Lại">Try Again</span>
                </button>
            </div>
        `;
        
        // Update language display
        if (typeof updateLanguageDisplay === 'function') {
            updateLanguageDisplay();
        }
    }
    
    /**
     * Show loader
     */
    _showLoader() {
        if (this.loaderElement) {
            this.loaderElement.classList.remove('hidden');
        }
    }
    
    /**
     * Hide loader
     */
    _hideLoader() {
        if (this.loaderElement) {
            this.loaderElement.classList.add('hidden');
        }
    }
    
    /**
     * Format date
     * @param {string} date - Date string
     * @returns {string} Formatted date
     */
    _formatDate(date) {
        return Utils.formatDate(date, 'short', currentLanguage === 'vi' ? 'vi-VN' : 'en-US');
    }
    
    /**
     * Format price
     * @param {number} price - Price
     * @returns {string} Formatted price
     */
    _formatPrice(price) {
        const currency = window.currentCurrency || 'USD';
        return Utils.formatCurrency(price, currency);
    }
    
    /**
     * Get city display name
     * @param {string} city - City name or ID
     * @returns {string} City display name
     */
    _getCityDisplayName(city) {
        // Check if city is a numeric ID value
        if (/^\d+$/.test(city)) {
            // Try to find city name in cities database if available
            const citiesData = window.citiesData || [];
            if (citiesData.length > 0) {
                const cityData = citiesData.find(c => c.city_id === parseInt(city));
                if (cityData) {
                    city = cityData.name;
                }
            }
            
            // Fallback to common cities based on ID
            const cityIdMap = {
                '1702341327': 'Singapore',
                '1702341328': 'Bangkok',
                '1702341329': 'Ho Chi Minh City',
                '1702341330': 'Hanoi',
                '1702341331': 'Kuala Lumpur'
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
                'Nha Trang': 'Nha Trang'
            };
            
            return cityMap[city] || city;
        }
        
        return city;
    }
    
    /**
     * Highlight matching text
     * @param {string} text - Text to highlight
     * @param {string} query - Search query
     * @returns {string} Highlighted text
     */
    _highlightMatch(text, query) {
        if (!query) return text;
        
        const regex = new RegExp(query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
        return text.replace(regex, match => `<strong class="highlight">${match}</strong>`);
    }
}

// Initialize hotel search
document.addEventListener('DOMContentLoaded', () => {
    window.hotelSearch = new HotelSearch();
});