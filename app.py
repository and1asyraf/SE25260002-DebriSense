from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
import os
import json
from datetime import datetime
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from functools import wraps

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['UPLOAD_FOLDER'] = os.path.join('static', 'img', 'rivers')
app.config['PROFILE_UPLOAD_FOLDER'] = os.path.join('static', 'img', 'profiles')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

# Database Configuration (Supabase PostgreSQL)
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    if DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///debrisense.db'
    
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# WeatherAPI Configuration
WEATHER_API_KEY = os.environ.get('WEATHER_API_KEY', '84b6782ee30a4551acc83954252608')
WEATHER_API_URL = 'http://api.weatherapi.com/v1/current.json'

# Initialize extensions
from models import db, User, Admin, River, DRIReading, DebrisReport, Watchlist, LocationRequest, Alert
db.init_app(app)

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Please log in to access this page.'
login_manager.login_message_category = 'info'

@login_manager.user_loader
def load_user(user_id):
    """Load user by ID - handles both Admin and NGO users"""
    if user_id.startswith('admin_'):
        admin_id = int(user_id.replace('admin_', ''))
        return Admin.query.get(admin_id)
    elif user_id.startswith('user_'):
        ngo_id = int(user_id.replace('user_', ''))
        return User.query.get(ngo_id)
    return None

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Custom decorators for role-based access
def admin_required(f):
    """Decorator to require admin login"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            flash('Please log in as admin to access this page.', 'warning')
            return redirect(url_for('admin_login'))
        if not isinstance(current_user, Admin):
            flash('Access denied. Admin privileges required.', 'error')
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function

def ngo_required(f):
    """Decorator to require NGO user login"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            flash('Please log in to access this page.', 'warning')
            return redirect(url_for('login'))
        if not isinstance(current_user, User):
            flash('Access denied. NGO account required.', 'error')
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function

# Create database tables and default admin
with app.app_context():
    # Create tables if they don't exist
    db.create_all()
    
    # Create default admin if not exists
    try:
        default_admin = Admin.query.filter_by(email='admin@debrisense.my').first()
        if not default_admin:
            admin = Admin(
                email='admin@debrisense.my',
                name='DebriSense Admin'
            )
            admin.set_password('123456')
            db.session.add(admin)
            db.session.commit()
            print("✓ Default admin created: admin@debrisense.my / 123456")
        else:
            print("✓ Admin account exists")
    except Exception as e: 
        print(f"Admin creation error: {e}")
        db.session.rollback()
    
    print("✓ Database ready!")

# ============================================
# Helper Functions
# ============================================

def load_rivers_from_db():
    """Load rivers from PostgreSQL database"""
    try:
        rivers = River.query.filter_by(is_active=True).all()
        return [r.to_dict() for r in rivers]
    except Exception as e:
        print(f"Error loading rivers from DB: {e}")
        return []  # Return empty list instead of falling back to JSON

def load_rivers_from_json():
    """Fallback: Load rivers from JSON file (for migration only)"""
    try:
        with open('data/rivers.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def migrate_json_to_db():
    """Migrate existing JSON data to database"""
    try:
        json_rivers = load_rivers_from_json()
        for r in json_rivers:
            existing = River.query.filter_by(name=r['name']).first()
            if not existing:
                river = River(
                    name=r['name'],
                    latitude=r['latitude'],
                    longitude=r['longitude'],
                    info=r.get('info', ''),
                    image=r.get('image'),
                    date_added=datetime.strptime(r.get('date_added', '2024-01-01'), '%Y-%m-%d')
                )
                db.session.add(river)
        db.session.commit()
        print("Migration complete!")
    except Exception as e:
        print(f"Migration error: {e}")
        db.session.rollback()

# ============================================
# Public Routes
# ============================================

@app.route('/')
def index():
    """Main public dashboard - displays the interactive map"""
    rivers = load_rivers_from_db()
    return render_template('index.html', rivers=rivers)

@app.route('/be-part-of-us')
def be_part_of_us():
    """Be Part of Us page - NGO registration and login"""
    return render_template('be_part_of_us.html')

# ============================================
# NGO Authentication Routes
# ============================================

@app.route('/login', methods=['GET', 'POST'])
def login():
    """NGO Login page"""
    if current_user.is_authenticated:
        if isinstance(current_user, Admin):
            return redirect(url_for('admin_dashboard'))
        return redirect(url_for('ngo_dashboard'))
    
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        remember = request.form.get('remember', False)
        
        user = User.query.filter_by(email=email).first()
        
        if user and user.check_password(password):
            if not user.is_active:
                flash('Your account has been deactivated. Please contact support.', 'error')
                return redirect(url_for('login'))
            
            login_user(user, remember=bool(remember))
            flash(f'Welcome back, {user.ngo_name}!', 'success')
            
            next_page = request.args.get('next')
            return redirect(next_page or url_for('ngo_dashboard'))
        else:
            flash('Invalid email or password. Please try again.', 'error')
    
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    """NGO Registration page"""
    if current_user.is_authenticated:
        if isinstance(current_user, Admin):
            return redirect(url_for('admin_dashboard'))
        return redirect(url_for('ngo_dashboard'))
    
    if request.method == 'POST':
        ngo_name = request.form.get('ngo_name')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        phone = request.form.get('phone')
        address = request.form.get('address')
        
        if password != confirm_password:
            flash('Passwords do not match!', 'error')
            return redirect(url_for('register'))
        
        if len(password) < 8:
            flash('Password must be at least 8 characters long!', 'error')
            return redirect(url_for('register'))
        
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            flash('An account with this email already exists.', 'error')
            return redirect(url_for('register'))
        
        try:
            user = User(
                email=email,
                ngo_name=ngo_name,
                phone=phone,
                address=address
            )
            user.set_password(password)
            
            db.session.add(user)
            db.session.commit()
            
            flash('Registration successful! Please log in.', 'success')
            return redirect(url_for('login'))
            
        except Exception as e:
            db.session.rollback()
            flash(f'Registration failed: {str(e)}', 'error')
            return redirect(url_for('register'))
    
    return render_template('register.html')

@app.route('/ngo/logout')
@ngo_required
def ngo_logout():
    """Logout NGO user"""
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('index'))

