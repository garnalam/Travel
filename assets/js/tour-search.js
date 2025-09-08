// Tour Search Functionality for Vietnam Travel Website
// Handles Personalized Travel Tour search and display

// Initialize Travel Tour Search
function initializeTravelTourSearch() {
    console.log('🌟 Initializing Travel Tour Search functionality...');
    
    // Step navigation
    const step1 = document.getElementById('travel-step-1');
    const step2 = document.getElementById('travel-step-2');
    const continueBtn = document.getElementById('continue-to-step-2');
    const backBtn = document.getElementById('back-to-step-1');
    
    if (continueBtn) {
        continueBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (validateTravelForm()) {
                step1.classList.add('hidden');
                step2.classList.remove('hidden');
            }
        });
    }
    
    if (backBtn) {
        backBtn.addEventListener('click', function(e) {
            e.preventDefault();
            step2.classList.add('hidden');
            step1.classList.remove('hidden');
        });
    }
    
    // Form submission
    const travelForm = document.getElementById('travelTourSearchForm');
    if (travelForm) {
        travelForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleTravelTourSearch();
        });
    }
    
    // Add input validation listeners
    const step1Fields = ['departureTime', 'departureDate', 'transport'];
    const step2Fields = ['days', 'budget'];
    
    [...step1Fields, ...step2Fields].forEach(fieldName => {
        const field = document.querySelector(`[name="${fieldName}"]`);
        if (field) {
            field.addEventListener('input', validateTravelForm);
            field.addEventListener('change', validateTravelForm);
        }
    });
    
    // Initial validation
    validateTravelForm();
}

