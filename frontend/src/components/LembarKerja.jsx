import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { TOKOH } from '../game/levels.js';

// LKPD (Lembar Kerja Peserta Didik) satu level, disusun mengikuti lima fase
// guided inquiry. Isinya diambil dari jawaban siswa selama bermain:
//   konseptualisasi -> dugaan dan alasan
//   investigasi     -> jawaban pertanyaan pengamatan
//   kesimpulan      -> hasil perbandingan, misi perbaikan, kode tulisan sendiri, aturan, temuan
//   diskusi         -> jawaban pertanyaan refleksi
// Lembar yang sama dipakai di game (dilihat siswa), di dasbor guru, dan saat dicetak.
// Jika `kosong`, bagian jawaban diganti garis untuk diisi dengan tangan.

const kataMinimal = (t, n) => (t || '').trim().split(/\s+/).filter(Boolean).length >= n;

// Berapa bagian LKPD yang sudah terisi. Dipakai di dasbor guru.
export function isiLkpd(level, p) {
  const lk = (p && p.lkpd) || {};
  const bagian = [
    { nama: 'Dugaan dan alasan', isi: !!(p && p.tebakan) && kataMinimal(lk.alasan, 1) },
    { nama: 'Pengamatan', isi: level.investigasi.pemandu.every((_, i) => kataMinimal((lk.pengamatan || [])[i], 1)) },
    { nama: 'Kode tulisan sendiri', isi: !!(p && p.tulisBerhasil) },
    { nama: 'Aturan dan temuan', isi: !!(p && p.aturanBenar) && kataMinimal(p.temuan, 1) },
    { nama: 'Refleksi', isi: level.diskusi.every((_, i) => kataMinimal((lk.refleksi || [])[i], 1)) },
  ];
  return { terisi: bagian.filter((b) => b.isi).length, total: bagian.length, bagian };
}

function Jawaban({ teks, kosong, baris = 2 }) {
  if (kosong || !teks || !String(teks).trim()) {
    return kosong
      ? <span className="lkpd-garis" style={{ '--baris': baris }} aria-label="Tempat menulis jawaban" />
      : <span className="lkpd-belum">Belum diisi</span>;
  }
  return <span className="lkpd-jawab">{teks}</span>;
}

function Centang({ pilih }) {
  return <span className={`lkpd-kotak${pilih ? ' pilih' : ''}`} aria-hidden="true">{pilih ? 'X' : ''}</span>;
}

