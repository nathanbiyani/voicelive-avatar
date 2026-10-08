import { DEFAULT_FORM, FALLBACK_CATALOGS } from '../data/defaults'
import type { ServerConfig, SessionForm, SessionStartConfig } from '../types/config'

export async function fetchConfig(signal?: AbortSignal): Promise<ServerConfig> {
  const response = await fetch('/api/config', { signal })
  if (!response.ok) throw new Error(`Configuration request failed (${response.status})`)
  return { ...FALLBACK_CATALOGS, ...(await response.json()) }
}

export function applyServerDefaults(config: ServerConfig): SessionForm {
  return { ...DEFAULT_FORM, model: config.defaultModel || DEFAULT_FORM.model, voiceName: config.defaultVoice || DEFAULT_FORM.voiceName }
}

export function composeSessionConfig(form: SessionForm): SessionStartConfig {
  const config = { ...form }
  delete (config as Partial<SessionForm>).captionsEnabled
  delete (config as Partial<SessionForm>).developerMode
  const result: SessionStartConfig = {
    ...config,
    instructions: form.mode === 'model' ? form.instructions : '',
    terminologyPackId: form.mode === 'model' ? form.terminologyPackId : 'none',
    customLexiconUrl: form.customLexiconUrl.trim(),
    customSpeechModels: form.customSpeechModels.filter(({ locale, modelId }) => locale.trim() && modelId.trim()).map(({ locale, modelId }) => ({ locale: locale.trim(), modelId: modelId.trim() })),
  }
  return result
}

export function validateSession(form: SessionForm): string | null {
  if (form.mode !== 'model' && (!form.agentName.trim() || !form.agentProjectName.trim())) return 'Enter the agent and project names.'
  if (form.customLexiconUrl && !/^https:\/\//i.test(form.customLexiconUrl)) return 'Custom lexicon URL must use HTTPS.'
  if (form.customLexiconUrl && form.voiceType === 'azure-realtime-native') return 'Custom lexicons are not supported by realtime native voices.'
  if (form.voiceType === 'personal' && !form.personalVoiceName.trim()) return 'Personal Voice requires a consented speaker profile ID.'
  if (form.avatarBackgroundImageUrl && !/^https:\/\//i.test(form.avatarBackgroundImageUrl)) return 'Avatar background URL must use HTTPS.'
  return null
}
