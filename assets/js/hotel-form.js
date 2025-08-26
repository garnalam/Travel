/**
 * Hotel Form Handler - Xử lý form thêm hotel với tự động tạo ID và city mapping
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize hotel form functionality
    initHotelForm();
});

function initHotelForm() {
    // Thiết lập event listeners cho add hotel form
    setupAddHotelForm();
    
    // Thiết lập auto-complete cho country và city
    setupHotelAutoComplete();
    
    // Thiết lập Google Maps cho address search
    setupHotelMapIntegration();
}

function setupAddHotelForm() {
    const addHotelForm = document.getElementById('addHotelForm');
    if (!addHotelForm) return;

    addHotelForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(addHotelForm);
        const hotelData = {};
        
        // Thu thập dữ liệu từ form
        for (let [key, value] of formData.entries()) {
            hotelData[key] = value;
        }
        
        // Kiểm tra và lấy city_id nếu cần thiết
        await ensureCityId(hotelData);
        
        // Tự động tạo hotel_id mới
        hotelData.hotel_id = await generateNewHotelId();
        
        // Submit data
        await submitHotelData(hotelData);
    });
}

async function generateNewHotelId() {
    try {
        const response = await fetch('/api/admin/hotels/next-id');
        const data = await response.json();
        
        if (data.success) {
            return data.next_id;
        } else {
            // Fallback - generate based on timestamp
            const timestamp = Date.now().toString().slice(-4);
            return `H${timestamp}`;
        }
    } catch (error) {
        console.error('Error generating hotel ID:', error);
        // Fallback - generate based on timestamp
        const timestamp = Date.now().toString().slice(-4);
        return `H${timestamp}`;
    }
}

async function ensureCityId(hotelData) {
    if (!hotelData.city_id || hotelData.city_id === '0') {
        try {
            const response = await fetch(`/api/cities/id?city=${encodeURIComponent(hotelData.city)}&country=${encodeURIComponent(hotelData.country)}`);
            const data = await response.json();
            
            if (data.city_id) {
                hotelData.city_id = data.city_id;
                console.log(`✅ Đã lấy được city_id: ${data.city_id}`);
            } else {
                // Sử dụng giá trị mặc định nếu không tìm thấy
                hotelData.city_id = 1;
                console.log('⚠️ Không tìm thấy city_id, sử dụng giá trị mặc định 1');
            }
        } catch (error) {
            console.error('❌ Lỗi khi lấy city_id:', error);
            hotelData.city_id = 1;
        }
    }
}

async function submitHotelData(hotelData) {
    try {
        const submitBtn = document.querySelector('#addHotelForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang thêm...';
        }
        
        const response = await fetch('/api/admin/hotels', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(hotelData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccessMessage('Hotel đã được thêm thành công!');
            
            // Reset form
            document.getElementById('addHotelForm').reset();
            
            // Close modal
            const modal = document.getElementById('addHotelModal');
            if (modal) {
                modal.classList.add('hidden');
            }
            
            // Reload hotel list if on admin page
            if (typeof reloadHotelList === 'function') {
                reloadHotelList();
            }
        } else {
            showErrorMessage(result.message || 'Có lỗi xảy ra khi thêm hotel');
        }
    } catch (error) {
        console.error('Error submitting hotel:', error);
        showErrorMessage('Có lỗi xảy ra khi kết nối với server');
    } finally {
        const submitBtn = document.querySelector('#addHotelForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Thêm Hotel';
        }
    }
}

function setupHotelAutoComplete() {
    // Country autocomplete
    const countryInput = document.getElementById('hotel_country');
    const countryGhost = document.getElementById('country_ghost');
    
    if (countryInput && countryGhost) {
        setupCountryAutocomplete(countryInput, countryGhost);
    }
    
    // City autocomplete  
    const cityInput = document.getElementById('hotel_city');
    const cityGhost = document.getElementById('city_ghost');
    
    if (cityInput && cityGhost) {
        setupCityAutocomplete(cityInput, cityGhost);
    }
}

function setupCountryAutocomplete(input, ghost) {
    let countries = [];
    
    // Load countries list
    fetch('/api/autocomplete/countries')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                countries = data.countries.map(c => c.country).filter(Boolean);
            }
        })
        .catch(console.error);
    
    input.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        if (value.length === 0) {
            ghost.value = '';
            return;
        }
        
        const match = countries.find(country => 
            country.toLowerCase().startsWith(value)
        );
        
        if (match) {
            ghost.value = match;
        } else {
            ghost.value = '';
        }
    });
    
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Tab' && ghost.value) {
            e.preventDefault();
            this.value = ghost.value;
            ghost.value = '';
        }
    });
}

function setupCityAutocomplete(input, ghost) {
    let cities = [];
    
    // Load cities list
    fetch('/api/autocomplete/cities')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                cities = data.cities.map(c => c.city).filter(Boolean);
            }
        })
        .catch(console.error);
    
    input.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        if (value.length === 0) {
            ghost.value = '';
            return;
        }
        
        const match = cities.find(city => 
            city.toLowerCase().startsWith(value)
        );
        
        if (match) {
            ghost.value = match;
        } else {
            ghost.value = '';
        }
    });
    
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Tab' && ghost.value) {
            e.preventDefault();
            this.value = ghost.value;
            ghost.value = '';
        }
    });
}

function setupHotelMapIntegration() {
    // Initialize map if Google Maps is available
    if (typeof google !== 'undefined' && google.maps) {
        initHotelMap();
    } else {
        console.log('Google Maps not available, skipping map integration');
    }
}

function initHotelMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;
    
    // Default to Hanoi, Vietnam
    const defaultCenter = { lat: 21.0285, lng: 105.8542 };
    
    const map = new google.maps.Map(mapElement, {
        zoom: 13,
        center: defaultCenter
    });
    
    const marker = new google.maps.Marker({
        position: defaultCenter,
        map: map,
        draggable: true
    });
    
    // Update coordinates when marker is moved
    marker.addListener('dragend', function() {
        const position = marker.getPosition();
        document.getElementById('hotel_latitude').value = position.lat();
        document.getElementById('hotel_longitude').value = position.lng();
    });
    
    // Address search functionality
    const searchBtn = document.getElementById('geocodeAddressBtn');
    const addressInput = document.getElementById('hotel_address_search');
    
    if (searchBtn && addressInput) {
        searchBtn.addEventListener('click', function() {
            const address = addressInput.value.trim();
            if (!address) return;
            
            geocodeAddress(address, map, marker);
        });
        
        addressInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchBtn.click();
            }
        });
    }
}

function geocodeAddress(address, map, marker) {
    const geocoder = new google.maps.Geocoder();
    
    geocoder.geocode({ address: address }, function(results, status) {
        if (status === 'OK') {
            const location = results[0].geometry.location;
            
            map.setCenter(location);
            map.setZoom(15);
            marker.setPosition(location);
            
            // Update form fields
            document.getElementById('hotel_latitude').value = location.lat();
            document.getElementById('hotel_longitude').value = location.lng();
            
            showSuccessMessage('Đã tìm thấy địa chỉ!');
        } else {
            showErrorMessage('Không thể tìm thấy địa chỉ. Vui lòng thử lại.');
        }
    });
}

// Excel upload functionality
function setupHotelExcelUpload() {
    const dropZone = document.getElementById('hotelExcelDropZone');
    const fileInput = document.getElementById('hotelExcelFileInput');
    const uploadBtn = document.getElementById('uploadHotelExcelBtn');
    
    if (!dropZone || !fileInput || !uploadBtn) return;
    
    // Drag and drop events
    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('border-blue-400', 'bg-blue-50');
    });
    
    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.classList.remove('border-blue-400', 'bg-blue-50');
    });
    
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('border-blue-400', 'bg-blue-50');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleHotelExcelFile(files[0]);
        }
    });
    
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            handleHotelExcelFile(this.files[0]);
        }
    });
    
    uploadBtn.addEventListener('click', function() {
        if (fileInput.files.length > 0) {
            uploadHotelExcelFile(fileInput.files[0]);
        }
    });
}

function handleHotelExcelFile(file) {
    const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
    ];
    
    if (!allowedTypes.includes(file.type)) {
        showErrorMessage('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
        return;
    }
    
    const uploadBtn = document.getElementById('uploadHotelExcelBtn');
    if (uploadBtn) {
        uploadBtn.disabled = false;
        uploadBtn.classList.remove('disabled:opacity-50', 'disabled:cursor-not-allowed');
    }
    
    showSuccessMessage(`Đã chọn file: ${file.name}`);
}

async function uploadHotelExcelFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const uploadBtn = document.getElementById('uploadHotelExcelBtn');
    const progressBar = document.getElementById('uploadProgressBar');
    const progressText = document.getElementById('uploadProgressText');
    const progressContainer = document.getElementById('uploadProgress');
    
    try {
        // Show progress
        if (progressContainer) progressContainer.classList.remove('hidden');
        if (uploadBtn) {
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang tải lên...';
        }
        
        const response = await fetch('/api/admin/hotels/import-excel', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccessMessage(`Đã thêm thành công ${result.added_count} khách sạn!`);
            
            // Close modal and reset
            const modal = document.getElementById('addHotelModal');
            if (modal) modal.classList.add('hidden');
            
            // Reload list if available
            if (typeof reloadHotelList === 'function') {
                reloadHotelList();
            }
        } else {
            showErrorMessage(result.message || 'Có lỗi xảy ra khi import Excel');
        }
    } catch (error) {
        console.error('Error uploading Excel:', error);
        showErrorMessage('Có lỗi xảy ra khi upload file');
    } finally {
        // Hide progress and reset button
        if (progressContainer) progressContainer.classList.add('hidden');
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload mr-2"></i>Upload Excel';
        }
    }
}

// Utility functions
function showSuccessMessage(message) {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function showErrorMessage(message) {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Export functions for use in other scripts
window.hotelFormAPI = {
    generateNewHotelId,
    ensureCityId,
    submitHotelData,
    setupHotelExcelUpload,
    showSuccessMessage,
    showErrorMessage
};