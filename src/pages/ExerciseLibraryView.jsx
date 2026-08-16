import { useState, useMemo, useEffect } from 'react';
import { useExerciseLibrary } from '../hooks/useExerciseLibrary.js';
import './ExerciseLibraryView.css';

const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const PAGE_SIZE = 30;

const CATEGORY_OPTIONS = [
  { value: 'strength',              label: 'Kraft' },
  { value: 'cardio',                label: 'Cardio' },
  { value: 'stretching',            label: 'Dehnung' },
  { value: 'plyometrics',           label: 'Plyometrie' },
  { value: 'powerlifting',          label: 'Powerlifting' },
  { value: 'olympic weightlifting', label: 'Gewichtheben' },
];

const LEVEL_OPTIONS = [
  { value: 'beginner',     label: 'Anfänger' },
  { value: 'intermediate', label: 'Mittel' },
  { value: 'expert',       label: 'Profi' },
];

const EQUIPMENT_OPTIONS = [
  { value: 'body only',     label: 'Körpergewicht' },
  { value: 'barbell',       label: 'Langhantel' },
  { value: 'dumbbell',      label: 'Kurzhanteln' },
  { value: 'cable',         label: 'Kabelzug' },
  { value: 'machine',       label: 'Maschine' },
  { value: 'kettlebells',   label: 'Kettlebell' },
  { value: 'bands',         label: 'Widerstandsbänder' },
  { value: 'e-z curl bar',  label: 'EZ-Stange' },
  { value: 'exercise ball', label: 'Pezziball' },
  { value: 'foam roll',     label: 'Foam Roller' },
  { value: 'medicine ball', label: 'Medizinball' },
  { value: 'other',         label: 'Sonstiges' },
];

const MUSCLE_GROUPS = [
  'abdominals', 'abductors', 'adductors', 'biceps', 'calves', 'chest',
  'forearms', 'glutes', 'hamstrings', 'lats', 'lower back', 'middle back',
  'neck', 'quadriceps', 'shoulders', 'traps', 'triceps',
];

const LEVEL_COLORS = {
  beginner:     'exercise-card__badge--level-beginner',
  intermediate: 'exercise-card__badge--level-intermediate',
  expert:       'exercise-card__badge--level-expert',
};

const PLACEHOLDER_ICON = (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
    <rect x="4" y="14" width="28" height="8" rx="4" fill="#c8c8c8" />
    <rect x="1" y="16" width="6" height="4" rx="2" fill="#b0b0b0" />
    <rect x="29" y="16" width="6" height="4" rx="2" fill="#b0b0b0" />
    <rect x="12" y="10" width="3" height="16" rx="1.5" fill="#c8c8c8" />
    <rect x="21" y="10" width="3" height="16" rx="1.5" fill="#c8c8c8" />
  </svg>
);

