import json
import pandas as pd
from datetime import datetime
import mysql.connector
import google.generativeai as genai
import math


# ---------- CẤU HÌNH GEMINI ----------
def config_gemini():
    genai.configure(api_key="AIzaSyBidmLGlO6G5SyB5K9j3OUNTs1um3m50H0")
    return genai.GenerativeModel(model_name="models/gemini-1.5-flash")

# Khởi tạo Gemini model
gemini_model = config_gemini()


def get_db_connection():
    """Kết nối cơ sở dữ liệu MySQL"""
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="", 
        database="smart_travel"
    )


class UserTourInfo:
    """Class chứa thông tin tour của người dùng"""
    def __init__(self, user_tour_option: dict):
        self.user_id = user_tour_option['user_id']
        self.start_city_id = user_tour_option['start_city_id']
        self.destination_city_id = user_tour_option['destination_city_id']
        self.hotel_ids = user_tour_option['hotel_ids']
        self.activity_ids = user_tour_option['activity_ids']
        self.restaurant_ids = user_tour_option['restaurant_ids']
        self.transport_ids = user_tour_option['transport_ids']
        self.guest_count = user_tour_option['guest_count']
        self.duration_days = user_tour_option['duration_days']
        self.target_budget = user_tour_option['target_budget']


def create_user_tour_info_simple(user_id, start_city_id, destination_city_id, 
                                guest_count=1, duration_days=3, target_budget=1000.0,
                                hotel_ids=None, activity_ids=None, restaurant_ids=None, transport_ids=None):
    """
    Tạo UserTourInfo từ các tham số đơn giản để dễ sử dụng với Gemini
    """
    return UserTourInfo({
        'user_id': user_id,
        'start_city_id': start_city_id,
        'destination_city_id': destination_city_id,
        'guest_count': guest_count,
        'duration_days': duration_days,
        'target_budget': target_budget,
        'hotel_ids': hotel_ids or [],
        'activity_ids': activity_ids or [],
        'restaurant_ids': restaurant_ids or [],
        'transport_ids': transport_ids or []
    })


