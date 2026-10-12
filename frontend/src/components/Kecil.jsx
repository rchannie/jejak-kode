import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { URL_SPRITE } from '../game/sprites.js';

const kurangiGerak = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

export function Sprite({ nama, ukuran = 32, alt = '', className = '' }) {
  return (
    <img
      className={`sprite ${className}`}
      src={URL_SPRITE[nama]}
      width={ukuran}
      height={ukuran}
      alt={alt}
      aria-hidden={alt ? undefined : true}
    />
  );
}

// Dialog tokoh dengan efek teks diketik.
export function Dialog({ tokoh, teks }) {
  const [n, setN] = useState(() => (kurangiGerak() ? teks.length : 0));
  useEffect(() => {
    if (n >= teks.length) return undefined;
    const t = setTimeout(() => setN((x) => Math.min(teks.length, x + 2)), 18);
    return () => clearTimeout(t);
  }, [n, teks]);
  return (
    <div className="dialog">
      <div className="dialog-potret">
        <Sprite nama={tokoh.potret} ukuran={80} />
      </div>
      <button type="button" className="dialog-isi" onClick={() => setN(teks.length)} aria-label={teks}>
        <span className="dialog-nama">{tokoh.nama} <span>{tokoh.peran}</span></span>
        <span className="dialog-teks" aria-hidden="true">
          {teks.slice(0, n)}
          {n < teks.length ? <span className="kursor">▌</span> : null}
        </span>
      </button>
    </div>
  );
}

// Perayaan kecil saat misi berhasil: konfeti piksel dan kartu ucapan.
const WARNA_KONFETI = ['#ffd86b', '#f7aac0', '#76dbcf', '#c0a8ea', '#9ccdf2', '#a6d86f'];
export function Perayaan({ pemicu, teks, bintang = false }) {
  const [aktif, setAktif] = useState(null);
  const lalu = useRef(pemicu);
  useEffect(() => {
    if (pemicu === lalu.current) return undefined;
    lalu.current = pemicu;
    setAktif(Date.now());
    const t = setTimeout(() => setAktif(null), 2300);
    return () => clearTimeout(t);
  }, [pemicu]);
  if (!aktif) return null;
  return createPortal(
    <div className="perayaan" key={aktif} role="status">
      {!kurangiGerak() ? (
        <div className="konfeti" aria-hidden="true">
          {Array.from({ length: 42 }, (_, i) => (
            <span
              key={i}
              style={{
                left: `${(i * 37) % 100}%`,
                animationDelay: `${(i % 9) * 0.07}s`,
                animationDuration: `${1.3 + (i % 5) * 0.18}s`,
                background: WARNA_KONFETI[i % WARNA_KONFETI.length],
                width: `${6 + (i % 3) * 3}px`,
                height: `${6 + (i % 3) * 3}px`,
              }}
            />
          ))}
        </div>
      ) : null}
      <div className="perayaan-kartu bingkai-putih">
        <Sprite nama={bintang ? 'ikon_bintang' : 'bit_senang'} ukuran={64} />
        <p>{teks}</p>
      </div>
    </div>,
    document.body,
  );
}