function ExerciseModal({ exercise, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const imgUrl = exercise.images?.[0] ? IMAGE_BASE + exercise.images[0] : null;
  const equipLabel = EQUIPMENT_OPTIONS.find((o) => o.value === exercise.equipment)?.label ?? exercise.equipment;
  const levelLabel = LEVEL_OPTIONS.find((o) => o.value === exercise.level)?.label ?? exercise.level;
  const catLabel   = CATEGORY_OPTIONS.find((o) => o.value === exercise.category)?.label ?? exercise.category;

  return (
    <div className="exercise-modal" role="dialog" aria-modal="true" aria-label={exercise.name}>
      <div className="exercise-modal__backdrop" onClick={onClose} />
      <div className="exercise-modal__box">
        <button
          type="button"
          className="exercise-modal__close btn btn--ghost"
          onClick={onClose}
          aria-label="Schließen"
        >
          ×
        </button>

        {imgUrl ? (
          <img
            className="exercise-modal__img"
            src={imgUrl}
            alt={exercise.name}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="exercise-modal__img-placeholder">{PLACEHOLDER_ICON}</div>
        )}

        <div className="exercise-modal__content">
          <h2 className="exercise-modal__name">{exercise.name}</h2>

          <div className="exercise-modal__badges">
            {exercise.category && (
              <span className="exercise-card__badge exercise-card__badge--category">{catLabel}</span>
            )}
            {exercise.level && (
              <span className={['exercise-card__badge', LEVEL_COLORS[exercise.level] ?? ''].filter(Boolean).join(' ')}>
                {levelLabel}
              </span>
            )}
            {exercise.equipment && (
              <span className="exercise-card__badge exercise-card__badge--equipment">{equipLabel}</span>
            )}
            {(exercise.primaryMuscles ?? []).map((m) => (
              <span key={m} className="exercise-card__badge exercise-card__badge--muscle">{m}</span>
            ))}
            {(exercise.secondaryMuscles ?? []).map((m) => (
              <span key={m} className="exercise-card__badge exercise-card__badge--secondary">{m}</span>
            ))}
          </div>

          <hr className="exercise-modal__divider" />

          {exercise.instructions?.length > 0 ? (
            <ol className="exercise-modal__instructions">
              {exercise.instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          ) : (
            <p className="exercise-modal__no-instructions">Keine Anweisungen verfügbar.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExerciseLibraryView() {
  const { exercises, loading, error } = useExerciseLibrary();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [equipment, setEquipment] = useState('');
  const [level, setLevel] = useState('');
  const [muscle, setMuscle] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [expandedExercise, setExpandedExercise] = useState(null);

  function resetLimit() { setLimit(PAGE_SIZE); }

  function clearAll() {
    setSearch('');
    setCategory('');
    setEquipment('');
    setLevel('');
    setMuscle('');
    setLimit(PAGE_SIZE);
  }

  const filtered = useMemo(() => {
    let r = exercises;
    const q = search.trim().toLowerCase();
    if (q)         r = r.filter((e) => e.name.toLowerCase().includes(q));
    if (category)  r = r.filter((e) => e.category === category);
    if (equipment) r = r.filter((e) => e.equipment === equipment);
    if (level)     r = r.filter((e) => e.level === level);
    if (muscle)    r = r.filter((e) => (e.primaryMuscles ?? []).includes(muscle));
    return r;
  }, [exercises, search, category, equipment, level, muscle]);

  const visible = filtered.slice(0, limit);
  const hasMore = filtered.length > limit;
  const hasFilters = search.trim() || category || equipment || level || muscle;

  return (
    <div className="exercise-library">
      <div className="exercise-library__header">
        <h1 className="exercise-library__title">Übungsübersicht</h1>
        <p className="exercise-library__subtitle">
          {loading ? 'Wird geladen…' : `${exercises.length} Übungen verfügbar`}
        </p>
      </div>

      {/* Compact single-line filter bar */}
      <div className="exercise-library__filter-bar">
        <input
          className="exercise-library__search"
          type="search"
          placeholder="Übung suchen…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); resetLimit(); }}
          aria-label="Übung suchen"
        />

        <select
          className="exercise-library__select"
          value={category}
          onChange={(e) => { setCategory(e.target.value); resetLimit(); }}
          aria-label="Kategorie filtern"
        >
          <option value="">Alle Kategorien</option>
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          className="exercise-library__select"
          value={level}
          onChange={(e) => { setLevel(e.target.value); resetLimit(); }}
          aria-label="Level filtern"
        >
          <option value="">Alle Levels</option>
          {LEVEL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          className="exercise-library__select"
          value={equipment}
          onChange={(e) => { setEquipment(e.target.value); resetLimit(); }}
          aria-label="Equipment filtern"
        >
          <option value="">Alle Equipment</option>
          {EQUIPMENT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          className="exercise-library__select"
          value={muscle}
          onChange={(e) => { setMuscle(e.target.value); resetLimit(); }}
          aria-label="Muskelgruppe filtern"
        >
          <option value="">Alle Muskeln</option>
          {MUSCLE_GROUPS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <span className="exercise-library__result-count">
          {!loading && `${filtered.length} Ergebnis${filtered.length !== 1 ? 'se' : ''}`}
        </span>

        {hasFilters && (
          <button type="button" className="btn btn--ghost btn--small" onClick={clearAll}>
            Filter löschen
          </button>
        )}
      </div>

      {error && <p className="exercise-library__error">{error}</p>}

      {!loading && !error && (
        <>
          {filtered.length === 0 ? (
            <p className="exercise-library__empty">Keine Übungen gefunden.</p>
          ) : (
            <div className="exercise-library__grid">
              {visible.map((ex) => {
                const imgUrl = ex.images?.[0] ? IMAGE_BASE + ex.images[0] : null;
                const equipLabel = EQUIPMENT_OPTIONS.find((o) => o.value === ex.equipment)?.label ?? ex.equipment;
                const levelLabel = LEVEL_OPTIONS.find((o) => o.value === ex.level)?.label ?? ex.level;

                return (
                  <div
                    key={ex.id}
                    className="exercise-card"
                    onClick={() => setExpandedExercise(ex)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setExpandedExercise(ex)}
                  >
                    <div className="exercise-card__thumb">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={ex.name}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextSibling?.style && (e.currentTarget.nextSibling.style.display = 'flex');
                          }}
                        />
                      ) : null}
                      <div
                        className="exercise-card__thumb-placeholder"
                        style={{ display: imgUrl ? 'none' : 'flex' }}
                      >
                        {PLACEHOLDER_ICON}
                      </div>
                    </div>

                    <div className="exercise-card__body">
                      <div className="exercise-card__name">{ex.name}</div>
                      <div className="exercise-card__badges">
                        {ex.category && (
                          <span className="exercise-card__badge exercise-card__badge--category">
                            {CATEGORY_OPTIONS.find((o) => o.value === ex.category)?.label ?? ex.category}
                          </span>
                        )}
                        {ex.primaryMuscles?.[0] && (
                          <span className="exercise-card__badge exercise-card__badge--muscle">
                            {ex.primaryMuscles[0]}
                          </span>
                        )}
                        {ex.equipment && (
                          <span className="exercise-card__badge exercise-card__badge--equipment">
                            {equipLabel}
                          </span>
                        )}
                        {ex.level && (
                          <span className={['exercise-card__badge', LEVEL_COLORS[ex.level] ?? ''].filter(Boolean).join(' ')}>
                            {levelLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {hasMore && (
            <div className="exercise-library__load-more">
              <button
                type="button"
                className="btn"
                onClick={() => setLimit((l) => l + PAGE_SIZE)}
              >
                Mehr laden ({filtered.length - limit} weitere)
              </button>
            </div>
          )}
        </>
      )}

      {expandedExercise && (
        <ExerciseModal
          exercise={expandedExercise}
          onClose={() => setExpandedExercise(null)}
        />
      )}
    </div>
  );
}
