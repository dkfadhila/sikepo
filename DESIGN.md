# SIKEPO Remake — Design Blueprint

> Product: Sistem Investigasi Kelayakan Klaim & Pola Overbilling
> Goal (unchanged): Detect fraud **before** dana cair. Detect Smarter. Protect JKN.
> Scope this doc: landing + cockpit UX remake. Backend API & AI pipeline stay.

---

## Identity

**Editorial Web Designer (landing) × Product UI Designer (app).**
Question landing: *"What sentence makes the verifier want the second sentence?"*
Question app: *"What state does the user hit 90% of the time — and is it one click away?"*

---

## Grounding

Signal present: BPJS brand (navy `#002C5F` + green `#009B4C`), Healthkathon prototype, Luna feedback (no dark-neon "AI-made" full page), user brief = landing informative + interactive Three.js smooth; app "teknis tapi mudah".

**Assumption:** institutional trust stays light; the 3D lives in a dark "scan stage" viewport (already loved as hero panel). App becomes a dense technical ops console — still light for long audit sessions, mono for numbers/IDs.

**Deferred:** real production data, export PDF/CSV, session persistence (out of UI remake scope).

---

## 1. Objective

Remake SIKEPO UI so it feels like **precision health-security software**, not a generic hackathon template:
- Landing educates + impresses (3D story of claim flow → detection).
- Cockpit feels like a real verifier workstation: technical density, zero hunting.

Success: jury/public understand the product in 30s on landing; verifier reaches "Approve/Hold/Reject" in ≤2 clicks from queue.

---

## 2. Product Context

| Surface | Audience | Job |
|---|---|---|
| Landing `/` | Jury, public, stakeholders | Trust + understand 4-stage pipeline |
| Cockpit `/app` | VK / ST / SA / AU | Score, inspect, verdict claims |
| Sub-pages | Curious evaluators | Deep-dive docs (Overview, How-it-works, Detection, Data, Roles) |

Roles & permissions unchanged. Demo login `admin` / `admin`.

---

## 3. Visual Foundations

### Palette (brand-locked)

```
--bg:           #F5F7FA
--surface:      #FFFFFF
--line:         #E4E9F1
--ink:          #10243E
--navy:         #002C5F
--body:         #3E5165
--muted:        #6B7A90
--green:        #009B4C   /* clean / approve / primary CTA */
--green-dark:   #007C3D
--green-soft:   #E7F6EE
--cyan:         #0284A8   /* AI / scan / info */
--red:          #D92D20   /* reject / high risk */
--amber:        #B54708   /* hold / medium risk */
--blue:         #175CD3   /* links / secondary */

/* 3D stage only */
--stage-bg:     #070B14
--stage-grid:   rgba(148,163,184,.06)
--stage-glow:   #00ACC1
```

### Typography

| Role | Family | Notes |
|---|---|---|
| UI / body | Inter 400–800 | All chrome, copy |
| Numbers / IDs / scores | JetBrains Mono 500–700 | Tabular: claim IDs, IDR, risk 0–100, ICD-10 |

Scale: 11 / 12.5 / 14 / 16 / 20 / 28 / 40 / 56 (landing hero)

### Layout system

- Landing max-width: `1180px`, section rhythm `96–128px` desktop / `64px` mobile
- Cockpit max-width: `1280px` (denser), card radius `10–12px`, gap `12–16px`
- Breakpoint: `767px` (keep current mobile bar pattern)

---

## 4. Landing Architecture (Three.js)

### Concept: **"The Claim Stream"**

Dark stage viewport (~70–85vh). A continuous particle stream of claims flows into a central **Detection Core** (wireframe icosahedron + orbit rings = A1/A2/A3 agents). Mouse parallax + subtle idle orbit. Scroll scrub (optional phase 2) tightens camera on Core.

| Particle | Meaning | Visual |
|---|---|---|
| Green | CLEAN | Flies through, soft trail |
| Amber | Anomalous | Deflected into HOLD ring |
| Red | Fraud | Pulled into reject orbit, pulse |

HUD overlays (HTML, not WebGL text): live counters from `/api/stats/overview` (total claims, dana dicegah, anomali).

