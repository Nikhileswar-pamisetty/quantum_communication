from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.api.deps import get_current_admin_user, get_current_active_user
from app.services.group_chat_service import GroupChatService
from app.schemas.group_chat import GroupCreate, GroupResponse, GroupMessageCreate, GroupMessageResponse, GroupAddMember
from app.schemas.chat import UserResponse
from app.models.database import User

router = APIRouter(prefix="/groups", tags=["group_chat"], dependencies=[Depends(get_current_active_user)])

@router.post("/", response_model=GroupResponse)
async def create_group(
    group_data: GroupCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = GroupChatService(db)
    group = service.create_group(group_data, current_user.id)
    return GroupResponse(
        id=group.id, 
        name=group.name, 
        created_by=group.created_by, 
        created_at=group.created_at,
        member_count=1
    )

@router.get("/", response_model=List[GroupResponse])
async def get_my_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = GroupChatService(db)
    groups = service.get_user_groups(current_user.id)
    result = []
    for g in groups:
        last_msg = service.get_last_message(g.id)
        result.append(
            GroupResponse(
                id=g.id, 
                name=g.name, 
                created_by=g.created_by, 
                created_at=g.created_at,
                last_message=last_msg.content if last_msg else None,
                last_message_time=last_msg.created_at if last_msg else None,
                member_count=service.get_member_count(g.id)
            )
        )
    return result

@router.post("/{group_id}/members")
async def add_group_member(
    group_id: str,
    member_data: GroupAddMember,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = GroupChatService(db)
    if not service.is_group_admin(group_id, current_user.id):
        raise HTTPException(status_code=403, detail="Only group admins can add members")
    if not service.add_member(group_id, member_data.user_id):
        raise HTTPException(status_code=400, detail="User already in group")
    return {"message": "Member added"}

@router.get("/{group_id}/members", response_model=List[UserResponse])
async def get_group_members(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = GroupChatService(db)
    if not service.is_member(group_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    users = service.get_members(group_id)
    return [
        UserResponse(
            id=u.id,
            username=u.username,
            email=u.email,
            is_online=u.is_online,
            last_seen=u.last_seen,
            created_at=u.created_at
        ) for u in users
    ]

@router.delete("/{group_id}/members/{user_id}")
async def remove_group_member(
    group_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = GroupChatService(db)
    if not service.is_group_admin(group_id, current_user.id):
        raise HTTPException(status_code=403, detail="Only group admins can remove members")
    if not service.remove_member(group_id, user_id):
        raise HTTPException(status_code=404, detail="Member not found")
    return {"message": "Member removed"}

@router.get("/{group_id}/messages", response_model=List[GroupMessageResponse])
async def get_group_messages(
    group_id: str,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = GroupChatService(db)
    if not service.is_member(group_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    messages = service.get_messages(group_id, limit, offset)
    chat_service = GroupChatService(db) # We already have service
    
    result = []
    for m in messages:
        sender = db.query(User).filter(User.id == m.sender_id).first()
        result.append(
            GroupMessageResponse(
                id=m.id,
                group_id=m.group_id,
                sender_id=m.sender_id,
                sender_username=sender.username if sender else "Unknown",
                content=m.content,
                quantum_state=m.quantum_state,
                teleportation_result=m.teleportation_result,
                status=m.status,
                message_type=m.message_type or "text",
                file_id=m.file_id,
                created_at=m.created_at
            )
        )
    return result

@router.post("/{group_id}/messages", response_model=GroupMessageResponse)
async def send_group_message(
    group_id: str,
    message_data: GroupMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = GroupChatService(db)
    # verify user is a member of the group
    if not service.is_member(group_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    # ensure group_id matches
    message_data.group_id = group_id
    
    # save message to group_messages table
    message = service.create_message(message_data, current_user.id)
    
    # return saved message with sender username and timestamp
    return GroupMessageResponse(
        id=message.id,
        group_id=message.group_id,
        sender_id=message.sender_id,
        sender_username=current_user.username,
        content=message.content,
        quantum_state=message.quantum_state,
        teleportation_result=message.teleportation_result,
        status=message.status,
        message_type=message.message_type or "text",
        file_id=message.file_id,
        created_at=message.created_at
    )

@router.get("/search", response_model=List[GroupResponse])
async def search_groups(
    q: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = GroupChatService(db)
    groups = service.search_groups(q)
    return [
        GroupResponse(
            id=g.id, 
            name=g.name, 
            created_by=g.created_by, 
            created_at=g.created_at,
            member_count=service.get_member_count(g.id)
        ) for g in groups
    ]

@router.post("/{group_id}/join")
async def join_group(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = GroupChatService(db)
    if not service.add_member(group_id, current_user.id):
        raise HTTPException(status_code=400, detail="Already a member or group not found")
    return {"message": "Joined successfully"}

@router.put("/{group_id}", response_model=GroupResponse)
async def rename_group(
    group_id: str,
    group_data: GroupCreate, # We can reuse GroupCreate but only name is used
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = GroupChatService(db)
    group = service.rename_group(group_id, group_data.name, current_user.id)
    if not group:
        raise HTTPException(status_code=403, detail="Not authorized or group not found")
    
    return GroupResponse(
        id=group.id,
        name=group.name,
        created_by=group.created_by,
        created_at=group.created_at,
        member_count=service.get_member_count(group.id)
    )

@router.delete("/{group_id}")
async def delete_group(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = GroupChatService(db)
    if not service.delete_group(group_id, current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized or group not found")
    return {"message": "Group deleted successfully"}
