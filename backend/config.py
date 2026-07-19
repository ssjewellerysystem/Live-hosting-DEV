import os
from dotenv import load_dotenv

load_dotenv()

from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
import socket

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
    raise RuntimeError(
        "CRITICAL ERROR: DATABASE_URI or DATABASE_URL environment variable is not set. "
        "A database connection is required to start the SSJewellery application. "
        "Please configure this environment variable and restart the service."
    )

raw_uri = database_uri

if raw_uri and raw_uri.startswith("postgres://"):
    raw_uri = raw_uri.replace("postgres://", "postgresql://", 1)

class Config:
    SECRET_KEY = os.environ.get("JWT_SECRET", "supersecret_SSJewellery_key_123")
    SQLALCHEMY_DATABASE_URI = resolve_neon_uri(raw_uri)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = True
    SQLALCHEMY_ENGINE_OPTIONS = {
        # "connect_args": {
        #     "init_command": "SET time_zone='Asia/Kolkata'"
        # }
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
