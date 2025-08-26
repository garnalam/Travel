/**
 * Restaurant Manager Script
 * Handles restaurant functionality including autocomplete for country/city, 
 * Google Maps integration for address search and coordinates, and Excel import
 */

document.addEventListener('DOMContentLoaded', function() {
    initRestaurantManager();
    
    // Xử lý form submit để đảm bảo city_id được điền
    const addRestaurantForm = document.getElementById('addRestaurantForm');
    if (addRestaurantForm) {
        addRestaurantForm.addEventListener('submit', function(e) {
            // Kiểm tra city_id
            const cityIdInput = document.getElementById('restaurant_city_id');
            const cityIdFallback = document.getElementById('restaurant_city_id_fallback');
            const cityInput = document.getElementById('restaurant_city');
            const countryInput = document.getElementById('restaurant_country');
            
            if (cityIdInput && cityIdInput.value === '' && cityInput && countryInput) {
                // Ngăn form submit ngay lập tức
                e.preventDefault();
                
                console.log('⚠️ Thiếu city_id, cố gắng lấy từ API trước khi submit');
                
                // Lấy city_id từ API
                fetch(`/api/cities/id?city=${encodeURIComponent(cityInput.value)}&country=${encodeURIComponent(countryInput.value)}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.city_id) {
                            // Nếu có city_id, điền vào form
                            cityIdInput.value = data.city_id;
                            if (cityIdFallback) cityIdFallback.value = data.city_id;
                            console.log(`✅ Đã lấy được city_id: ${data.city_id}`);
                            
                            // Tiếp tục submit form
                            addRestaurantForm.submit();
                        } else {
                            // Nếu không có city_id, sử dụng giá trị mặc định
                            cityIdInput.value = "1";
                            if (cityIdFallback) cityIdFallback.value = "1";
                            console.log('⚠️ Không tìm thấy city_id, sử dụng giá trị mặc định 1');
                            
                            // Tiếp tục submit form
                            addRestaurantForm.submit();
                        }
                    })
                    .catch(error => {
                        console.error('❌ Lỗi khi lấy city_id:', error);
                        // Vẫn tiếp tục với giá trị mặc định
                        cityIdInput.value = "1";
                        if (cityIdFallback) cityIdFallback.value = "1";
                        
                        // Tiếp tục submit form
                        addRestaurantForm.submit();
                    });
            } else if (cityIdInput && cityIdInput.value === '') {
                // Nếu không có thông tin thành phố, sử dụng giá trị mặc định
                cityIdInput.value = "1";
                if (cityIdFallback) cityIdFallback.value = "1";
                console.log('⚠️ Không có thông tin thành phố, sử dụng city_id mặc định 1');
            }
            // Trong các trường hợp khác, form sẽ submit bình thường
        });
    }
});

function initRestaurantManager() {
    // Initialize Google Maps & Places API for address search
    initGoogleMapsAndPlaces();

    // Initialize autocomplete for country and city
    initCountryCityAutocomplete();

    // Initialize ghost text autocomplete for cuisine type
    initCuisineTypeAutocomplete();

    // Excel import modifications - no need to include city_id, latitude, longitude
    initExcelUpload();
}

/**
 * Initialize ghost text autocomplete for cuisine type
 */
function initCuisineTypeAutocomplete() {
    const cuisineInput = document.getElementById('cuisine_type_input');
    const cuisineGhost = document.getElementById('cuisine_type_ghost');
    
    if (!cuisineInput || !cuisineGhost) return;
    
    // Timer for debouncing API calls
    let ghostTimer;
    
    // Add event listeners for cuisine type input
    cuisineInput.addEventListener('input', function() {
        const value = this.value.trim();
        
        // Clear previous ghost text
        cuisineGhost.value = '';
        
        // Don't make API calls for empty input or less than 2 characters
        if (value.length < 2) return;
        
        // Debounce API calls
        clearTimeout(ghostTimer);
        ghostTimer = setTimeout(() => {
            // Call API to get cuisine type suggestions
            fetch(`/api/ghost/cuisines?q=${encodeURIComponent(value)}`)
                .then(response => response.json())
                .then(data => {
                    if (data.suggestion) {
                        // Set ghost text only if current input matches the beginning of suggestion
                        if (data.suggestion.toLowerCase().startsWith(value.toLowerCase())) {
                            // Display suggestion as ghost text
                            const inputValue = cuisineInput.value;
                            cuisineGhost.value = inputValue + data.suggestion.substring(inputValue.length);
                            console.log(`✨ Ghost text: ${cuisineGhost.value}`);
                        }
                    }
                })
                .catch(error => {
                    console.error('Error fetching cuisine suggestions:', error);
                });
        }, 300);
    });
    
    // Handle tab key to accept ghost text suggestion
    cuisineInput.addEventListener('keydown', function(e) {
        if (e.key === 'Tab' && cuisineGhost.value) {
            e.preventDefault();
            this.value = cuisineGhost.value;
            cuisineGhost.value = '';
            console.log('✅ Accepted cuisine ghost text suggestion');
        }
    });
    
    // Handle right arrow key to accept ghost text suggestion
    cuisineInput.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowRight' && cuisineGhost.value && 
            this.selectionStart === this.value.length) {
            e.preventDefault();
            this.value = cuisineGhost.value;
            cuisineGhost.value = '';
            console.log('✅ Accepted cuisine ghost text suggestion with right arrow');
        }
    });
    
    // Clear ghost text on blur (when input loses focus)
    cuisineInput.addEventListener('blur', function() {
        setTimeout(() => {
            cuisineGhost.value = '';
        }, 100);
    });
    
    console.log('✅ Cuisine type autocomplete initialized');
}

/**
 * Initialize Google Maps and Places API for address search
 */
function initGoogleMapsAndPlaces() {
    // Check if we're on the add restaurant form page
    const addressSearchInput = document.getElementById('restaurant_address_search');
    const mapElement = document.getElementById('map');
    
    if (!addressSearchInput || !mapElement) return;

    let map;
    let marker;
    let placesAutocomplete;
    
    // Hiển thị trạng thái loading
    mapElement.innerHTML = '<div style="height: 100%; display: flex; align-items: center; justify-content: center; background-color: #f5f5f5; border-radius: 8px;"><div style="text-align: center;"><div style="margin-bottom: 10px;"><i class="fas fa-map-marked-alt text-3xl text-blue-500"></i></div><div>Đang tải Google Maps...</div></div></div>';

    // Initialize the map centered on Vietnam by default
    const defaultPosition = { lat: 16.0, lng: 106.0 }; // Center of Vietnam
    
    // Function to initialize Google Maps
    function initMap() {
        console.log('Initializing Google Maps...');
        
        // Create the map centered on default position
        map = new google.maps.Map(mapElement, {
            center: defaultPosition,
            zoom: 5,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false
        });

        // Create a marker that can be moved around
        marker = new google.maps.Marker({
            position: defaultPosition,
            map: map,
            draggable: true,
            animation: google.maps.Animation.DROP,
            title: 'Restaurant Location'
        });

        // When marker is dragged, update latitude and longitude fields
        google.maps.event.addListener(marker, 'dragend', function() {
            const position = marker.getPosition();
            updateCoordinateFields(position.lat(), position.lng());
        });

        // Thêm chức năng tìm kiếm địa điểm bằng Geocoding API
        const geocodeAddressBtn = document.getElementById('geocodeAddressBtn');
        if (geocodeAddressBtn) {
            geocodeAddressBtn.addEventListener('click', function() {
                geocodeAddress();
            });
            
            // Cho phép nhấn Enter để tìm kiếm
            addressSearchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    geocodeAddress();
                }
            });
        }
        
        // Hàm tìm kiếm địa chỉ sử dụng Geocoding API
        function geocodeAddress() {
            const address = addressSearchInput.value.trim();
            if (!address) {
                alert('Vui lòng nhập địa chỉ để tìm kiếm');
                return;
            }
            
            // Sử dụng Geocoding API của Google Maps
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ 'address': address }, function(results, status) {
                if (status === 'OK') {
                    if (results[0]) {
                        // Cập nhật vị trí trên bản đồ
                        map.setCenter(results[0].geometry.location);
                        map.setZoom(15);
                        
                        // Cập nhật vị trí marker
                        marker.setPosition(results[0].geometry.location);
                        
                        // Cập nhật trường tọa độ
                        updateCoordinateFields(
                            results[0].geometry.location.lat(),
                            results[0].geometry.location.lng()
                        );
                    }
                } else {
                    console.error('Geocoding không thành công:', status);
                    alert('Không thể tìm kiếm địa chỉ. Lỗi: ' + status);
                }
            });
        }
    }

    // Function to update latitude and longitude fields
    function updateCoordinateFields(lat, lng) {
        document.getElementById('restaurant_latitude').value = lat;
        document.getElementById('restaurant_longitude').value = lng;
    }
    
    // Cho phép cập nhật bản đồ khi người dùng nhập tọa độ thủ công
    const latitudeField = document.getElementById('restaurant_latitude');
    const longitudeField = document.getElementById('restaurant_longitude');
    
    if (latitudeField && longitudeField) {
        // Sự kiện khi người dùng thay đổi tọa độ
        function updateMapFromCoordinates() {
            const lat = parseFloat(latitudeField.value);
            const lng = parseFloat(longitudeField.value);
            
            if (!isNaN(lat) && !isNaN(lng)) {
                const newPosition = new google.maps.LatLng(lat, lng);
                marker.setPosition(newPosition);
                map.setCenter(newPosition);
                map.setZoom(15);
            }
        }
        
        // Sự kiện thay đổi với độ trễ để tránh cập nhật quá nhiều lần
        let timer;
        latitudeField.addEventListener('input', function() {
            clearTimeout(timer);
            timer = setTimeout(updateMapFromCoordinates, 1000);
        });
        
        longitudeField.addEventListener('input', function() {
            clearTimeout(timer);
            timer = setTimeout(updateMapFromCoordinates, 1000);
        });
    }

    // Load Google Maps API asynchronously
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
        console.log('Loading Google Maps API...');
        const script = document.createElement('script');
        
        // Thêm xử lý lỗi để hiển thị thông báo thân thiện hơn
        script.onerror = function() {
            console.error('Không thể tải Google Maps API. Vui lòng kiểm tra Google Cloud Console.');
            
            // Cập nhật phần tử bản đồ để hiển thị thông báo lỗi
            if (mapElement) {
                mapElement.innerHTML = `
                    <div style="height: 100%; display: flex; align-items: center; justify-content: center; background-color: #fee2e2; border-radius: 8px; padding: 20px;">
                        <div style="text-align: center;">
                            <div style="margin-bottom: 10px;">
                                <i class="fas fa-exclamation-triangle text-3xl text-red-500"></i>
                            </div>
                            <div class="font-medium text-red-700 mb-2">Lỗi tải Google Maps API</div>
                            <div class="text-sm text-red-600">
                                Lỗi: API key không được phép sử dụng Google Maps API<br>
                                Vui lòng bật Google Maps JavaScript API và Geocoding API trong Google Cloud Console
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // Hiển thị hướng dẫn trong console
            console.info('Để khắc phục lỗi Google Maps API:');
            console.info('1. Truy cập Google Cloud Console: https://console.cloud.google.com');
            console.info('2. Chọn dự án của bạn');
            console.info('3. Vào mục "APIs & Services" > "Library"');
            console.info('4. Tìm và kích hoạt: Google Maps JavaScript API và Google Maps Geocoding API');
            console.info('5. Nếu APIs đã được kích hoạt, kiểm tra API key của bạn có quyền sử dụng các API này không');
        };
        
        // Chỉ sử dụng Maps API, không cần Places API
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDUDTg2qpuIh3Yf0b80T0aViBmP2Dv1x7s&callback=initMap`;
        script.async = true;
        script.defer = true;
        
        // Define the callback function in the global scope
        window.initMap = initMap;
        
        document.head.appendChild(script);
    } else {
        // If Google Maps is already loaded, just initialize the map
        initMap();
    }
}

/**
 * Initialize autocomplete for country and city fields
 */
function initCountryCityAutocomplete() {
    // Check if we're on the add restaurant form
    const countryInput = document.getElementById('restaurant_country');
    const cityInput = document.getElementById('restaurant_city');
    const cityIdInput = document.getElementById('restaurant_city_id');
    const countryGhost = document.getElementById('country_ghost');
    const cityGhost = document.getElementById('city_ghost');
    
    if (!countryInput || !cityInput) return;
    
    // Timers for debouncing API calls
    let countryGhostTimer;
    let cityGhostTimer;
    
    // Country autocomplete with ghost text
    countryInput.addEventListener('input', function() {
        const value = this.value.trim();
        
        // Clear previous ghost text
        if (countryGhost) countryGhost.value = '';
        
        if (value.length < 2) {
            document.getElementById('countryAutocomplete').innerHTML = '';
            document.getElementById('countryAutocomplete').classList.add('hidden');
            return;
        }
        
        // Debounce ghost text API calls
        clearTimeout(countryGhostTimer);
        countryGhostTimer = setTimeout(() => {
            // Call API for ghost text suggestion
            fetch(`/api/ghost/countries?q=${encodeURIComponent(value)}`)
                .then(response => response.json())
                .then(data => {
                    if (data.suggestion && countryGhost) {
                        // Set ghost text only if current input matches the beginning of suggestion
                        if (data.suggestion.toLowerCase().startsWith(value.toLowerCase())) {
                            countryGhost.value = value + data.suggestion.substring(value.length);
                            console.log(`✨ Country ghost text: ${countryGhost.value}`);
                        }
                    }
                })
                .catch(error => {
                    console.error('Country ghost text error:', error);
                });
        }, 200);
        
        // Get countries from API for dropdown
        fetch(`/api/autocomplete/countries?q=${encodeURIComponent(value)}`)
            .then(response => response.json())
            .then(data => {
                showAutocompleteDropdown('countryAutocomplete', data.suggestions, (country) => {
                    countryInput.value = country;
                    if (countryGhost) countryGhost.value = '';
                    document.getElementById('countryAutocomplete').innerHTML = '';
                    document.getElementById('countryAutocomplete').classList.add('hidden');
                    
                    // Clear city when country changes
                    cityInput.value = '';
                    if (cityGhost) cityGhost.value = '';
                    if (cityIdInput) cityIdInput.value = '';
                });
            })
            .catch(error => {
                console.error('Country autocomplete error:', error);
                // Fallback to hardcoded countries list
                const countries = getCountriesList();
                const filteredCountries = countries.filter(country => 
                    country.toLowerCase().includes(value.toLowerCase())
                ).slice(0, 10);
                
                showAutocompleteDropdown('countryAutocomplete', filteredCountries, (country) => {
                    countryInput.value = country;
                    if (countryGhost) countryGhost.value = '';
                    document.getElementById('countryAutocomplete').innerHTML = '';
                    document.getElementById('countryAutocomplete').classList.add('hidden');
                    
                    // Clear city when country changes
                    cityInput.value = '';
                    if (cityGhost) cityGhost.value = '';
                    if (cityIdInput) cityIdInput.value = '';
                });
            });
    });
    
    // Handle country ghost text navigation
    if (countryGhost && countryInput) {
        // Handle tab key to accept ghost text suggestion
        countryInput.addEventListener('keydown', function(e) {
            if (e.key === 'Tab' && countryGhost.value) {
                if (e.shiftKey) return; // Allow shift+tab to navigate backward
                
                e.preventDefault();
                this.value = countryGhost.value;
                countryGhost.value = '';
                console.log('✅ Accepted country ghost text suggestion');
            }
        });
        
        // Handle right arrow key to accept ghost text suggestion
        countryInput.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowRight' && countryGhost.value && 
                this.selectionStart === this.value.length) {
                e.preventDefault();
                this.value = countryGhost.value;
                countryGhost.value = '';
                console.log('✅ Accepted country ghost text suggestion with right arrow');
            }
        });
        
        // Clear ghost text on blur (when input loses focus)
        countryInput.addEventListener('blur', function() {
            setTimeout(() => {
                countryGhost.value = '';
            }, 100);
        });
    }
    
    // City autocomplete with ghost text
    cityInput.addEventListener('input', function() {
        const value = this.value.trim();
        const country = countryInput.value.trim();
        
        // Clear previous ghost text
        if (cityGhost) cityGhost.value = '';
        
        if (value.length < 2) {
            document.getElementById('cityAutocomplete').innerHTML = '';
            document.getElementById('cityAutocomplete').classList.add('hidden');
            return;
        }
        
        // Debounce ghost text API calls
        clearTimeout(cityGhostTimer);
        cityGhostTimer = setTimeout(() => {
            // API URL for ghost text
            const ghostApiUrl = country ? 
                `/api/ghost/cities?q=${encodeURIComponent(value)}&country=${encodeURIComponent(country)}` :
                `/api/ghost/cities?q=${encodeURIComponent(value)}`;
                
            // Call API for ghost text suggestion
            fetch(ghostApiUrl)
                .then(response => response.json())
                .then(data => {
                    if (data.suggestion && cityGhost) {
                        // Set ghost text only if current input matches the beginning of suggestion
                        if (data.suggestion.toLowerCase().startsWith(value.toLowerCase())) {
                            cityGhost.value = value + data.suggestion.substring(value.length);
                            console.log(`✨ City ghost text: ${cityGhost.value}`);
                        }
                    }
                })
                .catch(error => {
                    console.error('City ghost text error:', error);
                });
        }, 200);
        
        // Get cities from API based on country and input for dropdown
        const apiUrl = country ? 
            `/api/autocomplete/cities?q=${encodeURIComponent(value)}&country=${encodeURIComponent(country)}` :
            `/api/autocomplete/cities?q=${encodeURIComponent(value)}`;
            
        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                showAutocompleteDropdown('cityAutocomplete', data.suggestions, (city) => {
                    cityInput.value = city;
                    if (cityGhost) cityGhost.value = '';
                    document.getElementById('cityAutocomplete').innerHTML = '';
                    document.getElementById('cityAutocomplete').classList.add('hidden');
                    
                    // Get city ID and set it
                    if (cityIdInput && data.city_ids && data.city_ids[city]) {
                        cityIdInput.value = data.city_ids[city];
                    } else if (cityIdInput) {
                        // If no city ID available, fetch it separately
                        fetchCityId(city, country);
                    }
                });
            })
            .catch(error => {
                console.error('City autocomplete error:', error);
                // Fallback to hardcoded cities based on country
                const cities = getCitiesByCountry(country);
                const filteredCities = cities.filter(city => 
                    city.toLowerCase().includes(value.toLowerCase())
                ).slice(0, 10);
                
                showAutocompleteDropdown('cityAutocomplete', filteredCities, (city) => {
                    cityInput.value = city;
                    if (cityGhost) cityGhost.value = '';
                    document.getElementById('cityAutocomplete').innerHTML = '';
                    document.getElementById('cityAutocomplete').classList.add('hidden');
                    
                    // Fetch city ID
                    if (cityIdInput) {
                        fetchCityId(city, country);
                    }
                });
            });
    });
    
    // Handle city ghost text navigation
    if (cityGhost && cityInput) {
        // Handle tab key to accept ghost text suggestion
        cityInput.addEventListener('keydown', function(e) {
            if (e.key === 'Tab' && cityGhost.value) {
                if (e.shiftKey) return; // Allow shift+tab to navigate backward
                
                e.preventDefault();
                this.value = cityGhost.value;
                cityGhost.value = '';
                console.log('✅ Accepted city ghost text suggestion');
                
                // Fetch city ID after accepting ghost text
                if (cityIdInput && countryInput.value) {
                    fetchCityId(this.value, countryInput.value);
                }
            }
        });
        
        // Handle right arrow key to accept ghost text suggestion
        cityInput.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowRight' && cityGhost.value && 
                this.selectionStart === this.value.length) {
                e.preventDefault();
                this.value = cityGhost.value;
                cityGhost.value = '';
                console.log('✅ Accepted city ghost text suggestion with right arrow');
                
                // Fetch city ID after accepting ghost text
                if (cityIdInput && countryInput.value) {
                    fetchCityId(this.value, countryInput.value);
                }
            }
        });
        
        // Clear ghost text on blur (when input loses focus)
        cityInput.addEventListener('blur', function() {
            setTimeout(() => {
                cityGhost.value = '';
            }, 100);
        });
    }
    
    // Close autocomplete dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.matches('#restaurant_country, #restaurant_city, #countryAutocomplete *, #cityAutocomplete *')) {
            document.getElementById('countryAutocomplete').innerHTML = '';
            document.getElementById('countryAutocomplete').classList.add('hidden');
            document.getElementById('cityAutocomplete').innerHTML = '';
            document.getElementById('cityAutocomplete').classList.add('hidden');
        }
    });
    
    // Function to fetch city ID from API
    function fetchCityId(city, country) {
        if (!city || !country) return;
        
        fetch(`/api/cities/id?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}`)
            .then(response => response.json())
            .then(data => {
                if (data.city_id && cityIdInput) {
                    cityIdInput.value = data.city_id;
                    
                    // Cập nhật cả giá trị của fallback input (nếu có)
                    const cityIdFallback = document.getElementById('restaurant_city_id_fallback');
                    if (cityIdFallback) {
                        cityIdFallback.value = data.city_id;
                        console.log(`✅ Đã cập nhật city_id fallback: ${data.city_id}`);
                    }
                } else {
                    console.log(`⚠️ Không tìm thấy city_id cho ${city}, ${country}, sử dụng giá trị mặc định 1`);
                    // Nếu không có city_id, sử dụng giá trị mặc định
                    if (cityIdInput) {
                        cityIdInput.value = "1";  // Giá trị mặc định
                        
                        // Cập nhật fallback
                        const cityIdFallback = document.getElementById('restaurant_city_id_fallback');
                        if (cityIdFallback) {
                            cityIdFallback.value = "1";
                        }
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching city ID:', error);
                // Xử lý lỗi - sử dụng giá trị mặc định
                if (cityIdInput) {
                    cityIdInput.value = "1";  // Giá trị mặc định
                    
                    // Cập nhật fallback
                    const cityIdFallback = document.getElementById('restaurant_city_id_fallback');
                    if (cityIdFallback) {
                        cityIdFallback.value = "1";
                    }
                }
            });
    }
}

/**
 * Show autocomplete dropdown with suggestions
 */
function showAutocompleteDropdown(dropdownId, suggestions, onSelectCallback) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    dropdown.innerHTML = '';
    
    if (!suggestions || suggestions.length === 0) {
        dropdown.classList.add('hidden');
        return;
    }
    
    suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'px-4 py-2 hover:bg-blue-50 cursor-pointer text-gray-700';
        item.textContent = suggestion;
        
        item.addEventListener('click', () => {
            if (onSelectCallback) onSelectCallback(suggestion);
        });
        
        dropdown.appendChild(item);
    });
    
    dropdown.classList.remove('hidden');
}

/**
 * Initialize Excel upload functionality
 */
function initExcelUpload() {
    const excelDropZone = document.getElementById('excelDropZone');
    const excelFileInput = document.getElementById('excelFileInput');
    const uploadExcelBtn = document.getElementById('uploadExcelBtn');
    
    if (!excelDropZone || !excelFileInput || !uploadExcelBtn) return;
    
    // Setup drag and drop
    excelDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        excelDropZone.classList.add('border-blue-400', 'bg-blue-50');
    });
    
    excelDropZone.addEventListener('dragleave', () => {
        excelDropZone.classList.remove('border-blue-400', 'bg-blue-50');
    });
    
    excelDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        excelDropZone.classList.remove('border-blue-400', 'bg-blue-50');
        
        if (e.dataTransfer.files.length) {
            excelFileInput.files = e.dataTransfer.files;
            handleFileSelection(e.dataTransfer.files[0]);
        }
    });
    
    // Setup click to browse
    excelDropZone.addEventListener('click', () => {
        excelFileInput.click();
    });
    
    excelFileInput.addEventListener('change', () => {
        if (excelFileInput.files.length) {
            handleFileSelection(excelFileInput.files[0]);
        }
    });
    
    // Handle file selection
    function handleFileSelection(file) {
        if (!file) return;
        
        // Check if file is Excel
        const validExts = ['.xlsx', '.xls'];
        const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        
        if (!validExts.includes(fileExt)) {
            const currentLanguage = window.currentLanguage || 'en';
            if (currentLanguage === 'vi') {
                alert('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
            } else {
                alert('Please select an Excel file (.xlsx or .xls)');
            }
            return;
        }
        
        // Update UI to show selected file
        const fileNameEl = document.createElement('div');
        fileNameEl.className = 'mt-4 text-sm font-medium text-blue-600';
        fileNameEl.innerHTML = `<i class="fas fa-file-excel mr-2"></i>${file.name}`;
        
        // Remove any existing filename display
        const existingFileName = excelDropZone.querySelector('.text-blue-600');
        if (existingFileName) {
            existingFileName.remove();
        }
        
        excelDropZone.appendChild(fileNameEl);
        
        // Enable upload button
        uploadExcelBtn.disabled = false;
    }
    
    // Handle Excel upload
    uploadExcelBtn.addEventListener('click', () => {
        if (!excelFileInput.files.length) return;
        
        const file = excelFileInput.files[0];
        const formData = new FormData();
        formData.append('excel_file', file);
        formData.append('auto_geocode', 'true'); // Add flag to automatically geocode missing coordinates
        
        // Show progress
        const progressContainer = document.getElementById('uploadProgress');
        const progressBar = document.getElementById('uploadProgressBar');
        const progressText = document.getElementById('uploadProgressText');
        
        progressContainer.classList.remove('hidden');
        progressBar.style.width = '0%';
        
        const currentLanguage = window.currentLanguage || 'en';
        progressText.textContent = currentLanguage === 'vi' ? 'Đang tải lên...' : 'Uploading...';
        
        // Disable upload button during upload
        uploadExcelBtn.disabled = true;
        
        // Upload the file
        fetch('/api/restaurants/import-excel', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            // If not OK, throw error
            if (!response.ok) {
                throw new Error(`Upload failed with status ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Update progress to complete
            progressBar.style.width = '100%';
            progressText.textContent = currentLanguage === 'vi' ? 'Hoàn thành!' : 'Complete!';
            
            // Show success message
            const message = currentLanguage === 'vi' ? 
                `Đã nhập ${data.imported_count} nhà hàng thành công!` : 
                `Successfully imported ${data.imported_count} restaurants!`;
                
            showUploadFeedback('success', message);
            
            // Close modal after delay
            setTimeout(() => {
                // Close modal
                const addRestaurantModal = document.getElementById('addRestaurantModal');
                if (addRestaurantModal) {
                    addRestaurantModal.style.display = 'none';
                }
                
                // Refresh restaurant list if visible
                const restaurantList = document.getElementById('restaurantList');
                if (restaurantList) {
                    // Trigger search again
                    const searchForm = document.getElementById('restaurantSearchForm');
                    if (searchForm) {
                        const event = new Event('submit');
                        searchForm.dispatchEvent(event);
                    }
                }
            }, 2000);
        })
        .catch(error => {
            console.error('Upload error:', error);
            
            // Update progress to show error
            progressBar.style.width = '100%';
            progressBar.style.backgroundColor = '#ef4444'; // Red
            progressText.textContent = currentLanguage === 'vi' ? 'Lỗi!' : 'Error!';
            
            // Show error message
            const message = currentLanguage === 'vi' ? 
                'Đã xảy ra lỗi khi tải lên. Vui lòng thử lại.' : 
                'An error occurred during upload. Please try again.';
                
            showUploadFeedback('error', message);
            
            // Re-enable upload button
            uploadExcelBtn.disabled = false;
        });
    });
    
    // Function to display feedback after upload
    function showUploadFeedback(type, message) {
        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = `mt-6 p-4 rounded-lg ${type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`;
        feedbackDiv.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Remove any existing feedback
        const existingFeedback = document.querySelector('#uploadProgress + .bg-green-100, #uploadProgress + .bg-red-100');
        if (existingFeedback) {
            existingFeedback.remove();
        }
        
        // Add feedback after progress bar
        const progressContainer = document.getElementById('uploadProgress');
        progressContainer.parentNode.insertBefore(feedbackDiv, progressContainer.nextSibling);
        
        // Remove feedback after delay
        setTimeout(() => {
            if (feedbackDiv.parentNode) {
                feedbackDiv.parentNode.removeChild(feedbackDiv);
            }
        }, 5000);
    }
}

