'use client'

/**
 * MDMIS public landing page.
 * Direction "One motif" (taste-skill, seed 802323135): the real ground
 * profile of the Rutongo tin belt (RW-RTG-01) cuts the top edge of every
 * block, picture and band, the way MDMIS cuts a site out of the ground.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { fetchPublicStats, type PublicStats } from '@/lib/api/dashboard'
import { MINERAL_LABEL, profileClip, profileSamples, sites } from './profile'
import { SiteBlock } from './site-block'
import s from './landing.module.css'

const CLIPS = {
  '--stage-clip': profileClip('120px'),
  '--slab-clip': profileClip('18%'),
  '--pic-clip': profileClip('14%'),
  '--band-clip': profileClip('9vh'),
  '--btn-clip': profileClip('8px'),
  '--glyph-clip': profileClip('60%'),
} as CSSProperties

const MINERALS = [
  {
    key: 'cassiterite', name: 'Cassiterite', img: '/landing/img/cassiterite.jpg', field: '#22552f',
    alt: 'Black cassiterite crystals on white quartz',
    fact: 'Tin oxide, SnO₂: the ore of Rwanda’s tin belt.',
  },
  {
    key: 'coltan', name: 'Coltan', img: '/landing/img/coltan-kivu.jpg', field: '#1a4429',
    alt: 'A cut slab of columbite-tantalite from Kivu, grey ore in pale rock',
    fact: 'Columbite-tantalite, the tantalum in phone capacitors. This piece is from Kivu.',
  },
  {
    key: 'wolframite', name: 'Wolframite', img: '/landing/img/wolframite.jpg', field: '#0e2a19',
    alt: 'A dark banded block of wolframite ore',
    fact: '(Fe,Mn)WO₄, the ore of tungsten.',
  },
  {
    key: 'gold', name: 'Gold', img: '/landing/img/gold.jpg', field: '#22552f',
    alt: 'Gold flakes in a rusty limonite vein',
    fact: 'Native gold, in quartz veins and the gravels below them.',
  },
  {
    key: 'beryl', name: 'Beryl', img: '/landing/img/beryl.jpg', field: '#1a4429',
    alt: 'A pale turquoise beryl crystal',
    fact: 'Be₃Al₂Si₆O₁₈, a pegmatite mineral and the ore of beryllium.',
  },
  {
    key: 'lithium', name: 'Spodumene', img: '/landing/img/spodumene.jpg', field: '#0e2a19',
    alt: 'A clear spodumene crystal on quartz',
    fact: 'LiAlSi₂O₆, the lithium mineral of the pegmatites.',
  },
]

const STEPS = [
  { clause: 'First the flight’s photos land.', pill: 'Queued', bar: 0, rows: [['Photos', '77'], ['Stage', 'Waiting in line']] },
  { clause: 'Then every camera is placed.', pill: 'Running', bar: 40, rows: [['Cameras placed', '77 / 77'], ['GPS fit', '1.0 m']] },
  { clause: 'Then every pixel gets a depth.', pill: 'Running', bar: 80, rows: [['Area measured', '98%'], ['3D points', '14.8 M']] },
  { clause: 'Then the ground comes out.', pill: 'Done', bar: 100, rows: [['Ground relief', '29 m'], ['Tallest trees', '~22 m']] },
]

const FEATURES = [
  { title: 'Every lot keeps its custody.', more: 'Tagged at the pit, weighed, sealed and shipped: each handoff is logged, and none can be edited after.' },
  { title: 'Compliance files fill themselves.', more: 'OECD due-diligence and ITSCI fields come straight from the custody record, ready for the regulator.' },
  { title: 'Each role sees its own work.', more: 'Geologist, mine manager, compliance manager and admin: four roles, one audit trail.' },
  { title: 'Sensor limits raise incidents.', more: 'A reading past its alert rule opens a safety incident for the site’s manager.' },
  { title: 'Organisations stay apart.', more: 'Every record belongs to one organisation; the ten demo sites are shared read-only.' },
]

const CREDITS = [
  ['Cassiterite', 'Lubor Ferenc', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/w/index.php?curid=57175048'],
  ['Columbite from Kivu (Royal Museum for Central Africa)', 'Ji-Elle', 'CC BY-SA 3.0', 'https://commons.wikimedia.org/w/index.php?curid=20328565'],
  ['Wolframite', 'Darla Sondrol', 'CC0', 'https://commons.wikimedia.org/w/index.php?curid=163475441'],
  ['Gold in limonite', 'James St. John', 'CC BY 2.0', 'https://commons.wikimedia.org/w/index.php?curid=39952207'],
  ['Beryl crystal', 'W.carter', 'CC BY 4.0', 'https://commons.wikimedia.org/w/index.php?curid=170311548'],
  ['Spodumene', 'Parent Géry', 'CC BY-SA 3.0', 'https://commons.wikimedia.org/w/index.php?curid=14624247'],
  ['Rwanda landscape', 'Davyimage', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/w/index.php?curid=107130534'],
  ['Wolframite mining in Kailo', 'Julien Harneis', 'CC BY-SA 2.0', 'https://commons.wikimedia.org/w/index.php?curid=5730649'],
  ['Aukerman Park drone photos', 'OpenDroneMap', 'CC0', 'https://github.com/OpenDroneMap/odm_data_aukerman'],
]

/** Adds `data-in` to [data-rise] / [data-shutter] elements as they scroll in, staggered within each section. */
function useEntrances(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current
    if (!el || !('IntersectionObserver' in window)) return
    document.documentElement.classList.add('mdl-motion')
    const items = Array.from(el.querySelectorAll<HTMLElement>('[data-rise], [data-shutter]'))
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        const t = e.target as HTMLElement
        const group = t.closest('section, figure, footer')
        const siblings = group ? Array.from(group.querySelectorAll('[data-rise]')) : []
        t.style.transitionDelay = `${Math.max(0, siblings.indexOf(t)) * 75}ms`
        t.dataset.in = 'true'
        io.unobserve(t)
      }
    }, { rootMargin: '0px 0px -8% 0px' })
    items.forEach((i) => io.observe(i))
    return () => { io.disconnect(); document.documentElement.classList.remove('mdl-motion') }
  }, [root])
}

