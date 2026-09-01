'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useInView, useMotionValueEvent, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  Cpu,
  DatabaseZap,
  FileCheck2,
  Globe2,
  Layers3,
  Link2,
  Lock,
  MapPin,
  Menu,
  Mountain,
  Play,
  Radio,
  ScanLine,
  Shield,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  X,
} from 'lucide-react'
import { ProfileDropdown } from '@/components/shell/profile-dropdown'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useAuth } from '@/lib/auth-context'
import { KPIS, MINERAL_META } from '@/lib/mdmis-data'

const videos = {
  terrain: '/videos/istockphoto-1689123730-640_adpp_is.mp4',
  sensing: '/videos/istockphoto-1223706310-640_adpp_is.mp4',
  custody: '/videos/13476-248644895_medium.mp4',
  transport: '/videos/40030-424911975_medium.mp4',
  compliance: '/videos/istockphoto-1453371060-640_adpp_is.mp4',
  security: '/videos/istockphoto-1977219422-640_adpp_is.mp4',
}

const navLinks = [
  { href: '#intelligence', label: 'Intelligence' },
  { href: '#features', label: 'Features' },
  { href: '#roles', label: 'Access' },
  { href: '#about', label: 'About Us' },
  { href: '#contact', label: 'Contact' },
]

const stats = [
  { label: 'Active Sites', value: `${KPIS.activeSites}/${KPIS.totalSites}`, icon: Radio },
  { label: 'AI Confidence', value: `${KPIS.avgConfidence}%`, icon: Cpu },
  { label: 'Reserve Tonnes', value: `${(KPIS.estimatedReserveTonnes / 1000).toFixed(0)}k t`, icon: Layers3 },
  { label: 'Compliant Lots', value: `${KPIS.compliantLotsPct}%`, icon: FileCheck2 },
]

const chapters = [
  {
    kicker: '01 Terrain Intelligence',
    title: 'See mineral potential before heavy extraction begins.',
    body: 'MDMIS turns surface surveys, geospatial context and historical site data into a live operational picture for exploration teams.',
    video: videos.terrain,
    icon: Globe2,
    color: 'text-accent',
    detail: 'Live across every active exploration corridor',
  },
  {
    kicker: '02 Hyperspectral AI',
    title: 'Classify mineral signatures from drone, satellite and GPR scans.',
    body: 'The detection workflow highlights confidence, depth, anomaly shape and recommended validation routes for field analysts.',
    video: videos.sensing,
    icon: ScanLine,
    color: 'text-primary',
    detail: `${KPIS.avgConfidence}% average detection confidence`,
  },
  {
    kicker: '03 Chain Of Custody',
    title: 'Every lot remains traceable from site to export corridor.',
    body: 'Tamper-aware custody records connect scanned reserves, tagged lots, manifests, inspections and final delivery evidence.',
    video: videos.custody,
    icon: Link2,
    color: 'text-[var(--success)]',
    detail: 'Every handoff logged, timestamped and tamper-evident',
  },
  {
    kicker: '04 Live Transport',
    title: 'Track movement, alerts and route integrity in real time.',
    body: 'Convoy monitoring gives operators a clear view of corridor status, GPS events and delayed or suspicious movement.',
    video: videos.transport,
    icon: Truck,
    color: 'text-primary',
    detail: 'Real-time GPS across all active convoys',
  },
  {
    kicker: '05 Compliance Automation',
    title: 'Generate regulatory evidence while the work happens.',
    body: 'OECD due diligence, ITSCI reconciliation and licensing return data are prepared from operational records automatically.',
    video: videos.compliance,
    icon: ShieldCheck,
    color: 'text-accent',
    detail: `${KPIS.compliantLotsPct}% of lots fully compliant`,
  },
  {
    kicker: '06 Secure Operations',
    title: 'Give every role the right view, action and audit trail.',
    body: 'Role-based access control protects sensitive geological, compliance and transport data without slowing down field teams.',
    video: videos.security,
    icon: Lock,
    color: 'text-destructive',
    detail: 'Four permissioned roles, one audit trail',
  },
]

