import { useState } from 'react';
import { useExerciseLibrary, getExerciseImage, getExerciseInstructions } from '../hooks/useExerciseLibrary.js';
import './RoutineDetail.css';

function formatExerciseStats(exercise) {
  if (exercise.durationMinutes != null) {
    return { label: `${exercise.durationMinutes} min`, valueType: 'cardio' };
  }
  const sets = exercise.sets === 1 ? '1 Satz' : `${exercise.sets} Sätze`;
  const repsOrDuration = exercise.duration
    ? `${exercise.duration} Sek.`
    : `${exercise.reps} Wdh.`;
  const valueType = exercise.duration ? 'duration' : 'reps';
  return { sets, repsOrDuration, valueType };
}

export default function RoutineDetail({ routine, onBack, onEdit, onStartWorkout }) {
  const { exercises: libExercises } = useExerciseLibrary();
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="routines-detail-content">
      <div className="routine-detail__header">
        <button type="button" className="btn btn--ghost btn--small" onClick={onBack}>
          ← Zurück
        </button>
        <div className="routine-detail__header-actions">
          <button type="button" className="btn btn--small" onClick={onEdit}>
            Bearbeiten
          </button>
          <button type="button" className="btn btn--primary btn--small" onClick={() => onStartWorkout?.()}>
            Training starten
          </button>
        </div>
      </div>

      <h1 className="routine-detail__title">{routine.name}</h1>

      {routine.description && (
        <p className="routine-detail__description">{routine.description}</p>
      )}

      <div className="routine-detail__exercises-label">
        {routine.exercises.length}{' '}
        {routine.exercises.length === 1 ? 'Übung' : 'Übungen'}
      </div>

      {routine.exercises.length === 0 ? (
        <div className="routine-detail__empty">Keine Übungen vorhanden.</div>
      ) : (
        <ul className="routine-detail__exercise-list">
          {routine.exercises.map((ex, idx) => {
            const stats = formatExerciseStats(ex);
            const isCardio = ex.durationMinutes != null;
            const isOpen = expandedId === ex.id;
            return (
              <li
                key={ex.id}
                className={`exercise-item exercise-item--expandable${isOpen ? ' exercise-item--open' : ''}`}
                onClick={() => setExpandedId(isOpen ? null : ex.id)}
                role="button"
                aria-expanded={isOpen}
              >
                <span className="exercise-item__index">{idx + 1}</span>
                <span className="exercise-item__name">{ex.name}</span>
                <div className="exercise-item__stats">
                  {isCardio ? (
                    <span className="exercise-item__stat exercise-item__stat--cardio">
                      {stats.label}
                    </span>
                  ) : (
                    <>
                      <span className="exercise-item__stat exercise-item__stat--sets">{stats.sets}</span>
                      <span className="exercise-item__stat-sep">×</span>
                      <span className={`exercise-item__stat exercise-item__stat--${stats.valueType}`}>
                        {stats.repsOrDuration}
                      </span>
                    </>
                  )}
                </div>
                <span className={`exercise-item__toggle${isOpen ? ' exercise-item__toggle--open' : ''}`}>›</span>
                {isOpen && (
                  <div className="exercise-item__expanded">
                    {(() => {
                      const imgUrl = getExerciseImage(ex.name, libExercises);
                      return imgUrl ? (
                        <img
                          className="exercise-item__img"
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
                        <ol className="exercise-item__instructions">
                          {steps.map((step, i) => <li key={i}>{step}</li>)}
                        </ol>
                      );
                    })()}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
