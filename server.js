/* server.js — Pixel Arena Online (Node + Socket.IO), server otoritatif 30 Hz */
const path = require('path'), http = require('http'), express = require('express'), { Server } = require('socket.io');
const Sh = require('./public/shared.js'), WP = Sh.WP;

const PORT = +process.env.PORT || 3000;
const MAX = 10, MIN_TOTAL = 7;                       // total pemain per match (sisa diisi bot)
const MIN_HUMANS = +process.env.MIN_HUMANS || 1;     // minimal manusia untuk mulai hitung mundur
const WAIT = +process.env.WAIT || 15;                // detik hitung mundur lobby
const VIS = 10.5, VIS2 = 8;                          // jarak pandang di sekitar pemain / titik bidik
const ZPH = [[25, 30, 30], [20, 25, 18], [15, 20, 9], [10, 15, 3], [8, 12, .8]]; // [tahan, kecil, radius akhir]
const BOT_NAMES = ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT', 'GOLF', 'HOTEL', 'INDIA', 'JULIET'];

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r2 = v => Math.round(v * 100) / 100;
const num = (v, d = 0) => Number.isFinite(+v) ? +v : d;
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; };

let nextId = 1, nextItem = 1, nextBullet = 1;
const lobby = [], matches = new Set();
let cdEnd = null;

function mkEnt(name, hero, bot, st, sock) {
  return {
    id: nextId++, name, h: hero, st, bot, sock, M: null, x: 0, y: 0, hp: 100, w: hero == 's' ? 's' : 'r',
    am: { r: 30, s: 5 }, rs: hero == 's' ? { r: 60, s: 20 } : { r: 120, s: 10 },
    rl: 0, cd: 0, sw: 0, scd: 0, dcd: 0, dash: null, kills: 0, alive: true, moving: 0,
    lx: 1, ly: 0, ax: 0, ay: 0, f: 0, q: [], ack: 0, tb: .3, revUntil: 0, revIds: [],
    brain: bot ? { think: 0, gx: Sh.PX, gy: Sh.PY, wt: 0, tg: null, vis: false, strafe: Math.random() < .5 ? 1 : -1, keep: 6, react: 0, nx: 0, ny: 0, stuck: 0 } : null
  };
}

/* ===== lobby ===== */
function lobbyBroadcast(cd) {
  const list = lobby.slice(0, MAX), m = { n: list.length, max: MAX, min: MIN_HUMANS, cd, names: list.map(l => l.name) };
  for (const l of lobby) l.sock.emit('lobby', m);
}
setInterval(() => {
  if (lobby.length >= MIN_HUMANS) {
    const t = Date.now() / 1000;
    if (cdEnd == null) cdEnd = t + WAIT;
    if (lobby.length >= MAX) cdEnd = Math.min(cdEnd, t + 3);
    const cd = Math.max(0, Math.ceil(cdEnd - t));
    if (cd <= 0) { cdEnd = null; startMatch(lobby.splice(0, MAX)); return; }
    lobbyBroadcast(cd);
  } else { cdEnd = null; if (lobby.length) lobbyBroadcast(null); }
}, 1000);

/* ===== match ===== */
function spawnPoint(M) {
  for (let i = 0; i < 200; i++) {
    const x = rnd(3, Sh.N - 3), y = rnd(3, Sh.N - 3);
    if (M.world.blocked(x, y, .8)) continue;
    if (M.ents.some(e => e.alive && (e.x || e.y) && Math.hypot(e.x - x, e.y - y) < (i < 150 ? 9 : 3))) continue;
    return [x, y];
  }
  return [Sh.PX + rnd(-3, 3), Sh.PY + rnd(-3, 3)];
}

