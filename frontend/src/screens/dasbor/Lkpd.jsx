import { useState } from 'react';
import { LEVEL } from '../../game/levels.js';
import { LembarKerja, isiLkpd, useCetak } from '../../components/LembarKerja.jsx';
import { statusLevel } from './olah.js';

// Tab LKPD: memeriksa lembar kerja seluruh kelas per level, mencetak LKPD
// semua siswa, atau mencetak LKPD kosong untuk dipakai di kertas.
export default function TabLkpd({ data }) {
  const [levelId, setLevelId] = useState(LEVEL[0].id);
  const [siswaId, setSiswaId] = useState(null);
  const [cetak, portalCetak] = useCetak();
  const level = LEVEL.find((l) => l.id === levelId);
  const siswa = data.siswa;
  const terisi = siswa.filter((s) => s.progres[level.id]);
  const pilih = siswaId ? siswa.find((s) => s.id === siswaId) : null;

  const lembarSemua = () => (
    <>{terisi.map((s) => <LembarKerja key={s.id} level={level} progres={s.progres[level.id]} nama={s.nama} kelas={data.kelas.nama} />)}</>
  );

  return (
    <section className="bingkai-kertas blok-dasbor tab-lkpd">
      <div className="baris-judul">
        <h2>LKPD per level</h2>
        <div className="baris-tombol">
          <button type="button" className="tombol kecil krem" onClick={() => cetak(<LembarKerja level={level} kosong />)}>
            Cetak LKPD kosong
          </button>
          <button type="button" className="tombol kecil" disabled={!terisi.length} onClick={() => cetak(lembarSemua())}>
            Cetak LKPD semua siswa ({terisi.length})
          </button>
        </div>
      </div>
      <p className="fase-catatan">
        LKPD terisi otomatis dari jawaban siswa di dalam game: dugaan dan alasan (fase menebak), hasil pengamatan (investigasi),
        kode dan temuan (kesimpulan), serta jawaban refleksi (diskusi). LKPD kosong bisa dicetak sebagai cadangan jika kelas tidak memakai komputer.
      </p>

      <div className="pilih-kelas" role="tablist" aria-label="Pilih level">
        {LEVEL.map((l) => (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={l.id === levelId}
            className={`chip-kelas${l.id === levelId ? ' aktif' : ''}`}
            onClick={() => { setLevelId(l.id); setSiswaId(null); }}
          >
            Level {l.nomor} <span>{l.judul}</span>
          </button>
        ))}
      </div>

      <div className="lkpd-kelas">
        <table className="tabel-dasbor tabel-lkpd">
          <thead><tr><th scope="col">Siswa</th><th scope="col">Status level</th><th scope="col">Bagian LKPD terisi</th></tr></thead>
          <tbody>
            {siswa.map((s) => {
              const p = s.progres[level.id];
              const lk = isiLkpd(level, p);
              return (
                <tr key={s.id} className={s.id === siswaId ? 'terpilih' : ''}>
                  <th scope="row">
                    {p ? <button type="button" className="tautan-teks" onClick={() => setSiswaId(s.id)}>{s.nama}</button> : s.nama}
                  </th>
                  <td><span className={`status-level ${statusLevel(p).kode}`}>{statusLevel(p).teks}</span></td>
                  <td>
                    {p ? (
                      <span className="pip-lkpd" aria-label={`${lk.terisi} dari ${lk.total} bagian`}>
                        {lk.bagian.map((b) => <i key={b.nama} className={b.isi ? 'isi' : ''} title={b.nama} />)}
                        <span>{lk.terisi}/{lk.total}</span>
                      </span>
                    ) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="lkpd-wadah">
          {pilih ? (
            <>
              <div className="baris-judul">
                <h3>{pilih.nama}</h3>
                <button
                  type="button"
                  className="tombol kecil krem"
                  onClick={() => cetak(<LembarKerja level={level} progres={pilih.progres[level.id]} nama={pilih.nama} kelas={data.kelas.nama} />)}
                >
                  Cetak / simpan PDF
                </button>
              </div>
              <LembarKerja level={level} progres={pilih.progres[level.id]} nama={pilih.nama} kelas={data.kelas.nama} />
            </>
          ) : <p className="fase-catatan">Pilih nama siswa untuk membaca LKPD-nya.</p>}
        </div>
      </div>
      {portalCetak}
    </section>
  );
}
