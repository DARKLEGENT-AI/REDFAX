from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from models import get_user
from jose import JWTError, jwt
from fastapi import WebSocket, WebSocketException
from starlette.status import WS_1008_POLICY_VIOLATION

SECRET_KEY = "mysecretkeyforjwt"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

password = "159753195"

def get_password_hash(password):
    return pwd_context.hash(password)

print(get_password_hash(password))