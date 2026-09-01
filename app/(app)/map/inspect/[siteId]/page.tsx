import { notFound } from 'next/navigation'
import { SITES } from '@/lib/mdmis-data'
import { InspectClient } from './inspect-client'

interface Props {
  params: Promise<{ siteId: string }>
}

export function generateStaticParams() {
  return SITES.map((s) => ({ siteId: s.id }))
}

export default async function InspectPage({ params }: Props) {
  const { siteId } = await params
  const site = SITES.find((s) => s.id === siteId)
  if (!site) notFound()
  return <InspectClient site={site} />
}
