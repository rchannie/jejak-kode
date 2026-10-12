import { useEffect, useMemo, useRef, useState } from 'react';
import WorldCanvas from '../components/WorldCanvas.jsx';
import CodeBoard from '../components/CodeBoard.jsx';
import ExecPanel from '../components/ExecPanel.jsx';
import PhaseStepper from '../components/PhaseStepper.jsx';
import { Dialog, Perayaan, Sprite } from '../components/Kecil.jsx';
import { FASE, LEVEL, TOKOH } from '../game/levels.js';
import { ringkasLangkah, usePenjalan } from '../game/usePenjalan.js';
import { periksaTulis } from '../game/periksa.js';
import { jalankanSemua } from '../engine/runner.js';
import { isiBitH } from '../engine/dunia.js';
import { catat, catatLkpd, mulaiLevel, pindahLayar, useToko } from '../data/store.js';
import { LembarKerja, useCetak } from '../components/LembarKerja.jsx';
import { createPortal } from 'react-dom';

const hitungKata = (t) => t.trim().split(/\s+/).filter(Boolean).length;

export default function Bermain({ level, progres }) {
  const fase = progres.fase;
  const tahap = progres.tahapKesimpulan;

  // kode yang sedang dikerjakan di tiap bagian
  const [kodeInv, setKodeInv] = useState(level.percobaan.kode);
  const [kodePerb, setKodePerb] = useState(progres.kodePerbaikan || level.perbaikan.kode);
  const [kodeSub, setKodeSub] = useState(level.sublevel.kode);
  const [kodeTulis, setKodeTulis] = useState(progres.kodeTulis || level.tulis.kode);
  const [hasilMisi, setHasilMisi] = useState(null);
  const [sorak, setSorak] = useState(0);

  // bagian mana yang tampil di dunia dan papan
  let bagian = 'percobaan';
  if (fase === 'kesimpulan' && tahap === 'perbaikan') bagian = 'perbaikan';
  if (fase === 'kesimpulan' && tahap === 'sublevel') bagian = 'sublevel';
  if (fase === 'kesimpulan' && tahap === 'tulis') bagian = 'tulis';
  if ((fase === 'kesimpulan' && tahap === 'aturan') || fase === 'diskusi') bagian = 'hasil';

  const sumber = {
    percobaan: level.percobaan,
    perbaikan: level.perbaikan,
    sublevel: level.sublevel,
    tulis: level.tulis,
    hasil: level.tulis,
  }[bagian];
  const tempat = sumber.tempat || level.tempat;
  const bitH = useMemo(() => isiBitH(level.perintah, level.pakaiPrintf), [level]);
  const kodeTampil = {
    percobaan: fase === 'investigasi' ? kodeInv : level.percobaan.kode,
    perbaikan: kodePerb,
    sublevel: kodeSub,
    tulis: kodeTulis,
    hasil: kodeTulis,
  }[bagian];
  const bisaJalan = fase === 'investigasi' || ['perbaikan', 'sublevel', 'tulis'].includes(bagian);

  function selesaiJalan(h) {
    // Galat kode dicatat untuk dasbor guru (20 galat terakhir per level).
    if (h.galat) {
      catat(level.id, (p) => ({
        jumlahGalat: (p.jumlahGalat || 0) + 1,
        galat: [...(p.galat || []), { pesan: h.galat.pesan, baris: h.galat.baris, bagian, t: Date.now() }].slice(-20),
      }));
    }
    if (fase === 'investigasi') {
      if (h.galat) return; // hanya jalankan yang sampai selesai tanpa galat yang dihitung
      catat(level.id, (p) => ({
        jalankan: p.jalankan + 1,
        eksperimen: p.eksperimen + (kodeInv.trim() !== level.percobaan.kode.trim() ? 1 : 0),
      }));
      return;
    }
    let r = null;
    if (bagian === 'perbaikan') {
      r = level.perbaikan.cek(h);
      catat(level.id, (p) => ({
        percobaanPerbaikan: p.percobaanPerbaikan + 1,
        perbaikanBerhasil: p.perbaikanBerhasil || r.berhasil,
        kodePerbaikan: r.berhasil ? kodePerb : p.kodePerbaikan,
      }));
    } else if (bagian === 'sublevel') {
      r = level.sublevel.cek(h);
      if (r.berhasil) catat(level.id, { sublevelBerhasil: true });
    } else if (bagian === 'tulis') {
      r = periksaTulis(level, kodeTulis, h);
      catat(level.id, (p) => ({
        percobaanTulis: (p.percobaanTulis || 0) + 1,
        tulisBerhasil: p.tulisBerhasil || r.berhasil,
        kodeTulis: kodeTulis,
      }));
    }
    if (r) {
      setHasilMisi({ ...r, bagian });
      if (r.berhasil) setSorak((n) => n + 1);
    }
  }

  const pj = usePenjalan({
    kode: kodeTampil,
    peta: sumber.peta,
    perintah: level.perintah,
    kunci: `${level.id}-${bagian}`,
    onSelesai: selesaiJalan,
  });

  // keadaan dunia saat menampilkan hasil akhir misi tulis
  const keadaanHasil = useMemo(() => {
    if (bagian !== 'hasil') return null;
    return jalankanSemua(kodeTulis, level.tulis.peta, level.perintah).dunia;
  }, [bagian, kodeTulis, level]);

  const ubahKode = (v) => {
    setHasilMisi(null);
    if (bagian === 'percobaan') setKodeInv(v);
    else if (bagian === 'sublevel') setKodeSub(v);
    else if (bagian === 'tulis') setKodeTulis(v);
    else setKodePerb(v);
  };
  const kodeAwal = {
    percobaan: level.percobaan.kode,
    perbaikan: level.perbaikan.kode,
    sublevel: level.sublevel.kode,
    tulis: level.tulis.kode,
  }[bagian];

  // Saat membandingkan tebakan, dunia dan catatan menampilkan hasil akhir
  // kode percobaan, lengkap dengan jejak langkahnya.
  const rekamanBanding = useMemo(() => {
    if (!(fase === 'kesimpulan' && tahap === 'banding')) return null;
    const h = jalankanSemua(level.percobaan.kode, level.percobaan.peta, level.perintah);
    const akhir = h.langkah[h.langkah.length - 1] || null;
    return {
      dunia: h.dunia,
      langkah: akhir,
      galat: h.galat,
      riwayat: h.langkah.map(ringkasLangkah),
    };
  }, [fase, tahap, level]);

  const labelBagian = rekamanBanding ? 'Hasil percobaan' : {
    percobaan: 'Percobaan',
    perbaikan: 'Misi perbaikan',
    sublevel: 'Sublevel latihan',
    tulis: 'Misi tulis sendiri',
    hasil: 'Hasil kode tulisanmu',
  }[bagian];

  const kontrol = bisaJalan ? (
    <div className="kontrol">
      <button
        type="button"
        className="tombol krem"
        onClick={() => { catat(level.id, (p) => ({ tekanLangkah: (p.tekanLangkah || 0) + 1 })); pj.langkahSatu(); }}
        disabled={pj.berjalan}
      >
        Langkah
      </button>
      <button type="button" className="tombol" onClick={pj.jalankan}>{pj.berjalan ? 'Jeda' : 'Jalankan'}</button>
      <button type="button" className="tombol krem" onClick={pj.ulang}>Ulang</button>
    </div>
  ) : (
    <p className="kontrol-catatan">
      {fase === 'konseptualisasi'
        ? 'Tombol jalankan terbuka setelah kamu menyimpan tebakan.'
        : rekamanBanding
          ? 'Ini hasil akhir kode percobaan. Bandingkan dengan tebakanmu.'
          : 'Kode tulisanmu yang sudah berhasil.'}
    </p>
  );

  const keadaanTampil = rekamanBanding ? rekamanBanding.dunia : bagian === 'hasil' ? keadaanHasil : pj.keadaan;

  // Bagian memori di catatan eksekusi hanya ditampilkan kalau konsepnya dipakai
  // di kode, supaya level dasar tidak penuh kotak kosong (perulangan baru
  // muncul di bab perulangan).
  const blokCatatan = useMemo(() => {
    const bersih = `${kodeTampil}\n${sumber.solusi || ''}`.replace(/\/\/.*$/gm, '');
    return {
      variabel: /\b(int|float|double|char|long|short)\s+(?!main\b)[A-Za-z_]/.test(bersih),
      perulangan: /\b(for|while)\b/.test(bersih),
      keluaran: /\bprintf\b/.test(bersih),
    };
  }, [kodeTampil, sumber]);

  // Catatan eksekusi hanya muncul saat kode bisa dijalankan atau saat hasil
  // percobaan ditampilkan ulang. Di fase orientasi dan menebak belum ada yang
  // dijalankan, jadi tempatnya dipakai untuk dunia game yang lebih besar.
  const adaCatatan = bisaJalan || !!rekamanBanding;

  useWaktuAktif(level.id, fase);
  const [lkpdBuka, setLkpdBuka] = useState(false);

  return (
    <div className="bermain">
      <BannerFase fase={fase} />
      {lkpdBuka ? <ModalLkpd level={level} progres={progres} tutup={() => setLkpdBuka(false)} /> : null}
      <Perayaan pemicu={sorak} teks={hasilMisi && hasilMisi.bagian === 'sublevel' ? 'Latihan berhasil!' : 'Misi berhasil!'} />
      <header className="bermain-kepala">
        <div className="judul-level">
          <p className="level-nomor" title={`Bab ${level.bab} · ${level.konsep}`}>
            Level {level.nomor} dari {LEVEL.length} · {level.konsep.toLowerCase().startsWith(level.bab.toLowerCase()) ? level.konsep : `${level.bab} · ${level.konsep}`}
          </p>
          <h1 className="level-judul">{level.judul}</h1>
        </div>
        <button type="button" className="tombol kecil krem tombol-lkpd" onClick={() => setLkpdBuka(true)} title="Lihat Lembar Kerja Peserta Didik level ini">
          LKPD
        </button>
        <PhaseStepper fase={fase} />
      </header>

      <div className={`bermain-grid${adaCatatan ? '' : ' tanpa-catatan'}`}>
        <section
          className="kartu-fase bingkai-kertas"
          key={`${fase}-${tahap}`}
          aria-label={`Fase ${FASE.findIndex((f) => f.id === fase) + 1}: ${(FASE.find((f) => f.id === fase) || {}).nama}`}
        >
          {fase === 'orientasi' && <FaseOrientasi level={level} />}
          {fase === 'konseptualisasi' && <FaseTebakan level={level} progres={progres} />}
          {fase === 'investigasi' && <FaseInvestigasi level={level} progres={progres} />}
          {fase === 'kesimpulan' && (
            <FaseKesimpulan
              level={level}
              progres={progres}
              hasilMisi={hasilMisi}
              setHasilMisi={setHasilMisi}
              kodeTulis={kodeTulis}
              setKodeTulis={setKodeTulis}
            />
          )}
          {fase === 'diskusi' && <FaseDiskusi level={level} progres={progres} bukaLkpd={() => setLkpdBuka(true)} />}
        </section>

        <div className="kolom-kode">
          {fase === 'orientasi' ? (
            <DaftarPerintah level={level} />
          ) : (
            <CodeBoard
              kode={kodeTampil}
              onUbah={ubahKode}
              bisaEdit={bisaJalan && !pj.berjalan}
              barisAktif={rekamanBanding
                ? (rekamanBanding.langkah && !rekamanBanding.galat ? rekamanBanding.langkah.baris : null)
                : pj.galat || bagian === 'hasil' ? null : pj.langkah && pj.langkah.baris}
              barisGalat={rekamanBanding ? (rekamanBanding.galat && rekamanBanding.galat.baris) : pj.galat ? pj.galat.baris : null}
              judul={`${labelBagian} · main.c`}
              kaki={kontrol}
              isiBitH={bagian === 'hasil' ? null : bitH}
              reset={bisaJalan ? { label: bagian === 'tulis' ? 'Kosongkan papan' : 'Kembalikan kode awal', aksi: () => ubahKode(kodeAwal) } : null}
            />
          )}
        </div>

        <div className={`kolom-dunia${adaCatatan ? '' : ' tanpa-catatan'}`}>
          <figure className="bingkai-dunia">
            <figcaption className="dunia-kepala">
              <span>{tempat}</span>
              <span className="dunia-mode">{labelBagian}</span>
            </figcaption>
            <div className="dunia-wadah">
              <WorldCanvas
                keadaan={keadaanTampil}
                kunciPeta={`${level.id}-${bagian}`}
                tokoh={TOKOH[level.tokoh]}
                sorak={sorak}
                label={`Peta ${tempat}. Bit berada di petak ${keadaanTampil.bit.x}.`}
              />
            </div>
          </figure>
          {adaCatatan ? (
            <ExecPanel
              {...(rekamanBanding
                ? { ...rekamanBanding, selesai: true, belumMulai: false }
                : { langkah: pj.langkah, galat: pj.galat, riwayat: pj.riwayat, selesai: pj.selesai, belumMulai: !pj.sudahMulai })}
              kodeBaris={kodeTampil.split('\n')}
              blok={blokCatatan}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- banner pergantian fase
function BannerFase({ fase }) {
  const [tampil, setTampil] = useState(null);
  const awal = useRef(true);
  useEffect(() => {
    if (awal.current) { awal.current = false; return undefined; }
    const i = FASE.findIndex((f) => f.id === fase);
    setTampil({ nomor: i + 1, ...FASE[i], kunci: Date.now() });
    const t = setTimeout(() => setTampil(null), 1900);
    return () => clearTimeout(t);
  }, [fase]);
  if (!tampil) return null;
  return (
    <div className="banner-fase" key={tampil.kunci} role="status">
      <Sprite nama="bit_senang" ukuran={48} />
      <div>
        <p className="banner-kecil">Fase {tampil.nomor}</p>
        <p className="banner-besar">{tampil.nama}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- fase 1
function FaseOrientasi({ level }) {
  const tokoh = TOKOH[level.tokoh];
  const [ke, setKe] = useState(0);
  const habis = ke >= level.orientasi.dialog.length - 1;
  return (
    <div className="fase-isi">
      <Dialog tokoh={tokoh} teks={level.orientasi.dialog[ke]} key={ke} />
      {!habis ? (
        <div className="fase-aksi">
          <button type="button" className="tombol" onClick={() => setKe(ke + 1)}>
            Lanjut ({ke + 1}/{level.orientasi.dialog.length})
          </button>
        </div>
      ) : (
        <div className="misi">
          <h2 className="misi-judul">Misimu</h2>
          <p>{level.orientasi.misi}</p>
          <dl className="misi-info">
            <div><dt>Konsep</dt><dd>{level.konsep}</dd></div>
            <div><dt>Waktu</dt><dd>{level.durasi}</dd></div>
            <div><dt>Computational thinking</dt><dd>{level.ct}</dd></div>
          </dl>
        </div>
      )}
      {habis ? (
        <div className="fase-aksi">
          <button type="button" className="tombol" onClick={() => catat(level.id, { fase: 'konseptualisasi' })}>
            Mulai menebak
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- fase 2
function FaseTebakan({ level, progres }) {
  const [pilih, setPilih] = useState(null);
  const [alasan, setAlasan] = useState((progres.lkpd && progres.lkpd.alasan) || '');
  const refAlasan = useRef(null);
  const tb = level.tebakan;
  // Setelah memilih jawaban, kotak alasan digulir ke dalam pandangan kartu dan difokuskan.
  function pilihJawaban(id) {
    setPilih(id);
    requestAnimationFrame(() => {
      const el = refAlasan.current;
      if (!el) return;
      el.scrollIntoView({ block: 'nearest' });
      if (!alasan) el.focus({ preventScroll: true });
    });
  }
  const cukup = hitungKata(alasan) >= 3;
  return (
    <form
      className="fase-isi"
      onSubmit={(e) => {
        e.preventDefault();
        if (!pilih || !cukup) return;
        catat(level.id, (p) => ({
          tebakan: pilih,
          tebakanBenar: pilih === tb.benar,
          fase: 'investigasi',
          lkpd: { ...(p.lkpd || {}), alasan: alasan.trim() },
        }));
      }}
    >
      <p className="fase-arahan">Baca kode C di papan tulis. Jangan dijalankan dulu, tebak hasilnya.</p>
      <fieldset className="pilihan">
        <legend>{tb.pertanyaan}</legend>
        {tb.pilihan.map((o) => (
          <label key={o.id} className={`opsi${pilih === o.id ? ' terpilih' : ''}`}>
            <input type="radio" name={`tebakan-${level.id}`} value={o.id} checked={pilih === o.id} onChange={() => pilihJawaban(o.id)} />
            <span>{o.teks}</span>
          </label>
        ))}
      </fieldset>
      <label className="isian isian-lkpd">
        <span>Alasanku <small>LKPD</small></span>
        <textarea
          ref={refAlasan}
          rows={2}
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
          placeholder="Aku memilih jawaban ini karena ..."
        />
      </label>
      <div className="fase-aksi">
        <button type="submit" className="tombol" disabled={!pilih || !cukup}>Simpan tebakan</button>
        <span className="fase-catatan">
          {!pilih ? 'Pilih satu jawaban dulu.' : !cukup ? 'Tulis alasanmu minimal 3 kata.' : 'Benar atau salah, kamu sendiri yang akan memeriksanya nanti.'}
        </span>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- fase 3
function FaseInvestigasi({ level, progres }) {
  const pertanyaan = level.investigasi.pemandu;
  const jawaban = (progres.lkpd && progres.lkpd.pengamatan) || [];
  const lengkap = pertanyaan.every((_, i) => hitungKata(jawaban[i] || '') >= 2);
  const sudahJalan = progres.jalankan > 0;
  return (
    <div className="fase-isi">
      <p className="fase-arahan">Jalankan kode dan amati apa yang terjadi. Kamu boleh mengubah kode untuk mencoba. Tulis hasil pengamatanmu di LKPD.</p>
      <TanyaLkpd
        label="Pengamatan"
        pertanyaan={pertanyaan}
        jawaban={jawaban}
        minimal={2}
        placeholder="Tulis yang kamu amati di dunia game dan catatan eksekusi ..."
        simpan={(i, v) => catatLkpd(level.id, (lk) => {
          const daftar = [...(lk.pengamatan || [])];
          daftar[i] = v;
          return { pengamatan: daftar };
        })}
      />
      <p className="statistik-kecil">
        <b>{progres.jalankan}</b> kali dijalankan sampai selesai · <b>{progres.eksperimen}</b> kali dengan kode yang diubah
      </p>
      <div className="fase-aksi">
        <button type="button" className="tombol" disabled={!sudahJalan || !lengkap} onClick={() => catat(level.id, { fase: 'kesimpulan', tahapKesimpulan: 'banding' })}>
          Lanjut ke kesimpulan
        </button>
        {!sudahJalan || !lengkap ? (
          <span className="fase-catatan">
            {!sudahJalan ? 'Jalankan kode sampai selesai minimal satu kali' : ''}
            {!sudahJalan && !lengkap ? ', lalu ' : ''}
            {!lengkap ? `${sudahJalan ? 'Jawab' : 'jawab'} semua pertanyaan pengamatan (minimal 2 kata)` : ''}.
          </span>
        ) : null}
      </div>
    </div>
  );
}

// Pertanyaan LKPD ditampilkan satu per satu supaya kartu fase tidak penuh.
// Jawaban disimpan sendiri sesaat setelah siswa berhenti mengetik.
function TanyaLkpd({ label, pertanyaan, jawaban, simpan, minimal, placeholder }) {
  const terisi = (i) => hitungKata(jawaban[i] || '') >= minimal;
  const [ke, setKe] = useState(() => {
    const kosong = pertanyaan.findIndex((_, i) => !terisi(i));
    return kosong === -1 ? 0 : kosong;
  });
  return (
    <section className="tanya-lkpd" aria-label={`${label} LKPD`}>
      <div className="tanya-kepala">
        <span className="tanya-label">LKPD · {label} {ke + 1} dari {pertanyaan.length}</span>
        <span className="tanya-titik">
          {pertanyaan.map((q, i) => (
            <button
              key={q}
              type="button"
              className={`${terisi(i) ? 'terisi' : ''}${i === ke ? ' aktif' : ''}`}
              onClick={() => setKe(i)}
              aria-label={`${label} ${i + 1}${terisi(i) ? ', sudah dijawab' : ', belum dijawab'}`}
              aria-current={i === ke ? 'step' : undefined}
            >
              {terisi(i) ? '✓' : i + 1}
            </button>
          ))}
        </span>
      </div>
      <p className="tanya-soal">{pertanyaan[ke]}</p>
      <IsianTertunda
        key={ke}
        nilai={jawaban[ke] || ''}
        simpan={(v) => simpan(ke, v)}
        placeholder={placeholder}
        aria-label={`Jawaban ${label.toLowerCase()} ${ke + 1}`}
      />
      <div className="tanya-nav">
        <button type="button" className="tautan-teks" disabled={ke === 0} onClick={() => setKe(ke - 1)}>Sebelumnya</button>
        <button type="button" className="tautan-teks" disabled={ke === pertanyaan.length - 1} onClick={() => setKe(ke + 1)}>Berikutnya</button>
      </div>
    </section>
  );
}

// Kotak isian yang menyimpan isinya sesaat setelah berhenti mengetik dan saat ditinggalkan.
function IsianTertunda({ nilai, simpan, ...props }) {
  const [teks, setTeks] = useState(nilai);
  const terakhir = useRef(nilai);
  const refSimpan = useRef(simpan);
  refSimpan.current = simpan;
  const kirim = (v) => {
    if (v === terakhir.current) return;
    terakhir.current = v;
    refSimpan.current(v);
  };
  useEffect(() => {
    const t = setTimeout(() => kirim(teks), 500);
    return () => clearTimeout(t);
  }, [teks]); // eslint-disable-line react-hooks/exhaustive-deps
  const teksRef = useRef(teks);
  teksRef.current = teks;
  useEffect(() => () => kirim(teksRef.current), []); // eslint-disable-line react-hooks/exhaustive-deps
  return <textarea className="tanya-isian" rows={3} value={teks} onChange={(e) => setTeks(e.target.value)} onBlur={() => kirim(teks)} {...props} />;
}

// ---------------------------------------------------------------- fase 4
function FaseKesimpulan({ level, progres, hasilMisi, setHasilMisi, kodeTulis, setKodeTulis }) {
  const tahap = progres.tahapKesimpulan;
  const urutan = ['banding', 'perbaikan', 'tulis', 'aturan'];
  const posisi = tahap === 'sublevel' ? 1 : urutan.indexOf(tahap);
  const namaTahap = ['Bandingkan tebakan', 'Perbaiki kode', 'Tulis kode sendiri', 'Rumuskan aturan'];
  return (
    <div className="fase-isi">
      <div className="tahap-kecil">
        <ol aria-label="Tahap fase kesimpulan">
          {namaTahap.map((n, i) => (
            <li key={n} className={i < posisi ? 'lewat' : i === posisi ? 'aktif' : ''} title={n} aria-current={i === posisi ? 'step' : undefined}>
              <span className="sr">{n}</span>
            </li>
          ))}
        </ol>
        <p><span>Tahap {posisi + 1} dari {namaTahap.length}</span> {tahap === 'sublevel' ? 'Sublevel latihan' : namaTahap[posisi]}</p>
      </div>
      {tahap === 'banding' && <TahapBanding level={level} progres={progres} />}
      {tahap === 'perbaikan' && <TahapPerbaikan level={level} progres={progres} hasilMisi={hasilMisi} setHasilMisi={setHasilMisi} />}
      {tahap === 'sublevel' && <TahapSublevel level={level} hasilMisi={hasilMisi} setHasilMisi={setHasilMisi} />}
      {tahap === 'tulis' && (
        <TahapTulis level={level} progres={progres} hasilMisi={hasilMisi} setHasilMisi={setHasilMisi} kodeTulis={kodeTulis} setKodeTulis={setKodeTulis} />
      )}
      {tahap === 'aturan' && <TahapAturan level={level} progres={progres} />}
    </div>
  );
}

// Di layar laptop kartu fase bergulir sendiri. Vonis atau petunjuk yang baru
// muncul digulir ke dalam pandangan supaya tidak tersembunyi di bawah kartu.
function useTampakDiKartu(pemicu) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const kartu = el && el.closest('.kartu-fase');
    if (!el || !kartu || kartu.scrollHeight <= kartu.clientHeight) return;
    const aksi = kartu.querySelector('.fase-aksi');
    const tutup = aksi && getComputedStyle(aksi).position === 'sticky' ? aksi.offsetHeight : 0;
    const a = el.getBoundingClientRect();
    const k = kartu.getBoundingClientRect();
    if (a.bottom > k.bottom - tutup - 12) kartu.scrollTop += a.bottom - (k.bottom - tutup - 12);
    else if (a.top < k.top + 12) kartu.scrollTop -= k.top + 12 - a.top;
  }, [pemicu]);
  return ref;
}

function Vonis({ hasil, bagian, tanpaAwalan = false }) {
  const ref = useTampakDiKartu(hasil);
  if (!hasil || hasil.bagian !== bagian) return null;
  return (
    <p ref={ref} className={`vonis ${hasil.berhasil ? 'benar' : 'salah'}`} role="status">
      {tanpaAwalan ? null : hasil.berhasil ? 'Misi berhasil. ' : 'Misi belum berhasil. '}{hasil.pesan}
    </p>
  );
}

function TahapBanding({ level, progres }) {
  const tb = level.tebakan;
  const nyata = useMemo(() => tb.hasilNyata(jalankanSemua(level.percobaan.kode, level.percobaan.peta, level.perintah)), [level, tb]);
  const teks = (id) => (tb.pilihan.find((o) => o.id === id) || {}).teks;
  const cocok = progres.tebakan === nyata;
  return (
    <>
      {cocok ? (
        <div className="banding satu">
          <div className="banding-kotak">
            <h3>Tebakanmu = hasil pengamatan</h3>
            <p>{teks(nyata)}</p>
          </div>
        </div>
      ) : (
        <div className="banding">
          <div className="banding-kotak">
            <h3>Tebakanmu</h3>
            <p>{teks(progres.tebakan)}</p>
          </div>
          <div className="banding-kotak">
            <h3>Hasil pengamatan</h3>
            <p>{teks(nyata)}</p>
          </div>
        </div>
      )}
      <p className={`vonis ${cocok ? 'benar' : 'salah'}`}>
        {cocok ? 'Tebakanmu sesuai dengan hasil pengamatan.' : 'Tebakanmu berbeda dengan hasil pengamatan. Tidak apa-apa, justru dari sini kamu belajar.'}
      </p>
      <p className="penjelasan">{tb.penjelasan}</p>
      <div className="fase-aksi">
        <button type="button" className="tombol" onClick={() => catat(level.id, { tahapKesimpulan: 'perbaikan' })}>
          Lanjut: perbaiki kode Bit
        </button>
      </div>
    </>
  );
}

function TahapPerbaikan({ level, progres, hasilMisi, setHasilMisi }) {
  const gagal = progres.percobaanPerbaikan - (progres.perbaikanBerhasil ? 1 : 0);
  const tawarkanSub = !progres.perbaikanBerhasil && gagal >= 2;
  return (
    <>
      <p className="fase-arahan">{level.perbaikan.cerita}</p>
      {hasilMisi && hasilMisi.bagian === 'perbaikan'
        ? <Vonis hasil={hasilMisi} bagian="perbaikan" />
        : <p className="fase-catatan">Ubah kode di papan tulis, lalu tekan Jalankan untuk menguji.</p>}
      <div className="statistik"><span><b>{progres.percobaanPerbaikan}</b> kali diuji</span></div>
      {tawarkanSub ? (
        <div className="bantuan">
          <Sprite nama="bit_bingung" ukuran={40} />
          <p>Masih kesulitan? Coba dulu sublevel latihan yang lebih sederhana, lalu kembali ke misi ini.</p>
          <button
            type="button"
            className="tombol pink"
            onClick={() => { setHasilMisi(null); catat(level.id, { tahapKesimpulan: 'sublevel', sublevelDibuka: true }); }}
          >
            Buka sublevel latihan
          </button>
        </div>
      ) : null}
      <div className="fase-aksi">
        <button
          type="button"
          className="tombol"
          disabled={!progres.perbaikanBerhasil}
          onClick={() => { setHasilMisi(null); catat(level.id, { tahapKesimpulan: 'tulis' }); }}
        >
          Lanjut: tulis kode sendiri
        </button>
        {!progres.perbaikanBerhasil ? <span className="fase-catatan">Terbuka setelah misi berhasil.</span> : null}
      </div>
    </>
  );
}

function TahapSublevel({ level, hasilMisi, setHasilMisi }) {
  const berhasil = hasilMisi && hasilMisi.bagian === 'sublevel' && hasilMisi.berhasil;
  return (
    <>
      <p className="fase-arahan">{level.sublevel.cerita}</p>
      <p className="petunjuk"><b>Petunjuk.</b> {level.sublevel.petunjuk}</p>
      <Vonis hasil={hasilMisi} bagian="sublevel" tanpaAwalan />
      <div className="fase-aksi">
        <button
          type="button"
          className={`tombol${berhasil ? '' : ' krem'}`}
          onClick={() => { setHasilMisi(null); catat(level.id, { tahapKesimpulan: 'perbaikan' }); }}
        >
          Kembali ke misi utama
        </button>
      </div>
    </>
  );
}

function TahapTulis({ level, progres, hasilMisi, setHasilMisi, kodeTulis, setKodeTulis }) {
  const t = level.tulis;
  const dibuka = progres.petunjukTulis || 0;
  const gagal = (progres.percobaanTulis || 0) - (progres.tulisBerhasil ? 1 : 0);
  return (
    <>
      <p className="fase-arahan">{t.cerita}</p>
      <p className="fase-catatan">Papan tulis sekarang hampir kosong. Tulis kode C-mu di dalam int main(), lalu tekan Jalankan.</p>
      <Vonis hasil={hasilMisi} bagian="tulis" />
      <div className="statistik">
        <span><b>{progres.percobaanTulis || 0}</b> kali diuji</span>
        <span><b>{dibuka}</b> petunjuk dibuka</span>
      </div>
      {t.petunjuk.slice(0, dibuka).map((p, i) => (
        <Petunjuk key={p} nomor={i + 1} teks={p} />
      ))}
      {!progres.tulisBerhasil ? (
        <div className={`bantuan-tulis${gagal >= 1 ? ' menyala' : ''}`}>
          {dibuka < t.petunjuk.length ? (
            <button type="button" className="tombol pink" onClick={() => catat(level.id, { petunjukTulis: dibuka + 1 })}>
              Minta petunjuk {dibuka + 1}
            </button>
          ) : (
            <button
              type="button"
              className="tombol pink"
              onClick={() => { setHasilMisi(null); setKodeTulis(t.kerangka); catat(level.id, { kerangkaDipakai: true }); }}
            >
              Pakai kerangka kode
            </button>
          )}
          {gagal >= 1 ? <span className="fase-catatan">Tidak apa-apa minta petunjuk. Guru juga bisa melihat bagian mana yang sulit.</span> : null}
        </div>
      ) : null}
      <div className="fase-aksi">
        <button
          type="button"
          className="tombol"
          disabled={!progres.tulisBerhasil}
          onClick={() => { setHasilMisi(null); catat(level.id, { tahapKesimpulan: 'aturan', kodeTulis }); }}
        >
          Lanjut: rumuskan aturan
        </button>
        {!progres.tulisBerhasil ? <span className="fase-catatan">Terbuka setelah kode tulisanmu berhasil.</span> : null}
      </div>
    </>
  );
}

function Petunjuk({ nomor, teks }) {
  const ref = useTampakDiKartu(teks);
  return <p ref={ref} className="petunjuk"><b>Petunjuk {nomor}.</b> {teks}</p>;
}

function TahapAturan({ level, progres }) {
  const at = level.aturan;
  const [pilih, setPilih] = useState(progres.aturanBenar ? progres.aturan : null);
  const [dicek, setDicek] = useState(progres.aturanBenar ? progres.aturan : null);
  const [temuan, setTemuan] = useState(progres.temuan || '');
  const benar = dicek === at.benar;
  const cukup = hitungKata(temuan) >= 5;
  return (
    <>
      <fieldset className="pilihan">
        <legend>{at.pertanyaan}</legend>
        {at.pilihan.map((o) => (
          <label key={o.id} className={`opsi${pilih === o.id ? ' terpilih' : ''}`}>
            <input type="radio" name={`aturan-${level.id}`} value={o.id} checked={pilih === o.id} disabled={benar} onChange={() => setPilih(o.id)} />
            <span>{o.teks}</span>
          </label>
        ))}
      </fieldset>
      {!benar ? (
        <div className="fase-aksi">
          <button
            type="button"
            className="tombol"
            disabled={!pilih}
            onClick={() => {
              setDicek(pilih);
              catat(level.id, (p) => ({ aturan: pilih, aturanBenar: pilih === at.benar, percobaanAturan: p.percobaanAturan + 1 }));
            }}
          >
            Periksa
          </button>
          {dicek && dicek !== at.benar ? <p className="vonis salah" role="status">{at.petunjukSalah}</p> : null}
        </div>
      ) : (
        <>
          <p className="vonis benar" role="status">Tepat. Sekarang tulis temuanmu dengan kalimatmu sendiri.</p>
          <label className="isian" htmlFor={`temuan-${level.id}`}>
            <span>Temuanku (minimal 5 kata)</span>
            <textarea
              id={`temuan-${level.id}`}
              value={temuan}
              onChange={(e) => setTemuan(e.target.value)}
              rows={3}
              placeholder="Contoh: Isi kurung kurawal if hanya jalan kalau ..."
            />
          </label>
          <div className="fase-aksi">
            <button
              type="button"
              className="tombol"
              disabled={!cukup}
              onClick={() => catat(level.id, { temuan: temuan.trim(), fase: 'diskusi' })}
            >
              Simpan kesimpulan
            </button>
            <span className="fase-catatan">{hitungKata(temuan)} kata</span>
          </div>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------- fase 5
function FaseDiskusi({ level, progres, bukaLkpd }) {
  const idx = LEVEL.findIndex((l) => l.id === level.id);
  const berikut = LEVEL[idx + 1];
  const mode = useToko((st) => st.mode);
  const [kirim, setKirim] = useState(0);
  const jawaban = (progres.lkpd && progres.lkpd.refleksi) || [];
  const lengkap = level.diskusi.every((_, i) => hitungKata(jawaban[i] || '') >= 3);
  const keGuru = mode === 'siswa';
  return (
    <div className="fase-isi">
      <Perayaan pemicu={kirim} teks="Level selesai!" bintang />
      {!progres.dikirim ? (
        <>
          <p className="fase-arahan">
            Hampir selesai. Jawab pertanyaan refleksi di LKPD-mu{keGuru ? ', lalu kirim ke guru. Guru akan membahasnya bersama di kelas.' : '.'}
          </p>
          <TanyaLkpd
            label="Refleksi"
            pertanyaan={level.diskusi}
            jawaban={jawaban}
            minimal={3}
            placeholder="Tulis jawabanmu dengan kalimatmu sendiri ..."
            simpan={(i, v) => catatLkpd(level.id, (lk) => {
              const daftar = [...(lk.refleksi || [])];
              daftar[i] = v;
              return { refleksi: daftar };
            })}
          />
          <button type="button" className="tautan-teks kiri" onClick={bukaLkpd}>Periksa seluruh LKPD level ini</button>
        </>
      ) : (
        <>
          <p className="vonis benar" role="status">
            {keGuru ? 'LKPD-mu sudah terkirim ke dasbor guru.' : 'Level selesai. LKPD-mu tersimpan selama halaman ini terbuka.'}
          </p>
          <button type="button" className="tautan-teks kiri" onClick={bukaLkpd}>Lihat atau cetak LKPD level ini</button>
        </>
      )}
      <div className="fase-aksi">
        {!progres.dikirim ? (
          <>
            <button
              type="button"
              className="tombol"
              disabled={!lengkap}
              onClick={() => { setKirim((n) => n + 1); catat(level.id, { dikirim: true, selesai: true, selesaiPada: Date.now() }); }}
            >
              {keGuru ? 'Kirim LKPD ke guru' : 'Selesaikan level'}
            </button>
            {!lengkap ? <span className="fase-catatan">Jawab semua pertanyaan refleksi (minimal 3 kata).</span> : null}
          </>
        ) : (
          <>
            {berikut ? (
              <button type="button" className="tombol" onClick={() => mulaiLevel(berikut.id)}>
                Lanjut ke level {berikut.nomor}
              </button>
            ) : null}
            <button type="button" className="tombol krem" onClick={() => pindahLayar('level')}>Kembali ke peta sekolah</button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- LKPD (dilihat siswa)
function ModalLkpd({ level, progres, tutup }) {
  const akun = useToko((st) => st.akun);
  const tamu = useToko((st) => st.tamu);
  const nama = akun ? akun.nama : tamu ? tamu.nama : '';
  const kelas = akun && akun.kelas ? akun.kelas.nama : tamu ? tamu.kelas : '';
  const [cetak, portalCetak] = useCetak();
  const refTutup = useRef(tutup);
  refTutup.current = tutup;
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') refTutup.current(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);
  const lembar = <LembarKerja level={level} progres={progres} nama={nama} kelas={kelas} />;
  return createPortal(
    <div className="lapis-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) tutup(); }}>
      <div className="panel-lkpd bingkai-kertas" role="dialog" aria-modal="true" aria-label={`LKPD level ${level.nomor}`}>
        <div className="panel-lkpd-kepala">
          <p>Isi LKPD ini terisi otomatis dari jawabanmu selama bermain.</p>
          <button type="button" className="tombol kecil krem" onClick={() => cetak(lembar)}>Cetak / simpan PDF</button>
          <button type="button" className="tombol kecil" onClick={tutup} autoFocus>Tutup</button>
        </div>
        <div className="panel-lkpd-isi">{lembar}</div>
      </div>
      {portalCetak}
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------- waktu aktif per fase
// Menghitung waktu belajar yang benar-benar aktif: tab terlihat dan ada gerakan
// mouse atau ketikan dalam 2 menit terakhir. Dicatat per fase, dalam detik.
function useWaktuAktif(levelId, fase) {
  useEffect(() => {
    let gerakTerakhir = Date.now();
    let kumpul = 0;
    const gerak = () => { gerakTerakhir = Date.now(); };
    const peristiwa = ['pointerdown', 'pointermove', 'keydown', 'wheel'];
    peristiwa.forEach((n) => window.addEventListener(n, gerak, { passive: true }));
    const setor = () => {
      if (kumpul <= 0) return;
      const n = kumpul;
      kumpul = 0;
      catat(levelId, (p) => ({ waktu: { ...(p.waktu || {}), [fase]: ((p.waktu || {})[fase] || 0) + n } }));
    };
    const t = setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - gerakTerakhir < 120000) kumpul += 5;
      if (kumpul >= 30) setor();
    }, 5000);
    return () => {
      clearInterval(t);
      peristiwa.forEach((n) => window.removeEventListener(n, gerak));
      setor();
    };
  }, [levelId, fase]);
}

// ---------------------------------------------------------------- isi bit.h (fase orientasi)
function DaftarPerintah({ level }) {
  return (
    <section className="papan bingkai-papan papan-perintah" aria-label="Perintah yang dikenal Bit">
      <header className="papan-kepala">
        <span className="papan-judul">bit.h · perintah yang dikenal Bit</span>
      </header>
      <ul className="perintah-daftar">
        {isiBitH(level.perintah, level.pakaiPrintf).map((it) => (
          <li key={it.nama}>
            <code>{it.prototipe}</code>
            <span>{it.nama === 'printf' ? 'Dari stdio.h. Menampilkan nilai variabel di bagian Keluaran printf.' : it.penjelasan}</span>
            {it.contoh !== `${it.nama}();` ? <span className="perintah-contoh">Contoh: <code>{it.contoh}</code></span> : null}
          </li>
        ))}
      </ul>
      <p className="perintah-catatan">
        Daftar ini juga selalu ada di bagian atas papan kode. Setiap perintah diakhiri titik koma (;).
        {level.bab === 'Dasar' ? null : <> Isi if, for, dan while ditulis di dalam kurung kurawal {'{ }'}.</>}
      </p>
    </section>
  );
}
