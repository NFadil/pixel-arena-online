/* shared.js — logika bersama client & server (dunia, gerak, dash, senjata) */
const Shared = (function () {
  const N = 56, PX = N / 2, PY = N / 2;
  const DASH_CD = 6, SCAN_CD = 60, DASH_MAX = 6.5, DASH_MIN = 2.5, DASH_DUR = .16, SPEED = 4.8, PR = .32;

  const WP = {
    r: { n: 'RIFLE', mag: 30, rl: 1.7, rng: 11, dmg: 9, cd: .14, spd: 38, spread: .05, col: '#ffe27a' },
    s: { n: 'SNIPER', mag: 5, rl: 2.6, rng: 20, dmg: 70, cd: 1.1, spd: 85, spread: 0, col: '#9be9ff' }
  };

  // danau (cx, cy, radius) — dipakai gambar tanah (client) dan tabrakan (server+client)
  const LAKES = [[12, 41, 5.2], [46, 45, 4.4], [9, 11, 3.6], [26, 49, 3]];
  function water(x, y) {
    for (const [cx, cy, r] of LAKES) {
      const dx = x - cx, dy = y - cy;
      if (Math.hypot(dx, dy) < r + .9 * Math.sin(Math.atan2(dy, dx) * 3 + cx)) return true;
    }
    return false;
  }
  // tile (i,j) digambar berpusat di dunia (i,j) tapi disampel di (i+.5, j+.5)
  const isWater = (x, y) => water(Math.round(x) + .5, Math.round(y) + .5);

  function makeWorld(seed) {
    let s = (seed >>> 0) || 1;
    const rand = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const obs = [];
    for (let tries = 0; tries < 4000 && obs.length < 190; tries++) {
      const x = 1.5 + rand() * (N - 3), y = 1.5 + rand() * (N - 3);
      if (Math.hypot(x - PX, y - PY) < 6.5) continue;
      if (isWater(x, y) || isWater(x + .8, y) || isWater(x - .8, y) || isWater(x, y + .8) || isWater(x, y - .8)) continue;
      if (obs.some(q => Math.hypot(q.x - x, q.y - y) < 1.7)) continue;
      const k = rand() < .72 ? 't' : 'r', sc = k == 't' ? .85 + rand() * .4 : 1;
      obs.push({ x, y, k, s: sc, r: k == 't' ? .3 * sc : .5 });
    }
    const CS = 4, nb = Math.ceil(N / CS) + 1, grid = Array.from({ length: nb * nb }, () => []);
    for (const q of obs) grid[((q.x / CS) | 0) * nb + ((q.y / CS) | 0)].push(q);
    function blocked(x, y, r = PR, bullet = false) {
      if (x < .5 + r || y < .5 + r || x > N - 1.5 - r || y > N - 1.5 - r) return true;
      if (!bullet && isWater(x, y)) return true;
      const cx = (x / CS) | 0, cy = (y / CS) | 0;
      for (let i = cx - 1; i <= cx + 1; i++) for (let j = cy - 1; j <= cy + 1; j++) {
        if (i < 0 || j < 0 || i >= nb || j >= nb) continue;
        for (const q of grid[i * nb + j]) { const dx = x - q.x, dy = y - q.y, rr = q.r + r; if (dx * dx + dy * dy < rr * rr) return true; }
      }
      return false;
    }
    return { obs, blocked };
  }

  // input layar (W = atas) -> arah dunia isometrik
  function applyMove(p, dx, dy, dt, W) {
    p.moving = 0;
    const wx = dx + dy, wy = dy - dx, wl = Math.hypot(wx, wy);
    if (!wl || dt <= 0) return;
    const ux = wx / wl, uy = wy / wl;
    let left = dt;
    while (left > 1e-6) {
      const h = Math.min(left, .04), nx = p.x + ux * SPEED * h, ny = p.y + uy * SPEED * h;
      if (!W.blocked(nx, ny, PR)) { p.x = nx; p.y = ny; p.moving = 1; }
      else if (!W.blocked(nx, p.y, PR)) { p.x = nx; p.moving = 1; }
      else if (!W.blocked(p.x, ny, PR)) { p.y = ny; p.moving = 1; }
      left -= h;
    }
  }

  function startDash(p, ax, ay) {
    if (p.dash || p.dcd > 0) return false;
    let dx = ax - p.x, dy = ay - p.y, d = Math.hypot(dx, dy);
    if (d < .3) { dx = p.lx || 1; dy = p.ly || 0; d = Math.hypot(dx, dy) || 1; }
    dx /= d; dy /= d; d = Math.max(DASH_MIN, Math.min(d, DASH_MAX));
    p.dash = { dx, dy, left: d, speed: d / DASH_DUR, t: 0, dur: DASH_DUR, ang: Math.atan2((dx + dy) * 8, (dx - dy) * 16) };
    p.dcd = DASH_CD; p.moving = 0;
    return true;
  }

  function stepDash(p, dt, W) {
    const s = p.dash; if (!s) return true;
    let step = Math.min(s.left, s.speed * dt);
    s.t += dt;
    while (step > 1e-6) {
      const h = Math.min(step, .25), nx = p.x + s.dx * h, ny = p.y + s.dy * h;
      if (W.blocked(nx, ny, PR)) { s.left = 0; break; }
      p.x = nx; p.y = ny; step -= h; s.left -= h;
    }
    if (s.left <= .001 || s.t >= s.dur + .05) { p.dash = null; return true; }
    return false;
  }

  return { N, PX, PY, WP, DASH_CD, SCAN_CD, PR, SPEED, water, isWater, makeWorld, applyMove, startDash, stepDash };
})();
if (typeof module !== 'undefined') module.exports = Shared;
