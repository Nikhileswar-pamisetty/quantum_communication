from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile, status
from fastapi.responses import FileResponse as FastAPIFileResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
import secrets
from pydantic import BaseModel
from datetime import datetime

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.database import Base, User
import app.models.database as models
from app.core.config import settings

router = APIRouter(prefix="/files", tags=["files"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class FileSchema(BaseModel):
    id: str
    uploader_id: str
    file_name: str
    file_size: int
    file_type: str
    file_path: str
    quantum_key: str | None = None
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

@router.post("/upload", response_model=FileSchema)
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # Create unique filename to prevent overwriting
        file_ext = os.path.splitext(file.filename)[1] if file.filename else ""
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Save file to disk
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
            
        # File size
        file_size = len(contents)
        
        # Generate quantum key mock
        quantum_key = secrets.token_hex(16)
        
        # Save to database
        db_file = models.File(
            uploader_id=current_user.id,
            file_name=file.filename or unique_filename,
            file_size=file_size,
            file_type=file.content_type or "application/octet-stream",
            file_path=file_path,
            quantum_key=quantum_key
        )
        
        db.add(db_file)
        db.commit()
        db.refresh(db_file)
        
        return db_file
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{file_id}", response_class=FastAPIFileResponse)
async def download_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_file = db.query(models.File).filter(models.File.id == file_id).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
        
    if not os.path.exists(db_file.file_path):
        raise HTTPException(status_code=404, detail="Physical file not found")
        
    return FastAPIFileResponse(
        path=db_file.file_path,
        filename=db_file.file_name,
        media_type=db_file.file_type
    )

@router.get("/preview/{file_id}", response_class=FastAPIFileResponse)
async def preview_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_file = db.query(models.File).filter(models.File.id == file_id).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
        
    if not os.path.exists(db_file.file_path):
        raise HTTPException(status_code=404, detail="Physical file not found")
        
    return FastAPIFileResponse(
        path=db_file.file_path,
        filename=db_file.file_name,
        media_type=db_file.file_type,
        content_disposition_type="inline"
    )
