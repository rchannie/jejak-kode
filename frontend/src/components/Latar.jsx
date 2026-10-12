import { useEffect, useRef } from 'react';
import { awan, bukit, burung, gedung, bendera, kelopak, langit, matahari, pohon, WARNA } from '../game/langit.js';

// Latar halaman: langit pagi, awan yang bergerak, bukit, sekolah di kejauhan,
// dan kelopak bunga yang melayang. Digambar kecil lalu diperbesar 4 kali.

const SKALA = 4;

export default function Latar() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return undefined;
    const ctx = c.getContext('2d');
    let diam = false;
    try { diam = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* abaikan */ }
    let berhenti = false;
    let terakhir = 0;

    function ukur() {
      c.width = Math.max(120, Math.ceil(window.innerWidth / SKALA));
      c.height = Math.max(90, Math.ceil(window.innerHeight / SKALA));
    }
    ukur();
    window.addEventListener('resize', ukur);

    function gambar(now) {
      if (berhenti) return;
      if (!diam) requestAnimationFrame(gambar);
      if (now - terakhir < 40 && !diam) return;
      terakhir = now;
      if (document.hidden) return;
      const t = diam ? 0 : now / 1000;
      const W = c.width;
      const H = c.height;
      ctx.imageSmoothingEnabled = false;
      langit(ctx, W, H);
      matahari(ctx, W - 34, 26, t);
      for (let i = 0; i < 6; i++) {
        const s = i % 3 === 0 ? 2 : 1;
        const kec = 2 + (i % 4);
        const x = ((t * kec + i * 97) % (W + 60)) - 40;
        awan(ctx, x, 12 + ((i * 29) % Math.max(20, H * 0.35)), s);
      }
      burung(ctx, ((t * 14) % (W + 40)) - 20, H * 0.18, t);
      burung(ctx, ((t * 14) % (W + 40)) - 12, H * 0.18 + 3, t + 0.3);
      bukit(ctx, W, H, H - 18, 16, WARNA.bukit1, 0.3, 0.035);
      gedung(ctx, W - 92, H - 58, 54, t);
      bendera(ctx, W - 30, H - 64, t);
      pohon(ctx, W - 104, H - 26, 1, t);
      pohon(ctx, W - 22, H - 24, 1, t);
      bukit(ctx, W, H, H - 8, 10, WARNA.bukit2, 2.1, 0.05);
      bukit(ctx, W, H, H - 2, 5, WARNA.bukit3, 4.2, 0.08);
      if (!diam) kelopak(ctx, W, H, t, Math.round(W / 22));
    }
    requestAnimationFrame(gambar);
    return () => { berhenti = true; window.removeEventListener('resize', ukur); };
  }, []);
  return <canvas ref={ref} className="latar" aria-hidden="true" />;
}
