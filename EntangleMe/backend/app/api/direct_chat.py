from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.api.deps import get_current_active_user
from app.services.direct_chat_service import DirectChatService
from app.schemas.direct_chat import DirectMessageCreate, DirectMessageResponse
from app.schemas.chat import UserResponse
from app.models.database import User, DirectMessage

router = APIRouter(prefix="/direct", tags=["direct_chat"], dependencies=[Depends(get_current_active_user)])

@router.get("/messages/{user_id}", response_model=List[DirectMessageResponse])
async def get_direct_messages(
    user_id: str, 
    limit: int = 50, 
    offset: int = 0, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = DirectChatService(db)
    messages = service.get_messages(current_user.id, user_id, limit, offset)
    
    return [
        DirectMessageResponse(
            id=m.id,
            sender_id=m.sender_id,
            receiver_id=m.receiver_id,
            content=m.content,
            quantum_state=m.quantum_state,
            teleportation_result=m.teleportation_result,
            status=m.status,
            message_type=m.message_type or "text",
            file_id=m.file_id,
            created_at=m.created_at
        ) for m in messages
    ]

@router.post("/messages")
def send_direct_message(
    message: DirectMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    new_message = DirectMessage(
        sender_id=current_user.id,
        receiver_id=message.receiver_id,
        content=message.content,
        message_type=message.message_type or "text",
        file_id=message.file_id or None
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    return DirectMessageResponse(
        id=new_message.id,
        sender_id=new_message.sender_id,
        receiver_id=new_message.receiver_id,
        content=new_message.content,
        quantum_state=new_message.quantum_state,
        teleportation_result=new_message.teleportation_result,
        status=new_message.status,
        message_type=new_message.message_type or "text",
        file_id=new_message.file_id,
        created_at=new_message.created_at
    )
@router.get("/conversations")
async def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = DirectChatService(db)
    users = service.get_conversations(current_user.id)
    result = []
    for u in users:
        last_msg = service.get_last_message(current_user.id, u.id)
        result.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "is_online": u.is_online,
            "last_seen": u.last_seen,
            "created_at": u.created_at,
            "last_message": last_msg.content if last_msg else None,
            "last_message_content": last_msg.content if last_msg else None,
            "last_message_type": getattr(last_msg, 'message_type', 'text') if last_msg else "text",
            "last_message_time": last_msg.created_at if last_msg else None
        })
    return result

@router.delete("/messages/{message_id}")
async def delete_direct_message(
    message_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = DirectChatService(db)
    if not service.delete_message(message_id, current_user.id):
        raise HTTPException(status_code=404, detail="Message not found or not authorized")
    return {"message": "Message deleted"}