def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Tính khoảng cách Haversine (km)"""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    
    a = (math.sin(dphi/2)**2 + 
         math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

def _calculate_travel_time(distance_km: float, transport_mode: str, is_rush_hour: bool = False) -> int:
    """Tính thời gian di chuyển (phút) dựa trên khoảng cách và phương tiện"""
    # Tốc độ trung bình cho từng phương tiện (km/h)
    speed_map = {
        'walk': 4,
        'bike': 12,
        'scooter': 25,
        'taxi': 30,
        'bus': 25,
        'metro': 35,
        'car': 30
    }
    
    base_speed = speed_map.get(transport_mode, 30)  # Default to taxi speed
    
    # Điều chỉnh tốc độ trong giờ cao điểm
    if is_rush_hour and transport_mode in ['scooter', 'taxi', 'car']:
        base_speed *= 0.8  # Giảm 20% tốc độ trong giờ cao điểm
    
    # Tính thời gian cơ bản
    base_time_minutes = (distance_km / base_speed) * 60
    
    # Thêm buffer time
    buffer_time = 10  # Base buffer 10 phút
    if transport_mode in ['scooter', 'taxi', 'car']:
        buffer_time += 5  # Thêm 5 phút cho phương tiện cơ giới
    if distance_km > 20:
        buffer_time += 10  # Thêm 10 phút cho khoảng cách xa
    
    total_time = math.ceil(base_time_minutes + buffer_time)
    
    return max(total_time, 5)  # Minimum 5 phút

def _calculate_transport_cost(distance_km: float, transport_mode: str) -> float:
    """Tính chi phí di chuyển dựa trên khoảng cách và phương tiện"""
    cost_map = {
        'walk': 0,      # Free
        'bike': 2,      # Fixed rental cost
        'scooter': 0.5, # Per km
        'taxi': 1.2,    # Per km 
        'bus': 0.3,     # Per km
        'metro': 0.4,   # Per km
        'car': 1.0      # Per km
    }
    
    if transport_mode in ['walk', 'bike']:
        return cost_map[transport_mode]  # Fixed cost
    else:
        base_cost = cost_map.get(transport_mode, 1.0) * distance_km
        return round(max(base_cost, 1.0), 1)  # Minimum $1

def _get_location_coordinates(cursor, place_type: str, place_id: str) -> tuple:
    """Lấy tọa độ của địa điểm từ database"""
    try:
        if place_type == 'activity':
            cursor.execute("SELECT latitude, longitude FROM activities WHERE activity_id = %s", (place_id,))
        elif place_type == 'restaurant':
            cursor.execute("SELECT latitude, longitude FROM restaurants WHERE restaurant_id = %s", (place_id,))
        elif place_type == 'hotel':
            cursor.execute("SELECT latitude, longitude FROM hotels WHERE hotel_id = %s", (place_id,))
        else:
            return None, None
            
        result = cursor.fetchone()
        if result and result['latitude'] and result['longitude']:
            return float(result['latitude']), float(result['longitude'])
        return None, None
    except Exception as e:
        print(f"Error getting coordinates for {place_type} {place_id}: {e}")
        return None, None

def _process_distances_and_times(itinerary_data: dict, cursor, user_prefs: dict = None) -> dict:
    """Tính toán khoảng cách và thời gian thực tế cho các transfer activities"""
    if user_prefs is None:
        user_prefs = {}
    
    print("🧮 Calculating real distances and travel times...")
    
    for day in itinerary_data.get('days', []):
        activities = day.get('activities', [])
        
        for i, activity in enumerate(activities):
            if activity.get('type') == 'transfer':
                # Tìm activity trước và sau transfer
                prev_activity = activities[i-1] if i > 0 else None
                next_activity = activities[i+1] if i < len(activities)-1 else None
                
                if prev_activity and next_activity:
                    # Lấy tọa độ từ và đến
                    from_lat, from_lon = _get_location_coordinates(
                        cursor, prev_activity.get('type'), prev_activity.get('place_id')
                    )
                    to_lat, to_lon = _get_location_coordinates(
                        cursor, next_activity.get('type'), next_activity.get('place_id')
                    )
                    
                    if from_lat and from_lon and to_lat and to_lon:
                        # Tính khoảng cách thực tế
                        distance = _haversine_distance(from_lat, from_lon, to_lat, to_lon)
                        
                        # Check rush hour
                        start_time = activity.get('start_time', '08:00')
                        hour = int(start_time.split(':')[0]) if ':' in str(start_time) else 8
                        is_rush_hour = hour in [7, 8, 17, 18, 19]
                        
                        # Tính thời gian và chi phí
                        transport_mode = activity.get('transport_mode', 'taxi')
                        travel_time = _calculate_travel_time(distance, transport_mode, is_rush_hour)
                        cost = _calculate_transport_cost(distance, transport_mode)
                        
                        # Cập nhật activity
                        activity['distance_km'] = round(distance, 2)
                        activity['travel_time_min'] = travel_time
                        activity['cost'] = cost
                        
                        # Cập nhật end_time dựa trên travel_time thực tế
                        start_minutes = int(start_time.split(':')[0]) * 60 + int(start_time.split(':')[1])
                        end_minutes = start_minutes + travel_time
                        end_hour = (end_minutes // 60) % 24
                        end_min = end_minutes % 60
                        activity['end_time'] = f"{end_hour:02d}:{end_min:02d}"
                        
                        # Map transport mode for display in debug output
                        transport_name_map = {
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
                            'subway': 'Tàu điện ngầm',
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
                        }
                        
                        # Get display name for debug output
                        transport_display_name = transport_name_map.get(transport_mode.lower(), transport_mode)
                        
                        print(f"   ✅ {prev_activity.get('place_name', 'Unknown')} → {next_activity.get('place_name', 'Unknown')}")
                        print(f"      Distance: {distance:.2f}km, Time: {travel_time}min, Mode: {transport_display_name} ({transport_mode}), Cost: ${cost}")
                    else:
                        # Fallback nếu không có tọa độ
                        _apply_fallback_distance_and_time(activity, user_prefs)
                        print(f"   ⚠️ No coordinates found, using fallback for transfer")
                else:
                    # Fallback nếu không có prev/next activity
                    _apply_fallback_distance_and_time(activity, user_prefs)
    
    return itinerary_data

def _apply_fallback_distance_and_time(activity: dict, user_prefs: dict = None):
    """Áp dụng khoảng cách và thời gian fallback khi không tìm được tọa độ"""
    transport_mode = activity.get('transport_mode', 'taxi')
    
    # Default distance based on transport mode
    if transport_mode == 'walk':
        distance = 1.0
    elif transport_mode == 'bike':
        distance = 3.0
    elif transport_mode in ['scooter', 'taxi']:
        distance = 5.0
    else:  # bus, metro
        distance = 8.0
    
    travel_time = _calculate_travel_time(distance, transport_mode, False)
    cost = _calculate_transport_cost(distance, transport_mode)
    
    activity['distance_km'] = distance
    activity['travel_time_min'] = travel_time
    activity['cost'] = cost

def get_gemini_travel_recommendations(user_input: UserTourInfo, destination_name: str = "Unknown", user_prefs: dict = None):
    """
    Sử dụng Gemini AI để tạo lịch trình du lịch
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Lấy thông tin về thành phố đích
        cursor.execute("SELECT name FROM cities WHERE city_id = %s", (user_input.destination_city_id,))
        city_result = cursor.fetchone()
        if city_result:
            destination_name = city_result['name']
        
        # Lấy danh sách activities, restaurants, hotels từ database với tọa độ để tính khoảng cách
        cursor.execute("""
            SELECT activity_id, name, price, rating, description, latitude, longitude
            FROM activities WHERE city_id = %s 
            ORDER BY rating DESC LIMIT 20
        """, (user_input.destination_city_id,))
        activities = cursor.fetchall()
        
        cursor.execute("""
            SELECT restaurant_id, name, price_avg, rating, description, latitude, longitude
            FROM restaurants WHERE city_id = %s 
            ORDER BY rating DESC LIMIT 15
        """, (user_input.destination_city_id,))
        restaurants = cursor.fetchall()
        
        cursor.execute("""
            SELECT hotel_id, name, price_per_night, rating, description, latitude, longitude
            FROM hotels WHERE city_id = %s 
            ORDER BY rating DESC LIMIT 10
        """, (user_input.destination_city_id,))
        hotels = cursor.fetchall()
        
        # Chuyển đổi dữ liệu và xử lý Decimal
        def convert_decimal(obj):
            if hasattr(obj, '_asdict'):  # Handle named tuples
                return obj._asdict()
            elif hasattr(obj, '__dict__'):
                return obj.__dict__
            elif isinstance(obj, list):
                return [convert_decimal(item) for item in obj]
            elif isinstance(obj, dict):
                return {key: convert_decimal(value) for key, value in obj.items()}
            else:
                try:
                    import decimal
                    if isinstance(obj, decimal.Decimal):
                        return float(obj)
                except:
                    pass
                return obj
        
        # Convert decimal values to float
        activities = convert_decimal(activities)
        restaurants = convert_decimal(restaurants)
        hotels = convert_decimal(hotels)
        
        # Chuyển đổi dữ liệu thành DataFrame để dễ xử lý
        activities_df = pd.DataFrame(activities) if activities else pd.DataFrame()
        restaurants_df = pd.DataFrame(restaurants) if restaurants else pd.DataFrame()
        hotels_df = pd.DataFrame(hotels) if hotels else pd.DataFrame()
        
        # Tạo travel_data tổng hợp
        travel_data = {
            "activities": activities_df.to_dict('records') if not activities_df.empty else [],
            "restaurants": restaurants_df.to_dict('records') if not restaurants_df.empty else [],
            "hotels": hotels_df.to_dict('records') if not hotels_df.empty else []
        }
        
        # Xử lý user preferences (nếu không có thì dùng mặc định)
        if user_prefs is None:
            user_prefs = {}
        
        # Chuẩn bị prompt cho Gemini
        duration = int(float(user_input.duration_days)) if user_input.duration_days else 3
        budget = float(user_input.target_budget) if user_input.target_budget else 1000.0
        guests = int(float(user_input.guest_count)) if user_input.guest_count else 1
        
        prompt = f"""
        You are an AI travel planner. Create a detailed itinerary based on the input data. Produce ONLY valid JSON (no comments, no prose).

        TRIP INPUT DATA:
        Destination: {destination_name}
        Duration: {duration} days
        Guests: {guests} people
        Budget: ${budget} USD (total for all guests)
        User ID: {user_input.user_id}
        Start City ID: {user_input.start_city_id}
        Destination City ID: {user_input.destination_city_id}
`
        AVAILABLE DATA:
        Activities ({len(travel_data['activities'])} available):
        {json.dumps(travel_data['activities'], ensure_ascii=False, indent=2)}
        
        Restaurants ({len(travel_data['restaurants'])} available):
        {json.dumps(travel_data['restaurants'], ensure_ascii=False, indent=2)}
        
        Hotels ({len(travel_data['hotels'])} available):
        {json.dumps(travel_data['hotels'], ensure_ascii=False, indent=2)}

        USER PREFERENCES:
         LIKED (prioritize these):
        - Activities: {json.dumps(user_prefs.get("liked_activities", []), ensure_ascii=False)}
        - Restaurants: {json.dumps(user_prefs.get("liked_restaurants", []), ensure_ascii=False)}
        - Hotels: {json.dumps(user_prefs.get("liked_hotels", []), ensure_ascii=False)}
        - Transport Modes: {json.dumps(user_prefs.get("liked_transport_modes", []), ensure_ascii=False)}
        
         DISLIKED (avoid these completely):
        - Activities: {json.dumps(user_prefs.get("disliked_activities", []), ensure_ascii=False)}
        - Restaurants: {json.dumps(user_prefs.get("disliked_restaurants", []), ensure_ascii=False)}
        - Hotels: {json.dumps(user_prefs.get("disliked_hotels", []), ensure_ascii=False)}
        - Transport Modes: {json.dumps(user_prefs.get("disliked_transport_modes", []), ensure_ascii=False)}

        BUDGET BREAKDOWN:
         Total Budget: ${budget} USD for {guests} guests for {duration} days
         Daily Budget: ${budget/duration:.2f} USD per day
         Per Person Budget: ${budget/guests:.2f} USD per person for entire trip
         Daily Per Person: ${budget/(duration*guests):.2f} USD per person per day

        PLANNING RULES & CONSTRAINTS:
        
        1) BUDGET CONSTRAINTS:
        - TOTAL budget is ${budget} USD for {guests} guests for {duration} days
        - Stay WITHIN budget - do not exceed ${budget/duration:.2f} USD per day
        - Consider cost per person: ${budget/guests:.2f} USD per person total
        - Hotels: Calculate cost as (price_per_night × nights × rooms_needed)
        - Activities/Restaurants: Calculate as (price × guests)
        - Transport: Calculate based on actual distance and mode
        
        2) GROUP SIZE CONSIDERATIONS:
        - Planning for {guests} people total
        - Hotel rooms needed: {max(1, (guests + 1) // 2)} rooms (assuming 2 people per room max)
        - Restaurant reservations: for {guests} people
        - Activity bookings: for {guests} people
        
        3) DURATION PLANNING:
        - Trip length: {duration} days
        - Plan activities for each day from day 1 to day {duration}
        - Each day should have 6-10 activities including meals, transfers, and rest
        - Balance busy and relaxed periods
        
        4) USER PREFERENCES PRIORITY:
        - MUST prioritize liked items: activities{user_prefs.get("liked_activities", [])}, restaurants{user_prefs.get("liked_restaurants", [])}, hotels{user_prefs.get("liked_hotels", [])}, transport{user_prefs.get("liked_transport_modes", [])}
        - MUST avoid disliked items: activities{user_prefs.get("disliked_activities", [])}, restaurants{user_prefs.get("disliked_restaurants", [])}, hotels{user_prefs.get("disliked_hotels", [])}, transport{user_prefs.get("disliked_transport_modes", [])}
        
        5) MEALS & REST:
        - Breakfast 07:00–08:30, Lunch 12:00–13:00, Dinner 18:30–19:30
        - At least one 15–30 min rest period per day
        - Respect restaurant opening hours if available
        
        6) LOCATION CONTEXT:
        - Destination: {destination_name} (City ID: {user_input.destination_city_id})
        - Use activities, restaurants, and hotels from the provided data
        - Consider local culture, weather, and typical tourist patterns
        
        7) TRANSPORT & MOVEMENT:
        - Transport mode selection rules (PRIORITY ORDER):
            1) FIRST: Check user preferences - ALWAYS use liked_transport_modes when possible
            2) NEVER use any transport modes in disliked_transport_modes  
            3) Default fallback: "Taxi" if no preferences specified
        - If user has liked_transport_modes{user_prefs.get("liked_transport_modes", [])}, use ONLY those modes for all transfers
        - If user has disliked_transport_modes{user_prefs.get("disliked_transport_modes", [])}, NEVER use those modes under any circumstances
        - Insert explicit "transfer" items between consecutive non-transfer activities
        - For transfer items, specify transport_mode but DO NOT calculate distance_km or travel_time_min (will be calculated later)
        - NEVER use null or unknown values - always specify concrete transport_mode
        - Use actual transport names from database (e.g., "GrabBike", "Metro", "Auto Rickshaw", "Taxi", "Bus", "Ojek", etc.)
        - Estimate reasonable time duration for transfer activities (10-25 minutes typically)

        8) COST CALCULATION RULES:
        - Activities/Restaurants: price_per_person × guests, or use price_total if available
        - Hotels: price_per_night × rooms_needed × nights (rooms_needed = ceil(guests / 2))
        - Transport: Will be calculated in post-processing based on real distance
        - Stay within the total budget of ${budget} USD for all {guests} guests
        - Track cumulative costs to avoid budget overrun

        9) SELECTION PRIORITY RULES:
        - HARD RULES: Completely exclude all disliked items (activities, restaurants, hotels, transport modes)
        - PREFERENCE RULES: Prioritize liked items when feasible within budget
        - FALLBACK RULES: If no preferences, select by: highest rating → lowest cost → best location
        - QUALITY CONTROL: Ensure variety in activities, avoid repeating same restaurants/activities
        - Min rating threshold: 3.5 (relax to 3.0 if limited options)
        - No duplicate places within the same day
        - If impossible to meet budget, still output plan with "within_budget": false and "reason"

        10) OUTPUT REQUIREMENTS:
        - Activities sorted by start_time for each day
        - Insert transfer between consecutive non-transfer items  
        - Each day should be realistic and achievable
        - Provide clear time allocations for all activities
        - Times in HH:MM (24h format)
        - No time overlaps between activities
        - Ensure logical flow and realistic timing

        REQUIRED OUTPUT FORMAT:
        ═══════════════════════════════════════════════════════════════════
        {{
        "destination": "{destination_name}",
        "guests": {guests},
        "duration_days": {duration},
        "within_budget": true,
        "total_cost": <number>,
        "cost_breakdown": {{
            "hotels": <number>,
            "activities": <number>,
            "meals": <number>,
            "transport_estimate": <number>
        }},
        "days": [
            {{
            "day": 1,
            "activities": [
                {{
                "start_time": "09:00",
                "end_time": "10:30",
                "type": "activity" | "meal" | "hotel" | "transfer",
                "place_id": "<id or null>",
                "place_name": "<string>",
                "description": "<string>",
                "transport_mode": "walk|bike|scooter|taxi|bus|metro",
                "distance_km": null,
                "travel_time_min": null,
                "cost": <number>
                }}
            ]
            }}
        ]
        }}

        Validation:
        - JSON only, valid and complete.
        - Insert exactly one transfer between consecutive non-transfer items.
        - Respect dislikes (exclude them) and prioritize likes if possible.
        - No overlaps in times.
        - DO NOT calculate distance_km or travel_time_min - these will be calculated after getting coordinates.
        
        Example transfer activities (distance and time will be calculated later):
        
        If liked_transport_modes = ["bike", "walk"]:
        {{
            "start_time": "10:00",
            "end_time": "10:20",
            "type": "transfer",
            "place_id": null,
            "place_name": "Di chuyển bằng xe đạp",
            "description": "Di chuyển bằng xe đạp đến địa điểm tiếp theo",
            "transport_mode": "bike",
            "distance_km": null,
            "travel_time_min": null,
            "cost": 0
        }}
        
        If disliked_transport_modes = ["taxi"]:
        {{
            "start_time": "14:00",
            "end_time": "14:25",
            "type": "transfer",
            "place_id": null,
            "place_name": "Di chuyển bằng xe buýt",
            "description": "Di chuyển bằng xe buýt (tránh taxi theo yêu cầu)",
            "transport_mode": "bus",
            "distance_km": null,
            "travel_time_min": null,
            "cost": 0
        }}
        
        CRITICAL RULES:
        - transport_mode must NEVER be null - always use actual transport names from database
        - ALWAYS prioritize liked_transport_modes over distance-based selection
        - NEVER use any mode in disliked_transport_modes under any circumstances
        - Set distance_km and travel_time_min to null (will be calculated in post-processing)
        - Estimate reasonable time duration for transfer activities (10-25 minutes typically)
        """     
        
        # Log transport preferences trước khi gửi prompt
        print(f"BEFORE calling Gemini - Transport preferences in prompt:")
        print(f"   Liked: {user_prefs.get('liked_transport_modes', [])}")
        print(f"   Disliked: {user_prefs.get('disliked_transport_modes', [])}")
        print(f"   Prompt size: {len(prompt)} characters")
        
        # Gọi Gemini API
        response = gemini_model.generate_content(prompt)
        result_text = response.text.strip()
        # Parse JSON response
        try:
            # Loại bỏ markdown formatting nếu có
            if result_text.startswith('```json'):
                result_text = result_text[7:]
            if result_text.endswith('```'):
                result_text = result_text[:-3]
            
            itinerary_data = json.loads(result_text)
            
            # Post-process để đảm bảo transport_mode tuân theo user preferences
            # First convert any transport IDs to transport mode names
            liked_modes = []
            for mode in user_prefs.get('liked_transport_modes', []):
                if mode.startswith('T0'):
                    try:
                        cursor.execute("SELECT type FROM transports WHERE transport_id = %s", (mode,))
                        transport_result = cursor.fetchone()
                        if transport_result:
                            liked_modes.append(transport_result['type'].lower())
                            print(f"      → Converted liked transport ID {mode} to: {transport_result['type'].lower()}")
                        else:
                            print(f"      → Transport ID {mode} not found in database")
                    except Exception as e:
                        print(f"      → Error converting liked transport ID {mode}: {e}")
                else:
                    liked_modes.append(mode.lower())
            
            disliked_modes = []
            for mode in user_prefs.get('disliked_transport_modes', []):
                if mode.startswith('T0'):
                    try:
                        cursor.execute("SELECT type FROM transports WHERE transport_id = %s", (mode,))
                        transport_result = cursor.fetchone()
                        if transport_result:
                            disliked_modes.append(transport_result['type'].lower())
                            print(f"      → Converted disliked transport ID {mode} to: {transport_result['type'].lower()}")
                        else:
                            print(f"      → Transport ID {mode} not found in database")
                    except Exception as e:
                        print(f"      → Error converting disliked transport ID {mode}: {e}")
                else:
                    disliked_modes.append(mode.lower())
            
            print(f"Processing transport preferences:")
            print(f"   Liked modes: {liked_modes}")
            print(f"   Disliked modes: {disliked_modes}")
            
            for day_idx, day in enumerate(itinerary_data.get('days', [])):
                for activity_idx, activity in enumerate(day.get('activities', [])):
                    if activity.get('type') == 'transfer':
                        current_mode = activity.get('transport_mode')
                        original_mode = current_mode
                        
                        print(f"   Day {day_idx+1}, Activity {activity_idx+1}: Original mode = {original_mode}")
                        
                        # RULE 1: Nếu có liked modes, PHẢI dùng liked modes (ưu tiên tuyệt đối)
                        if liked_modes:
                            # Chọn randomly từ liked modes để có variation
                            import random
                            activity['transport_mode'] = random.choice(liked_modes)
                            print(f"      → Using liked mode: {activity['transport_mode']}")
                        
                        # RULE 2: Nếu không có liked modes, kiểm tra disliked
                        elif current_mode in disliked_modes:
                            # Chọn default mode không bị dislike (Taxi làm fallback)
                            activity['transport_mode'] = 'Taxi'
                            print(f"      → Avoiding disliked {current_mode}, using: Taxi")
                        
                        # RULE 3: Nếu mode hiện tại là transport ID (T0XXX), convert sang transport mode name
                        elif current_mode and current_mode.startswith('T0'):
                            # Convert transport ID to transport mode name
                            try:
                                cursor.execute("SELECT type FROM transports WHERE transport_id = %s", (current_mode,))
                                transport_result = cursor.fetchone()
                                if transport_result:
                                    activity['transport_mode'] = transport_result['type'].lower()
                                    print(f"      → Converted transport ID {current_mode} to: {transport_result['type'].lower()}")
                                else:
                                    activity['transport_mode'] = 'taxi'  # Fallback if transport ID not found
                                    print(f"      → Transport ID {current_mode} not found, fallback to: taxi")
                            except Exception as e:
                                activity['transport_mode'] = 'taxi'  # Fallback on error
                                print(f"      → Error converting {current_mode}, fallback to: taxi")
                        
                        # RULE 4: Nếu mode hiện tại null/invalid
                        elif not current_mode or current_mode in [None, 'null', 'unknown']:
                            activity['transport_mode'] = 'taxi'  # Default fallback
                            print(f"      → Null/invalid mode, fallback to: taxi")
                        
                        else:
                            # Mode hiện tại OK, giữ nguyên
                            print(f"      → Keeping current mode: {current_mode}")
                        
                        # Đảm bảo có place_name cho transfer với tên đã được mapping
                        if not activity.get('place_name') or activity.get('place_name') == 'null':
                            transport_mode = activity.get('transport_mode', 'Taxi')
                            # Map transport mode to Vietnamese name
                            transport_name_map = {
                                'walk': 'đi bộ',
                                'bike': 'xe đạp', 
                                'bicycle': 'xe đạp',
                                'scooter': 'xe máy',
                                'motorcycle': 'xe máy',
                                'motorbike': 'xe máy',
                                'taxi': 'taxi',
                                'grab': 'Grab',
                                'uber': 'Uber',
                                'bus': 'xe buýt',
                                'metro': 'tàu điện',
                                'subway': 'tàu điện ngầm',
                                'train': 'tàu hóa',
                                'car': 'ô tô',
                                'ojek': 'Ojek',
                                'grabbike': 'GrabBike',
                                'rickshaw': 'xích lô',
                                'cyclo': 'xích lô',
                                'tricycle': 'xe ba bánh',
                                'ferry': 'phà',
                                'boat': 'thuyền',
                                'ship': 'tàu thủy'
                            }
                            
                            # Get mapped transport name
                            transport_display_name = transport_name_map.get(transport_mode.lower(), transport_mode)
                            activity['place_name'] = f"Di chuyển bằng {transport_display_name}"
            
            # TÍNH TOÁN KHOẢNG CÁCH VÀ THỜI GIAN THỰC TẾ
            itinerary_data = _process_distances_and_times(itinerary_data, cursor, user_prefs)
            
            # Chuyển đổi từ Gemini format về format chuẩn của API
            schedule = []
            for day_data in itinerary_data.get('days', []):
                schedule.append({
                    "day": day_data.get('day', 1),
                    "activities": day_data.get('activities', [])
                })
            
            # Return format chuẩn cho API
            return {
                "tour_id": f"gemini_{user_input.user_id}_{destination_name}_{duration}days",
                "user_id": user_input.user_id,
                "start_city": destination_name,  # Simplified for now
                "destination_city": destination_name,
                "duration_days": duration,
                "guest_count": guests,
                "budget": budget,
                "total_estimated_cost": itinerary_data.get('total_cost', 0.0),
                "schedule": schedule,
                "generated_by": "gemini_ai",
                "within_budget": itinerary_data.get('within_budget', True)
            }
            
        except json.JSONDecodeError as e:
            print(f"Error parsing Gemini response: {e}")
            print(f"Raw response: {result_text}")
            # Fallback: return standard API format with sample activities using user preferences
            fallback_schedule = []
            
            # Chọn transport mode cho fallback dựa trên user preferences
            fallback_transport = "taxi"
            fallback_cost = 8.0
            fallback_name = "Đi taxi đến điểm đầu tiên"
            
            liked_modes = user_prefs.get('liked_transport_modes', [])
            
            if liked_modes:
                # Convert transport IDs to transport mode names nếu cần
                preferred_mode = liked_modes[0]
                if preferred_mode.startswith('T0'):
                    try:
                        cursor.execute("SELECT type FROM transports WHERE transport_id = %s", (preferred_mode,))
                        transport_result = cursor.fetchone()
                        if transport_result:
                            fallback_transport = transport_result['type'].lower()
                        else:
                            fallback_transport = "taxi"
                    except:
                        fallback_transport = "taxi"
                else:
                    fallback_transport = preferred_mode.lower()
                    
                fallback_cost = _calculate_transport_cost(5.0, fallback_transport)  # Assume 5km for fallback
                fallback_name = f"Đi {fallback_transport} đến điểm đầu tiên"
            elif "taxi" in user_prefs.get('disliked_transport_modes', []):
                # Nếu không có liked modes nhưng Taxi bị dislike, dùng Bus
                fallback_transport = "bus"
                fallback_cost = _calculate_transport_cost(5.0, fallback_transport)
                fallback_name = f"Đi {fallback_transport} đến điểm đầu tiên"
            
            for day_num in range(1, duration + 1):
                fallback_schedule.append({
                    "day": day_num,
                    "activities": [
                        {
                            "start_time": "09:00",
                            "end_time": "09:30",
                            "type": "transfer",
                            "place_id": None,
                            "place_name": fallback_name,
                            "description": f"Di chuyển đến địa điểm đầu tiên trong ngày bằng {fallback_transport}",
                            "transport_mode": fallback_transport,
                            "distance_km": 5.0,
                            "travel_time_min": _calculate_travel_time(5.0, fallback_transport, False),
                            "cost": _calculate_transport_cost(5.0, fallback_transport)
                        }
                    ]
                })
            
            return {
                "tour_id": f"fallback_{user_input.user_id}_{destination_name}",
                "user_id": user_input.user_id,
                "start_city": destination_name,
                "destination_city": destination_name,
                "duration_days": duration,
                "guest_count": guests,
                "budget": budget,
                "total_estimated_cost": 0.0,
                "schedule": fallback_schedule,
                "generated_by": "gemini_ai_fallback",
                "error": "Failed to parse Gemini response"
            }
    
    except Exception as e:
        print(f"Error in get_gemini_travel_recommendations: {e}")
        # Error fallback với transport mode từ user preferences
        error_schedule = []
        
        # Chọn transport mode cho error case dựa trên user preferences
        error_transport = "taxi"
        error_name = "Đi taxi (lịch trình lỗi)"
        
        liked_modes = user_prefs.get('liked_transport_modes', [])
        
        if liked_modes:
            # Convert transport IDs to transport mode names nếu cần
            preferred_mode = liked_modes[0]
            if preferred_mode.startswith('T0'):
                try:
                    cursor.execute("SELECT type FROM transports WHERE transport_id = %s", (preferred_mode,))
                    transport_result = cursor.fetchone()
                    if transport_result:
                        error_transport = transport_result['type'].lower()
                    else:
                        error_transport = "taxi"
                except:
                    error_transport = "taxi"
            else:
                error_transport = preferred_mode.lower()
                
            error_name = f"Đi {error_transport} (lịch trình lỗi)"
        elif "taxi" in user_prefs.get('disliked_transport_modes', []):
            error_transport = "bus"
            error_name = f"Đi {error_transport} (lịch trình lỗi)"
        
        for day_num in range(1, duration + 1):
            error_schedule.append({
                "day": day_num,
                "activities": [
                    {
                        "start_time": "09:00",
                        "end_time": "09:30", 
                        "type": "transfer",
                        "place_id": None,
                        "place_name": error_name,
                        "description": f"Lịch trình tạm thời do lỗi hệ thống - sử dụng {error_transport}",
                        "transport_mode": error_transport,
                        "distance_km": 5.0,
                        "travel_time_min": _calculate_travel_time(5.0, error_transport, False),
                        "cost": _calculate_transport_cost(5.0, error_transport)
                    }
                ]
            })
        
        return {
            "tour_id": f"error_{user_input.user_id}_{destination_name}",
            "user_id": user_input.user_id,
            "start_city": destination_name,
            "destination_city": destination_name,
            "duration_days": duration,
            "guest_count": guests,
            "budget": budget,
            "total_estimated_cost": 0.0,
            "schedule": error_schedule,
            "generated_by": "gemini_ai_error",
            "error": f"Gemini AI error: {str(e)}"
        }
    finally:
        cursor.close()
        conn.close()


