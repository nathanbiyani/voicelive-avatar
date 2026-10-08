"""Validate evaluation selections and compose Voice Live session settings."""

from urllib.parse import urlparse

from app.domain.catalogs import ACCENT_PROFILES, NAME_PACKS, TERMINOLOGY_PACKS


PERSONAL_VOICE_MODELS = {
    "DragonLatestNeural",
    "PhoenixLatestNeural",
    "PhoenixV2Neural",
    "DragonHDOmniLatestNeural",
    "MAI-Voice-1",
}


def _require(mapping: dict, item_id: str, label: str):
    try:
        return mapping[item_id]
    except KeyError as exc:
        raise ValueError(f"Unknown {label}: {item_id}") from exc


def prepare_voice_live_config(config: dict) -> dict:
    result = dict(config)
    terminology_pack = _require(
        TERMINOLOGY_PACKS,
        result.get("terminologyPackId", "none"),
        "terminology pack",
    )
    name_pack = _require(
        NAME_PACKS,
        result.get("namePackId", "none"),
        "name pack",
    )
    accent_profile = _require(
        ACCENT_PROFILES,
        result.get("accentProfileId", "auto"),
        "accent profile",
    )

    if result.get("mode", "model") != "model" and terminology_pack.id != "none":
        raise ValueError(
            "Terminology packs are only available in model mode because agent "
            "instructions are agent-owned."
        )
    if result.get("mode", "model") != "model" and result.get("instructions", "").strip():
        raise ValueError("Instructions cannot override agent-owned instructions.")

    instructions = result.get("instructions", "").strip()
    if terminology_pack.instructions:
        instructions = "\n".join(
            part for part in (instructions, terminology_pack.instructions) if part
        )
    result["instructions"] = instructions
    result["phraseList"] = list(name_pack.phrases)
    result["recognitionLanguage"] = accent_profile.locale

    custom_lexicon_url = result.get("customLexiconUrl", "").strip()
    if custom_lexicon_url:
        parsed = urlparse(custom_lexicon_url)
        if parsed.scheme != "https" or not parsed.netloc:
            raise ValueError("Custom lexicon URL must be an absolute HTTPS URL.")
    result["customLexiconUrl"] = custom_lexicon_url
    if custom_lexicon_url and result.get("voiceType") == "azure-realtime-native":
        raise ValueError(
            "Custom lexicons are not supported by Azure realtime native voices."
        )

    if result.get("voiceType") == "personal":
        if not result.get("personalVoiceName", "").strip():
            raise ValueError(
                "Personal Voice requires a consented speaker profile ID."
            )
        personal_voice_model = result.get(
            "personalVoiceModel", "DragonLatestNeural"
        )
        if personal_voice_model not in PERSONAL_VOICE_MODELS:
            raise ValueError("Unsupported Personal Voice model.")

    background_url = result.get("avatarBackgroundImageUrl", "").strip()
    if background_url:
        parsed_background = urlparse(background_url)
        if parsed_background.scheme != "https" or not parsed_background.netloc:
            raise ValueError("Avatar background URL must be an absolute HTTPS URL.")
    result["avatarBackgroundImageUrl"] = background_url

    custom_speech = result.get("customSpeechModels", {})
    if len(custom_speech) > 10:
        raise ValueError("At most 10 Custom Speech locale mappings are supported.")
    result["customSpeechModels"] = {
        str(locale)[:16]: str(model_id)[:128]
        for locale, model_id in custom_speech.items()
        if model_id
    }
    return result
