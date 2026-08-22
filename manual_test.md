# LastClass — manual test guide

Live: https://promptwar-private-8db59kytq-nihal-guptas-projects.vercel.app

> Use **Chrome**. Speech recognition is Chrome-only — every screen has a
> "Type instead" toggle, so nothing is blocked without a mic, but the voice
> path is the better demo.

---

## Phase 0 — deployment sanity (30 seconds)

| # | Do this | Expect |
|---|---------|--------|
| 0.1 | Open the live URL in a **logged-out / incognito** window | The sign-in screen loads. **No Vercel login wall.** If you see a Vercel SSO page, deployment protection got re-enabled |
| 0.2 | Watch the background for ~10s | Two warm blooms slowly pulse (a 9s "breathing" cycle). Not static |
| 0.3 | Resize the window down to ~375px wide | No horizontal scrollbar at any width |

---

## Phase 1 — concept map + five levels

### 1.1 Sign in
1. On the sign-in screen, click **Continue as evaluator**.
   (Or type any name / any valid-looking email / any 4+ char password.)
2. **Expect:** you land on the topic screen, your name in the top-right.

*Also check:* the empty-field errors are real — click *Enter the classroom*
with blank fields and you get a specific message, not a silent failure.

### 1.2 Build a curriculum — this is a live Gemini call
1. **Topic:** type something specific, e.g. `How recursion works`
2. **A hobby or interest:** e.g. `cricket`
3. Click **Build my 5 levels**.
4. **Expect (~3–6s, button shows "Building your levels…"):** you land on the
   workspace.

