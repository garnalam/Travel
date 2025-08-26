/**
 * Tour Form Management for Vietnam Travel
 * Handles all functionality related to the personalized travel tour form
 * UPDATED: Now uses real API calls instead of mock data
 */

// Global variables for storing data between steps
let destinationCityId = null;
let selectedHotels = [];
let selectedRestaurants = [];
let selectedActivities = [];
let selectedTransports = [];
let currentUser = null; // Biến lưu thông tin người dùng hiện tại
let generatedToursData = {}; // Store generated tour data by tour ID

// Store form state between steps
const formState = {
    departure: '',
    departureId: null,
    destination: '',
    destinationId: null,
    departureTime: '',
    departureDate: '',
    transport: '',
    hotels: [],
    restaurants: [],
    activities: [],
    transports: [],
    guestCount: 0,
    durationDays: 0,
    targetBudget: 0
};

/**
 * Initialize the tour form with all event listeners and functionality
 */
function initializeTourForm() {
    console.log('🌟 Initializing Tour Form...');
    
    // Lấy thông tin người dùng hiện tại
    getCurrentUserInfo();
    
    // Step navigation
    const step1 = document.getElementById('travel-step-1');
    const step2 = document.getElementById('travel-step-2');
    const continueBtn = document.getElementById('continue-to-step-2');
    const backBtn = document.getElementById('back-to-step-1');
    const generateBtn = document.getElementById('generate-tour-btn');
    
    // Setup autocomplete for city fields
    setupCityAutocomplete('departure', 'departureAutocomplete');
    setupCityAutocomplete('destination', 'destinationAutocomplete');
    
    // Add validation listeners to form fields in step 1
    addValidationListeners();
    
    // Setup navigation between steps
    if (continueBtn) {
        continueBtn.addEventListener('click', function() {
            if (validateStep1()) {
                saveStep1Data();
                step1.classList.add('hidden');
                step2.classList.remove('hidden');
                
                // Load step 2 data based on destination
                if (destinationCityId) {
                    loadStep2Data(destinationCityId);
                }
            }
        });
    }
    
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            step2.classList.add('hidden');
            step1.classList.remove('hidden');
        });
    }
    
    // Generate tour button action
    if (generateBtn) {
        generateBtn.addEventListener('click', function() {
            if (validateStep2()) {
                saveStep2Data();
                generateTour();
            }
        });
    }
    
    // Setup hotels autocomplete (will be populated after destination is selected)
    setupHotelsAutocomplete();
    
    // Setup restaurants autocomplete (will be populated after destination is selected)
    setupRestaurantsAutocomplete();
    
    // Setup Add Hotel button
    setupAddHotelButton();
    
    // Setup Add Restaurant button
    setupAddRestaurantButton();
}

/**
 * Lấy thông tin người dùng hiện tại từ API
 */
function getCurrentUserInfo() {
    fetch('/api/check-admin')
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                console.warn('⚠️ Không thể lấy thông tin người dùng hiện tại');
                return { user_id: null };
            }
        })
        .then(userData => {
            currentUser = userData;
            console.log('👤 Thông tin người dùng hiện tại:', userData);
        })
        .catch(error => {
            console.error('❌ Lỗi khi lấy thông tin người dùng:', error);
            currentUser = { user_id: null };
        });
}

/**
 * Setup Add Hotel button functionality
 */
function setupAddHotelButton() {
    const addHotelButton = document.getElementById('addHotelButton');
    if (addHotelButton) {
        addHotelButton.addEventListener('click', function() {
            const hotelName = prompt(window.currentLanguage === 'vi' ? 
                'Nhập tên khách sạn:' : 
                'Enter hotel name:');
            
            if (hotelName && hotelName.trim()) {
                // Create a custom hotel object
                const customHotel = {
                    hotel_id: 'custom_' + Date.now(),
                    name: hotelName.trim(),
                    stars: 3,
                    price_per_night: 100,
                    rating: 4.0,
                    custom: true
                };
                
                // Add to selected hotels
                addSelectedHotel(customHotel);
            }
        });
    }
}

/**
 * Setup Add Restaurant button functionality
 */
function setupAddRestaurantButton() {
    const addRestaurantButton = document.getElementById('addRestaurantButton');
    if (addRestaurantButton) {
        addRestaurantButton.addEventListener('click', function() {
            const restaurantName = prompt(window.currentLanguage === 'vi' ? 
                'Nhập tên nhà hàng:' : 
                'Enter restaurant name:');
            
            if (restaurantName && restaurantName.trim()) {
                // Create a custom restaurant object
                const customRestaurant = {
                    restaurant_id: 'custom_' + Date.now(),
                    name: restaurantName.trim(),
                    cuisine_type: window.currentLanguage === 'vi' ? 'Nhà hàng tùy chỉnh' : 'Custom Restaurant',
                    price_avg: 25,
                    rating: 4.0,
                    custom: true
                };
                
                // Add to selected restaurants
                addSelectedRestaurant(customRestaurant);
            }
        });
    }
}

/**
 * Add validation listeners to form fields
 */
function addValidationListeners() {
    // Step 1 fields validation
    const step1Fields = ['departure', 'destination', 'departureTime', 'departureDate', 'transport'];
    
    step1Fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', validateStep1);
            field.addEventListener('change', validateStep1);
        }
    });
    
    // Step 2 fields validation
    const step2Fields = ['guestCount', 'durationDays', 'targetBudget'];
    
    step2Fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', validateStep2);
            field.addEventListener('change', validateStep2);
        }
    });
}

/**
 * Validate step 1 form fields
 * @returns {boolean} True if all required fields are filled
 */
