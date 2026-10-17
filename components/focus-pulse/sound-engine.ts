export type SynthKind = 'lofi' | 'rain' | 'brown'

export function createAudioContext() {
  const AudioCtx =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  return AudioCtx ? new AudioCtx() : null
}

export function playChime(ctx: AudioContext) {
  const notes = [880, 1174.66, 1567.98]
  ;[0, 1.1].forEach((offset) => {
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = ctx.currentTime + offset + i * 0.18
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.25, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.9)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 1)
    })
  })
}

export function playClick(ctx: AudioContext, kind: 'start' | 'pause' | 'reset') {
  const freqs = { start: [523.25, 783.99], pause: [659.25, 440], reset: [392, 392] }[kind]
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = freq
    const start = ctx.currentTime + i * 0.07
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.12, start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.2)
  })
}

const bufferCache = new WeakMap<AudioContext, Map<string, AudioBuffer>>()

function noiseBuffer(ctx: AudioContext, type: 'white' | 'pink' | 'brown' | 'crackle') {
  let cache = bufferCache.get(ctx)
  if (!cache) {
    cache = new Map()
    bufferCache.set(ctx, cache)
  }
  const cached = cache.get(type)
  if (cached) return cached

  const length = ctx.sampleRate * 4
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let b0 = 0
  let b1 = 0
  let b2 = 0
  let last = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    if (type === 'white') data[i] = white
    else if (type === 'pink') {
      b0 = 0.99765 * b0 + white * 0.099046
      b1 = 0.963 * b1 + white * 0.2965164
      b2 = 0.57 * b2 + white * 1.0526913
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.2
    } else if (type === 'brown') {
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    } else {
      data[i] = Math.random() < 0.0004 ? white * 0.8 : data[i - 1] ? data[i - 1] * 0.6 : 0
    }
  }
  cache.set(type, buffer)
  return buffer
}

function loopSource(ctx: AudioContext, type: Parameters<typeof noiseBuffer>[1]) {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, type)
  src.loop = true
  return src
}

function noiseHit(ctx: AudioContext, out: AudioNode, time: number, filter: BiquadFilterType, freq: number, level: number, decay: number) {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, 'white')
  const f = ctx.createBiquadFilter()
  f.type = filter
  f.frequency.value = freq
  const g = ctx.createGain()
  g.gain.setValueAtTime(level, time)
  g.gain.exponentialRampToValueAtTime(0.001, time + decay)
  src.connect(f).connect(g).connect(out)
  src.start(time, Math.random() * 3)
  src.stop(time + decay + 0.05)
}

function kick(ctx: AudioContext, out: AudioNode, time: number) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.frequency.setValueAtTime(110, time)
  osc.frequency.exponentialRampToValueAtTime(42, time + 0.18)
  g.gain.setValueAtTime(0.55, time)
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.4)
  osc.connect(g).connect(out)
  osc.start(time)
  osc.stop(time + 0.45)
}

function pad(ctx: AudioContext, out: AudioNode, notes: number[], time: number, length: number) {
  notes.forEach((freq) => {
    ;[
      ['triangle', 0] as const,
      ['sine', 6] as const,
    ].forEach(([type, detune]) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = type
      osc.frequency.value = freq
      osc.detune.value = detune
      g.gain.setValueAtTime(0, time)
      g.gain.linearRampToValueAtTime(0.035, time + 0.4)
      g.gain.setValueAtTime(0.035, time + length - 0.6)
      g.gain.linearRampToValueAtTime(0, time + length)
      osc.connect(g).connect(out)
      osc.start(time)
      osc.stop(time + length + 0.05)
    })
  })
}

function pluck(ctx: AudioContext, out: AudioNode, freq: number, time: number) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  g.gain.setValueAtTime(0, time)
  g.gain.linearRampToValueAtTime(0.09, time + 0.01)
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.9)
  osc.connect(g).connect(out)
  osc.start(time)
  osc.stop(time + 1)
}

const LOFI_CHORDS = [
  [261.63, 329.63, 392.0, 493.88],
  [220.0, 261.63, 329.63, 392.0],
  [174.61, 220.0, 261.63, 329.63],
  [196.0, 246.94, 293.66, 349.23],
]
const LOFI_MELODY = [523.25, 587.33, 659.25, 783.99, 880.0]

