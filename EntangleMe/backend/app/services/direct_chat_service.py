from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from app.models.database import DirectMessage, User
from app.schemas.direct_chat import DirectMessageCreate

class DirectChatService:
    def __init__(self, db: Session):
        self.db = db
        
    def get_messages(self, user1_id: str, user2_id: str, limit: int = 50, offset: int = 0) -> List[DirectMessage]:
        return self.db.query(DirectMessage).filter(
            or_(
                and_(DirectMessage.sender_id == user1_id, DirectMessage.receiver_id == user2_id),
                and_(DirectMessage.sender_id == user2_id, DirectMessage.receiver_id == user1_id)
            )
        ).order_by(DirectMessage.created_at.asc()).offset(offset).limit(limit).all()

    def create_message(self, message_data: DirectMessageCreate, sender_id: str, quantum_state: Optional[str] = None, teleportation_result: Optional[dict] = None) -> DirectMessage:
        db_message = DirectMessage(
            sender_id=sender_id,
            receiver_id=message_data.receiver_id,
            content=message_data.content,
            quantum_state=quantum_state,
            teleportation_result=teleportation_result,
            status="teleported" if quantum_state else "sent"
        )
        self.db.add(db_message)
        self.db.commit()
        self.db.refresh(db_message)
        return db_message
    def get_conversations(self, user_id: str) -> List[User]:
        # Get all unique users that the current user has exchanged messages with
        sent_to = self.db.query(DirectMessage.receiver_id).filter(DirectMessage.sender_id == user_id).distinct()
        received_from = self.db.query(DirectMessage.sender_id).filter(DirectMessage.receiver_id == user_id).distinct()
        
        user_ids = set([r[0] for r in sent_to.all()] + [r[0] for r in received_from.all()])
        if not user_ids:
            return []
            
        return self.db.query(User).filter(User.id.in_(user_ids)).all()
    def get_last_message(self, user1_id: str, user2_id: str) -> Optional[DirectMessage]:
        return self.db.query(DirectMessage).filter(
            or_(
                and_(DirectMessage.sender_id == user1_id, DirectMessage.receiver_id == user2_id),
                and_(DirectMessage.sender_id == user2_id, DirectMessage.receiver_id == user1_id)
            )
        ).order_by(DirectMessage.created_at.desc()).first()

    def delete_message(self, message_id: str, user_id: str) -> bool:
        message = self.db.query(DirectMessage).filter(
            and_(DirectMessage.id == message_id, DirectMessage.sender_id == user_id)
        ).first()
        if message:
            self.db.delete(message)
            self.db.commit()
            return True
        return False
