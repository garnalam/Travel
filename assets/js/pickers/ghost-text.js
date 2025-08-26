/**
 * Ghost Text Module for Vietnam Travel
 * Provides real-time suggestions from database as user types
 */

// Initialize ghost text functionality for city inputs
function initializeGhostTextForCities() {
    console.log('🏙️ Initializing ghost text for city inputs...');
    
    // Get all city input fields
    const cityInputs = [
        document.getElementById('departure'),
        document.getElementById('destination')
    ].filter(Boolean); // Filter out null elements
    
    // Apply ghost text to each city input
    cityInputs.forEach(input => {
        if (!input) return;
        
        // Create ghost text container
        const ghostTextContainer = document.createElement('div');
        ghostTextContainer.className = 'ghost-text';
        ghostTextContainer.style.position = 'absolute';
        ghostTextContainer.style.top = '0';
        ghostTextContainer.style.left = '0';
        ghostTextContainer.style.pointerEvents = 'none';
        ghostTextContainer.style.color = '#aaa';
        ghostTextContainer.style.width = '100%';
        ghostTextContainer.style.padding = '0.75rem';
        ghostTextContainer.style.fontSize = getComputedStyle(input).fontSize;
        ghostTextContainer.style.fontFamily = getComputedStyle(input).fontFamily;
        ghostTextContainer.style.display = 'none';
        
        // Position the ghost text container
        input.parentNode.style.position = 'relative';
        input.parentNode.appendChild(ghostTextContainer);
        
        // Store ghost text container reference
        input._ghostTextContainer = ghostTextContainer;
        
        // Setup input listeners
        let debounceTimer;
        
        input.addEventListener('input', () => {
            const query = input.value.trim();
            ghostTextContainer.style.display = 'none';
            
            // Clear previous timeout
            clearTimeout(debounceTimer);
            
            // Don't show ghost text if input is empty or too short
            if (query.length < 2) return;
            
            // Debounce API calls
            debounceTimer = setTimeout(async () => {
                try {
                    // Make API call to get city suggestions
                    const response = await fetch(`/api/ghost/cities?q=${encodeURIComponent(query)}`);
                    if (response.ok) {
                        const data = await response.json();
                        const suggestion = data.suggestion || '';
                        
                        // If there's a suggestion and it starts with what the user typed
                        if (suggestion && suggestion.toLowerCase().startsWith(query.toLowerCase())) {
                            // Calculate the ghost text (the part that needs to be shown)
                            const ghostText = suggestion.substring(query.length);
                            
                            // Show ghost text
                            ghostTextContainer.textContent = query + ghostText;
                            ghostTextContainer.style.display = 'block';
                            
                            // Store the suggestion for completion on tab
                            input._currentSuggestion = suggestion;
                        } else {
                            // Clear ghost text if no matching suggestion
                            ghostTextContainer.textContent = '';
                            ghostTextContainer.style.display = 'none';
                            input._currentSuggestion = null;
                        }
                    }
                } catch (error) {
                    console.error('Error fetching city ghost text:', error);
                }
            }, 200);
        });
        
        // Complete the text on Tab key
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Tab' && input._currentSuggestion) {
                event.preventDefault();
                input.value = input._currentSuggestion;
                ghostTextContainer.style.display = 'none';
                
                // Trigger change event
                const changeEvent = new Event('change', { bubbles: true });
                input.dispatchEvent(changeEvent);
                
                // Also trigger input event to update any dependent components
                const inputEvent = new Event('input', { bubbles: true });
                input.dispatchEvent(inputEvent);
            }
        });
        
        // Clear ghost text on blur
        input.addEventListener('blur', () => {
            setTimeout(() => {
                ghostTextContainer.style.display = 'none';
            }, 200);
        });
        
        // Show ghost text on focus if there's a current suggestion
        input.addEventListener('focus', () => {
            if (input._currentSuggestion) {
                const query = input.value.trim();
                if (query.length > 0 && input._currentSuggestion.toLowerCase().startsWith(query.toLowerCase())) {
                    const ghostText = input._currentSuggestion.substring(query.length);
                    ghostTextContainer.textContent = query + ghostText;
                    ghostTextContainer.style.display = 'block';
                }
            }
        });
    });
    
    console.log('✅ Ghost text for city inputs initialized');
}

// Initialize ghost text functionality for hotel inputs
function initializeGhostTextForHotels() {
    console.log('🏨 Initializing ghost text for hotel inputs...');
    
    // Get all hotel input fields
    const hotelInput = document.getElementById('hotels');
    
    if (hotelInput) {
        setupGhostTextForInput(hotelInput, '/api/ghost/hotels', 'hotel');
    }
    
    console.log('✅ Ghost text for hotel inputs initialized');
}

