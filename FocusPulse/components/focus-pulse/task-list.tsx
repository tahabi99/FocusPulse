'use client'

import { useState } from 'react'
import { Check, ListChecks, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFocusPulse } from './store'

export function TaskList() {
  const { tasks, addTask, toggleTask, deleteTask, completionRate } = useFocusPulse()
  const [draft, setDraft] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const title = draft.trim().slice(0, 120)
    if (!title) return
    addTask(title)
    setDraft('')
  }

  const remaining = tasks.filter((t) => !t.done).length

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section aria-label="Daily study goals" className="rounded-3xl border bg-card p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">{"Today's goals"}</h2>
            <p className="text-xs text-muted-foreground">
              {remaining === 0 ? 'All done — great work!' : `${remaining} remaining`}
            </p>
          </div>
          <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">{completionRate}% done</span>
        </div>

        <form onSubmit={submit} className="mb-5 flex gap-2">
          <label htmlFor="new-task" className="sr-only">
            New study task
          </label>
          <input
            id="new-task"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={120}
            placeholder="Add a study task, e.g. Read chapter 5"
            className="h-11 flex-1 rounded-xl border bg-background/60 px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="flex h-11 items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-[oklch(0.58_0.2_300)] px-4 text-sm font-medium text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
          >
            <Plus className="size-4" aria-hidden />
            <span className="hidden sm:inline">Add</span>
          </button>
        </form>

        {tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-12 text-center">
            <ListChecks className="size-8 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">No tasks yet. Add your first study goal above.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="group flex items-center gap-3 rounded-2xl border bg-background/40 p-3 transition-all hover:border-primary/30 hover:bg-background/80 animate-in fade-in slide-in-from-top-1"
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={task.done}
                  aria-label={`Mark "${task.title}" as ${task.done ? 'incomplete' : 'complete'}`}
                  onClick={() => toggleTask(task.id)}
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all',
                    task.done ? 'border-accent bg-accent text-accent-foreground' : 'border-muted-foreground/40 hover:border-accent',
                  )}
                >
                  {task.done && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
                </button>
                <span
                  className={cn(
                    'flex-1 text-sm transition-colors',
                    task.done && 'text-muted-foreground line-through decoration-accent/60',
                  )}
                >
                  {task.title}
                </span>
                <button
                  type="button"
                  onClick={() => deleteTask(task.id)}
                  aria-label={`Delete "${task.title}"`}
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground opacity-100 transition-all hover:bg-destructive/15 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Goal progress" className="flex flex-col gap-4 rounded-3xl border bg-gradient-to-br from-accent/10 via-card to-primary/10 p-6">
        <h2 className="text-sm font-semibold">Progress</h2>
        <div className="flex items-center justify-center py-4">
          <div
            className="relative flex size-40 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(var(--accent) ${completionRate * 3.6}deg, var(--muted) 0deg)`,
            }}
            role="img"
            aria-label={`${completionRate}% of goals completed`}
          >
            <div className="flex size-32 flex-col items-center justify-center rounded-full bg-card">
              <span className="text-3xl font-semibold">{completionRate}%</span>
              <span className="text-xs text-muted-foreground">complete</span>
            </div>
          </div>
        </div>
        <p className="text-pretty text-center text-sm text-muted-foreground">
          Break big subjects into small, specific tasks — they are easier to start and more satisfying to check off.
        </p>
      </section>
    </div>
  )
}
