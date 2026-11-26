/* sprites.js — karakter hi-res (96px) untuk Pixel Arena Online */
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const O = mk(96, 96), o = O.getContext('2d'), Tc = mk(96, 96), tc = Tc.getContext('2d');
o.imageSmoothingEnabled = false; tc.imageSmoothingEnabled = false;

const PST = { j: '#5b6270', d: '#434956', h: '#3a2820', hl: '#5a4032' };
// gaya karakter pemain: s = sniper (cewek), r = rifleman (cowok)
const STY = {
  s: { j: '#6b4a2f', d: '#4a3020', h: '#1b1a2e', hl: '#34335a', fem: 1, band: 0, pn: '#2b2f3a', bt: '#6b4a2f' },
  r: { j: '#7d8590', d: '#5b626c', h: '#15131a', hl: '#2d2a38', fem: 0, band: 1, pn: '#4a4f3a', bt: '#4a3020' }
};
// gaya bot
const BST = [
  { j: '#7a3f66', d: '#58294a', h: '#e8e0ff', hl: '#fff' }, { j: '#2f6f73', d: '#1f4d52', h: '#17121c', hl: '#3b3347' },
  { j: '#8a5a2b', d: '#5f3b18', h: '#c9a227', hl: '#e8c84a' }, { j: '#3d4f9a', d: '#28356d', h: '#8a3b3b', hl: '#b55' },
  { j: '#6b2f2f', d: '#4a1e1e', h: '#2a2a2a', hl: '#444' }, { j: '#4a7a3a', d: '#2f5224', h: '#6b4a2f', hl: '#8a6540' }
];
const PVA = { s: { sdx: 1, sdy: 1, ang: .6, moving: 1, flash: 0, w: 's' }, r: { sdx: 1, sdy: 1, ang: .6, moving: 1, flash: 0, w: 'r' } };

const SKIN = '#e9b98f', SKIN_D = '#c48f6a';
const rc = (x, y, w, h, c) => { o.fillStyle = c; o.fillRect(Math.round(x), Math.round(y), w, h); };
function pline(x0, y0, x1, y1, th, c) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); o.fillStyle = c;
  for (let i = 0; i <= n; i++) { const t = i / n; o.fillRect(Math.round(x0 + (x1 - x0) * t - th / 2), Math.round(y0 + (y1 - y0) * t - th / 2), th, th); }
}

