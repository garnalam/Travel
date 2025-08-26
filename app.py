# Smart Travel Vietnam - Flask Application với Direct Database Connection
# Complete web server với MySQL/PostgreSQL direct queries

import os
import zipfile
import io
import secrets
import mysql.connector
import math
import numpy as np
import pandas as pd
from datetime import datetime
from flask import Flask, request, jsonify, send_file, send_from_directory, session, redirect
from flask_cors import CORS
from werkzeug.utils import secure_filename
from sklearn.preprocessing import StandardScaler
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.impute import SimpleImputer

app = Flask(__name__, static_folder="assets", template_folder="templates")
app.secret_key = secrets.token_hex(16)
CORS(app, supports_credentials=True)

# Database configuration - Chỉnh sửa để khớp với database của user
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',  # Thay đổi password database của bạn
    'database': 'smart_travel',  # Tên database theo schema đã cung cấp
    'charset': 'utf8mb4',
    'collation': 'utf8mb4_unicode_ci'
}

def get_db_connection():
    """
    Tạo kết nối database MySQL
    """
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except mysql.connector.Error as e:
        print(f"Database connection error: {str(e)}")
        return None

def test_db_connection():
    """
    Test database connection
    """
    try:
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor()
            cursor.execute("SELECT COUNT(*) FROM hotels")
            count = cursor.fetchone()[0]
            cursor.close()
            connection.close()
            return True
        else:
            return False
    except Exception:
        return False

def execute_query(query, params=None, fetch_one=False, fetch_all=True):
    """
    Execute SQL query với error handling
    """
    try:
        connection = get_db_connection()
        if not connection:
            print("❌ Database connection failed")
            return None
            
        cursor = connection.cursor(dictionary=True, buffered=True)  # Make cursor buffered by default
        
        # Log the query for debugging
        print(f"Executing query: {query}")
        print(f"With params: {params}")
        
        try:
            cursor.execute(query, params or ())
            
            # Xác định loại query
            is_select = query.strip().lower().startswith('select')
            is_modify = query.strip().lower().startswith(('insert', 'update', 'delete'))
            
            result = None
            
            # SELECT query - fetch results
            if is_select:
                if fetch_one:
                    result = cursor.fetchone()
                elif fetch_all:
                    result = cursor.fetchall()
                else:
                    # If neither fetch_one nor fetch_all is True, still consume the results
                    # to avoid "Unread result found" errors
                    cursor.fetchall()
            # INSERT/UPDATE/DELETE - return affected rows
            elif is_modify:
                connection.commit()
                result = {'affected_rows': cursor.rowcount, 'last_id': cursor.lastrowid}
                print(f"✅ Query executed and committed successfully. Rows affected: {cursor.rowcount}, Last ID: {cursor.lastrowid}")
            
            cursor.close()
            connection.close()
            return result
            
        except mysql.connector.Error as e:
            print(f"❌ MySQL error executing query: {str(e)}")
            # Rollback nếu có lỗi
            connection.rollback()
            cursor.close()
            connection.close()
            return None
        
    except Exception as e:
        print(f"❌ Query execution error: {str(e)}")
        return None

@app.route("/")
def index():
    return send_file("index.html")

@app.route("/dashboard")
def dashboard():
    return send_file("dashboard.html")

@app.route("/dashboard.html")
def dashboard_html():
    return send_file("dashboard.html")

@app.route("/admin")
def admin():
    # Check if user is logged in and is admin
    print(f"🔍 Admin route accessed. Session: {dict(session)}")
    
    if 'user_id' not in session:
        print("❌ No user_id in session, redirecting to /")
        return redirect('/')
    
    is_admin = session.get('is_admin', False)
    print(f"🔍 is_admin value: {is_admin} (type: {type(is_admin)})")
    
    if not is_admin:
        print("❌ User is not admin, redirecting to /dashboard")
        return redirect('/dashboard')
    
    print("✅ Admin access granted, serving admin.html")
    return send_file("admin.html")

@app.route("/admin.html")
def admin_html():
    # Check if user is logged in and is admin
    print(f"🔍 Admin.html route accessed. Session: {dict(session)}")
    
    if 'user_id' not in session:
        print("❌ No user_id in session, redirecting to /")
        return redirect('/')
    
    is_admin = session.get('is_admin', False)
    print(f"🔍 is_admin value: {is_admin} (type: {type(is_admin)})")
    
    if not is_admin:
        print("❌ User is not admin, redirecting to /dashboard")
        return redirect('/dashboard')
    
    print("✅ Admin access granted, serving admin.html")
    return send_file("admin.html")

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({'status': 'OK', 'message': 'Smart Travel Vietnam Flask API với Direct Database is running'})

