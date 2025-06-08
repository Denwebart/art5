// Detecting When a Sticky Element Gets Pinned
const el = document.querySelector('.main-menu');
const observer = new IntersectionObserver(
  ([e]) => e.target.classList.toggle('is-pinned', e.intersectionRatio < 1),
  { threshold: [1] }
);

observer.observe(el);