// menggambar karakter ke kanvas O (96x96, kaki di y~80) dan siluet ke Tc
function drawChar(a = P, st = PST) {
  o.clearRect(0, 0, 96, 96);
  const front = a.sdy >= 0, f = a.sdx >= 0 ? 1 : -1, wl = a.w == 's', id = a.id || 0, cheer = a.cheer;
  const mv = a.moving ? 1 : 0, ph = T * 11 + id * 1.7, ang = a.ang || 0;
  const bob = mv ? Math.round(Math.abs(Math.cos(ph)) * 2) : 0;
  const cx = 48, pn = st.pn || st.d, bt = st.bt || '#2a2320', fem = st.fem;

  // kaki
  for (const s of [-1, 1]) {
    const lift = mv ? Math.max(0, Math.sin(ph + (s > 0 ? 0 : Math.PI))) * 4 : 0, x = cx + s * 5 - 3, yb = Math.round(78 - lift);
    rc(x, 62 - bob, 6, yb - 4 - (62 - bob), pn); rc(x - 1, yb - 4, 8, 5, bt); rc(x - 1, yb - 4, 8, 1, '#00000033');
  }

  const gx = Math.cos(ang), gy = Math.sin(ang), behind = gy < -.35;
  const drawGun = () => {
    const sy = 46 - bob, hx = cx + gx * 7, hyy = sy + 3 + gy * 4, L = wl ? 28 : 18;
    pline(cx - f * 7, sy, hx + gx * 5, hyy + gy * 2, 4, st.d);                       // lengan jauh
    const x0 = hx - gx * 6, y0 = hyy - gy * 6, x1 = hx + gx * L, y1 = hyy + gy * L;
    pline(x0, y0, hx, hyy, 4, '#6b4a2f');                                            // popor
    pline(hx, hyy, x1, y1, 3, '#2b2f36'); pline(hx + gx * 2, hyy + gy * 2 - 1, x1, y1 - 1, 1, '#4a515c');
    if (wl) { pline(hx + gx * 6, hyy + gy * 6 - 3, hx + gx * 15, hyy + gy * 15 - 3, 2, '#14161a'); rc(hx + gx * 15 - 1, hyy + gy * 15 - 4, 2, 2, '#9be9ff'); }
    else rc(hx + gx * 6 - 1, hyy + gy * 6 + 2, 3, 6, '#1a1c20');
    pline(cx + f * 7, sy, hx, hyy, 5, st.j); rc(hx - 2, hyy - 2, 5, 5, SKIN);        // lengan dekat + tangan
    if (a.flash > 0) { const tx = x1 + gx * 3, ty = y1 + gy * 3, k = wl ? 6 : 4; rc(tx - k, ty - k, k * 2 + 1, k * 2 + 1, 'rgba(255,214,102,.9)'); rc(tx - 2, ty - 2, 5, 5, '#fff'); }
  };
  const drawCheer = () => {
    for (const s of [-1, 1]) {
      const hyc = 27 - bob + Math.round(Math.sin(T * 12 + s * 2) * 2);
      pline(cx + s * 8, 46 - bob, cx + s * 14, hyc, 5, st.j); rc(cx + s * 14 - 2, hyc - 3, 5, 5, SKIN);
    }
  };

  // badan
  const drawTorso = () => {
    const ty = 40 - bob;
    if (fem) { rc(cx - 9, ty, 18, 10, st.j); rc(cx - 7, ty + 10, 14, 13, st.j); rc(cx + 5, ty, 4, 10, st.d); rc(cx + 3, ty + 10, 4, 13, st.d); rc(cx - 7, ty + 17, 14, 3, st.d); }
    else { rc(cx - 9, ty, 18, 23, st.j); rc(cx + 5, ty, 4, 23, st.d); rc(cx - 9, ty + 17, 18, 3, st.d); }
    rc(cx - 2, ty + 17, 4, 3, '#c9a227');
    if (front) rc(cx - 1, ty + 2, 2, 15, st.d);
  };

  if (behind && !cheer) drawGun();
  drawTorso();
  if (cheer) drawCheer(); else if (!behind) drawGun();

  // kepala
  const hy = 21 - bob;
  if (fem) { rc(cx - f * 11 - 2, hy + 7, 5, 6, st.h); rc(cx - f * 12 - 2, hy + 13, 5, 10, st.h); rc(cx - f * 12 - 1, hy + 14, 2, 6, st.hl); }
  rc(cx - 3, hy + 15, 6, 4, SKIN_D);
  rc(cx - 8, hy + 2, 16, 15, SKIN);
  if (front) {
    rc(cx - 9, hy - 3, 18, 8, st.h); rc(cx - 9, hy + 3, 3, fem ? 14 : 5, st.h); rc(cx + 6, hy + 3, 3, fem ? 14 : 5, st.h); rc(cx - 6, hy - 2, 6, 2, st.hl);
    if (fem) rc(cx - 8 + (f > 0 ? 0 : 6), hy + 4, 10, 3, st.h);
    if (st.band) rc(cx - 9, hy + 2, 18, 3, '#d2453f');
    for (const ex of [cx - 5, cx + 2]) {
      rc(ex, hy + 9, 3, 4, '#fff'); rc(ex + (f > 0 ? 1 : 0), hy + 10, 2, 3, '#1b1a2e');
      if (fem) rc(ex, hy + 8, 3, 1, '#1b1a2e');
    }
    rc(cx - 1 + f, hy + 14, 3, 1, '#a65a4a');
    if (fem) { rc(cx - 7, hy + 12, 2, 1, '#e88d8d'); rc(cx + 5, hy + 12, 2, 1, '#e88d8d'); }
  } else {
    rc(cx - 9, hy - 3, 18, fem ? 24 : 19, st.h); rc(cx - 6, hy - 2, 6, 3, st.hl); rc(cx - 4, hy + 6, 8, 2, st.hl);
    if (st.band) rc(cx - 9, hy + 2, 18, 3, '#d2453f');
  }

  // siluet untuk bayangan dash / hantu
  tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, 96, 96); tc.drawImage(O, 0, 0);
  tc.globalCompositeOperation = 'source-atop'; tc.fillStyle = 'rgba(170,235,255,.9)'; tc.fillRect(0, 0, 96, 96);
  tc.globalCompositeOperation = 'source-over';
}

// preview karakter di menu (berjalan di tempat)
function pv(cnv, k) {
  drawChar(PVA[k], STY[k]);
  if (cnv.width != 96) { cnv.width = 96; cnv.height = 96; }
  const x = cnv.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, 96, 96); x.drawImage(O, 0, 0);
}
