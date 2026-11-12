'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, KeyRound, Lock } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { BrandMark } from '@/components/shell/brand-mark'

const INPUT =
  'w-full rounded-xl border border-border bg-secondary/60 px-4 py-3.5 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all'
const BUTTON =
  'w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/90 py-4 text-[15px] font-semibold text-primary-foreground hover:from-primary/90 hover:to-primary disabled:opacity-60 transition-all shadow-lg shadow-primary/25'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { requestPasswordReset, resetPassword } = useAuth()

  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resent, setResent] = useState(false)

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!email) { setError('Enter the email you sign in with.'); return }
    setError('')
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setStep('reset')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6) { setError('Enter the 6-digit code from your email.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setError('')
    setLoading(true)
    try {
      await resetPassword(email, code, password)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code.')
      setLoading(false)
    }
  }

  async function handleResend() {
    setError('')
    try {
      await requestPasswordReset(email)
      setResent(true)
      setTimeout(() => setResent(false), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend code.')
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(14,165,233,0.08),transparent_60%)]" />
      <div className="absolute inset-0 grid-backdrop opacity-[0.02]" />

      <div className="relative w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <BrandMark className="size-12 rounded-xl shadow-lg shadow-primary/20" />
          <div>
            <p className="font-mono text-base font-bold text-foreground">MDMIS</p>
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Reset Password</p>
          </div>
        </div>

        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20 mx-auto mb-6">
          <KeyRound className="size-8 text-primary" />
        </div>

        {step === 'email' ? (
          <>
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">Forgot your password?</h2>
              <p className="text-sm text-muted-foreground">
                Enter your email and we&apos;ll send you a 6-digit code to set a new one.
              </p>
            </div>
            <form onSubmit={handleEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                <input
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className={INPUT}
                />
              </div>
              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
              )}
              <button type="submit" disabled={loading} className={BUTTON}>
                {loading ? (
                  <>
                    <span className="size-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Sending…</span>
                  </>
                ) : (
                  <>
                    <span>Send reset code</span>
                    <ArrowRight className="size-5" />
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">Check your email</h2>
              <p className="text-sm text-muted-foreground">
                If <span className="font-semibold text-foreground">{email}</span> has an account, we sent it a 6-digit code.
                It expires in 10 minutes.
              </p>
            </div>
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">6-digit code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  className={`${INPUT} text-center text-2xl tracking-[0.5em]`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">New password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className={`${INPUT} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPw ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Confirm new password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  className={INPUT}
                />
              </div>
              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
              )}
              {resent && (
                <div className="rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/10 px-4 py-3 text-sm text-[var(--success)]">
                  A new code was sent.
                </div>
              )}
              <button type="submit" disabled={loading} className={BUTTON}>
                {loading ? (
                  <>
                    <span className="size-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <>
                    <span>Set new password & sign in</span>
                    <ArrowRight className="size-5" />
                  </>
                )}
              </button>
              <div className="flex items-center justify-center text-sm">
                <button type="button" onClick={handleResend} className="text-primary hover:underline font-medium">
                  Resend code
                </button>
              </div>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered it? <Link href="/login" className="text-primary hover:underline font-semibold">Back to Sign In</Link>
        </p>
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
          <Lock className="size-3" /> Resetting your password signs out your other sessions
        </div>
      </div>
    </div>
  )
}
