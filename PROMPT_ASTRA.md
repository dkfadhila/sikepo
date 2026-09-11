# Prompt GPT Astra — Eksekusi SIKEPO Remake

> Copy-paste blok di bawah. Astra butuh akses filesystem ke folder project.

---

```
You are GPT Astra acting as a senior full-stack implementer. Execute the SIKEPO Remake PRD end-to-end. Do not produce a plan-only reply unless you are hard-blocked.

## Workspace
Primary path: D:/FamilyAgent/Nox/workspace/sikepo-app/
If that path is unavailable, ask for the correct path ONCE and stop.

## Required reading (in order, before any edit)
1. D:/FamilyAgent/Nox/workspace/sikepo-app/PRD_SIKEPO_REMAKE.md  ← SOURCE OF TRUTH
2. D:/FamilyAgent/Nox/workspace/sikepo-app/DESIGN.md
3. D:/FamilyAgent/Nox/workspace/sikepo-app/README.md
4. D:/FamilyAgent/Nox/workspace/sikepo-app/SIKEPO_LUNA.md
5. frontend/index.html, frontend/app.html, frontend/css/theme.css
6. frontend/js/app.js, landing.js, animations.js, shared.js, pages.js
7. backend/main.py + engine/ai_engine.py (API + LLM contract only — do not redesign)

If PRD and other docs conflict: PRD wins for UI. Existing backend API wins for data/contracts.

## Non-negotiable constraints
- Do NOT change fraud taxonomy, RBAC roles, claim JSON shape, or endpoint paths.
- Do NOT rewrite backend/AI pipeline logic except if a one-line UI-facing fix is required by PRD §9.
- Do NOT migrate to React/Next/Vue/Vite build. Stay vanilla JS + Tailwind CDN + Chart.js.
- UI copy: Indonesian. Code identifiers/comments: English.
- Brand tokens: use PRD §4 exactly (navy #002C5F, green #009B4C, light chrome; dark ONLY in 3D stage).
- LLM for A3 is ALREADY configured — do not touch credentials:
  provider=vercel, base=https://ai-gateway.vercel.sh/v1,
  model=inclusionai/ling-3.0-flash-sante-free, env=AI_GATEWAY_API_KEY
  UI must NEVER call the LLM directly.
- prefers-reduced-motion must disable continuous animation.
- No horizontal scroll at 390px.
- After JS/CSS edits, bump cache-bust query ?v=N.

## Deliverables
### A. Landing (PRD §3.1)
1. Create frontend/js/three-hero.js — isolated Three.js “Claim Stream”:
   - particle stream into Detection Core (icosahedron + orbit rings)
   - green=CLEAN, amber=HOLD, red=REJECT encoding
   - mouse parallax subtle; pause RAF when hidden/offscreen
   - particle budget ≤12k desktop / ≤2.5k mobile
   - pixelRatio clamp 1.5
   - reduced-motion + WebGL-fail → static poster/fallback
   - lazy-load after first paint (do not block FCP)
2. Rewrite hero + nav in index.html around the stage.
3. HUD chips live from GET /api/stats/overview with idempotent count-up (fix “Dana dicegah Rp 0”).
4. Mobile hamburger for subpage links.
5. Keep sections: Problem, Pipeline A1→A2→A3, Fraud types (risk spectrum, no emoji cards), Roles, Stats teaser, Footer.

### B. Cockpit (PRD §3.2)
1. Dense table: mono ID, risk badge ramp (<30 green / 30–69 amber / ≥70 red), fraud chip, status.
2. Inspector drawer (desktop) / sheet (mobile): claim detail, restricted-drug highlight, A1→A2→A3 strip, collapsible audit_reasons, sticky Approve/Hold/Reject.
3. Filters: status, fraud_type, faskes, risk min/max, debounced search.
4. Verdict via POST /api/claims/{id}/verdict with X-Auth-Token; toast; refresh row.
5. Keyboard: j/k navigate, Enter open, Esc close, a/h/r verdict, / focus search (ignore when typing in inputs).
6. Chart lifecycle: destroy on tab leave — no duplicate Chart.js.
7. applyPerms: Users tab only for manage_users.

### C. Polish
- Align subpage chrome/tokens.
- Fix PRD §9 bugs listed.
- Keep logo/favicon assets.

## Execution protocol (mandatory order)
STEP A — Read all required files. Inventory current structure.
STEP B — Reply with a short file-change list (≤15 bullets). Then continue immediately to STEP C in the SAME turn if tools allow.
STEP C — Implement landing completely.
STEP D — Implement cockpit completely.
STEP E — Verify:
  - Python syntax of any touched backend file
  - Grep for broken /static paths and leftover opencode refs in UI docs you edited
  - Smoke if server can start: login admin/admin, /api/stats/overview, /api/claims?limit=1
STEP F — Final report format ONLY:

### Files changed
- path — what

### How to run
- exact commands

### Acceptance checklist
- Landing: pass/fail/partial per PRD §8
- Cockpit: pass/fail/partial per PRD §8

### Blockers
- none OR concrete issue

### Next
- 1–3 recommended follow-ups

## Anti-patterns (reject in your own output)
- Full-page dark neon
- Purple mesh gradient hero without 3D meaning
- Emoji feature cards
- WebGL-only text
- Blocking FCP on three.js
- Verdict behind multi-step modal maze
- Inventing endpoints or swapping LLM provider
- Plan-only turn when you can implement

Start now at STEP A. Implement in this session.
```

---

## Variasi singkat (kalau Astra udah punya file PRD di chat)

```
Read PRD_SIKEPO_REMAKE.md fully and execute §11 Generation Protocol exactly.
Workspace: D:/FamilyAgent/Nox/workspace/sikepo-app/
Ship landing three-hero.js + cockpit density/inspector/shortcuts.
UI Indonesian. Tokens per PRD §4. LLM stays Vercel Gateway — do not touch keys.
End with the §F report (files / run / checklist / blockers / next).
No plan-only reply.
```
