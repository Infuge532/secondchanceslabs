// Second Chance Slabs — shared interactions

// Mobile nav
const toggle = document.querySelector(".nav-toggle");
if (toggle) {
  toggle.addEventListener("click", () => {
    const open = document.body.classList.toggle("nav-open");
    toggle.setAttribute("aria-expanded", open);
  });
  document.querySelectorAll(".nav-links a").forEach((a) =>
    a.addEventListener("click", () => {
      document.body.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
    })
  );
}

// Scroll reveal
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
);
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

// Animated counters in the stats band
const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || "";
      const duration = 1400;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      counterObserver.unobserve(el);
    });
  },
  { threshold: 0.5 }
);
document.querySelectorAll("[data-count]").forEach((el) => counterObserver.observe(el));

// Hero visual: gentle scroll parallax on the walnut image
const heroVisual = document.querySelector(".hero-visual");
if (heroVisual && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  // The entrance animation (fill: both) would pin the transform — release it once done
  heroVisual.addEventListener("animationend", () => {
    heroVisual.style.animation = "none";
  });

  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      if (y < window.innerHeight * 1.2) {
        heroVisual.style.transform = `translateY(${y * 0.08}px)`;
      }
    },
    { passive: true }
  );
}

// Contact form (static site — show confirmation, no backend)
const form = document.querySelector("#commission-form");
if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    form.querySelector("button[type=submit]").textContent = "Request received — we'll be in touch";
    form.querySelectorAll("input, select, textarea, button").forEach((el) => (el.disabled = true));
  });
}