def build_final_tour_json_with_gemini(user_input: UserTourInfo):
    """
    Tạo lịch trình du lịch hoàn chỉnh sử dụng Gemini AI
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Lấy tên thành phố
        cursor.execute("SELECT city_id, name FROM cities WHERE city_id IN (%s, %s)", 
                       (user_input.start_city_id, user_input.destination_city_id))
        city_info = {row['city_id']: row['name'] for row in cursor.fetchall()}
        start_name = city_info.get(user_input.start_city_id, "Unknown")
        destination_name = city_info.get(user_input.destination_city_id, "Unknown")
        
        # Sử dụng Gemini để tạo lịch trình
        gemini_result = get_gemini_travel_recommendations(user_input, destination_name)
        
        if not gemini_result.get('days'):
            return {"error": "No suitable tour itinerary could be generated."}
        
        # Chuyển đổi format từ Gemini về format cũ để tương thích
        schedule = []
        for day_data in gemini_result.get('days', []):
            schedule.append({
                "day": day_data.get('day', 1),
                "activities": day_data.get('activities', [])
            })
        
        return {
            "tour_id": f"gemini_{user_input.user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "user_id": user_input.user_id,
            "start_city": start_name,
            "destination_city": destination_name,
            "duration_days": float(user_input.duration_days) if user_input.duration_days else 3.0,
            "guest_count": float(user_input.guest_count) if user_input.guest_count else 1.0,
            "budget": float(user_input.target_budget) if user_input.target_budget else 1000.0,
            "total_estimated_cost": gemini_result.get('total_cost', 0.0),
            "schedule": schedule,
            "generated_by": "gemini_ai"
        }
    except Exception as e:
        return {"error": f"An error occurred while building the tour with Gemini: {str(e)}"}
    finally:
        cursor.close()
        conn.close()


def build_final_tour_json(user_input: UserTourInfo):
    """
    Tạo lịch trình du lịch hoàn chỉnh - chỉ sử dụng Gemini AI
    """
    return build_final_tour_json_with_gemini(user_input)


def get_gemini_recommendation_simple(destination_city_id, guest_count=1, duration_days=3, target_budget=1000.0):
    """
    Hàm đơn giản để lấy recommendation từ Gemini mà không cần setup phức tạp
    """
    user_input = create_user_tour_info_simple(
        user_id=f"temp_user_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        start_city_id=destination_city_id,  # Giả sử bắt đầu từ cùng thành phố
        destination_city_id=destination_city_id,
        guest_count=guest_count,
        duration_days=duration_days,
        target_budget=target_budget
    )
    
    return build_final_tour_json_with_gemini(user_input)


def get_travel_recommendation_json_api(destination_city_id, guest_count=1, duration_days=3, target_budget=1000.0, user_id=None):
    """
    API endpoint cho web application - trả về JSON chuẩn
    
    Parameters:
    - destination_city_id: ID thành phố đích
    - guest_count: Số khách
    - duration_days: Số ngày
    - target_budget: Ngân sách
    - user_id: ID người dùng (optional)
    
    Returns:
    JSON response với format chuẩn cho web
    """
    try:
        # Validate inputs
        if destination_city_id is None:
            return {
                "success": False,
                "error": "destination_city_id is required",
                "data": None
            }
        
        # Tạo user input
        if user_id is None:
            user_id = f"web_user_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
        user_input = create_user_tour_info_simple(
            user_id=user_id,
            start_city_id=destination_city_id,
            destination_city_id=destination_city_id,
            guest_count=guest_count,
            duration_days=duration_days,
            target_budget=target_budget
        )
        
        # Tạo lịch trình
        result = build_final_tour_json_with_gemini(user_input)
        
        # Check for errors
        if "error" in result:
            return {
                "success": False,
                "error": result["error"],
                "data": None
            }
        
        # Format response cho web
        web_response = {
            "success": True,
            "error": None,
            "data": {
                "tour_info": {
                    "tour_id": result["tour_id"],
                    "user_id": result["user_id"],
                    "start_city": result["start_city"],
                    "destination_city": result["destination_city"],
                    "duration_days": int(result["duration_days"]),
                    "guest_count": int(result["guest_count"]),
                    "budget": float(result["budget"]),
                    "total_estimated_cost": float(result["total_estimated_cost"]),
                    "generated_by": result["generated_by"],
                    "created_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                },
                "itinerary": result["schedule"],
                "summary": {
                    "total_days": int(result["duration_days"]),
                    "total_activities": sum(len(day.get("activities", [])) for day in result["schedule"]),
                    "cost_per_person": float(result["total_estimated_cost"]) / int(result["guest_count"]) if int(result["guest_count"]) > 0 else 0,
                    "budget_utilized": (float(result["total_estimated_cost"]) / float(result["budget"]) * 100) if float(result["budget"]) > 0 else 0
                }
            }
        }
        
        return web_response
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Internal server error: {str(e)}",
            "data": None
        }


def get_travel_recommendation_by_city_name(city_name, guest_count=1, duration_days=3, target_budget=1000.0, user_id=None):
    """
    API endpoint sử dụng tên thành phố thay vì ID
    """
    try:
        # Tìm city_id từ tên thành phố
        city_id = get_city_id_by_name(city_name)
        
        if city_id is None:
            return {
                "success": False,
                "error": f"City '{city_name}' not found",
                "data": None
            }
        
        return get_travel_recommendation_json_api(
            destination_city_id=city_id,
            guest_count=guest_count,
            duration_days=duration_days,
            target_budget=target_budget,
            user_id=user_id
        )
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Error processing request: {str(e)}",
            "data": None
        }


# ---------- UTILITY FUNCTIONS ----------

def get_cities_list():
    """Lấy danh sách tất cả thành phố"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT city_id, name FROM cities ORDER BY name")
        cities = cursor.fetchall()
        return cities
    finally:
        cursor.close()
        conn.close()


