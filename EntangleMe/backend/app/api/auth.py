from datetime import timedelta
from fastapi import APIRouter, Body, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.config import settings
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.database import User
from app.schemas.auth import Token, UserRegister
from app.schemas.chat import UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    # Check if user already exists by username or email
    user_by_username = db.query(User).filter(User.username == user_in.username).first()
    if user_by_username:
        raise HTTPException(
            status_code=400,
            detail=f"Registration failed: User with username '{user_in.username}' already exists.",
        )
    
    if user_in.email:
        user_by_email = db.query(User).filter(User.email == user_in.email).first()
        if user_by_email:
            raise HTTPException(
                status_code=400,
                detail=f"Registration failed: User with email '{user_in.email}' already exists.",
            )
    
    # Check if first user, make them admin
    total_users = db.query(User).count()
    role = "admin" if total_users == 0 else "participant"

    db_user = User(
        username=user_in.username,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return UserResponse(
        id=db_user.id,
        username=db_user.username,
        email=db_user.email,
        is_online=db_user.is_online,
        last_seen=db_user.last_seen,
        created_at=db_user.created_at,
        last_message=None
    )

@router.post("/login")
def login_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not user.password_hash:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username
    }
