"""FastAPI application factory for the AutoXRay Voice Live demo."""

from contextlib import asynccontextmanager
import logging

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_router
from app.api.websocket import router as websocket_router
from app.core.settings import load_settings
from app.core.telemetry import configure_audit_telemetry
from app.services.session_manager import VoiceSessionManager


load_dotenv()
logging.basicConfig(level=logging.INFO)


def create_app() -> FastAPI:
    settings = load_settings()
    telemetry_enabled = configure_audit_telemetry(settings)
    if settings.telemetry_configured and not telemetry_enabled:
        raise RuntimeError("Application Insights telemetry could not be configured.")

    session_manager = VoiceSessionManager(settings)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        yield
        await session_manager.stop_all()

    app = FastAPI(
        title="AutoXRay Voice Live Avatar API",
        version="1.0.0",
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.state.session_manager = session_manager
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.allowed_origins),
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )
    app.include_router(api_router)
    app.include_router(websocket_router)
    return app


app = create_app()
