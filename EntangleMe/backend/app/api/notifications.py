from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_current_active_user
from app.database.session import get_db
from app.models.database import Notification, User
from app.schemas.chat import NotificationResponse, NotificationUpdate

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(20).all()
    return notifications

@router.put("/{notification_id}", response_model=NotificationResponse)
async def update_notification(
    notification_id: str,
    notification_data: NotificationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.is_read = notification_data.is_read
    db.commit()
    db.refresh(notif)
    return notif

@router.put("/read-all")
async def read_all_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({Notification.is_read: True})
    db.commit()
    return {"message": "All notifications marked as read"}
