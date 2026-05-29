// ── Canvas Setup ──────────────────────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');

const W = canvas.width;   // 960
const H = canvas.height;  // 540

// ── Layout Constants ──────────────────────────────────────────────────────────
const HUD_H    = 60;
const PLAY_TOP = HUD_H;
const PLAY_H   = H - HUD_H;          // 480
const LANE_H   = PLAY_H / 3;         // 160
const LANE_CY  = [0, 1, 2].map(i => PLAY_TOP + LANE_H * i + LANE_H / 2);
// LANE_CY = [140, 300, 460]

// ── Player ───────────────────────────────────────────────────────────────────
const player = {
  x:         120,
  laneIndex: 1,
  y:         LANE_CY[1],  // starts in middle lane
  w:         44,
  h:         80,
};

// ── Colors ───────────────────────────────────────────────────────────────────
const C = {
  hudBg:       '#0F1624',
  playBg:      '#1A2235',
  ceiling:     '#2A3550',
  floor:       '#111927',
  divider:     '#2E3A52',
  lockerA:     '#1F2C41',
  lockerB:     '#1B2638',
  lockerC:     '#222F44',
  accentGreen: '#34D399',
  accentBlue:  '#2563EB',
  accentGray:  '#64748B',
  playerBody:  '#2563EB',
  playerHead:  '#F5CBA7',
  playerHair:  '#3D2B1F',
  playerPack:  '#1D4ED8',
  playerLegs:  '#1E3A8A',
  playerShoes: '#0F0F0F',
};

// ── Utility ───────────────────────────────────────────────────────────────────
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

// ── Draw: HUD Background ─────────────────────────────────────────────────────
function drawHUD() {
  ctx.fillStyle = C.hudBg;
  ctx.fillRect(0, 0, W, HUD_H);
  ctx.fillStyle = C.divider;
  ctx.fillRect(0, HUD_H - 1, W, 1);
}

// ── Draw: Lockers (left edge decoration) ─────────────────────────────────────
function drawLockers() {
  const lw  = 18;
  const lh  = 52;
  const gap = 5;
  const bgColors  = [C.lockerA, C.lockerB, C.lockerC];
  const trimColors = [C.accentGreen, C.accentGray, C.accentBlue];

  for (let i = 0; ; i++) {
    const ly = PLAY_TOP + 6 + i * (lh + gap);
    if (ly >= H) break;
    const drawH = Math.min(lh, H - ly);
    if (drawH < 5) break;

    // Body
    ctx.fillStyle = bgColors[i % 3];
    ctx.fillRect(0, ly, lw, drawH);

    // Color trim strip
    ctx.fillStyle = trimColors[i % 3];
    ctx.fillRect(0, ly, 3, drawH);

    // Vent lines
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let v = 8; v < drawH - 4; v += 9) {
      ctx.fillRect(5, ly + v, lw - 7, 2);
    }
  }
}

