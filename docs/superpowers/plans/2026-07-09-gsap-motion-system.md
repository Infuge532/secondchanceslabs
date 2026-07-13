# GSAP Motion System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the site's scroll animation system on GSAP + ScrollTrigger + SplitText so every animated element re-triggers both scrolling down and back up, and add text-reveal, hero parallax, gallery hover/tilt/lightbox, magnetic buttons, grain texture, and river-motif reinforcement — all approved in `docs/superpowers/specs/2026-07-09-gsap-motion-system-design.md`.

**Architecture:** `index.html` loads GSAP/ScrollTrigger/SplitText from CDN as classic scripts (global `gsap`/`ScrollTrigger`/`SplitText`), then `js/main.js` as a native ES module (`type="module"`) that imports and calls an `init*()` function from each focused motion module under `js/`. No bundler, no build step — files are plain ES modules served statically.

**Tech Stack:** Vanilla HTML/CSS/JS, GSAP 3.12 core + ScrollTrigger + SplitText (CDN, jsDelivr), native ES modules (no bundler).

## Global Constraints

- No build step, no bundler, no npm install — GSAP/ScrollTrigger/SplitText load via CDN `<script>` tags exactly as specified in the design doc.
- Every new animation must render its final state instantly with no motion when `prefers-reduced-motion: reduce` is set. This is checked per-task, not deferred to the end.
- No changes to copy, color tokens, or fonts in `css/main.css` `:root`.
- Git was initialized on 2026-07-09 with an initial baseline commit (`c91859e`) containing the round-one demo site, discovery docs, and this spec/plan. Each task should be committed on completion.
- Test steps use the project's own dev server, not an automated test framework — none exists for this static site, and adding one is out of scope. Verification is done by starting the server and driving the page with the preview/browser tool, asserting on computed styles, element state, and console output.
- Preview/testing requires `.claude/launch.json` to exist (created in Task 1) so the site can be started as a named server.

---

### Task 1: Preview server config + CDN scripts + module conversion

**Files:**
- Create: `.claude/launch.json`
- Modify: `index.html:10-13` (head, add nothing here — see below), `index.html:294` (script tag at end of body)

**Interfaces:**
- Produces: a running static server reachable via the preview tool under the name `second-chance-slabs`; `window.gsap`, `window.ScrollTrigger`, `window.SplitText` globals available to every module loaded afterward; `js/main.js` now loads as `type="module"`.

- [ ] **Step 1: Create the launch config**

Create `.claude/launch.json`:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "second-chance-slabs",
      "runtimeExecutable": "python3",
      "runtimeArgs": ["-m", "http.server", "8080"],
      "port": 8080
    }
  ]
}
```

- [ ] **Step 2: Add CDN scripts and convert main.js to a module**

In `index.html`, replace the closing script tag:

```html
<script src="js/main.js"></script>
```

with:

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.7/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.7/dist/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.7/dist/SplitText.min.js"></script>
<script type="module" src="js/main.js"></script>
```

- [ ] **Step 3: Start the server and verify libraries load**

Use the preview tool to start the `second-chance-slabs` configuration, then evaluate in the page:

```js
({
  gsap: typeof gsap !== "undefined",
  scrollTrigger: typeof ScrollTrigger !== "undefined",
  splitText: typeof SplitText !== "undefined",
})
```

Expected: `{ gsap: true, scrollTrigger: true, splitText: true }`.

- [ ] **Step 4: Check console for errors**

Check the preview tool's console output. Expected: no 404s or script errors. (main.js will currently fail silently or no-op since it's not yet an ES module internally that exports anything — this is fine, existing IIFE-style code runs fine as a module body too, since ES modules can contain top-level executable statements just like classic scripts.)

---

### Task 2: Shared GSAP setup module

**Files:**
- Create: `js/gsap-setup.js`

**Interfaces:**
- Consumes: global `gsap`, `ScrollTrigger`, `SplitText` from Task 1.
- Produces: `export function prefersReducedMotion(): boolean` and `export function isDesktopProcess(): boolean`, both used by every subsequent motion module. Also registers the GSAP plugins as a side effect of importing this file at all — every other motion module must import at least one named export from `./gsap-setup.js` so this registration runs before that module's own top-level code (ES modules fully evaluate their imports before running their own body, so this ordering is guaranteed regardless of import order elsewhere).

- [ ] **Step 1: Create the file**

```js
// js/gsap-setup.js
gsap.registerPlugin(ScrollTrigger, SplitText);

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isDesktopProcess() {
  return window.matchMedia("(min-width: 821px)").matches;
}
```

- [ ] **Step 2: Verify via dynamic import**

With the server running, evaluate:

```js
const m = await import("/js/gsap-setup.js");
({
  hasFn: typeof m.prefersReducedMotion === "function",
  value: m.prefersReducedMotion(),
  hasDesktopFn: typeof m.isDesktopProcess === "function",
})
```

Expected: `{ hasFn: true, value: false, hasDesktopFn: true }` (assuming the test browser has no reduced-motion OS setting).

- [ ] **Step 3: Confirm plugin registration**

```js
Object.keys(gsap.core.globals())
```

Expected: array including `"ScrollTrigger"` and `"SplitText"`.

---

### Task 3: Reveal engine core — migrate hero (minus h1), story, section-heads, proof-copy, designer panels

**Files:**
- Create: `js/reveals.js`
- Modify: `index.html` (strip now-unused delay classes from hero/story elements — see below)
- Modify: `css/main.css:124-127` (old reveal CSS)
- Modify: `js/main.js` (remove old `IntersectionObserver` reveal block, add new import + init call)

**Interfaces:**
- Consumes: `prefersReducedMotion` from `./gsap-setup.js`.
- Produces: `export function initReveals()`. Later tasks (4, 5) extend this same file and function; Task 6 imports an additional export `revealLeadtimeInternals` added there.

- [ ] **Step 1: Strip delay classes from hero and story markup**

In `index.html`, the hero block currently reads:

```html
    <p class="eyebrow reveal">Kansas City · Walnut · Epoxy</p>
    <h1 class="reveal d1">Every slab deserves<br>a <span class="ink-river">second chance</span>.</h1>
    <p class="hero-sub reveal d2">Fallen trees, rescued and rebuilt into heirloom river tables — one commission at a time.</p>
    <div class="hero-cta reveal d3">
```

Replace with (drop `d1`/`d2`/`d3`, drop `reveal` from the `<h1>` since Task 9 will own its animation via SplitText instead):

```html
    <p class="eyebrow reveal">Kansas City · Walnut · Epoxy</p>
    <h1>Every slab deserves<br>a <span class="ink-river">second chance</span>.</h1>
    <p class="hero-sub reveal">Fallen trees, rescued and rebuilt into heirloom river tables — one commission at a time.</p>
    <div class="hero-cta reveal">
```

