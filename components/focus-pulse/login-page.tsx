'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { Activity, ArrowRight, BookOpen, CheckCircle2, Lock, Mail, ShieldCheck, Sparkles, User } from 'lucide-react'
import { useFocusPulse } from './store'

export function LoginPage() {
  const { login, signup } = useFocusPulse()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [title, setTitle] = useState('Computer Science')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isLogin = mode === 'login'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isLogin) {
        const res = await login(email, password)
        if (!res.success) {
          setError(res.error || 'Invalid email or password.')
        }
      } else {
        if (!name.trim()) {
          setError('Please enter your full name.')
          setLoading(false)
          return
        }
        if (password.length < 4) {
          setError('Password must be at least 4 characters.')
          setLoading(false)
          return
        }
        const res = await signup(name, email, password, title)
        if (!res.success) {
          setError(res.error || 'Failed to create account.')
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
      {/* Background glow effects */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-full max-w-4xl -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.55_0.22_277/0.3),transparent_70%)] blur-3xl"
      />
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, delay: 0.2, ease: 'easeOut' }}
        className="pointer-events-none absolute -bottom-40 right-10 size-96 rounded-full bg-accent/15 blur-3xl"
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        {/* Brand Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mb-8 text-center"
        >
          <div className="inline-flex items-center gap-2.5 rounded-2xl border border-primary/30 bg-card/60 px-4 py-2 shadow-lg shadow-primary/10 backdrop-blur-md">
            <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-md shadow-primary/30">
              <Activity className="size-4" aria-hidden />
            </span>
            <span className="text-xl font-bold tracking-tight">
              Focus<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Pulse</span>
            </span>
          </div>
          <h1 className="mt-4 text-balance text-2xl font-bold tracking-tight sm:text-3xl">
            {isLogin ? 'Sign in to your account' : 'Create your study account'}
          </h1>
          <p className="mt-2 text-balance text-sm text-muted-foreground">
            {isLogin
              ? 'Enter your credentials to access your timer, streaks, and focus analytics.'
              : 'Join FocusPulse to track your Pomodoro sessions and build lasting habits.'}
          </p>
        </motion.div>

        {/* Auth Card */}
        <div className="overflow-hidden rounded-3xl border bg-card/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          {/* Mode Switcher */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl border bg-muted/60 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setError(null)
              }}
              className={`rounded-xl py-2 text-xs font-semibold transition-all ${
                isLogin
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup')
                setError(null)
              }}
              className={`rounded-xl py-2 text-xs font-semibold transition-all ${
                !isLogin
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign up
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sarah Connor"
                    className="h-11 w-full rounded-xl border bg-background/80 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="h-11 w-full rounded-xl border bg-background/80 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-xl border bg-background/80 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Study Field or Specialty</label>
                <div className="relative">
                  <BookOpen className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Computer Science, Medicine, Law"
                    className="h-11 w-full rounded-xl border bg-background/80 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[oklch(0.58_0.2_300)] text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:opacity-95 active:translate-y-0 disabled:opacity-50"
            >
              {loading ? 'Authenticating…' : isLogin ? 'Sign In to FocusPulse' : 'Create Account & Enter'}
              <ArrowRight className="size-4" aria-hidden />
            </button>
          </form>

          {/* Toggle link */}
          <div className="mt-6 text-center text-xs text-muted-foreground">
            {isLogin ? (
              <p>
                First time using FocusPulse?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup')
                    setError(null)
                  }}
                  className="font-semibold text-primary underline underline-offset-4 hover:opacity-80"
                >
                  Create an account
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login')
                    setError(null)
                  }}
                  className="font-semibold text-primary underline underline-offset-4 hover:opacity-80"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Feature Highlights Footer */}
        <div className="mt-8 flex items-center justify-center gap-6 text-center text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-accent" aria-hidden />
            Pomodoro & Sound Engine
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-accent" aria-hidden />
            52-Week Habit Heatmap
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-accent" aria-hidden />
            AI Habit Insights
          </span>
        </div>
      </motion.div>
    </div>
  )
}
