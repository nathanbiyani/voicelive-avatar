import { useEffect, useState } from 'react'
import './App.css'
import { ConversationPanel } from './components/ConversationPanel'
import { SettingsPanel } from './components/SettingsPanel'
import { DEFAULT_FORM, FALLBACK_CATALOGS } from './data/defaults'
import { useVoiceSession } from './hooks/useVoiceSession'
import { applyServerDefaults, fetchConfig } from './services/config'
import type { ServerConfig, SessionForm } from './types/config'

function App() {
  const [form, setForm] = useState<SessionForm>(DEFAULT_FORM)
  const [catalogs, setCatalogs] = useState<ServerConfig>(FALLBACK_CATALOGS)
  const [configNotice, setConfigNotice] = useState('Loading evaluation catalogs…')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const session = useVoiceSession(form)

  useEffect(() => {
    const controller = new AbortController()
    fetchConfig(controller.signal).then((config) => {
      setCatalogs(config)
      setForm(applyServerDefaults(config))
      setConfigNotice(config.voiceLiveConfigured === false ? 'Backend is available; Voice Live credentials are not configured.' : '')
    }).catch(() => setConfigNotice('Backend catalogs are unavailable. Safe fallback options are shown.'))
    return () => controller.abort()
  }, [])

  const connected = session.status === 'connected'
  const busy = connected || session.status === 'connecting'
  const patchForm = (patch: Partial<SessionForm>) => {
    setForm((current) => ({ ...current, ...patch }))
    if (patch.photoScene && connected) session.updateScene(patch.photoScene)
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark" aria-hidden="true">AX</span><div><strong>AutoXRay</strong><span>Voice imaging assistant</span></div></div>
      <div className="status-strip" aria-live="polite">
        <div><span>Status</span><strong className={`status-value ${session.status}`}>{session.status}</strong></div>
        <div><span>Latency</span><strong>{session.latencyMs === null ? '—' : `${session.latencyMs} ms`}</strong></div>
        <button type="button" className="settings-button" aria-expanded={settingsOpen} aria-controls="session-settings" onClick={() => setSettingsOpen((open) => !open)}>Settings</button>
        <button type="button" className={connected ? 'disconnect-button' : 'connect-button'} disabled={session.status === 'connecting'} onClick={connected ? session.disconnect : session.connect}>{session.status === 'connecting' ? 'Connecting…' : connected ? 'Disconnect' : 'Start voice session'}</button>
      </div>
    </header>
    {settingsOpen && <button type="button" className="settings-backdrop" aria-label="Dismiss settings" onClick={() => setSettingsOpen(false)} />}
    {settingsOpen && <div id="session-settings" className="settings-drawer open">
      <SettingsPanel form={form} catalogs={catalogs} disabled={busy} onChange={patchForm} onClose={() => setSettingsOpen(false)} />
    </div>}
    <main className="conversation-workspace">
      <section className="conversation-heading">
        <div>
          <span className="eyebrow">Live session</span>
          <h1>Talk with your imaging assistant</h1>
          <p>Speak naturally. The avatar will listen, respond, and show live captions.</p>
        </div>
        <div className="active-profile" aria-label="Active session profile">
          <span>{catalogs.terminologyPacks.find((item) => item.id === form.terminologyPackId)?.name ?? 'No terminology pack'}</span>
          <span>{catalogs.accentProfiles.find((item) => item.id === form.accentProfileId)?.name ?? 'Automatic language detection'}</span>
          <span>{form.voiceName}</span>
        </div>
      </section>
        {configNotice && <div className="notice" role="status">{configNotice}</div>}
        <div className="conversation-layout">
          <ConversationPanel status={session.status} messages={session.messages} developerMode={form.developerMode} captionsEnabled={form.captionsEnabled} caption={session.caption} micEnabled={session.micEnabled} avatarEnabled={form.avatarEnabled} avatarMediaReady={session.avatarMediaReady} avatarRef={session.avatarContainerRef} onToggleMic={session.toggleMic} onSend={session.sendText} onClear={session.clearMessages} />
          <aside className="run-card" aria-label="Session summary">
            <span className="eyebrow">Current setup</span><h2>Session profile</h2>
            <dl>
              <div><dt>Terminology</dt><dd>{catalogs.terminologyPacks.find((item) => item.id === form.terminologyPackId)?.name ?? form.terminologyPackId}</dd></div>
              <div><dt>Name pack</dt><dd>{catalogs.namePacks.find((item) => item.id === form.namePackId)?.name ?? form.namePackId}</dd></div>
              <div><dt>Accent</dt><dd>{catalogs.accentProfiles.find((item) => item.id === form.accentProfileId)?.name ?? form.accentProfileId}</dd></div>
              <div><dt>Audio cleanup</dt><dd>{form.useNS ? 'Noise suppression' : 'Raw noise'} · {form.useEC ? 'Echo cancellation' : 'No EC'}</dd></div>
              <div><dt>Transport</dt><dd>{form.avatarEnabled ? form.avatarOutputMode.toUpperCase() : 'Audio only'}</dd></div>
            </dl>
            <button type="button" className="summary-settings-button" onClick={() => setSettingsOpen(true)}>Customize session</button>
            <div className="privacy-note"><strong>{catalogs.telemetryEnabled ? 'Privacy-safe telemetry enabled' : 'Telemetry disabled'}</strong><p>Audio, transcripts, names, prompts, and credentials are not evaluation telemetry.</p></div>
          </aside>
        </div>
    </main>
  </div>
}

export default App
