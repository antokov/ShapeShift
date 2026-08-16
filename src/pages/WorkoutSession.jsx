import { useState, useEffect, useRef, useCallback } from 'react';
import { generateId } from '../utils/uuid.js';
import { useExerciseLibrary, getExerciseImages, getExerciseInstructions } from '../hooks/useExerciseLibrary.js';
import './WorkoutSession.css';

const RATINGS = [
  { value: 0, emoji: '😢', label: 'Schlecht' },
  { value: 1, emoji: '😐', label: 'Mittel' },
  { value: 2, emoji: '😊', label: 'Gut' },
];

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// workouts is sorted startedAt DESC (useWorkouts.sortDesc) — first match is the most recent
function getLastKnownWeight(exerciseName, workouts) {
  if (!exerciseName || !workouts?.length) return null;
  const target = exerciseName.trim().toLowerCase();
  for (const w of workouts) {
    let entries;
    try {
      entries = JSON.parse(w.exerciseData);
    } catch {
      continue;
    }
    const match = entries.find(
      (e) => e.name?.trim().toLowerCase() === target && e.weight != null
    );
    if (match) return match.weight;
  }
  return null;
}

function getNextHint(phase, isCardioEx, isLastSet, isLastEx, activeSetIdx, ex, exercises, activeExIdx) {
  if (phase === 'exercise') {
    if (isCardioEx) return 'Bewertung';
    return isLastSet ? 'Pause → Bewertung' : 'Pause 60 s';
  }
  if (phase === 'pause') {
    if (!isLastSet) return `Satz ${activeSetIdx + 2} von ${ex?.completedSets.length}`;
    return isLastEx
      ? 'Bewertung → Abschluss'
      : `Bewertung → ${exercises[activeExIdx + 1]?.name ?? 'nächste Übung'}`;
  }
  if (phase === 'rate') {
    if (isLastEx) return 'Training abgeschlossen 🎉';
    return exercises[activeExIdx + 1]?.name ?? 'nächste Übung';
  }
  return null;
}

