import pytest

from app.core.telemetry import _safe_value, anonymous_id, audit_event


def test_anonymous_id_is_stable_without_exposing_client_id():
    first = anonymous_id("client-example")
    second = anonymous_id("client-example")

    assert first == second
    assert "client-example" not in first
    assert len(first) == 16


def test_string_dimensions_are_bounded():
    assert len(_safe_value("x" * 300)) == 256


def test_transcript_dimension_is_rejected_even_when_export_is_disabled():
    with pytest.raises(ValueError, match="transcript"):
        audit_event("unsafe_event", transcript="patient content")
