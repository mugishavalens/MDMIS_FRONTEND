import { TopBar } from '@/components/shell/topbar'
import { MapExplorer } from '@/components/map/map-explorer'

export default function MapPage() {
  return (
    <>
      <TopBar
        title="3D Subsurface Geospatial Explorer"
        subtitle="Interactive geological mapping with depth profiling, mineral deposit visualization & real-time risk assessment"
      />
      <div className="flex-1 overflow-hidden">
        <MapExplorer />
      </div>
    </>
  )
}
