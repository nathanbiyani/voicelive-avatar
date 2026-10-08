declare module 'mp4box' {
  interface MP4Track {
    id: number
    codec: string
    audio: {
      sample_rate: number
      channel_count: number
    }
  }

  interface MP4Info {
    videoTracks: MP4Track[]
    audioTracks: MP4Track[]
  }

  interface MP4Segment {
    buffer: ArrayBuffer
  }

  interface MP4Sample {
    data: Uint8Array
  }

  interface MP4File {
    onError?: (error: string) => void
    onReady?: (info: MP4Info) => void
    onSegment?: (id: number, user: unknown, buffer: ArrayBuffer, sampleNumber: number, last: boolean) => void
    onSamples?: (id: number, user: unknown, samples: MP4Sample[]) => void
    appendBuffer(buffer: ArrayBuffer & { fileStart: number }): number
    setSegmentOptions(id: number, user: unknown, options: { nbSamples: number; rapAlignement: boolean }): void
    setExtractionOptions(id: number, user: unknown, options: { nbSamples: number }): void
    initializeSegmentation(mode?: 'combined' | 'per-track'): MP4Segment[]
    start(): void
    stop(): void
  }

  export function createFile(): MP4File
}
