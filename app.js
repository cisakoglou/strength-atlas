import { FRONT_MUSCLES, BACK_MUSCLES } from './bodyData.js';

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

// Pretty labels for the tooltip + panel title.
const DISPLAY = {
  'shoulder-front':     'Front/Lateral Delt',
  'deltoid-rear':       'Rear Delt',
  'triceps-long':       'Triceps · Long Head',
  'triceps-lateral':    'Triceps · Lateral Head',
  'lats-upper':         'Lats · Upper',
  'lats-mid':           'Lats · Mid',
  'lats-lower':         'Lats · Lower',
  'traps-upper':        'Traps · Upper',
  'traps-mid':          'Traps · Mid',
  'traps-lower':        'Traps · Lower',
  'abs-upper':          'Abs · Upper',
  'abs-lower':          'Abs · Lower',
  'serratus-anterior':  'Serratus Anterior',
  'forearm-flexors':    'Forearm Flexors',
  'forearm-extensors':  'Forearm Extensors',
  'gluteus-maximus':    'Glutes',
  'gluteus-medius':     'Abductors',
  'quads':              'Quadriceps',
  'hamstrings-medial':  'Hamstrings · Medial',
  'hamstrings-lateral': 'Hamstrings · Lateral',
  'tibialis-anterior':  'Tibialis Anterior',
  'hip-flexor':         'Hip Flexors',
  'lower-back-erectors':'Erector Spinae',
  'lower-back-ql':      'Quadratus Lumborum',
  'chest':              'Chest',
  'calves':             'Calves',
  'biceps':             'Biceps',
  'obliques':           'Obliques',
  'adductors':          'Adductors',
  'neck':               'Neck',
};

const displayName = (region) =>
  DISPLAY[region] ||
  region.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

const getGroup = (region) => REGION_GROUP[region] || null;

// Region-specific list first, fall back to the broader group list.
const getList = (region) => exercises[region] || exercises[getGroup(region)] || [];

// ── State ──────────────────────────────────────────────────────

let exercises = {};
let selected = null;

const tooltip      = document.getElementById('tooltip');
const panel        = document.getElementById('exercise-panel');
const panelClose   = document.getElementById('panel-close');
const panelTitle   = document.getElementById('panel-muscle-name');
const exerciseList = document.getElementById('exercise-list');

fetch('./exercises.json')
  .then(r => r.json())
  .then(data => { exercises = data; });

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

  svg.addEventListener('mouseover', e => {
    const region = e.target.dataset?.region;
    if (!region || !getGroup(region)) return;
    toggle(region, 'hover', true);
    tooltip.textContent = displayName(region);
    tooltip.classList.add('visible');
  });

  svg.addEventListener('mouseout', e => {
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
    : '<p class="no-data">No exercises mapped for this region yet.</p>';

  panel.classList.add('visible');
}

function hidePanel() {
  panel.classList.remove('visible');
}

// ── Init ───────────────────────────────────────────────────────

renderBody(document.getElementById('body-front'), FRONT_MUSCLES);
renderBody(document.getElementById('body-back'), BACK_MUSCLES);

panelClose.addEventListener('click', () => {
  clearSelection();
  hidePanel();
});

document.addEventListener('mousemove', e => {
  tooltip.style.left = (e.clientX + 14) + 'px';
  tooltip.style.top  = (e.clientY - 38) + 'px';
});
