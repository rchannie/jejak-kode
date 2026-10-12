import { useState } from 'react';
import { FASE, LEVEL } from '../../game/levels.js';
import { api } from '../../data/store.js';
import { LembarKerja, isiLkpd, useCetak } from '../../components/LembarKerja.jsx';
import { TombolYakin } from './Umum.jsx';
import {
  alasanDampingi, menitLalu, namaFase, statusLevel, teksTerakhirAktif, teksWaktu, tingkatBantuan, totalDetik,
} from './olah.js';

const NAMA_BAGIAN = { percobaan: 'percobaan', perbaikan: 'misi perbaikan', sublevel: 'sublevel', tulis: 'tulis sendiri' };

export default function TabSiswa({ data, daftarKelas, siswaPilih, setSiswaPilih, tangani, muatUlang }) {
  const s = siswaPilih ? data.siswa.find((x) => x.id === siswaPilih) : null;
  if (s) {
    return <ProfilSiswa s={data.siswa.find((x) => x.id === siswaPilih)} data={data} daftarKelas={daftarKelas} kembali={() => setSiswaPilih(null)} tangani={tangani} muatUlang={muatUlang} />;
  }
  return (
    <section className="tabel-wadah bingkai-kertas" aria-label="Progres setiap siswa">
      <table className="tabel-dasbor">
        <thead>
          <tr>
            <th scope="col">Siswa</th>
            <th scope="col" className="kolom-aktif">Aktivitas</th>
            {LEVEL.map((l) => <th key={l.id} scope="col">Level {l.nomor}</th>)}
            <th scope="col" className="kolom-waktu">Waktu</th>
          </tr>
        </thead>
        <tbody>
          {data.siswa.map((x) => {
            const m = menitLalu(x.terakhirAktif, data.sekarang);
            return (
              <tr key={x.id}>
                <th scope="row">
                  <button type="button" className="tautan-teks nama-siswa" onClick={() => setSiswaPilih(x.id)}>{x.nama}</button>
                  <span>{x.username}</span>
                </th>
                <td><span className={`chip-aktif${m !== null && m < 2 ? ' aktif' : ''}`}>{teksTerakhirAktif(x.terakhirAktif, data.sekarang)}</span></td>
                {LEVEL.map((l) => {
                  const p = x.progres[l.id];
                  const st = statusLevel(p);
                  const b = tingkatBantuan(p);
                  const awas = alasanDampingi(p).length > 0;
                  return (
                    <td key={l.id}>
                      {p ? (
                        <button type="button" className={`sel${awas ? ' awas' : ''}`} onClick={() => setSiswaPilih(x.id)}>
                          <span className={`status-level ${st.kode}`}>{st.teks}</span>
                          <span className="sel-detail">
                            {teksWaktu(totalDetik(p))}
                            {p.tebakan ? (p.tebakanBenar ? ' · tebakan sesuai' : ' · tebakan keliru') : ''}
                            {p.jumlahGalat ? ` · ${p.jumlahGalat} galat` : ''}
                          </span>
                          {b ? <span className={`chip-bantuan ${b.kode}`}>{b.teks}</span> : null}
                        </button>
                      ) : <span className="sel-kosong">Belum mulai</span>}
                    </td>
                  );
                })}
                <td className="kolom-waktu">{teksWaktu(LEVEL.reduce((a, l) => a + totalDetik(x.progres[l.id]), 0))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

// ------------------------------------------------------------------ profil satu siswa
function ProfilSiswa({ s, data, daftarKelas, kembali, tangani, muatUlang }) {
  const [sandi, setSandi] = useState(null);
  const [ubahNama, setUbahNama] = useState(false);
  const [nama, setNama] = useState(s.nama);
  const levelMulai = LEVEL.filter((l) => s.progres[l.id]);
  const terakhir = levelMulai.length
    ? levelMulai.slice().sort((a, b) => String(s.diperbarui[b.id] || '').localeCompare(String(s.diperbarui[a.id] || '')))[0].id
    : null;
  const [levelId, setLevelId] = useState(terakhir);
  const [cetak, portalCetak] = useCetak();

  const semua = LEVEL.map((l) => s.progres[l.id]).filter(Boolean);
  const selesai = semua.filter((p) => p.selesai).length;
  const menebak = semua.filter((p) => p.tebakan);
  const galat = semua.reduce((a, p) => a + (p.jumlahGalat || 0), 0);
  const petunjuk = semua.reduce((a, p) => a + (p.petunjukTulis || 0), 0);
  const bantuanPenuh = semua.filter((p) => p.sublevelDibuka || p.kerangkaDipakai).length;

  async function aksi(jalur, metode, isi) {
    const r = await api(jalur, { metode, isi });
    if (tangani(r)) muatUlang();
    return r;
  }

  const level = levelId ? LEVEL.find((l) => l.id === levelId) : null;
  const p = level ? s.progres[level.id] : null;
  const lembar = level ? <LembarKerja level={level} progres={p} nama={s.nama} kelas={data.kelas.nama} /> : null;

  return (
    <div className="profil">
      <button type="button" className="tautan-teks" onClick={kembali}>Kembali ke semua siswa</button>

      <section className="bingkai-kertas blok-dasbor profil-kepala">
        <div>
          {ubahNama ? (
            <form className="form-baris" onSubmit={async (e) => { e.preventDefault(); await aksi(`/guru/siswa/${s.id}`, 'PATCH', { nama }); setUbahNama(false); }}>
              <label className="isian"><span className="sr">Nama siswa</span><input value={nama} onChange={(e) => setNama(e.target.value)} required autoFocus /></label>
              <button type="submit" className="tombol kecil">Simpan</button>
              <button type="button" className="tombol kecil krem" onClick={() => setUbahNama(false)}>Batal</button>
            </form>
          ) : <h2>{s.nama}</h2>}
          <p className="fase-catatan">
            Username <b>{s.username}</b> · {data.kelas.nama} · terdaftar {new Date(s.dibuat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} · {teksTerakhirAktif(s.terakhirAktif, data.sekarang).toLowerCase()}
          </p>
        </div>
        <div className="baris-tombol">
          {!ubahNama ? <button type="button" className="tombol kecil krem" onClick={() => setUbahNama(true)}>Ubah nama</button> : null}
          <TombolYakin
            label="Reset kata sandi"
            tanya="Buat kata sandi sementara?"
            ya="Reset"
            aksi={async () => { const r = await aksi(`/guru/siswa/${s.id}/reset-sandi`, 'POST'); if (r.ok) setSandi(r.data.sandiSementara); }}
          />
          {daftarKelas.length > 1 ? (
            <label className="pindah-kelas">
              <span>Pindah ke</span>
              <select value="" onChange={(e) => { if (e.target.value) aksi(`/guru/siswa/${s.id}`, 'PATCH', { kelasId: Number(e.target.value) }).then(kembali); }}>
                <option value="">pilih kelas</option>
                {daftarKelas.filter((k) => k.id !== data.kelas.id).map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
              </select>
            </label>
          ) : null}
          <TombolYakin
            label="Hapus akun"
            tanya="Akun dan semua progresnya dihapus permanen."
            ya="Hapus"
            aksi={async () => { const r = await aksi(`/guru/siswa/${s.id}`, 'DELETE'); if (r.ok) kembali(); }}
          />
        </div>
        {sandi ? (
          <p className="vonis benar sandi-baru" role="status">
            Kata sandi sementara <b>{s.username}</b>: <code>{sandi}</code>. Berikan ke siswa. Saat masuk, siswa langsung diminta membuat kata sandi baru.
          </p>
        ) : null}
        {s.harusGantiSandi && !sandi ? <p className="fase-catatan">Siswa ini belum mengganti kata sandi sementara.</p> : null}
      </section>

      <dl className="angka-kelas profil-angka">
        <div><dt>Level selesai</dt><dd>{selesai}<span>/{LEVEL.length}</span></dd></div>
        <div><dt>Waktu belajar aktif</dt><dd>{teksWaktu(semua.reduce((a, x) => a + totalDetik(x), 0))}</dd></div>
        <div><dt>Tebakan sesuai</dt><dd>{menebak.filter((x) => x.tebakanBenar).length}<span>/{menebak.length}</span></dd></div>
        <div><dt>Galat kode</dt><dd>{galat}</dd></div>
        <div><dt>Petunjuk dibuka</dt><dd>{petunjuk}</dd></div>
        <div><dt>Level dengan kerangka/sublevel</dt><dd>{bantuanPenuh}</dd></div>
      </dl>

      <section className="tabel-wadah bingkai-kertas" aria-label="Rincian per level">
        <table className="tabel-dasbor tabel-profil">
          <thead>
            <tr>
              <th scope="col">Level</th><th scope="col">Status</th><th scope="col">Waktu</th><th scope="col">Tebakan</th>
              <th scope="col">Investigasi</th><th scope="col">Perbaikan</th><th scope="col">Tulis sendiri</th>
              <th scope="col">Bantuan</th><th scope="col">Galat</th><th scope="col">LKPD</th>
            </tr>
          </thead>
          <tbody>
            {LEVEL.map((l) => {
              const q = s.progres[l.id];
              if (!q) {
                return <tr key={l.id}><th scope="row">{l.nomor}. {l.judul}</th><td colSpan={9} className="sel-kosong">Belum mulai</td></tr>;
              }
              const b = tingkatBantuan(q);
              const lk = isiLkpd(l, q);
              const awas = alasanDampingi(q);
              return (
                <tr key={l.id} className={l.id === levelId ? 'terpilih' : ''}>
                  <th scope="row"><button type="button" className="tautan-teks" onClick={() => setLevelId(l.id)}>{l.nomor}. {l.judul}</button></th>
                  <td><span className={`status-level ${statusLevel(q).kode}`}>{statusLevel(q).teks}</span>{awas.length ? <span className="sel-detail awas-teks">{awas.join(', ')}</span> : null}</td>
                  <td>{teksWaktu(totalDetik(q))}</td>
                  <td>{q.tebakan ? (q.tebakanBenar ? 'Sesuai' : 'Keliru') : '-'}</td>
                  <td>{q.jalankan || 0}x jalan, {q.eksperimen || 0}x ubah kode, {q.tekanLangkah || 0}x Langkah</td>
                  <td>{q.percobaanPerbaikan ? `${q.percobaanPerbaikan}x uji, ${q.perbaikanBerhasil ? 'berhasil' : 'belum'}${q.sublevelDibuka ? ', sublevel' : ''}` : '-'}</td>
                  <td>{q.percobaanTulis ? `${q.percobaanTulis}x uji, ${q.tulisBerhasil ? 'berhasil' : 'belum'}` : '-'}</td>
                  <td>{b ? <span className={`chip-bantuan ${b.kode}`}>{b.teks}</span> : '-'}</td>
                  <td>{q.jumlahGalat || 0}</td>
                  <td><button type="button" className="tautan-teks" onClick={() => setLevelId(l.id)}>{lk.terisi}/{lk.total} bagian</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {level && p ? (
        <section className="profil-level">
          <div className="bingkai-kertas blok-dasbor">
            <h3>Level {level.nomor}: waktu di setiap fase</h3>
            <div className="bar-fase">
              {FASE.map((f) => {
                const d = (p.waktu || {})[f.id] || 0;
                const maks = Math.max(60, ...FASE.map((x) => (p.waktu || {})[x.id] || 0));
                return (
                  <div key={f.id} className={p.fase === f.id && !p.selesai ? 'sekarang' : ''}>
                    <span className="bar-fase-nama">{f.nama}</span>
                    <span className="bar-fase-isi"><i style={{ width: `${(d / maks) * 100}%` }} /></span>
                    <span className="bar-fase-angka">{teksWaktu(d)}</span>
                  </div>
                );
              })}
            </div>
            <p className="fase-catatan">Hanya waktu aktif yang dihitung: tab game terlihat dan ada gerakan mouse atau ketikan dalam 2 menit terakhir. Fase sekarang: {p.selesai ? 'selesai' : namaFase(p.fase)}.</p>

            <h3>Galat kode terakhir</h3>
            {(p.galat || []).length ? (
              <ol className="daftar-galat">
                {p.galat.slice().reverse().map((g) => (
                  <li key={g.t}>
                    <span className="chip">{g.baris ? `Baris ${g.baris}` : 'Kode'}</span>
                    {g.pesan}
                    <span className="label-kecil"> ({NAMA_BAGIAN[g.bagian] || g.bagian}, {new Date(g.t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})</span>
                  </li>
                ))}
              </ol>
            ) : <p className="fase-catatan">Tidak ada galat di level ini.</p>}

            {p.kodePerbaikan ? (<><h3>Kode misi perbaikan yang berhasil</h3><pre className="kode-siswa">{p.kodePerbaikan}</pre></>) : null}
          </div>

          <div className="bingkai-kertas blok-dasbor">
            <div className="baris-judul">
              <h3>LKPD level {level.nomor}</h3>
              <button type="button" className="tombol kecil krem" onClick={() => cetak(lembar)}>Cetak / simpan PDF</button>
            </div>
            <div className="lkpd-wadah">{lembar}</div>
          </div>
        </section>
      ) : null}
      {portalCetak}
    </div>
  );
}