function validateStep1() {
    const departure = document.getElementById('departure').value.trim();
    const destination = document.getElementById('destination').value.trim();
    const departureTime = document.getElementById('departureTime').value.trim();
    const departureDate = document.getElementById('departureDate').value.trim();
    const transport = document.getElementById('transport').value.trim();
    
    const isValid = departure && destination && departureTime && departureDate && transport !== 'Select Means Of Transport';
    
    const continueBtn = document.getElementById('continue-to-step-2');
    if (continueBtn) {
        continueBtn.disabled = !isValid;
        if (isValid) {
            continueBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            continueBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
    
    return isValid;
}

/**
 * Validate step 2 form fields
 * @returns {boolean} True if all required fields are filled
 */
function validateStep2() {
    const guestCount = document.getElementById('guestCount').value.trim();
    const durationDays = document.getElementById('durationDays').value.trim();
    const targetBudget = document.getElementById('targetBudget').value.trim();
    
    // Activities and transports are optional, but at least one of each must be selected
    const hasActivities = selectedActivities.length > 0;
    const hasTransports = selectedTransports.length > 0;
    
    const isValid = guestCount && durationDays && targetBudget && hasActivities && hasTransports;
    
    const generateBtn = document.getElementById('generate-tour-btn');
    if (generateBtn) {
        generateBtn.disabled = !isValid;
        if (isValid) {
            generateBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            generateBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
    
    return isValid;
}

/**
 * Save step 1 data to form state
 */
function saveStep1Data() {
    formState.departure = document.getElementById('departure').value.trim();
    formState.destination = document.getElementById('destination').value.trim();
    formState.departureTime = document.getElementById('departureTime').value.trim();
    formState.departureDate = document.getElementById('departureDate').value.trim();
    formState.transport = document.getElementById('transport').value;
    
    console.log('💾 Step 1 data saved:', formState);
}

/**
 * Save step 2 data to form state
 */
function saveStep2Data() {
    formState.hotels = selectedHotels.map(hotel => hotel.hotel_id);
    formState.restaurants = selectedRestaurants.map(restaurant => restaurant.restaurant_id);
    formState.activities = selectedActivities;
    formState.transports = selectedTransports;
    formState.guestCount = document.getElementById('guestCount').value.trim();
    formState.durationDays = document.getElementById('durationDays').value.trim();
    formState.targetBudget = document.getElementById('targetBudget').value.trim();
    
    console.log('💾 Step 2 data saved:', formState);
}

/**
 * Load step 2 data based on destination city ID
 * @param {string} cityId The destination city ID
 */
function loadStep2Data(cityId) {
    console.log('🔄 Loading data for city ID:', cityId);
    
    // Show loading indicators
    document.getElementById('activitiesLoading').style.display = 'block';
    document.getElementById('transportsLoading').style.display = 'block';
    document.getElementById('activitiesContent').innerHTML = '';
    document.getElementById('transportsContent').innerHTML = '';
    
    // Load activities for the destination city
    loadActivitiesForCity(cityId);
    
    // Load transports for the destination city
    loadTransportsForCity(cityId);
}

/**
 * Setup autocomplete for city fields with real API calls
 * @param {string} inputId ID of the input field
 * @param {string} dropdownId ID of the dropdown container
 */
function setupCityAutocomplete(inputId, dropdownId) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    
    if (!input || !dropdown) return;
    
    let timeoutId;
    
    input.addEventListener('input', function() {
        const query = this.value.trim();
        
        // Clear previous timeout
        clearTimeout(timeoutId);
        
        // Clear dropdown
        dropdown.innerHTML = '';
        
        // Hide dropdown if query is too short
        if (query.length < 2) {
            dropdown.classList.add('hidden');
            return;
        }
        
        // Set timeout to delay the API call
        timeoutId = setTimeout(async () => {
            try {
                const response = await fetch(`/api/cities/autocomplete?q=${encodeURIComponent(query)}&limit=5`);
                if (response.ok) {
                    const data = await response.json();
                    const results = data.suggestions || [];
                    
                    // Convert to expected format
                    const formattedResults = results.map(item => ({
                        id: `city_${item.city}_${item.country}`.replace(/\s+/g, '_'),
                        name: item.city,
                        country: item.country
                    }));
                    
                    displayCityResults(formattedResults, dropdown, input, inputId);
                } else {
                    console.error('Failed to fetch cities:', response.statusText);
                    displayCityResults([], dropdown, input, inputId);
                }
            } catch (error) {
                console.error('Error fetching cities:', error);
                displayCityResults([], dropdown, input, inputId);
            }
        }, 300);
    });
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (!input.contains(event.target) && !dropdown.contains(event.target)) {
            dropdown.classList.add('hidden');
        }
    });
}

/**
 * Display city search results in dropdown
 * @param {Array} results Array of city objects
 * @param {HTMLElement} dropdown The dropdown element
 * @param {HTMLElement} input The input field
 * @param {string} inputId ID of the input field
 */
function displayCityResults(results, dropdown, input, inputId) {
    // Clear dropdown
    dropdown.innerHTML = '';
    
    if (results.length === 0) {
        dropdown.innerHTML = '<div class="p-3 text-gray-500">No cities found</div>';
        dropdown.classList.remove('hidden');
        return;
    }
    
    // Create result items
    results.forEach(city => {
        const item = document.createElement('div');
        item.className = 'p-3 hover:bg-blue-50 cursor-pointer';
        item.innerHTML = `<div class="font-medium">${city.name}</div><div class="text-sm text-gray-500">${city.country}</div>`;
        
        // Handle click on result item
        item.addEventListener('click', async function() {
            input.value = city.name;
            dropdown.classList.add('hidden');
            
            try {
                // Get real city_id from database using API
                const response = await fetch(`/api/cities/id?city=${encodeURIComponent(city.name)}&country=${encodeURIComponent(city.country)}`);
                
                if (response.ok) {
                    const data = await response.json();
                    const cityId = data.city_id;
                    console.log('✅ Got city_id from database:', cityId, 'for city:', city.name);
                    
                    // Store city ID based on which input field
                    if (inputId === 'destination') {
                        destinationCityId = cityId;
                        formState.destinationId = cityId;
                        console.log('🏙️ Destination city selected:', city.name, 'ID:', cityId);
                    } else if (inputId === 'departure') {
                        formState.departureId = cityId;
                        console.log('🏙️ Departure city selected:', city.name, 'ID:', cityId);
                    }
                } else {
                    console.warn('⚠️ Failed to get city_id from database for:', city.name);
                    
                    // Sử dụng ID từ autocomplete API nếu có
                    const cityId = city.id || null;
                    console.log('⚠️ Using city ID from autocomplete:', cityId);
                    
                    if (inputId === 'destination') {
                        destinationCityId = cityId;
                        formState.destinationId = cityId;
                    } else if (inputId === 'departure') {
                        formState.departureId = cityId;
                    }
                }
                
                // Validate step 1
                validateStep1();
                
            } catch (error) {
                console.error('❌ Error getting city_id:', error);
                
                // Sử dụng ID từ autocomplete API nếu có
                const cityId = city.id || null;
                console.log('⚠️ Using city ID from autocomplete due to error:', cityId);
                
                if (inputId === 'destination') {
                    destinationCityId = cityId;
                    formState.destinationId = cityId;
                } else if (inputId === 'departure') {
                    formState.departureId = cityId;
                }
                
                validateStep1();
            }
        });
        
        dropdown.appendChild(item);
    });
    
    // Show dropdown
    dropdown.classList.remove('hidden');
}

/**
 * Setup hotels autocomplete with real API calls
 */
function setupHotelsAutocomplete() {
    const input = document.getElementById('hotels');
    const dropdown = document.getElementById('hotelsAutocomplete');
    const selectedContainer = document.getElementById('selectedHotels');
    const hiddenInput = document.getElementById('hotelIds');
    
    if (!input || !dropdown || !selectedContainer || !hiddenInput) return;
    
    let timeoutId;
    
    input.addEventListener('input', function() {
        const query = this.value.trim();
        
        // Clear previous timeout
        clearTimeout(timeoutId);
        
        // Clear dropdown
        dropdown.innerHTML = '';
        
        // Hide dropdown if query is too short or no destination selected
        if (query.length < 2 || !destinationCityId) {
            dropdown.classList.add('hidden');
            return;
        }
        
        // Set timeout to delay the API call
        timeoutId = setTimeout(async () => {
            try {
                const response = await fetch(`/api/hotels/autocomplete?q=${encodeURIComponent(query)}&limit=5`);
                if (response.ok) {
                    const data = await response.json();
                    const results = data.suggestions || [];
                    
                    // Use the hotels directly as they come from API
                    displayHotelResults(results, dropdown, input);
                } else {
                    console.error('Failed to fetch hotels:', response.statusText);
                    displayHotelResults([], dropdown, input);
                }
            } catch (error) {
                console.error('Error fetching hotels:', error);
                displayHotelResults([], dropdown, input);
            }
        }, 300);
    });
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (!input.contains(event.target) && !dropdown.contains(event.target)) {
            dropdown.classList.add('hidden');
        }
    });
}

