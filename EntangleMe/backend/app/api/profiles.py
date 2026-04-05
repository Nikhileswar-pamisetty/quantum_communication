from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_current_active_user
from app.database.session import get_db
from app.models.database import User
from app.schemas.chat import UserProfileResponse, UserResponse

router = APIRouter(prefix="/profiles", tags=["profiles"])

@router.get("/{user_id}", response_model=UserProfileResponse)
async def get_user_profile(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserProfileResponse(
        user=UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            is_online=user.is_online,
            last_seen=user.last_seen,
            created_at=user.created_at,
            total_bits_teleported=user.total_bits_teleported,
            total_noise_events=user.total_noise_events,
            total_messages_sent=user.total_messages_sent,
            fidelity_score=user.fidelity_score,
            noise_enabled=user.noise_enabled
        ),
        total_messages=user.total_messages_sent,
        total_bits=user.total_bits_teleported,
        fidelity=user.fidelity_score,
        status="Online" if user.is_online else "Offline"
    )

@router.put("/me/noise-toggle")
async def toggle_noise(
    enabled: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    current_user.noise_enabled = enabled
    db.commit()
    return {"message": f"Noise simulation {'enabled' if enabled else 'disabled'}"}