**What proves it's real, not hardcoded:** run it twice with different topics.
Try a *practical* one — `tying a bowline knot` — and a *theory* one —
`photosynthesis`. The header label under the topic must change between
**Theory topic / Practical skill / Theory + practice**, and the concepts and
level titles must be completely different and specific to that topic. Level
titles should read like a teacher wrote them for that subject (e.g. for
recursion, level 4 came back as *"Implement Divide-and-Conquer Algorithms
and Tree Traversals"*), never a generic "Level 4: Apply".

> Try a nonsense topic (`asdfgh`) — you should get a clean error message,
> not a crash or a fabricated curriculum.

### 1.2b Depth calibration — the strongest proof it is not canned
Run the **same topic at two different depths** and compare.

1. Topic `gravity`, interest `football`, depth **Basic** → Build.
   Note the concept names, then go back and run it again with depth
   **Advanced**.
2. **Expect completely different curricula, not reworded ones.** Our run gave:

   | Basic (10-year-old) | Advanced (university) |
   |---|---|
   | Earth's Invisible Pull | Equivalence Principle & Metric Geometry |
   | Bigger Objects Pull Harder | Stress-Energy Tensor & Conservation |
   | Dropping at Equal Speed | Geodesic Motion & Affine Connections |
   | Air Pushing Back | Einstein Field Equations |
   | Falling Around the Curve | Linearized Gravity & Wave Dynamics |

   Basic's level 4 also picked up the stated interest:
   *"Predicting the Path of High Kicks and Drops."*

### 1.2c Level detection from your own writing
1. On the topic screen click **"Or paste something you've written about it"**.
2. Paste a few sentences of your own explanation of the topic — deliberately
   make it half-right (confident but with a gap or an error).
3. Build.
4. **Expect:** the concept map does **not** start at all-zero. Nodes the
   writing demonstrated come back partly filled; nodes it said nothing about
   stay at "not started". Confident-sounding but wrong prose should NOT earn
   mastery — that is the strict-grading rule working.

### 1.3 The learning path
1. Look at the map — it's always on screen, on every level.
2. **Expect:**
   - Columns are labelled **Start here → Builds on that → Advanced**, so the
     left-to-right axis has a stated meaning.
   - Each circle is **numbered in learning order** — follow 1, 2, 3…
   - Arrows point *from* a prerequisite *to* what it unlocks.
   - Each circle has a **ring**: an empty track at 0%, filling with ember as
     mastery rises. At the start every node reads "not started".
   - Names wrap onto two lines — nothing is truncated.
3. **Hover any circle.** The panel below shows its gist and names its
   prerequisites in plain words ("Needs first: …").
4. Reload — the layout is identical every time (deterministic, never jitters).

### 1.4 The level rail
1. Click through levels 1–5 in the left rail.
2. **Expect:** the panel below the map swaps to that level, showing its title,
   what happens there, and the concept chips it touches. Locked levels say so.
3. Levels 1–4 currently say "being built" — **level 5 is the playable one.**

---

## Phase 2 — the Classroom (the main event)

### 2.1 Enter
1. Select **level 5 · Teach** in the rail → **Enter the classroom**.
2. **Expect:** five animal students at desks, all dimmed, no hands up.
   Status line: *"No questions yet — explain first."*

### 2.2 Explain the topic — deliberately badly
This is the important part. **Give a shallow explanation on purpose** so you
can see the system catch it. For recursion, paste or say exactly this:

> *"Recursion is when a function calls itself. You just keep calling it again
> with a smaller input and eventually it finishes and gives you the answer.
> It is used for things like factorial."*

Then press **Take questions**.

**Expect (~4–8s):** hands go up. In our run this exact input produced:
- 🦉 **Prof. Hoot** attacked the hand-wave: *"You said it 'eventually
  finishes' — what explicit stopping condition…"*
- 🐢 **Tito** caught the skipped step: *"where are all those paused calls kept
  in memory?"*
- 🦜 **Kiki** restated it **wrongly**: *"the old function finishes immediately
  and disappears, right?"*

**What proves it's real:** the questions quote *your own words back at you*.
Explain the same topic *well* and you should get fewer/harder questions;
explain a different topic and the questions change completely.

### 2.2b The depth context reaches the classroom too
The depth you picked at intake is threaded into every downstream prompt, so
the class interrogates you at your level. Give the **same** gravity
explanation at Basic and at Advanced:

> *"Gravity is a force that pulls things down towards the earth. Heavier
> things feel it more. That is why a ball comes back down when you kick it up."*

**Expect:**
- **Basic** — 🐶 Bruno: *"what is a force in plain words? Is someone invisible
  tugging on the ball?"*
- **Advanced** — 🐢 Tito: *"what is the rigorous distinction between an
  object's invariant mass and its gravitational weight?"*

Both should also weave in the interest you gave (with `football`, ours used
goalposts, crossbars and medicine balls unprompted).

### 2.3 Answer a question
1. Click a raised hand (or **Answer next question**).
2. **Expect:** the card opens, that character's avatar pulses, and the question
   is **spoken aloud in that character's voice** (each has a different voice).
3. Answer it properly. Click **Explain**.
4. **Expect:** the character replies in character, out loud, and **their hand
   goes down**. Go back and look at the map — that concept's node is
   **brighter** than before.

### 2.4 The Kiki trap — best single thing to demo
1. Find Kiki 🦜's question. She always restates your explanation with **one
   plausible-but-wrong detail** planted in it.
2. **Answer "yes, that's right"** — agree with her.
3. **Expect:** she is *not* satisfied, the answer is marked wrong, and that
   concept's mastery goes **down**.
4. Now do it again and *catch the error* — say what she got wrong and correct
   it. **Expect:** resolved, hand down, mastery up.

### 2.5 Skipping — the debt mechanic
1. On any question, press **Skip for now**.
2. **Expect:** her hand **stays up**, the desk bar under her turns rose, and the
   hand switches to a slow idle wave. The status line counts it as skipped.
3. **Severity is visible:** a fundamental misunderstanding waves fast and wide
   with a rose glow; a minor clarification barely moves.

### 2.6 End class → report card
1. Press **End class** with at least one hand still up.
2. **Expect:**
   - A verdict headline that reflects what actually happened
     (*"You left 2 hands in the air."* vs *"Every hand went down."*)
   - The concept map again — now visibly changed by the class
   - Every question listed as Cleared / Skipped / Didn't land
   - Skipped questions have pulled their concepts' mastery **down**
3. Click **Teach it again** and give a *better* explanation. **Expect:** fewer
   hands, and the map gets brighter. This is the adaptive loop closing.

---

## What to look for as an evaluator

- **Nothing is hardcoded.** Concept graphs, level titles, questions, character
  replies and every mastery change come from live Gemini calls. Change the
  topic and all of it changes.
- **The assessment is the teaching.** There is no quiz anywhere in the app.
- **The learner model is visible and causal.** The map only moves in response
  to something you actually did, and you can watch it move.

## Known limits (deliberate, not broken)

- Levels 1–4 are scaffolded but not yet playable — level 5 is the full loop.
- Speech recognition is Chrome-only; typed fallback is always available.
- Each character line is a live TTS call, so expect ~1–2s before audio starts.
- Sign-in is client-side only and stores a profile locally; it gates the UI and
  personalises the class, and is not a server-enforced security boundary.