function startMatch(list) {
  const M = { ents: [], items: new Map(), bullets: [], over: false, t: 0, seed: (Math.random() * 1e9) | 0 };
  M.world = Sh.makeWorld(M.seed);
  M.zone = { x: Sh.PX, y: Sh.PY, r: 52, ph: 0, mode: 'hold', t: 0, from: 52, fx: Sh.PX, fy: Sh.PY, tr: 30, tx: Sh.PX, ty: Sh.PY };
  for (const l of list) { const e = mkEnt(l.name, l.hero, false, 0, l.sock); e.M = M; M.ents.push(e); l.sock.ent = e; }
  const nb = Math.max(0, MIN_TOTAL - list.length), names = shuffle(BOT_NAMES);
  for (let i = 0; i < nb; i++) {
    const e = mkEnt(names[i % names.length], 'b', true, i % 6, null); e.M = M;
    e.w = Math.random() < .35 ? 's' : 'r'; e.rs = { r: 90, s: 10 }; M.ents.push(e);
  }
  for (const e of M.ents) { [e.x, e.y] = spawnPoint(M); e.ax = e.x + 1; e.ay = e.y; }
  for (let i = 0; i < 40; i++) {
    let x, y, n = 0; do { x = rnd(2, Sh.N - 2); y = rnd(2, Sh.N - 2); } while (M.world.blocked(x, y, .5) && ++n < 50);
    const it = { id: nextItem++, x, y, k: i % 2 ? 'a' : 'h' }; M.items.set(it.id, it);
  }
  const items = [...M.items.values()].map(i => [i.id, r2(i.x), r2(i.y), i.k]);
  for (const e of M.ents) if (e.sock) {
    e.sock.emit('start', {
      seed: M.seed, you: e.id, items,
      ents: M.ents.map(o => ({ id: o.id, name: o.name, h: o.h, st: o.st, x: o === e ? o.x : 0, y: o === e ? o.y : 0 }))
    });
  }
  matches.add(M);
}

const bcast = (M, ev, data) => { for (const e of M.ents) if (e.sock) e.sock.emit(ev, data); };

function updZone(M, dt) {
  const z = M.zone; z.t += dt;
  const P = ZPH[Math.min(z.ph, ZPH.length - 1)];
  if (z.mode == 'hold') {
    if (z.t >= P[0]) {
      z.mode = 'shrink'; z.t = 0; z.from = z.r; z.fx = z.x; z.fy = z.y; z.tr = P[2];
      const a = rnd(0, 6.283), d = rnd(0, Math.max(0, z.r - z.tr) * .5);
      z.tx = z.fx + Math.cos(a) * d; z.ty = z.fy + Math.sin(a) * d;
    }
  } else {
    const k = Math.min(1, z.t / P[1]);
    z.r = z.from + (z.tr - z.from) * k; z.x = z.fx + (z.tx - z.fx) * k; z.y = z.fy + (z.ty - z.fy) * k;
    if (k >= 1) { z.mode = 'hold'; z.t = 0; z.ph++; }
  }
}

function startReload(e) {
  const wp = WP[e.w];
  if (e.rl > 0 || e.dash || e.am[e.w] >= wp.mag || e.rs[e.w] <= 0) return;
  e.rl = wp.rl;
}
function finishReload(e) {
  const wp = WP[e.w], take = Math.min(wp.mag - e.am[e.w], e.rs[e.w]);
  e.am[e.w] += take; e.rs[e.w] -= take;
}
function setWeapon(e, w) { if (e.w == w) return; e.w = w; e.rl = 0; e.sw = .4; }

function tryFire(M, e) {
  const wp = WP[e.w];
  if (e.dash || e.rl > 0 || e.cd > 0 || e.sw > 0) return;
  if (e.am[e.w] <= 0) { startReload(e); return; }
  let dx = e.ax - e.x, dy = e.ay - e.y, d = Math.hypot(dx, dy);
  if (d < .3) { dx = e.lx; dy = e.ly; d = Math.hypot(dx, dy) || 1; }
  const a = Math.atan2(dy, dx) + (Math.random() - .5) * wp.spread * 2, ux = Math.cos(a), uy = Math.sin(a);
  const b = { id: nextBullet++, o: e.id, x: e.x + ux * .5, y: e.y + uy * .5, vx: ux * wp.spd, vy: uy * wp.spd, d: wp.rng, dmg: wp.dmg, sn: e.w == 's' ? 1 : 0, col: wp.col };
  M.bullets.push(b); e.am[e.w]--; e.cd = wp.cd;
  const msg = { b: b.id, o: e.id, x: r2(b.x), y: r2(b.y), vx: r2(b.vx), vy: r2(b.vy), d: b.d, col: b.col, sn: b.sn };
  for (const o of M.ents) if (o.sock && o.alive && Math.hypot(o.x - e.x, o.y - e.y) < 32) o.sock.emit('shot', msg);
  if (e.am[e.w] <= 0) startReload(e);
}

