import { cn } from '@/lib/utils'

/** Profile photo when the user has one, otherwise their initials. */
export function UserAvatar({
  initials,
  avatarUrl,
  className,
}: {
  initials: string
  avatarUrl?: string | null
  className?: string
}) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- data: URL, nothing for next/image to optimise
    return <img src={avatarUrl} alt="" className={cn('shrink-0 rounded-full object-cover', className)} />
  }
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground',
        className,
      )}
    >
      {initials}
    </div>
  )
}