@app.route("/api/debug-db", methods=["GET"])
def debug_database():
    """
    Debug endpoint để kiểm tra database connection và users table
    """
    try:
        # Test connection
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Cannot connect to database'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Check if users table exists
        cursor.execute("SHOW TABLES LIKE 'users'")
        table_exists = cursor.fetchone()
        
        if not table_exists:
            cursor.close()
            connection.close()
            return jsonify({'error': 'Users table does not exist'}), 500
        
        # Get all users
        cursor.execute("SELECT user_id, name, email, is_admin FROM users")
        users = cursor.fetchall()
        
        # Get users count
        cursor.execute("SELECT COUNT(*) as count FROM users")
        count = cursor.fetchone()['count']
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'status': 'OK',
            'database': 'data_travel',
            'users_table_exists': True,
            'users_count': count,
            'users': users
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route("/api/debug-create-test-users", methods=["POST"])
def create_test_users():
    """
    Tạo test users cho debug
    """
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'error': 'Cannot connect to database'}), 500
        
        cursor = connection.cursor()
        
        # Tạo test@example.com nếu chưa có
        test_users = [
            ('Test User', 'test@example.com', 'test123', 1, 'Ha Noi', 'Vietnam'),
            ('Admin User', 'admin@example.com', '123', 1, 'Hanoi', 'Vietnam'),
            ('Regular User', 'user@example.com', '123', 0, 'Ho Chi Minh', 'Vietnam')
        ]
        
        created_users = []
        
        for name, email, password, is_admin, city, country in test_users:
            # Check if user exists
            cursor.execute("SELECT email FROM users WHERE email = %s", (email,))
            if cursor.fetchone():
                print(f"User {email} already exists")
                continue
            
            # Insert user
            insert_query = """
                INSERT INTO users (name, email, password, is_admin, city, country) 
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            cursor.execute(insert_query, (name, email, password, is_admin, city, country))
            created_users.append(email)
        
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({
            'status': 'OK',
            'message': 'Test users created',
            'created_users': created_users
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route("/api/login", methods=["POST"])
def login():
    print("🔵 ==> LOGIN API CALLED <==")
    
    # Debug connection first
    connection = get_db_connection()
    if not connection:
        print("❌ CRITICAL: Database connection failed!")
        return jsonify({'success': False, 'message': 'Database connection error'}), 500
    else:
        print("✅ Database connection successful")
        connection.close()
    
    data = request.get_json()
    print(f"🔍 Login request data: {data}")
    
    email = data.get('email')
    password = data.get('password')
    
    print(f"🔐 Login attempt: email='{email}', password='{password}'")
    
    if not email or not password:
        print("❌ Missing email or password")
        return jsonify({'success': False, 'message': 'Email và password là bắt buộc'}), 400
    
    # Kiểm tra thông tin đăng nhập từ database
    print("🔍 Querying database...")
    query = "SELECT user_id, name, email, password, is_admin FROM users WHERE email = %s"
    print(f"🔍 Executing query: {query} with email: '{email}'")
    
    user = execute_query(query, (email,), fetch_one=True, fetch_all=False)
    
    print(f"🔍 Database query result: {user}")
    print(f"🔍 Query returned type: {type(user)}")
    
    if user:
        print("✅ User found in database")
        print(f"🔍 User data: {user}")
        
        # Debug password comparison in detail
        db_password = user.get('password', '')
        print(f"🔍 DB password: '{db_password}' (length: {len(db_password)})")
        print(f"🔍 Input password: '{password}' (length: {len(password)})")
        print(f"🔍 Passwords equal: {db_password == password}")
        print(f"🔍 DB password stripped: '{db_password.strip()}' == Input: '{password.strip()}': {db_password.strip() == password.strip()}")
        
        # Kiểm tra mật khẩu (trong thực tế nên hash mật khẩu)
        password_match = str(user['password']).strip() == str(password).strip()
        print(f"🔍 Final password match result: {password_match}")
        
        if password_match:
            print("✅ Password matches")
            
            # Set up session
            session['user_id'] = user['user_id']
            session['user_email'] = user['email']
            session['user_name'] = user['name']
            # Kiểm tra giá trị is_admin dạng tinyint trong database
            is_admin_value = user.get('is_admin', 0)
            # Chuyển đổi sang boolean để lưu trong session
            session['is_admin'] = bool(is_admin_value)
            
            print(f"🔍 User is_admin raw value: {is_admin_value} (type: {type(is_admin_value)})")
            print(f"🔍 Session is_admin set to: {session['is_admin']}")
            print(f"✅ Login successful. Full session: {dict(session)}")
            
            response_data = {
                'success': True, 
                'redirect': 'dashboard.html',
                'is_admin': session['is_admin']
            }
            
            print(f"✅ Sending login response: {response_data}")
            return jsonify(response_data)
        else:
            print("❌ Password mismatch")
            return jsonify({'success': False, 'message': 'Sai mật khẩu'}), 401
    else:
        print("❌ User not found in database")
        print("🔍 Let's check what users exist in the database...")
        
        # Debug: List all users
        all_users_query = "SELECT user_id, name, email FROM users"
        all_users = execute_query(all_users_query, fetch_one=False, fetch_all=True)
        print(f"🔍 All users in database: {all_users}")
        
        # Fallback đặc biệt cho test@example.com nếu chưa tạo database
        if email == "test@example.com" and password == "test123":
            print("🔄 Using fallback login for test@example.com")
            
            session['user_id'] = 1
            session['user_email'] = email
            session['user_name'] = 'Test User'
            session['is_admin'] = True  # Default admin for test account
            
            print(f"✅ Fallback login successful. Session: {dict(session)}")
            
            response_data = {
                'success': True, 
                'redirect': 'dashboard.html',
                'is_admin': True
            }
            
            print(f"✅ Sending fallback response: {response_data}")
            return jsonify(response_data)
        
        print("❌ No fallback available for this email")
        return jsonify({'success': False, 'message': 'Email không tồn tại'}), 401

@app.route("/api/register", methods=["POST"])
def register():
    """
    Đăng ký người dùng mới với is_admin mặc định = 0
    """
    print("🔵 ==> REGISTER API CALLED <==")
    
    try:
        # Debug: Log request data
        data = request.get_json()
        print(f"🔍 Register request data: {data}")
        
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()
        
        print(f"🔍 Parsed data - Name: '{name}', Email: '{email}', Password: '{'*' * len(password)}'")
        
        # Validate input
        if not all([name, email, password]):
            print("❌ Validation failed - missing required fields")
            return jsonify({'success': False, 'message': 'Vui lòng điền đầy đủ thông tin'}), 400
        
        print("✅ Validation passed")
        
        # Check if email already exists
        print("🔍 Checking if email already exists...")
        check_query = "SELECT user_id FROM users WHERE email = %s"
        print(f"🔍 Executing email check query: {check_query} with email: '{email}'")
        existing_user = execute_query(check_query, (email,), fetch_one=True, fetch_all=False)
        
        print(f"🔍 Existing user check result: {existing_user}")
        
        if existing_user:
            print("❌ Email already exists")
            return jsonify({'success': False, 'message': 'Email đã được sử dụng'}), 400
        
        print("✅ Email is available")
        
        # Lấy dữ liệu bổ sung từ form đăng ký
        phone_number = data.get('phone_number', None)
        gender = data.get('gender', None)
        birth_year = data.get('birth_year', None)
        
        # Insert new user with is_admin = 0 (default guest)
        print("🔍 Inserting new user...")
        insert_query = """
            INSERT INTO users (name, email, password, is_admin, city, country, phone_number, gender, birth_year) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        # Mặc định city và country là "" (empty string) theo yêu cầu mới
        insert_params = (name, email, password, 0, "", "", phone_number, gender, birth_year)
        print(f"🔍 Insert params: {insert_params}")
        
        # Sử dụng execute_query thay vì connection trực tiếp
        result = execute_query(insert_query, insert_params)
        
        if result is None:
            print("❌ Failed to insert user")
            return jsonify({'success': False, 'message': 'Lỗi khi tạo tài khoản'}), 500
        
        # Lấy user_id mới tạo từ kết quả trả về
        user_id = result.get('last_id')
        
        if not user_id:
            # Backup plan nếu không lấy được last_id
            user_query = "SELECT user_id FROM users WHERE email = %s"
            user_result = execute_query(user_query, (email,), fetch_one=True)
            
            if not user_result:
                print("❌ Failed to retrieve new user")
                return jsonify({'success': False, 'message': 'Lỗi khi tạo tài khoản'}), 500
                
            user_id = user_result['user_id']
            
        print(f"🔍 New user ID: {user_id}")
        
        # Log thành công để debug
        print(f"✅ Đã đăng ký user mới thành công: {email}, user_id={user_id}")
        
        # Auto login after registration
        print("🔍 Setting up session...")
        session['user_id'] = user_id
        session['user_email'] = email
        session['user_name'] = name
        session['is_admin'] = False  # New users are not admin by default
        
        print(f"✅ Session created: {dict(session)}")
        
        response_data = {
            'success': True, 
            'message': 'Đăng ký thành công!',
            'redirect': 'dashboard.html',
            'is_admin': False
        }
        
        print(f"✅ Sending response: {response_data}")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"❌ ERROR in register: {str(e)}")
        print(f"❌ Exception type: {type(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        return jsonify({'success': False, 'message': 'Lỗi hệ thống'}), 500

@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({'success': True, 'redirect': 'index.html'})

@app.route("/api/activities/by-city/<city_id>", methods=["GET"])
def get_activities_by_city(city_id):
    """
    API endpoint để lấy danh sách activities theo city_id
    """
    try:
        print(f"🔍 Getting activities for city_id: {city_id}")
        
        # Kiểm tra tham số đầu vào
        if not city_id:
            return jsonify({"error": "City ID is required"}), 400
        
        # Query để lấy activities dựa trên city_id
        query = """
            SELECT activity_id, name, description, type, price, duration_hr, rating
            FROM activities
            WHERE city_id = %s
            ORDER BY rating DESC, name ASC
        """
        
        activities = execute_query(query, (city_id,))
        
        # Nếu không có kết quả, trả về mảng rỗng
        if activities is None:
            activities = []
            
        print(f"✅ Found {len(activities)} activities for city ID {city_id}")
        
        return jsonify({"activities": activities})
    
    except Exception as e:
        print(f"❌ Error getting activities by city: {str(e)}")
        return jsonify({"error": "Failed to retrieve activities"}), 500

@app.route("/api/transports/by-city/<city_id>", methods=["GET"])
def get_transports_by_city(city_id):
    """
    API endpoint để lấy danh sách transports theo city_id
    """
    try:
        print(f"🔍 Getting transports for city_id: {city_id}")
        
        # Kiểm tra tham số đầu vào
        if not city_id:
            return jsonify({"error": "City ID is required"}), 400
        
        # Query để lấy transports dựa trên city_id
        query = """
            SELECT transport_id, type, avg_price_per_km, operating_hours, min_price, max_capacity, rating
            FROM transports
            WHERE city_id = %s
            ORDER BY rating DESC, type ASC
        """
        
        transports = execute_query(query, (city_id,))
        
        # Nếu không có kết quả, trả về mảng rỗng
        if transports is None:
            transports = []
            
        print(f"✅ Found {len(transports)} transports for city ID {city_id}")
        
        return jsonify({"transports": transports})
    
    except Exception as e:
        print(f"❌ Error getting transports by city: {str(e)}")
        return jsonify({"error": "Failed to retrieve transports"}), 500

# ================================
# ADMIN ANALYTICS API ENDPOINTS
# ================================

@app.route("/api/admin/analytics/users", methods=["GET"])
def get_user_analytics():
    """
    API endpoint để lấy thống kê người dùng cho admin dashboard
    """
    try:
        print("🔍 Getting user analytics for admin...")
        
        # Get total users count
        total_users_query = "SELECT COUNT(*) as count FROM users"
        total_users_result = execute_query(total_users_query, fetch_one=True)
        total_users = total_users_result['count'] if total_users_result else 0
        
        # Get admin users count
        admin_users_query = "SELECT COUNT(*) as count FROM users WHERE is_admin = 1"
        admin_users_result = execute_query(admin_users_query, fetch_one=True)
        admin_users = admin_users_result['count'] if admin_users_result else 0
        
        # Get users with tour options (active users)
        active_users_query = """
            SELECT COUNT(DISTINCT u.user_id) as count 
            FROM users u 
            JOIN tour_options tour_opts ON u.user_id = tour_opts.user_id
        """
        active_users_result = execute_query(active_users_query, fetch_one=True)
        active_users = active_users_result['count'] if active_users_result else 0
        
        # Get recent users (note: created_at column may not exist, using user_id as fallback)
        recent_users_query = """
            SELECT user_id, name, email, city, country, is_admin
            FROM users 
            ORDER BY user_id DESC 
            LIMIT 10
        """
        recent_users = execute_query(recent_users_query)
        if recent_users is None:
            recent_users = []
        
        print(f"✅ User analytics: {total_users} total, {admin_users} admins, {active_users} active")
        
        return jsonify({
            "success": True,
            "total_users": total_users,
            "admin_users": admin_users,
            "active_users": active_users,
            "recent_users": recent_users
        })
    
    except Exception as e:
        print(f"❌ Error getting user analytics: {str(e)}")
        return jsonify({"error": "Failed to retrieve user analytics"}), 500

@app.route("/api/admin/analytics/tours", methods=["GET"])
def get_tour_analytics():
    """
    API endpoint để lấy thống kê tour cho admin dashboard với filter theo quốc gia và mức giá
    """
    try:
        print("🔍 Getting tour analytics for admin...")
        
        # Lấy các tham số filter từ request
        country_filter = request.args.get('country', '')
        price_filter = request.args.get('price', '')
        
        print(f"Applied filters: country={country_filter}, price={price_filter}")
        
        # Xây dựng điều kiện WHERE cho các queries
        where_conditions = []
        join_cities = False
        
        # Tạo điều kiện cho country filter
        if country_filter:
            where_conditions.append(f"c.country = '{country_filter}'")
            join_cities = True
        
        # Tạo điều kiện cho price filter
        if price_filter:
            price_ranges = {
                '0-500': 'tr.total_estimated_cost < 500',
                '500-1000': 'tr.total_estimated_cost >= 500 AND tr.total_estimated_cost < 1000',
                '1000-2000': 'tr.total_estimated_cost >= 1000 AND tr.total_estimated_cost < 2000',
                '2000-5000': 'tr.total_estimated_cost >= 2000 AND tr.total_estimated_cost < 5000',
                '5000+': 'tr.total_estimated_cost >= 5000'
            }
            if price_filter in price_ranges:
                where_conditions.append(price_ranges[price_filter])
        
        # Tạo WHERE clause chung
        where_clause = f"WHERE {' AND '.join(where_conditions)}" if where_conditions else ""
        
        # Get total tour recommendations with filters
        total_tours_query = f"""
            SELECT COUNT(*) as count FROM tour_recommendations tr
            JOIN tour_options tour_opts ON tr.option_id = tour_opts.option_id
            {f"JOIN cities c ON tour_opts.destination_city_id = c.city_id" if join_cities else ""}
            {where_clause}
        """
        total_tours_result = execute_query(total_tours_query, fetch_one=True)
        total_tours = total_tours_result['count'] if total_tours_result else 0
        
        # Get total tour options with filters
        total_options_query = f"""
            SELECT COUNT(*) as count FROM tour_options tour_opts
            {f"JOIN cities c ON tour_opts.destination_city_id = c.city_id" if join_cities else ""}
            {where_clause.replace('tr.', 'tour_opts.')}
        """
        total_options_result = execute_query(total_options_query, fetch_one=True)
        total_options = total_options_result['count'] if total_options_result else 0
        
        # Get average tour cost with filters
        avg_cost_query = f"""
            SELECT AVG(tr.total_estimated_cost) as avg_cost 
            FROM tour_recommendations tr
            JOIN tour_options tour_opts ON tr.option_id = tour_opts.option_id
            {f"JOIN cities c ON tour_opts.destination_city_id = c.city_id" if join_cities else ""}
            {f"{where_clause} AND" if where_conditions else "WHERE"} tr.total_estimated_cost > 0
        """
        avg_cost_result = execute_query(avg_cost_query, fetch_one=True)
        avg_cost = round(avg_cost_result['avg_cost'], 2) if avg_cost_result and avg_cost_result['avg_cost'] else 0
        
        # Get top 5 destination cities with filters
        top_cities_query = f"""
            SELECT c.name as city_name, COUNT(tour_opts.option_id) as tour_count
            FROM tour_options tour_opts
            JOIN cities c ON tour_opts.destination_city_id = c.city_id
            JOIN tour_recommendations tr ON tour_opts.option_id = tr.option_id
            {f"WHERE {' AND '.join(where_conditions)}" if where_conditions else ""}
            GROUP BY c.city_id, c.name
            ORDER BY tour_count DESC
            LIMIT 5
        """
        top_cities = execute_query(top_cities_query)
        if top_cities is None:
            top_cities = []
        
        # Get recent tours with city names and filters
        recent_tours_query = f"""
            SELECT tour_opts.option_id, c.name as destination_city, tour_opts.guest_count, 
                   tour_opts.duration_days, tr.total_estimated_cost
            FROM tour_options tour_opts
            JOIN cities c ON tour_opts.destination_city_id = c.city_id
            LEFT JOIN tour_recommendations tr ON tour_opts.option_id = tr.option_id
            {f"WHERE {' AND '.join(where_conditions)}" if where_conditions else ""}
            ORDER BY tour_opts.option_id DESC
            LIMIT 10
        """
        recent_tours = execute_query(recent_tours_query)
        if recent_tours is None:
            recent_tours = []
            
        # Get cost distribution data with filters
        cost_distribution_query = f"""
            SELECT 
                CASE 
                    WHEN tr.total_estimated_cost < 500 THEN '<$500'
                    WHEN tr.total_estimated_cost >= 500 AND tr.total_estimated_cost < 1000 THEN '$500-1000'
                    WHEN tr.total_estimated_cost >= 1000 AND tr.total_estimated_cost < 2000 THEN '$1000-2000'
                    WHEN tr.total_estimated_cost >= 2000 AND tr.total_estimated_cost < 5000 THEN '$2000-5000'
                    ELSE '>$5000'
                END as cost_range,
                COUNT(*) as count
            FROM tour_recommendations tr
            JOIN tour_options tour_opts ON tr.option_id = tour_opts.option_id
            {f"JOIN cities c ON tour_opts.destination_city_id = c.city_id" if join_cities else ""}
            {f"{where_clause} AND" if where_conditions else "WHERE"} tr.total_estimated_cost > 0
            GROUP BY cost_range
            ORDER BY MIN(tr.total_estimated_cost)
        """
        cost_distribution = execute_query(cost_distribution_query)
        if cost_distribution is None:
            cost_distribution = []
            
        # Get all countries for filter dropdown
        countries_query = """
            SELECT DISTINCT country 
            FROM cities 
            ORDER BY country
        """
        countries = execute_query(countries_query)
        
        print(f"✅ Tour analytics: {total_tours} tours, {total_options} options, ${avg_cost} avg cost")
        
        return jsonify({
            "success": True,
            "total_tours": total_tours,
            "total_options": total_options,
            "avg_cost": avg_cost,
            "top_cities": top_cities,
            "recent_tours": recent_tours,
            "cost_distribution": cost_distribution,
            "countries": [country['country'] for country in countries] if countries else []
        })
    
    except Exception as e:
        print(f"❌ Error getting tour analytics: {str(e)}")
        return jsonify({"error": "Failed to retrieve tour analytics"}), 500

@app.route("/api/admin/analytics/activities", methods=["GET"])
def get_activity_analytics():
    """
    API endpoint để lấy thống kê hoạt động cho admin dashboard với filter theo quốc gia và mức giá
    """
    try:
        print("🔍 Getting activity analytics for admin...")
        
        # Lấy các tham số filter từ request
        country_filter = request.args.get('country', '')
        price_filter = request.args.get('price', '')
        
        print(f"Applied filters: country={country_filter}, price={price_filter}")
        
        # Xây dựng điều kiện WHERE cho các queries
        where_conditions = []
        
        # Tạo điều kiện cho country filter
        if country_filter:
            where_conditions.append(f"activities.country = '{country_filter}'")
        
        # Tạo điều kiện cho price filter
        if price_filter:
            price_ranges = {
                '0-50': 'activities.price < 50',
                '50-100': 'activities.price >= 50 AND activities.price < 100',
                '100-200': 'activities.price >= 100 AND activities.price < 200',
                '200+': 'activities.price >= 200'
            }
            if price_filter in price_ranges:
                where_conditions.append(price_ranges[price_filter])
        
        # Tạo WHERE clause chung
        where_clause = f"WHERE {' AND '.join(where_conditions)}" if where_conditions else ""
        
        # Get total activities với filters
        total_activities_query = f"""
            SELECT COUNT(*) as count 
            FROM activities
            {where_clause}
        """
        total_activities_result = execute_query(total_activities_query, fetch_one=True)
        total_activities = total_activities_result['count'] if total_activities_result else 0
        
        # Get total cities với filters
        total_cities_query = f"""
            SELECT COUNT(DISTINCT city_id) as count 
            FROM activities
            {where_clause}
        """
        total_cities_result = execute_query(total_cities_query, fetch_one=True)
        total_cities = total_cities_result['count'] if total_cities_result else 0
        
        # Get average rating of activities với filters
        avg_rating_query = f"""
            SELECT AVG(rating) as avg_rating 
            FROM activities 
            {f"{where_clause} AND" if where_conditions else "WHERE"} rating > 0
        """
        avg_rating_result = execute_query(avg_rating_query, fetch_one=True)
        avg_rating = round(avg_rating_result['avg_rating'], 1) if avg_rating_result and avg_rating_result['avg_rating'] else 0
        
        # Get activity types distribution với filters
        activity_types_query = f"""
            SELECT type, COUNT(*) as count
            FROM activities
            {f"{where_clause} AND" if where_conditions else "WHERE"} type IS NOT NULL AND type != ''
            GROUP BY type
            ORDER BY count DESC
            LIMIT 10
        """
        activity_types = execute_query(activity_types_query)
        if activity_types is None:
            activity_types = []
        
        # Get top rated activities với filters
        top_rated_query = f"""
            SELECT name, rating, type, city, country
            FROM activities
            {f"{where_clause} AND" if where_conditions else "WHERE"} rating > 0
            ORDER BY rating DESC, name ASC
            LIMIT 5
        """
        top_rated = execute_query(top_rated_query)
        
        # Get all countries for filter dropdown
        countries_query = """
            SELECT DISTINCT country 
            FROM activities 
            WHERE country IS NOT NULL AND country != ''
            ORDER BY country
        """
        countries = execute_query(countries_query)
        if top_rated is None:
            top_rated = []
            
        print(f"✅ Activity analytics: {total_activities} activities, {total_cities} cities, {avg_rating} avg rating")
        
        return jsonify({
            "success": True,
            "total_activities": total_activities,
            "total_cities": total_cities,
            "avg_rating": avg_rating,
            "activity_types": activity_types,
            "top_rated": top_rated,
            "countries": [country['country'] for country in countries] if countries else []
        })
    
    except Exception as e:
        print(f"❌ Error getting activity analytics: {str(e)}")
        return jsonify({"error": "Failed to retrieve activity analytics"}), 500

@app.route("/api/admin/analytics/overview", methods=["GET"])
def get_system_overview():
    """
    API endpoint để lấy tổng quan hệ thống cho admin dashboard
    """
    try:
        print("🔍 Getting system overview for admin...")
        
        # Get total users
        users_query = "SELECT COUNT(*) as count FROM users"
        users_result = execute_query(users_query, fetch_one=True)
        total_users = users_result['count'] if users_result else 0
        
        # Get total activities
        activities_query = "SELECT COUNT(*) as count FROM activities"
        activities_result = execute_query(activities_query, fetch_one=True)
        total_activities = activities_result['count'] if activities_result else 0
        
        # Get total cities
        cities_query = "SELECT COUNT(*) as count FROM cities"
        cities_result = execute_query(cities_query, fetch_one=True)
        total_cities = cities_result['count'] if cities_result else 0
        
        # Get total hotels
        hotels_query = "SELECT COUNT(*) as count FROM hotels"
        hotels_result = execute_query(hotels_query, fetch_one=True)
        total_hotels = hotels_result['count'] if hotels_result else 0
        
        # Get total restaurants
        restaurants_query = "SELECT COUNT(*) as count FROM restaurants"
        restaurants_result = execute_query(restaurants_query, fetch_one=True)
        total_restaurants = restaurants_result['count'] if restaurants_result else 0
        
        # Get total transports
        transports_query = "SELECT COUNT(*) as count FROM transports"
        transports_result = execute_query(transports_query, fetch_one=True)
        total_transports = transports_result['count'] if transports_result else 0
        
        # Get total tour recommendations
        recommendations_query = "SELECT COUNT(*) as count FROM tour_recommendations"
        recommendations_result = execute_query(recommendations_query, fetch_one=True)
        total_recommendations = recommendations_result['count'] if recommendations_result else 0
        
        print(f"✅ System overview: {total_users} users, {total_activities} activities, {total_cities} cities")
        
        return jsonify({
            "success": True,
            "total_users": total_users,
            "total_activities": total_activities,
            "total_cities": total_cities,
            "total_hotels": total_hotels,
            "total_restaurants": total_restaurants,
            "total_transports": total_transports,
            "total_recommendations": total_recommendations
        })
    
    except Exception as e:
        print(f"❌ Error getting system overview: {str(e)}")
        return jsonify({"error": "Failed to retrieve system overview"}), 500

@app.route("/api/download-source", methods=["GET"])
def download_source():
    # Generate and download complete source code as ZIP
    try:
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Add project files
            files_to_include = [
                'index.html', 'dashboard.html', 'admin.html', 'app.py', 'requirements.txt',
                'YOUWARE.md', 'site_config.json', 'travel (1).sql'
            ]
            
            for file_name in files_to_include:
                if os.path.exists(file_name):
                    zip_file.write(file_name)
            
            # Add assets folder
            for root, dirs, files in os.walk('assets'):
                for file in files:
                    file_path = os.path.join(root, file)
                    zip_file.write(file_path)
                    
        zip_buffer.seek(0)
        return send_file(zip_buffer, mimetype='application/zip', as_attachment=True, download_name='smart-travel-vietnam.zip')
    except Exception as e:
        return jsonify({'error': f'Failed to generate source code: {str(e)}'}), 500

# API endpoints cho hotel search với direct database queries

# Hotel autocomplete
@app.route("/api/hotels/autocomplete", methods=["GET"])
def hotels_autocomplete():
    """
    Tìm kiếm hotels suggestions theo tên hotel (autocomplete AJAX)
    """
    try:
        query_string = request.args.get('q', '').strip()
        limit = request.args.get('limit', 5)
        
        if not query_string or len(query_string) < 2:
            return jsonify({"suggestions": []})
        
        search_query = """
            SELECT hotel_id, name, city, country, stars, rating, price_per_night
            FROM hotels 
            WHERE name LIKE %s OR city LIKE %s OR country LIKE %s
            ORDER BY 
                CASE 
                    WHEN name LIKE %s THEN 1
                    WHEN city LIKE %s THEN 2
                    WHEN country LIKE %s THEN 3
                    ELSE 4
                END,
                rating DESC, 
                name ASC
            LIMIT %s
        """
        
        search_term = f"%{query_string}%"
        exact_search = f"{query_string}%"
        
        params = (search_term, search_term, search_term, 
                 exact_search, exact_search, exact_search, 
                 int(limit))
        
        results = execute_query(search_query, params)
        
        if results:
            suggestions = []
            for row in results:
                suggestion = {
                    "hotel_id": row['hotel_id'],
                    "name": row['name'],
                    "city": row['city'],
                    "country": row['country'],
                    "stars": row['stars'] or 3,
                    "rating": float(row['rating']) if row['rating'] else 4.0,
                    "price_per_night": float(row['price_per_night']) if row['price_per_night'] else 100.0,
                    "display_text": f"{row['name']} - {row['city']}, {row['country']}",
                    "type": "hotel"
                }
                suggestions.append(suggestion)
            
            return jsonify({"suggestions": suggestions})
        else:
            return jsonify({"suggestions": []})
            
    except Exception:
        return jsonify({"suggestions": []})

@app.route("/api/cities/autocomplete", methods=["GET"])  
def cities_autocomplete():
    """
    Tìm kiếm cities suggestions (autocomplete AJAX)
    """
    try:
        query_string = request.args.get('q', '').strip()
        limit = request.args.get('limit', 5)
        
        if not query_string or len(query_string) < 2:
            return jsonify({"suggestions": []})
        
        search_query = """
            SELECT DISTINCT city, country, COUNT(*) as hotel_count
            FROM hotels 
            WHERE city LIKE %s OR country LIKE %s
            GROUP BY city, country
            ORDER BY 
                CASE 
                    WHEN city LIKE %s THEN 1
                    WHEN country LIKE %s THEN 2
                    ELSE 3
                END,
                hotel_count DESC,
                city ASC
            LIMIT %s
        """
        
        search_term = f"%{query_string}%"
        exact_search = f"{query_string}%"
        
        params = (search_term, search_term, exact_search, exact_search, int(limit))
        
        results = execute_query(search_query, params)
        
        if results:
            suggestions = []
            for row in results:
                suggestion = {
                    "city": row['city'],
                    "country": row['country'],
                    "hotel_count": row['hotel_count'],
                    "display_text": f"{row['city']}, {row['country']} ({row['hotel_count']} hotels)",
                    "type": "city"
                }
                suggestions.append(suggestion)
            
            return jsonify({"suggestions": suggestions})
        else:
            return jsonify({"suggestions": []})
            
    except Exception:
        return jsonify({"suggestions": []})

@app.route("/api/countries", methods=["GET"])
def get_countries():
    """Lấy danh sách quốc gia unique từ hotels table"""
    try:
        query = "SELECT DISTINCT country FROM hotels WHERE country IS NOT NULL AND country != '' ORDER BY country"
        results = execute_query(query)
        
        if results:
            countries = [{"country": row['country']} for row in results]
            return jsonify({"countries": countries})
        else:
            return jsonify({"countries": []})
            
    except Exception:
        return jsonify({"countries": []})

@app.route("/api/cities", methods=["GET"])
def get_cities():
    """Lấy danh sách thành phố unique theo quốc gia từ hotels table"""
    try:
        country = request.args.get('country')
        if not country:
            return jsonify({"error": "Country parameter is required"}), 400
        
        query = """
            SELECT DISTINCT city 
            FROM hotels 
            WHERE country = %s AND city IS NOT NULL AND city != '' 
            ORDER BY city
        """
        results = execute_query(query, (country,))
        
        if results:
            cities = [{"name": row['city']} for row in results]
            return jsonify({"cities": cities})
        else:
            return jsonify({"cities": []})
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/hotels/search", methods=["POST"])
def search_hotels():
    """
    Search hotels với flexible parameters
    """
    try:
        data = request.get_json()
        
        # Extract search parameters
        country = data.get('country', '').strip()
        city = data.get('city', '').strip()
        checkin = data.get('checkin', '').strip()
        checkout = data.get('checkout', '').strip()
        hotel_name = data.get('name', '').strip()
        search_query = data.get('searchQuery', '').strip()
        hotel_id = data.get('hotel_id')
        
        # VALIDATE: CHỈ DATE là bắt buộc
        if not checkin or not checkout:
            return jsonify({"error": "Check-in và check-out dates là bắt buộc"}), 400
        
        # BUILD DYNAMIC QUERY
        conditions = ["1=1"]
        params = []
        
        # PRIORITY 1: Hotel ID cụ thể
        if hotel_id:
            conditions = ["hotel_id = %s"]
            params = [hotel_id]
            
        else:
            # PRIORITY 2: Search query từ thanh search
            if search_query:
                conditions.append("name LIKE %s")
                params.append(f"%{search_query}%")
            
            # PRIORITY 3: Hotel name
            elif hotel_name:
                conditions.append("name LIKE %s")
                params.append(f"%{hotel_name}%")
            
            # OPTIONAL: Country filter
            if country:
                conditions.append("country LIKE %s")
                params.append(f"%{country}%")
            
            # OPTIONAL: City filter
            if city:
                conditions.append("city LIKE %s")
                params.append(f"%{city}%")
        
        # BUILD FINAL QUERY với sort theo rating
        query = f"""
            SELECT hotel_id, name, city, country, stars, price_per_night, 
                   rating, latitude, longitude
            FROM hotels
            WHERE {' AND '.join(conditions)}
            ORDER BY rating DESC, price_per_night ASC
        """
        
        # EXECUTE QUERY
        results = execute_query(query, tuple(params))
        
        if results:
            hotels = []
            for row in results:
                hotel = {
                    "hotel_id": row['hotel_id'],
                    "name": row['name'],
                    "city": row['city'],
                    "country": row['country'],
                    "stars": row['stars'] or 3,
                    "price_per_night": float(row['price_per_night']) if row['price_per_night'] else 100.0,
                    "currency": "USD",  # Default currency
                    "rating": float(row['rating']) if row['rating'] else 4.0,
                    "latitude": float(row['latitude']) if row['latitude'] else 0.0,
                    "longitude": float(row['longitude']) if row['longitude'] else 0.0,
                    "checkin_date": checkin,
                    "checkout_date": checkout
                }
                hotels.append(hotel)
            
            return jsonify({"hotels": hotels})
            
        else:
            return jsonify({"hotels": []})
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/hotels/<string:hotel_id>", methods=["GET"])
def get_hotel_details(hotel_id):
    """Lấy thông tin chi tiết của một hotel từ database"""
    try:
        # Query to get hotel details by hotel_id with city information
        query = """
            SELECT h.hotel_id, h.name, h.stars, h.price_per_night, 
                   h.rating, h.latitude, h.longitude,
                   c.name as city_name, c.city_id, c.country
            FROM hotels h
            LEFT JOIN cities c ON h.city_id = c.city_id
            WHERE h.hotel_id = %s
        """
        
        result = execute_query(query, (hotel_id,), fetch_one=True, fetch_all=False)
        
        if result:
            hotel = {
                "hotel_id": result['hotel_id'],
                "name": result['name'],
                "city_id": result['city_id'],
                "city": result['city_name'] or "",
                "country": result['country'] or "",
                "stars": result['stars'] or 3,
                "price_per_night": float(result['price_per_night']) if result['price_per_night'] else 100.0,
                "currency": "USD",  # Default currency
                "rating": float(result['rating']) if result['rating'] else 4.0,
                "latitude": float(result['latitude']) if result['latitude'] else 0.0,
                "longitude": float(result['longitude']) if result['longitude'] else 0.0
            }
            return jsonify({"success": True, "hotel": hotel})
        else:
            return jsonify({"success": False, "error": "Hotel not found"}), 404
            
    except Exception as e:
        print(f"Error getting hotel details: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

# API endpoint cho frontend edit form (alias)
@app.route("/api/hotels/details/<string:hotel_id>", methods=["GET"])
def get_hotel_details_alias(hotel_id):
    """Alias endpoint để tương thích với frontend code"""
    return get_hotel_details(hotel_id)

# API endpoint để lấy chi tiết activities
@app.route("/api/activities/<string:activity_id>", methods=["GET"])
def get_activity_details(activity_id):
    """Lấy thông tin chi tiết của một activity từ database"""
    try:
        query = """
            SELECT activity_id, name, city, country, description, type, 
                   price, duration_hr, rating, latitude, longitude
            FROM activities 
            WHERE activity_id = %s
        """
        
        result = execute_query(query, (activity_id,), fetch_one=True, fetch_all=False)
        
        if result:
            activity = {
                "activity_id": result['activity_id'],
                "name": result['name'],
                "city": result['city'],
                "country": result['country'],
                "description": result['description'] or "",
                "type": result['type'] or "",
                "price": float(result['price']) if result['price'] else 0.0,
                "duration_hr": float(result['duration_hr']) if result['duration_hr'] else 1.0,
                "currency": "USD",
                "rating": float(result['rating']) if result['rating'] else 4.0,
                "latitude": float(result['latitude']) if result['latitude'] else 0.0,
                "longitude": float(result['longitude']) if result['longitude'] else 0.0
            }
            return jsonify({"activity": activity})
        else:
            return jsonify({"error": "Activity not found"}), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API endpoint để lấy chi tiết transports
@app.route("/api/transports/<string:transport_id>", methods=["GET"])
def get_transport_details(transport_id):
    """Lấy thông tin chi tiết của một transport từ database"""
    try:
        query = """
            SELECT transport_id, type, city, country, avg_price_per_km, 
                   operating_hours, min_price, max_capacity, rating
            FROM transports 
            WHERE transport_id = %s
        """
        
        result = execute_query(query, (transport_id,), fetch_one=True, fetch_all=False)
        
        if result:
            transport = {
                "transport_id": result['transport_id'],
                "type": result['type'],
                "city": result['city'],
                "country": result['country'],
                "avg_price_per_km": float(result['avg_price_per_km']) if result['avg_price_per_km'] else 0.0,
                "operating_hours": result['operating_hours'] or "24/7",
                "min_price": float(result['min_price']) if result['min_price'] else 0.0,
                "max_capacity": result['max_capacity'] or 4,
                "currency": "USD",
                "rating": float(result['rating']) if result['rating'] else 4.0
            }
            return jsonify({"transport": transport})
        else:
            return jsonify({"error": "Transport not found"}), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API endpoint để lấy chi tiết restaurants
@app.route("/api/restaurants/<string:restaurant_id>", methods=["GET"])
def get_restaurant_details(restaurant_id):
    """Lấy thông tin chi tiết của một restaurant từ database"""
    try:
        # Query to get restaurant details by restaurant_id
        query = """
            SELECT r.restaurant_id, r.name, r.price_avg, r.cuisine_type, 
                   r.rating, r.latitude, r.longitude,
                   c.name as city_name, c.city_id, c.country
            FROM restaurants r
            LEFT JOIN cities c ON r.city_id = c.city_id
            WHERE r.restaurant_id = %s
        """
        
        result = execute_query(query, (restaurant_id,), fetch_one=True, fetch_all=False)
        
        if result:
            restaurant = {
                "restaurant_id": result['restaurant_id'],
                "name": result['name'],
                "city_id": result['city_id'],
                "city": result['city_name'] or "",
                "country": result['country'] or "",
                "price_avg": result['price_avg'] or 0,
                "cuisine_type": result['cuisine_type'] or "",
                "rating": float(result['rating']) if result['rating'] else 0.0,
                "latitude": float(result['latitude']) if result['latitude'] else 0.0,
                "longitude": float(result['longitude']) if result['longitude'] else 0.0
            }
            return jsonify({"success": True, "restaurant": restaurant})
        else:
            return jsonify({"success": False, "error": "Restaurant not found"}), 404
            
    except Exception as e:
        print(f"Error getting restaurant details: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

# API endpoint cho frontend edit form (alias)
@app.route("/api/restaurants/details/<string:restaurant_id>", methods=["GET"])
def get_restaurant_details_alias(restaurant_id):
    """Alias endpoint để tương thích với frontend code"""
    return get_restaurant_details(restaurant_id)

# API endpoint để lấy chi tiết transports
@app.route("/api/transports/<string:transport_id>", methods=["GET"])
def get_transport_details_api(transport_id):
    """Lấy thông tin chi tiết của một transport từ database"""
    try:
        query = """
            SELECT transport_id, type, city, country, avg_price_per_km,
                   operating_hours, min_price, max_capacity, rating
            FROM transports 
            WHERE transport_id = %s
        """
        
        result = execute_query(query, (activity_id,), fetch_one=True, fetch_all=False)
        
        if result:
            restaurant = {
                "restaurant_id": result['restaurant_id'],
                "name": result['name'],
                "city": result['city'],
                "country": result['country'],
                "cuisine_type": result['cuisine_type'] or "",
                "rating": float(result['rating']) if result['rating'] else 4.0,
                "latitude": float(result['latitude']) if result['latitude'] else 0.0,
                "longitude": float(result['longitude']) if result['longitude'] else 0.0,
                "price_avg": result['price_avg'] or 25,
                "description": result['description'] or "",
                "currency": "USD"
            }
            return jsonify({"restaurant": restaurant})
        else:
            return jsonify({"error": "Restaurant not found"}), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ===== RESTAURANT API ENDPOINTS =====

@app.route("/api/restaurants/autocomplete", methods=["GET"])
def restaurants_autocomplete():
    """
    Tìm kiếm restaurants suggestions theo tên restaurant (autocomplete AJAX)
    """
    try:
        query_string = request.args.get('q', '').strip()
        limit = request.args.get('limit', 5)
        
        if not query_string or len(query_string) < 2:
            return jsonify({"suggestions": []})
        
        search_query = """
            SELECT restaurant_id, name, city, country, cuisine_type, rating, price_avg
            FROM restaurants 
            WHERE name LIKE %s OR city LIKE %s OR country LIKE %s OR cuisine_type LIKE %s
            ORDER BY 
                CASE 
                    WHEN name LIKE %s THEN 1
                    WHEN city LIKE %s THEN 2
                    WHEN country LIKE %s THEN 3
                    ELSE 4
                END,
                rating DESC, 
                name ASC
            LIMIT %s
        """
        
        search_term = f"%{query_string}%"
        exact_search = f"{query_string}%"
        
        params = (search_term, search_term, search_term, search_term,
                 exact_search, exact_search, exact_search, 
                 int(limit))
        
        results = execute_query(search_query, params)
        
        if results:
            suggestions = []
            for row in results:
                suggestion = {
                    "restaurant_id": row['restaurant_id'],
                    "name": row['name'],
                    "city": row['city'],
                    "country": row['country'],
                    "cuisine_type": row['cuisine_type'],
                    "rating": float(row['rating']) if row['rating'] else 4.0,
                    "price_avg": float(row['price_avg']) if row['price_avg'] else 25.0,
                    "display_text": f"{row['name']} - {row['city']}, {row['country']}",
                    "type": "restaurant"
                }
                suggestions.append(suggestion)
            
            return jsonify({"suggestions": suggestions})
        else:
            return jsonify({"suggestions": []})
            
    except Exception as e:
        print(f"Error in restaurants_autocomplete: {str(e)}")
        return jsonify({"suggestions": []})

@app.route("/api/restaurants/cities/autocomplete", methods=["GET"])  
def restaurant_cities_autocomplete():
    """
    Tìm kiếm cities suggestions cho restaurants (autocomplete AJAX)
    """
    try:
        query_string = request.args.get('q', '').strip()
        limit = request.args.get('limit', 5)
        
        if not query_string or len(query_string) < 2:
            return jsonify({"suggestions": []})
        
        search_query = """
            SELECT DISTINCT city, country, COUNT(*) as restaurant_count
            FROM restaurants 
            WHERE city LIKE %s OR country LIKE %s
            GROUP BY city, country
            ORDER BY 
                CASE 
                    WHEN city LIKE %s THEN 1
                    WHEN country LIKE %s THEN 2
                    ELSE 3
                END,
                restaurant_count DESC,
                city ASC
            LIMIT %s
        """
        
        search_term = f"%{query_string}%"
        exact_search = f"{query_string}%"
        
        params = (search_term, search_term, exact_search, exact_search, int(limit))
        
        results = execute_query(search_query, params)
        
        if results:
            suggestions = []
            for row in results:
                suggestion = {
                    "city": row['city'],
                    "country": row['country'],
                    "restaurant_count": row['restaurant_count'],
                    "display_text": f"{row['city']}, {row['country']} ({row['restaurant_count']} restaurants)",
                    "type": "city"
                }
                suggestions.append(suggestion)
            
            return jsonify({"suggestions": suggestions})
        else:
            return jsonify({"suggestions": []})
            
    except Exception:
        return jsonify({"suggestions": []})

@app.route("/api/restaurants/countries", methods=["GET"])
def get_restaurant_countries():
    """Lấy danh sách quốc gia unique từ restaurants table"""
    try:
        query = "SELECT DISTINCT country FROM restaurants WHERE country IS NOT NULL AND country != '' ORDER BY country"
        results = execute_query(query)
        
        if results:
            countries = [{"country": row['country']} for row in results]
            print(f"✅ Found {len(countries)} restaurant countries from database")
            return jsonify({"countries": countries})
        else:
            return jsonify({"countries": []})
            
    except Exception as e:
        print(f"❌ Error in get_restaurant_countries: {str(e)}")
        return jsonify({"countries": []})

@app.route("/api/restaurants/cities", methods=["GET"])
def get_restaurant_cities():
    """Lấy danh sách thành phố unique theo quốc gia từ restaurants table"""
    try:
        country = request.args.get('country')
        if not country:
            return jsonify({"error": "Country parameter is required"}), 400
        
        # Thêm logging để kiểm tra giá trị
        print(f"Getting cities for country: {country}")
        
        query = """
            SELECT DISTINCT city 
            FROM restaurants 
            WHERE country = %s AND city IS NOT NULL AND city != '' 
            ORDER BY city
        """
        
        # Truyền country làm tuple để tránh SQL injection
        results = execute_query(query, (country,))
        
        if results:
            cities = [{"name": row['city']} for row in results]
            print(f"✅ Found {len(cities)} cities for {country} from database")
            return jsonify({"cities": cities})
        else:
            print(f"⚠️ No restaurants found for country: {country}")
            return jsonify({"cities": []})
            
    except Exception as e:
        print(f"Error in get_restaurant_cities: {str(e)}")
        return jsonify({"cities": []})

@app.route("/api/restaurants/cuisines", methods=["GET"])
@app.route("/api/ghost/cuisines", methods=["GET"])
def get_restaurant_cuisines():
    """Lấy danh sách cuisine types unique từ restaurants table"""
    try:
        # Kiểm tra nếu đây là ghost text request
        if request.path == '/api/ghost/cuisines':
            query_string = request.args.get('q', '').strip()
            
            if not query_string or len(query_string) < 2:
                return jsonify({"suggestion": ""})
                
            search_query = """
                SELECT DISTINCT cuisine_type FROM restaurants 
                WHERE cuisine_type LIKE %s AND cuisine_type IS NOT NULL AND cuisine_type != '' 
                ORDER BY cuisine_type ASC
                LIMIT 1
            """
            
            search_term = f"{query_string}%"  # Starts with query
            
            connection = get_db_connection()
            if not connection:
                return jsonify({"suggestion": ""})
                
            cursor = connection.cursor(dictionary=True)
            cursor.execute(search_query, (search_term,))
            result = cursor.fetchone()
            cursor.close()
            connection.close()
            
            if result and result['cuisine_type']:
                return jsonify({"suggestion": result['cuisine_type']})
            else:
                return jsonify({"suggestion": ""})
        
        # Nếu không phải ghost text request, trả về danh sách đầy đủ
        query = "SELECT DISTINCT cuisine_type FROM restaurants WHERE cuisine_type IS NOT NULL AND cuisine_type != '' ORDER BY cuisine_type"
        results = execute_query(query)
        
        if results:
            cuisines = [{"cuisine_type": row['cuisine_type']} for row in results]
            print(f"✅ Found {len(cuisines)} cuisine types from database")
            return jsonify({"cuisines": cuisines})
        else:
            print("⚠️ No cuisine types found in database")
            return jsonify({"cuisines": []})
            
    except Exception as e:
        print(f"❌ Error in get_restaurant_cuisines: {str(e)}")
        if request.path == '/api/ghost/cuisines':
            return jsonify({"suggestion": ""})
        else:
            return jsonify({"cuisines": []})

@app.route("/api/activities/details/<activity_id>", methods=["GET"])
def get_activity_details_api(activity_id):
    """
    Lấy thông tin chi tiết của activity theo activity_id
    """
    try:
        query = """
        SELECT * FROM activities
        WHERE activity_id = %s
        """
        
        restaurant = execute_query(query, (restaurant_id,), fetch_one=True)
        
        if not restaurant:
            return jsonify({'success': False, 'message': 'Restaurant not found'}), 404
        
        return jsonify({
            'success': True,
            'restaurant': restaurant
        })
        
    except Exception as e:
        print(f"❌ Error getting restaurant details: {e}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

@app.route("/api/restaurants/search", methods=["POST"])
def search_restaurants():
    """
    Search restaurants với flexible parameters including cuisine_type
    """
    try:
        data = request.get_json()
        
        # Extract search parameters
        country = data.get('country', '').strip()
        city = data.get('city', '').strip()
        cuisine_type = data.get('cuisine_type', '').strip()
        restaurant_name = data.get('name', '').strip()
        search_query = data.get('searchQuery', '').strip()
        restaurant_id = data.get('restaurant_id')
        
        # BUILD DYNAMIC QUERY
        conditions = ["1=1"]
        params = []
        
        # PRIORITY 1: Restaurant ID cụ thể
        if restaurant_id:
            conditions = ["restaurant_id = %s"]
            params = [restaurant_id]
            
        else:
            # PRIORITY 2: Search query từ thanh search
            if search_query:
                conditions.append("(name LIKE %s OR cuisine_type LIKE %s OR city LIKE %s OR country LIKE %s)")
                params.extend([f"%{search_query}%", f"%{search_query}%", f"%{search_query}%", f"%{search_query}%"])
            
            # PRIORITY 3: Restaurant name
            elif restaurant_name:
                conditions.append("name LIKE %s")
                params.append(f"%{restaurant_name}%")
            
            # OPTIONAL: Country filter - sử dụng so sánh chính xác thay vì LIKE
            if country:
                conditions.append("country = %s")
                params.append(country)
            
            # OPTIONAL: City filter - sử dụng so sánh chính xác thay vì LIKE
            if city:
                conditions.append("city = %s")
                params.append(city)
                
            # OPTIONAL: Cuisine type filter
            if cuisine_type:
                conditions.append("cuisine_type = %s")
                params.append(cuisine_type)
        
        # BUILD FINAL QUERY với sort theo rating và thêm description
        query = f"""
            SELECT restaurant_id, name, cuisine_type, city, country, city_id, 
                   price_avg, rating, latitude, longitude, description
            FROM restaurants
            WHERE {' AND '.join(conditions)}
            ORDER BY rating DESC, price_avg ASC
        """
        
        # Print query and params for debugging
        print(f"Executing restaurant search query: {query}")
        print(f"With params: {params}")
        
        # EXECUTE QUERY
        results = execute_query(query, tuple(params))
        
        if results:
            restaurants = []
            print(f"✅ Found {len(results)} restaurants from database")
            
            for row in results:
                restaurant = {
                    "restaurant_id": row['restaurant_id'],
                    "name": row['name'],
                    "cuisine_type": row['cuisine_type'],
                    "city": row['city'],
                    "country": row['country'],
                    "city_id": row['city_id'],
                    "price_avg": float(row['price_avg']) if row['price_avg'] else 25.0,
                    "rating": float(row['rating']) if row['rating'] else 4.0,
                    "latitude": float(row['latitude']) if row['latitude'] else 0.0,
                    "longitude": float(row['longitude']) if row['longitude'] else 0.0,
                    "description": row['description'] or "No description available"
                }
                restaurants.append(restaurant)
                print(f"  - Restaurant: {restaurant['name']} ({restaurant['city']}, {restaurant['country']})")
            
            return jsonify({"restaurants": restaurants})
            
        else:
            print("No restaurants found in database - returning empty result")
            return jsonify({"restaurants": []})
            
    except Exception as e:
        print(f"Error in search_restaurants: {str(e)}")
        return jsonify({"restaurants": []})

@app.route("/api/restaurants/<string:restaurant_id>", methods=["GET"])
def get_restaurant_by_id(restaurant_id):
    """Lấy thông tin chi tiết của một restaurant từ database"""
    try:
        query = """
            SELECT restaurant_id, name, cuisine_type, city, country, city_id,
                   price_avg, rating, latitude, longitude, description
            FROM restaurants 
            WHERE restaurant_id = %s
        """
        
        result = execute_query(query, (restaurant_id,), fetch_one=True, fetch_all=False)
        
        if result:
            restaurant = {
                "restaurant_id": result['restaurant_id'],
                "name": result['name'],
                "cuisine_type": result['cuisine_type'],
                "city": result['city'],
                "country": result['country'],
                "city_id": result['city_id'],
                "price_avg": float(result['price_avg']) if result['price_avg'] else 25.0,
                "rating": float(result['rating']) if result['rating'] else 4.0,
                "latitude": float(result['latitude']) if result['latitude'] else 0.0,
                "longitude": float(result['longitude']) if result['longitude'] else 0.0,
                "description": result['description'] or "No description available"
            }
            return jsonify({"restaurant": restaurant})
        else:
            return jsonify({"error": "Restaurant not found"}), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ===== GHOST TEXT AUTOCOMPLETE API ENDPOINTS =====

@app.route("/api/ghost/countries", methods=["GET"])
@app.route("/api/autocomplete/countries", methods=["GET"])
def ghost_countries_autocomplete():
    """
    Ghost text autocomplete cho countries từ database
    Truy vấn cả hotels và restaurants table
    """
    try:
        query_string = request.args.get('q', '').strip()
        
        if not query_string or len(query_string) < 2:
            return jsonify({"suggestion": ""})
        
        # Query cả hotels và restaurants để lấy country suggestions
        search_query = """
            (SELECT DISTINCT country FROM hotels WHERE country LIKE %s)
            UNION
            (SELECT DISTINCT country FROM restaurants WHERE country LIKE %s)
            ORDER BY country ASC
            LIMIT 1
        """
        
        search_term = f"{query_string}%"  # Starts with query
        params = (search_term, search_term)
        
        # Use buffered cursor explicitly for this query
        connection = get_db_connection()
        if not connection:
            return jsonify({"suggestion": ""})
            
        cursor = connection.cursor(dictionary=True, buffered=True)
        cursor.execute(search_query, params)
        result = cursor.fetchone()
        cursor.close()
        connection.close()
        
        if result and result['country']:
            return jsonify({"suggestion": result['country']})
        else:
            return jsonify({"suggestion": ""})
            
    except Exception as e:
        print(f"Error in ghost_countries_autocomplete: {str(e)}")
        return jsonify({"suggestion": ""})

@app.route("/api/cities/id", methods=["GET"])
def get_city_id():
    """
    Lấy city_id từ tên city và country
    """
    try:
        city_name = request.args.get('city', '').strip()
        country_name = request.args.get('country', '').strip()
        
        if not city_name:
            return jsonify({"error": "City name is required"}), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "Database connection failed"}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Search for city_id in cities table using LIKE for flexible matching
        if country_name:
            query = "SELECT city_id FROM cities WHERE name LIKE %s AND country LIKE %s LIMIT 1"
            params = (f"%{city_name}%", f"%{country_name}%")
        else:
            query = "SELECT city_id FROM cities WHERE name LIKE %s LIMIT 1"
            params = (f"%{city_name}%",)
        
        cursor.execute(query, params)
        result = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        if result:
            return jsonify({"city_id": result['city_id']})
        else:
            return jsonify({"error": "City not found"}), 404
    
    except Exception as e:
        print(f"Error getting city ID: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/cities/name", methods=["GET"])
def get_city_name():
    """
    Lấy city name từ city_id
    """
    try:
        city_id = request.args.get('city_id', '').strip()
        
        if not city_id:
            return jsonify({"error": "City ID is required"}), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "Database connection failed"}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get city name from cities table
        query = "SELECT name, country FROM cities WHERE city_id = %s LIMIT 1"
        cursor.execute(query, (city_id,))
        result = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        if result:
            return jsonify({
                "name": result['name'],
                "country": result['country']
            })
        else:
            return jsonify({"error": "City not found"}), 404
    
    except Exception as e:
        print(f"Error getting city name: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

# Removed duplicate function - using /api/transports/by-city/<city_id> instead

@app.route("/api/transports", methods=["GET"])
def get_transports():
    """
    Lấy danh sách transports theo city_id hoặc city name
    """
    try:
        city_id = request.args.get('city_id', '').strip()
        city_name = request.args.get('city', '').strip()
        
        if not city_id and not city_name:
            return jsonify({"error": "Either city_id or city name is required"}), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "Database connection failed"}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Ưu tiên tìm kiếm theo city_id nếu có
        if city_id:
            query = """
                SELECT transport_id, type, avg_price_per_km, operating_hours, 
                       min_price, max_capacity, rating
                FROM transports 
                WHERE city_id = %s
                ORDER BY rating DESC, type ASC
            """
            cursor.execute(query, (city_id,))
        else:
            # Tìm kiếm theo city name nếu không có city_id
            query = """
                SELECT transport_id, type, avg_price_per_km, operating_hours, 
                       min_price, max_capacity, rating
                FROM transports 
                WHERE city LIKE %s
                ORDER BY rating DESC, type ASC
            """
            cursor.execute(query, (f"%{city_name}%",))
        
        transports = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({"transports": transports})
    
    except Exception as e:
        print(f"Error getting transports: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/cities/<int:city_id>/activities", methods=["GET"])
def get_activities_by_city_v2(city_id):
    """
    Lấy danh sách activities theo city_id
    """
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "Database connection failed"}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        query = """
            SELECT activity_id, name, description, type, price, 
                   duration_hr, rating, latitude, longitude
            FROM activities 
            WHERE city_id = %s
            ORDER BY rating DESC, name ASC
        """
        cursor.execute(query, (city_id,))
        
        activities = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({"activities": activities})
    
    except Exception as e:
        print(f"Error getting activities for city {city_id}: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/activities", methods=["GET"])
def get_activities():
    """
    Lấy danh sách activities theo city_id hoặc city name
    """
    try:
        city_id = request.args.get('city_id', '').strip()
        city_name = request.args.get('city', '').strip()
        
        if not city_id and not city_name:
            return jsonify({"error": "Either city_id or city name is required"}), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "Database connection failed"}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Ưu tiên tìm kiếm theo city_id nếu có
        if city_id:
            query = """
                SELECT activity_id, name, description, type, price, 
                       duration_hr, rating, latitude, longitude
                FROM activities 
                WHERE city_id = %s
                ORDER BY rating DESC, name ASC
            """
            cursor.execute(query, (city_id,))
        else:
            # Tìm kiếm theo city name nếu không có city_id
            query = """
                SELECT activity_id, name, description, type, price, 
                       duration_hr, rating, latitude, longitude
                FROM activities 
                WHERE city LIKE %s
                ORDER BY rating DESC, name ASC
            """
            cursor.execute(query, (f"%{city_name}%",))
        
        activities = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({"activities": activities})
    
    except Exception as e:
        print(f"Error getting activities: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/ghost/cities", methods=["GET"])
