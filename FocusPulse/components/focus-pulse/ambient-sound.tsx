'use client'

import { useEffect, useRef, useState } from 'react'
import { BellRing, BookOpen, CloudRain, Headphones, Loader2, Music, Pause, Play, Volume1, Volume2, Waves, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { startSynth, type SynthKind } from './sound-engine'

export type AmbientKind = 'off' | SynthKind | 'quran'

export const SURAHS = [
  { id: '001', name: 'Al-Fatihah' },
  { id: '018', name: 'Al-Kahf' },
  { id: '036', name: 'Ya-Sin' },
  { id: '055', name: 'Ar-Rahman' },
  { id: '056', name: "Al-Waqi'ah" },
  { id: '067', name: 'Al-Mulk' },
] as const

const surahUrl = (id: string) => `https://server8.mp3quran.net/afs/${id}.mp3`

type Status = 'idle' | 'loading' | 'playing' | 'error'

export function useAmbientSound({
  kind,
  surah,
  volume,
  active,
  getContext,
}: {
  kind: AmbientKind
  surah: string
  volume: number
  active: boolean
  getContext: () => AudioContext | null
}) {
  const [status, setStatus] = useState<Status>('idle')
  const masterRef = useRef<GainNode | null>(null)
  const quranRef = useRef<HTMLAudioElement | null>(null)
  const volumeRef = useRef(volume)
  volumeRef.current = volume
  const getContextRef = useRef(getContext)
  getContextRef.current = getContext

  useEffect(() => {
    if (!active || kind === 'off') {
      setStatus('idle')
      return
    }

    if (kind === 'quran') {
      const audio = quranRef.current ?? new Audio()
      quranRef.current = audio
      const src = surahUrl(surah)
      if (audio.dataset.src !== src) {
        audio.src = src
        audio.dataset.src = src
      }
      audio.loop = true
      audio.volume = volumeRef.current
      const onPlaying = () => setStatus('playing')
      const onWaiting = () => setStatus('loading')
      const onError = () => setStatus('error')
      audio.addEventListener('playing', onPlaying)
      audio.addEventListener('waiting', onWaiting)
      audio.addEventListener('error', onError)
      setStatus('loading')
      audio.play().catch(() => setStatus('error'))
      return () => {
        audio.pause()
        audio.removeEventListener('playing', onPlaying)
        audio.removeEventListener('waiting', onWaiting)
        audio.removeEventListener('error', onError)
      }
    }

    const ctx = getContextRef.current()
    if (!ctx) {
      setStatus('error')
      return
    }
    void ctx.resume()
    const master = ctx.createGain()
    master.gain.setValueAtTime(0, ctx.currentTime)
    master.gain.linearRampToValueAtTime(volumeRef.current, ctx.currentTime + 1.2)
    master.connect(ctx.destination)
    masterRef.current = master
    const stop = startSynth(ctx, kind, master)
    setStatus('playing')

    return () => {
      masterRef.current = null
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime)
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5)
      stop()
      window.setTimeout(() => master.disconnect(), 700)
    }
  }, [active, kind, surah])

  useEffect(() => {
    const master = masterRef.current
    if (master) master.gain.setTargetAtTime(volume, master.context.currentTime, 0.05)
    if (quranRef.current) quranRef.current.volume = volume
  }, [volume])

  useEffect(
    () => () => {
      quranRef.current?.pause()
      quranRef.current = null
    },
    [],
  )

  return status
}

const OPTIONS: { kind: AmbientKind; label: string; icon: typeof Music }[] = [
  { kind: 'off', label: 'Silent', icon: VolumeX },
  { kind: 'lofi', label: 'Lofi beats', icon: Music },
  { kind: 'rain', label: 'Rain', icon: CloudRain },
  { kind: 'brown', label: 'Brown noise', icon: Waves },
  { kind: 'quran', label: 'Quran', icon: BookOpen },
]

export function AmbientSoundPanel({
  kind,
  onKindChange,
  surah,
  onSurahChange,
  volume,
  onVolumeChange,
  previewing,
  onTogglePreview,
  onTestChime,
  status,
  timerRunning,
  muted,
}: {
  kind: AmbientKind
  onKindChange: (k: AmbientKind) => void
  surah: string
  onSurahChange: (s: string) => void
  volume: number
  onVolumeChange: (v: number) => void
  previewing: boolean
  onTogglePreview: () => void
  onTestChime: () => void
  status: Status
  timerRunning: boolean
  muted: boolean
}) {
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2
  const statusText = muted
    ? 'Muted — unmute to hear ambience and chimes'
    : kind === 'off'
      ? 'Only the completion chime will play'
      : status === 'loading'
        ? 'Loading recitation…'
        : status === 'error'
          ? 'Could not play audio. Check your connection and try again.'
          : status === 'playing'
            ? 'Now playing'
            : 'Plays automatically while the timer runs'

  return (
    <section aria-label="Ambient sound" className="rounded-3xl border bg-card p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Headphones className="size-4 text-primary" aria-hidden />
          Ambient sound
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onTestChime}
            className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <BellRing className="size-3.5" aria-hidden />
            Test chime
          </button>
          <button
            type="button"
            onClick={onTogglePreview}
            disabled={kind === 'off' || timerRunning}
            aria-pressed={previewing}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {previewing ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
            {previewing ? 'Stop' : 'Listen'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-5" role="radiogroup" aria-label="Ambient sound type">
        {OPTIONS.map(({ kind: k, label, icon: Icon }) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => onKindChange(k)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-all hover:-translate-y-0.5',
              kind === k
                ? k === 'quran'
                  ? 'border-accent/60 bg-accent/10 text-foreground'
                  : 'border-primary/60 bg-primary/10 text-foreground'
                : 'text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
          >
            <Icon className={cn('size-4', kind === k && (k === 'quran' ? 'text-accent' : 'text-primary'))} aria-hidden />
            <span className="text-center leading-tight">{label}</span>
          </button>
        ))}
      </div>

      {kind === 'quran' && (
        <div className="mt-4 rounded-2xl border border-accent/30 bg-accent/5 p-3">
          <label htmlFor="surah-select" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Surah
          </label>
          <select
            id="surah-select"
            value={surah}
            onChange={(e) => onSurahChange(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {SURAHS.map((s) => (
              <option key={s.id} value={s.id}>
                {Number(s.id)}. {s.name}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted-foreground">
            Recited by Mishary Rashid Alafasy. Plays on its own, without music.
          </p>
        </div>
      )}

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
          className="h-1.5 w-full cursor-pointer accent-[var(--primary)]"
        />
        <span className="w-9 text-right font-mono text-xs tabular-nums text-muted-foreground">
          {Math.round(volume * 100)}%
        </span>
      </div>

      <p
        className={cn(
          'mt-3 flex items-center gap-1.5 text-xs',
          status === 'error' ? 'text-destructive' : 'text-muted-foreground',
        )}
        aria-live="polite"
      >
        {status === 'loading' && <Loader2 className="size-3 animate-spin" aria-hidden />}
        {status === 'playing' && !muted && <span className="size-1.5 animate-pulse rounded-full bg-accent" aria-hidden />}
        {statusText}
      </p>
    </section>
  )
}
