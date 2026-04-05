from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, JSON, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=True)
    password_hash = Column(String, nullable=True)
    role = Column(String, default="participant")  # "admin" or "participant"
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # New Stats Fields
    total_bits_teleported = Column(Integer, default=0)
    total_noise_events = Column(Integer, default=0)
    total_messages_sent = Column(Integer, default=0)
    fidelity_score = Column(Float, default=1.0)
    noise_enabled = Column(Boolean, default=False)
    
    # Relationships
    messages = relationship("Message", back_populates="sender")
    room_participants = relationship("RoomParticipant", back_populates="user")
    direct_messages_sent = relationship("DirectMessage", foreign_keys="[DirectMessage.sender_id]", back_populates="sender")
    direct_messages_received = relationship("DirectMessage", foreign_keys="[DirectMessage.receiver_id]", back_populates="receiver")
    groups_created = relationship("Group", back_populates="creator")
    group_memberships = relationship("GroupMember", back_populates="user")
    group_messages = relationship("GroupMessage", back_populates="sender")
    friend_requests_sent = relationship("FriendRequest", foreign_keys="[FriendRequest.sender_id]", back_populates="sender")
    friend_requests_received = relationship("FriendRequest", foreign_keys="[FriendRequest.receiver_id]", back_populates="receiver")
    notifications = relationship("Notification", back_populates="user")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"))
    type = Column(String)  # friend_request, message, system
    content = Column(Text)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="notifications")

class FriendRequest(Base):
    __tablename__ = "friend_requests"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    sender_id = Column(String, ForeignKey("users.id"))
    receiver_id = Column(String, ForeignKey("users.id"))
    status = Column(String, default="pending")  # pending, accepted, rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    
    sender = relationship("User", foreign_keys=[sender_id], back_populates="friend_requests_sent")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="friend_requests_received")

class Room(Base):
    __tablename__ = "rooms"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    created_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    last_activity = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    participants = relationship("RoomParticipant", back_populates="room")
    messages = relationship("Message", back_populates="room")

class RoomParticipant(Base):
    __tablename__ = "room_participants"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    room_id = Column(String, ForeignKey("rooms.id"))
    user_id = Column(String, ForeignKey("users.id"))
    joined_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    room = relationship("Room", back_populates="participants")
    user = relationship("User", back_populates="room_participants")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    room_id = Column(String, ForeignKey("rooms.id"))
    sender_id = Column(String, ForeignKey("users.id"))
    content = Column(Text, nullable=False)
    quantum_state = Column(String, nullable=True)  # "0" or "1"
    teleportation_result = Column(JSON, nullable=True)  # Store quantum teleportation data
    status = Column(String, default="sent")  # sent, teleported, failed, delivered
    is_read = Column(Boolean, default=False)
    message_type = Column(String, default="text") # "text" or "file"
    file_id = Column(String, ForeignKey("sqlfiles.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    room = relationship("Room", back_populates="messages")
    sender = relationship("User", back_populates="messages")

class DirectMessage(Base):
    __tablename__ = "direct_messages"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    sender_id = Column(String, ForeignKey("users.id"))
    receiver_id = Column(String, ForeignKey("users.id"))
    content = Column(Text, nullable=False)
    quantum_state = Column(String, nullable=True)
    teleportation_result = Column(JSON, nullable=True)
    status = Column(String, default="sent") # sent, delivered
    is_read = Column(Boolean, default=False)
    message_type = Column(String, default="text") # "text" or "file"
    file_id = Column(String, ForeignKey("sqlfiles.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    sender = relationship("User", foreign_keys=[sender_id], back_populates="direct_messages_sent")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="direct_messages_received")

class Group(Base):
    __tablename__ = "groups"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    created_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    creator = relationship("User", back_populates="groups_created")
    members = relationship("GroupMember", back_populates="group")
    messages = relationship("GroupMessage", back_populates="group")

class GroupMember(Base):
    __tablename__ = "group_members"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String, ForeignKey("groups.id"))
    user_id = Column(String, ForeignKey("users.id"))
    role = Column(String, default="participant") # "admin" or "participant"
    joined_at = Column(DateTime, default=datetime.utcnow)
    
    group = relationship("Group", back_populates="members")
    user = relationship("User", back_populates="group_memberships")

class GroupMessage(Base):
    __tablename__ = "group_messages"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String, ForeignKey("groups.id"))
    sender_id = Column(String, ForeignKey("users.id"))
    content = Column(Text, nullable=False)
    quantum_state = Column(String, nullable=True)
    teleportation_result = Column(JSON, nullable=True)
    status = Column(String, default="sent") # sent, delivered
    is_read = Column(Boolean, default=False)
    message_type = Column(String, default="text") # "text" or "file"
    file_id = Column(String, ForeignKey("sqlfiles.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    group = relationship("Group", back_populates="messages")
    sender = relationship("User", back_populates="group_messages")

class File(Base):
    __tablename__ = "sqlfiles"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    uploader_id = Column(String, ForeignKey("users.id"))
    file_name = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    file_type = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    quantum_key = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    uploader = relationship("User", backref="uploaded_files")
