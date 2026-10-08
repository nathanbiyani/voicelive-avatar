"""Environment-backed application settings."""

from dataclasses import dataclass
import os


def _csv(value: str) -> tuple[str, ...]:
    return tuple(item.strip() for item in value.split(",") if item.strip())


@dataclass(frozen=True)
class Settings:
    voice_live_endpoint: str
    voice_live_api_key: str
    default_model: str
    default_voice: str
    application_insights_connection_string: str
    allowed_origins: tuple[str, ...]
    max_websocket_message_bytes: int
    max_concurrent_sessions: int

    @property
    def voice_live_configured(self) -> bool:
        return bool(self.voice_live_endpoint)

    @property
    def telemetry_configured(self) -> bool:
        return bool(self.application_insights_connection_string)


def load_settings() -> Settings:
    return Settings(
        voice_live_endpoint=os.getenv("AZURE_VOICELIVE_ENDPOINT", "").strip(),
        voice_live_api_key=os.getenv("AZURE_VOICELIVE_API_KEY", "").strip(),
        default_model=os.getenv("VOICELIVE_MODEL", "gpt-realtime").strip(),
        default_voice=os.getenv(
            "VOICELIVE_VOICE",
            "en-US-AvaMultilingualNeural",
        ).strip(),
        application_insights_connection_string=os.getenv(
            "APPLICATIONINSIGHTS_CONNECTION_STRING",
            "",
        ).strip(),
        allowed_origins=_csv(
            os.getenv(
                "ALLOWED_ORIGINS",
                "http://localhost:5173,http://127.0.0.1:5173",
            )
        ),
        max_websocket_message_bytes=int(
            os.getenv("MAX_WEBSOCKET_MESSAGE_BYTES", str(2 * 1024 * 1024))
        ),
        max_concurrent_sessions=int(os.getenv("MAX_CONCURRENT_SESSIONS", "20")),
    )
