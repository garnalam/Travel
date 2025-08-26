/**
 * Date Picker Module for Vietnam Travel
 * Uses Flatpickr for enhanced date and time selection
 */

// Initialize date pickers throughout the application
function initializeDatePickers() {
    console.log('🗓️ Initializing date pickers...');
    
    // Get all date input fields
    const dateInputs = document.querySelectorAll('input[type="date"]');
    
    // Apply flatpickr to each date input
    dateInputs.forEach(input => {
        // Get attributes for customization
        const minDate = input.getAttribute('min') || null;
        const maxDate = input.getAttribute('max') || null;
        const defaultDate = input.value || null;
        
        // Create language-specific configurations
        const config = {
            dateFormat: "Y-m-d",
            minDate: minDate,
            maxDate: maxDate,
            defaultDate: defaultDate,
            allowInput: true,
            disableMobile: false, // Enable native on mobile for better UX
            locale: {
                firstDayOfWeek: 1, // Monday
                weekdays: {
                    shorthand: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
                    longhand: ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"]
                },
                months: {
                    shorthand: ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"],
                    longhand: ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"]
                }
            },
            onChange: function(selectedDates, dateStr) {
                // Update the original input value when date changes
                input.value = dateStr;
                
                // Trigger change event to notify other listeners (like validation)
                const event = new Event('change', { bubbles: true });
                input.dispatchEvent(event);
            }
        };
        
        // Create flatpickr instance
        const picker = flatpickr(input, config);
        
        // Store flatpickr instance on the element for future reference
        input._flatpickr = picker;
    });
    
    console.log('✅ Date pickers initialized');
}

// Initialize time pickers throughout the application
function initializeTimePickers() {
    console.log('🕒 Initializing time pickers...');
    
    // Get all time input fields
    const timeInputs = document.querySelectorAll('input[type="time"]');
    
    // Apply flatpickr to each time input
    timeInputs.forEach(input => {
        // Get attributes for customization
        const defaultTime = input.value || null;
        
        // Create configuration
        const config = {
            enableTime: true,
            noCalendar: true,
            dateFormat: "H:i",
            time_24hr: true,
            defaultDate: defaultTime,
            allowInput: true,
            disableMobile: false, // Enable native on mobile for better UX
            onChange: function(selectedDates, timeStr) {
                // Update the original input value when time changes
                input.value = timeStr;
                
                // Trigger change event to notify other listeners (like validation)
                const event = new Event('change', { bubbles: true });
                input.dispatchEvent(event);
            }
        };
        
        // Create flatpickr instance
        const picker = flatpickr(input, config);
        
        // Store flatpickr instance on the element for future reference
        input._flatpickr = picker;
    });
    
    console.log('✅ Time pickers initialized');
}

// Update picker language based on user preferences
function updatePickerLanguage(language) {
    const isVietnamese = language === 'vi';
    
    // Update all flatpickr instances with the new language
    document.querySelectorAll('input[type="date"], input[type="time"]').forEach(input => {
        if (input._flatpickr) {
            if (isVietnamese) {
                input._flatpickr.config.locale = {
                    firstDayOfWeek: 1,
                    weekdays: {
                        shorthand: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
                        longhand: ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"]
                    },
                    months: {
                        shorthand: ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"],
                        longhand: ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"]
                    }
                };
            } else {
                input._flatpickr.config.locale = {
                    firstDayOfWeek: 0,
                    weekdays: {
                        shorthand: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
                        longhand: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
                    },
                    months: {
                        shorthand: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                        longhand: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
                    }
                };
            }
            
            // Reinitialize picker with new locale
            input._flatpickr.redraw();
        }
    });
}

// Initialize both date and time pickers
function initializeDateTimePickers() {
    initializeDatePickers();
    initializeTimePickers();
}

// Export functions for use in main script
window.initializeDatePickers = initializeDatePickers;
window.initializeTimePickers = initializeTimePickers;
window.initializeDateTimePickers = initializeDateTimePickers;
window.updatePickerLanguage = updatePickerLanguage;