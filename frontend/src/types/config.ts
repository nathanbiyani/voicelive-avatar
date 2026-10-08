export interface CatalogItem {
  id: string
  name: string
  description: string
}

export interface NamePack extends CatalogItem {
  phrases?: string[]
}

export interface AccentProfile extends CatalogItem {
  locale: string
}

export interface ServerConfig {
  defaultModel?: string
  defaultVoice?: string
  voiceLiveConfigured?: boolean
  telemetryEnabled: boolean
  terminologyPacks: CatalogItem[]
  namePacks: NamePack[]
  accentProfiles: AccentProfile[]
}

export interface CustomSpeechModel {
  locale: string
  modelId: string
}

export interface PhotoScene {
  zoom: number
  positionX: number
  positionY: number
  rotationX: number
  rotationY: number
  rotationZ: number
  amplitude: number
}

export interface SessionForm {
  mode: 'model' | 'agent' | 'agent-v2'
  model: string
  agentName: string
  agentProjectName: string
  instructions: string
  temperature: number
  terminologyPackId: string
  namePackId: string
  accentProfileId: string
  customLexiconUrl: string
  customSpeechModels: CustomSpeechModel[]
  voiceType: 'standard' | 'custom' | 'personal' | 'azure-realtime-native'
  voiceName: string
  voiceSpeed: number
  voiceTemperature: number
  voiceDeploymentId: string
  customVoiceName: string
  personalVoiceName: string
  personalVoiceModel: string
  avatarEnabled: boolean
  isPhotoAvatar: boolean
  isCustomAvatar: boolean
  avatarName: string
  avatarOutputMode: 'webrtc' | 'websocket'
  avatarBackgroundImageUrl: string
  photoScene: PhotoScene
  useNS: boolean
  useEC: boolean
  turnDetectionType: 'server_vad' | 'azure_semantic_vad'
  removeFillerWords: boolean
  srModel: 'azure-speech' | 'mai-transcribe-1'
  eouDetectionType: 'none' | 'semantic_detection_v1'
  enableProactive: boolean
  captionsEnabled: boolean
  developerMode: boolean
}

export type SessionStartConfig = Omit<SessionForm, 'captionsEnabled' | 'developerMode'>

export type EvaluationCriterion = 'complex_names' | 'complex_accents' | 'background_noise' | 'cloud_latency'

export interface EvaluationMetadata {
  criterion: EvaluationCriterion
  passed?: boolean
  wordErrorRate?: number
  durationMs?: number
  terminologyPackId: string
  namePackId: string
  accentProfileId: string
  noiseSuppressionEnabled: boolean
}
