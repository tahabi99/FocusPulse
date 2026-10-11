'use client'

import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { BellRing, Coffee, Brain, Minus, Pause, Play, Plus, RotateCcw, Sparkles, Volume2, VolumeX, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatHours, useFocusPulse } from './store'
import { createAudioContext, playChime, playClick } from './sound-engine'
import { AmbientSoundPanel, useAmbientSound, type AmbientKind } from './ambient-sound'

type Mode = 'focus' | 'break'

type Alert = { finished: Mode; minutes: number } | null

function DurationStepper({
  label,
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  disabled: boolean
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border bg-background/50 p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={disabled || value <= min}
          onClick={() => onChange(value - 1)}
          className="flex size-8 items-center justify-center rounded-lg border transition-colors hover:bg-muted disabled:opacity-40"
        >
          <Minus className="size-3.5" aria-hidden />
        </button>
        <span className="w-14 text-center font-mono text-sm tabular-nums">{value} min</span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={disabled || value >= max}
          onClick={() => onChange(value + 1)}
          className="flex size-8 items-center justify-center rounded-lg border transition-colors hover:bg-muted disabled:opacity-40"
        >
          <Plus className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  )
}

export function FocusTimer({ onOpenInsights }: { onOpenInsights: () => void }) {
  const { addFocusMinutes, sessionsToday, todayMinutes } = useFocusPulse()
  const [focusMin, setFocusMin] = useState(25)
  const [breakMin, setBreakMin] = useState(5)
  const [mode, setMode] = useState<Mode>('focus')
  const [remaining, setRemaining] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [chimeFlash, setChimeFlash] = useState(false)
  const [alert, setAlert] = useState<Alert>(null)
  const endAtRef = useRef<number | null>(null)
  const audioRef = useRef<AudioContext | null>(null)
  const remainingRef = useRef(remaining)
  remainingRef.current = remaining
  const [ambient, setAmbient] = useState<AmbientKind>('lofi')
  const [surah, setSurah] = useState('055')
  const [volume, setVolume] = useState(0.6)
  const [previewing, setPreviewing] = useState(false)

  const ensureAudio = () => {
    if (!audioRef.current) audioRef.current = createAudioContext()
    void audioRef.current?.resume()
    return audioRef.current
  }

  const ambientStatus = useAmbientSound({
    kind: ambient,
    surah,
    volume,
    active: soundOn && (running || previewing),
    getContext: ensureAudio,
  })
  const ambientAudible = soundOn && (running || previewing) && ambient !== 'off'

  const total = (mode === 'focus' ? focusMin : breakMin) * 60
  const progress = Math.min(1, Math.max(0, 1 - remaining / total))

  const handleComplete = useEffectEvent(() => {
    setRunning(false)
    endAtRef.current = null
    if (soundOn && audioRef.current) {
      void audioRef.current.resume().then(() => audioRef.current && playChime(audioRef.current))
    }
    if ('vibrate' in navigator) navigator.vibrate?.([200, 100, 200])
    setChimeFlash(true)
    setAlert({ finished: mode, minutes: mode === 'focus' ? focusMin : breakMin })
    if (mode === 'focus') {
      addFocusMinutes(focusMin)
      setMode('break')
      setRemaining(breakMin * 60)
    } else {
      setMode('focus')
      setRemaining(focusMin * 60)
    }
  })

  useEffect(() => {
    if (!running) return
    endAtRef.current = Date.now() + remainingRef.current * 1000
    const tick = () => {
      const left = Math.max(0, Math.ceil(((endAtRef.current ?? 0) - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) {
        clearInterval(id)
        handleComplete()
      }
    }
    const id = setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [running])

  useEffect(() => {
    if (!chimeFlash) return
    const id = setTimeout(() => setChimeFlash(false), 2400)
    return () => clearTimeout(id)
  }, [chimeFlash])

  useEffect(() => {
    const original = 'FocusPulse — Study Habit Tracker'
    const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
    const ss = String(remaining % 60).padStart(2, '0')
    if (alert && !running) {
      document.title = alert.finished === 'focus' ? 'Session complete! · FocusPulse' : 'Break over! · FocusPulse'
    } else if (running) {
      document.title = `${mm}:${ss} · ${mode === 'focus' ? 'Focus' : 'Break'} · FocusPulse`
    } else {
      document.title = original
    }
  }, [remaining, running, mode, alert])

  useEffect(() => () => void audioRef.current?.close(), [])

  const click = (kind: Parameters<typeof playClick>[1]) => {
    const ctx = ensureAudio()
    if (soundOn && ctx) playClick(ctx, kind)
  }

  const toggleRunning = () => {
    click(running ? 'pause' : 'start')
    if (!running) {
      setAlert(null)
      setPreviewing(false)
    }
    setRunning((r) => !r)
  }

  const testChime = () => {
    const ctx = ensureAudio()
    if (ctx) playChime(ctx)
  }

  const switchMode = (next: Mode) => {
    setRunning(false)
    setAlert(null)
    setMode(next)
    setRemaining((next === 'focus' ? focusMin : breakMin) * 60)
  }

  const reset = () => {
    click('reset')
    setRunning(false)
    setAlert(null)
    setRemaining(total)
  }

  const updateDuration = (which: Mode, value: number) => {
    if (which === 'focus') setFocusMin(value)
    else setBreakMin(value)
    if (which === mode) setRemaining(value * 60)
  }

  const minutes = String(Math.floor(remaining / 60)).padStart(2, '0')
  const seconds = String(remaining % 60).padStart(2, '0')
  const radius = 120
  const circumference = 2 * Math.PI * radius
  const isFocus = mode === 'focus'

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section
        aria-label="Pomodoro timer"
        className="relative overflow-hidden rounded-3xl border bg-card p-6 sm:p-8"
      >
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute -right-24 -top-24 size-72 rounded-full blur-3xl transition-colors duration-700',
            isFocus ? 'bg-primary/20' : 'bg-accent/20',
          )}
        />
        <div className="relative flex flex-col items-center gap-8">
          {alert && (
            <div
              role="alert"
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl border p-3 pr-2 animate-in fade-in slide-in-from-top-2',
                alert.finished === 'focus'
                  ? 'border-accent/40 bg-accent/10'
                  : 'border-primary/40 bg-primary/10',
              )}
            >
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-xl text-white',
                  alert.finished === 'focus' ? 'bg-accent' : 'bg-primary',
                )}
              >
                <BellRing className="size-4 animate-[bell-ring_0.9s_ease-in-out_3]" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {alert.finished === 'focus'
                    ? `Nice work! ${alert.minutes} min focus session complete.`
                    : 'Break is over. Ready to focus?'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {alert.finished === 'focus'
                    ? `Logged to today's stats. Take a ${breakMin} min break.`
                    : `Next up: ${focusMin} min of deep focus.`}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleRunning}
                className={cn(
                  'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90',
                  alert.finished === 'focus' ? 'bg-accent' : 'bg-primary',
                )}
              >
                {alert.finished === 'focus' ? 'Start break' : 'Start focus'}
              </button>
              <button
                type="button"
                onClick={() => setAlert(null)}
                aria-label="Dismiss alert"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          )}
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-xl border bg-background/60 p-1" role="group" aria-label="Timer mode">
              {(['focus', 'break'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => switchMode(m)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-all',
                    mode === m
                      ? m === 'focus'
                        ? 'bg-primary text-primary-foreground shadow'
                        : 'bg-accent text-accent-foreground shadow'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {m === 'focus' ? <Brain className="size-3.5" aria-hidden /> : <Coffee className="size-3.5" aria-hidden />}
                  {m}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                ensureAudio()
                setSoundOn((s) => !s)
              }}
              aria-label={soundOn ? 'Mute all sounds' : 'Unmute sounds'}
              className="flex items-center gap-2 rounded-xl border bg-background/60 px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {soundOn ? <Volume2 className="size-4" aria-hidden /> : <VolumeX className="size-4" aria-hidden />}
              <span className="flex h-4 items-end gap-0.5" aria-hidden>
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={cn('w-0.5 origin-bottom rounded-full', isFocus ? 'bg-primary' : 'bg-accent')}
                    style={{
                      height: '100%',
                      transform: 'scaleY(0.3)',
                      animation: ambientAudible ? `sound-bar ${0.6 + i * 0.12}s ease-in-out ${i * 0.08}s infinite` : 'none',
                    }}
                  />
                ))}
              </span>
              {soundOn ? 'Sound on' : 'Muted'}
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <svg viewBox="0 0 280 280" className="size-64 -rotate-90 sm:size-72" aria-hidden>
              <defs>
                <linearGradient id="ring-focus" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="oklch(0.62 0.2 310)" />
                </linearGradient>
                <linearGradient id="ring-break" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" />
                  <stop offset="100%" stopColor="oklch(0.72 0.13 200)" />
                </linearGradient>
              </defs>
              <circle cx="140" cy="140" r={radius} fill="none" stroke="var(--muted)" strokeWidth="12" />
              <circle
                cx="140"
                cy="140"
                r={radius}
                fill="none"
                stroke={`url(#ring-${mode})`}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                className="transition-[stroke-dashoffset] duration-300 ease-linear"
              />
            </svg>
            <div
              className={cn(
                'absolute inset-6 rounded-full transition-shadow duration-500',
                chimeFlash && (isFocus ? 'shadow-[0_0_60px_10px] shadow-primary/40' : 'shadow-[0_0_60px_10px] shadow-accent/40'),
              )}
              aria-hidden
            />
            <div className="absolute flex flex-col items-center">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {isFocus ? 'Deep focus' : 'Recharge'}
              </span>
              <span
                className="font-mono text-6xl font-semibold tabular-nums tracking-tight sm:text-7xl"
                role="timer"
                aria-live="off"
              >
                {minutes}:{seconds}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                Session {sessionsToday + 1} · {running ? 'in progress' : 'paused'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={reset}
              aria-label="Reset timer"
              className="flex size-12 items-center justify-center rounded-2xl border bg-background/60 text-muted-foreground transition-all hover:-rotate-45 hover:text-foreground"
            >
              <RotateCcw className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={toggleRunning}
              aria-label={running ? 'Pause timer' : 'Start timer'}
              className={cn(
                'flex h-16 min-w-40 items-center justify-center gap-2 rounded-2xl px-8 text-base font-semibold text-white shadow-xl transition-all hover:-translate-y-0.5 active:translate-y-0',
                isFocus
                  ? 'bg-gradient-to-r from-primary to-[oklch(0.58_0.2_300)] shadow-primary/30'
                  : 'bg-gradient-to-r from-accent to-[oklch(0.65_0.13_200)] shadow-accent/30',
              )}
            >
              {running ? <Pause className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />}
              {running ? 'Pause' : remaining < total ? 'Resume' : 'Start'}
            </button>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-6">
        <section aria-label="Timer settings" className="rounded-3xl border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold">Customize session</h2>
          <div className="flex flex-col gap-3">
            <DurationStepper
              label="Focus"
              value={focusMin}
              min={5}
              max={90}
              disabled={running}
              onChange={(v) => updateDuration('focus', v)}
            />
            <DurationStepper
              label="Break"
              value={breakMin}
              min={1}
              max={30}
              disabled={running}
              onChange={(v) => updateDuration('break', v)}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              [25, 5],
              [50, 10],
              [90, 20],
            ].map(([f, b]) => (
              <button
                key={f}
                type="button"
                disabled={running}
                onClick={() => {
                  setFocusMin(f)
                  setBreakMin(b)
                  setRemaining((mode === 'focus' ? f : b) * 60)
                }}
                className={cn(
                  'rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-40',
                  focusMin === f && breakMin === b ? 'border-primary/60 bg-primary/10 text-foreground' : 'text-muted-foreground',
                )}
              >
                {f}/{b}
              </button>
            ))}
          </div>
        </section>

        <AmbientSoundPanel
          kind={ambient}
          onKindChange={(k) => {
            ensureAudio()
            setAmbient(k)
            if (k === 'off') setPreviewing(false)
          }}
          surah={surah}
          onSurahChange={setSurah}
          volume={volume}
          onVolumeChange={setVolume}
          previewing={previewing}
          onTogglePreview={() => {
            ensureAudio()
            setPreviewing((p) => !p)
          }}
          onTestChime={testChime}
          status={ambientStatus}
          timerRunning={running}
          muted={!soundOn}
        />

        <section aria-label="Today summary" className="grid grid-cols-2 gap-4">
          <div className="rounded-3xl border bg-card p-5 transition-transform hover:-translate-y-0.5">
            <p className="text-xs text-muted-foreground">Focused today</p>
            <p className="mt-1 text-2xl font-semibold">{formatHours(todayMinutes)}</p>
          </div>
          <div className="rounded-3xl border bg-card p-5 transition-transform hover:-translate-y-0.5">
            <p className="text-xs text-muted-foreground">Sessions</p>
            <p className="mt-1 text-2xl font-semibold">{sessionsToday}</p>
          </div>
        </section>

        <button
          type="button"
          onClick={onOpenInsights}
          className="group flex items-center gap-3 rounded-3xl border bg-gradient-to-br from-primary/15 via-card to-accent/15 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
            <Sparkles className="size-5 text-white" aria-hidden />
          </span>
          <span>
            <span className="block text-sm font-semibold">See your AI insight</span>
            <span className="block text-xs text-muted-foreground">Personalized tips from your study pattern</span>
          </span>
        </button>
      </div>
    </div>
  )
}
