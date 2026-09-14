import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ siteId: string }>
}

export default async function InspectPage({ params }: Props) {
  const { siteId } = await params
  // Redirect to main map - the CesiumExplorer handles terrain inspection internally
  redirect(`/map?site=${siteId}&view=terrain`)
}
