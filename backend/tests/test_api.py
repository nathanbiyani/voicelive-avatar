from fastapi.testclient import TestClient

from app.main import create_app


def test_health_reports_backend_readiness(monkeypatch):
    monkeypatch.delenv("AZURE_VOICELIVE_ENDPOINT", raising=False)
    monkeypatch.delenv("APPLICATIONINSIGHTS_CONNECTION_STRING", raising=False)

    with TestClient(create_app()) as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "service": "voicelive-avatar-backend",
        "voiceLiveConfigured": False,
        "telemetryConfigured": False,
    }


def test_config_exposes_only_non_secret_catalogs(monkeypatch):
    monkeypatch.setenv("AZURE_VOICELIVE_ENDPOINT", "https://example.services.ai.azure.com")
    monkeypatch.setenv("AZURE_VOICELIVE_API_KEY", "do-not-return")
    monkeypatch.delenv("APPLICATIONINSIGHTS_CONNECTION_STRING", raising=False)

    with TestClient(create_app()) as client:
        response = client.get("/api/config")

    assert response.status_code == 200
    payload = response.json()
    assert payload["voiceLiveConfigured"] is True
    assert "endpoint" not in payload
    assert "apiKey" not in payload
    assert any(pack["id"] == "general-radiography" for pack in payload["terminologyPacks"])
    assert any(pack["id"] == "multicultural-names-v1" for pack in payload["namePacks"])


def test_accepts_privacy_safe_evaluation_metadata(monkeypatch):
    monkeypatch.delenv("APPLICATIONINSIGHTS_CONNECTION_STRING", raising=False)

    with TestClient(create_app()) as client:
        response = client.post(
            "/api/evaluations",
            json={
                "criterion": "complex_names",
                "passed": True,
                "durationMs": 420,
                "namePackId": "multicultural-names-v1",
                "accentProfileId": "en-IN",
            },
        )

    assert response.status_code == 202
    assert response.json() == {"status": "accepted"}


def test_evaluation_schema_rejects_transcripts(monkeypatch):
    monkeypatch.delenv("APPLICATIONINSIGHTS_CONNECTION_STRING", raising=False)

    with TestClient(create_app()) as client:
        response = client.post(
            "/api/evaluations",
            json={
                "criterion": "complex_names",
                "transcript": "patient content",
            },
        )

    assert response.status_code == 422
