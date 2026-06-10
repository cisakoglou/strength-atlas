const { BodyChart, ViewSide } = BodyMuscles;

// Maps normalized muscle IDs (without -left/-right suffix) to exercise group keys
const MUSCLE_GROUP = {
  'neck':                  'neck',
  'nape':                  'neck',
  'shoulder-front':        'shoulders',
  'shoulder-side':         'shoulders',
  'deltoid-rear':          'shoulders',
  'biceps':                'biceps',
  'forearm':               'forearms',
  'forearm-flexors':       'forearms',
  'forearm-extensors':     'forearms',
  'chest-upper':           'chest',
  'chest-lower':           'chest',
  'abs-upper':             'abs',
  'abs-lower':             'abs',
  'serratus-anterior':     'serratus',
  'obliques':              'obliques',
  'hip-flexor':            'hip-flexors',
  'quads':                 'quads',
  'adductors':             'adductors',
  'tibialis-anterior':     'tibialis',
  'traps-upper':           'traps',
  'traps-mid':             'traps',
  'traps-lower':           'traps',
  'lats-upper':            'lats',
  'lats-mid':              'lats',
  'lats-lower':            'lats',
  'triceps-long':          'triceps',
  'triceps-lateral':       'triceps',
  'spine':                 'lower-back',
  'lower-back-erectors':   'lower-back',
  'lower-back-ql':         'lower-back',
  'gluteus-maximus':       'glutes',
  'gluteus-medius':        'glutes',
  'hamstrings-medial':     'hamstrings',
  'hamstrings-lateral':    'hamstrings',
  'calves-gastroc-medial': 'calves',
  'calves-gastroc-lateral':'calves',
  'calves-soleus':         'calves',
};

function getMuscleGroup(id) {
  const base = id.replace(/-(?:left|right)$/, '');
  return MUSCLE_GROUP[base] || null;
}

// Converts 'chest-upper-left' → 'Chest Upper (L)'
function idToLabel(id) {
  const side = id.endsWith('-left') ? ' (L)' : id.endsWith('-right') ? ' (R)' : '';
  return id
    .replace(/-left$|-right$/, '')
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') + side;
}

// ── State ──────────────────────────────────────────────────────

let exercises = {};
let selectedId = null;

// ── DOM refs ───────────────────────────────────────────────────

const tooltip      = document.getElementById('tooltip');
const panel        = document.getElementById('exercise-panel');
const panelClose   = document.getElementById('panel-close');
const panelTitle   = document.getElementById('panel-muscle-name');
const exerciseList = document.getElementById('exercise-list');

// ── Load exercise data ─────────────────────────────────────────

fetch('./exercises.json')
  .then(r => r.json())
  .then(data => { exercises = data; });

// ── Charts ─────────────────────────────────────────────────────

const frontChart = new BodyChart(document.getElementById('body-front'), {
  view: ViewSide.FRONT,
  bodyState: {},
  onMuscleClick: (id, name) => handleClick(id, name, frontChart, backChart),
  onMuscleHover: (id) => handleHover(id),
});

const backChart = new BodyChart(document.getElementById('body-back'), {
  view: ViewSide.BACK,
  bodyState: {},
  onMuscleClick: (id, name) => handleClick(id, name, backChart, frontChart),
  onMuscleHover: (id) => handleHover(id),
});

// ── Interactions ───────────────────────────────────────────────

function handleClick(id, name, activeChart, otherChart) {
  if (selectedId === id) {
    selectedId = null;
    clearHighlights(activeChart, otherChart);
    hidePanel();
    return;
  }

  selectedId = id;
  activeChart.update({ bodyState: { [id]: { intensity: 9, selected: true } } });
  otherChart.update({ bodyState: {} });
  showPanel(id, name);
}

function handleHover(id) {
  if (id) {
    tooltip.textContent = idToLabel(id);
    tooltip.classList.add('visible');
  } else {
    tooltip.classList.remove('visible');
  }
}

function clearHighlights(a, b) {
  a.update({ bodyState: {} });
  b.update({ bodyState: {} });
}

function showPanel(id, name) {
  const group = getMuscleGroup(id);
  const list  = group ? (exercises[group] || []) : [];

  panelTitle.textContent = name;

  exerciseList.innerHTML = list.length
    ? list.map(ex => `
        <div class="exercise-card">
          <div class="exercise-name">${ex.name}</div>
          <div class="exercise-meta">${ex.sets} sets &times; ${ex.reps}</div>
          <p class="exercise-desc">${ex.description}</p>
        </div>
      `).join('')
    : '<p class="no-data">No exercises mapped for this region yet.</p>';

  panel.classList.add('visible');
}

function hidePanel() {
  panel.classList.remove('visible');
}

// ── UI controls ────────────────────────────────────────────────

panelClose.addEventListener('click', () => {
  selectedId = null;
  clearHighlights(frontChart, backChart);
  hidePanel();
});

// Tooltip follows the cursor
document.addEventListener('mousemove', e => {
  tooltip.style.left = (e.clientX + 14) + 'px';
  tooltip.style.top  = (e.clientY - 38) + 'px';
});
