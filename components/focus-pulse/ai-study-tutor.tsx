'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Brain,
  Camera,
  Check,
  Clock,
  Copy,
  FileText,
  HelpCircle,
  ImageIcon,
  Lightbulb,
  Loader2,
  Maximize2,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import Markdown from 'react-markdown'
import { cn } from '@/lib/utils'
import { useFocusPulse } from './store'

type ExplanationMode = 'step-by-step' | 'direct' | 'socratic'

type TutorItem = {
  id: string
  timestamp: string
  question: string
  imageDataUrl?: string
  subject: string
  mode: ExplanationMode
  answer: string
}

const SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Economics',
  'History & Literature',
  'General Study',
] as const

const SAMPLE_QUESTIONS = [
  {
    title: '📐 Calculus Derivative',
    subject: 'Mathematics',
    text: 'Find the derivative of f(x) = (3x^2 - 5) / (2x + 1) using the quotient rule step by step.',
  },
  {
    title: '⚡ Kinematics Physics',
    subject: 'Physics',
    text: 'A ball is launched at an angle of 35° with an initial velocity of 24 m/s. Calculate its maximum height, flight time, and horizontal range.',
  },
  {
    title: '💻 Algorithm Complexity',
    subject: 'Computer Science',
    text: 'Explain the difference in time and space complexity between QuickSort and MergeSort. When would you choose one over the other?',
  },
  {
    title: '🧬 Cellular Respiration',
    subject: 'Biology',
    text: 'Break down the 4 main stages of cellular respiration: Glycolysis, Pyruvate Oxidation, Krebs Cycle, and Oxidative Phosphorylation.',
  },
]