The story steps currently read:

```html
    <div class="story-step reveal" role="listitem">
      <span class="story-num">Standing</span>
      <p>A walnut grows for eighty years, recording every season in its grain.</p>
    </div>
    <div class="story-step reveal d1" role="listitem">
      <span class="story-num">Fallen</span>
      <p>A storm, a road crew, a forgotten lot. Most of these trees become firewood.</p>
    </div>
    <div class="story-step reveal d2" role="listitem">
      <span class="story-num">Rescued</span>
      <p>We find the ones worth saving — the quilted grain, the wild live edges, the character.</p>
    </div>
    <div class="story-step reveal d3" role="listitem">
      <span class="story-num">Heirloom</span>
      <p>Months later it anchors a home or a boardroom, ready for its next hundred years.</p>
    </div>
```

Replace each `reveal d1`/`reveal d2`/`reveal d3` with plain `reveal` (four occurrences total, one already plain):

```html
    <div class="story-step reveal" role="listitem">
      <span class="story-num">Standing</span>
      <p>A walnut grows for eighty years, recording every season in its grain.</p>
    </div>
    <div class="story-step reveal" role="listitem">
      <span class="story-num">Fallen</span>
      <p>A storm, a road crew, a forgotten lot. Most of these trees become firewood.</p>
    </div>
    <div class="story-step reveal" role="listitem">
      <span class="story-num">Rescued</span>
      <p>We find the ones worth saving — the quilted grain, the wild live edges, the character.</p>
    </div>
    <div class="story-step reveal" role="listitem">
      <span class="story-num">Heirloom</span>
      <p>Months later it anchors a home or a boardroom, ready for its next hundred years.</p>
    </div>
```

The commission proof and designer panels currently read `reveal` / `reveal d1` — replace both `d1` occurrences the same way (`proof-copy reveal` stays, `leadtime-card reveal d1` → `leadtime-card reveal`, `designer-controls reveal d1` → `designer-controls reveal`). Leave `gpiece` tiles alone — Task 5 handles those.

- [ ] **Step 2: Replace old CSS reveal rules**

In `css/main.css`, replace:

```css
/* ---------- Reveal animation ---------- */
.reveal{ opacity:0; transform:translateY(26px); transition:opacity .9s var(--ease), transform .9s var(--ease); }
.reveal.in{ opacity:1; transform:none; }
.d1{ transition-delay:.12s; } .d2{ transition-delay:.24s; } .d3{ transition-delay:.36s; }
```

with:

```css
/* ---------- Reveal animation (initial state only — GSAP drives the transition) ---------- */
.reveal{ opacity:0; transform:translateY(26px); }
```

- [ ] **Step 3: Create the reveal engine**

```js
// js/reveals.js
import { prefersReducedMotion } from "./gsap-setup.js";

function revealGroup(elements, trigger, { stagger = 0.12, y = 26, start = "top 85%" } = {}) {
  const els = elements.filter(Boolean);
  if (!els.length || !trigger) return;

  if (prefersReducedMotion()) {
    gsap.set(els, { opacity: 1, y: 0 });
    return;
  }

  gsap.set(els, { opacity: 0, y });
  ScrollTrigger.create({
    trigger,
    start,
    onEnter: () => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: "power2.out", stagger }),
    onEnterBack: () => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: "power2.out", stagger }),
    onLeave: () => gsap.to(els, { opacity: 0, y, duration: 0.5, ease: "power2.in", stagger: stagger / 2 }),
    onLeaveBack: () => gsap.to(els, { opacity: 0, y, duration: 0.5, ease: "power2.in", stagger: stagger / 2 }),
  });
}

export function initReveals() {
  const hero = document.querySelector(".hero");
  if (hero) {
    revealGroup(
      [hero.querySelector(".eyebrow"), hero.querySelector(".hero-sub"), hero.querySelector(".hero-cta")],
      hero,
      { stagger: 0.15, start: "top 100%" }
    );
  }

  document.querySelectorAll(".story-step").forEach((el) => {
    revealGroup([el], el, { start: "top 88%", stagger: 0 });
  });

  const storyOrigin = document.querySelector(".story-origin");
  if (storyOrigin) revealGroup([storyOrigin], storyOrigin, { start: "top 88%", stagger: 0 });

  document.querySelectorAll(".section-head").forEach((el) => {
    revealGroup([el], el, { start: "top 88%", stagger: 0 });
  });

  const proofCopy = document.querySelector(".proof-copy");
  if (proofCopy) revealGroup([proofCopy], proofCopy, { start: "top 85%", stagger: 0 });

  const designerPreview = document.querySelector(".designer-preview");
  if (designerPreview) revealGroup([designerPreview], designerPreview, { start: "top 85%", stagger: 0 });

  const designerControls = document.querySelector(".designer-controls");
  if (designerControls) revealGroup([designerControls], designerControls, { start: "top 85%", stagger: 0 });
}

export { revealGroup };
```

Note: `.leadtime-card` is deliberately **not** included here — Task 6 gives it a richer internal stagger instead of a single block fade.

- [ ] **Step 4: Wire into main.js**

In `js/main.js`, delete the old scroll-reveal block:

```js
  /* ---------- Scroll reveals ---------- */
  const revealer = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
    { threshold: 0.15 }
  );
  document.querySelectorAll(".reveal").forEach((el) => revealer.observe(el));
```

At the very top of `js/main.js` (before the existing `(function () { "use strict";` IIFE — leave the IIFE and everything inside it untouched for now except the deletion above), add:

```js
import { initReveals } from "./reveals.js";

/* ---------- Motion module imports ---------- */
initReveals();
```

This `/* ---------- Motion module imports ---------- */` comment is the anchor Tasks 4–14 will append additional imports and init calls beneath.

- [ ] **Step 5: Verify in browser**

Restart/reload the preview server, then evaluate:

```js
(() => {
  const eyebrow = document.querySelector(".hero .eyebrow");
  const before = getComputedStyle(eyebrow).opacity;
  return { beforeScroll: before };
})()
```

Expected: `beforeScroll` is `"1"` (hero is at `start: "top 100%"`, which fires immediately since the hero is in view on load).

Then scroll to the story section and check a story-step:

```js
document.querySelector(".story-step").scrollIntoView();
await new Promise((r) => setTimeout(r, 1000));
getComputedStyle(document.querySelector(".story-step")).opacity
```

Expected: `"1"`.

Then scroll back to the very top and re-check the same story-step is hidden again:

```js
window.scrollTo(0, 0);
await new Promise((r) => setTimeout(r, 1000));
getComputedStyle(document.querySelector(".story-step")).opacity
```

Expected: `"0"` — confirming bidirectional re-triggering.

