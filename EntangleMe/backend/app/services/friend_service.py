from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from app.models.database import FriendRequest, User
from app.schemas.friends import FriendRequestCreate, FriendRequestUpdate
import uuid

class FriendService:
    def __init__(self, db: Session):
        self.db = db

    def send_request(self, sender_id: str, receiver_username: str) -> Optional[FriendRequest]:
        receiver = self.db.query(User).filter(User.username == receiver_username).first()
        if not receiver or receiver.id == sender_id:
            return None
            
        # Check if request already exists
        existing = self.db.query(FriendRequest).filter(
            or_(
                and_(FriendRequest.sender_id == sender_id, FriendRequest.receiver_id == receiver.id),
                and_(FriendRequest.sender_id == receiver.id, FriendRequest.receiver_id == sender_id)
            )
        ).first()
        
        if existing:
            return existing
            
        request = FriendRequest(
            sender_id=sender_id,
            receiver_id=receiver.id,
            status="pending"
        )
        self.db.add(request)
        self.db.commit()
        self.db.refresh(request)
        return request

    def get_pending_requests(self, user_id: str) -> List[FriendRequest]:
        return self.db.query(FriendRequest).filter(
            and_(FriendRequest.receiver_id == user_id, FriendRequest.status == "pending")
        ).all()

    def update_request(self, request_id: str, user_id: str, status: str) -> bool:
        request = self.db.query(FriendRequest).filter(
            and_(FriendRequest.id == request_id, FriendRequest.receiver_id == user_id)
        ).first()
        
        if not request:
            return False
            
        if status in ["accepted", "rejected"]:
            request.status = status
            self.db.commit()
            return True
        return False

    def get_friends(self, user_id: str) -> List[User]:
        requests = self.db.query(FriendRequest).filter(
            and_(
                or_(FriendRequest.sender_id == user_id, FriendRequest.receiver_id == user_id),
                FriendRequest.status == "accepted"
            )
        ).all()
        
        friend_ids = []
        for r in requests:
            if r.sender_id == user_id:
                friend_ids.append(r.receiver_id)
            else:
                friend_ids.append(r.sender_id)
                
        if not friend_ids:
            return []
            
        return self.db.query(User).filter(User.id.in_(friend_ids)).all()
