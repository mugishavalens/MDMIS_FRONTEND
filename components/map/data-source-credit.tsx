import { cn } from '@/lib/utils'

// Sites imported from outside datasets carry their attribution in
// `dataSource` (set by the backend import). Licences such as IPIS's ODC-BY
// require that credit wherever the site is shown.
const SOURCE_LINKS: { match: string; href: string }[] = [
  { match: 'IPIS', href: 'https://ipisresearch.be/home/maps-data/open-data/' },
]

export function dataSourceLink(source?: string): string | null {
  if (!source) return null
  return SOURCE_LINKS.find(s => source.includes(s.match))?.href ?? null
}

export function DataSourceCredit({ source, className }: { source?: string; className?: string }) {
  if (!source) return null
  const href = dataSourceLink(source)
  return (
    <p className={cn('text-[10px] text-muted-foreground', className)}>
      Site data:{' '}
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
          {source}
        </a>
      ) : (
        source
      )}
    </p>
  )
}
