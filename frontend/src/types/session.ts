export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface TranscriptMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  text: string
  timestamp: number
  itemId?: string
}

export interface IceServer {
  urls: string | string[]
  username?: string
  credential?: string
}

export interface ServerMessage {
  type: string
  role?: 'user' | 'assistant'
  transcript?: string
  delta?: string
  data?: string
  itemId?: string
  sessionId?: string
  latencyMs?: number | null
  error?: string
  serverSdp?: string
  iceServers?: IceServer[]
  config?: { avatarEnabled?: boolean; avatarOutputMode?: string }
}
