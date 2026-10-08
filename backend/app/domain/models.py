"""Transport and application models."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class CustomSpeechModel(BaseModel):
    locale: str = Field(min_length=2, max_length=16)
    modelId: str = Field(min_length=1, max_length=128)


class PhotoScene(BaseModel):
    model_config = ConfigDict(extra="forbid")

    zoom: int = Field(default=100, ge=70, le=100)
    positionX: int = Field(default=0, ge=-50, le=50)
    positionY: int = Field(default=0, ge=-50, le=50)
    rotationX: int = Field(default=0, ge=-30, le=30)
    rotationY: int = Field(default=0, ge=-30, le=30)
    rotationZ: int = Field(default=0, ge=-30, le=30)
    amplitude: int = Field(default=60, ge=10, le=100)


class SessionStartConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: Literal["model", "agent", "agent-v2"] = "model"
    model: str = Field(default="gpt-realtime", max_length=128)
    instructions: str = Field(default="", max_length=12_000)
    terminologyPackId: str = "none"
    namePackId: str = "none"
    accentProfileId: str = "auto"
    customLexiconUrl: str = Field(default="", max_length=2_048)
    customSpeechModels: list[CustomSpeechModel] = Field(default_factory=list, max_length=10)
    agentName: str = Field(default="", max_length=128)
    agentProjectName: str = Field(default="", max_length=128)
    voiceType: Literal[
        "standard",
        "custom",
        "personal",
        "azure-realtime-native",
    ] = "standard"
    voiceName: str = Field(default="en-US-AvaMultilingualNeural", max_length=128)
    voiceSpeed: float = Field(default=1.0, ge=0.5, le=1.5)
    voiceTemperature: float = Field(default=0.9, ge=0, le=1)
    voiceDeploymentId: str = Field(default="", max_length=128)
    customVoiceName: str = Field(default="", max_length=128)
    personalVoiceName: str = Field(default="", max_length=128)
    personalVoiceModel: str = Field(default="DragonLatestNeural", max_length=128)
    avatarEnabled: bool = True
    isPhotoAvatar: bool = False
    isCustomAvatar: bool = False
    avatarName: str = Field(default="Lisa-casual-sitting", max_length=128)
    avatarOutputMode: Literal["webrtc", "websocket"] = "webrtc"
    avatarBackgroundImageUrl: str = Field(default="", max_length=2_048)
    photoScene: PhotoScene | None = None
    useNS: bool = True
    useEC: bool = True
    turnDetectionType: Literal["server_vad", "azure_semantic_vad"] = "azure_semantic_vad"
    removeFillerWords: bool = False
    srModel: Literal["azure-speech", "mai-transcribe-1"] = "azure-speech"
    eouDetectionType: Literal["none", "semantic_detection_v1"] = "none"
    temperature: float = Field(default=0.9, ge=0, le=1.2)
    enableProactive: bool = False

    def to_voice_live_config(self) -> dict[str, Any]:
        config = self.model_dump(exclude={"customSpeechModels"})
        config["customSpeechModels"] = {
            item.locale: item.modelId for item in self.customSpeechModels
        }
        return config


class ClientMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: str = Field(min_length=1, max_length=64)
    config: dict[str, Any] | None = None
    data: str | None = None
    text: str | None = None
    clientSdp: str | None = None
    avatar: PhotoScene | None = None


class EvaluationResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    criterion: Literal[
        "complex_names",
        "complex_accents",
        "background_noise",
        "cloud_latency",
    ]
    passed: bool | None = None
    wordErrorRate: float | None = Field(default=None, ge=0, le=1)
    durationMs: int | None = Field(default=None, ge=0, le=300_000)
    terminologyPackId: str = "none"
    namePackId: str = "none"
    accentProfileId: str = "auto"
    noiseSuppressionEnabled: bool = False
