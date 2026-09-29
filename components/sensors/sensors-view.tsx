'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Download, FileUp, Plus, Radio, Upload, User, X, XCircle, type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusPill } from '@/components/shell/status-pill'
import { FileDetailDrawer } from '@/components/sensors/detail-drawers'
import { CHECK_LABEL, fmtBytes, fmtWhen, inputClass } from '@/components/sensors/format'
import { FilterChips, FilterSelect } from '@/components/sensors/filters'
import { DevicesPanel, LiveReadingsPanel, RulesPanel } from '@/components/sensors/sensor-devices'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { can } from '@/lib/rbac'
import { fetchSites, type Site } from '@/lib/api/sites'
import {
  FILE_SENSOR_TYPES, SENSOR_ACCEPT, SENSOR_LABEL, fetchDevices, fetchSensorFiles, isLiveSensor, sensorFileDownloadUrl,
  uploadSensorFile,
  type SensorFile, type ValidationIssue,
} from '@/lib/api/sensors'
import { cn } from '@/lib/utils'

type Path = 'manual' | 'direct'
type DirectTab = 'devices' | 'live' | 'files' | 'rules'

const DIRECT_TABS: { key: DirectTab; label: string }[] = [
  { key: 'devices', label: 'Devices' },
  { key: 'live', label: 'Live readings' },
  { key: 'files', label: 'Files pushed by devices' },
  { key: 'rules', label: 'Alert rules' },
]

const PATHS: Record<Path, { n: number; icon: LucideIcon; title: string; who: string; text: string }> = {
  manual: {
    n: 1, icon: Upload, title: 'Manual upload', who: 'A person, from the web app',
    text: 'Someone on the team uploads survey files after fieldwork — GeoTIFF, HDF5, SEG-Y, CSV…',
  },
  direct: {
    n: 2, icon: Radio, title: 'Direct from sensors', who: 'A device, automatically',
    text: 'Registered sensors send data on their own using an API key — live readings or survey files, no person involved.',
  },
}

export function SensorsView() {
  const { user } = useAuth()
  const canUpload = user ? can(user.role, 'sensors.upload') : false
  const canManage = user ? can(user.role, 'sensors.manage') : false
  const [path, setPath] = useState<Path>('manual')
  const [directTab, setDirectTab] = useState<DirectTab>('devices')
  const [sites, setSites] = useState<Site[]>([])

  const [stats, setStats] = useState<Record<Path, string> | null>(null)

  useEffect(() => {
    fetchSites().then(setSites).catch((err) => console.error('[MDMIS] Failed to load sites:', err))
    Promise.all([fetchSensorFiles(), fetchDevices()])
      .then(([files, devices]) => {
        const manual = files.filter((f) => f.uploadMethod === 'manual')
        const rejected = manual.filter((f) => f.status === 'rejected').length
        const live = devices.filter((d) => d.isActive && isLiveSensor(d.sensorType))
        const pushed = files.filter((f) => f.uploadMethod === 'api').length
        setStats({
          manual: `${manual.length} file${manual.length === 1 ? '' : 's'} uploaded · ${rejected} rejected`,
          direct: `${devices.length} device${devices.length === 1 ? '' : 's'} · ${live.filter((d) => d.online).length} of ${live.length} live sensors online · ${pushed} file${pushed === 1 ? '' : 's'} pushed`,
        })
      })
      .catch(() => {})
  }, [])

  const siteName = useCallback((id: string) => sites.find((s) => s.id === id)?.name ?? id, [sites])

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">
          How is the data getting in? Choose a path
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2" role="tablist" aria-label="Ingestion path">
          {(Object.keys(PATHS) as Path[]).map((key) => (
            <PathCard key={key} path={key} selected={path === key} stat={stats?.[key]} onSelect={() => setPath(key)} />
          ))}
        </div>
      </div>

      {path === 'manual' && (
        <UploadsPanel sites={sites} siteName={siteName} canUpload={canUpload} method="manual" />
      )}

      {path === 'direct' && (
        <>
          <div className="inline-flex flex-wrap rounded-lg border border-border bg-card p-1">
            {DIRECT_TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setDirectTab(key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  directTab === key ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {directTab === 'devices' && <DevicesPanel sites={sites} siteName={siteName} canManage={canManage} />}
          {directTab === 'live' && <LiveReadingsPanel siteName={siteName} />}
          {directTab === 'files' && <UploadsPanel sites={sites} siteName={siteName} canUpload={false} method="api" />}
          {directTab === 'rules' && <RulesPanel canEdit={canManage} siteName={siteName} />}
        </>
      )}
    </div>
  )
}

function PathCard({ path, selected, stat, onSelect }: { path: Path; selected: boolean; stat?: string; onSelect: () => void }) {
  const { n, icon: Icon, title, who, text } = PATHS[path]
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        'relative flex gap-3 rounded-lg border p-4 text-left transition-colors',
        selected
          ? 'border-primary bg-primary/8 ring-1 ring-primary'
          : 'border-border bg-card opacity-80 hover:border-primary/40 hover:opacity-100',
      )}
    >
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-md',
        selected ? 'bg-primary text-primary-foreground' : 'bg-primary/12 text-primary')}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium',
            selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')}>
            Path {n}
          </span>
          {title}
        </p>
        <p className="mt-0.5 text-[11px] font-medium text-foreground/80">{who}</p>
        <p className="mt-1 text-xs text-muted-foreground">{text}</p>
        {stat && <p className="mt-2 text-xs font-medium tabular-nums text-foreground">{stat}</p>}
      </div>
      {selected && (
        <span className="absolute right-3 top-3 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
          Selected
        </span>
      )}
    </button>
  )
}

