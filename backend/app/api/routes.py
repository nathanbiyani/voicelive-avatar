"""REST endpoints for health and non-sensitive client configuration."""

from fastapi import APIRouter, HTTPException, Request, status

from app.core.telemetry import audit_event
from app.domain.catalogs import ACCENT_PROFILES, NAME_PACKS, TERMINOLOGY_PACKS
from app.domain.models import EvaluationResult


router = APIRouter(prefix="/api")


@router.get("/health")
async def health(request: Request):
    settings = request.app.state.settings
    return {
        "status": "healthy",
        "service": "voicelive-avatar-backend",
        "voiceLiveConfigured": settings.voice_live_configured,
        "telemetryConfigured": settings.telemetry_configured,
    }


@router.get("/config")
async def client_config(request: Request):
    settings = request.app.state.settings
    return {
        "defaultModel": settings.default_model,
        "defaultVoice": settings.default_voice,
        "voiceLiveConfigured": settings.voice_live_configured,
        "telemetryEnabled": settings.telemetry_configured,
        "terminologyPacks": [
            {
                "id": pack.id,
                "name": pack.name,
                "description": pack.description,
            }
            for pack in TERMINOLOGY_PACKS.values()
        ],
        "namePacks": [
            {
                "id": pack.id,
                "name": pack.name,
                "description": pack.description,
                "phrases": list(pack.phrases),
            }
            for pack in NAME_PACKS.values()
        ],
        "accentProfiles": [
            {
                "id": profile.id,
                "name": profile.name,
                "locale": profile.locale,
                "description": profile.description,
            }
            for profile in ACCENT_PROFILES.values()
        ],
    }


@router.post("/evaluations", status_code=status.HTTP_202_ACCEPTED)
async def record_evaluation(result: EvaluationResult):
    if result.terminologyPackId not in TERMINOLOGY_PACKS:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown terminology pack: {result.terminologyPackId}",
        )
    if result.namePackId not in NAME_PACKS:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown name pack: {result.namePackId}",
        )
    if result.accentProfileId not in ACCENT_PROFILES:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown accent profile: {result.accentProfileId}",
        )

    audit_event(
        "evaluation_recorded",
        criterion=result.criterion,
        passed=result.passed,
        word_error_rate=result.wordErrorRate,
        duration_ms=result.durationMs,
        terminology_pack=result.terminologyPackId,
        name_pack=result.namePackId,
        accent_profile=result.accentProfileId,
        noise_suppression=result.noiseSuppressionEnabled,
    )
    return {"status": "accepted"}