@app.route("/api/autocomplete/cities", methods=["GET"])
def ghost_cities_autocomplete():
    """
    Ghost text autocomplete cho cities từ database
    Truy vấn cả hotels và restaurants table
    """
    try:
        query_string = request.args.get('q', '').strip()
        country = request.args.get('country', '').strip()
        
        if not query_string or len(query_string) < 2:
            return jsonify({"suggestion": ""})
        
        # Nếu có country context, search trong country đó
        if country:
            search_query = """
                (SELECT DISTINCT city FROM hotels WHERE city LIKE %s AND country = %s)
                UNION
                (SELECT DISTINCT city FROM restaurants WHERE city LIKE %s AND country = %s)
                ORDER BY city ASC
                LIMIT 1
            """
            search_term = f"{query_string}%"
            params = (search_term, country, search_term, country)
        else:
            # Không có country context, search tất cả cities
            search_query = """
                (SELECT DISTINCT city FROM hotels WHERE city LIKE %s)
                UNION
                (SELECT DISTINCT city FROM restaurants WHERE city LIKE %s)
                ORDER BY city ASC
                LIMIT 1
            """
            search_term = f"{query_string}%"
            params = (search_term, search_term)
        
        # Use buffered cursor explicitly for this query
        connection = get_db_connection()
        if not connection:
            return jsonify({"suggestion": ""})
            
        cursor = connection.cursor(dictionary=True, buffered=True)
        cursor.execute(search_query, params)
        result = cursor.fetchone()
        cursor.close()
        connection.close()
        
        if result and result['city']:
            return jsonify({"suggestion": result['city']})
        else:
            return jsonify({"suggestion": ""})
            
    except Exception as e:
        print(f"Error in ghost_cities_autocomplete: {str(e)}")
        return jsonify({"suggestion": ""})

