import { useState } from 'react';
import { generateId } from '../utils/uuid.js';
import { useGarminActivityDetail } from '../hooks/useGarmin.js';
import './JournalView.css';

const GARMIN_TYPE_LABELS = {
  running: 'Laufen',
  cycling: 'Radfahren',
  swimming: 'Schwimmen',
  open_water_swimming: 'Freiwasser',
  strength_training: 'Krafttraining',
  hiking: 'Wandern',
  walking: 'Gehen',
  indoor_cycling: 'Indoor-Rad',
  treadmill_running: 'Laufband',
  elliptical: 'Elliptical',
  yoga: 'Yoga',
  other: 'Aktivität',
};

function formatPace(secPerKm) {
  if (!secPerKm || secPerKm <= 0) return null;
  const mins = Math.floor(secPerKm / 60);
  const secs = secPerKm % 60;
  return `${mins}:${String(secs).padStart(2, '0')} /km`;
}

function mapGarminToEntry(a) {
  const startedAt = a.startTimeLocal
    ? a.startTimeLocal.replace(' ', 'T')
    : new Date().toISOString().slice(0, 10) + 'T00:00:00';
  const avgPace = a.avgSpeed && a.avgSpeed > 0 ? Math.round(1000 / a.avgSpeed) : null;
  return {
    id: 'garmin-' + a.id,
    routineName: a.activityName || GARMIN_TYPE_LABELS[a.activityType] || 'Garmin-Aktivität',
    startedAt,
    durationSeconds: a.duration ? Math.round(a.duration) : 0,
    totalSets: 0,
    notes: '',
    exerciseData: '',
    source: 'garmin',
    garminActivityId: a.id,
    garminType: a.activityType,
    garminDistance: a.distance ?? null,
    garminCalories: a.calories ?? null,
    garminHR: a.averageHR ?? null,
    garminMaxHR: a.maxHR ?? null,
    garminElevation: a.elevationGain ?? null,
    garminAvgPace: avgPace,
    garminCadence: a.cadence ?? null,
  };
}

const RATINGS = [
  { value: 0, emoji: '😢', label: 'Schlecht' },
  { value: 1, emoji: '😐', label: 'Mittel' },
  { value: 2, emoji: '😊', label: 'Gut' },
];

const RATING_EMOJI = { 0: '😢', 1: '😐', 2: '😊' };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function formatGroupDate(dateKey) {
  const d = new Date(dateKey + 'T12:00:00');
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
}