# ============================================
# NGO Dashboard Routes
# ============================================

@app.route('/ngo-dashboard')
@ngo_required
def ngo_dashboard():
    """NGO Dashboard - view rivers and DRI data"""
    rivers = load_rivers_from_db()
    return render_template('ngo_dashboard.html', rivers=rivers, user=current_user)

@app.route('/ngo/profile')
@ngo_required
def ngo_profile():
    """NGO Profile page"""
    return render_template('profile.html', user=current_user, rivers=[])

@app.route('/ngo/profile/update', methods=['POST'])
@ngo_required
def update_ngo_profile():
    """Update NGO profile"""
    try:
        current_user.ngo_name = request.form.get('ngo_name', current_user.ngo_name)
        current_user.phone = request.form.get('phone', current_user.phone)
        current_user.address = request.form.get('address', current_user.address)
        
        if 'profile_image' in request.files:
            file = request.files['profile_image']
            if file and file.filename and allowed_file(file.filename):
                ext = file.filename.rsplit('.', 1)[1].lower()
                filename = f"ngo_{current_user.id}.{ext}"
                
                os.makedirs(app.config['PROFILE_UPLOAD_FOLDER'], exist_ok=True)
                file_path = os.path.join(app.config['PROFILE_UPLOAD_FOLDER'], filename)
                file.save(file_path)
                
                current_user.profile_image = filename
        
        db.session.commit()
        flash('Profile updated successfully!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error updating profile: {str(e)}', 'error')
    
    return redirect(url_for('ngo_profile'))

# ============================================
# Admin Authentication Routes
# ============================================

@app.route('/admin-login', methods=['GET', 'POST'])
def admin_login():
    """Admin Login page"""
    if current_user.is_authenticated:
        if isinstance(current_user, Admin):
            return redirect(url_for('admin_dashboard'))
        # If NGO user is logged in, log them out first
        logout_user()
    
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        admin = Admin.query.filter_by(email=email).first()
        
        if admin and admin.check_password(password):
            if not admin.is_active:
                flash('This admin account has been deactivated.', 'error')
                return redirect(url_for('admin_login'))
            
            login_user(admin)
            admin.last_login = datetime.utcnow()
            db.session.commit()
            
            flash(f'Welcome, {admin.name}!', 'success')
            return redirect(url_for('admin_dashboard'))
        else:
            flash('Invalid admin credentials.', 'error')
    
    return render_template('admin_login.html')

@app.route('/admin/logout')
@admin_required
def admin_logout():
    """Logout admin"""
    logout_user()
    flash('Admin logged out successfully.', 'info')
    return redirect(url_for('index'))

# ============================================
# Admin Dashboard Routes
# ============================================

@app.route('/admin')
@app.route('/admin-dashboard')
@admin_required
def admin_dashboard():
    """Admin Dashboard - full control over rivers"""
    rivers = load_rivers_from_db()
    admin_rivers = River.query.filter_by(admin_id=current_user.id).all()
    return render_template('admin_dashboard.html', 
                         rivers=rivers, 
                         admin_rivers=admin_rivers,
                         user=current_user)

# ============================================
# API Routes
# ============================================

@app.route('/api/rivers')
def get_rivers():
    """API endpoint to get all rivers"""
    rivers = load_rivers_from_db()
    return jsonify(rivers)

@app.route('/api/test')
def test_api():
    """Test endpoint to verify API is working"""
    return jsonify({'status': 'ok', 'message': 'API is working!'})