---

### Task 4: Footer reveal

**Files:**
- Modify: `index.html:269-292` (footer markup)
- Modify: `js/reveals.js`

**Interfaces:**
- Consumes: `revealGroup` from within `js/reveals.js` (same file, no new export needed).
- Produces: footer brand mark, each footer column, and the legal line now animate in/out with the rest of the reveal system.

- [ ] **Step 1: Add reveal classes to the footer**

In `index.html`, replace:

```html
<footer class="footer">
  <div class="footer-brand">
    <img src="assets/monogram.svg" alt="" width="48" height="48">
    <span class="nav-wordmark"><em>Second Chance</em><strong>Slabs</strong></span>
  </div>
  <div class="footer-cols">
```

with:

```html
<footer class="footer">
  <div class="footer-brand reveal">
    <img src="assets/monogram.svg" alt="" width="48" height="48">
    <span class="nav-wordmark"><em>Second Chance</em><strong>Slabs</strong></span>
  </div>
  <div class="footer-cols">
```

Then for each of the three `<div>` children of `.footer-cols` (Visit / Contact / Care), add `class="reveal"`:

```html
  <div class="footer-cols">
    <div class="reveal">
      <p class="footer-h">Visit</p>
      <p data-config="location">Kansas City, Missouri</p>
      <p>Shop visits by appointment</p>
    </div>
    <div class="reveal">
      <p class="footer-h">Contact</p>
      <p><a data-config="email" href="mailto:hello@secondchanceslabs.com">hello@secondchanceslabs.com</a></p>
      <p><a data-config="facebook" href="#">Facebook</a></p>
    </div>
    <div class="reveal">
      <p class="footer-h">Care</p>
      <p><a href="#">Living with your table</a></p>
      <p><a href="#">Repairs &amp; maintenance</a></p>
    </div>
  </div>
  <p class="footer-legal mono reveal">© 2026 Second Chance Slabs · Every table is one of one</p>
```

- [ ] **Step 2: Add the reveal call**

In `js/reveals.js`, add to `initReveals()`:

```js
  const footer = document.querySelector(".footer");
  if (footer) {
    const footerEls = [
      footer.querySelector(".footer-brand"),
      ...footer.querySelectorAll(".footer-cols > div"),
      footer.querySelector(".footer-legal"),
    ];
    revealGroup(footerEls, footer, { stagger: 0.1, start: "top 90%" });
  }
```

(Insert this just before the closing `}` of the `initReveals` function — i.e., above the trailing `export { revealGroup };` line at the end of the file.)

- [ ] **Step 3: Verify**

Scroll to the bottom of the page and evaluate:

```js
document.querySelector(".footer").scrollIntoView();
await new Promise((r) => setTimeout(r, 1200));
[".footer-brand", ".footer-cols > div", ".footer-legal"].map(
  (sel) => getComputedStyle(document.querySelector(sel)).opacity
)
```

Expected: all `"1"`.

---

### Task 5: Gallery per-tile stagger

**Files:**
- Modify: `index.html:144-167` (gallery tile classes)
- Modify: `js/reveals.js`

**Interfaces:**
- Produces: all 6 gallery tiles animate in with a distinct per-tile stagger instead of the current 3 shared delay classes.

- [ ] **Step 1: Normalize tile classes**

In `index.html`, the six gallery tiles currently read `gpiece gp-a reveal`, `gpiece gp-b reveal d1`, `gpiece gp-c reveal d2`, `gpiece gp-d reveal`, `gpiece gp-e reveal d1`, `gpiece gp-f reveal d2`. Strip the `d1`/`d2` suffixes so each is just `gpiece gp-X reveal`:

```html
    <a href="#" class="gpiece gp-a reveal" aria-label="Walnut river coffee table, details">
```
```html
    <a href="#" class="gpiece gp-b reveal" aria-label="Distressed walnut sofa table, details">
```
```html
    <a href="#" class="gpiece gp-c reveal" aria-label="Quilted walnut dining table, details">
```
```html
    <a href="#" class="gpiece gp-d reveal" aria-label="Breckenridge mantle, details">
```
```html
    <a href="#" class="gpiece gp-e reveal" aria-label="Cookie island coffee table, details">
```
```html
    <a href="#" class="gpiece gp-f reveal" aria-label="Pistachio wall art, details">
```

- [ ] **Step 2: Add the stagger call**

In `js/reveals.js`, add to `initReveals()`:

```js
  const galleryGrid = document.querySelector(".gallery-grid");
  if (galleryGrid) {
    revealGroup(Array.from(galleryGrid.querySelectorAll(".gpiece")), galleryGrid, {
      stagger: 0.08,
      start: "top 85%",
    });
  }
```

- [ ] **Step 3: Verify**

```js
document.querySelector(".gallery-grid").scrollIntoView();
await new Promise((r) => setTimeout(r, 1200));
Array.from(document.querySelectorAll(".gpiece")).map((el) => getComputedStyle(el).opacity)
```

Expected: `["1","1","1","1","1","1"]`.

---

### Task 6: Leadtime card internal stagger

**Files:**
- Modify: `js/reveals.js`
- Modify: `js/main.js` (config fetch `.then` callback)

**Interfaces:**
- Consumes: DOM nodes created by the existing `content/site-config.json` fetch handler in `js/main.js` (slot `<span class="slot">` pips and `<tr>` rows in `.leadtime-table tbody`).
- Produces: `export function revealLeadtimeInternals()` in `js/reveals.js`, called once from `js/main.js` right after the config-driven DOM is built.

- [ ] **Step 1: Add the function to reveals.js**

In `js/reveals.js`, add (above the final `export { revealGroup };` line, and update that line to also export the new function):

```js
export function revealLeadtimeInternals() {
  const card = document.querySelector(".leadtime-card");
  if (!card) return;
  const children = [
    card.querySelector(".leadtime-top"),
    card.querySelector(".leadtime-meter"),
    ...card.querySelectorAll(".slot"),
    card.querySelector(".leadtime-note"),
    ...card.querySelectorAll(".leadtime-table tr"),
    card.querySelector(".leadtime-foot"),
  ];
  revealGroup(children, card, { stagger: 0.06, start: "top 85%" });
}
```

Place this function after `initReveals()` and before the trailing `export { revealGroup };` line. No change to that export line is needed — `revealLeadtimeInternals` is already exported via its own `export function` keyword.

- [ ] **Step 2: Call it from the config loader**

In `js/main.js`, find the config-loader `.then((cfg) => { ... })` callback. At the very end of that callback, after the existing `fb.href = ...` line and before the closing `})`, add a call to the newly imported function. First add the import at the top of `js/main.js` alongside the Task 3 import:

```js
import { initReveals, revealLeadtimeInternals } from "./reveals.js";
```