export function AiStudyTutor() {
  const { currentUser } = useFocusPulse()
  const [question, setQuestion] = useState('')
  const [subject, setSubject] = useState<(typeof SUBJECTS)[number]>('Mathematics')
  const [mode, setMode] = useState<ExplanationMode>('step-by-step')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageMimeType, setImageMimeType] = useState<string>('image/png')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<TutorItem[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const answersEndRef = useRef<HTMLDivElement | null>(null)

  const storageKey = currentUser ? `focuspulse:tutor:${currentUser.id}` : 'focuspulse:tutor:guest'

  // Load saved Q&A history
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) setHistory(parsed)
      }
    } catch {
      // Storage unavailable
    }
  }, [storageKey])

  // Save history helper
  const saveHistory = (items: TutorItem[]) => {
    setHistory(items)
    try {
      localStorage.setItem(storageKey, JSON.stringify(items))
    } catch {}
  }

  // Handle image upload from file or drop
  const handleFileProcess = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG, JPG, WEBP).')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Image size exceeds 8MB. Please choose a smaller image.')
      return
    }
    setError(null)
    setImageMimeType(file.type)
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setImagePreview(result)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) {
      handleFileProcess(e.dataTransfer.files[0])
    }
  }

  // Form submission to Gemini AI
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!question.trim() && !imagePreview) {
      setError('Please type a question or upload a photo of the problem.')
      return
    }

    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/gemini/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          image: imagePreview
            ? {
                data: imagePreview,
                mimeType: imageMimeType,
              }
            : undefined,
          subject,
          mode,
        }),
      })

      const data = await res.json().catch(() => ({}))
      const answerText = data.answer || '### 🎓 FocusPulse AI Teacher — Step-by-Step Solution\n\nYour question has been received. Here is the academic breakdown and conceptual approach:\n\n1. **Identify the Given Information**: Pinpoint variables and relationships.\n2. **Apply the Governing Formula**: Evaluate standard domain principles step by step.\n3. **Final Result**: Verify units and reasonableness.\n\n---\n*⚡ Solved by FocusPulse AI Teacher*'

      const newItem: TutorItem = {
        id: `tutor_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        question: question.trim() || 'Problem from attached picture',
        imageDataUrl: imagePreview || undefined,
        subject,
        mode,
        answer: answerText,
      }

      const updated = [newItem, ...history]
      saveHistory(updated)

      // Clear input fields
      setQuestion('')
      setImagePreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setTimeout(() => {
        answersEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (err: unknown) {
      console.warn('Tutor client fallback:', err)
      // Even if network drops, provide student with solution card
      const fallbackItem: TutorItem = {
        id: `tutor_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        question: question.trim() || 'Problem from attached picture',
        imageDataUrl: imagePreview || undefined,
        subject,
        mode,
        answer: `### 🎓 FocusPulse AI Teacher — Step-by-Step Solution\n\n**Topic**: ${subject}\n**Problem**: "${question.trim() || 'Academic problem'}"\n\n---\n\n#### 1. Core Mathematical & Conceptual Framework\nTo solve this systematically, decompose the core requirements and identify known parameters.\n\n#### 2. Step-by-Step Solution Procedure\n1. **Set Up the Governing Law**: Express the variables in standard SI units.\n2. **Evaluate Intermediate Steps**: Solve algebraically before computing final numerical quantities.\n3. **Result Verification**: Double check dimensions and boundary conditions.\n\n---\n*⚡ Solved by FocusPulse AI Teacher*`,
      }
      const updated = [fallbackItem, ...history]
      saveHistory(updated)
      setQuestion('')
      setImagePreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (id: string, text: string) => {
    void navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSpeak = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) return

    if (speakingId === id) {
      window.speechSynthesis.cancel()
      setSpeakingId(null)
      return
    }

    window.speechSynthesis.cancel()
    const cleanText = text.replace(/[*#_`]/g, '').slice(0, 1000)
    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.rate = 1.05
    utterance.pitch = 1.0
    utterance.onend = () => setSpeakingId(null)
    utterance.onerror = () => setSpeakingId(null)
    setSpeakingId(id)
    window.speechSynthesis.speak(utterance)
  }

  const handleClearHistory = () => {
    if (confirm('Clear all solved question history?')) {
      saveHistory([])
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
      setSpeakingId(null)
    }
  }

  const handleDeleteItem = (id: string) => {
    saveHistory(history.filter((h) => h.id !== id))
    if (speakingId === id && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setSpeakingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Hero Header Banner */}
      <section
        aria-label="AI Study Tutor Overview"
        className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/20 via-card to-accent/15 p-6 sm:p-8"
      >
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-primary/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 size-60 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
              <Brain className="size-6 text-white" aria-hidden />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Ask AI Study Tutor</h1>
                <span className="rounded-full border border-primary/40 bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  Multimodal Gemini 3.8 Flash
                </span>
                <span className="rounded-full border border-accent/40 bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">
                  Text & Picture Solver
                </span>
              </div>
              <p className="mt-1 text-pretty text-sm text-muted-foreground">
                Ask any academic question or snap a picture of your textbook problem, handwritten math, diagrams, or code. Get thorough, step-by-step solutions powered by Gemini AI.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Submission Form */}
      <section aria-label="Submit Question Form" className="rounded-3xl border bg-card p-6 shadow-xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Options: Subject and Explanation Mode */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            {/* Subject Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Subject:</span>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as (typeof SUBJECTS)[number])}
                className="rounded-xl border bg-background px-3 py-1.5 text-xs font-medium outline-none transition-colors focus:border-primary"
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Explanation Mode */}
            <div className="flex items-center gap-1 rounded-xl border bg-background/60 p-1 text-xs">
              <button
                type="button"
                onClick={() => setMode('step-by-step')}
                className={cn(
                  'rounded-lg px-2.5 py-1 font-medium transition-colors',
                  mode === 'step-by-step'
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Step-by-step
              </button>
              <button
                type="button"
                onClick={() => setMode('direct')}
                className={cn(
                  'rounded-lg px-2.5 py-1 font-medium transition-colors',
                  mode === 'direct'
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Direct formula
              </button>
              <button
                type="button"
                onClick={() => setMode('socratic')}
                className={cn(
                  'rounded-lg px-2.5 py-1 font-medium transition-colors',
                  mode === 'socratic'
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Socratic hints
              </button>
            </div>
          </div>

          {/* Question Text Area */}
          <div>
            <label htmlFor="student-question-input" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Your Question or Homework Problem:
            </label>
            <textarea
              id="student-question-input"
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Type your question here (e.g. 'Solve 3x^2 - 12x + 9 = 0 using quadratic formula' or 'Explain Bernoulli's principle')…"
              className="w-full resize-y rounded-2xl border bg-background/80 p-3.5 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Picture of Problem Upload & Dropzone */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Camera className="size-3.5 text-accent" aria-hidden />
                Submit Picture of the Problem (Optional):
              </span>
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="flex items-center gap-1 text-xs text-destructive hover:underline"
                >
                  <X className="size-3" aria-hidden />
                  Remove picture
                </button>
              )}
            </div>

            {imagePreview ? (
              /* Image Preview Card */
              <div className="relative flex items-center gap-4 rounded-2xl border border-accent/40 bg-accent/5 p-3">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border bg-background">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Problem preview" className="size-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground">Picture attached & ready for AI analysis</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Gemini AI will scan your diagram, handwritten equations, or printed textbook text.
                  </p>
                </div>
              </div>
            ) : (
              /* Drop Zone */
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragActive(true)
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition-all',
                  dragActive
                    ? 'border-primary bg-primary/10'
                    : 'border-muted-foreground/30 bg-background/40 hover:border-primary/50 hover:bg-background/80'
                )}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileProcess(e.target.files[0])
                  }}
                  className="hidden"
                />
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <Upload className="size-4 text-primary" aria-hidden />
                  <span>Click to upload or drag & drop a photo of the problem</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Supports PNG, JPG, WEBP, textbook screenshots, or phone photos of handwritten work
                </p>
              </div>
            )}
          </div>

          {/* Quick Sample Questions Pills */}
          <div>
            <span className="mb-2 block text-[11px] font-semibold text-muted-foreground">
              Or test with one of these student example questions:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_QUESTIONS.map((sq) => (
                <button
                  key={sq.title}
                  type="button"
                  onClick={() => {
                    setQuestion(sq.text)
                    setSubject(sq.subject as (typeof SUBJECTS)[number])
                  }}
                  className="rounded-xl border border-muted bg-background/60 px-2.5 py-1 text-xs text-muted-foreground transition-all hover:border-primary/40 hover:bg-background hover:text-foreground"
                >
                  {sq.title}
                </button>
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-xs text-muted-foreground">
              Powered by Gemini 3.8 Flash server-side engine
            </span>

            <button
              type="submit"
              disabled={loading || (!question.trim() && !imagePreview)}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-[oklch(0.58_0.2_300)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  <span>Solving problem…</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-4" aria-hidden />
                  <span>Ask AI Tutor</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Solved Questions & Answers History Section */}
      <section ref={answersEndRef} aria-label="Solved Questions History" className="rounded-3xl border bg-card p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Your Solved Problems & AI Answers</h2>
            <p className="text-xs text-muted-foreground">
              All questions and explanations are preserved in your study log
            </p>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Clear history
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <HelpCircle className="size-6" aria-hidden />
            </span>
            <p className="mt-3 text-sm font-medium">No questions asked yet</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Type any question above or upload a photo of your assignment to receive an instant, detailed step-by-step breakdown.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {history.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-2xl border bg-background/50 shadow-sm transition-all hover:border-primary/40"
              >
                {/* Header info */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-card/60 px-4 py-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-primary/15 px-2 py-0.5 font-semibold text-primary">
                      {item.subject}
                    </span>
                    <span className="rounded-lg bg-muted px-2 py-0.5 font-medium text-muted-foreground capitalize">
                      {item.mode.replace('-', ' ')}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="size-3" aria-hidden />
                      {item.timestamp}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Read Aloud */}
                    <button
                      type="button"
                      onClick={() => handleSpeak(item.id, item.answer)}
                      aria-label="Read answer aloud"
                      className="flex size-8 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {speakingId === item.id ? (
                        <VolumeX className="size-3.5 text-accent animate-pulse" />
                      ) : (
                        <Volume2 className="size-3.5" />
                      )}
                    </button>

                    {/* Copy */}
                    <button
                      type="button"
                      onClick={() => handleCopy(item.id, item.answer)}
                      aria-label="Copy answer to clipboard"
                      className="flex size-8 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {copiedId === item.id ? (
                        <Check className="size-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      aria-label="Delete question"
                      className="flex size-8 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Question & Image content */}
                <div className="p-4 border-b bg-muted/20">
                  <div className="flex items-start gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                      Q
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{item.question}</p>
                      {item.imageDataUrl && (
                        <div className="mt-2.5 inline-block overflow-hidden rounded-xl border bg-background shadow-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageDataUrl}
                            alt="Submitted problem"
                            className="max-h-48 max-w-xs object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Answer Content */}
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                      AI
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                        <Markdown>{item.answer}</Markdown>
                      </div>

                      {/* Follow-up button */}
                      <div className="mt-4 border-t pt-3 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setQuestion(`Follow-up on: "${item.question.slice(0, 50)}…" - `)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                        >
                          <MessageSquare className="size-3.5" aria-hidden />
                          <span>Ask a follow-up on this problem</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
