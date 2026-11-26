/* game.js — Pixel Arena Online (client) */
const Sh = Shared, WP = Sh.WP, PX = Sh.PX, PY = Sh.PY, N = Sh.N, water = Sh.water;
const W = 480, H = 270, OX = N * 16 + 16, OY = 40, INTERP = .13;
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
cv.width = W * 2; cv.height = H * 2; ctx.imageSmoothingEnabled = false;
const $ = id => document.getElementById(id), ov = $('ov');
function fit() { const s = Math.min(innerWidth / W, innerHeight / H); cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px'; }
addEventListener('resize', fit); fit();

// sprite karakter 96px digambar ke kotak 48px supaya tajam di canvas 2x
const _di = CanvasRenderingContext2D.prototype.drawImage;
CanvasRenderingContext2D.prototype.drawImage = function (i, ...a) {
  return (this.canvas === cv && (i === O || i === Tc) && a.length == 2) ? _di.call(this, i, a[0], a[1], 48, 48) : _di.call(this, i, ...a);
};

/* ===== util & suara ===== */
const rnd = (a, b) => a + Math.random() * (b - a);
const now = () => performance.now() / 1000;
const hs = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function blob(c, x, y, rx, ry, col) { x = Math.round(x); y = Math.round(y); rx = Math.round(rx); ry = Math.max(1, Math.round(ry)); c.fillStyle = col; for (let d = -ry; d <= ry; d++) { const w = Math.floor(rx * Math.sqrt(1 - d * d / (ry * ry))); c.fillRect(x - w, y + d, w * 2, 1); } }
function sfx(f, d, t = 'square', v = .04, sl = 0) { try { window.ac = window.ac || new AudioContext(); const a = window.ac, o = a.createOscillator(), g = a.createGain(); o.type = t; o.frequency.setValueAtTime(f, a.currentTime); if (sl) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + sl), a.currentTime + d); g.gain.setValueAtTime(v, a.currentTime); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + d); o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + d); } catch (e) { } }
const AC = () => window.ac = window.ac || new AudioContext();
function nz(d, v, lp) { try { const a = AC(), b = a.createBuffer(1, a.sampleRate * d | 0, a.sampleRate), c = b.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = (Math.random() * 2 - 1) * (1 - i / c.length); const so = a.createBufferSource(), gn = a.createGain(), f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; gn.gain.value = v; so.buffer = b; so.connect(f).connect(gn).connect(a.destination); so.start(); } catch (e) { } }
let amb = 0;
function ambient() {
  if (amb) return; amb = 1;
  try {
    const a = AC(), m = a.createGain(); m.gain.value = .05; m.connect(a.destination);
    [[55, 'sine'], [82.4, 'triangle'], [110.5, 'sine']].forEach(([f, t], i) => { const o1 = a.createOscillator(), gn = a.createGain(), l = a.createOscillator(), lg = a.createGain(); o1.type = t; o1.frequency.value = f; l.frequency.value = .07 + i * .05; lg.gain.value = .4; gn.gain.value = .5; l.connect(lg).connect(gn.gain); o1.connect(gn).connect(m); o1.start(); l.start(); });
    const nt = [261.6, 311.1, 392, 466.2, 523.3, 622.3];
    (function ch() { sfx(nt[Math.random() * 6 | 0] * (Math.random() < .5 ? 1 : 2), 2.2, 'sine', .012); setTimeout(ch, rnd(3000, 7000)); })();
  } catch (e) { }
}

/* ===== dunia: tanah digambar sekali ke canvas besar ===== */
function tt(x, y) { const cx = x + .5, cy = y + .5; if (water(cx, cy)) return 'w'; if (Math.hypot(cx - 42, cy - 14) < 5.6) return 'a'; const d = Math.hypot(cx - PX, cy - PY); if (d < 6) return 's'; if (d < 7.5 && hs(x, y) > .35) return 'd'; return 'g'; }
const PAL = { g: ['#1c3a24', '#20402a', '#19331f', '#244630'], s: ['#4a4f52', '#42474a'], d: ['#4a3a28', '#41331f'], a: ['#5a5a48', '#515140'], w: ['#141a40', '#1a2150'] };
function dia(c, ix, iy, col) { c.fillStyle = col; for (let r = 0; r < 16; r++) { const hw = (r < 8 ? r + 1 : 16 - r) * 2; c.fillRect(ix - hw, iy + r, hw * 2, 1); } }
const G = mk(N * 32 + 32, N * 16 + 60), gc = G.getContext('2d'), waterT = [];
for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
  const t = tt(x, y), p = PAL[t], h = hs(x, y), ix = (x - y) * 16 + OX, iy = (x + y) * 8 + OY;
  dia(gc, ix, iy, t == 'g' ? p[Math.floor(h * 4)] : t == 's' ? p[(x + y) & 1] : p[h > .5 ? 1 : 0]);
  if (t == 'g') {
    for (let k = 0; k < 3; k++) { const px = ix + Math.floor((hs(x + k, y * 3) - .5) * 20), py = iy + 5 + Math.floor(hs(y + k, x * 7) * 8); gc.fillStyle = '#0f2a18'; gc.fillRect(px, py, 1, 2); gc.fillStyle = '#5fd6a0'; gc.fillRect(px + 2, py - 1, 1, 1); }
    if (h > .93) { gc.fillStyle = '#1f5a35'; gc.fillRect(ix, iy + 9, 1, 2); gc.fillStyle = ['#9be9ff', '#ffe58a', '#d8f5e0'][Math.floor(h * 100) % 3]; gc.fillRect(ix - 1, iy + 7, 2, 2); }
  }
  if (t == 's' && h < .18) { gc.fillStyle = '#2e3235'; gc.fillRect(ix - 4, iy + 7, 6, 1); gc.fillRect(ix + 1, iy + 8, 3, 1); }
  if (t == 'w') waterT.push([ix, iy, h]);
}
for (let i = 0; i < 140; i++) { const a = i / 140 * 6.283, x = PX + 3.6 * Math.cos(a), y = PY + 3.6 * Math.sin(a); gc.fillStyle = i % 2 ? '#5ec9e8' : '#b4f0ff'; gc.fillRect((x - y) * 16 + OX, (x + y) * 8 + OY + 8, 2, 1); }
const walls = []; for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if (x == 0 || y == 0 || x == N - 1 || y == N - 1) walls.push([x, y]);
const WS = mk(32, 27), wsc = WS.getContext('2d');
[['#3d4146', [[0, 8], [16, 16], [16, 26], [0, 18]]], ['#2a2d31', [[32, 8], [16, 16], [16, 26], [32, 18]]], ['#5d6368', [[16, 0], [32, 8], [16, 16], [0, 8]]]].forEach(([c, p]) => { wsc.fillStyle = c; wsc.beginPath(); p.forEach(([x, y], i) => i ? wsc.lineTo(x, y) : wsc.moveTo(x, y)); wsc.fill(); });

