import { useState, useRef, useCallback, useEffect, createContext, useContext } from 'react'

// Shared ref: [{id, x, y}] for every in-flight butterfly, mutated each RAF frame.
// WarpableText reads this to push nearby words away.
const FlyerCtx = createContext(null)

const sections = [
  { id: 'about', title: 'About', numeral: 'i' },
  { id: 'writing', title: 'Writing', numeral: 'ii' },
  { id: 'studio', title: 'Studio', numeral: 'iii' },
]

const contentData = {
  about: [
    { num: 1, text: 'At heart - A storyteller, dreamer, lover of beauty.' },
    { num: 2, text: 'haru wa akebono - Heian period court-ladies. Mishima and Kawabata. Natasha and Andrei at the ball. Austen.' },
    { num: 3, text: 'LinkedIn tldr - Product Manager at a FinTech startup in HK. Previously shipped hotel concierge voicebots at PolyAI.' },
    { num: 4, text: 'Flow - Reading, writing and creating things that delight. (Ice) Dance and jamming to music. Volleyball. Kintsugi.' },
    { num: 5, text: 'Past Lives - London, Cambridge and Lockdown edition Oxford. Drew syntax trees and read Grice. Learned some Japanese and French. Wrote an unhealthy amount of fiction.' },
  ],
  writing: {
    categories: [
      {
        title: 'Personal Musings',
        items: [
          { text: 'change is often quiet', url: 'https://portableonsens.substack.com/p/change-is-often-quiet' },
          { text: 'A Love Letter to Onsens', url: 'https://portableonsens.substack.com/p/on-onsens-and-ryokans' },
          { text: 'Interlude: An Homage to Spring [2024]', url: 'https://portableonsens.substack.com/p/interlude-an-homage-to-spring-2024' },
          { text: 'From the Archive: Early October Edition [2023]', url: 'https://portableonsens.substack.com/p/from-the-archive-early-october-edition' },
          { text: 'Limbo', url: 'https://portableonsens.substack.com/p/limbo' },
          { text: 'Goodbye London', url: 'https://portableonsens.substack.com/p/goodbye-london' },
          { text: '2022', url: 'https://portableonsens.substack.com/p/2022' },
          { text: 'On Being Fickle', url: 'https://portableonsens.substack.com/p/on-being-fickle' },
          { text: 'Adrift! A Little Boat Adrift!', url: 'https://portableonsens.substack.com/p/adrift-a-little-boat-adrift' },
          { text: 'Back From The Dead(ish) Just to Daydream About Japan', url: 'https://portableonsens.substack.com/p/back-from-the-dead-ish-just-to-daydream-about-japan' },
          { text: 'Meditations on Autumn', url: 'https://portableonsens.substack.com/p/meditations-on-autumn' },
        ],
      },
      {
        title: 'Various Essays and Notes',
        items: [
          { text: 'Information Privacy in the US, EU and China: Differences in Cultural Conceptions and Regulatory Stringency', url: 'https://portableonsens.substack.com/p/information-privacy-in-the-us-eu-and-china-differences-in-cultural-conceptions-and-regulatory-stringency' },
          { text: 'Personalised Learning™ - The Future of K12 Education?', url: 'https://portableonsens.substack.com/p/personalised-learning-tm-the-future-of-k12-education-personalised-learning-tm-the-future-of-k-12-education' },
          { text: 'Megaproject Entrepreneurs', url: '#' },
          { text: 'Understanding First Language Acquisition', url: 'https://portableonsens.substack.com/p/understanding-first-language-acquisition' },
        ],
      },
    ],
  },
}

// ─── WarpableText ─────────────────────────────────────────────────────────────
// Splits text into inline-block word spans. Each RAF frame, words within
// ~90px of a flying butterfly are pushed away; they spring back when it leaves.

