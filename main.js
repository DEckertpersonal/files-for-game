import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/loaders/GLTFLoader.js';
import { SkeletonUtils } from 'https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/utils/SkeletonUtils.js';
import { getConfig, createConfigPanel, resetConfig } from './config.js';

const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownNumber = document.getElementById('countdown-number');
const scoreEl = document.getElementById('score');
const groundCountEl = document.getElementById('ground-count');
const jumpCountEl = document.getElementById('jump-count');
const advancedCountEl = document.getElementById('advanced-count');
const floatingLayer = document.getElementById('floating-text-layer');
const configPanelContainer = document.getElementById('config-panel');

const clock = new THREE.Clock();
let renderer;
let scene;
let camera;
let runner;
let runnerMixer;
let runAction;
let jumpClips = [];
let fallClips = [];
let coinModels = {};
let audioListener;
let backgroundMusic;
let coinSfx;
let musicTargetVolume = 0;
let musicActive = false;

const rng = (min, max) => Math.random() * (max - min) + min;

const state = {
  phase: 'start',
  lane: 0,
  targetLane: 0,
  velocityY: 0,
  isGrounded: true,
  score: 0,
  coinCounts: { ground: 0, jump: 0, advanced: 0 },
  timers: { obstacle: 0, coin: 0 },
  countdownTimer: null,
};

const activeObstacles = [];
const obstaclePool = [];
const activeCoins = [];
const coinPool = [];
const particleBursts = [];
const floatingTexts = [];

const assets = {
  runnerRun: 'assets/3d-models/runner/running/runner-3d-model-running.glb',
  runnerJumps: [
    'assets/3d-models/runner/jumping/runner-3d-model-jumping-1.glb',
    'assets/3d-models/runner/jumping/runner-3d-model-jumping-2.glb',
    'assets/3d-models/runner/jumping/runner-3d-model-jumping-3.glb',
    'assets/3d-models/runner/jumping/runner-3d-model-jumping-4.glb',
    'assets/3d-models/runner/jumping/runner-3d-model-jumping-5.glb',
  ],
  runnerFalls: [
    'assets/3d-models/runner/falling-down/runner-3d-model-falling-down-1.glb',
    'assets/3d-models/runner/falling-down/runner-3d-model-falling-down-2.glb',
    'assets/3d-models/runner/falling-down/runner-3d-model-falling-down-3.glb',
    'assets/3d-models/runner/falling-down/runner-3d-model-falling-down-4.glb',
  ],
  coins: {
    ground: 'assets/3d-models/coins/ground-coin-3d-image-silver.glb',
    jump: 'assets/3d-models/coins/jump-coin-3d-model-gold.glb',
    advanced: 'assets/3d-models/coins/advanced-coin-3d-model-blue.glb',
  },
  audio: {
    bg: 'assets/audio/game-sounds.mp3',
    coin: 'assets/audio/67-advanced-coin-audio.mp3',
  },
};

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function updateHUD() {
  scoreEl.textContent = `Score: ${state.score}`;
  groundCountEl.textContent = state.coinCounts.ground;
  jumpCountEl.textContent = state.coinCounts.jump;
  advancedCountEl.textContent = state.coinCounts.advanced;
}

function buildRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);
}

function buildScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf8fafc);

  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);

  const ambient = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(5, 12, 8);
  scene.add(dir);

  const groundGeo = new THREE.PlaneGeometry(120, 600, 1, 1);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -200;
  scene.add(ground);

  const laneHelperGeo = new THREE.PlaneGeometry(1.6, 600);
  const laneHelperMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
  for (let i = -1; i <= 1; i += 1) {
    const plane = new THREE.Mesh(laneHelperGeo, laneHelperMat.clone());
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(i * getConfig().runner.laneDistance, 0.01, -200);
    scene.add(plane);
  }
}

async function loadGLTF(path) {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(path, (gltf) => resolve(gltf), undefined, reject);
  });
}

