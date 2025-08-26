// Advanced Restaurant Form with Google Maps Extended Components
// Quản lý form nhà hàng nâng cao với Google Maps Extended Components

class RestaurantFormManager {
    constructor() {
        this.placesService = null;
        this.geocoder = null;
        this.autocompleteService = null;
        this.countryTimeout = null;
        this.cityTimeout = null;
        this.placesAutocomplete = null;
        this.mapInstance = null;
        this.markerInstance = null;
        
        // Address component mapping (similar to Google's example)
        this.ADDRESS_COMPONENT_TYPES = {
            'street_number': 'short_name',
            'route': 'long_name',
            'locality': 'long_name', // City
            'administrative_area_level_1': 'short_name', // State/Province
            'country': 'long_name',
            'postal_code': 'short_name'
        };
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Restaurant Form Manager...');
        
        // Wait for Google Maps to load
        await this.waitForGoogleMaps();
        
        // Initialize Google Maps services
        this.initializeGoogleMapsServices();
        
        // Initialize form handlers
        this.initializeFormHandlers();
    }

    waitForGoogleMaps() {
        return new Promise((resolve) => {
            if (window.google && window.google.maps) {
                resolve();
                return;
            }
            
            // Load Google Maps script if not already loaded
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDUDTg2qpuIh3Yf0b80T0aViBmP2Dv1x7s&libraries=places`;
            script.onload = resolve;
            script.onerror = (error) => {
                console.error('❌ Error loading Google Maps script:', error);
                alert('Không thể tải Google Maps. Vui lòng kiểm tra kết nối mạng và cấu hình API key.');
                resolve(); // Resolve anyway to prevent hanging
            };
            document.head.appendChild(script);
        });
    }

    initializeGoogleMapsServices() {
        if (!window.google || !window.google.maps) {
            console.error('❌ Google Maps not loaded');
            this.showApiError('Không thể tải Google Maps. Vui lòng kiểm tra kết nối mạng và cấu hình API key.');
            return;
        }

        try {
            this.autocompleteService = new google.maps.places.AutocompleteService();
            this.geocoder = new google.maps.Geocoder();
            console.log('✅ Google Maps services initialized');
        } catch (error) {
            console.error('❌ Error initializing Google Maps services:', error);
            this.showApiError(`Lỗi khởi tạo dịch vụ Google Maps: ${error.message}. Vui lòng bật Places API trong Google Cloud Console.`);
        }
    }
    
    showApiError(message) {
        // Create error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-md z-50';
        errorDiv.innerHTML = `
            <div class="flex items-center">
                <svg class="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                </svg>
                <div>
                    <p>${message}</p>
                    <a href="https://developers.google.com/maps/documentation/javascript/error-messages#api-target-blocked-map-error" 
                       target="_blank" class="underline">Xem hướng dẫn khắc phục</a>
                </div>
            </div>
        `;
        document.body.appendChild(errorDiv);
        
        // Auto remove after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 10000);
    }

    initializeFormHandlers() {
        // Country autocomplete
        this.setupCountryAutocomplete();
        
        // City autocomplete
        this.setupCityAutocomplete();
        
        // Location search
        this.setupLocationSearch();
        
        // Clear location button
        this.setupClearLocationButton();
        
        // Form submission handler
        this.setupFormSubmission();
    }

    setupCountryAutocomplete() {
        const countryInput = document.getElementById('countryInput');
        const countryDropdown = document.getElementById('countryAutocomplete');
        const countryResults = document.getElementById('countryResults');

        if (!countryInput || !countryDropdown || !countryResults) return;

        countryInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            clearTimeout(this.countryTimeout);
            
            if (query.length < 2) {
                countryDropdown.classList.add('hidden');
                return;
            }

            this.countryTimeout = setTimeout(() => {
                this.searchCountries(query, countryResults, countryDropdown);
            }, 300);
        });

        // Hide dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!countryInput.contains(e.target) && !countryDropdown.contains(e.target)) {
                countryDropdown.classList.add('hidden');
            }
        });
    }

    setupCityAutocomplete() {
        const cityInput = document.getElementById('cityInput');
        const cityDropdown = document.getElementById('cityAutocomplete');
        const cityResults = document.getElementById('cityResults');

        if (!cityInput || !cityDropdown || !cityResults) return;

        cityInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            const country = document.getElementById('countryInput')?.value || '';
            
            clearTimeout(this.cityTimeout);
            
            if (query.length < 2) {
                cityDropdown.classList.add('hidden');
                return;
            }

            this.cityTimeout = setTimeout(() => {
                this.searchCities(query, country, cityResults, cityDropdown);
            }, 300);
        });

        // Hide dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!cityInput.contains(e.target) && !cityDropdown.contains(e.target)) {
                cityDropdown.classList.add('hidden');
            }
        });
    }

    setupLocationSearch() {
        const locationInput = document.getElementById('locationSearchInput');
        if (!locationInput) return;

        try {
            // Initialize Places Autocomplete with enhanced options
            this.placesAutocomplete = new google.maps.places.Autocomplete(locationInput, {
                types: ['establishment', 'geocode'],
                fields: ['address_components', 'geometry', 'name', 'formatted_address', 'place_id']
            });

            // Add listener for place selection
            this.placesAutocomplete.addListener('place_changed', () => {
                const place = this.placesAutocomplete.getPlace();
                
                if (!place.geometry || !place.geometry.location) {
                    console.warn('⚠️ No details available for this place');
                    this.showLocationError('Không có thông tin chi tiết cho địa điểm này');
                    return;
                }

                // Fill address components automatically (inspired by Google's example)
                this.fillAddressComponents(place);
                
                // Update coordinates
                this.updateCoordinates(place.geometry.location);
                
                // Update map preview if available
                this.updateMapPreview(place);
                
                // Update status
                this.updateLocationStatus(
                    place.geometry.location.lat(), 
                    place.geometry.location.lng(), 
                    place.formatted_address || place.name
                );
            });
            
            // Add enhanced input handlers
            this.setupLocationInputHandlers(locationInput);
            
        } catch (error) {
            console.error('❌ Error initializing Places Autocomplete:', error);
            this.showLocationError(`Lỗi khởi tạo Google Places API: ${error.message}`);
            return;
        }
    }

    fillAddressComponents(place) {
        if (!place.address_components) return;

        // Create address component map
        const addressComponents = {};
        place.address_components.forEach(component => {
            const componentType = component.types[0];
            if (this.ADDRESS_COMPONENT_TYPES[componentType]) {
                const nameType = this.ADDRESS_COMPONENT_TYPES[componentType];
                addressComponents[componentType] = component[nameType];
            }
        });

        // Auto-fill country field if exists
        const countryInput = document.getElementById('countryInput');
        if (countryInput && addressComponents.country) {
            countryInput.value = addressComponents.country;
        }

        // Auto-fill city field if exists
        const cityInput = document.getElementById('cityInput');
        if (cityInput && addressComponents.locality) {
            cityInput.value = addressComponents.locality;
            // Auto-generate city ID
            this.generateCityId(addressComponents.locality);
        }

        // Create formatted address for display
        const formattedAddress = this.createFormattedAddress(addressComponents, place);
        document.getElementById('selectedAddressDisplay').value = formattedAddress;

        console.log('📍 Address components filled:', addressComponents);
    }

    createFormattedAddress(components, place) {
        const parts = [];
        
        // Add establishment name if available
        if (place.name && place.name !== place.formatted_address) {
            parts.push(place.name);
        }
        
        // Add street address
        if (components.street_number && components.route) {
            parts.push(`${components.street_number} ${components.route}`);
        } else if (components.route) {
            parts.push(components.route);
        }
        
        // Add city
        if (components.locality) {
            parts.push(components.locality);
        }
        
        // Add state/province
        if (components.administrative_area_level_1) {
            parts.push(components.administrative_area_level_1);
        }
        
        // Add postal code
        if (components.postal_code) {
            parts.push(components.postal_code);
        }
        
        // Add country
        if (components.country) {
            parts.push(components.country);
        }
        
        return parts.join(', ') || place.formatted_address || 'Unknown Address';
    }

    updateCoordinates(location) {
        const lat = location.lat();
        const lng = location.lng();
        
        document.getElementById('latitudeInput').value = lat.toFixed(8);
        document.getElementById('longitudeInput').value = lng.toFixed(8);
    }

    updateMapPreview(place) {
        const mapContainer = document.getElementById('mapPreviewContainer');
        const mapPreview = document.getElementById('mapPreview');
        
        if (!mapContainer || !mapPreview) return;
        
        try {
            // Show map preview container
            mapContainer.classList.remove('hidden');
            
            // Initialize or update map
            if (!this.mapInstance) {
                this.mapInstance = new google.maps.Map(mapPreview, {
                    zoom: 15,
                    center: place.geometry.location,
                    mapTypeId: google.maps.MapTypeId.ROADMAP,
                    disableDefaultUI: true,
                    zoomControl: true,
                    gestureHandling: 'cooperative'
                });
                
                this.markerInstance = new google.maps.Marker({
                    position: place.geometry.location,
                    map: this.mapInstance,
                    title: place.name || 'Selected Location'
                });
            } else {
                // Update existing map
                this.mapInstance.setCenter(place.geometry.location);
                this.markerInstance.setPosition(place.geometry.location);
                this.markerInstance.setTitle(place.name || 'Selected Location');
            }
            
            console.log('🗺️ Map preview updated:', {
                name: place.name,
                address: place.formatted_address,
                location: place.geometry.location.toString()
            });
            
        } catch (error) {
            console.error('❌ Error updating map preview:', error);
            // Hide map container on error
            mapContainer.classList.add('hidden');
        }
    }

    setupLocationInputHandlers(locationInput) {
        // Show loading indicator when user types
        locationInput.addEventListener('input', () => {
            const spinner = document.getElementById('locationSearchSpinner');
            if (spinner) {
                spinner.classList.remove('hidden');
                // Hide spinner after delay to show activity
                setTimeout(() => {
                    spinner.classList.add('hidden');
                }, 1500);
            }
        });

        // Clear everything when input is cleared
        locationInput.addEventListener('input', (e) => {
            if (!e.target.value.trim()) {
                this.clearLocationData();
            }
        });
    }

    clearLocationData() {
        document.getElementById('latitudeInput').value = '';
        document.getElementById('longitudeInput').value = '';
        document.getElementById('selectedAddressDisplay').value = '';
        
        // Hide map preview
        const mapContainer = document.getElementById('mapPreviewContainer');
        if (mapContainer) {
            mapContainer.classList.add('hidden');
        }
        
        // Reset status
        const status = document.getElementById('locationStatus');
        if (status) {
            const currentLang = window.currentLanguage || 'en';
            const message = currentLang === 'vi' 
                ? 'Tìm kiếm địa điểm để lấy tọa độ'
                : 'Search for a location to get coordinates';
            
            status.innerHTML = `<span>${message}</span>`;
            status.className = 'text-sm text-blue-600 mt-2';
        }
    }

    showLocationError(message) {
        const status = document.getElementById('locationStatus');
        if (status) {
            status.innerHTML = `<i class="fas fa-exclamation-triangle mr-1 text-red-500"></i>${message}`;
            status.className = 'text-sm text-red-600 mt-2';
        }
    }

    }

    searchCountries(query, resultsContainer, dropdown) {
        if (!this.autocompleteService) {
            console.error('❌ AutocompleteService not initialized');
            return;
        }

        const request = {
            input: query,
            types: ['(regions)'],
            componentRestrictions: { country: [] } // Search all countries
        };

        this.autocompleteService.getPlacePredictions(request, (predictions, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                this.displayCountryResults(predictions, resultsContainer, dropdown);
            } else {
                dropdown.classList.add('hidden');
            }
        });
    }

    searchCities(query, country, resultsContainer, dropdown) {
        if (!this.autocompleteService) {
            console.error('❌ AutocompleteService not initialized');
            return;
        }

        let searchQuery = query;
        if (country) {
            searchQuery += `, ${country}`;
        }

        const request = {
            input: searchQuery,
            types: ['(cities)']
        };

        this.autocompleteService.getPlacePredictions(request, (predictions, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                this.displayCityResults(predictions, resultsContainer, dropdown);
            } else {
                dropdown.classList.add('hidden');
            }
        });
    }

    displayCountryResults(predictions, container, dropdown) {
        container.innerHTML = '';

        predictions.slice(0, 5).forEach(prediction => {
            const item = document.createElement('div');
            item.className = 'px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors';
            
            const countryName = prediction.structured_formatting.main_text;
            
            item.innerHTML = `
                <div class="flex items-center">
                    <i class="fas fa-globe text-blue-500 mr-3"></i>
                    <div>
                        <div class="font-medium text-gray-800">${countryName}</div>
                        <div class="text-sm text-gray-500">${prediction.description}</div>
                    </div>
                </div>
            `;

            item.addEventListener('click', () => {
                document.getElementById('countryInput').value = countryName;
                dropdown.classList.add('hidden');
                
                // Clear city when country changes
                document.getElementById('cityInput').value = '';
                document.getElementById('cityIdInput').value = '';
            });

            container.appendChild(item);
        });

        dropdown.classList.remove('hidden');
    }

    displayCityResults(predictions, container, dropdown) {
        container.innerHTML = '';

        predictions.slice(0, 5).forEach(prediction => {
            const item = document.createElement('div');
            item.className = 'px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors';
            
            const cityName = prediction.structured_formatting.main_text;
            
            item.innerHTML = `
                <div class="flex items-center">
                    <i class="fas fa-map-marker-alt text-blue-500 mr-3"></i>
                    <div>
                        <div class="font-medium text-gray-800">${cityName}</div>
                        <div class="text-sm text-gray-500">${prediction.description}</div>
                    </div>
                </div>
            `;

            item.addEventListener('click', () => {
                document.getElementById('cityInput').value = cityName;
                dropdown.classList.add('hidden');
                
                // Auto-generate city_id (you can modify this logic as needed)
                this.generateCityId(cityName);
            });

            container.appendChild(item);
        });

        dropdown.classList.remove('hidden');
    }

    generateCityId(cityName) {
        // Simple city ID generation based on city name hash
        // You can replace this with a proper database lookup
        let hash = 0;
        for (let i = 0; i < cityName.length; i++) {
            const char = cityName.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        const cityId = Math.abs(hash % 10000) + 1; // Ensure positive number between 1-10000
        document.getElementById('cityIdInput').value = cityId;
        
        console.log(`🆔 Generated city ID: ${cityId} for city: ${cityName}`);
    }

    updateLocationStatus(lat, lng, address) {
        const status = document.getElementById('locationStatus');
        if (status) {
            const currentLang = window.currentLanguage || 'en';
            const message = currentLang === 'vi' 
                ? `Địa điểm đã chọn: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
                : `Location selected: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            
            status.innerHTML = `<i class="fas fa-check-circle mr-1 text-green-500"></i>${message}`;
            status.className = 'text-sm text-green-600 mt-2';
        }
    }

    setupClearLocationButton() {
        const clearBtn = document.getElementById('clearLocationBtn');
        if (!clearBtn) return;

        clearBtn.addEventListener('click', () => {
            // Clear location search
            const locationInput = document.getElementById('locationSearchInput');
            if (locationInput) locationInput.value = '';
            
            // Clear all location-related data
            this.clearLocationData();
            
            // Clear auto-filled address components
            const countryInput = document.getElementById('countryInput');
            const cityInput = document.getElementById('cityInput');
            const cityIdInput = document.getElementById('cityIdInput');
            
            if (countryInput) countryInput.value = '';
            if (cityInput) cityInput.value = '';
            if (cityIdInput) cityIdInput.value = '';
            
            console.log('🧹 Location data cleared');
        });
    }

    setupFormSubmission() {
        const form = document.getElementById('addRestaurantForm');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit(form);
        });
    }

    async handleFormSubmit(form) {
        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // Validate required fields
            if (!data.name || !data.country || !data.city) {
                this.showMessage('error', 'Please fill in all required fields', 'Vui lòng điền đầy đủ các trường bắt buộc');
                return;
            }

            // Auto-fill missing coordinates if possible
            if (!data.latitude || !data.longitude) {
                await this.autoFillCoordinates(data);
            }

            console.log('📤 Submitting restaurant data:', data);

            // Submit to API
            const response = await fetch('/api/admin/restaurants', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                this.showMessage('success', 'Restaurant added successfully!', 'Thêm nhà hàng thành công!');
                this.resetForm(form);
                this.closeModal();
            } else {
                this.showMessage('error', result.message || 'Failed to add restaurant', result.message || 'Không thể thêm nhà hàng');
            }

        } catch (error) {
            console.error('❌ Error submitting form:', error);
            this.showMessage('error', 'An error occurred', 'Đã xảy ra lỗi');
        }
    }

    async autoFillCoordinates(data) {
        if (!this.geocoder) return;

        const address = `${data.name}, ${data.city}, ${data.country}`;
        
        try {
            const result = await new Promise((resolve, reject) => {
                this.geocoder.geocode({ address }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                        resolve(results[0]);
                    } else {
                        reject(new Error('Geocoding failed'));
                    }
                });
            });

            const location = result.geometry.location;
            data.latitude = location.lat().toFixed(8);
            data.longitude = location.lng().toFixed(8);

            console.log(`📍 Auto-filled coordinates for ${data.name}: ${data.latitude}, ${data.longitude}`);

        } catch (error) {
            console.warn('⚠️ Could not auto-fill coordinates:', error);
        }
    }

    showMessage(type, enMessage, viMessage) {
        const currentLang = window.currentLanguage || 'en';
        const message = currentLang === 'vi' ? viMessage : enMessage;
        
        // You can implement a proper notification system here
        if (type === 'success') {
            alert('✅ ' + message);
        } else {
            alert('❌ ' + message);
        }
    }

    resetForm(form) {
        form.reset();
        
        // Clear hidden fields
        document.getElementById('cityIdInput').value = '';
        document.getElementById('latitudeInput').value = '';
        document.getElementById('longitudeInput').value = '';
        document.getElementById('selectedAddressDisplay').value = '';
        
        // Reset location search
        const locationInput = document.getElementById('locationSearchInput');
        if (locationInput) locationInput.value = '';
        
        // Reset status
        const status = document.getElementById('locationStatus');
        if (status) {
            const currentLang = window.currentLanguage || 'en';
            const message = currentLang === 'vi' 
                ? 'Tìm kiếm địa điểm để lấy tọa độ'
                : 'Search for a location to get coordinates';
            
            status.innerHTML = `<span>${message}</span>`;
            status.className = 'text-sm text-blue-600 mt-2';
        }
    }

    closeModal() {
        const modal = document.getElementById('addRestaurantModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
}

// Excel Restaurant Processor for batch import
class ExcelRestaurantProcessor {
    constructor() {
        this.geocoder = null;
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Excel Restaurant Processor...');
        
        // Wait for Google Maps to load
        await this.waitForGoogleMaps();
        
        // Setup Excel upload functionality
        this.setupExcelUpload();
    }

    waitForGoogleMaps() {
        return new Promise((resolve) => {
            if (window.google && window.google.maps) {
                this.geocoder = new google.maps.Geocoder();
                resolve();
                return;
            }
            
            // Check if the script is already being loaded
            if (document.querySelector('script[src*="maps.googleapis.com"]')) {
                const checkGoogleMaps = setInterval(() => {
                    if (window.google && window.google.maps) {
                        clearInterval(checkGoogleMaps);
                        this.geocoder = new google.maps.Geocoder();
                        resolve();
                    }
                }, 100);
                return;
            }
            
            // Load Google Maps script if not already loaded
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDUDTg2qpuIh3Yf0b80T0aViBmP2Dv1x7s&libraries=places`;
            script.onload = () => {
                this.geocoder = new google.maps.Geocoder();
                resolve();
            };
            document.head.appendChild(script);
        });
    }