/**
 * Display hotel search results in dropdown
 * @param {Array} results Array of hotel objects
 * @param {HTMLElement} dropdown The dropdown element
 * @param {HTMLElement} input The input field
 */
function displayHotelResults(results, dropdown, input) {
    // Clear dropdown
    dropdown.innerHTML = '';
    
    if (results.length === 0) {
        dropdown.innerHTML = '<div class="p-3 text-gray-500">No hotels found</div>';
        dropdown.classList.remove('hidden');
        return;
    }
    
    // Create result items
    results.forEach(hotel => {
        // Skip if already selected
        if (selectedHotels.some(h => h.hotel_id === hotel.hotel_id)) {
            return;
        }
        
        const item = document.createElement('div');
        item.className = 'p-3 hover:bg-blue-50 cursor-pointer';
        item.innerHTML = `
            <div class="font-medium">${hotel.name}</div>
            <div class="text-sm text-gray-500">${hotel.stars || 3} stars | $${hotel.price_per_night || 100} per night</div>
        `;
        
        // Handle click on result item
        item.addEventListener('click', function() {
            addSelectedHotel(hotel);
            input.value = '';
            dropdown.classList.add('hidden');
        });
        
        dropdown.appendChild(item);
    });
    
    // Show dropdown
    dropdown.classList.remove('hidden');
}

/**
 * Add a hotel to the selected hotels list
 * @param {Object} hotel The hotel object to add
 */
function addSelectedHotel(hotel) {
    if (selectedHotels.some(h => h.hotel_id === hotel.hotel_id)) {
        console.warn('Hotel already selected:', hotel.name);
        return;
    }
    
    selectedHotels.push(hotel);
    updateSelectedHotelsDisplay();
    updateHiddenHotelIds();
    
    console.log('✅ Added hotel:', hotel.name, 'Total selected:', selectedHotels.length);
}

/**
 * Remove a hotel from the selected hotels list
 * @param {string} hotelId The hotel ID to remove
 */
function removeSelectedHotel(hotelId) {
    selectedHotels = selectedHotels.filter(hotel => hotel.hotel_id !== hotelId);
    updateSelectedHotelsDisplay();
    updateHiddenHotelIds();
    
    console.log('❌ Removed hotel ID:', hotelId, 'Remaining:', selectedHotels.length);
}

/**
 * Update the display of selected hotels
 */
function updateSelectedHotelsDisplay() {
    const container = document.getElementById('selectedHotels');
    if (!container) return;
    
    container.innerHTML = '';
    
    selectedHotels.forEach(hotel => {
        const hotelCard = document.createElement('div');
        hotelCard.className = 'bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between';
        hotelCard.innerHTML = `
            <div>
                <div class="font-medium text-blue-800">${hotel.name}</div>
                <div class="text-sm text-blue-600">${hotel.stars || 3} stars | $${hotel.price_per_night || 100}/night</div>
            </div>
            <button onclick="removeSelectedHotel('${hotel.hotel_id}')" class="text-red-500 hover:text-red-700">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(hotelCard);
    });
}

/**
 * Update hidden input with selected hotel IDs
 */
function updateHiddenHotelIds() {
    const hiddenInput = document.getElementById('hotelIds');
    if (hiddenInput) {
        hiddenInput.value = selectedHotels.map(hotel => hotel.hotel_id).join(',');
    }
}

/**
 * Setup restaurants autocomplete with real API calls
 */
function setupRestaurantsAutocomplete() {
    const input = document.getElementById('restaurants');
    const dropdown = document.getElementById('restaurantsAutocomplete');
    
    if (!input || !dropdown) return;
    
    let timeoutId;
    
    input.addEventListener('input', function() {
        const query = this.value.trim();
        
        // Clear previous timeout
        clearTimeout(timeoutId);
        
        // Clear dropdown
        dropdown.innerHTML = '';
        
        // Hide dropdown if query is too short
        if (query.length < 2) {
            dropdown.classList.add('hidden');
            return;
        }
        
        // Set timeout to delay the API call
        timeoutId = setTimeout(async () => {
            try {
                const response = await fetch(`/api/restaurants/autocomplete?q=${encodeURIComponent(query)}&limit=5`);
                if (response.ok) {
                    const data = await response.json();
                    const results = data.suggestions || [];
                    
                    displayRestaurantResults(results, dropdown, input);
                } else {
                    console.error('Failed to fetch restaurants:', response.statusText);
                    displayRestaurantResults([], dropdown, input);
                }
            } catch (error) {
                console.error('Error fetching restaurants:', error);
                displayRestaurantResults([], dropdown, input);
            }
        }, 300);
    });
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (!input.contains(event.target) && !dropdown.contains(event.target)) {
            dropdown.classList.add('hidden');
        }
    });
}

/**
 * Display restaurant search results in dropdown
 * @param {Array} results Array of restaurant objects
 * @param {HTMLElement} dropdown The dropdown element
 * @param {HTMLElement} input The input field
 */
function displayRestaurantResults(results, dropdown, input) {
    // Clear dropdown
    dropdown.innerHTML = '';
    
    if (results.length === 0) {
        dropdown.innerHTML = '<div class="p-3 text-gray-500">No restaurants found</div>';
        dropdown.classList.remove('hidden');
        return;
    }
    
    // Create result items
    results.forEach(restaurant => {
        // Skip if already selected
        if (selectedRestaurants.some(r => r.restaurant_id === restaurant.restaurant_id)) {
            return;
        }
        
        const item = document.createElement('div');
        item.className = 'p-3 hover:bg-blue-50 cursor-pointer';
        item.innerHTML = `
            <div class="font-medium">${restaurant.name}</div>
            <div class="text-sm text-gray-500">${restaurant.cuisine_type || 'Restaurant'} | $${restaurant.price_avg || 25} avg</div>
        `;
        
        // Handle click on result item
        item.addEventListener('click', function() {
            addSelectedRestaurant(restaurant);
            input.value = '';
            dropdown.classList.add('hidden');
        });
        
        dropdown.appendChild(item);
    });
    
    // Show dropdown
    dropdown.classList.remove('hidden');
}

/**
 * Add a restaurant to the selected restaurants list
 * @param {Object} restaurant The restaurant object to add
 */
function addSelectedRestaurant(restaurant) {
    if (selectedRestaurants.some(r => r.restaurant_id === restaurant.restaurant_id)) {
        console.warn('Restaurant already selected:', restaurant.name);
        return;
    }
    
    selectedRestaurants.push(restaurant);
    updateSelectedRestaurantsDisplay();
    updateHiddenRestaurantIds();
    
    console.log('✅ Added restaurant:', restaurant.name, 'Total selected:', selectedRestaurants.length);
}

/**
 * Remove a restaurant from the selected restaurants list
 * @param {string} restaurantId The restaurant ID to remove
 */
function removeSelectedRestaurant(restaurantId) {
    selectedRestaurants = selectedRestaurants.filter(restaurant => restaurant.restaurant_id !== restaurantId);
    updateSelectedRestaurantsDisplay();
    updateHiddenRestaurantIds();
    
    console.log('❌ Removed restaurant ID:', restaurantId, 'Remaining:', selectedRestaurants.length);
}

/**
 * Update the display of selected restaurants
 */
function updateSelectedRestaurantsDisplay() {
    const container = document.getElementById('selectedRestaurants');
    if (!container) return;
    
    container.innerHTML = '';
    
    selectedRestaurants.forEach(restaurant => {
        const restaurantCard = document.createElement('div');
        restaurantCard.className = 'bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between';
        restaurantCard.innerHTML = `
            <div>
                <div class="font-medium text-green-800">${restaurant.name}</div>
                <div class="text-sm text-green-600">${restaurant.cuisine_type || 'Restaurant'} | $${restaurant.price_avg || 25} avg</div>
            </div>
            <button onclick="removeSelectedRestaurant('${restaurant.restaurant_id}')" class="text-red-500 hover:text-red-700">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(restaurantCard);
    });
}

