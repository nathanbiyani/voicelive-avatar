import type { ServerConfig, SessionForm } from '../types/config'

export const FALLBACK_CATALOGS: ServerConfig = {
  telemetryEnabled: false,
  terminologyPacks: [{ id: 'none', name: 'None', description: 'No domain glossary.' }],
  namePacks: [{ id: 'none', name: 'None', description: 'No name recognition hints.' }],
  accentProfiles: [
    { id: 'auto', name: 'Automatic language detection', locale: 'auto', description: 'Let Azure Speech detect the language.' },
  ],
}

export const DEFAULT_FORM: SessionForm = {
  mode: 'model',
  model: 'gpt-realtime-1.5',
  agentName: '',
  agentProjectName: '',
  instructions: 'You are embodied by the visible AutoXRay avatar in this application. Never claim that you have no avatar or cannot be seen. Greet the user briefly, then act as a clear, reassuring medical imaging assistant. Always respond in English unless the user asks for another language. Do not diagnose.',
  temperature: 0.9,
  terminologyPackId: 'none',
  namePackId: 'none',
  accentProfileId: 'auto',
  customLexiconUrl: '',
  customSpeechModels: [],
  voiceType: 'standard',
  voiceName: 'en-US-AvaMultilingualNeural',
  voiceSpeed: 1,
  voiceTemperature: 0.9,
  voiceDeploymentId: '',
  customVoiceName: '',
  personalVoiceName: '',
  personalVoiceModel: 'DragonLatestNeural',
  avatarEnabled: true,
  isPhotoAvatar: false,
  isCustomAvatar: false,
  avatarName: 'Lisa-casual-sitting',
  avatarOutputMode: 'websocket',
  avatarBackgroundImageUrl: '',
  photoScene: { zoom: 100, positionX: 0, positionY: 0, rotationX: 0, rotationY: 0, rotationZ: 0, amplitude: 60 },
  useNS: true,
  useEC: true,
  turnDetectionType: 'azure_semantic_vad',
  removeFillerWords: false,
  srModel: 'azure-speech',
  eouDetectionType: 'none',
  enableProactive: true,
  captionsEnabled: true,
  developerMode: false,
}

export const PRESETS: Array<{ id: string; name: string; description: string; patch: Partial<SessionForm> }> = [
  { id: 'clinical', name: 'Clinical clarity', description: 'Medical terminology, semantic turn taking, and noise controls.', patch: { terminologyPackId: 'general-radiography', useNS: true, useEC: true, turnDetectionType: 'azure_semantic_vad' } },
  { id: 'names', name: 'Complex names', description: 'Synthetic multilingual name recognition with captions.', patch: { namePackId: 'multicultural-names-v1', captionsEnabled: true, useNS: true } },
  { id: 'avatar', name: 'Avatar review', description: 'Streaming video avatar with standard multilingual voice.', patch: { avatarEnabled: true, isPhotoAvatar: false, avatarOutputMode: 'websocket', voiceType: 'standard' } },
  { id: 'noisy', name: 'Background noise', description: 'Noise suppression and echo cancellation comparison baseline.', patch: { useNS: true, useEC: true, captionsEnabled: true } },
]

export const MODELS = ['gpt-realtime-1.5', 'azure-realtime', 'gpt-realtime', 'gpt-realtime-mini', 'gpt-5.4', 'gpt-5.3-chat', 'gpt-5.2', 'gpt-4.1', 'gpt-4o']

export const VOICES = ['en-US-AvaMultilingualNeural', 'en-US-AndrewMultilingualNeural', 'en-GB-SoniaNeural', 'en-IN-NeerjaNeural']

export const PERSONAL_VOICE_MODELS = [
  { id: 'DragonLatestNeural', label: 'Dragon latest (includes current v2.1 improvements)' },
  { id: 'PhoenixLatestNeural', label: 'Phoenix latest' },
  { id: 'PhoenixV2Neural', label: 'Phoenix v2' },
  { id: 'DragonHDOmniLatestNeural', label: 'Dragon HD Omni latest' },
  { id: 'MAI-Voice-1', label: 'MAI Voice 1' },
]
