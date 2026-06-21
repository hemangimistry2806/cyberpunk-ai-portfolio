import jwt
import datetime
from functools import wraps
from flask import request, jsonify, current_app
from backend.app.models.user import User

def generate_token(user_id):
    payload = {
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1),
        'iat': datetime.datetime.utcnow(),
        'sub': user_id
    }
    return jwt.encode(payload, current_app.config.get('JWT_SECRET_KEY'), algorithm='HS256')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({"message": "Token is missing!"}), 401
        
        if not token:
            return jsonify({"message": "Token is missing!"}), 401
        
        try:
            data = jwt.decode(token, current_app.config.get('JWT_SECRET_KEY'), algorithms=["HS256"])
            current_user = User.query.filter_by(id=data['sub']).first()
        except Exception as e:
            return jsonify({"message": "Token is invalid!"}), 401
            
        return f(current_user, *args, **kwargs)
    
    return decorated
