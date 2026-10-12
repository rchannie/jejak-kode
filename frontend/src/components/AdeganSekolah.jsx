import { useEffect, useRef, useState } from 'react';
import { muatSprite } from '../game/sprites.js';
import { awan, bendera, gedung, kotak, langit, lingkaran, matahari, pohon, WARNA } from '../game/langit.js';

// Adegan pembuka: halaman sekolah di pagi hari. Bit terbang berkeliling,
// Pak Darto berjaga di gerbang, Nara dan Bu Sari berjalan, kucing tidur di rumput.

const W = 200;
const H = 104;

export default function AdeganSekolah() {
  const ref = useRef(null);
  const [g, setG] = useState(null);
  useEffect(() => { muatSprite().then(setG); }, []);

  useEffect(() => {
    if (!g) return undefined;
    const c = ref.current;
    const ctx = c.getContext('2d');
    let diam = false;
    try { diam = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* abaikan */ }
    let berhenti = false;
    const sp = (nama, x, y, s = 16) => { if (g[nama]) ctx.drawImage(g[nama], Math.round(x), Math.round(y), s, s); };

    function frame(now) {
      if (berhenti) return;
      const t = diam ? 2 : now / 1000;
      ctx.imageSmoothingEnabled = false;
      langit(ctx, W, H);
      matahari(ctx, 24, 18, t);
      for (let i = 0; i < 4; i++) awan(ctx, ((t * (3 + i) + i * 61) % (W + 40)) - 30, 6 + (i % 2) * 12, 1);
      // bukit dan halaman
      kotak(ctx, 0, 70, W, H - 70, WARNA.bukit2);
      for (let x = 0; x < W; x += 2) kotak(ctx, x, 68 + Math.round(Math.sin(x * 0.08) * 1.5), 2, 4, WARNA.bukit1);
      // jalan setapak menuju pintu
      for (let y = 72; y < H; y++) {
        const lebar = 8 + (y - 72) * 0.9;
        kotak(ctx, 100 - lebar / 2, y, lebar, 1, WARNA.tanah);
      }
      gedung(ctx, 62, 38, 76, t);
      bendera(ctx, 150, 42, t);
      pohon(ctx, 40, 72, 1, t);
      pohon(ctx, 166, 74, 1, t);
      pohon(ctx, 186, 80, 1, t);
      // bunga-bunga
      for (let i = 0; i < 14; i++) {
        const bx = (i * 29) % W;
        const by = 80 + ((i * 17) % 20);
        if (Math.abs(bx - 100) < 18) continue;
        const goyang = Math.round(Math.sin(t * 2 + i) * 0.5);
        kotak(ctx, bx + goyang, by, 1, 1, [WARNA.pink, WARNA.kuning, WARNA.putih][i % 3]);
        kotak(ctx, bx, by + 1, 1, 2, WARNA.bukit3);
      }
      // tokoh
      const ayun = (f) => (Math.floor(t * f) % 2 ? 2 : 1);
      sp(`npc_darto_${ayun(1.5)}`, 114, 74);
      const naraX = 10 + ((t * 9) % 60);
      sp(`npc_nara_${ayun(4)}`, naraX, 78 + (Math.floor(t * 4) % 2));
      const sariX = 172 - ((t * 5) % 40);
      sp(`npc_sari_${ayun(3)}`, sariX, 84 + (Math.floor(t * 3) % 2));
      sp(`kucing_${ayun(1.2)}`, 140, 86);
      // Bit terbang memutar
      const bx = 100 + Math.cos(t * 0.9) * 34;
      const by = 54 + Math.sin(t * 1.8) * 10;
      lingkaran(ctx, bx + 8, 98, 3, 'rgba(45, 42, 62, 0.15)');
      sp(Math.floor(t * 3) % 2 ? 'bit_1' : 'bit_senang', bx, by);
      if (!diam) {
        for (let i = 1; i < 5; i++) {
          const jx = 100 + Math.cos(t * 0.9 - i * 0.12) * 34 + 8;
          const jy = 54 + Math.sin(t * 1.8 - i * 0.24) * 10 + 12;
          kotak(ctx, jx, jy, 1, 1, i % 2 ? WARNA.kuning : WARNA.mint);
        }
        requestAnimationFrame(frame);
      }
    }
    requestAnimationFrame(frame);
    return () => { berhenti = true; };
  }, [g]);

  return (
    <canvas
      ref={ref}
      className="adegan"
      width={W}
      height={H}
      role="img"
      aria-label="Halaman sekolah di pagi hari. Bit terbang di depan gedung sekolah, bendera merah putih berkibar."
    />
  );
}