function WarpableText({ text }) {
  const flyerPositionsRef = useContext(FlyerCtx)
  const containerRef = useRef(null)
  const wordPosCache = useRef(null)

  useEffect(() => { wordPosCache.current = null }, [text])

  useEffect(() => {
    let raf
    const tick = () => {
      const flyers = flyerPositionsRef?.current ?? []
      const container = containerRef.current
      if (!container) { raf = requestAnimationFrame(tick); return }

      if (flyers.length > 0) {
        if (!wordPosCache.current) {
          const spans = container.querySelectorAll('span[data-word]')
          wordPosCache.current = Array.from(spans).map(el => {
            const r = el.getBoundingClientRect()
            return { el, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }
          })
        }

        for (const word of wordPosCache.current) {
          let fdx = 0, fdy = 0
          for (const f of flyers) {
            const dx = word.cx - f.x
            const dy = word.cy - f.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            const radius = 88
            if (dist < radius && dist > 0) {
              const force = (1 - dist / radius) ** 2 * 20
              fdx += (dx / dist) * force
              fdy += (dy / dist) * force
            }
          }

          const { el } = word
          if (Math.abs(fdx) > 0.1 || Math.abs(fdy) > 0.1) {
            el.style.transition = 'none'
            el.style.transform = `translate(${fdx}px, ${fdy}px)`
          } else if (el.style.transform) {
            el.style.transition = 'transform 0.55s ease-out'
            el.style.transform = ''
          }
        }
      } else if (wordPosCache.current) {
        for (const { el } of wordPosCache.current) {
          if (el.style.transform) {
            el.style.transition = 'transform 0.55s ease-out'
            el.style.transform = ''
          }
        }
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [flyerPositionsRef])

  return (
    <span ref={containerRef}>
      {text.split(/(\s+)/).map((chunk, i) =>
        /\S/.test(chunk)
          ? <span key={i} data-word="1" style={{ display: 'inline-block' }}>{chunk}</span>
          : chunk
      )}
    </span>
  )
}

// ─── FlyingButterfly ──────────────────────────────────────────────────────────
// Three-phase flight: approach → circle target word → depart off-screen.
// Wing flapping: scaleX oscillates at ~6 Hz (realistic butterfly cadence).
// Body rotates to face direction of travel.

let flyerId = 0

function FlyingButterfly({ id, x0, y0, targetX, targetY, onDone }) {
  const flyerPositionsRef = useContext(FlyerCtx)
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // ── Pre-compute path parameters ──
    const duration    = 5000 + Math.random() * 1500
    const circleR     = 52 + Math.random() * 38
    const circleDir   = Math.random() < 0.5 ? 1 : -1
    const numOrbits   = 1.5 + Math.random() * 0.75
    const startAngle  = Math.atan2(y0 - targetY, x0 - targetX)
    const totalAng    = numOrbits * Math.PI * 2 * circleDir

    // Circle entry point
    const entX = targetX + circleR * Math.cos(startAngle)
    const entY = targetY + circleR * Math.sin(startAngle)
    // Circle exit point
    const exitAng = startAngle + totalAng
    const depX = targetX + circleR * Math.cos(exitAng)
    const depY = targetY + circleR * Math.sin(exitAng)

    // Approach bezier control point (arcs gracefully toward the target)
    const cpAX = (x0 + entX) / 2 + circleDir * (60 + Math.random() * 80)
    const cpAY = (y0 + entY) / 2 - (50 + Math.random() * 60)

    // Departure: fly off to a random screen edge
    const edgeAngle  = Math.random() * Math.PI * 2
    const edgeDist   = Math.hypot(window.innerWidth, window.innerHeight) * 0.75
    const offX = window.innerWidth  / 2 + Math.cos(edgeAngle) * edgeDist
    const offY = window.innerHeight / 2 + Math.sin(edgeAngle) * edgeDist
    const cpDX = (depX + offX) / 2 + circleDir * 80
    const cpDY = (depY + offY) / 2 - 70

    flyerPositionsRef.current.push({ id, x: x0, y: y0 })

    const t0 = performance.now()
    let prevX = x0, prevY = y0, prevBodyAngle = 0
    let raf

    const tick = (now) => {
      const t = Math.min((now - t0) / duration, 1)
      let px, py

      if (t < 0.22) {
        // Phase 1: approach via quadratic bezier
        const s = t / 0.22, u = 1 - s
        px = u*u*x0   + 2*u*s*cpAX + s*s*entX
        py = u*u*y0   + 2*u*s*cpAY + s*s*entY
      } else if (t < 0.70) {
        // Phase 2: circle around target word
        const s = (t - 0.22) / 0.48
        const a = startAngle + totalAng * s
        px = targetX + circleR * Math.cos(a)
        py = targetY + circleR * Math.sin(a)
      } else {
        // Phase 3: depart via quadratic bezier off screen
        // Ease-in (s² ) so the butterfly lingers before accelerating away
        const sLin = (t - 0.70) / 0.30
        const s = sLin * sLin, u = 1 - s
        px = u*u*depX  + 2*u*s*cpDX + s*s*offX
        py = u*u*depY  + 2*u*s*cpDY + s*s*offY
      }

      // ── Keep context up to date for word-warp ──
      const pos = flyerPositionsRef.current.find(p => p.id === id)
      if (pos) { pos.x = px; pos.y = py }

      // ── Body orientation: rotate to face direction of travel ──
      const vx = px - prevX, vy = py - prevY
      const spd = Math.sqrt(vx*vx + vy*vy)
      // +90 because the butterfly image has body pointing up (antennae at top)
      const bodyAngle = spd > 0.04
        ? Math.atan2(vy, vx) * 180 / Math.PI + 90
        : prevBodyAngle
      prevBodyAngle = bodyAngle

      // ── Wing flapping: ~6 Hz, scaleX between 0.08 and 1.0 ──
      // abs(cos) gives two flaps per full oscillation (down-stroke + up-stroke)
      const flapT    = (now / 165) % (Math.PI * 2)
      const wingOpen = Math.abs(Math.cos(flapT))          // 0 = closed, 1 = open
      const wingScX  = 0.08 + wingOpen * 0.92

      // ── Subtle vertical bob in sync with wing beat ──
      const bob = Math.sin(flapT * 2) * 1.8   // bobs twice per flap cycle

      el.style.left      = px + 'px'
      el.style.top       = (py + bob) + 'px'
      // scaleX is applied before rotate (CSS right-to-left), so it compresses
      // the wing span axis correctly for any travel direction
      el.style.transform = `rotate(${bodyAngle}deg) scaleX(${wingScX})`
      el.style.opacity   = t > 0.85 ? String(Math.max(0, 1 - (t - 0.85) / 0.15)) : '1'

      prevX = px; prevY = py

      if (t < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        flyerPositionsRef.current = flyerPositionsRef.current.filter(p => p.id !== id)
        onDone()
      }
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      flyerPositionsRef.current = flyerPositionsRef.current.filter(p => p.id !== id)
    }
  }, [])

  return (
    <img
      ref={ref}
      src="/butterfly-anim.png"
      style={{
        position: 'fixed', left: x0, top: y0,
        width: 38, height: 38,
        pointerEvents: 'none', zIndex: 9999,
        willChange: 'transform, opacity',
        transformOrigin: '50% 50%',
      }}
      alt=""
    />
  )
}

// ─── CursorButterfly ──────────────────────────────────────────────────────────
// Replaces the native cursor with a butterfly that flaps its wings while the
// mouse moves and rests with wings open when still. The image is rendered
// three times — left wing, body strip, right wing — clipped to different
// vertical bands. Only the wings are scaled, so the body stays unsquished.
// Only mounts on fine-pointer devices.

const CURSOR_SRC = '/butterfly-cursor-64.png'
const BODY_INSET = 42       // % — body strip occupies center (100 - 2*BODY_INSET)%
const WING_INSET = 100 - BODY_INSET   // wings occupy outer BODY_INSET% on each side

function CursorButterfly() {
  const containerRef = useRef(null)
  const leftWingRef  = useRef(null)
  const rightWingRef = useRef(null)

  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const container = containerRef.current
    const lw = leftWingRef.current
    const rw = rightWingRef.current
    if (!container || !lw || !rw) return

    const pos = { x: -100, y: -100 }
    let lastMove = -Infinity
    let activated = false

    const activate = () => {
      if (activated) return
      activated = true
      document.documentElement.classList.add('butterfly-cursor-active')
      container.style.opacity = '1'
    }

    const onMove = (e) => {
      pos.x = e.clientX
      pos.y = e.clientY
      lastMove = performance.now()
      activate()
    }
    const onLeave = () => { container.style.opacity = '0' }
    const onEnter = () => { if (activated) container.style.opacity = '1' }

    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('mouseenter', onEnter)

    let raf
    const tick = (now) => {
      // Flutter while moving; settle to wings-open when idle.
      // 130ms grace so a tiny pause mid-motion doesn't snap the wings still.
      const fluttering = now - lastMove < 130
      const flapT    = (now / 110) % (Math.PI * 2)
      const wingOpen = fluttering ? Math.abs(Math.cos(flapT)) : 1
      const wingScX  = 0.12 + wingOpen * 0.88

      // Both wings scale toward the body center (transform-origin 50% 50%),
      // so they fold inward without dragging the body with them.
      container.style.transform = `translate(${pos.x - 16}px, ${pos.y - 16}px)`
      lw.style.transform = `scaleX(${wingScX})`
      rw.style.transform = `scaleX(${wingScX})`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('mouseenter', onEnter)
      cancelAnimationFrame(raf)
      document.documentElement.classList.remove('butterfly-cursor-active')
    }
  }, [])

  const layerStyle = {
    position: 'absolute', left: 0, top: 0,
    width: 32, height: 32,
    transformOrigin: '50% 50%',
    willChange: 'transform',
    userSelect: 'none',
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed', left: 0, top: 0,
        width: 32, height: 32,
        pointerEvents: 'none',
        zIndex: 10000,
        opacity: 0,
        willChange: 'transform, opacity',
      }}
    >
      <img
        ref={leftWingRef}
        src={CURSOR_SRC}
        alt=""
        style={{ ...layerStyle, clipPath: `inset(0 ${WING_INSET}% 0 0)` }}
      />
      <img
        ref={rightWingRef}
        src={CURSOR_SRC}
        alt=""
        style={{ ...layerStyle, clipPath: `inset(0 0 0 ${WING_INSET}%)` }}
      />
      <img
        src={CURSOR_SRC}
        alt=""
        style={{ ...layerStyle, clipPath: `inset(0 ${BODY_INSET}% 0 ${BODY_INSET}%)` }}
      />
    </div>
  )
}

