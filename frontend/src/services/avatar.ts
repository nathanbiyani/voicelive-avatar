import type { IceServer } from '../types/session'
import { createFile } from 'mp4box'
import { AACDecoder } from '@wasm-audio-decoders/aac'

const AAC_SAMPLE_RATES = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350]

function addAdtsHeader(frame: Uint8Array, sampleRate: number, channelCount: number) {
  const frequencyIndex = AAC_SAMPLE_RATES.indexOf(sampleRate)
  if (frequencyIndex < 0) throw new Error(`Unsupported avatar audio sample rate: ${sampleRate}`)
  const frameLength = frame.length + 7
  const packet = new Uint8Array(frameLength)
  packet.set([
    0xff,
    0xf1,
    (1 << 6) | (frequencyIndex << 2) | (channelCount >> 2),
    ((channelCount & 3) << 6) | (frameLength >> 11),
    (frameLength >> 3) & 0xff,
    ((frameLength & 7) << 5) | 0x1f,
    0xfc,
  ])
  packet.set(frame, 7)
  return packet
}

export class AvatarBridge {
  private peer?: RTCPeerConnection
  private mediaSource?: MediaSource
  private sourceBuffer?: SourceBuffer
  private mp4File?: ReturnType<typeof createFile>
  private aacDecoder?: AACDecoder
  private audioDecodeQueue = Promise.resolve()
  private queue: ArrayBuffer[] = []
  private mediaGeneration = 0
  private onMediaError?: (message: string) => void
  private fileOffset = 0
  private videoCodec = ''
  private mediaOpen = false

  async connectWebRtc(servers: IceServer[], container: HTMLElement, sendOffer: (sdp: string) => void, onVideoReady: () => void) {
    this.stop(container)
    this.peer = new RTCPeerConnection({ iceServers: servers })
    this.peer.ontrack = ({ track, streams }) => {
      const media = document.createElement(track.kind) as HTMLMediaElement
      media.autoplay = true
      media.setAttribute('playsinline', '')
      media.srcObject = streams[0]
      media.className = 'avatar-media'
      if (track.kind === 'video') media.addEventListener('playing', onVideoReady, { once: true })
      container.append(media)
      void media.play()
    }
    this.peer.addTransceiver('video', { direction: 'sendrecv' })
    this.peer.addTransceiver('audio', { direction: 'sendrecv' })
    this.peer.createDataChannel('eventChannel')
    const offer = await this.peer.createOffer()
    await this.peer.setLocalDescription(offer)
    if (this.peer.iceGatheringState !== 'complete') {
      await new Promise<void>((resolve) => {
        const finish = () => {
          window.clearTimeout(timeout)
          if (this.peer) this.peer.onicegatheringstatechange = null
          resolve()
        }
        const timeout = window.setTimeout(finish, 10000)
        this.peer!.onicegatheringstatechange = () => {
          if (this.peer?.iceGatheringState === 'complete') {
            finish()
          }
        }
      })
    }
    const localDescription = this.peer.localDescription
    if (!localDescription?.sdp || !/a=candidate:/m.test(localDescription.sdp)) {
      throw new Error('Avatar WebRTC could not gather an ICE candidate.')
    }
    sendOffer(btoa(JSON.stringify(localDescription)))
  }

  async setAnswer(encoded: string) {
    if (this.peer) await this.peer.setRemoteDescription(JSON.parse(atob(encoded)) as RTCSessionDescriptionInit)
  }

