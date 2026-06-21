from flask import Blueprint, request, jsonify
from backend.app.extensions import db, bcrypt
from backend.app.models.user import User
from backend.app.utils.auth import generate_token

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"message": "Missing required fields"}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"message": "User already exists"}), 409
        
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    new_user = User(
        username=data.get('username', data['email'].split('@')[0]),
        email=data['email'],
        password_hash=hashed_password
    )
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({"message": "User registered successfully"}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"message": "Invalid login request"}), 400
        
    user = User.query.filter_by(email=data['email']).first()
    if user and bcrypt.check_password_hash(user.password_hash, data['password']):
        token = generate_token(user.id)
        return jsonify({
            "token": token,
            "user": user.to_dict()
        }), 200
        
    return jsonify({"message": "Invalid email or password"}), 401