/**
 * Helper functions for country/city autocomplete fallback
 */
function getCountriesList() {
    return [
        'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia',
        'Austria', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Belarus', 'Belgium', 'Belize', 'Benin', 
        'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria',
        'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Central African Republic',
        'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba',
        'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
        'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini',
        'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana',
        'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras',
        'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
        'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan',
        'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania',
        'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands',
        'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro',
        'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand',
        'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan',
        'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland',
        'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia',
        'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Saudi Arabia', 'Senegal', 'Serbia',
        'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia',
        'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname',
        'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste',
        'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda',
        'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan',
        'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
    ];
}

function getCitiesByCountry(country) {
    if (!country) return getTopCitiesGlobal();
    
    const countryLower = country.toLowerCase();
    
    const citiesByCountry = {
        'vietnam': [
            'Ha Noi', 'Ho Chi Minh', 'Da Nang', 'Hoi An', 'Nha Trang', 'Phu Quoc', 'Can Tho', 
            'Hue', 'Dalat', 'Vung Tau', 'Haiphong', 'Quy Nhon', 'Sa Pa', 'Ha Long', 'Buon Ma Thuot', 
            'Vinh', 'Thai Nguyen', 'Cao Bang', 'Lang Son', 'Dien Bien Phu'
        ],
        'thailand': [
            'Bangkok', 'Phuket', 'Chiang Mai', 'Pattaya', 'Krabi', 'Koh Samui', 'Hua Hin', 
            'Ayutthaya', 'Kanchanaburi', 'Koh Phi Phi', 'Chiang Rai', 'Sukhothai', 'Udon Thani', 
            'Koh Chang', 'Rayong'
        ],
        'japan': [
            'Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 
            'Hiroshima', 'Sendai', 'Chiba', 'Kitakyushu', 'Sakai', 'Niigata', 'Hamamatsu', 
            'Okayama', 'Sagamihara', 'Kumamoto', 'Shizuoka', 'Kagoshima'
        ],
        'united states': [
            'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 
            'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 
            'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Boston'
        ],
        'china': [
            'Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Hangzhou', 'Chengdu', 'Xian', 'Suzhou', 
            'Nanjing', 'Wuhan', 'Chongqing', 'Tianjin', 'Shenyang', 'Harbin', 'Kunming', 'Dalian', 
            'Qingdao', 'Xiamen', 'Ningbo', 'Changsha'
        ]
    };
    
    // Try to match the country name
    for (const [key, cities] of Object.entries(citiesByCountry)) {
        if (key === countryLower || key.includes(countryLower) || countryLower.includes(key)) {
            return cities;
        }
    }
    
    // If no match, return global top cities
    return getTopCitiesGlobal();
}

function getTopCitiesGlobal() {
    return [
        'Tokyo', 'New York', 'London', 'Paris', 'Sydney', 'Rome', 'Barcelona', 'Berlin', 'Toronto', 'Cairo',
        'Dubai', 'Istanbul', 'Moscow', 'Buenos Aires', 'Mexico City', 'Beijing', 'Shanghai', 'Singapore',
        'Hong Kong', 'Bangkok', 'Kuala Lumpur', 'Seoul', 'Jakarta', 'Manila', 'Ho Chi Minh City', 'Ha Noi',
        'Mumbai', 'Delhi', 'Los Angeles', 'Chicago', 'Houston', 'San Francisco', 'Rio de Janeiro', 'Sao Paulo'
    ];
}