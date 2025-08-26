import math
import json
import random
import pandas as pd
import numpy as np
from collections import Counter, defaultdict
from sklearn.linear_model import LinearRegression
from sklearn.feature_extraction import DictVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from datetime import datetime, timedelta
import mysql.connector


def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="", 
        database="smart_travel"
    )

# Giả định class UserTourInfo
class UserTourInfo:
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




def percentage_shared(list1, list2):
    if not list1:
        return 0.0  # Avoid division by zero
    shared_count = sum(1 for item in list1 if item in list2)
    percentage = (shared_count / len(list1))
    return percentage

def get_user_similarity(user_input: UserTourInfo, other_input: UserTourInfo):
    if user_input.destination_city_id != other_input.destination_city_id:
        return -math.inf
    if user_input.user_id == other_input.user_id:
        return -math.inf
    shared_hotels = percentage_shared(user_input.hotel_ids, other_input.hotel_ids)
    shared_activities = percentage_shared(user_input.activity_ids, other_input.activity_ids)
    shared_restaurants = percentage_shared(user_input.restaurant_ids, other_input.restaurant_ids)
    shared_transports = percentage_shared(user_input.transport_ids, other_input.transport_ids)
    user_normalized_budget = user_input.target_budget / (user_input.guest_count * user_input.duration_days)
    other_normalized_budget = other_input.target_budget / (other_input.guest_count * other_input.duration_days)
    shared_budget = math.fabs((user_normalized_budget - other_normalized_budget) / (user_normalized_budget + other_normalized_budget + 1e-9))
    return shared_budget + shared_hotels + shared_activities + shared_transports + shared_restaurants