// pohon & batu: posisi dari seed server (identik di semua pemain)
let WORLD, obs = [], blocked;
function setWorld(seed) { WORLD = Sh.makeWorld(seed); obs = WORLD.obs; blocked = WORLD.blocked; }
setWorld(1);

/* ===== state ===== */
const sock = io(window.SERVER_URL || undefined, { transports: ['websocket', 'polling'] });
const keys = {};
let state = 'menu', T = 0, mx = W / 2, my = H / 2, fire = false, shake = 0, CX = 0, CY = 0, camX = 0, camY = 0, shx = 0, shy = 0;
let P, R = new Map(), B = [], IT = [], PT = [], RG = [], PP = [], trail = [], streak = null, scan = null, Z = { x: PX, y: PY, r: 52, ph: 0 }, alive = 0;
let HERO = 's', myName = 'PLAYER', pend = [], seq = 0, acc = 0, sendT = 0, inDx = 0, inDy = 0, srvOff = null, wLock = 0, rlLock = 0, wasRl = 0, cut = null, lastHx = '';
try { myName = (localStorage.getItem('pa_name') || 'PLAYER').replace(/[^\w \-.]/g, '').slice(0, 12) || 'PLAYER'; } catch (e) { }

function newP(x, y, id, hero) {
  return { id, x, y, hp: 100, dcd: 0, scd: 0, rl: 0, dash: null, aimx: x, aimy: y, sdx: 1, sdy: 1, ang: 0, flash: 0, moving: 0, lx: 1, ly: 0, atMax: 0,
    w: hero, am: { r: 30, s: 5 }, rs: hero == 's' ? { r: 60, s: 20 } : { r: 120, s: 10 }, kills: 0, ft: 0, fs: 0, dead: 0, hide: 0, cheer: 0 };
}
function mkRemote(e) { return { id: e.id, name: e.name, h: e.h, st: e.st, x: e.x, y: e.y, lx: 1, ly: 0, sdx: 1, sdy: 1, ang: 0, w: 'r', hp: 100, flash: 0, moving: 0, f2: 0, rev: 0, vis: 0, seenAt: -9, buf: [], ft: 0, spd: 0 }; }
const iso = (x, y) => [(x - y) * 16, (x + y) * 8];
const sc = (x, y) => [Math.round((x - y) * 16 - CX + W / 2), Math.round((x + y) * 8 - CY + H / 2)];
function m2w() { const ix = mx - W / 2 + CX, iy = my - H / 2 + CY; return [(ix / 16 + iy / 8) / 2, (iy / 8 - ix / 16) / 2]; }
const burst = (x, y, z, col, n, sp) => { for (let i = 0; i < n; i++) PT.push({ x, y, z, vx: rnd(-1, 1) * sp, vy: rnd(-1, 1) * sp, vz: rnd(30, 90), l: rnd(.3, .6), col }); };
const pop = (x, y, t, col, big) => PP.push({ x, y, t: 0, txt: t, col, big, vx: rnd(-6, 6) });
const huds = v => document.querySelectorAll('.hud').forEach(e => e.style.display = v);

function resetMatch() {
  R.clear(); B = []; IT = []; PT = []; RG = []; PP = []; trail = []; streak = null; scan = null; cut = null; pend = []; acc = 0; alive = 0; srvOff = null; wasRl = 0;
  P = newP(PX, PY, 0, HERO); Z = { x: PX, y: PY, r: 52, ph: 0 }; [camX, camY] = iso(PX, PY);
}
resetMatch();

/* ===== aksi pemain ===== */
function doDash() {
  if (state != 'play' || !Sh.startDash(P, P.aimx, P.aimy)) return;
  streak = { sx: P.x, sy: P.y }; RG.push({ x: P.x, y: P.y, t: 0, col: '180,240,255' }); burst(P.x, P.y, 6, '#9be9ff', 10, 2.5); sfx(900, .18, 'sawtooth', .05, -700);
  sock.emit('dash', { ax: P.aimx, ay: P.aimy });
}
function endDash() { streak.ex = P.x; streak.ey = P.y; streak.end = T; RG.push({ x: P.x, y: P.y, t: 0, col: '180,240,255' }); burst(P.x, P.y, 6, '#fff', 12, 3); shake = Math.max(shake, 2.5); sfx(500, .12, 'triangle', .05, -250); }
function reloadSfx(wp) { nz(.05, .3, 2500); sfx(300, .06, 'square', .08, -120); setTimeout(() => { nz(.08, .25, 1500); sfx(160, .1, 'triangle', .1); }, wp.rl * 400); setTimeout(() => { nz(.06, .3, 3000); sfx(520, .07, 'square', .08); }, wp.rl * 850); }
function doReload() { const wp = WP[P.w]; if (state != 'play' || P.rl > 0 || P.am[P.w] >= wp.mag || P.rs[P.w] <= 0) return; P.rl = wp.rl; rlLock = T + .3; sock.emit('rld'); reloadSfx(wp); }
function setWeapon(w) { if (state != 'play' || P.w == w) return; P.w = w; P.rl = 0; wLock = T + .5; sock.emit('wpn', w); sfx(300, .05, 'square', .04); nz(.05, .06, 1200); }
function doScan() { if (state != 'play' || P.scd > 0) return; P.scd = Sh.SCAN_CD; scan = { t: T, x: P.x, y: P.y }; sock.emit('scan'); sfx(880, .8, 'sine', .07, -500); setTimeout(() => sfx(660, .8, 'sine', .04, -300), 250); }