export default function WorkoutSession({ routine, workouts = [], addWorkout, onFinish, onAbort }) {
  const { exercises: libExercises } = useExerciseLibrary();
  const startedAtRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [exercises, setExercises] = useState(() =>
    routine.exercises.map((ex) => {
      const lastWeight = ex.durationMinutes == null ? getLastKnownWeight(ex.name, workouts) : null;
      return {
        ...ex,
        completedSets: ex.durationMinutes != null ? [false] : new Array(ex.sets).fill(false),
        weight: lastWeight != null ? String(lastWeight) : '',
        actualReps: ex.reps ?? '',
        actualDuration: ex.duration ?? '',
        rating: null,
      };
    })
  );
  const [sessionNotes, setSessionNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Step machine state
  const [phase, setPhase] = useState('config');
  const [activeExIdx, setActiveExIdx] = useState(0);
  const [activeSetIdx, setActiveSetIdx] = useState(0);
  const [pauseSeconds, setPauseSeconds] = useState(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [showInstructions, setShowInstructions] = useState(false);

  // Elapsed timer
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Derived from current state (used in handlers + auto-advance)
  const ex = exercises[activeExIdx] ?? null;
  const isCardioEx = ex?.durationMinutes != null;
  const isLastSet = activeSetIdx >= (ex?.completedSets.length ?? 1) - 1;
  const isLastEx = activeExIdx >= exercises.length - 1;
  const progressPct = phase === 'summary' || exercises.length === 0
    ? 100
    : (activeExIdx / exercises.length) * 100;
  const nextHint = getNextHint(phase, isCardioEx, isLastSet, isLastEx, activeSetIdx, ex, exercises, activeExIdx);

  // advanceFromPause is stable (uses isLastSet/isLastEx by value at call time)
  const advanceFromPause = useCallback(() => {
    setPhase((currentPhase) => {
      if (currentPhase !== 'pause') return currentPhase;
      return isLastSet ? 'rate' : 'exercise';
    });
    if (!isLastSet) setActiveSetIdx((i) => i + 1);
  }, [isLastSet]);

  // Image alternation + instructions reset on exercise change
  // libExercises intentionally omitted: module-level cache; only meaningful change is initial load
  // (which happens before user enters exercise phase)
  useEffect(() => {
    setImgIdx(0);
    setShowInstructions(false);
    if (phase !== 'exercise') return;
    const imgs = getExerciseImages(ex?.name, libExercises);
    if (imgs.length < 2) return;
    const id = setInterval(() => setImgIdx((i) => 1 - i), 2000);
    return () => clearInterval(id);
  }, [phase, activeExIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pause countdown + auto-advance
  useEffect(() => {
    if (phase !== 'pause' || pauseSeconds === null) return;
    if (pauseSeconds <= 0) {
      advanceFromPause();
      return;
    }
    const id = setTimeout(() => setPauseSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(id);
  }, [pauseSeconds, phase, advanceFromPause]);

  function adjustSets(idx, delta) {
    setExercises((prev) =>
      prev.map((e, i) => {
        if (i !== idx) return e;
        const newLen = Math.max(1, e.completedSets.length + delta);
        return { ...e, completedSets: new Array(newLen).fill(false) };
      })
    );
  }

  function handleStartWorkout() {
    startedAtRef.current = Date.now();
    setPhase(exercises.length === 0 ? 'summary' : 'exercise');
  }

  function handleSetDone() {
    setExercises((prev) =>
      prev.map((e, i) => {
        if (i !== activeExIdx) return e;
        const completedSets = [...e.completedSets];
        completedSets[activeSetIdx] = true;
        return { ...e, completedSets };
      })
    );
    if (isCardioEx) {
      setPhase('rate');
    } else {
      setPauseSeconds(60);
      setPhase('pause');
    }
  }

  function handleSkipPause() {
    setPauseSeconds(0);
    advanceFromPause();
  }

  function setRating(value) {
    setExercises((prev) =>
      prev.map((e, i) =>
        i === activeExIdx ? { ...e, rating: e.rating === value ? null : value } : e
      )
    );
  }

  function handleNextEx() {
    if (isLastEx) {
      setPhase('summary');
    } else {
      setActiveExIdx((i) => i + 1);
      setActiveSetIdx(0);
      setPhase('exercise');
    }
  }

  function updateExField(field, value) {
    setExercises((prev) =>
      prev.map((e, i) => (i === activeExIdx ? { ...e, [field]: value } : e))
    );
  }

  async function handleFinish() {
    setSaving(true);
    const totalSets = exercises.reduce(
      (sum, e) => sum + e.completedSets.filter(Boolean).length,
      0
    );
    const exerciseData = JSON.stringify(
      exercises.map((e) => ({
        id: e.id,
        name: e.name,
        weight: e.weight !== '' ? Number(e.weight) : null,
        actualReps: e.actualReps !== '' ? Number(e.actualReps) : null,
        actualDuration: e.actualDuration !== '' ? Number(e.actualDuration) : null,
        rating: e.rating,
        completedSets: e.completedSets,
      }))
    );
    try {
      await addWorkout({
        id: generateId(),
        routineId: routine.id,
        routineName: routine.name,
        startedAt: new Date(startedAtRef.current).toISOString(),
        durationSeconds: elapsed,
        totalSets,
        notes: sessionNotes.trim(),
        exerciseData,
      });
      onFinish();
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="workout-session">
      <div className="workout-session__header">
        <button className="btn btn--ghost btn--small" onClick={onAbort} disabled={saving}>
          ← Abbrechen
        </button>
        <h2 className="workout-session__title">{routine.name}</h2>
        <div className="workout-session__timer" aria-label="Trainingszeit">
          {formatTime(elapsed)}
        </div>
      </div>

      <div
        className="workout-progress"
        role="progressbar"
        aria-label={`Trainingsfortschritt ${Math.round(progressPct)} Prozent`}
        aria-valuenow={Math.round(progressPct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="workout-progress__fill" style={{ width: `${progressPct}%` }} />
      </div>

      {phase === 'config' && (
        <div className="workout-config">
          <p className="workout-config__hint">Satzanzahl anpassen (optional)</p>
          <div className="workout-config__list">
            {exercises.length === 0 && (
              <p className="workout-config__empty">Keine Übungen in dieser Routine.</p>
            )}
            {exercises.map((ex, idx) => (
              <div key={ex.id} className="workout-config__row">
                <span className="workout-config__ex-name">{ex.name}</span>
                {ex.durationMinutes != null ? (
                  <span className="workout-config__cardio-info">{ex.durationMinutes} min</span>
                ) : (
                  <div className="workout-config__sets-ctrl">
                    <button
                      className="workout-config__set-btn"
                      onClick={() => adjustSets(idx, -1)}
                      disabled={ex.completedSets.length <= 1}
                      aria-label={`Sätze verringern für ${ex.name}`}
                    >−</button>
                    <span
                      className="workout-config__set-count"
                      aria-label={`${ex.completedSets.length} Sätze für ${ex.name}`}
                    >
                      {ex.completedSets.length} Sätze
                    </span>
                    <button
                      className="workout-config__set-btn"
                      onClick={() => adjustSets(idx, +1)}
                      aria-label={`Sätze erhöhen für ${ex.name}`}
                    >+</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button className="btn btn--primary workout-config__start-btn" onClick={handleStartWorkout}>
            Training starten
          </button>
        </div>
      )}

      {phase === 'exercise' && ex && (
        <div className="workout-step__card">
          <div className="workout-step__ex-progress">
            Übung {activeExIdx + 1} von {exercises.length}
          </div>
          <div className="workout-step__ex-name">{ex.name}</div>
          {(() => {
            const imgs = getExerciseImages(ex.name, libExercises);
            const imgUrl = imgs[imgIdx] ?? null;
            return imgUrl ? (
              <img
                className="workout-step__ex-img"
                src={imgUrl}
                alt={ex.name}
                loading="lazy"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : null;
          })()}
          {(() => {
            const steps = getExerciseInstructions(ex.name, libExercises);
            if (!steps.length) return null;
            return (
              <>
                <button
                  type="button"
                  className="btn btn--small workout-step__instructions-toggle"
                  onClick={() => setShowInstructions((v) => !v)}
                >
                  {showInstructions ? 'Erklärung ausblenden' : 'Erklärung anzeigen'}
                </button>
                {showInstructions && (
                  <ol className="workout-step__instructions">
                    {steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                )}
              </>
            );
          })()}
{!isCardioEx && (
            <div className="workout-step__set-info">
              Satz {activeSetIdx + 1} von {ex.completedSets.length}
            </div>
          )}
          {isCardioEx ? (
            <div className="workout-step__cardio-duration">{ex.durationMinutes} min</div>
          ) : (
            <div className="workout-step__inputs">
              <div className="workout-ex__input-group">
                <label className="workout-ex__input-label" htmlFor="step-weight">Gewicht</label>
                <div className="workout-ex__input-with-unit">
                  <input
                    id="step-weight"
                    type="number"
                    min="0"
                    className="workout-ex__input"
                    value={ex.weight}
                    onChange={(e) => updateExField('weight', e.target.value)}
                    placeholder="—"
                    aria-label={`Gewicht für ${ex.name}`}
                  />
                  <span className="workout-ex__unit">kg</span>
                </div>
              </div>
              {ex.reps != null && (
                <div className="workout-ex__input-group">
                  <label className="workout-ex__input-label" htmlFor="step-reps">Wdh.</label>
                  <input
                    id="step-reps"
                    type="number"
                    min="0"
                    className="workout-ex__input"
                    value={ex.actualReps}
                    onChange={(e) => updateExField('actualReps', e.target.value)}
                    aria-label={`Wiederholungen für ${ex.name}`}
                  />
                </div>
              )}
              {ex.duration != null && (
                <div className="workout-ex__input-group">
                  <label className="workout-ex__input-label" htmlFor="step-dur">Sek.</label>
                  <input
                    id="step-dur"
                    type="number"
                    min="0"
                    className="workout-ex__input"
                    value={ex.actualDuration}
                    onChange={(e) => updateExField('actualDuration', e.target.value)}
                    aria-label={`Dauer für ${ex.name}`}
                  />
                </div>
              )}
            </div>
          )}
          <button className="btn btn--primary workout-step__cta" onClick={handleSetDone}>
            {isCardioEx ? 'Erledigt' : 'Satz beenden'}
          </button>
          {nextHint && <p className="workout-step__next">Danach: {nextHint}</p>}
        </div>
      )}

      {phase === 'pause' && (
        <div className="workout-step__card workout-step__card--pause">
          <div className="workout-step__pause-label">Pause</div>
          <div className="workout-step__pause-timer" aria-label="Pausenzeit">
            {formatTime(pauseSeconds ?? 0)}
          </div>
          <button className="btn" onClick={handleSkipPause}>
            Überspringen
          </button>
          {nextHint && <p className="workout-step__next">Danach: {nextHint}</p>}
        </div>
      )}

      {phase === 'rate' && ex && (
        <div className="workout-step__card">
          <div className="workout-step__rate-exname">{ex.name}</div>
          <div className="workout-step__rate-label">Wie war die Übung?</div>
          <div className="workout-step__rate-buttons">
            {RATINGS.map(({ value, emoji, label }) => (
              <button
                key={value}
                type="button"
                className={`workout-step__rate-btn${ex.rating === value ? ' workout-step__rate-btn--active' : ''}`}
                onClick={() => setRating(value)}
                aria-label={label}
                title={label}
              >
                {emoji}
              </button>
            ))}
          </div>
          <button className="btn btn--primary workout-step__cta" onClick={handleNextEx}>
            {isLastEx ? 'Abschließen' : 'Weiter →'}
          </button>
          {nextHint && <p className="workout-step__next">Danach: {nextHint}</p>}
        </div>
      )}

      {phase === 'summary' && (
        <div className="workout-step__card workout-step__card--summary">
          <div className="workout-step__summary-title">Training abgeschlossen! 🎉</div>
          <div className="workout-step__summary-stats">
            {formatTime(elapsed)} · {exercises.reduce((s, e) => s + e.completedSets.filter(Boolean).length, 0)} Sätze
          </div>
          <div className="workout-session__notes">
            <label className="workout-session__notes-label" htmlFor="session-notes">
              Trainingskommentar (optional)
            </label>
            <textarea
              id="session-notes"
              className="workout-session__notes-input"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              rows={4}
              placeholder="Wie lief das Training?"
              maxLength={500}
            />
          </div>
          <button className="btn btn--primary workout-step__cta" onClick={handleFinish} disabled={saving}>
            {saving ? 'Wird gespeichert…' : 'Training speichern'}
          </button>
        </div>
      )}
    </div>
  );
}
