// Tour Detail Component for Vietnam Travel Website
// Author: Vietnam Travel Team
// Version: 1.0.0

/**
 * Hiển thị chi tiết tour từ API
 * File này chứa các hàm để hiển thị chi tiết tour lấy từ API
 */

// API Base URL - Sẽ được thay thế tự động
const API_BASE_URL = 'http://localhost:5000'; 

// Load tour detail from API
async function loadTourDetail(tourId) {
    try {
        console.log('🔍 Loading tour detail for ID:', tourId);
        
        // Show loading state
        showTourDetailsLoading();
        
        // Fetch tour detail from API
        const response = await fetch(`${API_BASE_URL}/api/tour-history/${tourId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Hide loading state
        hideTourDetailsLoading();
        
        // Display tour detail
        if (data.success && data.tour) {
            console.log('✅ Tour detail loaded:', data.tour);
            displayTourDetail(data.tour);
            return data.tour;
        } else {
            throw new Error(data.message || 'Failed to load tour detail');
        }
    } catch (error) {
        console.error('❌ Error loading tour detail:', error);
        hideTourDetailsLoading();
        
        // Show error message to user
        showNotification(
            getTranslation('errorLoadingTourDetail') || 'Error loading tour detail', 
            'error'
        );
        
        return null;
    }
}

// Display tour detail in modal with enhanced layout
function displayTourDetail(tourData) {
    console.log('🎨 Displaying tour detail:', tourData);
    
    // Create tour detail modal if not exists
    let modal = document.getElementById('tourDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'tourDetailModal';
        modal.className = 'tour-detail-modal';
        document.body.appendChild(modal);
    }
    
    // Generate modal content with enhanced layout
    modal.innerHTML = generateTourDetailHTML(tourData);
    
    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Fade in animation
    setTimeout(() => {
        modal.classList.add('active');
        
        // Initialize components
        initializeTourDetailComponents(tourData);
        
        // Update language display
        if (typeof updateLanguageDisplay === 'function') {
            updateLanguageDisplay();
        }
    }, 50);
}

// Generate enhanced tour detail HTML
function generateTourDetailHTML(tourData) {
    // Extract essential data
    const tourId = tourData.id;
    const startCity = tourData.start_city ? `${tourData.start_city.name}, ${tourData.start_city.country}` : 'N/A';
    const destCity = tourData.destination_city ? `${tourData.destination_city.name}, ${tourData.destination_city.country}` : 'N/A';
    const duration = tourData.duration_days || 'N/A';
    const budget = formatCurrency(tourData.target_budget);
    const totalPrice = formatCurrency(tourData.total_price);
    
    // Organize schedule by days
    const schedule = tourData.schedule || {};
    
    // Get image URLs from activities or use defaults
    const imageUrls = getImageUrlsFromTourData(tourData);
    
    return `
        <div class="tour-detail-container">
            <div class="tour-detail-content">
                <button class="tour-detail-close" onclick="closeTourDetailModal()">
                    <i class="fas fa-times"></i>
                </button>
                
                <!-- Tour Header -->
                <div class="tour-detail-header">
                    <div class="tour-header-info">
                        <h2 class="tour-title">${startCity} → ${destCity}</h2>
                        <div class="tour-meta">
                            <span class="tour-meta-item">
                                <i class="fas fa-calendar"></i>
                                <span data-en="${duration} days" data-vi="${duration} ngày">${duration} days</span>
                            </span>
                            <span class="tour-meta-item">
                                <i class="fas fa-money-bill-wave"></i>
                                <span data-en="Budget: ${budget}" data-vi="Ngân sách: ${budget}">Budget: ${budget}</span>
                            </span>
                            <span class="tour-meta-item">
                                <i class="fas fa-tags"></i>
                                <span data-en="Total: ${totalPrice}" data-vi="Tổng: ${totalPrice}">Total: ${totalPrice}</span>
                            </span>
                            <span class="tour-meta-item">
                                <i class="fas fa-user"></i>
                                <span data-en="Guests: ${tourData.guest_count}" data-vi="Khách: ${tourData.guest_count}">Guests: ${tourData.guest_count}</span>
                            </span>
                        </div>
                    </div>
                </div>
                
                <!-- Tour Detail Tabs -->
                <div class="tour-detail-tabs">
                    <button class="tour-tab active" onclick="switchTourTab('schedule', this)" data-en="Schedule" data-vi="Lịch trình">Schedule</button>
                    <button class="tour-tab" onclick="switchTourTab('hotels', this)" data-en="Hotels" data-vi="Khách sạn">Hotels</button>
                    <button class="tour-tab" onclick="switchTourTab('restaurants', this)" data-en="Restaurants" data-vi="Nhà hàng">Restaurants</button>
                    <button class="tour-tab" onclick="switchTourTab('activities', this)" data-en="Activities" data-vi="Hoạt động">Activities</button>
                    <button class="tour-tab" onclick="switchTourTab('transports', this)" data-en="Transport" data-vi="Di chuyển">Transport</button>
                </div>
                
                <!-- Tab Contents -->
                <div class="tour-detail-tab-contents">
                    <!-- Schedule Tab -->
                    <div id="schedule-tab" class="tour-tab-content active">
                        ${generateScheduleTabContent(schedule)}
                    </div>
                    
                    <!-- Hotels Tab -->
                    <div id="hotels-tab" class="tour-tab-content">
                        ${generateHotelsTabContent(tourData.hotels)}
                    </div>
                    
                    <!-- Restaurants Tab -->
                    <div id="restaurants-tab" class="tour-tab-content">
                        ${generateRestaurantsTabContent(tourData.restaurants)}
                    </div>
                    
                    <!-- Activities Tab -->
                    <div id="activities-tab" class="tour-tab-content">
                        ${generateActivitiesTabContent(tourData.activities)}
                    </div>
                    
                    <!-- Transport Tab -->
                    <div id="transports-tab" class="tour-tab-content">
                        ${generateTransportsTabContent(tourData.transports)}
                    </div>
                </div>
                
                <!-- Tour Image Gallery -->
                <div class="tour-image-gallery">
                    <h3 data-en="Tour Gallery" data-vi="Thư viện ảnh tour">Tour Gallery</h3>
                    <div class="gallery-container">
                        ${generateImageGallery(imageUrls)}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Generate schedule tab content with enhanced layout
function generateScheduleTabContent(scheduleData) {
    if (!scheduleData || Object.keys(scheduleData).length === 0) {
        return `
            <div class="empty-content">
                <i class="fas fa-calendar-times"></i>
                <p data-en="No schedule available" data-vi="Không có lịch trình">No schedule available</p>
            </div>
        `;
    }
    
    let content = '<div class="schedule-days-container">';
    
    // Sort days by day number
    const sortedDays = Object.values(scheduleData).sort((a, b) => a.day_number - b.day_number);
    
    sortedDays.forEach(day => {
        const dayNumber = day.day_number;
        const dayDate = day.day_date ? new Date(day.day_date).toLocaleDateString() : '';
        
        content += `
            <div class="schedule-day">
                <div class="schedule-day-header" onclick="toggleScheduleDay(this)">
                    <h3 data-en="Day ${dayNumber}: ${dayDate}" data-vi="Ngày ${dayNumber}: ${dayDate}">Day ${dayNumber}: ${dayDate}</h3>
                    <span class="toggle-icon"><i class="fas fa-chevron-down"></i></span>
                </div>
                <div class="schedule-day-content">
                    <div class="schedule-timeline">
        `;
        
        // Add items to timeline
        if (day.items && day.items.length > 0) {
            day.items.forEach(item => {
                const itemIcon = getItemTypeIcon(item.place_type);
                const itemColor = getItemTypeColor(item.place_type);
                
                content += `
                    <div class="timeline-item" style="--item-color: ${itemColor}">
                        <div class="timeline-time">${formatTime(item.start_time)} - ${formatTime(item.end_time)}</div>
                        <div class="timeline-content">
                            <div class="timeline-icon" style="background-color: ${itemColor}">
                                <i class="${itemIcon}"></i>
                            </div>
                            <div class="timeline-info">
                                <h4>${item.place_name || 'Unnamed'}</h4>
                                <p>${item.place_description || ''}</p>
                                ${item.place_rating ? `<div class="timeline-rating">${generateRatingStars(item.place_rating)}</div>` : ''}
                                ${item.cost > 0 ? `<div class="timeline-cost" data-en="Cost: ${formatCurrency(item.cost)}" data-vi="Chi phí: ${formatCurrency(item.cost)}">Cost: ${formatCurrency(item.cost)}</div>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            content += `
                <div class="empty-timeline">
                    <p data-en="No activities scheduled for this day" data-vi="Không có hoạt động nào được lên lịch cho ngày này">No activities scheduled for this day</p>
                </div>
            `;
        }
        
        content += `
                    </div>
                </div>
            </div>
        `;
    });
    
    content += '</div>';
    return content;
}

// Generate hotels tab content
function generateHotelsTabContent(hotels) {
    if (!hotels || hotels.length === 0) {
        return `
            <div class="empty-content">
                <i class="fas fa-hotel"></i>
                <p data-en="No hotels available" data-vi="Không có khách sạn">No hotels available</p>
            </div>
        `;
    }
    
    let content = '<div class="hotels-container">';
    
    hotels.forEach(hotel => {
        content += `
            <div class="hotel-card">
                <div class="hotel-header">
                    <h3>${hotel.hotel_name || 'Unnamed Hotel'}</h3>
                    <div class="hotel-stars">${generateStars(hotel.hotel_stars)}</div>
                </div>
                <div class="hotel-info">
                    <div class="hotel-price" data-en="Price: ${formatCurrency(hotel.hotel_price)}/night" data-vi="Giá: ${formatCurrency(hotel.hotel_price)}/đêm">Price: ${formatCurrency(hotel.hotel_price)}/night</div>
                    <div class="hotel-rating">${generateRatingStars(hotel.hotel_rating)}</div>
                </div>
                <p class="hotel-description">${hotel.hotel_description || ''}</p>
                ${hotel.hotel_latitude && hotel.hotel_longitude ? `
                    <div class="hotel-map">
                        <a href="https://www.google.com/maps?q=${hotel.hotel_latitude},${hotel.hotel_longitude}" target="_blank" class="map-link">
                            <i class="fas fa-map-marker-alt"></i>
                            <span data-en="View on Map" data-vi="Xem trên Bản đồ">View on Map</span>
                        </a>
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    content += '</div>';
    return content;
}

// Generate restaurants tab content
function generateRestaurantsTabContent(restaurants) {
    if (!restaurants || restaurants.length === 0) {
        return `
            <div class="empty-content">
                <i class="fas fa-utensils"></i>
                <p data-en="No restaurants available" data-vi="Không có nhà hàng">No restaurants available</p>
            </div>
        `;
    }
    
    let content = '<div class="restaurants-container">';
    
    restaurants.forEach(restaurant => {
        content += `
            <div class="restaurant-card">
                <div class="restaurant-header">
                    <h3>${restaurant.restaurant_name || 'Unnamed Restaurant'}</h3>
                    <div class="restaurant-cuisine">${restaurant.restaurant_cuisine || ''}</div>
                </div>
                <div class="restaurant-info">
                    <div class="restaurant-price" data-en="Avg. Price: ${formatCurrency(restaurant.restaurant_price)}" data-vi="Giá TB: ${formatCurrency(restaurant.restaurant_price)}">Avg. Price: ${formatCurrency(restaurant.restaurant_price)}</div>
                    <div class="restaurant-rating">${generateRatingStars(restaurant.restaurant_rating)}</div>
                </div>
                <p class="restaurant-description">${restaurant.restaurant_description || ''}</p>
            </div>
        `;
    });
    
    content += '</div>';
    return content;
}

// Generate activities tab content
function generateActivitiesTabContent(activities) {
    if (!activities || activities.length === 0) {
        return `
            <div class="empty-content">
                <i class="fas fa-hiking"></i>
                <p data-en="No activities available" data-vi="Không có hoạt động">No activities available</p>
            </div>
        `;
    }
    
    let content = '<div class="activities-container">';
    
    activities.forEach(activity => {
        content += `
            <div class="activity-card">
                <div class="activity-header">
                    <h3>${activity.activity_name || 'Unnamed Activity'}</h3>
                    <div class="activity-type">${activity.activity_type || ''}</div>
                </div>
                <div class="activity-info">
                    <div class="activity-price" data-en="Price: ${formatCurrency(activity.activity_price)}" data-vi="Giá: ${formatCurrency(activity.activity_price)}">Price: ${formatCurrency(activity.activity_price)}</div>
                    <div class="activity-duration" data-en="Duration: ${activity.activity_duration} hrs" data-vi="Thời gian: ${activity.activity_duration} giờ">Duration: ${activity.activity_duration} hrs</div>
                    <div class="activity-rating">${generateRatingStars(activity.activity_rating)}</div>
                </div>
                <p class="activity-description">${activity.activity_description || ''}</p>
            </div>
        `;
    });
    
    content += '</div>';
    return content;
}

// Generate transports tab content
function generateTransportsTabContent(transports) {
    if (!transports || transports.length === 0) {
        return `
            <div class="empty-content">
                <i class="fas fa-car"></i>
                <p data-en="No transport options available" data-vi="Không có phương tiện di chuyển">No transport options available</p>
            </div>
        `;
    }
    
    let content = '<div class="transports-container">';
    
    transports.forEach(transport => {
        content += `
            <div class="transport-card">
                <div class="transport-header">
                    <h3>${transport.transport_type || 'Unnamed Transport'}</h3>
                </div>
                <div class="transport-info">
                    <div class="transport-price" data-en="Price per km: ${formatCurrency(transport.transport_price)}" data-vi="Giá mỗi km: ${formatCurrency(transport.transport_price)}">Price per km: ${formatCurrency(transport.transport_price)}</div>
                    <div class="transport-capacity" data-en="Max Capacity: ${transport.max_capacity}" data-vi="Sức chứa tối đa: ${transport.max_capacity}">Max Capacity: ${transport.max_capacity}</div>
                </div>
                <div class="transport-hours" data-en="Operating Hours: ${transport.operating_hours}" data-vi="Giờ hoạt động: ${transport.operating_hours}">Operating Hours: ${transport.operating_hours}</div>
            </div>
        `;
    });
    
    content += '</div>';
    return content;
}

// Generate image gallery
function generateImageGallery(imageUrls) {
    if (!imageUrls || imageUrls.length === 0) {
        return `
            <div class="empty-gallery">
                <i class="fas fa-images"></i>
                <p data-en="No images available" data-vi="Không có hình ảnh">No images available</p>
            </div>
        `;
    }
    
    let content = '';
    
    imageUrls.forEach((url, index) => {
        content += `
            <div class="gallery-item" onclick="showLightbox('${url}')">
                <img src="${url}" alt="Tour image ${index + 1}" loading="lazy">
            </div>
        `;
    });
    
    return content;
}

// Helper Functions

// Get image URLs from tour data
function getImageUrlsFromTourData(tourData) {
    const imageUrls = [];
    
    // Try to get images from activities
    if (tourData.activities && tourData.activities.length > 0) {
        // Placeholder image URLs (in real implementation, these would come from activities)
        const defaultImages = [
            'https://cdn3.ivivu.com/2023/02/T%E1%BB%95ng-quan-du-l%E1%BB%8Bch-Ph%C3%BA-Qu%E1%BB%91c-ivivu.jpg',
            'https://pqr.vn/wp-content/uploads/2018/06/muoi-ghanh-dau-dao-ngoc-phu-quoc-pqr-2.jpg',
            'https://phuquocgo.vn/wp-content/uploads/2024/03/tour-4-dao-phu-quoc-59.jpg',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Bai-sao-phu-quoc-tuonglamphotos.jpg/960px-Bai-sao-phu-quoc-tuonglamphotos.jpg',
            'https://bcp.cdnchinhphu.vn/334894974524682240/2025/7/10/1746702872-1752146927950856924722.jpg'
        ];
        
        // Add default images for demonstration
        defaultImages.forEach(img => imageUrls.push(img));
    }
    
    // Ensure we have at least one image
    if (imageUrls.length === 0) {
        imageUrls.push('https://via.placeholder.com/800x600?text=No+Images+Available');
    }
    
    return imageUrls;
}

// Get icon for item type
function getItemTypeIcon(type) {
    switch (type) {
        case 'hotel':
            return 'fas fa-hotel';
        case 'restaurant':
            return 'fas fa-utensils';
        case 'activity':
            return 'fas fa-hiking';
        case 'transport':
            return 'fas fa-car';
        default:
            return 'fas fa-map-marker-alt';
    }
}

// Get color for item type
function getItemTypeColor(type) {
    switch (type) {
        case 'hotel':
            return '#4f46e5'; // Indigo
        case 'restaurant':
            return '#f59e0b'; // Amber
        case 'activity':
            return '#10b981'; // Emerald
        case 'transport':
            return '#3b82f6'; // Blue
        default:
            return '#6b7280'; // Gray
    }
}

// Format time from hh:mm:ss to hh:mm AM/PM
function formatTime(timeStr) {
    if (!timeStr) return 'N/A';
    
    try {
        const [hours, minutes] = timeStr.split(':');
        const hoursNum = parseInt(hours);
        const period = hoursNum >= 12 ? 'PM' : 'AM';
        const hours12 = hoursNum % 12 || 12;
        
        return `${hours12}:${minutes} ${period}`;
    } catch (e) {
        return timeStr;
    }
}

// Format currency based on current currency
function formatCurrency(value) {
    if (value === null || value === undefined) return 'N/A';
    
    // Default to USD if currentCurrency is not defined
    const currency = window.currentCurrency || 'USD';
    
    try {
        const numValue = parseFloat(value);
        
        switch (currency) {
            case 'VND':
                return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(numValue);
            case 'EUR':
                return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(numValue);
            default: // USD
                return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(numValue);
        }
    } catch (e) {
        return `${value}`;
    }
}

// Generate star icons for hotel rating
function generateStars(numStars) {
    if (!numStars) return '';
    
    const stars = parseInt(numStars);
    let starsHTML = '';
    
    for (let i = 0; i < 5; i++) {
        if (i < stars) {
            starsHTML += '<i class="fas fa-star"></i>';
        } else {
            starsHTML += '<i class="far fa-star"></i>';
        }
    }
    
    return starsHTML;
}

// Generate star rating with fractional stars
function generateRatingStars(rating) {
    if (!rating) return '';
    
    const numRating = parseFloat(rating);
    let starsHTML = '';
    
    for (let i = 1; i <= 5; i++) {
        if (i <= numRating) {
            starsHTML += '<i class="fas fa-star"></i>';
        } else if (i - 0.5 <= numRating) {
            starsHTML += '<i class="fas fa-star-half-alt"></i>';
        } else {
            starsHTML += '<i class="far fa-star"></i>';
        }
    }
    
    return `<div class="star-rating">${starsHTML} <span class="rating-value">${numRating.toFixed(1)}</span></div>`;
}

// Toggle schedule day expand/collapse
function toggleScheduleDay(element) {
    const dayElement = element.closest('.schedule-day');
    dayElement.classList.toggle('expanded');
    
    const icon = dayElement.querySelector('.toggle-icon i');
    if (dayElement.classList.contains('expanded')) {
        icon.className = 'fas fa-chevron-up';
    } else {
        icon.className = 'fas fa-chevron-down';
    }
}

// Switch between tabs
function switchTourTab(tabId, tabButton) {
    // Hide all tab contents
    document.querySelectorAll('.tour-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.tour-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(`${tabId}-tab`).classList.add('active');
    
    // Add active class to clicked tab
    tabButton.classList.add('active');
}

// Show lightbox for image
function showLightbox(imageUrl) {
    // Create lightbox if not exists
    let lightbox = document.getElementById('tour-lightbox');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'tour-lightbox';
        lightbox.className = 'tour-lightbox';
        document.body.appendChild(lightbox);
    }
    
    // Set lightbox content
    lightbox.innerHTML = `
        <div class="lightbox-content">
            <button class="lightbox-close" onclick="closeLightbox()">
                <i class="fas fa-times"></i>
            </button>
            <img src="${imageUrl}" alt="Lightbox image">
        </div>
    `;
    
    // Show lightbox
    lightbox.style.display = 'flex';
    
    // Fade in animation
    setTimeout(() => {
        lightbox.classList.add('active');
    }, 10);
}

// Close lightbox
function closeLightbox() {
    const lightbox = document.getElementById('tour-lightbox');
    if (lightbox) {
        lightbox.classList.remove('active');
        
        // Remove after animation
        setTimeout(() => {
            lightbox.style.display = 'none';
        }, 300);
    }
}

// Show tour details loading
function showTourDetailsLoading() {
    // Create loading overlay if not exists
    let loadingOverlay = document.getElementById('tour-loading-overlay');
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'tour-loading-overlay';
        loadingOverlay.className = 'tour-loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text" data-en="Loading tour details..." data-vi="Đang tải chi tiết tour...">Loading tour details...</div>
        `;
        document.body.appendChild(loadingOverlay);
    }
    
    // Show loading overlay
    loadingOverlay.style.display = 'flex';
    
    // Fade in animation
    setTimeout(() => {
        loadingOverlay.classList.add('active');
    }, 10);
}

// Hide tour details loading
function hideTourDetailsLoading() {
    const loadingOverlay = document.getElementById('tour-loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
        
        // Remove after animation
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
        }, 300);
    }
}

// Close tour detail modal
function closeTourDetailModal() {
    const modal = document.getElementById('tourDetailModal');
    if (modal) {
        modal.classList.remove('active');
        
        // Remove after animation
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }, 300);
    }
}

// Initialize tour detail components
function initializeTourDetailComponents(tourData) {
    // Expand first day in schedule
    const firstDay = document.querySelector('.schedule-day');
    if (firstDay) {
        firstDay.classList.add('expanded');
        const icon = firstDay.querySelector('.toggle-icon i');
        if (icon) {
            icon.className = 'fas fa-chevron-up';
        }
    }
}

// Add translation support with fallback
function getTranslation(key) {
    const translations = {
        en: {
            errorLoadingTourDetail: 'Error loading tour detail',
            noScheduleAvailable: 'No schedule available',
            noHotelsAvailable: 'No hotels available',
            noRestaurantsAvailable: 'No restaurants available',
            noActivitiesAvailable: 'No activities available',
            noTransportOptionsAvailable: 'No transport options available',
            noImagesAvailable: 'No images available',
            viewOnMap: 'View on Map',
            loadingTourDetails: 'Loading tour details...'
        },
        vi: {
            errorLoadingTourDetail: 'Lỗi khi tải chi tiết tour',
            noScheduleAvailable: 'Không có lịch trình',
            noHotelsAvailable: 'Không có khách sạn',
            noRestaurantsAvailable: 'Không có nhà hàng',
            noActivitiesAvailable: 'Không có hoạt động',
            noTransportOptionsAvailable: 'Không có phương tiện di chuyển',
            noImagesAvailable: 'Không có hình ảnh',
            viewOnMap: 'Xem trên Bản đồ',
            loadingTourDetails: 'Đang tải chi tiết tour...'
        }
    };
    
    // Get current language or default to 'en'
    const currentLang = window.currentLanguage || 'en';
    
    // Return translation or fallback to English or key itself
    return translations[currentLang]?.[key] || translations.en?.[key] || key;
}

// Show notification
function showNotification(message, type = 'info') {
    // Use existing showNotification function if available
    if (window.showNotification && typeof window.showNotification === 'function') {
        window.showNotification(message, type);
        return;
    }
    
    // Fallback implementation
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Fade in animation
    setTimeout(() => {
        notification.classList.add('active');
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('active');
        
        // Remove after animation
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Export functions for global use
window.loadTourDetail = loadTourDetail;
window.displayTourDetail = displayTourDetail;
window.toggleScheduleDay = toggleScheduleDay;
window.switchTourTab = switchTourTab;
window.showLightbox = showLightbox;
window.closeLightbox = closeLightbox;
window.closeTourDetailModal = closeTourDetailModal;