'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, Download, ExternalLink, FileText, KeyRound, Power, X,
} from 'lucide-react'
import { StatusPill } from '@/components/shell/status-pill'
import { CHECK_LABEL, fmtBytes, fmtWhen } from '@/components/sensors/format'
import { fetchSafetyIncidents, INCIDENT_TYPE_LABEL, type SafetyIncident } from '@/lib/api/safety'
import {
  SENSOR_LABEL, fetchReadings, fetchSafetyRules, fetchSensorFiles, isLiveSensor, metricMeta, sensorFileDownloadUrl,
  type SafetyRule, type SensorDevice, type SensorFile, type SensorReading,
} from '@/lib/api/sensors'
import { cn } from '@/lib/utils'

function DrawerShell({
  title, subtitle, pill, onClose, children,
}: {
  title: string
  subtitle: React.ReactNode
  pill: React.ReactNode
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25 backdrop-blur-[2px]" onClick={onClose}>
      <aside className="flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="break-all text-sm font-semibold text-foreground">{title}</h2>
              {pill}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground">
            <X className="size-4" />
          </button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto p-5 scrollbar-thin">{children}</div>
      </aside>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  )
}

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="divide-y divide-border rounded-md border border-border">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[140px_1fr] gap-2 px-3 py-2 text-xs">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="min-w-0 break-words text-foreground">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function PathTag({ method }: { method: 'manual' | 'api' }) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium',
      method === 'api' ? 'bg-accent/15 text-accent' : 'bg-primary/15 text-primary')}>
      {method === 'api' ? 'Path 2 · From a device' : 'Path 1 · Manual upload'}
    </span>
  )
}

const METADATA_LABEL: Record<string, string> = {
  rows: 'Data rows', columns: 'Columns', bands: 'Spectral bands', width: 'Width (px)', height: 'Height (px)',
  samples_per_trace: 'Samples per trace', sample_interval_us: 'Sample interval (µs)', superblock_offset: 'HDF5 superblock offset',
  bytes: 'Raw bytes', bigtiff: 'BigTIFF',
}

// ---- File -------------------------------------------------------------------------

