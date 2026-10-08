import { MODELS, PERSONAL_VOICE_MODELS, PRESETS, VOICES } from '../data/defaults'
import type { ServerConfig, SessionForm } from '../types/config'
import { Field, Input, Select, SettingsGroup, Textarea, Toggle } from './FormControls'

interface Props {
  form: SessionForm
  catalogs: ServerConfig
  disabled: boolean
  onChange: (patch: Partial<SessionForm>) => void
  onClose?: () => void
}

export function SettingsPanel({ form, catalogs, disabled, onChange, onClose }: Props) {
  const set = <K extends keyof SessionForm>(key: K, value: SessionForm[K]) => onChange({ [key]: value })
  const scene = (key: keyof SessionForm['photoScene'], value: number) => onChange({ photoScene: { ...form.photoScene, [key]: value } })

  return <aside className="settings-panel" aria-label="Session settings">
    <div className="settings-header"><div><span className="eyebrow">Configuration</span><h2>Session settings</h2></div>{onClose && <button type="button" className="drawer-close" aria-label="Close settings" onClick={onClose}>×</button>}</div>
    <div className="settings-scroll">
      <SettingsGroup title="Presets" open>
        <div className="preset-grid">{PRESETS.map((preset) => <button className="preset" type="button" aria-label={`Apply ${preset.name} preset`} key={preset.id} disabled={disabled} onClick={() => onChange(preset.patch)}><strong>{preset.name}</strong><span>{preset.description}</span></button>)}</div>
      </SettingsGroup>
      <SettingsGroup title="Backend connection & target">
        <div className={`backend-readiness ${catalogs.voiceLiveConfigured === false ? 'not-ready' : 'ready'}`} role="status">
          <span className="readiness-dot" aria-hidden="true" />
          <div><strong>{catalogs.voiceLiveConfigured === false ? 'Backend setup required' : 'Backend ready'}</strong><p>{catalogs.voiceLiveConfigured === false ? 'Configure AZURE_VOICELIVE_ENDPOINT and credentials on the server.' : 'Endpoint and authentication are managed securely by the backend.'}</p></div>
        </div>
        <Field label="Mode"><Select disabled={disabled} value={form.mode} onChange={(e) => set('mode', e.target.value as SessionForm['mode'])}><option value="model">Model</option><option value="agent">Agent</option><option value="agent-v2">Agent V2</option></Select></Field>
        {form.mode !== 'model' && <>
          <Field label="Agent project name"><Input disabled={disabled} value={form.agentProjectName} onChange={(e) => set('agentProjectName', e.target.value)} /></Field>
          <Field label="Agent name"><Input disabled={disabled} value={form.agentName} onChange={(e) => set('agentName', e.target.value)} /></Field>
          <p className="field-hint">Instructions and terminology must be configured on the agent.</p>
        </>}
        {form.mode === 'model' && <Field label="Model"><Select disabled={disabled} value={form.model} onChange={(e) => set('model', e.target.value)}>{MODELS.map((model) => <option key={model}>{model}</option>)}</Select></Field>}
      </SettingsGroup>
      <SettingsGroup title="Evaluation language packs">
        <Field label="Medical terminology pack" hint="Adds curated, non-patient domain instructions."><Select disabled={disabled || form.mode !== 'model'} value={form.terminologyPackId} onChange={(e) => set('terminologyPackId', e.target.value)}>{catalogs.terminologyPacks.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
        <Field label="Synthetic complex-name pack" hint="Expected names remain local and are never sent as telemetry."><Select disabled={disabled} value={form.namePackId} onChange={(e) => set('namePackId', e.target.value)}>{catalogs.namePacks.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
        <Field label="Accent & recognition locale"><Select disabled={disabled} value={form.accentProfileId} onChange={(e) => set('accentProfileId', e.target.value)}>{catalogs.accentProfiles.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.locale}</option>)}</Select></Field>
        <Field label="Custom lexicon URL" hint="Optional absolute HTTPS URL."><Input disabled={disabled} type="url" value={form.customLexiconUrl} placeholder="https://…/lexicon.xml" onChange={(e) => set('customLexiconUrl', e.target.value)} /></Field>
        <div className="mapping-header"><span>Locale → Custom Speech model</span><button type="button" className="text-button" disabled={disabled || form.customSpeechModels.length >= 10} onClick={() => set('customSpeechModels', [...form.customSpeechModels, { locale: '', modelId: '' }])}>+ Add mapping</button></div>
        {form.customSpeechModels.map((mapping, index) => <div className="mapping-row" key={index}>
          <Input aria-label={`Custom Speech locale ${index + 1}`} disabled={disabled} placeholder="en-US" value={mapping.locale} onChange={(e) => set('customSpeechModels', form.customSpeechModels.map((item, itemIndex) => itemIndex === index ? { ...item, locale: e.target.value } : item))} />
          <Input aria-label={`Custom Speech model ${index + 1}`} disabled={disabled} placeholder="Model ID" value={mapping.modelId} onChange={(e) => set('customSpeechModels', form.customSpeechModels.map((item, itemIndex) => itemIndex === index ? { ...item, modelId: e.target.value } : item))} />
          <button type="button" className="icon-button" aria-label={`Remove Custom Speech mapping ${index + 1}`} disabled={disabled} onClick={() => set('customSpeechModels', form.customSpeechModels.filter((_, itemIndex) => itemIndex !== index))}>×</button>
        </div>)}
      </SettingsGroup>
      <SettingsGroup title="Voice controls">
        <Field label="Voice type"><Select disabled={disabled} value={form.voiceType} onChange={(e) => set('voiceType', e.target.value as SessionForm['voiceType'])}><option value="standard">Azure standard</option><option value="azure-realtime-native">Realtime native</option><option value="custom">Custom voice</option><option value="personal">Personal voice</option></Select></Field>
        <Field label="Voice"><Select disabled={disabled} value={form.voiceName} onChange={(e) => set('voiceName', e.target.value)}>{VOICES.map((voice) => <option key={voice}>{voice}</option>)}</Select></Field>
        {form.voiceType === 'custom' && <><Field label="Deployment ID"><Input disabled={disabled} value={form.voiceDeploymentId} onChange={(e) => set('voiceDeploymentId', e.target.value)} /></Field><Field label="Custom voice name"><Input disabled={disabled} value={form.customVoiceName} onChange={(e) => set('customVoiceName', e.target.value)} /></Field></>}
        {form.voiceType === 'personal' && <>
          <Field label="Personal Voice speaker profile ID" hint="Required consented speakerProfileId hosted on the same Foundry resource as Voice Live."><Input disabled={disabled} value={form.personalVoiceName} placeholder="Consented speakerProfileId" onChange={(e) => set('personalVoiceName', e.target.value)} /></Field>
          <Field label="Personal Voice model" hint="Voice Live uses the rolling DragonLatestNeural name for the current Dragon release."><Select disabled={disabled} value={form.personalVoiceModel} onChange={(e) => set('personalVoiceModel', e.target.value)}>{PERSONAL_VOICE_MODELS.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}</Select></Field>
          <p className="field-hint">Personal Voice changes synthesized output only. The complex-name phrase list separately improves incoming speech recognition.</p>
        </>}
        <Field label={`Speed · ${form.voiceSpeed.toFixed(2)}×`}><Input disabled={disabled} type="range" min=".5" max="1.5" step=".05" value={form.voiceSpeed} onChange={(e) => set('voiceSpeed', Number(e.target.value))} /></Field>
        <Field label={`Voice temperature · ${form.voiceTemperature.toFixed(1)}`}><Input disabled={disabled} type="range" min="0" max="1" step=".1" value={form.voiceTemperature} onChange={(e) => set('voiceTemperature', Number(e.target.value))} /></Field>
      </SettingsGroup>
      <SettingsGroup title="Avatar & scene">
        <Toggle label="Enable avatar" checked={form.avatarEnabled} disabled={disabled} onChange={(value) => set('avatarEnabled', value)} />
        {form.avatarEnabled && <>
          <div className="segmented" aria-label="Avatar type"><button type="button" className={!form.isPhotoAvatar ? 'active' : ''} disabled={disabled} onClick={() => set('isPhotoAvatar', false)}>Video</button><button type="button" className={form.isPhotoAvatar ? 'active' : ''} disabled={disabled} onClick={() => set('isPhotoAvatar', true)}>Photo</button></div>
          <Toggle label="Custom avatar" checked={form.isCustomAvatar} disabled={disabled} onChange={(value) => set('isCustomAvatar', value)} />
          <Field label="Avatar name"><Input disabled={disabled} value={form.avatarName} onChange={(e) => set('avatarName', e.target.value)} /></Field>
          <Field label="Video transport"><Select disabled={disabled} value={form.avatarOutputMode} onChange={(e) => set('avatarOutputMode', e.target.value as SessionForm['avatarOutputMode'])}><option value="webrtc">WebRTC</option><option value="websocket">WebSocket (fMP4)</option></Select></Field>
          <Field label="Background image URL"><Input disabled={disabled} type="url" value={form.avatarBackgroundImageUrl} onChange={(e) => set('avatarBackgroundImageUrl', e.target.value)} /></Field>
          {form.isPhotoAvatar && <div className="scene-grid">{([
            ['zoom', 'Zoom', 70, 100], ['positionX', 'Position X', -50, 50], ['positionY', 'Position Y', -50, 50],
            ['rotationX', 'Rotation X', -30, 30], ['rotationY', 'Rotation Y', -30, 30], ['rotationZ', 'Rotation Z', -30, 30], ['amplitude', 'Amplitude', 10, 100],
          ] as const).map(([key, label, min, max]) => <Field key={key} label={`${label} · ${form.photoScene[key]}`}><Input disabled={disabled} type="range" min={min} max={max} value={form.photoScene[key]} onChange={(e) => scene(key, Number(e.target.value))} /></Field>)}</div>}
        </>}
      </SettingsGroup>
      <SettingsGroup title="Audio & turn detection">
        <Toggle label="Noise suppression" checked={form.useNS} disabled={disabled} onChange={(value) => set('useNS', value)} />
        <Toggle label="Echo cancellation" checked={form.useEC} disabled={disabled} onChange={(value) => set('useEC', value)} />
        <Field label="Turn detection"><Select disabled={disabled} value={form.turnDetectionType} onChange={(e) => set('turnDetectionType', e.target.value as SessionForm['turnDetectionType'])}><option value="azure_semantic_vad">Azure semantic VAD</option><option value="server_vad">Server VAD</option></Select></Field>
        <Toggle label="Remove filler words" checked={form.removeFillerWords} disabled={disabled} onChange={(value) => set('removeFillerWords', value)} />
        <Toggle label="Captions" checked={form.captionsEnabled} onChange={(value) => set('captionsEnabled', value)} />
        <Toggle label="Developer transcript" checked={form.developerMode} onChange={(value) => set('developerMode', value)} />
      </SettingsGroup>
      <SettingsGroup title="Prompt">
        <Field label="Instructions"><Textarea disabled={disabled || form.mode !== 'model'} rows={5} value={form.instructions} onChange={(e) => set('instructions', e.target.value)} /></Field>
        <Field label={`Temperature · ${form.temperature.toFixed(1)}`}><Input disabled={disabled} type="range" min="0" max="1.2" step=".1" value={form.temperature} onChange={(e) => set('temperature', Number(e.target.value))} /></Field>
      </SettingsGroup>
    </div>
  </aside>
}
