// Gambar suasana yang dipakai di latar halaman dan adegan sekolah.
// Semua digambar pada resolusi kecil lalu diperbesar, supaya tetap terlihat pixel art.

export const WARNA = {
  garis: '#2d2a3e',
  langit: ['#8fd0ff', '#a9dcff', '#c4e8ff', '#ddf2ff', '#eef9ff'],
  awan: '#ffffff',
  awanBayang: '#dbeefc',
  bukit1: '#a6d86f',
  bukit2: '#77b552',
  bukit3: '#4f8c40',
  krem: '#fff4dc',
  kremGelap: '#e9d5ad',
  atap: '#e8646a',
  atapGelap: '#b8434f',
  kaca: '#9ccdf2',
  kayu: '#b07445',
  kayuGelap: '#7a4a2a',
  mint: '#76dbcf',
  kuning: '#ffd86b',
  pink: '#f7aac0',
  merah: '#e8463f',
  putih: '#ffffff',
  tanah: '#ece2c9',
  daun: '#5aa64a',
  daunTerang: '#86d67c',
};

export function kotak(ctx, x, y, w, h, warna) {
  ctx.fillStyle = warna;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function lingkaran(ctx, cx, cy, r, warna) {
  ctx.fillStyle = warna;
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.round(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2 + 1, 1);
  }
}

export function langit(ctx, W, H) {
  const pita = WARNA.langit.length;
  for (let i = 0; i < pita; i++) {
    kotak(ctx, 0, (H * i) / pita, W, H / pita + 1, WARNA.langit[i]);
  }
  // garis peralihan berpola supaya gradasinya terasa pixel art
  for (let i = 1; i < pita; i++) {
    const y = Math.round((H * i) / pita);
    ctx.fillStyle = WARNA.langit[i - 1];
    for (let x = (i % 2) * 2; x < W; x += 4) ctx.fillRect(x, y, 2, 1);
  }
}

export function matahari(ctx, cx, cy, t) {
  const r = 9;
  const denyut = Math.round(Math.sin(t * 1.5) * 1);
  ctx.fillStyle = 'rgba(255, 236, 160, 0.45)';
  for (let a = 0; a < 8; a++) {
    const sudut = (a / 8) * Math.PI * 2 + t * 0.15;
    const px = cx + Math.cos(sudut) * (r + 5 + denyut);
    const py = cy + Math.sin(sudut) * (r + 5 + denyut);
    ctx.fillRect(Math.round(px - 1), Math.round(py - 1), 3, 3);
  }
  lingkaran(ctx, cx, cy, r + 2, '#ffe9a8');
  lingkaran(ctx, cx, cy, r, WARNA.kuning);
  lingkaran(ctx, cx - 3, cy - 3, 3, '#fff3c4');
}

export function awan(ctx, x, y, s) {
  const bentuk = [
    [2, 0, 6, 1], [1, 1, 9, 1], [0, 2, 14, 2], [4, -1, 3, 1], [9, 0, 3, 2],
  ];
  for (const [bx, by, bw, bh] of bentuk) kotak(ctx, x + bx * s, y + by * s, bw * s, bh * s, WARNA.awan);
  kotak(ctx, x + 1 * s, y + 4 * s, 12 * s, 1 * s, WARNA.awanBayang);
}

export function bukit(ctx, W, H, dasar, tinggi, warna, fase, frek) {
  ctx.fillStyle = warna;
  for (let x = 0; x < W; x += 2) {
    const h = Math.round(tinggi * (0.6 + 0.4 * Math.sin((x * frek) + fase)));
    ctx.fillRect(x, dasar - h, 2, H - dasar + h);
  }
}

export function pohon(ctx, x, y, s, t) {
  const goyang = Math.round(Math.sin(t * 1.3 + x) * 0.6);
  kotak(ctx, x - 1, y - 2, 3, 6, WARNA.kayuGelap);
  lingkaran(ctx, x + goyang, y - 8, 7 * s, WARNA.garis);
  lingkaran(ctx, x + goyang, y - 8, 6 * s, WARNA.daun);
  lingkaran(ctx, x - 2 + goyang, y - 10, 3 * s, WARNA.daunTerang);
}