export function LandingPage() {
  const { user } = useAuth()
  const root = useRef<HTMLDivElement>(null)
  const [mineral, setMineral] = useState(MINERALS[0])
  const [on, setOn] = useState<boolean[]>([true, false, true, false, false])
  const [org, setOrg] = useState('Rutongo Mining Cooperative')
  const [country, setCountry] = useState<'RW' | 'CD'>('RW')
  const router = useRouter()
  const [stats, setStats] = useState<PublicStats | null>(null)
  useEntrances(root)

  // Live platform totals (/dashboard/public-stats), read once per visit
  useEffect(() => { fetchPublicStats().then(setStats).catch(() => {}) }, [])
  // only figures that say something: a 0% before any lot or scan exists does not
  const live: [string, string][] = stats ? [
    [String(stats.totalSites), 'sites on MDMIS'],
    [String(stats.activeSites), 'active now'],
    [String(stats.districtsCovered), 'districts covered'],
    ...(stats.compliantLotsPct > 0 ? [[`${stats.compliantLotsPct}%`, 'of lots compliant'] as [string, string]] : []),
    ...(stats.avgConfidence > 0 ? [[`${stats.avgConfidence}%`, 'average detection confidence'] as [string, string]] : []),
  ] : []

  const blocks = profileSamples(5).map((v) => 60 + v * 40)
  const sitesFor = (key: string) => sites.filter((x) => x.mineral === key).map((x) => x.name.split(' ')[0])

  return (
    <div ref={root} className={s.page} style={CLIPS}>
      {/* ── hero ─────────────────────────────────────────── */}
      <section className={s.hero} aria-labelledby="hero-title">
        <nav className={s.nav} aria-label="Main">
          <Link href="/" className={s.mark}><span className={s.markGlyph} aria-hidden />MDMIS</Link>
          <div className={s.navLinks}>
            <a href="#minerals" className={s.navHide}>Minerals</a>
            <a href="#how" className={s.navHide}>Drone surveys</a>
            <a href="#sites" className={s.navHide}>Sites</a>
            {user ? <Link href="/dashboard">Open dashboard</Link> : <Link href="/login">Sign in</Link>}
          </div>
        </nav>
        <div className={`${s.wrap} ${s.heroText}`}>
          <h1 id="hero-title" className={s.display}>See under the hill before you dig</h1>
          <p className={s.heroSub} data-rise>
            MDMIS turns sensor readings and drone photos from Rwanda’s mining sites into a 3D block of the ground,
            then follows every lot of tin, tantalum and tungsten to export.
          </p>
          <div className={s.heroCta} data-rise>
            {user
              ? <Link href="/dashboard" className={s.btn}>Open dashboard</Link>
              : <Link href="/login" className={s.btn}>Sign in</Link>}
            {!user && <Link href="/register" className={s.textLink}>Create an organisation</Link>}
          </div>
        </div>
        <div className={`${s.stage} ${s.shutter}`} data-shutter>
          <div className={s.stageInner}><SiteBlock /></div>
        </div>
      </section>

      {/* ── what it detects ──────────────────────────────── */}
      <section id="minerals" className={`${s.wrap} ${s.showcase}`} aria-labelledby="min-title">
        <div className={s.minerals}>
          <h2 id="min-title" className={s.head}>What it detects</h2>
          <ul className={s.mineralList} data-rise>
            {MINERALS.map((m) => (
              <li key={m.key}>
                <button className={s.mineralBtn} aria-pressed={m.key === mineral.key} onClick={() => setMineral(m)}>{m.name}</button>
              </li>
            ))}
          </ul>
          <p className={s.mineralHow} data-rise>
            Read from lab Raman spectra and field spectrometer scans, each call with a calibrated confidence a geologist can check.
          </p>
        </div>
        <div className={s.slabCol}>
        <div className={s.slab}>
          <div className={s.slabField} style={{ background: mineral.field }} />
          <div className={s.slabPic}>
            {MINERALS.map((m) => (
              <img key={m.key} src={m.img} alt={m.alt} data-on={m.key === mineral.key} width={1600} height={1200}
                loading={m.key === MINERALS[0].key ? 'eager' : 'lazy'} />
            ))}
          </div>
        </div>
          <p className={s.fact} aria-live="polite">
            <strong>{mineral.name}</strong>
            {mineral.fact} {sitesFor(mineral.key).length > 0 && <>Demo sites: {sitesFor(mineral.key).join(', ')}.</>}
          </p>
        </div>
      </section>

      {/* ── how a drone survey becomes a block ───────────── */}
      <section id="how" className={s.fields} aria-labelledby="how-title">
        {STEPS.map((st, i) => (
          <div key={st.clause} className={s.field}>
            {i === 0 && <h2 id="how-title" className={`${s.lead} ${s.fieldHead}`} style={{ fontWeight: 600 }} data-rise>From photos to ground</h2>}
            <div className={s.card} data-rise>
              <div data-ui className={s.sc}>
                <div className={s.scTop}>
                  <span className={s.scName}>Aukerman test flight</span>
                  <span className={`${s.scPill} ${st.pill === 'Done' ? s.scPillDone : ''}`}>{st.pill}</span>
                </div>
                <div className={s.scBar}><i style={{ width: `${st.bar}%` }} /></div>
                <div className={s.scRows}>
                  {st.rows.map(([k, v]) => <div key={k}><span>{k}</span><span>{v}</span></div>)}
                </div>
              </div>
            </div>
            <p className={s.clause} data-rise>{st.clause}</p>
          </div>
        ))}
      </section>

      <figure className={s.band}>
        <video autoPlay muted loop playsInline preload="metadata" poster="/landing/img/drone-block-poster.jpg" width={1280} height={720}
          aria-label="The Aukerman Park test flight rebuilt as a 3D block, turning">
          <source src="/landing/img/drone-block.webm" type="video/webm" />
        </video>
        <figcaption className={s.bandCap}>
          Aukerman Park, Ohio: 77 open drone photos (OpenDroneMap, CC0) rebuilt by MDMIS, trees and all.
        </figcaption>
      </figure>

      {/* ── the sites ────────────────────────────────────── */}
      <section id="sites" className={`${s.wrap} ${s.sitesSec}`} aria-labelledby="sites-title">
        <header><h2 id="sites-title" className={`${s.head} ${s.sitesHead}`}>Ten Rwandan sites, open on day one</h2></header>
        {live.length > 0 && (
          <dl className={s.live} aria-label="Live platform figures">
            {live.map(([value, label]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
        )}
        <div className={s.sitesGrid}>
          <figure className={s.sitesPic} data-rise>
            <img src="/landing/img/rwanda-terraces.jpg" alt="Green terraced hills under a cloudy sky in Rwanda" width={1600} height={1067} loading="lazy" />
          </figure>
          <span className={s.sitesLabel}>Demo sites</span>
          <ol className={s.table} data-rise>
            {sites.map((x) => (
              <li key={x.id} className={s.row}>
                <span className={s.rowName}>{x.name}</span>
                <span className={s.rowMuted}>{x.district}</span>
                <span className={`${s.rowMuted} ${s.rowMineral}`}>{MINERAL_LABEL[x.mineral] ?? x.mineral}</span>
                <span className={`${s.rowMuted} ${s.rowNum}`}>{x.min.toLocaleString()}–{x.max.toLocaleString()} m</span>
              </li>
            ))}
          </ol>
          <p className={`${s.small} ${s.sitesCap}`}>Terraced hills in Rwanda. Every demo site comes with its ground, shared read-only with every organisation.</p>
        </div>
      </section>

      {/* ── custody and compliance ───────────────────────── */}
      <section id="custody" className={s.feat} aria-labelledby="feat-title">
        <div className={`${s.wrap} ${s.featTop}`}>
          <h2 id="feat-title" className={s.head} data-rise>Every lot, accounted for</h2>
          <p data-rise>
            Detection finds the ore. The rest of MDMIS follows it: who dug it, who weighed it, who signed for it,
            and whether the paperwork holds.
          </p>
          <figure className={s.featPic} data-rise>
            <img src="/landing/img/kailo-pit.jpg" alt="Diggers working a hand-dug wolframite pit in red earth at Kailo, DR Congo" width={1067} height={1600} loading="lazy" />
          </figure>
          <p className={`${s.small} ${s.featCap}`}>A hand-dug wolframite pit at Kailo, DR Congo. The lots MDMIS tracks start in places like this.</p>
        </div>
        <ul className={s.bands}>
          {FEATURES.map((f, i) => (
            <li key={f.title} className={s.fband} data-on={on[i]} onClick={() => setOn((o) => o.map((v, k) => (k === i ? !v : v)))}>
              <div>
                <h3>{f.title}</h3>
                <p>{f.more}</p>
              </div>
              <button
                data-ui role="switch" aria-checked={on[i]} aria-label={f.title} className={s.toggle}
                onClick={(e) => { e.stopPropagation(); setOn((o) => o.map((v, k) => (k === i ? !v : v))) }}
              />
            </li>
          ))}
        </ul>
      </section>

      {/* ── first step ───────────────────────────────────── */}
      <section className={s.cta} aria-labelledby="cta-title">
        <div className={s.ctaText}>
          <h2 id="cta-title" className={s.display} data-rise>Open your first site</h2>
          <p data-rise>Name your organisation and you become its admin. Then invite your geologists, managers and compliance staff.</p>
        </div>
        <div className={s.dialog} data-rise>
          <form
            data-ui className={s.dlg}
            onSubmit={(e) => {
              e.preventDefault()
              router.push(`/register?org=${encodeURIComponent(org.trim())}&country=${country}`)
            }}
          >
            <h3>Name your organisation</h3>
            <label htmlFor="cta-org">Organisation name</label>
            <input id="cta-org" value={org} onChange={(e) => setOrg(e.target.value)} maxLength={120} required />
            <label id="cta-country">Country</label>
            <div className={s.seg} role="group" aria-labelledby="cta-country">
              <button type="button" aria-pressed={country === 'RW'} onClick={() => setCountry('RW')}>Rwanda</button>
              <button type="button" aria-pressed={country === 'CD'} onClick={() => setCountry('CD')}>DR Congo</button>
            </div>
            <button type="submit" className={s.dlgBtn}>Create organisation</button>
            <p className={s.dlgNote}>Next: your admin account and a 6-digit code to your email.</p>
          </form>
        </div>
      </section>

      {/* ── footer ───────────────────────────────────────── */}
      <footer className={s.footer} aria-labelledby="foot-title">
        <h2 id="foot-title" className={s.blocks} aria-label="MDMIS">
          {'MDMIS'.split('').map((ch, i) => (
            <span key={i} className={s.blk} style={{ height: `${blocks[i]}%` }} aria-hidden>{ch}</span>
          ))}
        </h2>
        <div className={s.footCols}>
          <div className={s.footCol}>
            <strong>Platform</strong>
            <Link href="/login">Sign in</Link>
            <Link href="/register">Create an organisation</Link>
            <Link href="/forgot-password">Reset password</Link>
          </div>
          <div className={s.footCol}>
            <strong>On this page</strong>
            <a href="#minerals">Minerals</a>
            <a href="#how">Drone surveys</a>
            <a href="#sites">Sites</a>
            <a href="#custody">Custody</a>
          </div>
          <div className={s.footContact}>
            <strong>Mineral Detection &amp; Mining Intelligence System</strong>
            <span>Kigali, Rwanda</span>
            <span>support@mdmis.rw</span>
          </div>
        </div>
        <p className={s.credits}>
          Pictures:{' '}
          {CREDITS.map(([what, who, lic, url], i) => (
            <span key={what}>{what} by {who}, <a href={url} target="_blank" rel="noreferrer">{lic}</a>{i < CREDITS.length - 1 ? '; ' : '.'} </span>
          ))}
          Site elevations from the MDMIS terrain set.
        </p>
        <div className={s.footBottom}>
          <span className={s.small}>© 2026 MDMIS</span>
          <Link href={user ? '/dashboard' : '/login'} className={s.btn}>{user ? 'Open dashboard' : 'Sign in'}</Link>
        </div>
      </footer>
    </div>
  )
}
