/**
 * Tour History Component
 * This file handles the display of tour search history
 * and detailed view for each tour.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tour history display
    loadTourSearchHistory();

    // Setup event listeners
    const viewAllHistoryBtn = document.getElementById('viewAllHistoryBtn');
    if (viewAllHistoryBtn) {
        viewAllHistoryBtn.addEventListener('click', function() {
            // In a real app, this would navigate to a full history page
            console.log('View all history clicked');
        });
    }
    
    // Setup pagination buttons
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', function() {
            if (tourHistoryPagination.currentPage > 1) {
                tourHistoryPagination.currentPage--;
                renderTourHistoryWithPagination();
            }
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', function() {
            if (tourHistoryPagination.currentPage < tourHistoryPagination.totalPages) {
                tourHistoryPagination.currentPage++;
                renderTourHistoryWithPagination();
            }
        });
    }
    
    // Listen for currency changes globally
    window.addEventListener('pricesUpdated', function(event) {
        console.log('🔄 Currency changed, updating tour history display...');
        // Re-render current page to update currency displays
        if (tourHistoryPagination.allItems && tourHistoryPagination.allItems.length > 0) {
            renderTourHistoryWithPagination();
        }
    });
});

// Pagination state for tour history
let tourHistoryPagination = {
    currentPage: 1,
    totalPages: 1,
    itemsPerPage: 9, // 9 items per page as requested
    allItems: []
};

/**
 * Load tour search history from the server API
 */
function loadTourSearchHistory(page = 1) {
    console.log('🔄 Loading tour search history...');
    
    const historyContent = document.getElementById('historyContent');
    const historyLoading = document.getElementById('historyLoading');
    const noHistoryState = document.getElementById('noHistoryState');
    
    if (!historyContent || !historyLoading || !noHistoryState) {
        console.error('Required elements not found in the DOM');
        return;
    }
    
    // Show loading state
    historyContent.innerHTML = '';
    historyLoading.classList.remove('hidden');
    noHistoryState.classList.add('hidden');
    
    // Call real API - no longer pass pagination params to get all data
    fetch('/api/tour-history')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Hide loading
            historyLoading.classList.add('hidden');
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to load tour history');
            }
            
            console.log('API response data:', data);
            const tourHistory = data.tours || data.data || [];
            
            if (tourHistory.length === 0) {
                noHistoryState.classList.remove('hidden');
            } else {
                // Store all tours and setup pagination
                tourHistoryPagination.allItems = tourHistory;
                tourHistoryPagination.totalPages = Math.ceil(tourHistory.length / tourHistoryPagination.itemsPerPage);
                tourHistoryPagination.currentPage = page;
                
                renderTourHistoryWithPagination();
            }
        })
        .catch(error => {
            console.error('Error loading tour history:', error);
            historyLoading.classList.add('hidden');
            noHistoryState.classList.remove('hidden');
            noHistoryState.querySelector('p').textContent = 'Error loading tour history. Please try again.';
            
            // Fallback to mock data in development
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('Using mock data as fallback');
                const tourHistory = getMockTourHistory();
                if (tourHistory.length > 0) {
                    // Store all tours and setup pagination for mock data too
                    tourHistoryPagination.allItems = tourHistory;
                    tourHistoryPagination.totalPages = Math.ceil(tourHistory.length / tourHistoryPagination.itemsPerPage);
                    tourHistoryPagination.currentPage = page;
                    
                    renderTourHistoryWithPagination();
                    noHistoryState.classList.add('hidden');
                }
            }
        });
}

/**
 * Render tour history with pagination
 */
function renderTourHistoryWithPagination() {
    const { allItems, currentPage, itemsPerPage } = tourHistoryPagination;
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPageItems = allItems.slice(startIndex, endIndex);
    
    // Render current page items
    renderTourHistory(currentPageItems);
    
    // Render pagination controls
    renderPaginationControls();
}

/**
 * Render pagination controls
 */
function renderPaginationControls() {
    const historyContent = document.getElementById('historyContent');
    if (!historyContent) return;
    
    const { currentPage, totalPages } = tourHistoryPagination;
    
    // Remove existing pagination
    const existingPagination = historyContent.querySelector('.pagination-container');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    // Don't show pagination if only one page
    if (totalPages <= 1) return;
    
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination-container';
    paginationContainer.innerHTML = `
        <div class="pagination-wrapper">
            <button class="pagination-btn" id="prevPage" ${currentPage <= 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
                <span data-en="Previous" data-vi="Trước">Previous</span>
            </button>
            
            <div class="pagination-info">
                <span data-en="Page" data-vi="Trang">Page</span> 
                ${currentPage} 
                <span data-en="of" data-vi="của">of</span> 
                ${totalPages}
            </div>
            
            <button class="pagination-btn" id="nextPage" ${currentPage >= totalPages ? 'disabled' : ''}>
                <span data-en="Next" data-vi="Tiếp">Next</span>
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
        
        <div class="pagination-summary">
            <span data-en="Showing" data-vi="Hiển thị">Showing</span> 
            ${Math.min((currentPage - 1) * tourHistoryPagination.itemsPerPage + 1, tourHistoryPagination.allItems.length)} - 
            ${Math.min(currentPage * tourHistoryPagination.itemsPerPage, tourHistoryPagination.allItems.length)} 
            <span data-en="of" data-vi="của">of</span> 
            ${tourHistoryPagination.allItems.length} 
            <span data-en="tours" data-vi="tour">tours</span>
        </div>
    `;
    
    historyContent.appendChild(paginationContainer);
    
    // Add event listeners
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                tourHistoryPagination.currentPage--;
                renderTourHistoryWithPagination();
                
                // Scroll to top of history section
                historyContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                tourHistoryPagination.currentPage++;
                renderTourHistoryWithPagination();
                
                // Scroll to top of history section
                historyContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }
    
    // Update language display for pagination
    updateLanguageDisplay();
}

/**
 * Render tour history cards
 * @param {Array} tourHistory - Array of tour history data
 */
function renderTourHistory(tourHistory) {
    const historyContent = document.getElementById('historyContent');
    
    if (!historyContent) {
        console.error('History content element not found');
        return;
    }
    
    // Check if empty
    if (tourHistory.length === 0) {
        const noHistoryState = document.getElementById('noHistoryState');
        if (noHistoryState) {
            noHistoryState.classList.remove('hidden');
        }
        return;
    }
    
    console.log('Raw tour history data length:', tourHistory.length);
    
    // Deduplicate tour history by tour ID/option_id
    const uniqueTourIds = new Set();
    const uniqueTours = tourHistory.filter(tour => {
        // Use option_id as the primary identifier, fall back to id if option_id doesn't exist
        const tourId = tour.option_id || tour.id;
        if (!tourId) return false; // Skip items without any ID
        
        // If we haven't seen this ID before, add it to the set and keep the item
        if (!uniqueTourIds.has(tourId)) {
            uniqueTourIds.add(tourId);
            return true;
        }
        // Otherwise, filter out the duplicate
        return false;
    });
    
    console.log('Deduplicated tour history length:', uniqueTours.length);
    
    // Clear existing content (but preserve pagination if exists)
    const existingPagination = historyContent.querySelector('.pagination-container');
    historyContent.innerHTML = '';
    
    // Create and append tour history cards
    uniqueTours.forEach((tour, index) => {
        console.log('Debug tour data:', tour);
        
        // Map data from API to display format with robust null/undefined checks
        console.log('Tour data to process:', JSON.stringify(tour));
        
        // Cải thiện xử lý điểm đi (from)
        let fromName = 'Unknown';
        if (tour.start_city_name) {
            fromName = tour.start_city_name; // Nếu có trường start_city_name, sử dụng nó
        } else if (tour.from) {
            fromName = tour.from; // Nếu có trường from, sử dụng nó
        } else if (tour.start_location && typeof tour.start_location === 'string') {
            // API có thể trả về start_location trong format "City, Country"
            fromName = tour.start_location.split(',')[0].trim(); // Lấy phần City
        } else if (tour.start_city) {
            if (typeof tour.start_city === 'object' && tour.start_city !== null && tour.start_city.name) {
                fromName = tour.start_city.name; // Nếu start_city là đối tượng và có trường name
            } else if (typeof tour.start_city === 'string') {
                fromName = tour.start_city; // Nếu start_city là chuỗi
            }
        } else if (tour.start_city_id) {
            // Trường hợp chỉ có ID nhưng không có tên
            const cityNames = {
                1: 'Ha Noi',
                2: 'Ho Chi Minh',
                3: 'Da Nang', 
                4: 'Phu Quoc',
                5: 'Nha Trang'
                // Thêm các ánh xạ ID thành phố khác nếu cần
            };
            fromName = cityNames[tour.start_city_id] || `City ID: ${tour.start_city_id}`;
        }
        
        // Cải thiện xử lý điểm đến (to)
        let toName = 'Unknown';
        if (tour.destination_city_name) {
            toName = tour.destination_city_name; // Nếu có trường destination_city_name, sử dụng nó
        } else if (tour.to) {
            toName = tour.to; // Nếu có trường to, sử dụng nó
        } else if (tour.destination && typeof tour.destination === 'string') {
            // API có thể trả về destination trong format "City, Country"
            toName = tour.destination.split(',')[0].trim(); // Lấy phần City
        } else if (tour.destination_city) {
            if (typeof tour.destination_city === 'object' && tour.destination_city !== null && tour.destination_city.name) {
                toName = tour.destination_city.name; // Nếu destination_city là đối tượng và có trường name
            } else if (typeof tour.destination_city === 'string') {
                toName = tour.destination_city; // Nếu destination_city là chuỗi
            }
        } else if (tour.destination_city_id) {
            // Trường hợp chỉ có ID nhưng không có tên
            const cityNames = {
                1: 'Ha Noi',
                2: 'Ho Chi Minh',
                3: 'Da Nang', 
                4: 'Phu Quoc',
                5: 'Nha Trang'
                // Thêm các ánh xạ ID thành phố khác nếu cần
            };
            toName = cityNames[tour.destination_city_id] || `City ID: ${tour.destination_city_id}`;
        }
        
        const tourData = {
            id: tour.option_id || tour.id || '',
            from: fromName,
            to: toName,
            days: tour.duration_days || 0,
            date: tour.created_at || tour.created_date || 'No date',
            guests: tour.guest_count || 0,
            budget: tour.target_budget || 0,
            currency: tour.currency || 'USD',
            rating: tour.rating || 0,
            
            // Estimated cost - FIXED: Get from total_cost or total_estimated_cost
            estimatedCost: tour.total_cost || tour.total_estimated_cost || 0,
            
            // Thông tin khách sạn, nhà hàng, phương tiện
            hotel: tour.hotel_name || (tour.hotel && tour.hotel.name ? tour.hotel.name : 'Various hotels'),
            restaurant: tour.restaurant_name || (tour.restaurant && tour.restaurant.name ? tour.restaurant.name : 'Various restaurants'),
            transport: tour.transport_type || (tour.transport && tour.transport.type ? tour.transport.type : 'Various transports'),
            
            // Sử dụng option_id hoặc id cho chi tiết
            optionId: tour.option_id || tour.id || ''
        };
        
        const tourCard = document.createElement('div');
        tourCard.className = 'tour-history-item';
        tourCard.innerHTML = `
            <div class="tour-history-header">
                <div class="tour-history-title">
                    <div>
                        <i class="fas fa-route"></i>
                        ${tourData.from || 'Departure'} → ${tourData.to || 'Destination'}
                    </div>
                    <span class="tour-badge">
                        <i class="fas fa-calendar-alt"></i>
                        ${tourData.days} <span data-en="days" data-vi="ngày">days</span>
                    </span>
                </div>
            </div>
            <div class="tour-history-body">
                <div class="tour-info-list">
                    <div class="tour-info-item">
                        <i class="fas fa-dollar-sign"></i>
                        <span data-en="Budget" data-vi="Ngân sách">Budget:</span>
                        <span class="tour-info-value">${formatCurrency(tourData.budget)}</span>
                    </div>
                    <div class="tour-info-item">
                        <i class="fas fa-users"></i>
                        <span data-en="Guests" data-vi="Khách">Guests:</span>
                        <span class="tour-info-value">${tourData.guests}</span>
                    </div>
                    <div class="tour-info-item">
                        <i class="fas fa-star"></i>
                        <span data-en="Rating" data-vi="Đánh giá">Rating:</span>
                        <span class="tour-info-value">${tourData.rating.toFixed(1)}/10</span>
                    </div>
                </div>
            </div>
            <div class="tour-history-footer">
                <button class="tour-history-action view" onclick="viewTourHistoryDetails('${tourData.optionId}')">
                    <i class="fas fa-eye"></i>
                    <span data-en="View Details" data-vi="Xem Chi Tiết">View Details</span>
                </button>
                <button class="tour-history-action search" onclick="bookTourAgain('${tourData.optionId}')">
                    <i class="fas fa-redo"></i>
                    <span data-en="Book Again" data-vi="Đặt Lại">Book Again</span>
                </button>
            </div>
        `;
        
        historyContent.appendChild(tourCard);
    });
}

/**
 * Handle View Details button click
 * @param {string} optionId - Tour option ID to view details
 */
