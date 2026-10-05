import { cn } from '@/lib/utils'

/** The MDMIS logo emblem. Size and corner rounding come from className. */
export function BrandMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small static asset; images are unoptimized in this app
    <img src="/logo.png" alt="MDMIS" width={256} height={256} className={cn('shrink-0 object-cover', className)} />
  )
}
