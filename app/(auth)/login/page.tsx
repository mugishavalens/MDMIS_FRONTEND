'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mountain, Eye, EyeOff, ArrowRight, ArrowLeft, Shield, Globe2, ScanLine, Lock } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

const REMEMBER_KEY = 'mdmis_remembered_credentials'

export default function LoginPage() {
  const router = useRouter()
  const { login, verifyOtp, resendOtp } = useAuth()
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resent, setResent] = useState(false)

  // Pre-fill from a previously remembered login, if any.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY)
      if (saved) {
        const { email: savedEmail, password: savedPassword } = JSON.parse(saved)
        setEmail(savedEmail ?? '')
        setPassword(savedPassword ?? '')
        setRememberMe(true)
      }
    } catch {
      // ignore malformed/inaccessible storage
    }
  }, [])

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { setError('Please fill in all fields.'); return }
    setError('')
    setLoading(true)
    try {
      const result = await login(email, password)
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email, password }))
      } else {
        localStorage.removeItem(REMEMBER_KEY)
      }
      if (result.verified) {
        router.push('/dashboard')
      } else {
        // Edge case: this account was created but never finished email
        // verification. Drop them into the same code-entry step.
        setStep('otp')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6) { setError('Enter the 6-digit code from your email.'); return }
    setError('')
    setLoading(true)
    try {
      await verifyOtp(email, code)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code.')
      setLoading(false)
    }
  }

  async function handleResend() {
    setError('')
    try {
      await resendOtp(email)
      setResent(true)
      setTimeout(() => setResent(false), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend code.')
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      {/* LEFT PANEL - Image Background */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/mine/mine-panorama.png"
            alt="Mining operations"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/80" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.15),transparent_60%)]" />
        </div>

        {/* Back to home - top-left brand mark, NAVEXA-style */}
        <Link
          href="/"
          className="relative z-10 flex items-center gap-3 px-8 pt-8 group w-fit"
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Mountain className="size-5" />
          </div>
          <div className="flex items-center gap-1.5 text-white/80 group-hover:text-white transition-colors">
            <ArrowLeft className="size-3.5" />
            <span className="text-sm font-medium">Back to home</span>
          </div>
        </Link>

        <div className="relative z-10 flex flex-col justify-center flex-1 px-12 max-w-lg w-full mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">MDMIS</h1>
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Mining Intelligence System</p>
            </div>
          </div>

          <p className="text-white/90 text-lg leading-relaxed mb-8 font-light">
            AI-powered subsurface detection, 3D geospatial visualization, and compliance automation for Rwanda's mining sector
          </p>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { icon: Globe2, label: '3D Subsurface Mapping', desc: 'X-Ray terrain', iconColor: 'text-cyan-400', border: 'border-cyan-500/20' },
              { icon: ScanLine, label: 'AI Classification', desc: '92.7% accuracy', iconColor: 'text-yellow-400', border: 'border-yellow-500/20' },
              { icon: Shield, label: 'OECD Compliance', desc: 'Auto reports', iconColor: 'text-emerald-400', border: 'border-emerald-500/20' },
              { icon: Lock, label: 'Multi-Tenant', desc: 'Role-based', iconColor: 'text-rose-400', border: 'border-rose-500/20' },
            ].map(({ icon: Icon, label, desc, iconColor, border }) => (
              <div key={label} className={`rounded-xl border ${border} bg-black/40 backdrop-blur-md px-4 py-4 hover:bg-black/55 transition-all`}>
                <Icon className={`size-5 mb-2 ${iconColor}`} />
                <p className="text-sm font-semibold text-white leading-tight">{label}</p>
                <p className="text-[11px] text-white/60 mt-0.5">{desc}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-white/60">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
            </span>
            <span>Kigali Operations · 12 drones · 34 sensors online</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Login Form */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center px-6 py-12 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.06),transparent_60%)]" />
        <div className="absolute inset-0 grid-backdrop opacity-[0.02]" />

        <div className="relative w-full max-w-md mx-auto">
          {/* Mobile Logo + back home */}
          <div className="flex lg:hidden items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <Mountain className="size-6" />
              </div>
              <div>
                <p className="font-mono text-base font-bold text-foreground">MDMIS</p>
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Mining Intelligence</p>
              </div>
            </div>
            <Link href="/" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-3.5" /> Home
            </Link>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-foreground mb-2">
              {step === 'credentials' ? 'Welcome back' : 'Check your email'}
            </h2>
            <p className="text-base text-muted-foreground">
              {step === 'credentials'
                ? 'Sign in to access your mining intelligence dashboard'
                : <>We emailed a 6-digit code to <span className="font-semibold text-foreground">{email}</span></>}
            </p>
          </div>

          {step === 'credentials' ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@mdmis.rw"
                  className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-3.5 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-3.5 pr-12 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
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

              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-border"
                  /> Remember me
                </label>
                <a href="#" className="text-primary hover:underline font-medium">Forgot password?</a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/90 py-4 text-[15px] font-semibold text-primary-foreground hover:from-primary/90 hover:to-primary disabled:opacity-60 transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35"
              >
                {loading ? (
                  <>
                    <span className="size-5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                    <span>Authenticating…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="size-5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-5">
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
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/90 py-4 text-[15px] font-semibold text-primary-foreground hover:from-primary/90 hover:to-primary disabled:opacity-60 transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35"
              >
                {loading ? (
                  <>
                    <span className="size-5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                    <span>Verifying…</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Sign In</span>
                    <ArrowRight className="size-5" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={() => { setStep('credentials'); setCode(''); setError('') }} className="text-muted-foreground hover:text-foreground transition-colors">
                  ← Use a different account
                </button>
                <button type="button" onClick={handleResend} className="text-primary hover:underline font-medium">
                  Resend code
                </button>
              </div>
            </form>
          )}

          {step === 'credentials' && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Need access?{' '}
              <Link href="/register" className="text-primary hover:underline font-semibold">
                Create an organisation
              </Link>
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Lock className="size-3" /> JWT Secured
            </span>
            <span className="text-border">·</span>
            <span>OECD Compliant</span>
            <span className="text-border">·</span>
            <span>RMB Certified</span>
          </div>
        </div>
      </div>
    </div>
  )
}