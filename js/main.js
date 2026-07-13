/* Second Chance Slabs — round-one demo
   All founder-editable content loads from content/site-config.json */

(function () {
  "use strict";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Scroll reveals ---------- */
  const revealer = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
    { threshold: 0.15 }
  );
  document.querySelectorAll(".reveal").forEach((el) => revealer.observe(el));

  /* ---------- Process: pinned scroll progress + river draw ---------- */
  const track = document.querySelector(".process-track");
  const riverDraw = document.querySelector(".river-draw");
  const stages = Array.from(document.querySelectorAll(".pstage"));
  const nodesWrap = document.querySelector(".process-nodes");
  const desktopProcess = window.matchMedia("(min-width: 821px)");

  let pathLen = 0;
  let nodes = [];

  function setupRiver() {
    if (!riverDraw) return;
    pathLen = riverDraw.getTotalLength();
    riverDraw.style.strokeDasharray = pathLen;
    riverDraw.style.strokeDashoffset = pathLen;
    if (nodesWrap && nodes.length === 0) {
      for (let i = 0; i < stages.length; i++) {
        const t = stages.length === 1 ? 0 : i / (stages.length - 1);
        const pt = riverDraw.getPointAtLength(pathLen * t);
        const dot = document.createElement("span");
        dot.className = "pnode";
        dot.style.left = (pt.x / 60) * 100 + "%";
        dot.style.top = (pt.y / 600) * 100 + "%";
        nodesWrap.appendChild(dot);
        nodes.push(dot);
      }
    }
  }

  function onScrollProcess() {
    if (!track || !desktopProcess.matches) return;
    const rect = track.getBoundingClientRect();
    const total = track.offsetHeight - window.innerHeight;
    const progress = Math.min(1, Math.max(0, -rect.top / total));

    if (riverDraw && pathLen) {
      riverDraw.style.strokeDashoffset = pathLen * (1 - progress);
    }
    const idx = Math.min(stages.length - 1, Math.floor(progress * stages.length));
    stages.forEach((s, i) => s.classList.toggle("active", i === idx));
    nodes.forEach((n, i) => n.classList.toggle("lit", i / Math.max(1, stages.length - 1) <= progress + 0.001));
  }

  if (track && desktopProcess.matches) {
    setupRiver();
    if (reduceMotion && riverDraw) {
      riverDraw.style.strokeDashoffset = 0;
    }
    window.addEventListener("scroll", onScrollProcess, { passive: true });
    onScrollProcess();
  }
  if (stages.length && !desktopProcess.matches) {
    stages.forEach((s) => s.classList.add("active"));
  }

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

  /* ---------- Founder-editable content (site-config.json) ---------- */
  fetch("content/site-config.json")
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((cfg) => {
      const lt = cfg.leadTime || {};
      const set = (sel, txt) => {
        const el = document.querySelector(sel);
        if (el && txt) el.textContent = txt;
      };
      set('[data-config="status"]', lt.status);
      set('[data-config="window"]', lt.bookingWindow);
      set('[data-config="note"]', lt.note);
      set('[data-config="leadtime-pill"]', (lt.status || "Now booking") + " · " + (lt.bookingWindow || ""));
      set('[data-config="location"]', (cfg.contact || {}).location);

      const meter = document.querySelector('[data-config="meter"]');
      if (meter && lt.slotsTotal) {
        meter.innerHTML = "";
        meter.setAttribute("aria-label", lt.slotsRemaining + " of " + lt.slotsTotal + " commission slots open");
        for (let i = 0; i < lt.slotsTotal; i++) {
          const s = document.createElement("span");
          s.className = "slot" + (i < lt.slotsRemaining ? " open" : "");
          meter.appendChild(s);
        }
        const note = document.querySelector('[data-config="note"]');
        if (note) note.textContent = lt.slotsRemaining + " of " + lt.slotsTotal + " slots open. " + (lt.note || "");
      }

      const tbody = document.querySelector('[data-config="timelines"]');
      if (tbody && Array.isArray(cfg.typicalTimelines)) {
        tbody.innerHTML = "";
        cfg.typicalTimelines.forEach((row) => {
          const tr = document.createElement("tr");
          [row.piece, row.hours, row.weeks].forEach((v) => {
            const td = document.createElement("td");
            td.textContent = v;
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
      }

      const email = document.querySelector('[data-config="email"]');
      if (email && cfg.contact && cfg.contact.email) {
        email.textContent = cfg.contact.email;
        email.href = "mailto:" + cfg.contact.email;
      }
      const fb = document.querySelector('[data-config="facebook"]');
      if (fb && cfg.contact && cfg.contact.facebook) fb.href = cfg.contact.facebook;
    })
    .catch(() => {
      /* Config unavailable (e.g. opened as file://) — static fallback text remains */
    });

  /* ---------- Swatch picker ---------- */
  const swatches = document.querySelectorAll(".swatch");
  const stops = {
    a: document.querySelector(".pr-a"),
    b: document.querySelector(".pr-b"),
    c: document.querySelector(".pr-c"),
  };
  const swatchName = document.querySelector("[data-swatch-name]");
  swatches.forEach((sw) => {
    sw.addEventListener("click", () => {
      swatches.forEach((s) => {
        s.classList.remove("is-active");
        s.setAttribute("aria-checked", "false");
      });
      sw.classList.add("is-active");
      sw.setAttribute("aria-checked", "true");
      if (stops.a) stops.a.setAttribute("stop-color", sw.dataset.a);
      if (stops.b) stops.b.setAttribute("stop-color", sw.dataset.b);
      if (stops.c) stops.c.setAttribute("stop-color", sw.dataset.a);
      if (swatchName) swatchName.textContent = sw.dataset.name;
    });
  });
})();