function groupByDate(entries) {
  const groups = [];
  let current = null;
  for (const entry of entries) {
    const dateKey = entry.startedAt.slice(0, 10);
    if (!current || current.dateKey !== dateKey) {
      current = { dateKey, label: formatGroupDate(dateKey), entries: [] };
      groups.push(current);
    }
    current.entries.push(entry);
  }
  return groups;
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m > 0 ? m + 'min' : ''}`.trim();
  return `${m} Min.`;
}

function defaultForm() {
  return { routineId: '__free__', routineName: '', date: todayISO(), durationMinutes: '', totalSets: '', notes: '' };
}

function defaultExDetails(exercises) {
  const map = {};
  for (const ex of exercises) {
    map[ex.id] = {
      completedSets: new Array(Math.max(ex.sets, 0)).fill(true),
      weight: '',
      actualReps: ex.reps != null ? String(ex.reps) : '',
      actualDuration: ex.duration != null ? String(ex.duration) : '',
      rating: null,
    };
  }
  return map;
}

function workoutToForm(workout, routines) {
  const dateStr = workout.startedAt ? workout.startedAt.slice(0, 10) : todayISO();
  const durationMinutes = workout.durationSeconds
    ? String(Math.round(workout.durationSeconds / 60))
    : '';
  const routineExists = routines.some((r) => r.id === workout.routineId);
  return {
    routineId: routineExists ? workout.routineId : '__free__',
    routineName: workout.routineName || '',
    date: dateStr,
    durationMinutes,
    totalSets: workout.totalSets ? String(workout.totalSets) : '',
    notes: workout.notes || '',
  };
}

function workoutToExDetails(workout, routine) {
  if (!routine || !routine.exercises || routine.exercises.length === 0) return {};
  let storedArr = [];
  try {
    storedArr = JSON.parse(workout.exerciseData || '[]');
  } catch { /* empty */ }
  if (!Array.isArray(storedArr)) storedArr = [];
  const storedById = Object.fromEntries(storedArr.map((ex) => [ex.id, ex]));
  const map = {};
  for (const ex of routine.exercises) {
    const stored = storedById[ex.id];
    map[ex.id] = stored
      ? {
          completedSets: Array.isArray(stored.completedSets)
            ? stored.completedSets
            : new Array(Math.max(ex.sets, 0)).fill(true),
          weight: stored.weight != null ? String(stored.weight) : '',
          actualReps: stored.actualReps != null
            ? String(stored.actualReps)
            : ex.reps != null ? String(ex.reps) : '',
          actualDuration: stored.actualDuration != null
            ? String(stored.actualDuration)
            : ex.duration != null ? String(ex.duration) : '',
          rating: stored.rating ?? null,
        }
      : defaultExDetails([ex])[ex.id];
  }
  return map;
}

function getAvgRating(exerciseData) {
  try {
    const data = JSON.parse(exerciseData || '[]');
    const rated = data.filter((e) => e.rating !== null && e.rating !== undefined);
    if (!rated.length) return null;
    return rated.reduce((s, e) => s + e.rating, 0) / rated.length;
  } catch {
    return null;
  }
}

function ratingEmoji(avg) {
  if (avg === null) return null;
  if (avg >= 1.5) return '😊';
  if (avg >= 0.5) return '😐';
  return '😢';
}

function ExerciseDetailRow({ ex, detail, onChange }) {
  function toggleSet(idx) {
    const next = [...detail.completedSets];
    next[idx] = !next[idx];
    onChange('completedSets', next);
  }

  function addSet() {
    onChange('completedSets', [...detail.completedSets, true]);
  }

  function removeSet() {
    if (detail.completedSets.length <= 1) return;
    onChange('completedSets', detail.completedSets.slice(0, -1));
  }

  return (
    <div className="journal-ex-row">
      <div className="journal-ex-row__top">
        <span className="journal-ex-row__name">{ex.name}</span>
        <div className="journal-ex-row__rating">
          {RATINGS.map(({ value, emoji, label }) => (
            <button
              key={value}
              type="button"
              className={`journal-ex-row__rating-btn${detail.rating === value ? ' journal-ex-row__rating-btn--active' : ''}`}
              onClick={() => onChange('rating', detail.rating === value ? null : value)}
              aria-label={label}
              title={label}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="journal-ex-row__sets-row">
        <button
          type="button"
          className="journal-ex-row__set-adjust"
          onClick={removeSet}
          disabled={detail.completedSets.length <= 1}
          aria-label="Satz entfernen"
          title="Satz entfernen"
        >
          −
        </button>
        <div className="journal-ex-row__sets">
          {detail.completedSets.map((done, idx) => (
            <button
              key={idx}
              type="button"
              className={`journal-ex-row__set-btn${done ? ' journal-ex-row__set-btn--done' : ''}`}
              onClick={() => toggleSet(idx)}
              aria-label={`Satz ${idx + 1}${done ? ', erledigt' : ''}`}
            >
              {done ? '✓' : idx + 1}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="journal-ex-row__set-adjust"
          onClick={addSet}
          aria-label="Satz hinzufügen"
          title="Satz hinzufügen"
        >
          +
        </button>
      </div>

      <div className="journal-ex-row__fields">
        <div className="journal-ex-row__field">
          <label className="journal-form__label">Gewicht</label>
          <div className="journal-ex-row__input-unit">
            <input
              type="number"
              min="0"
              className="journal-ex-row__input"
              value={detail.weight}
              onChange={(e) => onChange('weight', e.target.value)}
              placeholder="—"
              aria-label={`Gewicht für ${ex.name}`}
            />
            <span className="journal-ex-row__unit">kg</span>
          </div>
        </div>

        {ex.reps != null && (
          <div className="journal-ex-row__field">
            <label className="journal-form__label">Wdh.</label>
            <input
              type="number"
              min="0"
              className="journal-ex-row__input"
              value={detail.actualReps}
              onChange={(e) => onChange('actualReps', e.target.value)}
              aria-label={`Wiederholungen für ${ex.name}`}
            />
          </div>
        )}

        {ex.duration != null && (
          <div className="journal-ex-row__field">
            <label className="journal-form__label">Sek.</label>
            <input
              type="number"
              min="0"
              className="journal-ex-row__input"
              value={detail.actualDuration}
              onChange={(e) => onChange('actualDuration', e.target.value)}
              aria-label={`Dauer für ${ex.name}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function JournalDetail({ workout }) {
  let exercises = [];
  try {
    const parsed = JSON.parse(workout.exerciseData || '[]');
    if (Array.isArray(parsed)) exercises = parsed;
  } catch { /* empty */ }

  const hasExercises = exercises.length > 0;
  const hasNotes = workout.notes && workout.notes.trim().length > 0;

  return (
    <div className="journal-detail">
      {hasExercises ? (
        exercises.map((ex, i) => (
          <div key={ex.id ?? i} className="journal-detail__exercise">
            <div className="journal-detail__ex-header">
              <span className="journal-detail__ex-name">{ex.name}</span>
              {ex.rating != null && (
                <span className="journal-detail__ex-rating" aria-label={`Bewertung: ${RATING_EMOJI[ex.rating]}`}>
                  {RATING_EMOJI[ex.rating]}
                </span>
              )}
            </div>
            <div className="journal-detail__ex-body">
              {Array.isArray(ex.completedSets) && ex.completedSets.length > 0 && (
                <div className="journal-detail__sets">
                  {ex.completedSets.map((done, idx) => (
                    <span
                      key={idx}
                      className={`journal-detail__set-badge${done ? ' journal-detail__set-badge--done' : ''}`}
                      aria-label={`Satz ${idx + 1}${done ? ', erledigt' : ', nicht erledigt'}`}
                    >
                      {done ? '✓' : '×'}
                    </span>
                  ))}
                </div>
              )}
              <div className="journal-detail__metrics">
                {ex.weight != null && (
                  <span className="journal-detail__metric">{ex.weight} kg</span>
                )}
                {ex.actualReps != null && (
                  <span className="journal-detail__metric">{ex.actualReps} Wdh.</span>
                )}
                {ex.actualDuration != null && (
                  <span className="journal-detail__metric">{ex.actualDuration} Sek.</span>
                )}
              </div>
            </div>
          </div>
        ))
      ) : (
        <p className="journal-detail__empty">Keine Übungsdetails erfasst.</p>
      )}
      {hasNotes && (
        <p className="journal-detail__notes-full">{workout.notes}</p>
      )}
    </div>
  );
}

