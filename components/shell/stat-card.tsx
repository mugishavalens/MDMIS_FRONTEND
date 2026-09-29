import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Summary number card used at the top of list pages. Always clickable:
 * pass onClick to filter/sort the list below (with `selected` showing the
 * active filter), or href to jump to the page that holds those records.
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  hint,
  selected = false,
  onClick,
  href,
}: {
  icon: LucideIcon
  label: string
  value: string
  tone?: 'danger' | 'success'
  /** Shown on hover: what clicking does. */
  hint: string
  selected?: boolean
  onClick?: () => void
  href?: string
}) {
  const body = (
    <Card
      className={cn(
        'h-full border-border bg-card transition-colors group-hover:border-primary/40',
        selected && 'border-primary ring-1 ring-primary',
      )}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-md',
            tone === 'danger' ? 'bg-destructive/12 text-destructive'
              : tone === 'success' ? 'bg-[var(--success)]/12 text-[var(--success)]'
              : 'bg-secondary/70 text-primary',
          )}
        >
          <Icon className="size-4.5" />
        </span>
        <div className="min-w-0">
          <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )

  const wrapper = 'group block h-full w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60'
  if (href) {
    return <Link href={href} title={hint} className={wrapper}>{body}</Link>
  }
  return (
    <button type="button" onClick={onClick} title={hint} aria-pressed={selected} className={wrapper}>
      {body}
    </button>
  )
}