function kill(M, e, k) {
  if (!e.alive) return;
  e.alive = false; e.dash = null; e.f = 0;
  if (k && k !== e) k.kills++;
  const left = M.ents.filter(x => x.alive).length;
  bcast(M, 'die', { id: e.id, x: r2(e.x), y: r2(e.y) });
  const items = [];
  for (const kind of ['a', 'h']) {
    let x = e.x + rnd(-1.4, 1.4), y = e.y + rnd(-1.4, 1.4); if (M.world.blocked(x, y, .2)) { x = e.x; y = e.y; }
    const it = { id: nextItem++, x, y, k: kind }; M.items.set(it.id, it); items.push([it.id, r2(x), r2(y), kind]);
  }
  bcast(M, 'loot', { x: r2(e.x), y: r2(e.y), items });
  if (e.sock) e.sock.emit('over', { win: false, place: left + 1, kills: e.kills });
}

function stepBullets(M, dt) {
  const keep = [];
  for (const b of M.bullets) {
    const sp = Math.hypot(b.vx, b.vy), len = Math.min(sp * dt, b.d), n = Math.max(1, Math.ceil(len / .35)), sc = sp * dt > 0 ? len / (sp * dt) : 0;
    const sx = b.vx * dt * sc / n, sy = b.vy * dt * sc / n; let dead = false;
    for (let i = 0; i < n && !dead; i++) {
      b.x += sx; b.y += sy;
      if (M.world.blocked(b.x, b.y, .05, true)) { dead = true; break; }
      for (const t of M.ents) {
        if (!t.alive || t.dash || t.id === b.o || Math.hypot(t.x - b.x, t.y - b.y) > .5) continue;
        const o = M.ents.find(q => q.id === b.o);
        t.hp -= b.dmg; bcast(M, 'hit', { b: b.id, t: t.id, x: r2(b.x), y: r2(b.y), n: b.dmg, sn: b.sn, o: b.o });
        if (t.hp <= 0) kill(M, t, o);
        dead = true; break;
      }
    }
    b.d -= len; if (b.d <= .001) dead = true;
    if (!dead) keep.push(b);
  }
  M.bullets = keep;
}

function pickups(M, e) {
  for (const it of M.items.values()) {
    if (Math.hypot(it.x - e.x, it.y - e.y) > 1) continue;
    if (it.k == 'h') { if (e.hp >= 100) continue; e.hp = Math.min(100, e.hp + 35); }
    else { e.rs.r += 30; e.rs.s += 4; }
    M.items.delete(it.id); bcast(M, 'item-', { id: it.id, by: e.id });
  }
}

function cleanInp(m) {
  m = m || {}; const lx = num(m.lx, 1), ly = num(m.ly, 0), l = Math.hypot(lx, ly) || 1;
  return { seq: num(m.seq) | 0, dx: Math.sign(num(m.dx)), dy: Math.sign(num(m.dy)), dt: clamp(num(m.dt), 0, .1), lx: lx / l, ly: ly / l, ax: num(m.ax), ay: num(m.ay), f: m.f ? 1 : 0 };
}
function processInputs(M, e) {
  const q = e.q; e.q = [];
  for (const m of q) {
    const dt = Math.min(m.dt, e.tb); e.tb -= dt;
    if (!e.dash) Sh.applyMove(e, m.dx, m.dy, dt, M.world);
    e.ack = m.seq; e.lx = m.lx; e.ly = m.ly; e.ax = m.ax; e.ay = m.ay; e.f = m.f;
  }
  if (e.dash) e.moving = 0;
}

