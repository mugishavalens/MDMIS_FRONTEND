'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch, getRefreshToken } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { rememberSignOutReason, type SignOutReason } from '@/lib/session-reason'

// Sign out after this much inactivity (override with NEXT_PUBLIC_SESSION_IDLE_MINUTES).
export const IDLE_MINUTES = Number(process.env.NEXT_PUBLIC_SESSION_IDLE_MINUTES) || 30
const WARNING_SECONDS = 60
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'wheel', 'touchstart'] as const

/** Expiry (ms since epoch) from a JWT's exp claim, or null if unreadable. */
function tokenExpiry(token: string | null): number | null {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

/**
 * Ends the session automatically:
 * - after IDLE_MINUTES without any mouse, keyboard, scroll or touch activity,
 *   with a one-minute warning the user can dismiss to stay signed in;
 * - the moment the refresh token expires, even mid-use, rather than on the
 *   next failed request.
 * The login page then explains why the user was signed out.
 */
export function SessionTimeout() {
  const { isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const lastActivity = useRef(Date.now())
  const warning = useRef(false)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  const signOut = useCallback((reason: SignOutReason) => {
    warning.current = false
    setSecondsLeft(null)
    rememberSignOutReason(reason)
    logout()
    router.replace('/login')
  }, [logout, router])
  // logout() is recreated on every render; read the latest through a ref so
  // the timer below is set up once per session, not re-armed each second.
  const signOutRef = useRef(signOut)
  useEffect(() => { signOutRef.current = signOut })

  useEffect(() => {
    if (!isAuthenticated) return
    lastActivity.current = Date.now()
    // Activity only counts until the warning is showing — from then on the
    // user has to confirm explicitly, so a stray mouse move can't keep an
    // unattended screen signed in.
    const onActivity = () => { if (!warning.current) lastActivity.current = Date.now() }
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true, capture: true }))

    const tick = window.setInterval(() => {
      const now = Date.now()
      const hardExpiry = tokenExpiry(getRefreshToken())
      if (hardExpiry !== null && now >= hardExpiry) {
        signOutRef.current('expired')
        return
      }
      const left = lastActivity.current + IDLE_MINUTES * 60_000 - now
      if (left <= 0) {
        signOutRef.current('idle')
      } else if (left <= WARNING_SECONDS * 1000) {
        warning.current = true
        setSecondsLeft(Math.ceil(left / 1000))
      }
    }, 1000)

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity, { capture: true }))
      window.clearInterval(tick)
    }
  }, [isAuthenticated])

  function staySignedIn() {
    warning.current = false
    lastActivity.current = Date.now()
    setSecondsLeft(null)
    // Touch the API so an expired access token is renewed now, not mid-task.
    apiFetch('/auth/me/').catch(() => {})
  }

  if (secondsLeft === null) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-timeout-title"
        aria-describedby="session-timeout-desc"
        className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl"
      >
        <h2 id="session-timeout-title" className="text-base font-semibold text-foreground">Are you still there?</h2>
        <p id="session-timeout-desc" className="mt-2 text-sm text-muted-foreground">
          You haven&apos;t been active for a while. For your security you&apos;ll be signed out in{' '}
          <span className="font-semibold tabular-nums text-foreground">{secondsLeft} second{secondsLeft === 1 ? '' : 's'}</span>.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => signOut('idle')}
            className="h-9 rounded-md border border-border px-4 text-sm text-foreground transition-colors hover:bg-secondary"
          >
            Sign out now
          </button>
          <button
            type="button"
            autoFocus
            onClick={staySignedIn}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  )
}
