import './RoutinePrint.css';

function formatPrintStats(ex) {
  if (ex.durationMinutes != null) {
    return { type: 'cardio', label: `${ex.durationMinutes} min` };
  }
  const sets = ex.sets ?? '—';
  const repsOrDur = ex.duration ? `${ex.duration} Sek.` : `${ex.reps ?? '—'} Wdh.`;
  return { type: 'strength', sets, repsOrDur };
}

export default function RoutinePrint({ routines }) {
  const today = new Date().toLocaleDateString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className="routine-print-only">
      <div className="rp-header">
        <span className="rp-app-name">ShapeShift — Trainingsplan</span>
        <span className="rp-date">Datum: ___ / ___ / _______</span>
      </div>

      {routines.map((routine) => {
        const isCardio = routine.routineType === 'cardio';
        return (
          <div key={routine.id} className="rp-routine">
            <div className="rp-routine__name">{routine.name}</div>
            {routine.description && (
              <div className="rp-routine__desc">{routine.description}</div>
            )}

            <table className="rp-table">
              <thead>
                <tr>
                  <th className="rp-th rp-col-nr">Nr.</th>
                  <th className="rp-th rp-col-name">Übung</th>
                  {isCardio ? (
                    <th className="rp-th rp-col-stats">Dauer</th>
                  ) : (
                    <>
                      <th className="rp-th rp-col-stats">Sätze × Wdh.</th>
                      <th className="rp-th rp-col-weight">Gewicht (kg)</th>
                      <th className="rp-th rp-col-rating">Bew. /5</th>
                    </>
                  )}
                  <th className="rp-th rp-col-notes">Notizen</th>
                </tr>
              </thead>
              <tbody>
                {routine.exercises.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isCardio ? 3 : 5}
                      className="rp-td rp-empty"
                    >
                      Keine Übungen
                    </td>
                  </tr>
                ) : (
                  routine.exercises.map((ex, idx) => {
                    const stats = formatPrintStats(ex);
                    return (
                      <tr key={ex.id ?? idx} className="rp-tr">
                        <td className="rp-td rp-col-nr">{idx + 1}</td>
                        <td className="rp-td rp-col-name">{ex.name}</td>
                        {isCardio ? (
                          <td className="rp-td rp-col-stats">{stats.label}</td>
                        ) : (
                          <>
                            <td className="rp-td rp-col-stats">
                              {stats.sets} × {stats.repsOrDur}
                            </td>
                            <td className="rp-td rp-col-weight" />
                            <td className="rp-td rp-col-rating" />
                          </>
                        )}
                        <td className="rp-td rp-col-notes" />
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
