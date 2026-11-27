'use client'

import {
  Boxes, ChevronRight, Drill, Gauge, Layers, Mountain, ShieldAlert, type LucideIcon,
} from 'lucide-react'
import { MINERAL_META, fmtNumber, timeAgo } from '@/lib/mdmis-data'
import type { Site } from '@/lib/api/sites'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function Metric({ icon: Icon, label, value, sub }: {
  icon: LucideIcon; label: string; value: string; sub: string
}) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-2.5">
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" /> {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p>
      <p className="truncate text-[10px] text-muted-foreground">{sub}</p>
    </div>
  )
}

/** A site's mineral, subsurface, scan and safety details, plus the way into its terrain block. */
export function SiteDetails({ site, inspecting, onInspect }: {
  site: Site
  /** the terrain block for this site is already open */
  inspecting: boolean
  onInspect: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        <Metric icon={Boxes} label="Primary mineral" value={site.primaryMineral} sub={MINERAL_META[site.primaryMineral]?.commodity ?? '—'} />
        <Metric icon={Gauge} label="Ore grade" value={`${site.gradePct}%`} sub={`${site.confidence}% AI conf.`} />
      </div>

      <div className="rounded-md border border-border bg-background/40 p-3">
        <div className="mb-2 flex items-center gap-2">
          <Drill className="size-3.5 text-primary" />
          <p className="text-xs font-medium text-foreground">Subsurface Profile</p>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Depth to deposit</span>
            <span className="font-mono text-foreground">{site.depthMeters}m</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Est. reserve</span>
            <span className="font-mono text-foreground">{fmtNumber(site.estimatedTonnage)} t</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Geological layer</span>
            <span className="font-mono text-foreground">
              {site.depthMeters < 30 ? 'Weathered Zone' : site.depthMeters < 60 ? 'Saprolite' : 'Bedrock'}
            </span>
          </div>
          <div className="pt-1">
            <div className="relative h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-accent to-[#9b6dff]"
                style={{ width: `${Math.min((site.depthMeters / 100) * 100, 100)}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
              <span>0m</span><span>50m</span><span>100m+</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Metric icon={Layers} label="Scan method"
          value={site.lastScanMethod || 'Unknown'}
          sub={timeAgo(site.lastScan)} />
        <Metric icon={ShieldAlert} label="Safety score"
          value={`${site.safetyScore}/100`} sub={site.safetyScore > 70 ? 'Stable' : 'Monitor'} />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <ShieldAlert className="size-3" /> Stability
          </span>
          <span className={cn('font-mono font-semibold',
            site.safetyScore >= 80 ? 'text-[var(--success)]' :
            site.safetyScore >= 60 ? 'text-primary' : 'text-destructive')}>
            {site.safetyScore}%
          </span>
        </div>
        <Progress value={site.safetyScore} className="h-1.5" />
      </div>

      {site.secondaryMinerals.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {site.secondaryMinerals.map((m) => (
            <span key={m} className="rounded border border-border bg-secondary/60 px-2 py-0.5 text-[10px] text-muted-foreground">
              + {m}
            </span>
          ))}
        </div>
      )}

      <Button
        className="w-full gap-2"
        onClick={() => onInspect()}
        disabled={inspecting}
      >
        <Mountain className="size-3.5" />
        {inspecting ? 'Viewing Terrain Inspection' : 'Open Full Terrain Inspection'}
        <ChevronRight className="ml-auto size-3.5" />
      </Button>
    </div>
  )
}
