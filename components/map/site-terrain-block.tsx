'use client'

/**
 * 3D Terrain Block - Clean, Working Implementation
 * Displays mining site subsurface with smooth elevation and solid walls
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html, ContactShadows, PerspectiveCamera } from '@react-three/drei'
import type { OrbitControlsImpl } from 'three-stdlib'
import type { DetectionSite } from '@/lib/mdmis-data'
import { MINERAL_HEX } from '@/lib/site-terrain'
import { useDemTerrain } from '@/lib/use-dem-terrain'
import { useSatelliteTexture } from '@/lib/use-satellite-texture'
import { seedFromString } from '@/lib/noise'

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const TERRAIN_SIZE = 32  
const CUT_DEPTH = 16
const DEFAULT_CAM_POS: [number, number, number] = [28, 22, 28]
const DEFAULT_CAM_TARGET: [number, number, number] = [0, 3, 0]

// ──TERRAIN GENERATION ──────────────────────────────────────────────────────

interface TerrainSceneProps {
  site: DetectionSite
  xray: boolean
  resetSignal: number
  controlsRef: React.RefObject<OrbitControlsImpl | null>
}

function TerrainScene({ site, xray, resetSignal, controlsRef }: TerrainSceneProps) {
  const seed = seedFromString(site.id)
  const half = TERRAIN_SIZE / 2

  // Load satellite texture (DEM will fail gracefully)
  const demTerrain = useDemTerrain(site, 32)
  const satelliteData = useSatelliteTexture(site, 2)
  const tex = satelliteData.status === 'ready' ? satelliteData.texture : null

  // Build terrain mesh
  const terrainData = useMemo(() => {
    console.log(`[Terrain] Building terrain block for ${site.id}`)
    
    // Generate procedural elevation grid
    const gridSize = 32
    const grid: number[][] = []
    
    for (let j = 0; j < gridSize; j++) {
      const row: number[] = []
      for (let i = 0; i < gridSize; i++) {
        const x = i / gridSize
        const y = j / gridSize
        // Generate terrain with variation
        const v1 = Math.sin(x * 4 + seed) * Math.cos(y * 4 + seed) * 2
        const v2 = Math.sin(x * 8) * Math.cos(y * 7) * 1
        const height = 4 + v1 + v2  // Base height 4, with -3 to +3 variation
        row.push(Math.max(0, height))
      }
      grid.push(row)
    }

    // Create surface geometry
    const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 32, 32)
    const positions = geometry.attributes.position as THREE.BufferAttribute
    const posArray = positions.array as Float32Array

    // Apply elevation to vertex Y positions
    for (let i = 0; i < posArray.length; i += 3) {
      const x = posArray[i]
      const z = posArray[i + 2]

      // Map to grid coordinates
      const gx = Math.floor(((x / half + 1) / 2) * (gridSize - 1))
      const gy = Math.floor(((z / half + 1) / 2) * (gridSize - 1))
      const gx2 = Math.min(gx + 1, gridSize - 1)
      const gy2 = Math.min(gy + 1, gridSize - 1)

      // Interpolate between grid points
      const fx = ((x / half + 1) / 2) * (gridSize - 1) - gx
      const fy = ((z / half + 1) / 2) * (gridSize - 1) - gy

      const v00 = grid[gy][gx]
      const v10 = grid[gy][gx2]
      const v01 = grid[gy2][gx]
      const v11 = grid[gy2][gx2]

      const h0 = v00 + (v10 - v00) * fx
      const h1 = v01 + (v11 - v01) * fx
      const h = h0 + (h1 - h0) * fy

      posArray[i + 1] = h  // Set Y (height)
    }

    positions.needsUpdate = true
    geometry.computeVertexNormals()

    const maxH = Math.max(...Array.from(posArray).filter((_, i) => i % 3 === 1))

    return {
      surfaceGeometry: geometry,
      maxHeight: maxH,
    }
  }, [site.id])

  const { surfaceGeometry, maxHeight } = terrainData

  // Mineral deposit positioning
  const veinColor = MINERAL_HEX[site.primaryMineral] || '#ff6b6b'
  const depositDepth = Math.min(Math.max(site.depthMeters / 80, 0.2), 0.85)
  const depositY = -CUT_DEPTH * depositDepth
  const depositSize = Math.sqrt(site.estimatedTonnage) / 120

  // Camera and controls
  const { camera } = useThree()
  const [autoRotate, setAutoRotate] = useState(true)

  useFrame(({ clock }) => {
    // Animation loop
  })

  useEffect(() => {
    camera.position.set(...DEFAULT_CAM_POS)
    const controls = controlsRef.current
    if (controls) {
      controls.target.set(...DEFAULT_CAM_TARGET)
      controls.update()
    }
    setAutoRotate(true)
  }, [site.id, resetSignal, camera, controlsRef])

  return (
    <>
      {/* BACKGROUND & FOG */}
      <color attach="background" args={['#0a0e27']} />
      <fog attach="fog" args={['#0a0e27', 50, 120]} />

      {/* LIGHTING */}
      <directionalLight
        position={[35, 50, 30]}
        intensity={1.6}
        color="#ffecd2"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-far={120}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-bias={-0.00005}
      />
      <directionalLight position={[-30, 25, -25]} intensity={0.7} color="#a8d8ff" />
      <ambientLight intensity={0.5} color="#ffffff" />
      <hemisphereLight args={['#87ceeb', '#1a3a1a', 0.6]} />

      {/* TERRAIN GROUP */}
      <group>
        {/* SURFACE MESH */}
        <mesh geometry={surfaceGeometry} castShadow receiveShadow>
          <meshStandardMaterial
            map={tex}
            color={tex ? '#ffffff' : '#6b7d4d'}
            roughness={tex ? 0.65 : 0.75}
            metalness={0.05}
            side={THREE.FrontSide}
          />
        </mesh>

        {/* WALLS - 4 rectangular faces */}
        {/* North wall (z = -half) */}
        <mesh position={[0, -CUT_DEPTH / 2, -half]} castShadow receiveShadow>
          <planeGeometry args={[TERRAIN_SIZE, CUT_DEPTH]} />
          <meshStandardMaterial color="#8b7355" roughness={0.8} metalness={0} side={THREE.FrontSide} />
        </mesh>

        {/* South wall (z = +half) */}
        <mesh position={[0, -CUT_DEPTH / 2, half]} rotation={[0, Math.PI, 0]} castShadow receiveShadow>
          <planeGeometry args={[TERRAIN_SIZE, CUT_DEPTH]} />
          <meshStandardMaterial color="#8b7355" roughness={0.8} metalness={0} side={THREE.FrontSide} />
        </mesh>

        {/* East wall (x = +half) */}
        <mesh position={[half, -CUT_DEPTH / 2, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
          <planeGeometry args={[TERRAIN_SIZE, CUT_DEPTH]} />
          <meshStandardMaterial color="#8b7355" roughness={0.8} metalness={0} side={THREE.FrontSide} />
        </mesh>

        {/* West wall (x = -half) */}
        <mesh position={[-half, -CUT_DEPTH / 2, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow>
          <planeGeometry args={[TERRAIN_SIZE, CUT_DEPTH]} />
          <meshStandardMaterial color="#8b7355" roughness={0.8} metalness={0} side={THREE.FrontSide} />
        </mesh>

        {/* BOTTOM PLATE */}
        <mesh position={[0, -CUT_DEPTH, 0]} receiveShadow>
          <planeGeometry args={[TERRAIN_SIZE, TERRAIN_SIZE]} />
          <meshStandardMaterial color="#3a3a3a" roughness={0.9} metalness={0.1} />
        </mesh>

        {/* MINERAL DEPOSIT (X-Ray visible) */}
        {xray && (
          <>
            {/* Floating pin */}
            <mesh position={[0, depositY + 8, 0]}>
              <coneGeometry args={[0.3, 2, 8]} />
              <meshStandardMaterial color={veinColor} emissive={veinColor} emissiveIntensity={0.8} />
            </mesh>

            {/* Connecting line */}
            <mesh position={[0, (depositY + depositY + 8) / 2, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 8, 8]} />
              <meshStandardMaterial
                color={veinColor}
                emissive={veinColor}
                emissiveIntensity={0.6}
                transparent
                opacity={0.6}
              />
            </mesh>

            {/* Deposit sphere */}
            <mesh position={[0, depositY, 0]}>
              <sphereGeometry args={[depositSize, 32, 32]} />
              <meshStandardMaterial color={veinColor} emissive={veinColor} emissiveIntensity={0.7} transparent opacity={0.85} />
            </mesh>

            {/* Halo */}
            <mesh position={[0, depositY, 0]}>
              <sphereGeometry args={[depositSize * 1.5, 16, 16]} />
              <meshBasicMaterial color={veinColor} transparent opacity={0.15} depthWrite={false} />
            </mesh>
          </>
        )}

        {/* SHADOW */}
        <ContactShadows position={[0, -CUT_DEPTH - 0.1, 0]} opacity={0.3} scale={TERRAIN_SIZE * 1.5} blur={3} far={10} />
      </group>

      {/* INFO LABEL */}
      <Html position={[0, maxHeight + 2, 0]} center distanceFactor={1}>
        <div className="pointer-events-none rounded-lg border border-white/20 bg-black/70 px-3 py-2 text-center backdrop-blur">
          <div className="text-sm font-bold text-white">{site.name}</div>
          <div className="text-xs text-white/60">{site.primaryMineral} • {site.depthMeters}m deep</div>
        </div>
      </Html>

      {/* CAMERA CONTROLS */}
      <OrbitControls
        ref={controlsRef}
        target={DEFAULT_CAM_TARGET}
        enablePan={true}
        minDistance={15}
        maxDistance={60}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI * 0.9}
        autoRotate={autoRotate}
        autoRotateSpeed={2}
        onStart={() => setAutoRotate(false)}
      />

      {/* STATUS OVERLAY */}
      {demTerrain.status === 'loading' && (
        <Html center>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-blue-500 bg-black/80 px-6 py-4 backdrop-blur">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <p className="text-sm text-blue-300">Loading terrain...</p>
          </div>
        </Html>
      )}
    </>
  )
}

// ── CANVAS WRAPPER ─────────────────────────────────────────────────────────

export default function SiteTerrainBlockV2({
  site,
  xray = false,
  resetSignal = 0,
  onContextLost,
}: {
  site: DetectionSite
  xray?: boolean
  resetSignal?: number
  onContextLost?: () => void
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null)

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{
          toneMapping: THREE.NoToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
          antialias: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: false,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0a0e27', 1)
          gl.shadowMap.enabled = true
          gl.shadowMap.type = THREE.PCFShadowMap
        }}
      >
        <PerspectiveCamera position={DEFAULT_CAM_POS} fov={45} near={0.1} far={500} makeDefault />
        <TerrainScene site={site} xray={xray} resetSignal={resetSignal} controlsRef={controlsRef} />
      </Canvas>

      {/* UI OVERLAY */}
      <div className="pointer-events-none absolute top-4 left-4 text-xs text-white/60">
        <div>Drag to rotate • Scroll to zoom</div>
      </div>
    </div>
  )
}
