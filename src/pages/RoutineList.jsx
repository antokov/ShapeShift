import { useState, useRef, useEffect } from 'react';
import './RoutineList.css';
import RoutinePrint from './RoutinePrint.jsx';

const CLAUDE_PROMPT = `Erstelle eine JSON-Datei mit Trainingsroutinen für ShapeShift.
Das Format muss ein JSON-Array sein:

[
  {
    "name": "Push Day",
    "description": "Brust, Schultern, Trizeps",
    "exercises": [
      { "name": "Bankdrücken", "sets": 4, "reps": 8 },
      { "name": "Schulterdrücken", "sets": 3, "reps": 10 },
      { "name": "Trizeps Pushdown", "sets": 3, "duration": 45 }
    ]
  },
  {
    "name": "Cardio Tag",
    "routineType": "cardio",
    "exercises": [
      { "name": "Laufen", "durationMinutes": 30 },
      { "name": "Radfahren", "durationMinutes": 20 }
    ]
  }
]

Regeln für Kraft-Routinen:
- Jede Übung braucht "name" und "sets"
- Entweder "reps" (Wiederholungen) ODER "duration" (Sekunden) — nicht beides

Regeln für Cardio-Routinen:
- "routineType": "cardio" setzen
- Jede Übung braucht "name" und "durationMinutes" (Minuten als Zahl)
- Kein "sets", kein "reps"

Allgemein:
- "name" ist Pflicht für jede Routine
- "description" ist optional
- Gib nur das JSON aus, ohne erklärenden Text darum

Erstelle [X] Routinen für [dein Ziel / Bereich].`;

function ImportInfoBox({ onClose }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(CLAUDE_PROMPT);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = CLAUDE_PROMPT;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="import-infobox">
      <div className="import-infobox__header">
        <span className="import-infobox__title">Routinen mit Claude erstellen</span>
        <button
          type="button"
          className="import-infobox__close"
          onClick={onClose}
          aria-label="Schließen"
        >
          ✕
        </button>
      </div>
      <p className="import-infobox__desc">
        Kopiere diesen Prompt und schicke ihn an Claude — du bekommst eine JSON-Datei, die du direkt importieren kannst.
      </p>
      <pre className="import-infobox__prompt">{CLAUDE_PROMPT}</pre>
      <button
        type="button"
        className="btn btn--small import-infobox__copy-btn"
        onClick={handleCopy}
      >
        {copied ? '✓ Kopiert!' : 'Kopieren'}
      </button>
    </div>
  );
}

export default function RoutineList({ routines, onNew, onView, onEdit, onDelete, onImport }) {
  const [showInfo, setShowInfo] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [importing, setImporting] = useState(false);
  const [printRoutine, setPrintRoutine] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!printRoutine) return;
    window.print();
  }, [printRoutine]);

  useEffect(() => {
    function cleanup() { setPrintRoutine(null); }
    window.addEventListener('afterprint', cleanup);
    return () => window.removeEventListener('afterprint', cleanup);
  }, []);

  function handlePrint(e, routine) {
    e.stopPropagation();
    setPrintRoutine(routine);
  }

  function handleDelete(e, routine) {
    e.stopPropagation();
    if (window.confirm(`„${routine.name}" wirklich löschen?`)) {
      onDelete(routine.id);
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    setImportStatus(null);
    try {
      const result = await onImport(file);
      const msg =
        result.skipped > 0
          ? `${result.imported} Routine(n) importiert, ${result.skipped} übersprungen.`
          : `${result.imported} Routine(n) erfolgreich importiert.`;
      setImportStatus({ type: 'success', msg });
    } catch (err) {
      setImportStatus({ type: 'error', msg: err.message });
    } finally {
      setImporting(false);
      setTimeout(() => setImportStatus(null), 4000);
    }
  }

  return (
    <div className="routines-list-content">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        data-testid="file-input"
      />

      <div className="routine-list__header">
        <h2>Meine Routinen</h2>
        <div className="routine-list__header-actions">
          <div className="routine-import-group">
            <button
              type="button"
              className="btn btn--small"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              {importing ? 'Importieren…' : '↑ Importieren'}
            </button>
            <button
              type="button"
              className="routine-import-info-btn"
              aria-label="Import-Hilfe anzeigen"
              onClick={() => setShowInfo((v) => !v)}
              title="Wie importieren?"
            >
              ?
            </button>
          </div>
          <button className="btn btn--primary" onClick={onNew}>
            + Neue Routine
          </button>
        </div>
      </div>

      {importStatus && (
        <div className={`routine-import-status routine-import-status--${importStatus.type}`}>
          {importStatus.msg}
        </div>
      )}

      {showInfo && <ImportInfoBox onClose={() => setShowInfo(false)} />}

      {routines.length === 0 ? (
        <div className="routine-list__empty">
          <div className="routine-list__empty-icon">
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <rect x="7" y="11" width="30" height="24" rx="3" stroke="#d0d0d0" strokeWidth="2" />
              <path d="M14 20h16M14 26h10" stroke="#d0d0d0" strokeWidth="2" strokeLinecap="round" />
              <circle cx="33" cy="11" r="6.5" fill="#f0f0f0" stroke="#d0d0d0" strokeWidth="1.5" />
              <path d="M33 8v3l2 1.5" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="routine-list__empty-title">Noch keine Routinen</div>
          <p className="routine-list__empty-body">
            Erstelle deine erste Trainingsroutine oder importiere Routinen aus einer JSON-Datei.
          </p>
          <button className="btn btn--primary" onClick={onNew}>
            + Neue Routine
          </button>
        </div>
      ) : (
        <div className="routine-grid">
          {routines.map((routine) => {
            const isCardio = routine.routineType === 'cardio';
            const totalMinutes = isCardio
              ? routine.exercises.reduce((s, e) => s + (e.durationMinutes ?? 0), 0)
              : 0;
            return (
            <div
              key={routine.id}
              className="routine-card"
              onClick={() => onView(routine.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onView(routine.id)}
              aria-label={`${routine.name} ansehen`}
            >
              <div className="routine-card__top">
                <span className="routine-card__count-badge">
                  {isCardio
                    ? `${totalMinutes} min`
                    : `${routine.exercises.length} ${routine.exercises.length === 1 ? 'Übung' : 'Übungen'}`}
                </span>
                {isCardio && (
                  <span className="routine-card__type-badge routine-card__type-badge--cardio">
                    Cardio
                  </span>
                )}
              </div>

              <div className="routine-card__name">{routine.name}</div>

              {routine.description && (
                <div className="routine-card__desc">{routine.description}</div>
              )}

              <div
                className="routine-card__footer"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="routine-card__btn-view"
                  onClick={() => onView(routine.id)}
                >
                  Ansehen
                </button>
                <div className="routine-card__actions">
                  <button
                    className="routine-card__btn-print"
                    onClick={(e) => handlePrint(e, routine)}
                    title="Drucken"
                    aria-label={`${routine.name} drucken`}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="2" y="5" width="10" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M4 5V2h6v3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                      <path d="M4 9h6M4 11h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                    </svg>
                  </button>
                  <button
                    className="routine-card__btn-edit"
                    onClick={() => onEdit(routine.id)}
                    title="Bearbeiten"
                    aria-label="Bearbeiten"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M9.5 1.5l3 3-8 8H1.5v-3l8-8z"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    className="routine-card__btn-delete"
                    onClick={(e) => handleDelete(e, routine)}
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      <RoutinePrint routines={printRoutine ? [printRoutine] : []} />
    </div>
  );
}