async function loadRunner() {
  const runModel = await loadGLTF(assets.runnerRun);
  runner = SkeletonUtils.clone(runModel.scene);
  runner.traverse((child) => {
    if (child.isMesh) child.castShadow = true;
  });
  runnerMixer = new THREE.AnimationMixer(runner);
  runAction = runnerMixer.clipAction(runModel.animations[0]);
  runAction.play();

  const jumpPromises = assets.runnerJumps.map((p) => loadGLTF(p));
  const fallPromises = assets.runnerFalls.map((p) => loadGLTF(p));
  jumpClips = (await Promise.all(jumpPromises)).map((g) => g.animations[0]);
  fallClips = (await Promise.all(fallPromises)).map((g) => g.animations[0]);

  scene.add(runner);
}

async function loadCoins() {
  const entries = await Promise.all(
    Object.entries(assets.coins).map(async ([key, path]) => {
      const gltf = await loadGLTF(path);
      return [key, gltf.scene];
    }),
  );
  entries.forEach(([key, sceneObj]) => {
    coinModels[key] = sceneObj;
  });
}

async function loadAudio(cameraObj) {
  audioListener = new THREE.AudioListener();
  cameraObj.add(audioListener);

  const audioLoader = new THREE.AudioLoader();
  backgroundMusic = new THREE.Audio(audioListener);
  backgroundMusic.setLoop(true);
  backgroundMusic.setVolume(0);
  await new Promise((resolve, reject) => {
    audioLoader.load(assets.audio.bg, (buffer) => {
      backgroundMusic.setBuffer(buffer);
      resolve();
    }, undefined, reject);
  });

  coinSfx = new THREE.Audio(audioListener);
  await new Promise((resolve, reject) => {
    audioLoader.load(assets.audio.coin, (buffer) => {
      coinSfx.setBuffer(buffer);
      resolve();
    }, undefined, reject);
  });
}