function SplitsTable({ splits }) {
  return (
    <div className="journal-splits">
      <div className="journal-splits__title">Splits</div>
      <div className="journal-splits__wrap">
        <table className="journal-splits__table">
          <thead>
            <tr>
              <th>km</th>
              <th>Pace</th>
              <th>Puls</th>
              <th>Zeit</th>
            </tr>
          </thead>
          <tbody>
            {splits.map((s, i) => {
              const distKm = s.distance != null ? (s.distance / 1000).toFixed(2) : '—';
              const pace = s.avgPace ? (formatPace(s.avgPace) ?? '—') : '—';
              const hr = s.avgHR ? Math.round(s.avgHR) : '—';
              const mins = s.duration ? Math.floor(s.duration / 60) : null;
              const secs = s.duration ? Math.round(s.duration % 60) : null;
              const dur = mins != null ? `${mins}:${String(secs).padStart(2, '0')}` : '—';
              return (
                <tr key={i}>
                  <td>{distKm}</td>
                  <td>{pace}</td>
                  <td>{hr}</td>
                  <td>{dur}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GarminEntryDetail({ workout }) {
  const rawId = workout.garminActivityId || workout.id.replace('garmin-', '');
  const { detail, loading: splitsLoading } = useGarminActivityDetail(rawId);

  const distanceKm = workout.garminDistance != null
    ? (workout.garminDistance / 1000).toFixed(1)
    : null;
  const pace = workout.garminAvgPace ? formatPace(workout.garminAvgPace) : null;

  return (
    <div className="journal-detail">
      <div className="journal-detail__metrics">
        {distanceKm && (
          <span className="journal-detail__metric">{distanceKm} km</span>
        )}
        {pace && (
          <span className="journal-detail__metric">{pace}</span>
        )}
        {workout.garminCalories != null && (
          <span className="journal-detail__metric">{Math.round(workout.garminCalories)} kcal</span>
        )}
        {workout.garminHR != null && (
          <span className="journal-detail__metric">⌀ {Math.round(workout.garminHR)} bpm</span>
        )}
        {workout.garminMaxHR != null && (
          <span className="journal-detail__metric">Max {Math.round(workout.garminMaxHR)} bpm</span>
        )}
        {workout.garminElevation != null && workout.garminElevation > 0 && (
          <span className="journal-detail__metric">↑ {Math.round(workout.garminElevation)} m</span>
        )}
        {workout.garminCadence != null && (
          <span className="journal-detail__metric">{workout.garminCadence} spm</span>
        )}
      </div>
      {splitsLoading && (
        <p style={{ fontSize: '13px', color: '#999', margin: '8px 0 0 0' }}>Splits werden geladen…</p>
      )}
      {!splitsLoading && detail && detail.splits.length > 0 && (
        <SplitsTable splits={detail.splits} />
      )}
    </div>
  );
}

function JournalEntry({ workout, onDelete, isExpanded, onToggle }) {
  const isGarmin = workout.source === 'garmin';
  const duration = formatDuration(workout.durationSeconds);
  const emoji = isGarmin ? null : ratingEmoji(getAvgRating(workout.exerciseData ?? ''));
  const typeLabel = isGarmin ? (GARMIN_TYPE_LABELS[workout.garminType] ?? 'Garmin') : null;
  const distanceKm = isGarmin && workout.garminDistance != null
    ? (workout.garminDistance / 1000).toFixed(1)
    : null;

  return (
    <div
      className={[
        'journal-entry',
        isExpanded ? 'journal-entry--expanded' : '',
        isGarmin ? 'journal-entry--garmin' : '',
      ].filter(Boolean).join(' ')}
      onClick={onToggle}
      style={{ cursor: 'pointer' }}
    >
      <div className="journal-entry__body">
        <div className="journal-entry__info">
          <span className="journal-entry__name">{workout.routineName}</span>
          <div className="journal-entry__badges">
            {typeLabel && (
              <span className="journal-badge journal-badge--garmin">{typeLabel}</span>
            )}
            {duration && (
              <span className="journal-badge journal-badge--duration">{duration}</span>
            )}
            {distanceKm && (
              <span className="journal-badge journal-badge--distance">{distanceKm} km</span>
            )}
            {!isGarmin && workout.totalSets > 0 && (
              <span className="journal-badge journal-badge--sets">
                {workout.totalSets} {workout.totalSets === 1 ? 'Satz' : 'Sätze'}
              </span>
            )}
            {emoji && (
              <span className="journal-badge journal-badge--rating" aria-label={`Bewertung: ${emoji}`}>{emoji}</span>
            )}
          </div>
        </div>
        <div className="journal-entry__actions">
          {!isGarmin && (
            <button
              type="button"
              className="journal-entry__delete"
              aria-label="Eintrag löschen"
              onClick={(e) => { e.stopPropagation(); onDelete(workout.id); }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          <svg
            className="journal-entry__chevron"
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            aria-hidden="true"
          >
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function JournalPanel({ workout, onEdit, onClose }) {
  const isGarmin = workout.source === 'garmin';
  const duration = formatDuration(workout.durationSeconds);
  const emoji = isGarmin ? null : ratingEmoji(getAvgRating(workout.exerciseData ?? ''));
  const typeLabel = isGarmin ? (GARMIN_TYPE_LABELS[workout.garminType] ?? 'Garmin') : null;
  const distanceKm = isGarmin && workout.garminDistance != null
    ? (workout.garminDistance / 1000).toFixed(1) : null;
  const hasBadges = typeLabel || duration || distanceKm || (!isGarmin && workout.totalSets > 0) || emoji;

  return (
    <div className="journal-panel">
      <div className="journal-panel__header">
        <div className="journal-panel__title-group">
          <span className="journal-panel__name">{workout.routineName}</span>
          <span className="journal-panel__date">{formatDate(workout.startedAt)}</span>
        </div>
        <div className="journal-panel__top-actions">
          {!isGarmin && (
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => onEdit(workout)}
              aria-label="Eintrag bearbeiten"
            >
              Bearbeiten
            </button>
          )}
          <button
            type="button"
            className="journal-panel__close"
            onClick={onClose}
            aria-label="Panel schließen"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      {hasBadges && (
        <div className="journal-panel__badges">
          {typeLabel && <span className="journal-badge journal-badge--garmin">{typeLabel}</span>}
          {duration && <span className="journal-badge journal-badge--duration">{duration}</span>}
          {distanceKm && <span className="journal-badge journal-badge--distance">{distanceKm} km</span>}
          {!isGarmin && workout.totalSets > 0 && (
            <span className="journal-badge journal-badge--sets">
              {workout.totalSets} {workout.totalSets === 1 ? 'Satz' : 'Sätze'}
            </span>
          )}
          {emoji && (
            <span className="journal-badge journal-badge--rating" aria-label={`Bewertung: ${emoji}`}>{emoji}</span>
          )}
        </div>
      )}
      <div className="journal-panel__body">
        {isGarmin ? <GarminEntryDetail workout={workout} /> : <JournalDetail workout={workout} />}
      </div>
    </div>
  );
}

export default function JournalView({ workouts, addWorkout, updateWorkout, deleteWorkout, routines, garminActivities = [] }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm());
  const [exDetails, setExDetails] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [editingWorkout, setEditingWorkout] = useState(null);

  function handleToggle(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function handleOpenNewEntry() {
    setForm(defaultForm());
    setExDetails({});
    setEditingWorkout(null);
    setSaveError(null);
    setShowForm(true);
    setExpandedId(null);
  }

  function handleEdit(workout) {
    const newForm = workoutToForm(workout, routines);
    const routine = routines.find((r) => r.id === newForm.routineId) ?? null;
    setForm(newForm);
    setExDetails(workoutToExDetails(workout, routine));
    setEditingWorkout(workout);
    setSaveError(null);
    setShowForm(true);
    setExpandedId(null);
  }

  function handleRoutineChange(e) {
    const id = e.target.value;
    if (id === '__free__') {
      setForm((f) => ({ ...f, routineId: '__free__', routineName: '' }));
      setExDetails({});
    } else {
      const routine = routines.find((r) => r.id === id);
      setForm((f) => ({ ...f, routineId: id, routineName: routine?.name ?? '' }));
      setExDetails(defaultExDetails(routine?.exercises ?? []));
    }
  }

  function updateExDetail(exId, field, value) {
    setExDetails((prev) => ({
      ...prev,
      [exId]: { ...prev[exId], [field]: value },
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.routineName.trim()) return;
    setSaving(true);
    setSaveError(null);

    const selectedRoutine = routines.find((r) => r.id === form.routineId);
    const hasExercises = selectedRoutine && selectedRoutine.exercises.length > 0;

    const totalSets = hasExercises
      ? selectedRoutine.exercises.reduce((sum, ex) => {
          const d = exDetails[ex.id] ?? {};
          return sum + (d.completedSets ?? []).filter(Boolean).length;
        }, 0)
      : form.totalSets ? Number(form.totalSets) : 0;

    const exerciseData = hasExercises
      ? JSON.stringify(
          selectedRoutine.exercises.map((ex) => {
            const d = exDetails[ex.id] ?? {};
            return {
              id: ex.id,
              name: ex.name,
              weight: d.weight !== '' && d.weight != null ? Number(d.weight) : null,
              actualReps: d.actualReps !== '' && d.actualReps != null ? Number(d.actualReps) : null,
              actualDuration: d.actualDuration !== '' && d.actualDuration != null ? Number(d.actualDuration) : null,
              rating: d.rating ?? null,
              completedSets: d.completedSets ?? [],
            };
          })
        )
      : '';

    const payload = {
      id: editingWorkout ? editingWorkout.id : generateId(),
      routineId: form.routineId === '__free__' ? '' : form.routineId,
      routineName: form.routineName.trim(),
      startedAt: form.date ? form.date + 'T12:00:00.000Z' : new Date().toISOString(),
      durationSeconds: form.durationMinutes ? Number(form.durationMinutes) * 60 : 0,
      totalSets,
      notes: form.notes.trim(),
      exerciseData,
    };

    try {
      if (editingWorkout) {
        await updateWorkout(editingWorkout.id, payload);
      } else {
        await addWorkout(payload);
      }
      setForm(defaultForm());
      setExDetails({});
      setShowForm(false);
      setEditingWorkout(null);
    } catch {
      setSaveError('Speichern fehlgeschlagen. Ist das Backend erreichbar?');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id) {
    if (window.confirm('Eintrag wirklich löschen?')) {
      deleteWorkout(id);
    }
  }

  function handleClose() {
    setExpandedId(null);
  }

  function handleCancel() {
    setForm(defaultForm());
    setExDetails({});
    setShowForm(false);
    setEditingWorkout(null);
    setSaveError(null);
  }

  const selectedRoutine =
    form.routineId !== '__free__' ? routines.find((r) => r.id === form.routineId) : null;
  const hasExercises = selectedRoutine && selectedRoutine.exercises.length > 0;

  const garminEntries = garminActivities.map(mapGarminToEntry);
  const allEntries = [...workouts, ...garminEntries]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const dayGroups = groupByDate(allEntries);
  const expandedWorkout = expandedId
    ? (allEntries.find((w) => w.id === expandedId) ?? null)
    : null;

  return (
    <div className="journal-view">
      <div className="journal-view__header">
        <div className="journal-view__header-left">
          <h1 className="journal-view__title">Journal</h1>
          {allEntries.length > 0 && (
            <p className="journal-view__count">
              {allEntries.length} {allEntries.length === 1 ? 'Eintrag' : 'Einträge'}
            </p>
          )}
        </div>
        <button
          type="button"
          className="btn btn--primary btn--small"
          onClick={handleOpenNewEntry}
        >
          {'+ Eintrag'}
        </button>
      </div>

      {showForm && (
        <form className="journal-form" onSubmit={handleSubmit} noValidate>
          {editingWorkout && (
            <div className="journal-form__edit-banner">Training bearbeiten</div>
          )}
          <div className="journal-form__grid">
            <div className="journal-form__field">
              <label className="journal-form__label" htmlFor="j-routine">Aktivität</label>
              <select
                id="j-routine"
                className="journal-form__select"
                value={form.routineId}
                onChange={handleRoutineChange}
              >
                <option value="__free__">Freies Training</option>
                {routines.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {form.routineId === '__free__' && (
              <div className="journal-form__field">
                <label className="journal-form__label" htmlFor="j-name">Name *</label>
                <input
                  id="j-name"
                  type="text"
                  className="journal-form__input"
                  value={form.routineName}
                  onChange={(e) => setForm((f) => ({ ...f, routineName: e.target.value }))}
                  placeholder="z. B. Laufen"
                  maxLength={100}
                  required
                />
              </div>
            )}

            <div className="journal-form__field">
              <label className="journal-form__label" htmlFor="j-date">Datum</label>
              <input
                id="j-date"
                type="date"
                className="journal-form__input"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>

            <div className="journal-form__field">
              <label className="journal-form__label" htmlFor="j-duration">Dauer (Min.)</label>
              <input
                id="j-duration"
                type="number"
                className="journal-form__input"
                value={form.durationMinutes}
                onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
                min="0"
                placeholder="45"
              />
            </div>

            {!hasExercises && (
              <div className="journal-form__field">
                <label className="journal-form__label" htmlFor="j-sets">Sätze</label>
                <input
                  id="j-sets"
                  type="number"
                  className="journal-form__input"
                  value={form.totalSets}
                  onChange={(e) => setForm((f) => ({ ...f, totalSets: e.target.value }))}
                  min="0"
                  placeholder="12"
                />
              </div>
            )}

            {hasExercises && (
              <div className="journal-form__field journal-form__field--full journal-form__exercises">
                <span className="journal-form__label">Übungsdetails</span>
                {selectedRoutine.exercises.map((ex) => (
                  <ExerciseDetailRow
                    key={ex.id}
                    ex={ex}
                    detail={exDetails[ex.id] ?? { completedSets: [], weight: '', actualReps: '', actualDuration: '', rating: null }}
                    onChange={(field, value) => updateExDetail(ex.id, field, value)}
                  />
                ))}
              </div>
            )}

            <div className="journal-form__field journal-form__field--full">
              <label className="journal-form__label" htmlFor="j-notes">Notizen</label>
              <textarea
                id="j-notes"
                className="journal-form__input journal-form__textarea"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Wie lief das Training?"
                maxLength={500}
              />
            </div>
          </div>

          {saveError && <div className="journal-form__save-error">{saveError}</div>}

          <div className="journal-form__actions">
            <button type="button" className="btn btn--ghost btn--small" onClick={handleCancel}>
              Abbrechen
            </button>
            <button type="submit" className="btn btn--primary btn--small" disabled={saving}>
              {saving ? 'Speichern…' : 'Speichern'}
            </button>
          </div>
        </form>
      )}

      <div className={`journal-body${expandedWorkout ? ' journal-body--has-panel' : ''}`}>
        <div className="journal-body__list">
          {allEntries.length === 0 ? (
            <div className="journal-empty">
              <p>Noch keine Trainings gespeichert.</p>
              <p className="journal-empty__sub">Schließe ein Training ab oder füge einen Eintrag manuell hinzu.</p>
            </div>
          ) : (
            <div className="journal-list">
              {dayGroups.map((group) => (
                <div key={group.dateKey} className="journal-day">
                  <div className="journal-day__header">{group.label}</div>
                  {group.entries.map((w) => (
                    <JournalEntry
                      key={w.id}
                      workout={w}
                      onDelete={handleDelete}
                      isExpanded={expandedId === w.id}
                      onToggle={() => handleToggle(w.id)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        {expandedWorkout && (
          <JournalPanel
            workout={expandedWorkout}
            onEdit={handleEdit}
            onClose={handleClose}
          />
        )}
      </div>
    </div>
  );
}
