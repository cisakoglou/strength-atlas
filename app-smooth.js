import { FRONT_MUSCLES, BACK_MUSCLES } from './bodyDataSmooth.js';
import { STRINGS, MUSCLE_NAMES } from './i18n.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Non-muscle slugs — drawn faintly, never interactive.
const INERT = new Set(['head', 'hands', 'feet', 'knees', 'ankles']);

// Slugs we don't render at all. Long hair is the strongest gender cue;
// a bare, neutral head reads androgynous (and matches anatomy charts).
const HIDDEN = new Set(['hair']);

// Smooth-model slug → our exercise group (key in exercises.json).
// Rear delt lives in the "deltoids" slug on the back view; both map to shoulders.
const SLUG_GROUP = {
  chest:      'chest',
  obliques:   'obliques',
  abs:        'abs',
  biceps:     'biceps',
  triceps:    'triceps',
  neck:       'neck',
  trapezius:  'traps',
  deltoids:   'shoulders',
  adductors:  'adductors',
  quadriceps: 'quads',
  tibialis:   'tibialis',
  calves:     'calves',
  forearm:    'forearms',
  'upper-back':'lats',
  'lower-back':'lower-back',
  gluteal:    'glutes',
  hamstring:  'hamstrings',
};

// data-region is the exercise group; that key also hits exercises.json directly.
const regionOf = (slug) => SLUG_GROUP[slug] || null;

const displayName = (region) =>
  MUSCLE_NAMES[lang][region] ||
  region.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

const exercises = () => EX[lang] || {};
const getList = (region) => exercises()[region] || [];

// ── State ──────────────────────────────────────────────────────

const lang = 'en';
const EX = { en: {} };
let selected = null;

const tooltip      = document.getElementById('tooltip');
const panel        = document.getElementById('exercise-panel');
const panelClose   = document.getElementById('panel-close');
const panelTitle   = document.getElementById('panel-muscle-name');
const exerciseList = document.getElementById('exercise-list');

Promise.all([
  fetch('./exercises.json').then(r => r.json()),
]).then(([en]) => {
  EX.en = en;
  if (selected) showPanel(selected);
});

// ── Render ─────────────────────────────────────────────────────

function renderBody(svg, muscles) {
  muscles.forEach(({ slug, path }) => {
    if (HIDDEN.has(slug)) return;

    const region = regionOf(slug);
    const interactive = !INERT.has(slug) && !!region;

    const el = document.createElementNS(SVG_NS, 'path');
    el.setAttribute('d', path);
    el.setAttribute('class', interactive ? 'muscle interactive' : 'muscle inert');
    if (region) el.dataset.region = region;
    el.dataset.slug = slug;
    svg.appendChild(el);
  });

  attachListeners(svg);
}

function attachListeners(svg) {
  const toggle = (region, cls, on) =>
    document.querySelectorAll(`path[data-region="${region}"]`)
      .forEach(p => p.classList.toggle(cls, on));

  svg.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const region = e.target.dataset?.region;
    if (!region) return;
    toggle(region, 'hover', true);
    tooltip.textContent = displayName(region);
    tooltip.classList.add('visible');
  });

  svg.addEventListener('pointerout', e => {
    if (e.pointerType !== 'mouse') return;
    const region = e.target.dataset?.region;
    if (!region) return;
    toggle(region, 'hover', false);
    tooltip.classList.remove('visible');
  });

  svg.addEventListener('click', e => {
    const region = e.target.dataset?.region;
    if (!region) return;
    selectRegion(region);
  });
}

// ── Selection ──────────────────────────────────────────────────

function selectRegion(region) {
  if (selected === region) {
    clearSelection();
    hidePanel();
    return;
  }
  clearSelection();
  selected = region;
  document.querySelectorAll(`path[data-region="${region}"]`)
    .forEach(p => p.classList.add('selected'));
  document.getElementById('body-front').classList.add('has-selection');
  document.getElementById('body-back').classList.add('has-selection');
  showPanel(region);
}

function clearSelection() {
  document.querySelectorAll('path.selected').forEach(p => p.classList.remove('selected'));
  document.getElementById('body-front').classList.remove('has-selection');
  document.getElementById('body-back').classList.remove('has-selection');
  selected = null;
}

// ── Panel ──────────────────────────────────────────────────────

function showPanel(region) {
  const list = getList(region);
  panelTitle.textContent = displayName(region);

  exerciseList.innerHTML = list.length
    ? list.map(ex => `
        <div class="exercise-card">
          <div class="exercise-body">
            <div class="exercise-name">${ex.name}</div>
            <p class="exercise-desc">${ex.description}</p>
          </div>
        </div>
      `).join('')
    : `<p class="no-data">${STRINGS[lang].noData}</p>`;

  panel.classList.add('visible');
}

function hidePanel() {
  panel.classList.remove('visible');
}

// ── Static text (English) ──────────────────────────────────────

function applyText() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (STRINGS[lang][key]) el.textContent = STRINGS[lang][key];
  });
  panelClose.setAttribute('aria-label', STRINGS[lang].closeLabel);
}

// ── Init ───────────────────────────────────────────────────────

renderBody(document.getElementById('body-front'), FRONT_MUSCLES);
renderBody(document.getElementById('body-back'), BACK_MUSCLES);

applyText();

panelClose.addEventListener('click', () => {
  clearSelection();
  hidePanel();
});

// Dismiss the panel on Escape, or by clicking away from a muscle/the panel.
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && selected) {
    clearSelection();
    hidePanel();
  }
});

document.addEventListener('click', e => {
  if (!selected) return;
  if (e.target.closest('#exercise-panel')) return;   // clicks inside the panel
  if (e.target.dataset?.region) return;              // a muscle handled it
  clearSelection();
  hidePanel();
});

document.addEventListener('mousemove', e => {
  tooltip.style.left = (e.clientX + 14) + 'px';
  tooltip.style.top  = (e.clientY - 38) + 'px';
});
