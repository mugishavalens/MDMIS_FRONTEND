'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertOctagon, AlertTriangle, CheckCircle2, Clock, ExternalLink, Gauge, MapPin, MessageSquarePlus, RotateCcw,
  ShieldCheck, User, X, type LucideIcon,
} from 'lucide-react'
import { StatusPill } from '@/components/shell/status-pill'
import { ApiError } from '@/lib/api'
import {
  addIncidentNote, changeIncidentStatus, fetchSafetyIncident, INCIDENT_TYPE_LABEL,
  type IncidentEvent, type IncidentStatus, type SafetyIncidentDetail,
} from '@/lib/api/safety'
import { cn } from '@/lib/utils'

export function statusMeta(s: IncidentStatus) {
  switch (s) {
    case 'resolved':
      return { tone: 'success' as const, icon: CheckCircle2, label: 'Resolved' }
    case 'acknowledged':
      return { tone: 'info' as const, icon: Clock, label: 'Acknowledged' }
    case 'escalated':
      return { tone: 'danger' as const, icon: AlertOctagon, label: 'Escalated' }
    default:
      return { tone: 'danger' as const, icon: AlertTriangle, label: 'Open' }
  }
}

export function riskTone(score: number): 'danger' | 'warning' | 'success' {
  if (score >= 70) return 'danger'
  if (score >= 40) return 'warning'
  return 'success'
}

function fmtTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'
}

