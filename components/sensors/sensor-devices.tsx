'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ChevronRight, Copy, KeyRound, Plus, Power, Radio, X } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusPill } from '@/components/shell/status-pill'
import { fmtWhen, inputClass } from '@/components/sensors/format'
import { FilterChips, FilterSelect } from '@/components/sensors/filters'
import { DeviceDetailDrawer } from '@/components/sensors/detail-drawers'
import { API_URL, ApiError } from '@/lib/api'
import type { Site } from '@/lib/api/sites'
import {
  DEVICE_SENSOR_TYPES, SENSOR_LABEL, fetchDevices, fetchReadings, fetchSafetyRules, isLiveSensor, metricMeta,
  registerDevice, rotateDeviceKey, setDeviceActive, updateSafetyRule,
  type DeviceSensorType, type SafetyRule, type SensorDevice, type SensorDeviceWithKey, type SensorReading,
} from '@/lib/api/sensors'
import { cn } from '@/lib/utils'

const LIVE_REFRESH_MS = 10_000

function deviceStatus(d: SensorDevice) {
  if (!d.isActive) return { tone: 'neutral' as const, label: 'Deactivated' }
  if (d.online) return { tone: 'success' as const, label: isLiveSensor(d.sensorType) ? 'Online' : 'Uploading' }
  if (!d.lastSeenAt) return { tone: 'warning' as const, label: 'Never connected' }
  // Survey devices (drones, rovers) upload after each survey; quiet between surveys is normal.
  if (!isLiveSensor(d.sensorType)) return { tone: 'info' as const, label: 'Standby' }
  return { tone: 'danger' as const, label: 'Offline' }
}

// ---- Devices -----------------------------------------------------------------------

