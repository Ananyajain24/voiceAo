// src/streaming/audio.egress.ts

type AudioFrame = {
  samples: Int16Array
  sampleRate: number
  channels: number
  timestamp: number
}

export class AudioEgress {
  private lastFrameTime = 0
  private publishing = false

  publishAudio(frame: AudioFrame) {
    // 1️⃣ Validate format
    if (!this.isValid(frame)) {
      return
    }

    // 2️⃣ Enforce monotonic timing
    if (frame.timestamp <= this.lastFrameTime) {
      return
    }

    // 3️⃣ Prevent overlap
    if (this.publishing) {
      return
    }

    this.publishing = true
    this.lastFrameTime = frame.timestamp

    try {
      // Phase 6: simulate publish
      // Phase 7+: real LiveKit track publish
      console.log("[AUDIO_OUT]", {
        samples: frame.samples.length,
        sampleRate: frame.sampleRate,
        channels: frame.channels,
      })
    } finally {
      this.publishing = false
    }
  }

  private isValid(frame: AudioFrame): boolean {
    if (frame.channels !== 1) return false
    if (frame.sampleRate !== 16000 && frame.sampleRate !== 48000) return false
    if (frame.samples.length === 0) return false
    return true
  }
}