// ─── Page components ──────────────────────────────────────────────────────────

function ContentItem({ num, text }) {
  const dashIndex = text.indexOf(' - ')
  const hasLabel = dashIndex !== -1
  const label = hasLabel ? text.slice(0, dashIndex) : null
  const content = hasLabel ? text.slice(dashIndex + 3) : text
  const isFlow = label === 'Flow'

  const contentRef = useRef(null)
  const waveActiveRef = useRef(false)

  // Stadium-wave through the content words on hover of "Flow". composite:'add'
  // lets the bob stack with WarpableText's butterfly-warp transforms instead
  // of replacing them mid-flight.
  const triggerWave = useCallback(() => {
    if (waveActiveRef.current) return
    const container = contentRef.current
    if (!container) return
    const spans = container.querySelectorAll('span[data-word]')
    if (!spans.length) return
    waveActiveRef.current = true

    let lastAnim
    spans.forEach((el, i) => {
      lastAnim = el.animate(
        [
          { transform: 'translateY(0)' },
          { transform: 'translateY(-14px)' },
          { transform: 'translateY(0)' },
        ],
        { duration: 480, delay: i * 45, easing: 'ease-out', composite: 'add' },
      )
    })
    lastAnim?.finished
      .then(() => { waveActiveRef.current = false })
      .catch(() => { waveActiveRef.current = false })
  }, [])

  return (
    <div className="flex gap-4 mb-6 leading-relaxed">
      <span className="text-black shrink-0">
        <WarpableText text={`[${num}]`} />
      </span>
      <span>
        {hasLabel && (
          <>
            <em onMouseEnter={isFlow ? triggerWave : undefined}>
              <WarpableText text={label} />
            </em>
            {' - '}
          </>
        )}
        <span ref={isFlow ? contentRef : undefined}>
          <WarpableText text={content} />
        </span>
      </span>
    </div>
  )
}