// Enhanced form validation for travel tour
function validateTravelForm() {
    // Check which step is currently visible
    const step1 = document.getElementById('travel-step-1');
    const step2 = document.getElementById('travel-step-2');
    
    let requiredFields = [];
    
    // If step 1 is visible, validate step 1 fields only
    if (step1 && !step1.classList.contains('hidden')) {
        requiredFields = ['departureTime', 'departureDate', 'transport'];
    }
    // If step 2 is visible, validate all fields
    else if (step2 && !step2.classList.contains('hidden')) {
        requiredFields = ['departureTime', 'departureDate', 'transport', 'days', 'budget'];
    }
    
    let isValid = true;
    
    requiredFields.forEach(fieldName => {
        const field = document.querySelector(`[name="${fieldName}"]`);
        if (field && !field.value.trim()) {
            isValid = false;
        }
    });
    
    const continueBtn = document.getElementById('continue-to-step-2');
    if (continueBtn) {
        continueBtn.disabled = !isValid;
        if (isValid) {
            continueBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            continueBtn.classList.add('hover:bg-blue-700');
        } else {
            continueBtn.classList.add('opacity-50', 'cursor-not-allowed');
            continueBtn.classList.remove('hover:bg-blue-700');
        }
    }
    
    // Also validate search button in step 2
    const searchBtn = document.querySelector('#travelTourSearchForm button[type="submit"]');
    if (searchBtn && step2 && !step2.classList.contains('hidden')) {
        const step2Valid = ['departureTime', 'departureDate', 'transport', 'days', 'budget'].every(fieldName => {
            const field = document.querySelector(`[name="${fieldName}"]`);
            return field && field.value.trim();
        });
        
        searchBtn.disabled = !step2Valid;
        if (step2Valid) {
            searchBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            searchBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
    
    return isValid;
}

// Handle Travel Tour Search
function handleTravelTourSearch() {
    console.log('🔍 Executing travel tour search...');
    
    // Show loading state
    const loadingDiv = document.getElementById('tourLoading');
    const resultsDiv = document.getElementById('tourResults');
    
    if (loadingDiv) loadingDiv.classList.remove('hidden');
    if (resultsDiv) resultsDiv.classList.add('hidden');
    
    // Collect form data
    const formData = new FormData(document.getElementById('travelTourSearchForm'));
    const searchData = {
        departure: document.getElementById('departure')?.value || '',
        destination: document.getElementById('destination')?.value || '',
        departureTime: formData.get('departureTime'),
        departureDate: formData.get('departureDate'),
        transport: formData.get('transport'),
        hotel: formData.get('hotel'),
        restaurant: formData.get('restaurant'),
        recreation: formData.get('recreation'),
        days: formData.get('days'),
        budget: formData.get('budget'),
        localTransport: formData.get('localTransport')
    };
    
    console.log('🎯 Search data:', searchData);
    
    // Call the real API to generate tour
    generateTourFromAPI(searchData);
}

// Generate tour using the backend API
async function generateTourFromAPI(searchData) {
    try {
        // Prepare the data in the format expected by Gemini AI
        const tourRequestData = {
            user_id: "U094",  // This should come from session/login
            start_city_id: parseInt(searchData.departure) || 1818253931,  // Convert to int
            destination_city_id: parseInt(searchData.destination) || 1410836482,  // Convert to int
            hotel_ids: searchData.hotel ? [searchData.hotel] : [],
            activity_ids: searchData.recreation ? [searchData.recreation] : [],
            restaurant_ids: searchData.restaurant ? [searchData.restaurant] : [],
            transport_ids: searchData.transport ? [searchData.transport] : [],
            guest_count: parseInt(searchData.days) || 3,  // Using days as guest_count for now
            duration_days: parseInt(searchData.days) || 3,
            target_budget: parseInt(searchData.budget) || 1000,
            user_preferences: {
                liked_hotels: searchData.hotel ? [searchData.hotel] : [],
                liked_activities: searchData.recreation ? [searchData.recreation] : [],
                liked_restaurants: searchData.restaurant ? [searchData.restaurant] : [],
                liked_transport_modes: searchData.transport ? [searchData.transport] : [],
                disliked_hotels: [],
                disliked_activities: [],
                disliked_restaurants: [],
                disliked_transport_modes: []
            }
        };
        
        console.log('📤 Sending tour request to API:', tourRequestData);
        
        // Make API call to backend
        const response = await fetch('/api/generate-tour', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(tourRequestData)
        });
        
        const result = await response.json();
        
        if (result.success && result.tour) {
            console.log('✅ Tour generated successfully:', result.tour);
            displayGeneratedTour(result.tour);
        } else {
            console.error('❌ Tour generation failed:', result.error);
            displayTourError(result.error || 'Failed to generate tour');
        }
        
    } catch (error) {
        console.error('❌ API call failed:', error);
        displayTourError('Failed to connect to the server. Please try again.');
    } finally {
        // Hide loading state
        const loadingDiv = document.getElementById('tourLoading');
        const resultsDiv = document.getElementById('tourResults');
        
        if (loadingDiv) loadingDiv.classList.add('hidden');
        if (resultsDiv) resultsDiv.classList.remove('hidden');
    }
}

// Display Generated Tour from API
function displayGeneratedTour(tourData) {
    console.log('🎨 Displaying generated tour:', tourData);
    
    const tourProgramsList = document.getElementById('tourProgramsList');
    if (!tourProgramsList) return;
    
    tourProgramsList.innerHTML = '';
    
    // Create a beautiful tour card with the generated data
    const tourCard = document.createElement('div');
    tourCard.className = 'tour-program-card generated-tour-card';
    tourCard.innerHTML = `
        <div class="tour-card-header-special">
            <div class="tour-header-badge">
                <i class="fas fa-magic"></i>
                <span data-en="AI Generated Tour" data-vi="Tour do AI tạo">AI Generated Tour</span>
            </div>
        </div>
        <div class="tour-card-content">
            <div class="tour-card-header">
                <div>
                    <h4 class="tour-card-title">${tourData.start_city} → ${tourData.destination_city}</h4>
                    <div class="tour-card-info">
                        <div class="tour-card-price" data-en="Total Cost: $${tourData.total_estimated_cost.toFixed(2)}" data-vi="Tổng chi phí: $${tourData.total_estimated_cost.toFixed(2)}">
                            Total Cost: $${tourData.total_estimated_cost.toFixed(2)}
                        </div>
                        <div class="tour-card-time" data-en="Duration: ${tourData.duration_days} days" data-vi="Thời gian: ${tourData.duration_days} ngày">
                            Duration: ${tourData.duration_days} days
                        </div>
                        <div class="tour-card-guests" data-en="Guests: ${tourData.guest_count}" data-vi="Khách: ${tourData.guest_count}">
                            Guests: ${tourData.guest_count}
                        </div>
                        <div class="tour-card-budget" data-en="Budget: $${tourData.budget.toFixed(2)}" data-vi="Ngân sách: $${tourData.budget.toFixed(2)}">
                            Budget: $${tourData.budget.toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>
            <div class="tour-schedule-preview">
                <h5 data-en="Schedule Preview:" data-vi="Xem trước lịch trình:">Schedule Preview:</h5>
                <div class="schedule-summary">
                    ${generateScheduleSummary(tourData.schedule)}
                </div>
            </div>
            <div class="tour-card-actions">
                <button class="tour-card-btn secondary" onclick="viewGeneratedTourDetails('${tourData.tour_id}')" data-en="View Full Schedule" data-vi="Xem lịch trình đầy đủ">
                    <i class="fas fa-calendar-alt mr-2"></i>View Full Schedule
                </button>
                <button class="tour-card-btn primary" onclick="bookGeneratedTour('${tourData.tour_id}')" data-en="Book This Tour" data-vi="Đặt Tour Này">
                    <i class="fas fa-check-circle mr-2"></i>Book This Tour
                </button>
            </div>
        </div>
    `;
    tourProgramsList.appendChild(tourCard);
    
    // Store the generated tour data globally
    window.generatedTourData = tourData;
    
    // Update language display if needed
    if (typeof updateLanguageDisplay === 'function') {
        updateLanguageDisplay();
    }
    
    // Show success notification
    showNotification('Tour generated successfully!', 'success');
}

// Generate schedule summary for preview
function generateScheduleSummary(schedule) {
    let summaryHTML = '';
    
    schedule.forEach((day, index) => {
        const dayActivities = day.activities;
        const mainActivities = dayActivities.filter(activity => activity.type === 'activity');
        const restaurants = dayActivities.filter(activity => activity.type === 'restaurant');
        
        summaryHTML += `
            <div class="day-summary">
                <div class="day-number">Day ${day.day}</div>
                <div class="day-highlights">
                    ${mainActivities.length > 0 ? `<span class="activity-highlight"><i class="fas fa-map-marker-alt"></i> ${mainActivities[0].place_name}</span>` : ''}
                    ${restaurants.length > 0 ? `<span class="restaurant-highlight"><i class="fas fa-utensils"></i> ${restaurants[0].place_name}</span>` : ''}
                    ${mainActivities.length > 1 ? `<span class="more-activities">+${mainActivities.length - 1} more</span>` : ''}
                </div>
            </div>
        `;
    });
    
    return summaryHTML;
}

// Display tour error
function displayTourError(errorMessage) {
    console.log('❌ Displaying tour error:', errorMessage);
    
    const tourProgramsList = document.getElementById('tourProgramsList');
    if (!tourProgramsList) return;
    
    tourProgramsList.innerHTML = `
        <div class="tour-error-card">
            <div class="error-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="error-content">
                <h4 data-en="Tour Generation Failed" data-vi="Tạo tour thất bại">Tour Generation Failed</h4>
                <p data-en="${errorMessage}" data-vi="${errorMessage}">${errorMessage}</p>
                <button class="retry-btn" onclick="handleTravelTourSearch()" data-en="Try Again" data-vi="Thử lại">
                    <i class="fas fa-redo mr-2"></i>Try Again
                </button>
            </div>
        </div>
    `;
    
    // Update language display if needed
    if (typeof updateLanguageDisplay === 'function') {
        updateLanguageDisplay();
    }
}

// Display Tour Results (keep for backward compatibility)
function displayTourResults(searchData) {
    console.log('🎨 Displaying tour results...');
    
    const tourProgramsList = document.getElementById('tourProgramsList');
    if (!tourProgramsList) return;
    
    // Generate demo tour programs based on destination
    const destination = searchData.destination || 'Phu Quoc';
    const days = searchData.days || '3';
    const budget = searchData.budget || '50000';
    
    const tourPrograms = generateTourPrograms(destination, days, budget);
    
    tourProgramsList.innerHTML = '';
    
    tourPrograms.forEach((tour, index) => {
        const tourCard = document.createElement('div');
        tourCard.className = 'tour-program-card';
        tourCard.innerHTML = `
            <img src="${tour.image}" alt="${tour.name}" class="tour-card-image">
            <div class="tour-card-content">
                <div class="tour-card-header">
                    <div>
                        <h4 class="tour-card-title">${tour.name}</h4>
                        <div class="tour-card-info">
                            <div class="tour-card-price" data-en="Price From: ${tour.priceDisplay}" data-vi="Giá từ: ${tour.priceDisplay}">Price From: ${tour.priceDisplay}</div>
                            <div class="tour-card-time" data-en="Time: ${tour.duration}" data-vi="Thời gian: ${tour.duration}">Time: ${tour.duration}</div>
                        </div>
                    </div>
                </div>
                <div class="tour-card-actions">
                    <button class="tour-card-btn secondary" onclick="viewTourDetails('${tour.id}')" data-en="See Details" data-vi="Xem chi tiết">See Details</button>
                    <button class="tour-card-btn primary" onclick="selectTour('${tour.id}')" data-en="Select Tour" data-vi="Chọn Tour">Select Tour</button>
                </div>
            </div>
        `;
        tourProgramsList.appendChild(tourCard);
    });
    
    // Store tourPrograms for later use
    window.tourPrograms = tourPrograms;
    
    // Update language display if needed
    if (typeof updateLanguageDisplay === 'function') {
        updateLanguageDisplay();
    }
}

// Generate demo tour programs
function generateTourPrograms(destination, days, budget) {
    const images = [
        'https://cdn3.ivivu.com/2023/02/T%E1%BB%95ng-quan-du-l%E1%BB%8Bch-Ph%C3%BA-Qu%E1%BB%91c-ivivu.jpg',
        'https://pqr.vn/wp-content/uploads/2018/06/muoi-ghanh-dau-dao-ngoc-phu-quoc-pqr-2.jpg',
        'https://phuquocgo.vn/wp-content/uploads/2024/03/tour-4-dao-phu-quoc-59.jpg'
    ];
    
    return [
        {
            id: 'tour-1',
            name: destination,
            duration: `${days} day`,
            priceDisplay: '$None',
            price: 0,
            code: `${destination} -1`,
            image: images[0] || images[2],
            description: `Experience the beauty of ${destination} with our ${days}-day tour package.`
        },
        {
            id: 'tour-2', 
            name: destination,
            duration: `4 day`,
            priceDisplay: '$None',
            price: 0,
            code: `${destination} -2`,
            image: images[1] || images[0],
            description: `Discover hidden gems of ${destination} in this extended 4-day adventure.`
        }
    ];
}

// Global functions for tour actions
window.viewTourDetails = function(tourId) {
    console.log('👁️ Viewing tour details for:', tourId);
    
    // Show loading state with overlay
    showTourDetailsLoading();
    
    // Simulate loading time before showing details
    setTimeout(() => {
        hideTourDetailsLoading();
        showTourDetailModal(tourId);
    }, 1500); // 1.5 second loading
};

window.selectTour = function(tourId) {
    console.log('✅ Selecting tour:', tourId);
    // Here you would handle tour selection logic
    // Note: Removed alert message to improve UX - users can view details directly
};

// Show Tour Detail Modal with improved positioning and animation
function showTourDetailModal(tourId) {
    // Remove any existing modal first
    const existingModal = document.getElementById('tourDetailModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create completely new modal
    const modal = document.createElement('div');
    modal.id = 'tourDetailModal';
    modal.className = 'tour-detail-container';
    
    // Apply critical styling with !important - improved backdrop blur and animation
    modal.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(0, 0, 0, 0.8) !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
        z-index: 99999 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 20px !important;
        margin: 0 !important;
        box-sizing: border-box !important;
        opacity: 0 !important;
    `;
    
    // Generate tour detail content with actual tour data
    const tourData = getTourDetailData(tourId);
    modal.innerHTML = generateTourDetailHTML(tourData);
    
    // Append to body
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Force center with timeout and improve animation
    setTimeout(() => {
        modal.style.opacity = '1';
        modal.style.animation = 'fadeInModal 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
        
        // Double-check content centering with better positioning
        const content = modal.querySelector('.new-tour-modal');
        if (content) {
            content.style.cssText += `
                margin: auto !important;
                position: relative !important;
                left: 0 !important;
                right: 0 !important;
                top: 0 !important;
                bottom: 0 !important;
                max-height: 85vh !important;
                max-width: 1100px !important;
                width: 95% !important;
                overflow: hidden !important;
                display: flex !important;
                border-radius: 16px !important;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4) !important;
            `;
        }
        
        // Make sure close button is on the right with better styling
        const closeBtn = modal.querySelector('.new-modal-close');
        if (closeBtn) {
            closeBtn.style.cssText += `
                position: absolute !important;
                top: 20px !important;
                right: 20px !important;
                left: auto !important;
                z-index: 9999 !important;
                background: rgba(255, 255, 255, 0.95) !important;
                border: none !important;
                width: 36px !important;
                height: 36px !important;
                border-radius: 50% !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                cursor: pointer !important;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
                transition: all 0.2s ease !important;
            `;
        }
        
        // Auto expand the first day in the schedule
        const firstDay = document.querySelector('.schedule-day');
        if (firstDay) {
            firstDay.classList.add('expanded');
        }
    }, 50);
    
    // Initialize tour detail functionality
    initializeTourDetailModal();
}

// Get tour detail data
function getTourDetailData(tourId) {
    // This would normally come from an API
    // In a real implementation, we would fetch this data from the backend using the tourId
    // For now, we'll add more detailed schedule data to show the tour itinerary better
    return {
        id: tourId,
        name: 'Phu Quoc',
        duration: '3 day',
        code: 'Phu Quoc -1',
        departureDate: '--/--/----',
        images: [
            'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Bai-sao-phu-quoc-tuonglamphotos.jpg/960px-Bai-sao-phu-quoc-tuonglamphotos.jpg',
            'https://bcp.cdnchinhphu.vn/334894974524682240/2025/7/10/1746702872-1752146927950856924722.jpg',
            'https://khaihoanphuquoc.com.vn/wp-content/uploads/2023/11/du-lich-phu-quoc-thang-10-1.jpg',
            'https://storage.googleapis.com/blogvxr-uploads/2025/04/6f2761fe-cach-di-dao-phu-quoc-1540694.jpg',
            'https://ik.imagekit.io/tvlk/blog/2025/02/YxzFGZxQ-kinh-nghiem-du-lich-phu-quoc-6.jpg',
            'https://media-cdn-v2.laodong.vn/storage/newsportal/2024/10/16/1408741/_1Bai-Kem-Phu-Quoc.jpg'
        ],
        schedule: [
            {
                day: 1,
                date: '26-09-2025',
                activities: [
                    {
                        time: '9:00 AM - 12:00 PM',
                        activity: 'Arrive at JW Marriott Phu Quoc Emerald Bay Resort & Spa and check in. Relax by the pool or beach.',
                        cost: '$10000'
                    },
                    {
                        time: '12:00 PM - 1:00 PM',
                        activity: 'Lunch at the resort restaurant.',
                        cost: '$200'
                    },
                    {
                        time: '1:00 PM - 4:00 PM',
                        activity: 'Explore the resort\'s grounds and enjoy the amenities.',
                        cost: 'Included in resort fee'
                    },
                    {
                        time: '4:00 PM - 6:00 PM',
                        activity: 'Relax and unwind.',
                        cost: 'Included in resort fee'
                    },
                    {
                        time: '6:00 PM - 7:00 PM',
                        activity: 'Dinner at the resort restaurant.',
                        cost: '$200'
                    },
                    {
                        time: '7:00 PM onwards',
                        activity: 'Relax at the resort.',
                        cost: 'Included in resort fee'
                    }
                ]
            },
            {
                day: 2,
                date: '27-09-2025',
                activities: [
                    {
                        time: '8:00 AM - 9:00 AM',
                        activity: 'Breakfast at the resort.',
                        cost: '$450'
                    },
                    {
                        time: '9:00 AM - 12:00 PM',
                        activity: 'Island hopping and snorkeling tour at An Thoi Islands.',
                        cost: '$250'
                    },
                    {
                        time: '12:00 PM - 1:30 PM',
                        activity: 'Seafood lunch on the boat.',
                        cost: '$150'
                    },
                    {
                        time: '1:30 PM - 4:00 PM',
                        activity: 'Visit to Sao Beach for swimming and relaxation.',
                        cost: '$120'
                    },
                    {
                        time: '4:00 PM - 6:00 PM',
                        activity: 'Return to hotel and freshen up.',
                        cost: 'Included in transport'
                    },
                    {
                        time: '6:00 PM - 8:00 PM',
                        activity: 'Dinner at local seafood restaurant in Duong Dong town.',
                        cost: '$300'
                    }
                ]
            },
            {
                day: 3,
                date: '28-09-2025',
                activities: [
                    {
                        time: '7:30 AM - 8:30 AM',
                        activity: 'Breakfast at the resort.',
                        cost: '$450'
                    },
                    {
                        time: '9:00 AM - 11:00 AM',
                        activity: 'Visit to Phu Quoc National Park and hiking tour.',
                        cost: '$180'
                    },
                    {
                        time: '11:00 AM - 12:30 PM',
                        activity: 'Visit to Pepper Farm and Bee Farm with local product tasting.',
                        cost: '$120'
                    },
                    {
                        time: '12:30 PM - 2:00 PM',
                        activity: 'Lunch at a local restaurant.',
                        cost: '$150'
                    },
                    {
                        time: '2:00 PM - 4:00 PM',
                        activity: 'Visit to Fish Sauce Factory and Sim Wine Factory.',
                        cost: '$80'
                    },
                    {
                        time: '4:00 PM - 5:30 PM',
                        activity: 'Visit to Dinh Cau Rock Temple at sunset.',
                        cost: '$0'
                    },
                    {
                        time: '6:00 PM - 8:00 PM',
                        activity: 'Farewell dinner at the night market.',
                        cost: '$250'
                    },
                    {
                        time: '8:00 PM onwards',
                        activity: 'Free time to shop at Duong Dong night market.',
                        cost: '$0'
                    }
                ]
            }
        ],
        summary: {
            day1Cost: '$10400',
            day2Cost: '$1270',
            day3Cost: '$1230',
            totalCost: '$12900',
            budget: '$50000'
        }
    };
}

// Generate tour detail HTML - COMPLETELY NEW LAYOUT
function generateTourDetailHTML(tourData) {
    return `
        <div class="new-tour-modal">
            <button class="new-modal-close" onclick="closeTourDetailModal()">
                <i class="fas fa-times"></i>
            </button>
            
            <!-- Left Side - Image Gallery -->
            <div class="new-modal-left">
                <div class="new-image-gallery">
                    <div class="new-main-image">
                        <img src="${tourData.images[0]}" alt="${tourData.name}" class="new-main-img" id="newMainImg">
                    </div>
                    <div class="new-image-thumbnails">
                        ${generateNewTourImageThumbnails(tourData.images)}
                    </div>
                </div>
            </div>
            
            <!-- Right Side - Information & Tabs -->
            <div class="new-modal-right">
                <!-- Tour Info Header -->
                <div class="new-tour-info-header">
                    <h1 class="new-tour-title">${tourData.name}</h1>
                    <div class="new-tour-meta">
                        <div class="new-info-card">
                            <span class="new-info-label" data-en="Price from:" data-vi="Giá từ:">Price from:</span>
                            <span class="new-info-value new-price">None USD/Guest</span>
                        </div>
                        <div class="new-info-card">
                            <span class="new-info-label" data-en="Tour code:" data-vi="Mã tour:">Tour code:</span>
                            <span class="new-info-value">${tourData.code}</span>
                        </div>
                        <div class="new-info-card">
                            <span class="new-info-label" data-en="Duration:" data-vi="Thời gian:">Duration:</span>
                            <span class="new-info-value">${tourData.duration}</span>
                        </div>
                        <div class="new-info-card">
                            <span class="new-info-label" data-en="Departure:" data-vi="Khởi hành:">Departure:</span>
                            <span class="new-info-value">${tourData.departureDate}</span>
                        </div>
                    </div>
                    

                </div>
                
                <!-- Tabs Navigation -->
                <div class="new-tour-tabs">
                    <button class="new-tour-tab active" onclick="showTourTab('departure')" data-en="📅 Departure Schedule" data-vi="📅 Lịch khởi hành">📅 Departure Schedule</button>
                    <button class="new-tour-tab" onclick="showTourTab('detailed')" data-en="📋 Detailed Schedule" data-vi="📋 Lịch trình chi tiết">📋 Detailed Schedule</button>
                    <button class="new-tour-tab" onclick="showTourTab('summary')" data-en="💰 Summary" data-vi="💰 Tóm tắt">💰 Summary</button>
                </div>
                
                <!-- Tab Content -->
                <div class="new-tab-content-area">
                    <div id="departure-tab" class="new-tab-content active">
                        ${generateDepartureCalendarHTML()}
                    </div>
                    
                    <div id="detailed-tab" class="new-tab-content">
                        ${generateDetailedScheduleHTML(tourData.schedule)}
                    </div>
                    
                    <div id="summary-tab" class="new-tab-content">
                        ${generateSummaryHTML(tourData.summary)}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Generate departure calendar HTML with departure time selection
function generateDepartureCalendarHTML() {
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    
    return `
        <div class="departure-full-section">
            
            <!-- Calendar Section -->
            <div class="departure-calendar">
                <h4 class="departure-section-title" data-en="📅 Select Departure Date" data-vi="📅 Chọn ngày khởi hành">📅 Select Departure Date</h4>
                <div class="calendar-header">
                    <h3 class="calendar-month">June 2025</h3>
                    <div class="calendar-nav">
                        <button class="calendar-nav-btn" onclick="changeMonth(-1)">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button class="calendar-nav-btn" onclick="changeMonth(1)">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
                <div class="calendar-grid">
                    <div class="calendar-day-header">Sun</div>
                    <div class="calendar-day-header">Mon</div>
                    <div class="calendar-day-header">Tue</div>
                    <div class="calendar-day-header">Wed</div>
                    <div class="calendar-day-header">Thu</div>
                    <div class="calendar-day-header">Fri</div>
                    <div class="calendar-day-header">Sat</div>
                    ${generateCalendarDays()}
                </div>
                
                <!-- Select Departure Time Button -->
                <div class="departure-time-button-container">
                    <button class="select-departure-time-btn" onclick="selectDepartureTime()">
                        <i class="fas fa-clock mr-2"></i>
                        <span data-en="Select Departure Time" data-vi="Chọn Giờ Khởi Hành">Select Departure Time</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Generate calendar days
function generateCalendarDays() {
    let daysHTML = '';
    
    // June 2025 calendar
    const days = [
        '', '', '', '', '', '', '1',
        '2', '3', '4', '5', '6', '7', '8',
        '9', '10', '11', '12', '13', '14', '15',
        '16', '17', '18', '19', '20', '21', '22',
        '23', '24', '25', '26', '27', '28', '29',
        '30', '', '', '', '', '', ''
    ];
    
    days.forEach(day => {
        if (day === '') {
            daysHTML += '<div class="calendar-day other-month"></div>';
        } else {
            daysHTML += `<div class="calendar-day" onclick="selectDate('${day}')">${day}</div>`;
        }
    });
    
    return daysHTML;
}

// Generate detailed schedule HTML with improved styling and timeline visualization
function generateDetailedScheduleHTML(schedule) {
    let scheduleHTML = '<div class="detailed-schedule">';
    
    schedule.forEach(day => {
        // Add improved styling with day count badge
        scheduleHTML += `
            <div class="schedule-day" onclick="toggleScheduleDay(this)">
                <div class="schedule-day-header">
                    <div class="day-header-content">
                        <div class="day-badge">${day.day}</div>
                        <h4 class="schedule-day-title" data-en="Day ${day.day}: ${day.date}" data-vi="Ngày ${day.day}: ${day.date}">Day ${day.day}: ${day.date}</h4>
                    </div>
                    <button class="schedule-day-toggle">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
                <div class="schedule-day-content">
                    <div class="timeline-container">
        `;
        
        // Add enhanced timeline with improved activity cards
        day.activities.forEach((activity, index) => {
            const isLast = index === day.activities.length - 1;
            
            // Add icons based on activity type
            let activityIcon = 'fa-map-marker-alt';
            let iconColor = '';
            
            if (activity.activity.toLowerCase().includes('hotel') || 
                activity.activity.toLowerCase().includes('resort') || 
                activity.activity.toLowerCase().includes('check in') || 
                activity.activity.toLowerCase().includes('accommodation')) {
                activityIcon = 'fa-hotel';
                iconColor = 'text-blue-500';
            } else if (activity.activity.toLowerCase().includes('lunch') || 
                      activity.activity.toLowerCase().includes('dinner') || 
                      activity.activity.toLowerCase().includes('breakfast') || 
                      activity.activity.toLowerCase().includes('food') || 
                      activity.activity.toLowerCase().includes('restaurant')) {
                activityIcon = 'fa-utensils';
                iconColor = 'text-yellow-600';
            } else if (activity.activity.toLowerCase().includes('tour') || 
                      activity.activity.toLowerCase().includes('visit') || 
                      activity.activity.toLowerCase().includes('explore')) {
                activityIcon = 'fa-hiking';
                iconColor = 'text-green-600';
            } else if (activity.activity.toLowerCase().includes('travel') || 
                      activity.activity.toLowerCase().includes('transport') || 
                      activity.activity.toLowerCase().includes('transfer')) {
                activityIcon = 'fa-shuttle-van';
                iconColor = 'text-purple-600';
            } else if (activity.activity.toLowerCase().includes('relax') || 
                      activity.activity.toLowerCase().includes('leisure') || 
                      activity.activity.toLowerCase().includes('free time')) {
                activityIcon = 'fa-umbrella-beach';
                iconColor = 'text-pink-500';
            }
            
            scheduleHTML += `
                <div class="timeline-item ${isLast ? 'last-item' : ''}">
                    <div class="timeline-marker"></div>
                    <div class="timeline-content">
                        <div class="activity-card">
                            <div class="activity-time">
                                <i class="fas fa-clock"></i> ${activity.start_time} - ${activity.end_time}
                                ${activity.type === 'transfer' && activity.distance_km ? `<span class="text-gray-500 ml-2">${activity.distance_km}km</span>` : ''}
                            </div>
                            <div class="activity-description">
                                ${activity.type === 'transfer' ? 
                                    `<i class="fas ${getTransportIcon(activity.transport_mode)} mr-2 text-blue-500"></i>
                                     <span class="font-medium">${getTransportName(activity.transport_mode)}</span>` :
                                    `<i class="fas ${activityIcon} mr-2 ${iconColor}"></i>
                                     ${activity.activity || activity.place_name}`
                                }
                            </div>
                            <div class="activity-cost" data-en="Cost: ${activity.cost}" data-vi="Chi phí: ${activity.cost}">
                                <i class="fas fa-tag"></i> Cost: ${activity.cost}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        scheduleHTML += `
                    </div>
                </div>
            </div>
        `;
    });
    
    scheduleHTML += '</div>';
    return scheduleHTML;
}

