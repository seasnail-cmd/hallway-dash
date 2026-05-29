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
  farWall:     '#1B2230',
  floorA:      '#2A3142',
  floorB:      '#313A4E',
  grout:       '#3A4660',
  lockerBody:  '#243044',
  lockerMint:  '#34D399',
  lockerAmber: '#F59E0B',
  lockerBlue:  '#60A5FA',
  baseboard:   '#161C28',
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
const WALL_H  = 36;
const FLOOR_Y = PLAY_TOP + WALL_H;   // 96
const BASE_Y  = H - 16;              // 524
const TILE_W  = 80;
const TILE_H  = 40;

const PROP_DEFS = [
  { type: 'lockers', w: 88  },
  { type: 'door',    w: 50  },
  { type: 'board',   w: 60  },
  { type: 'exit',    w: 50  },
  { type: 'clock',   w: 40  },
];
const PROP_UNIT = PROP_DEFS.reduce((s, p) => s + p.w, 0); // 288

let wallOffset = 0;
let runTimer   = 0;

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

// ── Draw: Wall Props ──────────────────────────────────────────────────────────
function drawWallProp(type, px, wy) {
  const mid = wy + WALL_H / 2;
  if (type === 'lockers') {
    const lw = 24, lh = WALL_H - 6, gap = 4;
    const accents = [C.lockerMint, C.lockerAmber, C.lockerBlue];
    for (let i = 0; i < 3; i++) {
      const lx = px + 4 + i * (lw + gap);
      ctx.fillStyle = C.lockerBody;
      roundRect(lx, wy + 3, lw, lh, 2);
      ctx.fill();
      ctx.fillStyle = accents[i];
      ctx.fillRect(lx, wy + 3, 3, lh);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      for (let v = 5; v < lh - 3; v += 6) {
        ctx.fillRect(lx + 5, wy + 3 + v, lw - 7, 1);
      }
    }
  } else if (type === 'door') {
    ctx.fillStyle = '#111A28';
    ctx.fillRect(px + 6, wy + 1, 30, WALL_H - 1);
    ctx.fillStyle = '#1A3448';
    ctx.fillRect(px + 12, wy + 5, 12, 10);
    ctx.fillStyle = C.lockerAmber;
    ctx.fillRect(px + 30, wy + 18, 5, 6);
  } else if (type === 'board') {
    ctx.fillStyle = '#2D1F0E';
    ctx.fillRect(px + 6, wy + 3, 40, WALL_H - 6);
    ctx.save();
    ctx.globalAlpha *= 0.85;
    const papers = [
      { dx: 4,  dy: 3,  w: 10, h: 8,  c: '#EF4444' },
      { dx: 16, dy: 2,  w: 10, h: 7,  c: '#34D399' },
      { dx: 27, dy: 6,  w: 8,  h: 10, c: '#60A5FA' },
      { dx: 8,  dy: 14, w: 12, h: 7,  c: '#F59E0B' },
    ];
    for (const p of papers) {
      ctx.fillStyle = p.c;
      ctx.fillRect(px + 6 + p.dx, wy + 3 + p.dy, p.w, p.h);
    }
    ctx.restore();
  } else if (type === 'exit') {
    ctx.fillStyle = '#064E3B';
    roundRect(px + 5, mid - 9, 36, 16, 3);
    ctx.fill();
    ctx.save();
    ctx.fillStyle = '#34D399';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', px + 23, mid);
    ctx.restore();
  } else if (type === 'clock') {
    ctx.save();
    const r = 13, clkX = px + 12;
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(clkX, mid, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4A5568';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.stroke();
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(clkX, mid);
    ctx.lineTo(clkX + Math.cos(-1.2) * 7, mid + Math.sin(-1.2) * 7);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(clkX, mid);
    ctx.lineTo(clkX + Math.cos(-0.4) * 10, mid + Math.sin(-0.4) * 10);
    ctx.stroke();
    ctx.restore();
  }
}

function drawWallProps() {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, PLAY_TOP, W, WALL_H);
  ctx.clip();
  const offset = wallOffset % PROP_UNIT;
  for (let cycle = -1; cycle <= Math.ceil(W / PROP_UNIT) + 1; cycle++) {
    let px = cycle * PROP_UNIT - offset;
    for (const def of PROP_DEFS) {
      drawWallProp(def.type, px, PLAY_TOP);
      px += def.w;
    }
  }
  ctx.restore();
}