window.viewTourHistoryDetails = function(optionId) {
    console.log('👁️ Viewing tour history details for:', optionId);
    
    // Show loading state in modal
    showTourHistoryDetailLoading();
    
    // Show the modal immediately with loading state
    showTourHistoryDetailModal();
    
    // Call real API to get tour details
    fetch(`/api/tour-history/${optionId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (!data.success) {
                throw new Error(data.message || 'Failed to load tour details');
            }
            
            console.log('Tour detail API response:', data);
            // Sửa lỗi: dữ liệu nằm trực tiếp trong data.data thay vì data.tour
            const tourDetail = data.data || data.tour || data || {};
            renderTourHistoryDetail(tourDetail);
            hideTourHistoryDetailLoading();
        })
        .catch(error => {
            console.error('Error loading tour details:', error);
            
            // Show error in schedule tab
            const tourScheduleContent = document.getElementById('tourScheduleContent');
            if (tourScheduleContent) {
                tourScheduleContent.innerHTML = `
                    <div class="flex items-center justify-center h-full">
                        <div class="text-center p-8">
                            <div class="text-red-500 text-5xl mb-4">
                                <i class="fas fa-exclamation-circle"></i>
                            </div>
                            <h3 class="text-xl font-bold text-gray-800 mb-2" data-en="Error Loading Tour Details" data-vi="Lỗi Tải Chi Tiết Tour">Error Loading Tour Details</h3>
                            <p class="text-gray-600" data-en="We couldn't load the details for this tour. Please try again later." data-vi="Chúng tôi không thể tải chi tiết cho tour này. Vui lòng thử lại sau.">${error.message}</p>
                        </div>
                    </div>
                `;
            }
            
            // Show error in cost tab
            const tourCostContent = document.getElementById('tourCostContent');
            if (tourCostContent) {
                tourCostContent.innerHTML = `
                    <div class="flex items-center justify-center h-full">
                        <div class="text-center p-8">
                            <div class="text-red-500 text-5xl mb-4">
                                <i class="fas fa-exclamation-circle"></i>
                            </div>
                            <p class="text-gray-600" data-en="Error loading cost data" data-vi="Lỗi tải dữ liệu chi phí">Error loading cost data</p>
                        </div>
                    </div>
                `;
            }
            
            // Show error in images section
            const tourImagesContent = document.getElementById('tourImagesContent');
            if (tourImagesContent) {
                tourImagesContent.innerHTML = `
                    <div class="flex items-center justify-center h-full">
                        <div class="text-center p-8">
                            <div class="text-red-500 text-5xl mb-4">
                                <i class="fas fa-image-slash"></i>
                            </div>
                            <p class="text-gray-600" data-en="Could not load images" data-vi="Không thể tải hình ảnh">Could not load images</p>
                        </div>
                    </div>
                `;
            }
            
            hideTourHistoryDetailLoading();
            
            // Fallback to mock data in development
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('Using mock data as fallback for tour details');
                const tourDetail = getTourHistoryDetail(optionId);
                if (tourDetail) {
                    renderTourHistoryDetail(tourDetail);
                }
            }
        });
};

/**
 * Handle Book Again button click
 * @param {string} optionId - Tour option ID to book again
 */
window.bookTourAgain = function(optionId) {
    console.log('🔄 Booking tour again for option:', optionId);
    // In a real app, this would populate the search form with the tour details
    // and potentially navigate to the search form tab
    alert('This feature is not implemented in this demo.');
};

/**
 * Show tour detail modal with animation
 */
function showTourHistoryDetailModal() {
    const modal = document.getElementById('tourHistoryDetailModal');
    if (modal) {
        modal.style.opacity = '0';
        modal.style.display = 'flex';
        
        // Force browser reflow
        void modal.offsetWidth;
        
        // Animate modal in
        modal.style.opacity = '1';
        
        // Get the modal content
        const modalContent = modal.querySelector('.modal-content-split');
        if (modalContent) {
            modalContent.style.transform = 'scale(0.98) translateY(10px)';
            setTimeout(() => {
                modalContent.style.transform = 'scale(1) translateY(0)';
            }, 10);
        }
        
        // Initialize the first tab as active
        const scheduleTabBtn = document.getElementById('scheduleTabBtn');
        const costTabBtn = document.getElementById('costTabBtn');
        const scheduleTabContent = document.getElementById('scheduleTabContent');
        const costTabContent = document.getElementById('costTabContent');
        
        if (scheduleTabBtn && costTabBtn && scheduleTabContent && costTabContent) {
            // Add active styles to the schedule tab button
            scheduleTabBtn.classList.add('border-b-2', 'border-blue-500', 'text-blue-600', 'bg-blue-50');
            scheduleTabBtn.classList.remove('text-gray-500');
            
            // Remove active styles from the cost tab button
            costTabBtn.classList.remove('border-b-2', 'border-blue-500', 'text-blue-600', 'bg-blue-50');
            costTabBtn.classList.add('text-gray-500');
            
            // Show schedule content, hide cost content
            scheduleTabContent.classList.remove('hidden');
            costTabContent.classList.add('hidden');
        }
    }
}

/**
 * Close tour detail modal with animation
 */
window.closeTourDetailModal = function() {
    closeModal('tourHistoryDetailModal');
};

/**
 * Show loading state in tour detail modal
 */
function showTourHistoryDetailLoading() {
    const tourScheduleContent = document.getElementById('tourScheduleContent');
    const tourCostContent = document.getElementById('tourCostContent');
    const tourImagesContent = document.getElementById('tourImagesContent');
    
    const loadingHTML = `
        <div class="text-center py-8">
            <div class="loading-spinner mx-auto mb-4"></div>
            <p class="text-gray-600" data-en="Loading tour details..." data-vi="Đang tải chi tiết tour...">
                Loading tour details...
            </p>
        </div>
    `;
    
    if (tourScheduleContent) {
        tourScheduleContent.innerHTML = loadingHTML;
    }
    
    if (tourCostContent) {
        tourCostContent.innerHTML = loadingHTML;
    }
    
    if (tourImagesContent) {
        tourImagesContent.innerHTML = `
            <div class="flex items-center justify-center h-full">
                <div class="text-center p-8">
                    <div class="loading-spinner mx-auto mb-4"></div>
                    <p class="text-gray-600" data-en="Loading images..." data-vi="Đang tải hình ảnh...">Loading images...</p>
                </div>
            </div>
        `;
    }
}

/**
 * Hide loading state in tour detail modal
 */
function hideTourHistoryDetailLoading() {
    // This is handled by rendering the content
}

/**
 * Render tour detail in modal
 * @param {Object} tourDetail - Tour detail data
 */
function renderTourHistoryDetail(tourDetail) {
    const tourScheduleContent = document.getElementById('tourScheduleContent');
    const tourCostContent = document.getElementById('tourCostContent');
    const tourImagesContent = document.getElementById('tourImagesContent');
    
    if (!tourScheduleContent || !tourCostContent || !tourImagesContent) {
        console.error('Tour detail content elements not found');
        return;
    }
    
    console.log('Rendering tour detail:', tourDetail);
    
    // Cải thiện xử lý điểm đi (from)
    let fromName = 'Unknown';
    if (tourDetail.start_city_name) {
        fromName = tourDetail.start_city_name; // Nếu có trường start_city_name, sử dụng nó
    } else if (tourDetail.from) {
        fromName = tourDetail.from; // Nếu có trường from, sử dụng nó
    } else if (tourDetail.start_city) {
        if (typeof tourDetail.start_city === 'object' && tourDetail.start_city !== null && tourDetail.start_city.name) {
            fromName = tourDetail.start_city.name; // Nếu start_city là đối tượng và có trường name
        } else if (typeof tourDetail.start_city === 'string') {
            fromName = tourDetail.start_city; // Nếu start_city là chuỗi
        }
    } else if (tourDetail.start_city_id) {
        // Trường hợp chỉ có ID nhưng không có tên
        const cityNames = {
            1: 'Ha Noi',
            2: 'Ho Chi Minh',
            3: 'Da Nang', 
            4: 'Phu Quoc',
            5: 'Nha Trang'
            // Thêm các ánh xạ ID thành phố khác nếu cần
        };
        fromName = cityNames[tourDetail.start_city_id] || `City ID: ${tourDetail.start_city_id}`;
    }
    
    // Cải thiện xử lý điểm đến (to)
    let toName = 'Unknown';
    if (tourDetail.destination_city_name) {
        toName = tourDetail.destination_city_name; // Nếu có trường destination_city_name, sử dụng nó
    } else if (tourDetail.to) {
        toName = tourDetail.to; // Nếu có trường to, sử dụng nó
    } else if (tourDetail.destination_city) {
        if (typeof tourDetail.destination_city === 'object' && tourDetail.destination_city !== null && tourDetail.destination_city.name) {
            toName = tourDetail.destination_city.name; // Nếu destination_city là đối tượng và có trường name
        } else if (typeof tourDetail.destination_city === 'string') {
            toName = tourDetail.destination_city; // Nếu destination_city là chuỗi
        }
    } else if (tourDetail.destination_city_id) {
        // Trường hợp chỉ có ID nhưng không có tên
        const cityNames = {
            1: 'Ha Noi',
            2: 'Ho Chi Minh',
            3: 'Da Nang', 
            4: 'Phu Quoc',
            5: 'Nha Trang'
            // Thêm các ánh xạ ID thành phố khác nếu cần
        };
        toName = cityNames[tourDetail.destination_city_id] || `City ID: ${tourDetail.destination_city_id}`;
    }
    
    // Render tour images content with optimized loading
    const imageUrl = tourDetail.imageUrl || 'assets/images/danang.jpg';
    
    // Get tour title and construct the full name
    const tourTitle = `${fromName} to ${toName} Tour`;
    
    // Get duration days with fallback
    const durationDays = tourDetail.duration_days || (tourDetail.days ? tourDetail.days.length : 0);
    
    // Render the images section
    const imagesHtml = `
        <div class="sticky top-4 space-y-4">
            <!-- Main image -->
            <div class="rounded-xl overflow-hidden shadow-lg">
                <img src="${imageUrl}" alt="${fromName} to ${toName} Tour" 
                    class="w-full h-auto object-cover">
            </div>
            
            <h3 class="text-xl font-bold text-gray-800">${fromName} → ${toName}</h3>
            <p class="text-sm text-gray-600 flex items-center">
                <i class="fas fa-user mr-2 text-blue-500"></i>
                ${tourDetail.guest_count || 2} guests • ${durationDays} days
            </p>
            
            <!-- Related images (could be loaded from tour places in real implementation) -->
            <div class="grid grid-cols-3 gap-2 mt-4">
                <div class="aspect-square rounded-lg overflow-hidden shadow-sm">
                    <img alt="Related image" class="w-full h-full object-cover" onload="if(window.ImageCache) window.ImageCache.loadImage(this, 'assets/images/danang.jpg');" src="assets/images/danang.jpg">
                </div>
                <div class="aspect-square rounded-lg overflow-hidden shadow-sm">
                    <img src="assets/images/hochiminh.jpg" alt="Related image" class="w-full h-full object-cover">
                </div>
                <div class="aspect-square rounded-lg overflow-hidden shadow-sm">
                    <img src="assets/images/hanoi.jpg" alt="Related image" class="w-full h-full object-cover">
                </div>
            </div>
            
            <!-- Summary Cards -->
            <div class="summary-cards mt-6">
                <div class="summary-card">
                    <div class="summary-card-header">
                        <i class="fas fa-dollar-sign"></i>
                        <span data-en="Budget" data-vi="Ngân sách">Budget</span>
                    </div>
                    <div class="summary-card-amount">${formatCurrency(tourDetail.target_budget || tourDetail.budget || 0)}</div>
                </div>
                
                <div class="summary-card">
                    <div class="summary-card-header">
                        <i class="fas fa-wallet"></i>
                        <span data-en="Estimated" data-vi="Ước tính">Estimated</span>
                    </div>
                    <div class="summary-card-amount">${formatCurrency(tourDetail.total_estimated_cost || tourDetail.totalEstimatedCost || 0)}</div>
                </div>
                
                <div class="summary-card total">
                    <div class="summary-card-header">
                        <i class="fas fa-percentage"></i>
                        <span data-en="Saving" data-vi="Tiết kiệm">Saving</span>
                    </div>
                    <div class="summary-card-amount">${calculateSavingPercentage(
                        tourDetail.target_budget || tourDetail.budget || 0, 
                        tourDetail.total_estimated_cost || tourDetail.totalEstimatedCost || 0
                    )}%</div>
                </div>
            </div>
        </div>
    `;
    
    // Render schedule content
    const scheduleContentHtml = renderScheduleContent(tourDetail);
    
    // Render cost content
    const costContentHtml = renderCostContent(tourDetail);
    
    // Update the respective containers
    tourImagesContent.innerHTML = imagesHtml;
    tourScheduleContent.innerHTML = scheduleContentHtml;
    tourCostContent.innerHTML = costContentHtml;
    
    // Setup tab switching
    setupDetailTabs();
}

/**
 * Render the schedule tab content
 * @param {Object} tourDetail - Tour detail data
 * @returns {string} HTML content
 */
function renderScheduleContent(tourDetail) {
    console.log('Rendering schedule with tour detail:', tourDetail);
    
    // Check for daily_schedule in API response (new format)
    // or days array in mock data (old format)
    const hasSchedule = tourDetail.daily_schedule && Object.keys(tourDetail.daily_schedule).length > 0;
    const hasDays = tourDetail.days && tourDetail.days.length > 0;
    
    // If no schedule information is available
    if (!hasSchedule && !hasDays) {
        return `<p class="text-gray-500 italic text-center py-8" data-en="No schedule information available" data-vi="Không có thông tin lịch trình">No schedule information available</p>`;
    }
    
    let scheduleHtml = '<div class="space-y-6">';
    
    // Process API response format (daily_schedule object)
    if (hasSchedule) {
        // Sort days by day number
        const dayNumbers = Object.keys(tourDetail.daily_schedule).sort((a, b) => parseInt(a) - parseInt(b));
        
        dayNumbers.forEach(dayNumber => {
            const dayItems = tourDetail.daily_schedule[dayNumber];
            const dayTitle = `Day ${dayNumber}`;
            
            scheduleHtml += `
                <div class="schedule-day" id="day-${dayNumber}">
                    <div class="schedule-day-header">
                        <div class="day-header-content flex items-center">
                            <div class="day-badge">${dayNumber}</div>
                            <h3 class="font-semibold text-gray-800">${dayTitle}</h3>
                        </div>
                        <div class="schedule-day-toggle" onclick="toggleScheduleDay('day-${dayNumber}')">
                            <i class="fas fa-chevron-down"></i>
                        </div>
                    </div>
                    
                    <div class="schedule-day-content" style="display: none;">
                        <div class="timeline-container">
                            ${renderTimelineItems(dayItems)}
                        </div>
                    </div>
                </div>
            `;
        });
    }
    // Process mock data format (days array)
    else if (hasDays) {
        // For each day in the tour
        tourDetail.days.forEach(day => {
            // Format the day title or use a default one
            const dayNumber = day.day_number || day.dayNumber || 1;
            const dayTitle = day.day_title || day.title || `Day ${dayNumber}`;
            
            // Get schedule items from API format or mock format
            const scheduleItems = day.schedule_items || day.scheduleItems || [];
            
            scheduleHtml += `
                <div class="schedule-day" id="day-${dayNumber}">
                    <div class="schedule-day-header">
                        <div class="day-header-content flex items-center">
                            <div class="day-badge">${dayNumber}</div>
                            <h3 class="font-semibold text-gray-800">${dayTitle}</h3>
                        </div>
                        <div class="schedule-day-toggle" onclick="toggleScheduleDay('day-${dayNumber}')">
                            <i class="fas fa-chevron-down"></i>
                        </div>
                    </div>
                    
                    <div class="schedule-day-content" style="display: none;">
                        <div class="timeline-container">
                            ${renderTimelineItems(scheduleItems)}
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    scheduleHtml += '</div>';
    return scheduleHtml;
}

/**
 * Toggle schedule day visibility
 * @param {string} dayId - Day element ID to toggle
 */
window.toggleScheduleDay = function(dayId) {
    const dayElement = document.getElementById(dayId);
    if (!dayElement) return;
    
    const content = dayElement.querySelector('.schedule-day-content');
    const toggle = dayElement.querySelector('.schedule-day-toggle i');
    
    if (!content || !toggle) return;
    
    if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'block';
        // Ensure scrollbar is visible and working correctly
        content.style.maxHeight = '500px';
        content.style.overflowY = 'auto';
        content.style.opacity = '1';
        content.scrollTop = 0; // Reset scroll position when opening
        toggle.classList.remove('fa-chevron-down');
        toggle.classList.add('fa-chevron-up');
    } else {
        content.style.display = 'none';
        toggle.classList.remove('fa-chevron-up');
        toggle.classList.add('fa-chevron-down');
    }
};