/**
 * Get transport mode icon
 * @param {string} transportMode - Transport mode (walk, bike, scooter, taxi, bus, metro)
 * @returns {string} Font Awesome icon class
 */
function getTransportIcon(transportMode) {
    if (!transportMode) return 'fa-route';
    
    const iconMap = {
        'walk': 'fa-walking',
        'bike': 'fa-bicycle',
        'bicycle': 'fa-bicycle',
        'scooter': 'fa-motorcycle',
        'motorcycle': 'fa-motorcycle',
        'motorbike': 'fa-motorcycle',
        'taxi': 'fa-taxi',
        'grab': 'fa-taxi',
        'uber': 'fa-taxi',
        'bus': 'fa-bus',
        'metro': 'fa-subway',
        'subway': 'fa-subway',
        'train': 'fa-train',
        'car': 'fa-car',
        'ojek': 'fa-motorcycle',
        'grabbike': 'fa-motorcycle',
        'rickshaw': 'fa-taxi',
        'cyclo': 'fa-taxi',
        'tricycle': 'fa-taxi',
        'ferry': 'fa-ship',
        'boat': 'fa-ship',
        'ship': 'fa-ship'
    };
    
    // First try exact match (case-insensitive)
    const lowerMode = transportMode.toLowerCase();
    if (iconMap[lowerMode]) {
        return iconMap[lowerMode];
    }
    
    // Then try partial matches for database transport names
    for (const [key, value] of Object.entries(iconMap)) {
        if (lowerMode.includes(key)) {
            return value;
        }
    }
    
    return 'fa-route';
}

