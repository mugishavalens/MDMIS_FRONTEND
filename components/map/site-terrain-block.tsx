'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html, Cloud, ContactShadows, GizmoHelper, GizmoViewport } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { DetectionSite } from '@/lib/mdmis-data'
import { MINERAL_HEX, getResolvedTerrainConfig } from '@/lib/site-terrain'
import { fbm2D, hash2, seedFromString } from '@/lib/noise'
import { buildTerrainBlock, buildOreBlob } from '@/lib/terrain-geometry'
import { useSiteRealTerrain } from '@/lib/real-terrain'

// ── Constants ────────────────────────────────────────────────────────────────
const SIZE = 28
const SEGMENTS = 64          // higher = smoother terrain shape
const CUT_DEPTH = 12
const DEFAULT_CAMERA_POS: [number, number, number] = [22, 18, 22]
const DEFAULT_TARGET: [number, number, number] = [0, 2, 0]

// Amplitude multiplier — the key fix. Real SRTM relief is ~200m over 900m
// which after RELIEF_METERS_TO_LOCAL_UNITS gives ~3 units (flat slab).
// We always use the procedural geometry with a HIGH amplitude so peaks are
// dramatic, then optionally drape the real satellite texture on top.
const BASE_AMPLITUDE_BOOST = 2.2

interface SceneProps {
  site: DetectionSite
  xray: boolean
  controlsRef: React.RefObject<OrbitControlsImpl | null>
  resetSignal: number
}

// ── Ore vein on cutaway wall ──────────────────────────────────────────────────
function Vein({ position, length, axis, color }: {
  position: [number, number, number]; length: number; axis: 'x' | 'z'; color: string
}) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const m = ref.current?.material as THREE.MeshStandardMaterial | undefined
    if (m) m.emissiveIntensity = 0.8 + Math.sin(clock.elapsedTime * 1.6) * 0.4
  })
  const dims: [number, number, number] = axis === 'x' ? [length, 0.55, 0.18] : [0.18, 0.55, length]
  return (
    <mesh ref={ref} position={position}>
      <boxGeometry args={dims} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} toneMapped={false} />
    </mesh>
  )
}

// ── Ore deposit blob ──────────────────────────────────────────────────────────
function OreBlob({ position, radius, color, seed }: {
  position: [number, number, number]; radius: number; color: string; seed: number
}) {
  const geo = useMemo(() => buildOreBlob(radius, seed), [radius, seed])
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const m = ref.current?.material as THREE.MeshStandardMaterial | undefined
    if (m) m.emissiveIntensity = 0.6 + Math.sin(clock.elapsedTime * 1.3) * 0.35
  })
  return (
    <mesh ref={ref} geometry={geo} position={position} castShadow>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8}
        roughness={0.3} metalness={0.15} toneMapped={false} />
    </mesh>
  )
}

// ── Trees ─────────────────────────────────────────────────────────────────────
function Trees({ seed, half, heightAt, amplitude, density, colors }: {
  seed: number; half: number; heightAt: (nx: number, nz: number) => number
  amplitude: number; density: number; colors: string[]
}) {
  const trees = useMemo(() => {
    const count = Math.round(density * 80)
    const items: { x: number; y: number; z: number; scale: number; color: string }[] = []
    for (let i = 0; i < count; i++) {
      const nx = fbm2D(i * 3.1, 0.7, seed + 300, 1) * 2 - 1
      const nz = fbm2D(0.4, i * 2.7, seed + 600, 1) * 2 - 1
      if (Math.max(Math.abs(nx), Math.abs(nz)) > 0.84) continue
      const h = heightAt(nx, nz)
      if (h / amplitude > 0.75) continue
      const jitter = fbm2D(i * 5.2, i * 1.3, seed + 900, 1)
      items.push({ x: nx * half, y: h, z: nz * half, scale: 0.5 + jitter * 0.55, color: colors[i % colors.length] })
    }
    return items
  }, [seed, half, heightAt, amplitude, density, colors])

  return (
    <group>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, t.y, t.z]} scale={t.scale}>
          <mesh position={[0, 0.38, 0]} castShadow>
            <coneGeometry args={[0.3, 0.75, 6]} />
            <meshLambertMaterial color={t.color} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.05, 0.065, 0.15, 5]} />
            <meshLambertMaterial color="#7a5c38" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ── Small settlement ──────────────────────────────────────────────────────────