// ---- Uploads -----------------------------------------------------------------------

function UploadsPanel({
  sites, siteName, canUpload, method,
}: {
  sites: Site[]
  siteName: (id: string) => string
  canUpload: boolean
  method: 'manual' | 'api'
}) {
  const [files, setFiles] = useState<SensorFile[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    fetchSensorFiles()
      .then((all) => setFiles(all.filter((f) => f.uploadMethod === method)))
      .catch((err) => console.error('[MDMIS] Failed to load sensor files:', err))
      .finally(() => setLoading(false))
  }, [method])

  useEffect(() => { load() }, [load])

  const [statusF, setStatusF] = useState<'all' | 'validated' | 'rejected'>('all')
  const [sensorF, setSensorF] = useState('')
  const [siteF, setSiteF] = useState('')
  const visible = files.filter((f) =>
    (statusF === 'all' || f.status === statusF) && (!sensorF || f.sensorType === sensorF) && (!siteF || f.siteId === siteF),
  )
  const sensorsPresent = [...new Set(files.map((f) => f.sensorType))]
  const sitesPresent = [...new Set(files.map((f) => f.siteId))]

  const manual = method === 'manual'
  const [showUpload, setShowUpload] = useState(false)
  const [openFile, setOpenFile] = useState<SensorFile | null>(null)

  const log = (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle className="text-sm">{manual ? 'Manual upload log' : 'Files pushed by devices'}</CardTitle>
          <CardDescription>
            {manual
              ? 'Every file uploaded by a person, including rejected ones — kept permanently. Click a file for full details.'
              : 'Survey files sent automatically by registered devices (e.g. a drone after each flight). Click a file for full details.'}
          </CardDescription>
        </div>
        {manual && canUpload && !showUpload && (
          <button type="button" onClick={() => setShowUpload(true)} className="flex items-center gap-1 text-xs text-primary hover:underline">
            <Plus className="size-3.5" /> Upload file
          </button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {manual && showUpload && (
          <UploadForm sites={sites} onUploaded={load} onClose={() => setShowUpload(false)} />
        )}
        {files.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-border bg-background/40 p-2">
            <FilterChips
              label="Status"
              value={statusF}
              onChange={setStatusF}
              options={[
                { key: 'all', label: 'All', count: files.length },
                { key: 'validated', label: 'Accepted', count: files.filter((f) => f.status === 'validated').length },
                { key: 'rejected', label: 'Rejected', count: files.filter((f) => f.status === 'rejected').length },
              ]}
            />
            <FilterSelect value={sensorF} onChange={setSensorF} allLabel="All sensors"
              options={sensorsPresent.map((s) => ({ value: s, label: SENSOR_LABEL[s as keyof typeof SENSOR_LABEL] ?? s }))} />
            <FilterSelect value={siteF} onChange={setSiteF} allLabel="All sites"
              options={sitesPresent.map((s) => ({ value: s, label: siteName(s) }))} />
          </div>
        )}
        {loading ? (
          <p className="py-8 text-center text-xs text-muted-foreground">Loading…</p>
        ) : files.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            {manual ? 'No files uploaded yet.' : 'No device has pushed a file yet.'}
          </p>
        ) : visible.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">No files match these filters.</p>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((f) => <LogRow key={f.id} f={f} siteName={siteName} onOpen={() => setOpenFile(f)} />)}
          </ul>
        )}
      </CardContent>
    </Card>
  )

  return (
    <>
      {log}
      {openFile && <FileDetailDrawer file={openFile} siteName={siteName} onClose={() => setOpenFile(null)} />}
    </>
  )
}