/**
 * Update hidden input with selected restaurant IDs
 */
function updateHiddenRestaurantIds() {
    const hiddenInput = document.getElementById('restaurantIds');
    if (hiddenInput) {
        hiddenInput.value = selectedRestaurants.map(restaurant => restaurant.restaurant_id).join(',');
    }
}

/**
 * Load activities for a specific city
 * @param {string} cityId The city ID
 */
async function loadActivitiesForCity(cityId) {
    try {
        const response = await fetch(`/api/activities/by-city/${cityId}`);
        if (response.ok) {
            const data = await response.json();
            displayActivities(data.activities || []);
        } else {
            console.error('Failed to load activities:', response.statusText);
            displayActivities([]);
        }
    } catch (error) {
        console.error('Error loading activities:', error);
        displayActivities([]);
    }
}

/**
 * Display activities with checkboxes
 * @param {Array} activities Array of activity objects
 */
function displayActivities(activities) {
    const container = document.getElementById('activitiesContent');
    const loading = document.getElementById('activitiesLoading');
    
    if (loading) loading.style.display = 'none';
    if (!container) return;
    
    container.innerHTML = '';
    
    if (activities.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No activities found for this destination</p>';
        return;
    }
    
    activities.forEach(activity => {
        const activityItem = document.createElement('div');
        activityItem.className = 'flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50';
        activityItem.innerHTML = `
            <input type="checkbox" id="activity_${activity.activity_id}" value="${activity.activity_id}" 
                   class="activity-checkbox rounded text-blue-600 focus:ring-blue-500" 
                   onchange="toggleActivitySelection('${activity.activity_id}')">
            <label for="activity_${activity.activity_id}" class="flex-1 cursor-pointer">
                <div class="font-medium text-gray-800">${activity.name}</div>
                <div class="text-sm text-gray-500">${activity.type || 'Activity'} | $${activity.price || 0} | ${activity.duration_hr || 1}hrs</div>
            </label>
        `;
        container.appendChild(activityItem);
    });
}

/**
 * Toggle activity selection
 * @param {string} activityId The activity ID
 */
function toggleActivitySelection(activityId) {
    const checkbox = document.getElementById(`activity_${activityId}`);
    if (!checkbox) return;
    
    if (checkbox.checked) {
        if (!selectedActivities.includes(activityId)) {
            selectedActivities.push(activityId);
        }
    } else {
        selectedActivities = selectedActivities.filter(id => id !== activityId);
    }
    
    updateHiddenActivityIds();
    validateStep2();
    
    console.log('🎯 Selected activities:', selectedActivities);
}

/**
 * Update hidden input with selected activity IDs
 */
function updateHiddenActivityIds() {
    const hiddenInput = document.getElementById('activityIds');
    if (hiddenInput) {
        hiddenInput.value = selectedActivities.join(',');
    }
}

/**
 * Load transports for a specific city
 * @param {string} cityId The city ID
 */
async function loadTransportsForCity(cityId) {
    try {
        const response = await fetch(`/api/transports/by-city/${cityId}`);
        if (response.ok) {
            const data = await response.json();
            displayTransports(data.transports || []);
        } else {
            console.error('Failed to load transports:', response.statusText);
            displayTransports([]);
        }
    } catch (error) {
        console.error('Error loading transports:', error);
        displayTransports([]);
    }
}

/**
 * Display transports with checkboxes
 * @param {Array} transports Array of transport objects
 */
function displayTransports(transports) {
    const container = document.getElementById('transportsContent');
    const loading = document.getElementById('transportsLoading');
    
    if (loading) loading.style.display = 'none';
    if (!container) return;
    
    container.innerHTML = '';
    
    if (transports.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No transports found for this destination</p>';
        return;
    }
    
    transports.forEach(transport => {
        const transportItem = document.createElement('div');
        transportItem.className = 'flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50';
        transportItem.innerHTML = `
            <input type="checkbox" id="transport_${transport.transport_id}" value="${transport.transport_id}" 
                   class="transport-checkbox rounded text-blue-600 focus:ring-blue-500" 
                   onchange="toggleTransportSelection('${transport.transport_id}')">
            <label for="transport_${transport.transport_id}" class="flex-1 cursor-pointer">
                <div class="font-medium text-gray-800">${transport.type}</div>
                <div class="text-sm text-gray-500">$${transport.avg_price_per_km || 0}/km | Min: $${transport.min_price || 0}</div>
            </label>
        `;
        container.appendChild(transportItem);
    });
}

/**
 * Toggle transport selection
 * @param {string} transportId The transport ID
 */
function toggleTransportSelection(transportId) {
    const checkbox = document.getElementById(`transport_${transportId}`);
    if (!checkbox) return;
    
    if (checkbox.checked) {
        if (!selectedTransports.includes(transportId)) {
            selectedTransports.push(transportId);
        }
    } else {
        selectedTransports = selectedTransports.filter(id => id !== transportId);
    }
    
    updateHiddenTransportIds();
    validateStep2();
    
    console.log('🚗 Selected transports:', selectedTransports);
}

/**
 * Update hidden input with selected transport IDs
 */
function updateHiddenTransportIds() {
    const hiddenInput = document.getElementById('transportIds');
    if (hiddenInput) {
        hiddenInput.value = selectedTransports.join(',');
    }
}

/**
 * Generate tour based on form data - Tích hợp với backend API
 */