// ── Draw: Hallway Background ──────────────────────────────────────────────────
function drawBackground() {
  // Base
  ctx.fillStyle = C.playBg;
  ctx.fillRect(0, PLAY_TOP, W, PLAY_H);

  // Subtle alternating lane tints
  for (let i = 0; i < 3; i++) {
    const ly = PLAY_TOP + i * LANE_H;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.03)';
    ctx.fillRect(0, ly, W, LANE_H);
  }

  // Ceiling strip
  ctx.fillStyle = C.ceiling;
  ctx.fillRect(0, PLAY_TOP, W, 8);

  // Floor strip
  ctx.fillStyle = C.floor;
  ctx.fillRect(0, H - 10, W, 10);

  // Lockers
  drawLockers();

  // Lane dividers (dashed)
  ctx.strokeStyle = C.divider;
  ctx.lineWidth = 2;
  ctx.setLineDash([20, 14]);
  for (let i = 1; i < 3; i++) {
    const lineY = PLAY_TOP + i * LANE_H;
    ctx.beginPath();
    ctx.moveTo(24, lineY);
    ctx.lineTo(W - 4, lineY);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

// ── Draw: Player ──────────────────────────────────────────────────────────────
function drawPlayer(p) {
  const cx = p.x;
  const cy = p.y;
  if (iFrameTimer > 0) {
    ctx.globalAlpha = 0.675 + 0.325 * Math.sin(performance.now() * Math.PI / 100);
  }

  // Backpack (behind body)
  ctx.fillStyle = C.playerPack;
  roundRect(cx + 8, cy - 18, 14, 32, 4);
  ctx.fill();

  // Backpack strap
  ctx.strokeStyle = '#1E40AF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + 9, cy - 14);
  ctx.lineTo(cx + 3, cy - 2);
  ctx.stroke();

  // Body
  ctx.fillStyle = C.playerBody;
  roundRect(cx - 18, cy - 18, 36, 36, 6);
  ctx.fill();

  // Head
  ctx.fillStyle = C.playerHead;
  ctx.beginPath();
  ctx.arc(cx, cy - 30, 14, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = C.playerHair;
  ctx.beginPath();
  ctx.arc(cx, cy - 34, 14, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 14, cy - 48, 28, 14);

  // Legs
  ctx.fillStyle = C.playerLegs;
  ctx.fillRect(cx - 14, cy + 18, 12, 18);
  ctx.fillRect(cx + 2,  cy + 18, 12, 18);

  // Shoes
  ctx.fillStyle = C.playerShoes;
  ctx.fillRect(cx - 15, cy + 32, 14, 6);
  ctx.fillRect(cx + 1,  cy + 32, 14, 6);
  ctx.globalAlpha = 1;
}

// ── Game State ────────────────────────────────────────────────────────────────
let gameState = 'TITLE';
let score     = 0;
let bestScore = parseFloat(localStorage.getItem('hallwayDashBest')) || 0;

// ── Input ────────────────────────────────────────────────────────────────────
let inputLocked = false;

function movePlayer(dir) {
  if (inputLocked) return;
  const next = player.laneIndex + dir;
  if (next < 0 || next > 2) return;
  player.laneIndex = next;
  player.targetY = LANE_CY[next];
  inputLocked = true;
}

window.addEventListener('keydown', (e) => {
  if (gameState === 'PLAYING') {
    if (e.key === 'ArrowUp'   || e.key === 'w' || e.key === 'W') movePlayer(-1);
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') movePlayer(1);
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') gameState = 'PAUSED';
  } else if (gameState === 'PAUSED') {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') gameState = 'PLAYING';
  } else if (gameState === 'TITLE') {
    if (e.key === ' ' || e.key === 'Enter') startGame();
  } else if (gameState === 'GAMEOVER') {
    if (e.key === ' ' || e.key === 'Enter') goToTitle();
  }
});

window.addEventListener('keyup', (e) => {
  const vertical = ['ArrowUp','ArrowDown','w','W','s','S'];
  if (vertical.includes(e.key)) inputLocked = false;
});

// ── Player: add targetY ───────────────────────────────────────────────────────
player.targetY = LANE_CY[player.laneIndex];

// ── Obstacle System ───────────────────────────────────────────────────────────
let baseSpeed     = 320;
let spawnInterval = 1.4;
let obstacles  = [];
let spawnTimer = 0;

function drawTextbook(x, cy) {
  const w = 70, h = 26;
  const ox = x, oy = cy - h / 2;

  ctx.fillStyle = '#F5F0E8';
  ctx.fillRect(ox, oy, w, h);

  // Spine strip
  ctx.fillStyle = '#2C1A0E';
  ctx.fillRect(ox, oy, 6, h);

  // Page-edge lines
  ctx.strokeStyle = '#C8BFA8';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  for (let i = 1; i <= 3; i++) {
    const ly = oy + (h / 4) * i;
    ctx.beginPath();
    ctx.moveTo(ox + 8, ly);
    ctx.lineTo(ox + w - 2, ly);
    ctx.stroke();
  }
}

function drawBackpack(x, cy) {
  const w = 50, h = 56;
  const ox = x, oy = cy - h / 2;

  // Body
  ctx.fillStyle = '#7C3AED';
  roundRect(ox, oy + 8, w, h - 8, 6);
  ctx.fill();

  // Strap lines
  ctx.strokeStyle = '#5B21B6';
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(ox + 14, oy + 8);
  ctx.lineTo(ox + 14, oy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ox + w - 14, oy + 8);
  ctx.lineTo(ox + w - 14, oy);
  ctx.stroke();

  // Front pocket
  ctx.fillStyle = '#6D28D9';
  roundRect(ox + 8, oy + h - 28, w - 16, 18, 4);
  ctx.fill();
  ctx.strokeStyle = '#5B21B6';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawJanitorCart(x, cy) {
  const w = 90, h = 70;
  const ox = x, oy = cy - h / 2;

  // Body
  ctx.fillStyle = '#8D9EAE';
  ctx.fillRect(ox, oy, w, h);

  // Mop handle
  ctx.strokeStyle = '#6B7A87';
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(ox + w / 2, oy);
  ctx.lineTo(ox + w / 2, oy - 30);
  ctx.stroke();

  // Wheels
  ctx.fillStyle = '#4A5568';
  ctx.beginPath();
  ctx.arc(ox + 14, oy + h - 8, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ox + w - 14, oy + h - 8, 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawObstacle(obs) {
  const cy = LANE_CY[obs.laneIndex];
  if (obs.type === 'textbook')    drawTextbook(obs.x, cy);
  if (obs.type === 'backpack')    drawBackpack(obs.x, cy);
  if (obs.type === 'janitorCart') drawJanitorCart(obs.x, cy);
}

function spawnObstacle() {
  const occupiedLanes = new Set(
    obstacles.filter(o => o.x > W - 300).map(o => o.laneIndex)
  );
  if (occupiedLanes.size >= 3) {
    spawnTimer = spawnInterval - 0.3;
    return;
  }

  const roll = Math.random();
  let type, speedMult;
  if (roll < 0.40)      { type = 'backpack';    speedMult = 1.0;  }
  else if (roll < 0.75) { type = 'textbook';    speedMult = 1.3;  }
  else                  { type = 'janitorCart'; speedMult = 0.75; }

  const sizes = { textbook: [70, 26], backpack: [50, 56], janitorCart: [90, 70] };
  const [w, h] = sizes[type];

  const freeLanes = [0, 1, 2].filter(l => !occupiedLanes.has(l));
  const laneIndex = freeLanes[Math.floor(Math.random() * freeLanes.length)];

  obstacles.push({ type, laneIndex, x: W + 10, w, h, speed: baseSpeed * speedMult });
}

// ── Collision & Hit Feedback ──────────────────────────────────────────────────
let lives         = 3;
let iFrameTimer   = 0;
let hitFlashTimer = 0;
let shakeTimer    = 0;
let shakeX        = 0;
let shakeY        = 0;

function updateLivesHUD() {
  const el = document.getElementById('lives-display');
  if (el) el.textContent = '❤️'.repeat(lives);
}

function onHit() {
  lives        -= 1;
  iFrameTimer   = 1.2;
  hitFlashTimer = 0.3;
  shakeTimer    = 0.25;
  shakeX = Math.random() * 16 - 8;
  shakeY = Math.random() * 16 - 8;
  updateLivesHUD();
  if (lives <= 0) {
    triggerGameOver();
  }
}

function checkCollisions() {
  if (iFrameTimer > 0) return;
  const px1 = player.x - player.w / 2;
  const py1 = player.y - player.h / 2;
  const px2 = player.x + player.w / 2;
  const py2 = player.y + player.h / 2;

  for (const obs of obstacles) {
    const oy = LANE_CY[obs.laneIndex] - obs.h / 2;
    if (px1 < obs.x + obs.w &&
        px2 > obs.x          &&
        py1 < oy + obs.h     &&
        py2 > oy) {
      onHit();
      return;
    }
  }
}

// ── Parallax Floor Ticks ──────────────────────────────────────────────────────
const TICK_SPACING = 80;
const TICK_SPEED   = 320;
let tickOffset = 0;

function drawFloorTicks() {
  ctx.strokeStyle = 'rgba(46, 58, 82, 0.7)';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);

  const startX = (tickOffset % TICK_SPACING) - TICK_SPACING;

  for (let x = startX; x < W; x += TICK_SPACING) {
    ctx.beginPath();
    ctx.moveTo(x, PLAY_TOP + 8);
    ctx.lineTo(x, H - 10);
    ctx.stroke();
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  score += dt;
  spawnInterval = Math.max(0.55, 1.40 - 0.021 * score);
  baseSpeed     = Math.min(640, 320 + 8 * score);

  const scoreEl = document.getElementById('score-display');
  const bestEl  = document.getElementById('best-display');
  if (scoreEl) scoreEl.textContent = Math.floor(score) + 's';
  if (bestEl)  bestEl.textContent  = 'Best: ' + Math.floor(bestScore) + 's';

  player.y += (player.targetY - player.y) * (1 - Math.pow(0.01, dt * 10));
  tickOffset += TICK_SPEED * dt;

  for (const obs of obstacles) obs.x -= obs.speed * dt;
  obstacles = obstacles.filter(obs => obs.x + obs.w >= 0);

  spawnTimer += dt;
  if (spawnTimer >= spawnInterval) {
    spawnObstacle();
    spawnTimer = 0;
  }

  iFrameTimer   = Math.max(0, iFrameTimer   - dt);
  hitFlashTimer = Math.max(0, hitFlashTimer - dt);
  shakeTimer    = Math.max(0, shakeTimer    - dt);
  if (shakeTimer > 0) {
    shakeX = Math.random() * 16 - 8;
    shakeY = Math.random() * 16 - 8;
  }

  checkCollisions();
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  if (shakeTimer > 0) ctx.translate(shakeX, shakeY);
  drawBackground();
  drawFloorTicks();
  for (const obs of obstacles) drawObstacle(obs);
  drawHUD();
  drawPlayer(player);
  if (shakeTimer > 0) ctx.translate(-shakeX, -shakeY);
  if (hitFlashTimer > 0) {
    ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
    ctx.fillRect(0, 0, W, H);
  }
  if (gameState === 'PAUSED') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', W / 2, H / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
}

// ── Screen Management ─────────────────────────────────────────────────────────
function buildTitleScreen() {
  const el = document.getElementById('title-screen');
  if (!el) return;
  el.innerHTML = `
    <h1 style="color:#34D399;font-size:3rem;margin:0 0 4px">Hallway Dash</h1>
    <p style="color:#94A3B8;margin:0 0 4px">Dodge everything. Get to class.</p>
    <p style="color:#64748B;font-size:0.9rem;margin:0 0 20px">&#8593; &#8595; &nbsp; or &nbsp; W S &nbsp; to change lanes</p>
    <p style="color:#94A3B8;margin:0 0 28px">Best: <span style="color:#34D399;font-weight:600">${Math.floor(bestScore)}s</span></p>
    <button id="start-btn" style="padding:12px 44px;font-size:1.1rem;font-weight:700;background:#34D399;color:#0F1624;border:none;border-radius:8px;cursor:pointer;letter-spacing:0.05em">START</button>
  `;
  el.classList.remove('hidden');
  document.getElementById('start-btn').addEventListener('click', startGame);
}

function startGame() {
  score         = 0;
  lives         = 3;
  obstacles     = [];
  spawnTimer    = 0;
  iFrameTimer   = 0;
  hitFlashTimer = 0;
  shakeTimer    = 0;
  shakeX        = 0;
  shakeY        = 0;
  baseSpeed     = 320;
  spawnInterval = 1.4;
  inputLocked   = false;
  player.laneIndex = 1;
  player.y         = LANE_CY[1];
  player.targetY   = LANE_CY[1];
  updateLivesHUD();
  const scoreEl = document.getElementById('score-display');
  if (scoreEl) scoreEl.textContent = '0s';
  const ts = document.getElementById('title-screen');
  if (ts) ts.classList.add('hidden');
  gameState = 'PLAYING';
}

function triggerGameOver() {
  gameState = 'GAMEOVER';
  let isNewBest = false;
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('hallwayDashBest', String(bestScore));
    isNewBest = true;
  }
  const el = document.getElementById('gameover-screen');
  if (!el) return;
  el.innerHTML = `
    <h1 style="color:#EF4444;font-size:2.5rem;margin:0 0 8px">Late Again.</h1>
    <p style="font-size:1.2rem;color:#F4F6FB;margin:0 0 4px">Score: <strong>${Math.floor(score)}s</strong></p>
    <p style="font-size:1.1rem;margin:0 0 28px;color:${isNewBest ? '#34D399' : '#94A3B8'}">
      Best: <strong>${Math.floor(bestScore)}s</strong>${isNewBest ? '&nbsp;&nbsp;&#127881; New Best!' : ''}
    </p>
    <button id="restart-btn" style="padding:12px 44px;font-size:1.1rem;font-weight:700;background:#2563EB;color:#fff;border:none;border-radius:8px;cursor:pointer;letter-spacing:0.05em">PLAY AGAIN</button>
  `;
  el.classList.remove('hidden');
  document.getElementById('restart-btn').addEventListener('click', goToTitle);
}

function goToTitle() {
  const go = document.getElementById('gameover-screen');
  if (go) go.classList.add('hidden');
  buildTitleScreen();
  gameState = 'TITLE';
}

buildTitleScreen();

// ── Game Loop ─────────────────────────────────────────────────────────────────
let lastTime = null;

function loop(timestamp) {
  if (lastTime === null) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  if (gameState === 'PLAYING') update(dt);
  render();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);