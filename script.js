// ── 상수 ──────────────────────────────────────────
const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const SPEEDS = [800, 650, 520, 400, 310, 230, 170, 120, 80, 50];
const LINES_PER_LEVEL = 10;
const LINE_SCORES = [0, 100, 300, 500, 800];

const PIECES = {
  I: { shape: [[1,1,1,1]], color: '#00cfcf' },
  O: { shape: [[1,1],[1,1]], color: '#f0d000' },
  T: { shape: [[0,1,0],[1,1,1]], color: '#aa00ff' },
  S: { shape: [[0,1,1],[1,1,0]], color: '#00e060' },
  Z: { shape: [[1,1,0],[0,1,1]], color: '#ff4040' },
  J: { shape: [[1,0,0],[1,1,1]], color: '#4080ff' },
  L: { shape: [[0,0,1],[1,1,1]], color: '#ff8800' },
};
const PIECE_KEYS = Object.keys(PIECES);

// ── 캔버스 ────────────────────────────────────────
const canvas    = document.getElementById('board');
const ctx       = canvas.getContext('2d');
const nextCvs   = document.getElementById('next-canvas');
const nextCtx   = nextCvs.getContext('2d');
const holdCvs   = document.getElementById('hold-canvas');
const holdCtx   = holdCvs.getContext('2d');

// ── Web Audio (고전 사운드) ────────────────────────
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  const now = audioCtx.currentTime;
  switch (type) {

    case 'move': {
      // 짧은 클릭
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.type = 'square';
      o.frequency.setValueAtTime(220, now);
      g.gain.setValueAtTime(0.06, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      o.start(now); o.stop(now + 0.05);
      break;
    }

    case 'rotate': {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.type = 'square';
      o.frequency.setValueAtTime(330, now);
      o.frequency.linearRampToValueAtTime(440, now + 0.06);
      g.gain.setValueAtTime(0.07, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      o.start(now); o.stop(now + 0.08);
      break;
    }

    case 'lock': {
      // 쿵 소리
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.type = 'square';
      o.frequency.setValueAtTime(160, now);
      o.frequency.exponentialRampToValueAtTime(80, now + 0.1);
      g.gain.setValueAtTime(0.15, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      o.start(now); o.stop(now + 0.12);
      break;
    }

    case 'clear': {
      // 라인 클리어: 상승 아르페지오
      [261, 329, 392, 523].forEach((freq, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination);
        o.type = 'square';
        const t = now + i * 0.07;
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        o.start(t); o.stop(t + 0.12);
      });
      break;
    }

    case 'tetris': {
      // 4줄 동시: 화려한 아르페지오
      [261, 329, 392, 523, 659, 784].forEach((freq, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination);
        o.type = 'square';
        const t = now + i * 0.055;
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.14, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        o.start(t); o.stop(t + 0.15);
      });
      break;
    }

    case 'levelup': {
      // 레벨업 팡파레
      const melody = [523, 659, 784, 1046];
      melody.forEach((freq, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination);
        o.type = 'square';
        const t = now + i * 0.1;
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.13, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        o.start(t); o.stop(t + 0.18);
      });
      break;
    }

    case 'hold': {
      // 홀드: 두 음
      [392, 294].forEach((freq, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination);
        o.type = 'square';
        const t = now + i * 0.08;
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.1, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        o.start(t); o.stop(t + 0.1);
      });
      break;
    }

    case 'harddrop': {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.type = 'square';
      o.frequency.setValueAtTime(400, now);
      o.frequency.exponentialRampToValueAtTime(100, now + 0.08);
      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      o.start(now); o.stop(now + 0.1);
      break;
    }

    case 'gameover': {
      // 게임오버: 하강 멜로디
      [523, 415, 330, 261, 196].forEach((freq, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination);
        o.type = 'square';
        const t = now + i * 0.18;
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.15, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        o.start(t); o.stop(t + 0.22);
      });
      break;
    }
  }
}

// AudioContext 활성화 (브라우저 정책: 첫 상호작용 후)
function resumeAudio() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

// ── 게임 상태 ──────────────────────────────────────
let board, current, next, held, canHold;
let score, lines, level, gameOver, paused, animId, dropTimer, lastTime;

// ── 초기화 ─────────────────────────────────────────
function initGame() {
  board     = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  score     = 0;
  lines     = 0;
  level     = 1;
  gameOver  = false;
  paused    = false;
  held      = null;
  canHold   = true;
  next      = randomPiece();
  current   = spawnPiece();
  updateUI();
  drawHold();
}

function startGame() {
  resumeAudio();
  if (animId) cancelAnimationFrame(animId);
  initGame();
  document.getElementById('overlay').classList.add('hidden');
  lastTime  = performance.now();
  dropTimer = 0;
  animId    = requestAnimationFrame(loop);
}

