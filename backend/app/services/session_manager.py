"""Own Voice Live credentials, sessions, and task lifecycle."""

import asyncio
from collections.abc import Awaitable, Callable
import logging
from typing import Any

from azure.core.credentials import AzureKeyCredential

from app.core.settings import Settings
from app.core.telemetry import anonymous_id, audit_event
from app.integrations.voice_live_session import VoiceSessionHandler
from app.services.session_configuration import prepare_voice_live_config


logger = logging.getLogger(__name__)
SendMessage = Callable[[dict[str, Any]], Awaitable[None]]


class VoiceSessionManager:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._sessions: dict[str, VoiceSessionHandler] = {}
        self._tasks: dict[str, asyncio.Task] = {}
        self._credentials: dict[str, Any] = {}

    async def start(
        self,
        client_id: str,
        raw_config: dict[str, Any],
        send_message: SendMessage,
    ) -> None:
        await self.stop(client_id, reason="replaced")
        if len(self._sessions) >= self._settings.max_concurrent_sessions:
            raise ValueError("The server has reached its concurrent session limit.")
        if not self._settings.voice_live_endpoint:
            raise ValueError(
                "Voice Live is not configured. Set AZURE_VOICELIVE_ENDPOINT on the backend."
            )

        config = prepare_voice_live_config(raw_config)
        credential = await self._create_credential(config.get("mode", "model"))
        handler = VoiceSessionHandler(
            client_id=client_id,
            endpoint=self._settings.voice_live_endpoint,
            credential=credential,
            send_message=send_message,
            config=config,
        )
        self._sessions[client_id] = handler
        self._credentials[client_id] = credential
        self._tasks[client_id] = asyncio.create_task(handler.start())
        audit_event(
            "session_requested",
            session_id=anonymous_id(client_id),
            mode=config.get("mode", "model"),
            model=config.get("model", self._settings.default_model),
            terminology_pack=config.get("terminologyPackId", "none"),
            name_pack=config.get("namePackId", "none"),
            accent_profile=config.get("accentProfileId", "auto"),
            custom_speech_enabled=bool(config.get("customSpeechModels")),
            custom_lexicon_enabled=bool(config.get("customLexiconUrl")),
        )

    def get(self, client_id: str) -> VoiceSessionHandler | None:
        return self._sessions.get(client_id)

    async def stop(self, client_id: str, reason: str = "client_request") -> None:
        handler = self._sessions.pop(client_id, None)
        if handler:
            await handler.stop()

        task = self._tasks.pop(client_id, None)
        if task and not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        credential = self._credentials.pop(client_id, None)
        close = getattr(credential, "close", None)
        if close:
            result = close()
            if asyncio.iscoroutine(result):
                await result

        if handler:
            audit_event(
                "session_cleanup_completed",
                session_id=anonymous_id(client_id),
                reason=reason,
            )

    async def stop_all(self) -> None:
        await asyncio.gather(
            *(self.stop(client_id, reason="application_shutdown") for client_id in tuple(self._sessions)),
            return_exceptions=True,
        )

    async def _create_credential(self, mode: str):
        if self._settings.voice_live_api_key and mode == "model":
            return AzureKeyCredential(self._settings.voice_live_api_key)

        try:
            from azure.identity.aio import DefaultAzureCredential
        except ImportError as exc:
            raise RuntimeError(
                "No AZURE_VOICELIVE_API_KEY is configured and azure-identity is unavailable."
            ) from exc
        return DefaultAzureCredential()
