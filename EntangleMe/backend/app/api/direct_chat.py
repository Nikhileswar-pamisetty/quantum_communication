from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.api.deps import get_current_active_user
from app.services.direct_chat_service import DirectChatService
from app.schemas.direct_chat import DirectMessageCreate, DirectMessageResponse
from app.schemas.chat import UserResponse
from app.models.database import User

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
            created_at=m.created_at
        ) for m in messages
    ]

@router.post("/messages", response_model=DirectMessageResponse)
async def create_direct_message(
    message_data: DirectMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = DirectChatService(db)
    # Check if receiver exists
    receiver = db.query(User).filter(User.id == message_data.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    message = service.create_message(message_data, current_user.id)
    return DirectMessageResponse(
        id=message.id,
        sender_id=message.sender_id,
        receiver_id=message.receiver_id,
        content=message.content,
        quantum_state=message.quantum_state,
        teleportation_result=message.teleportation_result,
        status=message.status,
        created_at=message.created_at
    )
@router.get("/conversations", response_model=List[UserResponse])
async def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = DirectChatService(db)
    users = service.get_conversations(current_user.id)
    result = []
    for u in users:
        last_msg = service.get_last_message(current_user.id, u.id)
        result.append(
            UserResponse(
                id=u.id,
                username=u.username,
                email=u.email,
                is_online=u.is_online,
                last_seen=u.last_seen,
                created_at=u.created_at,
                last_message=last_msg.content if last_msg else None,
                last_message_time=last_msg.created_at if last_msg else None
            )
        )
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