/* ===== bot AI ===== */
function los(W, x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / .4);
  for (let i = 1; i < n; i++) { const t = i / n; if (W.blocked(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, .05, true)) return false; }
  return true;
}
function pickGoal(M, b) {
  const z = M.zone;
  for (let i = 0; i < 20; i++) {
    const a = rnd(0, 6.283), r = rnd(0, z.r * .7), x = z.x + Math.cos(a) * r, y = z.y + Math.sin(a) * r;
    if (!M.world.blocked(x, y, .6)) { b.gx = x; b.gy = y; b.wt = rnd(4, 9); return; }
  }
  b.gx = z.x; b.gy = z.y; b.wt = 3;
}
function decide(M, e, b) {
  const z = M.zone, prev = b.tg;
  b.tg = null; b.vis = false; b.wt -= .3;
  if (Math.random() < .25) b.strafe *= -1;
  if (Math.hypot(e.x - z.x, e.y - z.y) > z.r - 3) { b.gx = z.x + rnd(-2, 2); b.gy = z.y + rnd(-2, 2); return; }
  let best = null, bd = e.w == 's' ? 17 : 12.5;
  for (const o of M.ents) {
    if (!o.alive || o === e || o.dash) continue;
    const d = Math.hypot(o.x - e.x, o.y - e.y);
    if (d < bd && los(M.world, e.x, e.y, o.x, o.y)) { best = o; bd = d; }
  }
  if (best) {
    b.tg = best; b.vis = true; if (prev !== best) b.react = rnd(.5, 1.1);
    const err = .5 + bd * .13; b.nx = rnd(-err, err); b.ny = rnd(-err, err);
    if (e.sw <= 0 && e.am[e.w] + e.rs[e.w] <= 0) setWeapon(e, e.w == 'r' ? 's' : 'r');
    b.keep = e.w == 's' ? 12 : rnd(5, 7);
    if (e.dcd <= 0 && e.hp < 45 && bd < 8 && Math.random() < .4) { const dx = (e.x - best.x) / bd, dy = (e.y - best.y) / bd; Sh.startDash(e, e.x + dx * 6, e.y + dy * 6); }
    return;
  }
  // cari item
  const wantH = e.hp < 70, wantA = e.am[e.w] + e.rs[e.w] < 45; let it = null, id2 = 16;
  for (const i of M.items.values()) {
    if (!((i.k == 'h' && wantH) || (i.k == 'a' && wantA))) continue;
    const d = Math.hypot(i.x - e.x, i.y - e.y); if (d < id2) { it = i; id2 = d; }
  }
  if (it) { b.gx = it.x; b.gy = it.y; return; }
  if (e.rl <= 0 && e.am[e.w] < WP[e.w].mag * .6 && e.rs[e.w] > 0) startReload(e);
  if (Math.hypot(b.gx - e.x, b.gy - e.y) < 2 || b.wt <= 0) pickGoal(M, b);
}
function botAI(M, e, dt) {
  const b = e.brain; b.think -= dt; b.react = Math.max(0, b.react - dt);
  if (b.think <= 0) { b.think = rnd(.2, .4); decide(M, e, b); }
  let mx = 0, my = 0;
  if (b.tg && b.tg.alive) {
    const dx = b.tg.x - e.x, dy = b.tg.y - e.y, d = Math.hypot(dx, dy) || 1, k = d > b.keep + 1.5 ? 1 : d < b.keep - 1.5 ? -1 : 0;
    mx = dx / d * k - dy / d * b.strafe * .8; my = dy / d * k + dx / d * b.strafe * .8;
  } else {
    const dx = b.gx - e.x, dy = b.gy - e.y, d = Math.hypot(dx, dy);
    if (d > 1) { mx = dx / d; my = dy / d; }
  }
  if (e.dash) e.moving = 0;
  else if (mx || my) Sh.applyMove(e, (mx - my) / 2, (mx + my) / 2, dt, M.world); else e.moving = 0;
  b.stuck = Math.max(0, b.stuck + ((mx || my) && !e.moving ? dt : -dt));
  if (b.stuck > .6) { b.stuck = 0; b.strafe *= -1; pickGoal(M, b); }
  if (b.tg && b.tg.alive && b.vis) {
    const dx = b.tg.x - e.x, dy = b.tg.y - e.y, d = Math.hypot(dx, dy) || 1;
    e.ax = b.tg.x + b.nx; e.ay = b.tg.y + b.ny; e.lx = dx / d; e.ly = dy / d;
    e.f = (b.react <= 0 && d < WP[e.w].rng * .95) ? 1 : 0;
  } else {
    e.f = 0;
    if (mx || my) { const l = Math.hypot(mx, my); e.lx = mx / l; e.ly = my / l; }
    e.ax = e.x + e.lx * 3; e.ay = e.y + e.ly * 3;
  }
}

