'use client'

import { useEffect, useState } from 'react'

const COOLDOWN_SECONDS = 30

// "Resend code" with a countdown. It's only rendered on a code-entry step,
// i.e. right after a code was emailed, so the countdown starts on mount and
// restarts on every resend — no back-to-back emails (the backend also caps
// code emails at 3 per address per 15 minutes).
export function ResendCodeButton({ onResend }: { onResend: () => Promise<void> | void }) {
  const [secondsLeft, setSecondsLeft] = useState(COOLDOWN_SECONDS)

  useEffect(() => {
    if (secondsLeft <= 0) return
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secondsLeft])

  const waiting = secondsLeft > 0

  return (
    <button
      type="button"
      disabled={waiting}
      onClick={() => {
        setSecondsLeft(COOLDOWN_SECONDS)
        void onResend()
      }}
      className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline tabular-nums"
    >
      {waiting ? `Resend code in ${secondsLeft}s` : 'Resend code'}
    </button>
  )
}
