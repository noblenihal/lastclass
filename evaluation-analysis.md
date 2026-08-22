# AI Evaluation — is 85.08 fair, and where is the headroom?

Scored **85.08 / 100** before tests existed.

| Category | Score | Verdict |
|---|---|---|
| Problem Statement Alignment | 98 | Fair |
| Security | 98 | Fair, slightly generous |
| Accessibility | 96 | Fair |
| Code Quality | 86 | **Fair — biggest lever** |
| Efficiency | 80 | **Fair — real problems** |
| Testing | 0 | **Completely fair** |

**Short answer: the evaluation is fair.** Every deduction points at something
genuinely true of the code at that moment. Nothing here reads as the grader
misreading the project.

---

## Category by category

### Testing · 0 — unarguably correct
There were **zero test files, no runner, and no test script**. A zero is the
only honest score. This is the clearest signal in the whole report.

**Fixed since:** vitest, 78 tests, 100% statements / functions / lines and 94%
branches across the core logic — the graph's cycle guard, the WAV header, the
model-output sanitiser, and the learner model itself.

### Efficiency · 80 — fair, and the reasons are concrete
Real problems that existed at scoring time and mostly still do:

1. **Level 1 fan-out.** One lesson call, then N narration calls, then ~2N image
   calls. All parallel and non-blocking, but it is a lot of generation per
   visit.
2. **Images travel as base64 data URLs inside JSON.** The classroom backdrop is
   ~1MB; each chalk sketch ~800KB. They are held in React state and re-sent on
   every load.
3. **No caching anywhere.** Revisiting a level regenerates the entire lesson.
   Reopening a concept in the drawer refetches its brief.
4. **`localStorage` holds the whole session** including generated content, which
   is close to the 5MB ceiling if images were ever persisted.

### Code Quality · 86 — fair, and the highest-value fix
Weighted heaviest, with 14 points of headroom. What a reviewer would see:

1. **Two very large page components.** `app/classroom/page.tsx` is ~850 lines
   with sub-components declared inline; `app/level/[n]/page.tsx` is ~600 lines
   holding five (`Loading`, `InterestCapture`, `Analogy`, `Visualise`,
   `ApplyTask`).
2. **Prompts embedded in route handlers.** Long prompt strings sit inside the
   handlers rather than a dedicated prompts module, so the routing logic is
   buried in prose.
3. **Repeated request/response plumbing** across eight route handlers — the zod
   parse, the try/catch, the `errorResponse` mapping are near-identical each
   time and could be one wrapper.
4. Until just now, **model-output sanitisation was duplicated inline** in every
   route rather than shared. That is fixed (`lib/reconcile.ts`).

### Security · 98 — fair, arguably generous
Key is server-side only in an encrypted env var, every route validates input
with zod, no secrets reach the client, `.gitignore` covers credential patterns.
The two missing points are almost certainly **client-side-only auth**, which is
a deliberate scope decision but is not a real boundary.

### Accessibility · 96 — fair
Earned by the pass shipped just before scoring: reduced-motion gating on every
animation loop, live regions, a real modal drawer, radiogroup semantics,
labelled diagrams, skip link. Remaining gap: **the light themes have never had
a contrast pass**, and Daylight is the default.

### Problem Statement Alignment · 98 — fair
The strongest area, and it should be. The brief asks for a system that
understands an evolving knowledge state and adapts to it; here the knowledge
state is a visible artifact that only moves on real evidence, and it drives
what the class asks you.

---

## Where the points actually are

The organiser's own slide confirms the weighting, and solving against the
reported 85.08 gives the numbers behind it:

| Weight | Categories | Approx. share each |
|---|---|---|
| **High** | Code Quality, Problem Statement Alignment | ~26.5% |
| **Medium** | Security, Efficiency | ~16.75% |
| **Low** | Testing, Accessibility | ~6.75% |

(86×.265 + 98×.265 + 98×.1675 + 80×.1675 + 0×.0675 + 96×.0675 ≈ 85.05)

The slide is explicit that the final score is the **sum of all six — no
category is ignored**, and that when scores are close, *"Testing and
Accessibility are what separate you from the next rank."* That is exactly why
a low-weight zero was still the single most valuable thing to fix.

That changes the priority order:

| Fix | Score change | Est. gain |
|---|---|---|
| **Testing 0 → ~95** | low weight, huge delta | **+6.4** |
| **Code Quality 86 → ~95** | high weight | **+2.4** |
| **Efficiency 80 → ~92** | medium weight | **+2.0** |
| Accessibility 96 → 99 | low weight | +0.2 |

**Ceiling: roughly 85 → 96.**

Testing was worth the most despite being a "low impact" category, purely
because it was the only zero. That is now done.

---

## What to do next, in order

1. **~~Testing~~** — done. 78 tests, coverage thresholds enforced in CI config
   so it cannot silently regress.
2. **Code Quality** — split the two large page components into their own files
   under `components/lesson/` and `components/classroom/`; move prompt strings
   into a `lib/prompts/` module; wrap the repeated route plumbing in a single
   `handler()` helper. Highest weight, most headroom.
3. **Efficiency** — cache generated lessons per (topic, rung, level) in
   `sessionStorage`; serve images as binary responses with cache headers rather
   than base64 in JSON; memoise concept briefs in the drawer.
4. **Accessibility** — contrast-check the two light themes, which is the last
   known correctness gap.

## One caveat on the score itself

This is an automated evaluation of the repository. The event's rules also
describe a **hands-on functional check** where mocked data, canned AI
responses, or features that only work in a scripted demo are disqualifying —
none of which a static score measures. That check is what `manual_test.md`
is written for, and it is the one I would rehearse before relying on 85.
