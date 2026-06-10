import { FRONT_MUSCLES, BACK_MUSCLES } from './bodyData.js';
import { STRINGS, MUSCLE_NAMES } from './i18n.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Paths we never render — drop the hair/scalp cap to keep the figure neutral.
// (`head`/`head-back` are the crown; `face` is the face, which we keep.)
const SKIP = new Set(['head', 'head-back']);

// Strip side suffix so left+right of the same region act as one unit.
const baseSlug = (id) => id.replace(/-(left|right)$/, '');

// Collapse some base slugs into a single hover/click region.
function regionOf(base) {
  if (base.startsWith('chest-')) return 'chest';
  if (base.startsWith('calves-')) return 'calves';
  // Merge the misplaced clavicular strip into the main shoulder cap.
  if (base === 'shoulder-front' || base === 'shoulder-side') return 'shoulder-front';
  return base;
}

// Region → exercise group (fallback). A region absent here is inert
// (head, knee, elbow, hand, foot, nape spine etc. that we don't coach).
const REGION_GROUP = {
  'neck':               'neck',
  'shoulder-front':     'shoulders',
  'deltoid-rear':       'shoulders',
  'biceps':             'biceps',
  'triceps-long':       'triceps',
  'triceps-lateral':    'triceps',
  'forearm':            'forearms',
  'forearm-flexors':    'forearms',
  'forearm-extensors':  'forearms',
  'chest':              'chest',
  'abs-upper':          'abs',
  'abs-lower':          'abs',
  'serratus-anterior':  'serratus',
  'obliques':           'obliques',
  'traps-upper':        'traps',
  'traps-mid':          'traps',
  'traps-lower':        'traps',
  'lats-upper':         'lats',
  'lats-mid':           'lats',
  'lats-lower':         'lats',
  'lower-back-erectors':'lower-back',
  'lower-back-ql':      'lower-back',
  'gluteus-maximus':    'glutes',
  'gluteus-medius':     'abductors',
  'quads':              'quads',
  'adductors':          'adductors',
  'hamstrings-medial':  'hamstrings',
  'hamstrings-lateral': 'hamstrings',
  'calves':             'calves',
  'tibialis-anterior':  'tibialis',
  'hip-flexor':         'hip-flexors',
};

// Muscle label in the current language; falls back to title-cased slug.
const displayName = (region) =>
  MUSCLE_NAMES[lang][region] ||
  region.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

const getGroup = (region) => REGION_GROUP[region] || null;

// Current-language exercise data: region-specific list first, then group.
const exercises = () => EX[lang] || {};
const getList = (region) => exercises()[region] || exercises()[getGroup(region)] || [];

// ── State ──────────────────────────────────────────────────────

let lang = localStorage.getItem('sa-lang') || 'en';
const EX = { en: {}, el: {} };   // exercise data per language
let selected = null;

const tooltip      = document.getElementById('tooltip');
const panel        = document.getElementById('exercise-panel');
const panelClose   = document.getElementById('panel-close');
const panelTitle   = document.getElementById('panel-muscle-name');
const exerciseList = document.getElementById('exercise-list');

Promise.all([
  fetch('./exercises.json').then(r => r.json()),
  fetch('./exercises.el.json').then(r => r.json()),
]).then(([en, el]) => {
  EX.en = en;
  EX.el = el;
  if (selected) showPanel(selected);   // refresh if a region was already open
});

// ── Render a body view into an SVG ─────────────────────────────

function renderBody(svg, muscles) {
  muscles.forEach(({ id, path }) => {
    if (SKIP.has(id)) return;

    const region = regionOf(baseSlug(id));
    const interactive = !!getGroup(region);

    const el = document.createElementNS(SVG_NS, 'path');
    el.setAttribute('d', path);
    el.setAttribute('class', interactive ? 'muscle interactive' : 'muscle inert');
    el.dataset.region = region;
    svg.appendChild(el);
  });

  attachListeners(svg);
}

function attachListeners(svg) {
  const toggle = (region, cls, on) =>
    document.querySelectorAll(`path[data-region="${region}"]`)
      .forEach(p => p.classList.toggle(cls, on));

  // Hover highlight + tooltip are mouse-only. On touch, a tap emulates
  // mouseover with no matching mouseout, so the label would stick — skip it
  // and let the tap drive selection (red highlight + panel) instead.
  svg.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const region = e.target.dataset?.region;
    if (!region || !getGroup(region)) return;
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
    if (!region || !getGroup(region)) return;
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
  document
    .querySelectorAll(`path[data-region="${region}"]`)
    .forEach(p => p.classList.add('selected'));

  showPanel(region);
}

function clearSelection() {
  document.querySelectorAll('path.selected').forEach(p => p.classList.remove('selected'));
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

// ── Language ───────────────────────────────────────────────────

function applyLang() {
  document.documentElement.lang = lang;

  // Static UI text marked with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (STRINGS[lang][key]) el.textContent = STRINGS[lang][key];
  });

  panelClose.setAttribute('aria-label', STRINGS[lang].closeLabel);

  // Active state on the toggle
  document.querySelectorAll('.lang-toggle button').forEach(b =>
    b.classList.toggle('active', b.dataset.lang === lang));

  // Refresh anything already on screen in the new language
  if (selected) showPanel(selected);
}

function setLang(next) {
  if (next === lang) return;
  lang = next;
  localStorage.setItem('sa-lang', lang);
  applyLang();
}

// ── Init ───────────────────────────────────────────────────────

renderBody(document.getElementById('body-front'), FRONT_MUSCLES);
renderBody(document.getElementById('body-back'), BACK_MUSCLES);

document.querySelectorAll('.lang-toggle button').forEach(b =>
  b.addEventListener('click', () => setLang(b.dataset.lang)));

applyLang();

panelClose.addEventListener('click', () => {
  clearSelection();
  hidePanel();
});

document.addEventListener('mousemove', e => {
  tooltip.style.left = (e.clientX + 14) + 'px';
  tooltip.style.top  = (e.clientY - 38) + 'px';
});
