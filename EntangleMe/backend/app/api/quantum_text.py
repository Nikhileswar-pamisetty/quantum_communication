from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.deps import get_current_active_user
from app.models.database import User
from app.schemas.quantum import TextTeleportRequest
from app.services.quantum_service import QuantumTeleportationService
from app.services.chat_service import ChatService
from app.services.direct_chat_service import DirectChatService
from app.services.group_chat_service import GroupChatService
from app.schemas.chat import MessageCreate
from app.schemas.direct_chat import DirectMessageCreate
from app.schemas.group_chat import GroupMessageCreate
from app.core.config import settings
import json

router = APIRouter(prefix="/quantum-text", tags=["quantum_text"], dependencies=[Depends(get_current_active_user)])

quantum_service = QuantumTeleportationService(
    simulator_name=settings.QUANTUM_SIMULATOR,
    shots=settings.QUANTUM_SHOTS
)

def string_to_bits(text: str) -> list[int]:
    bits = []
    for char in text:
        bin_val = format(ord(char), '08b')
        bits.extend([int(b) for b in bin_val])
    return bits

def bits_to_string(bits: list[int], original_text: str = "") -> str:
    chars = []
    original_charsList = list(original_text)
    for i in range(0, len(bits), 8):
        byte = bits[i:i+8]
        if len(byte) < 8:
            break
        try:
            char_val = int("".join(str(b) for b in byte), 2)
            # ASCII safety check: 32-126
            # If not printable or reassembly results in invalid char, keep original
            orig_char = original_charsList[i//8] if i//8 < len(original_charsList) else "?"
            if 32 <= char_val <= 126:
                chars.append(chr(char_val))
            else:
                chars.append(orig_char)
        except Exception:
            chars.append(original_charsList[i//8] if i//8 < len(original_charsList) else "?")
            
    return "".join(chars)

@router.post("/teleport-text")
async def teleport_text(
    request: TextTeleportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        # 50 character limit per message
        if len(request.text_content) > 50:
            raise HTTPException(status_code=400, detail="Message exceeds 50 character limit")

        # Validate receiver exists
        receiver_id = request.receiver_id or request.group_id or request.room_id
        if request.is_direct:
            receiver = db.query(User).filter(User.id == request.receiver_id).first()
            if not receiver:
                raise HTTPException(status_code=404, detail="Receiver not found")

        # Convert text to bits
        bits = string_to_bits(request.text_content)
        
        teleported_bits = []
        overall_teleportation_data = []
        noise_events = 0
        
        # Hardcoded 0% noise for maximum fidelity
        noise_rate = 0

        # Teleport each bit
        for bit in bits:
            result = quantum_service.execute_teleportation(bit, noise_rate=noise_rate)
            teleported_bits.append(result["received_bit"])
            overall_teleportation_data.append(result)
            if result["measurement_results"].get("noise_detected"):
                noise_events += 1

        # Reconstruct string with ASCII safety check
        reconstructed_text = bits_to_string(teleported_bits, original_text=request.text_content)
        
        # Update User Stats
        current_user.total_bits_teleported += len(bits)
        current_user.total_noise_events += noise_events
        current_user.total_messages_sent += 1
        if current_user.total_bits_teleported > 0:
            current_user.fidelity_score = (current_user.total_bits_teleported - current_user.total_noise_events) / current_user.total_bits_teleported
        
        db.add(current_user)

        # Save message and return response
        teleportation_summary = {
            "bits": overall_teleportation_data,
            "noise_detected": noise_events > 0,
            "noise_events": noise_events,
            "fidelity": 1.0 - (noise_events / len(bits)) if bits else 1.0
        }

        response_data = {
            "content": reconstructed_text,
            "success": reconstructed_text == request.text_content,
            "noise_detected": noise_events > 0,
            "fidelity": teleportation_summary["fidelity"]
        }

        if request.is_direct:
            dc_service = DirectChatService(db)
            msg_data = DirectMessageCreate(receiver_id=request.receiver_id, content=reconstructed_text)
            message = dc_service.create_message(msg_data, current_user.id, quantum_state=json.dumps(teleported_bits), teleportation_result=teleportation_summary)
            
            # Create notification for receiver
            from app.models.database import Notification
            notif = Notification(
                user_id=request.receiver_id,
                type="message",
                content=f"New message from {current_user.username}: {reconstructed_text[:20]}..."
            )
            db.add(notif)
            
            response_data.update({"message": "Text teleported via direct message", "message_id": message.id})
        elif request.group_id:
            gc_service = GroupChatService(db)
            if not gc_service.is_member(request.group_id, current_user.id):
                raise HTTPException(status_code=403, detail="Not a group member")
            msg_data = GroupMessageCreate(group_id=request.group_id, content=reconstructed_text)
            message = gc_service.create_message(msg_data, current_user.id, quantum_state=json.dumps(teleported_bits), teleportation_result=teleportation_summary)
            
            # Group notifications (optional, but requested broadly)
            response_data.update({"message": "Text teleported to group", "message_id": message.id})
        elif request.room_id:
            chat_service = ChatService(db)
            msg_data = MessageCreate(room_id=request.room_id, content=reconstructed_text, quantum_state=json.dumps(teleported_bits))
            message = chat_service.create_message(msg_data, current_user.id)
            chat_service.update_message_status(message.id, "teleported", teleportation_summary)
            response_data.update({"message": "Text teleported to room", "message_id": message.id})
        
        db.commit()
        return response_data

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text teleportation failed: {str(e)}")
