'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mountain, Eye, EyeOff, ArrowRight, CheckCircle2, XCircle, Lock } from 'lucide-react'
import { apiFetch, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

const ROLE_LABELS: Record<string, string> = {
  geologist: 'Geologist',
  compliance_manager: 'Compliance Officer',
  mine_manager: 'Mine Analyst',
}

function AcceptInviteForm() {
  const router = useRouter()
  const { verifyOtp, resendOtp } = useAuth()
  const token = useSearchParams().get('token') ?? ''

  const [checking, setChecking] = useState(true)
  const [invite, setInvite] = useState<{ email: string; role: string; organisation_name: string; valid: boolean } | null>(null)
  const [checkError, setCheckError] = useState('')

  const [form, setForm] = useState({ name: '', password: '', confirm: '' })
  const [code, setCode] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [error, setError] = useState('')
  const [resent, setResent] = useState(false)

  useEffect(() => {
    if (!token) { setCheckError('This invite link is missing its token.'); setChecking(false); return }
    apiFetch<{ email: string; role: string; organisation_name: string; valid: boolean }>(
      `/auth/invitations/${token}/`,
      {},
      { auth: false },
    )
      .then((data) => setInvite(data))
      .catch((err) => setCheckError(err instanceof ApiError ? err.message : 'Could not load this invitation.'))
      .finally(() => setChecking(false))
  }, [token])

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.password) { setError('Please fill in all required fields.'); return }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setError('')
    setLoading(true)
    try {
      await apiFetch(
        '/auth/accept-invite/',
        { method: 'POST', body: JSON.stringify({ token, full_name: form.name, password: form.password }) },
        { auth: false },
      )
      setStep('otp')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!invite) return
    if (code.length !== 6) { setError('Enter the 6-digit code from your email.'); return }
    setError('')
    setLoading(true)
    try {
      await verifyOtp(invite.email, code)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code.')
      setLoading(false)
    }
  }

  async function handleResend() {
    if (!invite) return
    setError('')
    try {
      await resendOtp(invite.email)
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
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Mountain className="size-6" />
          </div>
          <div>
            <p className="font-mono text-base font-bold text-foreground">MDMIS</p>
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Accept Invitation</p>
          </div>
        </div>

        {checking ? (
          <p className="text-center text-sm text-muted-foreground">Checking your invitation…</p>
        ) : step === 'otp' && invite ? (
          <div className="text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/20 border-2 border-emerald-500/30 mx-auto mb-6">
              <CheckCircle2 className="size-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Check your email</h2>
            <p className="text-sm text-muted-foreground mb-8">
              We emailed a 6-digit code to <span className="font-semibold text-foreground">{invite.email}</span> to confirm it's you.
            </p>

            <form onSubmit={handleOtpSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2 text-center">6-digit code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-3.5 text-center text-2xl tracking-[0.5em] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              {resent && (
                <div className="rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/10 px-4 py-3 text-sm text-[var(--success)]">
                  A new code was sent.
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/90 py-4 text-[15px] font-semibold text-primary-foreground hover:from-primary/90 hover:to-primary disabled:opacity-60 transition-all shadow-lg shadow-primary/25"
              >
                {loading ? (
                  <>
                    <span className="size-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Verifying…</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Enter MDMIS</span>
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
          </div>
        ) : checkError || !invite?.valid ? (
          <div className="text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10 border-2 border-destructive/20 mx-auto mb-6">
              <XCircle className="size-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Invalid invitation</h2>
            <p className="text-sm text-muted-foreground mb-8">
              {checkError || 'This invitation has expired or was already used. Ask your organisation admin to send a new one.'}
            </p>
            <Link href="/login" className="text-primary hover:underline font-semibold text-sm">Back to Sign In</Link>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">Join {invite.organisation_name}</h2>
              <p className="text-sm text-muted-foreground">
                You've been invited as <span className="font-semibold text-foreground">{ROLE_LABELS[invite.role] ?? invite.role}</span> —
                set a password for <span className="font-semibold text-foreground">{invite.email}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Full name <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-3.5 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Password <span className="text-destructive">*</span></label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-3.5 pr-12 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPw ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Confirm password <span className="text-destructive">*</span></label>
                <input
                  type="password"
                  value={form.confirm}
                  onChange={(e) => set('confirm', e.target.value)}
                  placeholder="Repeat password"
                  className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-3.5 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/90 py-4 text-[15px] font-semibold text-primary-foreground hover:from-primary/90 hover:to-primary disabled:opacity-60 transition-all shadow-lg shadow-primary/25"
              >
                {loading ? (
                  <>
                    <span className="size-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Creating account…</span>
                  </>
                ) : (
                  <>
                    <span>Accept & Create Account</span>
                    <ArrowRight className="size-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
              <Lock className="size-3" /> JWT Secured · RBAC enforced
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteForm />
    </Suspense>
  )
}
