from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    participant_ids: List[str] = Field(default_factory=list)

class GroupResponse(BaseModel):
    id: str
    name: str
    created_by: str
    created_at: datetime
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    member_count: Optional[int] = 0

class GroupAddMember(BaseModel):
    user_id: str

class GroupMessageCreate(BaseModel):
    group_id: str
    content: str = Field(..., min_length=1)

class GroupMessageResponse(BaseModel):
    id: str
    group_id: str
    sender_id: str
    sender_username: Optional[str] = None
    content: str
    quantum_state: Optional[str] = None
    teleportation_result: Optional[dict] = None
    status: str
    created_at: datetime
    message_type: Optional[str] = "text"
    file_id: Optional[str] = None