/**
 * Render timeline items for a day
 * @param {Array} items - Schedule items for the day
 * @returns {string} HTML content
 */
function renderTimelineItems(items) {
    if (!items || !items.length) {
        return `<p class="text-gray-500 italic" data-en="No activities scheduled for this day" data-vi="Không có hoạt động nào được lên lịch cho ngày này">No activities scheduled for this day</p>`;
    }
    
    let timelineHtml = '';
    
    items.forEach((item, index) => {
        const isLastItem = index === items.length - 1;
        
        // Format time from API data (might be in different formats)
        const startTime = item.start_time || item.startTime || '00:00:00';
        const endTime = item.end_time || item.endTime || '00:00:00';
        
        // Format times to show only hours and minutes
        const formatTimeDisplay = (timeStr) => {
            if (!timeStr) return '';
            // Try to extract hours and minutes from various formats
            const timeMatch = timeStr.match(/(\d{1,2}):(\d{1,2})/);
            if (timeMatch) {
                return `${timeMatch[1]}:${timeMatch[2]}`;
            }
            return timeStr;
        };
        
        // Extract cost from item with fallback
        const itemCost = typeof item.cost !== 'undefined' ? item.cost : 0;
        
        // Handle place_name from API response
        if (item.place_name) {
            item.placeInfo = {
                name: item.place_name,
                city: item.place_city
            };
            
            // Add type-specific fields based on place_type
            switch (item.place_type) {
                case 'hotel':
                    item.placeInfo.price_per_night = item.cost;
                    break;
                case 'restaurant':
                    item.placeInfo.price_avg = item.cost;
                    break;
                case 'activity':
                    item.placeInfo.price = item.cost;
                    break;
                case 'transport':
                    item.placeInfo.type = item.place_name;  // For transport, place_name is actually the type
                    item.placeInfo.min_price = item.cost;
                    break;
            }
        }
        
        timelineHtml += `
            <div class="timeline-item ${isLastItem ? 'last-item' : ''}">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <div class="activity-card">
                        <div class="activity-time">
                            <i class="fas fa-clock"></i>
                            ${formatTimeDisplay(startTime)} - ${formatTimeDisplay(endTime)}
                        </div>
                        <div class="activity-description">
                            ${renderActivityDescription(item)}
                        </div>
                        <div class="activity-cost">
                            <i class="fas fa-tag"></i>
                            <span data-en="Cost" data-vi="Chi phí">Cost:</span> 
                            ${formatCurrency(itemCost)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    return timelineHtml;
}

/**
 * Render activity description based on place type
 * @param {Object} item - Schedule item
 * @returns {string} HTML content for the description
 */
function renderActivityDescription(item) {
    // Get place type and ID from API format or mock format
    // Check both camelCase and snake_case property names
    const placeType = item.place_type || item.placeType || 'unknown';
    
    // Check for place_id in both flattened and nested object formats
    const placeId = item.place_id || 
                    (item.placeInfo && item.placeInfo.id ? item.placeInfo.id : '');
    
    // Get place name from item directly (from API)
    const placeName = item.place_name || '';
    const placeCity = item.place_city || '';
    
    // Get current language from user preferences
    const preferences = getUserPreferences();
    const currentLang = preferences.language || 'en';
    
    // Get place info from various possible API formats
    // First try place_info, then placeInfo, then check for direct properties on the item
    let placeInfo;
    
    if (item.place_info) {
        placeInfo = item.place_info;
    } else if (item.placeInfo) {
        placeInfo = item.placeInfo;
    } else {
        // Create placeInfo from API data when place_name is available
        if (placeName) {
            switch (placeType) {
                case 'activity':
                    placeInfo = {
                        name: placeName,
                        price: item.cost || 0
                    };
                    break;
                case 'hotel':
                    placeInfo = {
                        name: placeName,
                        price_per_night: item.cost || 0
                    };
                    break;
                case 'restaurant':
                    placeInfo = {
                        name: placeName,
                        price_avg: item.cost || 0
                    };
                    break;
                case 'transport':
                    placeInfo = {
                        type: placeName,
                        min_price: item.cost || 0
                    };
                    break;
                case 'transfer':
                    placeInfo = {
                        type: item.transport_mode || 'taxi',
                        name: placeName || item.description || 'Di chuyển đến địa điểm tiếp theo',
                        distance_km: item.distance_km,
                        min_price: item.cost || 0
                    };
                    break;
            }
        } else {
            // Try to extract info from flattened API response
            // This is for when properties are directly on the item object
            switch (placeType) {
                case 'activity':
                    if (item.activity_name || item.activity_description) {
                        placeInfo = {
                            name: item.activity_name,
                            description: item.activity_description,
                            price: item.activity_price || item.cost
                        };
                    }
                    break;
                case 'hotel':
                    if (item.hotel_name || item.hotel_price) {
                        placeInfo = {
                            name: item.hotel_name,
                            price_per_night: item.hotel_price || item.price_per_night || item.cost
                        };
                    }
                    break;
                case 'restaurant':
                    if (item.restaurant_name || item.restaurant_cuisine) {
                        placeInfo = {
                            name: item.restaurant_name,
                            cuisine_type: item.restaurant_cuisine,
                            price_avg: item.restaurant_price || item.price_avg || item.cost
                        };
                    }
                    break;
                case 'transport':
                    if (item.transport_type || item.transport_price) {
                        placeInfo = {
                            type: item.transport_type,
                            avg_price_per_km: item.transport_price || item.avg_price_per_km,
                            min_price: item.cost
                        };
                    }
                    break;
                case 'transfer':
                    placeInfo = {
                        type: item.transport_mode || 'taxi',
                        name: item.place_name || item.description || 'Di chuyển đến địa điểm tiếp theo',
                        distance_km: item.distance_km,
                        min_price: item.cost || 0
                    };
                    break;
            }
        }
    }
    
    // Fallback if no place info was found
    placeInfo = placeInfo || {};
    
    if (Object.keys(placeInfo).length === 0) {
        return `<span class="text-gray-500 italic" data-en="No information available" data-vi="Không có thông tin">No information available</span>`;
    }
    
    let description = '';
    let badgeIcon = '';
    let badgeText = '';
    
    // Determine text based on current language
    const goToText = currentLang === 'en' ? 'Go to' : 'Đi đến';
    const priceText = currentLang === 'en' ? 'Price' : 'Giá';
    const travelByText = currentLang === 'en' ? 'Travel by' : 'Di chuyển bằng';
    const activityText = currentLang === 'en' ? 'Activity' : 'Hoạt động';
    const transportText = currentLang === 'en' ? 'Transport' : 'Vận chuyển';
    
    switch (placeType) {
        case 'activity':
            description = `<span>${goToText}</span> <a href="#" class="text-blue-600 hover:underline font-medium" onclick="showPlaceDetails('${placeType}', '${placeId}')">${placeInfo.name || 'Unknown Activity'}</a>`;
            if (placeInfo.price && placeInfo.price > 0) {
                description += ` (<span>${priceText}</span>: ${formatCurrency(placeInfo.price)})`;
            }
            badgeIcon = 'fa-map-marker-alt';
            badgeText = activityText;
            break;
            
        case 'transport':
            description = `<span>${travelByText}</span> <a href="#" class="text-blue-600 hover:underline font-medium" onclick="showPlaceDetails('${placeType}', '${placeId}')">${placeInfo.type || 'Unknown Transport'}</a>`;
            const transportPrice = placeInfo.min_price || placeInfo.price_per_km || placeInfo.avg_price_per_km || placeInfo.minPrice || 0;
            if (transportPrice > 0) {
                description += ` (<span>${priceText}</span>: ${formatCurrency(transportPrice)})`;
            }
            badgeIcon = 'fa-car';
            badgeText = transportText;
            break;
            
        case 'transfer':
            const transportModeNames = {
                'walk': currentLang === 'en' ? 'Walking' : 'Đi bộ',
                'bike': currentLang === 'en' ? 'Bicycle' : 'Xe đạp',
                'bicycle': currentLang === 'en' ? 'Bicycle' : 'Xe đạp',
                'scooter': currentLang === 'en' ? 'Scooter' : 'Xe máy',
                'motorcycle': currentLang === 'en' ? 'Motorcycle' : 'Xe máy',
                'motorbike': currentLang === 'en' ? 'Motorbike' : 'Xe máy',
                'taxi': 'Taxi',
                'grab': 'Grab',
                'uber': 'Uber',
                'bus': currentLang === 'en' ? 'Bus' : 'Xe buýt',
                'metro': currentLang === 'en' ? 'Metro' : 'Tàu điện',
                'subway': currentLang === 'en' ? 'Subway' : 'Tàu điện ngầm',
                'train': currentLang === 'en' ? 'Train' : 'Tàu hóa',
                'car': currentLang === 'en' ? 'Car' : 'Ô tô',
                'ojek': 'Ojek',
                'grabbike': 'GrabBike',
                'rickshaw': currentLang === 'en' ? 'Rickshaw' : 'Xích lô',
                'cyclo': currentLang === 'en' ? 'Cyclo' : 'Xích lô',
                'tricycle': currentLang === 'en' ? 'Tricycle' : 'Xe ba bánh',
                'ferry': currentLang === 'en' ? 'Ferry' : 'Phà',
                'boat': currentLang === 'en' ? 'Boat' : 'Thuyền',
                'ship': currentLang === 'en' ? 'Ship' : 'Tàu thủy'
            };
            
            const transportModeIcons = {
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
            
            // Try exact match first, then partial match for database transport names
            let transportModeName = transportModeNames[placeInfo.type?.toLowerCase()];
            if (!transportModeName && placeInfo.type) {
                // Try partial matches for database transport names
                const lowerType = placeInfo.type.toLowerCase();
                for (const [key, value] of Object.entries(transportModeNames)) {
                    if (lowerType.includes(key)) {
                        transportModeName = value;
                        break;
                    }
                }
            }
            // Fallback
            if (!transportModeName) {
                transportModeName = placeInfo.type ? 
                    (placeInfo.type.charAt(0).toUpperCase() + placeInfo.type.slice(1).toLowerCase()) : 
                    (currentLang === 'en' ? 'Transport' : 'Di chuyển');
            }
            const transferText = currentLang === 'en' ? 'Transfer by' : 'Di chuyển bằng';
            
            description = `<span class="font-medium text-blue-600">
                <i class="fas ${badgeIcon} mr-2"></i>
                ${transportModeName}
            </span>`;
            
            if (placeInfo.distance_km) {
                description += ` <span class="text-gray-500">(${placeInfo.distance_km}km)</span>`;
            }
            
            description += `<br><span class="text-gray-600 text-sm">${placeInfo.name}</span>`;
            
            // Find matching icon with same logic as name
            let badgeIconName = transportModeIcons[placeInfo.type?.toLowerCase()];
            if (!badgeIconName && placeInfo.type) {
                const lowerType = placeInfo.type.toLowerCase();
                for (const [key, value] of Object.entries(transportModeIcons)) {
                    if (lowerType.includes(key)) {
                        badgeIconName = value;
                        break;
                    }
                }
            }
            badgeIcon = badgeIconName || 'fa-route';
            badgeText = currentLang === 'en' ? 'Transfer' : 'Di chuyển';
            break;
            
        case 'restaurant':
            const eatAtText = currentLang === 'en' ? 'Eat at' : 'Dùng bữa tại';
            const restaurantText = currentLang === 'en' ? 'Restaurant' : 'Nhà hàng';
            
            description = `<span>${eatAtText}</span> <a href="#" class="text-blue-600 hover:underline font-medium" onclick="showPlaceDetails('${placeType}', '${placeId}')">${placeInfo.name || 'Unknown Restaurant'}</a>`;
            const restaurantPrice = placeInfo.price_avg || placeInfo.priceAvg || 0;
            if (restaurantPrice > 0) {
                description += ` (<span>${priceText}</span>: ${formatCurrency(restaurantPrice)})`;
            }
            badgeIcon = 'fa-utensils';
            badgeText = restaurantText;
            break;
            
        case 'hotel':
            const stayAtText = currentLang === 'en' ? 'Stay at' : 'Nghỉ ngơi tại';
            const hotelText = currentLang === 'en' ? 'Hotel' : 'Khách sạn';
            
            description = `<span>${stayAtText}</span> <a href="#" class="text-blue-600 hover:underline font-medium" onclick="showPlaceDetails('${placeType}', '${placeId}')">${placeInfo.name || 'Unknown Hotel'}</a>`;
            const hotelPrice = placeInfo.price_per_night || placeInfo.pricePerNight || 0;
            if (hotelPrice > 0) {
                description += ` (<span>${priceText}</span>: ${formatCurrency(hotelPrice)})`;
            }
            badgeIcon = 'fa-hotel';
            badgeText = hotelText;
            break;
            
        default:
            description = `<span class="text-gray-500 italic">Activity information not available</span>`;
            badgeIcon = 'fa-question-circle';
            badgeText = 'Unknown';
    }
    
    // Add type badge without using data attributes to prevent rendering issues
    description += `
        <span class="place-type-badge place-type-${placeType}">
            <i class="fas ${badgeIcon} mr-1"></i>
            ${badgeText}
        </span>
    `;
    
    return description;
}

/**
 * Get Vietnamese translation for place type
 * @param {string} placeType - The place type
 * @returns {string} Vietnamese translation
 */
function getVietnamesePlaceType(placeType) {
    switch (placeType) {
        case 'activity': return 'Hoạt động';
        case 'transport': return 'Phương tiện';
        case 'restaurant': return 'Nhà hàng';
        case 'hotel': return 'Khách sạn';
        default: return 'Không xác định';
    }
}

/**
 * Render the cost tab content
 * @param {Object} tourDetail - Tour detail data
 * @returns {string} HTML content
 */
function renderCostContent(tourDetail) {
    // Get cost data from API format or mock format
    const budget = tourDetail.target_budget || tourDetail.budget || 0;
    const totalCost = tourDetail.total_cost || tourDetail.total_estimated_cost || tourDetail.totalEstimatedCost || 0;
    const tourCurrency = tourDetail.currency || tourDetail.cost_currency || 'USD';
    
    const remaining = budget - totalCost;
    const percentUsed = budget > 0 ? Math.min(Math.round((totalCost / budget) * 100), 100) : 100;
    
    let progressColor = 'bg-green-500';
    if (percentUsed > 90) {
        progressColor = 'bg-red-500';
    } else if (percentUsed > 70) {
        progressColor = 'bg-yellow-500';
    }
    
    // Get currency symbol based on user preferences (ignore tourCurrency parameter)
    const currencySymbol = getCurrencySymbol();
    
    // ID tour từ API hoặc mock data
    const tourId = tourDetail.tour_id || tourDetail.id || tourDetail.option_id || tourDetail.optionId || '';
    
    // Calculate percentages for widgets
    const savingPercentage = budget > 0 && budget > totalCost ? Math.round(((budget - totalCost) / budget) * 100) : 0;
    const availablePercentage = 100 - percentUsed;
    
    // Safely update DOM elements - check if they exist first
    const updateElementTextContent = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        } else {
            console.warn(`Element with ID '${id}' not found when updating text content`);
        }
    };
    
    const updateElementStyle = (id, property, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.style[property] = value;
        } else {
            console.warn(`Element with ID '${id}' not found when updating style`);
        }
    };
    
    const updateElementClass = (id, addClasses, removeClasses) => {
        const element = document.getElementById(id);
        if (element) {
            if (removeClasses) {
                element.classList.remove(...removeClasses);
            }
            if (addClasses) {
                element.classList.add(...addClasses);
            }
        } else {
            console.warn(`Element with ID '${id}' not found when updating classes`);
        }
    };
    
    const updateElementAttribute = (id, attribute, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.setAttribute(attribute, value);
        } else {
            console.warn(`Element with ID '${id}' not found when updating attribute`);
        }
    };
    
    // Update elements with numeric values (use current user currency preference)
    updateElementTextContent('targetBudget', formatCurrency(budget));
    updateElementTextContent('estimatedCost', formatCurrency(totalCost));
    updateElementTextContent('remainingBudget', formatCurrency(Math.abs(remaining)));
    
    // Update progress bar and percentages
    updateElementStyle('budgetProgress', 'width', `${percentUsed}%`);
    updateElementTextContent('budgetPercentUsed', `${percentUsed}% Used`);
    updateElementTextContent('budgetPercentAvailable', `${availablePercentage}% Available`);
    
    // Change the color and icon for remaining budget based on whether over or under budget
    if (remaining < 0) {
        updateElementClass('remainingBudget', ['text-red-600'], ['text-green-600']);
        updateElementClass('remainingBudgetIcon', ['fa-exclamation-circle', 'text-red-500'], ['fa-piggy-bank', 'text-green-500']);
        updateElementAttribute('remainingBudgetLabel', 'data-en', 'Over Budget');
        updateElementAttribute('remainingBudgetLabel', 'data-vi', 'Vượt ngân sách');
        updateElementTextContent('remainingBudgetLabel', 'Over Budget:');
    } else {
        updateElementClass('remainingBudget', ['text-green-600'], ['text-red-600']);
        updateElementClass('remainingBudgetIcon', ['fa-piggy-bank', 'text-green-500'], ['fa-exclamation-circle', 'text-red-500']);
        updateElementAttribute('remainingBudgetLabel', 'data-en', 'Remaining Budget');
        updateElementAttribute('remainingBudgetLabel', 'data-vi', 'Ngân sách còn lại');
        updateElementTextContent('remainingBudgetLabel', 'Remaining Budget:');
    }
    
    // Change progress bar color based on percentage used
    const budgetProgressElement = document.getElementById('budgetProgress');
    if (budgetProgressElement) {
        budgetProgressElement.className = `budget-progress ${progressColor}`;
    }
    
    const costHtml = `
        <div class="space-y-6">
            <!-- Enhanced Total Estimated Cost Display -->
            <div class="estimated-cost-container">
                <div class="estimated-cost-header">
                    <div class="estimated-cost-title">
                        <i class="fas fa-receipt mr-2"></i>
                        <span data-en="Total Estimated Cost" data-vi="Tổng Chi Phí Ước Tính">Total Estimated Cost</span>
                    </div>
                    <div class="estimated-cost-currency">${currencySymbol}</div>
                </div>
                <div class="estimated-cost-value">${formatCurrency(totalCost).replace(/[^\d.,]/g, '')}</div>
                <div class="estimated-cost-details">
                    <div class="tour-option-id">${tourId}</div>
                </div>
            </div>
            
            <!-- Cost Breakdown -->
            <div class="cost-breakdown">
                <h3 class="text-lg font-semibold mb-4">
                    <i class="fas fa-chart-pie text-blue-500 mr-2"></i>
                    <span data-en="Cost Breakdown" data-vi="Phân tích chi phí">Cost Breakdown</span>
                </h3>
                
                <div class="space-y-4">
                    ${renderCostBreakdown(tourDetail)}
                </div>
            </div>
        </div>
    `;
    
    return costHtml;
}

/**
 * Render cost breakdown section
 * @param {Object} tourDetail - Tour detail data
 * @returns {string} HTML content
 */
function renderCostBreakdown(tourDetail) {
    // Calculate totals for each category
    const categoryCosts = {
        hotel: 0,
        restaurant: 0,
        transport: 0,
        activity: 0
    };
    
    // Sum up costs by category from API format (daily_schedule)
    if (tourDetail.daily_schedule) {
        Object.keys(tourDetail.daily_schedule).forEach(dayNumber => {
            const dayItems = tourDetail.daily_schedule[dayNumber];
            if (Array.isArray(dayItems)) {
                dayItems.forEach(item => {
                    const placeType = item.place_type;
                    if (placeType && categoryCosts.hasOwnProperty(placeType)) {
                        categoryCosts[placeType] += parseFloat(item.cost) || 0;
                    }
                });
            }
        });
    }
    // Sum up costs by category from mock data (days array)
    else if (tourDetail.days && Array.isArray(tourDetail.days)) {
        tourDetail.days.forEach(day => {
            const scheduleItems = day.schedule_items || day.scheduleItems || [];
            if (Array.isArray(scheduleItems)) {
                scheduleItems.forEach(item => {
                    const placeType = item.place_type || item.placeType;
                    if (placeType && categoryCosts.hasOwnProperty(placeType)) {
                        categoryCosts[placeType] += parseFloat(item.cost) || 0;
                    }
                });
            }
        });
    }
    
    // Get total estimated cost from API or mock data
    const totalEstimatedCost = tourDetail.total_cost || tourDetail.total_estimated_cost || tourDetail.totalEstimatedCost || 0;
    
    // Create category cards
    let breakdownHtml = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
    
    // Hotels
    breakdownHtml += createCostCategoryCard(
        'hotel',
        'Hotel Accommodations',
        'Khách sạn',
        'fa-hotel',
        'bg-blue-500',
        categoryCosts.hotel,
        totalEstimatedCost
    );
    
    // Restaurants
    breakdownHtml += createCostCategoryCard(
        'restaurant',
        'Restaurant Meals',
        'Nhà hàng',
        'fa-utensils',
        'bg-green-500',
        categoryCosts.restaurant,
        totalEstimatedCost
    );
    
    // Transport
    breakdownHtml += createCostCategoryCard(
        'transport',
        'Transportation',
        'Phương tiện',
        'fa-car',
        'bg-yellow-500',
        categoryCosts.transport,
        totalEstimatedCost
    );
    
    // Activities
    breakdownHtml += createCostCategoryCard(
        'activity',
        'Activities & Attractions',
        'Hoạt động',
        'fa-map-marker-alt',
        'bg-purple-500',
        categoryCosts.activity,
        totalEstimatedCost
    );
    
    breakdownHtml += '</div>';
    return breakdownHtml;
}

/**
 * Create HTML for a cost category card
 */
function createCostCategoryCard(type, enTitle, viTitle, icon, bgColor, cost, total) {
    const percentage = total > 0 ? Math.round((cost / total) * 100) : 0;
    
    return `
        <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div class="flex justify-between items-center mb-2">
                <div class="flex items-center">
                    <div class="w-8 h-8 ${bgColor} rounded-full flex items-center justify-center text-white mr-3">
                        <i class="fas ${icon}"></i>
                    </div>
                    <h4 class="font-medium text-gray-800" data-en="${enTitle}" data-vi="${viTitle}">${enTitle}</h4>
                </div>
                <span class="text-sm font-semibold">${percentage}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div class="${bgColor} h-2 rounded-full" style="width: ${percentage}%"></div>
            </div>
            <div class="text-right text-lg font-semibold">${formatCurrency(cost)}</div>
        </div>
    `;
}

/**
 * Set up tab switching in the detail modal with smooth transitions
 */
function setupDetailTabs() {
    const scheduleTabBtn = document.getElementById('scheduleTabBtn');
    const costTabBtn = document.getElementById('costTabBtn');
    const scheduleTabContent = document.getElementById('scheduleTabContent');
    const costTabContent = document.getElementById('costTabContent');
    
    if (!scheduleTabBtn || !costTabBtn || !scheduleTabContent || !costTabContent) {
        console.error('Tab elements not found');
        return;
    }
    
    // Add styles needed for transitions
    scheduleTabContent.style.transition = 'opacity 0.3s ease';
    costTabContent.style.transition = 'opacity 0.3s ease';
    
    // Function to handle tab switching with animation
    const switchTab = function(showTab, hideTab, activeBtn, inactiveBtn) {
        // Update button styles
        activeBtn.classList.add('border-b-2', 'border-blue-500', 'text-blue-600', 'bg-blue-50');
        activeBtn.classList.remove('text-gray-500');
        
        inactiveBtn.classList.remove('border-b-2', 'border-blue-500', 'text-blue-600', 'bg-blue-50');
        inactiveBtn.classList.add('text-gray-500');
        
        // Fade out current tab
        hideTab.style.opacity = '0';
        
        // Wait for fade out, then swap tabs
        setTimeout(() => {
            hideTab.classList.add('hidden');
            showTab.classList.remove('hidden');
            
            // Set opacity to 0 before showing
            showTab.style.opacity = '0';
            
            // Force browser reflow
            void showTab.offsetWidth;
            
            // Fade in new tab
            showTab.style.opacity = '1';
        }, 300);
    };
    
    // Schedule tab click
    scheduleTabBtn.addEventListener('click', function() {
        switchTab(scheduleTabContent, costTabContent, scheduleTabBtn, costTabBtn);
    });
    
    // Cost tab click
    costTabBtn.addEventListener('click', function() {
        switchTab(costTabContent, scheduleTabContent, costTabBtn, scheduleTabBtn);
    });
}

/**
 * Show place details
 * @param {string} placeType - Type of place (hotel, restaurant, etc.)
 * @param {string} placeId - ID of the place
 */
window.showPlaceDetails = function(placeType, placeId) {
    console.log(`Showing details for ${placeType}: ${placeId}`);
    
    // First try to get the place info from API
    if (placeId) {
        // Different endpoints based on place type
        let apiEndpoint = '';
        
        switch(placeType) {
            case 'hotel':
                apiEndpoint = `/api/hotels/${placeId}`;
                break;
            case 'restaurant':
                apiEndpoint = `/api/restaurants/${placeId}`;
                break;
            case 'activity':
                apiEndpoint = `/api/activities/${placeId}`;
                break;
            case 'transport':
                apiEndpoint = `/api/transports/${placeId}`;
                break;
            default:
                console.error(`Unknown place type: ${placeType}`);
                return;
        }
        
        // Call API to get place details
        fetch(apiEndpoint)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`API returned ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                // Handle successful API response
                if (data.success === false) {
                    throw new Error(data.message || 'Failed to load details');
                }
                
                // Get the place details from the API response
                // Format may vary depending on API endpoint, so check multiple paths
                const placeInfo = data[placeType] || data.data || data;
                
                if (placeInfo) {
                    // Display the appropriate modal based on place type
                    displayPlaceDetails(placeType, placeInfo);
                } else {
                    throw new Error('No place data found in API response');
                }
            })
            .catch(error => {
                console.error(`Error fetching ${placeType} details:`, error);
                
                // Fallback to mock data if API fails
                const mockPlaceInfo = getMockPlaceInfo(placeType, placeId);
                
                if (mockPlaceInfo) {
                    displayPlaceDetails(placeType, mockPlaceInfo);
                } else {
                    // Show error message to user
                    showNotification(
                        `Unable to load details for this ${placeType}. Please try again later.`,
                        'error'
                    );
                }
            });
    } else {
        // If no placeId provided, try to use mock data
        let placeInfo = getMockPlaceInfo(placeType, placeId);
        
        if (placeInfo) {
            displayPlaceDetails(placeType, placeInfo);
        } else {
            console.error(`No data found for ${placeType} with ID ${placeId}`);
            showNotification(`No information available for this ${placeType}.`, 'warning');
        }
    }
    
    // Add a custom close button to modals to make sure they can be closed properly
    setTimeout(() => {
        const modals = document.querySelectorAll('.place-detail-modal');
        modals.forEach(modal => {
            if (!modal.querySelector('.close-button-added')) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'close-button-added absolute top-2 right-2 bg-red-500 text-white px-3 py-2 rounded-lg';
                closeBtn.innerHTML = '<i class="fas fa-times mr-2"></i>Close';
                closeBtn.onclick = function() {
                    closeModal(modal.id);
                };
                modal.querySelector('.modal-content').appendChild(closeBtn);
            }
        });
    }, 500);
};

