// Personalized Tour V2 - Daily Preferences Management
// This file handles the advanced personalized tour planning with daily preference forms

class PersonalizedTourV2Manager {
    constructor() {
        this.dailyFormsData = null;
        this.currentStep = 'basic-info';
        this.steps = ['basic-info', 'flight-booking', 'daily-preferences', 'tour-generation'];
    }

    // Initialize the manager
    init() {
        console.log('🎯 PersonalizedTourV2Manager initialized');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // This class is integrated with the main dashboard.html flight booking manager
        // Event listeners are managed there to avoid conflicts
        console.log('✅ PersonalizedTourV2Manager event listeners ready');
    }

    // Calculate number of days between two dates
    calculateDayCount(departureDate, arrivalDate) {
        const startDate = new Date(departureDate);
        const endDate = new Date(arrivalDate);
        const timeDiff = endDate.getTime() - startDate.getTime();
        return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both dates
    }

    // Store daily preferences data
    storeDailyPreferences(type, id, day, preference) {
        if (!this.dailyFormsData) return;
        
        if (!this.dailyFormsData.preferences[day]) {
            this.dailyFormsData.preferences[day] = {};
        }
        if (!this.dailyFormsData.preferences[day][type]) {
            this.dailyFormsData.preferences[day][type] = {};
        }
        this.dailyFormsData.preferences[day][type][id] = preference;
        
        console.log(`✅ Stored Day ${day} ${type} ${id}: ${preference}`);
    }

    // Get stored preferences for analytics
    getStoredPreferences() {
        return this.dailyFormsData ? this.dailyFormsData.preferences : {};
    }

    // API call helpers for loading data by country
    async loadDataByCountry(type, country, limit = 20) {
        try {
            const response = await fetch(`/api/${type}?country=${encodeURIComponent(country)}&limit=${limit}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`Error loading ${type} for country ${country}:`, error);
            return { [type]: [] };
        }
    }

    // Generate like/dislike UI for items
    generateLikeDislikeUI(item, type, dayNumber) {
        const itemId = item[`${type}_id`] || item.id;
        
        return `
            <div class="${type}-item p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-300 transition duration-200">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <h6 class="font-semibold text-gray-800 text-sm">${item.name}</h6>
                        ${this.generateItemDetails(item, type)}
                    </div>
                    <div class="flex items-center space-x-2 ml-3">
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" class="like-checkbox hidden" 
                                   data-type="${type}" data-id="${itemId}" data-day="${dayNumber}">
                            <div class="like-btn w-8 h-8 rounded-full border-2 border-green-300 flex items-center justify-center hover:bg-green-50 transition duration-200">
                                <i class="fas fa-thumbs-up text-green-500 text-xs"></i>
                            </div>
                        </label>
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" class="dislike-checkbox hidden" 
                                   data-type="${type}" data-id="${itemId}" data-day="${dayNumber}">
                            <div class="dislike-btn w-8 h-8 rounded-full border-2 border-red-300 flex items-center justify-center hover:bg-red-50 transition duration-200">
                                <i class="fas fa-thumbs-down text-red-500 text-xs"></i>
                            </div>
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    // Generate specific details for each item type
    generateItemDetails(item, type) {
        switch(type) {
            case 'restaurant':
                return `
                    <p class="text-xs text-gray-600">${item.cuisine_type || 'Restaurant'}</p>
                    <div class="flex items-center mt-1">
                        <span class="text-xs text-yellow-600">★ ${item.rating || 'N/A'}</span>
                        <span class="text-xs text-gray-500 ml-2">$${item.price_avg || 'N/A'}</span>
                    </div>
                `;
            case 'hotel':
                return `
                    <div class="flex items-center mt-1">
                        <span class="text-xs text-yellow-600">★ ${item.rating || 'N/A'}</span>
                        <span class="text-xs text-blue-600 ml-2">${item.stars || 0}⭐</span>
                        <span class="text-xs text-gray-500 ml-2">$${item.price_per_night || 'N/A'}/night</span>
                    </div>
                `;
            case 'activity':
                return `
                    <p class="text-xs text-gray-600">${item.type || 'Activity'}</p>
                    <div class="flex items-center mt-1">
                        <span class="text-xs text-yellow-600">★ ${item.rating || 'N/A'}</span>
                        <span class="text-xs text-gray-500 ml-2">$${item.price || 'Free'}</span>
                        <span class="text-xs text-gray-500 ml-2">${item.duration_hr || 'N/A'}h</span>
                    </div>
                `;
            case 'transport':
                return `
                    <div class="flex items-center mt-1">
                        <span class="text-xs text-yellow-600">★ ${item.rating || 'N/A'}</span>
                        <span class="text-xs text-gray-500 ml-2">$${item.avg_price_per_km || 'N/A'}/km</span>
                        <span class="text-xs text-gray-500 ml-2">${item.operating_hours || '24/7'}</span>
                    </div>
                `;
            default:
                return '';
        }
    }

    // Setup like/dislike interaction handlers
    setupLikeDislikeHandlers(container) {
        const likeCheckboxes = container.querySelectorAll('.like-checkbox');
        const dislikeCheckboxes = container.querySelectorAll('.dislike-checkbox');
        
        likeCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.handleLikeChange(e, container);
            });
        });
        
        dislikeCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.handleDislikeChange(e, container);
            });
        });
    }

    handleLikeChange(e, container) {
        const likeBtn = e.target.nextElementSibling;
        const dislikeCheckbox = container.querySelector(
            `[data-type="${e.target.dataset.type}"][data-id="${e.target.dataset.id}"].dislike-checkbox`
        );
        const dislikeBtn = dislikeCheckbox.nextElementSibling;
        
        if (e.target.checked) {
            likeBtn.classList.add('bg-green-100', 'border-green-500');
            // Uncheck dislike if it was checked
            if (dislikeCheckbox.checked) {
                dislikeCheckbox.checked = false;
                dislikeBtn.classList.remove('bg-red-100', 'border-red-500');
            }
            // Store preference
            this.storeDailyPreferences(
                e.target.dataset.type, 
                e.target.dataset.id, 
                e.target.dataset.day, 
                'like'
            );
        } else {
            likeBtn.classList.remove('bg-green-100', 'border-green-500');
            this.removePreference(
                e.target.dataset.type, 
                e.target.dataset.id, 
                e.target.dataset.day
            );
        }
    }

    handleDislikeChange(e, container) {
        const dislikeBtn = e.target.nextElementSibling;
        const likeCheckbox = container.querySelector(
            `[data-type="${e.target.dataset.type}"][data-id="${e.target.dataset.id}"].like-checkbox`
        );
        const likeBtn = likeCheckbox.nextElementSibling;
        
        if (e.target.checked) {
            dislikeBtn.classList.add('bg-red-100', 'border-red-500');
            // Uncheck like if it was checked
            if (likeCheckbox.checked) {
                likeCheckbox.checked = false;
                likeBtn.classList.remove('bg-green-100', 'border-green-500');
            }
            // Store preference
            this.storeDailyPreferences(
                e.target.dataset.type, 
                e.target.dataset.id, 
                e.target.dataset.day, 
                'dislike'
            );
        } else {
            dislikeBtn.classList.remove('bg-red-100', 'border-red-500');
            this.removePreference(
                e.target.dataset.type, 
                e.target.dataset.id, 
                e.target.dataset.day
            );
        }
    }

    removePreference(type, id, day) {
        if (this.dailyFormsData && 
            this.dailyFormsData.preferences[day] && 
            this.dailyFormsData.preferences[day][type] && 
            this.dailyFormsData.preferences[day][type][id]) {
            delete this.dailyFormsData.preferences[day][type][id];
            console.log(`🗑️ Removed Day ${day} ${type} ${id} preference`);
        }
    }

    // Format date for display
    formatDateForDisplay(dateString, dayOffset = 0) {
        const date = new Date(dateString);
        date.setDate(date.getDate() + dayOffset);
        return date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    // Validate preferences before tour generation
    validatePreferences() {
        if (!this.dailyFormsData || !this.dailyFormsData.preferences) {
            return { valid: false, message: 'No preferences data found' };
        }

        const days = Object.keys(this.dailyFormsData.preferences);
        if (days.length === 0) {
            return { valid: false, message: 'No daily preferences selected' };
        }

        // Check if at least some preferences are selected
        let totalPreferences = 0;
        days.forEach(day => {
            const dayPrefs = this.dailyFormsData.preferences[day];
            Object.keys(dayPrefs).forEach(type => {
                totalPreferences += Object.keys(dayPrefs[type]).length;
            });
        });

        if (totalPreferences === 0) {
            return { valid: false, message: 'Please select at least some preferences' };
        }

        return { valid: true, message: 'Preferences validated successfully' };
    }

    // Export preferences for tour generation API
    exportPreferencesForAPI() {
        const validation = this.validatePreferences();
        if (!validation.valid) {
            throw new Error(validation.message);
        }

        return {
            totalDays: this.dailyFormsData.totalDays,
            destinationCountry: this.dailyFormsData.destinationCountry,
            preferences: this.dailyFormsData.preferences,
            metadata: {
                generatedAt: new Date().toISOString(),
                version: 'v2.0'
            }
        };
    }
}

// Initialize the manager when script loads
const personalizedTourV2Manager = new PersonalizedTourV2Manager();

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.PersonalizedTourV2Manager = PersonalizedTourV2Manager;
    window.personalizedTourV2Manager = personalizedTourV2Manager;
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    personalizedTourV2Manager.init();
});