const features = [
  {
    icon: Globe2,
    title: '3D Subsurface Mapping',
    desc: 'Interactive underground layers, depth bands and site markers across Rwanda and export-adjacent corridors.',
    video: videos.terrain,
    metric: 'Depth aware',
  },
  {
    icon: ScanLine,
    title: 'AI Mineral Classification',
    desc: 'Detection confidence, sensor provenance and anomaly clustering for faster exploration decisions.',
    video: videos.sensing,
    metric: `${KPIS.avgConfidence}% avg`,
  },
  {
    icon: Link2,
    title: 'Custody Ledger',
    desc: 'Tagged lots, handoff events and evidence snapshots maintain traceability from mine to buyer.',
    video: videos.custody,
    metric: 'Tamper evident',
  },
  {
    icon: Truck,
    title: 'Transport Command',
    desc: 'Live convoy status, route exceptions and delivery verification for high-value mineral movement.',
    video: videos.transport,
    metric: 'Live GPS',
  },
  {
    icon: ShieldCheck,
    title: 'Compliance Engine',
    desc: 'Automated checks for OECD due diligence, ITSCI records and Rwanda licensing workflows.',
    video: videos.compliance,
    metric: `${KPIS.compliantLotsPct}% lots`,
  },
  {
    icon: Shield,
    title: 'Secure RBAC',
    desc: 'Admin, analyst, geologist and compliance workspaces with permissioned data visibility.',
    video: videos.security,
    metric: '4 roles',
  },
]

const roles = [
  {
    role: 'System Admin',
    email: 'admin@mdmis.rw',
    icon: Shield,
    color: 'text-destructive',
    tone: 'border-destructive/30 bg-destructive/10',
    permissions: ['User and role management', 'Audit logs', 'Platform configuration', 'Security policy'],
  },
  {
    role: 'Mine Analyst',
    email: 'analyst@mdmis.rw',
    icon: BarChart3,
    color: 'text-primary',
    tone: 'border-primary/30 bg-primary/10',
    permissions: ['Detection review', 'AI classification', 'Scan exports', 'Site performance'],
  },
  {
    role: 'Geologist',
    email: 'geo@mdmis.rw',
    icon: Globe2,
    color: 'text-accent',
    tone: 'border-accent/30 bg-accent/10',
    permissions: ['Map explorer', 'Subsurface layers', 'Site annotations', 'Scan history'],
  },
  {
    role: 'Compliance Officer',
    email: 'compliance@mdmis.rw',
    icon: ShieldCheck,
    color: 'text-[var(--success)]',
    tone: 'border-[var(--success)]/30 bg-[var(--success)]/10',
    permissions: ['OECD evidence', 'ITSCI reconciliation', 'Licensing returns', 'Flag resolution'],
  },
]

const aboutStats = [
  { label: 'Founded', value: '2023' },
  { label: 'Mine Sites Onboarded', value: `${KPIS.totalSites}` },
  { label: 'Team Members', value: '42' },
  { label: 'Districts Covered', value: '12' },
]

const aboutValues = [
  {
    icon: Globe2,
    title: 'Ground truth first',
    body: 'Every model we ship is trained and validated against verified field data from Rwandan mine sites, never synthetic benchmarks alone.',
  },
  {
    icon: ShieldCheck,
    title: 'Compliance by design',
    body: 'OECD due diligence and ITSCI traceability requirements are built into the data model from day one, not bolted on afterward.',
  },
  {
    icon: Users,
    title: 'Built with operators',
    body: 'Geologists, compliance officers and transport teams shape every workflow before it reaches the field.',
  },
]

function VideoSlide({ src, top, play }: { src: string; top: boolean; play: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (play) video.play().catch(() => {})
    else video.pause()
  }, [play])

  return (
    <motion.video
      ref={videoRef}
      loop
      muted
      playsInline
      preload={play ? 'auto' : 'metadata'}
      initial={top ? { opacity: 0, scale: 1.04 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.1, ease: 'easeOut' }}
      className="absolute inset-0 h-full w-full object-cover"
    >
      <source src={src} type="video/mp4" />
    </motion.video>
  )
}

