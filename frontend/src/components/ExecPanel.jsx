import { useEffect, useRef } from 'react';
import { tampil, teksBenar } from '../engine/interpreter.js';

// Lapis kedua visualisasi eksekusi: buku catatan eksekusi. Isinya dua kolom.
//
// Kiri, "Penjelasan langkah": daftar semua langkah yang sudah dijalankan,
// berurutan seperti tabel telusur (trace table). Langkah yang sedang terjadi
// selalu berada paling bawah dan ditampilkan lengkap: baris kodenya,
// perhitungan ruas kanan atau hasil kondisi, lalu penjelasannya. Langkah
// sebelumnya diringkas menjadi satu baris supaya tidak berdesakan.
//
// Kanan, isi memori program: tabel variabel, penghitung perulangan, dan
// keluaran printf. Bagian yang konsepnya belum dipakai di kode (misalnya
// Perulangan di level dasar) tidak ditampilkan, kecuali sudah ada isinya.

export default function ExecPanel({ langkah, galat, kodeBaris, selesai, belumMulai, blok = {}, riwayat = [] }) {
  const vars = langkah ? langkah.vars : {};
  const namaVar = Object.keys(vars);
  const loops = langkah ? Object.entries(langkah.perulangan) : [];
  const output = langkah ? langkah.output : '';

  const tampilVariabel = blok.variabel || namaVar.length > 0;
  const tampilLoop = blok.perulangan || loops.length > 0;
  const tampilKeluaran = blok.keluaran || !!output;
  const adaMemori = tampilVariabel || tampilLoop || tampilKeluaran;

  return (
    <section className={`catatan bingkai-kertas${adaMemori ? '' : ' satu-kolom'}`} aria-label="Catatan eksekusi">
      <JejakLangkah riwayat={riwayat} kodeBaris={kodeBaris} selesai={selesai && !galat} belumMulai={belumMulai} />

      {adaMemori ? (
        <div className="catatan-memori" aria-label="Isi memori program">
          {tampilVariabel ? (
            <div className="catatan-blok">
              <h3 className="catatan-judul">Variabel</h3>
              {namaVar.length ? (
                <table className="tabel-var">
                  <thead><tr><th scope="col">Tipe</th><th scope="col">Nama</th><th scope="col">Nilai</th></tr></thead>
                  <tbody>
                    {namaVar.map((n) => (
                      <tr key={n} className={langkah.ubah.includes(n) ? 'berubah' : ''}>
                        <td><code className="k-tipe">{vars[n].tipe}</code></td>
                        <td><code>{n}</code></td>
                        <td><code>{vars[n].diisi ? tampil(vars[n].nilai, vars[n].tipe) : 'belum diisi'}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="catatan-kosong">Belum ada variabel.</p>
              )}
            </div>
          ) : null}
          {tampilLoop ? (
            <div className="catatan-blok">
              <h3 className="catatan-judul">Perulangan</h3>
              {loops.length ? loops.map(([baris, info]) => (
                <div key={baris} className="loop">
                  <code className="loop-kode">{info.teks}</code>
                  <span className="loop-putaran">{`putaran ke-${info.putaran}${info.selesai ? ', selesai' : ''}`}</span>
                  {info.putaran <= 16 ? (
                    <div className="loop-pip" aria-hidden="true">
                      {Array.from({ length: info.putaran }, (_, i) => <span key={i} />)}
                    </div>
                  ) : null}
                </div>
              )) : (
                <p className="catatan-kosong">Muncul saat for atau while berjalan.</p>
              )}
            </div>
          ) : null}
          {tampilKeluaran ? (
            <div className="catatan-blok">
              <h3 className="catatan-judul">Keluaran printf</h3>
              {output ? <pre className="keluaran">{output}</pre> : <p className="catatan-kosong">Belum ada yang ditampilkan.</p>}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function JejakLangkah({ riwayat, kodeBaris, selesai, belumMulai }) {
  const daftar = useRef(null);
  // langkah terbaru selalu terlihat di bagian bawah daftar
  useEffect(() => {
    const el = daftar.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [riwayat.length, selesai]);

  const jumlah = riwayat.filter((r) => !r.galat).length;
  return (
    <div className="catatan-langkah">
      <h3 className="catatan-judul">
        Penjelasan langkah
        {jumlah ? <span className="riwayat-jumlah">{jumlah} langkah</span> : null}
      </h3>
      {belumMulai || !riwayat.length ? (
        <p className="catatan-kosong">
          Tekan <b>Langkah</b> untuk menjalankan satu baris, atau <b>Jalankan</b> untuk menjalankan semuanya.
          Setiap langkah dijelaskan di sini secara berurutan.
        </p>
      ) : (
        <ol className="riwayat" ref={daftar} aria-live="polite">
          {riwayat.map((r, i) => (i === riwayat.length - 1
            ? <LangkahSekarang key={`${r.nomor}-${i}`} r={r} kode={r.baris ? (kodeBaris[r.baris - 1] || '').trim() : ''} />
            : (
              <li key={`${r.nomor}-${i}`} className={`riwayat-lama${r.peringatan ? ' peringatan' : ''}`}>
                <span className="riwayat-baris">{r.baris ? `Baris ${r.baris}` : 'Kode'}</span>
                <span>{r.pesan}</span>
              </li>
            )))}
          {selesai ? <li className="riwayat-selesai">Program selesai.</li> : null}
        </ol>
      )}
    </div>
  );
}

// Langkah yang sedang terjadi: baris kode, perhitungan atau kondisi, dan penjelasan.
function LangkahSekarang({ r, kode }) {
  if (r.galat) {
    return (
      <li className="riwayat-sekarang galat">
        <p><strong>{r.baris ? `Baris ${r.baris}` : 'Kode'} bermasalah.</strong> {r.pesan}</p>
      </li>
    );
  }
  const k = r.kondisi;
  const h = r.hitung;
  return (
    <li className={`riwayat-sekarang${r.peringatan ? ' peringatan' : ''}`}>
      <div className="catatan-baris">
        <span className="chip-baris">Baris {r.baris}</span>
        {kode ? <code>{kode}</code> : null}
      </div>
      {k ? (
        <div className="rincian" aria-label="Hasil kondisi">
          <code className="kondisi-teks">{k.kata === 'else' ? 'else' : k.teks}</code>
          {k.kata !== 'else' ? (
            <>
              <span className="kondisi-panah" aria-hidden="true">→</span>
              <code className="kondisi-teks">{k.rincian}</code>
            </>
          ) : null}
          <span className="kondisi-panah" aria-hidden="true">→</span>
          <span className={`chip-hasil ${k.hasil ? 'benar' : 'salah'}`}>{teksBenar(k.hasil)}</span>
        </div>
      ) : h ? (
        <div className="rincian" aria-label="Perhitungan ruas kanan">
          <code className="kondisi-teks">{h.teks}</code>
          {h.rincian !== h.hasil ? (
            <>
              <span className="kondisi-panah" aria-hidden="true">→</span>
              <code className="kondisi-teks">{h.rincian}</code>
            </>
          ) : null}
          <span className="kondisi-panah" aria-hidden="true">→</span>
          <span className="chip-isi">{h.nama} = {h.hasil}</span>
        </div>
      ) : null}
      <p className="catatan-pesan">{k && r.akibat ? r.akibat : r.pesan}</p>
    </li>
  );
}