// ── Draw: Hallway Background ──────────────────────────────────────────────────
function drawBackground() {
  // Far wall
  ctx.fillStyle = C.farWall;
  ctx.fillRect(0, PLAY_TOP, W, WALL_H);
  drawWallProps();

  // Floor tiles — checkerboard, vertical seams scroll left with tickOffset
  const scrollX = tickOffset % TILE_W;
  const numCols = Math.ceil(W / TILE_W) + 2;
  const numRows = Math.ceil((BASE_Y - FLOOR_Y) / TILE_H) + 1;
  for (let row = 0; row < numRows; row++) {
    const ty = FLOOR_Y + row * TILE_H;
    if (ty >= BASE_Y) break;
    const tileH = Math.min(TILE_H, BASE_Y - ty);
    for (let col = 0; col < numCols; col++) {
      const tx = col * TILE_W - scrollX - TILE_W;
      ctx.fillStyle = (row + col) % 2 === 0 ? C.floorA : C.floorB;
      ctx.fillRect(tx, ty, TILE_W, tileH);
    }
  }

  // Tile grout lines
  ctx.strokeStyle = C.grout;
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  for (let col = 0; col < numCols; col++) {
    const gx = col * TILE_W - scrollX - TILE_W;
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

  // Lane dividers — solid, slightly more visible than tile grout
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

  // Vignette — top & bottom
  let grad = ctx.createLinearGradient(0, PLAY_TOP, 0, PLAY_TOP + 48);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, PLAY_TOP, W, 48);

  grad = ctx.createLinearGradient(0, BASE_Y - 40, 0, BASE_Y);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, BASE_Y - 40, W, 40);

  // Distance haze — right edge, hallway recedes where obstacles spawn
  grad = ctx.createLinearGradient(W - 120, 0, W, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = grad;
  ctx.fillRect(W - 120, PLAY_TOP, 120, PLAY_H);
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

  // Ground shadow
  drawSpriteShadow(cx, cy + p.h / 2 - 4, 18, 5);

  // Backpack (behind body)
  ctx.fillStyle = C.playerPack;
  roundRect(cx + 8, cy - 18, 14, 32, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(cx + 8, cy - 18, 14, 7, 4);
  ctx.fill();

  // Backpack strap
  ctx.strokeStyle = '#1E40AF';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(cx + 9, cy - 14);
  ctx.lineTo(cx + 3, cy - 2);
  ctx.stroke();

  // Body
  ctx.fillStyle = C.playerBody;
  roundRect(cx - 18, cy - 18, 36, 36, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.13)';
  roundRect(cx - 18, cy - 18, 36, 9, 6);
  ctx.fill();

  // Head
  ctx.fillStyle = C.playerHead;
  ctx.beginPath();
  ctx.arc(cx, cy - 30, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.beginPath();
  ctx.arc(cx - 3, cy - 36, 8, Math.PI, 0);
  ctx.fill();

  // Hair
  ctx.fillStyle = C.playerHair;
  ctx.beginPath();
  ctx.arc(cx, cy - 34, 14, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 14, cy - 48, 28, 14);

  // Left leg (swings forward on positive phase)
  ctx.fillStyle = C.playerLegs;
  ctx.fillRect(cx - 14 + swing, cy + 18, 12, 18);
  // Right leg (opposite phase)
  ctx.fillRect(cx + 2  - swing, cy + 18, 12, 18);

  // Left shoe
  ctx.fillStyle = C.playerShoes;
  ctx.fillRect(cx - 15 + swing, cy + 32, 14, 6);
  // Right shoe
  ctx.fillRect(cx + 1  - swing, cy + 32, 14, 6);

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
  }
}

function toggleMute() {
  muted = !muted;
  const btn = document.getElementById('mute-btn');
  if (btn) btn.textContent = muted ? '🔇' : '🔊';
  if (audioCtx && musicGain) {
    musicGain.gain.setTargetAtTime(muted ? 0 : 0.12, audioCtx.currentTime, 0.02);
  }
}

// ── Background Music ──────────────────────────────────────────────────────────
let musicGain       = null;
let musicBeat       = 0;
let musicStep       = 0;
let nextBeatTime    = 0;
let nextStepTime    = 0;
let musicIntervalId = null;

const BEAT_S         = 60 / 128;
const LOOK_AHEAD     = 0.1;
const SCHED_INTERVAL = 25;

const BASS_NOTES = ['A2','A2','C3','C3','F2','F2','G2','G2'];
const LEAD_NOTES = ['A4','C5','E5','C5','C5','E5','G5','E5','F4','A4','C5','A4','G4','B4','D5','B4'];

function noteFreq(name) {
  const semis = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  const m = name.match(/^([A-G])(#?)(\d)$/);
  if (!m) return 440;
  const midi = (parseInt(m[3]) + 1) * 12 + semis[m[1]] + (m[2] ? 1 : 0);
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function schedBass(noteName, t) {
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(musicGain);
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(noteFreq(noteName), t);
  gain.gain.setValueAtTime(0,   t);
  gain.gain.linearRampToValueAtTime(1,   t + 0.005);
  gain.gain.linearRampToValueAtTime(0.4, t + 0.06);
  gain.gain.linearRampToValueAtTime(0,   t + BEAT_S * 0.85);
  osc.start(t);
  osc.stop(t + BEAT_S);
}

function schedLead(noteName, t) {
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(musicGain);
  osc.type = 'square';
  const dur = BEAT_S / 2;
  osc.frequency.setValueAtTime(noteFreq(noteName), t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(1,   t + 0.005);
  gain.gain.linearRampToValueAtTime(0,   t + dur * 0.45);
  osc.start(t);
  osc.stop(t + dur);
}

function musicSchedulerTick() {
  if (!audioCtx || gameState !== 'PLAYING') return;
  const now = audioCtx.currentTime;
  if (nextBeatTime < now) nextBeatTime = now;
  if (nextStepTime < now) nextStepTime = now;
  while (nextBeatTime < now + LOOK_AHEAD) {
    schedBass(BASS_NOTES[musicBeat % 8], nextBeatTime);
    musicBeat++;
    nextBeatTime += BEAT_S;
  }
  while (nextStepTime < now + LOOK_AHEAD) {
    schedLead(LEAD_NOTES[musicStep % 16], nextStepTime);
    musicStep++;
    nextStepTime += BEAT_S / 2;
  }
}

function startMusic() {
  if (!audioCtx) return;
  stopMusic();
  if (!musicGain) {
    musicGain = audioCtx.createGain();
    musicGain.gain.setValueAtTime(muted ? 0 : 0.12, audioCtx.currentTime);
    musicGain.connect(audioCtx.destination);
  }
  musicBeat    = 0;
  musicStep    = 0;
  nextBeatTime = audioCtx.currentTime;
  nextStepTime = audioCtx.currentTime;
  musicIntervalId = setInterval(musicSchedulerTick, SCHED_INTERVAL);
}

function stopMusic() {
  if (musicIntervalId !== null) {
    clearInterval(musicIntervalId);
    musicIntervalId = null;
  }
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
let spawnTimer    = 0;
let spawnCooldown = 0;

function drawTextbook(x, cy) {
  const w = 70, h = 26;
  const ox = x, oy = cy - h / 2;

  drawSpriteShadow(ox + w / 2, oy + h / 2, 30, 7);

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

  // Top highlight
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(ox + 7, oy, w - 7, 4);
}

function drawBackpack(x, cy) {
  const w = 50, h = 56;
  const ox = x, oy = cy - h / 2;

  drawSpriteShadow(ox + w / 2, oy + h / 2, 22, 7);

  // Body
  ctx.fillStyle = '#7C3AED';
  roundRect(ox, oy + 8, w, h - 8, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.13)';
  roundRect(ox, oy + 8, w, 9, 6);
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

  drawSpriteShadow(ox + w / 2, oy + h / 2 + 10, 38, 8);

  // Body
  ctx.fillStyle = '#8D9EAE';
  ctx.fillRect(ox, oy, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(ox, oy, w, 5);

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

function drawDodgeball(x, cy) {
  const r  = 15;
  const cx = x + r;

  drawSpriteShadow(cx, cy + r, r, 5);

  // Ball body
  ctx.fillStyle = '#F97316';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Seam lines clipped to ball
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
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.arc(cx - 4, cy - 5, 4, 0, Math.PI * 2);
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
  if (score < 20) {
    if (roll < 0.40)      { type = 'backpack';    speedMult = 1.0;  }
    else if (roll < 0.75) { type = 'textbook';    speedMult = 1.3;  }
    else                  { type = 'janitorCart'; speedMult = 0.75; }
  } else {
    if (roll < 0.32)      { type = 'backpack';    speedMult = 1.0;  }
    else if (roll < 0.60) { type = 'textbook';    speedMult = 1.3;  }
    else if (roll < 0.80) { type = 'janitorCart'; speedMult = 0.75; }
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
const TICK_SPACING = 80;   // kept for tickOffset scroll math
const TICK_SPEED   = 320;
let tickOffset = 0;

function drawFloorTicks() {
  const POOL_GAP = 220;
  const poolOff  = tickOffset % POOL_GAP;
  for (let x = -poolOff; x < W + POOL_GAP; x += POOL_GAP) {
    for (let lane = 0; lane < 3; lane++) {
      const lcy  = LANE_CY[lane];
      const grad = ctx.createRadialGradient(x, lcy - 20, 0, x, lcy - 20, 95);
      grad.addColorStop(0, 'rgba(255, 248, 220, 0.07)');
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
  spawnInterval = Math.max(0.48, 1.40 - 0.024 * score);
  baseSpeed     = Math.min(700, 340 + 9 * score);

  const scoreEl = document.getElementById('score-display');
  const bestEl  = document.getElementById('best-display');
  if (scoreEl) scoreEl.textContent = Math.floor(score) + 's';
  if (bestEl)  bestEl.textContent  = 'Best: ' + Math.floor(bestScore) + 's';

  player.y += (player.targetY - player.y) * (1 - Math.pow(0.01, dt * 10));
  tickOffset += TICK_SPEED * dt;
  wallOffset += baseSpeed * 0.45 * dt;
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
    <p style="color:#94A3B8;margin:0 0 4px">Dodge everything. Get to class.</p>
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
  baseSpeed     = 340;
  spawnInterval = 1.4;
  inputLocked   = false;
  lastMilestone = 0;
  player.laneIndex = 1;
  player.y         = LANE_CY[1];
  player.targetY   = LANE_CY[1];
  updateLivesHUD();
  const scoreEl = document.getElementById('score-display');
  if (scoreEl) scoreEl.textContent = '0s';
  const ts = document.getElementById('title-screen');
  if (ts) ts.classList.add('hidden');
  gameState = 'PLAYING';
  playSound('start');
  startMusic();
}

function triggerGameOver() {
  gameState = 'GAMEOVER';
  stopMusic();
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
  stopMusic();
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