function UploadForm({ sites, onUploaded, onClose }: { sites: Site[]; onUploaded: () => void; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [siteId, setSiteId] = useState('')
  const [sensorType, setSensorType] = useState<(typeof FILE_SENSOR_TYPES)[number]>('hyperspectral')
  const [file, setFile] = useState<File | null>(null)
  const [showBbox, setShowBbox] = useState(false)
  const [bbox, setBbox] = useState({ minLat: '', minLng: '', maxLat: '', maxLng: '' })
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: true; file: SensorFile } | { ok: false; message: string; errors: ValidationIssue[] } | null>(null)

  useEffect(() => { if (!siteId && sites[0]) setSiteId(sites[0].id) }, [sites, siteId])

  // Pop-up behaviour: Esc closes, the page behind doesn't scroll.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Upload sensor data"
      onClick={(e) => e.stopPropagation()}
      className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-2xl scrollbar-thin"
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">Upload sensor data</p>
          <p className="text-xs text-muted-foreground">Files are checked immediately; valid ones join a scan session for processing.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close upload"
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
      <div>
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
      </div>
    </div>
    </div>
  )
}

function IssueList({ issues }: { issues: ValidationIssue[] }) {
  return (
    <ul className="space-y-1.5">
      {issues.map((i, idx) => (
        <li key={idx}>
          <p className="text-foreground"><span className="font-medium text-destructive">{CHECK_LABEL[i.check] ?? i.check}:</span> {i.message}</p>
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

function LogRow({ f, siteName, onOpen }: { f: SensorFile; siteName: (id: string) => string; onOpen: () => void }) {
  const [downloading, setDownloading] = useState(false)
  const sensor = SENSOR_LABEL[f.sensorType as keyof typeof SENSOR_LABEL] ?? f.sensorType
  const hover = [
    f.originalFilename,
    `${f.status === 'validated' ? 'Accepted' : 'Rejected'} · ${sensor} · ${siteName(f.siteId)}`,
    f.uploadMethod === 'api' ? `Pushed by device ${f.deviceName ?? ''}` : `Uploaded by ${f.uploadedByName ?? 'a user'}`,
    `${fmtBytes(f.sizeBytes)} · ${fmtWhen(f.created_at)}`,
    f.status === 'rejected' && f.errors[0] ? `Reason: ${f.errors[0].message}` : '',
    'Click for full details',
  ].filter(Boolean).join('\n')

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
    <li
      role="button"
      tabIndex={0}
      title={hover}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
      className="-mx-2 cursor-pointer rounded-md px-2 py-2.5 transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">{f.originalFilename}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {sensor} · {siteName(f.siteId)} · {fmtBytes(f.sizeBytes)} · {fmtWhen(f.created_at)}
          </p>
          {f.status === 'rejected' && f.errors[0] && (
            <p className="truncate text-[11px] text-destructive">{f.errors[0].message}</p>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {f.uploadMethod === 'api' ? f.deviceName ?? 'Device' : f.uploadedByName ?? 'User'}
        </span>
        <StatusPill tone={f.status === 'validated' ? 'success' : 'danger'}>{f.status === 'validated' ? 'Accepted' : 'Rejected'}</StatusPill>
        {f.status === 'validated' ? (
          <button type="button" onClick={(e) => { e.stopPropagation(); download() }} disabled={downloading} title="Download (link valid 15 min)"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50">
            <Download className="size-3.5" />
          </button>
        ) : (
          <span className="size-7" />
        )}
        <ChevronRight className="size-4 text-muted-foreground" />
      </div>
    </li>
  )
}