// ── 게임 루프 ──────────────────────────────────────
function loop(now) {
  const delta = now - lastTime;
  lastTime = now;

  if (!paused && !gameOver) {
    dropTimer += delta;
    if (dropTimer >= SPEEDS[level - 1]) {
      dropTimer = 0;
      moveDown(true); // 자동 낙하
    }
  }

  draw();
  animId = requestAnimationFrame(loop);
}

// ── 피스 생성 ──────────────────────────────────────
function randomPiece() {
  const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
  return { key, shape: PIECES[key].shape.map(r => [...r]), color: PIECES[key].color };
}

function spawnPiece() {
  const p = next;
  next = randomPiece();
  p.x = Math.floor((COLS - p.shape[0].length) / 2);
  p.y = 0;
  if (collides(p, p.x, p.y)) {
    triggerGameOver();
  }
  drawNext();
  return p;
}

// ── 홀드 ───────────────────────────────────────────
function holdPiece() {
  if (!canHold) return;
  playSound('hold');

  const heldKey = held ? held.key : null;

  // 현재 피스를 홀드에 저장 (초기 모양으로 리셋)
  held = {
    key: current.key,
    shape: PIECES[current.key].shape.map(r => [...r]),
    color: current.color,
  };

  if (heldKey) {
    // 이전 홀드 피스를 꺼내서 현재로
    current = {
      key: heldKey,
      shape: PIECES[heldKey].shape.map(r => [...r]),
      color: PIECES[heldKey].color,
      x: Math.floor((COLS - PIECES[heldKey].shape[0].length) / 2),
      y: 0,
    };
  } else {
    current = spawnPiece();
  }

  canHold = false;
  document.getElementById('hold-box').classList.add('used');
  drawHold();
}

// ── 충돌 감지 ──────────────────────────────────────
function collides(piece, ox, oy) {
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

// ── 이동 / 회전 ────────────────────────────────────
function moveLeft() {
  if (!collides(current, current.x - 1, current.y)) {
    current.x--;
    playSound('move');
  }
}

function moveRight() {
  if (!collides(current, current.x + 1, current.y)) {
    current.x++;
    playSound('move');
  }
}

function moveDown(auto = false) {
  if (!collides(current, current.x, current.y + 1)) {
    current.y++;
  } else {
    lock();
  }
}

function hardDrop() {
  playSound('harddrop');
  while (!collides(current, current.x, current.y + 1)) current.y++;
  lock();
}

function rotate() {
  const rotated = current.shape[0].map((_, i) =>
    current.shape.map(row => row[i]).reverse()
  );
  const prev = current.shape;
  current.shape = rotated;
  if (collides(current, current.x, current.y)) {
    if      (!collides(current, current.x + 1, current.y)) current.x++;
    else if (!collides(current, current.x - 1, current.y)) current.x--;
    else if (!collides(current, current.x + 2, current.y)) current.x += 2;
    else if (!collides(current, current.x - 2, current.y)) current.x -= 2;
    else { current.shape = prev; return; }
  }
  playSound('rotate');
}

// ── 고정 & 라인 클리어 ─────────────────────────────
function lock() {
  playSound('lock');
  for (let r = 0; r < current.shape.length; r++) {
    for (let c = 0; c < current.shape[r].length; c++) {
      if (!current.shape[r][c]) continue;
      const ny = current.y + r;
      if (ny < 0) { triggerGameOver(); return; }
      board[ny][current.x + c] = current.color;
    }
  }
  clearLines();
  canHold = true;
  document.getElementById('hold-box').classList.remove('used');
  current = spawnPiece();
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(cell => cell !== null)) {
      board.splice(r, 1);
      board.unshift(Array(COLS).fill(null));
      cleared++;
      r++;
    }
  }
  if (cleared === 0) return;

  // 사운드
  if (cleared === 4) playSound('tetris');
  else               playSound('clear');

  const prevLevel = level;
  lines  += cleared;
  score  += LINE_SCORES[cleared] * level;
  level   = Math.min(10, Math.floor(lines / LINES_PER_LEVEL) + 1);

  if (level > prevLevel) {
    showLevelUp(level);
    playSound('levelup');
  }
  updateUI();
  saveBest();
}

// ── 게임 오버 ──────────────────────────────────────
function triggerGameOver() {
  gameOver = true;
  playSound('gameover');
  saveBest();
  setTimeout(() => {
    document.getElementById('overlay-title').textContent = 'GAME OVER';
    document.getElementById('overlay-sub').textContent   = `SCORE: ${score.toLocaleString()}`;
    document.getElementById('start-btn').textContent     = 'RETRY';
    document.getElementById('overlay').classList.remove('hidden');
  }, 400);
}

// ── UI ─────────────────────────────────────────────
function updateUI() {
  document.getElementById('score').textContent = score.toLocaleString();
  document.getElementById('lines').textContent = lines;
  document.getElementById('level').textContent = level;
  const pct = level === 10 ? 100 : ((lines % LINES_PER_LEVEL) / LINES_PER_LEVEL) * 100;
  document.getElementById('level-bar').style.width = pct + '%';
}

