'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle, CheckCircle2, ChevronDown, Cpu, Download, FileUp, Gauge, ListChecks, Radio, Upload, User, XCircle,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusPill } from '@/components/shell/status-pill'
import { fmtBytes, fmtWhen, inputClass } from '@/components/sensors/format'
import { DevicesPanel, LiveReadingsPanel, RulesPanel } from '@/components/sensors/sensor-devices'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { can } from '@/lib/rbac'
import { fetchSites, type Site } from '@/lib/api/sites'
import {
  FILE_SENSOR_TYPES, SENSOR_ACCEPT, SENSOR_LABEL, fetchSensorFiles, sensorFileDownloadUrl, uploadSensorFile,
  type SensorFile, type ValidationIssue,
} from '@/lib/api/sensors'
import { cn } from '@/lib/utils'

type Tab = 'uploads' | 'devices' | 'live' | 'rules'

const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: 'uploads', label: 'Uploads & log', icon: FileUp },
  { key: 'devices', label: 'Devices', icon: Cpu },
  { key: 'live', label: 'Live readings', icon: Gauge },
  { key: 'rules', label: 'Alert rules', icon: ListChecks },
]

export function SensorsView() {
  const { user } = useAuth()
  const canUpload = user ? can(user.role, 'sensors.upload') : false
  const canManage = user ? can(user.role, 'sensors.manage') : false
  const [tab, setTab] = useState<Tab>('uploads')
  const [sites, setSites] = useState<Site[]>([])

  useEffect(() => {
    fetchSites().then(setSites).catch((err) => console.error('[MDMIS] Failed to load sites:', err))
  }, [])

  const siteName = useCallback((id: string) => sites.find((s) => s.id === id)?.name ?? id, [sites])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <PathCard
          icon={Upload}
          title="Path 1 · Manual upload"
          text="A team member uploads survey files (GeoTIFF, HDF5, SEG-Y, CSV…) from the web app."
        />
        <PathCard
          icon={Radio}
          title="Path 2 · Direct from sensors"
          text="Registered devices push live readings or survey files straight into MDMIS with their own API key."
        />
      </div>

      <div className="inline-flex flex-wrap rounded-lg border border-border bg-card p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              tab === key ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === 'uploads' && <UploadsPanel sites={sites} siteName={siteName} canUpload={canUpload} />}
      {tab === 'devices' && <DevicesPanel sites={sites} siteName={siteName} canManage={canManage} />}
      {tab === 'live' && <LiveReadingsPanel siteName={siteName} />}
      {tab === 'rules' && <RulesPanel canEdit={canManage} siteName={siteName} />}
    </div>
  )
}

function PathCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-card p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/12 text-primary">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{text}</p>
      </div>
    </div>
  )
}

// ---- Uploads -----------------------------------------------------------------------