@app.route("/api/ghost/restaurants", methods=["GET"])
def ghost_restaurants_autocomplete():
    """
    Ghost text autocomplete cho restaurant names từ database
    """
    try:
        query_string = request.args.get('q', '').strip()
        
        if not query_string or len(query_string) < 2:
            return jsonify({"suggestion": ""})
        
        search_query = """
            SELECT name FROM restaurants 
            WHERE name LIKE %s
            ORDER BY rating DESC, name ASC
            LIMIT 1
        """
        
        search_term = f"{query_string}%"  # Starts with query
        params = (search_term,)
        
        # Use buffered cursor explicitly for this query
        connection = get_db_connection()
        if not connection:
            return jsonify({"suggestion": ""})
            
        cursor = connection.cursor(dictionary=True, buffered=True)
        cursor.execute(search_query, params)
        result = cursor.fetchone()
        cursor.close()
        connection.close()
        
        if result and result['name']:
            return jsonify({"suggestion": result['name']})
        else:
            return jsonify({"suggestion": ""})
            
    except Exception as e:
        print(f"Error in ghost_restaurants_autocomplete: {str(e)}")
        return jsonify({"suggestion": ""})

@app.route("/api/ghost/hotels", methods=["GET"])
def ghost_hotels_autocomplete():
    """
    Ghost text autocomplete cho hotel names từ database
    """
    try:
        query_string = request.args.get('q', '').strip()
        
        if not query_string or len(query_string) < 2:
            return jsonify({"suggestion": ""})
        
        search_query = """
            SELECT name FROM hotels 
            WHERE name LIKE %s
            ORDER BY rating DESC, name ASC
            LIMIT 1
        """
        
        search_term = f"{query_string}%"  # Starts with query
        params = (search_term,)
        
        # Use buffered cursor explicitly for this query
        connection = get_db_connection()
        if not connection:
            return jsonify({"suggestion": ""})
            
        cursor = connection.cursor(dictionary=True, buffered=True)
        cursor.execute(search_query, params)
        result = cursor.fetchone()
        cursor.close()
        connection.close()
        
        if result and result['name']:
            return jsonify({"suggestion": result['name']})
        else:
            return jsonify({"suggestion": ""})
            
    except Exception as e:
        print(f"Error in ghost_hotels_autocomplete: {str(e)}")
        return jsonify({"suggestion": ""})

# ===== ADMIN API ENDPOINTS =====