// Initialize ghost text functionality for restaurant inputs
function initializeGhostTextForRestaurants() {
    console.log('🍽️ Initializing ghost text for restaurant inputs...');
    
    // Get all restaurant input fields
    const restaurantInput = document.getElementById('restaurants');
    
    if (restaurantInput) {
        setupGhostTextForInput(restaurantInput, '/api/ghost/restaurants', 'restaurant');
    }
    
    console.log('✅ Ghost text for restaurant inputs initialized');
}

// Helper function to setup ghost text for any input
function setupGhostTextForInput(input, apiEndpoint, type) {
    if (!input) return;
    
    // Create ghost text container
    const ghostTextContainer = document.createElement('div');
    ghostTextContainer.className = 'ghost-text';
    ghostTextContainer.style.position = 'absolute';
    ghostTextContainer.style.top = '0';
    ghostTextContainer.style.left = '0';
    ghostTextContainer.style.pointerEvents = 'none';
    ghostTextContainer.style.color = '#aaa';
    ghostTextContainer.style.width = '100%';
    ghostTextContainer.style.padding = '0.75rem';
    ghostTextContainer.style.fontSize = getComputedStyle(input).fontSize;
    ghostTextContainer.style.fontFamily = getComputedStyle(input).fontFamily;
    ghostTextContainer.style.display = 'none';
    
    // Position the ghost text container
    input.parentNode.style.position = 'relative';
    input.parentNode.appendChild(ghostTextContainer);
    
    // Store ghost text container reference
    input._ghostTextContainer = ghostTextContainer;
    
    // Setup input listeners
    let debounceTimer;
    
    input.addEventListener('input', () => {
        const query = input.value.trim();
        ghostTextContainer.style.display = 'none';
        
        // Clear previous timeout
        clearTimeout(debounceTimer);
        
        // Don't show ghost text if input is empty or too short
        if (query.length < 2) return;
        
        // Debounce API calls
        debounceTimer = setTimeout(async () => {
            try {
                // Make API call to get suggestions
                const response = await fetch(`${apiEndpoint}?q=${encodeURIComponent(query)}`);
                if (response.ok) {
                    const data = await response.json();
                    const suggestion = data.suggestion || '';
                    
                    // If there's a suggestion and it starts with what the user typed
                    if (suggestion && suggestion.toLowerCase().startsWith(query.toLowerCase())) {
                        // Calculate the ghost text (the part that needs to be shown)
                        const ghostText = suggestion.substring(query.length);
                        
                        // Show ghost text
                        ghostTextContainer.textContent = query + ghostText;
                        ghostTextContainer.style.display = 'block';
                        
                        // Store the suggestion for completion on tab
                        input._currentSuggestion = suggestion;
                    } else {
                        // Clear ghost text if no matching suggestion
                        ghostTextContainer.textContent = '';
                        ghostTextContainer.style.display = 'none';
                        input._currentSuggestion = null;
                    }
                }
            } catch (error) {
                console.error(`Error fetching ${type} ghost text:`, error);
            }
        }, 200);
    });
    
    // Complete the text on Tab key
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Tab' && input._currentSuggestion) {
            event.preventDefault();
            input.value = input._currentSuggestion;
            ghostTextContainer.style.display = 'none';
            
            // Trigger change event
            const changeEvent = new Event('change', { bubbles: true });
            input.dispatchEvent(changeEvent);
            
            // Also trigger input event to update any dependent components
            const inputEvent = new Event('input', { bubbles: true });
            input.dispatchEvent(inputEvent);
        }
    });
    
    // Clear ghost text on blur
    input.addEventListener('blur', () => {
        setTimeout(() => {
            ghostTextContainer.style.display = 'none';
        }, 200);
    });
    
    // Show ghost text on focus if there's a current suggestion
    input.addEventListener('focus', () => {
        if (input._currentSuggestion) {
            const query = input.value.trim();
            if (query.length > 0 && input._currentSuggestion.toLowerCase().startsWith(query.toLowerCase())) {
                const ghostText = input._currentSuggestion.substring(query.length);
                ghostTextContainer.textContent = query + ghostText;
                ghostTextContainer.style.display = 'block';
            }
        }
    });
}

// Initialize all ghost text functionality
function initializeAllGhostText() {
    initializeGhostTextForCities();
    initializeGhostTextForHotels();
    initializeGhostTextForRestaurants();
}

// Export functions for use in main script
window.initializeGhostTextForCities = initializeGhostTextForCities;
window.initializeGhostTextForHotels = initializeGhostTextForHotels;
window.initializeGhostTextForRestaurants = initializeGhostTextForRestaurants;
window.initializeAllGhostText = initializeAllGhostText;