/* ===== update ===== */
function update(dt) {
  const wp = WP[P.w], Rg = wp.rng;
  let [wx, wy] = m2w(), ax = wx - P.x, ay = wy - P.y, d = Math.hypot(ax, ay); if (d > Rg) { ax *= Rg / d; ay *= Rg / d; d = Rg; }
  P.aimx = P.x + ax; P.aimy = P.y + ay; P.atMax = d >= Rg - .01;
  if (d > .3) { P.sdx = (ax - ay) * 16; P.sdy = (ax + ay) * 8; P.ang = Math.atan2(P.sdy, P.sdx); P.lx = ax / d; P.ly = ay / d; }
  P.dcd -= dt; P.scd -= dt; P.flash -= dt; if (P.rl > 0) P.rl = Math.max(0, P.rl - dt);
  inDx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  inDy = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  if (!P.dash) Sh.applyMove(P, inDx, inDy, dt, WORLD);
  else { P.moving = 0; const ang = P.dash.ang, done = Sh.stepDash(P, dt, WORLD); trail.push({ x: P.x, y: P.y, t: T, ang }); if (done) endDash(); }
  trail = trail.filter(t => T - t.t < .25);
  if (P.moving && (P.ft -= dt) <= 0) { P.ft = .34; P.fs ^= 1; nz(.07, .35, P.fs ? 900 : 700); sfx(P.fs ? 85 : 70, .08, 'sine', .14, -30); }

  // kirim input ke server 30x/detik
  acc += dt; sendT -= dt;
  if (sendT <= 0) {
    sendT = 1 / 30; seq++;
    pend.push({ seq, dx: inDx, dy: inDy, dt: acc, dash: P.dash ? 1 : 0 }); if (pend.length > 120) pend.shift();
    sock.emit('inp', { seq, dx: inDx, dy: inDy, dt: acc, lx: P.lx, ly: P.ly, ax: P.aimx, ay: P.aimy, f: fire ? 1 : 0 });
    acc = 0;
  }

  for (const b of B) { b.px = b.x; b.py = b.y; b.d -= Math.hypot(b.vx, b.vy) * dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.d <= 0 || blocked(b.x, b.y, .05, true)) { b.dead = 1; burst(b.x, b.y, 10, b.col, 4, 2); } }
  B = B.filter(b => !b.dead);
  for (const p of PT) { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= 260 * dt; if (p.z < 0) { p.z = 0; p.vz *= -.3; } p.l -= dt; } PT = PT.filter(p => p.l > 0);
  for (const r of RG) r.t += dt; RG = RG.filter(r => r.t < .35); for (const p of PP) p.t += dt; PP = PP.filter(p => p.t < .9);
  if (scan && T - scan.t > 1.6) scan = null;
  const [tx, ty] = iso(P.x + (P.aimx - P.x) * .3, P.y + (P.aimy - P.y) * .3); camX += (tx - camX) * Math.min(1, dt * 7); camY += (ty - camY) * Math.min(1, dt * 7);
  shake *= Math.pow(.003, dt); shx = Math.round(rnd(-1, 1) * shake); shy = Math.round(rnd(-1, 1) * shake);
}

// pemain lain: interpolasi dari buffer snapshot (ditampilkan ~130 ms di belakang server)
function updRemotes(dt) {
  const t0 = now(), rt = t0 + (srvOff || 0) - INTERP;
  for (const r of R.values()) {
    r.f2 -= dt; r.flash -= dt;
    const b = r.buf; if (!b.length) continue;
    while (b.length > 2 && b[1].t <= rt) b.shift();
    const a = b[0], c = b[1] || a, k = c.t > a.t ? Math.max(0, Math.min(1, (rt - a.t) / (c.t - a.t))) : 1, ox = r.x, oy = r.y;
    r.x = a.x + (c.x - a.x) * k; r.y = a.y + (c.y - a.y) * k;
    r.lx = c.lx; r.ly = c.ly; r.sdx = (r.lx - r.ly) * 16; r.sdy = (r.lx + r.ly) * 8; r.ang = Math.atan2(r.sdy, r.sdx);
    r.spd = Math.hypot(r.x - ox, r.y - oy) / Math.max(dt, .001);
    r.vis = t0 - r.seenAt < .35;
    if (r.vis && r.spd > .8 && (r.ft -= dt) <= 0) { r.ft = .38; const dd = Math.hypot(r.x - P.x, r.y - P.y); if (dd < 14) nz(.07, .3 * (1 - dd / 14), 900); }
  }
}

