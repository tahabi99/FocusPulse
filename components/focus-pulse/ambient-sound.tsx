'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BellRing,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudRain,
  FastForward,
  Headphones,
  Info,
  ListFilter,
  Loader2,
  Maximize2,
  Mic,
  Music,
  Pause,
  Play,
  Rewind,
  RotateCcw,
  Search,
  Sliders,
  Sparkles,
  Volume1,
  Volume2,
  VolumeX,
  Waves,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  createAudioContext,
  createLofiVoiceChain,
  startSynth,
  startTapeDust,
  type SynthKind,
} from './sound-engine'

export type AmbientKind = 'off' | SynthKind | 'lofi_voice' | 'quran_rain' | 'quran'

export type SurahInfo = {
  id: string
  name: string
  english: string
  ayahs: number
}

// Complete catalog of all 114 Surahs of the Holy Quran
export const SURAHS: SurahInfo[] = [
  { id: '001', name: 'Al-Fatihah', english: 'The Opening', ayahs: 7 },
  { id: '002', name: 'Al-Baqarah', english: 'The Cow', ayahs: 286 },
  { id: '003', name: "Ali 'Imran", english: 'Family of Imran', ayahs: 200 },
  { id: '004', name: "An-Nisa'", english: 'The Women', ayahs: 176 },
  { id: '005', name: "Al-Ma'idah", english: 'The Table Spread', ayahs: 120 },
  { id: '006', name: "Al-An'am", english: 'The Cattle', ayahs: 165 },
  { id: '007', name: "Al-A'raf", english: 'The Heights', ayahs: 206 },
  { id: '008', name: 'Al-Anfal', english: 'The Spoils of War', ayahs: 75 },
  { id: '009', name: 'At-Tawbah', english: 'The Repentance', ayahs: 129 },
  { id: '010', name: 'Yunus', english: 'Jonah', ayahs: 109 },
  { id: '011', name: 'Hud', english: 'Hud', ayahs: 123 },
  { id: '012', name: 'Yusuf', english: 'Joseph', ayahs: 111 },
  { id: '013', name: "Ar-Ra'd", english: 'The Thunder', ayahs: 43 },
  { id: '014', name: 'Ibrahim', english: 'Abraham', ayahs: 52 },
  { id: '015', name: 'Al-Hijr', english: 'The Rocky Tract', ayahs: 99 },
  { id: '016', name: 'An-Nahl', english: 'The Bee', ayahs: 128 },
  { id: '017', name: 'Al-Isra', english: 'The Night Journey', ayahs: 111 },
  { id: '018', name: 'Al-Kahf', english: 'The Cave', ayahs: 110 },
  { id: '019', name: 'Maryam', english: 'Mary', ayahs: 98 },
  { id: '020', name: 'Ta-Ha', english: 'Ta-Ha', ayahs: 135 },
  { id: '021', name: 'Al-Anbiya', english: 'The Prophets', ayahs: 112 },
  { id: '022', name: 'Al-Hajj', english: 'The Pilgrimage', ayahs: 78 },
  { id: '023', name: "Al-Mu'minun", english: 'The Believers', ayahs: 118 },
  { id: '024', name: 'An-Nur', english: 'The Light', ayahs: 64 },
  { id: '025', name: 'Al-Furqan', english: 'The Criterion', ayahs: 77 },
  { id: '026', name: "Ash-Shu'ara", english: 'The Poets', ayahs: 227 },
  { id: '027', name: 'An-Naml', english: 'The Ant', ayahs: 93 },
  { id: '028', name: 'Al-Qasas', english: 'The Stories', ayahs: 88 },
  { id: '029', name: "Al-'Ankabut", english: 'The Spider', ayahs: 69 },
  { id: '030', name: 'Ar-Rum', english: 'The Romans', ayahs: 60 },
  { id: '031', name: 'Luqman', english: 'Luqman', ayahs: 34 },
  { id: '032', name: 'As-Sajdah', english: 'The Prostration', ayahs: 30 },
  { id: '033', name: 'Al-Ahzab', english: 'The Combined Forces', ayahs: 73 },
  { id: '034', name: 'Saba', english: 'Sheba', ayahs: 54 },
  { id: '035', name: 'Fatir', english: 'Originator', ayahs: 45 },
  { id: '036', name: 'Ya-Sin', english: 'Ya-Sin', ayahs: 83 },
  { id: '037', name: 'As-Saffat', english: 'Those Who Set The Ranks', ayahs: 182 },
  { id: '038', name: 'Sad', english: 'The Letter Sad', ayahs: 88 },
  { id: '039', name: 'Az-Zumar', english: 'The Troops', ayahs: 75 },
  { id: '040', name: 'Ghafir', english: 'The Forgiver', ayahs: 85 },
  { id: '041', name: 'Fussilat', english: 'Explained in Detail', ayahs: 54 },
  { id: '042', name: 'Ash-Shura', english: 'The Consultation', ayahs: 53 },
  { id: '043', name: 'Az-Zukhruf', english: 'The Ornaments of Gold', ayahs: 89 },
  { id: '044', name: 'Ad-Dukhan', english: 'The Smoke', ayahs: 59 },
  { id: '045', name: 'Al-Jathiyah', english: 'The Crouching', ayahs: 37 },
  { id: '046', name: 'Al-Ahqaf', english: 'The Wind-Curved Sandhills', ayahs: 35 },
  { id: '047', name: 'Muhammad', english: 'Muhammad', ayahs: 38 },
  { id: '048', name: 'Al-Fath', english: 'The Victory', ayahs: 29 },
  { id: '049', name: 'Al-Hujurat', english: 'The Rooms', ayahs: 18 },
  { id: '050', name: 'Qaf', english: 'The Letter Qaf', ayahs: 45 },
  { id: '051', name: 'Adh-Dhariyat', english: 'The Winnowing Winds', ayahs: 60 },
  { id: '052', name: 'At-Tur', english: 'The Mount', ayahs: 49 },
  { id: '053', name: 'An-Najm', english: 'The Star', ayahs: 62 },
  { id: '054', name: 'Al-Qamar', english: 'The Moon', ayahs: 55 },
  { id: '055', name: 'Ar-Rahman', english: 'The Beneficent', ayahs: 78 },
  { id: '056', name: "Al-Waqi'ah", english: 'The Inevitable', ayahs: 96 },
  { id: '057', name: 'Al-Hadid', english: 'The Iron', ayahs: 29 },
  { id: '058', name: 'Al-Mujadila', english: 'The Pleading Woman', ayahs: 22 },
  { id: '059', name: 'Al-Hashr', english: 'The Exile', ayahs: 24 },
  { id: '060', name: 'Al-Mumtahanah', english: 'She That Is To Be Examined', ayahs: 13 },
  { id: '061', name: 'As-Saff', english: 'The Ranks', ayahs: 14 },
  { id: '062', name: "Al-Jumu'ah", english: 'Friday', ayahs: 11 },
  { id: '063', name: 'Al-Munafiqun', english: 'The Hypocrites', ayahs: 11 },
  { id: '064', name: 'At-Taghabun', english: 'Mutual Disillusion', ayahs: 18 },
  { id: '065', name: 'At-Talaq', english: 'Divorce', ayahs: 12 },
  { id: '066', name: 'At-Tahrim', english: 'The Prohibition', ayahs: 12 },
  { id: '067', name: 'Al-Mulk', english: 'The Sovereignty', ayahs: 30 },
  { id: '068', name: 'Al-Qalam', english: 'The Pen', ayahs: 52 },
  { id: '069', name: 'Al-Haqqah', english: 'The Inevitable Reality', ayahs: 52 },
  { id: '070', name: "Al-Ma'arij", english: 'The Ascending Stairways', ayahs: 44 },
  { id: '071', name: 'Nuh', english: 'Noah', ayahs: 28 },
  { id: '072', name: 'Al-Jinn', english: 'The Jinn', ayahs: 28 },
  { id: '073', name: 'Al-Muzzammil', english: 'The Enshrouded One', ayahs: 20 },
  { id: '074', name: 'Al-Muddaththir', english: 'The Cloaked One', ayahs: 56 },
  { id: '075', name: 'Al-Qiyamah', english: 'The Resurrection', ayahs: 40 },
  { id: '076', name: 'Al-Insan', english: 'Humanity', ayahs: 31 },
  { id: '077', name: 'Al-Mursalat', english: 'The Emissaries', ayahs: 50 },
  { id: '078', name: 'An-Naba', english: 'The Tidings', ayahs: 40 },
  { id: '079', name: "An-Nazi'at", english: 'Those Who Drag Forth', ayahs: 46 },
  { id: '080', name: "'Abasa", english: 'He Frowned', ayahs: 42 },
  { id: '081', name: 'At-Takwir', english: 'The Overthrowing', ayahs: 29 },
  { id: '082', name: 'Al-Infitar', english: 'The Cleaving', ayahs: 19 },
  { id: '083', name: 'Al-Mutaffifin', english: 'The Defrauding', ayahs: 36 },
  { id: '084', name: 'Al-Inshiqaq', english: 'The Splitting Asunder', ayahs: 25 },
  { id: '085', name: 'Al-Buruj', english: 'The Mansions of the Stars', ayahs: 22 },
  { id: '086', name: 'At-Tariq', english: 'The Nightcomer', ayahs: 17 },
  { id: '087', name: "Al-A'la", english: 'The Most High', ayahs: 19 },
  { id: '088', name: 'Al-Ghashiyah', english: 'The Overwhelming', ayahs: 26 },
  { id: '089', name: 'Al-Fajr', english: 'The Dawn', ayahs: 30 },
  { id: '090', name: 'Al-Balad', english: 'The City', ayahs: 20 },
  { id: '091', name: 'Ash-Shams', english: 'The Sun', ayahs: 15 },
  { id: '092', name: 'Al-Layl', english: 'The Night', ayahs: 21 },
  { id: '093', name: 'Ad-Duha', english: 'The Morning Hours', ayahs: 11 },
  { id: '094', name: 'Ash-Sharh', english: 'The Relief', ayahs: 8 },
  { id: '095', name: 'At-Tin', english: 'The Fig', ayahs: 8 },
  { id: '096', name: "Al-'Alaq", english: 'The Clot', ayahs: 19 },
  { id: '097', name: 'Al-Qadr', english: 'The Power', ayahs: 5 },
  { id: '098', name: 'Al-Bayyinah', english: 'The Clear Proof', ayahs: 8 },
  { id: '099', name: 'Az-Zalzalah', english: 'The Earthquake', ayahs: 8 },
  { id: '100', name: "Al-'Adiyat", english: 'The Courser', ayahs: 11 },
  { id: '101', name: "Al-Qari'ah", english: 'The Calamity', ayahs: 11 },
  { id: '102', name: 'At-Takathur', english: 'The Rivalry in World Increase', ayahs: 8 },
  { id: '103', name: "Al-'Asr", english: 'The Declining Day', ayahs: 3 },
  { id: '104', name: 'Al-Humazah', english: 'The Traducer', ayahs: 9 },
  { id: '105', name: 'Al-Fil', english: 'The Elephant', ayahs: 5 },
  { id: '106', name: 'Quraysh', english: 'Quraysh', ayahs: 4 },
  { id: '107', name: "Al-Ma'un", english: 'Small Kindnesses', ayahs: 7 },
  { id: '108', name: 'Al-Kawthar', english: 'Abundance', ayahs: 3 },
  { id: '109', name: 'Al-Kafirun', english: 'The Disbelievers', ayahs: 6 },
  { id: '110', name: 'An-Nasr', english: 'Divine Support', ayahs: 3 },
  { id: '111', name: 'Al-Masad', english: 'The Palm Fiber', ayahs: 5 },
  { id: '112', name: 'Al-Ikhlas', english: 'The Sincerity', ayahs: 4 },
  { id: '113', name: 'Al-Falaq', english: 'The Daybreak', ayahs: 5 },
  { id: '114', name: 'An-Nas', english: 'Mankind', ayahs: 6 },
]