(replacing the Task 3 line `import { initReveals } from "./reveals.js";`).

Then inside the `.then((cfg) => { ... })` callback, immediately before its closing `})`, add:

```js
      revealLeadtimeInternals();
```

- [ ] **Step 3: Verify**

```js
document.querySelector(".leadtime-card").scrollIntoView();
await new Promise((r) => setTimeout(r, 1500));
({
  slots: Array.from(document.querySelectorAll(".slot")).map((el) => getComputedStyle(el).opacity),
  rows: Array.from(document.querySelectorAll(".leadtime-table tr")).map((el) => getComputedStyle(el).opacity),
})
```

Expected: every value `"1"` (assuming `content/site-config.json` fetch succeeds — the preview server serves it as a real static file, so it will).

---

### Task 7: Process-stage internal stagger + mobile stacked-card reveal

**Files:**
- Create: `js/process-scroll.js`
- Modify: `js/main.js` (remove old process scroll code, add import + init call)
- Modify: `css/main.css:209-216` (simplify `.pstage` base styles)

**Interfaces:**
- Consumes: `prefersReducedMotion`, `isDesktopProcess` from `./gsap-setup.js`.
- Produces: `export function initProcessScroll()`, replacing the old `onScrollProcess`/`setupRiver` logic in `main.js` entirely.

- [ ] **Step 1: Simplify `.pstage` CSS**

In `css/main.css`, replace:

```css
.pstage{
  position:absolute; inset:0; max-width:34rem;
  display:flex; flex-direction:column; justify-content:center;
  opacity:0; transform:translateY(30px);
  transition:opacity .55s var(--ease), transform .55s var(--ease);
  pointer-events:none;
}
.pstage.active{ opacity:1; transform:none; pointer-events:auto; }
```

with:

```css
.pstage{
  position:absolute; inset:0; max-width:34rem;
  display:flex; flex-direction:column; justify-content:center;
  pointer-events:none;
}
.pstage.active{ pointer-events:auto; }
```

