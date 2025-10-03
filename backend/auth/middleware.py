from typing import Optional, List
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from supabase import create_client, Client
from pydantic import BaseModel
import os

# Initialize Supabase client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# JWT Configuration
JWT_SECRET = os.environ.get("JWT_SECRET_KEY")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")

# Role enum
class UserRole:
    ADMIN = "admin"
    STAFF = "staff"
    FARMER = "farmer"

# Auth models
class TokenData(BaseModel):
    user_id: str
    role: str
    exp: datetime

class UserPermission(BaseModel):
    name: str
    description: str

# Permission definitions
PERMISSIONS = {
    UserRole.ADMIN: [
        "admin:access",
        "users:manage",
        "roles:manage",
        "collections:manage",
        "payments:manage",
        "reports:access",
        "analytics:access"
    ],
    UserRole.STAFF: [
        "collections:create",
        "collections:read",
        "collections:update",
        "farmers:read",
        "profile:read",
        "profile:update"
    ],
    UserRole.FARMER: [
        "profile:read_own",
        "profile:update_own",
        "collections:read_own",
        "payments:read_own"
    ]
}

# Auth helper functions
def get_user_role(user_id: str) -> Optional[str]:
    """Get user's role from the database"""
    try:
        response = supabase.table("user_roles") \
            .select("role") \
            .eq("user_id", user_id) \
            .eq("active", True) \
            .single() \
            .execute()
        
        if response.data:
            return response.data.get("role")
        return None
    except Exception as e:
        print(f"Error getting user role: {e}")
        return None

def check_permission(user_id: str, permission: str) -> bool:
    """Check if user has specific permission"""
    try:
        response = supabase.rpc(
            "check_permission",
            {"p_user_id": user_id, "p_permission": permission}
        ).execute()
        
        return response.data
    except Exception as e:
        print(f"Error checking permission: {e}")
        return False

def create_access_token(user_id: str, role: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=30)
    
    to_encode = {
        "user_id": user_id,
        "role": role,
        "exp": expire
    }
    
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> TokenData:
    """Decode and validate JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return TokenData(**payload)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_session_timeout(role: str) -> timedelta:
    """Get session timeout based on user role"""
    timeouts = {
        UserRole.ADMIN: timedelta(hours=8),
        UserRole.STAFF: timedelta(hours=24),
        UserRole.FARMER: timedelta(days=7)
    }
    return timeouts.get(role, timedelta(hours=1))

def log_auth_event(
    user_id: str,
    event_type: str,
    request: Request,
    metadata: dict = None
) -> None:
    """Log authentication events"""
    try:
        supabase.table("auth_events").insert({
            "user_id": user_id,
            "event_type": event_type,
            "ip_address": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent"),
            "metadata": metadata or {}
        }).execute()
    except Exception as e:
        print(f"Error logging auth event: {e}")

async def check_account_lockout(email: str, request: Request) -> bool:
    """Check if account is locked due to failed attempts"""
    try:
        response = await supabase.rpc(
            "check_account_lockout",
            {
                "p_email": email,
                "p_ip_address": request.client.host
            }
        ).execute()
        return response.data
    except Exception as e:
        print(f"Error checking account lockout: {e}")
        return True  # Fail secure

# Auth middleware
class JWTBearer(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super(JWTBearer, self).__init__(auto_error=auto_error)

    async def __call__(self, request: Request) -> TokenData:
        credentials: HTTPAuthorizationCredentials = await super(JWTBearer, self).__call__(request)
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        token_data = decode_token(credentials.credentials)
        
        # Update last activity
        try:
            await supabase.table("user_sessions") \
                .update({"last_activity": datetime.utcnow().isoformat()}) \
                .eq("user_id", token_data.user_id) \
                .eq("is_valid", True) \
                .execute()
        except Exception as e:
            print(f"Error updating session activity: {e}")
        
        return token_data

# Role-based authorization decorators
def require_role(allowed_roles: List[str]):
    """Decorator to check if user has required role"""
    async def role_checker(token_data: TokenData = Depends(JWTBearer())):
        if token_data.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for this role"
            )
        return token_data
    return role_checker

def require_permission(required_permission: str):
    """Decorator to check if user has required permission"""
    async def permission_checker(token_data: TokenData = Depends(JWTBearer())):
        if not check_permission(token_data.user_id, required_permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return token_data
    return permission_checker