@app.route("/api/admin/save-config", methods=["POST"])
def save_admin_config():
    """
    Save admin configuration to server
    """
    # Check if user is admin
    if not session.get('is_admin', False):
        return jsonify({'error': 'Unauthorized'}), 403
    
    try:
        config_data = request.get_json()
        
        # Save configuration to a JSON file
        import json
        with open('site_config.json', 'w', encoding='utf-8') as f:
            json.dump(config_data, f, indent=2, ensure_ascii=False)
        
        print("✅ Admin configuration saved successfully")
        
        # Check if theme was changed and if restart is requested
        restart_requested = config_data.get('restartAfterApply', False)
        if restart_requested:
            print("🔄 Theme applied with restart request - Initiating server restart...")
            
            # Send success response first
            response = jsonify({
                'success': True, 
                'message': 'Configuration saved successfully. Server will restart shortly...',
                'restart': True
            })
            
            # Schedule restart after sending response
            import threading
            import time
            import subprocess
            import sys
            
            def delayed_restart():
                time.sleep(2)  # Wait 2 seconds for response to be sent
                print("🚀 Restarting server to apply theme changes...")
                try:
                    # Try graceful restart methods
                    if hasattr(os, 'execv'):
                        # Unix-style restart
                        os.execv(sys.executable, [sys.executable] + sys.argv)
                    else:
                        # Windows fallback - restart Python process
                        subprocess.call([sys.executable] + sys.argv)
                except Exception as restart_error:
                    print(f"⚠️ Restart failed: {restart_error}")
                    print("💡 Please manually restart the server to see theme changes.")
            
            restart_thread = threading.Thread(target=delayed_restart)
            restart_thread.daemon = True
            restart_thread.start()
            
            return response
        else:
            return jsonify({'success': True, 'message': 'Configuration saved successfully'})
        
    except Exception as e:
        print(f"❌ Error saving admin configuration: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route("/api/admin/load-config", methods=["GET"])
def load_admin_config():
    """
    Load admin configuration from server
    """
    try:
        import json
        import os
        
        if os.path.exists('site_config.json'):
            with open('site_config.json', 'r', encoding='utf-8') as f:
                config_data = json.load(f)
                return jsonify({'success': True, 'config': config_data})
        else:
            # Return default configuration
            default_config = {
                "language": {
                    "default": "en",
                    "available": ["en", "vi"]
                },
                "currency": {
                    "default": "USD",
                    "available": ["USD", "VND", "EUR"]
                },
                "theme": {
                    "name": "sunset",
                    "primaryColor": "#F59E0B",
                    "secondaryColor": "#D97706",
                    "accentColor": "#F97316",
                    "layout": "modern"
                },
                "homepage": {
                    "title": {
                        "en": "Vietnam Travel",
                        "vi": "Du Lịch Việt Nam"
                    },
                    "tagline": {
                        "en": "Discover the beauty of Vietnam", 
                        "vi": "Khám phá vẻ đẹp Việt Nam"
                    },
                    "heroTitle": {
                        "en": "Explore Vietnam, Live Your Journey!",
                        "vi": "Khám phá Việt Nam, Sống Hành Trình Của Bạn!"
                    },
                    "featuredDestinations": ["hanoi", "hcm", "danang", "phuquoc", "nhatrang"]
                },
                "userExperience": {
                    "autoSaveHistory": False,
                    "showPriceComparison": True,
                    "enableNotifications": True,
                    "defaultSearchTab": "travel"
                }
            }
            return jsonify({'success': True, 'config': default_config})
            
    except Exception as e:
        print(f"❌ Error loading admin configuration: {str(e)}")
        return jsonify({'error': str(e)}), 500

# ================================================================
#                      USER MANAGEMENT API
# ================================================================

@app.route("/api/admin/users", methods=["GET"])
def get_users():
    """
    Lấy danh sách người dùng với phân trang
    """
    try:
        # Kiểm tra quyền admin
        if not session.get('is_admin'):
            return jsonify({'success': False, 'message': 'Không có quyền admin'}), 403
        
        # Lấy tham số phân trang
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        search = request.args.get('search', '').strip()
        role_filter = request.args.get('role', '')
        
        offset = (page - 1) * limit
        
        # Base query
        where_conditions = []
        params = []
        
        # Tìm kiếm theo tên hoặc email
        if search:
            where_conditions.append("(name LIKE %s OR email LIKE %s)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param])
        
        # Lọc theo vai trò
        if role_filter in ['0', '1']:
            where_conditions.append("is_admin = %s")
            params.append(int(role_filter))
        
        # Xây dựng WHERE clause
        where_clause = ""
        if where_conditions:
            where_clause = "WHERE " + " AND ".join(where_conditions)
        
        # Đếm tổng số users
        count_query = f"SELECT COUNT(*) as total FROM users {where_clause}"
        count_result = execute_query(count_query, params, fetch_one=True)
        total_users = count_result['total'] if count_result else 0
        
        # Lấy danh sách users với phân trang
        users_query = f"""
            SELECT user_id, name, email, phone_number, city, country, gender, birth_year, is_admin 
            FROM users {where_clause}
            ORDER BY user_id DESC
            LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])
        users = execute_query(users_query, params, fetch_all=True)
        
        return jsonify({
            'success': True,
            'users': users,
            'pagination': {
                'current_page': page,
                'total_pages': (total_users + limit - 1) // limit,
                'total_users': total_users,
                'limit': limit
            }
        })
        
    except Exception as e:
        print(f"Error getting users: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route("/api/admin/users/<string:user_id>", methods=["PUT"])
def update_user(user_id):
    """
    Cập nhật thông tin người dùng
    """
    try:
        # Kiểm tra quyền admin
        if not session.get('is_admin'):
            return jsonify({'success': False, 'message': 'Không có quyền admin'}), 403
        
        data = request.get_json()
        
        # Kiểm tra user tồn tại
        check_query = "SELECT user_id FROM users WHERE user_id = %s"
        user_exists = execute_query(check_query, (user_id,), fetch_one=True)
        
        if not user_exists:
            return jsonify({'success': False, 'message': 'Người dùng không tồn tại'}), 404
        
        # Cập nhật thông tin
        update_fields = []
        params = []
        
        if 'name' in data:
            update_fields.append("name = %s")
            params.append(data['name'])
        
        if 'email' in data:
            # Kiểm tra email trùng lặp
            email_check = "SELECT user_id FROM users WHERE email = %s AND user_id != %s"
            email_exists = execute_query(email_check, (data['email'], user_id), fetch_one=True)
            if email_exists:
                return jsonify({'success': False, 'message': 'Email đã tồn tại'}), 400
            
            update_fields.append("email = %s")
            params.append(data['email'])
        
        if 'phone_number' in data:
            update_fields.append("phone_number = %s")
            params.append(data['phone_number'])
        
        if 'city' in data:
            update_fields.append("city = %s")
            params.append(data['city'])
        
        if 'country' in data:
            update_fields.append("country = %s")
            params.append(data['country'])
        
        if 'gender' in data:
            update_fields.append("gender = %s")
            params.append(data['gender'])
        
        if 'birth_year' in data:
            update_fields.append("birth_year = %s")
            params.append(data['birth_year'])
        
        if 'is_admin' in data:
            update_fields.append("is_admin = %s")
            params.append(int(data['is_admin']))
        
        if 'password' in data and data['password'].strip():
            update_fields.append("password = %s")
            params.append(data['password'])
        
        if not update_fields:
            return jsonify({'success': False, 'message': 'Không có thông tin để cập nhật'}), 400
        
        # Thực hiện cập nhật
        params.append(user_id)
        update_query = f"UPDATE users SET {', '.join(update_fields)} WHERE user_id = %s"
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Lỗi kết nối database'}), 500
        
        cursor = connection.cursor()
        cursor.execute(update_query, params)
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({'success': True, 'message': 'Cập nhật thông tin thành công'})
        
    except Exception as e:
        print(f"Error updating user: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route("/api/admin/users/<string:user_id>", methods=["DELETE"])
def delete_user(user_id):
    """
    Xóa người dùng
    """
    try:
        # Kiểm tra quyền admin
        if not session.get('is_admin'):
            return jsonify({'success': False, 'message': 'Không có quyền admin'}), 403
        
        # Không cho phép xóa chính mình
        if session.get('user_id') == user_id:
            return jsonify({'success': False, 'message': 'Không thể xóa tài khoản của chính mình'}), 400
        
        # Kiểm tra user tồn tại
        check_query = "SELECT user_id, name FROM users WHERE user_id = %s"
        user = execute_query(check_query, (user_id,), fetch_one=True)
        
        if not user:
            return jsonify({'success': False, 'message': 'Người dùng không tồn tại'}), 404
        
        # Xóa user
        delete_query = "DELETE FROM users WHERE user_id = %s"
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Lỗi kết nối database'}), 500
        
        cursor = connection.cursor()
        cursor.execute(delete_query, (user_id,))
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({'success': True, 'message': f'Đã xóa người dùng {user["name"]}'})
        
    except Exception as e:
        print(f"Error deleting user: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# Public endpoint để get config cho tất cả users (kể cả anonymous)
@app.route("/api/config", methods=["GET"]) 
def get_public_config():
    """
    Get public configuration accessible to all users including anonymous
    """
    try:
        import json
        import os
        
        if os.path.exists('site_config.json'):
            with open('site_config.json', 'r', encoding='utf-8') as f:
                config_data = json.load(f)
                return jsonify({'success': True, 'config': config_data})
        else:
            # Return default configuration nếu file không tồn tại
            default_config = {
                "language": {
                    "default": "en",
                    "available": ["en", "vi"]
                },
                "currency": {
                    "default": "USD", 
                    "available": ["USD", "VND", "EUR"]
                },
                "theme": {
                    "name": "sunset",
                    "primaryColor": "#3B82F6",
                    "secondaryColor": "#10B981", 
                    "accentColor": "#F59E0B",
                    "layout": "modern"
                },
                "homepage": {
                    "title": {
                        "en": "Vietnam Travel",
                        "vi": "Du Lịch Việt Nam"
                    },
                    "tagline": {
                        "en": "Discover the beauty of Vietnam",
                        "vi": "Khám phá vẻ đẹp Việt Nam"
                    },
                    "heroTitle": {
                        "en": "Explore Vietnam, Live Your Journey!",
                        "vi": "Khám phá Việt Nam, Sống Hành Trình Của Bạn!"
                    },
                    "featuredDestinations": ["hanoi", "hcm", "danang", "phuquoc", "nhatrang"]
                },
                "userExperience": {
                    "autoSaveHistory": False,
                    "showPriceComparison": True,
                    "enableNotifications": True,
                    "defaultSearchTab": "travel"
                }
            }
            return jsonify({'success': True, 'config': default_config})
            
    except Exception as e:
        print(f"❌ Error loading public configuration: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route("/api/check-admin", methods=["GET"])
def check_admin_status():
    """
    Check if current user is admin
    """
    print("🔵 ==> CHECK ADMIN API CALLED <==")
    print(f"🔍 Full session data: {dict(session)}")
    
    user_id = session.get('user_id')
    is_admin = session.get('is_admin', False)
    user_name = session.get('user_name')
    user_email = session.get('user_email')
    
    print(f"🔍 Session values:")
    print(f"  - user_id: {user_id} (type: {type(user_id)})")
    print(f"  - is_admin: {is_admin} (type: {type(is_admin)})")
    print(f"  - user_name: {user_name}")
    print(f"  - user_email: {user_email}")
    
    result = {
        'is_admin': is_admin,
        'user_id': user_id,
        'user_name': user_name,
        'email': user_email
    }
    
    print(f"✅ Returning admin status: {result}")
    
    return jsonify(result)

# ============== TOUR HISTORY APIs ==============

@app.route("/api/tour-history", methods=["GET"])
def get_tour_history():
    """
    Lấy lịch sử tour của user đã đăng nhập
    """
    try:
        # Kiểm tra user đã đăng nhập
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first'}), 401
        
        user_id = session['user_id']
        
        # Lấy parameters cho phân trang
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 9))  # Changed from 10 to 9 items per page
        offset = (page - 1) * limit
        
        # Query lấy tour history với tour recommendations
        query = """
        SELECT 
            tr.tour_id,
            tr.option_id,
            tr.total_estimated_cost,
            tr.currency,
            tour_opt.guest_count,
            tour_opt.duration_days,
            tour_opt.target_budget,
            tour_opt.rating,
            sc.name AS start_city_name,
            sc.country AS start_country,
            dc.name AS destination_city_name,
            dc.country AS destination_country
        FROM tour_recommendations tr
        INNER JOIN tour_options tour_opt ON tr.option_id = tour_opt.option_id
        INNER JOIN cities sc ON tour_opt.start_city_id = sc.city_id
        INNER JOIN cities dc ON tour_opt.destination_city_id = dc.city_id
        WHERE tour_opt.user_id = %s
        ORDER BY tr.tour_id DESC
        """
        
        # Get all tours first (remove limit for now as user requested no limit)
        tours = execute_query(query, (user_id,), fetch_all=True)
        
        # Count total tours
        count_query = """
        SELECT COUNT(*) as total 
        FROM tour_recommendations tr
        INNER JOIN tour_options tour_opt ON tr.option_id = tour_opt.option_id
        WHERE tour_opt.user_id = %s
        """
        count_result = execute_query(count_query, (user_id,), fetch_one=True)
        total_tours = count_result['total'] if count_result else 0
        
        # Format response
        formatted_tours = []
        for tour in tours:
            formatted_tour = {
                'tour_id': tour['tour_id'],
                'option_id': tour['option_id'],
                'start_location': f"{tour['start_city_name']}, {tour['start_country']}",
                'destination': f"{tour['destination_city_name']}, {tour['destination_country']}",
                'duration_days': tour['duration_days'],
                'guest_count': tour['guest_count'],
                'total_cost': float(tour['total_estimated_cost']) if tour['total_estimated_cost'] else 0,
                'target_budget': float(tour['target_budget']) if tour['target_budget'] else 0,
                'currency': tour['currency'] or 'USD',
                'rating': float(tour['rating']) if tour['rating'] else 0
            }
            formatted_tours.append(formatted_tour)
        
        return jsonify({
            'success': True,
            'tours': formatted_tours,
            'pagination': {
                'current_page': page,
                'total_pages': (total_tours + limit - 1) // limit,
                'total_tours': total_tours,
                'limit': limit
            }
        })
        
    except Exception as e:
        print(f"❌ Error in get_tour_history: {e}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

@app.route("/api/tour-history/<string:tour_id>", methods=["GET"])
def get_tour_detail(tour_id):
    """
    Lấy chi tiết lịch trình tour theo tour_id
    """
    try:
        print(f"🔍 Fetching tour details for tour_id: {tour_id}")
        
        # Kiểm tra user đã đăng nhập
        if 'user_id' not in session:
            print("❌ User not logged in")
            # For testing, allow access without login
            if tour_id.startswith("O"):
                print("⚠️ Using option_id directly without login check")
                # If this is an option_id directly, not a tour_id
                option_id = tour_id
            else:
                return jsonify({'success': False, 'message': 'Please login first'}), 401
        else:
            user_id = session['user_id']
            
            # If tour_id starts with O, it might be an option_id instead of a tour_id
            if tour_id.startswith("O"):
                print(f"⚠️ Using option_id: {tour_id} directly")
                option_id = tour_id
            else:
                # Kiểm tra tour có thuộc về user này không
                auth_query = """
                SELECT tr.tour_id, tr.option_id
                FROM tour_recommendations tr
                INNER JOIN tour_options tour_opt ON tr.option_id = tour_opt.option_id
                WHERE tr.tour_id = %s AND tour_opt.user_id = %s
                """
                auth_check = execute_query(auth_query, (tour_id, user_id), fetch_one=True)
                
                if not auth_check:
                    print(f"❌ Tour {tour_id} not found or access denied for user {user_id}")
                    return jsonify({'success': False, 'message': 'Tour not found or access denied'}), 404
                
                option_id = auth_check['option_id']
                print(f"✅ Found option_id: {option_id} for tour_id: {tour_id}")
        
        # Lấy thông tin tour cơ bản với option_id
        tour_info_query = """
        SELECT 
            COALESCE(tr.tour_id, %s) AS tour_id,
            t.option_id,
            tr.total_estimated_cost,
            tr.currency,
            t.guest_count,
            t.duration_days,
            t.target_budget,
            t.currency AS option_currency,
            t.rating,
            sc.name AS start_city_name,
            sc.country AS start_country,
            dc.name AS destination_city_name,
            dc.country AS destination_country
        FROM tour_options t
        LEFT JOIN tour_recommendations tr ON t.option_id = tr.option_id
        LEFT JOIN cities sc ON t.start_city_id = sc.city_id
        LEFT JOIN cities dc ON t.destination_city_id = dc.city_id
        WHERE t.option_id = %s
        """
        
        print(f"🔍 Executing tour info query for option_id: {option_id}")
        tour_info = execute_query(tour_info_query, (tour_id, option_id), fetch_one=True)
        
        if not tour_info:
            print(f"❌ No tour info found for option_id: {option_id}")
            # Fallback to mock data for demo purposes
            mock_tour = {
                'tour_id': tour_id,
                'option_id': option_id if tour_id.startswith("O") else "O0889",
                'start_city_name': 'Ha Noi',
                'start_country': 'Vietnam',
                'destination_city_name': 'Da Nang',
                'destination_country': 'Vietnam',
                'guest_count': 2,
                'duration_days': 3,
                'total_estimated_cost': 350.0,
                'target_budget': 500.0,
                'currency': 'USD',
                'rating': 8.5
            }
            
            print("⚠️ Using mock tour data")
            tour_info = mock_tour
            mock_daily_schedule = {
                1: [
                    {
                        'item_id': 'I0001',
                        'sequence': 1,
                        'start_time': '08:00:00',
                        'end_time': '10:00:00',
                        'place_type': 'transport',
                        'place_id': 'T0001',
                        'place_name': 'Flight',
                        'place_city': 'Ha Noi',
                        'cost': 150.0
                    },
                    {
                        'item_id': 'I0002',
                        'sequence': 2,
                        'start_time': '12:00:00',
                        'end_time': '14:00:00',
                        'place_type': 'restaurant',
                        'place_id': 'R0001',
                        'place_name': 'Local Restaurant',
                        'place_city': 'Da Nang',
                        'cost': 20.0
                    },
                    {
                        'item_id': 'I0003',
                        'sequence': 3,
                        'start_time': '15:00:00',
                        'end_time': '18:00:00',
                        'place_type': 'activity',
                        'place_id': 'A0001',
                        'place_name': 'My Khe Beach',
                        'place_city': 'Da Nang',
                        'cost': 0.0
                    },
                    {
                        'item_id': 'I0004',
                        'sequence': 4,
                        'start_time': '19:00:00',
                        'end_time': '21:00:00',
                        'place_type': 'restaurant',
                        'place_id': 'R0002',
                        'place_name': 'Seafood Restaurant',
                        'place_city': 'Da Nang',
                        'cost': 30.0
                    }
                ],
                2: [
                    {
                        'item_id': 'I0005',
                        'sequence': 1,
                        'start_time': '08:00:00',
                        'end_time': '12:00:00',
                        'place_type': 'activity',
                        'place_id': 'A0002',
                        'place_name': 'Marble Mountains',
                        'place_city': 'Da Nang',
                        'cost': 10.0
                    },
                    {
                        'item_id': 'I0006',
                        'sequence': 2,
                        'start_time': '13:00:00',
                        'end_time': '15:00:00',
                        'place_type': 'restaurant',
                        'place_id': 'R0003',
                        'place_name': 'Vietnamese Cuisine',
                        'place_city': 'Da Nang',
                        'cost': 15.0
                    },
                    {
                        'item_id': 'I0007',
                        'sequence': 3,
                        'start_time': '16:00:00',
                        'end_time': '18:00:00',
                        'place_type': 'activity',
                        'place_id': 'A0003',
                        'place_name': 'Dragon Bridge',
                        'place_city': 'Da Nang',
                        'cost': 0.0
                    }
                ],
                3: [
                    {
                        'item_id': 'I0008',
                        'sequence': 1,
                        'start_time': '09:00:00',
                        'end_time': '12:00:00',
                        'place_type': 'activity',
                        'place_id': 'A0004',
                        'place_name': 'Ba Na Hills',
                        'place_city': 'Da Nang',
                        'cost': 35.0
                    },
                    {
                        'item_id': 'I0009',
                        'sequence': 2,
                        'start_time': '13:00:00',
                        'end_time': '15:00:00',
                        'place_type': 'restaurant',
                        'place_id': 'R0004',
                        'place_name': 'Mountain View Restaurant',
                        'place_city': 'Da Nang',
                        'cost': 25.0
                    },
                    {
                        'item_id': 'I0010',
                        'sequence': 3,
                        'start_time': '18:00:00',
                        'end_time': '20:00:00',
                        'place_type': 'hotel',
                        'place_id': 'H0001',
                        'place_name': 'Luxury Resort',
                        'place_city': 'Da Nang',
                        'cost': 65.0
                    }
                ]
            }
            
            # Format response with mock data
            tour_detail = {
                'tour_id': tour_info['tour_id'],
                'option_id': tour_info['option_id'],
                'start_city_name': tour_info['start_city_name'],
                'start_country': tour_info['start_country'],
                'destination_city_name': tour_info['destination_city_name'],
                'destination_country': tour_info['destination_country'],
                'duration_days': tour_info['duration_days'],
                'guest_count': tour_info['guest_count'],
                'total_estimated_cost': float(tour_info['total_estimated_cost']) if tour_info['total_estimated_cost'] else 0,
                'target_budget': float(tour_info['target_budget']) if tour_info['target_budget'] else 0,
                'currency': tour_info['currency'] or 'USD',
                'rating': float(tour_info['rating']) if tour_info['rating'] else 0,
                'daily_schedule': mock_daily_schedule
            }
            
            return jsonify({
                'success': True,
                'tour': tour_detail
            })
        
        print(f"✅ Tour info found: {tour_info}")
        
        # Lấy lịch trình chi tiết theo ngày theo logic database mà user mô tả
        try:
            print(f"🔍 Looking for schedule data for option_id: {option_id}")
            
            # Theo user: dựa vào option_id tham chiếu qua table tour_days để lấy tour_day_id và day_number
            # Sau đó qua tour_schedule_items để lấy các items theo tour_day_id
            schedule_query = """
            SELECT 
                td.day_number,
                td.tour_day_id,
                tsi.item_id,
                tsi.seq,
                tsi.start_time,
                tsi.end_time,
                tsi.place_type,
                tsi.place_id,
                tsi.cost,
                CASE 
                    WHEN tsi.place_type = 'hotel' THEN h.name
                    WHEN tsi.place_type = 'restaurant' THEN r.name  
                    WHEN tsi.place_type = 'activity' THEN a.name
                    WHEN tsi.place_type = 'transport' THEN tr.type
                    ELSE 'Unknown'
                END AS place_name,
                CASE 
                    WHEN tsi.place_type = 'hotel' THEN h.city
                    WHEN tsi.place_type = 'restaurant' THEN r.city
                    WHEN tsi.place_type = 'activity' THEN a.city
                    WHEN tsi.place_type = 'transport' THEN tr.city
                    ELSE ''
                END AS place_city
            FROM tour_days td
            INNER JOIN tour_schedule_items tsi ON td.tour_day_id = tsi.tour_day_id
            LEFT JOIN hotels h ON tsi.place_type = 'hotel' AND tsi.place_id = h.hotel_id
            LEFT JOIN restaurants r ON tsi.place_type = 'restaurant' AND tsi.place_id = r.restaurant_id
            LEFT JOIN activities a ON tsi.place_type = 'activity' AND tsi.place_id = a.activity_id
            LEFT JOIN transports tr ON tsi.place_type = 'transport' AND tsi.place_id = tr.transport_id
            WHERE td.tour_id IN (
                SELECT tour_id 
                FROM tour_recommendations 
                WHERE option_id = %s
            )
            ORDER BY td.day_number, tsi.seq
            """
            
            schedule_items = execute_query(schedule_query, (option_id,), fetch_all=True)
            
            if not schedule_items:
                print(f"⚠️ No schedule items found for option_id: {option_id}")
                # Try alternative approach - direct lookup with tour_id if available
                if tour_info.get('tour_id') and tour_info['tour_id'] != option_id:
                    print(f"🔄 Trying alternative lookup with tour_id: {tour_info['tour_id']}")
                    schedule_items = execute_query(schedule_query.replace("WHERE td.tour_id IN (\n                SELECT tour_id \n                FROM tour_recommendations \n                WHERE option_id = %s\n            )", "WHERE td.tour_id = %s"), (tour_info['tour_id'],), fetch_all=True)
                
                if not schedule_items:
                    raise Exception("No schedule items found")
            
            print(f"✅ Found {len(schedule_items)} schedule items")
            
            # Tổ chức lịch trình theo ngày
            daily_schedule = {}
            for item in schedule_items:
                day = item['day_number']
                if day not in daily_schedule:
                    daily_schedule[day] = []
                
                daily_schedule[day].append({
                    'item_id': item['item_id'],
                    'sequence': item['seq'],
                    'start_time': item['start_time'],
                    'end_time': item['end_time'],
                    'place_type': item['place_type'],
                    'place_id': item['place_id'],
                    'place_name': item['place_name'],
                    'place_city': item['place_city'],
                    'cost': float(item['cost']) if item['cost'] else 0
                })
        
        except Exception as schedule_error:
            print(f"⚠️ Error getting schedule: {schedule_error}. Using mock schedule.")
            
            # Use mock schedule as fallback
            daily_schedule = {
                1: [
                    {
                        'item_id': 'I0001',
                        'sequence': 1,
                        'start_time': '08:00:00',
                        'end_time': '10:00:00',
                        'place_type': 'transport',
                        'place_id': 'T0001',
                        'place_name': 'Flight',
                        'place_city': tour_info['start_city_name'],
                        'cost': 150.0
                    },
                    {
                        'item_id': 'I0002',
                        'sequence': 2,
                        'start_time': '12:00:00',
                        'end_time': '14:00:00',
                        'place_type': 'restaurant',
                        'place_id': 'R0001',
                        'place_name': 'Local Restaurant',
                        'place_city': tour_info['destination_city_name'],
                        'cost': 20.0
                    }
                ],
                2: [
                    {
                        'item_id': 'I0003',
                        'sequence': 1,
                        'start_time': '09:00:00',
                        'end_time': '12:00:00',
                        'place_type': 'activity',
                        'place_id': 'A0001',
                        'place_name': 'City Tour',
                        'place_city': tour_info['destination_city_name'],
                        'cost': 30.0
                    }
                ],
                3: [
                    {
                        'item_id': 'I0004',
                        'sequence': 1,
                        'start_time': '10:00:00',
                        'end_time': '18:00:00',
                        'place_type': 'activity',
                        'place_id': 'A0002',
                        'place_name': 'Beach Day',
                        'place_city': tour_info['destination_city_name'],
                        'cost': 0.0
                    }
                ]
            }
        
        # Format response
        tour_detail = {
            'tour_id': tour_info['tour_id'],
            'option_id': tour_info['option_id'],
            'start_location': f"{tour_info['start_city_name']}, {tour_info['start_country']}",
            'destination': f"{tour_info['destination_city_name']}, {tour_info['destination_country']}",
            'start_city_name': tour_info['start_city_name'],
            'start_country': tour_info['start_country'],
            'destination_city_name': tour_info['destination_city_name'],
            'destination_country': tour_info['destination_country'],
            'duration_days': tour_info['duration_days'],
            'guest_count': tour_info['guest_count'],
            'total_cost': float(tour_info['total_estimated_cost']) if tour_info['total_estimated_cost'] else 0,
            'target_budget': float(tour_info['target_budget']) if tour_info['target_budget'] else 0,
            'currency': tour_info['currency'] or tour_info['option_currency'] or 'USD',
            'rating': float(tour_info['rating']) if tour_info['rating'] else 0,
            'daily_schedule': daily_schedule
        }
        
        print(f"✅ Returning tour detail with {len(daily_schedule)} days")
        
        return jsonify({
            'success': True,
            'data': tour_detail
        })
        
    except Exception as e:
        print(f"❌ Error in get_tour_detail: {e}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

# ============== ADMIN TOUR MANAGEMENT APIs ==============

@app.route("/api/admin/tours", methods=["GET"])
def admin_get_tours():
    """
    Admin: Lấy danh sách tất cả tours với khả năng filter theo địa điểm
    """
    try:
        # Kiểm tra quyền admin
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first'}), 401
        
        # Kiểm tra admin
        user_admin_query = "SELECT is_admin FROM users WHERE user_id = %s"
        admin_check = execute_query(user_admin_query, (session['user_id'],), fetch_one=True)
        
        if not admin_check or not admin_check.get('is_admin'):
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        # Get filter parameters
        start_city = request.args.get('start_city', '')
        destination_city = request.args.get('destination_city', '')
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        
        print(f"🔍 Admin tours query - start_city: {start_city}, destination_city: {destination_city}")
        
        # Build dynamic query sử dụng bảng mapping
        base_query = """
        SELECT 
            t.option_id,
            t.user_id,
            u.name AS user_name,
            u.email AS user_email,
            t.guest_count,
            t.duration_days,
            t.target_budget,
            t.currency,
            t.rating,
            sc.name AS start_city_name,
            sc.country AS start_country,
            dc.name AS destination_city_name,
            dc.country AS destination_country,
            h.name AS hotel_name,
            r.name AS restaurant_name,
            a.name AS activity_name,
            tr.type AS transport_type
        FROM tour_options t
        LEFT JOIN users u ON t.user_id = u.user_id
        LEFT JOIN cities sc ON t.start_city_id = sc.city_id
        LEFT JOIN cities dc ON t.destination_city_id = dc.city_id
        LEFT JOIN tour_options_hotels toh ON t.option_id = toh.option_id
        LEFT JOIN hotels h ON toh.hotel_id = h.hotel_id
        LEFT JOIN tour_options_restaurants tor ON t.option_id = tor.option_id
        LEFT JOIN restaurants r ON tor.restaurant_id = r.restaurant_id
        LEFT JOIN tour_options_activities toa ON t.option_id = toa.option_id
        LEFT JOIN activities a ON toa.activity_id = a.activity_id
        LEFT JOIN tour_options_transports tot ON t.option_id = tot.option_id
        LEFT JOIN transports tr ON tot.transport_id = tr.transport_id
        """
        
        conditions = []
        params = []
        
        if start_city:
            conditions.append("sc.name LIKE %s")
            params.append(f"%{start_city}%")
        
        if destination_city:
            conditions.append("dc.name LIKE %s")
            params.append(f"%{destination_city}%")
        
        if conditions:
            base_query += " WHERE " + " AND ".join(conditions)
        
        base_query += " ORDER BY t.option_id DESC LIMIT %s OFFSET %s"  # Sử dụng option_id thay cho created_at
        params.extend([limit, offset])
        
        tours = execute_query(base_query, tuple(params), fetch_all=True)
        
        # Count total
        count_query = "SELECT COUNT(*) as total FROM tour_options t LEFT JOIN cities sc ON t.start_city_id = sc.city_id LEFT JOIN cities dc ON t.destination_city_id = dc.city_id"
        if conditions:
            count_query += " WHERE " + " AND ".join(conditions)
            total_result = execute_query(count_query, tuple(params[:len(conditions)]), fetch_one=True)
        else:
            total_result = execute_query(count_query, (), fetch_one=True)
        
        total_count = total_result['total'] if total_result else 0
        
        # Format data
        formatted_tours = []
        for tour in tours:
            formatted_tour = {
                'id': tour['option_id'],
                'user': {
                    'id': tour['user_id'],
                    'name': tour['user_name'],
                    'email': tour['user_email']
                },
                'start_city': f"{tour['start_city_name']}, {tour['start_country']}" if tour['start_city_name'] else '',
                'destination_city': f"{tour['destination_city_name']}, {tour['destination_country']}" if tour['destination_city_name'] else '',
                'duration_days': tour['duration_days'],
                'guest_count': tour['guest_count'],
                'target_budget': float(tour['target_budget']) if tour['target_budget'] else 0,
                'currency': tour['currency'] or 'USD',
                'rating': float(tour['rating']) if tour['rating'] else 0,
                'created_at': '',  # Loại bỏ tham chiếu đến created_at không tồn tại
                'hotel_name': tour['hotel_name'],
                'restaurant_name': tour['restaurant_name'],
                'activity_name': tour['activity_name'],
                'transport_type': tour['transport_type']
            }
            formatted_tours.append(formatted_tour)
        
        return jsonify({
            'success': True,
            'data': formatted_tours,
            'total_count': total_count,
            'current_page': offset // limit + 1,
            'total_pages': (total_count + limit - 1) // limit
        })
        
    except Exception as e:
        print(f"❌ Error in admin tours: {e}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

@app.route("/api/admin/customers-by-location", methods=["GET"])
def admin_customers_by_location():
    """
    Admin: Lấy danh sách khách hàng đã đi tour theo địa điểm cụ thể
    """
    try:
        # Kiểm tra quyền admin
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first'}), 401
        
        user_admin_query = "SELECT is_admin FROM users WHERE user_id = %s"
        admin_check = execute_query(user_admin_query, (session['user_id'],), fetch_one=True)
        
        if not admin_check or not admin_check.get('is_admin'):
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        # Get location parameter
        location = request.args.get('location', '')
        
        if not location:
            return jsonify({'success': False, 'message': 'Location parameter is required'}), 400
        
        print(f"🔍 Getting customers by location: {location}")
        
        # Query khách hàng theo địa điểm
        query = """
        SELECT DISTINCT
            u.user_id,
            u.name,
            u.email,
            u.city AS user_city,
            u.country AS user_country,
            COUNT(t.option_id) AS tour_count,
            NULL AS last_tour_date,  # Loại bỏ tham chiếu đến created_at không tồn tại
            AVG(t.target_budget) AS avg_spending
        FROM users u
        INNER JOIN tour_options t ON u.user_id = t.user_id
        INNER JOIN cities sc ON t.start_city_id = sc.city_id
        INNER JOIN cities dc ON t.destination_city_id = dc.city_id
        WHERE sc.name LIKE %s OR dc.name LIKE %s
        GROUP BY u.user_id, u.name, u.email, u.city, u.country
        ORDER BY tour_count DESC, last_tour_date DESC
        """
        
        location_pattern = f"%{location}%"
        customers = execute_query(query, (location_pattern, location_pattern), fetch_all=True)
        
        # Format data
        formatted_customers = []
        for customer in customers:
            formatted_customer = {
                'id': customer['user_id'],
                'name': customer['name'],
                'email': customer['email'],
                'location': f"{customer['user_city']}, {customer['user_country']}" if customer['user_city'] else '',
                'tour_count': customer['tour_count'],
                'last_tour_date': customer['last_tour_date'].strftime('%Y-%m-%d') if customer['last_tour_date'] else '',
                'avg_spending': float(customer['avg_spending']) if customer['avg_spending'] else 0
            }
            formatted_customers.append(formatted_customer)
        
        return jsonify({
            'success': True,
            'data': formatted_customers,
            'location_searched': location,
            'total_customers': len(formatted_customers)
        })
        
    except Exception as e:
        print(f"❌ Error getting customers by location: {e}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

# Removed duplicate route - the complete implementation is at line 4988

# Tour Recommendation System Logic
class UserTourInfo:
    """Class to hold user tour preferences"""
    def __init__(self, data):
        self.user_id = data['user_id']
        self.start_city_id = data['start_city_id']
        self.destination_city_id = data['destination_city_id']
        self.hotel_ids = data['hotel_ids']
        self.activity_ids = data['activity_ids']
        self.restaurant_ids = data['restaurant_ids']
        self.transport_ids = data['transport_ids']
        self.guest_count = data['guest_count']
        self.duration_days = data['duration_days']
        self.target_budget = data['target_budget']

def get_city_name_by_id(city_id):
    """Get city name from city_id"""
    query = "SELECT name FROM cities WHERE city_id = %s LIMIT 1"
    result = execute_query(query, (city_id,), fetch_one=True)
    return result['name'] if result else "Unknown City"

def get_tour_id():
    """Generate a new tour ID"""
    # Get the next tour ID
    query = "SELECT COUNT(*) as count FROM tour_recommendations"
    result = execute_query(query, fetch_one=True)
    next_num = (result['count'] if result else 0) + 43  # Starting from O0043
    return f"O{next_num:04d}"

def get_place_details(place_id, place_type):
    """Get details of a place by its ID and type"""
    if place_type == 'hotel':
        table = 'hotels'
    elif place_type == 'activity':
        table = 'activities'
    elif place_type == 'restaurant':
        table = 'restaurants'
    elif place_type == 'transport':
        table = 'transports'
    else:
        return None
    
    query = f"SELECT * FROM {table} WHERE {place_type}_id = %s LIMIT 1"
    return execute_query(query, (place_id,), fetch_one=True)

def get_places_by_city(city_id, place_type, limit=10):
    """Get places by city ID and type"""
    if place_type == 'hotel':
        table = 'hotels'
        id_field = 'hotel_id'
    elif place_type == 'activity':
        table = 'activities'
        id_field = 'activity_id'
    elif place_type == 'restaurant':
        table = 'restaurants'
        id_field = 'restaurant_id'
    elif place_type == 'transport':
        table = 'transports'
        id_field = 'transport_id'
    else:
        return []
    
    query = f"""
        SELECT {id_field}, name, rating, price_per_night, price_avg, price, avg_price_per_km
        FROM {table}
        WHERE city_id = %s
        ORDER BY rating DESC
        LIMIT %s
    """
    
    results = execute_query(query, (city_id, limit))
    return results if results else []

def get_collaborative_recommendations(user_id, city_id, place_type, limit=5):
    """Simple collaborative filtering based on user history"""
    # This is a simplified collaborative filtering approach
    # In a real system, you'd analyze user-item interactions more deeply
    
    # Get top-rated places in this city as a fallback
    top_places = get_places_by_city(city_id, place_type, limit)
    
    # For now, just return these top places as recommendations
    # In a real system, you'd use past user behavior to find similar users
    return top_places

def get_content_based_recommendations(preferred_ids, city_id, place_type, limit=5):
    """Content-based recommendations based on user preferences"""
    if not preferred_ids:
        # If no preferences, return top-rated places
        return get_places_by_city(city_id, place_type, limit)
    
    # Get details of preferred places
    preferred_places = []
    for place_id in preferred_ids:
        place = get_place_details(place_id, place_type)
        if place:
            preferred_places.append(place)
    
    if not preferred_places:
        # If no valid preferences, return top-rated places
        return get_places_by_city(city_id, place_type, limit)
    
    # Get all places in the destination city
    all_places = get_places_by_city(city_id, place_type, 100)  # Get more places to find similar ones
    
    if not all_places:
        return []
    
    # Extract features for comparison (e.g., price, rating)
    features = []
    for place in all_places:
        # Extract relevant features depending on place type
        if place_type == 'hotel':
            price = place.get('price_per_night', 0)
        elif place_type == 'activity':
            price = place.get('price', 0)
        elif place_type == 'restaurant':
            price = place.get('price_avg', 0)
        elif place_type == 'transport':
            price = place.get('avg_price_per_km', 0)
        else:
            price = 0
        
        rating = place.get('rating', 0)
        features.append([price, rating])
    
    # Extract features for preferred places
    pref_features = []
    for place in preferred_places:
        if place_type == 'hotel':
            price = place.get('price_per_night', 0)
        elif place_type == 'activity':
            price = place.get('price', 0)
        elif place_type == 'restaurant':
            price = place.get('price_avg', 0)
        elif place_type == 'transport':
            price = place.get('avg_price_per_km', 0)
        else:
            price = 0
        
        rating = place.get('rating', 0)
        pref_features.append([price, rating])
    
    # Convert to numpy arrays
    features_array = np.array(features)
    pref_features_array = np.array(pref_features)
    
    # Handle missing values
    imputer = SimpleImputer(strategy='mean')
    features_array = imputer.fit_transform(features_array)
    pref_features_array = imputer.transform(pref_features_array)
    
    # Normalize features
    scaler = StandardScaler()
    features_array = scaler.fit_transform(features_array)
    pref_features_array = scaler.transform(pref_features_array)
    
    # Calculate average preferred features
    avg_pref_features = np.mean(pref_features_array, axis=0).reshape(1, -1)
    
    # Calculate similarity scores
    similarities = cosine_similarity(features_array, avg_pref_features).flatten()
    
    # Sort places by similarity
    similar_indices = similarities.argsort()[::-1][:limit]
    
    # Return recommended places
    recommendations = [all_places[i] for i in similar_indices]
    return recommendations

def build_schedule_day(day_number, city_id, user_input):
    """Build a schedule for a single day"""
    # Get recommendations for activities, restaurants, and transport
    activities = get_content_based_recommendations(user_input.activity_ids, city_id, 'activity', 5)
    restaurants = get_content_based_recommendations(user_input.restaurant_ids, city_id, 'restaurant', 3)
    transports = get_content_based_recommendations(user_input.transport_ids, city_id, 'transport', 2)
    
    # Build a day schedule
    schedule_items = []
    
    # Start time (8:00 AM)
    current_time = "08:00:00"
    
    # Add morning activity
    if activities and len(activities) > 0:
        end_time = advance_time(current_time, 120)  # 2 hours
        schedule_items.append({
            "start_time": current_time,
            "end_time": end_time,
            "place_id": activities[0]['activity_id'],
            "place_name": activities[0]['name'],
            "type": "activity",
            "cost": float(activities[0].get('price', 0))
        })
        current_time = end_time
    
    # Add lunch
    if restaurants and len(restaurants) > 0:
        end_time = advance_time(current_time, 90)  # 1.5 hours
        schedule_items.append({
            "start_time": current_time,
            "end_time": end_time,
            "place_id": restaurants[0]['restaurant_id'],
            "place_name": restaurants[0]['name'],
            "type": "restaurant",
            "cost": float(restaurants[0].get('price_avg', 0))
        })
        current_time = end_time
    
    # Add afternoon transport
    if transports and len(transports) > 0:
        end_time = advance_time(current_time, 60)  # 1 hour
        schedule_items.append({
            "start_time": current_time,
            "end_time": end_time,
            "place_id": transports[0]['transport_id'],
            "place_name": transports[0].get('type', "Transport"),
            "type": "transport",
            "cost": float(transports[0].get('avg_price_per_km', 0)) * 10  # Assume 10 km
        })
        current_time = end_time
    
    # Add afternoon activity
    if activities and len(activities) > 1:
        end_time = advance_time(current_time, 150)  # 2.5 hours
        schedule_items.append({
            "start_time": current_time,
            "end_time": end_time,
            "place_id": activities[1]['activity_id'],
            "place_name": activities[1]['name'],
            "type": "activity",
            "cost": float(activities[1].get('price', 0))
        })
        current_time = end_time
    
    # Add dinner
    if restaurants and len(restaurants) > 1:
        end_time = advance_time(current_time, 120)  # 2 hours
        schedule_items.append({
            "start_time": current_time,
            "end_time": end_time,
            "place_id": restaurants[1]['restaurant_id'],
            "place_name": restaurants[1]['name'],
            "type": "restaurant",
            "cost": float(restaurants[1].get('price_avg', 0))
        })
    
    return {
        "day": day_number,
        "activities": schedule_items
    }

def advance_time(time_str, minutes):
    """Advance time by minutes"""
    hours, mins, secs = map(int, time_str.split(':'))
    total_mins = hours * 60 + mins + minutes
    new_hours = (total_mins // 60) % 24
    new_mins = total_mins % 60
    return f"{new_hours:02d}:{new_mins:02d}:00"

def build_final_tour_json(user_input, mode='auto'):
    """Build the final tour JSON structure"""
    tour_id = get_tour_id()
    
    # Get city names
    start_city = get_city_name_by_id(user_input.start_city_id)
    destination_city = get_city_name_by_id(user_input.destination_city_id)
    
    # Build schedule for each day
    schedule = []
    for day in range(1, user_input.duration_days + 1):
        day_schedule = build_schedule_day(day, user_input.destination_city_id, user_input)
        schedule.append(day_schedule)
    
    # Calculate total cost
    total_cost = 0
    for day in schedule:
        for activity in day['activities']:
            total_cost += activity['cost']
    
    # Build the final tour object
    tour = {
        "tour_id": tour_id,
        "user_id": user_input.user_id,
        "start_city": start_city,
        "destination_city": destination_city,
        "duration_days": user_input.duration_days,
        "guest_count": user_input.guest_count,
        "budget": user_input.target_budget,
        "total_estimated_cost": total_cost,
        "schedule": schedule
    }
    
    return tour

# ============== ADMIN CRUD APIs ==============

@app.route("/api/admin/hotels", methods=["POST"])
def admin_add_hotel():
    """
    Admin: Thêm khách sạn mới
    """
    try:
        # Kiểm tra quyền admin
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first'}), 401
        
        user_admin_query = "SELECT is_admin FROM users WHERE user_id = %s"
        admin_check = execute_query(user_admin_query, (session['user_id'],), fetch_one=True)
        
        if not admin_check or not admin_check.get('is_admin'):
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'city', 'country']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field} is required'}), 400
        
        # Auto-generate hotel_id if not provided
        if not data.get('hotel_id'):
            # Get next hotel ID
            count_query = "SELECT COUNT(*) as count FROM hotels"
            count_result = execute_query(count_query, fetch_one=True)
            next_num = (count_result['count'] if count_result else 0) + 1
            data['hotel_id'] = f"H{next_num:04d}"
        
        # Auto-fill city_id if not provided
        if not data.get('city_id'):
            city_query = """
            SELECT city_id FROM cities 
            WHERE LOWER(city) = LOWER(%s) AND LOWER(country) = LOWER(%s)
            LIMIT 1
            """
            city_result = execute_query(city_query, (data['city'], data['country']), fetch_one=True)
            data['city_id'] = city_result['city_id'] if city_result else 1
        
        # Insert hotel with proper schema
        insert_query = """
        INSERT INTO hotels (hotel_id, name, city_id, city, country, stars, price_per_night, rating, latitude, longitude, description)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        params = (
            data['hotel_id'],
            data['name'],
            data['city_id'],
            data['city'], 
            data['country'],
            data.get('stars', 4),
            data.get('price_per_night', 0.0),
            data.get('rating', 7.5),
            data.get('latitude', 0.0),
            data.get('longitude', 0.0),
            data.get('description', '')
        )
        
        result = execute_query(insert_query, params, fetch_one=False, fetch_all=False)
        
        return jsonify({
            'success': True,
            'message': 'Hotel added successfully',
            'hotel_id': data['hotel_id']
        })
        
    except Exception as e:
        print(f"❌ Error adding hotel: {e}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

@app.route("/api/admin/hotels/next-id", methods=["GET"])
def admin_get_next_hotel_id():
    """
    Admin: Lấy ID hotel tiếp theo
    """
    try:
        # Kiểm tra quyền admin
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first'}), 401
        
        user_admin_query = "SELECT is_admin FROM users WHERE user_id = %s"
        admin_check = execute_query(user_admin_query, (session['user_id'],), fetch_one=True)
        
        if not admin_check or not admin_check.get('is_admin'):
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        # Get count to generate next ID
        count_query = "SELECT COUNT(*) as count FROM hotels"
        count_result = execute_query(count_query, fetch_one=True)
        next_num = (count_result['count'] if count_result else 0) + 1
        next_id = f"H{next_num:04d}"
        
        return jsonify({
            'success': True,
            'next_id': next_id
        })
        
    except Exception as e:
        print(f"❌ Error getting next hotel ID: {e}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

@app.route("/api/admin/hotels/import-excel", methods=["POST"])
def admin_import_hotels_excel():
    """
    Admin: Import khách sạn từ file Excel
    """
    try:
        # Kiểm tra quyền admin
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first'}), 401
        
        user_admin_query = "SELECT is_admin FROM users WHERE user_id = %s"
        admin_check = execute_query(user_admin_query, (session['user_id'],), fetch_one=True)
        
        if not admin_check or not admin_check.get('is_admin'):
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        # Kiểm tra file upload
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'}), 400
        
        # Import logic sẽ được thêm sau khi có pandas hoặc openpyxl
        # Tạm thời return success
        return jsonify({
            'success': True,
            'message': 'Excel import functionality will be implemented',
            'added_count': 0
        })
        
    except Exception as e:
        print(f"❌ Error importing hotels from Excel: {e}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

@app.route("/api/admin/restaurants", methods=["GET"])
def admin_get_restaurants():
    """
    Admin: Lấy danh sách nhà hàng với phân trang
    """
    try:
        # Kiểm tra quyền admin
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first'}), 401
        
        user_admin_query = "SELECT is_admin FROM users WHERE user_id = %s"
        admin_check = execute_query(user_admin_query, (session['user_id'],), fetch_one=True)
        
        if not admin_check or not admin_check.get('is_admin'):
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        # Phân trang và tìm kiếm
        page = request.args.get('page', default=1, type=int)
        limit = request.args.get('limit', default=10, type=int)
        search = request.args.get('search', default='', type=str)
        cuisine = request.args.get('cuisine', default='', type=str)
        
        # Validate và giới hạn kích thước trang
        if page < 1:
            page = 1
        if limit < 1 or limit > 50:
            limit = 10
            
        offset = (page - 1) * limit
        
        # Xây dựng query tìm kiếm nếu có
        where_conditions = []
        params = []
        
        if search:
            where_conditions.append("(name LIKE %s OR city LIKE %s OR country LIKE %s)")
            search_term = f"%{search}%"
            params.extend([search_term, search_term, search_term])
            
        if cuisine:
            where_conditions.append("cuisine_type LIKE %s")
            params.append(f"%{cuisine}%")
        
        # Tạo WHERE clause nếu có điều kiện
        where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""
        
        # Thêm limit và offset vào params
        params.extend([limit, offset])
        
        # Query lấy dữ liệu với phân trang
        query = f"""
            SELECT restaurant_id, name, city, country, cuisine_type, price_avg, rating, address, description
            FROM restaurants
            {where_clause}
            ORDER BY name ASC
            LIMIT %s OFFSET %s
        """
        
        # Query đếm tổng số bản ghi để phân trang
        count_query = f"""
            SELECT COUNT(*) as total
            FROM restaurants
            {where_clause}
        """
        
        # Thực hiện query lấy dữ liệu
        results = execute_query(query, params)
        
        # Thực hiện query đếm
        count_params = params[:-2] if params else []  # Loại bỏ limit và offset
        count_result = execute_query(count_query, count_params, fetch_one=True)
        total_restaurants = count_result['total'] if count_result else 0
        total_pages = math.ceil(total_restaurants / limit) if total_restaurants > 0 else 1
        
        if results:
            restaurants = []
            for row in results:
                restaurant = {
                    "restaurant_id": row['restaurant_id'],
                    "name": row['name'],
                    "city": row['city'],
                    "country": row['country'],
                    "cuisine_type": row['cuisine_type'] or 'General',
                    "price_avg": float(row['price_avg']) if row['price_avg'] else 0,
                    "rating": float(row['rating']) if row['rating'] else 0,
                    "address": row['address'] or '',
                    "description": row['description'] or ''
                }
                restaurants.append(restaurant)
            
            return jsonify({
                'success': True, 
                'restaurants': restaurants,
                'pagination': {
                    'current_page': page,
                    'total_pages': total_pages,
                    'total_restaurants': total_restaurants,
                    'per_page': limit
                }
            })
        else:
            return jsonify({
                'success': True, 
                'restaurants': [],
                'pagination': {
                    'current_page': page,
                    'total_pages': 0,
                    'total_restaurants': 0,
                    'per_page': limit
                }
            })
            
    except Exception as e:
        print(f"❌ Error getting restaurants: {e}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

@app.route("/api/admin/restaurants/add", methods=["POST"])
def admin_add_restaurant():
    """
    Admin: Thêm nhà hàng mới (tự động tạo restaurant_id)
    """
    try:
        # Kiểm tra quyền admin
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first'}), 401
        
        user_admin_query = "SELECT is_admin FROM users WHERE user_id = %s"
        admin_check = execute_query(user_admin_query, (session['user_id'],), fetch_one=True)
        
        if not admin_check or not admin_check.get('is_admin'):
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'city_id', 'city', 'country']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field} is required'}), 400
        
        # Get the last restaurant_id
        last_id_query = """
        SELECT restaurant_id FROM restaurants 
        ORDER BY restaurant_id DESC 
        LIMIT 1
        """
        
        last_id_result = execute_query(last_id_query, fetch_one=True)
        
        if last_id_result and last_id_result.get('restaurant_id'):
            # Extract the numeric part and increment
            last_id = last_id_result.get('restaurant_id')
            if last_id.startswith('R') and len(last_id) == 5 and last_id[1:].isdigit():
                next_num = int(last_id[1:]) + 1
                new_id = f"R{next_num:04d}"
            else:
                # If format is not as expected, start with R0001
                new_id = "R0001"
        else:
            # If no restaurants yet, start with R0001
            new_id = "R0001"
        
        # Insert restaurant with auto-generated ID
        insert_query = """
        INSERT INTO restaurants (restaurant_id, name, city_id, city, country, price_avg, cuisine_type, rating, latitude, longitude, description)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        params = (
            new_id,
            data['name'],
            data['city_id'],
            data['city'],
            data['country'],
            data.get('price_avg'),
            data.get('cuisine_type'),
            data.get('rating'),
            data.get('latitude'),
            data.get('longitude'),
            data.get('description')
        )
        
        result = execute_query(insert_query, params, fetch_one=False, fetch_all=False)
        
        return jsonify({
            'success': True,
            'message': 'Restaurant added successfully',
            'restaurant_id': new_id
        })
        
    except Exception as e:
        print(f"❌ Error adding restaurant: {e}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

@app.route("/api/admin/restaurants/upload-excel", methods=["POST"])
def admin_upload_restaurants_excel():
    """
    Admin: Upload Excel file với dữ liệu nhà hàng (tự động tạo restaurant_id)
    """
    try:
        # Kiểm tra quyền admin
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first'}), 401
        
        user_admin_query = "SELECT is_admin FROM users WHERE user_id = %s"
        admin_check = execute_query(user_admin_query, (session['user_id'],), fetch_one=True)
        
        if not admin_check or not admin_check.get('is_admin'):
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        # Kiểm tra file upload
        if 'excel_file' not in request.files:
            return jsonify({'success': False, 'message': 'No file uploaded'}), 400
        
        file = request.files['excel_file']
        
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'}), 400
        
        # Kiểm tra định dạng file
        if not file.filename.lower().endswith(('.xlsx', '.xls')):
            return jsonify({'success': False, 'message': 'Please upload an Excel file (.xlsx or .xls)'}), 400
        
        try:
            import pandas as pd
            
            # Đọc Excel file
            df = pd.read_excel(file)
            
            # Validate required columns (không cần restaurant_id)
            required_columns = ['name', 'city_id', 'city', 'country']
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                return jsonify({
                    'success': False, 
                    'message': f'Missing required columns: {", ".join(missing_columns)}'
                }), 400
            
            # Get the last restaurant_id for starting point
            last_id_query = """
            SELECT restaurant_id FROM restaurants 
            ORDER BY restaurant_id DESC 
            LIMIT 1
            """
            
            last_id_result = execute_query(last_id_query, fetch_one=True)
            
            if last_id_result and last_id_result.get('restaurant_id'):
                # Extract the numeric part and increment
                last_id = last_id_result.get('restaurant_id')
                if last_id.startswith('R') and len(last_id) == 5 and last_id[1:].isdigit():
                    next_num = int(last_id[1:])
                else:
                    # If format is not as expected, start with R0000
                    next_num = 0
            else:
                # If no restaurants yet, start with R0000
                next_num = 0
            
            added_count = 0
            errors = []
            
            for index, row in df.iterrows():
                try:
                    # Validate required fields
                    if pd.isna(row['name']) or pd.isna(row['city']) or pd.isna(row['country']):
                        errors.append(f'Row {index + 1}: Missing required fields')
                        continue
                    
                    # Generate next restaurant_id
                    next_num += 1
                    new_id = f"R{next_num:04d}"
                    
                    # Insert restaurant with auto-generated ID
                    insert_query = """
                    INSERT INTO restaurants (restaurant_id, name, city_id, city, country, price_avg, cuisine_type, rating, latitude, longitude, description)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    
                    params = (
                        new_id,
                        str(row['name']),
                        int(row['city_id']) if not pd.isna(row['city_id']) else None,
                        str(row['city']),
                        str(row['country']),
                        float(row['price_avg']) if not pd.isna(row['price_avg']) else None,
                        str(row['cuisine_type']) if not pd.isna(row['cuisine_type']) else None,
                        float(row['rating']) if not pd.isna(row['rating']) else None,
                        float(row['latitude']) if not pd.isna(row['latitude']) else None,
                        float(row['longitude']) if not pd.isna(row['longitude']) else None,
                        str(row['description']) if not pd.isna(row['description']) else None
                    )
                    
                    execute_query(insert_query, params, fetch_one=False, fetch_all=False)
                    added_count += 1
                    
                except Exception as row_error:
                    errors.append(f'Row {index + 1}: {str(row_error)}')
                    continue
            
            response_data = {
                'success': True,
                'message': f'Successfully processed Excel file',
                'added_count': added_count,
                'total_rows': len(df)
            }
            
            if errors:
                response_data['errors'] = errors[:10]  # Limit to first 10 errors
                response_data['error_count'] = len(errors)
            
            return jsonify(response_data)
            
        except Exception as excel_error:
            print(f"❌ Error processing Excel file: {excel_error}")
            return jsonify({'success': False, 'message': f'Error processing Excel file: {str(excel_error)}'}), 400
        
    except Exception as e:
        print(f"❌ Error uploading Excel: {e}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500
        
@app.route("/api/admin/restaurants/edit/<restaurant_id>", methods=["PUT"])
def admin_edit_restaurant(restaurant_id):
    """
    Admin: Cập nhật thông tin nhà hàng theo restaurant_id
    """
    try:
        # Kiểm tra quyền admin
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first'}), 401
        
        user_admin_query = "SELECT is_admin FROM users WHERE user_id = %s"
        admin_check = execute_query(user_admin_query, (session['user_id'],), fetch_one=True)
        
        if not admin_check or not admin_check.get('is_admin'):
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        # Kiểm tra nhà hàng tồn tại
        check_query = "SELECT restaurant_id FROM restaurants WHERE restaurant_id = %s"
        existing = execute_query(check_query, (restaurant_id,), fetch_one=True)
        
        if not existing:
            return jsonify({'success': False, 'message': 'Restaurant not found'}), 404
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'city_id', 'city', 'country']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field} is required'}), 400
        
        # Update restaurant
        update_query = """
        UPDATE restaurants 
        SET name = %s, city_id = %s, city = %s, country = %s, 
            price_avg = %s, cuisine_type = %s, rating = %s, 
            latitude = %s, longitude = %s, description = %s
        WHERE restaurant_id = %s
        """
        
        params = (
            data['name'],
            data['city_id'],
            data['city'],
            data['country'],
            data.get('price_avg'),
            data.get('cuisine_type'),
            data.get('rating'),
            data.get('latitude'),
            data.get('longitude'),
            data.get('description'),
            restaurant_id
        )
        
        result = execute_query(update_query, params, fetch_one=False, fetch_all=False)
        
        return jsonify({
            'success': True,
            'message': 'Restaurant updated successfully',
            'restaurant_id': restaurant_id
        })
        
    except Exception as e:
        print(f"❌ Error updating restaurant: {e}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

@app.route("/api/admin/restaurants/delete/<restaurant_id>", methods=["DELETE"])
def admin_delete_restaurant(restaurant_id):
    """
    Admin: Xóa nhà hàng theo restaurant_id
    """
    try:
        # Kiểm tra quyền admin
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first'}), 401
        
        user_admin_query = "SELECT is_admin FROM users WHERE user_id = %s"
        admin_check = execute_query(user_admin_query, (session['user_id'],), fetch_one=True)
        
        if not admin_check or not admin_check.get('is_admin'):
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        # Kiểm tra nhà hàng tồn tại
        check_query = "SELECT restaurant_id FROM restaurants WHERE restaurant_id = %s"
        existing = execute_query(check_query, (restaurant_id,), fetch_one=True)
        
        if not existing:
            return jsonify({'success': False, 'message': 'Restaurant not found'}), 404
        
        # Check if restaurant is referenced in other tables (tour_options_restaurants)
        check_references_query = """
        SELECT COUNT(*) as count FROM tour_options_restaurants WHERE restaurant_id = %s
        """
        
        references = execute_query(check_references_query, (restaurant_id,), fetch_one=True)
        
        if references and references.get('count', 0) > 0:
            return jsonify({
                'success': False, 
                'message': f'Cannot delete restaurant: It is used in {references["count"]} tour options'
            }), 400
            
        # Delete restaurant
        delete_query = "DELETE FROM restaurants WHERE restaurant_id = %s"
        result = execute_query(delete_query, (restaurant_id,), fetch_one=False, fetch_all=False)
        
        return jsonify({
            'success': True,
            'message': 'Restaurant deleted successfully'
        })
        
    except Exception as e:
        print(f"❌ Error deleting restaurant: {e}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

# ============== NEW ADMIN TOUR MANAGEMENT APIs ==============

@app.route("/api/admin/tour-options", methods=["GET"])
def admin_get_tour_options():
    """
    Admin: Lấy danh sách tour options với phân trang
    """
    try:
        # Kiểm tra quyền admin
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first'}), 401
        
        user_admin_query = "SELECT is_admin FROM users WHERE user_id = %s"
        admin_check = execute_query(user_admin_query, (session['user_id'],), fetch_one=True)
        
        if not admin_check or not admin_check.get('is_admin'):
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        # Phân trang và tìm kiếm
        page = request.args.get('page', default=1, type=int)
        limit = request.args.get('limit', default=10, type=int)
        search = request.args.get('search', default='', type=str)
        user_id = request.args.get('user_id', default='', type=str)
        city_id = request.args.get('city_id', default='', type=str)
        
        # Validate và giới hạn kích thước trang
        if page < 1:
            page = 1
        if limit < 1 or limit > 50:
            limit = 10
            
        offset = (page - 1) * limit
        
        # Xây dựng query tìm kiếm nếu có
        where_conditions = []
        params = []
        
        if search:
            where_conditions.append("(u.name LIKE %s OR u.email LIKE %s)")
            search_term = f"%{search}%"
            params.extend([search_term, search_term])
            
        if user_id:
            where_conditions.append("t.user_id = %s")
            params.append(user_id)
            
        if city_id:
            where_conditions.append("(t.start_city_id = %s OR t.destination_city_id = %s)")
            params.extend([city_id, city_id])
        
        # Tạo WHERE clause nếu có điều kiện
        where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""
        
        # Query lấy dữ liệu với phân trang sử dụng schema đúng
        query = f"""
            SELECT 
                t.option_id,
                t.user_id,
                u.name AS user_name,
                u.email AS user_email,
                sc.name AS start_city,
                dc.name AS destination_city,
                h.name AS hotel_name,
                r.name AS restaurant_name,
                a.name AS activity_name,
                t.duration_days,
                t.guest_count,
                t.target_budget,
                t.currency,
                NULL AS created_date  # Loại bỏ tham chiếu đến created_at không tồn tại
            FROM tour_options t
            LEFT JOIN users u ON t.user_id = u.user_id
            LEFT JOIN cities sc ON t.start_city_id = sc.city_id
            LEFT JOIN cities dc ON t.destination_city_id = dc.city_id
            LEFT JOIN tour_options_hotels toh ON t.option_id = toh.option_id
            LEFT JOIN hotels h ON toh.hotel_id = h.hotel_id
            LEFT JOIN tour_options_restaurants tor ON t.option_id = tor.option_id
            LEFT JOIN restaurants r ON tor.restaurant_id = r.restaurant_id
            LEFT JOIN tour_options_activities toa ON t.option_id = toa.option_id
            LEFT JOIN activities a ON toa.activity_id = a.activity_id
            {where_clause}
            ORDER BY t.option_id DESC  # Sử dụng option_id thay cho created_at
            LIMIT %s OFFSET %s
        """
        
        # Query đếm tổng số bản ghi để phân trang
        count_query = f"""
            SELECT COUNT(*) as total
            FROM tour_options t
            LEFT JOIN users u ON t.user_id = u.user_id
            LEFT JOIN cities sc ON t.start_city_id = sc.city_id
            LEFT JOIN cities dc ON t.destination_city_id = dc.city_id
            {where_clause}
        """
        
        # Thêm limit và offset vào params
        params.extend([limit, offset])
        
        # Thực hiện query lấy dữ liệu
        results = execute_query(query, params)
        
        # Thực hiện query đếm
        count_params = params[:-2] if params else []  # Loại bỏ limit và offset
        count_result = execute_query(count_query, count_params, fetch_one=True)
        total_tours = count_result['total'] if count_result else 0
        total_pages = math.ceil(total_tours / limit) if total_tours > 0 else 1
        
        if results:
            tours = []
            for row in results:
                tour = {
                    "option_id": row['option_id'],
                    "user_id": row['user_id'],
                    "user_name": row['user_name'] or 'N/A',
                    "user_email": row['user_email'] or 'N/A',
                    "start_city": row['start_city'] or 'N/A',
                    "destination_city": row['destination_city'] or 'N/A',
                    "hotel_name": row['hotel_name'] or 'N/A',
                    "restaurant_name": row['restaurant_name'] or 'N/A',
                    "activity_name": row['activity_name'] or 'N/A',
                    "duration_days": row['duration_days'] or 1,
                    "guest_count": row['guest_count'] or 1,
                    "target_budget": float(row['target_budget']) if row['target_budget'] else 0,
                    "currency": row['currency'] or 'USD',
                    "created_date": row['created_date'].strftime('%Y-%m-%d') if row['created_date'] else 'N/A'
                }
                tours.append(tour)
            
            return jsonify({
                'success': True, 
                'tours': tours,
                'pagination': {
                    'current_page': page,
                    'total_pages': total_pages,
                    'total_tours': total_tours,
                    'per_page': limit
                }
            })
        else:
            return jsonify({
                'success': True, 
                'tours': [],
                'pagination': {
                    'current_page': page,
                    'total_pages': 0,
                    'total_tours': 0,
                    'per_page': limit
                }
            })
            
    except Exception as e:
        print(f"❌ Error getting tour options: {e}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

@app.route("/api/admin/locations/autocomplete", methods=["GET"])
def admin_locations_autocomplete():
    """
    Admin: Autocomplete cho tìm kiếm địa điểm từ cities table
    """
    try:
        # Kiểm tra quyền admin
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first'}), 401
        
        user_admin_query = "SELECT is_admin FROM users WHERE user_id = %s"
        admin_check = execute_query(user_admin_query, (session['user_id'],), fetch_one=True)
        
        if not admin_check or not admin_check.get('is_admin'):
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        query_string = request.args.get('q', '').strip()
        limit = request.args.get('limit', 10)
        
        if not query_string or len(query_string) < 2:
            return jsonify({"suggestions": []})
        
        # Truy vấn cities với thông tin về số lượng tour
        search_query = """
            SELECT DISTINCT c.name, c.country, 
                   (SELECT COUNT(*) FROM tour_options t WHERE t.start_city_id = c.city_id OR t.destination_city_id = c.city_id) as count
            FROM cities c
            WHERE c.name LIKE %s OR c.country LIKE %s
            ORDER BY count DESC, c.name ASC
            LIMIT %s
        """
        
        search_term = f"%{query_string}%"
        params = (search_term, search_term, int(limit))
        
        results = execute_query(search_query, params)
        
        if results:
            suggestions = []
            for row in results:
                suggestion = {
                    "name": row['name'],
                    "country": row['country'],
                    "count": row['count'],
                    "display_text": f"{row['name']}, {row['country']} ({row['count']} tour)"
                }
                suggestions.append(suggestion)
            
            return jsonify({"suggestions": suggestions})
        else:
            return jsonify({"suggestions": []})
            
    except Exception as e:
        print(f"Error in admin_locations_autocomplete: {str(e)}")
        return jsonify({"suggestions": []})

@app.route("/api/admin/customers-by-location", methods=["POST"])
def admin_customers_by_location_search():
    """
    Admin: Tìm kiếm khách hàng theo địa điểm du lịch
    Hỗ trợ tìm kiếm nhiều thành phố cùng lúc (VD: Hanoi,Ho Chi Minh City)
    """
    try:
        # Kiểm tra quyền admin
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first'}), 401
        
        user_admin_query = "SELECT is_admin FROM users WHERE user_id = %s"
        admin_check = execute_query(user_admin_query, (session['user_id'],), fetch_one=True)
        
        if not admin_check or not admin_check.get('is_admin'):
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        data = request.get_json()
        location = data.get('location', '').strip()
        
        if not location:
            return jsonify({'success': False, 'message': 'Location is required'}), 400
            
        # Tách thành phố nếu có dấu phẩy
        locations = [loc.strip() for loc in location.split(',') if loc.strip()]
        
        if not locations:
            return jsonify({'success': False, 'message': 'No valid locations provided'}), 400
            
        # Tạo params và điều kiện WHERE cho nhiều thành phố
        where_conditions = []
        params = []
        
        for loc in locations:
            where_conditions.append("(sc.name LIKE %s OR dc.name LIKE %s OR sc.country LIKE %s OR dc.country LIKE %s)")
            search_term = f"%{loc}%"
            params.extend([search_term, search_term, search_term, search_term])
        
        # Xây dựng truy vấn với các điều kiện OR cho mỗi thành phố
        search_query = """
            SELECT DISTINCT
                u.user_id,
                u.name,
                u.email,
                t.option_id as tour_id,
                sc.name as start_city,
                dc.name as destination_city,
                NULL as created_date  # Loại bỏ tham chiếu đến created_at không tồn tại
            FROM tour_options t
            LEFT JOIN users u ON t.user_id = u.user_id
            LEFT JOIN cities sc ON t.start_city_id = sc.city_id
            LEFT JOIN cities dc ON t.destination_city_id = dc.city_id
            WHERE {}
            ORDER BY t.option_id DESC  # Sử dụng option_id thay cho created_at
            LIMIT 10
        """.format(" OR ".join(where_conditions))
        
        results = execute_query(search_query, params)
        
        if results:
            customers = []
            for row in results:
                customer = {
                    "user_id": row['user_id'],
                    "name": row['name'] or 'N/A',
                    "email": row['email'],
                    "tour_id": row['tour_id'],
                    "start_city": row['start_city'] or 'N/A',
                    "destination_city": row['destination_city'] or 'N/A',
                    "created_date": row['created_date'].strftime('%Y-%m-%d') if row['created_date'] else 'N/A'
                }
                customers.append(customer)
            
            return jsonify({'success': True, 'customers': customers})
        else:
            return jsonify({'success': True, 'customers': []})
            
    except Exception as e:
        print(f"Error in admin_customers_by_location: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route("/api/admin/activities/autocomplete", methods=["GET"])
def admin_activities_autocomplete():
    """
    Admin: Autocomplete cho tìm kiếm activities
    """
    try:
        # Kiểm tra quyền admin
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first'}), 401
        
        user_admin_query = "SELECT is_admin FROM users WHERE user_id = %s"
        admin_check = execute_query(user_admin_query, (session['user_id'],), fetch_one=True)
        
        if not admin_check or not admin_check.get('is_admin'):
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        query_string = request.args.get('q', '').strip()
        limit = request.args.get('limit', 10)
        
        if not query_string or len(query_string) < 2:
            return jsonify({"suggestions": []})
        
        # Truy vấn activities
        search_query = """
            SELECT activity_id, name, city, country, type
            FROM activities 
            WHERE name LIKE %s OR type LIKE %s OR city LIKE %s
            ORDER BY name ASC
            LIMIT %s
        """
        
        search_term = f"%{query_string}%"
        params = (search_term, search_term, search_term, int(limit))
        
        results = execute_query(search_query, params)
        
        if results:
            suggestions = []
            for row in results:
                suggestion = {
                    "activity_id": row['activity_id'],
                    "name": row['name'],
                    "city": row['city'],
                    "country": row['country'],
                    "type": row['type'] or 'N/A',
                    "display_text": f"{row['name']} - {row['city']}, {row['country']}"
                }
                suggestions.append(suggestion)
            
            return jsonify({"suggestions": suggestions})
        else:
            return jsonify({"suggestions": []})
            
    except Exception as e:
        print(f"Error in admin_activities_autocomplete: {str(e)}")
        return jsonify({"suggestions": []})

@app.route("/api/admin/tours-by-activity", methods=["POST"])
def admin_tours_by_activity():
    """
    Admin: Tìm kiếm tour theo hoạt động (activities) hoặc theo loại hoạt động (type)
    """
    try:
        # Kiểm tra quyền admin
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first'}), 401
        
        user_admin_query = "SELECT is_admin FROM users WHERE user_id = %s"
        admin_check = execute_query(user_admin_query, (session['user_id'],), fetch_one=True)
        
        if not admin_check or not admin_check.get('is_admin'):
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        data = request.get_json()
        activity = data.get('activity', '').strip()
        page = data.get('page', 1)
        limit = data.get('limit', 10)
        
        # Validate page và limit
        try:
            page = int(page)
            limit = int(limit)
        except ValueError:
            page = 1
            limit = 10
            
        # Giới hạn size để tránh quá tải
        limit = min(limit, 50)
        offset = (page - 1) * limit
        
        if not activity:
            return jsonify({'success': False, 'message': 'Activity is required'}), 400
        
        # Tìm tour có hoạt động này hoặc loại hoạt động sử dụng bảng mapping
        search_query = """
            SELECT 
                t.option_id as tour_id,
                u.name as customer_name,
                u.email as customer_email,
                a.name as activity_name,
                a.type as activity_type,
                a.city as activity_city,
                a.country as activity_country,
                NULL as created_date  # Loại bỏ tham chiếu đến created_at không tồn tại
            FROM tour_options t
            LEFT JOIN users u ON t.user_id = u.user_id
            LEFT JOIN tour_options_activities toa ON t.option_id = toa.option_id
            LEFT JOIN activities a ON toa.activity_id = a.activity_id
            WHERE a.name LIKE %s OR a.type LIKE %s
            ORDER BY t.option_id DESC  # Sử dụng option_id thay cho created_at
            LIMIT %s OFFSET %s
        """
        
        # Đếm tổng số kết quả để phân trang
        count_query = """
            SELECT COUNT(DISTINCT t.option_id) as total
            FROM tour_options t
            LEFT JOIN tour_options_activities toa ON t.option_id = toa.option_id
            LEFT JOIN activities a ON toa.activity_id = a.activity_id
            WHERE a.name LIKE %s OR a.type LIKE %s
        """
        
        search_term = f"%{activity}%"
        params = (search_term, search_term, limit, offset)
        count_params = (search_term, search_term)
        
        # Thực hiện cả query đếm và query lấy data
        results = execute_query(search_query, params)
        count_result = execute_query(count_query, count_params, fetch_one=True)
        
        # Tính toán thông tin phân trang
        total = count_result['total'] if count_result else 0
        total_pages = math.ceil(total / limit) if total > 0 else 1
        
        if results:
            tours = []
            for row in results:
                tour = {
                    "tour_id": row['tour_id'],
                    "customer_name": row['customer_name'] or 'N/A',
                    "customer_email": row['customer_email'],
                    "activity_name": row['activity_name'] or 'N/A',
                    "activity_type": row['activity_type'] or 'N/A', # Thêm thông tin loại hoạt động
                    "activity_city": row['activity_city'] or 'N/A',
                    "activity_country": row['activity_country'] or 'N/A',
                    "created_date": row['created_date'].strftime('%Y-%m-%d') if row['created_date'] else 'N/A'
                }
                tours.append(tour)
            
            pagination_info = {
                "current_page": page,
                "total_pages": total_pages,
                "total_items": total,
                "items_per_page": limit
            }
            
            return jsonify({
                'success': True, 
                'tours': tours,
                'pagination': pagination_info,
                'activity_searched': activity
            })
        else:
            return jsonify({
                'success': True, 
                'tours': [],
                'pagination': {
                    "current_page": page,
                    "total_pages": 0,
                    "total_items": 0,
                    "items_per_page": limit
                },
                'activity_searched': activity
            })
            
    except Exception as e:
        print(f"Error in admin_tours_by_activity: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route("/api/admin/hotels", methods=["GET"])
def admin_get_hotels():
    """
    Admin: Lấy danh sách khách sạn với phân trang
    """
    try:
        # Kiểm tra quyền admin
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first'}), 401
        
        user_admin_query = "SELECT is_admin FROM users WHERE user_id = %s"
        admin_check = execute_query(user_admin_query, (session['user_id'],), fetch_one=True)
        
        if not admin_check or not admin_check.get('is_admin'):
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        # Phân trang và tìm kiếm
        page = request.args.get('page', default=1, type=int)
        limit = request.args.get('limit', default=10, type=int)
        search = request.args.get('search', default='', type=str)
        
        # Validate và giới hạn kích thước trang
        if page < 1:
            page = 1
        if limit < 1 or limit > 50:
            limit = 10
            
        offset = (page - 1) * limit
        
        # Xây dựng query tìm kiếm nếu có
        search_condition = ""
        params = []
        
        if search:
            search_condition = "WHERE name LIKE %s OR city LIKE %s OR country LIKE %s"
            search_term = f"%{search}%"
            params = [search_term, search_term, search_term, limit, offset]
        else:
            params = [limit, offset]
        
        # Query lấy dữ liệu với phân trang
        query = f"""
            SELECT hotel_id, name, city, country, stars, price_per_night, rating, address, description
            FROM hotels
            {search_condition}
            ORDER BY name ASC
            LIMIT %s OFFSET %s
        """
        
        # Query đếm tổng số bản ghi để phân trang
        count_query = f"""
            SELECT COUNT(*) as total
            FROM hotels
            {search_condition}
        """
        
        # Thực hiện cả query đếm và query lấy dữ liệu
        results = execute_query(query, params)
        
        # Thực hiện query đếm với hoặc không có điều kiện tìm kiếm
        if search:
            count_params = [f"%{search}%", f"%{search}%", f"%{search}%"]
        else:
            count_params = []
            
        count_result = execute_query(count_query, count_params, fetch_one=True)
        total_hotels = count_result['total'] if count_result else 0
        total_pages = math.ceil(total_hotels / limit) if total_hotels > 0 else 1
        
        if results:
            hotels = []
            for row in results:
                hotel = {
                    "hotel_id": row['hotel_id'],
                    "name": row['name'],
                    "city": row['city'],
                    "country": row['country'],
                    "stars": row['stars'] or 3,
                    "price_per_night": float(row['price_per_night']) if row['price_per_night'] else 0,
                    "rating": float(row['rating']) if row['rating'] else 0,
                    "address": row['address'] or '',
                    "description": row['description'] or ''
                }
                hotels.append(hotel)
            
            return jsonify({
                'success': True, 
                'hotels': hotels,
                'pagination': {
                    'current_page': page,
                    'total_pages': total_pages,
                    'total_hotels': total_hotels,
                    'per_page': limit
                }
            })
        else:
            return jsonify({
                'success': True, 
                'hotels': [],
                'pagination': {
                    'current_page': page,
                    'total_pages': 0,
                    'total_hotels': 0,
                    'per_page': limit
                }
            })
            
    except Exception as e:
        print(f"Error in admin_get_hotels: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route("/api/admin/activities", methods=["GET"])
def admin_get_activities():
    """
    Admin: Lấy danh sách hoạt động du lịch với phân trang
    """
    try:
        # Kiểm tra quyền admin
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first'}), 401
        
        user_admin_query = "SELECT is_admin FROM users WHERE user_id = %s"
        admin_check = execute_query(user_admin_query, (session['user_id'],), fetch_one=True)
        
        if not admin_check or not admin_check.get('is_admin'):
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        # Phân trang và tìm kiếm
        page = request.args.get('page', default=1, type=int)
        limit = request.args.get('limit', default=10, type=int)
        search = request.args.get('search', default='', type=str)
        activity_type = request.args.get('type', default='', type=str)
        
        # Validate và giới hạn kích thước trang
        if page < 1:
            page = 1
        if limit < 1 or limit > 50:
            limit = 10
            
        offset = (page - 1) * limit
        
        # Xây dựng query tìm kiếm nếu có
        where_conditions = []
        params = []
        
        if search:
            where_conditions.append("(name LIKE %s OR city LIKE %s OR country LIKE %s)")
            search_term = f"%{search}%"
            params.extend([search_term, search_term, search_term])
            
        if activity_type:
            where_conditions.append("type LIKE %s")
            params.append(f"%{activity_type}%")
        
        # Tạo WHERE clause nếu có điều kiện
        where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""
        
        # Thêm limit và offset vào params
        params.extend([limit, offset])
        
        # Query lấy dữ liệu với phân trang
        query = f"""
            SELECT activity_id, name, city, country, type, duration_hr, price, description
            FROM activities
            {where_clause}
            ORDER BY name ASC
            LIMIT %s OFFSET %s
        """
        
        # Query đếm tổng số bản ghi để phân trang
        count_query = f"""
            SELECT COUNT(*) as total
            FROM activities
            {where_clause}
        """
        
        # Thực hiện query lấy dữ liệu
        results = execute_query(query, params)
        
        # Thực hiện query đếm
        count_params = params[:-2] if params else []  # Loại bỏ limit và offset
        count_result = execute_query(count_query, count_params, fetch_one=True)
        total_activities = count_result['total'] if count_result else 0
        total_pages = math.ceil(total_activities / limit) if total_activities > 0 else 1
        
        if results:
            activities = []
            for row in results:
                activity = {
                    "activity_id": row['activity_id'],
                    "name": row['name'],
                    "city": row['city'],
                    "country": row['country'],
                    "type": row['type'] or 'General',
                    "duration_hr": float(row['duration_hr']) if row['duration_hr'] else 0,
                    "price": float(row['price']) if row['price'] else 0,
                    "description": row['description'] or ''
                }
                activities.append(activity)
            
            return jsonify({
                'success': True, 
                'activities': activities,
                'pagination': {
                    'current_page': page,
                    'total_pages': total_pages,
                    'total_activities': total_activities,
                    'per_page': limit
                }
            })
        else:
            return jsonify({
                'success': True, 
                'activities': [],
                'pagination': {
                    'current_page': page,
                    'total_pages': 0,
                    'total_activities': 0,
                    'per_page': limit
                }
            })
            
    except Exception as e:
        print(f"❌ Error getting activities: {e}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

@app.route("/api/admin/hotels/<string:hotel_id>", methods=["PUT"])
def admin_update_hotel(hotel_id):
    """
    Admin: Cập nhật thông tin khách sạn
    """
    try:
        # Kiểm tra quyền admin
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first'}), 401
        
        user_admin_query = "SELECT is_admin FROM users WHERE user_id = %s"
        admin_check = execute_query(user_admin_query, (session['user_id'],), fetch_one=True)
        
        if not admin_check or not admin_check.get('is_admin'):
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        data = request.get_json()
        
        # Build update query dynamically
        update_fields = []
        params = []
        
        allowed_fields = ['name', 'city', 'country', 'price_per_night', 'rating', 'description', 'address', 'latitude', 'longitude']
        
        for field in allowed_fields:
            if field in data:
                update_fields.append(f"{field} = %s")
                params.append(data[field])
        
        if not update_fields:
            return jsonify({'success': False, 'message': 'No fields to update'}), 400
        
        params.append(hotel_id)
        
        update_query = f"UPDATE hotels SET {', '.join(update_fields)} WHERE hotel_id = %s"
        
        result = execute_query(update_query, tuple(params), fetch_one=False, fetch_all=False)
        
        return jsonify({
            'success': True,
            'message': 'Hotel updated successfully'
        })
        
    except Exception as e:
        print(f"❌ Error updating hotel: {e}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

@app.route("/api/admin/hotels/<string:hotel_id>", methods=["DELETE"])
def admin_delete_hotel(hotel_id):
    """
    Admin: Xóa khách sạn
    """
    try:
        # Kiểm tra quyền admin
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first'}), 401
        
        user_admin_query = "SELECT is_admin FROM users WHERE user_id = %s"
        admin_check = execute_query(user_admin_query, (session['user_id'],), fetch_one=True)
        
        if not admin_check or not admin_check.get('is_admin'):
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        # Check if hotel exists and is being used in tour options
        check_query = "SELECT COUNT(*) as count FROM tour_options_hotels WHERE hotel_id = %s"
        usage_check = execute_query(check_query, (hotel_id,), fetch_one=True)
        
        if usage_check and usage_check['count'] > 0:
            return jsonify({
                'success': False, 
                'message': f'Cannot delete hotel. It is being used in {usage_check["count"]} tour(s).'
            }), 400
        
        # Delete hotel
        delete_query = "DELETE FROM hotels WHERE hotel_id = %s"
        result = execute_query(delete_query, (hotel_id,), fetch_one=False, fetch_all=False)
        
        return jsonify({
            'success': True,
            'message': 'Hotel deleted successfully'
        })
        
    except Exception as e:
        print(f"❌ Error deleting hotel: {e}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

# =====================================================================
# PERSONALIZED TRAVEL TOUR RECOMMENDATION SYSTEM
# =====================================================================

import pandas as pd
import numpy as np
from collections import Counter, defaultdict
from sklearn.linear_model import LinearRegression
from sklearn.feature_extraction import DictVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from datetime import datetime, timedelta
import random

# Class UserTourInfo
class UserTourInfo:
    def __init__(self, user_tour_option: dict):
        self.user_id = user_tour_option.get('user_id')
        self.start_city_id = user_tour_option.get('start_city_id')
        self.destination_city_id = user_tour_option.get('destination_city_id')
        self.hotel_ids = user_tour_option.get('hotel_ids', [])
        self.activity_ids = user_tour_option.get('activity_ids', [])
        self.restaurant_ids = user_tour_option.get('restaurant_ids', [])
        self.transport_ids = user_tour_option.get('transport_ids', [])
        self.guest_count = user_tour_option.get('guest_count')
        self.duration_days = user_tour_option.get('duration_days')
        self.target_budget = user_tour_option.get('target_budget')

def percentage_shared(list1, list2):
    if not list1:
        return 0.0
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
    
    all_tour_options = execute_query(query, (user_input.destination_city_id, user_input.user_id or ''))
    similarities = []
    
    if all_tour_options:
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

def recommend_existing(user_input: UserTourInfo, top_n=1):
    query = """
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
    """
    
    all_opts = execute_query(query, (user_input.user_id or '',))
    
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
    
    df = pd.DataFrame(all_opts)
    
    if not df.empty:
        for col in ['guest_count', 'duration_days', 'target_budget']:
            df[col] = pd.to_numeric(df[col], errors='coerce', downcast='float').fillna(1.0)
        
        df['norm'] = df['target_budget'] / (df['guest_count'] * df['duration_days'])
        u_norm = float(user_input.target_budget or 1000.0) / (float(user_input.guest_count or 1.0) * float(user_input.duration_days or 3.0))
        
        df['budget_sim'] = 1 - (df['norm'] - u_norm).abs() / (df['norm'] + u_norm + 1e-9)
        df = df[df['destination_city_id'] == user_input.destination_city_id]
        df['score'] = 0.5 * df['budget_sim'] + 0.5 * (df['rating'].fillna(0) / 10)
        
        df = df.sort_values('score', ascending=False).drop_duplicates('option_id')
        return df.head(top_n)
    
    return pd.DataFrame()

def impute_all_fields(user_input: UserTourInfo, topk_users: list):
    if not topk_users:
        return user_input
        
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

def recommend_cold_start(user_input: UserTourInfo, K=5, top_n=1):
    query = """
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
    """
    
    all_opts = execute_query(query)
    
    if not all_opts:
        return pd.DataFrame()
    
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
        # Dự đoán ngân sách bằng mô hình hồi quy
        df_budget = pd.DataFrame(all_opts)
        X = df_budget[['duration_days', 'guest_count']].dropna()
        y = df_budget.loc[X.index, 'target_budget']
        if not X.empty and not y.empty:
            reg = LinearRegression().fit(X, y)
            user_input.target_budget = reg.predict([[user_input.duration_days, user_input.guest_count]])[0]
        else:
            user_input.target_budget = 1000

    # Lấy top K người dùng tương tự
    top_users = get_top_k_similar_users(user_input, K)
    top_user_ids = [user_id for user_id, _ in top_users]
    
    if not top_user_ids:
        # Fallback method
        fallback_query = """
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
        """
        
        random_opts = execute_query(fallback_query, (user_input.destination_city_id, top_n))
        
        if not random_opts:
            fallback_query2 = """
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
            """
            random_opts = execute_query(fallback_query2, (top_n,))
        
        if not random_opts:
            return pd.DataFrame()
        
        for opt in random_opts:
            opt['guest_count'] = float(opt['guest_count']) if opt['guest_count'] is not None else None
            opt['duration_days'] = float(opt['duration_days']) if opt['duration_days'] is not None else None
            opt['target_budget'] = float(opt['target_budget']) if opt['target_budget'] is not None else None
            opt['rating'] = float(opt['rating']) if opt['rating'] is not None else None
        
        df = pd.DataFrame(random_opts)
        if df.empty:
            return df
            
        for col in ['guest_count', 'duration_days', 'target_budget']:
            df[col] = pd.to_numeric(df[col], errors='coerce', downcast='float').fillna(1.0)
        df['norm'] = df['target_budget'] / (df['guest_count'] * df['duration_days'])
        u_norm = user_input.target_budget / (user_input.guest_count * user_input.duration_days)
        df['budget_sim'] = 1 - (df['norm'] - u_norm).abs() / (df['norm'] + u_norm + 1e-9)
        df['score'] = df['budget_sim'] if 'rating' not in df.columns else (0.5 * df['budget_sim'] + 0.5 * (df['rating'].fillna(0) / 10))
        return df.head(top_n)
    
    # Lấy options từ top K người dùng tương tự
    query_topk = """
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
        WHERE t.user_id IN ({})
    """.format(','.join(['%s'] * len(top_user_ids)))
    
    topk_opts = execute_query(query_topk, tuple(top_user_ids))
    
    if not topk_opts:
        return pd.DataFrame()
    
    for opt in topk_opts:
        opt['guest_count'] = float(opt['guest_count']) if opt['guest_count'] is not None else None
        opt['duration_days'] = float(opt['duration_days']) if opt['duration_days'] is not None else None
        opt['target_budget'] = float(opt['target_budget']) if opt['target_budget'] is not None else None
        opt['rating'] = float(opt['rating']) if opt['rating'] is not None else None
    
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
    
    for col in required_cols:
        df[col] = pd.to_numeric(df[col], errors='coerce', downcast='float')
        if df[col].isna().any():
            df[col].fillna(df[col].mean() if len(df[col].dropna()) > 0 else 1.0, inplace=True)
    
    df['norm'] = df['target_budget'] / (df['guest_count'] * df['duration_days'])
    u_norm = user_input.target_budget / (user_input.guest_count * user_input.duration_days)
    
    df['budget_sim'] = 1 - (df['norm'] - u_norm).abs() / (df['norm'] + u_norm + 1e-9)
    df['score'] = df['budget_sim'] if 'rating' not in df.columns else (0.5 * df['budget_sim'] + 0.5 * (df['rating'].fillna(0) / 10))
    
    df = df[df['destination_city_id'] == user_input.destination_city_id]
    
    if df.empty:
        df = pd.DataFrame(topk_opts)
        for col in ['guest_count', 'duration_days', 'target_budget']:
            df[col] = pd.to_numeric(df[col], errors='coerce', downcast='float').fillna(1.0)
        df['norm'] = df['target_budget'] / (df['guest_count'] * df['duration_days'])
        df['budget_sim'] = 1 - (df['norm'] - u_norm).abs() / (df['norm'] + u_norm + 1e-9)
        df['score'] = df['budget_sim'] if 'rating' not in df.columns else (0.5 * df['budget_sim'] + 0.5 * (df['rating'].fillna(0) / 10))
    
    df = df.sort_values('score', ascending=False).drop_duplicates('option_id')
    return df.head(top_n)

# Danh sách time_slots
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
    city = user_input.destination_city_id
    duration = float(user_input.duration_days) if user_input.duration_days is not None else 3.0
    budget = float(user_input.target_budget) if user_input.target_budget is not None else 1000.0
    daily_budget = budget / duration
    
    # Lấy danh sách activities, restaurants, hotels từ MySQL
    act_query = "SELECT activity_id, name, city_id, price, rating FROM activities WHERE city_id = %s"
    act_all = execute_query(act_query, (city,)) or []
    
    rest_query = "SELECT restaurant_id, name, city_id, price_avg, rating FROM restaurants WHERE city_id = %s"
    rest_all = execute_query(rest_query, (city,)) or []
    
    hotel_query = "SELECT hotel_id, name, city_id, price_per_night, rating FROM hotels WHERE city_id = %s"
    hotel_all = execute_query(hotel_query, (city,)) or []
    
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
        sel = [c for c in candidates if c[key_id] in ids]
        if not sel:
            sel = candidates[:]
        
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

def build_final_tour_json(user_input: UserTourInfo, mode='auto'):
    query_count = "SELECT COUNT(*) as count FROM tour_options WHERE user_id = %s"
    exist_count_result = execute_query(query_count, (user_input.user_id or '',), fetch_one=True)
    exist_count = exist_count_result['count'] if exist_count_result else 0
    
    use_existing = (mode == 'existing') or (mode == 'auto' and exist_count > 1)
    
    if use_existing:
        recommend_df = recommend_existing(user_input, top_n=1)
    else:
        recommend_df = recommend_cold_start(user_input, K=5, top_n=1)
    
    if recommend_df.empty:
        return {"error": "No suitable tour options found."}
        
    chosen_id = recommend_df.iloc[0]['option_id']
    
    query_chosen = """
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
    """
    
    opt = execute_query(query_chosen, (chosen_id,), fetch_one=True)
    
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
    
    city_query = "SELECT city_id, name FROM cities WHERE city_id IN (%s, %s)"
    city_info_result = execute_query(city_query, (user.start_city_id, user.destination_city_id))
    city_info = {row['city_id']: row['name'] for row in city_info_result} if city_info_result else {}
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

# Serve static files
@app.route('/assets/<path:filename>')
def serve_assets(filename):
    return send_from_directory('assets', filename)

@app.route("/api/cities/<int:city_id>/restaurants", methods=["GET"])
def get_restaurants_by_city(city_id):
    """
    Lấy danh sách restaurants theo city_id
    """
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "Database connection failed"}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        query = """
            SELECT restaurant_id, name, description, cuisine_type, price_avg, 
                   rating, latitude, longitude
            FROM restaurants 
            WHERE city_id = %s
            ORDER BY rating DESC, name ASC
        """
        cursor.execute(query, (city_id,))
        
        restaurants = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({"restaurants": restaurants})
    
    except Exception as e:
        print(f"Error getting restaurants for city {city_id}: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/cities/<int:city_id>/hotels", methods=["GET"])
def get_hotels_by_city(city_id):
    """
    Lấy danh sách hotels theo city_id
    """
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "Database connection failed"}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        query = """
            SELECT hotel_id, name, description, stars, price_per_night, 
                   rating, latitude, longitude
            FROM hotels 
            WHERE city_id = %s
            ORDER BY rating DESC, stars DESC, name ASC
        """
        cursor.execute(query, (city_id,))
        
        hotels = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({"hotels": hotels})
    
    except Exception as e:
        print(f"Error getting hotels for city {city_id}: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

# =============================================================================
# TOUR GENERATION API - Integration with recommendation.py
# =============================================================================

@app.route("/api/generate-tour", methods=["POST"])
def generate_tour():
    """
    API endpoint để generate tour sử dụng recommendation.py
    Input: JSON object với format từ frontend form
    Output: Generated tour JSON từ recommendation system
    """
    try:
        # Lấy dữ liệu từ request
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        print(f"🎯 Received tour generation request: {data}")
        
        # Validate required fields
        required_fields = ['destination_city_id', 'guest_count', 'duration_days', 'target_budget']
        for field in required_fields:
            if field not in data or data[field] is None:
                return jsonify({
                    "success": False,
                    "error": f"Missing required field: {field}"
                }), 400
        
        # Import recommendation functions
        try:
            from recommendation import UserTourInfo, recommend_cold_start, build_final_tour_json
        except ImportError as e:
            print(f"❌ Error importing recommendation module: {str(e)}")
            return jsonify({
                "success": False,
                "error": "Recommendation system not available"
            }), 500
        
        # Chuẩn bị dữ liệu cho recommendation system
        tour_input = {
            "user_id": data.get("user_id", None),
            "start_city_id": data.get("start_city_id", None),
            "destination_city_id": int(data["destination_city_id"]),
            "hotel_ids": data.get("hotel_ids", []),
            "activity_ids": data.get("activity_ids", []),
            "restaurant_ids": data.get("restaurant_ids", []),
            "transport_ids": data.get("transport_ids", []),
            "guest_count": int(data["guest_count"]),
            "duration_days": int(data["duration_days"]),
            "target_budget": float(data["target_budget"])
        }
        
        print(f"📋 Processed tour input: {tour_input}")
        
        # Tạo UserTourInfo object
        try:
            user_tour = UserTourInfo(tour_input)
            print(f"✅ Created UserTourInfo object for user: {user_tour.user_id}")
        except Exception as e:
            print(f"❌ Error creating UserTourInfo: {str(e)}")
            return jsonify({
                "success": False,
                "error": f"Error creating tour request: {str(e)}"
            }), 500
        
        # Chạy recommendation algorithm
        try:
            # Sử dụng cold-start recommendation
            cold_df = recommend_cold_start(user_tour, K=5, top_n=1)
            
            if cold_df.empty:
                return jsonify({
                    "success": False,
                    "error": "No suitable tour recommendations found"
                }), 404
            
            print(f"🔍 Found cold-start recommendations: {cold_df['option_id'].tolist()}")
            
            # Build final tour JSON
            tour_result = build_final_tour_json(user_tour, mode='cold_start')
            
            if not tour_result:
                return jsonify({
                    "success": False,
                    "error": "Failed to build tour recommendation"
                }), 500
                
            print(f"🎉 Successfully generated tour: {tour_result.get('tour_id', 'N/A')}")
            
            # Return success response
            return jsonify({
                "success": True,
                "data": tour_result,
                "recommendation_info": {
                    "recommended_option_ids": cold_df['option_id'].tolist(),
                    "algorithm_used": "cold_start",
                    "similar_users_count": 5
                }
            })
            
        except Exception as e:
            print(f"❌ Error during tour generation: {str(e)}")
            return jsonify({
                "success": False,
                "error": f"Error generating tour: {str(e)}"
            }), 500
    
    except Exception as e:
        print(f"❌ Unexpected error in generate_tour: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Unexpected server error: {str(e)}"
        }), 500

@app.route('/<path:filename>')
def serve_files(filename):
    return send_from_directory('.', filename)

if __name__ == "__main__":
    print("🚀 Starting Smart Travel Vietnam Flask Server...")
    print("🌐 Access URL: http://localhost:8386")
    print("📱 Dashboard: http://localhost:8386/dashboard")
    print("🔐 Test Account: test@example.com / test123")
    
    app.run(debug=True, host="0.0.0.0", port=8386)