const tanggal = (t) => (t ? new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

export function LembarKerja({ level, progres, nama = '', kelas = '', kosong = false }) {
  const p = kosong ? null : progres;
  const lk = (p && p.lkpd) || {};
  const tb = level.tebakan;
  const at = level.aturan;
  const tokoh = TOKOH[level.tokoh];
  return (
    <article className="lkpd" aria-label={`LKPD level ${level.nomor}`}>
      <header className="lkpd-kop">
        <p className="lkpd-kecil">Lembar Kerja Peserta Didik (LKPD) · Jejak Kode · Bahasa C</p>
        <h2>Level {level.nomor}: {level.judul}</h2>
        <p className="lkpd-kecil">Bab {level.bab} · {level.konsep} · Model Guided Inquiry · {level.durasi}</p>
      </header>

      <table className="lkpd-identitas">
        <tbody>
          <tr>
            <th scope="row">Nama</th><td>{nama || <span className="lkpd-garis satu" />}</td>
            <th scope="row">Kelas</th><td>{kelas || <span className="lkpd-garis satu" />}</td>
            <th scope="row">Tanggal</th><td>{tanggal(p && (p.selesaiPada || p.mulai)) || <span className="lkpd-garis satu" />}</td>
          </tr>
        </tbody>
      </table>

      <section className="lkpd-bagian">
        <h3>Tujuan</h3>
        <p>{level.orientasi.misi}</p>
        <p className="lkpd-kecil">Indikator computational thinking: {level.ct}</p>
        <h3>Petunjuk</h3>
        <ol className="lkpd-petunjuk">
          <li>Baca cerita {tokoh.nama} dan misi level di dalam game.</li>
          <li>Sebelum menjalankan kode, tulis dugaanmu beserta alasannya.</li>
          <li>Jalankan kode langkah demi langkah, amati dunia game dan catatan eksekusi, lalu jawab pertanyaan pengamatan.</li>
          <li>Perbaiki kode Bit, tulis kodemu sendiri, lalu rumuskan aturan dengan kalimatmu sendiri.</li>
          <li>Jawab pertanyaan refleksi untuk diskusi kelas.</li>
        </ol>
      </section>

      <section className="lkpd-bagian">
        <h3>1. Konseptualisasi: membuat dugaan</h3>
        <p>{tb.pertanyaan}</p>
        <ul className="lkpd-pilihan">
          {tb.pilihan.map((o) => (
            <li key={o.id}><Centang pilih={p && p.tebakan === o.id} /> {o.teks}</li>
          ))}
        </ul>
        <p className="lkpd-label">Alasanku:</p>
        <Jawaban teks={lk.alasan} kosong={kosong} baris={2} />
      </section>

      <section className="lkpd-bagian">
        <h3>2. Investigasi: mengamati eksekusi kode</h3>
        <table className="lkpd-tabel">
          <thead><tr><th scope="col">No</th><th scope="col">Pertanyaan pengamatan</th><th scope="col">Hasil pengamatanku</th></tr></thead>
          <tbody>
            {level.investigasi.pemandu.map((q, i) => (
              <tr key={q}>
                <td>{i + 1}</td>
                <td>{q}</td>
                <td><Jawaban teks={(lk.pengamatan || [])[i]} kosong={kosong} baris={3} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {p ? <p className="lkpd-kecil">Kode dijalankan sampai selesai {p.jalankan || 0} kali, {p.eksperimen || 0} kali dengan kode yang diubah.</p> : null}
      </section>

      <section className="lkpd-bagian">
        <h3>3. Kesimpulan</h3>
        <p className="lkpd-label">a. Apakah dugaanku sesuai dengan hasil pengamatan?</p>
        {p && p.tebakan && p.fase !== 'konseptualisasi' && p.fase !== 'investigasi'
          ? <span className="lkpd-jawab">{p.tebakanBenar ? 'Sesuai.' : 'Berbeda.'} {tb.penjelasan}</span>
          : <Jawaban kosong={kosong} baris={2} />}
        <p className="lkpd-label">b. Memperbaiki kode Bit</p>
        {p && p.percobaanPerbaikan
          ? <span className="lkpd-jawab">{p.perbaikanBerhasil ? `Berhasil setelah ${p.percobaanPerbaikan} kali diuji` : `Belum berhasil (${p.percobaanPerbaikan} kali diuji)`}{p.sublevelDibuka ? ', dengan bantuan sublevel latihan' : ''}.</span>
          : <Jawaban kosong={kosong} baris={1} />}
        <p className="lkpd-label">c. Kode yang kutulis sendiri: {level.tulis.cerita}</p>
        {p && p.kodeTulis && p.tulisBerhasil
          ? <pre className="lkpd-kode">{p.kodeTulis}</pre>
          : kosong ? <span className="lkpd-garis kode" style={{ '--baris': 8 }} /> : <span className="lkpd-belum">Belum diisi</span>}
        <p className="lkpd-label">d. {at.pertanyaan}</p>
        <ul className="lkpd-pilihan">
          {at.pilihan.map((o) => (
            <li key={o.id}><Centang pilih={p && p.aturanBenar && p.aturan === o.id} /> {o.teks}</li>
          ))}
        </ul>
        <p className="lkpd-label">e. Temuanku dengan kalimatku sendiri:</p>
        <Jawaban teks={p && p.temuan} kosong={kosong} baris={3} />
      </section>

      <section className="lkpd-bagian">
        <h3>4. Diskusi dan refleksi</h3>
        <table className="lkpd-tabel">
          <thead><tr><th scope="col">No</th><th scope="col">Pertanyaan refleksi</th><th scope="col">Jawabanku</th></tr></thead>
          <tbody>
            {level.diskusi.map((q, i) => (
              <tr key={q}>
                <td>{i + 1}</td>
                <td>{q}</td>
                <td><Jawaban teks={(lk.refleksi || [])[i]} kosong={kosong} baris={3} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="lkpd-kaki">
        <div><span>Catatan guru</span><span className="lkpd-garis" style={{ '--baris': 2 }} /></div>
        <div><span>Paraf guru</span><span className="lkpd-garis satu" /></div>
      </footer>
    </article>
  );
}

// Mencetak (atau menyimpan sebagai PDF) isi apa pun. Isinya dirender ke
// .area-cetak, lalu dialog cetak browser dibuka. Bagian lain halaman
// disembunyikan oleh CSS @media print.
export function useCetak() {
  const [isi, setIsi] = useState(null);
  useEffect(() => {
    if (!isi) return undefined;
    document.body.classList.add('sedang-cetak');
    const selesai = () => { document.body.classList.remove('sedang-cetak'); setIsi(null); };
    window.addEventListener('afterprint', selesai, { once: true });
    const t = setTimeout(() => window.print(), 80);
    return () => {
      clearTimeout(t);
      window.removeEventListener('afterprint', selesai);
      document.body.classList.remove('sedang-cetak');
    };
  }, [isi]);
  const portal = isi ? createPortal(<div className="area-cetak">{isi}</div>, document.body) : null;
  return [setIsi, portal];
}
