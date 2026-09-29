export const inputClass =
  'h-8 w-full rounded-md border border-border bg-background/60 px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary'

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(2)} GB`
}

// Plain-language names for the validator's check codes.
export const CHECK_LABEL: Record<string, string> = {
  format: 'Wrong file type',
  integrity: 'File can’t be read',
  geospatial: 'Missing location',
  size: 'File is empty',
  sensor_type: 'Unknown sensor',
}

export function fmtWhen(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'
}
