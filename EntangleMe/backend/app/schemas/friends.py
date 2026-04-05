from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class FriendRequestCreate(BaseModel):
    receiver_username: str

class FriendRequestResponse(BaseModel):
    id: str
    sender_id: str
    sender_username: str
    receiver_id: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class FriendRequestUpdate(BaseModel):
    status: str # accepted, rejected