/**
 * Display place details in appropriate modal
 * @param {string} placeType - Type of place (hotel, restaurant, activity, transport)
 * @param {Object} placeInfo - Place information
 */
function displayPlaceDetails(placeType, placeInfo) {
    // Đóng modal chi tiết tour generated trước khi hiển thị modal chi tiết địa điểm
    closeGeneratedTourDetailModal();
    
    switch(placeType) {
        case 'activity':
            showActivityDetails(placeInfo);
            break;
        case 'hotel':
            showHotelDetailsModal(placeInfo);
            break;
        case 'restaurant':
            showRestaurantDetailsModal(placeInfo);
            break;
        case 'transport':
            showTransportDetails(placeInfo);
            break;
        default:
            console.error(`Unknown place type: ${placeType}`);
    }
}

/**
 * Show enhanced hotel details modal
 * @param {Object} hotelInfo - Hotel information
 */
function showHotelDetailsModal(hotelInfo) {
    // Đóng modal chi tiết tour generated trước khi hiển thị modal chi tiết khách sạn
    const generatedTourModal = document.getElementById('generatedTourDetailModal');
    if (generatedTourModal) {
        generatedTourModal.style.display = 'none';
    }
    
    // Xóa modal cũ nếu có
    const existingModal = document.getElementById('hotelDetailModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'place-detail-modal';
    modal.id = 'hotelDetailModal';
    
    const stars = '★'.repeat(hotelInfo.stars || 3) + '☆'.repeat(5 - (hotelInfo.stars || 3));
    
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal('hotelDetailModal')"></div>
        <div class="modal-content">
            <div class="modal-header">
                <div class="header-content">
                    <div class="header-icon">
                        <i class="fas fa-hotel"></i>
                    </div>
                    <div class="header-text">
                        <h2>${hotelInfo.name || 'Hotel Name'}</h2>
                        <p>${hotelInfo.city || ''}, ${hotelInfo.country || ''}</p>
                    </div>
                </div>
                <button class="close-btn" onclick="closeModal('hotelDetailModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="place-detail-content">
                    <div class="place-image">
                        <img alt="${hotelInfo.name}" 
                             onload="if(window.ImageCache) window.ImageCache.loadImage(this, 'assets/images/hanoi.jpg', 'assets/images/danang.jpg'); else this.src='assets/images/hanoi.jpg';"
                             onerror="if(window.ImageCache) window.ImageCache.loadImage(this, 'assets/images/danang.jpg'); else this.src='assets/images/danang.jpg';">
                    </div>
                    <div class="place-info-grid">
                        <div class="place-info-item">
                            <div class="info-label" data-en="Hotel Rating" data-vi="Đánh giá">Hotel Rating</div>
                            <div class="info-value">${stars} (${hotelInfo.rating || 'N/A'}/10)</div>
                        </div>
                        <div class="place-info-item">
                            <div class="info-label" data-en="Price per Night" data-vi="Giá mỗi đêm">Price per Night</div>
                            <div class="info-value">${formatCurrency(hotelInfo.price_per_night || 100)}</div>
                        </div>
                        <div class="place-info-item">
                            <div class="info-label" data-en="Location" data-vi="Vị trí">Location</div>
                            <div class="info-value">${hotelInfo.city || 'Unknown'}, ${hotelInfo.country || 'Unknown'}</div>
                        </div>
                        <div class="place-info-item">
                            <div class="info-label" data-en="Hotel Class" data-vi="Hạng khách sạn">Hotel Class</div>
                            <div class="info-value">${hotelInfo.stars || 3} <span data-en="Stars" data-vi="Sao">Stars</span></div>
                        </div>
                        <div class="place-info-item">
                            <div class="info-label" data-en="Coordinates" data-vi="Tọa độ">Coordinates</div>
                            <div class="info-value">${hotelInfo.latitude || 'N/A'}, ${hotelInfo.longitude || 'N/A'}</div>
                        </div>
                        <div class="place-info-item">
                            <div class="info-label" data-en="Hotel ID" data-vi="Mã khách sạn">Hotel ID</div>
                            <div class="info-value">${hotelInfo.hotel_id || 'N/A'}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeModal('hotelDetailModal')" 
                        data-en="Close" data-vi="Đóng">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Update language for modal content
    if (typeof updateLanguage === 'function') {
        const preferences = getUserPreferences();
        updateLanguage(preferences.language || 'en');
    }
}

/**
 * Show enhanced restaurant details modal
 * @param {Object} restaurantInfo - Restaurant information
 */
function showRestaurantDetailsModal(restaurantInfo) {
    // Đóng modal chi tiết tour generated trước khi hiển thị modal chi tiết nhà hàng
    const generatedTourModal = document.getElementById('generatedTourDetailModal');
    if (generatedTourModal) {
        generatedTourModal.style.display = 'none';
    }
    
    // Xóa modal cũ nếu có
    const existingModal = document.getElementById('restaurantDetailModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'place-detail-modal';
    modal.id = 'restaurantDetailModal';
    
    // Check if we have coordinates for Google Maps link
    const hasCoordinates = restaurantInfo.latitude && restaurantInfo.longitude;
    const mapsLink = hasCoordinates ? 
        `https://www.google.com/maps?q=${restaurantInfo.latitude},${restaurantInfo.longitude}` : '';
    
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal('restaurantDetailModal')"></div>
        <div class="modal-content">
            <div class="modal-header">
                <div class="header-content">
                    <div class="header-icon">
                        <i class="fas fa-utensils"></i>
                    </div>
                    <div class="header-text">
                        <h2>${restaurantInfo.name || 'Restaurant Name'}</h2>
                        <p>${restaurantInfo.city || ''}, ${restaurantInfo.country || ''}</p>
                    </div>
                </div>
                <button class="close-btn" onclick="closeModal('restaurantDetailModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="place-detail-content">
                    <div class="place-image">
                        <img alt="${restaurantInfo.name}" 
                             onload="if(window.ImageCache) window.ImageCache.loadImage(this, 'assets/images/hochiminh.jpg', 'assets/images/danang.jpg'); else this.src='assets/images/hochiminh.jpg';"
                             onerror="if(window.ImageCache) window.ImageCache.loadImage(this, 'assets/images/danang.jpg'); else this.src='assets/images/danang.jpg';">
                    </div>
                    <div class="place-info-grid">
                        <div class="place-info-item">
                            <div class="info-label" data-en="Restaurant Rating" data-vi="Đánh giá">Restaurant Rating</div>
                            <div class="info-value">${restaurantInfo.rating || 'N/A'}/10</div>
                        </div>
                        <div class="place-info-item">
                            <div class="info-label" data-en="Average Price" data-vi="Giá trung bình">Average Price</div>
                            <div class="info-value">${formatCurrency(restaurantInfo.price_avg || 50)}</div>
                        </div>
                        <div class="place-info-item">
                            <div class="info-label" data-en="Cuisine Type" data-vi="Loại ẩm thực">Cuisine Type</div>
                            <div class="info-value">${restaurantInfo.cuisine_type || 'International'}</div>
                        </div>
                        <div class="place-info-item">
                            <div class="info-label" data-en="Location" data-vi="Vị trí">Location</div>
                            <div class="info-value">${restaurantInfo.city || 'Unknown'}, ${restaurantInfo.country || 'Unknown'}</div>
                        </div>
                        <div class="place-info-item">
                            <div class="info-label" data-en="Coordinates" data-vi="Tọa độ">Coordinates</div>
                            <div class="info-value">${restaurantInfo.latitude || 'N/A'}, ${restaurantInfo.longitude || 'N/A'}</div>
                        </div>
                        <div class="place-info-item">
                            <div class="info-label" data-en="Restaurant ID" data-vi="Mã nhà hàng">Restaurant ID</div>
                            <div class="info-value">${restaurantInfo.restaurant_id || restaurantInfo.id || 'N/A'}</div>
                        </div>
                        ${restaurantInfo.description ? `
                        <div class="place-info-item" style="grid-column: 1 / -1;">
                            <div class="info-label" data-en="Description" data-vi="Mô tả">Description</div>
                            <div class="info-value">${restaurantInfo.description}</div>
                        </div>` : ''}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                ${hasCoordinates ? `
                <a href="${mapsLink}" target="_blank" class="btn-primary">
                    <i class="fas fa-map-marked-alt mr-2"></i>
                    <span data-en="View on Google Maps" data-vi="Xem trên Google Maps">View on Google Maps</span>
                </a>` : ''}
                <button class="btn-secondary" onclick="closeModal('restaurantDetailModal')" 
                        data-en="Close" data-vi="Đóng">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Update language for modal content
    if (typeof updateLanguage === 'function') {
        const preferences = getUserPreferences();
        updateLanguage(preferences.language || 'en');
    }
}

/**
 * Clean currency value from string format to pure number
 * Removes currency symbols and converts to float
 * @param {string|number} value - Currency value that might contain symbols
 * @returns {number} Pure numeric value
 */
function cleanCurrencyValue(value) {
    if (typeof value === 'number') {
        return value;
    }
    
    if (typeof value === 'string') {
        // Remove all currency symbols and formatting
        const cleaned = value.replace(/[$₫€,\s]/g, '');
        const numericValue = parseFloat(cleaned);
        return isNaN(numericValue) ? 0 : numericValue;
    }
    
    return 0;
}

/**
 * Format currency value with conversion
 * @param {number|string} value - Currency value (can contain symbols) 
 * @param {string} targetCurrency - Target currency (optional, will use current user preference)
 * @returns {string} Formatted currency string
 */
function formatCurrency(value, targetCurrency) {
    // Clean the input value first to ensure it's a pure number
    const cleanValue = cleanCurrencyValue(value);
    
    let currency = 'USD'; // default fallback
    
    // Try multiple sources for currency preference (in order of priority):
    
    // 1. Explicit targetCurrency parameter (highest priority)
    if (targetCurrency) {
        currency = targetCurrency;
    }
    // 2. Check user's currency preference from cookie first (user selection takes priority)
    else {
        try {
            const cookieValue = getCookie('vietnam_travel_ui_config');
            if (cookieValue) {
                const cookieData = JSON.parse(decodeURIComponent(cookieValue));
                currency = cookieData.currency || 'USD';
            } else {
                // 3. Fallback to localStorage if cookie not available
                const localStorageData = localStorage.getItem('vietnam_travel_ui_config');
                if (localStorageData) {
                    const parsed = JSON.parse(localStorageData);
                    currency = parsed.currency || 'USD';
                } else if (window.currentCurrency) {
                    // 4. Finally check window.currentCurrency (from global state)
                    currency = window.currentCurrency;
                }
            }
        } catch (e) {
            console.warn('Error parsing currency from preferences:', e);
        }
    }
    
    // Conversion rates (USD as base)
    const conversionRates = {
        'USD': 1,
        'VND': 24000,
        'EUR': 0.85
    };
    
    // If value is 0 or invalid, return properly formatted zero
    if (!cleanValue || cleanValue === 0) {
        switch (currency) {
            case 'VND':
                return '₫0';
            case 'EUR':
                return '€0';
            case 'USD':
            default:
                return '$0';
        }
    }
    
    // Convert value to target currency
    const convertedValue = cleanValue * (conversionRates[currency] || 1);
    
    // Format based on currency type
    switch (currency) {
        case 'VND':
            return new Intl.NumberFormat('vi-VN', { 
                style: 'currency', 
                currency: 'VND',
                maximumFractionDigits: 0
            }).format(convertedValue);
        case 'EUR':
            return new Intl.NumberFormat('de-DE', { 
                style: 'currency', 
                currency: 'EUR',
                maximumFractionDigits: 0
            }).format(convertedValue);
        case 'USD':
        default:
            return new Intl.NumberFormat('en-US', { 
                style: 'currency', 
                currency: 'USD',
                maximumFractionDigits: 0
            }).format(convertedValue);
    }
}

/**
 * Get currency symbol based on user preferences
 * @returns {string} Currency symbol
 */
function getCurrencySymbol() {
    let currency = 'USD'; // default fallback
    
    // Try multiple sources for currency preference (in order of priority):
    
    // 1. Check window.currentCurrency if available (from global state)
    if (window.currentCurrency) {
        currency = window.currentCurrency;
    }
    // 2. Try localStorage first (faster access, more reliable on page refresh)
    else {
        try {
            const localStorageData = localStorage.getItem('vietnam_travel_ui_config');
            if (localStorageData) {
                const parsed = JSON.parse(localStorageData);
                currency = parsed.currency || 'USD';
            } else {
                // 3. Fallback to cookie if localStorage not available
                const cookieValue = getCookie('vietnam_travel_ui_config');
                if (cookieValue) {
                    const cookieData = JSON.parse(decodeURIComponent(cookieValue));
                    currency = cookieData.currency || 'USD';
                }
            }
        } catch (e) {
            console.warn('Error parsing currency from preferences:', e);
        }
    }
    
    // Also check window.currentCurrency if available
    if (window.currentCurrency) {
        currency = window.currentCurrency;
    }
    
    switch (currency) {
        case 'VND': return '₫';
        case 'EUR': return '€';
        case 'USD':
        default: return '$';
    }
}

/**
 * Calculate saving percentage
 * @param {number} budget - Target budget
 * @param {number} cost - Actual/estimated cost
 * @returns {number} Saving percentage
 */
function calculateSavingPercentage(budget, cost) {
    if (!budget || budget <= 0) return 0;
    if (!cost || cost <= 0) return 100;
    
    const saving = budget - cost;
    if (saving <= 0) return 0;
    
    return Math.round((saving / budget) * 100);
}

/**
 * Get user preferences from localStorage
 * @returns {Object} User preferences
 */
function getUserPreferences() {
    try {
        // Try localStorage first (faster access, more reliable on page refresh)
        const preferencesString = localStorage.getItem('vietnam_travel_ui_config');
        if (preferencesString) {
            const parsed = JSON.parse(preferencesString);
            console.log('🔄 Currency from localStorage:', parsed.currency); // Debug log
            return parsed;
        }
        
        // Fallback to cookies (vietnam_travel_ui_config)
        const cookieValue = getCookie('vietnam_travel_ui_config');
        if (cookieValue) {
            const parsed = JSON.parse(decodeURIComponent(cookieValue));
            console.log('🔄 Currency from cookie:', parsed.currency); // Debug log
            return parsed;
        }
    } catch (error) {
        console.error('Error reading user preferences:', error);
    }
    
    return {
        theme: 'sunset',
        language: 'en',
        currency: 'USD',
        setupCompleted: true
    };
}

/**
 * Helper function to get cookie value
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value
 */
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

/**
 * Mock data for tour search history
 * @returns {Array} Array of tour history items
 */
function getMockTourHistory() {
    return [
        {
            optionId: 'O0001',
            from: 'Ho Chi Minh',
            to: 'Da Nang',
            days: 3,
            date: 'July 15, 2025',
            budget: 500,
            hotel: 'Vinpearl Resort',
            restaurant: 'Vietnam House',
            transport: 'Plane'
        },
        {
            optionId: 'O0002',
            from: 'Ha Noi',
            to: 'Phu Quoc',
            days: 5,
            date: 'August 2, 2025',
            budget: 800,
            hotel: 'JW Marriott',
            restaurant: 'Spices Garden',
            transport: 'Plane'
        },
        {
            optionId: 'O0003',
            from: 'Da Nang',
            to: 'Nha Trang',
            days: 4,
            date: 'June 23, 2025',
            budget: 600,
            hotel: 'Muong Thanh',
            restaurant: 'Seafood Palace',
            transport: 'Tourist Bus'
        }
    ];
}

/**
 * Show hotel details in a modal
 * @param {Object} hotelInfo - Hotel information
 */
function showHotelDetails(hotelInfo) {
    const hotelInfoPanel = document.getElementById('hotelInfoPanel');
    const hotelInfoContent = document.getElementById('hotelInfoContent');
    
    if (!hotelInfoPanel || !hotelInfoContent) {
        console.error('Hotel info panel elements not found');
        return;
    }
    
    // Populate hotel info content
    hotelInfoContent.innerHTML = `
        <div class="info-panel-image-container">
            <img alt="${hotelInfo.name}" class="info-panel-image"
                 onload="if(window.ImageCache) window.ImageCache.loadImage(this, 'assets/images/danang.jpg'); else this.src='assets/images/danang.jpg';">
        </div>
        <div class="info-panel-details">
            <h3 class="info-panel-name">${hotelInfo.name}</h3>
            
            <div class="info-panel-rating">
                ${'★'.repeat(hotelInfo.stars || 0)}${'☆'.repeat(5 - (hotelInfo.stars || 0))}
                <span class="info-panel-score">${hotelInfo.rating}/10</span>
            </div>
            
            <div class="info-panel-location">
                <i class="fas fa-map-marker-alt"></i>
                ${hotelInfo.city}, ${hotelInfo.country || 'Vietnam'}
            </div>
            
            <div class="info-panel-price">
                <i class="fas fa-tag"></i>
                ${formatCurrency(hotelInfo.pricePerNight)} <span data-en="per night" data-vi="mỗi đêm">per night</span>
            </div>
            
            <div class="info-panel-description">
                ${hotelInfo.description || 'No description available.'}
            </div>
            
            <div class="info-panel-amenities">
                <h4 data-en="Amenities" data-vi="Tiện nghi">Amenities</h4>
                <ul>
                    <li><i class="fas fa-wifi"></i> <span data-en="Free WiFi" data-vi="WiFi miễn phí">Free WiFi</span></li>
                    <li><i class="fas fa-swimming-pool"></i> <span data-en="Swimming Pool" data-vi="Hồ bơi">Swimming Pool</span></li>
                    <li><i class="fas fa-utensils"></i> <span data-en="Restaurant" data-vi="Nhà hàng">Restaurant</span></li>
                    <li><i class="fas fa-spa"></i> <span data-en="Spa" data-vi="Spa">Spa</span></li>
                </ul>
            </div>
        </div>
    `;
    
    // Show the modal with fade-in animation
    hotelInfoPanel.style.opacity = '0';
    hotelInfoPanel.style.display = 'flex';
    
    // Force browser reflow
    void hotelInfoPanel.offsetWidth;
    
    // Animate panel in
    hotelInfoPanel.style.opacity = '1';
    
    // Add animation styles dynamically
    const style = document.createElement('style');
    style.id = 'temp-animation-styles';
    style.innerHTML = `
        .info-panel-content {
            transform: translateY(20px);
            opacity: 0;
            animation: slideUpFade 0.4s ease forwards 0.2s;
        }
        
        @keyframes slideUpFade {
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Clean up animation styles after they're done
    setTimeout(() => {
        const tempStyle = document.getElementById('temp-animation-styles');
        if (tempStyle) tempStyle.remove();
    }, 1000);
}

/**
 * Show restaurant details in a modal
 * @param {Object} restaurantInfo - Restaurant information
 */
function showRestaurantDetails(restaurantInfo) {
    const restaurantInfoPanel = document.getElementById('restaurantInfoPanel');
    const restaurantInfoContent = document.getElementById('restaurantInfoContent');
    
    if (!restaurantInfoPanel || !restaurantInfoContent) {
        console.error('Restaurant info panel elements not found');
        return;
    }
    
    // Populate restaurant info content
    restaurantInfoContent.innerHTML = `
        <div class="info-panel-image-container">
            <img alt="${restaurantInfo.name}" class="info-panel-image"
                 onload="if(window.ImageCache) window.ImageCache.loadImage(this, 'assets/images/danang.jpg'); else this.src='assets/images/danang.jpg';">
        </div>
        <div class="info-panel-details">
            <h3 class="info-panel-name">${restaurantInfo.name}</h3>
            
            <div class="info-panel-rating">
                ${'★'.repeat(Math.round(restaurantInfo.rating || 0))}${'☆'.repeat(5 - Math.round(restaurantInfo.rating || 0))}
                <span class="info-panel-score">${restaurantInfo.rating}/5</span>
            </div>
            
            <div class="info-panel-cuisine">
                <i class="fas fa-utensils"></i>
                <span data-en="Cuisine" data-vi="Ẩm thực">Cuisine:</span> ${restaurantInfo.cuisineType || 'Various'}
            </div>
            
            <div class="info-panel-location">
                <i class="fas fa-map-marker-alt"></i>
                ${restaurantInfo.city}, ${restaurantInfo.country || 'Vietnam'}
            </div>
            
            <div class="info-panel-price">
                <i class="fas fa-tag"></i>
                <span data-en="Average Price" data-vi="Giá trung bình">Average Price:</span> ${formatCurrency(restaurantInfo.priceAvg || 0)}
            </div>
            
            <div class="info-panel-description">
                ${restaurantInfo.description || 'No description available.'}
            </div>
            
            <div class="info-panel-hours">
                <h4 data-en="Opening Hours" data-vi="Giờ mở cửa">Opening Hours</h4>
                <p data-en="Monday - Sunday: 7:00 AM - 10:00 PM" data-vi="Thứ Hai - Chủ Nhật: 7:00 - 22:00">Monday - Sunday: 7:00 AM - 10:00 PM</p>
            </div>
        </div>
    `;
    
    // Show the modal with fade-in animation
    restaurantInfoPanel.style.opacity = '0';
    restaurantInfoPanel.style.display = 'flex';
    
    // Force browser reflow
    void restaurantInfoPanel.offsetWidth;
    
    // Animate panel in
    restaurantInfoPanel.style.opacity = '1';
    
    // Add animation styles dynamically
    const style = document.createElement('style');
    style.id = 'temp-animation-styles-restaurant';
    style.innerHTML = `
        #restaurantInfoContent {
            transform: translateY(20px);
            opacity: 0;
            animation: slideUpFade 0.4s ease forwards 0.2s;
        }
        
        @keyframes slideUpFade {
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Clean up animation styles after they're done
    setTimeout(() => {
        const tempStyle = document.getElementById('temp-animation-styles-restaurant');
        if (tempStyle) tempStyle.remove();
    }, 1000);
}

/**
 * Show transport details in a modal
 * @param {Object} transportInfo - Transport information
 */
function showTransportDetails(transportInfo) {
    const modal = document.createElement('div');
    modal.className = 'place-detail-modal';
    modal.id = 'transportDetailModal';
    
    // Check if we have coordinates for Google Maps link
    const hasCoordinates = transportInfo.latitude && transportInfo.longitude;
    const mapsLink = hasCoordinates ? 
        `https://www.google.com/maps?q=${transportInfo.latitude},${transportInfo.longitude}` : '';
    
    // Get icons based on transport type
    let transportIcon = 'fa-car';
    switch(transportInfo.type ? transportInfo.type.toLowerCase() : '') {
        case 'bus':
        case 'tourist bus':
            transportIcon = 'fa-bus';
            break;
        case 'taxi':
            transportIcon = 'fa-taxi';
            break;
        case 'train':
            transportIcon = 'fa-train';
            break;
        case 'plane':
        case 'airplane':
            transportIcon = 'fa-plane';
            break;
        case 'boat':
        case 'ferry':
            transportIcon = 'fa-ship';
            break;
        case 'cable car':
            transportIcon = 'fa-tram';
            break;
        default:
            transportIcon = 'fa-car';
    }
    
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal('transportDetailModal')"></div>
        <div class="modal-content">
            <div class="modal-header">
                <div class="header-content">
                    <div class="header-icon">
                        <i class="fas ${transportIcon}"></i>
                    </div>
                    <div class="header-text">
                        <h2>${transportInfo.type || 'Transport'}</h2>
                        <p>${transportInfo.city || ''}, ${transportInfo.country || ''}</p>
                    </div>
                </div>
                <button class="close-btn" onclick="closeModal('transportDetailModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="place-detail-content">
                    <div class="place-image">
                        <img alt="${transportInfo.type}" 
                             onload="if(window.ImageCache) window.ImageCache.loadImage(this, 'assets/images/danang.png', 'assets/images/danang.jpg'); else this.src='assets/images/danang.png';"
                             onerror="if(window.ImageCache) window.ImageCache.loadImage(this, 'assets/images/danang.jpg'); else this.src='assets/images/danang.jpg';">
                    </div>
                    <div class="place-info-grid">
                        <div class="place-info-item">
                            <div class="info-label" data-en="Price per Kilometer" data-vi="Giá mỗi km">Price per Kilometer</div>
                            <div class="info-value">${formatCurrency(transportInfo.avg_price_per_km || transportInfo.avgPricePerKm || 0)}</div>
                        </div>
                        <div class="place-info-item">
                            <div class="info-label" data-en="Minimum Price" data-vi="Giá tối thiểu">Minimum Price</div>
                            <div class="info-value">${formatCurrency(transportInfo.min_price || transportInfo.minPrice || 0)}</div>
                        </div>
                        <div class="place-info-item">
                            <div class="info-label" data-en="Maximum Capacity" data-vi="Sức chứa tối đa">Maximum Capacity</div>
                            <div class="info-value">${transportInfo.max_capacity || transportInfo.maxCapacity || 'N/A'} <span data-en="passengers" data-vi="hành khách">passengers</span></div>
                        </div>
                        <div class="place-info-item">
                            <div class="info-label" data-en="Operating Hours" data-vi="Giờ hoạt động">Operating Hours</div>
                            <div class="info-value">${transportInfo.operating_hours || transportInfo.operatingHours || 'N/A'}</div>
                        </div>
                        <div class="place-info-item">
                            <div class="info-label" data-en="Rating" data-vi="Đánh giá">Rating</div>
                            <div class="info-value">${transportInfo.rating || 'N/A'}/10</div>
                        </div>
                        <div class="place-info-item">
                            <div class="info-label" data-en="Transport ID" data-vi="Mã vận chuyển">Transport ID</div>
                            <div class="info-value">${transportInfo.transport_id || transportInfo.id || 'N/A'}</div>
                        </div>
                        <div class="place-info-item">
                            <div class="info-label" data-en="Location" data-vi="Vị trí">Location</div>
                            <div class="info-value">${transportInfo.city || 'Unknown'}, ${transportInfo.country || 'Unknown'}</div>
                        </div>
                        ${hasCoordinates ? `
                        <div class="place-info-item">
                            <div class="info-label" data-en="Coordinates" data-vi="Tọa độ">Coordinates</div>
                            <div class="info-value">${transportInfo.latitude || 'N/A'}, ${transportInfo.longitude || 'N/A'}</div>
                        </div>` : ''}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                ${hasCoordinates ? `
                <a href="${mapsLink}" target="_blank" class="btn-primary">
                    <i class="fas fa-map-marked-alt mr-2"></i>
                    <span data-en="View on Google Maps" data-vi="Xem trên Google Maps">View on Google Maps</span>
                </a>` : ''}
                <button class="btn-secondary" onclick="closeModal('transportDetailModal')" 
                        data-en="Close" data-vi="Đóng">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Update language for modal content
    if (typeof updateLanguage === 'function') {
        const preferences = getUserPreferences();
        updateLanguage(preferences.language || 'en');
    }
}

/**
 * Close modal with animation
 * @param {string} modalId - ID of the modal to close
 */
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // Fade out animation
        modal.style.opacity = '0';
        
        // Get the modal content for scale animation
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.transform = 'scale(0.98) translateY(10px)';
        }
        
        // Wait for animation to complete before hiding
        setTimeout(() => {
            modal.style.display = 'none';
            
            // Kiểm tra nếu modal được đóng là place detail modal, hiển thị lại modal tour detail
            if (modalId === 'hotelDetailModal' || modalId === 'restaurantDetailModal' || 
                modalId === 'activityDetailModal' || modalId === 'transportDetailModal') {
                
                const generatedTourModal = document.getElementById('generatedTourDetailModal');
                if (generatedTourModal && window.currentGeneratedTourData) {
                    generatedTourModal.style.display = 'block';
                    document.body.style.overflow = 'hidden';
                    
                    // Re-show correct tab
                    if (window.lastActiveTab) {
                        switchGeneratedTourTab(window.lastActiveTab);
                    } else {
                        switchGeneratedTourTab('schedule');
                    }
                }
            }
        }, 300);
    }
};

