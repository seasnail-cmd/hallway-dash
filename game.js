// ── Canvas Setup ──────────────────────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');

const W = canvas.width;   // 960
const H = canvas.height;  // 540

// ── Layout Constants ──────────────────────────────────────────────────────────
const HUD_H    = 78;
const PLAY_TOP = HUD_H;
const PLAY_H   = H - HUD_H;          // 462
const LANE_H   = PLAY_H / 3;         // 154
const LANE_CY  = [0, 1, 2].map(i => PLAY_TOP + LANE_H * i + LANE_H / 2);
// LANE_CY ≈ [155, 309, 463]

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
  farWall:     '#1A212E',
  floorA:      '#2F394C',
  floorB:      '#39455C',
  grout:       '#36415A',
  lockerBody:  '#2A3548',
  lockerMint:  '#34D399',
  lockerAmber: '#FACC15',
  lockerBlue:  '#60A5FA',
  baseboard:   '#141A24',
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

// ── Scene Constants ───────────────────────────────────────────────────────────
const FLOOR_Y  = PLAY_TOP;  // floor starts immediately below the HUD (78)
const BASE_Y   = H - 16;    // 524
const TILE_W   = 80;
const TILE_H   = 40;
const WIN_TIME = 60;

let runTimer = 0;

function drawSpriteShadow(cx, bottomY, rx, ry) {
  ctx.save();
  ctx.globalAlpha *= 0.35;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.ellipse(cx, bottomY + 6, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── Draw: HUD Background ─────────────────────────────────────────────────────
function drawHUD() {
  ctx.fillStyle = C.hudBg;
  ctx.fillRect(0, 0, W, HUD_H);
  ctx.fillStyle = C.grout;
  ctx.fillRect(0, HUD_H - 1, W, 1);
}

// ── Draw: Hallway Background ──────────────────────────────────────────────────
function drawBackground() {
  // Static floor tiles — no scroll offset, motion conveyed by obstacles
  const numCols = Math.ceil(W / TILE_W) + 1;
  const numRows = Math.ceil((BASE_Y - FLOOR_Y) / TILE_H) + 1;
  for (let row = 0; row < numRows; row++) {
    const ty    = FLOOR_Y + row * TILE_H;
    if (ty >= BASE_Y) break;
    const tileH = Math.min(TILE_H, BASE_Y - ty);
    for (let col = 0; col < numCols; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? C.floorA : C.floorB;
      ctx.fillRect(col * TILE_W, ty, TILE_W, tileH);
    }
  }

  // Tile grout lines
  ctx.strokeStyle = C.grout;
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  for (let col = 0; col <= numCols; col++) {
    const gx = col * TILE_W;
    ctx.beginPath();
    ctx.moveTo(gx, FLOOR_Y);
    ctx.lineTo(gx, BASE_Y);
    ctx.stroke();
  }
  for (let row = 0; row <= numRows; row++) {
    const gy = FLOOR_Y + row * TILE_H;
    if (gy > BASE_Y) break;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(W, gy);
    ctx.stroke();
  }

  // Lane dividers
  ctx.strokeStyle = '#3F4F6F';
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    const lineY = PLAY_TOP + i * LANE_H;
    ctx.beginPath();
    ctx.moveTo(0, lineY);
    ctx.lineTo(W, lineY);
    ctx.stroke();
  }

  // Baseboard
  ctx.fillStyle = C.baseboard;
  ctx.fillRect(0, BASE_Y, W, H - BASE_Y);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(0, BASE_Y, W, 1);
}

// ── Draw: Player ──────────────────────────────────────────────────────────────
function drawPlayer(p) {
  const cx   = p.x;
  const base = p.y;

  const phase = (gameState === 'PLAYING') ? runTimer * Math.PI / 0.09 : 0;
  const swing = Math.sin(phase) * 9;
  const bob   = Math.abs(Math.sin(phase)) * 2;
  const cy    = base + bob;

  if (iFrameTimer > 0) {
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(performance.now() * Math.PI / 100);
  }

  // Ground shadow (slightly larger for detailed sprite)
  drawSpriteShadow(cx, cy + p.h / 2 - 2, 22, 6);

  // ── Backpack (behind body, right side) ───────────────────────────────────
  ctx.fillStyle = C.playerPack;
  roundRect(cx + 10, cy - 20, 13, 32, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(cx + 10, cy - 20, 13, 6, 4);
  ctx.fill();
  ctx.strokeStyle = '#1E40AF';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(cx + 11, cy - 16);
  ctx.lineTo(cx + 4, cy);
  ctx.stroke();

  // ── Back arm (left arm, behind torso — darker) ────────────────────────────
  ctx.strokeStyle = '#1741A0';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy - 16);
  // cross-pattern: back arm goes backward when left/front leg goes forward
  ctx.lineTo(cx - 12 - swing * 0.55, cy + 6);
  ctx.stroke();

  // ── Hoodie torso ──────────────────────────────────────────────────────────
  ctx.fillStyle = C.playerBody;
  roundRect(cx - 16, cy - 22, 32, 40, 7);
  ctx.fill();
  // Shading gradient: bright chest → dark bottom
  const bodyGrad = ctx.createLinearGradient(cx, cy - 22, cx, cy + 18);
  bodyGrad.addColorStop(0,    'rgba(255,255,255,0.16)');
  bodyGrad.addColorStop(0.35, 'rgba(255,255,255,0.03)');
  bodyGrad.addColorStop(1,    'rgba(0,0,0,0.22)');
  ctx.fillStyle = bodyGrad;
  roundRect(cx - 16, cy - 22, 32, 40, 7);
  ctx.fill();
  // Crew-neck collar
  ctx.strokeStyle = '#1E40AF';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy - 22);
  ctx.quadraticCurveTo(cx, cy - 17, cx + 5, cy - 22);
  ctx.stroke();
  // Centre seam
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 17);
  ctx.lineTo(cx, cy + 14);
  ctx.stroke();

  // ── Front arm (right arm, in front of torso — lighter) ───────────────────
  ctx.strokeStyle = '#3B82F6';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(cx + 12, cy - 16);
  // cross-pattern: front arm goes forward when left/front leg goes forward
  ctx.lineTo(cx + 12 + swing * 0.55, cy + 6);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // ── Neck ──────────────────────────────────────────────────────────────────
  ctx.fillStyle = '#CC8860';
  ctx.fillRect(cx - 4, cy - 28, 8, 8);

  // ── Head (oval, slightly right-facing) ───────────────────────────────────
  ctx.fillStyle = C.playerHead;
  ctx.beginPath();
  ctx.ellipse(cx + 1, cy - 34, 13, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ear (near side, right profile)
  ctx.fillStyle = '#E8A87C';
  ctx.beginPath();
  ctx.ellipse(cx + 12, cy - 33, 3.5, 5, 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Nose bump (subtle, right profile)
  ctx.fillStyle = '#CC8860';
  ctx.beginPath();
  ctx.ellipse(cx + 13, cy - 34, 2.5, 2, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Mouth line
  ctx.strokeStyle = '#A8663A';
  ctx.lineWidth = 1.3;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(cx + 7, cy - 27);
  ctx.bezierCurveTo(cx + 10, cy - 25.5, cx + 13, cy - 25.5, cx + 14, cy - 27);
  ctx.stroke();

  // ── Hair (short side-parted crop with volume) ─────────────────────────────
  ctx.fillStyle = C.playerHair;
  ctx.beginPath();
  ctx.moveTo(cx - 11, cy - 40);
  ctx.lineTo(cx - 12, cy - 47);
  ctx.bezierCurveTo(cx - 6, cy - 52, cx + 4, cy - 51, cx + 9, cy - 48);
  ctx.bezierCurveTo(cx + 14, cy - 46, cx + 14, cy - 40, cx + 13, cy - 37);
  ctx.bezierCurveTo(cx + 7,  cy - 35, cx - 2, cy - 36, cx - 11, cy - 40);
  ctx.closePath();
  ctx.fill();
  // Sheen highlight on crown
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath();
  ctx.ellipse(cx - 1, cy - 47, 5, 2.5, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // ── Legs ──────────────────────────────────────────────────────────────────
  // Back leg (right leg) — darker, behind
  const backLegX  = cx + 2 - swing;
  const backShinX = swing * 0.22;
  ctx.fillStyle = '#162E6E';
  ctx.fillRect(backLegX - 5, cy + 18, 11, 10);            // thigh
  ctx.beginPath();                                          // shin with knee-bend angle
  ctx.moveTo(backLegX - 4,           cy + 28);
  ctx.lineTo(backLegX + 7,           cy + 28);
  ctx.lineTo(backLegX + 6 + backShinX, cy + 38);
  ctx.lineTo(backLegX - 5 + backShinX, cy + 38);
  ctx.closePath();
  ctx.fill();

  // Front leg (left leg) — lighter, nearer
  const frontLegX  = cx - 14 + swing;
  const frontShinX = swing * 0.22;
  ctx.fillStyle = '#243F99';
  ctx.fillRect(frontLegX - 1, cy + 18, 11, 10);           // thigh
  ctx.beginPath();
  ctx.moveTo(frontLegX - 2,             cy + 28);
  ctx.lineTo(frontLegX + 9,             cy + 28);
  ctx.lineTo(frontLegX + 8 - frontShinX, cy + 38);
  ctx.lineTo(frontLegX - 3 - frontShinX, cy + 38);
  ctx.closePath();
  ctx.fill();

  // ── Shoes (chunky sneakers) ───────────────────────────────────────────────
  // Back shoe
  const bsx = backLegX + backShinX;
  ctx.fillStyle = '#2A2A2A';
  ctx.fillRect(bsx - 5, cy + 33, 14, 4);            // upper
  ctx.fillStyle = '#111111';
  ctx.fillRect(bsx - 6, cy + 36, 16, 5);            // sole
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.fillRect(bsx - 6, cy + 40, 16, 1);            // sole stripe
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.ellipse(bsx + 9, cy + 38, 4, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Front shoe
  const fsx = frontLegX - frontShinX;
  ctx.fillStyle = '#2A2A2A';
  ctx.fillRect(fsx - 4, cy + 33, 14, 4);            // upper
  ctx.fillStyle = '#111111';
  ctx.fillRect(fsx - 5, cy + 36, 16, 5);            // sole
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.fillRect(fsx - 5, cy + 40, 16, 1);            // sole stripe
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.ellipse(fsx + 10, cy + 38, 4, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
}

// ── Game State ────────────────────────────────────────────────────────────────
let gameState     = 'TITLE';
let score         = 0;
let bestScore     = parseFloat(localStorage.getItem('hallwayDashBest')) || 0;
let lastMilestone = 0;

// ── Audio ─────────────────────────────────────────────────────────────────────
let audioCtx = null;
let muted    = false;

function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(type) {
  if (muted || !audioCtx) return;
  const t = audioCtx.currentTime;

  function note(waveType, freq, gainVal, dur, freqEnd) {
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = waveType;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd !== undefined) osc.frequency.linearRampToValueAtTime(freqEnd, t + dur);
    gain.gain.setValueAtTime(gainVal, t);
    gain.gain.linearRampToValueAtTime(0, t + dur);
    osc.start(t);
    osc.stop(t + dur);
  }

  function noteAt(waveType, freq, gainVal, start, dur) {
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = waveType;
    osc.frequency.setValueAtTime(freq, t + start);
    gain.gain.setValueAtTime(gainVal, t + start);
    gain.gain.linearRampToValueAtTime(0, t + start + dur);
    osc.start(t + start);
    osc.stop(t + start + dur);
  }

  if (type === 'hit') {
    note('square', 220, 0.4, 0.15, 80);
  } else if (type === 'gameover') {
    noteAt('sine', 300, 0.35, 0,    0.2);
    noteAt('sine', 180, 0.35, 0.22, 0.35);
  } else if (type === 'lane') {
    note('square', 600, 0.2, 0.05);
  } else if (type === 'nearmiss') {
    note('sawtooth', 800, 0.15, 0.12, 300);
  } else if (type === 'start') {
    note('sine', 200, 0.3, 0.2, 500);
  } else if (type === 'milestone') {
    noteAt('sine', 660, 0.25, 0,    0.1);
    noteAt('sine', 880, 0.25, 0.11, 0.1);
  } else if (type === 'newbest') {
    noteAt('sine', 523, 0.3, 0,    0.12);
    noteAt('sine', 659, 0.3, 0.14, 0.12);
    noteAt('sine', 784, 0.3, 0.28, 0.12);
  } else if (type === 'click') {
    note('square', 400, 0.2, 0.04);
  } else if (type === 'win') {
    noteAt('sine', 523,  0.3, 0,    0.12);
    noteAt('sine', 659,  0.3, 0.14, 0.12);
    noteAt('sine', 784,  0.3, 0.28, 0.12);
    noteAt('sine', 1046, 0.3, 0.42, 0.16);
  }
}

function toggleMute() {
  muted = !muted;
  const btn = document.getElementById('mute-btn');
  if (btn) btn.textContent = muted ? '🔇' : '🔊';
}

document.addEventListener('click', initAudio, { once: true });
const _muteBtn = document.getElementById('mute-btn');
if (_muteBtn) _muteBtn.addEventListener('click', toggleMute);

// ── Input ────────────────────────────────────────────────────────────────────
let inputLocked = false;

function movePlayer(dir) {
  if (inputLocked) return;
  const next = player.laneIndex + dir;
  if (next < 0 || next > 2) return;
  player.laneIndex = next;
  player.targetY = LANE_CY[next];
  inputLocked = true;
  playSound('lane');
}

window.addEventListener('keydown', (e) => {
  initAudio();
  if (e.key === 'm' || e.key === 'M') { toggleMute(); return; }
  if (gameState === 'PLAYING') {
    if (e.key === 'ArrowUp'   || e.key === 'w' || e.key === 'W') movePlayer(-1);
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') movePlayer(1);
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') gameState = 'PAUSED';
  } else if (gameState === 'PAUSED') {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') gameState = 'PLAYING';
  } else if (gameState === 'TITLE') {
    if (e.key === ' ' || e.key === 'Enter') startGame();
  } else if (gameState === 'GAMEOVER' || gameState === 'WIN') {
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
let spawnTimer    = 0;
let spawnCooldown = 0;

function drawTextbook(x, cy) {
  const w = 70, h = 26;
  const ox = x, oy = cy - h / 2;

  drawSpriteShadow(ox + w / 2, oy + h / 2, 30, 7);

  // Deep red hardcover (rounded)
  ctx.fillStyle = '#B91C1C';
  roundRect(ox, oy, w, h, 3);
  ctx.fill();

  // Darker spine strip on left
  ctx.fillStyle = '#7F1D1D';
  roundRect(ox, oy, 9, h, 3);
  ctx.fill();
  ctx.fillRect(ox + 4, oy, 5, h); // square off the right side of the spine

  // Cream title label
  ctx.fillStyle = '#FEF9EE';
  ctx.fillRect(ox + 13, oy + 5, 38, h - 10);

  // Cream page-edge stripe on right
  ctx.fillStyle = '#EDE8D0';
  ctx.fillRect(ox + w - 6, oy + 2, 4, h - 4);

  // Top highlight
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  roundRect(ox, oy, w, 6, 3);
  ctx.fill();
}

function drawBackpack(x, cy) {
  const w = 50, h = 56;
  const ox = x, oy = cy - h / 2;

  drawSpriteShadow(ox + w / 2, oy + h / 2, 22, 7);

  // Body — blue with darker-bottom gradient
  ctx.fillStyle = '#2563EB';
  roundRect(ox, oy + 8, w, h - 8, 8);
  ctx.fill();
  const bodyGrad = ctx.createLinearGradient(0, oy + h / 2, 0, oy + h);
  bodyGrad.addColorStop(0, 'rgba(0,0,0,0)');
  bodyGrad.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = bodyGrad;
  roundRect(ox, oy + 8, w, h - 8, 8);
  ctx.fill();

  // Top handle loop
  ctx.strokeStyle = '#1D4ED8';
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(ox + w / 2, oy + 8, 7, Math.PI, 0);
  ctx.stroke();

  // Shoulder straps
  ctx.strokeStyle = '#1E40AF';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(ox + 13, oy + 8);
  ctx.lineTo(ox + 8, oy + h - 12);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ox + w - 13, oy + 8);
  ctx.lineTo(ox + w - 8, oy + h - 12);
  ctx.stroke();

  // Front pocket
  ctx.fillStyle = '#1D4ED8';
  roundRect(ox + 8, oy + h - 26, w - 16, 18, 5);
  ctx.fill();

  // Zipper line on pocket
  ctx.strokeStyle = '#93C5FD';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ox + 10, oy + h - 17);
  ctx.lineTo(ox + w - 10, oy + h - 17);
  ctx.stroke();

  // Top highlight
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRect(ox, oy + 8, w, 9, 8);
  ctx.fill();
}

function drawJanitorCart(x, cy) {
  const w = 90, h = 70;
  const ox = x, oy = cy - h / 2;

  drawSpriteShadow(ox + w / 2, oy + h / 2 + 10, 38, 8);

  // Mop handle (drawn behind bucket)
  ctx.strokeStyle = '#92400E';
  ctx.lineWidth = 4;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(ox + w * 0.65, oy + 5);
  ctx.lineTo(ox + w * 0.65, oy - 30);
  ctx.stroke();

  // Yellow bucket — trapezoid (slightly wider at bottom)
  ctx.fillStyle = '#FACC15';
  ctx.beginPath();
  ctx.moveTo(ox + 8,      oy);
  ctx.lineTo(ox + w - 8,  oy);
  ctx.lineTo(ox + w - 2,  oy + h - 16);
  ctx.lineTo(ox + 2,      oy + h - 16);
  ctx.closePath();
  ctx.fill();

  // Bucket top-edge highlight
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.moveTo(ox + 8,      oy);
  ctx.lineTo(ox + w - 8,  oy);
  ctx.lineTo(ox + w - 10, oy + 10);
  ctx.lineTo(ox + 10,     oy + 10);
  ctx.closePath();
  ctx.fill();

  // Gray wringer block on top of bucket
  ctx.fillStyle = '#6B7280';
  roundRect(ox + 16, oy - 7, w - 32, 10, 3);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRect(ox + 16, oy - 7, w - 32, 4, 3);
  ctx.fill();

  // Wheels — dark body with lighter hub
  for (const wx of [ox + 12, ox + w - 12]) {
    const wy = oy + h - 8;
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.arc(wx, wy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9CA3AF';
    ctx.beginPath();
    ctx.arc(wx, wy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDodgeball(x, cy) {
  const r  = 15;
  const cx = x + r;

  drawSpriteShadow(cx, cy + r, r, 5);

  // 3D radial gradient: lighter top-left → darker red-orange at edges
  const grad = ctx.createRadialGradient(cx - 5, cy - 5, 2, cx, cy, r);
  grad.addColorStop(0, '#FB923C');
  grad.addColorStop(1, '#EA580C');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Curved seam lines clipped to ball
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = '#C2410C';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.bezierCurveTo(cx - r * 0.3, cy - r * 0.7, cx + r * 0.3, cy - r * 0.7, cx + r, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.bezierCurveTo(cx - r * 0.3, cy + r * 0.7, cx + r * 0.3, cy + r * 0.7, cx + r, cy);
  ctx.stroke();
  ctx.restore();

  // White highlight
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(cx - 5, cy - 5, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawObstacle(obs) {
  const cy = LANE_CY[obs.laneIndex];
  if (obs.type === 'textbook')    drawTextbook(obs.x, cy);
  if (obs.type === 'backpack')    drawBackpack(obs.x, cy);
  if (obs.type === 'janitorCart') drawJanitorCart(obs.x, cy);
  if (obs.type === 'dodgeball')   drawDodgeball(obs.x, obs.currentY !== undefined ? obs.currentY : cy);
}

function spawnObstacle() {
  const occupiedLanes = new Set(
    obstacles.filter(o => o.x > W - 300).map(o => o.laneIndex)
  );
  if (occupiedLanes.size >= 3) return false;

  const roll = Math.random();
  let type, speedMult;
  if (score < 10) {
    if (roll < 0.40)      { type = 'backpack';    speedMult = 1.0;  }
    else if (roll < 0.75) { type = 'textbook';    speedMult = 1.3;  }
    else                  { type = 'janitorCart'; speedMult = 0.75; }
  } else {
    if (roll < 0.30)      { type = 'backpack';    speedMult = 1.0;  }
    else if (roll < 0.60) { type = 'textbook';    speedMult = 1.3;  }
    else if (roll < 0.78) { type = 'janitorCart'; speedMult = 0.75; }
    else                  { type = 'dodgeball';   speedMult = 1.4;  }
  }

  const sizes = { textbook: [70, 26], backpack: [50, 56], janitorCart: [90, 70], dodgeball: [30, 30] };
  const [w, h] = sizes[type];

  const freeLanes = [0, 1, 2].filter(l => !occupiedLanes.has(l));
  const laneIndex = freeLanes[Math.floor(Math.random() * freeLanes.length)];

  const obs = { type, laneIndex, x: W + 10, w, h, speed: baseSpeed * speedMult };
  if (type === 'dodgeball') obs.currentY = LANE_CY[laneIndex];
  obstacles.push(obs);
  return true;
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
  shakeX = Math.random() * 20 - 10;
  shakeY = Math.random() * 20 - 10;
  playSound('hit');
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
    const obsY = obs.currentY !== undefined ? obs.currentY : LANE_CY[obs.laneIndex];
    const oy   = obsY - obs.h / 2;
    if (px1 < obs.x + obs.w &&
        px2 > obs.x          &&
        py1 < oy + obs.h     &&
        py2 > oy) {
      onHit();
      return;
    }
  }
}

// ── Fluorescent Light Pools ───────────────────────────────────────────────────
const TICK_SPEED = 320;
let tickOffset   = 0;

function drawFloorTicks() {
  const POOL_GAP = 220;
  const poolOff  = tickOffset % POOL_GAP;
  for (let x = -poolOff; x < W + POOL_GAP; x += POOL_GAP) {
    for (let lane = 0; lane < 3; lane++) {
      const lcy  = LANE_CY[lane];
      const grad = ctx.createRadialGradient(x, lcy - 20, 0, x, lcy - 20, 95);
      grad.addColorStop(0, 'rgba(255, 246, 224, 0.06)');
      grad.addColorStop(1, 'rgba(255, 248, 220, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(x, lcy, 85, 55, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  score += dt;

  if (score >= WIN_TIME) {
    score = WIN_TIME;
    triggerWin();
    return;
  }

  spawnInterval = Math.max(0.40, 1.05 - 0.011 * score);
  baseSpeed     = Math.min(820, 460 + 6.5 * score);

  const scoreEl = document.getElementById('score-display');
  const bestEl  = document.getElementById('best-display');
  if (scoreEl) scoreEl.textContent = Math.floor(score) + 's / 60s';
  if (bestEl)  bestEl.textContent  = 'Best: ' + Math.floor(bestScore) + 's';

  player.y += (player.targetY - player.y) * (1 - Math.pow(0.01, dt * 10));
  tickOffset += TICK_SPEED * dt;
  runTimer   += dt;

  for (const obs of obstacles) obs.x -= obs.speed * dt;

  // Update dodgeball bob (must happen after x moves so collision stays in sync)
  for (const obs of obstacles) {
    if (obs.type === 'dodgeball') {
      obs.currentY = LANE_CY[obs.laneIndex] + Math.sin(obs.x * 0.05) * 18;
    }
  }

  // Near-miss detection
  for (const obs of obstacles) {
    if (!obs.nearmissFired &&
        obs.laneIndex !== player.laneIndex &&
        obs.x + obs.w < player.x + 40 &&
        obs.x + obs.w > player.x - 40) {
      obs.nearmissFired = true;
      playSound('nearmiss');
    }
  }

  obstacles = obstacles.filter(obs => obs.x + obs.w >= 0);

  // Milestone check
  const milestone = Math.floor(score / 10);
  if (milestone > lastMilestone) {
    lastMilestone = milestone;
    playSound('milestone');
  }

  spawnTimer    += dt;
  spawnCooldown  = Math.max(0, spawnCooldown - dt);
  if (spawnTimer >= spawnInterval && spawnCooldown <= 0) {
    if (spawnObstacle()) spawnCooldown = 0.3;
    spawnTimer = 0;
  }

  iFrameTimer   = Math.max(0, iFrameTimer   - dt);
  hitFlashTimer = Math.max(0, hitFlashTimer - dt);
  shakeTimer    = Math.max(0, shakeTimer    - dt);
  if (shakeTimer > 0) {
    shakeX = Math.random() * 20 - 10;
    shakeY = Math.random() * 20 - 10;
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
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#F4F6FB';
    ctx.font = '700 42px Inter, system-ui';
    ctx.fillText('PAUSED', W / 2, H / 2 - 26);
    ctx.fillStyle = '#64748B';
    ctx.font = '18px Inter, system-ui';
    ctx.fillText('Press P or Esc to resume', W / 2, H / 2 + 18);
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
    <p style="color:#94A3B8;margin:0 0 4px">Survive 60 seconds to reach class.</p>
    <p style="color:#64748B;font-size:0.9rem;margin:0 0 20px">&#8593; &#8595; &nbsp; or &nbsp; W S &nbsp; to change lanes</p>
    <p style="color:#94A3B8;margin:0 0 28px">Best: <span style="color:#34D399;font-weight:600">${Math.floor(bestScore)}s</span></p>
    <button id="start-btn" style="padding:12px 44px;font-size:1.1rem;font-weight:700;background:#34D399;color:#0F1624;border:none;border-radius:8px;cursor:pointer;letter-spacing:0.05em">START</button>
  `;
  el.classList.remove('hidden');
  document.getElementById('start-btn').addEventListener('click', () => { playSound('click'); startGame(); });
}

function startGame() {
  score         = 0;
  lives         = 3;
  obstacles     = [];
  spawnTimer    = 0;
  spawnCooldown = 0;
  iFrameTimer   = 0;
  hitFlashTimer = 0;
  shakeTimer    = 0;
  shakeX        = 0;
  shakeY        = 0;
  baseSpeed     = 460;
  spawnInterval = 1.05;
  inputLocked   = false;
  lastMilestone = 0;
  player.laneIndex = 1;
  player.y         = LANE_CY[1];
  player.targetY   = LANE_CY[1];
  updateLivesHUD();
  const scoreEl = document.getElementById('score-display');
  if (scoreEl) scoreEl.textContent = '0s / 60s';
  const ts = document.getElementById('title-screen');
  if (ts) ts.classList.add('hidden');
  gameState = 'PLAYING';
  playSound('start');
}

function triggerWin() {
  gameState = 'WIN';
  playSound('win');
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('hallwayDashBest', String(bestScore));
  }
  const scoreEl = document.getElementById('score-display');
  if (scoreEl) scoreEl.textContent = '60s / 60s';
  const el = document.getElementById('gameover-screen');
  if (!el) return;
  el.innerHTML = `
    <h1 style="color:#34D399;font-size:2.5rem;margin:0 0 8px">You made it to class!</h1>
    <p style="font-size:1.1rem;color:#F4F6FB;margin:0 0 28px">Survived the full 60 seconds</p>
    <button id="restart-btn" style="padding:12px 44px;font-size:1.1rem;font-weight:700;background:#34D399;color:#0F1624;border:none;border-radius:8px;cursor:pointer;letter-spacing:0.05em">PLAY AGAIN</button>
  `;
  el.classList.remove('hidden');
  document.getElementById('restart-btn').addEventListener('click', () => { playSound('click'); goToTitle(); });
}

function triggerGameOver() {
  gameState = 'GAMEOVER';
  playSound('gameover');
  let isNewBest = false;
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('hallwayDashBest', String(bestScore));
    isNewBest = true;
    playSound('newbest');
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
  document.getElementById('restart-btn').addEventListener('click', () => { playSound('click'); goToTitle(); });
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