function Navigation({ activeSection, onSelectSection }) {
  return (
    <nav className="pt-[23vh] pb-12">
      <h1 className="text-4xl md:text-5xl mb-24 tracking-wide text-center">
        <WarpableText text="Contents" />
      </h1>
      <ul className="space-y-1 pl-[22%] pr-[26%]">
        {sections.map((section) => (
          <li key={section.id}>
            <button
              onClick={() => onSelectSection(section.id)}
              className={`w-full flex justify-between items-center text-xl md:text-2xl py-0.5 transition-colors duration-200 text-left hover:text-black ${
                activeSection === section.id ? 'text-black' : 'text-black/60'
              }`}
            >
              <span><WarpableText text={section.title} /></span>
              <span className="ml-8 tabular-nums">
                <WarpableText text={section.numeral} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function WritingContent() {
  const { categories } = contentData.writing
  return (
    <>
      {categories.map((category, idx) => (
        <div key={category.title} className={idx > 0 ? 'mt-8' : ''}>
          <h2 className="text-black mb-3">
            <WarpableText text={category.title} />
          </h2>
          <ul className="list-disc list-inside space-y-1.5">
            {category.items.map((item) => (
              <li key={item.text} className="text-black">
                <a
                  href={item.url}
                  className="text-black no-underline hover:text-black/60 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WarpableText text={item.text} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  )
}

function Content({ activeSection, textRef }) {
  const isComingSoon = activeSection === 'studio'
  const isWriting = activeSection === 'writing'
  const items = contentData[activeSection] || []

  // Writing aligns its first heading with "Contents" on the left;
  // other sections sit lower, level with the nav list items.
  const topPad = isWriting
    ? 'pt-[calc(23vh+1cm)] md:pt-[calc(23vh+1cm)]'
    : 'pt-[calc(23vh+8rem)] md:pt-[calc(23vh+9rem)]'

  return (
    <article className={`${topPad} pb-12 px-8 md:px-12 lg:px-16`}>
      {isComingSoon && (
        <img
          src="/flower-field-bottom.png"
          alt=""
          className="fixed bottom-0 right-0 w-full md:w-1/2 pointer-events-none select-none"
        />
      )}
      <div ref={textRef} className="text-[17.5px]">
        {isComingSoon ? (
          <p className="text-[23px] text-black/60 italic">
            <WarpableText text="coming soon" />
          </p>
        ) : isWriting ? (
          <div className="text-[15px]"><WritingContent /></div>
        ) : (
          items.map((item) => (
            <ContentItem key={item.num} num={item.num} text={item.text} />
          ))
        )}
      </div>
    </article>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  const [activeSection, setActiveSection] = useState('about')
  const [butterflies, setButterflies] = useState([])
  const textRef = useRef(null)
  const flyerPositionsRef = useRef([]) // mutated directly — no re-renders

  // Pre-decode both flower PNGs so they paint instantly: the Contents-page
  // one on initial load, and the bottom field the first time the user clicks
  // Analogue/Digital. <link rel="preload"> handles the fetch in parallel.
  useEffect(() => {
    for (const src of ['/coming-soon-flowers.png', '/flower-field-bottom.png']) {
      const img = new Image()
      img.src = src
      img.decode?.().catch(() => {})
    }
  }, [])

  const removeButterfly = useCallback((id) => {
    setButterflies(prev => prev.filter(b => b.id !== id))
  }, [])

  const handleClick = useCallback((e) => {
    // Let button/link clicks navigate normally without spawning
    if (e.target.closest('button, a')) return

    const cx = e.clientX, cy = e.clientY

    // Find all warpable word spans on the page and pick a nearby target
    const wordSpans = Array.from(document.querySelectorAll('[data-word]'))
    if (!wordSpans.length) return

    const ranked = wordSpans
      .map(el => {
        const r = el.getBoundingClientRect()
        const wx = r.left + r.width / 2, wy = r.top + r.height / 2
        return { wx, wy, dist: Math.hypot(wx - cx, wy - cy) }
      })
      .sort((a, b) => a.dist - b.dist)

    // Random word from the 8 nearest — butterfly feels responsive but not too predictable
    const pool   = ranked.slice(0, Math.min(8, ranked.length))
    const target = pool[Math.floor(Math.random() * pool.length)]

    setButterflies(prev => [...prev, {
      id: flyerId++,
      x0: cx, y0: cy,
      targetX: target.wx, targetY: target.wy,
    }])
  }, [])

  return (
    <FlyerCtx.Provider value={flyerPositionsRef}>
      <div className="min-h-screen bg-cream text-black font-serif" onClick={handleClick}>

        {/* Mobile layout */}
        <div className="md:hidden">
          <Navigation activeSection={activeSection} onSelectSection={setActiveSection} />
          <div className="border-t border-divider mx-8" />
          <Content activeSection={activeSection} textRef={textRef} />
        </div>

        {/* Desktop layout */}
        <div className="hidden md:flex min-h-screen">
          <div className="w-1/2 relative">
            <Navigation activeSection={activeSection} onSelectSection={setActiveSection} />
            <img
              src="/coming-soon-flowers.png"
              alt=""
              className="fixed bottom-0 left-0 w-1/2 pointer-events-none select-none"
            />
            <div
              className="absolute top-0 right-0 w-2 h-full pointer-events-none"
              style={{ background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.08))' }}
            />
          </div>
          <div className="w-1/2 relative">
            <div
              className="absolute top-0 left-0 w-2 h-full pointer-events-none"
              style={{ background: 'linear-gradient(to left, transparent, rgba(0,0,0,0.08))' }}
            />
            <Content activeSection={activeSection} textRef={textRef} />
          </div>
        </div>

        {butterflies.map(b => (
          <FlyingButterfly key={b.id} {...b} onDone={() => removeButterfly(b.id)} />
        ))}

        <CursorButterfly />
      </div>
    </FlyerCtx.Provider>
  )
}

export default App