/**
 * Show activity details in a modal
 * @param {Object} activityInfo - Activity information
 */
function showActivityDetails(activityInfo) {
    const modal = document.createElement('div');
    modal.className = 'place-detail-modal';
    modal.id = 'activityDetailModal';
    
    // Check if we have coordinates for Google Maps link
    const hasCoordinates = activityInfo.latitude && activityInfo.longitude;
    const mapsLink = hasCoordinates ? 
        `https://www.google.com/maps?q=${activityInfo.latitude},${activityInfo.longitude}` : '';
    
    modal.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal('activityDetailModal')"></div>
        <div class="modal-content">
            <div class="modal-header">
                <div class="header-content">
                    <div class="header-icon">
                        <i class="fas fa-map-marker-alt"></i>
                    </div>
                    <div class="header-text">
                        <h2>${activityInfo.name || 'Activity Name'}</h2>
                        <p>${activityInfo.city || ''}, ${activityInfo.country || ''}</p>
                    </div>
                </div>
                <button class="close-btn" onclick="closeModal('activityDetailModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="place-detail-content">
                    <div class="place-image">
                        <img alt="${activityInfo.name}" 
                             onload="if(window.ImageCache) window.ImageCache.loadImage(this, 'assets/images/danang.jpg', 'assets/images/danang.png'); else this.src='assets/images/danang.jpg';"
                             onerror="if(window.ImageCache) window.ImageCache.loadImage(this, 'assets/images/danang.png'); else this.src='assets/images/danang.png';">
                    </div>
                    <div class="place-info-grid">
                        <div class="place-info-item">
                            <div class="info-label" data-en="Activity Rating" data-vi="Đánh giá">Activity Rating</div>
                            <div class="info-value">${activityInfo.rating || 'N/A'}/10</div>
                        </div>
                        <div class="place-info-item">
                            <div class="info-label" data-en="Price" data-vi="Giá">Price</div>
                            <div class="info-value">${formatCurrency(activityInfo.price || 0)}</div>
                        </div>
                        <div class="place-info-item">
                            <div class="info-label" data-en="Duration" data-vi="Thời gian">Duration</div>
                            <div class="info-value">${activityInfo.duration_hr || 'N/A'} <span data-en="hours" data-vi="giờ">hours</span></div>
                        </div>
                        <div class="place-info-item">
                            <div class="info-label" data-en="Location" data-vi="Vị trí">Location</div>
                            <div class="info-value">${activityInfo.city || 'Unknown'}, ${activityInfo.country || 'Unknown'}</div>
                        </div>
                        <div class="place-info-item">
                            <div class="info-label" data-en="Activity Type" data-vi="Loại hoạt động">Activity Type</div>
                            <div class="info-value">${activityInfo.type || 'General Activity'}</div>
                        </div>
                        <div class="place-info-item">
                            <div class="info-label" data-en="Activity ID" data-vi="Mã hoạt động">Activity ID</div>
                            <div class="info-value">${activityInfo.activity_id || activityInfo.id || 'N/A'}</div>
                        </div>
                        ${activityInfo.description ? `
                        <div class="place-info-item" style="grid-column: 1 / -1;">
                            <div class="info-label" data-en="Description" data-vi="Mô tả">Description</div>
                            <div class="info-value">${activityInfo.description}</div>
                        </div>` : ''}
                        ${hasCoordinates ? `
                        <div class="place-info-item">
                            <div class="info-label" data-en="Coordinates" data-vi="Tọa độ">Coordinates</div>
                            <div class="info-value">${activityInfo.latitude || 'N/A'}, ${activityInfo.longitude || 'N/A'}</div>
                        </div>` : ''}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                ${hasCoordinates ? `
                <a href="${mapsLink}" target="_blank" class="btn-primary">
                    <i class="fas fa-map-marked-alt mr-2"></i>
                    <span data-en="View on Google Maps" data-vi="Xem trên Google Maps">View on Google Maps</span>
                </a>` : ''}
                <button class="btn-secondary" onclick="closeModal('activityDetailModal')" 
                        data-en="Close" data-vi="Đóng">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Update language for modal content
    if (typeof updateLanguage === 'function') {
        const preferences = getUserPreferences();
        updateLanguage(preferences.language || 'en');
    }
}

