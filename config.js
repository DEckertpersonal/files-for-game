const STORAGE_KEY = '67-runner-config-v1';

export const defaultConfig = {
  runner: {
    scale: 1.1,
    laneDistance: 3.2,
    laneChangeSpeed: 10,
    jumpVelocity: 12,
    gravity: 32,
    heightOffset: 0,
  },
  camera: {
    height: 5.5,
    distance: 10,
    smoothing: 3.5,
  },
  environment: {
    trackSpeed: 18,
    spawnZ: -45,
    cleanupZ: 15,
  },
  obstacles: {
    size: { x: 2.2, y: 2.2, z: 2.2 },
    hitboxPadding: 0.2,
    spawnInterval: 1.4,
  },
  coins: {
    scale: 1.05,
    groundHeight: 1.0,
    elevatedHeight: 2.8,
    hitboxPadding: 0.4,
    spawnInterval: 0.75,
    probabilities: {
      ground: 0.8,
      jump: 0.15,
      advanced: 0.05,
    },
  },
  particles: {
    count: 32,
    size: 0.22,
    lifetime: 0.7,
    speed: 6.5,
  },
  audio: {
    bgmVolume: 0.55,
    sfxVolume: 0.85,
    musicFadeSeconds: 2.4,
  },
};

const clone = (obj) => JSON.parse(JSON.stringify(obj));
let currentConfig = loadConfig();

function loadConfig() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...clone(defaultConfig), ...JSON.parse(stored) };
    }
  } catch (err) {
    console.warn('Unable to load stored config', err);
  }
  return clone(defaultConfig);
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentConfig));
  } catch (err) {
    console.warn('Unable to save config', err);
  }
}

function updateValue(path, value) {
  const parts = path.split('.');
  let target = currentConfig;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (!target[key]) target[key] = {};
    target = target[key];
  }
  target[parts[parts.length - 1]] = value;
  persist();
}

export function resetConfig() {
  currentConfig = clone(defaultConfig);
  persist();
  return currentConfig;
}

export function getConfig() {
  return currentConfig;
}

function addNumberInput(container, label, path, step, onChange) {
  const wrapper = document.createElement('label');
  const span = document.createElement('span');
  span.textContent = label;
  const input = document.createElement('input');
  input.type = 'number';
  input.step = step;
  const parts = path.split('.');
  let ref = currentConfig;
  parts.forEach((p) => { ref = ref[p]; });
  input.value = ref;
  input.addEventListener('change', () => {
    const val = Number(input.value);
    if (!Number.isFinite(val)) return;
    updateValue(path, val);
    onChange(currentConfig);
  });
  wrapper.appendChild(span);
  wrapper.appendChild(input);
  container.appendChild(wrapper);
}