/* ===== gambar ===== */
function tree(X, Y, s2) {
  const th = Math.round(15 * s2); blob(ctx, X + 3, Y, 9 * s2, 3, 'rgba(0,0,0,.4)');
  ctx.fillStyle = '#000'; ctx.fillRect(X - 4, Y - th, 8, th + 1); for (let i = 0; i < 8; i++) { ctx.fillRect(X - i - 5, Y - th - i, 3, 3); ctx.fillRect(X + i + 3, Y - th - i + 1, 3, 3); }
  ctx.fillStyle = '#6b4a2f'; ctx.fillRect(X - 3, Y - th, 6, th); ctx.fillStyle = '#8a6540'; ctx.fillRect(X - 3, Y - th, 2, th); ctx.fillStyle = '#4a3020'; ctx.fillRect(X + 1, Y - th, 2, th);
  ctx.fillStyle = '#5a3a22'; for (let i = 0; i < 8; i++) { ctx.fillRect(X - i - 4, Y - th - i + 1, 2, 2); ctx.fillRect(X + i + 4, Y - th - i + 2, 2, 2); }
  const C = [[0, -25, 8, 6, '#8a5a2b'], [-6, -21, 5, 4, '#a87433'], [6, -22, 5, 4, '#7a4a22'], [-2, -29, 4, 3, '#c99a4a'], [4, -28, 3, 2, '#a87433']];
  for (const [dx, dy, rx, ry] of C) blob(ctx, X + dx * s2, Y + dy * s2, rx * s2 + 1, ry * s2 + 1, '#000'); for (const [dx, dy, rx, ry, col] of C) blob(ctx, X + dx * s2, Y + dy * s2, rx * s2, ry * s2, col);
}
function rock(X, Y) { blob(ctx, X + 2, Y, 8, 3, 'rgba(0,0,0,.35)'); blob(ctx, X, Y - 4, 7, 5, '#5b6068'); blob(ctx, X - 1, Y - 5, 6, 4, '#7c828b'); blob(ctx, X - 2, Y - 7, 3, 2, '#aab0ba'); }
function ghost(X, Y, ang, k, al) { ctx.save(); ctx.globalAlpha = al; ctx.translate(X, Y - 12); ctx.rotate(ang); ctx.scale(k, 1 / Math.sqrt(k)); ctx.rotate(-ang); ctx.drawImage(Tc, -24, -28); ctx.restore(); }
function player() {
  const [X, Y] = sc(P.x, P.y); blob(ctx, X, Y, 6, 2, 'rgba(0,0,0,.3)'); drawChar();
  if (streak) {
    const age = streak.end ? T - streak.end : 0, al = .6 - age * 3;
    if (al > 0) {
      const [ax, ay] = sc(streak.sx, streak.sy), [bx, by] = streak.end ? sc(streak.ex, streak.ey) : [X, Y], dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      const poly = (w0, w1) => { ctx.beginPath(); ctx.moveTo(ax + nx * w0, ay - 12 + ny * w0); ctx.lineTo(ax - nx * w0, ay - 12 - ny * w0); ctx.lineTo(bx - nx * w1, by - 12 - ny * w1); ctx.lineTo(bx + nx * w1, by - 12 + ny * w1); ctx.fill(); };
      ctx.fillStyle = 'rgba(90,215,255,' + al * .5 + ')'; poly(1, 9); ctx.fillStyle = 'rgba(255,255,255,' + al * .6 + ')'; poly(.5, 4);
      ctx.strokeStyle = 'rgba(255,255,255,' + al + ')'; ctx.lineWidth = 1; for (const q of [-7, 0, 7]) { ctx.beginPath(); ctx.moveTo(ax + nx * q * .3, ay - 12 + ny * q * .3); ctx.lineTo(bx + nx * q, by - 12 + ny * q); ctx.stroke(); }
    }
  }
  for (const t of trail) { const a = 1 - (T - t.t) / .25; if (a > 0) { const [gx, gy] = sc(t.x, t.y); ghost(gx, gy, t.ang, 1 + .9 * a, a * .45); } }
  let k = 1, ang = 0; if (P.dash) { k = 1 + 1.1 * Math.sin(Math.min(1, P.dash.t / P.dash.dur) * Math.PI); ang = P.dash.ang; }
  ctx.save(); ctx.translate(X, Y - 12); ctx.rotate(ang); ctx.scale(k, 1 / Math.sqrt(k)); ctx.rotate(-ang); ctx.drawImage(O, -24, -28); ctx.restore(); ctx.globalAlpha = 1;
}
function ring(x, y, r, n, col, sz, sk) { ctx.fillStyle = col; for (let i = 0; i < n; i += sk || 1) { const a = i / n * 6.283, [X, Y] = sc(x + r * Math.cos(a), y + r * Math.sin(a)); ctx.fillRect(X, Y, sz, sz); } }

const FG = mk(W, H), fg = FG.getContext('2d');
function fog(pX, pY, aX, aY) {
  fg.globalCompositeOperation = 'source-over'; fg.fillStyle = 'rgba(3,13,11,.95)'; fg.fillRect(0, 0, W, H); fg.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, a) => { fg.save(); fg.translate(x, y); fg.scale(1, .64); const gr = fg.createRadialGradient(0, 0, r * .45, 0, 0, r); gr.addColorStop(0, 'rgba(0,0,0,' + a + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)'); fg.fillStyle = gr; fg.beginPath(); fg.arc(0, 0, r, 0, 7); fg.fill(); fg.restore(); };
  const sn = P.w == 's' ? 1.3 : 1; hole(pX, pY - 8, 135, 1); const dx = aX - pX, dy = aY - pY;
  for (let i = 1; i <= 6; i++) { const f = i / 6 * sn; hole(pX + dx * f, pY - 8 + dy * f, 58 + i * 3 * sn, .9); }
  for (const r of R.values()) if (r.rev && r.vis) { const [X, Y] = sc(r.x, r.y); hole(X, Y - 8, 30, .9); }
  fg.globalCompositeOperation = 'source-over'; ctx.drawImage(FG, 0, 0);
}