/**
 * Get mock place information based on type and ID
 * @param {string} placeType - The type of place (hotel, restaurant, etc.)
 * @param {string} placeId - The ID of the place
 * @returns {Object} Place information
 */
function getMockPlaceInfo(placeType, placeId) {
    // In a real app, this would be an API call
    
    // Mock data based on place type and ID
    const mockData = {
        hotel: {
            'H0654': {
                id: 'H0654',
                name: 'Vinpearl Resort Da Nang',
                description: 'Luxury beachfront resort with stunning views of the East Sea. Featuring multiple swimming pools, spa facilities, and world-class restaurants.',
                stars: 5,
                pricePerNight: 160,
                rating: 8.9,
                city: 'Da Nang',
                country: 'Vietnam',
                latitude: 16.0544,
                longitude: 108.2478
            },
            'H0801': {
                id: 'H0801',
                name: 'JW Marriott Phu Quoc',
                description: 'Luxury resort on Khem Beach with unique architecture and design. Features private beach access, multiple pools, and gourmet dining options.',
                stars: 5,
                pricePerNight: 350,
                rating: 9.2,
                city: 'Phu Quoc',
                country: 'Vietnam',
                latitude: 10.3156,
                longitude: 103.8658
            }
        },
        restaurant: {
            'R0288': {
                id: 'R0288',
                name: 'Seafood Paradise',
                description: 'Fresh seafood restaurant offering the day\'s catch prepared in traditional Vietnamese style with ocean views.',
                priceAvg: 10,
                cuisineType: 'Seafood',
                rating: 4.3,
                city: 'Da Nang',
                country: 'Vietnam',
                latitude: 16.0555,
                longitude: 108.2429
            },
            'R0290': {
                id: 'R0290',
                name: 'Mi Quang 1A',
                description: 'Traditional Da Nang noodle restaurant specializing in Mi Quang, a local specialty noodle dish with shrimp, pork, and unique spices.',
                priceAvg: 12,
                cuisineType: 'Local Cuisine',
                rating: 4.5,
                city: 'Da Nang',
                country: 'Vietnam',
                latitude: 16.0595,
                longitude: 108.2400
            },
            'R0281': {
                id: 'R0281',
                name: 'Mountain View Restaurant',
                description: 'Restaurant with panoramic mountain views serving fusion cuisine that combines Vietnamese and international flavors.',
                priceAvg: 20,
                cuisineType: 'Asian Fusion',
                rating: 4.4,
                city: 'Da Nang',
                country: 'Vietnam',
                latitude: 16.0490,
                longitude: 108.2622
            }
        },
        transport: {
            'T0398': {
                id: 'T0398',
                type: 'Taxi',
                avgPricePerKm: 2.5,
                minPrice: 3.0,
                maxCapacity: 4,
                operatingHours: '24/7',
                city: 'Da Nang',
                country: 'Vietnam'
            },
            'T0400': {
                id: 'T0400',
                type: 'Taxi',
                avgPricePerKm: 2.4,
                minPrice: 3.0,
                maxCapacity: 4,
                operatingHours: '24/7',
                city: 'Da Nang',
                country: 'Vietnam'
            },
            'T0397': {
                id: 'T0397',
                type: 'Cable Car',
                avgPricePerKm: 5.0,
                minPrice: 15.0,
                maxCapacity: 8,
                operatingHours: '8:00-18:00',
                city: 'Da Nang',
                country: 'Vietnam'
            }
        },
        activity: {
            'A0963': {
                id: 'A0963',
                name: 'My Khe Beach',
                description: 'Beautiful white sand beach with crystal clear waters, perfect for swimming and sunbathing.',
                price: 0,
                rating: 4.7,
                city: 'Da Nang',
                country: 'Vietnam',
                latitude: 16.0544,
                longitude: 108.2478,
                duration_hr: 2.5
            },
            'A0968': {
                id: 'A0968',
                name: 'Dragon Bridge',
                description: 'Famous bridge in Da Nang shaped like a dragon that breathes fire and water on weekends.',
                price: 0,
                rating: 4.5,
                city: 'Da Nang',
                country: 'Vietnam',
                latitude: 16.0616,
                longitude: 108.2285,
                duration_hr: 1.0
            }
        }
    };
    
    // Return the requested place or undefined if not found
    return mockData[placeType] && mockData[placeType][placeId];
}

