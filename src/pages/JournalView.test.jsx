import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JournalView from './JournalView.jsx';

const ROUTINES = [
  {
    id: 'r-1',
    name: 'Push Day',
    exercises: [
      { id: 'e-1', name: 'Bankdrücken', sets: 3, reps: 8, duration: null },
      { id: 'e-2', name: 'Plank', sets: 2, reps: null, duration: 60 },
    ],
  },
  { id: 'r-2', name: 'Pull Day', exercises: [] },
];

const EXERCISE_DATA = JSON.stringify([
  { id: 'e-1', name: 'Bankdrücken', weight: 80, actualReps: 8, actualDuration: null, rating: 2, completedSets: [true, true, false] },
  { id: 'e-2', name: 'Plank', weight: null, actualReps: null, actualDuration: 60, rating: 0, completedSets: [true, true] },
]);

const WORKOUT_AUTO = {
  id: 'w-1',
  routineId: 'r-1',
  routineName: 'Push Day',
  startedAt: '2026-06-12T10:00:00.000Z',
  durationSeconds: 2700,
  totalSets: 12,
  notes: '',
  exerciseData: '',
};

const WORKOUT_WITH_DATA = {
  id: 'w-2',
  routineId: 'r-1',
  routineName: 'Push Day',
  startedAt: '2026-06-11T10:00:00.000Z',
  durationSeconds: 3600,
  totalSets: 4,
  notes: 'Tolles Training',
  exerciseData: EXERCISE_DATA,
};

const WORKOUT_MANUAL = {
  id: 'w-3',
  routineId: '',
  routineName: 'Laufen',
  startedAt: '2026-06-10T12:00:00.000Z',
  durationSeconds: 1800,
  totalSets: 0,
  notes: 'Schöner Abendlauf',
  exerciseData: '',
};

function renderJournal(workouts = [], extra = {}) {
  const addWorkout = vi.fn().mockResolvedValue(undefined);
  const updateWorkout = vi.fn().mockResolvedValue(undefined);
  const deleteWorkout = vi.fn().mockResolvedValue(undefined);
  render(
    <JournalView
      workouts={workouts}
      addWorkout={addWorkout}
      updateWorkout={updateWorkout}
      deleteWorkout={deleteWorkout}
      routines={ROUTINES}
      {...extra}
    />
  );
  return { addWorkout, updateWorkout, deleteWorkout };
}

function openForm() {
  fireEvent.click(screen.getByRole('button', { name: /\+ eintrag/i }));
}