function Houses({ seed, half, heightAt, amplitude }: {
  seed: number; half: number; heightAt: (nx: number, nz: number) => number; amplitude: number
}) {
  const houses = useMemo(() => {
    let anchor = { nx: 0.35, nz: 0.3, h: Infinity }
    for (let i = 0; i < 16; i++) {
      const nx = 0.1 + hash2(seed + i * 7, 11) * 0.5
      const nz = 0.05 + hash2(seed + i * 7, 23) * 0.5
      const h = heightAt(nx, nz)
      if (h < anchor.h) anchor = { nx, nz, h }
    }
    const roofColors = ['#9a4a38', '#7a3f2e', '#b5604a']
    return Array.from({ length: 9 }, (_, i) => {
      const ox = (hash2(seed + i * 3, 41) - 0.5) * 0.18
      const oz = (hash2(seed + i * 3, 59) - 0.5) * 0.18
      const nx = anchor.nx + ox, nz = anchor.nz + oz
      const h = heightAt(nx, nz)
      if (h / amplitude > 0.38) return null
      return { x: nx * half, y: h, z: nz * half, rot: hash2(seed + i, 71) * Math.PI * 2, roof: roofColors[i % 3] }
    }).filter(Boolean) as { x: number; y: number; z: number; rot: number; roof: string }[]
  }, [seed, half, heightAt, amplitude])

  return (
    <group>
      {houses.map((h, i) => (
        <group key={i} position={[h.x, h.y, h.z]} rotation={[0, h.rot, 0]} scale={0.5}>
          <mesh position={[0, 0.22, 0]} castShadow>
            <boxGeometry args={[0.5, 0.44, 0.42]} />
            <meshLambertMaterial color="#e0d4bc" />
          </mesh>
          <mesh position={[0, 0.52, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[0.4, 0.3, 4]} />
            <meshLambertMaterial color={h.roof} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ── Depth scale ruler ─────────────────────────────────────────────────────────
function DepthScale({ cutDepth, markerHeight, veinY, siteDepthM, veinColor, half }: {
  cutDepth: number; markerHeight: number; veinY: number
  siteDepthM: number; veinColor: string; half: number
}) {
  const maxMeters = 80
  const ticks = [0, 20, 40, 60, 80]
  const poleX = half + 1.8, poleZ = half + 1.8
  return (
    <group position={[poleX, 0, poleZ]}>
      <mesh position={[0, (markerHeight - cutDepth) / 2, 0]}>
        <cylinderGeometry args={[0.025, 0.025, markerHeight + cutDepth, 8]} />
        <meshBasicMaterial color="#c9d1d9" transparent opacity={0.45} />
      </mesh>
      {ticks.map((m) => {
        const y = -cutDepth * (m / maxMeters)
        return (
          <group key={m} position={[0, y, 0]}>
            <mesh position={[0.3, 0, 0]}>
              <boxGeometry args={[0.6, 0.03, 0.03]} />
              <meshBasicMaterial color="#c9d1d9" transparent opacity={0.65} />
            </mesh>
            <Html distanceFactor={24} position={[0.75, 0, 0]} occlude={false}>
              <div className="pointer-events-none whitespace-nowrap rounded border border-white/10 bg-[#1a1d23]/85 px-1.5 py-0.5 font-mono text-[9px] text-white/70">
                {m}m
              </div>
            </Html>
          </group>
        )
      })}
      <group position={[0, veinY, 0]}>
        <mesh><sphereGeometry args={[0.1, 12, 12]} /><meshBasicMaterial color={veinColor} /></mesh>
        <Html distanceFactor={22} position={[0.9, 0, 0]} occlude={false}>
          <div className="pointer-events-none whitespace-nowrap rounded px-2 py-1 text-[10px] font-semibold shadow"
            style={{ background: veinColor, color: '#0a0a0a' }}>
            ▶ {siteDepthM}m deposit
          </div>
        </Html>
      </group>
    </group>
  )
}

// ── Main scene ────────────────────────────────────────────────────────────────
function TerrainScene({ site, xray, controlsRef, resetSignal }: SceneProps) {
  const seed = seedFromString(site.id)
  const half = SIZE / 2

  const { biome, strataBands, colors, amplitude: baseAmplitude, frequency, elevationM } =
    useMemo(() => getResolvedTerrainConfig(site.id, seed), [site.id, seed])

  // Boost amplitude significantly for dramatic peaks — this is the key visual fix.
  // Real terrain data is ~200m relief / 900m extent = gentle hills when scaled.
  // We force a minimum amplitude of 5 so every site has visible mountains.
  const amplitude = Math.max(baseAmplitude * BASE_AMPLITUDE_BOOST, 5.0)

  // Always build procedural geometry for the dramatic shape.
  // When real terrain loads we use its satellite texture as the surface skin.
  const { surfaceGeometry, wallGeometry, bottomGeometry, maxHeight, heightAt } = useMemo(() =>
    buildTerrainBlock({
      seed, size: SIZE, segments: SEGMENTS,
      amplitude, frequency,
      biomeColors: colors,
      cutDepth: CUT_DEPTH,
      strataBands,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed, amplitude, frequency, colors, strataBands]
  )

  // Load real satellite texture — drape it over the procedural mesh
  const realTerrain = useSiteRealTerrain(site.id)
  const satelliteTexture = realTerrain.status === 'ready' ? realTerrain.texture : null

  const veinColor = MINERAL_HEX[site.primaryMineral]
  const veinDepthRatio = Math.min(Math.max(site.depthMeters / 80, 0.15), 0.88)
  const veinY = -CUT_DEPTH * veinDepthRatio
  const blobRadius = Math.min(Math.max(Math.sqrt(site.estimatedTonnage) / 95, 0.75), 2.6)
  const markerHeight = heightAt(0, 0)

  const groundProps = xray
    ? { transparent: true as const, opacity: 0.18, depthWrite: false }
    : { transparent: false as const, opacity: 1, depthWrite: true }

  const { camera } = useThree()
  const [autoRotate, setAutoRotate] = useState(true)

  useEffect(() => {
    camera.position.set(...DEFAULT_CAMERA_POS)
    const controls = controlsRef.current
    if (controls) { controls.target.set(...DEFAULT_TARGET); controls.update() }
    setAutoRotate(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site.id, resetSignal])

  const waterX = -half * 0.5, waterZ = half * 0.38

  return (
    <>
      {/* Dark atmospheric background — matches the Grindelwald reference */}
      <color attach="background" args={['#1a1e2e']} />
      <fog attach="fog" color="#1a1e2e" near={38} far={75} />

      {/* ── Lighting ── */}
      {/* Main sun — warm, strong, casts shadows */}
      <directionalLight
        position={[20, 32, 14]}
        intensity={2.8}
        color="#fff8f0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={80}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      {/* Fill from opposite side — soft cool bounce */}
      <directionalLight position={[-12, 16, -10]} intensity={0.8} color="#b0d0ff" />
      {/* Ambient — keeps shadows from going pure black */}
      <ambientLight intensity={0.55} color="#ffffff" />
      {/* Hemisphere — sky/ground color separation */}
      <hemisphereLight args={['#6aa8e8', '#5a7a35', 0.5]} />

      {/* ── Surface mesh ── */}
      <mesh geometry={surfaceGeometry} receiveShadow={!xray} castShadow={!xray} renderOrder={xray ? 2 : 0}>
        {satelliteTexture ? (
          // Real satellite photo draped over procedural peaks — Grindelwald look
          <meshStandardMaterial
            map={satelliteTexture}
            roughness={0.78}
            metalness={0}
            {...groundProps}
          />
        ) : (
          // Procedural biome vertex colors — vivid greens/browns per biome
          <meshStandardMaterial
            vertexColors
            roughness={0.75}
            metalness={0}
            {...groundProps}
          />
        )}
      </mesh>

      {/* ── Cutaway walls (strata) ── */}
      <mesh geometry={wallGeometry} renderOrder={xray ? 2 : 0}>
        <meshStandardMaterial
          vertexColors
          flatShading
          roughness={0.88}
          metalness={0}
          side={THREE.DoubleSide}
          {...groundProps}
        />
      </mesh>

      {/* ── Bedrock base ── */}
      <mesh geometry={bottomGeometry} renderOrder={xray ? 2 : 0}>
        <meshStandardMaterial vertexColors roughness={0.92} metalness={0} side={THREE.DoubleSide} {...groundProps} />
      </mesh>

      {/* ── Water body (biomes that have one) ── */}
      {biome.hasWater && (
        <>
          <mesh position={[waterX, 0.04, waterZ]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[half * 0.26, half * 0.33, 32]} />
            <meshStandardMaterial color="#c8b890" roughness={1} />
          </mesh>
          <mesh position={[waterX, 0.06, waterZ]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[half * 0.26, 32]} />
            <meshPhysicalMaterial
              color={biome.waterColor} transparent opacity={0.9}
              roughness={0.08} metalness={0.05} clearcoat={0.8}
            />
          </mesh>
        </>
      )}

      {/* ── Vegetation & settlement ── */}
      <Trees seed={seed} half={half} heightAt={heightAt} amplitude={maxHeight}
        density={biome.treeDensity} colors={biome.treeColors} />
      <Houses seed={seed} half={half} heightAt={heightAt} amplitude={maxHeight} />

      {/* ── Ore veins on cutaway faces ── */}
      <Vein position={[0, veinY, -half]} length={SIZE * 0.72} axis="x" color={veinColor} />
      <Vein position={[half, veinY, 0]} length={SIZE * 0.72} axis="z" color={veinColor} />

      {/* ── 3-D deposit (revealed by X-ray) ── */}
      <OreBlob position={[half * 0.28, veinY, -half * 0.25]} radius={blobRadius} color={veinColor} seed={seed} />

      {/* ── Vertical depth guide ── */}
      <mesh position={[0, (markerHeight + veinY) / 2, 0]}>
        <cylinderGeometry args={[0.045, 0.045, markerHeight - veinY, 6]} />
        <meshBasicMaterial color={veinColor} transparent opacity={0.45} />
      </mesh>

      {/* ── Depth scale ruler ── */}
      <DepthScale
        cutDepth={CUT_DEPTH} markerHeight={markerHeight}
        veinY={veinY} siteDepthM={site.depthMeters}
        veinColor={veinColor} half={half}
      />

      {/* ── Site marker pin ── */}
      <group position={[0, markerHeight, 0]}>
        <mesh position={[0, 0.55, 0]} castShadow>
          <coneGeometry args={[0.24, 0.65, 4]} />
          <meshStandardMaterial color="#e6563f" roughness={0.3} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.32, 8]} />
          <meshStandardMaterial color="#1a1d23" />
        </mesh>
        <Html distanceFactor={22} position={[0, 1.25, 0]} occlude>
          <div className="pointer-events-none whitespace-nowrap rounded-md border border-white/20 bg-[#1a1d23]/92 px-2.5 py-1.5 text-[10px] text-white backdrop-blur shadow-xl">
            <div className="font-semibold">{site.name}</div>
            <div className="mt-0.5 text-white/55">
              {elevationM}m elev · {site.primaryMineral} · {site.depthMeters}m deep
            </div>
          </div>
        </Html>
      </group>

      {/* ── Clouds — bright white ── */}
      <Cloud
        position={[-half * 0.45, maxHeight + 7, -half * 0.35]}
        opacity={0.85} speed={0.1} bounds={[7, 1.5, 4]} segments={14}
        color="#ffffff"
      />
      <Cloud
        position={[half * 0.4, maxHeight + 9, half * 0.25]}
        opacity={0.7} speed={0.1} bounds={[5, 1.2, 3]} segments={10}
        color="#f0f8ff"
      />

      {/* ── Ground shadow ── */}
      <ContactShadows position={[0, -0.01, 0]} opacity={0.2} scale={SIZE} blur={2.5} far={5} />

      {/* ── Camera controls ── */}
      <OrbitControls
        ref={controlsRef}
        target={DEFAULT_TARGET}
        enablePan={false}
        minDistance={10}
        maxDistance={48}
        minPolarAngle={0.05}
        maxPolarAngle={Math.PI * 0.85}
        autoRotate={autoRotate}
        autoRotateSpeed={0.3}
        onStart={() => setAutoRotate(false)}
      />

      {/* ── Orientation gizmo ── */}
      <GizmoHelper alignment="bottom-right" margin={[68, 68]}>
        <GizmoViewport axisColors={['#e6563f', '#3fcf8e', '#4bc5d6']} labelColor="#0a0a0a" />
      </GizmoHelper>
    </>
  )
}

// ── Canvas wrapper ────────────────────────────────────────────────────────────
export default function SiteTerrainBlock({
  site, xray = false, resetSignal = 0, onContextLost,
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
        camera={{ position: DEFAULT_CAMERA_POS, fov: 36 }}
        dpr={[1, 1.5]}
        gl={{
          // NoToneMapping = vertex/texture colors render at their actual values.
          // ACESFilmic (the default) crushes everything dark — this was the
          // primary cause of the black surface.
          toneMapping: THREE.NoToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
          antialias: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: false,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0d0f12', 1)
          if (!onContextLost) return
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault()
            onContextLost()
          })
        }}
      >
        <TerrainScene site={site} xray={xray} controlsRef={controlsRef} resetSignal={resetSignal} />
      </Canvas>
    </div>
  )
}