def get_top_k_similar_users(user_input: UserTourInfo, K=5):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT 
                t.user_id, 
                t.start_city_id, 
                t.destination_city_id, 
                t.guest_count, 
                t.duration_days, 
                t.target_budget,
                GROUP_CONCAT(DISTINCT ta.activity_id) as activity_ids,
                GROUP_CONCAT(DISTINCT th.hotel_id) as hotel_ids,
                GROUP_CONCAT(DISTINCT tr.restaurant_id) as restaurant_ids,
                GROUP_CONCAT(DISTINCT tt.transport_id) as transport_ids
            FROM tour_options t
            LEFT JOIN tour_options_activities ta ON t.option_id = ta.option_id
            LEFT JOIN tour_options_hotels th ON t.option_id = th.option_id
            LEFT JOIN tour_options_restaurants tr ON t.option_id = tr.option_id
            LEFT JOIN tour_options_transports tt ON t.option_id = tt.option_id
            WHERE t.destination_city_id = %s AND t.user_id != %s
            GROUP BY t.user_id, t.start_city_id, t.destination_city_id, t.guest_count, t.duration_days, t.target_budget
        """
        cursor.execute(query, (user_input.destination_city_id, user_input.user_id or ''))
        all_tour_options = cursor.fetchall()
        similarities = []
        for option in all_tour_options:
            option['activity_ids'] = option['activity_ids'].split(',') if option['activity_ids'] else []
            option['hotel_ids'] = option['hotel_ids'].split(',') if option['hotel_ids'] else []
            option['restaurant_ids'] = option['restaurant_ids'].split(',') if option['restaurant_ids'] else []
            option['transport_ids'] = option['transport_ids'].split(',') if option['transport_ids'] else []
            other_user = UserTourInfo(option)
            score = get_user_similarity(user_input, other_user)
            if score != -math.inf:
                similarities.append((other_user.user_id, score))
        top_k = sorted(similarities, key=lambda x: x[1], reverse=True)[:K]
        return top_k
    finally:
        cursor.close()
        conn.close()



def recommend_existing(user_input: UserTourInfo, top_n=1):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Lấy tất cả tour options của người dùng
        cursor.execute("""
            SELECT 
                t.option_id, 
                t.user_id, 
                t.start_city_id, 
                t.destination_city_id, 
                t.guest_count, 
                t.duration_days, 
                t.target_budget,
                t.rating,
                GROUP_CONCAT(DISTINCT ta.activity_id) as activity_ids,
                GROUP_CONCAT(DISTINCT th.hotel_id) as hotel_ids,
                GROUP_CONCAT(DISTINCT tr.restaurant_id) as restaurant_ids,
                GROUP_CONCAT(DISTINCT tt.transport_id) as transport_ids
            FROM tour_options t
            LEFT JOIN tour_options_activities ta ON t.option_id = ta.option_id
            LEFT JOIN tour_options_hotels th ON t.option_id = th.option_id
            LEFT JOIN tour_options_restaurants tr ON t.option_id = tr.option_id
            LEFT JOIN tour_options_transports tt ON t.option_id = tt.option_id
            WHERE t.user_id = %s
            GROUP BY t.option_id, t.user_id, t.start_city_id, t.destination_city_id, 
                     t.guest_count, t.duration_days, t.target_budget, t.rating
        """, (user_input.user_id or '',))
        all_opts = cursor.fetchall()
        
        if not all_opts:
            print("No tour options found for user_id:", user_input.user_id)
            return pd.DataFrame()
        
        # Chuyển đổi decimal.Decimal sang float và xử lý danh sách
        for opt in all_opts:
            opt['guest_count'] = float(opt['guest_count']) if opt['guest_count'] is not None else 1.0
            opt['duration_days'] = float(opt['duration_days']) if opt['duration_days'] is not None else 3.0
            opt['target_budget'] = float(opt['target_budget']) if opt['target_budget'] is not None else 1000.0
            opt['rating'] = float(opt['rating']) if opt['rating'] is not None else 0.0
            opt['activity_ids'] = opt['activity_ids'].split(',') if opt['activity_ids'] else []
            opt['hotel_ids'] = opt['hotel_ids'].split(',') if opt['hotel_ids'] else []
            opt['restaurant_ids'] = opt['restaurant_ids'].split(',') if opt['restaurant_ids'] else []
            opt['transport_ids'] = opt['transport_ids'].split(',') if opt['transport_ids'] else []
        
        # Tạo DataFrame
        df = pd.DataFrame(all_opts)
        
        # Tính điểm tương đồng dựa trên destination_city_id và normalized budget
        if not df.empty:
            # Chuyển đổi cột sang float để tính toán
            for col in ['guest_count', 'duration_days', 'target_budget']:
                df[col] = pd.to_numeric(df[col], errors='coerce', downcast='float').fillna(1.0)
            
            # Tính normalized budget
            df['norm'] = df['target_budget'] / (df['guest_count'] * df['duration_days'])
            u_norm = float(user_input.target_budget or 1000.0) / (float(user_input.guest_count or 1.0) * float(user_input.duration_days or 3.0))
            
            # Tính độ tương đồng ngân sách
            df['budget_sim'] = 1 - (df['norm'] - u_norm).abs() / (df['norm'] + u_norm + 1e-9)
            
            # Lọc theo destination_city_id
            df = df[df['destination_city_id'] == user_input.destination_city_id]
            
            # Tính điểm cuối cùng (kết hợp budget_sim và rating)
            df['score'] = 0.5 * df['budget_sim'] + 0.5 * (df['rating'].fillna(0) / 10)
            
            # Sắp xếp và lấy top_n
            df = df.sort_values('score', ascending=False).drop_duplicates('option_id')
            return df.head(top_n)
        
        return pd.DataFrame()
    finally:
        cursor.close()
        conn.close()


def impute_all_fields(user_input: UserTourInfo, topk_users: list):
    df = pd.DataFrame(topk_users)
    for field in ['guest_count', 'duration_days', 'target_budget']:
        if getattr(user_input, field) is None:
            mean_value = df[field].mean() if not df[field].isna().all() else 1
            setattr(user_input, field, mean_value)
    for field in ['start_city_id', 'destination_city_id']:
        if getattr(user_input, field) is None:
            mode_value = df[field].mode()[0] if not df[field].isna().all() else None
            setattr(user_input, field, mode_value)
    for field in ['hotel_ids', 'activity_ids', 'restaurant_ids', 'transport_ids']:
        lst = getattr(user_input, field)
        if not lst:
            all_ids = sum(df[field].dropna().tolist(), [])
            top3 = [i for i, _ in Counter(all_ids).most_common(3)]
            setattr(user_input, field, top3)
    return user_input

def impute_budget(user_input: UserTourInfo, topk_users: list):
    df = pd.DataFrame(topk_users)
    X = df[['duration_days', 'guest_count']].dropna()
    y = df.loc[X.index, 'target_budget']
    if not X.empty and not y.empty:
        reg = LinearRegression().fit(X, y)
        user_input.target_budget = reg.predict([[user_input.duration_days, user_input.guest_count]])[0]
    else:
        user_input.target_budget = 1000  # Giá trị mặc định
    return user_input



def recommend_cold_start(user_input: UserTourInfo, K=5, top_n=1):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Lấy tất cả tour options
        cursor.execute("""
            SELECT 
                t.option_id, 
                t.user_id, 
                t.start_city_id, 
                t.destination_city_id, 
                t.guest_count, 
                t.duration_days, 
                t.target_budget,
                t.rating,
                GROUP_CONCAT(DISTINCT ta.activity_id) as activity_ids,
                GROUP_CONCAT(DISTINCT th.hotel_id) as hotel_ids,
                GROUP_CONCAT(DISTINCT tr.restaurant_id) as restaurant_ids,
                GROUP_CONCAT(DISTINCT tt.transport_id) as transport_ids
            FROM tour_options t
            LEFT JOIN tour_options_activities ta ON t.option_id = ta.option_id
            LEFT JOIN tour_options_hotels th ON t.option_id = th.option_id
            LEFT JOIN tour_options_restaurants tr ON t.option_id = tr.option_id
            LEFT JOIN tour_options_transports tt ON t.option_id = tt.option_id
            GROUP BY t.option_id, t.user_id, t.start_city_id, t.destination_city_id, t.guest_count, t.duration_days, t.target_budget, t.rating
        """)
        all_opts = cursor.fetchall()
        
        # Chuyển đổi decimal.Decimal sang float
        for opt in all_opts:
            opt['activity_ids'] = opt['activity_ids'].split(',') if opt['activity_ids'] else []
            opt['hotel_ids'] = opt['hotel_ids'].split(',') if opt['hotel_ids'] else []
            opt['restaurant_ids'] = opt['restaurant_ids'].split(',') if opt['restaurant_ids'] else []
            opt['transport_ids'] = opt['transport_ids'].split(',') if opt['transport_ids'] else []
            opt['guest_count'] = float(opt['guest_count']) if opt['guest_count'] is not None else None
            opt['duration_days'] = float(opt['duration_days']) if opt['duration_days'] is not None else None
            opt['target_budget'] = float(opt['target_budget']) if opt['target_budget'] is not None else None
            opt['rating'] = float(opt['rating']) if opt['rating'] is not None else None
        
        # Điền các trường bị thiếu
        user_input = impute_all_fields(user_input, all_opts)
        
        if user_input.target_budget is None:
            user_input = impute_budget(user_input, all_opts)

        # Lấy top K người dùng tương tự
        top_users = get_top_k_similar_users(user_input, K)
        top_user_ids = [user_id for user_id, _ in top_users]
        
        if not top_user_ids:
            print("No similar users found, using fallback method...")
            # Lấy top_n option ngẫu nhiên có cùng destination_city_id
            cursor.execute("""
                SELECT 
                    t.option_id, 
                    t.user_id, 
                    t.start_city_id, 
                    t.destination_city_id, 
                    t.guest_count, 
                    t.duration_days, 
                    t.target_budget,
                    t.rating
                FROM tour_options t
                WHERE t.destination_city_id = %s
                LIMIT %s
            """, (user_input.destination_city_id, top_n))
            random_opts = cursor.fetchall()
            
            if not random_opts:
                cursor.execute("""
                    SELECT 
                        t.option_id, 
                        t.user_id, 
                        t.start_city_id, 
                        t.destination_city_id, 
                        t.guest_count, 
                        t.duration_days, 
                        t.target_budget,
                        t.rating
                    FROM tour_options t
                    LIMIT %s
                """, (top_n,))
                random_opts = cursor.fetchall()
            
            # Chuyển đổi decimal.Decimal sang float
            for opt in random_opts:
                opt['guest_count'] = float(opt['guest_count']) if opt['guest_count'] is not None else None
                opt['duration_days'] = float(opt['duration_days']) if opt['duration_days'] is not None else None
                opt['target_budget'] = float(opt['target_budget']) if opt['target_budget'] is not None else None
                opt['rating'] = float(opt['rating']) if opt['rating'] is not None else None
            
            df = pd.DataFrame(random_opts)
            # Xử lý trường hợp DataFrame rỗng
            if df.empty:
                print("No options found in fallback method.")
                df['score'] = 0.0
                return df.head(top_n)
            # Thêm cột score
            for col in ['guest_count', 'duration_days', 'target_budget']:
                df[col] = pd.to_numeric(df[col], errors='coerce', downcast='float').fillna(1.0)
            df['norm'] = df['target_budget'] / (df['guest_count'] * df['duration_days'])
            u_norm = user_input.target_budget / (user_input.guest_count * user_input.duration_days)
            df['budget_sim'] = 1 - (df['norm'] - u_norm).abs() / (df['norm'] + u_norm + 1e-9)
            df['score'] = df['budget_sim'] if 'rating' not in df.columns else (0.5 * df['budget_sim'] + 0.5 * (df['rating'].fillna(0) / 10))
            return df.head(top_n)
        
        # Lấy options từ top K người dùng tương tự
        query = """
            SELECT 
                t.option_id, 
                t.user_id, 
                t.start_city_id, 
                t.destination_city_id, 
                t.guest_count, 
                t.duration_days, 
                t.target_budget,
                t.rating
            FROM tour_options t
            WHERE t.user_id IN (%s)
        """ % ','.join(['%s'] * len(top_user_ids))
        cursor.execute(query, tuple(top_user_ids))
        topk_opts = cursor.fetchall()
        
        # Chuyển đổi decimal.Decimal sang float
        for opt in topk_opts:
            opt['guest_count'] = float(opt['guest_count']) if opt['guest_count'] is not None else None
            opt['duration_days'] = float(opt['duration_days']) if opt['duration_days'] is not None else None
            opt['target_budget'] = float(opt['target_budget']) if opt['target_budget'] is not None else None
            opt['rating'] = float(opt['rating']) if opt['rating'] is not None else None
        
        if not topk_opts:
            print("No suitable options found, using fallback method...")
            cursor.execute("""
                SELECT 
                    t.option_id, 
                    t.user_id, 
                    t.start_city_id, 
                    t.destination_city_id, 
                    t.guest_count, 
                    t.duration_days, 
                    t.target_budget,
                    t.rating
                FROM tour_options t
                LIMIT %s
            """, (top_n,))
            default_opts = cursor.fetchall()
            for opt in default_opts:
                opt['guest_count'] = float(opt['guest_count']) if opt['guest_count'] is not None else None
                opt['duration_days'] = float(opt['duration_days']) if opt['duration_days'] is not None else None
                opt['target_budget'] = float(opt['target_budget']) if opt['target_budget'] is not None else None
                opt['rating'] = float(opt['rating']) if opt['rating'] is not None else None
            df = pd.DataFrame(default_opts)
            if df.empty:
                print("No options found in fallback method.")
                df['score'] = 0.0
                return df.head(top_n)
            for col in ['guest_count', 'duration_days', 'target_budget']:
                df[col] = pd.to_numeric(df[col], errors='coerce', downcast='float').fillna(1.0)
            df['norm'] = df['target_budget'] / (df['guest_count'] * df['duration_days'])
            u_norm = user_input.target_budget / (user_input.guest_count * user_input.duration_days)
            df['budget_sim'] = 1 - (df['norm'] - u_norm).abs() / (df['norm'] + u_norm + 1e-9)
            df['score'] = df['budget_sim'] if 'rating' not in df.columns else (0.5 * df['budget_sim'] + 0.5 * (df['rating'].fillna(0) / 10))
            return df.head(top_n)
        
        # Tạo DataFrame và kiểm tra các cột cần thiết
        df = pd.DataFrame(topk_opts)
        required_cols = ['guest_count', 'duration_days', 'target_budget']
        
        for col in required_cols:
            if col not in df.columns:
                if col == 'guest_count':
                    df[col] = user_input.guest_count
                elif col == 'duration_days':
                    df[col] = user_input.duration_days
                elif col == 'target_budget':
                    df[col] = user_input.target_budget
        
        # Chuyển đổi sang float và xử lý giá trị NaN
        for col in required_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce', downcast='float')
            if df[col].isna().any():
                df[col].fillna(df[col].mean() if len(df[col].dropna()) > 0 else 1.0, inplace=True)
        
        # Tính giá trị chuẩn hóa
        df['norm'] = df['target_budget'] / (df['guest_count'] * df['duration_days'])
        u_norm = user_input.target_budget / (user_input.guest_count * user_input.duration_days)
        
        # Tính độ tương đồng ngân sách
        df['budget_sim'] = 1 - (df['norm'] - u_norm).abs() / (df['norm'] + u_norm + 1e-9)
        
        # Tính điểm cuối cùng
        df['score'] = df['budget_sim'] if 'rating' not in df.columns else (0.5 * df['budget_sim'] + 0.5 * (df['rating'].fillna(0) / 10))
        
        # Lọc theo destination_city_id
        df = df[df['destination_city_id'] == user_input.destination_city_id]
        
        # Xử lý trường hợp DataFrame rỗng sau khi lọc
        if df.empty:
            print("Không có kết quả nào sau khi lọc, sử dụng tất cả các lựa chọn...")
            df = pd.DataFrame(topk_opts)
            for col in ['guest_count', 'duration_days', 'target_budget']:
                df[col] = pd.to_numeric(df[col], errors='coerce', downcast='float').fillna(1.0)
            df['norm'] = df['target_budget'] / (df['guest_count'] * df['duration_days'])
            df['budget_sim'] = 1 - (df['norm'] - u_norm).abs() / (df['norm'] + u_norm + 1e-9)
            df['score'] = df['budget_sim'] if 'rating' not in df.columns else (0.5 * df['budget_sim'] + 0.5 * (df['rating'].fillna(0) / 10))
        
        df = df.sort_values('score', ascending=False).drop_duplicates('option_id')
        return df.head(top_n)
    finally:
        cursor.close()
        conn.close()



# Danh sách time_slots (giữ nguyên)
time_slots = [
    {"start_time": "08:00:00", "end_time": "09:30:00", "type": "activity"},
    {"start_time": "09:30:00", "end_time": "11:00:00", "type": "activity"},
    {"start_time": "11:00:00", "end_time": "12:00:00", "type": "hotel"},
    {"start_time": "12:00:00", "end_time": "14:00:00", "type": "restaurant"},
    {"start_time": "14:00:00", "end_time": "15:00:00", "type": "activity"},
    {"start_time": "15:00:00", "end_time": "16:30:00", "type": "activity"},
    {"start_time": "16:30:00", "end_time": "18:00:00", "type": "hotel"},
    {"start_time": "18:00:00", "end_time": "20:00:00", "type": "restaurant"},
    {"start_time": "20:00:00", "end_time": "23:00:00", "type": "hotel"}
]

def select_places_for_users(user_input: UserTourInfo):
    '''
    Select activity, restaurant, hotel which are:
    - High rating priority
    - If total cost is over budget, then select the cheapest
    '''
    city = user_input.destination_city_id
    duration = float(user_input.duration_days) if user_input.duration_days is not None else 3.0
    budget = float(user_input.target_budget) if user_input.target_budget is not None else 1000.0
    daily_budget = budget / duration
    
    # Kết nối MySQL
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Lấy danh sách activities, restaurants, hotels từ MySQL
        cursor.execute("SELECT activity_id, name, city_id, price, rating, duration_hours FROM activities WHERE city_id = %s", (city,))
        act_all = cursor.fetchall()
        cursor.execute("SELECT restaurant_id, name, city_id, price_avg, rating FROM restaurants WHERE city_id = %s", (city,))
        rest_all = cursor.fetchall()
        cursor.execute("SELECT hotel_id, name, city_id, price_per_night, rating FROM hotels WHERE city_id = %s", (city,))
        hotel_all = cursor.fetchall()
        
        # Chuyển đổi decimal.Decimal sang float
        for item in act_all:
            item['price'] = float(item['price']) if item['price'] is not None else 0.0
            item['rating'] = float(item['rating']) if item['rating'] is not None else 0.0
            item['duration_hours'] = float(item['duration_hours']) if item['duration_hours'] is not None else 2.0
        for item in rest_all:
            item['price_avg'] = float(item['price_avg']) if item['price_avg'] is not None else 0.0
            item['rating'] = float(item['rating']) if item['rating'] is not None else 0.0
        for item in hotel_all:
            item['price_per_night'] = float(item['price_per_night']) if item['price_per_night'] is not None else 0.0
            item['rating'] = float(item['rating']) if item['rating'] is not None else 0.0
    
        # Số lượng places cần thiết mỗi ngày
        num_activities_per_day = sum(1 for s in time_slots if s['type'] == 'activity')
        num_restaurants_per_day = sum(1 for s in time_slots if s['type'] == 'restaurant')
        
        # Số lượng places cần thiết cho toàn bộ tour
        total_activities_needed = int(num_activities_per_day * duration)
        total_restaurants_needed = int(num_restaurants_per_day * duration)
        
        # Tối đa số lượng places khác nhau
        unique_activities_count = min(len(act_all), total_activities_needed)
        unique_restaurants_count = min(len(rest_all), total_restaurants_needed)
        
        # Helper: pick k items within budget
        def pick_with_budget(candidates, ids, key_id, cost_key, k):
            """
            Pick k items from the list that fit within the budget.
            If not enough items fit, return the cheapest k items.
            """
            # 1. Lọc theo user ids
            sel = [c for c in candidates if c[key_id] in ids]
            if not sel:
                sel = candidates[:]  # Fallback: chọn tất cả nếu không có sở thích
            
            # 2. Sắp xếp theo rating giảm dần
            sel_sorted = sorted(sel, key=lambda x: x.get('rating', 0), reverse=True)
            
            # 3. Chọn tham lam top k, kiểm tra chi phí
            picked = []
            total_cost = 0.0
            for item in sel_sorted:
                c = item.get(cost_key, 0.0)
                # Trọng số dựa trên loại chi phí: activities: 40%, restaurants: 30%, hotels: 30%
                weight = {'price': 0.4, 'price_avg': 0.3, 'price_per_night': 0.3}[cost_key]
                if total_cost + c <= daily_budget * weight or len(picked) < 1:
                    picked.append(item)
                    total_cost += c
                if len(picked) == k:
                    break
            
            # 4. Nếu không đủ items, chọn các items rẻ nhất còn lại
            if len(picked) < k:
                remaining = [c for c in sel_sorted if c not in picked]
                cheap_first = sorted(remaining, key=lambda x: x.get(cost_key, 0))
                picked += cheap_first[:(k - len(picked))]
            
            return picked
        
        # Chọn places cho toàn bộ tour
        sel_activities = pick_with_budget(act_all, user_input.activity_ids, 'activity_id', 'price', unique_activities_count)
        sel_restaurants = pick_with_budget(rest_all, user_input.restaurant_ids, 'restaurant_id', 'price_avg', unique_restaurants_count) 
        sel_hotels = pick_with_budget(hotel_all, user_input.hotel_ids, 'hotel_id', 'price_per_night', 1)
        return sel_activities, sel_restaurants, sel_hotels   
    finally:
        cursor.close()
        conn.close()


def build_final_tour_json(user_input: UserTourInfo, mode='auto'):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT COUNT(*) as count FROM tour_options WHERE user_id = %s", (user_input.user_id or '',))
        exist_count = cursor.fetchone()['count']
        use_existing = (mode == 'existing') or (mode == 'auto' and exist_count > 1)
        
        if use_existing:
            recommend_df = recommend_existing(user_input, top_n=1)
        else:
            recommend_df = recommend_cold_start(user_input, K=5, top_n=1)
        
        if recommend_df.empty:
            return {"error": "No suitable tour options found."}
            
        chosen_id = recommend_df.iloc[0]['option_id']
        
        cursor.execute("""
            SELECT 
                t.option_id, t.user_id, t.start_city_id, t.destination_city_id, 
                t.guest_count, t.duration_days, t.target_budget,
                GROUP_CONCAT(DISTINCT th.hotel_id) as hotel_ids,
                GROUP_CONCAT(DISTINCT ta.activity_id) as activity_ids,
                GROUP_CONCAT(DISTINCT tr.restaurant_id) as restaurant_ids,
                GROUP_CONCAT(DISTINCT tt.transport_id) as transport_ids
            FROM tour_options t
            LEFT JOIN tour_options_hotels th ON t.option_id = th.option_id
            LEFT JOIN tour_options_activities ta ON t.option_id = ta.option_id
            LEFT JOIN tour_options_restaurants tr ON t.option_id = tr.option_id
            LEFT JOIN tour_options_transports tt ON t.option_id = tt.option_id
            WHERE t.option_id = %s
            GROUP BY t.option_id, t.user_id, t.start_city_id, t.destination_city_id, 
                     t.guest_count, t.duration_days, t.target_budget
        """, (chosen_id,))
        opt = cursor.fetchone()
        
        if not opt:
            return {"error": f"No tour option found for option_id: {chosen_id}"}
        
        opt['guest_count'] = float(opt['guest_count']) if opt['guest_count'] is not None else 1.0
        opt['duration_days'] = float(opt['duration_days']) if opt['duration_days'] is not None else 3.0
        opt['target_budget'] = float(opt['target_budget']) if opt['target_budget'] is not None else 1000.0
        opt['hotel_ids'] = opt['hotel_ids'].split(',') if opt['hotel_ids'] else []
        opt['activity_ids'] = opt['activity_ids'].split(',') if opt['activity_ids'] else []
        opt['restaurant_ids'] = opt['restaurant_ids'].split(',') if opt['restaurant_ids'] else []
        opt['transport_ids'] = opt['transport_ids'].split(',') if opt['transport_ids'] else []
        
        user = UserTourInfo(opt)
        sel_activities, sel_restaurants, sel_hotels = select_places_for_users(user)
        schedule = generate_tour_schedule(user, sel_activities, sel_restaurants, sel_hotels)
        
        cursor.execute("SELECT city_id, name FROM cities WHERE city_id IN (%s, %s)", 
                       (user.start_city_id, user.destination_city_id))
        city_info = {row['city_id']: row['name'] for row in cursor.fetchall()}
        start_name = city_info.get(user.start_city_id, "Unknown")
        destination_name = city_info.get(user.destination_city_id, "Unknown")
        
        total_cost = 0.0
        for day in schedule:
            for item in day['activities']:
                total_cost += float(item['cost'])
        
        return {
            "tour_id": opt['option_id'],
            "user_id": opt['user_id'],
            "start_city": start_name,
            "destination_city": destination_name,
            "duration_days": opt['duration_days'],
            "guest_count": opt['guest_count'],
            "budget": opt['target_budget'],
            "total_estimated_cost": total_cost,
            "schedule": schedule
        }
    except Exception as e:
        return {"error": f"An error occurred while building the tour: {str(e)}"}
    finally:
        cursor.close()
        conn.close()


def select_places_for_users(user_input: UserTourInfo):
    '''
    Select activity, restaurant, hotel which are:
    - High rating priority
    - If total cost is over budget, then select the cheapest
    '''
    city = user_input.destination_city_id
    duration = float(user_input.duration_days) if user_input.duration_days is not None else 3.0
    budget = float(user_input.target_budget) if user_input.target_budget is not None else 1000.0
    daily_budget = budget / duration
    
    # Kết nối MySQL
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Lấy danh sách activities, restaurants, hotels từ MySQL (loại bỏ duration_hours)
        cursor.execute("SELECT activity_id, name, city_id, price, rating FROM activities WHERE city_id = %s", (city,))
        act_all = cursor.fetchall()
        cursor.execute("SELECT restaurant_id, name, city_id, price_avg, rating FROM restaurants WHERE city_id = %s", (city,))
        rest_all = cursor.fetchall()
        cursor.execute("SELECT hotel_id, name, city_id, price_per_night, rating FROM hotels WHERE city_id = %s", (city,))
        hotel_all = cursor.fetchall()
        
        # Chuyển đổi decimal.Decimal sang float
        for item in act_all:
            item['price'] = float(item['price']) if item['price'] is not None else 0.0
            item['rating'] = float(item['rating']) if item['rating'] is not None else 0.0
        for item in rest_all:
            item['price_avg'] = float(item['price_avg']) if item['price_avg'] is not None else 0.0
            item['rating'] = float(item['rating']) if item['rating'] is not None else 0.0
        for item in hotel_all:
            item['price_per_night'] = float(item['price_per_night']) if item['price_per_night'] is not None else 0.0
            item['rating'] = float(item['rating']) if item['rating'] is not None else 0.0
    
        # Số lượng places cần thiết mỗi ngày
        num_activities_per_day = sum(1 for s in time_slots if s['type'] == 'activity')
        num_restaurants_per_day = sum(1 for s in time_slots if s['type'] == 'restaurant')
        
        # Số lượng places cần thiết cho toàn bộ tour
        total_activities_needed = int(num_activities_per_day * duration)
        total_restaurants_needed = int(num_restaurants_per_day * duration)
        
        # Tối đa số lượng places khác nhau
        unique_activities_count = min(len(act_all), total_activities_needed)
        unique_restaurants_count = min(len(rest_all), total_restaurants_needed)
        
        # Helper: pick k items within budget
        def pick_with_budget(candidates, ids, key_id, cost_key, k):
            """
            Pick k items from the list that fit within the budget.
            If not enough items fit, return the cheapest k items.
            """
            sel = [c for c in candidates if c[key_id] in ids]
            if not sel:
                sel = candidates[:]  # Fallback: chọn tất cả nếu không có sở thích
            
            sel_sorted = sorted(sel, key=lambda x: x.get('rating', 0), reverse=True)
            
            picked = []
            total_cost = 0.0
            for item in sel_sorted:
                c = item.get(cost_key, 0.0)
                weight = {'price': 0.4, 'price_avg': 0.3, 'price_per_night': 0.3}[cost_key]
                if total_cost + c <= daily_budget * weight or len(picked) < 1:
                    picked.append(item)
                    total_cost += c
                if len(picked) == k:
                    break
            
            if len(picked) < k:
                remaining = [c for c in sel_sorted if c not in picked]
                cheap_first = sorted(remaining, key=lambda x: x.get(cost_key, 0))
                picked += cheap_first[:(k - len(picked))]
            
            return picked
        
        sel_activities = pick_with_budget(act_all, user_input.activity_ids, 'activity_id', 'price', unique_activities_count)
        sel_restaurants = pick_with_budget(rest_all, user_input.restaurant_ids, 'restaurant_id', 'price_avg', unique_restaurants_count) 
        sel_hotels = pick_with_budget(hotel_all, user_input.hotel_ids, 'hotel_id', 'price_per_night', 1)
        return sel_activities, sel_restaurants, sel_hotels   
    finally:
        cursor.close()
        conn.close()

# Hàm generate_tour_schedule (đã sửa để loại bỏ duration_hours)
def generate_tour_schedule(user_input: UserTourInfo, sel_activities, sel_restaurants, sel_hotels):
    duration = int(float(user_input.duration_days)) if user_input.duration_days is not None else 3
    
    # Ensure non-empty lists
    if not sel_activities:
        sel_activities = [{'activity_id': 'default_activity', 'name': 'Default Activity', 'price': 0.0}]
    if not sel_restaurants:
        sel_restaurants = [{'restaurant_id': 'default_restaurant', 'name': 'Default Restaurant', 'price_avg': 0.0}]
    if not sel_hotels:
        sel_hotels = [{'hotel_id': 'default_hotel', 'name': 'Default Hotel', 'price_per_night': 0.0}]
    
    # Choose hotel (pay only once per day)
    hotel_per_day = sel_hotels[0]
    hotel_cost_per_night = float(hotel_per_day.get('price_per_night', 0.0))
    
    # Ensure enough activities and restaurants for the duration
    num_activity_slots = sum(1 for s in time_slots if s['type'] == 'activity')
    num_restaurant_slots = sum(1 for s in time_slots if s['type'] == 'restaurant')
    
    all_activities = []
    all_restaurants = []
    
    for day in range(duration):
        day_activities = []
        day_restaurants = []
        
        remaining_activities = [a for a in sel_activities if a not in [item for sublist in all_activities for item in sublist]]
        if len(remaining_activities) < num_activity_slots:
            remaining_activities += sel_activities
        day_activities = remaining_activities[:num_activity_slots]
        
        remaining_restaurants = [r for r in sel_restaurants if r not in [item for sublist in all_restaurants for item in sublist]]
        if len(remaining_restaurants) < num_restaurant_slots:
            remaining_restaurants += sel_restaurants
        day_restaurants = remaining_restaurants[:num_restaurant_slots]
        
        all_activities.append(day_activities)
        all_restaurants.append(day_restaurants)
        
    schedule = []
    
    for day in range(1, duration + 1):
        items = []
        day_idx = day - 1
        
        activity_idx = 0
        restaurant_idx = 0
        for slot in time_slots:
            if slot['type'] == 'activity':
                if activity_idx < len(all_activities[day_idx]):
                    it = all_activities[day_idx][activity_idx]
                    activity_idx += 1
                    items.append({
                        "start_time": slot['start_time'],
                        "end_time": slot['end_time'],
                        "place_id": it['activity_id'],
                        "place_name": it['name'],
                        "type": "activity",
                        "cost": float(it.get('price', 0.0))
                    })
            elif slot['type'] == 'restaurant':
                if restaurant_idx < len(all_restaurants[day_idx]):
                    it = all_restaurants[day_idx][restaurant_idx]
                    restaurant_idx += 1
                    items.append({
                        "start_time": slot['start_time'],
                        "end_time": slot['end_time'],
                        "place_id": it['restaurant_id'],
                        "place_name": it['name'],
                        "type": "restaurant",
                        "cost": float(it.get('price_avg', 0.0))
                    })
            else:
                is_last_hotel_slot = slot['start_time'] == max(s['start_time'] for s in time_slots if s['type'] == 'hotel')
                items.append({
                    "start_time": slot['start_time'],
                    "end_time": slot['end_time'],
                    "place_id": hotel_per_day['hotel_id'],
                    "place_name": hotel_per_day['name'],
                    "type": "hotel",
                    "cost": hotel_cost_per_night if is_last_hotel_slot else 0.0
                })
        schedule.append({
            "day": day,
            "activities": items
        })
    return schedule