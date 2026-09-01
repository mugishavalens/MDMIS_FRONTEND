'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Bar, BarChart, Cell } from 'recharts'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { DETECTION_TREND, MINERAL_DISTRIBUTION, MINERAL_META } from '@/lib/mdmis-data'

const trendConfig = {
  detections: { label: 'Detections', color: 'var(--chart-1)' },
  confidence: { label: 'Avg confidence %', color: 'var(--chart-2)' },
} satisfies ChartConfig

const distConfig = {
  detections: { label: 'Detections' },
} satisfies ChartConfig

export function DetectionCharts() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="border-border bg-card lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm">Detection throughput & model confidence</CardTitle>
          <CardDescription>Monthly classified detections vs. average AI confidence</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={trendConfig} className="h-[240px] w-full">
            <AreaChart data={DETECTION_TREND} margin={{ left: 4, right: 8, top: 8 }}>
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
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-sm">Mineral distribution</CardTitle>
          <CardDescription>Detections by classified mineral</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={distConfig} className="h-[240px] w-full">
            <BarChart
              data={MINERAL_DISTRIBUTION}
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
                {MINERAL_DISTRIBUTION.map((d) => (
                  <Cell key={d.mineral} fill={MINERAL_META[d.mineral].color} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
