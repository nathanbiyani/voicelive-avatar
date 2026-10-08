type ChunkHandler = (base64: string) => void

const PROCESSOR = `
class PCM16Processor extends AudioWorkletProcessor {
  constructor(){super();this.size=2400;this.buffer=new Float32Array(this.size);this.offset=0}
  process(inputs){const data=inputs[0]?.[0];if(!data)return true;for(const value of data){this.buffer[this.offset++]=value;if(this.offset===this.size){const pcm=new Int16Array(this.size);for(let i=0;i<this.size;i++){const s=Math.max(-1,Math.min(1,this.buffer[i]));pcm[i]=s<0?s*32768:s*32767}this.port.postMessage(pcm.buffer,[pcm.buffer]);this.buffer=new Float32Array(this.size);this.offset=0}}return true}
}
registerProcessor('pcm16-processor', PCM16Processor)`

function toBase64(buffer: ArrayBuffer) {
  let binary = ''
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export class AudioBridge {
  private captureContext?: AudioContext
  private playbackContext?: AudioContext
  private stream?: MediaStream
  private node?: AudioWorkletNode
  private nextPlaybackTime = 0
  private playbackQueue = Promise.resolve()
  private playbackFailureReported = false

  unlockPlayback(onError: (error: Error) => void) {
    this.playbackContext ??= new AudioContext({ sampleRate: 24000 })
    void this.playbackContext.resume().catch((error: Error) => {
      if (this.playbackFailureReported) return
      this.playbackFailureReported = true
      onError(error)
    })
  }

  async startCapture(
    onChunk: ChunkHandler,
    options: { echoCancellation: boolean; noiseSuppression: boolean },
  ) {
    if (this.stream) return
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 24000,
        echoCancellation: options.echoCancellation,
        noiseSuppression: options.noiseSuppression,
      },
    })
    this.captureContext = new AudioContext({ sampleRate: 24000 })
    const url = URL.createObjectURL(new Blob([PROCESSOR], { type: 'application/javascript' }))
    await this.captureContext.audioWorklet.addModule(url)
    URL.revokeObjectURL(url)
    const source = this.captureContext.createMediaStreamSource(this.stream)
    this.node = new AudioWorkletNode(this.captureContext, 'pcm16-processor')
    this.node.port.onmessage = (event: MessageEvent<ArrayBuffer>) => onChunk(toBase64(event.data))
    source.connect(this.node)
    this.node.connect(this.captureContext.destination)
  }

  play(base64: string, onError: (error: Error) => void) {
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, (value) => value.charCodeAt(0))
    const pcm = new Int16Array(bytes.buffer)
    this.playChannels([Float32Array.from(pcm, (value) => value / 32768)], 24000, onError)
  }

  playChannels(channelData: Float32Array[], sampleRate: number, onError: (error: Error) => void) {
    if (!channelData.length || !channelData[0].length) return
    this.playbackQueue = this.playbackQueue.then(async () => {
      this.playbackContext ??= new AudioContext({ sampleRate })
      if (this.playbackContext.state === 'suspended') await this.playbackContext.resume()
      const buffer = this.playbackContext.createBuffer(channelData.length, channelData[0].length, sampleRate)
      channelData.forEach((channel, index) => buffer.copyToChannel(channel, index))
      const source = this.playbackContext.createBufferSource()
      source.buffer = buffer
      source.connect(this.playbackContext.destination)
      this.nextPlaybackTime = Math.max(this.nextPlaybackTime, this.playbackContext.currentTime)
      source.start(this.nextPlaybackTime)
      this.nextPlaybackTime += buffer.duration
    }).catch((error: Error) => {
      if (this.playbackFailureReported) return
      this.playbackFailureReported = true
      onError(error)
    })
  }

  stopPlayback() {
    void this.playbackContext?.close()
    this.playbackContext = undefined
    this.nextPlaybackTime = 0
    this.playbackQueue = Promise.resolve()
    this.playbackFailureReported = false
  }

  stop() {
    this.node?.disconnect()
    void this.captureContext?.close()
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stopPlayback()
    this.node = undefined
    this.captureContext = undefined
    this.stream = undefined
  }
}