export function createConfigPanel(onChange) {
  const panel = document.getElementById('config-panel');
  panel.innerHTML = '';

  const title = document.createElement('h2');
  title.textContent = 'Tuning Panel';
  panel.appendChild(title);

  const runnerGroup = document.createElement('div');
  runnerGroup.className = 'group';
  runnerGroup.innerHTML = '<strong>Runner</strong>';
  panel.appendChild(runnerGroup);
  addNumberInput(runnerGroup, 'Scale', 'runner.scale', '0.05', onChange);
  addNumberInput(runnerGroup, 'Lane distance', 'runner.laneDistance', '0.1', onChange);
  addNumberInput(runnerGroup, 'Lane change speed', 'runner.laneChangeSpeed', '0.1', onChange);
  addNumberInput(runnerGroup, 'Jump velocity', 'runner.jumpVelocity', '0.1', onChange);
  addNumberInput(runnerGroup, 'Gravity', 'runner.gravity', '0.1', onChange);
  addNumberInput(runnerGroup, 'Height offset', 'runner.heightOffset', '0.05', onChange);

  const cameraGroup = document.createElement('div');
  cameraGroup.className = 'group';
  cameraGroup.innerHTML = '<strong>Camera</strong>';
  panel.appendChild(cameraGroup);
  addNumberInput(cameraGroup, 'Height', 'camera.height', '0.1', onChange);
  addNumberInput(cameraGroup, 'Distance', 'camera.distance', '0.1', onChange);
  addNumberInput(cameraGroup, 'Smoothing', 'camera.smoothing', '0.1', onChange);

  const envGroup = document.createElement('div');
  envGroup.className = 'group';
  envGroup.innerHTML = '<strong>Environment</strong>';
  panel.appendChild(envGroup);
  addNumberInput(envGroup, 'Track speed', 'environment.trackSpeed', '0.1', onChange);
  addNumberInput(envGroup, 'Spawn Z', 'environment.spawnZ', '0.1', onChange);
  addNumberInput(envGroup, 'Cleanup Z', 'environment.cleanupZ', '0.1', onChange);

  const obstacleGroup = document.createElement('div');
  obstacleGroup.className = 'group';
  obstacleGroup.innerHTML = '<strong>Obstacles</strong>';
  panel.appendChild(obstacleGroup);
  addNumberInput(obstacleGroup, 'Width', 'obstacles.size.x', '0.05', onChange);
  addNumberInput(obstacleGroup, 'Height', 'obstacles.size.y', '0.05', onChange);
  addNumberInput(obstacleGroup, 'Depth', 'obstacles.size.z', '0.05', onChange);
  addNumberInput(obstacleGroup, 'Hitbox padding', 'obstacles.hitboxPadding', '0.05', onChange);
  addNumberInput(obstacleGroup, 'Spawn interval (s)', 'obstacles.spawnInterval', '0.05', onChange);

  const coinGroup = document.createElement('div');
  coinGroup.className = 'group';
  coinGroup.innerHTML = '<strong>Coins</strong>';
  panel.appendChild(coinGroup);
  addNumberInput(coinGroup, 'Scale', 'coins.scale', '0.05', onChange);
  addNumberInput(coinGroup, 'Ground height', 'coins.groundHeight', '0.05', onChange);
  addNumberInput(coinGroup, 'Air height', 'coins.elevatedHeight', '0.05', onChange);
  addNumberInput(coinGroup, 'Hitbox padding', 'coins.hitboxPadding', '0.05', onChange);
  addNumberInput(coinGroup, 'Spawn interval (s)', 'coins.spawnInterval', '0.05', onChange);
  addNumberInput(coinGroup, 'Ground %', 'coins.probabilities.ground', '0.01', onChange);
  addNumberInput(coinGroup, 'Jump %', 'coins.probabilities.jump', '0.01', onChange);
  addNumberInput(coinGroup, 'Advanced %', 'coins.probabilities.advanced', '0.01', onChange);

  const particleGroup = document.createElement('div');
  particleGroup.className = 'group';
  particleGroup.innerHTML = '<strong>Particles</strong>';
  panel.appendChild(particleGroup);
  addNumberInput(particleGroup, 'Count', 'particles.count', '1', onChange);
  addNumberInput(particleGroup, 'Size', 'particles.size', '0.05', onChange);
  addNumberInput(particleGroup, 'Lifetime', 'particles.lifetime', '0.05', onChange);
  addNumberInput(particleGroup, 'Speed', 'particles.speed', '0.1', onChange);

  const audioGroup = document.createElement('div');
  audioGroup.className = 'group';
  audioGroup.innerHTML = '<strong>Audio</strong>';
  panel.appendChild(audioGroup);
  addNumberInput(audioGroup, 'Music volume', 'audio.bgmVolume', '0.05', onChange);
  addNumberInput(audioGroup, 'SFX volume', 'audio.sfxVolume', '0.05', onChange);
  addNumberInput(audioGroup, 'Fade seconds', 'audio.musicFadeSeconds', '0.1', onChange);

  const actions = document.createElement('div');
  actions.style.marginTop = '10px';

  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Reset to defaults';
  resetBtn.addEventListener('click', () => {
    resetConfig();
    createConfigPanel(onChange);
    onChange(currentConfig);
  });
  actions.appendChild(resetBtn);

  const copyBtn = document.createElement('button');
  copyBtn.className = 'secondary';
  copyBtn.textContent = 'Copy JSON';
  const jsonBox = document.createElement('textarea');
  jsonBox.readOnly = false;
  jsonBox.value = JSON.stringify(currentConfig, null, 2);
  jsonBox.addEventListener('focus', () => jsonBox.select());
  copyBtn.addEventListener('click', () => {
    jsonBox.value = JSON.stringify(currentConfig, null, 2);
    jsonBox.select();
    document.execCommand('copy');
  });
  actions.appendChild(copyBtn);

  const applyBtn = document.createElement('button');
  applyBtn.textContent = 'Apply JSON';
  applyBtn.className = 'secondary';
  applyBtn.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(jsonBox.value);
      currentConfig = { ...clone(defaultConfig), ...parsed };
      persist();
      createConfigPanel(onChange);
      onChange(currentConfig);
    } catch (err) {
      alert('Invalid JSON');
    }
  });
  actions.appendChild(applyBtn);

  panel.appendChild(actions);
  panel.appendChild(jsonBox);

  return panel;
}
