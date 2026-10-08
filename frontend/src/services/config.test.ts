import { describe, expect, it } from 'vitest'
import { DEFAULT_FORM } from '../data/defaults'
import { composeSessionConfig, validateSession } from './config'

describe('session config composition', () => {
  it('includes evaluation selections and normalized Custom Speech mappings', () => {
    const config = composeSessionConfig({
      ...DEFAULT_FORM,
      terminologyPackId: 'general-radiography',
      namePackId: 'multicultural-names-v1',
      accentProfileId: 'en-IN',
      customLexiconUrl: ' https://example.test/medical.xml ',
      customSpeechModels: [{ locale: ' en-IN ', modelId: ' model-123 ' }, { locale: '', modelId: '' }],
    })
    expect(config).toMatchObject({
      terminologyPackId: 'general-radiography',
      namePackId: 'multicultural-names-v1',
      accentProfileId: 'en-IN',
      customLexiconUrl: 'https://example.test/medical.xml',
      customSpeechModels: [{ locale: 'en-IN', modelId: 'model-123' }],
    })
    expect(config).not.toHaveProperty('captionsEnabled')
    expect(config).not.toHaveProperty('developerMode')
  })

  it('never includes browser credentials or an endpoint and validates HTTPS lexicons', () => {
    const config = composeSessionConfig(DEFAULT_FORM)
    expect(config).not.toHaveProperty('apiKey')
    expect(config).not.toHaveProperty('entraToken')
    expect(config).not.toHaveProperty('endpoint')
    expect(validateSession({ ...DEFAULT_FORM, customLexiconUrl: 'http://unsafe.test/lexicon.xml' })).toBe('Custom lexicon URL must use HTTPS.')
  })

  it('requires a consented speaker profile for Personal Voice', () => {
    expect(validateSession({ ...DEFAULT_FORM, voiceType: 'personal', personalVoiceName: '' })).toBe(
      'Personal Voice requires a consented speaker profile ID.',
    )
    expect(validateSession({
      ...DEFAULT_FORM,
      voiceType: 'personal',
      personalVoiceName: 'consented-profile-id',
      personalVoiceModel: 'DragonLatestNeural',
    })).toBeNull()
  })

  it('omits model-owned instructions and terminology when connecting to an agent', () => {
    const form = {
      ...DEFAULT_FORM,
      mode: 'agent' as const,
      agentName: 'radiology-agent',
      agentProjectName: 'clinical-demos',
      instructions: 'Model-only instructions',
      terminologyPackId: 'general-radiography',
    }

    expect(validateSession(form)).toBeNull()
    expect(composeSessionConfig(form)).toMatchObject({
      instructions: '',
      terminologyPackId: 'none',
    })
  })
})
