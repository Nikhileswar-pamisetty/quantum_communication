from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class UserCreate(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    email: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    username: str
    email: Optional[str]
    is_online: bool
    last_seen: datetime
    created_at: datetime
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    
    # Stats
    total_bits_teleported: int = 0
    total_noise_events: int = 0
    total_messages_sent: int = 0
    fidelity_score: float = 1.0
    noise_enabled: bool = False

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: str
    content: str
    is_read: bool
    created_at: datetime

class NotificationUpdate(BaseModel):
    is_read: bool

class UserProfileResponse(BaseModel):
    user: UserResponse
    total_messages: int
    total_bits: int
    fidelity: float
    status: str

class RoomCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    participant_ids: List[str] = Field(default_factory=list)

class RoomResponse(BaseModel):
    id: str
    name: str
    created_by: str
    created_at: datetime
    last_activity: datetime
    participants: List[UserResponse]

class MessageCreate(BaseModel):
    room_id: str
    content: str = Field(..., min_length=1)
    quantum_state: Optional[str] = None  # "0" or "1"

class MessageResponse(BaseModel):
    id: str
    room_id: str
    sender_id: str
    sender_username: str
    content: str
    quantum_state: Optional[str]
    teleportation_result: Optional[dict]
    status: str
    created_at: datetime

class JoinRoomRequest(BaseModel):
    room_id: str
    user_id: str

class LeaveRoomRequest(BaseModel):
    room_id: str
    user_id: str
