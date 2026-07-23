import os
from dotenv import load_dotenv

load_dotenv()

from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
import socket

# Environment Detection
ENV = (os.environ.get("FLASK_ENV") or os.environ.get("ENV") or os.environ.get("APP_ENV") or "development").lower()
IS_PRODUCTION = (ENV == "production")

# Centralized Frontend URL
FRONTEND_URL = (os.environ.get("FRONTEND_URL") or ("http://localhost:5173" if not IS_PRODUCTION else "")).rstrip('/')

def resolve_neon_uri(uri):
    if not uri:
        return uri
    try:
        parsed = urlparse(uri)
        if parsed.hostname and (parsed.hostname.endswith('.neon.tech') or 'neon' in parsed.hostname):
            # Force IPv4 lookup
            addrinfo = socket.getaddrinfo(parsed.hostname, parsed.port or 5432, socket.AF_INET, socket.SOCK_STREAM)
            if addrinfo:
                ipv4 = addrinfo[0][4][0]
                endpoint_id = parsed.hostname.split('.')[0]
                
                port_str = f":{parsed.port}" if parsed.port else ""
                auth_str = ""
                if parsed.username:
                    auth_str += parsed.username
                    if parsed.password:
                        auth_str += f":{parsed.password}"
                    auth_str += "@"
                new_netloc = f"{auth_str}{ipv4}{port_str}"
                
                query_params = parse_qs(parsed.query)
                query_params['options'] = [f"endpoint={endpoint_id}"]
                new_query = urlencode(query_params, doseq=True)
                
                new_uri = urlunparse(parsed._replace(netloc=new_netloc, query=new_query))
                return new_uri
    except Exception:
        pass
    return uri

database_uri = os.environ.get("DATABASE_URI") or os.environ.get("DATABASE_URL")

if not database_uri:
    if IS_PRODUCTION:
        raw_uri = None
    else:
        # Fallback to the Neon PostgreSQL database URI in development
        raw_uri = "postgresql://neondb_owner:npg_GOsy48HeAJhP@ep-bold-base-ao7v7l2l-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
else:
    raw_uri = database_uri

if raw_uri and raw_uri.startswith("postgres://"):
    raw_uri = raw_uri.replace("postgres://", "postgresql://", 1)

class Config:
    ENV = ENV
    IS_PRODUCTION = IS_PRODUCTION
    FRONTEND_URL = FRONTEND_URL
    JWT_SECRET = os.environ.get("JWT_SECRET", "supersecret_SSJewellery_key_123")
    SECRET_KEY = os.environ.get("SECRET_KEY", JWT_SECRET)
    SQLALCHEMY_DATABASE_URI = resolve_neon_uri(raw_uri) if raw_uri else None
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = not IS_PRODUCTION
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
        "pool_timeout": 30,
        "pool_size": 10,
        "max_overflow": 5,
    }

    # Flask-Mail Configuration
    MAIL_SERVER = os.environ.get("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.environ.get("MAIL_PORT", 587))
    MAIL_USE_TLS = os.environ.get("MAIL_USE_TLS", "True").lower() in ("true", "1", "yes")
    MAIL_USE_SSL = os.environ.get("MAIL_USE_SSL", "False").lower() in ("true", "1", "yes")
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME") or os.environ.get("EMAIL_ADDRESS")
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD") or os.environ.get("EMAIL_APP_PASSWORD")
    
    # Calculate MAIL_DEFAULT_SENDER
    _default_user = os.environ.get("MAIL_USERNAME") or os.environ.get("EMAIL_ADDRESS")
    MAIL_DEFAULT_SENDER = os.environ.get("SMTP_FROM") or (f"SSJewellery <{_default_user}>" if _default_user else "SSJewellery <no-reply@SSJewellery.com>")

    # OAuth Credentials
    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
    MICROSOFT_CLIENT_ID = os.environ.get("MICROSOFT_CLIENT_ID")
    MICROSOFT_CLIENT_SECRET = os.environ.get("MICROSOFT_CLIENT_SECRET")

    # Cloudinary Credentials
    CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME")
    CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY")
    CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET")

    # Razorpay Credentials
    RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID")
    RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET")

def validate_environment():
    """
    Startup environment validation module for backend.
    In Development mode: Allows localhost fallbacks.
    In Production mode: Stops startup immediately with a clear RuntimeError if
    required environment variables are missing or pointing to localhost.
    """
    if not IS_PRODUCTION:
        print(f"[CONFIG SUCCESS] Environment validation passed in DEVELOPMENT mode (FRONTEND_URL: {FRONTEND_URL or 'http://localhost:5173'}).")
        return

    missing = []
    invalid = []

    # 1. FRONTEND_URL validation
    env_frontend = os.environ.get("FRONTEND_URL")
    if not env_frontend:
        missing.append("FRONTEND_URL")
    elif "localhost" in env_frontend or "127.0.0.1" in env_frontend:
        invalid.append("FRONTEND_URL cannot point to localhost/127.0.0.1 in production mode")

    # 2. DATABASE_URL validation
    env_db = os.environ.get("DATABASE_URI") or os.environ.get("DATABASE_URL")
    if not env_db:
        missing.append("DATABASE_URL / DATABASE_URI")

    # 3. JWT_SECRET validation
    env_jwt = os.environ.get("JWT_SECRET") or os.environ.get("SECRET_KEY")
    if not env_jwt:
        missing.append("JWT_SECRET / SECRET_KEY")
    elif env_jwt == "supersecret_SSJewellery_key_123":
        invalid.append("JWT_SECRET / SECRET_KEY cannot use default development key in production mode")

    if missing or invalid:
        err_lines = [
            "\n" + "="*75,
            " [CRITICAL DEPLOYMENT SAFETY FAILURE] Production Environment Validation Error!",
            "="*75
        ]
        if missing:
            err_lines.append(" Missing Required Production Environment Variables:")
            for m in missing:
                err_lines.append(f"   - {m}")
        if invalid:
            err_lines.append(" Invalid Production Configuration:")
            for inv in invalid:
                err_lines.append(f"   - {inv}")
        err_lines.append(" Application startup aborted to prevent broken/insecure production deployment.")
        err_lines.append("="*75 + "\n")
        
        error_msg = "\n".join(err_lines)
        print(error_msg)
        raise RuntimeError(error_msg)

    print("[CONFIG SUCCESS] Environment validation passed in PRODUCTION mode.")