function selectRoutine(routineId = 'r-1') {
  fireEvent.change(screen.getByLabelText(/aktivität/i), { target: { value: routineId } });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('JournalView – Rendering', () => {
  it('renders page title', () => {
    renderJournal();
    expect(screen.getByText('Journal')).toBeInTheDocument();
  });

  it('shows empty state when no workouts', () => {
    renderJournal([]);
    expect(screen.getByText(/noch keine trainings/i)).toBeInTheDocument();
  });

  it('renders auto workout entry', () => {
    renderJournal([WORKOUT_AUTO]);
    expect(screen.getByText('Push Day')).toBeInTheDocument();
    expect(screen.getByText('45 Min.')).toBeInTheDocument();
    expect(screen.getByText('12 Sätze')).toBeInTheDocument();
  });

  it('renders multiple entries', () => {
    renderJournal([WORKOUT_AUTO, WORKOUT_MANUAL]);
    expect(screen.getByText('Push Day')).toBeInTheDocument();
    expect(screen.getByText('Laufen')).toBeInTheDocument();
  });

  it('does not show sets badge when totalSets is 0', () => {
    renderJournal([WORKOUT_MANUAL]);
    expect(screen.queryByText(/satz/i)).not.toBeInTheDocument();
  });

  it('does not show duration badge when durationSeconds is 0', () => {
    renderJournal([{ ...WORKOUT_AUTO, durationSeconds: 0 }]);
    expect(screen.queryByText(/min/i)).not.toBeInTheDocument();
  });
});

describe('JournalView – "+ Eintrag" Button', () => {
  it('shows form when + Eintrag clicked', () => {
    renderJournal();
    openForm();
    expect(screen.getByLabelText(/datum/i)).toBeInTheDocument();
  });

  it('hides form on cancel', () => {
    renderJournal();
    openForm();
    fireEvent.click(screen.getByRole('button', { name: /abbrechen/i }));
    expect(screen.queryByLabelText(/datum/i)).not.toBeInTheDocument();
  });
});

describe('JournalView – Manueller Eintrag', () => {
  it('shows routine dropdown with options', () => {
    renderJournal();
    openForm();
    expect(screen.getByText('Freies Training')).toBeInTheDocument();
    expect(screen.getByText('Push Day')).toBeInTheDocument();
  });

  it('shows free-text name field when "Freies Training" selected', () => {
    renderJournal();
    openForm();
    expect(screen.getByLabelText(/name \*/i)).toBeInTheDocument();
  });

  it('hides name field when a routine is selected', () => {
    renderJournal();
    openForm();
    selectRoutine();
    expect(screen.queryByLabelText(/name \*/i)).not.toBeInTheDocument();
  });

  it('calls addWorkout with correct data on submit', async () => {
    const user = userEvent.setup();
    const { addWorkout } = renderJournal();
    openForm();
    await user.type(screen.getByLabelText(/name \*/i), 'Yoga');
    await user.clear(screen.getByLabelText(/dauer/i));
    await user.type(screen.getByLabelText(/dauer/i), '30');
    fireEvent.click(screen.getByRole('button', { name: /^speichern$/i }));
    await waitFor(() => expect(addWorkout).toHaveBeenCalledOnce());
    const call = addWorkout.mock.calls[0][0];
    expect(call.routineName).toBe('Yoga');
    expect(call.durationSeconds).toBe(1800);
    expect(call.routineId).toBe('');
  });

  it('saves notes in the workout', async () => {
    const user = userEvent.setup();
    const { addWorkout } = renderJournal();
    openForm();
    await user.type(screen.getByLabelText(/name \*/i), 'Dehnen');
    await user.type(screen.getByLabelText(/notizen/i), 'Gut für Rücken');
    fireEvent.click(screen.getByRole('button', { name: /^speichern$/i }));
    await waitFor(() => expect(addWorkout).toHaveBeenCalledOnce());
    expect(addWorkout.mock.calls[0][0].notes).toBe('Gut für Rücken');
  });

  it('closes form after successful submit', async () => {
    const user = userEvent.setup();
    renderJournal();
    openForm();
    await user.type(screen.getByLabelText(/name \*/i), 'Radfahren');
    fireEvent.click(screen.getByRole('button', { name: /^speichern$/i }));
    await waitFor(() => expect(screen.queryByLabelText(/datum/i)).not.toBeInTheDocument());
  });
});

describe('JournalView – Globales Sätze-Feld', () => {
  it('shows global Sätze field for Freies Training', () => {
    renderJournal();
    openForm();
    expect(screen.getByLabelText(/^sätze$/i)).toBeInTheDocument();
  });

  it('hides global Sätze field when routine with exercises is selected', () => {
    renderJournal();
    openForm();
    selectRoutine('r-1');
    expect(screen.queryByLabelText(/^sätze$/i)).not.toBeInTheDocument();
  });

  it('shows global Sätze field for routine with 0 exercises', () => {
    renderJournal();
    openForm();
    selectRoutine('r-2');
    expect(screen.getByLabelText(/^sätze$/i)).toBeInTheDocument();
  });
});

describe('JournalView – Satz-Buttons im Formular', () => {
  function openWithRoutine() {
    renderJournal();
    openForm();
    selectRoutine('r-1');
  }

  it('shows set buttons per exercise', () => {
    openWithRoutine();
    expect(screen.getAllByRole('button', { name: /satz \d/i })).toHaveLength(5);
  });

  it('all sets start as done', () => {
    openWithRoutine();
    expect(screen.getAllByRole('button', { name: /erledigt/i })).toHaveLength(5);
  });

  it('renders +/− buttons', () => {
    openWithRoutine();
    expect(screen.getAllByRole('button', { name: 'Satz hinzufügen' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Satz entfernen' })).toHaveLength(2);
  });
});

describe('JournalView – Detail-Ansicht (AC-01 bis AC-05)', () => {
  it('entry is clickable and expands on click (AC-01)', () => {
    renderJournal([WORKOUT_WITH_DATA]);
    const entry = screen.getByText('Push Day').closest('.journal-entry');
    fireEvent.click(entry);
    expect(screen.getByText('Bankdrücken')).toBeInTheDocument();
  });

  it('collapses when clicked again (AC-01)', () => {
    renderJournal([WORKOUT_WITH_DATA]);
    const entry = screen.getByText('Push Day').closest('.journal-entry');
    fireEvent.click(entry);
    expect(screen.getByText('Bankdrücken')).toBeInTheDocument();
    fireEvent.click(entry);
    expect(screen.queryByText('Bankdrücken')).not.toBeInTheDocument();
  });

  it('shows exercise names in detail (AC-02)', () => {
    renderJournal([WORKOUT_WITH_DATA]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    expect(screen.getByText('Bankdrücken')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument();
  });

  it('shows completed set badges (✓) in detail (AC-02)', () => {
    renderJournal([WORKOUT_WITH_DATA]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    // Bankdrücken: [true,true,false] → 2 ✓, 1 ×; Plank: [true,true] → 2 ✓
    const done = screen.getAllByLabelText(/erledigt/i);
    expect(done.length).toBeGreaterThanOrEqual(4);
  });

  it('shows not-done set badges (×) in detail', () => {
    renderJournal([WORKOUT_WITH_DATA]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    expect(screen.getByLabelText(/satz 3, nicht erledigt/i)).toBeInTheDocument();
  });

  it('shows weight metric in detail (AC-02)', () => {
    renderJournal([WORKOUT_WITH_DATA]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    expect(screen.getByText('80 kg')).toBeInTheDocument();
  });

  it('shows actualReps metric in detail (AC-02)', () => {
    renderJournal([WORKOUT_WITH_DATA]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    expect(screen.getByText('8 Wdh.')).toBeInTheDocument();
  });

  it('shows actualDuration metric in detail (AC-02)', () => {
    renderJournal([WORKOUT_WITH_DATA]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    expect(screen.getByText('60 Sek.')).toBeInTheDocument();
  });

  it('shows per-exercise rating emoji in detail (AC-02)', () => {
    renderJournal([WORKOUT_WITH_DATA]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    expect(screen.getByLabelText('Bewertung: 😊')).toBeInTheDocument();
    expect(screen.getByLabelText('Bewertung: 😢')).toBeInTheDocument();
  });

  it('shows notes in detail (AC-03)', () => {
    renderJournal([WORKOUT_WITH_DATA]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    expect(screen.getByText('Tolles Training')).toBeInTheDocument();
  });

  it('shows empty hint when no exerciseData (AC-04)', () => {
    renderJournal([WORKOUT_AUTO]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    expect(screen.getByText(/keine übungsdetails erfasst/i)).toBeInTheDocument();
  });

  it('shows empty hint for invalid exerciseData (EC-02)', () => {
    const w = { ...WORKOUT_AUTO, exerciseData: '{invalid' };
    renderJournal([w]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    expect(screen.getByText(/keine übungsdetails erfasst/i)).toBeInTheDocument();
  });

  it('shows empty hint for empty array exerciseData (EC-03)', () => {
    const w = { ...WORKOUT_AUTO, exerciseData: '[]' };
    renderJournal([w]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    expect(screen.getByText(/keine übungsdetails erfasst/i)).toBeInTheDocument();
  });

  it('shows notes even without exercise data (EC-04)', () => {
    renderJournal([WORKOUT_MANUAL]);
    fireEvent.click(screen.getByText('Laufen').closest('.journal-entry'));
    expect(screen.getByText('Schöner Abendlauf')).toBeInTheDocument();
  });

  it('only one entry expanded at a time (AC-05)', () => {
    renderJournal([WORKOUT_WITH_DATA, WORKOUT_MANUAL]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    expect(screen.getByText('Bankdrücken')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Laufen').closest('.journal-entry'));
    expect(screen.queryByText('Bankdrücken')).not.toBeInTheDocument();
    expect(screen.getByText('Schöner Abendlauf')).toBeInTheDocument();
  });

  it('delete button does not trigger expand', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderJournal([WORKOUT_WITH_DATA]);
    fireEvent.click(screen.getByLabelText('Eintrag löschen'));
    expect(screen.queryByText('Bankdrücken')).not.toBeInTheDocument();
  });

  it('expanded entry gets --expanded CSS class', () => {
    renderJournal([WORKOUT_WITH_DATA]);
    const entry = screen.getByText('Push Day').closest('.journal-entry');
    fireEvent.click(entry);
    expect(entry.className).toContain('journal-entry--expanded');
  });
});

describe('JournalView – Bewertungs-Badge', () => {
  it('shows 😊 badge when avg rating >= 1.5', () => {
    const w = { ...WORKOUT_AUTO, exerciseData: JSON.stringify([{ rating: 2 }, { rating: 2 }]) };
    renderJournal([w]);
    expect(screen.getByLabelText(/bewertung: 😊/i)).toBeInTheDocument();
  });

  it('shows 😐 badge when avg rating between 0.5 and 1.5', () => {
    const w = { ...WORKOUT_AUTO, exerciseData: JSON.stringify([{ rating: 0 }, { rating: 2 }]) };
    renderJournal([w]);
    expect(screen.getByLabelText(/bewertung: 😐/i)).toBeInTheDocument();
  });

  it('shows 😢 badge when avg rating < 0.5', () => {
    const w = { ...WORKOUT_AUTO, exerciseData: JSON.stringify([{ rating: 0 }, { rating: 0 }]) };
    renderJournal([w]);
    expect(screen.getByLabelText(/bewertung: 😢/i)).toBeInTheDocument();
  });

  it('does not show rating badge when exerciseData is empty', () => {
    renderJournal([WORKOUT_AUTO]);
    expect(screen.queryByLabelText(/bewertung/i)).not.toBeInTheDocument();
  });
});

describe('JournalView – Löschen', () => {
  it('calls deleteWorkout after confirm', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { deleteWorkout } = renderJournal([WORKOUT_AUTO]);
    fireEvent.click(screen.getByLabelText('Eintrag löschen'));
    expect(deleteWorkout).toHaveBeenCalledWith('w-1');
  });

  it('does not call deleteWorkout when confirm is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { deleteWorkout } = renderJournal([WORKOUT_AUTO]);
    fireEvent.click(screen.getByLabelText('Eintrag löschen'));
    expect(deleteWorkout).not.toHaveBeenCalled();
  });
});

describe('JournalView – Bearbeiten (AC-01 bis AC-05)', () => {
  it('Bearbeiten-Button nicht sichtbar wenn Eintrag eingeklappt (AC-01)', () => {
    renderJournal([WORKOUT_AUTO]);
    expect(screen.queryByLabelText('Eintrag bearbeiten')).not.toBeInTheDocument();
  });

  it('Bearbeiten-Button erscheint wenn Eintrag aufgeklappt (AC-01)', () => {
    renderJournal([WORKOUT_AUTO]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    expect(screen.getByLabelText('Eintrag bearbeiten')).toBeInTheDocument();
  });

  it('Bearbeiten-Button stopPropagation – klappt Eintrag nicht ein', () => {
    renderJournal([WORKOUT_AUTO]);
    const entry = screen.getByText('Push Day').closest('.journal-entry');
    fireEvent.click(entry);
    expect(entry.className).toContain('journal-entry--expanded');
    fireEvent.click(screen.getByLabelText('Eintrag bearbeiten'));
    // entry closes (handleEdit sets expandedId null) — form opens instead
    expect(screen.getByText('Training bearbeiten')).toBeInTheDocument();
  });

  it('Klick auf Bearbeiten öffnet Formular (AC-02)', () => {
    renderJournal([WORKOUT_AUTO]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    fireEvent.click(screen.getByLabelText('Eintrag bearbeiten'));
    expect(screen.getByLabelText(/datum/i)).toBeInTheDocument();
  });

  it('Formular zeigt "Training bearbeiten" Banner (AC-03)', () => {
    renderJournal([WORKOUT_AUTO]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    fireEvent.click(screen.getByLabelText('Eintrag bearbeiten'));
    expect(screen.getByText('Training bearbeiten')).toBeInTheDocument();
  });

  it('Formular ist vorausgefüllt mit Datum (AC-02)', () => {
    renderJournal([WORKOUT_AUTO]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    fireEvent.click(screen.getByLabelText('Eintrag bearbeiten'));
    const dateInput = screen.getByLabelText(/datum/i);
    expect(dateInput.value).toBe('2026-06-12');
  });

  it('Formular ist vorausgefüllt mit Dauer (AC-02)', () => {
    renderJournal([WORKOUT_AUTO]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    fireEvent.click(screen.getByLabelText('Eintrag bearbeiten'));
    const durationInput = screen.getByLabelText('Dauer (Min.)');
    expect(durationInput.value).toBe('45'); // 2700s / 60
  });

  it('Formular ist vorausgefüllt mit Notizen (AC-02)', () => {
    renderJournal([WORKOUT_WITH_DATA]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    fireEvent.click(screen.getByLabelText('Eintrag bearbeiten'));
    const notesInput = screen.getByLabelText(/notizen/i);
    expect(notesInput.value).toBe('Tolles Training');
  });

  it('Speichern ruft updateWorkout auf (AC-04)', async () => {
    const { updateWorkout } = renderJournal([WORKOUT_AUTO]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    fireEvent.click(screen.getByLabelText('Eintrag bearbeiten'));
    fireEvent.click(screen.getByRole('button', { name: /^speichern$/i }));
    await waitFor(() => expect(updateWorkout).toHaveBeenCalledTimes(1));
    expect(updateWorkout).toHaveBeenCalledWith('w-1', expect.objectContaining({ id: 'w-1' }));
  });

  it('Speichern ruft NICHT addWorkout auf (AC-04)', async () => {
    const { addWorkout, updateWorkout } = renderJournal([WORKOUT_AUTO]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    fireEvent.click(screen.getByLabelText('Eintrag bearbeiten'));
    fireEvent.click(screen.getByRole('button', { name: /^speichern$/i }));
    await waitFor(() => expect(updateWorkout).toHaveBeenCalledTimes(1));
    expect(addWorkout).not.toHaveBeenCalled();
  });

  it('Abbrechen schließt Formular ohne updateWorkout (AC-05)', () => {
    const { updateWorkout } = renderJournal([WORKOUT_AUTO]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    fireEvent.click(screen.getByLabelText('Eintrag bearbeiten'));
    fireEvent.click(screen.getByRole('button', { name: /abbrechen/i }));
    expect(screen.queryByText('Training bearbeiten')).not.toBeInTheDocument();
    expect(updateWorkout).not.toHaveBeenCalled();
  });

  it('+ Eintrag öffnet leeres Neu-Formular (kein Edit-Banner)', () => {
    renderJournal([WORKOUT_AUTO]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    fireEvent.click(screen.getByLabelText('Eintrag bearbeiten'));
    expect(screen.getByText('Training bearbeiten')).toBeInTheDocument();
    // "+ Eintrag" cancels edit and opens fresh form
    fireEvent.click(screen.getByRole('button', { name: /\+ eintrag/i }));
    expect(screen.queryByText('Training bearbeiten')).not.toBeInTheDocument();
  });

  it('deleted Routine → edit öffnet Formular mit routineId __free__ und gespeichertem Namen (EC-01)', () => {
    const workoutOrphan = {
      ...WORKOUT_AUTO,
      routineId: 'r-deleted',
      routineName: 'Alte Routine',
    };
    renderJournal([workoutOrphan]);
    fireEvent.click(screen.getByText('Alte Routine').closest('.journal-entry'));
    fireEvent.click(screen.getByLabelText('Eintrag bearbeiten'));
    // Name field visible (routineId falls back to __free__)
    const nameInput = screen.getByLabelText(/^name/i);
    expect(nameInput.value).toBe('Alte Routine');
  });
});

// ─────────────────────────────────────────────────────────────
// Garmin-Aktivitäten
// ─────────────────────────────────────────────────────────────

const GARMIN_ACTIVITY = {
  id: '99001',
  activityName: 'Morgenläuf',
  activityType: 'running',
  startTimeLocal: '2026-06-13 07:30:00',
  duration: 1800,
  distance: 5000,
  calories: 320,
  averageHR: 148,
};

describe('JournalView – Garmin Aktivitäten', () => {
  it('zeigt Garmin-Aktivität im Journal', () => {
    renderJournal([], { garminActivities: [GARMIN_ACTIVITY] });
    expect(screen.getByText('Morgenläuf')).toBeInTheDocument();
  });

  it('zeigt Aktivitätstyp-Badge für Garmin-Einträge', () => {
    renderJournal([], { garminActivities: [GARMIN_ACTIVITY] });
    expect(screen.getByText('Laufen')).toBeInTheDocument();
  });

  it('zeigt Distanz-Badge für Garmin-Einträge', () => {
    renderJournal([], { garminActivities: [GARMIN_ACTIVITY] });
    expect(screen.getByText('5.0 km')).toBeInTheDocument();
  });

  it('zeigt Dauer-Badge für Garmin-Einträge', () => {
    renderJournal([], { garminActivities: [GARMIN_ACTIVITY] });
    expect(screen.getByText('30 Min.')).toBeInTheDocument();
  });

  it('kein Löschen-Button für Garmin-Einträge', () => {
    renderJournal([], { garminActivities: [GARMIN_ACTIVITY] });
    expect(screen.queryByRole('button', { name: /eintrag löschen/i })).not.toBeInTheDocument();
  });

  it('kein Bearbeiten-Button für Garmin-Einträge (auch aufgeklappt)', () => {
    renderJournal([], { garminActivities: [GARMIN_ACTIVITY] });
    fireEvent.click(screen.getByText('Morgenläuf').closest('.journal-entry'));
    expect(screen.queryByRole('button', { name: /eintrag bearbeiten/i })).not.toBeInTheDocument();
  });

  it('zeigt Details (km, kcal, bpm) beim Aufklappen', () => {
    renderJournal([], { garminActivities: [GARMIN_ACTIVITY] });
    fireEvent.click(screen.getByText('Morgenläuf').closest('.journal-entry'));
    expect(screen.getAllByText('5.0 km').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('320 kcal')).toBeInTheDocument();
    expect(screen.getByText(/148 bpm/)).toBeInTheDocument();
  });

  it('kein Empty-State wenn nur Garmin-Aktivitäten vorhanden', () => {
    renderJournal([], { garminActivities: [GARMIN_ACTIVITY] });
    expect(screen.queryByText(/noch keine trainings/i)).not.toBeInTheDocument();
  });

  it('Garmin-Einträge werden chronologisch mit lokalen Workouts gemischt', () => {
    renderJournal([WORKOUT_MANUAL], { garminActivities: [GARMIN_ACTIVITY] });
    const entries = document.querySelectorAll('.journal-entry');
    // GARMIN_ACTIVITY: 2026-06-13, WORKOUT_MANUAL: 2026-06-10 → Garmin zuerst
    expect(entries[0]).toHaveTextContent('Morgenläuf');
    expect(entries[1]).toHaveTextContent('Laufen');
  });

  it('garminActivities ohne prop → kein Crash, Empty-State wenn keine lokalen Workouts', () => {
    renderJournal([]);
    expect(screen.getByText(/noch keine trainings/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────
// Datums-Gruppierung
// ─────────────────────────────────────────────────────────────

describe('JournalView – Datums-Gruppierung', () => {
  it('zeigt Group-Header für jeden Tag (AC-01)', () => {
    renderJournal([WORKOUT_AUTO, WORKOUT_MANUAL]);
    // WORKOUT_AUTO: 2026-06-12, WORKOUT_MANUAL: 2026-06-10 → 2 verschiedene Tage
    const headers = document.querySelectorAll('.journal-day__header');
    expect(headers).toHaveLength(2);
  });

  it('ein Eintrag an einem Tag → trotzdem ein Group-Header (AC-04)', () => {
    renderJournal([WORKOUT_AUTO]);
    const headers = document.querySelectorAll('.journal-day__header');
    expect(headers).toHaveLength(1);
  });

  it('zwei Einträge am selben Tag erscheinen unter einem Header (AC-02)', () => {
    const w1 = { ...WORKOUT_AUTO, id: 'same-1' };
    const w2 = { ...WORKOUT_WITH_DATA, id: 'same-2', startedAt: '2026-06-12T14:00:00.000Z' };
    renderJournal([w1, w2]);
    const headers = document.querySelectorAll('.journal-day__header');
    expect(headers).toHaveLength(1);
    // beide Einträge im selben .journal-day
    const day = document.querySelector('.journal-day');
    expect(day).toHaveTextContent('Push Day');
  });

  it('kein Group-Header bei Empty-State (AC-05)', () => {
    renderJournal([]);
    const headers = document.querySelectorAll('.journal-day__header');
    expect(headers).toHaveLength(0);
    expect(screen.getByText(/noch keine trainings/i)).toBeInTheDocument();
  });

  it('Garmin und lokale Einträge am selben Tag unter einem Header (AC-02)', () => {
    const garmin = { ...GARMIN_ACTIVITY, startTimeLocal: '2026-06-10 08:00:00' };
    renderJournal([WORKOUT_MANUAL], { garminActivities: [garmin] });
    // WORKOUT_MANUAL: 2026-06-10, garmin: 2026-06-10 → 1 gemeinsamer Header
    const headers = document.querySelectorAll('.journal-day__header');
    expect(headers).toHaveLength(1);
  });

  it('journal-entry__meta ist nicht mehr in der Karte (Datum liegt im Group-Header)', () => {
    renderJournal([WORKOUT_AUTO]);
    expect(document.querySelectorAll('.journal-entry__meta')).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Split View – Detail Panel
// ─────────────────────────────────────────────────────────────

describe('JournalView – Detail Panel (Split View)', () => {
  it('kein Panel wenn nichts ausgewählt', () => {
    renderJournal([WORKOUT_AUTO]);
    expect(document.querySelector('.journal-panel')).toBeNull();
  });

  it('Panel öffnet sich bei Klick auf Karte (AC-01)', () => {
    renderJournal([WORKOUT_WITH_DATA]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    expect(document.querySelector('.journal-panel')).not.toBeNull();
  });

  it('Panel zeigt Workout-Name (AC-01)', () => {
    renderJournal([WORKOUT_WITH_DATA]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    const panel = document.querySelector('.journal-panel');
    expect(panel).toHaveTextContent('Push Day');
  });

  it('Panel enthält Übungsdetails (JournalDetail) (AC-01)', () => {
    renderJournal([WORKOUT_WITH_DATA]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    expect(screen.getByText('Bankdrücken')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument();
  });

  it('Panel schließt bei zweitem Klick auf dieselbe Karte (AC-02)', () => {
    renderJournal([WORKOUT_WITH_DATA]);
    const entry = screen.getByText('Push Day').closest('.journal-entry');
    fireEvent.click(entry);
    expect(document.querySelector('.journal-panel')).not.toBeNull();
    fireEvent.click(entry);
    expect(document.querySelector('.journal-panel')).toBeNull();
  });

  it('Panel schließt über × Button (AC-02)', () => {
    renderJournal([WORKOUT_AUTO]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    fireEvent.click(screen.getByLabelText('Panel schließen'));
    expect(document.querySelector('.journal-panel')).toBeNull();
  });

  it('Klick auf andere Karte wechselt Panel-Inhalt (AC-03)', () => {
    renderJournal([WORKOUT_WITH_DATA, WORKOUT_MANUAL]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    expect(screen.getByText('Bankdrücken')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Laufen').closest('.journal-entry'));
    expect(screen.queryByText('Bankdrücken')).not.toBeInTheDocument();
    expect(screen.getByText('Schöner Abendlauf')).toBeInTheDocument();
  });

  it('journal-body--has-panel Klasse gesetzt wenn Panel offen', () => {
    renderJournal([WORKOUT_AUTO]);
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    expect(document.querySelector('.journal-body--has-panel')).not.toBeNull();
  });

  it('journal-body--has-panel Klasse fehlt wenn kein Panel', () => {
    renderJournal([WORKOUT_AUTO]);
    expect(document.querySelector('.journal-body--has-panel')).toBeNull();
  });

  it('Panel zeigt Garmin-Details (km, kcal, bpm) (AC-01)', () => {
    renderJournal([], { garminActivities: [GARMIN_ACTIVITY] });
    fireEvent.click(screen.getByText('Morgenläuf').closest('.journal-entry'));
    expect(screen.getByText('320 kcal')).toBeInTheDocument();
    expect(screen.getByText(/148 bpm/)).toBeInTheDocument();
  });

  it('Garmin-Panel ohne Bearbeiten-Button (AC-05)', () => {
    renderJournal([], { garminActivities: [GARMIN_ACTIVITY] });
    fireEvent.click(screen.getByText('Morgenläuf').closest('.journal-entry'));
    expect(document.querySelector('.journal-panel')).not.toBeNull();
    expect(screen.queryByLabelText('Eintrag bearbeiten')).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────
// FS-47 – Fehlermeldung bei fehlgeschlagenem Speichern
// ─────────────────────────────────────────────────────────────

describe('JournalView – Speicherfehler (FS-47)', () => {
  it('zeigt Fehlermeldung wenn addWorkout fehlschlägt (AC1/AC2)', async () => {
    const user = userEvent.setup();
    const addWorkout = vi.fn().mockRejectedValue(new Error('API 500'));
    render(
      <JournalView
        workouts={[]}
        addWorkout={addWorkout}
        updateWorkout={vi.fn()}
        deleteWorkout={vi.fn()}
        routines={ROUTINES}
      />
    );
    openForm();
    await user.type(screen.getByLabelText(/name \*/i), 'Yoga');
    fireEvent.click(screen.getByRole('button', { name: /^speichern$/i }));
    expect(await screen.findByText(/speichern fehlgeschlagen/i)).toBeInTheDocument();
  });

  it('Formular bleibt offen mit Eingaben wenn addWorkout fehlschlägt (AC2)', async () => {
    const user = userEvent.setup();
    const addWorkout = vi.fn().mockRejectedValue(new Error('Network error'));
    render(
      <JournalView
        workouts={[]}
        addWorkout={addWorkout}
        updateWorkout={vi.fn()}
        deleteWorkout={vi.fn()}
        routines={ROUTINES}
      />
    );
    openForm();
    await user.type(screen.getByLabelText(/name \*/i), 'Yoga');
    fireEvent.click(screen.getByRole('button', { name: /^speichern$/i }));
    await screen.findByText(/speichern fehlgeschlagen/i);
    expect(screen.getByLabelText(/name \*/i)).toHaveValue('Yoga');
  });

  it('zeigt Fehlermeldung wenn updateWorkout fehlschlägt (AC1)', async () => {
    const updateWorkout = vi.fn().mockRejectedValue(new Error('API 500'));
    render(
      <JournalView
        workouts={[WORKOUT_AUTO]}
        addWorkout={vi.fn()}
        updateWorkout={updateWorkout}
        deleteWorkout={vi.fn()}
        routines={ROUTINES}
      />
    );
    fireEvent.click(screen.getByText('Push Day').closest('.journal-entry'));
    fireEvent.click(screen.getByLabelText('Eintrag bearbeiten'));
    fireEvent.click(screen.getByRole('button', { name: /^speichern$/i }));
    expect(await screen.findByText(/speichern fehlgeschlagen/i)).toBeInTheDocument();
  });

  it('kein Fehler wenn Speichern gelingt (AC5)', async () => {
    renderJournal();
    openForm();
    fireEvent.change(screen.getByLabelText(/name \*/i), { target: { value: 'Yoga' } });
    fireEvent.click(screen.getByRole('button', { name: /^speichern$/i }));
    await waitFor(() => expect(screen.queryByLabelText(/datum/i)).not.toBeInTheDocument());
    expect(screen.queryByText(/speichern fehlgeschlagen/i)).not.toBeInTheDocument();
  });

  it('Fehler verschwindet bei erneutem Submit-Versuch der erfolgreich ist (AC3)', async () => {
    const user = userEvent.setup();
    const addWorkout = vi.fn()
      .mockRejectedValueOnce(new Error('API 500'))
      .mockResolvedValueOnce(undefined);
    render(
      <JournalView
        workouts={[]}
        addWorkout={addWorkout}
        updateWorkout={vi.fn()}
        deleteWorkout={vi.fn()}
        routines={ROUTINES}
      />
    );
    openForm();
    await user.type(screen.getByLabelText(/name \*/i), 'Yoga');
    fireEvent.click(screen.getByRole('button', { name: /^speichern$/i }));
    await screen.findByText(/speichern fehlgeschlagen/i);
    fireEvent.click(screen.getByRole('button', { name: /^speichern$/i }));
    await waitFor(() => expect(screen.queryByLabelText(/datum/i)).not.toBeInTheDocument());
    expect(screen.queryByText(/speichern fehlgeschlagen/i)).not.toBeInTheDocument();
  });

  it('Fehler verschwindet bei Abbrechen (AC4)', async () => {
    const user = userEvent.setup();
    const addWorkout = vi.fn().mockRejectedValue(new Error('API 500'));
    render(
      <JournalView
        workouts={[]}
        addWorkout={addWorkout}
        updateWorkout={vi.fn()}
        deleteWorkout={vi.fn()}
        routines={ROUTINES}
      />
    );
    openForm();
    await user.type(screen.getByLabelText(/name \*/i), 'Yoga');
    fireEvent.click(screen.getByRole('button', { name: /^speichern$/i }));
    await screen.findByText(/speichern fehlgeschlagen/i);
    fireEvent.click(screen.getByRole('button', { name: /abbrechen/i }));
    openForm();
    expect(screen.queryByText(/speichern fehlgeschlagen/i)).not.toBeInTheDocument();
  });

  it('Fehler verschwindet beim Öffnen eines neuen Eintrags (AC4)', async () => {
    const user = userEvent.setup();
    const addWorkout = vi.fn().mockRejectedValue(new Error('API 500'));
    render(
      <JournalView
        workouts={[WORKOUT_AUTO]}
        addWorkout={addWorkout}
        updateWorkout={vi.fn()}
        deleteWorkout={vi.fn()}
        routines={ROUTINES}
      />
    );
    openForm();
    await user.type(screen.getByLabelText(/name \*/i), 'Yoga');
    fireEvent.click(screen.getByRole('button', { name: /^speichern$/i }));
    await screen.findByText(/speichern fehlgeschlagen/i);
    fireEvent.click(screen.getByRole('button', { name: /\+ eintrag/i }));
    expect(screen.queryByText(/speichern fehlgeschlagen/i)).not.toBeInTheDocument();
  });

  it('Fehler verschwindet beim Wechsel zum Bearbeiten eines anderen Eintrags (AC4)', async () => {
    const user = userEvent.setup();
    const addWorkout = vi.fn().mockRejectedValue(new Error('API 500'));
    render(
      <JournalView
        workouts={[WORKOUT_AUTO]}
        addWorkout={addWorkout}
        updateWorkout={vi.fn()}
        deleteWorkout={vi.fn()}
        routines={ROUTINES}
      />
    );
    openForm();
    await user.type(screen.getByLabelText(/name \*/i), 'Yoga');
    fireEvent.click(screen.getByRole('button', { name: /^speichern$/i }));
    await screen.findByText(/speichern fehlgeschlagen/i);
    fireEvent.click(document.querySelector('.journal-entry'));
    fireEvent.click(screen.getByLabelText('Eintrag bearbeiten'));
    expect(screen.queryByText(/speichern fehlgeschlagen/i)).not.toBeInTheDocument();
  });
});
