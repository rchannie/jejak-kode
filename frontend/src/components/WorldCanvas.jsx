import { useEffect, useRef, useState } from 'react';
import { muatSprite } from '../game/sprites.js';
import { UBIN } from '../engine/dunia.js';

// Lapis pertama visualisasi eksekusi: dunia game.
// Kanvas menggambar ulang keadaan dunia setiap frame. Selain objek misi,
// ada suasana yang hidup: tokoh sekolah, kucing tidur, kupu-kupu, awan,
// sinar matahari dari jendela, dan gelembung ekspresi Bit.

const T = 16;
const PENGGARIS = 8;

const kurangiGerak = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

function suasanaDari(k) {
  const s = k.ubin.map((r) => r.join('')).join('');
  if (s.includes('F')) return 'taman';
  if (s.includes('L')) return 'lorong';
  if (s.includes('R')) return 'perpus';
  return 'kelas';
}

const POSISI = {
  taman: { npc: [8, 1], kucing: [1, 4], bunga: [[0, 1], [3, 1], [5, 1], [2, 3], [4, 3], [6, 3], [3, 4], [7, 4], [9, 4]] },
  kelas: { npc: [5, 1], kucing: [9, 4], bunga: [] },
  perpus: { npc: [4, 3], kucing: [9, 4], bunga: [] },
  lorong: { npc: [9, 1], kucing: [0, 4], bunga: [] },
};