    setupExcelUpload() {
        const fileInput = document.getElementById('excelFileInput');
        const dropZone = document.getElementById('excelDropZone');
        const uploadBtn = document.getElementById('uploadExcelBtn');

        if (!fileInput || !dropZone || !uploadBtn) {
            console.error('❌ Excel upload elements not found');
            return;
        }

        // File input change
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFile(file);
            }
        });

        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-blue-400', 'bg-blue-50');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('border-blue-400', 'bg-blue-50');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-blue-400', 'bg-blue-50');
            
            const file = e.dataTransfer.files[0];
            if (file) {
                this.handleFile(file);
            }
        });

        // Upload button
        uploadBtn.addEventListener('click', () => {
            this.processExcelFile();
        });

        console.log('✅ Excel upload handlers initialized');
    }

    handleFile(file) {
        if (!file.name.match(/\.(xlsx|xls)$/)) {
            alert('❌ Please select an Excel file (.xlsx or .xls)');
            return;
        }

        const uploadBtn = document.getElementById('uploadExcelBtn');
        if (uploadBtn) {
            uploadBtn.disabled = false;
        }
        console.log('📁 Excel file selected:', file.name);
    }

    async processExcelFile() {
        const fileInput = document.getElementById('excelFileInput');
        if (!fileInput || !fileInput.files[0]) {
            alert('❌ Please select an Excel file first');
            return;
        }

        const file = fileInput.files[0];
        
        try {
            // Show upload progress
            this.showUploadProgress(true, 10);
            
            // Read Excel file using FileReader
            const data = await this.readExcelFile(file);
            
            this.showUploadProgress(true, 40);
            
            // Process Excel data
            const restaurants = await this.parseExcelData(data);
            
            this.showUploadProgress(true, 70);
            
            // Auto-fill missing coordinates where necessary
            const processedRestaurants = await this.fillMissingCoordinates(restaurants);
            
            this.showUploadProgress(true, 90);
            
            // Send to server
            await this.submitRestaurants(processedRestaurants);
            
            this.showUploadProgress(false);
            
            // Show success message
            const currentLang = window.currentLanguage || 'en';
            const message = currentLang === 'vi'
                ? `Đã nhập thành công ${processedRestaurants.length} nhà hàng!`
                : `Successfully imported ${processedRestaurants.length} restaurants!`;
            
            alert('✅ ' + message);
            this.closeModal();
            
        } catch (error) {
            this.showUploadProgress(false);
            console.error('❌ Excel processing error:', error);
            alert('❌ ' + error.message);
        }
    }

    readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    // This would normally use a library like SheetJS/xlsx
                    // For this demo, we'll simulate the Excel parsing
                    console.log('📊 Excel file read, simulating parse...');
                    
                    // Simulate delay for demo
                    setTimeout(() => {
                        resolve(e.target.result);
                    }, 500);
                } catch (error) {
                    reject(new Error('Failed to parse Excel file'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read Excel file'));
            reader.readAsArrayBuffer(file);
        });
    }

    parseExcelData(data) {
        // In a real implementation, this would use SheetJS to parse the Excel file
        // For this demo, we'll return simulated data
        
        // Simulate 3 restaurants from Excel
        return Promise.resolve([
            {
                name: 'Phở Hà Nội',
                city_id: '', // Missing, will be auto-generated
                city: 'Hanoi',
                country: 'Vietnam',
                price_avg: 150000,
                cuisine_type: 'Vietnamese',
                rating: 4.7,
                latitude: '', // Missing, will be geocoded
                longitude: '', // Missing, will be geocoded
                description: 'Authentic Vietnamese noodle soup restaurant.'
            },
            {
                name: 'Sushi Tokyo',
                city_id: '', // Missing, will be auto-generated
                city: 'Ho Chi Minh City',
                country: 'Vietnam',
                price_avg: 250000,
                cuisine_type: 'Japanese',
                rating: 4.5,
                latitude: 10.7769,
                longitude: 106.7009,
                description: 'Premium Japanese sushi restaurant.'
            },
            {
                name: 'Bánh Mì Express',
                city_id: '', // Missing, will be auto-generated
                city: 'Da Nang',
                country: 'Vietnam',
                price_avg: 35000,
                cuisine_type: 'Vietnamese',
                rating: 4.3,
                latitude: '', // Missing, will be geocoded
                longitude: '', // Missing, will be geocoded
                description: 'Quick and delicious Vietnamese sandwiches.'
            }
        ]);
    }

    async fillMissingCoordinates(restaurants) {
        if (!this.geocoder) {
            console.warn('⚠️ Geocoder not available, skipping coordinate filling');
            return restaurants;
        }

        const processedRestaurants = [];
        
        for (const restaurant of restaurants) {
            // Generate city_id if missing
            if (!restaurant.city_id) {
                restaurant.city_id = this.generateCityId(restaurant.city);
            }
            
            // Geocode if coordinates are missing
            if (!restaurant.latitude || !restaurant.longitude) {
                try {
                    const address = `${restaurant.name}, ${restaurant.city}, ${restaurant.country}`;
                    const location = await this.geocodeAddress(address);
                    if (location) {
                        restaurant.latitude = location.lat.toFixed(8);
                        restaurant.longitude = location.lng.toFixed(8);
                        console.log(`📍 Geocoded ${restaurant.name}: ${restaurant.latitude}, ${restaurant.longitude}`);
                    }
                } catch (error) {
                    console.warn(`⚠️ Could not geocode ${restaurant.name}:`, error);
                }
            }
            
            processedRestaurants.push(restaurant);
        }
        
        return processedRestaurants;
    }

    generateCityId(cityName) {
        // Simple city ID generation based on city name hash
        // Same as in RestaurantFormManager
        let hash = 0;
        for (let i = 0; i < cityName.length; i++) {
            const char = cityName.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        return Math.abs(hash % 10000) + 1; // Ensure positive number between 1-10000
    }

    geocodeAddress(address) {
        return new Promise((resolve, reject) => {
            this.geocoder.geocode({ address }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    resolve(results[0].geometry.location);
                } else {
                    reject(new Error(`Geocoding failed for ${address}: ${status}`));
                }
            });
        });
    }

    async submitRestaurants(restaurants) {
        // In a real implementation, this would send to the API
        // For this demo, we'll simulate the API call
        
        console.log('📤 Submitting restaurants to API:', restaurants);
        
        // Simulate API delay
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('✅ API response: Successfully imported restaurants');
                resolve({ success: true, count: restaurants.length });
            }, 1000);
        });
    }

    showUploadProgress(show, percent = null) {
        const progress = document.getElementById('uploadProgress');
        const progressBar = document.getElementById('uploadProgressBar');
        const progressText = document.getElementById('uploadProgressText');

        if (!progress || !progressBar || !progressText) return;

        if (show) {
            progress.classList.remove('hidden');
            
            if (percent !== null) {
                progressBar.style.width = percent + '%';
                
                if (percent < 90) {
                    const currentLang = window.currentLanguage || 'en';
                    progressText.textContent = currentLang === 'vi'
                        ? `Đang xử lý... ${percent}%`
                        : `Processing... ${percent}%`;
                } else {
                    const currentLang = window.currentLanguage || 'en';
                    progressText.textContent = currentLang === 'vi'
                        ? 'Đang lưu dữ liệu...'
                        : 'Saving data...';
                }
            }
        } else {
            progress.classList.add('hidden');
            progressBar.style.width = '0%';
        }
    }

    closeModal() {
        const modal = document.getElementById('addRestaurantModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 Initializing restaurant form components...');
    new RestaurantFormManager();
    new ExcelRestaurantProcessor();
});