export function FileDetailDrawer({
  file: f, siteName, onClose,
}: {
  file: SensorFile
  siteName: (id: string) => string
  onClose: () => void
}) {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const center = f.bbox ? [(f.bbox[1] + f.bbox[3]) / 2, (f.bbox[0] + f.bbox[2]) / 2] : null
  const metadata = Object.entries(f.metadata ?? {})

  async function download() {
    setDownloading(true)
    setError('')
    try {
      window.open(await sensorFileDownloadUrl(f.id), '_blank', 'noopener')
    } catch {
      setError('Could not create a download link.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <DrawerShell
      title={f.originalFilename}
      pill={<StatusPill tone={f.status === 'validated' ? 'success' : 'danger'}>{f.status === 'validated' ? 'Accepted' : 'Rejected'}</StatusPill>}
      subtitle={<span className="flex flex-wrap items-center gap-2"><PathTag method={f.uploadMethod} />
        {SENSOR_LABEL[f.sensorType as keyof typeof SENSOR_LABEL] ?? f.sensorType} · {siteName(f.siteId)}</span>}
      onClose={onClose}
    >
      {f.status === 'rejected' ? (
        <Section title="Why it was rejected">
          <ul className="space-y-2">
            {f.errors.map((e, i) => (
              <li key={i} className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs">
                <p className="text-foreground"><span className="font-medium text-destructive">{CHECK_LABEL[e.check] ?? e.check}:</span> {e.message}</p>
                <p className="mt-1 text-muted-foreground">How to fix: {e.fix}</p>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground">Rejected files are logged but not stored. Fix the file and upload it again.</p>
        </Section>
      ) : (
        <button type="button" onClick={download} disabled={downloading}
          className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50">
          <Download className="size-3.5" /> {downloading ? 'Preparing…' : 'Download original file'}
        </button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}

      {f.warnings.length > 0 && (
        <Section title="Warnings">
          {f.warnings.map((w, i) => (
            <p key={i} className="flex items-start gap-1.5 text-xs text-primary"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {w}</p>
          ))}
        </Section>
      )}

      <Section title="Upload">
        <Facts rows={[
          ['Received', fmtWhen(f.created_at)],
          ['How', f.uploadMethod === 'api'
            ? `Pushed automatically by ${f.deviceName ?? 'a device'}`
            : `Uploaded manually by ${f.uploadedByName ?? 'a user'}`],
          ['Sensor', SENSOR_LABEL[f.sensorType as keyof typeof SENSOR_LABEL] ?? f.sensorType],
          ['Site', siteName(f.siteId)],
          ['Scan session', f.scanSessionId
            ? <Link href="/scans" className="text-primary hover:underline">{f.scanSessionId.slice(0, 8)} · open Survey Analysis</Link>
            : '— (not attached: rejected)'],
        ]} />
      </Section>

      <Section title="File">
        <Facts rows={[
          ['Format', f.fileKind ?? 'unknown'],
          ['Size', `${fmtBytes(f.sizeBytes)} (${f.sizeBytes.toLocaleString()} bytes)`],
          ['SHA-256 checksum', <span key="sha" className="font-mono text-[11px]">{f.sha256}</span>],
          ...metadata
            .filter(([k]) => k !== 'columns')
            .map(([k, v]) => [METADATA_LABEL[k] ?? k, String(v)] as [string, React.ReactNode]),
          ...(Array.isArray(f.metadata?.columns)
            ? [['Columns', (f.metadata.columns as string[]).join(', ')] as [string, React.ReactNode]]
            : []),
        ]} />
      </Section>

      <Section title="Survey area">
        {f.bbox && center ? (
          <Facts rows={[
            ['Latitude', `${f.bbox[1].toFixed(5)} → ${f.bbox[3].toFixed(5)}`],
            ['Longitude', `${f.bbox[0].toFixed(5)} → ${f.bbox[2].toFixed(5)}`],
            ['Centre', (
              <a key="map" href={`https://www.google.com/maps?q=${center[0]},${center[1]}`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 tabular-nums text-primary hover:underline">
                {center[0].toFixed(5)}, {center[1].toFixed(5)} <ExternalLink className="size-3" />
              </a>
            )],
          ]} />
        ) : (
          <p className="text-xs text-muted-foreground">No survey area recorded.</p>
        )}
      </Section>
    </DrawerShell>
  )
}

// ---- Device -----------------------------------------------------------------------

export function DeviceDetailDrawer({
  device: d, status, siteName, canManage, busy, onRotate, onToggleActive, onClose,
}: {
  device: SensorDevice
  status: { tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; label: string }
  siteName: (id: string) => string
  canManage: boolean
  busy: boolean
  onRotate: () => void
  onToggleActive: () => void
  onClose: () => void
}) {
  const live = isLiveSensor(d.sensorType)
  const [readings, setReadings] = useState<SensorReading[]>([])
  const [rules, setRules] = useState<SafetyRule[]>([])
  const [incidents, setIncidents] = useState<SafetyIncident[]>([])
  const [files, setFiles] = useState<SensorFile[]>([])

  useEffect(() => {
    if (live) {
      fetchReadings(d.id, 20).then(setReadings).catch(() => {})
      fetchSafetyRules().then(setRules).catch(() => {})
      fetchSafetyIncidents().then((all) => setIncidents(all.filter((i) => i.sourceDeviceId === d.id))).catch(() => {})
    } else {
      fetchSensorFiles().then((all) => setFiles(all.filter((f) => f.deviceId === d.id))).catch(() => {})
    }
  }, [d.id, live])

  function ruleFor(metric: string) {
    return rules.find((r) => r.metric === metric && r.enabled && r.siteId === d.siteId)
      ?? rules.find((r) => r.metric === metric && r.enabled && r.siteId === null)
  }

  const metrics = Object.keys(d.lastValues ?? {})

  return (
    <DrawerShell
      title={d.name}
      pill={<StatusPill tone={status.tone}>{status.label}</StatusPill>}
      subtitle={<span className="flex flex-wrap items-center gap-2"><PathTag method="api" />
        {SENSOR_LABEL[d.sensorType] ?? d.sensorType} · {siteName(d.siteId)}</span>}
      onClose={onClose}
    >
      {canManage && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onRotate} disabled={busy}
            className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-background/60 px-3 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-50">
            <KeyRound className="size-3.5" /> Rotate API key
          </button>
          <button type="button" onClick={onToggleActive} disabled={busy}
            className={cn('flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium disabled:opacity-50',
              d.isActive ? 'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20'
                : 'border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20')}>
            <Power className="size-3.5" /> {d.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      )}

      <Section title="Device">
        <Facts rows={[
          ['Kind', live ? 'Live sensor — sends readings continuously' : 'Survey device — sends a file after each survey'],
          ['Sensor', SENSOR_LABEL[d.sensorType] ?? d.sensorType],
          ['Site', siteName(d.siteId)],
          ['Status', status.label],
          ['Last data received', fmtWhen(d.lastSeenAt)],
          ['Registered', fmtWhen(d.created_at)],
          ['API key', <span key="k" className="font-mono">{d.apiKeyPrefix}… (full key shown only when created or rotated)</span>],
          ['Sends to', <span key="e" className="font-mono">{live ? 'POST /api/ingest/readings' : 'POST /api/ingest/files'}</span>],
        ]} />
      </Section>

      {live && (
        <>
          <Section title="Latest values vs alert limits">
            {metrics.length === 0 ? (
              <p className="text-xs text-muted-foreground">No readings received yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {metrics.map((k) => {
                  const m = metricMeta(k)
                  const v = d.lastValues[k]
                  const rule = ruleFor(k)
                  const breached = rule && (rule.comparator === 'gt' ? v > rule.threshold : v < rule.threshold)
                  return (
                    <div key={k} className={cn('rounded-md border px-3 py-2', breached ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-background/40')}>
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <p className={cn('text-sm font-semibold tabular-nums', breached ? 'text-destructive' : 'text-foreground')}>{v} {m.unit}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {rule ? `alert ${rule.comparator === 'gt' ? 'above' : 'below'} ${rule.threshold} ${m.unit}` : 'no alert rule'}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>

          <Section title={`Recent readings (${readings.length})`}>
            {readings.length === 0 ? (
              <p className="text-xs text-muted-foreground">None yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-[11px]">
                  <thead className="border-b border-border text-left text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Time</th>
                      {metrics.map((k) => <th key={k} className="px-2 py-1.5 font-medium">{metricMeta(k).label}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border tabular-nums">
                    {readings.map((r) => (
                      <tr key={r.id}>
                        <td className="whitespace-nowrap px-2 py-1 text-muted-foreground">
                          {new Date(r.recordedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        {metrics.map((k) => <td key={k} className="px-2 py-1 text-foreground">{r.values[k] ?? '—'}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section title={`Safety incidents opened by this sensor (${incidents.length})`}>
            {incidents.length === 0 ? (
              <p className="text-xs text-muted-foreground">None — no reading from this sensor has crossed an alert limit.</p>
            ) : (
              <ul className="space-y-2">
                {incidents.map((i) => (
                  <li key={i.id} className="rounded-md border border-border bg-background/40 p-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{INCIDENT_TYPE_LABEL[i.incidentType] ?? i.incidentType}</span>
                      <StatusPill tone={i.status === 'resolved' ? 'success' : i.status === 'acknowledged' ? 'info' : 'danger'}>{i.status}</StatusPill>
                    </div>
                    <p className="mt-1 text-muted-foreground">{i.description}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{fmtWhen(i.created_at)} · risk {i.riskScore}</p>
                  </li>
                ))}
                <Link href="/safety" className="inline-block text-xs text-primary hover:underline">Open Safety Incidents →</Link>
              </ul>
            )}
          </Section>
        </>
      )}

      {!live && (
        <Section title={`Files pushed by this device (${files.length})`}>
          {files.length === 0 ? (
            <p className="text-xs text-muted-foreground">This device hasn&apos;t pushed any files yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {files.map((f) => (
                <li key={f.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                  <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-foreground">{f.originalFilename}</span>
                  <span className="text-muted-foreground">{fmtBytes(f.sizeBytes)} · {fmtWhen(f.created_at)}</span>
                  <StatusPill tone={f.status === 'validated' ? 'success' : 'danger'}>{f.status === 'validated' ? 'Accepted' : 'Rejected'}</StatusPill>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </DrawerShell>
  )
}
