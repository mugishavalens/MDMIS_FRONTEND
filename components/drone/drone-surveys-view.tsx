'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ImagePlus, Loader2, Plane, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusPill } from '@/components/shell/status-pill'
import { fmtBytes, fmtWhen, inputClass } from '@/components/sensors/format'
import { DroneSurveyViewer } from '@/components/drone/drone-survey-viewer'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { can } from '@/lib/rbac'
import { fetchSites, type Site } from '@/lib/api/sites'
import {
  STAGE_LABEL, deleteSurvey, fetchOrthoUrl, getSurvey, getSurveyModel, listSurveys, listUploadableSites, uploadSurvey,
  type DroneSurvey, type SurveyModel,
} from '@/lib/api/drone-surveys'
import { checkPhoto, shrinkPhoto, type PhotoCheck } from '@/lib/shrink-photo'
import { cn } from '@/lib/utils'

const STATE_TONE = { queued: 'neutral', running: 'info', done: 'success', failed: 'danger' } as const
const POLL_MS = 5000

type Step = { phase: 'idle' } | { phase: 'shrinking'; done: number; total: number } | { phase: 'uploading'; fraction: number }

export function DroneSurveysView() {
  const { user } = useAuth()
  const canUpload = user ? can(user.role, 'sensors.upload') : false
  const canDelete = user ? user.role === 'org_admin' || user.role === 'system_admin' : false

  const [sites, setSites] = useState<Site[]>([])
  const [surveys, setSurveys] = useState<DroneSurvey[]>([])
  const [loadError, setLoadError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const refresh = useCallback(() => {
    listSurveys().then(setSurveys).catch((e) => setLoadError(e instanceof Error ? e.message : 'Could not load surveys.'))
  }, [])

  useEffect(() => {
    fetchSites().then(setSites).catch(() => {})
    refresh()
  }, [refresh])

  // poll unfinished jobs; each poll also advances the job on the backend
  const active = surveys.filter((s) => s.state === 'queued' || s.state === 'running')
  useEffect(() => {
    if (!active.length) return
    const t = setInterval(async () => {
      const updated = await Promise.all(active.map((s) => getSurvey(s.id).catch(() => s)))
      setSurveys((prev) => prev.map((s) => updated.find((u) => u.id === s.id) ?? s))
    }, POLL_MS)
    return () => clearInterval(t)
  }, [active.map((s) => s.id).join()]) // eslint-disable-line react-hooks/exhaustive-deps

  const siteName = useMemo(() => Object.fromEntries(sites.map((s) => [s.id, s.name])), [sites])
  const selected = surveys.find((s) => s.id === selectedId) ?? surveys.find((s) => s.state === 'done') ?? null

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <div className="space-y-6">
        {canUpload && (
          <NewSurveyCard
            onCreated={(s) => { setSurveys((prev) => [s, ...prev]); setSelectedId(s.id) }}
          />
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Surveys</CardTitle>
            <CardDescription>Each upload becomes a 3D block for its site.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadError && <p className="text-sm text-destructive">{loadError}</p>}
            {!loadError && surveys.length === 0 && (
              <p className="text-sm text-muted-foreground">No drone surveys yet. Upload a flight’s photos to build the first block.</p>
            )}
            {surveys.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={cn('w-full rounded-lg border p-3 text-left transition-colors',
                  selected?.id === s.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/50')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{s.label || siteName[s.site_id] || s.site_id}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{s.site_id} · {s.photo_count} photos · {fmtWhen(s.created_at)}</p>
                  </div>
                  <StatusPill tone={STATE_TONE[s.state]}>{s.state}</StatusPill>
                </div>
                {(s.state === 'queued' || s.state === 'running') && (
                  <div className="mt-2 space-y-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(s.progress * 100)}%` }} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {STAGE_LABEL[s.stage] ?? s.stage} · {Math.round(s.progress * 100)}%{s.message ? ` · ${s.message}` : ''}
                    </p>
                  </div>
                )}
                {s.state === 'failed' && <p className="mt-2 text-xs text-destructive">{s.error}</p>}
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <SurveyDetail
        survey={selected}
        siteName={selected ? siteName[selected.site_id] : undefined}
        canDelete={canDelete}
        onDeleted={(id) => { setSurveys((prev) => prev.filter((s) => s.id !== id)); setSelectedId(null) }}
      />
    </div>
  )
}

function NewSurveyCard({ onCreated }: { onCreated: (s: DroneSurvey) => void }) {
  const [editable, setEditable] = useState<{ id: string; name: string }[] | null>(null)
  useEffect(() => { listUploadableSites().then(setEditable).catch(() => setEditable([])) }, [])
  const [siteId, setSiteId] = useState('')
  const [label, setLabel] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [checks, setChecks] = useState<PhotoCheck[]>([])
  const [step, setStep] = useState<Step>({ phase: 'idle' })
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const withGps = checks.filter((c) => c.hasGps).length
  const total = files.reduce((n, f) => n + f.size, 0)

  async function pick(list: FileList | null) {
    const jpgs = Array.from(list ?? []).filter((f) => /\.jpe?g$/i.test(f.name) || f.type === 'image/jpeg')
    setFiles(jpgs)
    setError(jpgs.length < (list?.length ?? 0) ? 'Only JPEG photos are used; other files were left out.' : '')
    setChecks(await Promise.all(jpgs.map(checkPhoto)))
  }

  async function submit() {
    setError('')
    if (!siteId) return setError('Choose the site this flight covers.')
    if (files.length < 5) return setError('Choose at least 5 overlapping photos.')
    if (withGps < files.length) return setError(`${files.length - withGps} photos have no GPS position. Drone photos need geotags.`)
    try {
      const small: Blob[] = []
      for (let i = 0; i < files.length; i++) {
        setStep({ phase: 'shrinking', done: i, total: files.length })
        small.push(await shrinkPhoto(files[i]))
      }
      setStep({ phase: 'uploading', fraction: 0 })
      const survey = await uploadSurvey(siteId, label.trim(), small, files.map((f) => f.name),
        (fraction) => setStep({ phase: 'uploading', fraction }))
      onCreated(survey)
      setFiles([]); setChecks([]); setLabel('')
      if (inputRef.current) inputRef.current.value = ''
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setStep({ phase: 'idle' })
    }
  }

  const busy = step.phase !== 'idle'
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Plane className="size-4 text-primary" /> New drone survey</CardTitle>
        <CardDescription>
          Upload one flight’s photos (straight down, about 70–80% overlap, GPS on). They are shrunk in your browser first,
          keeping their GPS and camera data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="ds-site" className="text-xs font-medium text-muted-foreground">Site</label>
          <select id="ds-site" value={siteId} onChange={(e) => setSiteId(e.target.value)} className={inputClass} disabled={busy}>
            <option value="">Choose a site…</option>
            {(editable ?? []).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
          </select>
          {editable?.length === 0 && (
            <p className="text-[11px] text-muted-foreground">Your organisation has no sites of its own yet. Shared demo sites are read-only, so add a site first.</p>
          )}
        </div>
        <div className="space-y-1">
          <label htmlFor="ds-label" className="text-xs font-medium text-muted-foreground">Name (optional)</label>
          <input id="ds-label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={200}
            placeholder="e.g. North pit, June flight" className={inputClass} disabled={busy} />
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex w-full flex-col items-center gap-1 rounded-lg border border-dashed border-border px-3 py-5 text-sm text-muted-foreground hover:bg-secondary/40"
        >
          <ImagePlus className="size-5" />
          {files.length ? `${files.length} photos · ${fmtBytes(total)}` : 'Choose photos (JPEG)'}
        </button>
        <input ref={inputRef} type="file" accept="image/jpeg,.jpg,.jpeg" multiple hidden onChange={(e) => pick(e.target.files)} />
        {checks.length > 0 && (
          <p className={cn('text-xs', withGps === checks.length ? 'text-[var(--success)]' : 'text-primary')}>
            {withGps}/{checks.length} photos have a GPS position
          </p>
        )}
        {error && <p className="flex gap-1.5 text-xs text-destructive"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={busy || files.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          {step.phase === 'shrinking' ? `Shrinking photos ${step.done + 1}/${step.total}`
            : step.phase === 'uploading' ? `Uploading ${Math.round(step.fraction * 100)}%`
              : 'Upload and build 3D block'}
        </button>
      </CardContent>
    </Card>
  )
}

function SurveyDetail({ survey, siteName, canDelete, onDeleted }: {
  survey: DroneSurvey | null; siteName?: string; canDelete: boolean; onDeleted: (id: string) => void
}) {
  const [model, setModel] = useState<SurveyModel | null>(null)
  const [ortho, setOrtho] = useState<string | null>(null)
  const [error, setError] = useState('')
  const doneId = survey?.state === 'done' ? survey.id : null

  useEffect(() => {
    setModel(null); setOrtho(null); setError('')
    if (!doneId) return
    let url: string | null = null
    let live = true
    getSurveyModel(doneId).then((m) => live && setModel(m)).catch((e) => live && setError(e.message))
    fetchOrthoUrl(doneId).then((u) => { url = u; if (live) setOrtho(u) }).catch(() => {})
    return () => { live = false; if (url) URL.revokeObjectURL(url) }
  }, [doneId])

  if (!survey) {
    return (
      <Card className="flex min-h-[420px] items-center justify-center">
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          Finished surveys open here as a 3D block you can turn, with the trees on or off.
        </p>
      </Card>
    )
  }
  const st = survey.stats
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle className="truncate text-base">{survey.label || siteName || survey.site_id}</CardTitle>
          <CardDescription>{siteName ? `${siteName} · ` : ''}{survey.photo_count} photos · {fmtWhen(survey.created_at)}</CardDescription>
        </div>
        {canDelete && (
          <button
            onClick={async () => { await deleteSurvey(survey.id); onDeleted(survey.id) }}
            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
            title="Delete this survey (the site's 3D block goes back to public elevation data)"
          >
            <Trash2 className="size-3.5" /> Delete
          </button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {survey.state !== 'done' && (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            {survey.state === 'failed' ? <p className="max-w-md text-center text-destructive">{survey.error}</p> : (
              <>
                <Loader2 className="size-5 animate-spin text-primary" />
                <p>{STAGE_LABEL[survey.stage] ?? survey.stage} · {Math.round(survey.progress * 100)}%</p>
                <p className="text-xs">Large flights take a while; you can leave this page and come back.</p>
              </>
            )}
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {model && <DroneSurveyViewer model={model} orthoUrl={ortho} className="aspect-[16/10] min-h-[320px] w-full" />}
        {st && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
            {[
              ['Photos used', `${st.photos_used} / ${st.photos_total}`],
              ['Area', `${st.width_m} × ${st.depth_m} m`],
              ['Ground relief', `${st.ground_relief_m} m`],
              ['Tallest objects', `~${st.tallest_objects_m} m`],
              ['Depth measured', `${st.measured_pct}% of area`],
              ['3D points', st.dense_points.toLocaleString()],
              ['Resolution', `${st.resolution_m} m`],
              ['GPS fit', `${st.gps_fit_m} m`],
              ['Processing', `${Math.round(st.seconds / 60)} min`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-border/60 py-1">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-mono tabular-nums text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        {survey.state === 'done' && (
          <p className="text-xs text-muted-foreground">
            This survey is now the site’s terrain: the Intelligence Explorer’s 3D block shows its bare ground and orthophoto.
            Heights are relative to the drone’s GPS (no ground control points), so absolute elevation can be off by metres.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
