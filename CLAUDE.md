# Second Chance Slabs — Website Project

Custom epoxy river table maker in Kansas City, MO. Founder is a retired general contractor (33 years) who builds heirloom walnut/epoxy tables. Brand story: fallen trees rescued and given "a second chance" as heirloom furniture. This repo is the **round-one demo site** built for client review; your job is to evolve it into the production site.

## Current state

Static single-page demo (no build step, no framework). Open `index.html` via any static server (`python3 -m http.server` from the repo root). The config fetch fails silently over `file://`, so always use a server.

```
index.html          Homepage demo (7 sections)
css/main.css        Full design system + layout (tokens at top of file)
js/main.js          Scroll reveals, pinned process section, config loader, swatch picker
content/site-config.json   ← FOUNDER-EDITABLE content (lead time, slots, contact)
content/website-content.md Distilled discovery content — the source of truth for all copy
assets/             SVG placeholders + wordmark (real photography replaces slab-*.svg)
docs/               Design system notes, discovery questions, meeting transcript
```

## Design system (do not drift from this without client sign-off)

- Palette: deep walnut darks (`--ink #171210`, `--bark`, `--walnut`), linen text (`#EDE4D7`), **single accent** — epoxy teal (`#3D9B87`). No other accent colors.
- Type: Fraunces (display, incl. italic for emotional words), Karla (body, weight 300/400), IBM Plex Mono (specs: hours, dimensions, labels).
- Signature element: the "epoxy river" — a teal line that draws with scroll through the process section; also splits the SCS monogram. Keep it the *one* bold thing; everything else stays quiet.
- Motion: scroll-triggered reveals, pinned scroll process section, slow hero drift. `prefers-reduced-motion` is respected everywhere — keep it that way.
- The site must not look templated/AI-generated. No stock hero-with-gradient patterns, no card grids with icon+title+blurb.

## Key decisions already made with the client

1. **Placeholder imagery** until real photography exists (assets/slab-*.svg). When photos arrive, swap `<img>` sources; keep the same aspect handling (`object-fit: cover`).
2. **Scroll-driven process section** approved — falls back to stacked cards under 821px.
3. **Lead-time module is founder-editable without touching code**: everything renders from `content/site-config.json`. Production goal: the founder edits this WITHOUT redeploying (see roadmap).
4. **Payments stay offline** (Venmo/cash). No ecommerce, no Stripe. The "commission" flow is an inquiry form only.
5. Wordmark/monogram: SCS split by a river seam (assets/monogram.svg). Currently uses Georgia as a stand-in — consider rebuilding with Fraunces outlines converted to paths.

## Roadmap (next rounds)

1. **Round-two review feedback** — expect palette/type tweaks from the client.
2. **Multi-page build**: Gallery (with per-piece detail pages: wood origin, hours, materials), Process (expanded), About (founder + Nancy's interior-design role), Commission (form + color explorer + care guide). Static site or Astro are both reasonable — client's developer background is SAP consulting. Choose whatever best serves a classy, professional, visually polished result; there is no requirement to keep the stack minimal.
3. **Inquiry form backend**: send to email (Formspree, or a serverless function on Vercel). Fields: piece type, size, species, color, edge profile, budget (optional), message, name, email.
4. **Founder-editable lead time in production**: options in order of simplicity —
   a. Deploy on Vercel; `site-config.json` fetched from a tiny KV/edge-config store with a one-page password-protected admin form.
   b. Decap CMS / Pages CMS over the JSON file in the repo (edits via GitHub UI).
   c. Keep JSON in repo + teach the founder to edit via GitHub web editor (auto-deploy on commit).
   The client (Speaker 2) is technical — confirm preference before building.
5. **Photography integration**: replace all `slab-*.svg`; add real process/workshop shots to the process section backgrounds.
6. SEO basics (meta, OG image using the hero slab, sitemap), analytics (client to choose), professional email on the domain (flagged in the meeting).
7. Domain: secondchanceslabs.com — was confirmed available July 8, 2026; registration was Speaker 0's action item. Verify before launch.

## Copy rules

- All copy derives from `content/website-content.md` (real facts from the discovery interview). Never invent client history, testimonials, or press.
- Testimonials: only one table sold so far — do NOT fabricate quotes. A testimonial section gets added when real ones exist.
- Voice: quiet confidence, craftsman's specificity (real hours, real grits, real cure times). No superlatives like "seamless", "unleash", "elevate".