function renderWorld() {
  CX = camX + shx; CY = camY + shy; const wp = WP[P.w], Rg = wp.rng;
  ctx.fillStyle = '#050d0b'; ctx.fillRect(0, 0, W, H); ctx.drawImage(G, Math.round(W / 2 - CX - OX), Math.round(H / 2 - CY - OY));
  for (const [ix, iy, h] of waterT) { const x = Math.round(ix - OX - CX + W / 2), y = Math.round(iy - OY - CY + H / 2); if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue; if (Math.sin(T * 2 + h * 40) > .55) { ctx.fillStyle = 'rgba(150,130,255,.6)'; ctx.fillRect(x - 4 + Math.floor(h * 8), y + 6, 3, 1); } }
  ring(Z.x, Z.y, Z.r, Math.max(60, Math.round(Z.r * 8)), 'rgba(255,79,216,.85)', 2, 2); ring(P.x, P.y, Rg, 90, 'rgba(255,255,255,.22)', 1, 2);
  const [pX, pY] = sc(P.x, P.y), [aX, aY] = sc(P.aimx, P.aimy);
  if (P.w == 's') { ctx.fillStyle = 'rgba(255,70,90,.35)'; for (let i = 2; i < 30; i++) ctx.fillRect(Math.round(pX + (aX - pX) * i / 30), Math.round(pY - 8 + (aY - pY) * i / 30), 1, 1); }
  const L = [];
  for (const q of obs) { const [X, Y] = sc(q.x, q.y); if (X < -30 || X > W + 30 || Y < -10 || Y > H + 50) continue; L.push([q.x + q.y, () => q.k == 't' ? tree(X, Y, q.s) : rock(X, Y)]); }
  for (const [x, y] of walls) { const [X, Y] = sc(x, y); if (X < -20 || X > W + 20 || Y < -10 || Y > H + 40) continue; L.push([x + y + 1, () => ctx.drawImage(WS, X - 16, Y - 10)]); }
  for (const i of IT) {
    const u = Math.min(1, (T - i.t0) / .5), ix = i.sx + (i.x - i.sx) * u, iy = i.sy + (i.y - i.sy) * u, z = u < 1 ? Math.sin(u * Math.PI) * 14 : 0, [X, Y] = sc(ix, iy);
    if (X < -10 || X > W + 10 || Y < -10 || Y > H + 10) continue;
    L.push([ix + iy, () => { const bb = Math.round(Math.sin(T * 3 + i.x) * 1.5); blob(ctx, X, Y, 4, 1, 'rgba(0,0,0,.4)'); blob(ctx, X, Y - 6 + bb - (z | 0), 3, 3, i.k == 'a' ? '#ffd166' : '#ff5d8f'); ctx.fillStyle = '#fff'; ctx.fillRect(X - 1, Y - 7 + bb - (z | 0), 2, 2); }]);
  }
  for (const r of R.values()) {
    if (!r.vis) continue; const [X, Y] = sc(r.x, r.y); if (X < -30 || X > W + 30 || Y < -20 || Y > H + 40) continue;
    L.push([r.x + r.y, () => {
      blob(ctx, X, Y, 6, 2, 'rgba(0,0,0,.3)'); drawChar(r, r.h == 'b' ? BST[r.st % 6] : STY[r.h]);
      if (r.f2 > 0 && (T * 30 | 0) % 2) ctx.globalAlpha = .5; ctx.drawImage(O, X - 24, Y - 40); ctx.globalAlpha = 1;
      ctx.fillStyle = '#000'; ctx.fillRect(X - 8, Y - 42, 16, 3); ctx.fillStyle = '#e5484d'; ctx.fillRect(X - 7, Y - 41, Math.round(14 * Math.max(0, r.hp) / 100), 1);
      ctx.textAlign = 'center'; ctx.font = '6px "Press Start 2P",monospace'; ctx.lineWidth = 2; ctx.strokeStyle = '#000'; ctx.strokeText(r.name, X, Y - 47); ctx.fillStyle = '#fff'; ctx.fillText(r.name, X, Y - 47);
    }]);
  }
  if (!P.dead && !P.hide) L.push([P.x + P.y, player]);
  L.sort((a, b) => a[0] - b[0]); for (const l of L) l[1]();
  fog(pX, pY, aX, aY);
  for (const p of PT) { const [X, Y] = sc(p.x, p.y); ctx.fillStyle = p.col; ctx.globalAlpha = Math.min(1, p.l * 3); ctx.fillRect(X, Math.round(Y - p.z), 2, 2); } ctx.globalAlpha = 1;
  for (const r of RG) ring(r.x, r.y, .5 + r.t * 9, 48, 'rgba(' + r.col + ',' + (1 - r.t / .35) * .8 + ')', 2, 1);
  if (scan) ring(scan.x, scan.y, (T - scan.t) * 22, Math.round((T - scan.t) * 220) + 40, 'rgba(199,125,255,' + Math.max(0, 1 - (T - scan.t) / 1.6) + ')', 2, 1);
  for (const r of R.values()) if (r.rev && r.vis) { const [X, Y] = sc(r.x, r.y); ring(r.x, r.y, .9, 16, '#ff4f6d', 1, 1); blob(ctx, X, Y - 47 + Math.round(Math.sin(T * 8) * 1.5), 3, 3, '#ff4f6d'); }
  for (const b of B) { const [X, Y] = sc(b.x, b.y), [x0, y0] = sc(b.px, b.py); for (let i = 0; i < 4; i++) { ctx.fillStyle = i < 2 ? '#fff' : b.col; ctx.fillRect(Math.round(X + (x0 - X) * i / 4), Math.round(Y - 11 + (y0 - Y) * i / 4), 2, 2); } }
  ctx.textAlign = 'center'; ctx.lineWidth = 2; ctx.strokeStyle = '#000';
  for (const p of PP) { const [X, Y] = sc(p.x, p.y); ctx.globalAlpha = 1 - p.t / .9; ctx.font = (p.big ? '9px' : '7px') + ' "Press Start 2P",monospace'; const x = Math.round(X + p.vx * p.t), y = Math.round(Y - 16 - p.t * 28); ctx.strokeText(p.txt, x, y); ctx.fillStyle = p.col; ctx.fillText(p.txt, x, y); } ctx.globalAlpha = 1;
  const c = P.atMax ? '#ffb04a' : '#fff'; ctx.globalAlpha = state == 'cut' ? 0 : 1; ctx.fillStyle = '#000';
  for (const [dx, dy, w2, h2] of [[-6, 0, 4, 1], [3, 0, 4, 1], [0, -6, 1, 4], [0, 3, 1, 4]]) ctx.fillRect(aX + dx + 1, aY + dy + 1, w2, h2);
  ctx.fillStyle = c; for (const [dx, dy, w2, h2] of [[-6, 0, 4, 1], [3, 0, 4, 1], [0, -6, 1, 4], [0, 3, 1, 4], [0, 0, 1, 1]]) ctx.fillRect(aX + dx, aY + dy, w2, h2);
  ctx.globalAlpha = 1;
  if (Math.hypot(P.x - Z.x, P.y - Z.y) > Z.r) { ctx.fillStyle = 'rgba(200,30,120,.16)'; ctx.fillRect(0, 0, W, H); }
  hud();
}

function hud() {
  const wp = WP[P.w];
  $('hp').firstChild.style.width = Math.max(0, P.hp) + '%';
  $('dc').firstChild.style.width = (P.dcd > 0 ? 100 - P.dcd / Sh.DASH_CD * 100 : 100) + '%'; $('dc').firstChild.style.background = P.dcd > 0 ? '#3b7f8c' : '#4fd8f0';
  $('sb').firstChild.style.width = (P.scd > 0 ? 100 - P.scd / Sh.SCAN_CD * 100 : 100) + '%'; $('sb').firstChild.style.background = P.scd > 0 ? '#6b4a9a' : '#c77dff';
  $('sc').textContent = 'KILL ' + P.kills; $('wv').textContent = 'HIDUP ' + alive;
  const hx = '<b>' + wp.n + '</b> ' + P.am[P.w] + ' / ' + P.rs[P.w] + (P.rl > 0 ? ' RELOAD...' : '') + '<br><span class="k' + (P.w == 'r' ? ' on' : '') + '">1</span>RIFLE <span class="k' + (P.w == 's' ? ' on' : '') + '">2</span>SNIPER <span class="k">R</span>RELOAD';
  if (hx != lastHx) { $('hx').innerHTML = hx; lastHx = hx; }
}

