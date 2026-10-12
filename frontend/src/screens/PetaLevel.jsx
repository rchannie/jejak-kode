import { useMemo } from 'react';
import WorldCanvas from '../components/WorldCanvas.jsx';
import { Sprite } from '../components/Kecil.jsx';
import { BAB, FASE, LEVEL, TOKOH } from '../game/levels.js';
import { buatDunia } from '../engine/dunia.js';
import { mulaiLevel, useToko } from '../data/store.js';

export default function PetaLevel() {
  const siswa = useToko((s) => s.siswa[s.siswaId]);
  const progres = siswa ? siswa.progres : {};
  const selesai = LEVEL.filter((l) => progres[l.id] && progres[l.id].selesai).length;
  const pratinjau = useMemo(() => Object.fromEntries(
    LEVEL.map((l) => [l.id, buatDunia(l.percobaan.peta, l.perintah).salin()]),
  ), []);

  return (
    <div className="peta-level">
      <header className="peta-kepala bingkai-kertas">
        <Sprite nama="bit_senang" ukuran={64} className="peta-bit" />
        <div>
          <h1>Halo, {siswa ? siswa.nama.split(' ')[0] : 'teman'}!</h1>
          <p>Pilih tempat di sekolah yang mau kamu bantu hari ini. Mulailah dari bab Dasar, lalu lanjut ke Percabangan dan Perulangan (level 1 sampai {LEVEL.length}).</p>
        </div>
        <div className="peta-bintang" aria-label={`${selesai} dari ${LEVEL.length} level selesai`}>
          {LEVEL.map((l) => (
            <span key={l.id} className={progres[l.id] && progres[l.id].selesai ? 'dapat' : ''}>
              <Sprite nama="ikon_bintang" ukuran={28} />
            </span>
          ))}
        </div>
      </header>
      {BAB.map((bab, iBab) => (
      <section key={bab.nama} className="bab" aria-labelledby={`bab-${iBab}`}>
        <header className="bab-kepala">
          <h2 id={`bab-${iBab}`}><span className="bab-nomor">Bab {iBab + 1}</span> {bab.nama}</h2>
          <p>{bab.ket}</p>
        </header>
      <ol className="daftar-level">
        {LEVEL.filter((l) => l.bab === bab.nama).map((l) => {
          const p = progres[l.id];
          const fase = p ? FASE.find((f) => f.id === p.fase) : null;
          const status = !p ? 'Belum dimulai' : p.selesai ? 'Selesai' : `Fase ${fase.nama}`;
          return (
            <li key={l.id} className={`kartu-level bingkai-kertas${p && p.selesai ? ' selesai' : ''}`}>
              <div className="kartu-level-gambar">
                <WorldCanvas mini keadaan={pratinjau[l.id]} kunciPeta={`mini-${l.id}`} tokoh={TOKOH[l.tokoh]} label={`Pratinjau ${l.tempat}`} />
                <span className="kartu-level-nomor">{l.nomor}</span>
                {p && p.selesai ? <Sprite nama="ikon_bintang" ukuran={36} className="kartu-level-bintang" alt="Selesai" /> : null}
              </div>
              <div className="kartu-level-isi">
                <p className="level-nomor">{l.tempat} · {l.durasi}</p>
                <h2>{l.judul}</h2>
                <p className="kartu-level-konsep"><span className="chip">{l.konsep}</span></p>
                <p className="kartu-level-ct">{l.ct}</p>
                <div className="kartu-level-bawah">
                  <span className={`status-level${p && p.selesai ? ' selesai' : p ? ' jalan' : ''}`}>{status}</span>
                  <button type="button" className="tombol" onClick={() => mulaiLevel(l.id)}>
                    {!p ? 'Mulai' : p.selesai ? 'Lihat hasil' : 'Lanjutkan'}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      </section>
      ))}
    </div>
  );
}