(Opacity/transform now lives on the stage's children, driven by `js/process-scroll.js`.)

Also update the mobile breakpoint override further down (`@media (max-width: 820px)`), which currently reads:

```css
  .pstage{
    position:static; opacity:1; transform:none; pointer-events:auto;
    padding:2rem 0; border-top:1px solid color-mix(in srgb, var(--grain) 50%, transparent);
  }
```

Change to (drop `opacity:1; transform:none;` since children now own that, but keep `pointer-events:auto` and the static positioning):

```css
  .pstage{
    position:static; pointer-events:auto;
    padding:2rem 0; border-top:1px solid color-mix(in srgb, var(--grain) 50%, transparent);
  }
```

- [ ] **Step 2: Create `js/process-scroll.js`**

```js
// js/process-scroll.js
import { prefersReducedMotion, isDesktopProcess } from "./gsap-setup.js";

function stageChildren(stage) {
  return [stage.querySelector(".pstage-meta"), stage.querySelector("h3"), stage.querySelector("p")].filter(Boolean);
}

function buildNodes(nodesWrap, riverDraw, stageCount, pathLen) {
  if (!nodesWrap || nodesWrap.children.length) return Array.from(nodesWrap ? nodesWrap.children : []);
  const nodes = [];
  for (let i = 0; i < stageCount; i++) {
    const t = stageCount === 1 ? 0 : i / (stageCount - 1);
    const pt = riverDraw.getPointAtLength(pathLen * t);
    const dot = document.createElement("span");
    dot.className = "pnode";
    dot.style.left = (pt.x / 60) * 100 + "%";
    dot.style.top = (pt.y / 600) * 100 + "%";
    nodesWrap.appendChild(dot);
    nodes.push(dot);
  }
  return nodes;
}

export function initProcessScroll() {
  const track = document.querySelector(".process-track");
  const riverDraw = document.querySelector(".river-draw");
  const stages = Array.from(document.querySelectorAll(".pstage"));
  const nodesWrap = document.querySelector(".process-nodes");
  if (!track || !stages.length) return;

  const reduced = prefersReducedMotion();

  if (isDesktopProcess() && riverDraw) {
    const pathLen = riverDraw.getTotalLength();
    riverDraw.style.strokeDasharray = pathLen;
    riverDraw.style.strokeDashoffset = reduced ? 0 : pathLen;
    const nodes = buildNodes(nodesWrap, riverDraw, stages.length, pathLen);

    stages.forEach((stage) => {
      if (reduced) {
        gsap.set(stageChildren(stage), { opacity: 1, y: 0 });
      } else {
        gsap.set(stageChildren(stage), { opacity: 0, y: 20 });
      }
    });

    if (reduced) {
      stages[0] && stages[0].classList.add("active");
      return;
    }

    ScrollTrigger.create({
      trigger: track,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.3,
      onUpdate: (self) => {
        const progress = self.progress;
        riverDraw.style.strokeDashoffset = pathLen * (1 - progress);
        const idx = Math.min(stages.length - 1, Math.floor(progress * stages.length));
        stages.forEach((stage, i) => {
          const active = i === idx;
          const wasActive = stage.classList.contains("active");
          stage.classList.toggle("active", active);
          if (active && !wasActive) {
            gsap.to(stageChildren(stage), { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", stagger: 0.08 });
          } else if (!active && wasActive) {
            gsap.set(stageChildren(stage), { opacity: 0, y: 20 });
          }
        });
        nodes.forEach((n, i) => n.classList.toggle("lit", i / Math.max(1, stages.length - 1) <= progress + 0.001));
      },
    });
    return;
  }

  /* Mobile: stacked cards, each reveals independently on scroll */
  stages.forEach((stage) => {
    stage.classList.add("active");
    const children = stageChildren(stage);
    if (reduced) {
      gsap.set(children, { opacity: 1, y: 0 });
      return;
    }
    gsap.set(children, { opacity: 0, y: 20 });
    ScrollTrigger.create({
      trigger: stage,
      start: "top 88%",
      onEnter: () => gsap.to(children, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", stagger: 0.08 }),
      onEnterBack: () => gsap.to(children, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", stagger: 0.08 }),
      onLeave: () => gsap.set(children, { opacity: 0, y: 20 }),
      onLeaveBack: () => gsap.set(children, { opacity: 0, y: 20 }),
    });
  });
}
```

- [ ] **Step 3: Remove old process logic from main.js, wire in the new module**

In `js/main.js`, delete the entire old block (from the `/* ---------- Process: pinned scroll progress + river draw ---------- */` comment through the line `if (stages.length && !desktopProcess.matches) { stages.forEach((s) => s.classList.add("active")); }`) — this is the block that declared `track`, `riverDraw`, `stages`, `nodesWrap`, `desktopProcess`, `pathLen`, `nodes`, `setupRiver()`, `onScrollProcess()`, and the two `if` blocks that invoked them.

In its place, under the `/* ---------- Motion module imports ---------- */` anchor, add:

```js
import { initProcessScroll } from "./process-scroll.js";
initProcessScroll();
```

(alongside the existing `initReveals()` call from Task 3.)

- [ ] **Step 4: Verify desktop behavior**

With the preview viewport at desktop width (≥821px):

```js
window.scrollTo(0, document.querySelector(".process-track").offsetTop + 200);
await new Promise((r) => setTimeout(r, 500));
const active = document.querySelector(".pstage.active");
getComputedStyle(active.querySelector(".pstage-meta")).opacity
```

Expected: `"1"`.

- [ ] **Step 5: Verify mobile fallback behavior**

Resize the preview viewport to mobile width (375px), reload, scroll to the second process stage:

```js
document.querySelectorAll(".pstage")[1].scrollIntoView();
await new Promise((r) => setTimeout(r, 800));
getComputedStyle(document.querySelectorAll(".pstage")[1].querySelector("h3")).opacity
```

Expected: `"1"`.

---

### Task 8: Hours counter rebuild

**Files:**
- Create: `js/counter.js`
- Modify: `js/main.js` (remove old counter code, add import + init call)

**Interfaces:**
- Consumes: `prefersReducedMotion` from `./gsap-setup.js`.
- Produces: `export function initCounter()`.

- [ ] **Step 1: Create `js/counter.js`**

```js
// js/counter.js
import { prefersReducedMotion } from "./gsap-setup.js";

export function initCounter() {
  const counters = document.querySelectorAll("[data-counter]");
  if (!counters.length) return;

  counters.forEach((el) => {
    const target = parseInt(el.dataset.counter, 10);

    if (prefersReducedMotion()) {
      el.textContent = target;
      return;
    }

    el.textContent = "0";
    const proxy = { value: 0 };
    let tween;

    const play = () => {
      tween && tween.kill();
      proxy.value = 0;
      tween = gsap.to(proxy, {
        value: target,
        duration: 1.4,
        ease: "power3.out",
        onUpdate: () => (el.textContent = Math.round(proxy.value)),
      });
    };

    const reset = () => {
      tween && tween.kill();
      el.textContent = "0";
    };

    ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      onEnter: play,
      onEnterBack: play,
      onLeave: reset,
      onLeaveBack: reset,
    });
  });
}
```

- [ ] **Step 2: Remove old counter code from main.js, wire in the new module**

Delete this block from `js/main.js`:

```js
  /* ---------- Hours counter ---------- */
  const counters = document.querySelectorAll("[data-counter]");
  if (counters.length && !reduceMotion) {
    const countObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const target = parseInt(el.dataset.counter, 10);
        const start = performance.now();
        const dur = 1400;
        (function tick(now) {
          const p = Math.min(1, (now - start) / dur);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(tick);
        })(start);
        countObs.unobserve(el);
      });
    }, { threshold: 0.6 });
    counters.forEach((c) => countObs.observe(c));
  }
```

Also delete the now-unused top-of-file line (it was only used by this block and the old process block, both now removed):

```js
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
```

Add to the `/* ---------- Motion module imports ---------- */` section:

```js
import { initCounter } from "./counter.js";
initCounter();
```

- [ ] **Step 3: Verify re-triggering**

```js
const el = document.querySelector("[data-counter]");
el.scrollIntoView();
await new Promise((r) => setTimeout(r, 1600));
const firstRun = el.textContent;
window.scrollTo(0, 0);
await new Promise((r) => setTimeout(r, 300));
const afterScrollAway = el.textContent;
el.scrollIntoView();
await new Promise((r) => setTimeout(r, 1600));
const secondRun = el.textContent;
({ firstRun, afterScrollAway, secondRun })
```

Expected: `firstRun` equals the element's `data-counter` value, `afterScrollAway` is `"0"`, `secondRun` again equals the `data-counter` value.

---

### Task 9: SplitText headline word-stagger

**Files:**
- Create: `js/text-split.js`
- Modify: `js/main.js` (add import + init call)

**Interfaces:**
- Consumes: `prefersReducedMotion` from `./gsap-setup.js`; the hero `<h1>` and each section's `<h2>`.
- Produces: `export function initTextSplit()`.

- [ ] **Step 1: Create `js/text-split.js`**

```js
// js/text-split.js
import { prefersReducedMotion } from "./gsap-setup.js";

export function initTextSplit() {
  if (prefersReducedMotion()) return;

  const targets = [
    document.querySelector(".hero h1"),
    document.querySelector(".process-head h2"),
    document.querySelector(".gallery .section-head h2"),
    document.querySelector(".commission-proof h2"),
    document.querySelector(".designer .section-head h2"),
  ].filter(Boolean);

  targets.forEach((el) => {
    const split = new SplitText(el, { type: "words" });
    gsap.set(split.words, { opacity: 0, y: 16 });

    const play = () => gsap.to(split.words, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", stagger: 0.04 });
    const reset = () => gsap.set(split.words, { opacity: 0, y: 16 });

    ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      onEnter: play,
      onEnterBack: play,
      onLeave: reset,
      onLeaveBack: reset,
    });
  });
}
```

- [ ] **Step 2: Wire in**

Add to `js/main.js` under the motion imports section:

```js
import { initTextSplit } from "./text-split.js";
initTextSplit();
```

- [ ] **Step 3: Verify**

```js
document.querySelector(".hero h1").scrollIntoView();
await new Promise((r) => setTimeout(r, 900));
const words = document.querySelectorAll(".hero h1 .word");
({ count: words.length, firstOpacity: words.length ? getComputedStyle(words[0]).opacity : null })
```

Expected: `count` greater than 1 (SplitText wraps each word in an element with class `word` by default), `firstOpacity` `"1"`.

---

### Task 10: Hero parallax

**Files:**
- Create: `js/hero-parallax.js`
- Modify: `js/main.js` (add import + init call)
- Modify: `css/main.css:132-137` (remove `heroDrift` keyframe/animation)
- Modify: `css/main.css:400-408` (remove now-redundant reduced-motion override for `.hero-img`)

**Interfaces:**
- Consumes: `prefersReducedMotion` from `./gsap-setup.js`; `.hero`, `.hero-img`, `.hero-inner`.
- Produces: `export function initHeroParallax()`.

- [ ] **Step 1: Remove the old CSS-keyframe drift**

In `css/main.css`, replace:

```css
.hero-img{
  width:100%; height:100%; object-fit:cover;
  animation:heroDrift 26s var(--ease) both;
  transform-origin:60% 40%;
}
@keyframes heroDrift{ from{ transform:scale(1.14); } to{ transform:scale(1.02); } }
```

with:

```css
.hero-img{
  width:100%; height:100%; object-fit:cover;
}
```

(The base `scale` and any parallax motion are now set entirely by GSAP in `js/hero-parallax.js`, so `transform-origin` is set there too, via `gsap.set`.)

In the reduced-motion media query block near the bottom of the file, remove this now-redundant line:

```css
  .hero-img{ animation:none; transform:scale(1.02); }
```

(GSAP's own reduced-motion branch in `js/hero-parallax.js` sets the equivalent static scale.)

- [ ] **Step 2: Create `js/hero-parallax.js`**

```js
// js/hero-parallax.js
import { prefersReducedMotion } from "./gsap-setup.js";

export function initHeroParallax() {
  const hero = document.querySelector(".hero");
  const img = document.querySelector(".hero-img");
  const inner = document.querySelector(".hero-inner");
  if (!hero || !img || !inner) return;

  gsap.set(img, { scale: 1.06, transformOrigin: "60% 40%" });

  if (prefersReducedMotion()) return;

  gsap.to(img, {
    yPercent: 18,
    ease: "none",
    scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
  });

  gsap.to(inner, {
    yPercent: 40,
    opacity: 0.2,
    ease: "none",
    scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
  });
}
```

- [ ] **Step 3: Wire in**

```js
import { initHeroParallax } from "./hero-parallax.js";
initHeroParallax();
```

- [ ] **Step 4: Verify**

```js
window.scrollTo(0, window.innerHeight * 0.5);
await new Promise((r) => setTimeout(r, 300));
getComputedStyle(document.querySelector(".hero-img")).transform
```

Expected: a non-identity `matrix(...)` string (confirms the scale + translate are being applied), different from the value at `scrollTo(0,0)`.

---

### Task 11: Gallery hover Ken Burns + cursor tilt

**Files:**
- Create: `js/gallery-interactions.js`
- Modify: `js/main.js` (add import + init call)
- Modify: `css/main.css:251-255` (remove old CSS-transition hover rule)

**Interfaces:**
- Consumes: `prefersReducedMotion` from `./gsap-setup.js`; `.gpiece` tiles and their `img`.
- Produces: `export function initGalleryInteractions()`.

- [ ] **Step 1: Remove old CSS hover transition**

In `css/main.css`, replace:

```css
.gpiece img{
  width:100%; height:100%; object-fit:cover;
  transition:transform 1.1s var(--ease);
}
.gpiece:hover img{ transform:scale(1.045); }
```

with:

```css
.gpiece img{
  width:100%; height:100%; object-fit:cover;
}
```

In the reduced-motion media query block, remove:

```css
  .gpiece img{ transition:none; }
```

- [ ] **Step 2: Create `js/gallery-interactions.js`**

```js
// js/gallery-interactions.js
import { prefersReducedMotion } from "./gsap-setup.js";

export function initGalleryInteractions() {
  const tiles = document.querySelectorAll(".gpiece");
  if (!tiles.length) return;

  const canHover = window.matchMedia("(hover: hover)").matches;
  if (prefersReducedMotion() || !canHover) return;

  tiles.forEach((tile) => {
    const img = tile.querySelector("img");
    if (!img) return;

    tile.addEventListener("mouseenter", () => {
      gsap.to(img, { scale: 1.09, x: -6, y: -4, duration: 1.4, ease: "power2.out" });
    });
    tile.addEventListener("mouseleave", () => {
      gsap.to(img, { scale: 1, x: 0, y: 0, duration: 1.1, ease: "power2.inOut" });
    });

    tile.style.transformPerspective = "600px";
    const rotateX = gsap.quickTo(tile, "rotateX", { duration: 0.4, ease: "power2.out" });
    const rotateY = gsap.quickTo(tile, "rotateY", { duration: 0.4, ease: "power2.out" });

    tile.addEventListener("mousemove", (e) => {
      const rect = tile.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      rotateY(px * 10);
      rotateX(py * -10);
    });
    tile.addEventListener("mouseleave", () => {
      rotateX(0);
      rotateY(0);
    });
  });
}
```

- [ ] **Step 3: Wire in**

```js
import { initGalleryInteractions } from "./gallery-interactions.js";
initGalleryInteractions();
```

- [ ] **Step 4: Verify**

```js
const tile = document.querySelector(".gpiece");
const img = tile.querySelector("img");
tile.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
await new Promise((r) => setTimeout(r, 1500));
getComputedStyle(img).transform
```

Expected: a non-identity `matrix(...)` (scale + translate applied).

---

### Task 12: Gallery lightbox

**Files:**
- Create: `js/lightbox.js`
- Modify: `index.html` (add modal markup after `</main>`)
- Modify: `css/main.css` (add lightbox styles)
- Modify: `js/main.js` (add import + init call)

**Interfaces:**
- Consumes: existing `.gpiece` markup (each tile's `img` and `.gpiece-info strong`/`.gpiece-info .mono` text).
- Produces: `export function initLightbox()`. A `#lightbox` element that opens/closes and supports Esc / arrow-key navigation with a trapped focus loop across its 3 buttons.

- [ ] **Step 1: Add modal markup**

In `index.html`, immediately after the closing `</main>` tag and before `<!-- ============ 7 · FOOTER ============ -->`, add:

```html
<div class="lightbox" id="lightbox" hidden role="dialog" aria-modal="true" aria-label="Gallery piece detail">
  <button class="lightbox-close" type="button" aria-label="Close">&times;</button>
  <button class="lightbox-prev" type="button" aria-label="Previous piece">&larr;</button>
  <figure class="lightbox-figure">
    <img class="lightbox-img" src="" alt="">
    <figcaption>
      <strong class="lightbox-title"></strong>
      <span class="lightbox-spec mono"></span>
    </figcaption>
  </figure>
  <button class="lightbox-next" type="button" aria-label="Next piece">&rarr;</button>
</div>
```

- [ ] **Step 2: Add lightbox CSS**

Append to `css/main.css` (e.g. after the Gallery section rules):

```css
/* ---------- Lightbox ---------- */
.lightbox{
  position:fixed; inset:0; z-index:100;
  display:flex; align-items:center; justify-content:center; gap:1.5rem;
  padding:var(--pad-x);
  background:color-mix(in srgb, var(--ink) 92%, transparent);
  backdrop-filter:blur(6px);
}
.lightbox[hidden]{ display:none; }
.lightbox-figure{ max-width:min(74rem, 90vw); max-height:82vh; display:flex; flex-direction:column; gap:1rem; }
.lightbox-img{ max-height:70vh; width:auto; margin:0 auto; border-radius:4px; object-fit:contain; }
.lightbox-figure figcaption{ display:flex; flex-direction:column; gap:.3rem; text-align:center; }
.lightbox-title{ font-family:var(--font-display); font-size:1.2rem; color:var(--linen); }
.lightbox-spec{ font-size:.75rem; letter-spacing:.08em; text-transform:uppercase; color:var(--epoxy-glow); }
.lightbox-close, .lightbox-prev, .lightbox-next{
  background:none; border:1px solid var(--grain); color:var(--linen);
  width:2.6rem; height:2.6rem; border-radius:50%; cursor:pointer; font-size:1.2rem;
  transition:border-color .25s var(--ease), color .25s var(--ease);
}
.lightbox-close{ position:absolute; top:1.5rem; right:1.5rem; }
.lightbox-close:hover, .lightbox-prev:hover, .lightbox-next:hover{ border-color:var(--epoxy); color:var(--epoxy-glow); }
```

- [ ] **Step 3: Create `js/lightbox.js`**

```js
// js/lightbox.js
import { prefersReducedMotion } from "./gsap-setup.js";

export function initLightbox() {
  const tiles = Array.from(document.querySelectorAll(".gpiece"));
  const box = document.getElementById("lightbox");
  if (!tiles.length || !box) return;

  const img = box.querySelector(".lightbox-img");
  const title = box.querySelector(".lightbox-title");
  const spec = box.querySelector(".lightbox-spec");
  const closeBtn = box.querySelector(".lightbox-close");
  const prevBtn = box.querySelector(".lightbox-prev");
  const nextBtn = box.querySelector(".lightbox-next");
  const focusables = [closeBtn, prevBtn, nextBtn];

  let index = 0;
  let lastFocused = null;

  function render() {
    const tile = tiles[index];
    const tileImg = tile.querySelector("img");
    img.src = tileImg.src;
    img.alt = tileImg.alt;
    title.textContent = tile.querySelector(".gpiece-info strong")?.textContent || "";
    spec.textContent = tile.querySelector(".gpiece-info .mono")?.textContent || "";
  }

  function open(i) {
    index = i;
    lastFocused = document.activeElement;
    render();
    box.hidden = false;
    if (prefersReducedMotion()) {
      gsap.set(box, { opacity: 1 });
      gsap.set(box.querySelector(".lightbox-figure"), { scale: 1 });
    } else {
      gsap.fromTo(box, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" });
      gsap.fromTo(box.querySelector(".lightbox-figure"), { scale: 0.96 }, { scale: 1, duration: 0.35, ease: "power2.out" });
    }
    closeBtn.focus();
    document.addEventListener("keydown", onKeydown);
  }

  function close() {
    document.removeEventListener("keydown", onKeydown);
    const done = () => {
      box.hidden = true;
      lastFocused && lastFocused.focus();
    };
    if (prefersReducedMotion()) {
      done();
    } else {
      gsap.to(box, { opacity: 0, duration: 0.25, ease: "power2.in", onComplete: done });
    }
  }

  function next() {
    index = (index + 1) % tiles.length;
    render();
  }
  function prev() {
    index = (index - 1 + tiles.length) % tiles.length;
    render();
  }

  function onKeydown(e) {
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
    if (e.key === "Tab") {
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  tiles.forEach((tile, i) => {
    tile.addEventListener("click", (e) => {
      e.preventDefault();
      open(i);
    });
  });
  closeBtn.addEventListener("click", close);
  prevBtn.addEventListener("click", prev);
  nextBtn.addEventListener("click", next);
  box.addEventListener("click", (e) => {
    if (e.target === box) close();
  });
}
```

- [ ] **Step 4: Wire in**

```js
import { initLightbox } from "./lightbox.js";
initLightbox();
```

- [ ] **Step 5: Verify open/navigate/close**

```js
document.querySelectorAll(".gpiece")[0].click();
await new Promise((r) => setTimeout(r, 500));
const openState = {
  hidden: document.getElementById("lightbox").hidden,
  title: document.querySelector(".lightbox-title").textContent,
};
document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
await new Promise((r) => setTimeout(r, 100));
const afterNext = document.querySelector(".lightbox-title").textContent;
document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
await new Promise((r) => setTimeout(r, 400));
const afterClose = document.getElementById("lightbox").hidden;
({ openState, afterNext, afterClose })
```

Expected: `openState.hidden` is `false`, `openState.title` is `"The 150-Hour Table"`, `afterNext` is `"Coastline Sofa Table"` (the second tile's title), `afterClose` is `true`.

---

### Task 13: Magnetic buttons

**Files:**
- Create: `js/magnetic.js`
- Modify: `js/main.js` (add import + init call)

**Interfaces:**
- Consumes: `prefersReducedMotion` from `./gsap-setup.js`; `.btn-solid`, `.btn-ghost`, `.nav-badge`.
- Produces: `export function initMagnetic()`.

- [ ] **Step 1: Create `js/magnetic.js`**

```js
// js/magnetic.js
import { prefersReducedMotion } from "./gsap-setup.js";

export function initMagnetic() {
  const canHover = window.matchMedia("(hover: hover)").matches;
  if (prefersReducedMotion() || !canHover) return;

  const targets = document.querySelectorAll(".btn-solid, .btn-ghost, .nav-badge");
  targets.forEach((el) => {
    const moveX = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3.out" });
    const moveY = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3.out" });
    const radius = 0.35;

    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      moveX(px * rect.width * radius);
      moveY(py * rect.height * radius);
    });
    el.addEventListener("mouseleave", () => {
      moveX(0);
      moveY(0);
    });
  });
}
```

- [ ] **Step 2: Wire in**

```js
import { initMagnetic } from "./magnetic.js";
initMagnetic();
```

- [ ] **Step 3: Verify**

```js
const btn = document.querySelector(".btn-solid");
const rect = btn.getBoundingClientRect();
btn.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: rect.left + rect.width * 0.9, clientY: rect.top + rect.height * 0.5 }));
await new Promise((r) => setTimeout(r, 500));
getComputedStyle(btn).transform
```

Expected: a non-identity `matrix(...)` (translateX applied toward the cursor).

---

### Task 14: Grain texture + epoxy river motif reinforcement

**Files:**
- Modify: `css/main.css` (grain overlay, nav progress bar, footer river flourish styles)
- Modify: `index.html` (nav progress element, footer river SVG)
- Create: `js/river-motif.js`
- Modify: `js/main.js` (add import + init call)

**Interfaces:**
- Consumes: `prefersReducedMotion` from `./gsap-setup.js`.
- Produces: `export function initRiverMotif()`. A visible grain texture requiring no JS. A nav-bar progress line tracking total page scroll. A footer river flourish that fades in with the rest of the footer reveal group.

- [ ] **Step 1: Add grain overlay CSS (no JS required)**

Append to `css/main.css`:

```css
/* ---------- Grain texture ---------- */
body::after{
  content:""; position:fixed; inset:0; z-index:90; pointer-events:none;
  opacity:.045; mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
}
```

- [ ] **Step 2: Add nav progress bar markup and CSS**

In `index.html`, as the first child of `<header class="nav" id="top">`, add:

```html
<header class="nav" id="top">
  <div class="nav-progress" aria-hidden="true"><span class="nav-progress-fill"></span></div>
  <a class="nav-brand" href="#top" aria-label="Second Chance Slabs home">
```

Append to `css/main.css`:

```css
/* ---------- Nav progress (river motif) ---------- */
.nav-progress{ position:absolute; left:0; right:0; bottom:-1px; height:2px; overflow:hidden; }
.nav-progress-fill{
  display:block; height:100%; width:0%; background:var(--epoxy);
  box-shadow:0 0 6px rgba(61,155,135,.6); transform-origin:left;
}
```

- [ ] **Step 3: Add footer river flourish markup and CSS**

In `index.html`, inside `.footer-brand` (from Task 4, which already added `reveal` to this div), add the SVG after the wordmark span:

```html
  <div class="footer-brand reveal">
    <img src="assets/monogram.svg" alt="" width="48" height="48">
    <span class="nav-wordmark"><em>Second Chance</em><strong>Slabs</strong></span>
    <svg class="footer-river" viewBox="0 0 60 120" aria-hidden="true" width="18" height="36">
      <path d="M30 0 C 10 20, 50 40, 26 60 S 52 90, 28 120" fill="none" stroke="var(--epoxy)" stroke-width="2.5" stroke-linecap="round"/>
    </svg>
  </div>
```

Append to `css/main.css`:

```css
/* ---------- Footer river flourish ---------- */
.footer-river{ margin-left:.4rem; filter:drop-shadow(0 0 4px rgba(61,155,135,.4)); }
```

- [ ] **Step 4: Create `js/river-motif.js`**

```js
// js/river-motif.js
import { prefersReducedMotion } from "./gsap-setup.js";

export function initRiverMotif() {
  const fill = document.querySelector(".nav-progress-fill");
  if (fill) {
    if (prefersReducedMotion()) {
      fill.style.width = "0%";
    } else {
      gsap.to(fill, {
        width: "100%",
        ease: "none",
        scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: true },
      });
    }
  }
}
```

Note: the footer river SVG itself does not need its own reveal logic — it's inside `.footer-brand`, which Task 4's `revealGroup` call already fades in as a unit.

- [ ] **Step 5: Wire in**

```js
import { initRiverMotif } from "./river-motif.js";
initRiverMotif();
```

- [ ] **Step 6: Verify**

```js
window.scrollTo(0, document.body.scrollHeight - window.innerHeight);
await new Promise((r) => setTimeout(r, 300));
getComputedStyle(document.querySelector(".nav-progress-fill")).width
```

Expected: a pixel width approximately equal to the nav bar's full width (i.e., ~100% of `.nav-progress`'s width), confirming the fill tracks to the bottom of the page.

Also confirm the grain overlay is present and non-blocking:

```js
const after = getComputedStyle(document.body, "::after");
({ opacity: after.opacity, pointerEvents: after.pointerEvents })
```

Expected: `opacity` around `"0.045"`, `pointerEvents` `"none"`.

---

### Task 15: Deferred page-transitions roadmap note + full reduced-motion audit + final verification pass

**Files:**
- Modify: `CLAUDE.md` (roadmap section)

**Interfaces:** None — this is a documentation update plus a manual regression pass across everything built in Tasks 1–14.

- [ ] **Step 1: Record the deferred page-transition approach**

In `CLAUDE.md`, in the "Roadmap (next rounds)" section, after the existing multi-page build line, add a new item:

```markdown
8. **Page transitions (deferred)**: once Gallery/About/Commission exist as real separate pages, add cross-page transitions using the View Transitions API, with a GSAP cross-fade as the fallback for browsers without support. Not implemented yet — there's nothing to transition between on the current single-page site.
```

- [ ] **Step 2: Full reduced-motion audit**

With the preview tool, emulate `prefers-reduced-motion: reduce` (via `preview_resize`'s `colorScheme`-style emulation if available, or by evaluating `matchMedia` override in devtools if the tool supports it — otherwise temporarily hardcode `prefersReducedMotion()` to return `true` in `js/gsap-setup.js`, reload, test, then revert the hardcode). Reload the page and verify, section by section:

```js
({
  heroEyebrow: getComputedStyle(document.querySelector(".hero .eyebrow")).opacity,
  storyStep: getComputedStyle(document.querySelector(".story-step")).opacity,
  galleryTile: getComputedStyle(document.querySelector(".gpiece")).opacity,
  footerBrand: getComputedStyle(document.querySelector(".footer-brand")).opacity,
  counterText: document.querySelector("[data-counter]").textContent,
  heroWords: document.querySelectorAll(".hero h1 .word").length,
})
```

Expected: all opacities `"1"` immediately on load (no scrolling needed), `counterText` equals the element's final target number (not `"0"`), `heroWords` is `0` (SplitText should not run at all under reduced motion per Task 9's `if (prefersReducedMotion()) return;` guard).

- [ ] **Step 3: Full bidirectional regression pass (motion enabled)**

With reduced-motion off, scroll the full page top to bottom once, confirm no console errors:

```js
window.scrollTo(0, 0);
await new Promise((r) => setTimeout(r, 200));
window.scrollTo(0, document.body.scrollHeight);
await new Promise((r) => setTimeout(r, 2000));
```

Check the preview tool's console log output — expected: no errors.

Then scroll back to top and confirm at least one element from each of Tasks 3–9 has returned to its hidden/reset state, then scroll down again and confirm it re-animates:

```js
window.scrollTo(0, 0);
await new Promise((r) => setTimeout(r, 500));
const hiddenAgain = getComputedStyle(document.querySelector(".footer-brand")).opacity;
document.querySelector(".footer-brand").scrollIntoView();
await new Promise((r) => setTimeout(r, 1000));
const shownAgain = getComputedStyle(document.querySelector(".footer-brand")).opacity;
({ hiddenAgain, shownAgain })
```

Expected: `{ hiddenAgain: "0", shownAgain: "1" }`.

- [ ] **Step 4: Touch/no-hover check for hover-only effects**

Resize the preview viewport to mobile (375px, which typically reports `hover: none` in emulation) and confirm magnetic buttons and gallery tilt don't throw errors and don't apply a transform on tap:

```js
const btn = document.querySelector(".btn-solid");
btn.click();
getComputedStyle(btn).transform
```

Expected: `"none"` or `"matrix(1, 0, 0, 1, 0, 0)"` (no magnetic offset applied), and no console errors from the click.