function renderReload() {
  const wp = WP[P.w];
  if (P.rl > 0) {
    const [pX, pY] = sc(P.x, P.y), pr = 1 - P.rl / wp.rl, cy = pY - 48; ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.arc(pX, cy, 8, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = '#6fe3d0'; ctx.beginPath(); ctx.arc(pX, cy, 8, -1.571, -1.571 + 6.283 * pr); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = '6px "Press Start 2P",monospace'; ctx.textAlign = 'center'; ctx.fillText('RELOAD', pX, cy - 12);
    if (Math.random() < .35) burst(P.x, P.y, 16, '#6fe3d0', 1, 1.2);
  }
  if (wasRl && P.rl <= 0 && !P.dead) { burst(P.x, P.y, 14, '#fff', 10, 2); pop(P.x, P.y, 'READY', '#6fe3d0', false); }
  wasRl = P.rl > 0;
}

/* ===== cutscene menang / kalah ===== */
const ZC = mk(W * 2, H * 2), zc = ZC.getContext('2d'); zc.imageSmoothingEnabled = false;
const ease = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
function over(win, place, kills) {
  state = 'cut'; fire = false; P.dash = null; P.hide = win ? 1 : 0; P.dead = win ? 0 : 1; P.aimx = P.x; P.aimy = P.y; huds('none');
  cut = { win, t0: T, lt: T, cf: [], fw: [], nfw: 0, msg: '<h1>' + (win ? 'MENANG #1' : 'KALAH #' + place) + '</h1><p>Kill: ' + kills + '</p><p>Klik untuk kembali ke menu</p>' };
  if (win) { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => sfx(f, .4, 'triangle', .07), i * 160)); }
  else { sfx(500, 1.1, 'sawtooth', .08, -420); setTimeout(() => { nz(.3, .5, 300); sfx(60, .3, 'sine', .2, -20); }, 1100); setTimeout(() => [392, 523, 659, 784].forEach((f, i) => setTimeout(() => sfx(f, 2.2, 'sine', .05, 60), i * 300)), 2100); }
}
function renderCut() {
  const c = cut, t = T - c.t0, dt = Math.min(.05, T - c.lt); c.lt = T;
  const [pX, pY0] = sc(P.x, P.y), pY = pY0 - 12, e = ease(t / 1.4), dx = pX + (W / 2 - pX) * e, dy = pY + (H / 2 + 6 - pY) * e;
  const z = c.win ? 1 + 2.2 * ease(t / 1.6) : 1 + 1.6 * ease(t / 1.2) - .4 * ease((t - 2.4) / 2), rz = !c.win && t > 1.9 ? 10 * Math.pow(t - 1.9, 1.7) : 0, bs = rz * .7 * z;
  zc.clearRect(0, 0, W, H); zc.drawImage(cv, 0, 0); ctx.fillStyle = '#030a09'; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(ZC, Math.round(dx - pX * z), Math.round(dy - pY * z + bs), W * z, H * z);
  P.sdx = 1; P.sdy = 1; P.moving = 0; P.rl = 0;
  if (c.win) {
    P.ang = -1.571; P.cheer = 1; P.flash = (t * 2 % 1 < .1) ? .06 : 0; drawChar(P, PST); const jy = Math.round(-Math.abs(Math.sin(t * 6)) * 9 * ease((t - .4) / .4));
    ctx.save(); ctx.translate(Math.round(dx), Math.round(dy)); ctx.scale(z, z); blob(ctx, 0, 12, 6, 2, 'rgba(0,0,0,.35)'); ctx.drawImage(O, -24, 12 - 40 + jy); ctx.restore();
  } else {
    P.ang = .8; P.flash = 0; P.cheer = 0; drawChar(P, PST); const fall = ease((t - .25) / .9) * 1.571, bn = t > 1.15 && t < 1.55 ? -Math.abs(Math.sin((t - 1.15) * 8)) * 3 : 0;
    ctx.save(); ctx.translate(Math.round(dx), Math.round(dy + bs)); ctx.scale(z, z); ctx.translate(0, 12); blob(ctx, 0, 0, 6 + fall * 3, 2, 'rgba(0,0,0,.35)'); ctx.translate(0, bn); ctx.rotate(fall); ctx.drawImage(O, -24, -40); ctx.restore();
    if (t > 1.9) {
      const a = Math.min(1, (t - 1.9) / .4) * (1 - ease((t - 3.6) / 1.6)) * .85; ctx.save(); ctx.globalAlpha = a; ctx.translate(Math.round(dx + Math.sin(t * 3) * 3 * z), Math.round(dy + bs - rz * z)); ctx.scale(z, z); ctx.translate(0, 12); ctx.drawImage(Tc, -24, -40); blob(ctx, 0, -31, 5, 1, '#000'); blob(ctx, 0, -31, 4, 1, '#ffe27a'); ctx.restore(); ctx.globalAlpha = 1;
      if (Math.random() < .5) c.cf.push({ x: dx + rnd(-20, 20), y: dy + bs - rz * z + rnd(-10, 25), vx: 0, vy: -rnd(10, 30), col: '#e8e0ff', s: 1, l: 1 });
    }
  }
  for (const p of c.cf) { p.x += p.vx * dt; p.y += p.vy * dt; p.l -= dt; ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); } c.cf = c.cf.filter(p => p.l > 0 && p.y < H + 6);
  if (c.win) {
    if (t < 4.6) for (let i = 0; i < 3; i++) c.cf.push({ x: rnd(0, W), y: -4, vx: rnd(-20, 20), vy: rnd(40, 90), col: ['#ffd166', '#ff5d8f', '#6fe3d0', '#fff', '#c77dff'][Math.random() * 5 | 0], s: 2 + (Math.random() < .4 ? 1 : 0), l: 6 });
    if (t > .6 && t > c.nfw) { c.nfw = t + .55; const fx = rnd(50, W - 50), fy = rnd(30, 120), col = ['#ffd166', '#ff5d8f', '#6fe3d0', '#fff'][Math.random() * 4 | 0]; for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283; c.fw.push({ x: fx, y: fy, vx: Math.cos(a) * 55, vy: Math.sin(a) * 55, l: 1.1, col }); } nz(.18, .18, 2200); sfx(rnd(500, 900), .15, 'sine', .04, 400); }
    for (const p of c.fw) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 50 * dt; p.l -= dt; ctx.globalAlpha = Math.max(0, p.l); ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); } ctx.globalAlpha = 1; c.fw = c.fw.filter(p => p.l > 0);
    if (t < .35) { ctx.fillStyle = 'rgba(255,255,255,' + .6 * (1 - t / .35) + ')'; ctx.fillRect(0, 0, W, H); }
  } else {
    ctx.fillStyle = 'rgba(12,0,35,' + .5 * ease(t / 2) + ')'; ctx.fillRect(0, 0, W, H); if (t > 4.2) { ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, t - 4.2) + ')'; ctx.fillRect(0, 0, W, H); }
  }
  const bh = Math.round(26 * ease(t / .8)); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
  ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#000';
  if (c.win && t > 1.2) { const k = ease((t - 1.2) / .5); ctx.font = Math.round(8 + 14 * k) + 'px "Press Start 2P",monospace'; ctx.strokeText('MENANG!', W / 2, H - 34); ctx.fillStyle = '#ffd166'; ctx.fillText('MENANG!', W / 2, H - 34); }
  if (!c.win && t > 3) { ctx.globalAlpha = ease((t - 3) / .8) * (1 - Math.min(1, Math.max(0, (t - 4.3) / .8))); ctx.font = '14px "Press Start 2P",monospace'; ctx.strokeText('KALAH...', W / 2, H - 34); ctx.fillStyle = '#c9c3ff'; ctx.fillText('KALAH...', W / 2, H - 34); ctx.globalAlpha = 1; }
  if (t > (c.win ? 5.6 : 5.3)) { state = 'over'; ov.innerHTML = c.msg; ov.style.display = 'flex'; }
}