/**
 * Get transport mode Vietnamese name
 * @param {string} transportMode - Transport mode
 * @returns {string} Vietnamese name
 */
function getTransportName(transportMode) {
    if (!transportMode) return 'Di chuyển';
    
    const nameMap = {
        'walk': 'Đi bộ',
        'bike': 'Xe đạp', 
        'bicycle': 'Xe đạp',
        'scooter': 'Xe máy',
        'motorcycle': 'Xe máy',
        'motorbike': 'Xe máy',
        'taxi': 'Taxi',
        'grab': 'Grab',
        'uber': 'Uber',
        'bus': 'Xe buýt',
        'metro': 'Tàu điện',
        'train': 'Tàu hóa',
        'car': 'Ô tô',
        'ojek': 'Ojek',
        'grabbike': 'GrabBike',
        'rickshaw': 'Xích lô',
        'cyclo': 'Xích lô',
        'tricycle': 'Xe ba bánh',
        'ferry': 'Phà',
        'boat': 'Thuyền',
        'ship': 'Tàu thủy'
    };
    
    // First try exact match (case-insensitive)
    const lowerMode = transportMode.toLowerCase();
    if (nameMap[lowerMode]) {
        return nameMap[lowerMode];
    }
    
    // Then try partial matches for database transport names
    for (const [key, value] of Object.entries(nameMap)) {
        if (lowerMode.includes(key)) {
            return value;
        }
    }
    
    // If no match found, capitalize the first letter and return
    return transportMode.charAt(0).toUpperCase() + transportMode.slice(1).toLowerCase();
}

