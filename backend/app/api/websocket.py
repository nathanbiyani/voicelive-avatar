"""Validated browser-to-Voice-Live WebSocket relay."""

import json
import logging
import re

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from app.core.telemetry import anonymous_id, audit_event
from app.domain.models import ClientMessage, SessionStartConfig


logger = logging.getLogger(__name__)
router = APIRouter()
CLIENT_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{8,64}$")


async def _send(websocket: WebSocket, message: dict) -> None:
    await websocket.send_text(json.dumps(message))


@router.websocket("/ws/{client_id}")
async def voice_live_websocket(websocket: WebSocket, client_id: str):
    settings = websocket.app.state.settings
    manager = websocket.app.state.session_manager
    origin = websocket.headers.get("origin")
    if not origin or origin not in settings.allowed_origins:
        await websocket.close(code=1008, reason="Origin not allowed")
        return
    if not CLIENT_ID_PATTERN.fullmatch(client_id):
        await websocket.close(code=1008, reason="Invalid client ID")
        return

    await websocket.accept()
    session_id = anonymous_id(client_id)
    audit_event("client_connected", session_id=session_id)

    async def send_message(message: dict):
        await _send(websocket, message)

    try:
        while True:
            raw_message = await websocket.receive_text()
            if len(raw_message.encode("utf-8")) > settings.max_websocket_message_bytes:
                await websocket.close(code=1009, reason="Message too large")
                return

            try:
                message = ClientMessage.model_validate_json(raw_message)
                await _dispatch(client_id, message, manager, send_message)
            except ValidationError as exc:
                await send_message(
                    {
                        "type": "session_error",
                        "code": "invalid_client_message",
                        "error": "The client message or session configuration is invalid.",
                    }
                )
                audit_event(
                    "client_message_rejected",
                    session_id=session_id,
                    error_type=type(exc).__name__,
                )
            except ValueError as exc:
                await send_message(
                    {
                        "type": "session_error",
                        "code": "invalid_session_option",
                        "error": str(exc),
                    }
                )
                audit_event(
                    "client_message_rejected",
                    session_id=session_id,
                    error_type=type(exc).__name__,
                )
    except WebSocketDisconnect:
        audit_event("client_disconnected", session_id=session_id)
    except Exception as exc:
        logger.exception("WebSocket session failed")
        audit_event(
            "websocket_failed",
            session_id=session_id,
            error_type=type(exc).__name__,
        )
    finally:
        await manager.stop(client_id, reason="websocket_closed")


async def _dispatch(client_id, message, manager, send_message):
    if message.type == "start_session":
        config = SessionStartConfig.model_validate(message.config or {})
        await manager.start(
            client_id,
            config.to_voice_live_config(),
            send_message,
        )
        return
    if message.type == "stop_session":
        await manager.stop(client_id)
        return

    handler = manager.get(client_id)
    if not handler:
        raise ValueError("No active session for this client.")

    if message.type == "audio_chunk":
        await handler.send_audio(message.data or "")
    elif message.type == "send_text":
        await handler.send_text_message(message.text or "")
    elif message.type == "avatar_sdp_offer":
        await handler.send_avatar_sdp_offer(message.clientSdp or "")
    elif message.type == "interrupt":
        await handler.interrupt()
    elif message.type == "update_scene":
        if message.avatar is None:
            raise ValueError("Photo avatar scene settings are required.")
        await handler.update_avatar_scene(message.avatar.model_dump())
    else:
        raise ValueError(f"Unknown message type: {message.type}")