export const POPULAR_SURAHS = ['001', '002', '018', '036', '055', '056', '067', '112', '113', '114']

export const getSurahAudioUrl = (id: string) => `https://cdn.mp3quran.net/audio/mishary-alafasy/r1/${id}.mp3`

export type Status = 'idle' | 'loading' | 'playing' | 'error'

export interface AmbientHookResult {
  status: Status
  currentTime: number
  duration: number
  seek: (seconds: number) => void
  playbackSpeed: number
  setPlaybackSpeed: (speed: number) => void
  tapeWarmth: boolean
  setTapeWarmth: (w: boolean) => void
  analogTapeDust: boolean
  setAnalogTapeDust: (d: boolean) => void
  rainVolume: number
  setRainVolume: (v: number) => void
}

export function useAmbientSound({
  kind,
  surah,
  withRain = true,
  volume,
  active,
  getContext,
  onAutoAdvance,
  initialRainVolume = 0.20,
}: {
  kind: AmbientKind
  surah: string
  withRain?: boolean
  volume: number
  active: boolean
  getContext: () => AudioContext | null
  onAutoAdvance?: () => void
  initialRainVolume?: number
}): AmbientHookResult {
  const [status, setStatus] = useState<Status>('idle')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
  const [tapeWarmth, setTapeWarmth] = useState(true)
  const [analogTapeDust, setAnalogTapeDust] = useState(true)
  const [rainVolume, setRainVolume] = useState<number>(initialRainVolume)

  const synthMasterRef = useRef<GainNode | null>(null)
  const rainMasterRef = useRef<GainNode | null>(null)
  const quranAudioRef = useRef<HTMLAudioElement | null>(null)
  const volumeRef = useRef(volume)
  volumeRef.current = volume
  const rainVolumeRef = useRef(rainVolume)
  rainVolumeRef.current = rainVolume
  const getContextRef = useRef(getContext)
  getContextRef.current = getContext

  const lofiChainRef = useRef<ReturnType<typeof createLofiVoiceChain> | null>(null)
  const tapeDustStopRef = useRef<(() => void) | null>(null)
  const isSourceConnectedRef = useRef(false)
  const onAutoAdvanceRef = useRef(onAutoAdvance)
  onAutoAdvanceRef.current = onAutoAdvance

  const isQuranMode = kind === 'lofi_voice' || kind === 'quran_rain' || kind === 'quran'
  const isLofiVoice = kind === 'lofi_voice'
  const effectiveRain = kind === 'quran_rain' || (isQuranMode && withRain)

  // Manage Audio element creation once
  useEffect(() => {
    if (!quranAudioRef.current && typeof window !== 'undefined') {
      const audio = new Audio()
      audio.crossOrigin = 'anonymous'
      audio.preload = 'metadata'
      quranAudioRef.current = audio
    }
  }, [])

  // Time & metadata listeners
  useEffect(() => {
    const audio = quranAudioRef.current
    if (!audio) return

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0)
      setStatus('playing')
    }
    const onWaiting = () => setStatus('loading')
    const onPlaying = () => setStatus('playing')
    const onError = () => setStatus('error')
    const onEnded = () => {
      setStatus('idle')
      if (onAutoAdvanceRef.current) {
        onAutoAdvanceRef.current()
      }
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('error', onError)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('playing', onPlaying)
      audio.removeEventListener('error', onError)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  // Sync playback speed
  useEffect(() => {
    if (quranAudioRef.current) {
      quranAudioRef.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

  // Main playback lifecycle
  useEffect(() => {
    if (!active || kind === 'off') {
      setStatus('idle')
      if (quranAudioRef.current) {
        quranAudioRef.current.pause()
      }
      if (tapeDustStopRef.current) {
        tapeDustStopRef.current()
        tapeDustStopRef.current = null
      }
      return
    }

    // 1. Quran Recitation Modes (Lo-Fi Voice, Quran+Rain, Pure Quran)
    if (isQuranMode) {
      const audio = quranAudioRef.current
      if (!audio) return

      const src = getSurahAudioUrl(surah)
      if (audio.src !== src) {
        audio.src = src
        audio.load()
      }
      audio.volume = volumeRef.current
      audio.playbackRate = playbackSpeed

      const ctx = getContextRef.current()
      if (ctx) {
        void ctx.resume()
      }

      // Connect Web Audio chain for Lo-Fi acoustic voice filters
      if (ctx && isLofiVoice && !isSourceConnectedRef.current) {
        try {
          const source = ctx.createMediaElementSource(audio)
          const masterGain = ctx.createGain()
          masterGain.gain.value = volumeRef.current
          masterGain.connect(ctx.destination)

          const chain = createLofiVoiceChain(ctx, source, masterGain, {
            warmth: tapeWarmth,
            tapeRollOff: tapeWarmth,
          })
          lofiChainRef.current = chain
          isSourceConnectedRef.current = true
        } catch {
          // Native audio element fallback
        }
      }

      // Start Tape Dust crackle if in Lo-Fi Voice mode
      if (ctx && isLofiVoice && analogTapeDust) {
        if (!tapeDustStopRef.current) {
          tapeDustStopRef.current = startTapeDust(ctx, ctx.destination, 0.015)
        }
      } else if (tapeDustStopRef.current) {
        tapeDustStopRef.current()
        tapeDustStopRef.current = null
      }

      // Start Procedural Rain if requested (gentle, lesser rain blend)
      let rainStop: (() => void) | null = null
      let rainMaster: GainNode | null = null

      if (effectiveRain && ctx) {
        rainMaster = ctx.createGain()
        rainMaster.gain.setValueAtTime(0, ctx.currentTime)
        // Calibrated gentle background rainfall: audible and soothing, perfectly balanced under voice
        const gentleRainGain = volumeRef.current * (rainVolumeRef.current ?? 0.20)
        rainMaster.gain.linearRampToValueAtTime(gentleRainGain, ctx.currentTime + 1.2)
        rainMaster.connect(ctx.destination)
        rainMasterRef.current = rainMaster
        rainStop = startSynth(ctx, 'rain', rainMaster)
      }

      setStatus('loading')
      audio.play().catch(() => setStatus('error'))

      return () => {
        audio.pause()
        if (rainMaster && rainStop) {
          const rainCtx = rainMaster.context
          rainMasterRef.current = null
          rainMaster.gain.cancelScheduledValues(rainCtx.currentTime)
          rainMaster.gain.setValueAtTime(rainMaster.gain.value, rainCtx.currentTime)
          rainMaster.gain.linearRampToValueAtTime(0, rainCtx.currentTime + 0.4)
          rainStop()
          window.setTimeout(() => rainMaster?.disconnect(), 500)
        }
        if (tapeDustStopRef.current) {
          tapeDustStopRef.current()
          tapeDustStopRef.current = null
        }
      }
    }

    // 2. Synthesizer sounds (lofi beats, rain, brown noise)
    const ctx = getContextRef.current()
    if (!ctx) {
      setStatus('error')
      return
    }
    void ctx.resume()
    const master = ctx.createGain()
    master.gain.setValueAtTime(0, ctx.currentTime)
    // Standalone rain preset calibrated at a comfortable, soothing lower volume (0.70 of master volume)
    const targetGain = kind === 'rain' ? volumeRef.current * 0.70 : volumeRef.current
    master.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + 1.2)
    master.connect(ctx.destination)
    synthMasterRef.current = master
    const stop = startSynth(ctx, kind as SynthKind, master)
    setStatus('playing')

    return () => {
      synthMasterRef.current = null
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime)
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5)
      stop()
      window.setTimeout(() => master.disconnect(), 600)
    }
  }, [active, kind, surah, effectiveRain, isQuranMode, isLofiVoice, analogTapeDust, tapeWarmth, playbackSpeed])

  // Volume & Rain Volume sync
  useEffect(() => {
    if (synthMasterRef.current) {
      const targetGain = kind === 'rain' ? volume * 0.70 : volume
      synthMasterRef.current.gain.setTargetAtTime(targetGain, synthMasterRef.current.context.currentTime, 0.05)
    }
    if (rainMasterRef.current) {
      const targetRainGain = volume * (rainVolume || 0.20)
      rainMasterRef.current.gain.setTargetAtTime(targetRainGain, rainMasterRef.current.context.currentTime, 0.05)
    }
    if (quranAudioRef.current) {
      quranAudioRef.current.volume = volume
    }
  }, [volume, rainVolume, kind])

  const seek = useCallback((seconds: number) => {
    if (quranAudioRef.current) {
      quranAudioRef.current.currentTime = seconds
      setCurrentTime(seconds)
    }
  }, [])

  return {
    status,
    currentTime,
    duration,
    seek,
    playbackSpeed,
    setPlaybackSpeed,
    tapeWarmth,
    setTapeWarmth,
    analogTapeDust,
    setAnalogTapeDust,
    rainVolume,
    setRainVolume,
  }
}

const OPTIONS: {
  kind: AmbientKind
  label: string
  sub: string
  icon: typeof Music
  badge?: string
}[] = [
  { kind: 'lofi_voice', label: '114 Surahs (Lo-Fi Voice)', sub: 'Zero music · Warm tape', icon: Mic, badge: 'Popular' },
  { kind: 'quran_rain', label: '114 Surahs + Rain', sub: 'Gentle peaceful rain blend', icon: CloudRain, badge: 'Soothing' },
  { kind: 'quran', label: 'Pure Recitation', sub: 'Acapella Quran voice', icon: BookOpen },
  { kind: 'rain', label: 'Rain sound', sub: 'Gentle, soft rainfall', icon: CloudRain },
  { kind: 'brown', label: 'Brown noise', sub: 'Deep soothing frequency', icon: Waves },
  { kind: 'lofi', label: 'Lofi beats', sub: 'Chill instrumental tempo', icon: Music },
]

function formatTime(sec: number) {
  if (!sec || isNaN(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export type RangeTab = 'all' | '1-30' | '31-60' | '61-90' | '91-114' | 'popular'

export function AmbientSoundPanel({
  kind,
  onKindChange,
  surah,
  onSurahChange,
  withRain = true,
  onWithRainChange,
  volume,
  onVolumeChange,
  previewing,
  onTogglePreview,
  onTestChime,
  status,
  timerRunning,
  muted,
  currentTime = 0,
  duration = 0,
  onSeek,
  playbackSpeed = 1,
  onSpeedChange,
  tapeWarmth = true,
  onWarmthChange,
  analogTapeDust = true,
  onTapeDustChange,
  rainVolume = 0.20,
  onRainVolumeChange,
}: {
  kind: AmbientKind
  onKindChange: (k: AmbientKind) => void
  surah: string
  onSurahChange: (s: string) => void
  withRain?: boolean
  onWithRainChange?: (r: boolean) => void
  volume: number
  onVolumeChange: (v: number) => void
  previewing: boolean
  onTogglePreview: () => void
  onTestChime: () => void
  status: Status
  timerRunning: boolean
  muted: boolean
  currentTime?: number
  duration?: number
  onSeek?: (sec: number) => void
  playbackSpeed?: number
  onSpeedChange?: (speed: number) => void
  tapeWarmth?: boolean
  onWarmthChange?: (w: boolean) => void
  analogTapeDust?: boolean
  onTapeDustChange?: (d: boolean) => void
  rainVolume?: number
  onRainVolumeChange?: (v: number) => void
}) {
  const [search, setSearch] = useState('')
  const [rangeTab, setRangeTab] = useState<RangeTab>('all')
  const [isExpandedModal, setIsExpandedModal] = useState(false)
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  const isQuranMode = kind === 'lofi_voice' || kind === 'quran_rain' || kind === 'quran'
  const effectiveRain = kind === 'quran_rain' || withRain

  const currentSurah = useMemo(() => {
    return SURAHS.find((s) => s.id === surah) || SURAHS[54]
  }, [surah])

  const filteredSurahs = useMemo(() => {
    let list = SURAHS
    if (rangeTab === 'popular') {
      const popSet = new Set(POPULAR_SURAHS)
      list = list.filter((s) => popSet.has(s.id))
    } else if (rangeTab === '1-30') {
      list = list.filter((s) => Number(s.id) >= 1 && Number(s.id) <= 30)
    } else if (rangeTab === '31-60') {
      list = list.filter((s) => Number(s.id) >= 31 && Number(s.id) <= 60)
    } else if (rangeTab === '61-90') {
      list = list.filter((s) => Number(s.id) >= 61 && Number(s.id) <= 90)
    } else if (rangeTab === '91-114') {
      list = list.filter((s) => Number(s.id) >= 91 && Number(s.id) <= 114)
    }

    if (!search.trim()) return list
    const q = search.toLowerCase().trim()
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.english.toLowerCase().includes(q) ||
        s.id.includes(q) ||
        String(Number(s.id)).includes(q)
    )
  }, [rangeTab, search])

  const handleNextSurah = () => {
    const next = (Number(surah) % 114) + 1
    onSurahChange(String(next).padStart(3, '0'))
  }

  const handlePrevSurah = () => {
    const prev = Number(surah) === 1 ? 114 : Number(surah) - 1
    onSurahChange(String(prev).padStart(3, '0'))
  }

  const handleSurahNumberInput = (num: number) => {
    if (num >= 1 && num <= 114) {
      onSurahChange(String(num).padStart(3, '0'))
    }
  }

  const statusText = muted
    ? 'Muted — unmute timer to hear audio'
    : kind === 'off'
      ? 'Only completion chime will sound'
      : status === 'loading'
        ? `Buffering Surah ${currentSurah.name}…`
        : status === 'error'
          ? 'Stream unavailable. Check network and retry.'
          : status === 'playing'
            ? kind === 'lofi_voice'
              ? `Playing Surah ${currentSurah.name} (Lo-Fi Vocal Acoustic)`
              : kind === 'quran_rain' || effectiveRain
                ? `Playing Surah ${currentSurah.name} with gentle soft rain`
                : isQuranMode
                  ? `Playing Surah ${currentSurah.name}`
                  : 'Playing ambient sound'
            : timerRunning
              ? 'Active with timer'
              : 'Press Listen to preview or start timer to play'

  return (
    <section id="ambient-sound-section" aria-label="Ambient sound" className="rounded-3xl border bg-card p-5 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Headphones className="size-4" aria-hidden />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight">Ambient sound & 114 Surahs</h2>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                114 / 114 Surahs
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">Gentle focus atmospheres & complete 114 Holy Quran recitations</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onTestChime}
            className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <BellRing className="size-3.5" aria-hidden />
            Chime
          </button>
          <button
            type="button"
            onClick={onTogglePreview}
            disabled={kind === 'off' || timerRunning}
            aria-pressed={previewing}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all shadow-sm',
              previewing
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40'
            )}
          >
            {previewing ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5 aria-hidden" />}
            {previewing ? 'Pause audio' : 'Listen'}
          </button>
        </div>
      </div>

      {/* Preset Grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Ambient sound mode">
        {OPTIONS.map(({ kind: k, label, sub, icon: Icon, badge }) => {
          const isSelected = kind === k
          const isSpecial = k === 'lofi_voice' || k === 'quran_rain' || k === 'quran'
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onKindChange(k)}
              className={cn(
                'relative flex flex-col items-start rounded-xl border p-2.5 text-left transition-all hover:-translate-y-0.5',
                isSelected
                  ? isSpecial
                    ? 'border-accent bg-accent/10 shadow-sm'
                    : 'border-primary bg-primary/10 shadow-sm'
                  : 'text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
            >
              <div className="flex w-full items-center justify-between gap-1">
                <Icon
                  className={cn(
                    'size-4',
                    isSelected ? (isSpecial ? 'text-accent' : 'text-primary') : 'text-muted-foreground'
                  )}
                  aria-hidden
                />
                {badge && (
                  <span className="rounded bg-accent/20 px-1.5 py-0.2 text-[10px] font-semibold text-accent">
                    {badge}
                  </span>
                )}
              </div>
              <span className="mt-1.5 text-xs font-semibold leading-tight text-foreground">{label}</span>
              <span className="text-[10px] text-muted-foreground">{sub}</span>
            </button>
          )
        })}
      </div>

      {/* 114 SURAHS — LO-FI VOICE INTEGRATED DECK */}
      {isQuranMode && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-b from-accent/10 to-background p-4 animate-in fade-in">
          {/* Deck Header */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-accent/20 text-accent">
                <Mic className="size-3.5" aria-hidden />
              </span>
              <div>
                <span className="text-xs font-bold text-foreground">
                  {kind === 'lofi_voice' ? '114 Surahs — Lo-Fi Voice' : '114 Surahs Player'}
                </span>
                <p className="text-[10px] text-muted-foreground">
                  Acapella recitation · Mishary Rashid Alafasy · Zero instruments · Complete Quran
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsExpandedModal(true)}
              className="flex items-center gap-1 rounded-lg border bg-background/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:border-accent hover:text-foreground"
              title="Expand full 114 surahs catalog"
            >
              <Maximize2 className="size-3" aria-hidden />
              <span>Fullscreen Catalog</span>
            </button>
          </div>

          {/* Current Surah Card & Stepper */}
          <div className="mb-3 rounded-xl border bg-card/90 p-3.5 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent/15 font-mono text-xs font-bold text-accent">
                    #{currentSurah.id}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{currentSurah.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {currentSurah.english} · {currentSurah.ayahs} verses
                    </p>
                  </div>
                </div>
              </div>

              {/* Surah Stepper & Quick Number Jump */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevSurah}
                  title="Previous Surah"
                  className="flex size-7 items-center justify-center rounded-lg border bg-background/70 text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <div className="flex items-center px-1.5 text-xs font-mono font-medium text-muted-foreground">
                  <span className="text-accent font-bold">{Number(surah)}</span>
                  <span className="mx-0.5 opacity-40">/</span>
                  <span>114</span>
                </div>
                <button
                  type="button"
                  onClick={handleNextSurah}
                  title="Next Surah"
                  className="flex size-7 items-center justify-center rounded-lg border bg-background/70 text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>

            {/* Audio Progress Bar & Scrubbing */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{duration ? formatTime(duration) : 'Buffering…'}</span>
              </div>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                disabled={!duration}
                onChange={(e) => onSeek?.(Number(e.target.value))}
                aria-label="Seek surah playback"
                className="mt-1 h-1.5 w-full cursor-pointer accent-accent disabled:opacity-40"
              />
            </div>

            {/* Playback Controls & Speed */}
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/40 pt-2.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onSeek?.(Math.max(0, currentTime - 10))}
                  disabled={!duration}
                  title="Rewind 10 seconds"
                  className="flex size-7 items-center justify-center rounded-lg border bg-background/60 text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  <Rewind className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onTogglePreview}
                  disabled={timerRunning}
                  title={previewing ? 'Pause recitation' : 'Play recitation'}
                  className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground shadow-sm hover:opacity-90 disabled:opacity-40"
                >
                  {previewing ? <Pause className="size-4" /> : <Play className="size-4 fill-current ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => onSeek?.(Math.min(duration, currentTime + 10))}
                  disabled={!duration}
                  title="Forward 10 seconds"
                  className="flex size-7 items-center justify-center rounded-lg border bg-background/60 text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  <FastForward className="size-3.5" />
                </button>
              </div>

              {/* Speed Buttons */}
              <div className="flex items-center gap-1">
                {[0.75, 1, 1.25].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => onSpeedChange?.(spd)}
                    className={cn(
                      'rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium transition-colors',
                      playbackSpeed === spd
                        ? 'bg-accent/20 font-bold text-accent'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lo-Fi Voice Acoustic Tones (Analog Tape Warmth, Tape Dust, Rain Blend) */}
          <div className="mb-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onWarmthChange?.(!tapeWarmth)}
              className={cn(
                'flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all',
                tapeWarmth
                  ? 'border-accent bg-accent/15 text-accent font-semibold'
                  : 'border-border/60 bg-background/60 text-muted-foreground hover:text-foreground'
              )}
            >
              <Sparkles className="size-3.5 mb-1" />
              <span className="text-[11px] leading-tight">Tape Warmth</span>
              <span className="text-[9px] opacity-80">{tapeWarmth ? 'Warm ON' : 'Off'}</span>
            </button>

            <button
              type="button"
              onClick={() => onTapeDustChange?.(!analogTapeDust)}
              className={cn(
                'flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all',
                analogTapeDust
                  ? 'border-accent bg-accent/15 text-accent font-semibold'
                  : 'border-border/60 bg-background/60 text-muted-foreground hover:text-foreground'
              )}
            >
              <Waves className="size-3.5 mb-1" />
              <span className="text-[11px] leading-tight">Tape Dust</span>
              <span className="text-[9px] opacity-80">{analogTapeDust ? 'Crackle ON' : 'Off'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (kind === 'quran_rain') {
                  onKindChange('quran')
                } else if (kind === 'quran') {
                  onKindChange('quran_rain')
                }
                onWithRainChange?.(!effectiveRain)
              }}
              className={cn(
                'flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all',
                effectiveRain
                  ? 'border-accent bg-accent/15 text-accent font-semibold'
                  : 'border-border/60 bg-background/60 text-muted-foreground hover:text-foreground'
              )}
            >
              <CloudRain className="size-3.5 mb-1" />
              <span className="text-[11px] leading-tight">Rain Blend</span>
              <span className="text-[9px] opacity-80">{effectiveRain ? 'Rain ON' : 'Off'}</span>
            </button>
          </div>

          {/* CALIBRATED GENTLE RAIN INTENSITY CONTROL */}
          {(effectiveRain || kind === 'rain') && (
            <div className="mb-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-2.5 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <CloudRain className="size-3.5 text-sky-500" />
                  Rain Ambience (Gentle Lower Sound)
                </span>
                <span className="font-mono text-[11px] font-bold text-sky-600 dark:text-sky-400">
                  {Math.round(rainVolume * 100)}%
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Calibrated to a soothing, lower background level — clearly audible without overwhelming
              </p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="range"
                  min={0.05}
                  max={0.60}
                  step={0.05}
                  value={rainVolume}
                  onChange={(e) => onRainVolumeChange?.(Number(e.target.value))}
                  aria-label="Rain intensity level"
                  className="h-1.5 w-full cursor-pointer accent-sky-500"
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-1">
                {[
                  { label: 'Faint (10%)', val: 0.10 },
                  { label: 'Soft (20% Default)', val: 0.20 },
                  { label: 'Calm (30%)', val: 0.30 },
                  { label: 'Steady (45%)', val: 0.45 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => onRainVolumeChange?.(preset.val)}
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors',
                      Math.abs(rainVolume - preset.val) < 0.04
                        ? 'bg-sky-500/20 font-bold text-sky-600 dark:text-sky-400'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ALL 114 SURAHS DIRECTORY & BROWSER */}
          <div className="rounded-xl border bg-card/60 p-3">
            <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
              <div className="flex items-center gap-1.5">
                <BookOpen className="size-3.5 text-accent" />
                <span className="text-xs font-bold text-foreground">All 114 Surahs Directory</span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                Showing {filteredSurahs.length} of 114 Surahs
              </span>
            </div>

            {/* Range filter tabs */}
            <div className="mt-2.5 flex flex-wrap gap-1" role="tablist" aria-label="Surah range filters">
              {(
                [
                  { id: 'all', label: 'All 114' },
                  { id: 'popular', label: 'Popular (10)' },
                  { id: '1-30', label: '1–30' },
                  { id: '31-60', label: '31–60' },
                  { id: '61-90', label: '61–90' },
                  { id: '91-114', label: '91–114 (Juz 30)' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRangeTab(tab.id)}
                  className={cn(
                    'rounded-lg px-2 py-1 text-[10px] font-medium transition-colors',
                    rangeTab === tab.id
                      ? 'bg-accent text-accent-foreground font-semibold shadow-xs'
                      : 'border border-border/50 bg-background/60 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search all 114 Surahs by name, translation, or number (1–114)…"
                className="h-8 w-full rounded-lg border bg-background pl-8 pr-7 text-xs outline-none transition-colors placeholder:text-muted-foreground focus:border-accent"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Scrollable List of All Surahs */}
            <div className="mt-2 grid max-h-52 grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
              {filteredSurahs.map((s) => {
                const isCurrent = surah === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSurahChange(s.id)}
                    className={cn(
                      'flex items-center justify-between rounded-lg border p-2 text-left transition-all hover:bg-muted/50',
                      isCurrent
                        ? 'border-accent bg-accent/15 text-foreground font-semibold shadow-xs'
                        : 'border-border/50 bg-background/50 hover:border-accent/40'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded bg-accent/20 font-mono text-[10px] font-bold text-accent">
                        {Number(s.id)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold leading-tight">{s.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{s.english}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-1">
                      <span className="text-[9px] font-mono text-muted-foreground">{s.ayahs}v</span>
                      {isCurrent && (
                        <span className="block text-[9px] font-bold text-accent">Playing</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Quick dropdown alternative for immediate selection */}
            <div className="mt-2.5 flex items-center gap-2 border-t border-border/40 pt-2">
              <span className="text-[10px] text-muted-foreground shrink-0">Dropdown Jump:</span>
              <select
                id="surah-select-dropdown"
                value={surah}
                onChange={(e) => onSurahChange(e.target.value)}
                aria-label="Choose from 114 Surahs"
                className="w-full rounded-lg border bg-background px-2.5 py-1 text-xs font-medium outline-none transition-colors focus:border-accent"
              >
                {SURAHS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {Number(s.id)}. {s.name} ({s.english}) · {s.ayahs} ayahs
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Volume Slider */}
      <div className="mt-4 flex items-center gap-3">
        <VolumeIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          aria-label="Ambient volume"
          className="h-1.5 w-full cursor-pointer accent-primary"
        />
        <span className="w-9 text-right font-mono text-xs tabular-nums text-muted-foreground">
          {Math.round(volume * 100)}%
        </span>
      </div>

      {/* Live Status indicator */}
      <p
        className={cn(
          'mt-3 flex items-center gap-1.5 text-xs',
          status === 'error' ? 'text-destructive font-medium' : 'text-muted-foreground'
        )}
        aria-live="polite"
      >
        {status === 'loading' && <Loader2 className="size-3 animate-spin text-accent" aria-hidden />}
        {status === 'playing' && !muted && (
          <span className="size-1.5 animate-pulse rounded-full bg-accent" aria-hidden />
        )}
        {statusText}
      </p>

      {/* MODAL: Fullscreen 114 Surahs Catalog Browser */}
      {isExpandedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md animate-in fade-in">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-accent/20 text-accent">
                  <BookOpen className="size-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-foreground">114 Surahs — Complete Quran Catalog</h3>
                  <p className="text-xs text-muted-foreground">Select any of the 114 Surahs for study focus and recitation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExpandedModal(false)}
                className="rounded-xl border p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal search & filter */}
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search 114 Surahs by name, number, or translation…"
                    className="h-10 w-full rounded-xl border bg-background pl-9 pr-3 text-sm outline-none focus:border-accent"
                  />
                </div>
                <div className="flex flex-wrap rounded-xl border bg-background p-1">
                  {(
                    [
                      { id: 'all', label: 'All 114' },
                      { id: 'popular', label: 'Popular' },
                      { id: '1-30', label: '1–30' },
                      { id: '31-60', label: '31–60' },
                      { id: '61-90', label: '61–90' },
                      { id: '91-114', label: '91–114' },
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setRangeTab(cat.id)}
                      className={cn(
                        'rounded-lg px-2.5 py-1 text-xs font-semibold',
                        rangeTab === cat.id ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of Surahs */}
              <div className="mt-2 grid max-h-[50vh] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {filteredSurahs.map((s) => {
                  const isCurrent = surah === s.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        onSurahChange(s.id)
                        setIsExpandedModal(false)
                      }}
                      className={cn(
                        'flex items-center justify-between rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5',
                        isCurrent
                          ? 'border-accent bg-accent/15 text-foreground font-semibold shadow-xs'
                          : 'border-border/60 hover:border-accent/50 hover:bg-muted/40'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-accent/20 font-mono text-xs font-bold text-accent">
                          {Number(s.id)}
                        </span>
                        <div>
                          <p className="text-sm font-semibold">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.english}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-mono text-muted-foreground">{s.ayahs} ayahs</span>
                        {isCurrent && <span className="block text-[10px] font-bold text-accent">Active</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
              <span>Showing {filteredSurahs.length} of 114 Surahs</span>
              <button
                type="button"
                onClick={() => setIsExpandedModal(false)}
                className="rounded-lg bg-primary px-4 py-1.5 font-semibold text-primary-foreground hover:opacity-90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
