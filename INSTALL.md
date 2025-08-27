# Vietnam Travel Website with Admin Panel & User Interface Config - Installation Guide

## Features
- ✅ AJAX Autocomplete Hotel & Restaurant Search
- ✅ Flexible Search (name, country, city, dates)  
- ✅ Real-time Suggestions
- ✅ Multi-language Support (EN/VI)
- ✅ Currency Conversion (USD/VND/EUR)
- ✅ MySQL Database Integration
- ✅ Admin Panel with Site Configuration
- ✅ User Management & Role-based Access
- ✅ Welcome Setup for New Users
- ✅ Personal Interface Configuration (Theme, Language, Currency)
- ✅ Cookie-based Settings Storage

## Quick Start

### 1. Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Setup MySQL database
mysql -u root -p < new_travel.sql

# Update database credentials in app.py
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root', 
    'password': 'your_password',
    'database': 'new_travel'
}

# Run Flask server
python app.py
```

### 2. Access Website
- Open browser: http://localhost:8386
- Test account: test@example.com / test123 (Admin)

### 3. Admin Panel
- Login with admin account
- Access Admin Panel from dashboard
- Configure site settings, language, theme
- Manage user roles and permissions

## Search Features
✅ Hotel name + dates
✅ Restaurant search with cuisine filters
✅ Country + city search
✅ Flexible date ranges
✅ AJAX autocomplete suggestions

## API Endpoints
### General
- GET /api/countries
- GET /api/cities?country=
- GET /api/check-admin

### Hotels
- POST /api/hotels/search  
- GET /api/hotels/autocomplete

### Restaurants
- POST /api/restaurants/search
- GET /api/restaurants/autocomplete
- GET /api/restaurants/cuisines

### Admin
- POST /api/admin/save-config
- GET /api/admin/load-config

## Admin Features
- 🔧 Site configuration management
- 🎨 Theme and color customization
- 🌍 Language and currency settings
- 👥 User role management
- 📊 Dashboard analytics

Happy coding! 🚀