  startWebSocketVideo(
    container: HTMLElement,
    onVideoReady: () => void,
    onAudio: (channelData: Float32Array[], sampleRate: number) => void,
    onError: (message: string) => void,
  ) {
    this.stop(container)
    const generation = this.mediaGeneration
    const video = document.createElement('video')
    video.autoplay = true
    video.playsInline = true
    video.className = 'avatar-media'
    video.addEventListener('playing', onVideoReady, { once: true })
    video.addEventListener('error', () => onError(video.error?.message ?? 'Avatar video playback failed.'), { once: true })
    this.onMediaError = onError
    this.mediaSource = new MediaSource()
    this.mp4File = createFile()
    this.aacDecoder = new AACDecoder()
    this.mp4File.onError = (error: string) => onError(`Avatar video demuxing failed: ${error}`)
    this.mp4File.onSegment = (_id: number, _user: unknown, buffer: ArrayBuffer) => {
      if (generation !== this.mediaGeneration) return
      this.queue.push(buffer)
      this.flush()
    }
    this.mp4File.onReady = (info) => {
      if (generation !== this.mediaGeneration || !this.mp4File) return
      const videoTrack = info.videoTracks[0]
      if (!videoTrack) {
        onError('Avatar stream did not contain a video track.')
        return
      }
      this.videoCodec = videoTrack.codec
      this.ensureVideoSourceBuffer()
      this.mp4File.setSegmentOptions(videoTrack.id, null, { nbSamples: 20, rapAlignement: false })
      const audioTrack = info.audioTracks[0]
      if (audioTrack) {
        this.mp4File.setExtractionOptions(audioTrack.id, null, { nbSamples: 20 })
        this.mp4File.onSamples = (_id, _user, samples) => {
          if (generation !== this.mediaGeneration || !this.aacDecoder) return
          const frames = samples.map((sample) => addAdtsHeader(
            sample.data,
            audioTrack.audio.sample_rate,
            audioTrack.audio.channel_count,
          ))
          this.audioDecodeQueue = this.audioDecodeQueue.then(async () => {
            await this.aacDecoder!.ready
            const decoded = await this.aacDecoder!.decodeFrames(frames)
            if (generation === this.mediaGeneration && decoded.samplesDecoded) {
              onAudio(decoded.channelData, decoded.sampleRate)
            }
          }).catch((error: Error) => {
            if (generation === this.mediaGeneration) onError(`Avatar audio decoding failed: ${error.message}`)
          })
        }
      }
      for (const segment of this.mp4File.initializeSegmentation('per-track')) {
        this.queue.push(segment.buffer)
      }
      this.mp4File.start()
      this.flush()
    }
    video.src = URL.createObjectURL(this.mediaSource)
    this.mediaSource.addEventListener('sourceopen', () => {
      if (generation !== this.mediaGeneration || !this.mediaSource) return
      this.mediaOpen = true
      this.ensureVideoSourceBuffer()
    })
    container.append(video)
  }

  appendVideo(encoded: string) {
    if (!this.mp4File) return
    const binary = atob(encoded)
    const buffer = Uint8Array.from(binary, (value) => value.charCodeAt(0)).buffer as ArrayBuffer & { fileStart: number }
    buffer.fileStart = this.fileOffset
    this.fileOffset += buffer.byteLength
    this.mp4File.appendBuffer(buffer)
  }

  private ensureVideoSourceBuffer() {
    if (this.sourceBuffer || !this.mediaSource || !this.mediaOpen || !this.videoCodec) return
    const mime = `video/mp4; codecs="${this.videoCodec}"`
    if (!MediaSource.isTypeSupported(mime)) {
      this.onMediaError?.(`Avatar video codec is not supported by this browser (${this.videoCodec}).`)
      return
    }
    this.sourceBuffer = this.mediaSource.addSourceBuffer(mime)
    this.sourceBuffer.addEventListener('updateend', () => this.flush())
    this.sourceBuffer.addEventListener('error', () => this.onMediaError?.('Avatar video stream could not be decoded.'), { once: true })
    this.flush()
  }

  private flush() {
    if (!this.sourceBuffer || !this.mediaSource || this.mediaSource.readyState !== 'open' || this.sourceBuffer.updating || !this.queue.length) return
    try {
      this.sourceBuffer.appendBuffer(this.queue.shift()!)
    } catch (error) {
      this.queue = []
      this.onMediaError?.(`Avatar video playback failed: ${(error as DOMException).message}`)
    }
  }

  stop(container?: HTMLElement | null) {
    this.mediaGeneration += 1
    this.peer?.close()
    this.peer = undefined
    this.sourceBuffer = undefined
    this.mediaSource = undefined
    this.mp4File?.stop()
    this.mp4File = undefined
    this.aacDecoder?.free()
    this.aacDecoder = undefined
    this.audioDecodeQueue = Promise.resolve()
    this.onMediaError = undefined
    this.fileOffset = 0
    this.videoCodec = ''
    this.mediaOpen = false
    this.queue = []
    if (container) container.replaceChildren()
  }
}
