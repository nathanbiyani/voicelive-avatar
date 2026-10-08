import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioBridge } from '../services/audio'
import { AvatarBridge } from '../services/avatar'
import { composeSessionConfig, validateSession } from '../services/config'
import { composeSceneUpdate, createClientId } from '../services/protocol'
import type { PhotoScene, SessionForm } from '../types/config'
import type { ConnectionStatus, ServerMessage, TranscriptMessage } from '../types/session'

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`

export function useVoiceSession(form: SessionForm) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [messages, setMessages] = useState<TranscriptMessage[]>([])
  const [micEnabled, setMicEnabled] = useState(false)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [sessionId, setSessionId] = useState('')
  const [caption, setCaption] = useState('')
  const [avatarMediaReady, setAvatarMediaReady] = useState(false)
  const socketRef = useRef<WebSocket>()
  const audioRef = useRef(new AudioBridge())
  const avatarRef = useRef(new AvatarBridge())
  const avatarContainerRef = useRef<HTMLDivElement>(null)
  const micRef = useRef(false)
  const connectStartedRef = useRef(0)
  const responseStartedRef = useRef(0)

  const addMessage = useCallback((role: TranscriptMessage['role'], text: string, itemId?: string) => {
    setMessages((current) => [...current, { id: createId(), role, text, timestamp: Date.now(), itemId }])
  }, [])

  const disconnect = useCallback(() => {
    const socket = socketRef.current
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'stop_session' }))
    socket?.close()
    socketRef.current = undefined
    audioRef.current.stop()
    avatarRef.current.stop(avatarContainerRef.current)
    micRef.current = false
    setMicEnabled(false)
    setStatus('disconnected')
    setSessionId('')
    setCaption('')
    setAvatarMediaReady(false)
  }, [])

  useEffect(() => disconnect, [disconnect])

  const updateAssistant = useCallback((text: string, final = false) => {
    setCaption(text)
    setMessages((current) => {
      const last = current[current.length - 1]
      if (last?.role === 'assistant') {
        return current.map((message, index) => index === current.length - 1 ? { ...message, text } : message)
      }
      return [...current, { id: createId(), role: 'assistant', text, timestamp: Date.now() }]
    })
    if (responseStartedRef.current) {
      setLatencyMs(Date.now() - responseStartedRef.current)
      if (final) responseStartedRef.current = 0
    }
  }, [])

  const handleMessage = useCallback(async (message: ServerMessage) => {
    switch (message.type) {
      case 'session_started':
        setStatus('connected')
        setSessionId(message.sessionId ?? '')
        setLatencyMs(Date.now() - connectStartedRef.current)
        addMessage('system', `Session connected${message.sessionId ? ` · ${message.sessionId}` : ''}`)
        try {
          await audioRef.current.startCapture(
            (data) => {
              if (micRef.current && socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({ type: 'audio_chunk', data }))
              }
            },
            {
              echoCancellation: form.useEC,
              noiseSuppression: form.useNS,
            },
          )
          micRef.current = true
          setMicEnabled(true)
        } catch {
          addMessage('system', 'Microphone permission was denied. Text interaction remains available.')
        }
        if (form.avatarEnabled && form.avatarOutputMode === 'websocket' && avatarContainerRef.current) {
          try {
            avatarRef.current.startWebSocketVideo(
              avatarContainerRef.current,
              () => setAvatarMediaReady(true),
              (channelData, sampleRate) => audioRef.current.playChannels(
                channelData,
                sampleRate,
                () => addMessage('system', 'Audio playback was blocked. Check browser site audio permissions and reconnect.'),
              ),
              (error) => addMessage('system', error),
            )
          } catch (error) {
            addMessage('system', (error as Error).message)
          }
        }
        break
      case 'session_error':
        setStatus('error')
        addMessage('system', message.error || 'The session could not be started.')
        break
      case 'session_closed':
        disconnect()
        break
      case 'ice_servers':
        if (form.avatarOutputMode === 'webrtc' && avatarContainerRef.current && message.iceServers) {
          await avatarRef.current.connectWebRtc(
            message.iceServers,
            avatarContainerRef.current,
            (clientSdp) => socketRef.current?.send(JSON.stringify({ type: 'avatar_sdp_offer', clientSdp })),
            () => setAvatarMediaReady(true),
          )
        }
        break
      case 'avatar_sdp_answer':
        if (message.serverSdp) await avatarRef.current.setAnswer(message.serverSdp)
        break
      case 'video_data':
        if (message.delta) avatarRef.current.appendVideo(message.delta)
        break
      case 'audio_data':
        if (
          message.data
          && (!form.avatarEnabled || form.avatarOutputMode !== 'webrtc')
        ) {
          audioRef.current.play(message.data, () => addMessage('system', 'Audio playback was blocked. Check browser site audio permissions and reconnect.'))
        }
        break
      case 'speech_started':
        audioRef.current.stopPlayback()
        addMessage('user', 'Listening…', message.itemId)
        break
      case 'response_created':
        responseStartedRef.current = Date.now()
        if (message.latencyMs !== undefined && message.latencyMs !== null) {
          setLatencyMs(message.latencyMs)
        }
        setCaption('')
        addMessage('assistant', '')
        break
      case 'transcript_delta':
      case 'text_delta':
        if (message.delta) {
          setMessages((current) => {
            const last = current[current.length - 1]
            const next = `${last?.role === 'assistant' ? last.text : ''}${message.delta}`
            setCaption(next)
            return last?.role === 'assistant'
              ? current.map((item, index) => index === current.length - 1 ? { ...item, text: next } : item)
              : [...current, { id: createId(), role: 'assistant', text: next, timestamp: Date.now() }]
          })
          if (responseStartedRef.current) setLatencyMs(Date.now() - responseStartedRef.current)
        }
        break
      case 'transcript_done':
        if (message.role === 'user') {
          setMessages((current) => {
            const index = message.itemId ? current.findIndex((item) => item.itemId === message.itemId) : -1
            if (index < 0) return [...current, { id: createId(), role: 'user', text: message.transcript ?? '', timestamp: Date.now() }]
            return current.map((item, itemIndex) => itemIndex === index ? { ...item, text: message.transcript ?? '' } : item)
          })
        } else if (message.transcript) updateAssistant(message.transcript, true)
        break
      case 'avatar_connecting':
        addMessage('system', 'Avatar media is connecting…')
        break
    }
  }, [addMessage, disconnect, form.avatarEnabled, form.avatarOutputMode, form.useEC, form.useNS, updateAssistant])

  const connect = useCallback(() => {
    const error = validateSession(form)
    if (error) {
      addMessage('system', error)
      setStatus('error')
      return
    }
    audioRef.current.unlockPlayback(() => addMessage('system', 'Audio playback was blocked. Allow sound for this site and reconnect.'))
    setStatus('connecting')
    setAvatarMediaReady(false)
    connectStartedRef.current = Date.now()
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    // Native browser WebSocket construction supplies the required Origin header.
    const clientId = createClientId()
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws/${clientId}`)
    socketRef.current = socket
    socket.onopen = () => socket.send(JSON.stringify({ type: 'start_session', config: composeSessionConfig(form) }))
    socket.onmessage = (event) => void handleMessage(JSON.parse(event.data as string) as ServerMessage)
    socket.onerror = () => {
      setStatus('error')
      addMessage('system', 'WebSocket connection failed.')
    }
    socket.onclose = () => {
      socketRef.current = undefined
      micRef.current = false
      setMicEnabled(false)
      setStatus((current) => current === 'error' ? current : 'disconnected')
    }
  }, [addMessage, form, handleMessage])

  const toggleMic = () => {
    if (status !== 'connected') return
    micRef.current = !micRef.current
    setMicEnabled(micRef.current)
  }

  const sendText = (text: string) => {
    const clean = text.trim()
    if (!clean || socketRef.current?.readyState !== WebSocket.OPEN) return
    addMessage('user', clean)
    socketRef.current.send(JSON.stringify({ type: 'send_text', text: clean }))
  }

  const updateScene = (scene: PhotoScene) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN || !form.isPhotoAvatar) return
    socketRef.current.send(JSON.stringify(composeSceneUpdate(scene)))
  }

  return {
    status,
    messages,
    micEnabled,
    latencyMs,
    sessionId,
    caption,
    avatarContainerRef,
    avatarMediaReady,
    connect,
    disconnect,
    toggleMic,
    sendText,
    updateScene,
    clearMessages: () => setMessages([]),
  }
}