function startLofi(ctx: AudioContext, out: AudioNode) {
  const tone = ctx.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.value = 1600
  tone.connect(out)

  const hiss = loopSource(ctx, 'pink')
  const hissGain = ctx.createGain()
  hissGain.gain.value = 0.02
  hiss.connect(hissGain).connect(out)
  hiss.start()

  const crackle = loopSource(ctx, 'crackle')
  const crackleGain = ctx.createGain()
  crackleGain.gain.value = 0.25
  crackle.connect(crackleGain).connect(out)
  crackle.start()

  const eighth = 60 / 72 / 2
  let nextTime = ctx.currentTime + 0.1
  let step = 0

  const schedule = () => {
    while (nextTime < ctx.currentTime + 0.4) {
      const pos = step % 8
      const bar = Math.floor(step / 8)
      const swing = pos % 2 === 1 ? eighth * 0.16 : 0
      const t = nextTime + swing
      if (pos === 0) pad(ctx, tone, LOFI_CHORDS[bar % LOFI_CHORDS.length], t, eighth * 8)
      if (pos === 0 || pos === 5) kick(ctx, tone, t)
      if (pos === 2 || pos === 6) noiseHit(ctx, tone, t, 'bandpass', 1800, 0.18, 0.2)
      if (pos % 2 === 1) noiseHit(ctx, out, t, 'highpass', 7000, 0.035, 0.05)
      if ((pos === 3 || pos === 7) && Math.random() < 0.45) {
        pluck(ctx, tone, LOFI_MELODY[Math.floor(Math.random() * LOFI_MELODY.length)], t)
      }
      nextTime += eighth
      step++
    }
  }
  schedule()
  const id = window.setInterval(schedule, 100)

  return () => {
    window.clearInterval(id)
    hiss.stop(ctx.currentTime + 0.6)
    crackle.stop(ctx.currentTime + 0.6)
  }
}

function startRain(ctx: AudioContext, out: AudioNode) {
  // Soothing, gentle rainfall calibrated at a comfortable lower sound level:
  // Warm low-pass filter eliminates harsh hiss while maintaining distinct, relaxing rain presence
  const src = loopSource(ctx, 'pink')
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 950 // warm, cozy rain frequency
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 160
  const g = ctx.createGain()
  g.gain.value = 0.22 // Pleasant, audible yet soft base rainfall

  const lfo = ctx.createOscillator()
  const lfoDepth = ctx.createGain()
  lfo.frequency.value = 0.08
  lfoDepth.gain.value = 180
  lfo.connect(lfoDepth).connect(lp.frequency)
  src.connect(hp).connect(lp).connect(g).connect(out)

  // Soft, delicate raindrops for realistic texture
  const drops = loopSource(ctx, 'crackle')
  const dropFilter = ctx.createBiquadFilter()
  dropFilter.type = 'bandpass'
  dropFilter.frequency.value = 1600
  const dropGain = ctx.createGain()
  dropGain.gain.value = 0.035 // distinct, gentle raindrop patter
  drops.connect(dropFilter).connect(dropGain).connect(out)

  src.start()
  drops.start()
  lfo.start()
  return () => {
    const t = ctx.currentTime + 0.6
    src.stop(t)
    drops.stop(t)
    lfo.stop(t)
  }
}

function startBrown(ctx: AudioContext, out: AudioNode) {
  const src = loopSource(ctx, 'brown')
  const g = ctx.createGain()
  g.gain.value = 0.8
  src.connect(g).connect(out)
  src.start()
  return () => src.stop(ctx.currentTime + 0.6)
}

export function startSynth(ctx: AudioContext, kind: SynthKind, out: AudioNode) {
  if (kind === 'lofi') return startLofi(ctx, out)
  if (kind === 'rain') return startRain(ctx, out)
  return startBrown(ctx, out)
}

export function startTapeDust(ctx: AudioContext, out: AudioNode, level = 0.02) {
  const crackle = loopSource(ctx, 'crackle')
  const g = ctx.createGain()
  g.gain.value = level
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 2500
  crackle.connect(filter).connect(g).connect(out)
  crackle.start()
  return () => {
    crackle.stop(ctx.currentTime + 0.3)
  }
}

export function createLofiVoiceChain(
  ctx: AudioContext,
  sourceNode: AudioNode,
  destNode: AudioNode,
  options: { warmth?: boolean; tapeRollOff?: boolean } = { warmth: true, tapeRollOff: true }
) {
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = options.tapeRollOff ? 3600 : 8000
  lp.Q.value = 0.85

  const peak = ctx.createBiquadFilter()
  peak.type = 'peaking'
  peak.frequency.value = 260
  peak.gain.value = options.warmth ? 3.5 : 0
  peak.Q.value = 0.9

  const hs = ctx.createBiquadFilter()
  hs.type = 'highshelf'
  hs.frequency.value = 5200
  hs.gain.value = options.tapeRollOff ? -6 : 0

  sourceNode.connect(peak)
  peak.connect(lp)
  lp.connect(hs)
  hs.connect(destNode)

  return {
    setWarmth: (w: boolean) => {
      peak.gain.setTargetAtTime(w ? 3.5 : 0, ctx.currentTime, 0.05)
    },
    setTapeRollOff: (r: boolean) => {
      lp.frequency.setTargetAtTime(r ? 3600 : 8000, ctx.currentTime, 0.05)
      hs.gain.setTargetAtTime(r ? -6 : 0, ctx.currentTime, 0.05)
    },
    disconnect: () => {
      try {
        sourceNode.disconnect()
        peak.disconnect()
        lp.disconnect()
        hs.disconnect()
      } catch {}
    },
  }
}