function fmtDuration(fromIso: string, toIso: string | null): string {
  const mins = Math.max(0, Math.round(((toIso ? new Date(toIso).getTime() : Date.now()) - new Date(fromIso).getTime()) / 60000))
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 48) return `${hrs}h ${mins % 60}m`
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h`
}

// Sensor keys are snake_case with a unit suffix (co2_ppm, slope_angle_deg…).
const UNIT_SUFFIXES: [string, string][] = [
  ['_mm_per_h', 'mm/h'], ['_mm_s', 'mm/s'], ['_pct_lel', '% LEL'], ['_ppm', 'ppm'], ['_pct', '%'], ['_deg', '°'],
  ['_kpa', 'kPa'], ['_mm', 'mm'], ['_m', 'm'], ['_c', '°C'], ['_minutes', 'min'], ['_h', 'h'],
]

function readingLabel(key: string): { label: string; unit: string } {
  for (const [suffix, unit] of UNIT_SUFFIXES) {
    if (key.endsWith(suffix)) return { label: humanize(key.slice(0, -suffix.length)), unit }
  }
  return { label: humanize(key), unit: '' }
}

function humanize(key: string): string {
  const words = key.split('_').map((w) => (['co2', 'o2', 'ch4', 'gpr', 'ppv'].includes(w) ? w.toUpperCase() : w))
  const text = words.join(' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const EVENT_META: Record<IncidentEvent['eventType'], { label: string; dot: string }> = {
  reported: { label: 'Reported', dot: 'bg-destructive' },
  acknowledged: { label: 'Acknowledged', dot: 'bg-accent' },
  escalated: { label: 'Escalated', dot: 'bg-destructive' },
  resolved: { label: 'Resolved', dot: 'bg-[var(--success)]' },
  reopened: { label: 'Reopened', dot: 'bg-primary' },
  note: { label: 'Note', dot: 'bg-muted-foreground' },
}

type NoteAction = null | 'escalated' | 'resolved' | 'open'

const NOTE_ACTION_META: Record<Exclude<NoteAction, null>, { title: string; placeholder: string; submit: string }> = {
  escalated: { title: 'Escalate incident', placeholder: 'Why it needs escalation, and to whom (e.g. RMB inspector)', submit: 'Escalate' },
  resolved: { title: 'Resolve incident', placeholder: 'What was done to make the site safe', submit: 'Resolve' },
  open: { title: 'Reopen incident', placeholder: 'Why the hazard is back', submit: 'Reopen' },
}

export function IncidentDrawer({
  incidentId,
  siteName,
  canRespond,
  onClose,
  onChanged,
}: {
  incidentId: string
  siteName: (siteId: string) => string
  canRespond: boolean
  onClose: () => void
  onChanged: () => void
}) {
  const [incident, setIncident] = useState<SafetyIncidentDetail | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [noteAction, setNoteAction] = useState<NoteAction>(null)
  const [actionNote, setActionNote] = useState('')
  const [comment, setComment] = useState('')

  const load = useCallback(async () => {
    try {
      setIncident(await fetchSafetyIncident(incidentId))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load incident.')
    }
  }, [incidentId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function run(action: () => Promise<unknown>, after?: () => void) {
    setBusy(true)
    setError('')
    try {
      await action()
      after?.()
      await load()
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed.')
    } finally {
      setBusy(false)
    }
  }

  const i = incident
  const st = i ? statusMeta(i.status) : null
  const readings = i ? Object.entries(i.sensorReadings ?? {}) : []
  const tone = i ? riskTone(i.riskScore) : 'success'

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25 backdrop-blur-[2px]" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        aria-label="Incident details"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border p-5">
          {i && st ? (
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">{INCIDENT_TYPE_LABEL[i.incidentType] ?? i.incidentType}</h2>
                <StatusPill tone={st.tone}>{st.label}</StatusPill>
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" /> {siteName(i.siteId)} · <span className="font-mono">{i.id.slice(0, 8)}</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading incident…</p>
          )}
          <button type="button" onClick={onClose} aria-label="Close"
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            <X className="size-4" />
          </button>
        </header>

        {i && (
          <div className="flex-1 space-y-5 overflow-y-auto p-5 scrollbar-thin">
            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
            )}

            {/* risk */}
            <div className="flex items-center gap-4 rounded-md border border-border bg-background/40 p-3">
              <div className="text-center">
                <p className={cn('font-mono text-3xl font-semibold',
                  tone === 'danger' ? 'text-destructive' : tone === 'warning' ? 'text-primary' : 'text-[var(--success)]')}>
                  {i.riskScore}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">risk score</p>
              </div>
              <div className="flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn('h-full rounded-full',
                      tone === 'danger' ? 'bg-destructive' : tone === 'warning' ? 'bg-primary' : 'bg-[var(--success)]')}
                    style={{ width: `${Math.min(100, Math.max(0, i.riskScore))}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-foreground/80">{i.description || 'No description provided.'}</p>
              </div>
            </div>

            {/* response times */}
            <div className="grid grid-cols-3 gap-2.5">
              <Stat label="Reported" value={fmtDuration(i.created_at, null) + ' ago'} />
              <Stat
                label="Time to acknowledge"
                value={i.acknowledgedAt ? fmtDuration(i.created_at, i.acknowledgedAt) : 'Waiting'}
                danger={!i.acknowledgedAt && i.status !== 'resolved'}
              />
              <Stat
                label={i.status === 'resolved' ? 'Time to resolve' : 'Open for'}
                value={fmtDuration(i.created_at, i.status === 'resolved' ? i.resolvedAt : null)}
              />
            </div>

            {/* actions */}
            {canRespond && (
              <section className="space-y-2.5">
                <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Actions</h3>
                <div className="flex flex-wrap gap-2">
                  {(i.status === 'open' || i.status === 'escalated') && (
                    <ActionButton icon={ShieldCheck} disabled={busy}
                      onClick={() => run(() => changeIncidentStatus(i.id, 'acknowledged'))}>
                      Acknowledge
                    </ActionButton>
                  )}
                  {(i.status === 'open' || i.status === 'acknowledged') && (
                    <ActionButton icon={AlertOctagon} tone="danger" disabled={busy} active={noteAction === 'escalated'}
                      onClick={() => setNoteAction(noteAction === 'escalated' ? null : 'escalated')}>
                      Escalate
                    </ActionButton>
                  )}
                  {i.status !== 'resolved' && (
                    <ActionButton icon={CheckCircle2} tone="success" disabled={busy} active={noteAction === 'resolved'}
                      onClick={() => setNoteAction(noteAction === 'resolved' ? null : 'resolved')}>
                      Resolve
                    </ActionButton>
                  )}
                  {i.status === 'resolved' && (
                    <ActionButton icon={RotateCcw} disabled={busy} active={noteAction === 'open'}
                      onClick={() => setNoteAction(noteAction === 'open' ? null : 'open')}>
                      Reopen
                    </ActionButton>
                  )}
                </div>
                {noteAction && (
                  <form
                    className="space-y-2 rounded-md border border-border bg-background/40 p-3"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!actionNote.trim()) return
                      run(() => changeIncidentStatus(i.id, noteAction, actionNote.trim()), () => {
                        setNoteAction(null)
                        setActionNote('')
                      })
                    }}
                  >
                    <p className="text-xs font-medium text-foreground">{NOTE_ACTION_META[noteAction].title}</p>
                    <textarea autoFocus rows={2} value={actionNote} onChange={(e) => setActionNote(e.target.value)}
                      placeholder={NOTE_ACTION_META[noteAction].placeholder} className={textareaClass} />
                    <button type="submit" disabled={busy || !actionNote.trim()}
                      className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50">
                      {NOTE_ACTION_META[noteAction].submit}
                    </button>
                  </form>
                )}
              </section>
            )}

            {/* sensor readings */}
            <section className="space-y-2.5">
              <h3 className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Gauge className="size-3" /> Sensor readings
              </h3>
              {readings.length === 0 ? (
                <p className="text-xs text-muted-foreground">No sensor readings attached to this incident.</p>
              ) : (
                <dl className="grid grid-cols-2 gap-2">
                  {readings.map(([key, value]) => {
                    const { label, unit } = readingLabel(key)
                    return (
                      <div key={key} className="rounded-md border border-border bg-background/40 px-3 py-2">
                        <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
                        <dd className="mt-0.5 font-mono text-sm text-foreground">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          {unit && <span className="ml-1 text-xs text-muted-foreground">{unit}</span>}
                        </dd>
                      </div>
                    )
                  })}
                </dl>
              )}
            </section>

            {/* location & people */}
            <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <Info icon={MapPin} label="Location">
                <p>{siteName(i.siteId)}</p>
                {i.gpsLat !== null && i.gpsLng !== null ? (
                  <a
                    href={`https://www.google.com/maps?q=${i.gpsLat},${i.gpsLng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
                  >
                    {Number(i.gpsLat).toFixed(4)}, {Number(i.gpsLng).toFixed(4)} <ExternalLink className="size-3" />
                  </a>
                ) : (
                  <p className="text-[11px] text-muted-foreground">No GPS fix recorded</p>
                )}
              </Info>
              <Info icon={User} label="People">
                <p>Reported by {i.reportedByName ?? 'Unknown'}</p>
                <p className="text-[11px] text-muted-foreground">
                  {i.acknowledgedByName ? `Acknowledged by ${i.acknowledgedByName}` : 'Not yet acknowledged'}
                  {i.resolvedByName && ` · resolved by ${i.resolvedByName}`}
                </p>
              </Info>
            </section>

            {/* timeline */}
            <section className="space-y-2.5">
              <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">History</h3>
              <ol className="space-y-3 border-l border-border pl-4">
                {i.events.map((e) => (
                  <li key={e.id} className="relative">
                    <span className={cn('absolute -left-[21px] top-1 size-2.5 rounded-full ring-2 ring-card', EVENT_META[e.eventType]?.dot)} />
                    <p className="text-xs font-medium text-foreground">{EVENT_META[e.eventType]?.label ?? e.eventType}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {fmtTime(e.createdAt)}{e.actorName ? ` · ${e.actorName}` : ''}
                    </p>
                    {e.note && <p className="mt-0.5 whitespace-pre-wrap text-[11px] text-foreground/80">{e.note}</p>}
                  </li>
                ))}
                {i.events.length === 0 && <li className="text-xs text-muted-foreground">No history recorded.</li>}
              </ol>

              <form
                className="flex gap-2 pt-1"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!comment.trim()) return
                  run(() => addIncidentNote(i.id, comment.trim()), () => setComment(''))
                }}
              >
                <input value={comment} onChange={(e) => setComment(e.target.value)} className={inputClass}
                  placeholder="Add a field note or update…" />
                <button type="submit" disabled={busy || !comment.trim()}
                  className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-background/60 px-3 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-50">
                  <MessageSquarePlus className="size-3.5" /> Add note
                </button>
              </form>
            </section>

            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="size-3" /> Reported {fmtTime(i.created_at)}
              {i.resolvedAt && <> · resolved {fmtTime(i.resolvedAt)}</>}
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}

const inputClass = 'h-8 w-full rounded-md border border-border bg-background/60 px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary'
const textareaClass = 'w-full rounded-md border border-border bg-background/60 px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary'

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('mt-1 truncate text-sm font-semibold', danger ? 'text-destructive' : 'text-foreground')}>{value}</p>
    </div>
  )
}

function Info({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-md border border-border bg-background/40 p-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 text-xs text-foreground">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        {children}
      </div>
    </div>
  )
}

function ActionButton({
  icon: Icon, children, onClick, disabled, active, tone,
}: {
  icon: LucideIcon
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  active?: boolean
  tone?: 'success' | 'danger'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors disabled:opacity-50',
        tone === 'success'
          ? 'border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20'
          : tone === 'danger'
            ? 'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20'
            : 'border-border bg-background/60 text-foreground hover:bg-secondary',
        active && 'ring-1 ring-primary/50',
      )}
    >
      <Icon className="size-3.5" /> {children}
    </button>
  )
}
