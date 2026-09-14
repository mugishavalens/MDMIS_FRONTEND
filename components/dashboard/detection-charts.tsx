'use client'

import { useEffect, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Bar, BarChart, Cell } from 'recharts'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { MINERAL_META } from '@/lib/mdmis-data'
import { fetchDashboardSummary, type DashboardSummary } from '@/lib/api/dashboard'

const trendConfig = {
  detections: { label: 'Detections', color: 'var(--chart-1)' },
  confidence: { label: 'Avg confidence %', color: 'var(--chart-2)' },
} satisfies ChartConfig

const distConfig = {
  detections: { label: 'Detections' },
} satisfies ChartConfig

const FALLBACK_MINERAL_COLOR = '#9b6dff'

export function DetectionCharts() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchDashboardSummary()
      .then((data) => { if (!cancelled) setSummary(data) })
      .catch((err) => console.error('[MDMIS] Failed to load dashboard summary:', err))
    return () => { cancelled = true }
  }, [])

  const monthlyTrend = summary?.monthlyTrend ?? []
  const mineralDistribution = summary?.mineralDistribution ?? []

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="border-border bg-card lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm">Detection throughput & model confidence</CardTitle>
          <CardDescription>Monthly classified detections vs. average AI confidence</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyTrend.length === 0 ? (
            <div className="flex h-[240px] items-center justify-center text-xs text-muted-foreground">
              {summary ? 'No scans recorded yet.' : 'Loading…'}
            </div>
          ) : (
            <ChartContainer config={trendConfig} className="h-[240px] w-full">
              <AreaChart data={monthlyTrend} margin={{ left: 4, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="fillDet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-detections)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-detections)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
                <YAxis tickLine={false} axisLine={false} width={30} className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  dataKey="detections"
                  type="monotone"
                  stroke="var(--color-detections)"
                  strokeWidth={2}
                  fill="url(#fillDet)"
                />
                <Area
                  dataKey="confidence"
                  type="monotone"
                  stroke="var(--color-confidence)"
                  strokeWidth={2}
                  fill="transparent"
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-sm">Mineral distribution</CardTitle>
          <CardDescription>Detections by classified mineral</CardDescription>
        </CardHeader>
        <CardContent>
          {mineralDistribution.length === 0 ? (
            <div className="flex h-[240px] items-center justify-center text-xs text-muted-foreground">
              {summary ? 'No scans recorded yet.' : 'Loading…'}
            </div>
          ) : (
            <ChartContainer config={distConfig} className="h-[240px] w-full">
              <BarChart
                data={mineralDistribution}
                layout="vertical"
                margin={{ left: 8, right: 16 }}
              >
                <CartesianGrid horizontal={false} stroke="var(--border)" />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="mineral"
                  tickLine={false}
                  axisLine={false}
                  width={78}
                  className="text-xs"
                />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="detections" radius={4} barSize={16}>
                  {mineralDistribution.map((d) => (
                    <Cell key={d.mineral} fill={MINERAL_META[d.mineral as keyof typeof MINERAL_META]?.color ?? FALLBACK_MINERAL_COLOR} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
