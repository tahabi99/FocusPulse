'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Activity, Flame, Sparkles, Zap } from 'lucide-react'

export function PageOpeningAnimation({
  onComplete,
  forcePlay = false,
}: {
  onComplete?: () => void
  forcePlay?: boolean
}) {
  const [isVisible, setIsVisible] = useState(true)
  const [phase, setPhase] = useState<'ignite' | 'calibrate' | 'launch'>('ignite')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Phase 1: Ignite
    const timer1 = setTimeout(() => {
      setPhase('calibrate')
    }, 450)

    // Phase 2: Progress ramp
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 5
      })
    }, 45)

    // Phase 3: Launch
    const timer2 = setTimeout(() => {
      setPhase('launch')
    }, 1250)

    // Exit animation complete
    const timer3 = setTimeout(() => {
      setIsVisible(false)
      if (onComplete) onComplete()
    }, 1800)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      clearInterval(interval)
    }
  }, [onComplete])

  const handleDismiss = () => {
    setIsVisible(false)
    if (onComplete) onComplete()
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="focuspulse-opening-splash"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.04,
            filter: 'blur(10px)',
            transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
          }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#0d0e1c] text-white select-none cursor-pointer"
          onClick={handleDismiss}
          title="Click to enter immediately"
        >
          {/* Ambient Radiant Glow Orbs */}
          <motion.div
            aria-hidden
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{
              scale: [0.8, 1.25, 1],
              opacity: [0.3, 0.7, 0.5],
            }}
            transition={{ duration: 1.8, ease: 'easeOut' }}
            className="pointer-events-none absolute h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,oklch(0.55_0.25_285/0.45),transparent_70%)] blur-3xl"
          />

          <motion.div
            aria-hidden
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{
              scale: [0.7, 1.15, 1],
              opacity: [0.2, 0.5, 0.35],
            }}
            transition={{ duration: 1.6, delay: 0.2, ease: 'easeOut' }}
            className="pointer-events-none absolute -bottom-32 h-[450px] w-[450px] rounded-full bg-[radial-gradient(circle,oklch(0.6_0.22_310/0.35),transparent_70%)] blur-3xl"
          />

          <div className="relative z-10 flex flex-col items-center px-4 text-center">
            {/* Center Glowing Pulse Emblem */}
            <div className="relative mb-8 flex size-28 items-center justify-center sm:size-32">
              {/* Outer Pulsing Ripple Rings */}
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{
                  scale: [1, 1.45, 1.7],
                  opacity: [0.8, 0.3, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 1.8,
                  ease: 'easeOut',
                }}
                className="absolute inset-0 rounded-full border-2 border-primary/50"
              />

              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{
                  scale: [1, 1.35, 1.55],
                  opacity: [0.6, 0.25, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 1.8,
                  delay: 0.45,
                  ease: 'easeOut',
                }}
                className="absolute inset-0 rounded-full border border-purple-400/40"
              />

              {/* Rotating Dashed Orbit Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-1 rounded-full border border-dashed border-primary/40"
              />

              {/* Core Emblem Container */}
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 18,
                  delay: 0.1,
                }}
                className="relative flex size-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-primary via-[oklch(0.58_0.22_295)] to-indigo-500 shadow-2xl shadow-primary/60 border border-white/20 sm:size-24"
              >
                {/* Heartbeat pulse icon */}
                <motion.div
                  animate={{
                    scale: [1, 1.18, 1, 1.25, 1],
                  }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <Activity className="size-10 text-white sm:size-12 stroke-[2.5]" />
                </motion.div>

                {/* Sparkling corner badge */}
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: 'spring' }}
                  className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-amber-400 text-black shadow-lg"
                >
                  <Sparkles className="size-3.5 fill-current" />
                </motion.span>
              </motion.div>
            </div>

            {/* Typography with Reveal Animation */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.25, ease: 'easeOut' }}
              className="space-y-2"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-md">
                <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[11px] font-semibold tracking-wider uppercase text-white/80">
                  Study Habit Tracker & Focus Analytics
                </span>
              </div>

              <h1 className="bg-gradient-to-r from-white via-purple-100 to-primary-foreground bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl">
                FocusPulse
              </h1>

              <p className="max-w-sm text-xs sm:text-sm text-white/70">
                {phase === 'ignite' && 'Igniting your neural deep work engine...'}
                {phase === 'calibrate' && 'Calibrating Pomodoro rhythm & study analytics...'}
                {phase === 'launch' && 'Ready to achieve flow state.'}
              </p>
            </motion.div>

            {/* Progress Sweep Bar */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mt-7 w-64 max-w-full space-y-2"
            >
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10 p-0.5">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-purple-400 to-emerald-400 shadow-[0_0_12px_rgba(168,85,247,0.7)]"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: 'linear' }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-white/60">
                <span>Synchronizing rhythm</span>
                <span>{progress}%</span>
              </div>
            </motion.div>

            {/* Tap to skip prompt */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 0.7 }}
              className="mt-8 text-[11px] text-white/50 hover:opacity-100 transition-opacity"
            >
              Click anywhere to skip
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
