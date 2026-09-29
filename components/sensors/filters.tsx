import { cn } from '@/lib/utils'
import { inputClass } from '@/components/sensors/format'

export function FilterChips<T extends string>({
  label, value, options, onChange,
}: {
  label: string
  value: T
  options: { key: T; label: string; count?: number }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
            value === o.key
              ? 'border-primary/40 bg-primary/12 text-primary'
              : 'border-border text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1 opacity-70">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function FilterSelect({
  value, onChange, options, allLabel,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  allLabel: string
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputClass, 'h-7 w-auto min-w-36')}>
      <option value="">{allLabel}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