function VideoLayer({
  src,
  overlay = 0.42,
  className = '',
}: {
  src: string
  overlay?: number
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { margin: '250px 0px 250px 0px' })
  const [layers, setLayers] = useState<string[]>([src])

  useEffect(() => {
    setLayers((current) => {
      if (current[current.length - 1] === src) return current
      const next = [...current, src]
      return next.length > 2 ? next.slice(-2) : next
    })
  }, [src])

  useEffect(() => {
    if (layers.length < 2) return
    const timer = window.setTimeout(() => {
      setLayers((current) => (current.length > 1 ? [current[current.length - 1]] : current))
    }, 1150)
    return () => window.clearTimeout(timer)
  }, [layers])

  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-hidden bg-[oklch(0.1_0.015_250)] ${className}`} aria-hidden="true">
      {layers.map((layerSrc, index) => (
        <VideoSlide key={layerSrc} src={layerSrc} top={index === layers.length - 1} play={isInView} />
      ))}
      <div className="absolute inset-0 bg-black transition-opacity duration-700" style={{ opacity: overlay }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,oklch(0.72_0.11_200/.18),transparent_32%),linear-gradient(to_bottom,oklch(0.1_0.015_250/.12),oklch(0.1_0.015_250/.58)_96%)]" />
      <div className="absolute inset-0 grid-backdrop opacity-10" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
    </div>
  )
}

function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const [display, setDisplay] = useState(value.includes('/') ? value : '0')

  useEffect(() => {
    if (!isInView || value.includes('/')) return

    const target = Number.parseFloat(value.replace(/[^0-9.]/g, ''))
    const suffix = value.replace(/[0-9.]/g, '')
    const started = performance.now()
    let frame = 0

    const tick = (now: number) => {
      const progress = Math.min((now - started) / 1500, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = target * eased
      setDisplay(`${Math.round(current)}${suffix}`)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [isInView, value])

  return <span ref={ref}>{display}</span>
}

function StatTile({ label, value, icon: Icon, index }: (typeof stats)[number] & { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.65 + index * 0.08, duration: 0.55 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="min-h-[112px] rounded-lg border border-white/15 bg-black/35 p-4 text-left text-white shadow-2xl shadow-black/20 backdrop-blur-md"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <Icon className="size-4 text-primary" />
        <span className="h-1.5 w-8 rounded-full bg-gradient-to-r from-primary to-accent" />
      </div>
      <p className="font-mono text-2xl font-bold text-white">
        <CountUp value={value} />
      </p>
      <p className="mt-1 text-[10px] uppercase text-white/65">{label}</p>
    </motion.div>
  )
}

function FeatureCard({ feature, index }: { feature: (typeof features)[number]; index: number }) {
  const Icon = feature.icon

  return (
    <motion.article
      initial={{ opacity: 0, y: 34 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ delay: index * 0.06, duration: 0.55 }}
      whileHover={{ y: -6 }}
      className="group relative min-h-[300px] overflow-hidden rounded-lg border border-white/15 bg-black/30 shadow-xl shadow-black/10 backdrop-blur-xl transition hover:border-primary/60 hover:bg-black/48"
    >
      <div className="relative flex h-full min-h-[300px] flex-col justify-between p-6">
        <div className="flex items-start justify-between gap-4">
          <motion.div
            whileHover={{ rotate: 14, scale: 1.08 }}
            className="flex size-11 items-center justify-center rounded-lg border border-white/15 bg-black/45 backdrop-blur"
          >
            <Icon className="size-5 text-primary" />
          </motion.div>
          <span className="rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 font-mono text-[10px] uppercase text-primary">
            {feature.metric}
          </span>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
          <p className="mt-3 text-sm leading-6 text-white/70">{feature.desc}</p>
        </div>
      </div>
    </motion.article>
  )
}

function IntelligenceTile({
  chapter,
  index,
  active,
  onActivate,
}: {
  chapter: (typeof chapters)[number]
  index: number
  active: boolean
  onActivate: () => void
}) {
  const Icon = chapter.icon
  const number = String(index + 1).padStart(2, '0')
  const label = chapter.kicker.replace(`${number} `, '')

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ delay: index * 0.06, duration: 0.5 }}
      whileHover={{ y: -8, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      onMouseEnter={onActivate}
      onFocus={onActivate}
      onClick={onActivate}
      className={`group relative min-h-[320px] overflow-hidden rounded-lg border p-6 text-left shadow-2xl shadow-black/15 backdrop-blur-xl transition ${
        active ? 'border-primary/70 bg-black/52' : 'border-white/15 bg-black/30 hover:border-white/35 hover:bg-black/45'
      }`}
    >
      <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-[var(--success)] opacity-0 transition group-hover:opacity-100" />
      <span className="absolute -right-8 -top-8 font-mono text-[8rem] font-bold leading-none text-white/[0.045] transition group-hover:text-primary/15">
        {number}
      </span>

      <div className="relative flex h-full flex-col justify-between">
        <div>
          <div className="mb-8 flex items-center justify-between gap-4">
            <span className={`font-mono text-5xl font-bold ${chapter.color}`}>{number}</span>
            <span className="flex size-11 items-center justify-center rounded-lg border border-white/15 bg-white/10">
              <Icon className={`size-5 ${chapter.color}`} />
            </span>
          </div>
          <p className="mb-3 font-mono text-xs uppercase text-primary">{label}</p>
          <h3 className="text-2xl font-bold leading-tight text-white">{chapter.title}</h3>
        </div>

        <div>
          <p className="mt-6 text-sm leading-6 text-white/72">{chapter.body}</p>
          <p className={`mt-5 border-l-2 border-current pl-3 text-sm font-semibold ${chapter.color}`}>
            {chapter.detail}
          </p>
        </div>
      </div>
    </motion.button>
  )
}

function RoleCard({
  role,
  index,
  active,
  onSelect,
}: {
  role: (typeof roles)[number]
  index: number
  active: boolean
  onSelect: () => void
}) {
  const Icon = role.icon

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ delay: index * 0.06, duration: 0.45 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      className={`w-full rounded-lg border p-5 text-left backdrop-blur-xl transition ${role.tone} ${
        active ? 'shadow-xl shadow-primary/10 ring-1 ring-primary/45' : 'opacity-80 hover:opacity-100'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg border border-white/15 bg-black/35">
          <Icon className={`size-5 ${role.color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`font-semibold ${role.color}`}>{role.role}</p>
          <p className="truncate font-mono text-[11px] text-white/55">{role.email}</p>
        </div>
        <span className={`size-2 rounded-full ${active ? 'bg-primary' : 'bg-muted-foreground/35'}`} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {role.permissions.map((permission) => (
          <span key={permission} className="rounded-md border border-white/12 bg-black/25 px-3 py-2 text-xs text-white/68">
            {permission}
          </span>
        ))}
      </div>
    </motion.button>
  )
}

function AboutValueCard({ value, index }: { value: (typeof aboutValues)[number]; index: number }) {
  const Icon = value.icon
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
      whileHover={{ y: -4 }}
      className="rounded-lg border border-border bg-card/70 p-6"
    >
      <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <h3 className="font-semibold text-foreground">{value.title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{value.body}</p>
    </motion.article>
  )
}

export function LandingPage() {
  const { user } = useAuth()
  const [activeChapter, setActiveChapter] = useState(0)
  const [activeFeature, setActiveFeature] = useState(0)
  const [activeRole, setActiveRole] = useState(1)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { scrollY, scrollYProgress } = useScroll()
  const heroY = useTransform(scrollY, [0, 900], [0, 80])
  const heroOpacity = useTransform(scrollY, [0, 900], [1, 0.88])
  const progressScale = useTransform(scrollYProgress, [0, 1], [0, 1])
  const featureHoverTimer = useRef<number | undefined>(undefined)
  const chapterHoverTimer = useRef<number | undefined>(undefined)

  const handleFeatureHover = (index: number) => {
    window.clearTimeout(featureHoverTimer.current)
    featureHoverTimer.current = window.setTimeout(() => setActiveFeature(index), 140)
  }

  const handleChapterHover = (index: number) => {
    window.clearTimeout(chapterHoverTimer.current)
    chapterHoverTimer.current = window.setTimeout(() => setActiveChapter(index), 140)
  }

  useEffect(
    () => () => {
      window.clearTimeout(featureHoverTimer.current)
      window.clearTimeout(chapterHoverTimer.current)
    },
    [],
  )

  useEffect(() => {
    const timer = window.setInterval(() => setActiveRole((current) => (current + 1) % roles.length), 4200)
    return () => window.clearInterval(timer)
  }, [])

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    document.documentElement.style.setProperty('--landing-scroll', latest.toFixed(4))
  })

  const activeVideo = chapters[activeChapter]?.video ?? videos.terrain
  const mineralEntries = useMemo(() => Object.entries(MINERAL_META), [])

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <motion.div
        className="fixed left-0 top-0 z-[60] h-1 origin-left bg-gradient-to-r from-primary via-accent to-[var(--success)]"
        style={{ scaleX: progressScale, width: '100%' }}
      />

      <motion.nav
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55 }}
        className="fixed inset-x-0 top-1 z-50 border-b border-border/60 bg-background/90 px-4 py-3 shadow-sm backdrop-blur-xl md:px-8"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Mountain className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block font-mono text-sm font-bold">MDMIS</span>
              <span className="block text-[10px] uppercase text-muted-foreground">Mining Intelligence</span>
            </span>
          </Link>

          <div className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="transition hover:text-foreground">
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {!user && <ThemeToggle />}
            {user ? (
              <ProfileDropdown />
            ) : (
              <>
                <Link href="/login" className="hidden text-sm text-muted-foreground transition hover:text-foreground sm:inline">
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="hidden items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 sm:inline-flex"
                >
                  Get Access <ArrowRight className="size-4" />
                </Link>
              </>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              className="inline-flex size-9 items-center justify-center rounded-md border border-border text-foreground transition hover:bg-muted md:hidden"
            >
              {mobileMenuOpen ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden md:hidden"
            >
              <div className="mx-auto flex max-w-7xl flex-col gap-1 pb-4 pt-3 text-sm">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-md px-3 py-2.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    {link.label}
                  </a>
                ))}
                {!user && (
                  <div className="mt-2 flex flex-col gap-2 border-t border-border/60 pt-3 sm:hidden">
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-md px-3 py-2.5 text-center text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition hover:bg-primary/90"
                    >
                      Get Access <ArrowRight className="size-4" />
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      <section className="relative flex min-h-[100svh] items-center overflow-hidden px-5 pb-16 pt-28 text-white md:px-8">
        <VideoLayer src={videos.transport} overlay={0.38} />
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
          <div className="max-w-3xl">
            <motion.h1
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.65 }}
              className="max-w-4xl text-5xl font-bold leading-[1.04] text-white drop-shadow-2xl md:text-7xl"
            >
              Mineral Detection & Mining Intelligence System
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38, duration: 0.6 }}
              className="mt-6 max-w-2xl text-base leading-7 text-white/78 md:text-xl md:leading-8"
            >
              AI-powered subsurface detection, animated geospatial context, chain-of-custody traceability and compliance automation for high-confidence mineral operations.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.55 }}
              className="mt-9 flex flex-col gap-3 sm:flex-row"
            >
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-7 py-3.5 font-semibold text-primary-foreground shadow-xl shadow-primary/20 transition hover:bg-primary/90"
              >
                Launch Platform <ArrowRight className="size-4" />
              </Link>
              <a
                href="#intelligence"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/25 bg-black/30 px-7 py-3.5 font-semibold text-white backdrop-blur transition hover:bg-white/10"
              >
                <Play className="size-4 text-accent" /> Watch The System
              </a>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.58, duration: 0.65 }}
            className="grid grid-cols-2 gap-3"
          >
            {stats.map((stat, index) => (
              <StatTile key={stat.label} {...stat} index={index} />
            ))}
          </motion.div>
        </motion.div>

        <motion.a
          href="#intelligence"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-7 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 text-[10px] uppercase text-white/70"
        >
          Scroll
          <ChevronDown className="size-4" />
        </motion.a>
      </section>

      <section id="intelligence" className="relative overflow-hidden px-5 py-24 text-white md:px-8">
        <VideoLayer src={activeVideo} overlay={0.52} />
        <div className="relative mx-auto max-w-7xl">
          <div className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-3xl">
              <p className="mb-3 font-mono text-xs uppercase text-primary">Intelligence Flow</p>
              <h2 className="text-4xl font-bold leading-tight text-white md:text-6xl">
                Six connected intelligence layers.
              </h2>
            </div>
            <p className="max-w-xl text-base leading-7 text-white/72">
              Move across 01-06 and the background shifts with the system story, keeping the videos cinematic instead of trapped inside small boxes.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {chapters.map((chapter, index) => (
              <IntelligenceTile
                key={chapter.kicker}
                chapter={chapter}
                index={index}
                active={activeChapter === index}
                onActivate={() => handleChapterHover(index)}
              />
            ))}
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            {chapters.map((chapter, index) => (
              <button
                key={chapter.kicker}
                type="button"
                onClick={() => setActiveChapter(index)}
                className={`h-2 min-w-12 flex-1 rounded-full transition md:max-w-[150px] ${
                  activeChapter === index ? 'bg-primary' : 'bg-white/25 hover:bg-white/45'
                }`}
                aria-label={`Select ${chapter.kicker}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="relative overflow-hidden px-5 py-24 text-white md:px-8">
        <VideoLayer src={features[activeFeature]?.video ?? videos.sensing} overlay={0.5} className="opacity-100" />
        <div className="relative mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            className="mb-12 max-w-3xl"
          >
            <p className="mb-3 font-mono text-xs uppercase text-primary">Animated Feature Stack</p>
            <h2 className="text-3xl font-bold leading-tight text-white md:text-5xl">Six operating layers, each backed by live motion.</h2>
            <p className="mt-4 text-base leading-7 text-white/72">
              Hover each capability to reveal its video context. The page uses all local video assets as part of the product story, not just as decoration.
            </p>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature, index) => (
              <div key={feature.title} onMouseEnter={() => handleFeatureHover(index)} onFocus={() => handleFeatureHover(index)}>
                <FeatureCard feature={feature} index={index} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="roles" className="relative overflow-hidden px-5 py-24 text-white md:px-8">
        <VideoLayer src={videos.security} overlay={0.58} />
        <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.85fr_1.15fr]">
          <div>
            <p className="mb-3 font-mono text-xs uppercase text-destructive">Access Control</p>
            <h2 className="max-w-xl text-3xl font-bold leading-tight text-white md:text-5xl">A beautiful interface still needs disciplined permissions.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/72">
              Role cards rotate automatically and respond to selection so users can understand access boundaries before entering the platform.
            </p>
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
              {['JWT Sessions', 'Audit Trail', 'Role Gates'].map((item) => (
                <div key={item} className="rounded-lg border border-white/15 bg-black/30 p-4 text-center text-xs font-semibold text-white/80 backdrop-blur">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            {roles.map((role, index) => (
              <RoleCard
                key={role.role}
                role={role}
                index={index}
                active={activeRole === index}
                onSelect={() => setActiveRole(index)}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="minerals" className="border-y border-border bg-card/20 px-5 py-20 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-9 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="mb-3 font-mono text-xs uppercase text-primary">Mineral Coverage</p>
              <h2 className="text-3xl font-bold text-foreground md:text-4xl">Tracked commodities and detection targets.</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              Mineral tags animate into view and retain the platform color language used across the operational modules.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {mineralEntries.map(([name, meta], index) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ delay: index * 0.04, duration: 0.4 }}
                whileHover={{ y: -4, scale: 1.01 }}
                className="rounded-lg border border-border bg-background/45 p-4 transition hover:border-primary/45"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className="size-3 rounded-full"
                    style={{ background: meta.color.includes('var') ? 'oklch(0.8 0.14 78)' : meta.color }}
                  />
                  <span className="font-mono text-xs text-muted-foreground">{meta.symbol}</span>
                </div>
                <p className="font-semibold text-foreground">{name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{meta.commodity}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="relative overflow-hidden px-5 py-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <p className="mb-3 font-mono text-xs uppercase text-primary">About Us</p>
              <h2 className="max-w-xl text-3xl font-bold leading-tight text-foreground md:text-5xl">
                Built in Rwanda, for the teams who work the ground.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
                MDMIS started with a simple observation: mineral operations generate enormous amounts of data across
                exploration, custody and transport, yet most of it stays siloed until an audit or export deadline forces
                it together. We built a single operational layer that keeps geologists, analysts, compliance officers
                and transport teams working from the same live picture, from first scan to final manifest.
              </p>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
                Our team works closely with Rwandan mine sites and regulatory partners to make sure the platform reflects
                how operations actually run in the field, not just how a dashboard looks in a demo.
              </p>

              <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {aboutStats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ delay: index * 0.06, duration: 0.4 }}
                    className="rounded-lg border border-border bg-card/60 p-4"
                  >
                    <p className="font-mono text-xl font-bold text-foreground">{stat.value}</p>
                    <p className="mt-1 text-[10px] uppercase text-muted-foreground">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="relative overflow-hidden rounded-lg border border-border shadow-2xl shadow-black/10"
            >
              <video autoPlay loop muted playsInline preload="metadata" className="aspect-[4/3] w-full object-cover">
                <source src={videos.sensing} type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5">
                <p className="font-mono text-xs uppercase text-primary">Field validated</p>
                <p className="mt-1 text-lg font-semibold text-white">Every model checked against real site data.</p>
              </div>
            </motion.div>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {aboutValues.map((value, index) => (
              <AboutValueCard key={value.title} value={value} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-5 py-24 text-white md:px-8">
        <VideoLayer src={videos.compliance} overlay={0.48} />
        <div className="relative mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary backdrop-blur"
          >
            <Sparkles className="size-3.5" /> Powered by mdmis-specnet-v4
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            className="text-4xl font-bold leading-tight text-white md:text-6xl"
          >
            Turn exploration data into confident mining decisions.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: 0.08 }}
            className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/72 md:text-lg"
          >
            Request access to the platform and move from detection to traceability to compliance with one connected workflow.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: 0.16 }}
            className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"
          >
            <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-8 py-3.5 font-bold text-primary-foreground transition hover:bg-primary/90">
              Sign In <ArrowRight className="size-4" />
            </Link>
            <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-md border border-white/25 bg-black/30 px-8 py-3.5 font-bold text-white backdrop-blur transition hover:bg-white/10">
              <Users className="size-4 text-accent" /> Request Access
            </Link>
          </motion.div>
        </div>
      </section>

      <section id="contact" className="px-5 py-20 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-3xl">
            <p className="mb-3 font-mono text-xs uppercase text-primary">Contact</p>
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">Built for teams who need clarity underground and accountability above it.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { icon: MapPin, title: 'Headquarters', body: 'Kigali Operations Center\nKG 7 Ave, Kigali, Rwanda' },
              { icon: Users, title: 'Technical Support', body: 'support@mdmis.rw\nPlatform and integration help' },
              { icon: ShieldCheck, title: 'Compliance Office', body: 'compliance@mdmis.rw\nOECD and ITSCI inquiries' },
              { icon: DatabaseZap, title: 'Data Access', body: 'admin@mdmis.rw\nAccounts, roles and audit records' },
            ].map(({ icon: Icon, title, body }, index) => (
              <motion.article
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
                whileHover={{ y: -4 }}
                className="rounded-lg border border-border bg-card/70 p-5"
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">{body}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card/20 px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Mountain className="size-5" />
            </span>
            <div>
              <p className="font-mono text-sm font-bold">MDMIS</p>
              <p className="text-xs text-muted-foreground">Mineral Detection & Mining Intelligence System</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
            <span>Rwanda Mines Board ready</span>
            <span>OECD Due Diligence</span>
            <span>ITSCI Traceability</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