function render() {
  ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.imageSmoothingEnabled = false;
  renderWorld(); renderReload(); if (state == 'cut' && cut) renderCut();
}

/* ===== jaringan ===== */
sock.on('lobby', m => { if (state == 'lobby') showLobby(m); });

sock.on('start', m => {
  setWorld(m.seed); resetMatch();
  const me = m.ents.find(e => e.id === m.you);
  P = newP(me.x, me.y, m.you, HERO); [camX, camY] = iso(P.x, P.y); Object.assign(PST, STY[HERO]);
  for (const e of m.ents) if (e.id !== m.you) R.set(e.id, mkRemote(e));
  IT = m.items.map(([id, x, y, k]) => ({ id, x, y, k, sx: x, sy: y, t0: -9 }));
  state = 'play'; ov.style.display = 'none'; huds(''); lastHx = ''; ambient(); sfx(440, .15, 'square', .04, 300);
});

sock.on('snap', m => {
  if (state != 'play') return;
  const t = now(), off = m.t - t; srvOff = srvOff === null ? off : srvOff + (off - srvOff) * .05;
  alive = m.n; Z = { x: m.z[0], y: m.z[1], r: m.z[2], ph: m.z[3] };
  const me = m.me;
  P.hp = me.hp; if (T > wLock) P.w = me.w; P.am = me.am; P.rs = me.rs; P.kills = me.k;
  if (me.rl > 0 || T > rlLock) { if (me.rl > 0 && P.rl <= 0 && T > rlLock) reloadSfx(WP[P.w]); P.rl = me.rl; }
  P.dcd = Math.max(P.dcd, me.dcd); P.scd = Math.max(P.scd, me.scd);
  // rekonsiliasi posisi: posisi server + input yang belum di-ack
  pend = pend.filter(c => c.seq > m.ack);
  if (!P.dash && !me.dash) {
    const q = { x: me.x, y: me.y };
    for (const c of pend) if (!c.dash) Sh.applyMove(q, c.dx, c.dy, c.dt, WORLD);
    if (acc > 0) Sh.applyMove(q, inDx, inDy, acc, WORLD);
    const e = Math.hypot(q.x - P.x, q.y - P.y);
    if (e > 1.5) { P.x = q.x; P.y = q.y; } else if (e > .02) { P.x += (q.x - P.x) * .25; P.y += (q.y - P.y) * .25; }
  }
  for (const p of m.ps) {
    let r = R.get(p.id); if (!r) { r = mkRemote({ id: p.id, name: '?', h: 'b', st: 0, x: p.x, y: p.y }); R.set(p.id, r); }
    r.buf.push({ t: m.t, x: p.x, y: p.y, lx: p.lx, ly: p.ly }); if (r.buf.length > 20) r.buf.shift();
    r.w = p.w; r.hp = p.hp; r.rev = p.rev; r.seenAt = t;
  }
});

sock.on('shot', m => {
  if (state != 'play') return;
  B.push({ id: m.b, x: m.x, y: m.y, px: m.x, py: m.y, vx: m.vx, vy: m.vy, d: m.d, col: m.col, sn: m.sn });
  const mine = m.o === P.id, o = mine ? P : R.get(m.o); if (o) o.flash = .06;
  const dd = Math.hypot(m.x - P.x, m.y - P.y), v = mine ? 1 : Math.max(0, 1 - dd / 16);
  if (v > 0) { if (m.sn) { nz(.4, .3 * v, 1500); sfx(80, .45, 'sawtooth', .09 * v, -40); } else { nz(.08, .1 * v, 3500); sfx(rnd(300, 380), .06, 'square', .03 * v, -200); } }
  if (mine) shake = Math.max(shake, m.sn ? 4 : 1.2);
});

sock.on('hit', m => {
  if (state != 'play') return;
  B = B.filter(b => b.id !== m.b);
  const me = m.t === P.id, r = me ? null : R.get(m.t);
  burst(m.x, m.y, 10, me ? '#ff5d6e' : '#fff', 5, 3); if (r) r.f2 = .1;
  if (m.o === P.id) { pop(m.x, m.y, m.n, m.sn ? '#9be9ff' : '#ffe27a', m.sn); sfx(1300, .05, 'square', .04); }
  if (me) { pop(P.x, P.y, '-' + m.n, '#ff5d6e'); shake = 4; sfx(120, .15, 'sawtooth', .06, -60); }
});