async function generateTour() {
    console.log('🎯 Generating tour with data:', formState);
    
    // Show loading state
    const loadingDiv = document.getElementById('tourLoading');
    const resultsDiv = document.getElementById('tourResults');
    
    if (loadingDiv) loadingDiv.classList.remove('hidden');
    if (resultsDiv) resultsDiv.classList.add('hidden');
    
    // Chuẩn bị dữ liệu để gửi đến API
    const tourData = {
        "user_id": currentUser && currentUser.user_id ? currentUser.user_id : null,
        "start_city_id": formState.departureId || null,
        "destination_city_id": formState.destinationId || null,
        "hotel_ids": formState.hotels || [],
        "activity_ids": formState.activities || [],
        "restaurant_ids": formState.restaurants || [],
        "transport_ids": formState.transports || [],
        "guest_count": formState.guestCount ? parseInt(formState.guestCount) : null,
        "duration_days": formState.durationDays ? parseInt(formState.durationDays) : null,
        "target_budget": formState.targetBudget ? parseFloat(formState.targetBudget) : null
    };
    
    console.log('📤 Sending tour data to API:', tourData);
    
    try {
        // Gọi API backend
        const response = await fetch('/api/generate-tour', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(tourData),
            credentials: 'same-origin'
        });
        
        // Xử lý response
        const result = await response.json();
        
        if (loadingDiv) loadingDiv.classList.add('hidden');
        
        if (response.ok && result.success) {
            // Hiển thị kết quả thành công
            console.log('✅ Tour generated successfully:', result.data);
            
            if (resultsDiv) resultsDiv.classList.remove('hidden');
            
            // Hiển thị tour results dưới dạng thẻ kết quả
            displayTourResults([result.data]);
            
            // Hiển thị thông báo thành công
            showTourGenerationNotification(
                window.currentLanguage === 'vi' ? 
                    'Tour đã được tạo thành công!' : 
                    'Tour generated successfully!',
                'success'
            );
            
        } else {
            // Hiển thị lỗi từ API
            console.error('❌ API Error:', result.error || 'Unknown error');
            
            showTourGenerationNotification(
                window.currentLanguage === 'vi' ? 
                    `Lỗi tạo tour: ${result.error || 'Lỗi không xác định'}` :
                    `Tour generation error: ${result.error || 'Unknown error'}`,
                'error'
            );
        }
        
    } catch (error) {
        // Xử lý lỗi network hoặc parsing
        console.error('❌ Network or parsing error:', error);
        
        if (loadingDiv) loadingDiv.classList.add('hidden');
        
        showTourGenerationNotification(
            window.currentLanguage === 'vi' ? 
                'Lỗi kết nối mạng. Vui lòng thử lại.' :
                'Network error. Please try again.',
            'error'
        );
    }
}

/**
 * Hiển thị thông báo cho việc tạo tour
 * @param {string} message Nội dung thông báo
 * @param {string} type Loại thông báo ('success', 'error', 'warning')
 */
function showTourGenerationNotification(message, type) {
    // Sử dụng hàm showNotification global nếu có
    if (typeof showNotification === 'function') {
        showNotification(message, type, 5000);
    } else {
        // Fallback notification
        alert(message);
    }
}

// Display tour results in grid
function displayTourResults(tours) {
    const grid = document.getElementById('tourResultsGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    tours.forEach(tour => {
        const card = createTourCard(tour);
        grid.appendChild(card);
    });
}

