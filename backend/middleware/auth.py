from functools import wraps
import os
import logging
from flask import request, jsonify
import jwt
from backend.models.user import UserModel
from backend.models.admin import AdminModel

JWT_SECRET = os.getenv("JWT_SECRET", "supersecret_SSJewellery_key_123")

logger = logging.getLogger("auth_middleware")

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
            logger.warning(f"token_required: Missing token for request to {request.path}")
            return jsonify({"message": "Authentication token is missing!"}), 401
        
        try:
            # Decode token
            data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            is_admin = data.get("is_admin", False)
            logger.info(f"token_required: Decoded token payload={data}, is_admin={is_admin} for request to {request.path}")
            
            if is_admin:
                admin_id = data.get("admin_id") or data.get("user_id")
                admin = None
                if admin_id:
                    admin = AdminModel.query.get(int(admin_id)) if str(admin_id).isdigit() else AdminModel.query.filter_by(username=admin_id).first()
                if not admin:
                    # Fallback to check UserModel
                    if admin_id:
                        user = UserModel.query.get(int(admin_id)) if str(admin_id).isdigit() else UserModel.query.filter((UserModel.email == admin_id) | (UserModel.name == admin_id)).first()
                        if user and user.is_admin:
                            admin = user
                if not admin:
                    logger.warning(f"token_required: Admin user not found in database for admin_id={admin_id}")
                    return jsonify({"message": "User not found or disabled!"}), 401
                current_user = {
                    "_id": str(admin.id),
                    "id": str(admin.id),
                    "name": getattr(admin, 'username', getattr(admin, 'name', 'admin')),
                    "email": getattr(admin, 'email', f"{getattr(admin, 'username', 'admin')}@SSJewellery.com"),
                    "is_admin": True,
                    "role": "admin"
                }
            else:
                current_user = UserModel.find_by_id(data['user_id'])
            
            if not current_user:
                logger.warning(f"token_required: Customer not found in database for user_id={data.get('user_id')}")
                return jsonify({"message": "User not found or disabled!"}), 401
            
            # Check is_blocked status
            is_blocked = current_user.get("is_blocked", False) if isinstance(current_user, dict) else getattr(current_user, 'is_blocked', False)
            if is_blocked:
                logger.warning(f"token_required: Blocked user access attempt for user_id={data.get('user_id')}")
                return jsonify({"message": "Your account has been suspended by the administrator."}), 403
                
            logger.info(f"token_required: Authentication successful for user_id={data.get('user_id') or data.get('admin_id')}")
        except jwt.ExpiredSignatureError:
            logger.warning(f"token_required: Token has expired for request to {request.path}")
            return jsonify({"message": "Token has expired! Please login again."}), 401
        except jwt.InvalidTokenError:
            logger.warning(f"token_required: Invalid token signature/format for request to {request.path}")
            return jsonify({"message": "Invalid token! Please login again."}), 401
        except Exception as e:
            import traceback
            logger.error(f"token_required: Exception occurred: {str(e)}\n{traceback.format_exc()}")
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
            logger.warning(f"admin_required: Missing token for request to {request.path}")
            return jsonify({"message": "Authentication token is missing!"}), 401
            
        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            is_admin = data.get("is_admin", False)
            logger.info(f"admin_required: Decoded token payload={data}, is_admin={is_admin} for request to {request.path}")
            
            if not is_admin:
                logger.warning(f"admin_required: Non-admin user attempted to access admin-only route {request.path}")
                return jsonify({"message": "Access denied! Admin privileges required."}), 403
            
            admin_id = data.get("admin_id") or data.get("user_id")
            if not admin_id:
                logger.warning(f"admin_required: Token missing admin_id/user_id keys")
                return jsonify({"message": "Access denied! Invalid authentication token."}), 403
            
            admin = None
            if str(admin_id).isdigit():
                admin = AdminModel.query.get(int(admin_id))
            else:
                admin = AdminModel.query.filter_by(username=admin_id).first()
                
            if not admin:
                # Fallback to check UserModel where is_admin is True
                if str(admin_id).isdigit():
                    user = UserModel.query.get(int(admin_id))
                else:
                    user = UserModel.query.filter((UserModel.email == admin_id) | (UserModel.name == admin_id)).first()
                if user and user.is_admin:
                    admin = user
                    
            if not admin:
                logger.warning(f"admin_required: Admin user not found in database for admin_id={admin_id}")
                return jsonify({"message": "Access denied! Admin privileges required."}), 403
                
            logger.info(f"admin_required: Administrator verification successful for admin_id={admin_id}")
        except jwt.ExpiredSignatureError:
            logger.warning(f"admin_required: Token has expired for request to {request.path}")
            return jsonify({"message": "Token has expired! Please login again."}), 401
        except jwt.InvalidTokenError:
            logger.warning(f"admin_required: Invalid token signature/format for request to {request.path}")
            return jsonify({"message": "Invalid token! Please login again."}), 401
        except Exception as e:
            import traceback
            logger.error(f"admin_required: Exception occurred: {str(e)}\n{traceback.format_exc()}")
            return jsonify({"message": f"Access denied! Invalid authentication token. Details: {str(e)}"}), 403
            
        return f(*args, **kwargs)
        
    return decorated



def maintenance_block(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        from backend.models.settings import SiteSettings
        try:
            settings = SiteSettings.query.first()
            is_maintenance = settings.maintenance_mode if settings else False
        except Exception:
            is_maintenance = False
            
        if is_maintenance:
            try:
                msg = settings.maintenance_message if settings else "The website is temporarily under maintenance. Please try again later."
            except Exception:
                msg = "The website is temporarily under maintenance. Please try again later."
            return jsonify({
                "success": False,
                "maintenance": True,
                "message": msg
            }), 503
        return f(*args, **kwargs)
    return decorated

