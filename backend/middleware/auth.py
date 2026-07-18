from functools import wraps
import os
from flask import request, jsonify
import jwt
from backend.models.user import UserModel

JWT_SECRET = os.getenv("JWT_SECRET", "supersecret_SSJewellery_key_123")

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Check for Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({"message": "Authentication token is missing!"}), 401
        
        try:
            # Decode token
            data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            is_admin = data.get("is_admin", False)
            if is_admin:
                admin_id = data.get("admin_id") or data.get("user_id")
                from backend.models.admin import AdminModel
                admin = None
                if admin_id:
                    admin = AdminModel.query.get(int(admin_id)) if str(admin_id).isdigit() else AdminModel.query.filter_by(username=admin_id).first()
                if not admin:
                    return jsonify({"message": "User not found or disabled!"}), 401
                current_user = {
                    "_id": str(admin.id),
                    "id": str(admin.id),
                    "name": admin.username,
                    "email": f"{admin.username}@SSJewellery.com",
                    "is_admin": True,
                    "role": "admin"
                }
            else:
                current_user = UserModel.find_by_id(data['user_id'])
            
            if not current_user:
                return jsonify({"message": "User not found or disabled!"}), 401
            
            # Check is_blocked status
            is_blocked = current_user.get("is_blocked", False) if isinstance(current_user, dict) else getattr(current_user, 'is_blocked', False)
            if is_blocked:
                return jsonify({"message": "Your account has been suspended by the administrator."}), 403
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token has expired! Please login again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"message": "Invalid token! Please login again."}), 401
        except Exception as e:
            return jsonify({"message": f"Authentication error: {str(e)}"}), 401
            
        return f(current_user, *args, **kwargs)
        
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
                
        if not token:
            return jsonify({"message": "Authentication token is missing!"}), 401
            
        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            is_admin = data.get("is_admin", False)
            if not is_admin:
                return jsonify({"message": "Access denied! Admin privileges required."}), 403
            
            admin_id = data.get("admin_id") or data.get("user_id")
            if not admin_id:
                return jsonify({"message": "Access denied! Invalid authentication token."}), 403
            
            from backend.models.admin import AdminModel
            admin = None
            if str(admin_id).isdigit():
                admin = AdminModel.query.get(int(admin_id))
            else:
                admin = AdminModel.query.filter_by(username=admin_id).first()
                
            if not admin:
                return jsonify({"message": "Access denied! Admin privileges required."}), 403
        except Exception as e:
            return jsonify({"message": "Access denied! Invalid authentication token."}), 403
            
        return f(*args, **kwargs)
        
    return decorated