export function DevicesPanel({
  sites, siteName, canManage,
}: {
  sites: Site[]
  siteName: (id: string) => string
  canManage: boolean
}) {
  const [devices, setDevices] = useState<SensorDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<{ name: string; siteId: string; sensorType: DeviceSensorType }>({ name: '', siteId: '', sensorType: 'gas' })
  const [newKey, setNewKey] = useState<SensorDeviceWithKey | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [kindF, setKindF] = useState<'all' | 'live' | 'survey'>('all')
  const [statusF, setStatusF] = useState<'all' | 'Online' | 'Offline' | 'Standby' | 'Deactivated'>('all')
  const [siteF, setSiteF] = useState('')

  const visibleDevices = devices.filter((d) =>
    (kindF === 'all' || (kindF === 'live') === isLiveSensor(d.sensorType))
    && (statusF === 'all' || deviceStatus(d).label === statusF)
    && (!siteF || d.siteId === siteF),
  )

  const load = useCallback(() => {
    fetchDevices()
      .then(setDevices)
      .catch((err) => console.error('[MDMIS] Failed to load devices:', err))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    const t = window.setInterval(load, 30_000)
    return () => window.clearInterval(t)
  }, [load])

  async function act(fn: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await fn()
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Request failed.')
    } finally {
      setBusy(false)
    }
  }

  async function register(e: React.FormEvent) {
    e.preventDefault()
    const siteId = form.siteId || sites[0]?.id
    if (!form.name.trim() || !siteId) { setError('Name and site are required.'); return }
    await act(async () => {
      const created = await registerDevice({ name: form.name.trim(), site_id: siteId, sensor_type: form.sensorType })
      setNewKey(created)
      setForm({ name: '', siteId: '', sensorType: 'gas' })
      setAdding(false)
    })
  }

  const openDevice = devices.find((d) => d.id === openId)

  return (
    <div className="space-y-4">
      {openDevice && (
        <DeviceDetailDrawer
          device={openDevice}
          status={deviceStatus(openDevice)}
          siteName={siteName}
          canManage={canManage}
          busy={busy}
          onRotate={() => act(async () => { setNewKey(await rotateDeviceKey(openDevice.id)); setOpenId(null) })}
          onToggleActive={() => act(() => setDeviceActive(openDevice.id, !openDevice.isActive))}
          onClose={() => setOpenId(null)}
        />
      )}
      {newKey && <KeyReveal device={newKey} onClose={() => setNewKey(null)} />}

      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm">Registered sensor devices</CardTitle>
            <CardDescription>Each device gets its own API key to push data directly. Online = data in the last 15 min.</CardDescription>
          </div>
          {canManage && !adding && (
            <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Plus className="size-3.5" /> Register device
            </button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {adding && (
            <form onSubmit={register} className="grid grid-cols-1 gap-2 rounded-md border border-border bg-background/40 p-3 sm:grid-cols-4">
              <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass} placeholder="Name, e.g. Gas Node Shaft 2" />
              <select value={form.siteId || sites[0]?.id || ''} onChange={(e) => setForm({ ...form, siteId: e.target.value })} className={inputClass}>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={form.sensorType} onChange={(e) => setForm({ ...form, sensorType: e.target.value as DeviceSensorType })} className={inputClass}>
                {DEVICE_SENSOR_TYPES.map((t) => <option key={t} value={t}>{SENSOR_LABEL[t]}</option>)}
              </select>
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className="h-8 flex-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50">Register</button>
                <button type="button" onClick={() => { setAdding(false); setError('') }} className="h-8 rounded-md border border-border px-2 text-xs hover:bg-secondary">Cancel</button>
              </div>
            </form>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}

          {devices.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-border bg-background/40 p-2">
              <FilterChips
                label="Kind"
                value={kindF}
                onChange={setKindF}
                options={[
                  { key: 'all', label: 'All', count: devices.length },
                  { key: 'live', label: 'Live sensors', count: devices.filter((d) => isLiveSensor(d.sensorType)).length },
                  { key: 'survey', label: 'Survey devices', count: devices.filter((d) => !isLiveSensor(d.sensorType)).length },
                ]}
              />
              <FilterChips
                label="Status"
                value={statusF}
                onChange={setStatusF}
                options={(['all', 'Online', 'Offline', 'Standby', 'Deactivated'] as const).map((k) => ({
                  key: k,
                  label: k === 'all' ? 'Any' : k,
                  count: k === 'all' ? undefined : devices.filter((d) => deviceStatus(d).label === k).length,
                }))}
              />
              <FilterSelect value={siteF} onChange={setSiteF} allLabel="All sites"
                options={[...new Set(devices.map((d) => d.siteId))].map((s) => ({ value: s, label: siteName(s) }))} />
            </div>
          )}

          {loading ? (
            <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>
          ) : devices.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">No devices registered yet.</p>
          ) : visibleDevices.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">No devices match these filters.</p>
          ) : (
            <ul className="divide-y divide-border">
              {visibleDevices.map((d) => {
                const st = deviceStatus(d)
                const values = Object.entries(d.lastValues ?? {}).slice(0, 5)
                const hover = [
                  d.name,
                  `${st.label} · ${SENSOR_LABEL[d.sensorType] ?? d.sensorType} · ${siteName(d.siteId)}`,
                  isLiveSensor(d.sensorType) ? 'Live sensor: sends readings continuously' : 'Survey device: sends a file after each survey',
                  `Last data ${fmtWhen(d.lastSeenAt)}`,
                  'Click for full details',
                ].join('\n')
                return (
                  <li
                    key={d.id}
                    role="button"
                    tabIndex={0}
                    title={hover}
                    onClick={() => setOpenId(d.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenId(d.id) } }}
                    className="-mx-2 flex cursor-pointer flex-wrap items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-md',
                      d.online ? 'bg-[var(--success)]/12 text-[var(--success)]' : 'bg-secondary/70 text-muted-foreground')}>
                      <Radio className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground">{d.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {SENSOR_LABEL[d.sensorType] ?? d.sensorType} · {siteName(d.siteId)} · key <span className="font-mono">{d.apiKeyPrefix}…</span>
                      </p>
                      {values.length > 0 && (
                        <p className="mt-1 flex flex-wrap gap-1.5">
                          {values.map(([k, v]) => {
                            const m = metricMeta(k)
                            return (
                              <span key={k} className="rounded bg-secondary/70 px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                                {m.label} {v}{m.unit && ` ${m.unit}`}
                              </span>
                            )
                          })}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-[11px] text-muted-foreground">
                      <StatusPill tone={st.tone}>{st.label}</StatusPill>
                      <p className="mt-1">Last data {fmtWhen(d.lastSeenAt)}</p>
                    </div>
                    {canManage && (
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        <button type="button" title="Rotate API key" disabled={busy}
                          onClick={() => act(async () => setNewKey(await rotateDeviceKey(d.id)))}
                          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50">
                          <KeyRound className="size-3.5" />
                        </button>
                        <button type="button" title={d.isActive ? 'Deactivate' : 'Activate'} disabled={busy}
                          onClick={() => act(() => setDeviceActive(d.id, !d.isActive))}
                          className={cn('flex size-7 items-center justify-center rounded-md hover:bg-secondary disabled:opacity-50',
                            d.isActive ? 'text-muted-foreground hover:text-destructive' : 'text-[var(--success)]')}>
                          <Power className="size-3.5" />
                        </button>
                      </div>
                    )}
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function KeyReveal({ device, onClose }: { device: SensorDeviceWithKey; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null)
  const live = isLiveSensor(device.sensorType)

  const curl = live
    ? `curl -X POST ${API_URL}/ingest/readings \\\n  -H "X-Device-Key: ${device.apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"readings":[{"values":{"co_ppm":12.4,"o2_pct":20.8}}]}'`
    : `curl -X POST ${API_URL}/ingest/files \\\n  -H "X-Device-Key: ${device.apiKey}" \\\n  -F "file=@survey_file.tif"`
  const sim = `python -m app.ingestion.simulate --key ${device.apiKey} --type ${device.sensorType === 'geotechnical' ? 'geotechnical' : 'gas'} --api ${API_URL}`

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      window.setTimeout(() => setCopied(null), 1500)
    } catch {
      // clipboard blocked: the text is selectable on screen
    }
  }

  return (
    <Card className="border-primary/40 bg-card">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">API key for {device.name}</p>
            <p className="text-xs text-destructive">Copy it now — for security it is never shown again. Rotate the key if it is lost.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary">
            <X className="size-4" />
          </button>
        </div>
        <CopyBlock label="key" text={device.apiKey} copied={copied} onCopy={copy} />
        <p className="text-[11px] text-muted-foreground">
          {live ? 'Configure the device (or its gateway) to send readings like this:' : 'The device uploads survey files like this:'}
        </p>
        <CopyBlock label="curl" text={curl} copied={copied} onCopy={copy} multiline />
        {live && (
          <>
            <p className="text-[11px] text-muted-foreground">No hardware yet? Run the simulator from the backend folder (add <span className="font-mono">--spike</span> to trigger an alert):</p>
            <CopyBlock label="sim" text={sim} copied={copied} onCopy={copy} multiline />
          </>
        )}
      </CardContent>
    </Card>
  )
}

function CopyBlock({
  label, text, copied, onCopy, multiline,
}: {
  label: string
  text: string
  copied: string | null
  onCopy: (label: string, text: string) => void
  multiline?: boolean
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-background/60 p-2">
      <pre className={cn('min-w-0 flex-1 overflow-x-auto font-mono text-[11px] text-foreground', multiline ? 'whitespace-pre' : 'whitespace-nowrap')}>{text}</pre>
      <button type="button" onClick={() => onCopy(label, text)} title="Copy"
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground">
        {copied === label ? <Check className="size-3.5 text-[var(--success)]" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  )
}

// ---- Live readings -----------------------------------------------------------------

export function LiveReadingsPanel({ siteName }: { siteName: (id: string) => string }) {
  const [devices, setDevices] = useState<SensorDevice[]>([])
  const [rules, setRules] = useState<SafetyRule[]>([])
  const [deviceId, setDeviceId] = useState('')
  const [readings, setReadings] = useState<SensorReading[]>([])

  useEffect(() => {
    Promise.all([fetchDevices(), fetchSafetyRules()])
      .then(([d, r]) => {
        const live = d.filter((x) => isLiveSensor(x.sensorType))
        setDevices(live)
        setRules(r)
        setDeviceId((cur) => cur || live[0]?.id || '')
      })
      .catch((err) => console.error('[MDMIS] Failed to load live devices:', err))
  }, [])

  useEffect(() => {
    if (!deviceId) return
    let cancelled = false
    const load = () => fetchReadings(deviceId).then((r) => { if (!cancelled) setReadings(r) }).catch(() => {})
    load()
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') load() }, LIVE_REFRESH_MS)
    return () => { cancelled = true; window.clearInterval(t) }
  }, [deviceId])

  const device = devices.find((d) => d.id === deviceId)
  const series = useMemo(() => {
    const chrono = [...readings].reverse()
    const keys = new Set<string>()
    chrono.forEach((r) => Object.keys(r.values).forEach((k) => keys.add(k)))
    return [...keys].map((k) => ({
      key: k,
      points: chrono.filter((r) => typeof r.values[k] === 'number').map((r) => r.values[k]),
      latest: readings.find((r) => typeof r.values[k] === 'number')?.values[k],
    }))
  }, [readings])

  function ruleFor(metric: string) {
    return rules.find((r) => r.metric === metric && r.enabled && r.siteId === device?.siteId)
      ?? rules.find((r) => r.metric === metric && r.enabled && r.siteId === null)
  }

  if (devices.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-6 text-center text-xs text-muted-foreground">
          No live sensors yet. Register a <span className="text-foreground">gas</span> or <span className="text-foreground">slope/displacement</span> device in the Devices tab.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle className="text-sm">Live readings</CardTitle>
          <CardDescription>
            {device ? `${siteName(device.siteId)} · refreshes every 10 s · last data ${fmtWhen(device.lastSeenAt)}` : ''}
          </CardDescription>
        </div>
        <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)} className={cn(inputClass, 'w-auto min-w-48')}>
          {devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </CardHeader>
      <CardContent>
        {series.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No readings received from this device yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {series.map((s) => {
              const m = metricMeta(s.key)
              const rule = ruleFor(s.key)
              const breached = rule && s.latest !== undefined
                && (rule.comparator === 'gt' ? s.latest > rule.threshold : s.latest < rule.threshold)
              return (
                <div key={s.key} className={cn('rounded-md border p-3', breached ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-background/40')}>
                  <div className="flex items-baseline justify-between">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{m.label}</p>
                    {rule && (
                      <p className="text-[10px] text-muted-foreground">limit {rule.comparator === 'gt' ? '>' : '<'} {rule.threshold} {m.unit}</p>
                    )}
                  </div>
                  <p className={cn('font-mono text-xl font-semibold', breached ? 'text-destructive' : 'text-foreground')}>
                    {s.latest ?? '—'} <span className="text-xs font-normal text-muted-foreground">{m.unit}</span>
                  </p>
                  <Sparkline points={s.points} threshold={rule?.threshold} danger={!!breached} />
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Sparkline({ points, threshold, danger }: { points: number[]; threshold?: number; danger: boolean }) {
  if (points.length < 2) return <div className="mt-2 h-10" />
  const W = 200
  const H = 40
  const vals = threshold !== undefined ? [...points, threshold] : points
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const y = (v: number) => H - 3 - ((v - min) / span) * (H - 6)
  const path = points.map((v, i) => `${(i / (points.length - 1)) * W},${y(v)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-10 w-full" preserveAspectRatio="none" aria-hidden>
      {threshold !== undefined && (
        <line x1="0" x2={W} y1={y(threshold)} y2={y(threshold)} stroke="var(--destructive)" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
      )}
      <polyline points={path} fill="none" stroke={danger ? 'var(--destructive)' : 'var(--primary)'} strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

// ---- Alert rules -------------------------------------------------------------------

export function RulesPanel({ canEdit, siteName }: { canEdit: boolean; siteName: (id: string) => string }) {
  const [rules, setRules] = useState<SafetyRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const load = useCallback(() => {
    fetchSafetyRules()
      .then(setRules)
      .catch((err) => console.error('[MDMIS] Failed to load rules:', err))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function save(rule: SafetyRule, patch: Parameters<typeof updateSafetyRule>[1]) {
    setError('')
    try {
      const updated = await updateSafetyRule(rule.id, patch)
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the rule.')
    }
  }

  function commitThreshold(rule: SafetyRule) {
    const raw = drafts[rule.id]
    if (raw === undefined) return
    const value = Number(raw)
    setDrafts((d) => { const { [rule.id]: _, ...rest } = d; return rest })
    if (raw.trim() === '' || isNaN(value) || value === rule.threshold) return
    save(rule, { threshold: value })
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-sm">Safety alert rules</CardTitle>
        <CardDescription>
          When a live reading crosses a limit, MDMIS opens a Safety Incident automatically (one per rule until it is resolved).
          {!canEdit && ' Only mine managers and org admins can change limits.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
        {loading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-xs">
              <thead className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 font-medium">Metric</th>
                  <th className="px-2 py-2 font-medium">Alert when</th>
                  <th className="px-2 py-2 font-medium">Applies to</th>
                  <th className="px-2 py-2 font-medium">Risk score</th>
                  <th className="px-2 py-2 font-medium">Enabled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rules.map((r) => {
                  const m = metricMeta(r.metric)
                  return (
                    <tr key={r.id} className={cn(!r.enabled && 'opacity-50')}>
                      <td className="px-2 py-2 font-medium text-foreground">{m.label}<span className="ml-1 font-mono text-[10px] text-muted-foreground">{r.metric}</span></td>
                      <td className="px-2 py-2">
                        <span className="flex items-center gap-1.5">
                          {r.comparator === 'gt' ? 'above' : 'below'}
                          {canEdit ? (
                            <input
                              value={drafts[r.id] ?? String(r.threshold)}
                              onChange={(e) => setDrafts({ ...drafts, [r.id]: e.target.value })}
                              onBlur={() => commitThreshold(r)}
                              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                              inputMode="decimal"
                              className={cn(inputClass, 'h-7 w-20 font-mono')}
                            />
                          ) : (
                            <span className="font-mono text-foreground">{r.threshold}</span>
                          )}
                          <span className="text-muted-foreground">{m.unit}</span>
                        </span>
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">{r.siteId ? siteName(r.siteId) : 'All sites'}</td>
                      <td className="px-2 py-2 font-mono">{r.riskScore}</td>
                      <td className="px-2 py-2">
                        <input type="checkbox" checked={r.enabled} disabled={!canEdit}
                          onChange={(e) => save(r, { enabled: e.target.checked })} className="size-4 accent-[var(--primary)]" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
