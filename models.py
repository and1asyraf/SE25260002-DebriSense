"""
DebriSense Database Models
Using Flask-SQLAlchemy with PostgreSQL (Supabase)
"""

from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class Admin(UserMixin, db.Model):
    """Admin model for system administrators"""
    __tablename__ = 'admins'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    name = db.Column(db.String(150), nullable=False, default='Admin')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)
    
    # Relationship to rivers added by admin
    rivers = db.relationship('River', backref='added_by_admin', lazy='dynamic', 
                            foreign_keys='River.admin_id')
    
    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if password matches hash"""
        return check_password_hash(self.password_hash, password)
    
    def get_id(self):
        """Override to prefix with 'admin_' for Flask-Login"""
        return f'admin_{self.id}'
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'is_active': self.is_active,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'rivers_count': self.rivers.count()
        }
    
    def __repr__(self):
        return f'<Admin {self.email}>'


class User(UserMixin, db.Model):
    """NGO User model for authentication and profile"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    ngo_name = db.Column(db.String(150), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    address = db.Column(db.Text, nullable=True)
    profile_image = db.Column(db.String(255), nullable=True, default='default_profile.png')
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if password matches hash"""
        return check_password_hash(self.password_hash, password)
    
    def get_id(self):
        """Override to prefix with 'user_' for Flask-Login"""
        return f'user_{self.id}'
    
    def to_dict(self):
        """Convert user to dictionary (exclude sensitive data)"""
        return {
            'id': self.id,
            'email': self.email,
            'ngo_name': self.ngo_name,
            'phone': self.phone,
            'address': self.address,
            'profile_image': self.profile_image,
            'is_verified': self.is_verified,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }
    
    def __repr__(self):
        return f'<User {self.email}>'


class River(db.Model):
    """River monitoring location model"""
    __tablename__ = 'rivers'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    info = db.Column(db.Text, nullable=True)
    image = db.Column(db.String(255), nullable=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('admins.id'), nullable=True)
    date_added = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Additional metadata
    state = db.Column(db.String(100), nullable=True)  # Malaysian state
    district = db.Column(db.String(100), nullable=True)
    
    # Land use type for debris profile prediction
    # Options: urban, industrial, rural, coastal, mixed
    land_use = db.Column(db.String(50), nullable=True, default='urban')
    
    def get_debris_profile(self):
        """Get debris type distribution based on land use"""
        # Research-based debris profiles for Malaysian rivers
        profiles = {
            'urban': {
                'plastic': 55,
                'organic': 20,
                'household': 15,
                'industrial': 5,
                'others': 5
            },
            'industrial': {
                'plastic': 35,
                'organic': 10,
                'household': 10,
                'industrial': 35,
                'others': 10
            },
            'rural': {
                'plastic': 25,
                'organic': 45,
                'household': 15,
                'industrial': 5,
                'others': 10
            },
            'coastal': {
                'plastic': 40,
                'organic': 20,
                'household': 10,
                'industrial': 10,
                'others': 20  # Includes fishing gear, marine debris
            },
            'mixed': {
                'plastic': 45,
                'organic': 25,
                'household': 15,
                'industrial': 10,
                'others': 5
            }
        }
        return profiles.get(self.land_use or 'urban', profiles['urban'])
    
    def to_dict(self):
        """Convert river to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'info': self.info or '',
            'image': self.image,
            'added_by': self.added_by_admin.name if self.added_by_admin else 'System',
            'date_added': self.date_added.strftime('%Y-%m-%d') if self.date_added else None,
            'state': self.state,
            'district': self.district,
            'land_use': self.land_use or 'urban',
            'debris_profile': self.get_debris_profile()
        }
    
    def __repr__(self):
        return f'<River {self.name}>'