def get_cities_list_json_api():
    """
    API endpoint để lấy danh sách thành phố cho web application
    Returns: JSON response với danh sách thành phố
    """
    try:
        cities = get_cities_list()
        
        return {
            "success": True,
            "error": None,
            "data": {
                "cities": cities,
                "total_count": len(cities)
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Error fetching cities: {str(e)}",
            "data": None
        }


def get_city_id_by_name(city_name):
    """Lấy city_id từ tên thành phố"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT city_id FROM cities WHERE name LIKE %s", (f"%{city_name}%",))
        result = cursor.fetchone()
        return result['city_id'] if result else None
    finally:
        cursor.close()
        conn.close()


def get_activities_by_city(city_id, limit=20):
    """Lấy danh sách hoạt động theo thành phố"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT activity_id, name, price, rating, description 
            FROM activities WHERE city_id = %s 
            ORDER BY rating DESC LIMIT %s
        """, (city_id, limit))
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def get_restaurants_by_city(city_id, limit=15):
    """Lấy danh sách nhà hàng theo thành phố"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT restaurant_id, name, price_avg, rating, description 
            FROM restaurants WHERE city_id = %s 
            ORDER BY rating DESC LIMIT %s
        """, (city_id, limit))
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def get_hotels_by_city(city_id, limit=10):
    """Lấy danh sách khách sạn theo thành phố"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT hotel_id, name, price_per_night, rating, description 
            FROM hotels WHERE city_id = %s 
            ORDER BY rating DESC LIMIT %s
        """, (city_id, limit))
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


# ---------- MAIN EXAMPLE ----------

def main_example():
    """Ví dụ sử dụng hệ thống recommendation Gemini"""
    print("🤖 Hệ thống Recommendation Du lịch với Gemini AI")
    print("=" * 60)
    
    try:
        # Lấy danh sách thành phố
        cities = get_cities_list()
        print("Danh sách thành phố có sẵn:")
        for city in cities[:5]:  # Hiển thị 5 thành phố đầu
            print(f"  - {city['name']} (ID: {city['city_id']})")
        
        # Ví dụ tạo lịch trình cho Hồ Chí Minh
        print(f"\n🏙️ Tạo lịch trình du lịch cho Hồ Chí Minh...")
        
        result = get_gemini_recommendation_simple(
            destination_city_id=1,  # HCM City
            guest_count=2,
            duration_days=3,
            target_budget=500.0
        )
        print(result)
        if 'error' in result:
            print(f"❌ Lỗi: {result['error']}")
        else:
            print(f"✅ Tạo lịch trình thành công!")
            print(f"   - Tour ID: {result['tour_id']}")
            print(f"   - Thành phố: {result['destination_city']}")
            print(f"   - Tổng chi phí: ${result['total_estimated_cost']}")
            print(f"   - Số ngày: {result['duration_days']}")
            print(f"   - Số hoạt động: {len(result['schedule'])}")
    
    except Exception as e:
        print(f"❌ Lỗi: {e}")


if __name__ == "__main__":
    main_example()