export function bendera(ctx, x, y, t) {
  kotak(ctx, x, y, 1, 26, '#a9a5bd');
  kotak(ctx, x - 1, y - 1, 3, 1, WARNA.kuning);
  for (let i = 0; i < 10; i++) {
    const g = Math.round(Math.sin(t * 5 - i * 0.6) * 1.2);
    kotak(ctx, x + 1 + i, y + 1 + g, 1, 3, WARNA.merah);
    kotak(ctx, x + 1 + i, y + 4 + g, 1, 3, WARNA.putih);
  }
}

// gedung sekolah sederhana dua lantai
export function gedung(ctx, x, y, w, t) {
  const h = 34;
  kotak(ctx, x - 1, y - 1, w + 2, h + 2, WARNA.garis);
  kotak(ctx, x, y, w, h, WARNA.krem);
  kotak(ctx, x, y + h - 3, w, 3, WARNA.kremGelap);
  kotak(ctx, x, y + 15, w, 2, WARNA.mint);
  // atap
  for (let i = 0; i < 8; i++) kotak(ctx, x - 4 + i, y - 2 - i, w + 8 - i * 2, 1, i === 0 ? WARNA.atapGelap : WARNA.atap);
  kotak(ctx, x - 4, y - 2, w + 8, 1, WARNA.garis);
  // jendela
  const kolom = Math.floor((w - 8) / 11);
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < kolom; c++) {
      const jx = x + 5 + c * 11;
      const jy = y + 3 + r * 16;
      if (r === 1 && Math.abs(jx + 3 - (x + w / 2)) < 7) continue;
      kotak(ctx, jx - 1, jy - 1, 8, 9, WARNA.garis);
      kotak(ctx, jx, jy, 6, 7, WARNA.kaca);
      kotak(ctx, jx + 1, jy + 1, 1, 2, WARNA.putih);
      const nyala = Math.sin(t * 0.7 + c * 1.7 + r) > 0.92;
      if (nyala) kotak(ctx, jx, jy, 6, 7, '#fff1bf');
    }
  }
  // pintu
  const px = x + w / 2 - 4;
  kotak(ctx, px - 1, y + h - 13, 10, 13, WARNA.garis);
  kotak(ctx, px, y + h - 12, 8, 12, WARNA.kayu);
  kotak(ctx, px + 3, y + h - 12, 1, 12, WARNA.kayuGelap);
  kotak(ctx, px + 6, y + h - 6, 1, 1, WARNA.kuning);
  // papan nama
  kotak(ctx, x + w / 2 - 10, y - 9, 20, 6, WARNA.garis);
  kotak(ctx, x + w / 2 - 9, y - 8, 18, 4, WARNA.mint);
  for (let i = 0; i < 5; i++) kotak(ctx, x + w / 2 - 7 + i * 3, y - 7, 2, 2, WARNA.krem);
}

export function kelopak(ctx, W, H, t, jumlah = 18) {
  for (let i = 0; i < jumlah; i++) {
    const kec = 6 + (i % 5) * 2;
    const x = ((i * 53 + t * kec * 1.6) % (W + 20)) - 10;
    const y = ((i * 37 + t * kec) % (H + 20)) - 10;
    const goyang = Math.round(Math.sin(t * 2 + i) * 2);
    ctx.fillStyle = i % 3 === 0 ? '#ffffff' : WARNA.pink;
    ctx.fillRect(Math.round(x + goyang), Math.round(y), 2, 1);
    ctx.fillRect(Math.round(x + goyang + 1), Math.round(y + 1), 1, 1);
  }
}

export function burung(ctx, x, y, t) {
  const k = Math.floor(t * 6) % 2;
  ctx.fillStyle = WARNA.garis;
  ctx.fillRect(Math.round(x), Math.round(y + k), 1, 1);
  ctx.fillRect(Math.round(x + 1), Math.round(y + 1), 1, 1);
  ctx.fillRect(Math.round(x + 2), Math.round(y + k), 1, 1);
}