class DRIReading(db.Model):
    """Historical DRI readings for trend analysis"""
    __tablename__ = 'dri_readings'
    
    id = db.Column(db.Integer, primary_key=True)
    river_id = db.Column(db.Integer, db.ForeignKey('rivers.id'), nullable=False)
    dri_score = db.Column(db.Float, nullable=False)
    risk_level = db.Column(db.String(20), nullable=False)
    
    # Environmental factors
    rainfall = db.Column(db.Float, nullable=True)
    wind_speed = db.Column(db.Float, nullable=True)
    tide_level = db.Column(db.Float, nullable=True)
    water_flow = db.Column(db.Float, nullable=True)
    
    # Prediction
    estimated_debris_kg = db.Column(db.Float, nullable=True)
    
    # Timestamp
    recorded_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    # Relationship
    river = db.relationship('River', backref=db.backref('readings', lazy='dynamic'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'river_id': self.river_id,
            'dri_score': self.dri_score,
            'risk_level': self.risk_level,
            'rainfall': self.rainfall,
            'wind_speed': self.wind_speed,
            'tide_level': self.tide_level,
            'water_flow': self.water_flow,
            'estimated_debris_kg': self.estimated_debris_kg,
            'recorded_at': self.recorded_at.strftime('%Y-%m-%d %H:%M:%S') if self.recorded_at else None
        }
    
    def __repr__(self):
        return f'<DRIReading {self.river_id} - {self.dri_score}>'


# ============================================
# NGO Feature Models
# ============================================

class DebrisReport(db.Model):
    """Debris sighting reports submitted by NGOs"""
    __tablename__ = 'debris_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    river_id = db.Column(db.Integer, db.ForeignKey('rivers.id'), nullable=False)
    
    # Report details
    debris_type = db.Column(db.String(50), nullable=False)  # plastic, organic, household, industrial, mixed
    estimated_amount = db.Column(db.String(50), nullable=False)  # small, medium, large, massive
    description = db.Column(db.Text, nullable=True)
    photo = db.Column(db.String(255), nullable=True)
    
    # Location (can be different from river's main coordinates)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    
    # Status
    status = db.Column(db.String(20), default='pending')  # pending, reviewed, resolved
    admin_notes = db.Column(db.Text, nullable=True)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('admins.id'), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    
    # Timestamps
    reported_at = db.Column(db.DateTime, default=datetime.utcnow)
    sighting_date = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('debris_reports', lazy='dynamic'))
    river = db.relationship('River', backref=db.backref('debris_reports', lazy='dynamic'))
    reviewer = db.relationship('Admin', backref=db.backref('reviewed_reports', lazy='dynamic'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.ngo_name if self.user else None,
            'river_id': self.river_id,
            'river_name': self.river.name if self.river else None,
            'debris_type': self.debris_type,
            'estimated_amount': self.estimated_amount,
            'description': self.description,
            'photo': self.photo,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'status': self.status,
            'admin_notes': self.admin_notes,
            'reported_at': self.reported_at.strftime('%Y-%m-%d %H:%M') if self.reported_at else None,
            'sighting_date': self.sighting_date.strftime('%Y-%m-%d') if self.sighting_date else None
        }
    
    def __repr__(self):
        return f'<DebrisReport {self.id} - {self.debris_type}>'


class Watchlist(db.Model):
    """NGO's river watchlist/favorites"""
    __tablename__ = 'watchlist'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    river_id = db.Column(db.Integer, db.ForeignKey('rivers.id'), nullable=False)
    
    # Alert preferences
    alert_on_high = db.Column(db.Boolean, default=True)
    alert_on_critical = db.Column(db.Boolean, default=True)
    email_alerts = db.Column(db.Boolean, default=False)
    
    # Timestamps
    added_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_alert_sent = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('watchlist', lazy='dynamic'))
    river = db.relationship('River', backref=db.backref('watchers', lazy='dynamic'))
    
    # Unique constraint - user can only watch a river once
    __table_args__ = (db.UniqueConstraint('user_id', 'river_id', name='unique_user_river_watch'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'river_id': self.river_id,
            'river_name': self.river.name if self.river else None,
            'river_info': self.river.to_dict() if self.river else None,
            'alert_on_high': self.alert_on_high,
            'alert_on_critical': self.alert_on_critical,
            'email_alerts': self.email_alerts,
            'added_at': self.added_at.strftime('%Y-%m-%d %H:%M') if self.added_at else None
        }
    
    def __repr__(self):
        return f'<Watchlist User:{self.user_id} River:{self.river_id}>'


class LocationRequest(db.Model):
    """NGO requests for new monitoring locations"""
    __tablename__ = 'location_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Location details
    location_name = db.Column(db.String(150), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    state = db.Column(db.String(100), nullable=True)
    district = db.Column(db.String(100), nullable=True)
    land_use = db.Column(db.String(50), default='urban')
    
    # Request details
    reason = db.Column(db.Text, nullable=False)
    additional_info = db.Column(db.Text, nullable=True)
    
    # Status
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    admin_response = db.Column(db.Text, nullable=True)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('admins.id'), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    
    # If approved, link to created river
    created_river_id = db.Column(db.Integer, db.ForeignKey('rivers.id'), nullable=True)
    
    # Timestamps
    requested_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('location_requests', lazy='dynamic'))
    reviewer = db.relationship('Admin', backref=db.backref('reviewed_requests', lazy='dynamic'))
    created_river = db.relationship('River', backref=db.backref('request', uselist=False))
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.ngo_name if self.user else None,
            'location_name': self.location_name,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'state': self.state,
            'district': self.district,
            'land_use': self.land_use,
            'reason': self.reason,
            'additional_info': self.additional_info,
            'status': self.status,
            'admin_response': self.admin_response,
            'reviewed_at': self.reviewed_at.strftime('%Y-%m-%d %H:%M') if self.reviewed_at else None,
            'requested_at': self.requested_at.strftime('%Y-%m-%d %H:%M') if self.requested_at else None
        }
    
    def __repr__(self):
        return f'<LocationRequest {self.id} - {self.location_name}>'


class Alert(db.Model):
    """In-app alerts/notifications for NGOs"""
    __tablename__ = 'alerts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Alert details
    alert_type = db.Column(db.String(50), nullable=False)  # dri_high, dri_critical, report_reviewed, request_approved, etc.
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    
    # Related entities (optional)
    river_id = db.Column(db.Integer, db.ForeignKey('rivers.id'), nullable=True)
    report_id = db.Column(db.Integer, db.ForeignKey('debris_reports.id'), nullable=True)
    request_id = db.Column(db.Integer, db.ForeignKey('location_requests.id'), nullable=True)
    
    # Status
    is_read = db.Column(db.Boolean, default=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    read_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('alerts', lazy='dynamic'))
    river = db.relationship('River', backref=db.backref('alerts', lazy='dynamic'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'alert_type': self.alert_type,
            'title': self.title,
            'message': self.message,
            'river_id': self.river_id,
            'is_read': self.is_read,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M') if self.created_at else None
        }
    
    def __repr__(self):
        return f'<Alert {self.id} - {self.alert_type}>'
