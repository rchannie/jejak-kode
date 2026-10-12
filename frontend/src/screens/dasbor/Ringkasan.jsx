import { useMemo } from 'react';
import { LEVEL } from '../../game/levels.js';
import { ringkasLevel, teksWaktu } from './olah.js';

// Ringkasan kelas: siapa yang perlu didampingi sekarang, lalu kartu per level.
export default function TabRingkasan({ siswa, dampingi, bukaSiswa }) {
  const ringkas = useMemo(() => LEVEL.map((l) => ringkasLevel(siswa, l)), [siswa]);
  return (
    <>
      <section className="bingkai-kertas blok-dasbor" aria-labelledby="judul-dampingi">
        <h2 id="judul-dampingi">Perlu didampingi sekarang</h2>
        {dampingi.length ? (
          <ul className="daftar-dampingi">
            {dampingi.map((x) => (
              <li key={`${x.s.id}-${x.l.id}`}>
                <button type="button" className="tautan-teks" onClick={() => bukaSiswa(x.s.id)}>{x.s.nama}</button>
                <span className="chip">Level {x.l.nomor}</span>
                <span>{x.alasan.join(', ')}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="fase-catatan">Belum ada. Siswa ditandai di sini jika gagal berkali-kali, sering mendapat galat, atau terlalu lama di satu fase.</p>
        )}
      </section>

      <section className="ringkas-level" aria-label="Ringkasan per level">
        {ringkas.map((r) => {
          const totalBantuan = r.bantuan.mandiri + r.bantuan.petunjuk + r.bantuan.bantuan;
          return (
            <article key={r.level.id} className="ringkas-kartu bingkai-kertas">
              <h3>Level {r.level.nomor}: {r.level.judul}</h3>
              <p className="label-kecil">{r.level.bab} · {r.level.konsep}</p>
              <p className="angka-besar">{r.selesai}<span>/{siswa.length} selesai</span></p>
              <dl className="ringkas-angka">
                <div><dt>Sudah mulai</dt><dd>{r.mulai} siswa</dd></div>
                <div><dt>Tebakan sesuai</dt><dd>{r.menebak ? `${r.sesuai} dari ${r.menebak}` : '-'}</dd></div>
                <div><dt>Rata-rata waktu</dt><dd>{r.selesai ? teksWaktu(r.rataWaktu) : '-'}</dd></div>
              </dl>
              {totalBantuan ? (
                <div className="bar-tingkat" aria-label={`Mandiri ${r.bantuan.mandiri}, dengan petunjuk ${r.bantuan.petunjuk}, dengan bantuan ${r.bantuan.bantuan}`}>
                  {['mandiri', 'petunjuk', 'bantuan'].map((k) => (r.bantuan[k]
                    ? <span key={k} className={`bar-${k}`} style={{ flexGrow: r.bantuan[k] }}>{r.bantuan[k]}</span>
                    : null))}
                </div>
              ) : null}
              {totalBantuan ? <p className="legenda-bantuan"><i className="bar-mandiri" />Mandiri <i className="bar-petunjuk" />Petunjuk <i className="bar-bantuan" />Kerangka/sublevel</p> : null}
              {r.miskonsepsi ? (
                <p className="miskonsepsi"><b>Tebakan keliru terbanyak ({r.miskonsepsi.jumlah}):</b> {r.miskonsepsi.teks}</p>
              ) : null}
              {r.galat.length ? (
                <div className="galat-sering">
                  <b>Galat yang sering muncul</b>
                  <ul>{r.galat.map((g) => <li key={g.pesan}>{g.pesan} <span>({g.jumlah}x)</span></li>)}</ul>
                </div>
              ) : null}
              {r.dampingi.length ? <p className="perlu-bantuan"><b>Perlu didampingi:</b> {r.dampingi.join(', ')}</p> : null}
            </article>
          );
        })}
      </section>
    </>
  );
}