export default function WorldCanvas({ keadaan, kunciPeta, label, tokoh, sorak = 0, mini = false }) {
  const kanvas = useRef(null);
  const [gambar, setGambar] = useState(null);
  const S = mini ? 2 : 4;
  const data = useRef({ keadaan: null, tampil: null, efek: [], efekTerakhir: 0, kunci: null, partikel: [], sorak: 0, sorakSejak: -1e9, ekspresi: null, ekspresiSejak: 0 });

  useEffect(() => { muatSprite().then(setGambar); }, []);

  useEffect(() => {
    const d = data.current;
    d.keadaan = keadaan;
    d.tokoh = tokoh;
    if (!keadaan) return;
    if (!d.tampil || d.kunci !== kunciPeta || kurangiGerak()) {
      d.tampil = { x: keadaan.bit.x, y: keadaan.bit.y };
      d.efek = [];
      d.partikel = [];
    }
    d.kunci = kunciPeta;
    const e = keadaan.efek;
    if (e && e.id && e.id !== d.efekTerakhir) {
      d.efekTerakhir = e.id;
      if (e.jenis !== 'gerak') d.efek.push({ ...e, t0: performance.now() });
    }
    if (keadaan.bit.ekspresi !== d.ekspresi) {
      d.ekspresi = keadaan.bit.ekspresi;
      d.ekspresiSejak = performance.now();
    }
  }, [keadaan, kunciPeta, tokoh]);

  useEffect(() => {
    const d = data.current;
    if (sorak !== d.sorak) { d.sorak = sorak; d.sorakSejak = performance.now(); }
  }, [sorak]);

  useEffect(() => {
    if (!gambar) return undefined;
    let berhenti = false;
    let waktuLalu = performance.now();
    const diam = kurangiGerak();
    function frame(now) {
      if (berhenti) return;
      const dt = Math.min(0.05, (now - waktuLalu) / 1000);
      waktuLalu = now;
      const c = kanvas.current;
      const k = data.current.keadaan;
      if (c && k) gambarDunia(c, k, data.current, gambar, diam ? 0 : now, dt, diam, S, mini);
      if (!diam) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return () => { berhenti = true; };
  }, [gambar, S, mini]);

  // gambar ulang sekali saat keadaan berubah jika animasi dimatikan
  useEffect(() => {
    if (!gambar || !kurangiGerak() || !kanvas.current || !keadaan) return;
    gambarDunia(kanvas.current, keadaan, data.current, gambar, 0, 0, true, S, mini);
  }, [keadaan, gambar, S, mini]);

  if (!keadaan) return null;
  const lebar = keadaan.lebar * T * S;
  const tinggi = (keadaan.tinggi * T + (mini ? 0 : PENGGARIS)) * S;
  return (
    <canvas ref={kanvas} className={mini ? 'dunia-kanvas mini' : 'dunia-kanvas'} width={lebar} height={tinggi} role="img" aria-label={label} />
  );
}

function gambarDunia(c, k, d, g, now, dt, diam, S, mini) {
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, c.width, c.height);
  const suasana = suasanaDari(k);
  const pos = POSISI[suasana];
  const t = now / 1000;

  const sp = (nama, x, y, ukuran = T) => {
    const img = g[nama];
    if (img) ctx.drawImage(img, Math.round(x * S), Math.round(y * S), ukuran * S, ukuran * S);
  };
  const kotak = (x, y, w, h, warna) => { ctx.fillStyle = warna; ctx.fillRect(Math.round(x * S), Math.round(y * S), Math.ceil(w * S), Math.ceil(h * S)); };

  // ubin dasar dan perabot
  for (let y = 0; y < k.tinggi; y++) {
    for (let x = 0; x < k.lebar; x++) {
      const u = UBIN[k.ubin[y][x]] || UBIN['.'];
      sp(u.gambar, x * T, y * T);
      if (u.atas) sp(u.atas, x * T, y * T);
    }
  }

  // awan dan burung di langit taman
  if (suasana === 'taman') {
    for (let i = 0; i < 3; i++) {
      const lebar = k.lebar * T;
      const ax = ((t * (4 + i * 2) + i * 57) % (lebar + 30)) - 20;
      const ay = 1 + (i % 2) * 2;
      kotak(ax + 2, ay, 9, 1, '#ffffff');
      kotak(ax, ay + 1, 14, 2, '#ffffff');
      kotak(ax + 3, ay - 1, 4, 1, '#ffffff');
    }
    const bx = ((t * 18) % (k.lebar * T + 40)) - 20;
    const kepak = Math.floor(t * 6) % 2;
    ctx.fillStyle = '#2d2a3e';
    for (const [ox, oy] of [[0, 0], [9, 2]]) {
      const x0 = bx + ox;
      const y0 = 3 + oy;
      kotak(x0, y0 + kepak, 1, 1, '#2d2a3e');
      kotak(x0 + 1, y0 + 1, 1, 1, '#2d2a3e');
      kotak(x0 + 2, y0 + kepak, 1, 1, '#2d2a3e');
    }
    // bunga bergoyang
    for (const [bx2, by2] of pos.bunga) {
      if (k.tanaman.some((o) => o.x === bx2 && o.y === by2)) continue;
      const goyang = diam ? 0 : Math.round(Math.sin(t * 2 + bx2) * 0.6);
      sp('bunga', bx2 * T + goyang, by2 * T);
    }
  }

  // sinar matahari dari jendela
  if (suasana !== 'taman') {
    const kuat = diam ? 0.1 : 0.08 + Math.sin(t * 0.8) * 0.03;
    ctx.fillStyle = `rgba(255, 240, 190, ${kuat})`;
    for (let x = 0; x < k.lebar; x++) {
      if (k.ubin[0][x] !== 'J') continue;
      ctx.beginPath();
      ctx.moveTo((x * T + 3) * S, 12 * S);
      ctx.lineTo((x * T + 13) * S, 12 * S);
      ctx.lineTo((x * T + 13 + 30) * S, k.tinggi * T * S);
      ctx.lineTo((x * T + 3 + 30) * S, k.tinggi * T * S);
      ctx.closePath();
      ctx.fill();
    }
    // debu berkilau di udara
    for (let i = 0; i < 10; i++) {
      const dx = ((i * 37 + t * 3) % (k.lebar * T));
      const dy = 18 + ((i * 23 + t * 2 * (1 + (i % 3))) % (k.tinggi * T - 22));
      const kedip = 0.35 + 0.35 * Math.sin(t * 2 + i);
      kotak(dx, dy, 1, 1, `rgba(255, 255, 255, ${kedip})`);
    }
  }
  if (suasana === 'perpus') {
    for (let i = 0; i < 4; i++) {
      const fase = (t * 0.7 + i * 0.37) % 1;
      if (fase > 0.5) continue;
      const sx = [1, 3, 6, 8][i] * T + 8;
      const sy = T + 4 + (i % 2) * 5;
      const r = fase < 0.25 ? 1 : 2;
      kotak(sx - r, sy, r * 2 + 1, 1, '#ffd86b');
      kotak(sx, sy - r, 1, r * 2 + 1, '#ffd86b');
    }
  }

  // jejak langkah Bit
  for (const j of k.jejak) kotak(j.x * T + 7, j.y * T + 13, 2, 2, 'rgba(54, 163, 160, 0.4)');

  // cahaya lampu
  for (const s of k.saklar) {
    if (!s.nyala) continue;
    const cx = (s.x * T + 8) * S;
    const cy = (s.y * T + 6) * S;
    const r = (24 + (diam ? 0 : Math.sin(t * 3) * 2)) * S;
    const grad = ctx.createRadialGradient(cx, cy, 2 * S, cx, cy, r);
    grad.addColorStop(0, 'rgba(255, 220, 110, 0.55)');
    grad.addColorStop(1, 'rgba(255, 220, 110, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  // kucing tidur dan tokoh sekolah
  const kc = pos.kucing;
  if (!adaObjekDi(k, kc[0], kc[1])) {
    sp(Math.floor(t * 1.2) % 2 ? 'kucing_2' : 'kucing_1', kc[0] * T, kc[1] * T);
    if (!diam && !mini) {
      ctx.font = `${5 * S}px "Pixelify Sans", monospace`;
      ctx.fillStyle = 'rgba(45, 42, 62, 0.7)';
      const zf = (t * 0.6) % 1;
      ctx.fillText('z', (kc[0] * T + 12 + zf * 3) * S, (kc[1] * T + 8 - zf * 8) * S);
    }
  }
  const tokoh = d.tokoh;
  if (tokoh && tokoh.badan) {
    const [nx, ny] = pos.npc;
    const sorakAktif = now - d.sorakSejak < 2200;
    const lompat = sorakAktif && !diam ? -Math.abs(Math.sin((now - d.sorakSejak) / 120)) * 3 : 0;
    sp(`${tokoh.badan}_${Math.floor(t * 1.6) % 2 ? 2 : 1}`, nx * T, ny * T + lompat);
    if (sorakAktif) gelembung(ctx, g, (nx * T + 8) * S, (ny * T - 2) * S, 'hati', S);
  }

  // objek misi
  for (const b of k.buku) if (b.ada) sp('buku_tumpuk', b.x * T, b.y * T);
  for (const b of k.bukuJatuh) sp('buku_tumpuk', b.x * T, b.y * T + 3);
  for (const s of k.sampah) if (s.ada) sp('sampah', s.x * T, s.y * T);
  for (const tn of k.tanaman) {
    const nama = tn.status === 'kering' ? 'tanaman_kering' : tn.status === 'banjir' ? 'tanaman_banjir' : 'tanaman_segar';
    sp(nama, tn.x * T, tn.y * T);
  }
  for (const s of k.saklar) sp(s.nyala ? 'saklar_nyala' : 'saklar_mati', s.x * T, s.y * T);
  for (const r of k.rak) {
    for (let i = 0; i < r.isi; i++) sp('buku_tumpuk', r.x * T + 4, r.y * T - 6 - i * 4, 8);
  }

  // Bit
  const tp = d.tampil;
  const bergerak = Math.abs(k.bit.x - tp.x) > 0.02;
  if (diam) { tp.x = k.bit.x; tp.y = k.bit.y; } else {
    const f = Math.min(1, dt * 11);
    tp.x += (k.bit.x - tp.x) * f;
    tp.y += (k.bit.y - tp.y) * f;
    if (Math.abs(k.bit.x - tp.x) < 0.01) tp.x = k.bit.x;
  }
  if (bergerak && !diam && Math.random() < 0.6) {
    d.partikel.push({ x: tp.x * T + 4 + Math.random() * 4, y: tp.y * T + 4 + Math.random() * 6, t0: now, warna: Math.random() < 0.5 ? '#ffd86b' : '#76dbcf' });
  }
  d.partikel = d.partikel.filter((p) => now - p.t0 < 500);
  for (const p of d.partikel) {
    const umur = (now - p.t0) / 500;
    kotak(p.x - umur * 4, p.y - umur * 3, 1, 1, p.warna);
  }
  const tx = Math.round(tp.x);
  const targetAngkat = adaObjekDi(k, tx, k.bit.y) ? 10 : 4;
  d.angkat = d.angkat === undefined || diam ? targetAngkat : d.angkat + (targetAngkat - d.angkat) * Math.min(1, dt * 10);
  const sorakBit = now - d.sorakSejak < 1500 && !diam ? -Math.abs(Math.sin((now - d.sorakSejak) / 110)) * 4 : 0;
  const ayun = diam ? 0 : Math.round(Math.sin(now / 280));
  const bx = tp.x * T;
  const by = tp.y * T - Math.round(d.angkat) + ayun + sorakBit;
  ctx.fillStyle = 'rgba(45, 42, 62, 0.22)';
  ctx.beginPath();
  ctx.ellipse((tp.x * T + 8) * S, (tp.y * T + 14) * S, 5 * S, 1.6 * S, 0, 0, Math.PI * 2);
  ctx.fill();
  let namaBit = Math.floor(now / 320) % 2 ? 'bit_2' : 'bit_1';
  if (k.bit.ekspresi === 'senang') namaBit = 'bit_senang';
  if (k.bit.ekspresi === 'bingung') namaBit = 'bit_bingung';
  sp(namaBit, bx, by);
  if (k.bit.bawa) sp('buku_tumpuk', bx + 4, by - 6, 8);
  if (!mini) {
    if (k.bit.ekspresi === 'bingung') gelembung(ctx, g, (bx + 8) * S, (by - 3) * S, '?', S);
    else if (k.bit.ekspresi === 'senang' && now - d.ekspresiSejak < 1400) gelembung(ctx, g, (bx + 8) * S, (by - 3) * S, 'hati', S);
  }

  // kupu-kupu di taman
  if (suasana === 'taman') {
    for (let i = 0; i < 2; i++) {
      const px = ((t * (9 + i * 3) + i * 70) % (k.lebar * T + 20)) - 10;
      const py = 18 + i * 34 + Math.sin(t * 2.2 + i * 2) * 6;
      sp(Math.floor(t * 7 + i) % 2 ? 'kupu_1' : 'kupu_2', px - 8, py - 8);
    }
  }

  // label angka di bawah objek
  if (!mini) {
    ctx.font = `${5 * S}px "Pixelify Sans", "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const tn of k.tanaman) {
      label(ctx, String(tn.kelembapan), (tn.x * T + 8) * S, (tn.y * T + 19) * S, tn.kelembapan < 40 ? '#f0b347' : '#76dbcf', S);
    }
    for (const s of k.saklar) {
      label(ctx, `cahaya ${s.cahaya}`, (s.x * T + 8) * S, (s.y * T + 19) * S, s.cahaya < 50 ? '#c0a8ea' : '#ffd86b', S);
    }
  }

  // efek aksi
  d.efek = d.efek.filter((e) => now - e.t0 < 700);
  for (const e of d.efek) {
    const p = (now - e.t0) / 700;
    const ex = (e.x * T + 8) * S;
    const ey = (e.y * T) * S;
    if (e.jenis === 'air') {
      ctx.fillStyle = '#5089c9';
      for (let i = 0; i < 5; i++) {
        const dx = (i - 2) * 3 * S;
        const dy = ((p * 14 + i * 3) % 14) * S;
        ctx.fillRect(ex + dx, ey + dy, S * 1.5, S * 2.5);
      }
    } else {
      ctx.fillStyle = '#ffd86b';
      const r = (4 + p * 8) * S;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + p;
        const sx = ex + Math.cos(a) * r;
        const sy = ey + 8 * S + Math.sin(a) * r;
        ctx.fillRect(sx - S, sy - 3 * S, 2 * S, 6 * S);
        ctx.fillRect(sx - 3 * S, sy - S, 6 * S, 2 * S);
      }
    }
  }

  // penggaris nomor petak
  if (!mini) {
    const yP = k.tinggi * T * S;
    ctx.fillStyle = '#2d2a3e';
    ctx.fillRect(0, yP, c.width, PENGGARIS * S);
    ctx.font = `${5 * S}px "Pixelify Sans", "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let x = 0; x < k.lebar; x++) {
      ctx.fillStyle = x === k.bit.x ? '#ffd86b' : '#a9a5bd';
      ctx.fillText(String(x), (x * T + 8) * S, yP + (PENGGARIS / 2) * S + S * 0.5);
    }
  }
}

function adaObjekDi(k, x, y) {
  return k.tanaman.some((o) => o.x === x && o.y === y)
    || k.saklar.some((o) => o.x === x && o.y === y)
    || k.sampah.some((o) => o.ada && o.x === x && o.y === y)
    || k.buku.some((o) => o.ada && o.x === x && o.y === y);
}

// gelembung ekspresi di atas kepala
function gelembung(ctx, g, cx, bawah, isi, S) {
  const w = 12 * S;
  const h = 11 * S;
  const x = Math.round(cx - w / 2);
  const y = Math.round(bawah - h - 3 * S);
  ctx.fillStyle = '#2d2a3e';
  ctx.fillRect(x + S, y, w - 2 * S, h);
  ctx.fillRect(x, y + S, w, h - 2 * S);
  ctx.fillRect(Math.round(cx - S), y + h, 2 * S, 2 * S);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + 2 * S, y + S, w - 4 * S, h - 2 * S);
  ctx.fillRect(x + S, y + 2 * S, w - 2 * S, h - 4 * S);
  if (isi === 'hati' && g.hati) {
    ctx.drawImage(g.hati, x + 2 * S, y + S, 9 * S, 9 * S);
  } else {
    ctx.fillStyle = '#2d2a3e';
    ctx.font = `${8 * S}px "Pixelify Sans", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isi, cx, y + h / 2 + S * 0.5);
  }
}

function label(ctx, teks, cx, cy, warna, S) {
  const w = ctx.measureText(teks).width + 6 * S;
  const h = 7 * S;
  const x = Math.round(cx - w / 2);
  const y = Math.round(cy - h / 2);
  ctx.fillStyle = '#2d2a3e';
  ctx.fillRect(x - S, y, w + 2 * S, h);
  ctx.fillRect(x, y - S, w, h + 2 * S);
  ctx.fillStyle = warna;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#2d2a3e';
  ctx.fillText(teks, cx, cy + S * 0.5);
}