**Performance budget**
- three.js via importmap/CDN, scene < 15k particles desktop / 2.5k mobile
- devicePixelRatio clamp 1.5, pause when tab hidden / stage offscreen
- `prefers-reduced-motion` → static Core + CSS fade, no RAF loop
- FCP still aims <1.2s; 3D lazy-loads after first paint

### Section map

| # | Section | Role | Distinctive move |
|---|---|---|---|
| 1 | Nav | Brand + subpages + CTA | Glass on scroll |
| 2 | Hero + 3D stage | Hook + live proof | Particle stream + HUD stats |
| 3 | Problem | Why manual audit fails | One hard number + short prose |
| 4 | Pipeline | A1→A2→A3 story | Horizontal stepper w/ micro-anim |
| 5 | Fraud types | Educate 4 patterns | Cards with risk-spectrum bar (not emoji grid) |
| 6 | Roles | Who uses it | Role chips → cockpit deep-link |
| 7 | Public data teaser | Credibility | Compact KPI strip from API |
| 8 | Footer CTA | Enter cockpit | Navy band |

Sub-pages reuse light theme; keep content, upgrade chrome only.

---

## 5. Cockpit Architecture ("Teknis tapi mudah")

### State user hits 90%: **Queue → Inspect one claim → Verdict**

IA:
1. **Dashboard** — KPI + trend + top faskes risk (glance)
2. **Klaim** — primary ops: filterable table + side inspector
3. **Sandbox** — try audit without real data
4. **Data** — timeline + heatmap
5. **Users** — SA only

### Technical-but-clear patterns

| Pattern | Spec |
|---|---|
| Dense table | Mono ID, risk badge (0–100 color-ramped), fraud chip, compact rows |
| Risk badge | Green `<30` · Amber `30–69` · Red `≥70` |
| Inspector | Fixed right drawer (desktop) / full sheet (mobile): pasien, ICD, biaya vs INA-CBG, LOS, obat restriksi, audit reasons collapsed by default |
| Pipeline strip | A1 → A2 → A3 mini status inside inspector (score per stage) |
| Verdict bar | Sticky bottom in inspector: Approve / Hold / Reject + confirm toast |
| Filters | Status, fraud_type, faskes, risk range, search (SEP/nama/ICD) |
| Keyboard | `j/k` next/prev claim, `a/h/r` verdict (when inspector open), `/` focus search |
| Empty / loading | Skeleton rows, no layout jump |

Keep light theme for 8-hour audit comfort. Technical feel = density + mono + status language, not dark neon.

---

## 6. Accessibility

- WCAG AA contrast on light theme
- Focus-visible green ring (existing)
- `prefers-reduced-motion` honored on landing + tab transitions
- 3D stage: `aria-hidden` decorative canvas; HUD text is real DOM
- Mobile: no horizontal scroll @390px

---

## 7. Voice & Tone

- Indonesian UI copy (landing + cockpit)
- Short, operational: "Skor risiko 78 · Rekomendasi: HOLD"
- No marketing fluff; numbers first
- Tagline stays: *Detect Smarter. Protect JKN.*

---

## 8. Implementation Practices

| Layer | Choice | Why |
|---|---|---|
| Backend | Keep FastAPI + existing routes | Zero rewrite of AI/auth |
| Frontend | Keep vanilla JS + Tailwind CDN (or light Vite only if 3D module split forces it) | Match current deploy (Vercel static + API) |
| 3D | three r16x module + single `hero-stream.js` | Isolate, easy disable |
| Charts | Chart.js (keep) | Already in cockpit |
| Motion | CSS + Motion.dev progressive | Existing pattern |
| Cache bust | `?v=N` bump | Existing pattern |
| Files | New: `frontend/js/three-hero.js`, rewrite `index.html` hero, densify `app.html` + `app.js` | Minimal blast radius |

Phased delivery so demo never fully breaks.

---

## 9. Anti-Patterns (do not ship)

- Full-page dark neon (Luna rejected)
- Purple-blue-cyan gradient hero
- 6 identical rounded feature cards with emoji headers
- WebGL text as only content (must be DOM)
- 3D that blocks FCP or runs on `prefers-reduced-motion`
- Hiding verdict behind nested modals
- "Seamlessly unlock potential" copy

