from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.api.deps import get_current_active_user
from app.models.database import User
from app.schemas.friends import FriendRequestCreate, FriendRequestResponse, FriendRequestUpdate
from app.schemas.chat import UserResponse
from app.services.friend_service import FriendService

router = APIRouter(prefix="/friends", tags=["friends"], dependencies=[Depends(get_current_active_user)])

@router.post("/request", response_model=FriendRequestResponse)
async def send_friend_request(
    request: FriendRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = FriendService(db)
    result = service.send_request(current_user.id, request.receiver_username)
    if not result:
        raise HTTPException(status_code=400, detail="Could not send friend request")
    
    return FriendRequestResponse(
        id=result.id,
        sender_id=result.sender_id,
        sender_username=current_user.username,
        receiver_id=result.receiver_id,
        status=result.status,
        created_at=result.created_at
    )

@router.get("/requests", response_model=List[FriendRequestResponse])
async def get_pending_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = FriendService(db)
    requests = service.get_pending_requests(current_user.id)
    
    responses = []
    for r in requests:
        responses.append(FriendRequestResponse(
            id=r.id,
            sender_id=r.sender_id,
            sender_username=r.sender.username,
            receiver_id=r.receiver_id,
            status=r.status,
            created_at=r.created_at
        ))
    return responses

@router.put("/request/{request_id}/accept")
async def accept_friend_request(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = FriendService(db)
    success = service.update_request(request_id, current_user.id, "accepted")
    if not success:
        raise HTTPException(status_code=400, detail="Failed to accept friend request")
    return {"message": "Friend request accepted"}

@router.put("/request/{request_id}/reject")
async def reject_friend_request(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = FriendService(db)
    success = service.update_request(request_id, current_user.id, "rejected")
    if not success:
        raise HTTPException(status_code=400, detail="Failed to reject friend request")
    return {"message": "Friend request rejected"}

@router.put("/request/{request_id}")
async def update_friend_request(
    request_id: str,
    update: FriendRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = FriendService(db)
    success = service.update_request(request_id, current_user.id, update.status)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update friend request")
    return {"message": f"Friend request {update.status}"}

@router.get("/", response_model=List[UserResponse])
async def get_friends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = FriendService(db)
    friends = service.get_friends(current_user.id)
    
    return [
        UserResponse(
            id=u.id,
            username=u.username,
            email=u.email,
            is_online=u.is_online,
            last_seen=u.last_seen,
            created_at=u.created_at,
            last_message=None, # For simplicity, can be updated later
            last_message_time=None
        ) for u in friends
    ]
