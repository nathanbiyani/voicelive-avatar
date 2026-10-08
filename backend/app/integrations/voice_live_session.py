"""
Voice Live Avatar - Voice Handler
Manages Azure Voice Live SDK sessions with avatar support.
Handles audio streaming, avatar WebRTC signaling, and event processing.
"""

import asyncio
import json
import logging
import base64
import os
import time
from typing import Any, Callable, Optional

from azure.ai.voicelive.aio import ConnectionClosed, connect
from azure.ai.voicelive.aio import ConnectionError as VoiceLiveConnectionError
from azure.ai.voicelive.models import (
    AvatarConfig,
    AzureCustomVoice,
    AzurePersonalVoice,
    AzureSemanticDetection,
    AzureSemanticVad,
    AzureStandardVoice,
    AzureVoice,
    AudioInputTranscriptionOptions,
    Background,
    ClientEventSessionAvatarConnect,
    InputAudioFormat,
    Modality,
    OpenAIVoice,
    OutputAudioFormat,
    RequestSession,
    ServerEventType,
    ServerVad,
    VideoCrop,
    VideoParams,
    VideoResolution,
)

from app.core.telemetry import anonymous_id, audit_event

logger = logging.getLogger(__name__)


class VoiceSessionHandler:
    """
    Manages a single Voice Live session with avatar support.
    Acts as a bridge between the browser WebSocket and Azure Voice Live API.
    """

    def __init__(
        self,
        client_id: str,
        endpoint: str,
        credential: Any,
        send_message: Callable,
        config: dict,
    ):
        self.client_id = client_id
        self.endpoint = endpoint
        self.credential = credential
        self.send_message = send_message
        self.config = config

        self.connection = None
        self.is_running = False
        self._event_task: Optional[asyncio.Task] = None
        self._pending_proactive = False
        self._audit_session_id = anonymous_id(client_id)
        self._speech_stopped_at: float | None = None

    async def start(self):
        """Start the Voice Live session."""
        try:
            self.is_running = True
            model = self.config.get("model", os.getenv("VOICELIVE_MODEL", "gpt-realtime"))
            mode = self.config.get("mode", "model")

            connection_options = {
                "endpoint": self.endpoint,
                "credential": self.credential,
            }
            if mode in ("agent", "agent-v2"):
                agent_name = self.config.get("agentName", "")
                project_name = self.config.get("agentProjectName", "")
                if not agent_name or not project_name:
                    raise ValueError(
                        "Agent name and project name are required in agent mode."
                    )
                connection_options.update(
                    agent_name=agent_name,
                    project_name=project_name,
                )
                target_name = agent_name
            else:
                connection_options["model"] = model
                target_name = model

            logger.info("Connecting to Voice Live target %s", target_name)
            audit_event(
                "voice_live_connection_started",
                session_id=self._audit_session_id,
                mode=mode,
                model=model,
            )

            async with connect(**connection_options) as connection:
                self.connection = connection

                # Configure session
                await self._setup_session(connection)

                # Process events
                await self._process_events(connection)

        except asyncio.CancelledError:
            logger.info(f"Session cancelled for client {self.client_id}")
        except Exception as e:
            logger.error(f"Voice session error for {self.client_id}: {e}")
            audit_event(
                "session_failed",
                session_id=self._audit_session_id,
                stage="voice_live_session",
                error_type=type(e).__name__,
            )
            await self.send_message({
                "type": "session_error",
                "code": "voice_live_session_failed",
                "error": "The Voice Live session could not be started.",
            })
        finally:
            self.is_running = False
            self.connection = None

    async def _setup_session(self, connection):
        """Configure the Voice Live session with avatar, voice, and other settings."""
        config = self.config
        mode = config.get("mode", "model")
        model = config.get("model", "gpt-realtime")

        # Build voice configuration
        voice_config = self._build_voice_config(config)

        # Build avatar configuration
        avatar_config = self._build_avatar_config(config)

        # Build turn detection
        turn_detection = self._build_turn_detection(config)

        # Build modalities (avatar is NOT a modality - it's configured via the avatar field)
        modalities = [Modality.TEXT, Modality.AUDIO]

        # Build SR options
        sr_model = config.get("srModel", "azure-speech")
        recognition_language = config.get("recognitionLanguage", "auto")
        is_realtime = model and "realtime" in model
        phrase_list = config.get("phraseList", [])
        custom_speech = config.get("customSpeechModels", {})
        uses_speech_customization = bool(
            phrase_list or custom_speech or recognition_language != "auto"
        )
        input_audio_transcription = AudioInputTranscriptionOptions(
            model=(
                "whisper-1"
                if mode == "model" and is_realtime and not uses_speech_customization
                else sr_model
            ),
            language=None if (sr_model == "mai-ears-1" or recognition_language == "auto")
            else recognition_language,
            phrase_list=phrase_list or None,
            custom_speech=custom_speech or None,
        )

        # Build noise/echo settings
        noise_reduction = None
        echo_cancellation = None
        if config.get("useNS", False):
            noise_reduction = {"type": "azure_deep_noise_suppression"}
        if config.get("useEC", False):
            echo_cancellation = {"type": "server_echo_cancellation"}

        instructions = config.get("instructions", "")
        temperature = config.get("temperature", 0.9)

        session_config = RequestSession(
            modalities=modalities,
            instructions=instructions if instructions else None,
            voice=voice_config,
            avatar=avatar_config,
            input_audio_format=InputAudioFormat.PCM16,
            output_audio_format=OutputAudioFormat.PCM16,
            input_audio_transcription=input_audio_transcription,
            turn_detection=turn_detection,
            temperature=temperature if mode == "model" else None,
            input_audio_noise_reduction=noise_reduction,
            input_audio_echo_cancellation=echo_cancellation,
        )

        logger.info("[SEND] session.update")
        await connection.session.update(session=session_config)

        # Wait for SESSION_UPDATED
        session_updated = await self._wait_for_event(
            connection, {ServerEventType.SESSION_UPDATED}
        )
        if session_updated is None:
            raise ValueError("SESSION_UPDATED event not received")

        logger.info(f"Session configured for client {self.client_id}")
        audit_event(
            "session_configured",
            session_id=self._audit_session_id,
            avatar_enabled=config.get("avatarEnabled", False),
            avatar_type="photo" if config.get("isPhotoAvatar", False) else "video",
            output_protocol=config.get("avatarOutputMode", "webrtc"),
            terminology_pack=config.get("terminologyPackId", "none"),
            name_pack=config.get("namePackId", "none"),
            accent_profile=config.get("accentProfileId", "auto"),
            noise_suppression=config.get("useNS", False),
            echo_cancellation=config.get("useEC", False),
        )

        avatar_output_mode = config.get("avatarOutputMode", "webrtc")

        # If avatar is enabled with WebRTC mode, relay ICE servers info to browser
        if config.get("avatarEnabled", False) and avatar_output_mode == "webrtc":
            if hasattr(session_updated, "session") and session_updated.session:
                session_data = session_updated.session
                if hasattr(session_data, "avatar") and session_data.avatar:
                    avatar_data = session_data.avatar
                    if hasattr(avatar_data, "ice_servers") and avatar_data.ice_servers:
                        ice_servers = []
                        for server in avatar_data.ice_servers:
                            ice_server = {"urls": server.urls}
                            if server.username:
                                ice_server["username"] = server.username
                            if server.credential:
                                ice_server["credential"] = server.credential
                            ice_servers.append(ice_server)

                        await self.send_message({
                            "type": "ice_servers",
                            "iceServers": ice_servers,
                        })
                        logger.info(f"Sent ICE servers to client {self.client_id}")

        # Extract session ID if available
        session_id = None
        if hasattr(session_updated, "session") and session_updated.session:
            session_id = getattr(session_updated.session, "id", None)
        logger.info(f"Session ID: {session_id}")

        # Notify client session is ready
        await self.send_message({
            "type": "session_started",
            "status": "success",
            "sessionId": session_id,
            "config": {
                "model": model,
                "avatarEnabled": config.get("avatarEnabled", False),
                "avatarOutputMode": avatar_output_mode,
            },
        })

        # Proactive greeting logic depends on avatar mode:
        # - No avatar: send immediately
        # - Avatar + websocket: send immediately (no WebRTC handshake needed)
        # - Avatar + webrtc: defer until SESSION_AVATAR_CONNECTING event
        if not config.get("avatarEnabled", False):
            if config.get("enableProactive", True):
                try:
                    logger.info("[SEND] response.create (proactive greeting, no avatar)")
                    await connection.response.create()
                    logger.info("Proactive greeting sent")
                except Exception as e:
                    logger.error(f"Failed to send proactive greeting: {e}")
        elif avatar_output_mode == "websocket":
            # WebSocket avatar mode: no WebRTC handshake, send greeting immediately
            if config.get("enableProactive", True):
                try:
                    logger.info("[SEND] response.create (proactive greeting, websocket avatar)")
                    await connection.response.create()
                    logger.info("Proactive greeting sent (websocket avatar)")
                except Exception as e:
                    logger.error(f"Failed to send proactive greeting: {e}")
        else:
            # WebRTC avatar: defer proactive greeting until avatar connect
            self._pending_proactive = config.get("enableProactive", True)

    def _build_voice_config(self, config: dict):
        """Build voice configuration from client settings."""
        voice_type = config.get("voiceType", "standard")
        voice_name = config.get("voiceName", os.getenv("VOICELIVE_VOICE", "en-US-AvaMultilingualNeural"))
        voice_temperature = config.get("voiceTemperature", 0.9)
        voice_speed = config.get("voiceSpeed", 1.0)
        custom_lexicon_url = config.get("customLexiconUrl", "") or None

        if voice_type == "azure-realtime-native":
            # Native voice names are simple lowercase ids (e.g. "ava"). Reject anything that
            # looks like a standard voice id (contains "-") so the env default doesn't leak in.
            client_voice = config.get("voiceName", "")
            native_name = client_voice if client_voice and "-" not in client_voice else "ava"
            return AzureVoice({"type": "azure-realtime-native", "name": native_name})

        if voice_type == "custom":
            custom_voice_name = config.get("customVoiceName", "")
            deployment_id = config.get("voiceDeploymentId", "")
            return AzureCustomVoice(
                name=custom_voice_name,
                endpoint_id=deployment_id,
                rate=str(voice_speed),
                custom_lexicon_url=custom_lexicon_url,
            )
        elif voice_type == "personal":
            personal_voice_name = config.get("personalVoiceName", "")
            personal_model = config.get("personalVoiceModel", "DragonLatestNeural")
            return AzurePersonalVoice(
                name=personal_voice_name,
                model=personal_model,
                temperature=voice_temperature,
                rate=str(voice_speed),
                custom_lexicon_url=custom_lexicon_url,
            )
        else:
            # Standard voice - check if Azure or OpenAI
            if "-" in voice_name:
                # Azure voice
                is_dragon = "Dragon" in voice_name
                return AzureStandardVoice(
                    name=voice_name,
                    temperature=voice_temperature if is_dragon else None,
                    rate=str(voice_speed),
                    custom_lexicon_url=custom_lexicon_url,
                )
            else:
                # OpenAI voice
                return OpenAIVoice(name=voice_name)

    def _build_avatar_config(self, config: dict) -> Optional[AvatarConfig]:
        """Build avatar configuration from client settings."""
        if not config.get("avatarEnabled", False):
            return None

        avatar_name = config.get("avatarName", "Lisa-casual-sitting")
        is_photo = config.get("isPhotoAvatar", False)
        is_custom = config.get("isCustomAvatar", False)
        background_url = config.get("avatarBackgroundImageUrl", "")

        # Parse character and style from avatar name
        if is_custom:
            character = avatar_name
            style = None
        elif is_photo:
            photo_name = config.get("avatarName", "Anika")
            parts = photo_name.split("-", 1)
            character = parts[0].lower() if parts else photo_name.lower()
            style = parts[1] if len(parts) > 1 else None
        else:
            parts = avatar_name.split("-", 1)
            character = parts[0].lower() if parts else avatar_name.lower()
            style = parts[1] if len(parts) > 1 else None

        # Build video params
        video_crop = None
        if not is_photo:
            # Centered crop matching JS sample: 800px wide centered in 1920
            video_crop = VideoCrop(top_left=[560, 0], bottom_right=[1360, 1080])

        background = None
        if background_url:
            background = Background(image_url=background_url)

        video_resolution = VideoResolution(width=1920, height=1080)

        video = VideoParams(
            codec="h264",
            resolution=video_resolution,
            bitrate=500000 if is_photo else 1000000,
            crop=video_crop,
            background=background,
        )

        # Build avatar config kwargs
        avatar_kwargs = {
            "character": character,
            "style": style,
            "video": video,
        }

        # Only set customized=True when actually custom (omit when False)
        if is_custom:
            avatar_kwargs["customized"] = True

        avatar_cfg = AvatarConfig(**avatar_kwargs)

        # Photo avatar: add type, model, and scene via bracket notation (not in SDK model)
        if is_photo:
            avatar_cfg["type"] = "photo-avatar"
            avatar_cfg["model"] = "vasa-1"
            photo_scene = config.get("photoScene", {})
            if photo_scene:
                import math
                avatar_cfg["scene"] = {
                    "zoom": photo_scene.get("zoom", 100) / 100,
                    "position_x": photo_scene.get("positionX", 0) / 100,
                    "position_y": photo_scene.get("positionY", 0) / 100,
                    "rotation_x": photo_scene.get("rotationX", 0) * math.pi / 180,
                    "rotation_y": photo_scene.get("rotationY", 0) * math.pi / 180,
                    "rotation_z": photo_scene.get("rotationZ", 0) * math.pi / 180,
                    "amplitude": photo_scene.get("amplitude", 60) / 100,
                }

        # Add output_protocol (not in SDK model, inject as additional property)
        avatar_output_mode = config.get("avatarOutputMode", "webrtc")
        try:
            avatar_cfg["output_protocol"] = avatar_output_mode
        except Exception:
            try:
                avatar_cfg.output_protocol = avatar_output_mode
            except Exception:
                logger.warning("Could not set output_protocol on AvatarConfig")

        return avatar_cfg

    def _build_turn_detection(self, config: dict):
        """Build turn detection configuration."""
        td_type = config.get("turnDetectionType", "server_vad")
        eou_type = config.get("eouDetectionType", "none")
        remove_filler = config.get("removeFillerWords", False)

        if td_type == "azure_semantic_vad":
            eou_detection = None
            if eou_type == "semantic_detection_v1":
                eou_detection = AzureSemanticDetection(
                    threshold_level="default",
                    timeout_ms=1000,
                )
            return AzureSemanticVad(
                threshold=0.3,
                prefix_padding_ms=300,
                speech_duration_ms=80,
                silence_duration_ms=500,
                remove_filler_words=remove_filler,
                interrupt_response=True,
                end_of_utterance_detection=eou_detection,
            )
        else:
            return ServerVad(
                threshold=0.3,
                prefix_padding_ms=300,
                silence_duration_ms=500,
            )

    async def _process_events(self, connection):
        """Process incoming events from Voice Live API.

        Uses manual recv() loop instead of 'async for' so that individual
        event parsing/handling errors don't kill the entire event loop.
        """
        while self.is_running:
            try:
                event = await connection.recv()
            except ConnectionClosed:
                logger.info("Voice Live connection closed")
                break
            except VoiceLiveConnectionError as e:
                logger.warning(f"[RECV] Event parsing error (continuing): {type(e).__name__}: {e}")
                continue
            except asyncio.CancelledError:
                raise
            except Exception as e:
                # Connection closed or fatal error
                logger.error(f"Connection error in event loop: {e}")
                break

            try:
                etype = getattr(event, 'type', 'unknown')
                if etype not in (ServerEventType.RESPONSE_AUDIO_DELTA,
                                 ServerEventType.RESPONSE_AUDIO_TRANSCRIPT_DELTA,
                                 "response.video.delta"):
                    logger.info("[RECV] %s", etype)
                if etype == "response.video.delta":
                    self._video_chunk_count = getattr(self, '_video_chunk_count', 0) + 1
                    if self._video_chunk_count <= 5 or self._video_chunk_count % 100 == 0:
                        delta_len = len(event.get('delta', '')) if hasattr(event, 'get') else 0
                        logger.info(f"[RECV] response.video.delta #{self._video_chunk_count}, delta_len={delta_len}")
                await self._handle_event(event, connection)
            except asyncio.CancelledError:
                raise
            except Exception as e:
                logger.error(f"Error handling event {getattr(event, 'type', 'unknown')}: {e}", exc_info=True)
                # Continue processing — don't let one bad event kill the loop

    async def _handle_event(self, event, connection):
        """Handle individual events from Voice Live API."""
        try:
            event_type = event.type

            # Audio delta - relay to browser
            if event_type == ServerEventType.RESPONSE_AUDIO_DELTA:
                if hasattr(event, "delta") and event.delta:
                    audio_b64 = base64.b64encode(event.delta).decode("utf-8")
                    await self.send_message({
                        "type": "audio_data",
                        "data": audio_b64,
                        "format": "pcm16",
                        "sampleRate": 24000,
                    })

            elif event_type == ServerEventType.RESPONSE_AUDIO_DONE:
                await self.send_message({"type": "audio_done"})

            # Audio transcript (assistant speaking text)
            elif event_type == ServerEventType.RESPONSE_AUDIO_TRANSCRIPT_DELTA:
                if hasattr(event, "delta") and event.delta:
                    await self.send_message({
                        "type": "transcript_delta",
                        "role": "assistant",
                        "delta": event.delta,
                    })

            elif event_type == ServerEventType.RESPONSE_AUDIO_TRANSCRIPT_DONE:
                transcript = getattr(event, "transcript", "")
                await self.send_message({
                    "type": "transcript_done",
                    "role": "assistant",
                    "transcript": transcript,
                })

            # Text delta (for text responses)
            elif event_type == ServerEventType.RESPONSE_TEXT_DELTA:
                if hasattr(event, "delta") and event.delta:
                    await self.send_message({
                        "type": "text_delta",
                        "delta": event.delta,
                    })

            elif event_type == ServerEventType.RESPONSE_TEXT_DONE:
                text = getattr(event, "text", "")
                await self.send_message({
                    "type": "text_done",
                    "text": text,
                })

            # Response lifecycle
            elif event_type == ServerEventType.RESPONSE_CREATED:
                response_id = getattr(event, "response", None)
                rid = response_id.id if response_id and hasattr(response_id, "id") else ""
                response_latency_ms = None
                if self._speech_stopped_at is not None:
                    response_latency_ms = round(
                        (time.perf_counter() - self._speech_stopped_at) * 1000
                    )
                    self._speech_stopped_at = None
                audit_event(
                    "response_started",
                    session_id=self._audit_session_id,
                    duration_ms=response_latency_ms,
                )
                await self.send_message({
                    "type": "response_created",
                    "responseId": rid,
                    "latencyMs": response_latency_ms,
                })

            elif event_type == ServerEventType.RESPONSE_DONE:
                audit_event(
                    "response_completed",
                    session_id=self._audit_session_id,
                )
                await self.send_message({"type": "response_done"})

            # Speech detection
            elif event_type == ServerEventType.INPUT_AUDIO_BUFFER_SPEECH_STARTED:
                audit_event(
                    "speech_started",
                    session_id=self._audit_session_id,
                )
                item_id = getattr(event, "item_id", "") or getattr(event, "itemId", "")
                await self.send_message({
                    "type": "speech_started",
                    "itemId": item_id,
                })

            elif event_type == ServerEventType.INPUT_AUDIO_BUFFER_SPEECH_STOPPED:
                self._speech_stopped_at = time.perf_counter()
                audit_event(
                    "speech_stopped",
                    session_id=self._audit_session_id,
                )
                await self.send_message({
                    "type": "speech_stopped",
                })

            # User transcription
            elif event_type == ServerEventType.CONVERSATION_ITEM_INPUT_AUDIO_TRANSCRIPTION_COMPLETED:
                transcript = getattr(event, "transcript", "")
                item_id = getattr(event, "item_id", "") or getattr(event, "itemId", "")
                if transcript:
                    await self.send_message({
                        "type": "transcript_done",
                        "role": "user",
                        "transcript": transcript,
                        "itemId": item_id,
                    })

            # Avatar WebRTC signaling
            elif event_type == ServerEventType.SESSION_AVATAR_CONNECTING:
                server_sdp = getattr(event, "server_sdp", "")
                if server_sdp:
                    await self.send_message({
                        "type": "avatar_sdp_answer",
                        "serverSdp": server_sdp,
                    })
                    logger.info("Relayed avatar SDP answer to browser")

                    # Avatar connection succeeded — now send proactive greeting if pending
                    if getattr(self, "_pending_proactive", False):
                        self._pending_proactive = False
                        try:
                            logger.info("[SEND] response.create (proactive greeting, after avatar connect)")
                            await connection.response.create()
                            logger.info("Proactive greeting sent after avatar connect")
                        except Exception as e:
                            logger.error(f"Failed to send proactive greeting: {e}")

            # Errors
            elif event_type == ServerEventType.ERROR:
                logger.error("Voice Live returned an error event")
                audit_event(
                    "voice_live_error",
                    session_id=self._audit_session_id,
                    error_type=type(event).__name__,
                )
                await self.send_message({
                    "type": "error",
                    "code": "voice_live_error",
                    "error": "Voice Live returned an error.",
                })

            # Session updated (may contain additional info)
            elif event_type == ServerEventType.SESSION_UPDATED:
                # Log the session state so we can diagnose config resets
                if hasattr(event, 'session') and event.session:
                    s = event.session
                    logger.info(f"[SESSION_UPDATED] input_audio_format={getattr(s, 'input_audio_format', '?')}, "
                                f"output_audio_format={getattr(s, 'output_audio_format', '?')}, "
                                f"turn_detection type={getattr(getattr(s, 'turn_detection', None), 'type', '?')}")

            # Avatar video via WebSocket mode (response.video.delta)
            # SDK parses this as a generic ServerEvent with string type
            elif event_type == "response.video.delta":
                delta = event.get("delta", "")
                if delta:
                    self._video_sent_count = getattr(self, '_video_sent_count', 0) + 1
                    if self._video_sent_count <= 5 or self._video_sent_count % 100 == 0:
                        logger.info(f"[SEND] video_data #{self._video_sent_count}, delta_len={len(delta)}")
                    await self.send_message({
                        "type": "video_data",
                        "delta": delta,
                    })

        except Exception as e:
            logger.error(f"Error handling event {getattr(event, 'type', 'unknown')}: {e}")

    _audio_chunk_count = 0

    async def send_audio(self, audio_base64: str):
        """Send audio data from browser to Voice Live."""
        if not self.connection:
            self._audio_chunk_count += 1
            if self._audio_chunk_count == 1 or self._audio_chunk_count % 500 == 0:
                logger.warning(f"[AUDIO] No connection — dropping audio chunk #{self._audio_chunk_count} (connection lost)")
            return
        if not self.is_running:
            logger.warning(f"[AUDIO] Session not running — dropping audio chunk")
            return
        try:
            self._audio_chunk_count += 1
            if self._audio_chunk_count <= 3 or self._audio_chunk_count % 100 == 0:
                logger.info(f"[AUDIO] Forwarding chunk #{self._audio_chunk_count}, length={len(audio_base64)}")
            await self.connection.input_audio_buffer.append(audio=audio_base64)
        except Exception as e:
            logger.error(f"Error sending audio: {e}")

    async def send_text_message(self, text: str):
        """Send a text message to the conversation."""
        if self.connection:
            try:
                from azure.ai.voicelive.models import (
                    UserMessageItem,
                    InputTextContentPart,
                )
                item = UserMessageItem(
                    content=[InputTextContentPart(text=text)]
                )
                await self.connection.conversation.item.create(item=item)
                await self.connection.response.create()
            except Exception as e:
                logger.error(f"Error sending text: {e}")

    async def send_avatar_sdp_offer(self, client_sdp: str):
        """Forward the browser's SDP offer to Voice Live for avatar WebRTC."""
        if self.connection:
            try:
                # Log diagnostic info about the SDP format
                logger.info(f"[SDP-CHECK] client_sdp length: {len(client_sdp)}")

                avatar_connect = ClientEventSessionAvatarConnect(
                    client_sdp=client_sdp,
                )
                logger.info("[SEND] session.avatar.connect")
                await self.connection.send(avatar_connect)
                logger.info("Sent avatar SDP offer to Voice Live")
            except Exception as e:
                logger.error(f"Error sending avatar SDP offer: {e}")

    async def interrupt(self):
        """Interrupt current response."""
        if self.connection:
            try:
                await self.connection.response.cancel()
                await self.send_message({
                    "type": "stop_playback",
                    "reason": "manual_interrupt",
                })
            except Exception as e:
                logger.error(f"Error interrupting: {e}")

    async def update_avatar_scene(self, scene_data: dict):
        """Send a raw session.update with avatar scene config.

        Bypasses SDK serialization completely by writing raw JSON directly
        to the underlying websocket, matching the JS sample's sendRawEvent approach.

        Includes input/output audio format and turn detection in the update
        to prevent the server from resetting those fields to defaults.
        """
        if self.connection:
            try:
                if not self.config.get("isPhotoAvatar", False):
                    raise ValueError("Live scene updates require a photo avatar.")

                avatar_name = self.config.get("avatarName", "Anika")
                parts = avatar_name.split("-", 1)
                avatar = {
                    "type": "photo-avatar",
                    "model": "vasa-1",
                    "character": parts[0].lower(),
                    "scene": {
                        "zoom": scene_data.get("zoom", 100) / 100,
                        "position_x": scene_data.get("positionX", 0) / 100,
                        "position_y": scene_data.get("positionY", 0) / 100,
                        "rotation_x": scene_data.get("rotationX", 0) * 3.141592653589793 / 180,
                        "rotation_y": scene_data.get("rotationY", 0) * 3.141592653589793 / 180,
                        "rotation_z": scene_data.get("rotationZ", 0) * 3.141592653589793 / 180,
                        "amplitude": scene_data.get("amplitude", 60) / 100,
                    },
                }
                if len(parts) > 1:
                    avatar["style"] = parts[1]
                if self.config.get("isCustomAvatar", False):
                    avatar["customized"] = True

                session_payload = {
                    "avatar": avatar,
                    "input_audio_format": "pcm16",
                    "output_audio_format": "pcm16",
                }

                # Preserve turn detection config
                td = self._build_turn_detection(self.config)
                if hasattr(td, 'as_dict'):
                    session_payload["turn_detection"] = td.as_dict()
                elif hasattr(td, '__dict__'):
                    session_payload["turn_detection"] = {k: v for k, v in td.__dict__.items() if not k.startswith('_')}

                raw_event = {
                    "type": "session.update",
                    "session": session_payload,
                }
                raw_json = json.dumps(raw_event)
                logger.info("[SEND] raw session.update (scene)")
                await self.connection._connection.send_str(raw_json)
            except Exception as e:
                logger.error(f"Error updating avatar scene: {e}", exc_info=True)

    async def stop(self):
        """Stop the session."""
        audit_event(
            "session_stopped",
            session_id=self._audit_session_id,
        )
        self.is_running = False
        self.connection = None

    async def _wait_for_event(self, connection, wanted_types: set, timeout_s: float = 15.0):
        """Wait for specific event types."""
        logger.info(f"[WAIT] Waiting for event types: {wanted_types}")
        async def _next():
            async for event in connection:
                etype = getattr(event, 'type', 'unknown')
                if etype != ServerEventType.RESPONSE_AUDIO_DELTA:
                    logger.info("[RECV-WAIT] %s", etype)
                if event.type in wanted_types:
                    return event
                # Continue handling other events while waiting
                await self._handle_event(event, connection)
            return None

        try:
            return await asyncio.wait_for(_next(), timeout=timeout_s)
        except asyncio.TimeoutError:
            logger.error(f"Timeout waiting for {wanted_types}")
            raise
