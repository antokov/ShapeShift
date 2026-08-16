import { useState } from 'react';
import { generateId } from '../utils/uuid.js';
import { useExerciseLibrary } from '../hooks/useExerciseLibrary.js';
import './RoutineForm.css';

const MAX_NAME = 100;
const MAX_DESC = 500;

function emptyExercise() {
  return { id: generateId(), name: '', sets: '', reps: '', duration: '', type: 'reps' };
}

function emptyCardioExercise() {
  return { id: generateId(), name: '', durationMinutes: '' };
}

function validate(name, exercises, routineType) {
  const errors = {};
  if (!name.trim()) errors.name = 'Name ist erforderlich.';
  if (name.trim().length > MAX_NAME) errors.name = `Max. ${MAX_NAME} Zeichen.`;
  if (exercises.length === 0) errors.exercises = 'Mindestens eine Übung hinzufügen.';

  if (routineType === 'cardio') {
    const exerciseErrors = exercises.map((ex) => {
      const e = {};
      if (!ex.name.trim()) e.name = 'Übungsname erforderlich.';
      const dur = Number(ex.durationMinutes);
      if (!ex.durationMinutes || isNaN(dur) || dur < 1) e.durationMinutes = '≥ 1 Min.';
      return e;
    });
    if (exerciseErrors.some((e) => Object.keys(e).length > 0)) {
      errors.exerciseErrors = exerciseErrors;
    }
  } else {
    const exerciseErrors = exercises.map((ex) => {
      const e = {};
      if (!ex.name.trim()) e.name = 'Übungsname erforderlich.';
      const sets = Number(ex.sets);
      if (!ex.sets || isNaN(sets) || sets < 1) e.sets = '≥ 1';
      if (ex.type === 'reps') {
        const reps = Number(ex.reps);
        if (!ex.reps || isNaN(reps) || reps < 1) e.reps = '≥ 1';
      } else {
        const dur = Number(ex.duration);
        if (!ex.duration || isNaN(dur) || dur < 1) e.duration = '≥ 1 Sek.';
      }
      return e;
    });
    if (exerciseErrors.some((e) => Object.keys(e).length > 0)) {
      errors.exerciseErrors = exerciseErrors;
    }
  }
  return errors;
}

