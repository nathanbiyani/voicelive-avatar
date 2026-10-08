import { useEffect, useRef, useState, type RefObject } from 'react'
import type { ConnectionStatus, TranscriptMessage } from '../types/session'

interface Props {
  status: ConnectionStatus
  messages: TranscriptMessage[]
  developerMode: boolean
  captionsEnabled: boolean
  caption: string
  micEnabled: boolean
  avatarEnabled: boolean
  avatarMediaReady: boolean
  avatarRef: RefObject<HTMLDivElement>
  onToggleMic: () => void
  onSend: (text: string) => void
  onClear: () => void
}

export function ConversationPanel(props: Props) {
  const [text, setText] = useState('')
  const logRef = useRef<HTMLDivElement>(null)
  useEffect(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight }), [props.messages])
  const send = () => {
    if (!text.trim()) return
    props.onSend(text)
    setText('')
  }

  return <section className="conversation" aria-label="Live conversation">
    <div className={`stage ${props.avatarEnabled ? '' : 'audio-only'}`}>
      <div ref={props.avatarRef} className="avatar-stage" aria-label="Avatar video output" />
      {props.avatarEnabled && !props.avatarMediaReady && <div className="avatar-placeholder">
        <strong>{props.status === 'connected' ? 'Connecting avatar video…' : 'Avatar preview'}</strong>
        <span>{props.status === 'connected' ? 'The greeting will begin when WebRTC media is ready.' : 'Start the voice session to load live avatar media.'}</span>
      </div>}
      {!props.avatarEnabled && <div className="voice-orb" aria-hidden="true"><span /><span /><span /><span /></div>}
      <div className="stage-label"><span className={`live-dot ${props.status}`} />{props.status === 'connected' ? (props.micEnabled ? 'Listening' : 'Ready') : props.status}</div>
      {props.captionsEnabled && props.caption && <div className="caption" aria-live="polite">{props.caption}</div>}
    </div>
    {props.developerMode && <div className="transcript" ref={logRef} role="log" aria-label="Developer transcript">
      <div className="transcript-header"><span>Developer transcript</span><button type="button" className="text-button" onClick={props.onClear}>Clear</button></div>
      <div className="message-list">{props.messages.length === 0 ? <p className="empty">Session events and transcripts will appear here.</p> : props.messages.map((message) => <article key={message.id} className={`message ${message.role}`}><div><strong>{message.role}</strong><time>{new Date(message.timestamp).toLocaleTimeString()}</time></div><p>{message.text || '…'}</p></article>)}</div>
    </div>}
    <div className="composer">
      <button type="button" className={`mic-button ${props.micEnabled ? 'active' : ''}`} aria-label={props.micEnabled ? 'Mute microphone' : 'Start speaking'} aria-pressed={props.micEnabled} disabled={props.status !== 'connected'} onClick={props.onToggleMic}>
        <span aria-hidden="true">●</span>{props.micEnabled ? 'Listening' : 'Start speaking'}
      </button>
      <label className="sr-only" htmlFor="message-input">Message</label>
      <input id="message-input" value={text} disabled={props.status !== 'connected'} placeholder="Optional text input…" onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') send() }} />
      <button type="button" className="send-button" disabled={props.status !== 'connected' || !text.trim()} onClick={send}>Send</button>
    </div>
  </section>
}
