import { FASE } from '../game/levels.js';

// Sintaks guided inquiry yang selalu terlihat di atas layar bermain.
export default function PhaseStepper({ fase }) {
  const aktif = FASE.findIndex((f) => f.id === fase);
  return (
    <ol className="stepper" aria-label="Fase guided inquiry">
      {FASE.map((f, i) => {
        const status = i < aktif ? 'lewat' : i === aktif ? 'aktif' : 'nanti';
        return (
          <li key={f.id} className={`stepper-item ${status}`} aria-current={i === aktif ? 'step' : undefined} title={`Fase ${i + 1}: ${f.ringkas}`}>
            <span className="stepper-nomor">{i + 1}</span>
            <span className="stepper-teks">
              <span className="stepper-nama">{f.nama}</span>
              <span className="stepper-ringkas">{f.ringkas}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