---

## Structure (remake phases)

### Phase 0 — Freeze goals (done in this doc)
Vision/mission/API/roles unchanged.

### Phase 1 — Landing 3D stage
1. Scaffold `three-hero.js` (scene, particles, core, mouse parallax, reduced-motion, visibility pause)
2. Wire HUD counters to `/api/stats/overview`
3. Rebuild hero HTML/CSS around stage; keep rest of landing sections, tighten copy
4. Mobile particle budget + fallback poster

### Phase 2 — Cockpit density pass
1. Table columns + risk badge system
2. Inspector drawer with pipeline strip + collapsible reasons
3. Filters + search
4. Keyboard shortcuts
5. Fix known issues: chart re-init, audit_reasons collapse

### Phase 3 — Polish
1. Sub-page nav/chrome align
2. Landing hamburger for mobile subpages (open TODO)
3. Lighthouse + 60fps check on target devices
4. Cache-bust + smoke test all tabs/roles

### Out of scope (this remake)
- Password hash / session persist (backend hardening, separate)
- Export CSV/PDF
- Real data integration

---

## Decision Trace

```json
[
  {
    "decision": "Keep light institutional theme; confine dark to 3D stage viewport",
    "reason": "Luna feedback: full dark neon felt AI-made; BPJS trust needs clinical light chrome. Dark stage is already a loved pattern (hero-character panel).",
    "alternatives": ["full dark command-center v1", "all-light no stage"],
    "tradeoff": "Less 'cyberpunk wow' than full dark; better jury/faskes credibility and long-session comfort."
  },
  {
    "decision": "Three.js claim-stream particles + Detection Core as landing hero",
    "reason": "User brief: interactive smooth 3D. Product story is literally claims flowing into audit — particles encode CLEAN/HOLD/REJECT without fake stock art.",
    "alternatives": ["static GLTF hospital", "2D canvas only", "rotate logo mesh"],
    "tradeoff": "Needs strict FPS budget and reduced-motion fallback; more engineering than a PNG."
  },
  {
    "decision": "Cockpit = dense light ops console (mono IDs, risk ramp, sticky verdict bar)",
    "reason": "Brief: 'teknis tapi mudah'. Technical feel comes from data density and status language, not darkness. 90% state is queue→inspect→verdict.",
    "alternatives": ["Bloomberg-style all-dark cockpit", "marketing-style cards only"],
    "tradeoff": "Looks less flashy in screenshots; scores higher on actual audit speed."
  },
  {
    "decision": "Keep FastAPI + vanilla JS; add three as isolated module",
    "reason": "Deploy path (Vercel + local bat) and AI pipeline already work. Remake is UI-layer; rewrite stack risks demo day.",
    "alternatives": ["Next.js rewrite", "Vite+React cockpit"],
    "tradeoff": "Less 'modern stack' points; zero backend regression risk."
  },
  {
    "decision": "HUD counters fetch live API stats instead of hardcoded marketing numbers",
    "reason": "Current landing bug: 'Dana dicegah' raced to Rp 0. Live fetch + idempotent count-up is both fix and proof the system runs.",
    "alternatives": ["static hero numbers"],
    "tradeoff": "Hero depends on API availability; need skeleton/fallback."
  }
]
```

---

## Anti-slop self-check

- U1 gradient hero: **corrected** — dark stage + brand radial accents only, no purple mesh
- U2 card grid: **corrected** — fraud cards get risk-spectrum bar, not icon+emoji template
- U3 emoji headers: **banned** in this design
- U4 isometric people: **banned** — machine/stream metaphor instead
- U5 floating stat trios: **kept deliberately** as HUD on stage (trace above) — tied to live API, not decorative trio
- U6 all-primary-buttons: **corrected** — verdict uses tri-color semantic actions
- U7 fluff copy: **banned** — operational Indonesian
- U8 em-dash spam: keep prose tight

**Status: clean** (U5 kept with justification).

---

## How app should feel (product north star)

Landing: *"This machine watches every claim so I don't miss the dangerous ones."*
Cockpit: *"I open the queue, the risk is obvious, the evidence is right there, I decide."*

---

*Blueprint by Ily / Nox — 2026-09-11*