// Generate summary HTML with improved visual representation
function generateSummaryHTML(summary) {
    // Calculate percentage for budget progress bar
    const totalCostValue = parseInt(summary.totalCost.replace('$', '').replace(/,/g, ''));
    const budgetValue = parseInt(summary.budget.replace('$', '').replace(/,/g, ''));
    const percentUsed = Math.min((totalCostValue / budgetValue) * 100, 100);
    const remaining = budgetValue - totalCostValue;
    
    // Determine color scheme based on how much of budget is used
    let progressColor = 'bg-green-500';
    let percentClass = 'text-green-600';
    
    if (percentUsed > 90) {
        progressColor = 'bg-red-500';
        percentClass = 'text-red-600';
    } else if (percentUsed > 70) {
        progressColor = 'bg-yellow-500';
        percentClass = 'text-yellow-600';
    }
    
    return `
        <div class="trip-summary">
            <h3 class="summary-title" data-en="Trip Budget Analysis" data-vi="Phân Tích Ngân Sách Chuyến Đi">Trip Budget Analysis</h3>
            
            <div class="summary-cards">
                <div class="summary-card">
                    <div class="summary-card-header">
                        <i class="fas fa-calendar-day"></i>
                        <span data-en="Day 1" data-vi="Ngày 1">Day 1</span>
                    </div>
                    <div class="summary-card-amount">${summary.day1Cost}</div>
                </div>
                
                <div class="summary-card">
                    <div class="summary-card-header">
                        <i class="fas fa-calendar-day"></i>
                        <span data-en="Day 2" data-vi="Ngày 2">Day 2</span>
                    </div>
                    <div class="summary-card-amount">${summary.day2Cost}</div>
                </div>
                
                <div class="summary-card">
                    <div class="summary-card-header">
                        <i class="fas fa-calendar-day"></i>
                        <span data-en="Day 3" data-vi="Ngày 3">Day 3</span>
                    </div>
                    <div class="summary-card-amount">${summary.day3Cost}</div>
                </div>
                
                <div class="summary-card total">
                    <div class="summary-card-header">
                        <i class="fas fa-calculator"></i>
                        <span data-en="Total Cost" data-vi="Tổng chi phí">Total Cost</span>
                    </div>
                    <div class="summary-card-amount">${summary.totalCost}</div>
                </div>
            </div>
            
            <div class="budget-comparison">
                <div class="budget-info">
                    <div>
                        <i class="fas fa-wallet mr-2"></i>
                        <span class="font-bold" data-en="Budget" data-vi="Ngân sách">Budget: ${summary.budget}</span>
                    </div>
                    <div class="text-right ${percentClass} font-semibold">
                        <span>${percentUsed.toFixed(1)}%</span>
                        <i class="fas fa-chart-pie ml-2"></i>
                    </div>
                </div>
                
                <div class="budget-progress-container">
                    <div class="budget-progress-bar">
                        <div class="budget-progress ${progressColor}" style="width: ${percentUsed}%"></div>
                    </div>
                    <div class="budget-labels">
                        <span class="budget-spent" data-en="Spent" data-vi="Đã chi">
                            <i class="fas fa-coins mr-1"></i> Spent: ${summary.totalCost}
                        </span>
                        <span class="budget-remaining" data-en="Remaining" data-vi="Còn lại">
                            <i class="fas fa-piggy-bank mr-1"></i> Remaining: $${remaining.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="cost-breakdown mt-6">
                <h4 class="font-semibold mb-2" data-en="Cost Breakdown" data-vi="Chi Tiết Chi Phí">Cost Breakdown</h4>
                <div class="flex flex-col space-y-2">
                    <div class="flex justify-between items-center">
                        <span data-en="Accommodation" data-vi="Chỗ ở">
                            <i class="fas fa-hotel mr-2 text-blue-500"></i> Accommodation
                        </span>
                        <span>$${(totalCostValue * 0.45).toFixed(0)}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span data-en="Food & Dining" data-vi="Ăn uống">
                            <i class="fas fa-utensils mr-2 text-yellow-500"></i> Food & Dining
                        </span>
                        <span>$${(totalCostValue * 0.25).toFixed(0)}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span data-en="Activities" data-vi="Hoạt động">
                            <i class="fas fa-hiking mr-2 text-green-500"></i> Activities
                        </span>
                        <span>$${(totalCostValue * 0.20).toFixed(0)}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span data-en="Transport" data-vi="Di chuyển">
                            <i class="fas fa-shuttle-van mr-2 text-purple-500"></i> Transport
                        </span>
                        <span>$${(totalCostValue * 0.10).toFixed(0)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Generate NEW tour image thumbnails
function generateNewTourImageThumbnails(images) {
    let thumbnailsHTML = '';
    
    images.forEach((imageUrl, index) => {
        thumbnailsHTML += `
            <div class="new-thumbnail ${index === 0 ? 'active' : ''}" onclick="changeNewMainImage('${imageUrl}', this)">
                <img src="${imageUrl}" alt="Tour thumbnail ${index + 1}">
            </div>
        `;
    });
    
    return thumbnailsHTML;
}

// Generate tour image thumbnails (keep old function for compatibility)
function generateTourImageThumbnails(images) {
    let thumbnailsHTML = '';
    
    images.forEach((imageUrl, index) => {
        thumbnailsHTML += `
            <div class="tour-thumbnail ${index === 0 ? 'active' : ''}" onclick="changeTourMainImage('${imageUrl}', this)">
                <img src="${imageUrl}" alt="Tour thumbnail ${index + 1}">
            </div>
        `;
    });
    
    return thumbnailsHTML;
}

// Change NEW main tour image
window.changeNewMainImage = function(imageUrl, thumbnailElement) {
    // Update main image
    const mainImage = document.querySelector('.new-main-img');
    if (mainImage) {
        mainImage.src = imageUrl;
        // Add fade effect
        mainImage.style.opacity = '0';
        setTimeout(() => {
            mainImage.style.opacity = '1';
        }, 150);
    }
    
    // Update active thumbnail
    document.querySelectorAll('.new-thumbnail').forEach(thumbnail => {
        thumbnail.classList.remove('active');
    });
    
    if (thumbnailElement) {
        thumbnailElement.classList.add('active');
    }
};

// Change main tour image (keep old function for compatibility)
window.changeTourMainImage = function(imageUrl, thumbnailElement) {
    // Update main image
    const mainImage = document.querySelector('.main-tour-img');
    if (mainImage) {
        mainImage.src = imageUrl;
    }
    
    // Update active thumbnail
    document.querySelectorAll('.tour-thumbnail').forEach(thumbnail => {
        thumbnail.classList.remove('active');
    });
    
    if (thumbnailElement) {
        thumbnailElement.classList.add('active');
    }
};

// Initialize tour detail modal functionality
function initializeTourDetailModal() {
    // Set first schedule day as expanded
    const firstDay = document.querySelector('.schedule-day');
    if (firstDay) {
        firstDay.classList.add('expanded');
    }
    
    // Initialize image gallery if available
    const thumbnails = document.querySelectorAll('.tour-thumbnail');
    if (thumbnails.length > 0) {
        thumbnails[0].classList.add('active');
    }
    
    // Initialize departure time selector
    initializeDepartureTimeSelector();
    
    // Update language display
    if (typeof updateLanguageDisplay === 'function') {
        updateLanguageDisplay();
    }
}

// Show Tour Details Loading
function showTourDetailsLoading() {
    // Remove any existing loading overlay
    const existingOverlay = document.getElementById('tourDetailsLoadingOverlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    // Create loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'tourDetailsLoadingOverlay';
    loadingOverlay.innerHTML = `
        <div class="tour-loading-backdrop"></div>
        <div class="tour-loading-content">
            <div class="tour-loading-spinner"></div>
            <div class="tour-loading-text">
                <h3 data-en="Loading Tour Details..." data-vi="Đang tải chi tiết tour...">Loading Tour Details...</h3>
                <p data-en="Please wait while we prepare your tour information" data-vi="Vui lòng đợi trong khi chúng tôi chuẩn bị thông tin tour">Please wait while we prepare your tour information</p>
            </div>
        </div>
    `;
    
    // Add CSS styles for loading overlay
    loadingOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 99998;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: all;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(loadingOverlay);
    document.body.style.overflow = 'hidden';
    
    // Trigger fade in
    setTimeout(() => {
        loadingOverlay.style.opacity = '1';
    }, 50);
    
    // Update language display if available
    if (typeof updateLanguageDisplay === 'function') {
        updateLanguageDisplay();
    }
}

// Hide Tour Details Loading
function hideTourDetailsLoading() {
    const loadingOverlay = document.getElementById('tourDetailsLoadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
            loadingOverlay.remove();
            document.body.style.overflow = 'auto';
        }, 300);
    }
}

// Global functions for tour detail modal
window.closeTourDetailModal = function() {
    const modal = document.getElementById('tourDetailModal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }, 300);
    }
};

window.showTourTab = function(tabName) {
    // Hide all tab contents (both old and new classes)
    document.querySelectorAll('.tour-tab-content, .new-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tabs (both old and new classes)
    document.querySelectorAll('.tour-tab, .new-tour-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab content
    const targetContent = document.getElementById(`${tabName}-tab`);
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    // Add active class to clicked tab
    event.target.classList.add('active');
};

window.toggleScheduleDay = function(dayElement) {
    const scheduleDay = dayElement.closest ? dayElement.closest('.schedule-day') : dayElement;
    if (scheduleDay) {
        scheduleDay.classList.toggle('expanded');
        
        const icon = scheduleDay.querySelector('.schedule-day-toggle i');
        if (icon) {
            if (scheduleDay.classList.contains('expanded')) {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
            } else {
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
            }
        }
    }
};

window.selectDate = function(day) {
    // Remove previous selection
    document.querySelectorAll('.calendar-day.selected').forEach(d => {
        d.classList.remove('selected');
    });
    
    // Add selection to clicked day
    event.target.classList.add('selected');
    
    // Update departure date in tour info
    const departureValue = document.querySelector('.hero-info-value');
    if (departureValue && departureValue.textContent.includes('--/--/----')) {
        departureValue.textContent = `${day}/06/2025`;
    }
    
    console.log('📅 Selected date:', day);
};

window.changeMonth = function(direction) {
    console.log('📅 Changing month:', direction);
    // Here you would implement month navigation logic
};

// Select departure time function
window.selectDepartureTime = function(time, element) {
    // Remove active class from all time options
    document.querySelectorAll('.time-option').forEach(option => {
        option.classList.remove('active');
    });
    
    // Add active class to selected option
    if (element) {
        element.classList.add('active');
    }
    
    const currentLang = window.currentLanguage || 'en';
    const message = currentLang === 'vi' ? 
        `Đã chọn giờ khởi hành: ${time}` :
        `Departure time selected: ${time}`;
    
    console.log('⏰ ' + message);
    
    // Show temporary success notification
    showNotification(message, 'success');
};

// Open date selector (improved function)
window.openDateSelector = function() {
    // Switch to departure schedule tab automatically
    showTourTab('departure');
    
    // Add visual emphasis to calendar
    const calendar = document.querySelector('.departure-calendar');
    if (calendar) {
        calendar.style.border = '3px solid #3b82f6';
        calendar.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.3)';
        
        // Remove emphasis after 3 seconds
        setTimeout(() => {
            calendar.style.border = '1px solid #e5e7eb';
            calendar.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
        }, 3000);
    }
    
    // Show message to user
    const currentLang = window.currentLanguage || 'en';
    const message = currentLang === 'vi' ? 
        'Vui lòng chọn ngày khởi hành từ lịch bên dưới' :
        'Please select your departure date from the calendar below';
    
    showNotification(message, 'info');
};

// Show notification helper function
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.innerHTML = message;
    
    const bgColor = type === 'success' ? '#10b981' : type === 'info' ? '#3b82f6' : '#6b7280';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${bgColor};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10000;
        font-weight: 600;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
        animation: slideDown 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Handle departure time selection
window.handleDepartureTimeChange = function() {
    const timeSelect = document.getElementById('departureTimeSelect');
    const selectedTime = timeSelect.value;
    
    if (selectedTime) {
        const currentLang = window.currentLanguage || 'en';
        const message = currentLang === 'vi' ? 
            `Giờ khởi hành đã chọn: ${selectedTime}` :
            `Departure time selected: ${selectedTime}`;
        
        console.log('✅ ' + message);
        
        // Update any relevant UI elements
        const departureTimeDisplay = document.querySelector('.departure-time-display');
        if (departureTimeDisplay) {
            departureTimeDisplay.textContent = selectedTime;
        }
    }
};

// Initialize departure time selector
function initializeDepartureTimeSelector() {
    const timeSelect = document.getElementById('departureTimeSelect');
    if (timeSelect) {
        timeSelect.addEventListener('change', handleDepartureTimeChange);
    }
}

// =====================================================================
// NEW FUNCTIONS FOR GENERATED TOUR HANDLING
// =====================================================================

// View generated tour details
window.viewGeneratedTourDetails = function(tourId) {
    console.log('👁️ Viewing generated tour details for:', tourId);
    
    if (!window.generatedTourData) {
        showNotification('Tour data not available', 'error');
        return;
    }
    
    // Show loading state
    showTourDetailsLoading();
    
    // Simulate loading time before showing details
    setTimeout(() => {
        hideTourDetailsLoading();
        showGeneratedTourDetailModal(window.generatedTourData);
    }, 1500);
};

// Book generated tour
window.bookGeneratedTour = function(tourId) {
    console.log('📝 Booking generated tour:', tourId);
    
    const currentLang = window.currentLanguage || 'en';
    const message = currentLang === 'vi' ? 
        'Chức năng đặt tour sẽ được phát triển trong phiên bản tiếp theo!' :
        'Tour booking feature will be available in the next version!';
    
    showNotification(message, 'info', 4000);
};

// Show generated tour detail modal
function showGeneratedTourDetailModal(tourData) {
    // Remove any existing modal first
    const existingModal = document.getElementById('tourDetailModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create completely new modal
    const modal = document.createElement('div');
    modal.id = 'tourDetailModal';
    modal.className = 'tour-detail-container';
    
    // Apply critical styling
    modal.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(0, 0, 0, 0.8) !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
        z-index: 99999 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 20px !important;
        margin: 0 !important;
        box-sizing: border-box !important;
        opacity: 0 !important;
    `;
    
    // Generate tour detail content
    modal.innerHTML = generateGeneratedTourDetailHTML(tourData);
    
    // Append to body
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Animate in
    setTimeout(() => {
        modal.style.opacity = '1';
        modal.style.animation = 'fadeInModal 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
        
        // Center content
        const content = modal.querySelector('.new-tour-modal');
        if (content) {
            content.style.cssText += `
                margin: auto !important;
                position: relative !important;
                max-height: 85vh !important;
                max-width: 1100px !important;
                width: 95% !important;
                overflow: hidden !important;
                display: flex !important;
                border-radius: 16px !important;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4) !important;
            `;
        }
        
        // Style close button
        const closeBtn = modal.querySelector('.new-modal-close');
        if (closeBtn) {
            closeBtn.style.cssText += `
                position: absolute !important;
                top: 20px !important;
                right: 20px !important;
                z-index: 9999 !important;
                background: rgba(255, 255, 255, 0.95) !important;
                border: none !important;
                width: 36px !important;
                height: 36px !important;
                border-radius: 50% !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                cursor: pointer !important;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
                transition: all 0.2s ease !important;
            `;
        }
        
        // Auto expand the first day in the schedule
        const firstDay = document.querySelector('.schedule-day');
        if (firstDay) {
            firstDay.classList.add('expanded');
        }
    }, 50);
    
    // Initialize modal functionality
    initializeTourDetailModal();
}

