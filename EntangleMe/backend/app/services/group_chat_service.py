from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from app.models.database import Group, GroupMember, GroupMessage, User
from app.schemas.group_chat import GroupCreate, GroupMessageCreate

class GroupChatService:
    def __init__(self, db: Session):
        self.db = db

    def create_group(self, group_data: GroupCreate, creator_id: str) -> Group:
        db_group = Group(name=group_data.name, created_by=creator_id)
        self.db.add(db_group)
        self.db.commit()
        self.db.refresh(db_group)
        
        # Add creator as admin
        self.add_member(db_group.id, creator_id, role="admin")
        
        for user_id in group_data.participant_ids:
            if user_id != creator_id:
                self.add_member(db_group.id, user_id)
                
        return db_group

    def get_group(self, group_id: str) -> Optional[Group]:
        return self.db.query(Group).filter(Group.id == group_id).first()
        
    def get_user_groups(self, user_id: str) -> List[Group]:
        return self.db.query(Group).join(GroupMember).filter(GroupMember.user_id == user_id).all()

    def add_member(self, group_id: str, user_id: str, role: str = "participant") -> bool:
        existing = self.db.query(GroupMember).filter(
            and_(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
        ).first()
        if existing:
            return False
            
        member = GroupMember(group_id=group_id, user_id=user_id, role=role)
        self.db.add(member)
        self.db.commit()
        return True

    def remove_member(self, group_id: str, user_id: str) -> bool:
        member = self.db.query(GroupMember).filter(
            and_(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
        ).first()
        if member:
            self.db.delete(member)
            self.db.commit()
            return True
        return False

    def is_member(self, group_id: str, user_id: str) -> bool:
        return self.db.query(GroupMember).filter(
            and_(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
        ).first() is not None

    def is_group_admin(self, group_id: str, user_id: str) -> bool:
        member = self.db.query(GroupMember).filter(
            and_(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
        ).first()
        return member is not None and member.role == "admin"

    def get_members(self, group_id: str) -> List[User]:
        return self.db.query(User).join(GroupMember).filter(GroupMember.group_id == group_id).all()

    def get_member_count(self, group_id: str) -> int:
        return self.db.query(GroupMember).filter(GroupMember.group_id == group_id).count()

    def get_messages(self, group_id: str, limit: int = 50, offset: int = 0) -> List[GroupMessage]:
        return self.db.query(GroupMessage).filter(GroupMessage.group_id == group_id).order_by(GroupMessage.created_at.asc()).offset(offset).limit(limit).all()

    def create_message(self, message_data: GroupMessageCreate, sender_id: str, quantum_state: Optional[str] = None, teleportation_result: Optional[dict] = None) -> GroupMessage:
        db_message = GroupMessage(
            group_id=message_data.group_id,
            sender_id=sender_id,
            content=message_data.content,
            quantum_state=quantum_state,
            teleportation_result=teleportation_result,
            status="teleported" if quantum_state else "sent"
        )
        self.db.add(db_message)
        self.db.commit()
        self.db.refresh(db_message)
        return db_message

    def delete_message(self, message_id: str, user_id: str) -> bool:
        message = self.db.query(GroupMessage).filter(
            and_(GroupMessage.id == message_id, GroupMessage.sender_id == user_id)
        ).first()
        if message:
            self.db.delete(message)
            self.db.commit()
            return True
        return False

    def search_groups(self, query: str) -> List[Group]:
        return self.db.query(Group).filter(Group.name.ilike(f"%{query}%")).all()
    def get_last_message(self, group_id: str) -> Optional[GroupMessage]:
        return self.db.query(GroupMessage).filter(GroupMessage.group_id == group_id).order_by(GroupMessage.created_at.desc()).first()

    def delete_group(self, group_id: str, admin_id: str) -> bool:
        group = self.db.query(Group).filter(
            and_(Group.id == group_id, Group.created_by == admin_id)
        ).first()
        if not group:
            return False
        
        # Delete messages
        self.db.query(GroupMessage).filter(GroupMessage.group_id == group_id).delete()
        # Delete members
        self.db.query(GroupMember).filter(GroupMember.group_id == group_id).delete()
        # Delete group
        self.db.delete(group)
        self.db.commit()
        return True

    def rename_group(self, group_id: str, new_name: str, admin_id: str) -> Optional[Group]:
        group = self.db.query(Group).filter(
            and_(Group.id == group_id, Group.created_by == admin_id)
        ).first()
        if not group:
            return None
        
        group.name = new_name
        self.db.commit()
        self.db.refresh(group)
        return group