@app.route('/api/river/<int:river_id>/dri')
def get_river_dri(river_id):
    """Get DRI (Debris Risk Index) for a specific river"""
    try:
        river = River.query.get(river_id)
        
        if not river:
            rivers = load_rivers_from_json()
            river_data = next((r for r in rivers if r['id'] == river_id), None)
            if not river_data:
                return jsonify({'error': 'River not found'}), 404
        else:
            river_data = river.to_dict()
        
        import requests
        weather_data = None 
        try: 
            weather_response = requests.get(
                WEATHER_API_URL,
                params={
                    'key': WEATHER_API_KEY,
                    'q': f"{river_data['latitude']},{river_data['longitude']}",
                    'aqi': 'no'
                },
                timeout=10
            )
            if weather_response.status_code == 200:
                weather_data = weather_response.json()
        except Exception as e:
            print(f"Weather API exception: {str(e)}")
            weather_data = None
        
        dri_data = calculate_dri(river_data, weather_data)
        
        try:
            reading = DRIReading(
                river_id=river_id,
                dri_score=dri_data['dri_score'],
                risk_level=dri_data['risk_level'],
                rainfall=dri_data['factors']['rainfall']['value'],
                wind_speed=dri_data['factors']['wind_speed']['value'],
                tide_level=dri_data['factors']['tide_level']['value'],
                water_flow=dri_data['factors']['water_flow']['value'],
                estimated_debris_kg=dri_data['debris_estimate_kg']
            )
            db.session.add(reading)
            db.session.commit()
        except Exception as e:
            print(f"Error saving DRI reading: {e}")
            db.session.rollback()
        
        return jsonify(dri_data)
    
    except Exception as e:
        print(f"Error in get_river_dri: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

def calculate_dri(river, weather_data):
    """Calculate Debris Risk Index using weighted index methodology"""
    import random
    
    if weather_data and 'current' in weather_data:
        rainfall = weather_data['current'].get('precip_mm', 0)
        wind_speed = weather_data['current'].get('wind_kph', 0)
    else:
        rainfall = random.uniform(0, 50)
        wind_speed = random.uniform(0, 40)
    
    tide_level = random.uniform(0, 3)
    water_flow = random.uniform(0, 100)
    
    MAX_RAINFALL = 50
    MAX_WIND = 40
    MAX_TIDE = 3
    MAX_FLOW = 100
    
    rainfall_score = min((rainfall / MAX_RAINFALL) * 100, 100)
    wind_score = min((wind_speed / MAX_WIND) * 100, 100)
    tide_score = min((tide_level / MAX_TIDE) * 100, 100)
    flow_score = min((water_flow / MAX_FLOW) * 100, 100)
    
    dri_score = (
        (rainfall_score * 0.40) +
        (wind_score * 0.25) +
        (tide_score * 0.20) +
        (flow_score * 0.15)
    )
    
    if dri_score < 30:
        risk_level = "Very Low"
        risk_color = "#28a745"
    elif dri_score < 50:
        risk_level = "Low"
        risk_color = "#90EE90"
    elif dri_score < 70:
        risk_level = "Medium"
        risk_color = "#ffc107"
    elif dri_score < 85:
        risk_level = "High"
        risk_color = "#fd7e14"
    else:
        risk_level = "Critical"
        risk_color = "#dc3545"
    
    debris_amount = (dri_score / 70) * 11600
    
    # Get debris profile from river data
    debris_profile = river.get('debris_profile') if isinstance(river, dict) else None
    land_use = river.get('land_use', 'urban') if isinstance(river, dict) else 'urban'
    
    # If no debris_profile in river data, generate based on land_use
    if not debris_profile:
        profiles = {
            'urban': {'plastic': 55, 'organic': 20, 'household': 15, 'industrial': 5, 'others': 5},
            'industrial': {'plastic': 35, 'organic': 10, 'household': 10, 'industrial': 35, 'others': 10},
            'rural': {'plastic': 25, 'organic': 45, 'household': 15, 'industrial': 5, 'others': 10},
            'coastal': {'plastic': 40, 'organic': 20, 'household': 10, 'industrial': 10, 'others': 20},
            'mixed': {'plastic': 45, 'organic': 25, 'household': 15, 'industrial': 10, 'others': 5}
        }
        debris_profile = profiles.get(land_use, profiles['urban'])
    
    # Adjust debris profile based on weather conditions
    adjusted_profile = adjust_debris_profile(debris_profile, rainfall, wind_speed)
    
    return {
        'river_id': river.get('id') if isinstance(river, dict) else river.id,
        'river_name': river.get('name') if isinstance(river, dict) else river.name,
        'dri_score': round(dri_score, 2),
        'risk_level': risk_level,
        'risk_color': risk_color,
        'debris_estimate_kg': round(debris_amount, 2),
        'land_use': land_use,
        'debris_types': adjusted_profile,
        'factors': {
            'rainfall': {
                'value': round(rainfall, 2),
                'normalized': round(rainfall_score, 2),
                'weight': '40%'
            },
            'wind_speed': {
                'value': round(wind_speed, 2),
                'normalized': round(wind_score, 2),
                'weight': '25%'
            },
            'tide_level': {
                'value': round(tide_level, 2),
                'normalized': round(tide_score, 2),
                'weight': '20%'
            },
            'water_flow': {
                'value': round(water_flow, 2),
                'normalized': round(flow_score, 2),
                'weight': '15%'
            }
        },
        'timestamp': datetime.now().isoformat()
    }

def adjust_debris_profile(base_profile, rainfall, wind_speed):
    """Adjust debris profile based on current weather conditions"""
    adjusted = base_profile.copy()
    
    # Heavy rain increases organic debris (washed from land)
    if rainfall > 30:
        adjusted['organic'] = min(adjusted['organic'] + 10, 60)
        adjusted['plastic'] = max(adjusted['plastic'] - 5, 10)
    
    # High wind increases lightweight debris (plastic, styrofoam)
    if wind_speed > 25:
        adjusted['plastic'] = min(adjusted['plastic'] + 8, 70)
        adjusted['organic'] = max(adjusted['organic'] - 5, 5)
    
    # Normalize to ensure total is 100%
    total = sum(adjusted.values())
    if total != 100:
        factor = 100 / total
        adjusted = {k: round(v * factor) for k, v in adjusted.items()}
        # Fix rounding errors
        diff = 100 - sum(adjusted.values())
        adjusted['plastic'] += diff
    
    return adjusted

@app.route('/api/add-river', methods=['POST'])
@admin_required
def add_river():
    """API endpoint to add new river (admin only)"""
    try:
        if request.content_type and 'multipart/form-data' in request.content_type:
            river_name = request.form.get('river_name')
            latitude = float(request.form.get('latitude'))
            longitude = float(request.form.get('longitude'))
            info = request.form.get('info', '')
            land_use = request.form.get('land_use', 'urban')
            
            image_filename = None
            if 'river_image' in request.files:
                file = request.files['river_image']
                if file and file.filename and allowed_file(file.filename):
                    ext = file.filename.rsplit('.', 1)[1].lower()
                    safe_name = secure_filename(river_name.replace(' ', ''))
                    image_filename = f"{safe_name}.{ext}"
                    
                    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)
                    file.save(file_path)
        else:
            data = request.get_json()
            river_name = data.get('river_name')
            latitude = float(data.get('latitude'))
            longitude = float(data.get('longitude'))
            info = data.get('info', '')
            land_use = data.get('land_use', 'urban')
            image_filename = data.get('image')
        
        river = River(
            name=river_name,
            latitude=latitude,
            longitude=longitude,
            info=info,
            image=image_filename,
            land_use=land_use,
            admin_id=current_user.id
        )
        db.session.add(river)
        db.session.commit()
        
        return jsonify({'success': True, 'river': river.to_dict()})
        
    except Exception as e:
        db.session.rollback()
        print(f"Error adding river: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/migrate')
def migrate_data():
    """Migrate JSON data to database"""
    migrate_json_to_db()
    return jsonify({'message': 'Migration complete!'})

# ============================================
# Admin API - River Management
# ============================================

@app.route('/api/river/<int:river_id>/edit', methods=['POST'])
@admin_required
def edit_river(river_id):
    """Edit river details (admin only)"""
    try:
        river = River.query.get(river_id)
        if not river:
            return jsonify({'success': False, 'error': 'River not found'}), 404
        
        if request.content_type and 'multipart/form-data' in request.content_type:
            river.name = request.form.get('river_name', river.name)
            river.latitude = float(request.form.get('latitude', river.latitude))
            river.longitude = float(request.form.get('longitude', river.longitude))
            river.info = request.form.get('info', river.info)
            
            if 'river_image' in request.files:
                file = request.files['river_image']
                if file and file.filename and allowed_file(file.filename):
                    ext = file.filename.rsplit('.', 1)[1].lower()
                    safe_name = secure_filename(river.name.replace(' ', ''))
                    image_filename = f"{safe_name}.{ext}"
                    
                    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)
                    file.save(file_path)
                    river.image = image_filename
        else:
            data = request.get_json()
            river.name = data.get('river_name', river.name)
            river.latitude = float(data.get('latitude', river.latitude))
            river.longitude = float(data.get('longitude', river.longitude))
            river.info = data.get('info', river.info)
            if data.get('image'):
                river.image = data.get('image')
        
        db.session.commit()
        return jsonify({'success': True, 'river': river.to_dict()})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/river/<int:river_id>/delete', methods=['POST', 'DELETE'])