// Create tour card element
function createTourCard(tour) {
    const card = document.createElement('div');
    card.className = 'bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 border border-blue-100 hover:border-blue-200';
    
    // Store tour data globally with unique ID
    const tourId = tour.tour_id || `tour_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    generatedToursData[tourId] = tour;
    
    // Get current language from global variables
    const isVietnamese = window.currentLanguage === 'vi';
    
    // Create localized text based on current language
    const durationText = tour.duration_days ? 
        (isVietnamese ? `${tour.duration_days} ngày` : `${tour.duration_days} days`) : 
        (isVietnamese ? 'Chưa xác định thời gian' : 'Duration not specified');
        
    const guestText = tour.guest_count ? 
        (isVietnamese ? `${tour.guest_count} khách` : `${tour.guest_count} guests`) : 
        (isVietnamese ? 'Chưa xác định số khách' : 'Guest count not specified');
        
    const budgetText = tour.total_estimated_cost ? 
        `$${tour.total_estimated_cost.toLocaleString()}` : 
        (isVietnamese ? 'Chưa xác định ngân sách' : 'Budget not specified');
    
    // Calculate activity preview
    const activityCount = tour.schedule ? tour.schedule.reduce((sum, day) => sum + day.activities.length, 0) : 0;
    const activitiesText = isVietnamese ? `${activityCount} hoạt động` : `${activityCount} activities`;
    
    card.innerHTML = `
        <div class="relative">
            <!-- Header with gradient background -->
            <div class="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-2xl font-bold mb-2">${tour.destination_city || (isVietnamese ? 'Điểm đến chưa xác định' : 'Destination not specified')}</h3>
                        <div class="flex items-center space-x-4 text-blue-100">
                            <span class="flex items-center">
                                <i class="fas fa-calendar-alt mr-2"></i>
                                ${durationText}
                            </span>
                            <span class="flex items-center">
                                <i class="fas fa-users mr-2"></i>
                                ${guestText}
                            </span>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="bg-white bg-opacity-20 rounded-lg p-3">
                            <p class="text-3xl font-bold">${budgetText}</p>
                            <p class="text-sm opacity-90" data-en="Total Cost" data-vi="Tổng chi phí">Tổng chi phí</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Content section -->
            <div class="p-6">
                <!-- Tour highlights -->
                <div class="grid grid-cols-2 gap-4 mb-6">
                    <div class="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div class="flex items-center">
                            <div class="bg-green-500 rounded-full p-2 mr-3">
                                <i class="fas fa-map-marker-alt text-white text-sm"></i>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600" data-en="Destination" data-vi="Điểm đến">Điểm đến</p>
                                <p class="font-semibold text-gray-800">${tour.destination_city || (isVietnamese ? 'Chưa xác định' : 'Not specified')}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <div class="flex items-center">
                            <div class="bg-purple-500 rounded-full p-2 mr-3">
                                <i class="fas fa-route text-white text-sm"></i>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600" data-en="Activities" data-vi="Hoạt động">Hoạt động</p>
                                <p class="font-semibold text-gray-800">${activitiesText}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Budget breakdown preview -->
                <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <i class="fas fa-wallet text-amber-600 mr-3"></i>
                            <div>
                                <p class="text-sm text-gray-600" data-en="Budget Status" data-vi="Trạng thái ngân sách">Trạng thái ngân sách</p>
                                <p class="font-semibold text-gray-800">
                                    ${tour.budget && tour.total_estimated_cost ? 
                                        (tour.total_estimated_cost <= tour.budget ? 
                                            (isVietnamese ? 'Trong ngân sách' : 'Within budget') : 
                                            (isVietnamese ? 'Vượt ngân sách' : 'Over budget')
                                        ) : (isVietnamese ? 'Chưa xác định' : 'Not specified')
                                    }
                                </p>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-2xl font-bold text-amber-600">${budgetText}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Action buttons -->
                <div class="flex space-x-3">
                    <button onclick="showGeneratedTourDetailModal('${tourId}')" 
                            class="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                        <i class="fas fa-eye mr-2"></i>
                        <span data-en="See Details" data-vi="Xem chi tiết">Xem chi tiết</span>
                    </button>
                    <button onclick="bookTour('${tourId}')" 
                            class="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                        <i class="fas fa-calendar-check mr-2"></i>
                        <span data-en="Book Tour" data-vi="Đặt tour">Đặt tour</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// Show tour detail modal cho generated tours (khác với history tours)
function showGeneratedTourDetailModal(tourId) {
    console.log('🔍 Showing generated tour detail modal for tour ID:', tourId);
    
    // Get tour data from global storage
    const tourData = generatedToursData[tourId];
    if (!tourData) {
        console.error('❌ Tour data not found for ID:', tourId);
        return;
    }
    
    console.log('📊 Tour data loaded:', tourData);
    
    // Tạo modal nếu chưa có
    let modal = document.getElementById('generatedTourDetailModal');
    if (!modal) {
        createGeneratedTourDetailModal();
        modal = document.getElementById('generatedTourDetailModal');
    }
    
    if (!modal) return;
    
    // Reset content containers to ensure fresh content on every open
    const scheduleContainer = document.getElementById('generatedScheduleContainer');
    const costContainer = document.getElementById('generatedCostContainer');
    
    if (scheduleContainer) {
        scheduleContainer.innerHTML = '';
    }
    
    if (costContainer) {
        costContainer.innerHTML = '';
    }
    
    // Hiển thị thông tin tour
    displayGeneratedTourDetail(tourData);
}

// Show tour detail modal cho history tours (giữ nguyên function cũ)
function showTourDetailModal(tourId) {
    const modal = document.getElementById('tourHistoryDetailModal');
    if (!modal) return;
    
    // Load tour details
    loadTourDetail(tourId);
    
    // Show modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Load tour detail data
async function loadTourDetail(tourId) {
    try {
        const response = await fetch(`/api/tour-history/${tourId}`);
        if (response.ok) {
            const data = await response.json();
            displayTourDetail(data);
        }
    } catch (error) {
        console.error('Error loading tour detail:', error);
    }
}

/**
 * Tạo modal chi tiết cho generated tours
 */
function createGeneratedTourDetailModal() {
    const modalHTML = `
        <!-- Generated Tour Detail Modal -->
        <div id="generatedTourDetailModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden">
            <div class="flex items-center justify-center min-h-screen p-4">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
                    <!-- Modal Header -->
                    <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                        <div class="flex justify-between items-center">
                            <h2 id="generatedTourTitle" class="text-2xl font-bold">Chi Tiết Tour</h2>
                            <button onclick="closeGeneratedTourDetailModal()" class="text-white hover:text-blue-200 transition-colors">
                                <i class="fas fa-times text-2xl"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Modal Content -->
                    <div class="h-full max-h-[calc(90vh-100px)] overflow-y-auto">
                        <!-- Tour Overview -->
                        <div class="p-6 border-b bg-gray-50">
                            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div class="text-center">
                                    <div class="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                                        <i class="fas fa-map-marker-alt text-blue-600 text-xl"></i>
                                    </div>
                                    <p class="text-sm text-gray-600" data-en="Destination" data-vi="Điểm đến">Điểm đến</p>
                                    <p id="generatedDetailDestination" class="font-semibold text-gray-800">-</p>
                                </div>
                                <div class="text-center">
                                    <div class="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                                        <i class="fas fa-calendar text-purple-600 text-xl"></i>
                                    </div>
                                    <p class="text-sm text-gray-600" data-en="Duration" data-vi="Thời gian">Thời gian</p>
                                    <p id="generatedDetailDuration" class="font-semibold text-gray-800">-</p>
                                </div>
                                <div class="text-center">
                                    <div class="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                                        <i class="fas fa-users text-green-600 text-xl"></i>
                                    </div>
                                    <p class="text-sm text-gray-600" data-en="Guests" data-vi="Số khách">Số khách</p>
                                    <p id="generatedDetailGuests" class="font-semibold text-gray-800">-</p>
                                </div>
                                <div class="text-center">
                                    <div class="bg-amber-100 rounded-full p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                                        <i class="fas fa-dollar-sign text-amber-600 text-xl"></i>
                                    </div>
                                    <p class="text-sm text-gray-600" data-en="Total Cost" data-vi="Tổng chi phí">Tổng chi phí</p>
                                    <p id="generatedDetailTotalCost" class="font-semibold text-gray-800">-</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Tab Navigation -->
                        <div class="border-b">
                            <nav class="flex space-x-8 px-6">
                                <button id="scheduleTab" class="tab-button active py-4 px-2 text-blue-600 border-b-2 border-blue-600 font-medium" onclick="switchGeneratedTourTab('schedule')">
                                    <i class="fas fa-route mr-2"></i>
                                    <span data-en="Schedule" data-vi="Lịch trình">Lịch trình</span>
                                </button>
                                <button id="costTab" class="tab-button py-4 px-2 text-gray-500 border-b-2 border-transparent font-medium hover:text-gray-700" onclick="switchGeneratedTourTab('cost')">
                                    <i class="fas fa-calculator mr-2"></i>
                                    <span data-en="Cost Breakdown" data-vi="Chi phí chi tiết">Chi phí chi tiết</span>
                                </button>
                            </nav>
                        </div>
                        
                        <!-- Tab Content -->
                        <div class="p-6">
                            <!-- Schedule Tab Content -->
                            <div id="scheduleTabContent" class="tab-content">
                                <div id="generatedScheduleContainer">
                                    <!-- Schedule content will be populated here -->
                                </div>
                            </div>
                            
                            <!-- Cost Tab Content -->
                            <div id="costTabContent" class="tab-content hidden">
                                <div id="generatedCostContainer">
                                    <!-- Cost breakdown content will be populated here -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Thêm modal vào body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Đóng modal chi tiết tour generated
 */
function closeGeneratedTourDetailModal() {
    const modal = document.getElementById('generatedTourDetailModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Reset content containers to ensure fresh content on next open
        const scheduleContainer = document.getElementById('generatedScheduleContainer');
        const costContainer = document.getElementById('generatedCostContainer');
        
        if (scheduleContainer) {
            scheduleContainer.innerHTML = '';
        }
        
        if (costContainer) {
            costContainer.innerHTML = '';
        }
        
        // Clear cached data when closing modal
        currentGeneratedTourData = null;
        console.log('🗑️ Cleared cached tour data on modal close');
    }
}

// Store current tour data for tab switching
let currentGeneratedTourData = null;

/**
 * Chuyển đổi tab trong modal chi tiết tour generated
 * @param {string} tabName - Tên tab ('schedule' hoặc 'cost')
 */
function switchGeneratedTourTab(tabName) {
    console.log('🔄 Switching to tab:', tabName);
    
    // Lưu tab active hiện tại để có thể quay lại sau khi xem chi tiết địa điểm
    window.lastActiveTab = tabName;
    
    // Cache current tour data if not already cached
    if (!currentGeneratedTourData) {
        console.warn('⚠️ No cached tour data found, tab content may be lost');
        return;
    }
    
    // Add smooth transition
    const allContents = document.querySelectorAll('#generatedTourDetailModal .tab-content');
    allContents.forEach(content => {
        content.style.opacity = '0';
        content.style.transition = 'opacity 0.3s ease';
    });
    
    // Wait for fade out, then switch content
    setTimeout(() => {
        // Ẩn tất cả tab content
        allContents.forEach(content => {
            content.classList.add('hidden');
        });
        
        // Bỏ active class khỏi tất cả tab buttons
        document.querySelectorAll('#generatedTourDetailModal .tab-button').forEach(button => {
            button.classList.remove('active', 'text-blue-600', 'border-blue-600');
            button.classList.add('text-gray-500', 'border-transparent');
        });
        
        // Hiển thị tab content được chọn
        const targetContent = document.getElementById(tabName + 'TabContent');
        if (targetContent) {
            targetContent.classList.remove('hidden');
            
            // Re-populate content if needed
            if (tabName === 'schedule') {
                const scheduleContainer = document.getElementById('generatedScheduleContainer');
                if (scheduleContainer && (!scheduleContainer.innerHTML || scheduleContainer.innerHTML.trim() === '')) {
                    console.log('🔄 Re-generating schedule content');
                    generateScheduleContent(currentGeneratedTourData.schedule || []);
                }
            } else if (tabName === 'cost') {
                const costContainer = document.getElementById('generatedCostContainer');
                if (costContainer && (!costContainer.innerHTML || costContainer.innerHTML.trim() === '')) {
                    console.log('🔄 Re-generating cost content');
                    // Gọi hàm generateCostBreakdownContent() trực tiếp mà không phụ thuộc vào tour-history.js
                    generateCostBreakdownContent(currentGeneratedTourData);
                }
            }
            
            // Fade in the new content
            targetContent.style.opacity = '1';
        }
        
        // Thêm active class vào tab button được chọn
        const targetButton = document.getElementById(tabName + 'Tab');
        if (targetButton) {
            targetButton.classList.add('active', 'text-blue-600', 'border-blue-600');
            targetButton.classList.remove('text-gray-500', 'border-transparent');
        }
    }, 150);
}

/**
 * Hiển thị chi tiết tour generated trong modal
 * @param {Object} tour - Dữ liệu tour từ API response
 */
function displayGeneratedTourDetail(tour) {
    console.log('📋 Displaying generated tour detail:', tour);
    
    // Cache tour data for tab switching persistence
    currentGeneratedTourData = tour;
    console.log('💾 Cached tour data for tab persistence');
    
    // Update modal title
    document.getElementById('generatedTourTitle').textContent = `${tour.destination_city || 'Tour'} - Chi Tiết`;
    
    // Update overview info
    document.getElementById('generatedDetailDestination').textContent = tour.destination_city || '-';
    document.getElementById('generatedDetailDuration').textContent = tour.duration_days ? `${tour.duration_days} ngày` : '-';
    document.getElementById('generatedDetailGuests').textContent = tour.guest_count || '-';
    document.getElementById('generatedDetailTotalCost').textContent = tour.total_estimated_cost ? `$${tour.total_estimated_cost.toLocaleString()}` : '-';
    
    // Reset tab to schedule first
    const scheduleTab = document.getElementById('scheduleTab');
    const costTab = document.getElementById('costTab');
    const scheduleContent = document.getElementById('scheduleTabContent');
    const costContent = document.getElementById('costTabContent');
    
    if (scheduleTab && costTab && scheduleContent && costContent) {
        // Reset all tabs
        scheduleTab.classList.add('active', 'text-blue-600', 'border-blue-600');
        scheduleTab.classList.remove('text-gray-500', 'border-transparent');
        
        costTab.classList.remove('active', 'text-blue-600', 'border-blue-600');
        costTab.classList.add('text-gray-500', 'border-transparent');
        
        scheduleContent.classList.remove('hidden');
        costContent.classList.add('hidden');
        
        scheduleContent.style.opacity = '1';
        costContent.style.opacity = '0';
    }
    
    // Generate schedule content (always populate first)
    generateScheduleContent(tour.schedule || []);
    
    // Pre-generate cost breakdown content but don't show yet
    generateCostBreakdownContent(tour);
    
    // Show the modal
    const modal = document.getElementById('generatedTourDetailModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scrolling of background
    }
    
    console.log('✅ Tour detail display completed with tab persistence setup');
}

// Display tour detail in modal (cho history tours - giữ nguyên)
function displayTourDetail(tour) {
    // Update modal title
    document.getElementById('modalTourTitle').textContent = `${tour.destination_city} Tour Details`;
    
    // Update overview info
    document.getElementById('detailDestination').textContent = tour.destination_city || '-';
    document.getElementById('detailDuration').textContent = tour.duration_days ? `${tour.duration_days} days` : '-';
    document.getElementById('detailGuests').textContent = tour.guest_count || '-';
    document.getElementById('detailTotalCost').textContent = tour.total_estimated_cost ? `$${tour.total_estimated_cost.toLocaleString()}` : '-';
    
    // Update budget info
    document.getElementById('targetBudget').textContent = tour.target_budget ? `$${tour.target_budget.toLocaleString()}` : '$0';
}

/**
 * Tạo nội dung lịch trình dựa trên JSON schedule từ API
 * @param {Array} schedule - Mảng các ngày trong tour
 */
function generateScheduleContent(schedule) {
    const container = document.getElementById('generatedScheduleContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!schedule || schedule.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">Không có lịch trình nào được tìm thấy</p>';
        return;
    }
    
    // Tạo lịch trình cho từng ngày
    schedule.forEach(dayData => {
        const dayElement = createDayScheduleElement(dayData);
        container.appendChild(dayElement);
    });
}

/**
 * Tạo element cho lịch trình một ngày
 * @param {Object} dayData - Dữ liệu của một ngày
 * @returns {HTMLElement} Element của ngày
 */
function createDayScheduleElement(dayData) {
    const dayElement = document.createElement('div');
    dayElement.className = 'schedule-day mb-6';
    dayElement.id = `generated-day-${dayData.day}`;
    
    dayElement.innerHTML = `
        <div class="schedule-day-header bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4 cursor-pointer" 
             onclick="toggleGeneratedScheduleDay('generated-day-${dayData.day}')">
            <div class="day-header-content flex items-center justify-between">
                <div class="flex items-center">
                    <div class="day-badge bg-white text-blue-600 rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg mr-4">
                        ${dayData.day}
                    </div>
                    <h3 class="font-semibold text-xl">Ngày ${dayData.day}</h3>
                </div>
                <div class="schedule-day-toggle">
                    <i class="fas fa-chevron-down transition-transform duration-300"></i>
                </div>
            </div>
        </div>
        
        <div class="schedule-day-content" style="display: none; opacity: 0; max-height: 0px;">
            <div class="timeline-container mt-4">
                ${generateActivitiesTimeline(dayData.activities)}
            </div>
        </div>
    `;
    
    return dayElement;
}

/**
 * Tạo timeline cho các hoạt động trong ngày
 * @param {Array} activities - Mảng các hoạt động trong ngày
 * @returns {string} HTML string của timeline
 */
function generateActivitiesTimeline(activities) {
    if (!activities || activities.length === 0) {
        return '<p class="text-gray-500 text-center py-4">Không có hoạt động nào trong ngày này</p>';
    }
    
    let timelineHTML = '';
    
    activities.forEach((activity, index) => {
        const isLastItem = index === activities.length - 1;
        const placeTypeInfo = getPlaceTypeInfo(activity.type);
        
        timelineHTML += `
            <div class="timeline-item ${isLastItem ? 'last-item' : ''}">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <div class="activity-card bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div class="activity-time text-blue-600 font-medium mb-2">
                            <i class="fas fa-clock mr-2"></i>
                            ${activity.start_time} - ${activity.end_time}
                        </div>
                        <div class="activity-description mb-3">
                            <span>${placeTypeInfo.actionText}</span> 
                            <a href="#" class="text-blue-600 hover:underline font-medium" 
                               onclick="showPlaceDetails('${activity.type}', '${activity.place_id}')">
                                ${activity.place_name}
                            </a>
                            <span class="place-type-badge place-type-${activity.type} ml-2">
                                <i class="${placeTypeInfo.icon} mr-1"></i>
                                ${placeTypeInfo.label}
                            </span>
                        </div>
                        <div class="activity-cost text-green-600 font-medium">
                            <i class="fas fa-tag mr-2"></i>
                            <span data-en="Cost" data-vi="Chi phí">Chi phí:</span> 
                            $${activity.cost}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    return timelineHTML;
}

/**
 * Lấy thông tin hiển thị cho từng loại địa điểm
 * @param {string} placeType - Loại địa điểm (activity, hotel, restaurant, transport)
 * @returns {Object} Thông tin hiển thị
 */
function getPlaceTypeInfo(placeType) {
    const typeMap = {
        'activity': {
            actionText: 'Đi đến',
            icon: 'fas fa-map-marker-alt',
            label: 'Hoạt động'
        },
        'hotel': {
            actionText: 'Nghỉ ngơi tại',
            icon: 'fas fa-hotel',
            label: 'Khách sạn'
        },
        'restaurant': {
            actionText: 'Dùng bữa tại',
            icon: 'fas fa-utensils',
            label: 'Nhà hàng'
        },
        'transport': {
            actionText: 'Di chuyển bằng',
            icon: 'fas fa-car',
            label: 'Vận chuyển'
        }
    };
    
    return typeMap[placeType] || {
        actionText: 'Đến',
        icon: 'fas fa-map-marker-alt',
        label: 'Địa điểm'
    };
}

/**
 * Toggle hiển thị chi tiết một ngày trong lịch trình generated
 * @param {string} dayId - ID của ngày
 */
function toggleGeneratedScheduleDay(dayId) {
    const dayElement = document.getElementById(dayId);
    if (!dayElement) return;
    
    const content = dayElement.querySelector('.schedule-day-content');
    const toggle = dayElement.querySelector('.schedule-day-toggle i');
    
    if (!content || !toggle) return;
    
    const isVisible = content.style.display !== 'none';
    
    if (isVisible) {
        // Hide content
        content.style.opacity = '0';
        content.style.maxHeight = '0px';
        setTimeout(() => {
            content.style.display = 'none';
        }, 300);
        toggle.style.transform = 'rotate(0deg)';
    } else {
        // Show content
        content.style.display = 'block';
        setTimeout(() => {
            content.style.opacity = '1';
            content.style.maxHeight = '1000px';
        }, 10);
        toggle.style.transform = 'rotate(180deg)';
    }
}

/**
 * Tạo nội dung chi phí chi tiết
 * @param {Object} tour - Dữ liệu tour
 */
function generateCostBreakdownContent(tour) {
    const container = document.getElementById('generatedCostContainer');
    if (!container) return;
    
    // Tính toán chi phí theo từng loại
    const costBreakdown = calculateCostBreakdown(tour.schedule || []);
    
    container.innerHTML = `
        <div class="space-y-6">
            <!-- Tổng quan chi phí -->
            <div class="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-2xl font-bold text-green-800 mb-2">Tổng Chi Phí</h3>
                        <p class="text-green-600">Chi phí ước tính cho toàn bộ tour</p>
                    </div>
                    <div class="text-right">
                        <div class="text-4xl font-bold text-green-600">$${tour.total_estimated_cost?.toLocaleString() || '0'}</div>
                        <div class="text-sm text-green-500">Cho ${tour.guest_count || 0} khách</div>
                    </div>
                </div>
            </div>
            
            <!-- Chi phí theo loại -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                ${generateCostCategoryCard('Khách sạn', costBreakdown.hotel, 'fas fa-hotel', 'blue')}
                ${generateCostCategoryCard('Nhà hàng', costBreakdown.restaurant, 'fas fa-utensils', 'orange')}
                ${generateCostCategoryCard('Hoạt động', costBreakdown.activity, 'fas fa-map-marker-alt', 'purple')}
                ${generateCostCategoryCard('Vận chuyển', costBreakdown.transport, 'fas fa-car', 'indigo')}
            </div>
            
            <!-- Chi phí theo ngày -->
            <div class="bg-white border border-gray-200 rounded-xl p-6">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Chi Phí Theo Ngày</h3>
                <div class="space-y-3">
                    ${generateDailyCostBreakdown(tour.schedule || [])}
                </div>
            </div>
            
            <!-- Ngân sách so sánh -->
            ${tour.budget ? generateBudgetComparison(tour.budget, tour.total_estimated_cost) : ''}
        </div>
    `;
}

/**
 * Tính toán chi phí theo từng loại
 * @param {Array} schedule - Lịch trình tour
 * @returns {Object} Chi phí theo loại
 */
function calculateCostBreakdown(schedule) {
    const breakdown = {
        hotel: 0,
        restaurant: 0,
        activity: 0,
        transport: 0
    };
    
    schedule.forEach(day => {
        day.activities.forEach(activity => {
            if (breakdown.hasOwnProperty(activity.type)) {
                breakdown[activity.type] += activity.cost || 0;
            }
        });
    });
    
    return breakdown;
}

/**
 * Tạo card cho từng loại chi phí
 */
function generateCostCategoryCard(title, amount, icon, color) {
    return `
        <div class="bg-${color}-50 border border-${color}-200 rounded-lg p-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <div class="bg-${color}-500 rounded-full p-3 mr-4">
                        <i class="${icon} text-white"></i>
                    </div>
                    <div>
                        <h4 class="font-semibold text-gray-800">${title}</h4>
                        <p class="text-sm text-gray-600">Chi phí ${title.toLowerCase()}</p>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-2xl font-bold text-${color}-600">$${amount.toLocaleString()}</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Tạo chi phí theo ngày
 */
function generateDailyCostBreakdown(schedule) {
    if (!schedule || schedule.length === 0) {
        return '<p class="text-gray-500 text-center">Không có dữ liệu chi phí theo ngày</p>';
    }
    
    return schedule.map(day => {
        const dayTotal = day.activities.reduce((sum, activity) => sum + (activity.cost || 0), 0);
        return `
            <div class="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div class="flex items-center">
                    <div class="bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center font-bold text-gray-600 mr-3">
                        ${day.day}
                    </div>
                    <div>
                        <h5 class="font-medium text-gray-800">Ngày ${day.day}</h5>
                        <p class="text-sm text-gray-500">${day.activities.length} hoạt động</p>
                    </div>
                </div>
                <div class="text-xl font-semibold text-gray-800">$${dayTotal.toLocaleString()}</div>
            </div>
        `;
    }).join('');
}

/**
 * Tạo so sánh ngân sách
 */
function generateBudgetComparison(budget, actualCost) {
    const difference = budget - actualCost;
    const isOverBudget = difference < 0;
    
    return `
        <div class="bg-${isOverBudget ? 'red' : 'green'}-50 border border-${isOverBudget ? 'red' : 'green'}-200 rounded-xl p-6">
            <h3 class="text-xl font-bold text-gray-800 mb-4">So Sánh Ngân Sách</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="text-center">
                    <p class="text-sm text-gray-600 mb-1">Ngân sách dự kiến</p>
                    <p class="text-2xl font-bold text-blue-600">$${budget.toLocaleString()}</p>
                </div>
                <div class="text-center">
                    <p class="text-sm text-gray-600 mb-1">Chi phí thực tế</p>
                    <p class="text-2xl font-bold text-purple-600">$${actualCost.toLocaleString()}</p>
                </div>
                <div class="text-center">
                    <p class="text-sm text-gray-600 mb-1">${isOverBudget ? 'Vượt ngân sách' : 'Tiết kiệm'}</p>
                    <p class="text-2xl font-bold text-${isOverBudget ? 'red' : 'green'}-600">
                        ${isOverBudget ? '+' : '-'}$${Math.abs(difference).toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
    `;
}

// Book tour function
function bookTour(tourId) {
    // Implementation for booking tour
    console.log('Booking tour:', tourId);
    showNotification('Booking functionality coming soon!', 'info', 3000);
}

// Initialize tour form when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Tour Form on DOM load...');
    initializeTourForm();
});