function saveBest() {
  const best = Math.max(score, parseInt(localStorage.getItem('tetris-best') || '0'));
  localStorage.setItem('tetris-best', best);
  document.getElementById('best').textContent = best.toLocaleString();
}

function loadBest() {
  document.getElementById('best').textContent =
    parseInt(localStorage.getItem('tetris-best') || '0').toLocaleString();
}

function showLevelUp(lv) {
  const el = document.getElementById('levelup-notify');
  el.textContent = `LEVEL ${lv}`;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

// ── 그리기 ─────────────────────────────────────────
function draw() {
  ctx.fillStyle = '#0c0c18';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      ctx.strokeRect(c * BLOCK, r * BLOCK, BLOCK, BLOCK);

  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c]) drawBlock(ctx, c, r, board[r][c]);

  if (!gameOver && !paused) {
    let ghostY = current.y;
    while (!collides(current, current.x, ghostY + 1)) ghostY++;
    drawPiece(ctx, current, current.x, ghostY, 0.18);
  }

  if (!gameOver) drawPiece(ctx, current, current.x, current.y, 1);
}

function drawBlock(c, x, y, color, alpha = 1) {
  const px = x * BLOCK, py = y * BLOCK;
  c.globalAlpha = alpha;
  c.fillStyle = color;
  c.fillRect(px + 1, py + 1, BLOCK - 2, BLOCK - 2);
  c.fillStyle = 'rgba(255,255,255,0.25)';
  c.fillRect(px + 1, py + 1, BLOCK - 2, 4);
  c.fillRect(px + 1, py + 1, 4, BLOCK - 2);
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.fillRect(px + 1, py + BLOCK - 5, BLOCK - 2, 4);
  c.fillRect(px + BLOCK - 5, py + 1, 4, BLOCK - 2);
  c.globalAlpha = 1;
}

function drawPiece(c, piece, ox, oy, alpha) {
  for (let r = 0; r < piece.shape.length; r++)
    for (let col = 0; col < piece.shape[r].length; col++)
      if (piece.shape[r][col]) drawBlock(c, ox + col, oy + r, piece.color, alpha);
}

function drawMiniPiece(c, cvs, piece) {
  c.fillStyle = '#0c0c18';
  c.fillRect(0, 0, cvs.width, cvs.height);
  if (!piece) return;
  const s = piece.shape;
  const bSize = 22;
  const ox = Math.floor((cvs.width  - s[0].length * bSize) / 2);
  const oy = Math.floor((cvs.height - s.length    * bSize) / 2);
  for (let r = 0; r < s.length; r++) {
    for (let col = 0; col < s[r].length; col++) {
      if (!s[r][col]) continue;
      const px = ox + col * bSize, py = oy + r * bSize;
      c.fillStyle = piece.color;
      c.fillRect(px + 1, py + 1, bSize - 2, bSize - 2);
      c.fillStyle = 'rgba(255,255,255,0.2)';
      c.fillRect(px + 1, py + 1, bSize - 2, 3);
      c.fillRect(px + 1, py + 1, 3, bSize - 2);
    }
  }
}

function drawNext() { drawMiniPiece(nextCtx, nextCvs, next); }
function drawHold() { drawMiniPiece(holdCtx, holdCvs, held); }

// ── 터치 컨트롤 ────────────────────────────────────
(function () {
  let startX = 0, startY = 0, lastX = 0, accumX = 0;
  const MOVE_PX = 28; // 한 칸 이동에 필요한 픽셀

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    resumeAudio();
    const t = e.changedTouches[0];
    startX = lastX = t.clientX;
    startY = t.clientY;
    accumX = 0;
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (gameOver || paused) return;
    const t = e.changedTouches[0];
    accumX += t.clientX - lastX;
    lastX = t.clientX;
    if (accumX >= MOVE_PX)       { moveRight(); accumX -= MOVE_PX; }
    else if (accumX <= -MOVE_PX) { moveLeft();  accumX += MOVE_PX; }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (gameOver || paused) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
      rotate();                          // 탭 → 회전
    } else if (dy > 60 && Math.abs(dx) < 60) {
      hardDrop();                        // 아래 스와이프 → 즉시 낙하
    } else if (dy < -60 && Math.abs(dx) < 60) {
      holdPiece();                       // 위 스와이프 → 홀드
    }
  }, { passive: false });
})();

// ── 키 입력 ────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  resumeAudio();
  if (gameOver) return;

  switch (e.key) {
    case 'ArrowLeft':  e.preventDefault(); moveLeft();   break;
    case 'ArrowRight': e.preventDefault(); moveRight();  break;
    case 'ArrowDown':  e.preventDefault(); moveDown();   break;
    case 'ArrowUp':    e.preventDefault(); rotate();     break;
    case ' ':          e.preventDefault(); hardDrop();   break;
    case 'Shift':      e.preventDefault(); holdPiece();  break;
    case 'p': case 'P': paused = !paused; break;
  }
});

// ── 시작 ───────────────────────────────────────────
loadBest();
initGame();
draw();
drawNext();
drawHold();