export default function RoutineForm({ routine, onSave, onCancel, saveError }) {
  const isEdit = Boolean(routine);

  const [routineType, setRoutineType] = useState(routine?.routineType ?? 'strength');
  const [name, setName] = useState(routine?.name ?? '');
  const [description, setDescription] = useState(routine?.description ?? '');
  const [exercises, setExercises] = useState(() => {
    if (!routine) return [emptyExercise()];
    return routine.exercises.map((ex) =>
      ex.durationMinutes != null
        ? { ...ex, durationMinutes: String(ex.durationMinutes) }
        : {
            ...ex,
            type: ex.duration ? 'duration' : 'reps',
            reps: ex.reps ?? '',
            duration: ex.duration ?? '',
            sets: String(ex.sets),
          }
    );
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [libraryOpenForId, setLibraryOpenForId] = useState(null);
  const [librarySearch, setLibrarySearch] = useState('');
  const { exercises: allExercises, loading: libLoading, error: libError } = useExerciseLibrary();

  function handleRoutineTypeChange(newType) {
    setRoutineType(newType);
    setExercises([newType === 'cardio' ? emptyCardioExercise() : emptyExercise()]);
    setErrors({});
    setSubmitted(false);
  }

  function updateExercise(id, field, value) {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex))
    );
  }

  function removeExercise(id) {
    setExercises((prev) => prev.filter((ex) => ex.id !== id));
  }

  function addExercise() {
    setExercises((prev) => [
      ...prev,
      routineType === 'cardio' ? emptyCardioExercise() : emptyExercise(),
    ]);
  }

  function openLibrary(id) {
    setLibraryOpenForId(id);
    setLibrarySearch('');
  }

  function closeLibrary() {
    setLibraryOpenForId(null);
    setLibrarySearch('');
  }

  function selectFromLibrary(exId, exercise) {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exId ? { ...ex, name: exercise.name } : ex
      )
    );
    closeLibrary();
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    const errs = validate(name, exercises, routineType);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const saved = {
      id: routine?.id ?? generateId(),
      name: name.trim(),
      description: description.trim().slice(0, MAX_DESC),
      routineType,
      exercises:
        routineType === 'cardio'
          ? exercises.map(({ id, name: exName, durationMinutes }) => ({
              id,
              name: exName.trim(),
              durationMinutes: Number(durationMinutes),
            }))
          : exercises.map(({ id, name: exName, sets, reps, duration, type }) => ({
              id,
              name: exName.trim(),
              sets: Number(sets),
              reps: type === 'reps' ? Number(reps) : null,
              duration: type === 'duration' ? Number(duration) : null,
            })),
      createdAt: routine?.createdAt ?? new Date().toISOString(),
    };
    onSave(saved);
  }

  const exerciseErrors = errors.exerciseErrors ?? [];

  const libraryForType = routineType === 'cardio'
    ? allExercises.filter((e) => e.category === 'cardio')
    : allExercises.filter((e) => e.category !== 'cardio');

  const libraryGroups = libraryForType.reduce((acc, ex) => {
    const group = ex.primaryMuscles?.[0] ?? ex.category ?? 'other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(ex);
    return acc;
  }, {});
  const sortedGroups = Object.entries(libraryGroups).sort(([a], [b]) => a.localeCompare(b));

  return (
    <form className="routines-form-content" onSubmit={handleSubmit} noValidate>
      <div className="routine-form__header">
        <button type="button" className="btn btn--ghost btn--small" onClick={onCancel}>
          ← Zurück
        </button>
        <h2>{isEdit ? 'Routine bearbeiten' : 'Neue Routine'}</h2>
      </div>

      <div className="routine-type-toggle">
        <button
          type="button"
          className={routineType === 'strength' ? 'active' : ''}
          onClick={() => handleRoutineTypeChange('strength')}
        >
          Kraft
        </button>
        <button
          type="button"
          className={routineType === 'cardio' ? 'active' : ''}
          onClick={() => handleRoutineTypeChange('cardio')}
        >
          Cardio
        </button>
      </div>

      <div className="form-group">
        <label htmlFor="routine-name">Name *</label>
        <input
          id="routine-name"
          type="text"
          value={name}
          maxLength={MAX_NAME}
          onChange={(e) => setName(e.target.value)}
          className={submitted && errors.name ? 'is-invalid' : ''}
          placeholder="z. B. Push Day"
        />
        {submitted && errors.name && <div className="field-error">{errors.name}</div>}
      </div>

      <div className="form-group">
        <label htmlFor="routine-desc">Beschreibung</label>
        <textarea
          id="routine-desc"
          value={description}
          maxLength={MAX_DESC}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Optional"
        />
      </div>

      <div className="exercises-header">
        <h3>{routineType === 'cardio' ? 'Cardio-Übungen' : 'Übungen'}</h3>
        <button type="button" className="btn btn--small" onClick={addExercise}>
          + Übung
        </button>
      </div>

      {submitted && errors.exercises && (
        <div className="field-error" style={{ marginBottom: '0.5rem' }}>
          {errors.exercises}
        </div>
      )}

      {exercises.length === 0 ? (
        <div className="exercises-empty">Noch keine Übungen hinzugefügt.</div>
      ) : (
        exercises.map((ex, idx) => {
          const exErr = exerciseErrors[idx] ?? {};

          if (routineType === 'cardio') {
            return (
              <div key={ex.id} className="exercise-row">
                <div className="exercise-row__fields exercise-row__fields--cardio">
                  <div className="form-group">
                    <div className="exercise-row__label-row">
                      <label>Übung</label>
                      <button
                        type="button"
                        className="exercise-row__library-btn"
                        onClick={() =>
                          libraryOpenForId === ex.id ? closeLibrary() : openLibrary(ex.id)
                        }
                      >
                        Bibliothek
                      </button>
                    </div>
                    <input
                      type="text"
                      value={ex.name}
                      maxLength={MAX_NAME}
                      onChange={(e) => updateExercise(ex.id, 'name', e.target.value)}
                      className={submitted && exErr.name ? 'is-invalid' : ''}
                      placeholder="z. B. Laufen"
                    />
                    {submitted && exErr.name && <div className="field-error">{exErr.name}</div>}
                  </div>
                  <div className="form-group">
                    <label htmlFor={`dur-${ex.id}`}>Min.</label>
                    <input
                      id={`dur-${ex.id}`}
                      type="number"
                      min="1"
                      value={ex.durationMinutes}
                      onChange={(e) => updateExercise(ex.id, 'durationMinutes', e.target.value)}
                      className={submitted && exErr.durationMinutes ? 'is-invalid' : ''}
                    />
                    {submitted && exErr.durationMinutes && (
                      <div className="field-error">{exErr.durationMinutes}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn--small btn--danger"
                    onClick={() => removeExercise(ex.id)}
                    style={{ marginTop: '1.35rem' }}
                  >
                    ✕
                  </button>
                </div>

                {libraryOpenForId === ex.id && (() => {
                  const searchTerm = librarySearch.trim().toLowerCase();
                  const filtered = searchTerm
                    ? libraryForType.filter((e) => e.name.toLowerCase().includes(searchTerm))
                    : null;

                  return (
                    <>
                      <div className="exercise-picker__backdrop" onClick={closeLibrary} />
                      <div className="exercise-picker">
                        <div className="exercise-picker__search-wrap">
                          <input
                            className="exercise-picker__search"
                            type="text"
                            value={librarySearch}
                            onChange={(e) => setLibrarySearch(e.target.value)}
                            placeholder="Suchen…"
                            // eslint-disable-next-line jsx-a11y/no-autofocus
                            autoFocus
                          />
                        </div>
                        <div className="exercise-picker__list" role="listbox">
                          {filtered !== null ? (
                            filtered.length === 0 ? (
                              <p className="exercise-picker__empty">Keine Übungen gefunden.</p>
                            ) : (
                              filtered.map((exercise) => (
                                <button
                                  key={exercise.id}
                                  type="button"
                                  className="exercise-picker__item"
                                  role="option"
                                  onClick={() => selectFromLibrary(ex.id, exercise)}
                                >
                                  <span className="exercise-picker__item-name">{exercise.name}</span>
                                  {exercise.equipment && (
                                    <span className="exercise-picker__item-desc">{exercise.equipment}</span>
                                  )}
                                </button>
                              ))
                            )
                          ) : libLoading ? (
                            <p className="exercise-picker__empty">Laden…</p>
                          ) : libError ? (
                            <p className="exercise-picker__empty">{libError}</p>
                          ) : (
                            sortedGroups.map(([group, exList]) => (
                              <div key={group}>
                                <div className="exercise-picker__category">{group}</div>
                                {exList.map((exercise) => (
                                  <button
                                    key={exercise.id}
                                    type="button"
                                    className="exercise-picker__item"
                                    role="option"
                                    onClick={() => selectFromLibrary(ex.id, exercise)}
                                  >
                                    <span className="exercise-picker__item-name">{exercise.name}</span>
                                    {exercise.equipment && (
                                      <span className="exercise-picker__item-desc">{exercise.equipment}</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            );
          }

          // Strength exercise row
          return (
            <div key={ex.id} className="exercise-row">
              <div className="exercise-type-toggle">
                <button
                  type="button"
                  className={ex.type === 'reps' ? 'active' : ''}
                  onClick={() => updateExercise(ex.id, 'type', 'reps')}
                >
                  Wiederholungen
                </button>
                <button
                  type="button"
                  className={ex.type === 'duration' ? 'active' : ''}
                  onClick={() => updateExercise(ex.id, 'type', 'duration')}
                >
                  Dauer
                </button>
              </div>
              <div className="exercise-row__fields">
                <div className="form-group">
                  <div className="exercise-row__label-row">
                    <label>Übung</label>
                    <button
                      type="button"
                      className="exercise-row__library-btn"
                      onClick={() =>
                        libraryOpenForId === ex.id ? closeLibrary() : openLibrary(ex.id)
                      }
                    >
                      Bibliothek
                    </button>
                  </div>
                  <input
                    type="text"
                    value={ex.name}
                    maxLength={MAX_NAME}
                    onChange={(e) => updateExercise(ex.id, 'name', e.target.value)}
                    className={submitted && exErr.name ? 'is-invalid' : ''}
                    placeholder="z. B. Kniebeuge"
                  />
                  {submitted && exErr.name && <div className="field-error">{exErr.name}</div>}
                </div>
                <div className="form-group">
                  <label>Sätze</label>
                  <input
                    type="number"
                    min="1"
                    value={ex.sets}
                    onChange={(e) => updateExercise(ex.id, 'sets', e.target.value)}
                    className={submitted && exErr.sets ? 'is-invalid' : ''}
                  />
                  {submitted && exErr.sets && <div className="field-error">{exErr.sets}</div>}
                </div>
                {ex.type === 'reps' ? (
                  <div className="form-group">
                    <label>Wdh.</label>
                    <input
                      type="number"
                      min="1"
                      value={ex.reps}
                      onChange={(e) => updateExercise(ex.id, 'reps', e.target.value)}
                      className={submitted && exErr.reps ? 'is-invalid' : ''}
                    />
                    {submitted && exErr.reps && <div className="field-error">{exErr.reps}</div>}
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Sek.</label>
                    <input
                      type="number"
                      min="1"
                      value={ex.duration}
                      onChange={(e) => updateExercise(ex.id, 'duration', e.target.value)}
                      className={submitted && exErr.duration ? 'is-invalid' : ''}
                    />
                    {submitted && exErr.duration && (
                      <div className="field-error">{exErr.duration}</div>
                    )}
                  </div>
                )}
                <div />
                <button
                  type="button"
                  className="btn btn--small btn--danger"
                  onClick={() => removeExercise(ex.id)}
                  style={{ marginTop: '1.35rem' }}
                >
                  ✕
                </button>
              </div>

              {libraryOpenForId === ex.id && (() => {
                const searchTerm = librarySearch.trim().toLowerCase();
                const filtered = searchTerm
                  ? libraryForType.filter((e) => e.name.toLowerCase().includes(searchTerm))
                  : null;

                return (
                  <>
                    <div className="exercise-picker__backdrop" onClick={closeLibrary} />
                    <div className="exercise-picker">
                      <div className="exercise-picker__search-wrap">
                        <input
                          className="exercise-picker__search"
                          type="text"
                          value={librarySearch}
                          onChange={(e) => setLibrarySearch(e.target.value)}
                          placeholder="Suchen…"
                          // eslint-disable-next-line jsx-a11y/no-autofocus
                          autoFocus
                        />
                      </div>
                      <div className="exercise-picker__list" role="listbox">
                        {filtered !== null ? (
                          filtered.length === 0 ? (
                            <p className="exercise-picker__empty">Keine Übungen gefunden.</p>
                          ) : (
                            filtered.map((exercise) => (
                              <button
                                key={exercise.id}
                                type="button"
                                className="exercise-picker__item"
                                role="option"
                                onClick={() => selectFromLibrary(ex.id, exercise)}
                              >
                                <span className="exercise-picker__item-name">{exercise.name}</span>
                                {exercise.equipment && (
                                  <span className="exercise-picker__item-desc">{exercise.equipment}</span>
                                )}
                              </button>
                            ))
                          )
                        ) : libLoading ? (
                          <p className="exercise-picker__empty">Laden…</p>
                        ) : libError ? (
                          <p className="exercise-picker__empty">{libError}</p>
                        ) : (
                          sortedGroups.map(([group, exList]) => (
                            <div key={group}>
                              <div className="exercise-picker__category">{group}</div>
                              {exList.map((exercise) => (
                                <button
                                  key={exercise.id}
                                  type="button"
                                  className="exercise-picker__item"
                                  role="option"
                                  onClick={() => selectFromLibrary(ex.id, exercise)}
                                >
                                  <span className="exercise-picker__item-name">{exercise.name}</span>
                                  {exercise.equipment && (
                                    <span className="exercise-picker__item-desc">{exercise.equipment}</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          );
        })
      )}

      {saveError && <div className="field-error save-error">{saveError}</div>}

      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Abbrechen
        </button>
        <button type="submit" className="btn btn--primary">
          Speichern
        </button>
      </div>
    </form>
  );
}