// Generate generated tour detail HTML
function generateGeneratedTourDetailHTML(tourData) {
    // Convert schedule to the format expected by existing functions
    const formattedSchedule = tourData.schedule.map(day => ({
        day: day.day,
        date: new Date().toLocaleDateString('en-GB'), // You can format this better
        activities: day.activities.map(activity => ({
            time: `${activity.start_time} - ${activity.end_time}`,
            activity: `${activity.place_name} (${activity.type})`,
            cost: `$${activity.cost.toFixed(2)}`
        }))
    }));
    
    return `
        <div class="new-tour-modal">
            <button class="new-modal-close" onclick="closeTourDetailModal()">
                <i class="fas fa-times"></i>
            </button>
            
            <!-- Left Side - Tour Summary -->
            <div class="new-modal-left">
                <div class="generated-tour-summary">
                    <div class="tour-header">
                        <h2>${tourData.start_city} → ${tourData.destination_city}</h2>
                        <div class="tour-badge">
                            <i class="fas fa-magic"></i>
                            <span data-en="AI Generated" data-vi="Được tạo bởi AI">AI Generated</span>
                        </div>
                    </div>
                    
                    <div class="tour-stats">
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-calendar-alt"></i></div>
                            <div class="stat-info">
                                <div class="stat-label" data-en="Duration" data-vi="Thời gian">Duration</div>
                                <div class="stat-value">${tourData.duration_days} days</div>
                            </div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-users"></i></div>
                            <div class="stat-info">
                                <div class="stat-label" data-en="Guests" data-vi="Khách">Guests</div>
                                <div class="stat-value">${tourData.guest_count}</div>
                            </div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-wallet"></i></div>
                            <div class="stat-info">
                                <div class="stat-label" data-en="Budget" data-vi="Ngân sách">Budget</div>
                                <div class="stat-value">$${tourData.budget.toFixed(2)}</div>
                            </div>
                        </div>
                        
                        <div class="stat-card total-cost">
                            <div class="stat-icon"><i class="fas fa-calculator"></i></div>
                            <div class="stat-info">
                                <div class="stat-label" data-en="Total Cost" data-vi="Tổng chi phí">Total Cost</div>
                                <div class="stat-value">$${tourData.total_estimated_cost.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="budget-analysis">
                        <div class="budget-header">
                            <h4 data-en="Budget Analysis" data-vi="Phân tích ngân sách">Budget Analysis</h4>
                        </div>
                        ${generateBudgetAnalysis(tourData)}
                    </div>
                </div>
            </div>
            
            <!-- Right Side - Schedule -->
            <div class="new-modal-right">
                <div class="schedule-header">
                    <h3 data-en="Detailed Itinerary" data-vi="Lịch trình chi tiết">Detailed Itinerary</h3>
                </div>
                
                <div class="new-tab-content-area">
                    <div class="new-tab-content active">
                        ${generateDetailedScheduleHTML(formattedSchedule)}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Generate budget analysis
function generateBudgetAnalysis(tourData) {
    const totalCost = tourData.total_estimated_cost;
    const budget = tourData.budget;
    const percentUsed = Math.min((totalCost / budget) * 100, 100);
    const remaining = budget - totalCost;
    
    let progressColor = 'bg-green-500';
    let statusClass = 'under-budget';
    let statusText = 'Under Budget';
    
    if (percentUsed > 100) {
        progressColor = 'bg-red-500';
        statusClass = 'over-budget';
        statusText = 'Over Budget';
    } else if (percentUsed > 90) {
        progressColor = 'bg-yellow-500';
        statusClass = 'near-budget';
        statusText = 'Near Budget';
    }
    
    return `
        <div class="budget-progress-container">
            <div class="budget-progress-bar">
                <div class="budget-progress ${progressColor}" style="width: ${Math.min(percentUsed, 100)}%"></div>
            </div>
            <div class="budget-status ${statusClass}">
                <span class="status-text" data-en="${statusText}" data-vi="${statusText}">${statusText}</span>
                <span class="percentage">${percentUsed.toFixed(1)}%</span>
            </div>
            <div class="budget-breakdown">
                <div class="budget-item">
                    <span data-en="Spent" data-vi="Đã chi">Spent: $${totalCost.toFixed(2)}</span>
                </div>
                <div class="budget-item">
                    <span data-en="Remaining" data-vi="Còn lại">Remaining: $${remaining.toFixed(2)}</span>
                </div>
            </div>
        </div>
    `;
}