/* ===== loop ===== */
function tickMatch(M, dt) {
  M.t += dt;
  updZone(M, dt);
  const z = M.zone;
  for (const e of M.ents.filter(x => x.alive)) {
    if (!e.alive) continue;
    e.cd -= dt; e.scd -= dt; e.dcd -= dt; e.sw -= dt; e.tb = Math.min(.5, e.tb + dt * 1.25);
    if (e.bot) botAI(M, e, dt); else processInputs(M, e);
    if (e.dash) Sh.stepDash(e, dt, M.world);
    if (e.rl > 0) { e.rl -= dt; if (e.rl <= 0) { e.rl = 0; finishReload(e); } }
    if (e.f && !e.dash) tryFire(M, e);
    pickups(M, e);
    if (Math.hypot(e.x - z.x, e.y - z.y) > z.r) { e.hp -= (2 + Math.min(z.ph, 5) * 2) * dt; if (e.hp <= 0) kill(M, e, null); }
  }
  stepBullets(M, dt);
  const al = M.ents.filter(e => e.alive), humans = al.filter(e => !e.bot);
  if (al.length <= 1 || humans.length === 0) {
    M.over = true; const w = al[0];
    if (w && !w.bot && w.sock) w.sock.emit('over', { win: true, place: 1, kills: w.kills });
    for (const e of M.ents) if (e.sock) e.sock.ent = null;
    matches.delete(M); return;
  }
  snapshots(M, al);
}

function snapshots(M, alive) {
  const now = Date.now() / 1000, z = M.zone, zz = [r2(z.x), r2(z.y), r2(z.r), z.ph];
  for (const e of M.ents) {
    if (!e.sock || !e.alive) continue;
    const wp = WP[e.w]; let dx = e.ax - e.x, dy = e.ay - e.y; const d = Math.hypot(dx, dy);
    if (d > wp.rng) { dx *= wp.rng / d; dy *= wp.rng / d; }
    const ax = e.x + dx, ay = e.y + dy, scan = now < e.revUntil, ps = [];
    for (const o of alive) {
      if (o === e) continue;
      const rev = scan && e.revIds.includes(o.id);
      if (rev || Math.hypot(o.x - e.x, o.y - e.y) < VIS || Math.hypot(o.x - ax, o.y - ay) < VIS2)
        ps.push({ id: o.id, x: r2(o.x), y: r2(o.y), lx: r2(o.lx), ly: r2(o.ly), w: o.w, hp: Math.round(o.hp), rev: rev ? 1 : 0 });
    }
    e.sock.emit('snap', {
      t: now, n: alive.length, z: zz, ack: e.ack, ps,
      me: { x: r2(e.x), y: r2(e.y), hp: Math.round(e.hp), w: e.w, am: e.am, rs: e.rs, k: e.kills, rl: r2(e.rl), dcd: r2(Math.max(0, e.dcd)), scd: r2(Math.max(0, e.scd)), dash: e.dash ? 1 : 0 }
    });
  }
}

let last = Date.now();
setInterval(() => {
  const n = Date.now(), dt = Math.min(.1, (n - last) / 1000); last = n;
  for (const M of [...matches]) { try { tickMatch(M, dt); } catch (err) { console.error('tick error', err); matches.delete(M); } }
}, 1000 / 30);

/* ===== socket ===== */
function dropSock(sock) {
  const i = lobby.findIndex(l => l.sock === sock); if (i >= 0) lobby.splice(i, 1);
  const e = sock.ent; sock.ent = null;
  if (e) { e.sock = null; if (e.alive && e.M && !e.M.over) kill(e.M, e, null); }
}

io.on('connection', sock => {
  sock.ent = null;
  const live = () => { const e = sock.ent; return e && e.alive && e.M && !e.M.over ? e : null; };
  sock.on('join', m => {
    if (sock.ent || lobby.some(l => l.sock === sock)) return;
    m = m || {};
    const name = String(m.name || '').replace(/[^\w \-.]/g, '').trim().slice(0, 12) || 'PLAYER';
    lobby.push({ sock, name, hero: m.hero == 'r' ? 'r' : 's' });
    lobbyBroadcast(null);
  });
  sock.on('leave', () => dropSock(sock));
  sock.on('disconnect', () => dropSock(sock));
  sock.on('inp', m => { const e = live(); if (e && e.q.length < 120) e.q.push(cleanInp(m)); });
  sock.on('dash', m => { const e = live(); if (e && m) Sh.startDash(e, num(m.ax), num(m.ay)); });
  sock.on('rld', () => { const e = live(); if (e) startReload(e); });
  sock.on('wpn', w => { const e = live(); if (e && (w == 'r' || w == 's')) setWeapon(e, w); });
  sock.on('scan', () => {
    const e = live(); if (!e || e.scd > 0) return;
    e.scd = Sh.SCAN_CD; e.revUntil = Date.now() / 1000 + 3.5;
    e.revIds = e.M.ents.filter(o => o.alive && o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 36).map(o => o.id);
  });
});

server.listen(PORT, () => console.log('Pixel Arena Online di http://localhost:' + PORT));
