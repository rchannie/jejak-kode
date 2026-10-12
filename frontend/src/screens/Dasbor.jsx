import { useEffect, useMemo, useState } from 'react';
import { FASE, LEVEL } from '../game/levels.js';
import { ambilDasbor, pindahLayar, useToko } from '../data/store.js';

const namaFase = (id) => (FASE.find((f) => f.id === id) || {}).nama || '-';

export default function Dasbor() {
  const siswaLokal = useToko((s) => s.siswa);
  const adaPemain = useToko((s) => !!s.siswaId);
  const [data, setData] = useState({ sumber: 'lokal', siswa: Object.values(siswaLokal) });
  const [pilih, setPilih] = useState(null);
  const [memuat, setMemuat] = useState(false);

  async function muat() {
    setMemuat(true);
    const d = await ambilDasbor();
    setData(d);
    setMemuat(false);
  }
  useEffect(() => { muat(); }, [siswaLokal]);
  useEffect(() => {
    const t = setInterval(muat, 10000);
    return () => clearInterval(t);
  }, []);

  const siswa = data.siswa;
  const ringkasan = useMemo(() => LEVEL.map((l) => {
    const daftar = siswa.map((s) => ({ s, p: s.progres[l.id] })).filter((x) => x.p);
    const menebak = daftar.filter((x) => x.p.tebakan);
    const sesuai = menebak.filter((x) => x.p.tebakanBenar).length;
    const hitung = {};
    menebak.filter((x) => !x.p.tebakanBenar).forEach((x) => { hitung[x.p.tebakan] = (hitung[x.p.tebakan] || 0) + 1; });
    const salahTerbanyak = Object.entries(hitung).sort((a, b) => b[1] - a[1])[0];
    const perluBantuan = daftar.filter((x) => !x.p.selesai && (
      (x.p.percobaanPerbaikan >= 2 && !x.p.perbaikanBerhasil) || x.p.percobaanAturan >= 2
      || ((x.p.percobaanTulis || 0) >= 3 && !x.p.tulisBerhasil)
    ));
    return {
      level: l,
      mulai: daftar.length,
      selesai: daftar.filter((x) => x.p.selesai).length,
      menebak: menebak.length,
      sesuai,
      miskonsepsi: salahTerbanyak
        ? { teks: l.tebakan.pilihan.find((o) => o.id === salahTerbanyak[0]).teks, jumlah: salahTerbanyak[1] }
        : null,
      perluBantuan: perluBantuan.map((x) => x.s.nama),
    };
  }), [siswa]);

  const detail = pilih ? (() => {
    const s = siswa.find((x) => x.id === pilih.siswa);
    const l = LEVEL.find((x) => x.id === pilih.level);
    return s && l ? { s, l, p: s.progres[l.id] } : null;
  })() : null;

  return (
    <div className="dasbor">
      <header className="dasbor-kepala bingkai-kertas">
        <div>
          <h1>Dasbor guru</h1>
          <p className="fase-catatan">
            {data.sumber === 'server'
              ? 'Data dari server sekolah, diperbarui setiap 10 detik.'
              : 'Mode tanpa server: hanya menampilkan siswa yang bermain di perangkat ini selama sesi ini.'}
          </p>
        </div>
        <div className="dasbor-tombol">
          <button type="button" className="tombol krem" onClick={muat} disabled={memuat}>{memuat ? 'Memuat...' : 'Muat ulang'}</button>
          <button type="button" className="tombol" onClick={() => pindahLayar(adaPemain ? 'level' : 'mulai')}>
            {adaPemain ? 'Kembali ke game' : 'Ke halaman masuk'}
          </button>
        </div>
      </header>

      {siswa.length === 0 ? (
        <div className="kosong bingkai-kertas">
          <h2>Belum ada siswa yang bermain</h2>
          <p>Minta siswa membuka game, mengisi nama dan kelas, lalu memulai level 1. Tebakan, percobaan, dan temuan mereka akan muncul di sini.</p>
        </div>
      ) : (
        <>
          <section className="ringkas-level" aria-label="Ringkasan per level">
            {ringkasan.map((r) => (
              <article key={r.level.id} className="ringkas-kartu bingkai-kertas">
                <h2>Level {r.level.nomor}: {r.level.konsep}</h2>
                <p className="angka-besar">{r.selesai}<span>/{r.mulai} selesai</span></p>
                <p>Tebakan sesuai hasil: <b>{r.sesuai}</b> dari {r.menebak} siswa</p>
                {r.miskonsepsi ? (
                  <p className="miskonsepsi"><b>Tebakan keliru terbanyak ({r.miskonsepsi.jumlah}):</b> {r.miskonsepsi.teks}</p>
                ) : <p className="fase-catatan">Belum ada tebakan keliru.</p>}
                {r.perluBantuan.length ? (
                  <p className="perlu-bantuan"><b>Perlu didampingi:</b> {r.perluBantuan.join(', ')}</p>
                ) : null}
              </article>
            ))}
          </section>

          <section className="tabel-wadah bingkai-kertas" aria-label="Progres setiap siswa">
            <table className="tabel-dasbor">
              <thead>
                <tr>
                  <th scope="col">Siswa</th>
                  {LEVEL.map((l) => <th key={l.id} scope="col">Level {l.nomor}</th>)}
                </tr>
              </thead>
              <tbody>
                {siswa.map((s) => (
                  <tr key={s.id}>
                    <th scope="row">{s.nama}<span>{s.kelas}</span></th>
                    {LEVEL.map((l) => {
                      const p = s.progres[l.id];
                      const aktif = pilih && pilih.siswa === s.id && pilih.level === l.id;
                      return (
                        <td key={l.id}>
                          {p ? (
                            <button
                              type="button"
                              className={`sel${aktif ? ' aktif' : ''}`}
                              onClick={() => setPilih({ siswa: s.id, level: l.id })}
                              aria-pressed={aktif}
                            >
                              <span className={`status-level${p.selesai ? ' selesai' : ' jalan'}`}>{p.selesai ? 'Selesai' : namaFase(p.fase)}</span>
                              <span className="sel-detail">
                                {p.tebakan ? (p.tebakanBenar ? 'Tebakan sesuai' : 'Tebakan keliru') : 'Belum menebak'}
                                {p.percobaanPerbaikan ? ` · uji ${p.percobaanPerbaikan}x` : ''}
                                {p.sublevelDibuka ? ' · sublevel' : ''}
                                {p.percobaanTulis ? ` · tulis ${p.percobaanTulis}x` : ''}
                                {p.petunjukTulis ? ` · ${p.petunjukTulis} petunjuk` : ''}
                              </span>
                            </button>
                          ) : <span className="sel-kosong">Belum mulai</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {detail && detail.p ? (
            <section className="detail bingkai-kertas" aria-label="Detail siswa">
              <h2>{detail.s.nama}, level {detail.l.nomor}: {detail.l.judul}</h2>
              <dl className="ringkasan">
                <div><dt>Fase sekarang</dt><dd>{detail.p.selesai ? 'Selesai' : namaFase(detail.p.fase)}</dd></div>
                <div><dt>Tebakan</dt><dd>{detail.p.tebakan ? `${detail.p.tebakanBenar ? 'Sesuai' : 'Keliru'}: ${(detail.l.tebakan.pilihan.find((o) => o.id === detail.p.tebakan) || {}).teks}` : 'Belum menebak'}</dd></div>
                <div><dt>Investigasi</dt><dd>{detail.p.jalankan} kali menjalankan kode, {detail.p.eksperimen} kali dengan kode yang diubah</dd></div>
                <div><dt>Misi perbaikan</dt><dd>{detail.p.percobaanPerbaikan} kali diuji, {detail.p.perbaikanBerhasil ? 'berhasil' : 'belum berhasil'}</dd></div>
                <div><dt>Sublevel latihan</dt><dd>{detail.p.sublevelDibuka ? (detail.p.sublevelBerhasil ? 'Dibuka dan berhasil' : 'Dibuka, belum berhasil') : 'Tidak dibuka'}</dd></div>
                <div><dt>Misi tulis sendiri</dt><dd>{detail.p.percobaanTulis ? `${detail.p.percobaanTulis} kali diuji, ${detail.p.tulisBerhasil ? 'berhasil' : 'belum berhasil'}, ${detail.p.petunjukTulis || 0} petunjuk dibuka${detail.p.kerangkaDipakai ? ', memakai kerangka kode' : ''}` : 'Belum dikerjakan'}</dd></div>
                <div><dt>Merumuskan aturan</dt><dd>{detail.p.aturanBenar ? `Tepat setelah ${detail.p.percobaanAturan} kali mencoba` : detail.p.percobaanAturan ? `${detail.p.percobaanAturan} kali mencoba, belum tepat` : 'Belum'}</dd></div>
                <div><dt>Temuan siswa</dt><dd>{detail.p.temuan ? `“${detail.p.temuan}”` : 'Belum ditulis'}</dd></div>
              </dl>
              {detail.p.kodeTulis ? (
                <>
                  <h3>Kode yang ditulis siswa sendiri</h3>
                  <pre className="kode-siswa">{detail.p.kodeTulis}</pre>
                </>
              ) : null}
              {detail.p.kodePerbaikan ? (
                <>
                  <h3>Kode misi perbaikan</h3>
                  <pre className="kode-siswa">{detail.p.kodePerbaikan}</pre>
                </>
              ) : null}
              <h3>Pertanyaan pancingan untuk refleksi</h3>
              <ul>
                {detail.l.diskusi.map((q) => <li key={q}>{q}</li>)}
              </ul>
            </section>
          ) : (
            <p className="fase-catatan">Pilih salah satu sel di tabel untuk melihat detail tebakan, percobaan, dan temuan siswa.</p>
          )}
        </>
      )}
    </div>
  );
}
