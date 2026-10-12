import { useState } from 'react';

export const kodeTampil = (k) => `${k.slice(0, 3)}-${k.slice(3)}`;

// Tombol aksi berbahaya yang meminta konfirmasi di tempat (tanpa dialog browser).
export function TombolYakin({ label, tanya, aksi, kelas = 'tombol kecil krem', ya = 'Ya' }) {
  const [tanyaBuka, setTanyaBuka] = useState(false);
  if (!tanyaBuka) return <button type="button" className={kelas} onClick={() => setTanyaBuka(true)}>{label}</button>;
  return (
    <span className="yakin" role="group" aria-label={tanya}>
      <span>{tanya}</span>
      <button type="button" className="tombol kecil pink" onClick={() => { setTanyaBuka(false); aksi(); }}>{ya}</button>
      <button type="button" className="tombol kecil krem" onClick={() => setTanyaBuka(false)}>Batal</button>
    </span>
  );
}
