"""Privacy-safe audit events exported only through a dedicated logger."""

import hashlib
import hmac
import logging
import os
import secrets
from typing import Any

from app.core.settings import Settings


AUDIT_LOGGER_NAME = "voicelive.audit"
_audit_logger = logging.getLogger(AUDIT_LOGGER_NAME)
_configured = False
_hash_key = (
    os.getenv("TELEMETRY_HASH_SALT", "").encode("utf-8")
    or secrets.token_bytes(32)
)
ALLOWED_DIMENSIONS = {
    "accent_profile",
    "avatar_enabled",
    "avatar_type",
    "custom_lexicon_enabled",
    "custom_speech_enabled",
    "echo_cancellation",
    "error_type",
    "criterion",
    "duration_ms",
    "passed",
    "word_error_rate",
    "mode",
    "model",
    "name_pack",
    "noise_suppression",
    "output_protocol",
    "reason",
    "session_id",
    "stage",
    "terminology_pack",
}


def configure_audit_telemetry(settings: Settings) -> bool:
    global _configured
    if _configured:
        return True
    if not settings.telemetry_configured:
        return False

    try:
        from azure.monitor.opentelemetry import configure_azure_monitor
    except ImportError as exc:
        raise RuntimeError(
            "Application Insights is configured but azure-monitor-opentelemetry "
            "is not installed."
        ) from exc

    configure_azure_monitor(
        connection_string=settings.application_insights_connection_string,
        logger_name=AUDIT_LOGGER_NAME,
        enable_live_metrics=True,
        instrumentation_options={
            name: {"enabled": False}
            for name in (
                "azure_sdk",
                "django",
                "fastapi",
                "flask",
                "httpx",
                "psycopg2",
                "requests",
                "urllib",
                "urllib3",
            )
        },
    )
    _audit_logger.setLevel(logging.INFO)
    _configured = True
    return True


def anonymous_id(value: str) -> str:
    return hmac.new(_hash_key, value.encode("utf-8"), hashlib.sha256).hexdigest()[:16]


def _safe_value(value: Any) -> str | bool | int | float:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value
    if value is None:
        return ""
    return str(value)[:256]


def audit_event(event_name: str, **dimensions: Any) -> None:
    unexpected = set(dimensions) - ALLOWED_DIMENSIONS
    if unexpected:
        raise ValueError(
            "Unsupported audit dimensions: " + ", ".join(sorted(unexpected))
        )
    if not _configured:
        return
    safe_dimensions = {"event_name": event_name}
    safe_dimensions.update(
        {
            key: _safe_value(value)
            for key, value in dimensions.items()
            if value is not None
        }
    )
    _audit_logger.info(
        event_name,
        extra={"custom_dimensions": safe_dimensions},
    )
