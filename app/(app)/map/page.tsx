import { TopBar } from '@/components/shell/topbar'
import { CesiumExplorer } from '@/components/map/cesium-explorer'

export default function MapPage() {
  return (
    <>
      <TopBar
        title="Intelligence Explorer"
        subtitle="3D satellite globe with integrated terrain inspection · Cesium World Terrain · click sites to explore subsurface"
      />
      <div className="flex-1 overflow-hidden">
        <CesiumExplorer />
      </div>
    </>
  )
}