// Các chức năng đóng panel cũng sử dụng closeModal chung đã được tạo

/**
 * Toggle schedule day content visibility with animation
 * @param {string} dayId - ID of the day element
 */
window.toggleScheduleDay = function(dayId) {
    const dayElement = document.getElementById(dayId);
    if (!dayElement) return;
    
    const contentElement = dayElement.querySelector('.schedule-day-content');
    const toggleIcon = dayElement.querySelector('.schedule-day-toggle i');
    
    if (contentElement.style.display === 'none' || contentElement.style.display === '') {
        // Expand the day with animation
        contentElement.style.opacity = '0';
        contentElement.style.display = 'block';
        contentElement.style.maxHeight = '0';
        
        setTimeout(() => {
            contentElement.style.opacity = '1';
            contentElement.style.maxHeight = '500px';
            toggleIcon.className = 'fas fa-chevron-up';
        }, 10);
    } else {
        // Collapse the day with animation
        contentElement.style.opacity = '0';
        contentElement.style.maxHeight = '0';
        
        toggleIcon.className = 'fas fa-chevron-down';
        
        // Wait for animation to complete before hiding
        setTimeout(() => {
            contentElement.style.display = 'none';
        }, 300);
    }
};

/**
 * Get detailed tour information by option ID
 * @param {string} optionId - Tour option ID
 * @returns {Object} Detailed tour information
 */
