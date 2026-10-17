'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Edit2, LogOut, UserPlus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatHours, formatSecondsDetailed, useFocusPulse } from './store'

export function AccountMenu({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const {
    currentUser,
    accounts,
    switchAccount,
    logout,
    updateProfile,
    todayMinutes,
    todayTotalSeconds,
    sessionsToday,
    streak,
    timerRunning,
  } = useFocusPulse()

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.name)
      setEditTitle(currentUser.title)
    }
  }, [currentUser])

  // Close when clicked outside
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen, onClose])

  if (!isOpen || !currentUser) return null

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editName.trim()) return
    updateProfile(editName.trim(), editTitle.trim())
    setEditing(false)
  }

  const initials = currentUser.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="User account menu"
      className="absolute right-0 top-14 z-50 w-80 overflow-hidden rounded-3xl border bg-card/95 p-5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95"
    >
      {/* User Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br text-sm font-bold text-white shadow-md',
              currentUser.avatarColor
            )}
          >
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold">{currentUser.name}</h3>
            <p className="truncate text-xs text-muted-foreground">{currentUser.email}</p>
            <span className="mt-1 inline-block rounded-md bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
              {currentUser.title}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      {/* Edit Profile Form */}
      {editing ? (
        <form onSubmit={handleSaveProfile} className="mt-4 flex flex-col gap-2 rounded-2xl border bg-background/50 p-3">
          <label className="text-[11px] font-medium text-muted-foreground">Full Name</label>
          <input
            type="text"
            required
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="h-8 rounded-lg border bg-background px-2.5 text-xs outline-none focus:border-primary"
          />
          <label className="text-[11px] font-medium text-muted-foreground">Role / Specialty</label>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="h-8 rounded-lg border bg-background px-2.5 text-xs outline-none focus:border-primary"
          />
          <div className="mt-1 flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow"
            >
              <Check className="size-3" aria-hidden />
              Save
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex items-center justify-between border-t pt-2.5">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Edit2 className="size-3" aria-hidden />
            Edit profile
          </button>
          <span className="text-[10px] text-muted-foreground">Streak: {streak} days</span>
        </div>
      )}

      {/* Quick Stats Summary */}
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border bg-background/40 p-2.5 text-center">
        <div>
          <span className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
            Today's Focus
            {timerRunning && <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />}
          </span>
          <p className="font-mono text-sm font-semibold">{formatSecondsDetailed(todayTotalSeconds)}</p>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground">Sessions</span>
          <p className="font-mono text-sm font-semibold">{sessionsToday}</p>
        </div>
      </div>

      {/* Account Switcher List (if more than 1 account on device) */}
      {accounts.length > 1 && (
        <div className="mt-4 border-t pt-3">
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">Accounts on this device:</p>
          <div className="flex max-h-36 flex-col gap-1 overflow-y-auto">
            {accounts.map((acc) => {
              const isCurrent = currentUser?.id === acc.id
              const accInitials = acc.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => {
                    switchAccount(acc.id)
                    onClose()
                  }}
                  className={cn(
                    'flex items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition-colors',
                    isCurrent ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white bg-gradient-to-br',
                        acc.avatarColor
                      )}
                    >
                      {accInitials}
                    </span>
                    <span className="truncate">{acc.name}</span>
                  </div>
                  {isCurrent && <Check className="size-3.5 shrink-0 text-primary" aria-hidden />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="mt-4 flex flex-col gap-1.5 border-t pt-3">
        <button
          type="button"
          onClick={() => {
            logout()
            onClose()
          }}
          className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <UserPlus className="size-3.5" aria-hidden />
          Switch to another account
        </button>

        <button
          type="button"
          onClick={() => {
            logout()
            onClose()
          }}
          className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="size-3.5" aria-hidden />
          Log out
        </button>
      </div>
    </div>
  )
}
