import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sprite } from './Kecil.jsx';
import { INFO_LAGU, setMusik, setVolume, useMusik } from '../data/musik.js';

// Tombol musik di bilah atas: sekali klik untuk menyalakan atau mematikan lagu.
export function TombolMusik() {
  const m = useMusik();
  const berbunyi = m.musik && m.main;
  return (
    <button
      type="button"
      className={`tombol-ikon${m.musik ? '' : ' mati'}`}
      aria-pressed={m.musik}
      aria-label={m.musik ? 'Matikan musik' : 'Nyalakan musik'}
      title={m.musik ? 'Matikan musik' : 'Nyalakan musik'}
      onClick={() => setMusik(!m.musik)}
    >
      <Sprite nama="ikon_musik" ukuran={28} />
      <span className={`eq${berbunyi ? ' jalan' : ''}`} aria-hidden="true"><i /><i /><i /></span>
    </button>
  );
}

// Tombol roda gigi yang membuka panel pengaturan.
export function TombolPengaturan() {
  const [buka, setBuka] = useState(false);
  const tombol = useRef(null);
  return (
    <>
      <button
        type="button"
        ref={tombol}
        className="tombol-ikon"
        aria-label="Pengaturan"
        title="Pengaturan"
        aria-haspopup="dialog"
        onClick={() => setBuka(true)}
      >
        <Sprite nama="ikon_atur" ukuran={28} className="gigi" />
      </button>
      {buka ? <PanelPengaturan tutup={() => { setBuka(false); if (tombol.current) tombol.current.focus(); }} /> : null}
    </>
  );
}

function PanelPengaturan({ tutup }) {
  const m = useMusik();
  const panel = useRef(null);
  const refTutup = useRef(tutup);
  refTutup.current = tutup;
  const persen = Math.round(m.volume * 100);

  useEffect(() => {
    const awal = panel.current && panel.current.querySelector('button, input');
    if (awal) awal.focus();
    const tombolKeyboard = (e) => { if (e.key === 'Escape') refTutup.current(); };
    window.addEventListener('keydown', tombolKeyboard);
    return () => window.removeEventListener('keydown', tombolKeyboard);
  }, []);

  let keterangan = 'Lagu akan diputar berulang selama kamu bermain.';
  if (m.gagal) keterangan = 'Berkas lagu tidak dapat dimuat. Pastikan file musik/baroque-coffee-house.mp3 ada di folder public.';
  else if (m.musik && m.menunggu) keterangan = 'Lagu mulai setelah kamu mengklik atau menekan tombol apa saja di halaman.';
  else if (!m.musik) keterangan = 'Musik sedang dimatikan.';

  return createPortal(
    <div className="lapis-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) tutup(); }}>
      <div className="panel-atur bingkai-kertas" role="dialog" aria-modal="true" aria-labelledby="judul-atur" ref={panel}>
        <div className="panel-atur-kepala">
          <Sprite nama="ikon_atur" ukuran={36} />
          <h2 id="judul-atur">Pengaturan</h2>
        </div>

        <section className="atur-bagian" aria-labelledby="judul-musik">
          <h3 id="judul-musik">Musik latar</h3>
          <div className="atur-baris">
            <span id="label-musik">Musik</span>
            <button
              type="button"
              className={`saklar${m.musik ? ' nyala' : ''}`}
              role="switch"
              aria-checked={m.musik}
              aria-labelledby="label-musik"
              onClick={() => setMusik(!m.musik)}
            >
              <span className="saklar-tuas" aria-hidden="true" />
              <span className="saklar-teks">{m.musik ? 'Nyala' : 'Mati'}</span>
            </button>
          </div>
          <div className="atur-baris">
            <label htmlFor="volume-musik">Volume</label>
            <div className="atur-volume">
              <input
                id="volume-musik"
                type="range"
                min="0"
                max="100"
                step="5"
                value={persen}
                disabled={!m.musik}
                onChange={(e) => setVolume(Number(e.target.value) / 100)}
                style={{ '--isi': `${persen}%` }}
              />
              <output htmlFor="volume-musik">{persen}%</output>
            </div>
          </div>
          <div className="atur-lagu">
            <Sprite nama="ikon_musik" ukuran={32} />
            <div>
              <p className="atur-lagu-judul">{INFO_LAGU.judul}</p>
              <p className="atur-lagu-pencipta">{INFO_LAGU.pencipta}</p>
            </div>
            <span className={`eq besar${m.musik && m.main ? ' jalan' : ''}`} aria-hidden="true"><i /><i /><i /><i /></span>
          </div>
          <p className="atur-ket" aria-live="polite">{keterangan}</p>
        </section>

        <div className="panel-atur-kaki">
          <button type="button" className="tombol" onClick={tutup}>Selesai</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