function getTourHistoryDetail(optionId) {
    // In a real app, this would make an API call to get the details
    
    // Mock a response based on optionId
    const baseDetail = {
        optionId: optionId,
        imageUrl: 'assets/images/danang.jpg',
        budget: 0,
        totalEstimatedCost: 0,
        days: []
    };
    
    // Depending on the optionId, return different mock data
    switch (optionId) {
        case 'O0001':
            return {
                ...baseDetail,
                from: 'Ho Chi Minh',
                to: 'Da Nang',
                days: 3,
                date: 'July 15, 2025',
                budget: 500,
                totalEstimatedCost: 547.87,
                imageUrl: 'assets/images/danang.jpg',
                days: [
                    {
                        dayNumber: 1,
                        dayId: 'D000001',
                        title: 'First Day in Da Nang',
                        scheduleItems: [
                            {
                                itemId: 'I00000101',
                                tourDayId: 'D000001',
                                seq: 1,
                                startTime: '08:00',
                                endTime: '09:30',
                                placeType: 'activity',
                                placeId: 'A0963',
                                cost: 0,
                                placeInfo: {
                                    id: 'A0963',
                                    name: 'My Khe Beach',
                                    description: 'Beautiful beach with white sand',
                                    price: 0,
                                    rating: 4.7
                                }
                            },
                            {
                                itemId: 'I00000102',
                                tourDayId: 'D000001',
                                seq: 2,
                                startTime: '09:30',
                                endTime: '11:00',
                                placeType: 'activity',
                                placeId: 'A0968',
                                cost: 0,
                                placeInfo: {
                                    id: 'A0968',
                                    name: 'Dragon Bridge',
                                    description: 'Famous bridge in Da Nang',
                                    price: 0,
                                    rating: 4.5
                                }
                            },
                            {
                                itemId: 'I00000103',
                                tourDayId: 'D000001',
                                seq: 3,
                                startTime: '11:00',
                                endTime: '12:00',
                                placeType: 'transport',
                                placeId: 'T0398',
                                cost: 0.10,
                                placeInfo: {
                                    id: 'T0398',
                                    type: 'Taxi',
                                    avgPricePerKm: 2.5,
                                    minPrice: 3.0,
                                    maxCapacity: 4
                                }
                            },
                            {
                                itemId: 'I00000104',
                                tourDayId: 'D000001',
                                seq: 4,
                                startTime: '12:00',
                                endTime: '14:00',
                                placeType: 'restaurant',
                                placeId: 'R0288',
                                cost: 10.00,
                                placeInfo: {
                                    id: 'R0288',
                                    name: 'Seafood Paradise',
                                    description: 'Fresh seafood restaurant',
                                    priceAvg: 10,
                                    cuisineType: 'Seafood',
                                    rating: 4.3
                                }
                            },
                            {
                                itemId: 'I00000105',
                                tourDayId: 'D000001',
                                seq: 5,
                                startTime: '14:00',
                                endTime: '15:00',
                                placeType: 'activity',
                                placeId: 'A0967',
                                cost: 0,
                                placeInfo: {
                                    id: 'A0967',
                                    name: 'Son Tra Peninsula',
                                    description: 'Beautiful mountain peninsula',
                                    price: 0,
                                    rating: 4.8
                                }
                            },
                            {
                                itemId: 'I00000106',
                                tourDayId: 'D000001',
                                seq: 6,
                                startTime: '15:00',
                                endTime: '16:30',
                                placeType: 'activity',
                                placeId: 'A0966',
                                cost: 0,
                                placeInfo: {
                                    id: 'A0966',
                                    name: 'Linh Ung Pagoda',
                                    description: 'Buddhist temple with Lady Buddha statue',
                                    price: 0,
                                    rating: 4.7
                                }
                            },
                            {
                                itemId: 'I00000107',
                                tourDayId: 'D000001',
                                seq: 7,
                                startTime: '16:30',
                                endTime: '18:00',
                                placeType: 'transport',
                                placeId: 'T0400',
                                cost: 0.12,
                                placeInfo: {
                                    id: 'T0400',
                                    type: 'Taxi',
                                    avgPricePerKm: 2.4,
                                    minPrice: 3.0,
                                    maxCapacity: 4
                                }
                            },
                            {
                                itemId: 'I00000108',
                                tourDayId: 'D000001',
                                seq: 8,
                                startTime: '18:00',
                                endTime: '20:00',
                                placeType: 'restaurant',
                                placeId: 'R0290',
                                cost: 12.00,
                                placeInfo: {
                                    id: 'R0290',
                                    name: 'Mi Quang 1A',
                                    description: 'Traditional Da Nang noodles',
                                    priceAvg: 12,
                                    cuisineType: 'Local Cuisine',
                                    rating: 4.5
                                }
                            },
                            {
                                itemId: 'I00000109',
                                tourDayId: 'D000001',
                                seq: 9,
                                startTime: '20:00',
                                endTime: '23:00',
                                placeType: 'hotel',
                                placeId: 'H0654',
                                cost: 483.00,
                                placeInfo: {
                                    id: 'H0654',
                                    name: 'Vinpearl Resort Da Nang',
                                    description: 'Luxury beachfront resort',
                                    stars: 5,
                                    pricePerNight: 160,
                                    rating: 8.9
                                }
                            }
                        ]
                    },
                    {
                        dayNumber: 2,
                        dayId: 'D000002',
                        title: 'Exploring Da Nang',
                        scheduleItems: [
                            {
                                itemId: 'I00000201',
                                tourDayId: 'D000002',
                                seq: 1,
                                startTime: '08:00',
                                endTime: '09:30',
                                placeType: 'activity',
                                placeId: 'A0974',
                                cost: 0,
                                placeInfo: {
                                    id: 'A0974',
                                    name: 'Ba Na Hills',
                                    description: 'Mountain resort with Golden Bridge',
                                    price: 0,
                                    rating: 4.7
                                }
                            },
                            {
                                itemId: 'I00000202',
                                tourDayId: 'D000002',
                                seq: 2,
                                startTime: '09:30',
                                endTime: '11:00',
                                placeType: 'activity',
                                placeId: 'A0975',
                                cost: 0,
                                placeInfo: {
                                    id: 'A0975',
                                    name: 'Golden Bridge',
                                    description: 'Famous bridge held by giant hands',
                                    price: 0,
                                    rating: 4.9
                                }
                            },
                            {
                                itemId: 'I00000203',
                                tourDayId: 'D000002',
                                seq: 3,
                                startTime: '11:00',
                                endTime: '12:00',
                                placeType: 'transport',
                                placeId: 'T0397',
                                cost: 0.15,
                                placeInfo: {
                                    id: 'T0397',
                                    type: 'Cable Car',
                                    avgPricePerKm: 5.0,
                                    minPrice: 15.0,
                                    maxCapacity: 8
                                }
                            },
                            {
                                itemId: 'I00000204',
                                tourDayId: 'D000002',
                                seq: 4,
                                startTime: '12:00',
                                endTime: '14:00',
                                placeType: 'restaurant',
                                placeId: 'R0281',
                                cost: 20.00,
                                placeInfo: {
                                    id: 'R0281',
                                    name: 'Mountain View Restaurant',
                                    description: 'Restaurant with panoramic views',
                                    priceAvg: 20,
                                    cuisineType: 'Asian Fusion',
                                    rating: 4.4
                                }
                            },
                            {
                                itemId: 'I00000205',
                                tourDayId: 'D000002',
                                seq: 5,
                                startTime: '14:00',
                                endTime: '15:00',
                                placeType: 'activity',
                                placeId: 'A0972',
                                cost: 0,
                                placeInfo: {
                                    id: 'A0972',
                                    name: 'Fantasy Park',
                                    description: 'Indoor amusement park',
                                    price: 0,
                                    rating: 4.3
                                }
                            },
                            {
                                itemId: 'I00000206',
                                tourDayId: 'D000002',
                                seq: 6,
                                startTime: '15:00',
                                endTime: '16:30',
                                placeType: 'activity',
                                placeId: 'A0970',
                                cost: 0,
                                placeInfo: {
                                    id: 'A0970',
                                    name: 'French Village',
                                    description: 'Replica of a French colonial town',
                                    price: 0,
                                    rating: 4.5
                                }
                            },
                            {
                                itemId: 'I00000207',
                                tourDayId: 'D000002',
                                seq: 7,
                                startTime: '16:30',
                                endTime: '18:00',
                                placeType: 'transport',
                                placeId: 'T0396',
                                cost: 2.50,
                                placeInfo: {
                                    id: 'T0396',
                                    type: 'Cable Car',
                                    avgPricePerKm: 5.0,
                                    minPrice: 15.0,
                                    maxCapacity: 8
                                }
                            },
                            {
                                itemId: 'I00000208',
                                tourDayId: 'D000002',
                                seq: 8,
                                startTime: '18:00',
                                endTime: '20:00',
                                placeType: 'restaurant',
                                placeId: 'R0286',
                                cost: 20.0,
                                placeInfo: {
                                    id: 'R0286',
                                    name: 'Han Market Food Court',
                                    description: 'Local street food center',
                                    priceAvg: 20,
                                    cuisineType: 'Vietnamese',
                                    rating: 4.3
                                }
                            }
                        ]
                    }
                ]
            };
            
        case 'O0002':
            return {
                ...baseDetail,
                from: 'Ha Noi',
                to: 'Phu Quoc',
                days: 5,
                date: 'August 2, 2025',
                budget: 800,
                totalEstimatedCost: 750.50,
                imageUrl: 'assets/images/hochiminh.jpg',
                days: [
                    {
                        dayNumber: 1,
                        dayId: 'D000003',
                        title: 'Arriving in Phu Quoc',
                        scheduleItems: [
                            {
                                itemId: 'I00000301',
                                tourDayId: 'D000003',
                                seq: 1,
                                startTime: '09:00',
                                endTime: '10:30',
                                placeType: 'transport',
                                placeId: 'T0501',
                                cost: 150.00,
                                placeInfo: {
                                    id: 'T0501',
                                    type: 'Plane',
                                    avgPricePerKm: 0.15,
                                    minPrice: 100.00,
                                    maxCapacity: 180
                                }
                            },
                            {
                                itemId: 'I00000302',
                                tourDayId: 'D000003',
                                seq: 2,
                                startTime: '11:00',
                                endTime: '12:00',
                                placeType: 'transport',
                                placeId: 'T0502',
                                cost: 25.00,
                                placeInfo: {
                                    id: 'T0502',
                                    type: 'Airport Shuttle',
                                    avgPricePerKm: 2.0,
                                    minPrice: 15.00,
                                    maxCapacity: 12
                                }
                            },
                            {
                                itemId: 'I00000303',
                                tourDayId: 'D000003',
                                seq: 3,
                                startTime: '12:00',
                                endTime: '14:00',
                                placeType: 'hotel',
                                placeId: 'H0801',
                                cost: 350.00,
                                placeInfo: {
                                    id: 'H0801',
                                    name: 'JW Marriott Phu Quoc',
                                    description: 'Luxury resort on Khem Beach',
                                    stars: 5,
                                    pricePerNight: 350,
                                    rating: 9.2
                                }
                            }
                        ]
                    }
                ]
            };
            
        case 'O0003':
            return {
                ...baseDetail,
                from: 'Da Nang',
                to: 'Nha Trang',
                days: 4,
                date: 'June 23, 2025',
                budget: 600,
                totalEstimatedCost: 575.25,
                imageUrl: 'assets/images/hanoi.jpg',
                days: [
                    {
                        dayNumber: 1,
                        dayId: 'D000004',
                        title: 'Nha Trang City Tour',
                        scheduleItems: [
                            {
                                itemId: 'I00000401',
                                tourDayId: 'D000004',
                                seq: 1,
                                startTime: '08:00',
                                endTime: '09:30',
                                placeType: 'activity',
                                placeId: 'A0701',
                                cost: 5.00,
                                placeInfo: {
                                    id: 'A0701',
                                    name: 'Po Nagar Cham Towers',
                                    description: 'Ancient Cham temple tower complex',
                                    price: 5,
                                    rating: 4.5
                                }
                            },
                            {
                                itemId: 'I00000402',
                                tourDayId: 'D000004',
                                seq: 2,
                                startTime: '10:00',
                                endTime: '12:00',
                                placeType: 'activity',
                                placeId: 'A0702',
                                cost: 20.00,
                                placeInfo: {
                                    id: 'A0702',
                                    name: 'Vinpearl Amusement Park',
                                    description: 'Theme park on Hon Tre Island',
                                    price: 20,
                                    rating: 4.7
                                }
                            }
                        ]
                    }
                ]
            };
            
        default:
            // Return empty data for unknown optionId
            return baseDetail;
    }
}
// Add getCurrencySymbol helper function to get symbol based on user's currency preference
function getCurrencySymbol() {
    let currency = 'USD'; // default fallback
    
    // Check user's currency preference from cookie first
    try {
        const cookieValue = getCookie('vietnam_travel_ui_config');
        if (cookieValue) {
            const cookieData = JSON.parse(decodeURIComponent(cookieValue));
            currency = cookieData.currency || 'USD';
        } else {
            // Fallback to localStorage if cookie not available
            const localStorageData = localStorage.getItem('vietnam_travel_ui_config');
            if (localStorageData) {
                const parsed = JSON.parse(localStorageData);
                currency = parsed.currency || 'USD';
            } else if (window.currentCurrency) {
                currency = window.currentCurrency;
            }
        }
    } catch (e) {
        console.warn('Error parsing currency from preferences:', e);
    }
    
    // Return appropriate symbol
    switch (currency) {
        case 'VND':
            return '₫';
        case 'EUR':
            return '€';
        case 'USD':
        default:
            return '$';
    }
}