from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile, status
from fastapi.responses import FileResponse as FastAPIFileResponse, StreamingResponse, Response
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
import json
from pydantic import BaseModel
from datetime import datetime

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.database import Base, User
import app.models.database as models
from app.core.config import settings
from app.services.quantum_service import bb84_service

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
        # ── Step 1: BB84 Quantum Key Exchange ──────────────────────────
        key_data = bb84_service.generate_key(256)

        if key_data["eavesdrop_detected"]:
            raise HTTPException(
                status_code=403,
                detail="Eavesdropper detected on quantum channel! Upload aborted."
            )

        # ── Step 2: Read & encrypt file with BB84 key ──────────────────
        contents = await file.read()
        encrypted_contents = bb84_service.encrypt_with_key(contents, key_data["key"])

        # ── Step 3: Save encrypted bytes to disk ───────────────────────
        file_ext = os.path.splitext(file.filename)[1] if file.filename else ""
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)

        with open(file_path, "wb") as f:
            f.write(encrypted_contents)

        file_size = len(contents)  # report original size

        # Store key metadata as JSON string so it can be used for decryption
        quantum_key = json.dumps({
            "protocol": "BB84",
            "key_length": key_data["key_length"],
            "error_rate": key_data["error_rate"],
            "sifted_ratio": key_data["sifted_ratio"],
            # Store first 64 bits only (enough for DB record; full key is ephemeral)
            "key_preview": key_data["key"][:64]
        })

        # ── Step 4: Persist metadata to DB ─────────────────────────────
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.api_route("/{file_id}", methods=["GET", "HEAD"], response_class=FastAPIFileResponse)
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

@router.api_route("/preview/{file_id}", methods=["GET", "HEAD"])
async def preview_file(
    file_id: str,
    db: Session = Depends(get_db)
):
    db_file = db.query(models.File).filter(models.File.id == file_id).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    if not os.path.exists(db_file.file_path):
        raise HTTPException(status_code=404, detail="Physical file not found")

    # Decrypt file using stored quantum key
    with open(db_file.file_path, 'rb') as f:
        encrypted_data = f.read()

    key_data = json.loads(db_file.quantum_key)
    decrypted_data = bb84_service.decrypt_with_key(
        encrypted_data,
        key_data['key_preview']
    )

    return Response(
        content=decrypted_data,
        media_type=db_file.file_type,
        headers={
            "Content-Disposition": f"inline; filename={db_file.file_name}",
            "Access-Control-Allow-Origin": "*"
        }
    )