@admin_required
def delete_river(river_id):
    """Delete river (admin only)"""
    try:
        river = River.query.get(river_id)
        if not river:
            return jsonify({'success': False, 'error': 'River not found'}), 404
        
        # Delete associated DRI readings first
        DRIReading.query.filter_by(river_id=river_id).delete()
        
        # Delete the river
        db.session.delete(river)
        db.session.commit()
        
        return jsonify({'success': True, 'message': f'River "{river.name}" deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================
# Admin API - User Management
# ============================================

@app.route('/api/users')
@admin_required
def get_all_users():
    """Get all NGO users (admin only)"""
    try:
        users = User.query.all()
        return jsonify({
            'success': True,
            'users': [u.to_dict() for u in users],
            'total': len(users)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/<int:user_id>')
@admin_required
def get_user(user_id):
    """Get single NGO user details (admin only)"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        return jsonify({'success': True, 'user': user.to_dict()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/<int:user_id>/edit', methods=['POST'])
@admin_required
def edit_user(user_id):
    """Edit NGO user details (admin only)"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        data = request.get_json()
        
        user.ngo_name = data.get('ngo_name', user.ngo_name)
        user.phone = data.get('phone', user.phone)
        user.address = data.get('address', user.address)
        user.is_active = data.get('is_active', user.is_active)
        user.is_verified = data.get('is_verified', user.is_verified)
        
        # If new password provided, update it
        if data.get('new_password'):
            user.set_password(data.get('new_password'))
        
        db.session.commit()
        return jsonify({'success': True, 'user': user.to_dict()})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/<int:user_id>/delete', methods=['POST', 'DELETE'])
@admin_required
def delete_user(user_id):
    """Delete NGO user (admin only)"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        ngo_name = user.ngo_name
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({'success': True, 'message': f'User "{ngo_name}" deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/<int:user_id>/toggle-status', methods=['POST'])
@admin_required
def toggle_user_status(user_id):
    """Toggle NGO user active status (admin only)"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        user.is_active = not user.is_active
        db.session.commit()
        
        status = 'activated' if user.is_active else 'deactivated'
        return jsonify({'success': True, 'message': f'User {status}', 'is_active': user.is_active})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/<int:user_id>/verify', methods=['POST'])
@admin_required
def verify_user(user_id):
    """Toggle NGO user verification status (admin only)"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        user.is_verified = not user.is_verified
        db.session.commit()
        
        status = 'verified' if user.is_verified else 'unverified'
        return jsonify({'success': True, 'message': f'User {status}', 'is_verified': user.is_verified})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================
# Admin Profile Management
# ============================================

@app.route('/admin/profile')
@admin_required
def admin_profile():
    """Admin profile page"""
    return render_template('admin_profile.html', admin=current_user)

@app.route('/admin/profile/update', methods=['POST'])
@admin_required
def update_admin_profile():
    """Update admin profile"""
    try:
        current_user.name = request.form.get('name', current_user.name)
        
        # Update password if provided
        new_password = request.form.get('new_password')
        if new_password and len(new_password) >= 6:
            current_user.set_password(new_password)
        
        db.session.commit()
        flash('Profile updated successfully!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error updating profile: {str(e)}', 'error')
    
    return redirect(url_for('admin_profile'))

# ============================================
# Admin Management Pages
# ============================================

@app.route('/admin/users')
@admin_required
def admin_users():
    """Admin page to manage NGO users"""
    users = User.query.all()
    return render_template('admin_users.html', users=users, admin=current_user)

@app.route('/admin/rivers')
@admin_required
def admin_rivers():
    """Admin page to manage rivers"""
    rivers = River.query.all()
    return render_template('admin_rivers.html', rivers=rivers, admin=current_user)

@app.route('/api/reset-db')
def reset_database():
    """Reset database - clear all users (keep admin)"""
    try:
        # Delete all NGO users
        User.query.delete()
        db.session.commit()
        return jsonify({'message': 'All NGO users deleted. Admin account preserved.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/clear-rivers')
def clear_rivers():
    """Clear all rivers from database"""
    try:
        # Delete all DRI readings first (foreign key constraint)
        DRIReading.query.delete()
        # Delete all rivers
        River.query.delete()
        db.session.commit()
        return jsonify({'message': 'All rivers and DRI readings deleted. Map is now clean.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ============================================
# NGO API - Debris Reports
# ============================================

@app.route('/api/ngo/reports', methods=['GET'])
@ngo_required
def get_my_reports():
    """Get all debris reports by current NGO user"""
    try:
        reports = DebrisReport.query.filter_by(user_id=current_user.id).order_by(DebrisReport.reported_at.desc()).all()
        return jsonify({
            'success': True,
            'reports': [r.to_dict() for r in reports],
            'total': len(reports)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/ngo/reports/submit', methods=['POST'])
@ngo_required
def submit_debris_report():
    """Submit a new debris sighting report"""
    try:
        if request.content_type and 'multipart/form-data' in request.content_type:
            river_id = int(request.form.get('river_id'))
            debris_type = request.form.get('debris_type')
            estimated_amount = request.form.get('estimated_amount')
            description = request.form.get('description', '')
            latitude = request.form.get('latitude')
            longitude = request.form.get('longitude')
            sighting_date = request.form.get('sighting_date')
            
            photo_filename = None
            if 'photo' in request.files:
                file = request.files['photo']
                if file and file.filename and allowed_file(file.filename):
                    ext = file.filename.rsplit('.', 1)[1].lower()
                    photo_filename = f"report_{current_user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{ext}"
                    
                    report_folder = os.path.join('static', 'img', 'reports')
                    os.makedirs(report_folder, exist_ok=True)
                    file_path = os.path.join(report_folder, photo_filename)
                    file.save(file_path)
        else:
            data = request.get_json()
            river_id = int(data.get('river_id'))
            debris_type = data.get('debris_type')
            estimated_amount = data.get('estimated_amount')
            description = data.get('description', '')
            latitude = data.get('latitude')
            longitude = data.get('longitude')
            sighting_date = data.get('sighting_date')
            photo_filename = None
        
        report = DebrisReport(
            user_id=current_user.id,
            river_id=river_id,
            debris_type=debris_type,
            estimated_amount=estimated_amount,
            description=description,
            photo=photo_filename,
            latitude=float(latitude) if latitude else None,
            longitude=float(longitude) if longitude else None,
            sighting_date=datetime.strptime(sighting_date, '%Y-%m-%d') if sighting_date else None
        )
        db.session.add(report)
        db.session.commit()
        
        return jsonify({'success': True, 'report': report.to_dict()})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================
# NGO API - Watchlist/Favorites
# ============================================

@app.route('/api/ngo/watchlist', methods=['GET'])
@ngo_required
def get_watchlist():
    """Get NGO user's river watchlist"""
    try:
        watchlist = Watchlist.query.filter_by(user_id=current_user.id).all()
        return jsonify({
            'success': True,
            'watchlist': [w.to_dict() for w in watchlist],
            'total': len(watchlist)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/ngo/watchlist/add', methods=['POST'])
@ngo_required
def add_to_watchlist():
    """Add a river to watchlist"""
    try:
        data = request.get_json()
        river_id = int(data.get('river_id'))
        
        # Check if already in watchlist
        existing = Watchlist.query.filter_by(user_id=current_user.id, river_id=river_id).first()
        if existing:
            return jsonify({'success': False, 'error': 'River already in watchlist'}), 400
        
        watch = Watchlist(
            user_id=current_user.id,
            river_id=river_id,
            alert_on_high=data.get('alert_on_high', True),
            alert_on_critical=data.get('alert_on_critical', True),
            email_alerts=data.get('email_alerts', False)
        )
        db.session.add(watch)
        db.session.commit()
        
        return jsonify({'success': True, 'watchlist_item': watch.to_dict()})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/ngo/watchlist/remove', methods=['POST'])
@ngo_required
def remove_from_watchlist():
    """Remove a river from watchlist"""
    try:
        data = request.get_json()
        river_id = int(data.get('river_id'))
        
        watch = Watchlist.query.filter_by(user_id=current_user.id, river_id=river_id).first()
        if not watch:
            return jsonify({'success': False, 'error': 'River not in watchlist'}), 404
        
        db.session.delete(watch)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Removed from watchlist'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/ngo/watchlist/check/<int:river_id>', methods=['GET'])
@ngo_required
def check_watchlist(river_id):
    """Check if a river is in user's watchlist"""
    try:
        watch = Watchlist.query.filter_by(user_id=current_user.id, river_id=river_id).first()
        return jsonify({
            'success': True,
            'in_watchlist': watch is not None,
            'watchlist_item': watch.to_dict() if watch else None
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================
# NGO API - Location Requests
# ============================================

@app.route('/api/ngo/requests', methods=['GET'])
@ngo_required
def get_my_requests():
    """Get all location requests by current NGO user"""
    try:
        requests_list = LocationRequest.query.filter_by(user_id=current_user.id).order_by(LocationRequest.requested_at.desc()).all()
        return jsonify({
            'success': True,
            'requests': [r.to_dict() for r in requests_list],
            'total': len(requests_list)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/ngo/requests/submit', methods=['POST'])
@ngo_required
def submit_location_request():
    """Submit a request for new monitoring location"""
    try:
        data = request.get_json()
        
        loc_request = LocationRequest(
            user_id=current_user.id,
            location_name=data.get('location_name'),
            latitude=float(data.get('latitude')),
            longitude=float(data.get('longitude')),
            state=data.get('state'),
            district=data.get('district'),
            land_use=data.get('land_use', 'urban'),
            reason=data.get('reason'),
            additional_info=data.get('additional_info', '')
        )
        db.session.add(loc_request)
        db.session.commit()
        
        return jsonify({'success': True, 'request': loc_request.to_dict()})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================
# NGO API - Historical Data & Export
# ============================================

@app.route('/api/ngo/river/<int:river_id>/history', methods=['GET'])
@ngo_required
def get_river_history(river_id):
    """Get historical DRI readings for a river (NGO only)"""
    try:
        # Get optional date range
        days = request.args.get('days', 30, type=int)
        from datetime import timedelta
        start_date = datetime.utcnow() - timedelta(days=days)
        
        readings = DRIReading.query.filter(
            DRIReading.river_id == river_id,
            DRIReading.recorded_at >= start_date
        ).order_by(DRIReading.recorded_at.asc()).all()
        
        river = River.query.get(river_id)
        
        return jsonify({
            'success': True,
            'river_name': river.name if river else None,
            'readings': [r.to_dict() for r in readings],
            'total': len(readings),
            'date_range': {
                'start': start_date.strftime('%Y-%m-%d'),
                'end': datetime.utcnow().strftime('%Y-%m-%d')
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/ngo/export/river/<int:river_id>', methods=['GET'])
@ngo_required
def export_river_data(river_id):
    """Export river DRI data as CSV"""
    try:
        import csv
        from io import StringIO
        from flask import Response
        
        days = request.args.get('days', 30, type=int)
        from datetime import timedelta
        start_date = datetime.utcnow() - timedelta(days=days)
        
        readings = DRIReading.query.filter(
            DRIReading.river_id == river_id,
            DRIReading.recorded_at >= start_date
        ).order_by(DRIReading.recorded_at.desc()).all()
        
        river = River.query.get(river_id)
        
        # Create CSV
        output = StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow(['River Name', 'Date/Time', 'DRI Score', 'Risk Level', 
                        'Rainfall (mm)', 'Wind Speed (kph)', 'Tide Level (m)', 
                        'Water Flow (m³/s)', 'Estimated Debris (kg)'])
        
        # Data rows
        for r in readings:
            writer.writerow([
                river.name if river else 'Unknown',
                r.recorded_at.strftime('%Y-%m-%d %H:%M') if r.recorded_at else '',
                r.dri_score,
                r.risk_level,
                r.rainfall,
                r.wind_speed,
                r.tide_level,
                r.water_flow,
                r.estimated_debris_kg
            ])
        
        output.seek(0)
        
        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename={river.name if river else "river"}_dri_data.csv'
            }
        )
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/ngo/export/watchlist', methods=['GET'])
@ngo_required
def export_watchlist_data():
    """Export all watchlist rivers' data as CSV"""
    try:
        import csv
        from io import StringIO
        from flask import Response
        
        watchlist = Watchlist.query.filter_by(user_id=current_user.id).all()
        river_ids = [w.river_id for w in watchlist]
        
        days = request.args.get('days', 7, type=int)
        from datetime import timedelta
        start_date = datetime.utcnow() - timedelta(days=days)
        
        readings = DRIReading.query.filter(
            DRIReading.river_id.in_(river_ids),
            DRIReading.recorded_at >= start_date
        ).order_by(DRIReading.recorded_at.desc()).all()
        
        # Create CSV
        output = StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow(['River Name', 'Date/Time', 'DRI Score', 'Risk Level', 
                        'Rainfall (mm)', 'Wind Speed (kph)', 'Tide Level (m)', 
                        'Water Flow (m³/s)', 'Estimated Debris (kg)'])
        
        # Data rows
        for r in readings:
            writer.writerow([
                r.river.name if r.river else 'Unknown',
                r.recorded_at.strftime('%Y-%m-%d %H:%M') if r.recorded_at else '',
                r.dri_score,
                r.risk_level,
                r.rainfall,
                r.wind_speed,
                r.tide_level,
                r.water_flow,
                r.estimated_debris_kg
            ])
        
        output.seek(0)
        
        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename=watchlist_dri_data.csv'
            }
        )
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================
# NGO API - Alerts/Notifications
# ============================================

@app.route('/api/ngo/alerts', methods=['GET'])
@ngo_required
def get_alerts():
    """Get NGO user's alerts"""
    try:
        unread_only = request.args.get('unread', 'false').lower() == 'true'
        
        query = Alert.query.filter_by(user_id=current_user.id)
        if unread_only:
            query = query.filter_by(is_read=False)
        
        alerts = query.order_by(Alert.created_at.desc()).limit(50).all()
        unread_count = Alert.query.filter_by(user_id=current_user.id, is_read=False).count()
        
        return jsonify({
            'success': True,
            'alerts': [a.to_dict() for a in alerts],
            'unread_count': unread_count
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/ngo/alerts/mark-read', methods=['POST'])
@ngo_required
def mark_alerts_read():
    """Mark alerts as read"""
    try:
        data = request.get_json()
        alert_ids = data.get('alert_ids', [])
        
        if alert_ids:
            Alert.query.filter(
                Alert.id.in_(alert_ids),
                Alert.user_id == current_user.id
            ).update({Alert.is_read: True, Alert.read_at: datetime.utcnow()}, synchronize_session=False)
        else:
            # Mark all as read
            Alert.query.filter_by(user_id=current_user.id, is_read=False).update(
                {Alert.is_read: True, Alert.read_at: datetime.utcnow()}, synchronize_session=False
            )
        
        db.session.commit()
        return jsonify({'success': True, 'message': 'Alerts marked as read'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================
# Admin API - Review Reports & Requests
# ============================================

@app.route('/admin/reports')
@admin_required
def admin_reports():
    """Admin page to review debris reports"""
    reports = DebrisReport.query.order_by(DebrisReport.reported_at.desc()).all()
    return render_template('admin_reports.html', reports=reports, admin=current_user)

@app.route('/admin/hotspot-reports')
@admin_required
def admin_hotspot_reports():
    """Admin page for hotspot reports management"""
    return render_template('admin_hotspot_reports.html', admin=current_user)

@app.route('/ngo/hotspot-reports')
@ngo_required
def ngo_hotspot_reports():
    """NGO page for viewing hotspot reports"""
    return render_template('ngo_hotspot_reports.html')

@app.route('/admin/location-requests')
@admin_required
def admin_location_requests():
    """Admin page to review location requests"""
    requests_list = LocationRequest.query.order_by(LocationRequest.requested_at.desc()).all()
    return render_template('admin_location_requests.html', requests=requests_list, admin=current_user)

@app.route('/api/admin/reports')
@admin_required
def get_all_reports():
    """Get all debris reports (admin)"""
    try:
        status_filter = request.args.get('status')
        query = DebrisReport.query
        if status_filter:
            query = query.filter_by(status=status_filter)
        
        reports = query.order_by(DebrisReport.reported_at.desc()).all()
        return jsonify({
            'success': True,
            'reports': [r.to_dict() for r in reports],
            'total': len(reports)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/reports/<int:report_id>/review', methods=['POST'])
@admin_required
def review_report(report_id):
    """Review a debris report"""
    try:
        report = DebrisReport.query.get(report_id)
        if not report:
            return jsonify({'success': False, 'error': 'Report not found'}), 404
        
        data = request.get_json()
        report.status = data.get('status', report.status)
        report.admin_notes = data.get('admin_notes', report.admin_notes)
        report.reviewed_by = current_user.id
        report.reviewed_at = datetime.utcnow()
        
        db.session.commit()
        
        # Create alert for the NGO user
        alert = Alert(
            user_id=report.user_id,
            alert_type='report_reviewed',
            title='Debris Report Reviewed',
            message=f'Your debris report for {report.river.name} has been marked as {report.status}.',
            river_id=report.river_id,
            report_id=report.id
        )
        db.session.add(alert)
        db.session.commit()
        
        return jsonify({'success': True, 'report': report.to_dict()})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/requests')
@admin_required
def get_all_location_requests():
    """Get all location requests (admin)"""
    try:
        status_filter = request.args.get('status')
        query = LocationRequest.query
        if status_filter:
            query = query.filter_by(status=status_filter)
        
        requests_list = query.order_by(LocationRequest.requested_at.desc()).all()
        return jsonify({
            'success': True,
            'requests': [r.to_dict() for r in requests_list],
            'total': len(requests_list)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/requests/<int:request_id>/review', methods=['POST'])
@admin_required
def review_location_request(request_id):
    """Review a location request (approve/reject)"""
    try:
        loc_request = LocationRequest.query.get(request_id)
        if not loc_request:
            return jsonify({'success': False, 'error': 'Request not found'}), 404
        
        data = request.get_json()
        new_status = data.get('status')
        admin_response = data.get('admin_response', '')
        
        loc_request.status = new_status
        loc_request.admin_response = admin_response
        loc_request.reviewed_by = current_user.id
        loc_request.reviewed_at = datetime.utcnow()
        
        # If approved, create the river
        if new_status == 'approved':
            river = River(
                name=loc_request.location_name,
                latitude=loc_request.latitude,
                longitude=loc_request.longitude,
                state=loc_request.state,
                district=loc_request.district,
                land_use=loc_request.land_use,
                info=f'Requested by {loc_request.user.ngo_name}. Reason: {loc_request.reason}',
                admin_id=current_user.id
            )
            db.session.add(river)
            db.session.flush()  # Get the river ID
            loc_request.created_river_id = river.id
        
        db.session.commit()
        
        # Create alert for the NGO user
        alert_message = f'Your location request for "{loc_request.location_name}" has been {new_status}.'
        if admin_response:
            alert_message += f' Admin response: {admin_response}'
        
        alert = Alert(
            user_id=loc_request.user_id,
            alert_type=f'request_{new_status}',
            title=f'Location Request {new_status.capitalize()}',
            message=alert_message,
            request_id=loc_request.id
        )
        db.session.add(alert)
        db.session.commit()
        
        return jsonify({'success': True, 'request': loc_request.to_dict()})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================
# Utility Routes
# ============================================

@app.route('/health')
def health():
    """Health check endpoint"""
    return {'status': 'healthy', 'message': 'DebriSense API is running'}

# ============================================
# Error Handlers
# ============================================

@app.errorhandler(401)
def unauthorized(e):
    flash('Please log in to access this page.', 'warning')
    return redirect(url_for('login'))

@app.errorhandler(404)
def not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('500.html'), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