function UploadsPanel({
  sites, siteName, canUpload,
}: {
  sites: Site[]
  siteName: (id: string) => string
  canUpload: boolean
}) {
  const [files, setFiles] = useState<SensorFile[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    fetchSensorFiles()
      .then(setFiles)
      .catch((err) => console.error('[MDMIS] Failed to load sensor files:', err))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[380px_1fr]">
      {canUpload ? (
        <UploadForm sites={sites} onUploaded={load} />
      ) : (
        <Card className="border-border bg-card">
          <CardContent className="p-5 text-xs text-muted-foreground">
            Your role can view the ingestion log but not upload sensor files.
          </CardContent>
        </Card>
      )}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-sm">Ingestion log</CardTitle>
          <CardDescription>Every upload, from people and devices, including rejected files — kept permanently.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Loading…</p>
          ) : files.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">No sensor data uploaded yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {files.map((f) => <LogRow key={f.id} f={f} siteName={siteName} />)}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function UploadForm({ sites, onUploaded }: { sites: Site[]; onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [siteId, setSiteId] = useState('')
  const [sensorType, setSensorType] = useState<(typeof FILE_SENSOR_TYPES)[number]>('hyperspectral')
  const [file, setFile] = useState<File | null>(null)
  const [showBbox, setShowBbox] = useState(false)
  const [bbox, setBbox] = useState({ minLat: '', minLng: '', maxLat: '', maxLng: '' })
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: true; file: SensorFile } | { ok: false; message: string; errors: ValidationIssue[] } | null>(null)

  useEffect(() => { if (!siteId && sites[0]) setSiteId(sites[0].id) }, [sites, siteId])

  const bboxFilled = Object.values(bbox).every((v) => v !== '' && !isNaN(Number(v)))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !siteId) return
    setBusy(true)
    setResult(null)
    try {
      const uploaded = await uploadSensorFile({
        file, siteId, sensorType,
        bbox: showBbox && bboxFilled
          ? { minLat: Number(bbox.minLat), minLng: Number(bbox.minLng), maxLat: Number(bbox.maxLat), maxLng: Number(bbox.maxLng) }
          : undefined,
      })
      setResult({ ok: true, file: uploaded })
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (err) {
      const body = err instanceof ApiError ? (err.body as { errors?: ValidationIssue[] } | null) : null
      setResult({
        ok: false,
        message: err instanceof ApiError ? err.message : 'Upload failed.',
        errors: body?.errors ?? [],
      })
      if (body?.errors?.some((x) => x.check === 'geospatial')) setShowBbox(true)
    } finally {
      setBusy(false)
      onUploaded()
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-sm">Upload sensor data</CardTitle>
        <CardDescription>Files are checked immediately; valid ones join a scan session for processing.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block space-y-1 text-xs">
            <span className="text-muted-foreground">Site</span>
            <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className={inputClass}>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="block space-y-1 text-xs">
            <span className="text-muted-foreground">Sensor</span>
            <select
              value={sensorType}
              onChange={(e) => { setSensorType(e.target.value as typeof sensorType); setFile(null); if (inputRef.current) inputRef.current.value = '' }}
              className={inputClass}
            >
              {FILE_SENSOR_TYPES.map((t) => <option key={t} value={t}>{SENSOR_LABEL[t]}</option>)}
            </select>
            <span className="block text-[11px] text-muted-foreground">Accepted: {SENSOR_ACCEPT[sensorType].hint}</span>
          </label>

          <div
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-background/40 px-3 py-5 text-center transition-colors hover:border-primary/50"
          >
            <FileUp className="size-5 text-muted-foreground" />
            {file ? (
              <p className="text-xs text-foreground">{file.name} · {fmtBytes(file.size)}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Click to choose a file</p>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={SENSOR_ACCEPT[sensorType].accept}
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <button type="button" onClick={() => setShowBbox(!showBbox)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
            <ChevronDown className={cn('size-3 transition-transform', showBbox && 'rotate-180')} />
            Survey area (only needed if the file has no coordinates)
          </button>
          {showBbox && (
            <div className="grid grid-cols-2 gap-2">
              {(['minLat', 'maxLat', 'minLng', 'maxLng'] as const).map((k) => (
                <input key={k} value={bbox[k]} onChange={(e) => setBbox({ ...bbox, [k]: e.target.value })}
                  inputMode="decimal" className={inputClass}
                  placeholder={{ minLat: 'Min latitude', maxLat: 'Max latitude', minLng: 'Min longitude', maxLng: 'Max longitude' }[k]} />
              ))}
            </div>
          )}

          <button type="submit" disabled={busy || !file || !siteId}
            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-primary text-xs font-medium text-primary-foreground disabled:opacity-50">
            <Upload className="size-3.5" /> {busy ? 'Uploading & validating…' : 'Upload'}
          </button>
        </form>

        {result?.ok && (
          <div className="mt-3 space-y-1 rounded-md border border-[var(--success)]/30 bg-[var(--success)]/10 p-3 text-xs">
            <p className="flex items-center gap-1.5 font-medium text-[var(--success)]">
              <CheckCircle2 className="size-3.5" /> Accepted: {result.file.originalFilename}
            </p>
            <FileFacts f={result.file} />
          </div>
        )}
        {result && !result.ok && (
          <div className="mt-3 space-y-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs">
            <p className="flex items-center gap-1.5 font-medium text-destructive">
              <XCircle className="size-3.5" /> File rejected
            </p>
            {result.errors.length > 0 ? <IssueList issues={result.errors} /> : <p className="text-destructive">{result.message}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function IssueList({ issues }: { issues: ValidationIssue[] }) {
  return (
    <ul className="space-y-1.5">
      {issues.map((i, idx) => (
        <li key={idx}>
          <p className="text-foreground"><span className="font-mono text-[10px] uppercase text-destructive">{i.check}</span> · {i.message}</p>
          <p className="text-muted-foreground">Fix: {i.fix}</p>
        </li>
      ))}
    </ul>
  )
}

function FileFacts({ f }: { f: SensorFile }) {
  const m = f.metadata as Record<string, number | string | undefined>
  const facts = [
    f.fileKind && `format ${f.fileKind}`,
    m.rows !== undefined && `${m.rows} rows`,
    m.bands !== undefined && `${m.bands} bands`,
    m.width && m.height && `${m.width}×${m.height} px`,
    m.samples_per_trace !== undefined && `${m.samples_per_trace} samples/trace`,
    f.bbox && `area ${f.bbox[1].toFixed(4)}…${f.bbox[3].toFixed(4)}, ${f.bbox[0].toFixed(4)}…${f.bbox[2].toFixed(4)}`,
  ].filter(Boolean)
  return (
    <>
      {facts.length > 0 && <p className="text-muted-foreground">{facts.join(' · ')}</p>}
      {f.warnings.map((w, i) => (
        <p key={i} className="flex items-start gap-1 text-primary"><AlertTriangle className="mt-0.5 size-3 shrink-0" /> {w}</p>
      ))}
    </>
  )
}

function LogRow({ f, siteName }: { f: SensorFile; siteName: (id: string) => string }) {
  const [open, setOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)

  async function download() {
    setDownloading(true)
    try {
      window.open(await sensorFileDownloadUrl(f.id), '_blank', 'noopener')
    } catch (err) {
      console.error('[MDMIS] Download failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <li className="py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button type="button" onClick={() => setOpen(!open)} className="min-w-0 flex-1 text-left">
          <p className="truncate text-xs font-medium text-foreground">{f.originalFilename}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {SENSOR_LABEL[f.sensorType as keyof typeof SENSOR_LABEL] ?? f.sensorType} · {siteName(f.siteId)} · {fmtBytes(f.sizeBytes)} · {fmtWhen(f.created_at)}
          </p>
        </button>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          {f.uploadMethod === 'api'
            ? <><Radio className="size-3" /> {f.deviceName ?? 'device'}</>
            : <><User className="size-3" /> {f.uploadedByName ?? 'user'}</>}
        </span>
        <StatusPill tone={f.status === 'validated' ? 'success' : 'danger'}>{f.status}</StatusPill>
        {f.status === 'validated' && (
          <button type="button" onClick={download} disabled={downloading} title="Download (link valid 15 min)"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50">
            <Download className="size-3.5" />
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 space-y-1 rounded-md border border-border bg-background/40 p-2.5 text-[11px]">
          {f.status === 'rejected' ? <IssueList issues={f.errors} /> : <FileFacts f={f} />}
          <p className="font-mono text-muted-foreground">sha256 {f.sha256.slice(0, 16)}…</p>
          {f.scanSessionId && <p className="text-muted-foreground">Scan session <span className="font-mono">{f.scanSessionId.slice(0, 8)}</span></p>}
        </div>
      )}
    </li>
  )
}
