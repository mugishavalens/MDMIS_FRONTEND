import { cn } from '@/lib/utils'

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'neutral'

const TONE: Record<Tone, string> = {
  success: 'bg-[var(--success)]/12 text-[var(--success)] border-[var(--success)]/25',
  warning: 'bg-primary/12 text-primary border-primary/25',
  danger: 'bg-destructive/12 text-destructive border-destructive/25',
  info: 'bg-accent/12 text-accent border-accent/25',
  accent: 'bg-blue-500/12 text-blue-400 border-blue-500/25',
  neutral: 'bg-muted text-muted-foreground border-border',
}

export function StatusPill({
  tone = 'neutral',
  children,
  className,
  dot = true,
}: {
  tone?: Tone
  children: React.ReactNode
  className?: string
  dot?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium capitalize',
        TONE[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  )
}