sock.on('die', m => {
  if (state != 'play') return;
  burst(m.x, m.y, 6, '#c77dff', 24, 4); RG.push({ x: m.x, y: m.y, t: 0, col: '199,125,255' }); sfx(150, .3, 'triangle', .07, -100); nz(.2, .1, 800); R.delete(m.id);
});

sock.on('loot', m => {
  if (state != 'play') return;
  burst(m.x, m.y, 10, '#ffd166', 14, 5); burst(m.x, m.y, 10, '#ff5d8f', 14, 5); burst(m.x, m.y, 10, '#fff', 8, 6); RG.push({ x: m.x, y: m.y, t: 0, col: '255,209,102' }); sfx(700, .15, 'square', .05, 300); nz(.12, .12, 3500);
  for (const [id, x, y, k] of m.items) IT.push({ id, x, y, k, sx: m.x, sy: m.y, t0: T });
});

sock.on('item-', m => {
  IT = IT.filter(i => i.id !== m.id);
  if (m.by === P.id) { sfx(660, .1, 'square', .04); setTimeout(() => sfx(990, .1, 'square', .04), 90); }
});

sock.on('over', m => { if (state == 'play') over(m.win, m.place, m.kills); });

sock.on('disconnect', () => {
  if (state == 'play' || state == 'lobby' || state == 'cut') {
    state = 'over'; cut = null; huds('none'); fire = false;
    ov.innerHTML = '<h1>TERPUTUS</h1><p>Koneksi ke server hilang</p><p>Klik untuk kembali ke menu</p>'; ov.style.display = 'flex';
  }
});

/* ===== menu & lobby ===== */
const K = t => '<span class="k">' + t + '</span>', MS = c => '<span class="ms ' + c + '"></span>';
function showSel() {
  state = 'menu'; fire = false; huds('none'); resetMatch();
  const rows = [['GERAK', K('W') + K('A') + K('S') + K('D')], ['BIDIK', MS('')], ['TEMBAK', MS('l')], ['RELOAD', K('R')], ['SCAN (60 DTK)', K('Q')], ['TELEPORT', K('SHIFT') + K('SPACE') + MS('r')], ['GANTI SENJATA', K('1') + K('2')]];
  ov.innerHTML = '<div class="sw"><h1>PIXEL ARENA</h1><p>BATTLE ROYALE ONLINE &middot; 7-10 PEMAIN</p><input id="nm" maxlength="12" placeholder="NAMA KAMU" autocomplete="off" value="' + esc(myName) + '"><div class="cards">' +
    '<div class="card" data-h="s"><canvas width="96" height="96"></canvas><b>SNIPER</b><i>CEWEK</i><span>Mulai dengan sniper.<br>Tembakan jauh, damage besar.</span></div>' +
    '<div class="card" data-h="r"><canvas width="96" height="96"></canvas><b>RIFLEMAN</b><i>COWOK</i><span>Mulai dengan rifle.<br>Tembak cepat, peluru banyak.</span></div></div>' +
    '<div class="keys">' + rows.map(r => '<div class="cr"><div class="kk">' + r[1] + '</div><em>' + r[0] + '</em></div>').join('') + '</div><button id="go">CARI MATCH</button></div>';
  ov.style.display = 'flex'; const cs = [...ov.querySelectorAll('.card')];
  const sel = (h, quiet) => { HERO = h; cs.forEach(c => c.classList.toggle('on', c.dataset.h == h)); if (!quiet) sfx(520, .05, 'square', .03); };
  cs.forEach(c => { pv(c.querySelector('canvas'), c.dataset.h); c.onclick = () => sel(c.dataset.h); }); sel(HERO, true); $('go').onclick = join;
}
function join() {
  myName = ($('nm').value.replace(/[^\w \-.]/g, '').trim() || 'PLAYER').slice(0, 12); try { localStorage.setItem('pa_name', myName); } catch (e) { }
  ambient(); sock.emit('join', { name: myName, hero: HERO }); state = 'lobby'; showLobby(null);
}
function showLobby(m) {
  ov.innerHTML = '<div class="sw"><h1>MENCARI PEMAIN</h1><p>' + (m ? m.n + ' / ' + m.max + ' pemain' : 'Menghubungkan...') + '</p><p>' +
    (m ? (m.cd != null ? 'Match mulai dalam ' + m.cd + ' dtk' : 'Menunggu minimal ' + m.min + ' pemain') : '') + '</p><p class="nl">' + (m ? m.names.map(esc).join('<br>') : '') + '</p><button id="cx">BATAL</button></div>';
  ov.style.display = 'flex'; $('cx').onclick = () => { sock.emit('leave'); showSel(); };
}
ov.onclick = () => { if (state == 'over') { sock.emit('leave'); showSel(); } };
setInterval(() => { if (state == 'menu') document.querySelectorAll('.card canvas').forEach(c => pv(c, c.parentNode.dataset.h)); }, 90);

/* ===== input ===== */
addEventListener('keydown', e => {
  if (e.target.tagName == 'INPUT') { if (e.code == 'Enter' && state == 'menu') join(); return; }
  keys[e.code] = 1;
  if (['Space', 'ShiftLeft', 'ShiftRight'].includes(e.code)) { e.preventDefault(); doDash(); }
  if (state == 'menu' && e.code == 'Enter') join();
  if (state != 'play') return;
  if (e.code == 'KeyR') doReload();
  if (e.code == 'Digit1') setWeapon('r'); if (e.code == 'Digit2') setWeapon('s');
  if (e.code == 'KeyQ') doScan();
});
addEventListener('keyup', e => keys[e.code] = 0);
addEventListener('blur', () => { for (const k in keys) keys[k] = 0; fire = false; });
addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width * W; my = (e.clientY - r.top) / r.height * H; });
addEventListener('mousedown', e => { if (state != 'play') return; if (e.button == 0) fire = true; if (e.button == 2) doDash(); });
addEventListener('mouseup', e => { if (e.button == 0) fire = false; });
addEventListener('contextmenu', e => e.preventDefault());

/* ===== loop ===== */
let last = performance.now();
function loop(n) {
  const dt = Math.min(.05, (n - last) / 1000); last = n; T += dt;
  if (state == 'play') { update(dt); updRemotes(dt); }
  render(); requestAnimationFrame(loop);
}
showSel(); requestAnimationFrame(loop);
