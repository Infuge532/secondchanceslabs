# GSAP Motion System — Design

**Date:** 2026-07-09
**Status:** Approved, ready for implementation plan

## Context

The round-one demo site (`index.html`, `css/main.css`, `js/main.js`) already has scroll reveals, a pinned scroll-driven process section, and a count-up stat, all hand-rolled with `IntersectionObserver` and CSS transitions. Two things drove this redesign:

1. The current reveal system is one-directional — elements animate in once and stay visible forever, even if the user scrolls back up past them and down again.
2. `CLAUDE.md` previously said to "keep the stack boring," which the client has explicitly overridden: the site should be as classy, professional, and visually appealing as possible, with no artificial constraint against richer tooling. That line has been removed from `CLAUDE.md`.

This spec covers rebuilding the motion system on GSAP + ScrollTrigger + SplitText (all free as of GSAP's 2025 licensing change), and adding several visual-polish features the client approved alongside it: text reveals, hero parallax, gallery hover/tilt/lightbox, micro-interactions, and reinforcing the "epoxy river" motif outside the process section.

Page transitions (motion between separate pages) are explicitly **out of scope for implementation** — see "Deferred" below.

## Goals

- Every scroll-triggered animation on the site re-plays both when scrolling down into view and back up into view (no more "animate once, stay forever").
- Extend animation coverage to elements that currently have none: footer, leadtime card internals (slot meter, timeline table rows), gallery per-tile stagger, process-stage internal stagger (label → heading → paragraph), mobile stacked process cards.
- Add text-reveal, parallax, gallery lightbox, micro-interactions, and river-motif reinforcement as described below.
- Preserve full `prefers-reduced-motion` support — every new effect must have a reduced-motion equivalent that shows final state instantly with no motion.
- No build step. No bundler. GSAP loads via CDN script tags, same deployment model as today (static files, `python3 -m http.server`).

## Non-goals

- Gallery **detail pages** (dedicated per-piece pages with wood origin, hours, materials) — that's the existing, larger "Multi-page build" roadmap item in `CLAUDE.md`, distinct from the lightbox described here.
- Page transition mechanics — deferred (see below).
- Any change to copy, palette, or the design tokens in `css/main.css` `:root`.

## Architecture

- `js/main.js` is rebuilt around GSAP: `gsap.registerPlugin(ScrollTrigger, SplitText)` at the top, then each current responsibility (reveals, process pin, counter, config loader, swatch picker) becomes its own function using ScrollTrigger instead of manual `IntersectionObserver`/scroll listeners where applicable. The config loader and swatch picker are unaffected — they don't animate today and aren't part of this spec.
- `gsap.matchMedia()` replaces the manual `matchMedia("(prefers-reduced-motion: reduce)")` and `matchMedia("(min-width: 821px)")` checks, giving one place that defines the reduced-motion and desktop/mobile variants of every animation.
- Three CDN `<script>` tags added to `index.html` before `js/main.js`: `gsap.min.js`, `ScrollTrigger.min.js`, `SplitText.min.js`.

## Feature detail

### 1. Bidirectional scroll reveals

Every element currently carrying `.reveal` (hero, story steps, gallery tiles, commission proof, designer panels) gets a `ScrollTrigger` with `toggleActions: "play reverse play reverse"` instead of the current add-only `IntersectionObserver` class toggle. This alone makes existing reveals bidirectional with no markup changes.

New elements added to the reveal system:
- **Footer**: brand mark, each of the 3 footer columns, and the legal line — staggered.
- **Gallery grid**: each of the 6 tiles gets its own stagger step (replacing the current reused `d1`/`d2` delay classes shared across 6 tiles) via a GSAP stagger on the tile set, so the cascade reads distinctly regardless of markup order.
- **Leadtime card internals**: the slot-meter pips and the timeline table rows (both DOM-injected from `content/site-config.json` after fetch) get their own staggered entrance, timed off the same trigger as the parent `.leadtime-card`.
- **Process stage internals**: within each `.pstage`, the eyebrow label, heading, and paragraph stagger in sequence as the stage becomes active (in addition to the existing block-level active/inactive swap, which is already bidirectional since it's driven by continuous scroll position).
- **Mobile stacked process cards**: currently all 7 stages are force-set `.active` on load with zero entrance animation under 821px. These now get the same reveal-on-scroll treatment as everything else instead of rendering pre-revealed.

### 2. Hours counter

Rebuilt as `gsap.to(proxyObj, { value: target, onUpdate: ... })`, gated by a `ScrollTrigger` using `onEnterBack` / `onLeave` (or equivalent `toggleActions`) to reset the displayed value to 0 on exit and replay the tween on every re-entry, replacing the current one-shot `requestAnimationFrame` loop that `unobserve`s after firing once.

### 3. Text reveals

`SplitText` word-level stagger (not character-level) applied to:
- The hero `<h1>`.
- Each section's `<h2>` (story is section-less headline text via `.story-quote`; process, gallery, commission, designer each have one).

Body copy (`<p>` tags) is not split — stays as a simple block fade — to avoid overusing the effect.

### 4. Hero parallax

Replace the current single-layer CSS `heroDrift` keyframe (a fixed zoom-out animation unrelated to scroll position) with two ScrollTrigger-scrubbed layers: the `.hero-img` background continues its slow drift but now also moves at a different rate than `.hero-inner` (text + CTA) as the user scrolls past the hero, both scrubbed to scroll position rather than time-based.

### 5. Gallery enhancements

- Per-tile stagger: covered in Feature 1.
- Hover: replace the current flat `transform: scale(1.045)` with a slower Ken Burns-style pan+scale (longer duration, slight translate in addition to scale).
- Cursor tilt: `gsap.quickTo()`-driven subtle perspective tilt following mouse position within each tile. Disabled under `(hover: none)` (touch devices) and reduced motion.
- **Lightbox**: clicking a tile opens a custom modal (built for this site, not a third-party plugin) showing the enlarged image and the same caption data already in the tile's markup (title + mono spec line). Supports Esc to close, arrow keys to move to the next/previous piece, and traps focus while open. Opens/closes with a GSAP fade+scale transition. This reuses existing per-tile data — no new content/data model needed.

### 6. Micro-interactions

- **Magnetic buttons**: `.btn-solid`, `.btn-ghost`, and `.nav-badge` get a `gsap.quickTo()`-driven translate toward the cursor while hovered (clamped to a small radius), springing back on mouse-leave. Disabled under `(hover: none)` and reduced motion.
- **Grain texture**: a fixed, full-viewport, low-opacity (~4–6%) SVG `feTurbulence` overlay with `mix-blend-mode: overlay`. Pure CSS, no JS, negligible performance cost. Not gated by reduced-motion since it's a static texture, not motion.

### 7. Epoxy river motif reinforcement

- A thin teal progress line fixed at the top of the nav bar, filling left-to-right via a ScrollTrigger scrubbed to total page scroll progress — visually rhymes with the process section's river-draw effect.
- A small static river-seam flourish (reusing the existing river path styling) animates in beside the footer brand mark when the footer scrolls into view, as a closing echo of the same motif.

## Deferred: page transitions

The site is currently single-page; there is nothing to transition *between* yet. Building a transition layer now would ship inert code with no observable effect and no way to test it. Instead, this spec adds one line to `CLAUDE.md`'s roadmap recording the intended approach — **View Transitions API with a GSAP cross-fade fallback for browsers without support** — to be implemented when the multi-page build (Gallery/About/Commission as real pages) actually happens.

## Reduced motion

`gsap.matchMedia()` defines a `(prefers-reduced-motion: reduce)` branch that:
- Sets all reveal/stagger animations to their end state instantly, no transition.
- Disables hero parallax scrub (background/content render at final scroll-neutral position).
- Disables cursor tilt and magnetic button effects entirely.
- Disables SplitText stagger — headings render as plain text with no animation.
- Lightbox open/close still functions but without the scale/fade transition (instant show/hide).
- Grain texture is unaffected (it's a static texture, not motion).

## Testing / verification plan

Manual verification in a browser (no automated test suite exists for this static site):
- Scroll down through the full page once, confirm every section listed in Feature 1 animates in, including footer and leadtime internals.
- Scroll back up past each section and down again — confirm re-triggering with no visual glitches or flicker at trigger boundaries.
- Confirm the hours counter resets and re-counts on repeated entry.
- Confirm gallery lightbox: open, arrow-key navigate through all 6 pieces, Esc to close, focus returns to the originating tile.
- Confirm magnetic buttons and cursor tilt work with mouse, are inert on a touch-emulated viewport.
- Toggle OS/browser "reduce motion" setting (or emulate via devtools) and re-verify every section above renders instantly with no animation, and that the site remains fully usable.
- Confirm nav progress line tracks scroll position accurately from top to bottom of page.
- Confirm no console errors from GSAP/ScrollTrigger/SplitText CDN loading, and that the config-driven leadtime/timeline content (from `content/site-config.json`) still renders correctly interleaved with the new stagger animations.

## File-level impact summary

| File | Change |
|---|---|
| `index.html` | Add 3 CDN `<script>` tags (GSAP, ScrollTrigger, SplitText); add lightbox modal markup; add nav progress-line element; add footer river-flourish element |
| `css/main.css` | Grain overlay styles; lightbox modal styles; nav progress-line styles; footer river-flourish styles; adjustments to gallery hover/tilt and reveal base styles as needed for GSAP-driven (vs. CSS-transition-driven) animation |
| `js/main.js` | Rebuilt around GSAP/ScrollTrigger/SplitText/matchMedia; all Feature 1–7 behavior lives here |
| `CLAUDE.md` | Add one roadmap line documenting the deferred page-transition approach |