function resize() {
  if (!renderer || !camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function resetRunnerPose() {
  const cfg = getConfig();
  runner.position.set(0, cfg.runner.heightOffset, 0);
  runner.scale.setScalar(cfg.runner.scale);
  runner.rotation.y = Math.PI; // face away from camera
  state.lane = 0;
  state.targetLane = 0;
  state.velocityY = 0;
  state.isGrounded = true;
  if (runAction) {
    runAction.reset();
    runAction.play();
  }
}

function getLaneX(lane) {
  return lane * getConfig().runner.laneDistance;
}

function getObstacle() {
  if (obstaclePool.length) return obstaclePool.pop();
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function getCoinMesh(type) {
  let mesh;
  if (coinPool.length) {
    mesh = coinPool.pop();
    mesh.userData.type = type;
    return mesh;
  }
  const base = coinModels[type];
  mesh = SkeletonUtils.clone(base);
  mesh.userData.type = type;
  return mesh;
}

function spawnObstacle() {
  const cfg = getConfig();
  const mesh = getObstacle();
  mesh.scale.set(cfg.obstacles.size.x, cfg.obstacles.size.y, cfg.obstacles.size.z);
  const lane = Math.floor(Math.random() * 3) - 1;
  mesh.position.set(getLaneX(lane), cfg.obstacles.size.y / 2 + cfg.runner.heightOffset, cfg.environment.spawnZ);
  mesh.userData.lane = lane;
  mesh.userData.active = true;
  scene.add(mesh);
  activeObstacles.push(mesh);
}

function pickCoinType() {
  const cfg = getConfig();
  const r = Math.random();
  if (r < cfg.coins.probabilities.ground) return 'ground';
  if (r < cfg.coins.probabilities.ground + cfg.coins.probabilities.jump) return 'jump';
  return 'advanced';
}

function spawnCoin() {
  const cfg = getConfig();
  const type = pickCoinType();
  const mesh = getCoinMesh(type);
  const lane = Math.floor(Math.random() * 3) - 1;
  const isAir = type !== 'ground';
  const y = isAir ? cfg.coins.elevatedHeight : cfg.coins.groundHeight;
  if (type === 'advanced' && Math.random() < 0.4) {
    mesh.position.y = y + cfg.obstacles.size.y;
  }
  mesh.position.set(getLaneX(lane), y, cfg.environment.spawnZ - 10);
  mesh.scale.setScalar(cfg.coins.scale);
  mesh.userData.active = true;
  scene.add(mesh);
  activeCoins.push(mesh);
}

function cleanupEntities() {
  const cfg = getConfig();
  for (let i = activeObstacles.length - 1; i >= 0; i -= 1) {
    const obs = activeObstacles[i];
    if (obs.position.z > cfg.environment.cleanupZ) {
      scene.remove(obs);
      obs.userData.active = false;
      obstaclePool.push(obs);
      activeObstacles.splice(i, 1);
    }
  }
  for (let i = activeCoins.length - 1; i >= 0; i -= 1) {
    const coin = activeCoins[i];
    if (coin.position.z > cfg.environment.cleanupZ) {
      scene.remove(coin);
      coin.userData.active = false;
      coinPool.push(coin);
      activeCoins.splice(i, 1);
    }
  }
}

function spawnParticles(position) {
  const cfg = getConfig();
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(cfg.particles.count * 3);
  const colors = new Float32Array(cfg.particles.count * 3);
  const velocities = [];
  for (let i = 0; i < cfg.particles.count; i += 1) {
    positions[i * 3] = position.x;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z;
    const color = new THREE.Color(`hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    velocities.push(new THREE.Vector3(rng(-1, 1), rng(0.5, 1.8), rng(-0.5, 0.5)).multiplyScalar(cfg.particles.speed));
  }
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({ size: cfg.particles.size, vertexColors: true, transparent: true, opacity: 1, depthWrite: false });
  const points = new THREE.Points(geom, mat);
  scene.add(points);
  particleBursts.push({ points, velocities, time: 0 });
}

function createTextSprite(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 64px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.5, 1.2, 1);
  return sprite;
}

function addFloatingText(worldPosition, text) {
  const sprite = createTextSprite(text);
  sprite.position.copy(worldPosition);
  scene.add(sprite);
  floatingTexts.push({ sprite, time: 0 });
}

function collectCoin(coin) {
  const type = coin.userData.type;
  const values = { ground: 67, jump: 134, advanced: 334 };
  const cfg = getConfig();
  state.score += values[type];
  state.coinCounts[type] += 1;
  updateHUD();
  spawnParticles(coin.position.clone());
  addFloatingText(coin.position.clone().add(new THREE.Vector3(0, 1.2, 0)), `+${values[type]}`);
  if (type !== 'ground' && coinSfx && coinSfx.buffer) {
    coinSfx.setVolume(cfg.audio.sfxVolume);
    coinSfx.stop();
    coinSfx.play();
  }
  scene.remove(coin);
  coin.userData.active = false;
  activeCoins.splice(activeCoins.indexOf(coin), 1);
  coinPool.push(coin);
}

function checkCollisions() {
  const cfg = getConfig();
  const runnerBox = new THREE.Box3().setFromObject(runner);
  runnerBox.expandByScalar(-cfg.obstacles.hitboxPadding);

  for (let i = activeObstacles.length - 1; i >= 0; i -= 1) {
    const obs = activeObstacles[i];
    const box = new THREE.Box3().setFromObject(obs).expandByScalar(cfg.obstacles.hitboxPadding);
    if (runnerBox.intersectsBox(box)) {
      handleGameOver();
      return;
    }
  }

  for (let i = activeCoins.length - 1; i >= 0; i -= 1) {
    const coin = activeCoins[i];
    const box = new THREE.Box3().setFromObject(coin).expandByScalar(cfg.coins.hitboxPadding);
    if (runnerBox.intersectsBox(box)) {
      collectCoin(coin);
    }
  }
}

function playJumpAnimation() {
  if (!jumpClips.length || !runnerMixer) return;
  const clip = jumpClips[Math.floor(Math.random() * jumpClips.length)];
  const jumpAction = runnerMixer.clipAction(clip);
  jumpAction.reset();
  jumpAction.setLoop(THREE.LoopOnce, 1);
  jumpAction.clampWhenFinished = true;
  jumpAction.enabled = true;
  jumpAction.play();
  runAction.crossFadeTo(jumpAction, 0.1, false);
  jumpAction.getMixer().addEventListener('finished', (e) => {
    if (e.action === jumpAction) {
      runAction.reset().play();
      jumpAction.crossFadeTo(runAction, 0.15, false);
    }
  });
}

function playFallAnimation() {
  if (!fallClips.length || !runnerMixer) return;
  const clip = fallClips[Math.floor(Math.random() * fallClips.length)];
  const fallAction = runnerMixer.clipAction(clip);
  fallAction.reset();
  fallAction.setLoop(THREE.LoopOnce, 1);
  fallAction.clampWhenFinished = true;
  fallAction.enabled = true;
  fallAction.play();
  runAction.crossFadeTo(fallAction, 0.12, false);
}

function startBackgroundMusic() {
  const cfg = getConfig();
  if (backgroundMusic && backgroundMusic.buffer && !musicActive) {
    musicActive = true;
    backgroundMusic.setVolume(0);
    backgroundMusic.play();
    musicTargetVolume = cfg.audio.bgmVolume;
  }
}

function stopBackgroundMusic() {
  musicTargetVolume = 0;
}

function updateMusic(delta) {
  if (!backgroundMusic) return;
  const cfg = getConfig();
  const current = backgroundMusic.getVolume();
  const step = (cfg.audio.musicFadeSeconds > 0 ? delta / cfg.audio.musicFadeSeconds : 1) * musicTargetVolume;
  const direction = musicTargetVolume > current ? 1 : -1;
  const next = THREE.MathUtils.clamp(current + step * direction, 0, Math.max(musicTargetVolume, current));
  backgroundMusic.setVolume(next);
  if (musicTargetVolume === 0 && next <= 0.001) {
    backgroundMusic.stop();
    musicActive = false;
  }
}

function resetGameState() {
  state.score = 0;
  state.coinCounts = { ground: 0, jump: 0, advanced: 0 };
  state.timers.obstacle = 0;
  state.timers.coin = 0;
  updateHUD();
  activeCoins.forEach((c) => scene.remove(c));
  activeObstacles.forEach((o) => scene.remove(o));
  coinPool.push(...activeCoins.splice(0));
  obstaclePool.push(...activeObstacles.splice(0));
  particleBursts.forEach((p) => scene.remove(p.points));
  particleBursts.length = 0;
  floatingTexts.forEach((f) => scene.remove(f.sprite));
  floatingTexts.length = 0;
  resetRunnerPose();
}

function handleGameOver() {
  if (state.phase !== 'playing') return;
  state.phase = 'gameover';
  stopBackgroundMusic();
  playFallAnimation();
  setTimeout(() => {
    resetGameState();
    startScreen.style.display = 'flex';
    countdownOverlay.classList.remove('active');
    state.phase = 'start';
  }, rng(1000, 1500));
}

function updateEntities(delta) {
  const cfg = getConfig();
  const move = cfg.environment.trackSpeed * delta;
  activeObstacles.forEach((obs) => { obs.position.z += move; });
  activeCoins.forEach((coin) => { coin.position.z += move; });
  cleanupEntities();
}

function updateParticles(delta) {
  for (let i = particleBursts.length - 1; i >= 0; i -= 1) {
    const burst = particleBursts[i];
    burst.time += delta;
    const positions = burst.points.geometry.attributes.position;
    for (let j = 0; j < burst.velocities.length; j += 1) {
      positions.array[j * 3] += burst.velocities[j].x * delta;
      positions.array[j * 3 + 1] += burst.velocities[j].y * delta;
      positions.array[j * 3 + 2] += burst.velocities[j].z * delta;
    }
    burst.points.geometry.attributes.position.needsUpdate = true;
    burst.points.material.opacity = THREE.MathUtils.clamp(1 - burst.time / getConfig().particles.lifetime, 0, 1);
    if (burst.time >= getConfig().particles.lifetime) {
      scene.remove(burst.points);
      particleBursts.splice(i, 1);
    }
  }
}

function updateFloatingText(delta) {
  for (let i = floatingTexts.length - 1; i >= 0; i -= 1) {
    const item = floatingTexts[i];
    item.time += delta;
    item.sprite.position.y += delta * 1.2;
    item.sprite.material.opacity = THREE.MathUtils.clamp(1 - item.time / 1.2, 0, 1);
    if (item.time > 1.2) {
      scene.remove(item.sprite);
      floatingTexts.splice(i, 1);
    }
  }
}

function updateRunner(delta) {
  const cfg = getConfig();
  const targetX = getLaneX(state.targetLane);
  runner.position.x = lerp(runner.position.x, targetX, Math.min(1, delta * cfg.runner.laneChangeSpeed));

  state.velocityY -= cfg.runner.gravity * delta;
  runner.position.y += state.velocityY * delta;
  if (runner.position.y <= cfg.runner.heightOffset) {
    runner.position.y = cfg.runner.heightOffset;
    state.velocityY = 0;
    state.isGrounded = true;
  }
}

function updateCamera(delta) {
  const cfg = getConfig();
  const desired = new THREE.Vector3(runner.position.x * 0.4, cfg.camera.height, cfg.camera.distance);
  camera.position.lerp(desired, 1 - Math.exp(-cfg.camera.smoothing * delta));
  camera.lookAt(runner.position.x, runner.position.y + 1.5, runner.position.z - 6);
}

function tick() {
  requestAnimationFrame(tick);
  const delta = clock.getDelta();
  if (runnerMixer) runnerMixer.update(delta);
  updateMusic(delta);

  if (state.phase === 'playing') {
    state.timers.obstacle += delta;
    state.timers.coin += delta;
    if (state.timers.obstacle >= getConfig().obstacles.spawnInterval) {
      spawnObstacle();
      state.timers.obstacle = 0;
    }
    if (state.timers.coin >= getConfig().coins.spawnInterval) {
      spawnCoin();
      state.timers.coin = 0;
    }
    updateRunner(delta);
    updateEntities(delta);
    checkCollisions();
  }
  updateParticles(delta);
  updateFloatingText(delta);
  updateCamera(delta);
  renderer.render(scene, camera);
}

function setPhaseCountdown() {
  state.phase = 'countdown';
  countdownOverlay.classList.add('active');
  countdownNumber.textContent = '3';
  let current = 3;
  if (state.countdownTimer) clearInterval(state.countdownTimer);
  state.countdownTimer = setInterval(() => {
    current -= 1;
    if (current === 2) startBackgroundMusic();
    if (current <= 0) {
      clearInterval(state.countdownTimer);
      countdownOverlay.classList.remove('active');
      startGameplay();
    } else {
      countdownNumber.textContent = String(current);
    }
  }, 1000);
}

function startGameplay() {
  state.phase = 'playing';
  state.timers.obstacle = 0;
  state.timers.coin = 0;
}

function startGameFlow() {
  startScreen.style.display = 'none';
  resetGameState();
  setPhaseCountdown();
}

function setupInput() {
  window.addEventListener('keydown', (e) => {
    if (state.phase !== 'playing') return;
    if (e.code === 'ArrowLeft') {
      state.targetLane = Math.max(-1, state.targetLane - 1);
    } else if (e.code === 'ArrowRight') {
      state.targetLane = Math.min(1, state.targetLane + 1);
    } else if (e.code === 'Space') {
      if (state.isGrounded) {
        state.velocityY = getConfig().runner.jumpVelocity;
        state.isGrounded = false;
        playJumpAnimation();
      }
    }
  });

  let touchStart = null;
  window.addEventListener('touchstart', (e) => {
    touchStart = e.changedTouches[0];
  }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const touchEnd = e.changedTouches[0];
    const dx = touchEnd.clientX - touchStart.clientX;
    const dy = touchEnd.clientY - touchStart.clientY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
      if (dx > 0) state.targetLane = Math.min(1, state.targetLane + 1);
      else state.targetLane = Math.max(-1, state.targetLane - 1);
    } else if (dy < -30) {
      if (state.phase === 'playing' && state.isGrounded) {
        state.velocityY = getConfig().runner.jumpVelocity;
        state.isGrounded = false;
        playJumpAnimation();
      }
    }
    touchStart = null;
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'p') {
      configPanelContainer.style.display = configPanelContainer.style.display === 'block' ? 'none' : 'block';
    }
  });
}

function setupUI() {
  startButton.addEventListener('click', () => {
    if (state.phase === 'start') {
      startGameFlow();
    }
  });
}

async function init() {
  buildRenderer();
  buildScene();
  await Promise.all([loadRunner(), loadCoins()]);
  await loadAudio(camera);
  resetRunnerPose();
  resize();
  setupInput();
  setupUI();
  createConfigPanel(() => {});
  window.addEventListener('resize', resize);
  tick();
}

resetConfig();
init();
