from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class DirectMessageCreate(BaseModel):
    receiver_id: str
    content: str = Field(..., min_length=1)
    message_type: Optional[str] = "text"
    file_id: Optional[str] = None

class DirectMessageResponse(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    content: str
    quantum_state: Optional[str]
    teleportation_result: Optional[dict]
    status: str
    message_type: Optional[str] = "text"
    file_id: Optional[str] = None
    created_at: datetime
