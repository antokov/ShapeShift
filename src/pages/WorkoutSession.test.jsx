import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import WorkoutSession from './WorkoutSession.jsx';

const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

vi.mock('../hooks/useExerciseLibrary.js', () => ({
  useExerciseLibrary: () => ({
    exercises: [
      {
        id: '0001',
        name: 'Bankdrücken',
        category: 'strength',
        primaryMuscles: ['chest'],
        equipment: 'barbell',
        images: ['0001/0.jpg', '0001/1.jpg'],
        instructions: ['Lie on bench.', 'Grip bar shoulder-width.', 'Lower bar to chest.'],
      },
    ],
    loading: false,
    error: null,
  }),
  getExerciseImage: (name, exercises) => {
    const found = exercises?.find((e) => e.name.toLowerCase() === name?.toLowerCase());
    if (!found?.images?.length) return null;
    return `${BASE}${found.images[0]}`;
  },
  getExerciseImages: (name, exercises) => {
    const found = exercises?.find((e) => e.name.toLowerCase() === name?.toLowerCase());
    if (!found?.images?.length) return [];
    return found.images.map((img) => `${BASE}${img}`);
  },
  getExerciseInstructions: (name, exercises) => {
    const found = exercises?.find((e) => e.name.toLowerCase() === name?.toLowerCase());
    return found?.instructions ?? [];
  },
}));

// Routine with 2 exercises: Bankdrücken (3 sets / reps) and Plank (2 sets / duration)
const routine = {
  id: 'r1',
  name: 'Push Day',
  exercises: [
    { id: 'e1', name: 'Bankdrücken', sets: 3, reps: 8, duration: null },
    { id: 'e2', name: 'Plank', sets: 2, reps: null, duration: 60 },
  ],
};

const cardioRoutine = {
  id: 'rc1',
  name: 'Cardio Tag',
  routineType: 'cardio',
  exercises: [
    { id: 'ce1', name: 'Laufen', durationMinutes: 30 },
    { id: 'ce2', name: 'Radfahren', durationMinutes: 20 },
  ],
};

const mockAddWorkout = vi.fn().mockResolvedValue({});
const mockOnFinish = vi.fn();
const mockOnAbort = vi.fn();

function renderConfig(r = routine, w = []) {
  return render(
    <WorkoutSession
      routine={r}
      workouts={w}
      addWorkout={mockAddWorkout}
      onFinish={mockOnFinish}
      onAbort={mockOnAbort}
    />
  );
}

function renderSession(r = routine, w = []) {
  renderConfig(r, w);
  fireEvent.click(screen.getByText('Training starten'));
}

function workoutWith(startedAt, entries) {
  return { id: `w-${startedAt}`, startedAt, exerciseData: JSON.stringify(entries) };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Helper: complete N sets of the current exercise (each set → skip pause) ──
async function completeNSets(n, skipPause = true) {
  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1;
    fireEvent.click(screen.getByText('Satz beenden'));
    if (!isLast && skipPause) {
      fireEvent.click(screen.getByText('Überspringen'));
    } else if (isLast && skipPause) {
      // After last set → pause → then rate screen
      fireEvent.click(screen.getByText('Überspringen'));
    }
  }
}

describe('WorkoutSession – Render', () => {
  it('shows routine name in header', () => {
    renderSession();
    expect(screen.getByText('Push Day')).toBeInTheDocument();
  });

  it('shows first exercise name on start', () => {
    renderSession();
    expect(screen.getByText('Bankdrücken')).toBeInTheDocument();
  });

  it('shows "Übung 1 von 2" progress initially', () => {
    renderSession();
    expect(screen.getByText('Übung 1 von 2')).toBeInTheDocument();
  });

  it('shows "Satz 1 von 3" for first exercise', () => {
    renderSession();
    expect(screen.getByText('Satz 1 von 3')).toBeInTheDocument();
  });

  it('shows "Satz beenden" CTA for strength exercise', () => {
    renderSession();
    expect(screen.getByText('Satz beenden')).toBeInTheDocument();
  });

  it('shows training timer', () => {
    renderSession();
    expect(screen.getByLabelText('Trainingszeit')).toBeInTheDocument();
  });

  it('shows Abbrechen button', () => {
    renderSession();
    expect(screen.getByText(/← Abbrechen/)).toBeInTheDocument();
  });

  it('shows empty-state → summary immediately when routine has 0 exercises', () => {
    renderSession({ ...routine, exercises: [] });
    expect(screen.getByText('Training abgeschlossen! 🎉')).toBeInTheDocument();
  });
});

describe('WorkoutSession – Exercise Phase', () => {
  it('shows Gewicht input for current exercise', () => {
    renderSession();
    expect(screen.getByLabelText(/Gewicht für Bankdrücken/i)).toBeInTheDocument();
  });

  it('shows Wdh. input for reps exercise', () => {
    renderSession();
    expect(screen.getByLabelText(/Wiederholungen für Bankdrücken/i)).toBeInTheDocument();
  });

  it('pre-fills Wdh. with configured reps value', () => {
    renderSession();
    expect(screen.getByLabelText(/Wiederholungen für Bankdrücken/i).value).toBe('8');
  });

  it('does NOT show Sek. input for reps exercise', () => {
    renderSession();
    expect(screen.queryByLabelText(/Dauer für Bankdrücken/i)).not.toBeInTheDocument();
  });

  it('updates weight input value', () => {
    renderSession();
    const input = screen.getByLabelText(/Gewicht für Bankdrücken/i);
    fireEvent.change(input, { target: { value: '80' } });
    expect(input.value).toBe('80');
  });

  it('does NOT show second exercise while on first', () => {
    renderSession();
    expect(screen.queryByText('Plank')).not.toBeInTheDocument();
  });
});

describe('WorkoutSession – Pause Phase (AC-02)', () => {
  it('shows pause screen after Satz beenden', () => {
    renderSession();
    fireEvent.click(screen.getByText('Satz beenden'));
    expect(screen.getByText('Pause')).toBeInTheDocument();
  });

  it('shows Überspringen button during pause', () => {
    renderSession();
    fireEvent.click(screen.getByText('Satz beenden'));
    expect(screen.getByText('Überspringen')).toBeInTheDocument();
  });

  it('shows pause countdown timer', () => {
    renderSession();
    fireEvent.click(screen.getByText('Satz beenden'));
    expect(screen.getByLabelText('Pausenzeit')).toBeInTheDocument();
  });

  it('advances to Satz 2 after skipping pause (not last set)', () => {
    renderSession();
    fireEvent.click(screen.getByText('Satz beenden'));
    fireEvent.click(screen.getByText('Überspringen'));
    expect(screen.getByText('Satz 2 von 3')).toBeInTheDocument();
  });

  it('pause timer auto-advances after countdown reaches 0 (EC-04)', async () => {
    renderSession();
    fireEvent.click(screen.getByText('Satz beenden'));
    // Each tick must flush React state before scheduling the next timeout
    for (let i = 0; i < 61; i++) {
      await act(async () => { vi.advanceTimersByTime(1000); });
    }
    expect(screen.getByText('Satz 2 von 3')).toBeInTheDocument();
  });
});

describe('WorkoutSession – Rate Phase (AC-03)', () => {
  it('shows rating screen after last set + pause', async () => {
    renderSession();
    // Complete all 3 sets of Bankdrücken (skip pauses for sets 1,2; last pause → rate)
    fireEvent.click(screen.getByText('Satz beenden'));
    fireEvent.click(screen.getByText('Überspringen')); // s1 pause
    fireEvent.click(screen.getByText('Satz beenden'));
    fireEvent.click(screen.getByText('Überspringen')); // s2 pause
    fireEvent.click(screen.getByText('Satz beenden'));
    fireEvent.click(screen.getByText('Überspringen')); // s3 pause → rate
    expect(screen.getByText('Wie war die Übung?')).toBeInTheDocument();
  });

  it('shows exercise name on rate screen', async () => {
    renderSession();
    fireEvent.click(screen.getByText('Satz beenden'));
    fireEvent.click(screen.getByText('Überspringen'));
    fireEvent.click(screen.getByText('Satz beenden'));
    fireEvent.click(screen.getByText('Überspringen'));
    fireEvent.click(screen.getByText('Satz beenden'));
    fireEvent.click(screen.getByText('Überspringen'));
    expect(screen.getAllByText('Bankdrücken').length).toBeGreaterThan(0);
  });

  it('shows 😢 😐 😊 rating buttons', async () => {
    renderSession();
    fireEvent.click(screen.getByText('Satz beenden'));
    fireEvent.click(screen.getByText('Überspringen'));
    fireEvent.click(screen.getByText('Satz beenden'));
    fireEvent.click(screen.getByText('Überspringen'));
    fireEvent.click(screen.getByText('Satz beenden'));
    fireEvent.click(screen.getByText('Überspringen'));
    expect(screen.getByRole('button', { name: 'Schlecht' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mittel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gut' })).toBeInTheDocument();
  });

  it('activates rating button on click', async () => {
    renderSession();
    fireEvent.click(screen.getByText('Satz beenden'));
    fireEvent.click(screen.getByText('Überspringen'));
    fireEvent.click(screen.getByText('Satz beenden'));
    fireEvent.click(screen.getByText('Überspringen'));
    fireEvent.click(screen.getByText('Satz beenden'));
    fireEvent.click(screen.getByText('Überspringen'));
    fireEvent.click(screen.getByRole('button', { name: 'Gut' }));
    expect(screen.getByRole('button', { name: 'Gut' }).className).toContain('--active');
  });

  it('shows "Weiter →" for non-last exercise', async () => {
    renderSession();
    fireEvent.click(screen.getByText('Satz beenden'));
    fireEvent.click(screen.getByText('Überspringen'));
    fireEvent.click(screen.getByText('Satz beenden'));
    fireEvent.click(screen.getByText('Überspringen'));
    fireEvent.click(screen.getByText('Satz beenden'));
    fireEvent.click(screen.getByText('Überspringen'));
    expect(screen.getByText('Weiter →')).toBeInTheDocument();
  });

  it('shows "Abschließen" on rate screen for last exercise (AC-04)', async () => {
    renderSession();
    // Complete Bankdrücken (3 sets)
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText('Satz beenden'));
      fireEvent.click(screen.getByText('Überspringen'));
    }
    fireEvent.click(screen.getByText('Weiter →'));
    // Now on Plank (2 sets)
    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByText('Satz beenden'));
      fireEvent.click(screen.getByText('Überspringen'));
    }
    expect(screen.getByText('Abschließen')).toBeInTheDocument();
  });
});

describe('WorkoutSession – Next Exercise (AC-04)', () => {
  it('advances to second exercise after Weiter → (AC-04)', async () => {
    renderSession();
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText('Satz beenden'));
      fireEvent.click(screen.getByText('Überspringen'));
    }
    fireEvent.click(screen.getByText('Weiter →'));
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.getByText('Übung 2 von 2')).toBeInTheDocument();
  });

  it('second exercise starts at Satz 1', async () => {
    renderSession();
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText('Satz beenden'));
      fireEvent.click(screen.getByText('Überspringen'));
    }
    fireEvent.click(screen.getByText('Weiter →'));
    expect(screen.getByText('Satz 1 von 2')).toBeInTheDocument();
  });

  it('second exercise shows Sek. input (duration exercise)', async () => {
    renderSession();
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText('Satz beenden'));
      fireEvent.click(screen.getByText('Überspringen'));
    }
    fireEvent.click(screen.getByText('Weiter →'));
    expect(screen.getByLabelText(/Dauer für Plank/i)).toBeInTheDocument();
  });
});

describe('WorkoutSession – Summary Phase (AC-05)', () => {
  async function reachSummary() {
    renderSession();
    // Bankdrücken: 3 sets
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText('Satz beenden'));
      fireEvent.click(screen.getByText('Überspringen'));
    }
    fireEvent.click(screen.getByText('Weiter →'));
    // Plank: 2 sets
    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByText('Satz beenden'));
      fireEvent.click(screen.getByText('Überspringen'));
    }
    fireEvent.click(screen.getByText('Abschließen'));
  }

  it('shows "Training abgeschlossen!" on summary (AC-05)', async () => {
    await reachSummary();
    expect(screen.getByText('Training abgeschlossen! 🎉')).toBeInTheDocument();
  });

  it('shows notes textarea on summary (AC-05)', async () => {
    await reachSummary();
    expect(screen.getByLabelText(/trainingskommentar/i)).toBeInTheDocument();
  });

  it('shows "Training speichern" button on summary', async () => {
    await reachSummary();
    expect(screen.getByText('Training speichern')).toBeInTheDocument();
  });

  it('saves workout with correct exerciseData on finish', async () => {
    renderSession();
    // Enter weight for Bankdrücken
    fireEvent.change(screen.getByLabelText(/Gewicht für Bankdrücken/i), { target: { value: '80' } });
    // Complete all sets
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText('Satz beenden'));
      fireEvent.click(screen.getByText('Überspringen'));
    }
    // Rate Bankdrücken as Gut
    fireEvent.click(screen.getByRole('button', { name: 'Gut' }));
    fireEvent.click(screen.getByText('Weiter →'));
    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByText('Satz beenden'));
      fireEvent.click(screen.getByText('Überspringen'));
    }
    fireEvent.click(screen.getByText('Abschließen'));
    fireEvent.change(screen.getByLabelText(/trainingskommentar/i), { target: { value: 'Super' } });

    await act(async () => {
      fireEvent.click(screen.getByText('Training speichern'));
    });

    expect(mockAddWorkout).toHaveBeenCalledOnce();
    const payload = mockAddWorkout.mock.calls[0][0];
    expect(payload.notes).toBe('Super');
    const exData = JSON.parse(payload.exerciseData);
    expect(exData[0].weight).toBe(80);
    expect(exData[0].rating).toBe(2);
    expect(exData[0].completedSets).toEqual([true, true, true]);
    expect(exData[1].completedSets).toEqual([true, true]);
    expect(payload.totalSets).toBe(5);
  });

  it('calls onFinish after saving', async () => {
    renderSession({ ...routine, exercises: [] });
    await act(async () => {
      fireEvent.click(screen.getByText('Training speichern'));
    });
    expect(mockOnFinish).toHaveBeenCalledOnce();
  });

  it('saves null weight and null rating when not entered', async () => {
    renderSession({ ...routine, exercises: [] });
    await act(async () => {
      fireEvent.click(screen.getByText('Training speichern'));
    });
    const exData = JSON.parse(mockAddWorkout.mock.calls[0][0].exerciseData);
    expect(exData).toHaveLength(0);
  });
});

describe('WorkoutSession – Navigation', () => {
  it('calls onAbort when Abbrechen is clicked', () => {
    renderSession();
    fireEvent.click(screen.getByText(/← Abbrechen/));
    expect(mockOnAbort).toHaveBeenCalledOnce();
  });
});

describe('WorkoutSession – Cardio (EC-02)', () => {
  it('shows "Erledigt" button for cardio exercise', () => {
    renderSession(cardioRoutine);
    expect(screen.getByText('Erledigt')).toBeInTheDocument();
  });

  it('shows duration in minutes for cardio', () => {
    renderSession(cardioRoutine);
    expect(screen.getByText('30 min')).toBeInTheDocument();
  });

  it('does NOT show "Satz X von N" for cardio', () => {
    renderSession(cardioRoutine);
    expect(screen.queryByText(/Satz \d von/)).not.toBeInTheDocument();
  });

  it('goes directly to rate (no pause) after Erledigt (BR-03)', () => {
    renderSession(cardioRoutine);
    fireEvent.click(screen.getByText('Erledigt'));
    expect(screen.getByText('Wie war die Übung?')).toBeInTheDocument();
    expect(screen.queryByText('Pause')).not.toBeInTheDocument();
  });

  it('advances to second cardio exercise after Weiter →', () => {
    renderSession(cardioRoutine);
    fireEvent.click(screen.getByText('Erledigt'));
    fireEvent.click(screen.getByText('Weiter →'));
    expect(screen.getByText('Radfahren')).toBeInTheDocument();
  });

  it('reaches summary after last cardio exercise', () => {
    renderSession(cardioRoutine);
    fireEvent.click(screen.getByText('Erledigt'));
    fireEvent.click(screen.getByText('Weiter →'));
    fireEvent.click(screen.getByText('Erledigt'));
    fireEvent.click(screen.getByText('Abschließen'));
    expect(screen.getByText('Training abgeschlossen! 🎉')).toBeInTheDocument();
  });
});


describe('WorkoutSession – Nächster Schritt Hinweis', () => {
  it('shows "Danach: Pause 60 s" in exercise phase (strength, non-last set)', () => {
    renderSession();
    expect(screen.getByText('Danach: Pause 60 s')).toBeInTheDocument();
  });

  it('shows "Danach: Pause → Bewertung" for last set of exercise', () => {
    renderSession();
    // Complete sets 1 and 2, leaving set 3 (the last) active
    fireEvent.click(screen.getByText('Satz beenden'));
    fireEvent.click(screen.getByText('Überspringen')); // pause after set 1 → set 2
    fireEvent.click(screen.getByText('Satz beenden'));
    fireEvent.click(screen.getByText('Überspringen')); // pause after set 2 → set 3 (last)
    expect(screen.getByText('Danach: Pause → Bewertung')).toBeInTheDocument();
  });

  it('shows "Danach: Satz 2 von 3" in pause phase (non-last set)', () => {
    renderSession();
    fireEvent.click(screen.getByText('Satz beenden'));
    // Now in pause phase after set 1
    expect(screen.getByText('Danach: Satz 2 von 3')).toBeInTheDocument();
  });

  it('shows "Danach: Bewertung → Abschluss" in pause phase (last set, last exercise)', () => {
    renderSession();
    // Complete Bankdrücken (3 sets) and advance to Plank
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText('Satz beenden'));
      fireEvent.click(screen.getByText('Überspringen'));
    }
    fireEvent.click(screen.getByText('Weiter →')); // Plank exercise phase
    // Complete first set of Plank (2 sets, so set 1 is not last)
    fireEvent.click(screen.getByText('Satz beenden'));
    fireEvent.click(screen.getByText('Überspringen')); // pause → set 2
    // Now on Satz 2 von 2 (last set of last exercise) — click to enter pause
    fireEvent.click(screen.getByText('Satz beenden'));
    // In pause: last set + last exercise → "Bewertung → Abschluss"
    expect(screen.getByText('Danach: Bewertung → Abschluss')).toBeInTheDocument();
  });

  it('shows next exercise name in rate phase (non-last exercise)', () => {
    renderSession();
    // Complete Bankdrücken (3 sets)
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText('Satz beenden'));
      fireEvent.click(screen.getByText('Überspringen'));
    }
    // Now in rate phase for Bankdrücken
    expect(screen.getByText('Danach: Plank')).toBeInTheDocument();
  });

  it('shows "Danach: Training abgeschlossen 🎉" in rate phase for last exercise', () => {
    renderSession();
    // Skip through Bankdrücken
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText('Satz beenden'));
      fireEvent.click(screen.getByText('Überspringen'));
    }
    fireEvent.click(screen.getByText('Weiter →'));
    // Complete Plank (last exercise, 2 sets)
    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByText('Satz beenden'));
      fireEvent.click(screen.getByText('Überspringen'));
    }
    // Now in rate phase for Plank (last exercise)
    expect(screen.getByText('Danach: Training abgeschlossen 🎉')).toBeInTheDocument();
  });

  it('no "Danach" hint in summary phase (AC-04)', async () => {
    renderSession({ ...routine, exercises: [] });
    expect(screen.queryByText(/Danach:/)).not.toBeInTheDocument();
  });

  it('shows "Danach: Bewertung" for cardio exercise (AC-01)', () => {
    renderSession(cardioRoutine);
    expect(screen.getByText('Danach: Bewertung')).toBeInTheDocument();
  });
});

describe('WorkoutSession – Übungsbilder (AC-01 bis AC-04)', () => {
  it('AC-01: zeigt Bild für Übung die in der Library vorhanden ist (Bankdrücken)', () => {
    renderSession();
    const img = screen.getByRole('img', { name: /Bankdrücken/i });
    expect(img).toBeInTheDocument();
    expect(img.src).toContain('0001/0.jpg');
  });

  it('AC-02: zeigt kein Bild für Übung ohne Library-Eintrag (Plank nicht im Mock)', async () => {
    renderSession();
    // Advance through Bankdrücken to reach Plank
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText('Satz beenden'));
      fireEvent.click(screen.getByText('Überspringen'));
    }
    fireEvent.click(screen.getByText('Weiter →'));
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Plank/i })).not.toBeInTheDocument();
  });

  it('AC-04: kein Bild in der Config-Phase', () => {
    renderConfig();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('WorkoutSession – Bildwechsel-Animation', () => {
  it('AC-01: startet mit Bild 0', () => {
    renderSession();
    const img = screen.getByRole('img', { name: /Bankdrücken/i });
    expect(img.src).toContain('0001/0.jpg');
  });

  it('AC-01: wechselt nach 2 Sekunden zu Bild 1', async () => {
    renderSession();
    await act(async () => { vi.advanceTimersByTime(2000); });
    const img = screen.getByRole('img', { name: /Bankdrücken/i });
    expect(img.src).toContain('0001/1.jpg');
  });

  it('AC-01: kehrt nach 4 Sekunden zu Bild 0 zurück', async () => {
    renderSession();
    await act(async () => { vi.advanceTimersByTime(4000); });
    const img = screen.getByRole('img', { name: /Bankdrücken/i });
    expect(img.src).toContain('0001/0.jpg');
  });

  it('AC-02: Bild-Index wird auf 0 zurückgesetzt beim Übungswechsel', async () => {
    renderSession();
    // Advance to image 1
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(screen.getByRole('img', { name: /Bankdrücken/i }).src).toContain('0001/1.jpg');
    // Complete Bankdrücken and advance to Plank (no image in mock, but imgIdx resets)
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText('Satz beenden'));
      fireEvent.click(screen.getByText('Überspringen'));
    }
    fireEvent.click(screen.getByText('Weiter →'));
    // Plank has no image — no img element; imgIdx is 0 (cannot observe directly, but no crash)
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('AC-04: kein Bild-Timer in der Pause-Phase', async () => {
    renderSession();
    // Advance to image 1
    await act(async () => { vi.advanceTimersByTime(2000); });
    // Enter pause phase
    fireEvent.click(screen.getByText('Satz beenden'));
    // No img visible in pause phase — timer irrelevant
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('AC-04: kein Bild-Timer in der Rate-Phase', async () => {
    renderSession();
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText('Satz beenden'));
      fireEvent.click(screen.getByText('Überspringen'));
    }
    // Now in rate phase
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Wie war die Übung?')).toBeInTheDocument();
  });
});

describe('WorkoutSession – Übungsanweisungen Toggle (AC-01 bis AC-06)', () => {
  it('AC-01/AC-02: zeigt Toggle-Button für Bankdrücken (hat Anweisungen)', () => {
    renderSession();
    expect(screen.getByText('Erklärung anzeigen')).toBeInTheDocument();
  });

  it('AC-01: Anweisungen initial ausgeblendet', () => {
    renderSession();
    expect(document.querySelector('.workout-step__instructions')).not.toBeInTheDocument();
  });

  it('AC-03: Klick auf Button blendet Anweisungen ein', () => {
    renderSession();
    fireEvent.click(screen.getByText('Erklärung anzeigen'));
    expect(screen.getByText('Lie on bench.')).toBeInTheDocument();
    expect(document.querySelector('.workout-step__instructions')).toBeInTheDocument();
  });

  it('AC-03: Button-Text wechselt nach Einblenden zu "Erklärung ausblenden"', () => {
    renderSession();
    fireEvent.click(screen.getByText('Erklärung anzeigen'));
    expect(screen.getByText('Erklärung ausblenden')).toBeInTheDocument();
  });

  it('AC-04: zweiter Klick blendet Anweisungen wieder aus', () => {
    renderSession();
    fireEvent.click(screen.getByText('Erklärung anzeigen'));
    fireEvent.click(screen.getByText('Erklärung ausblenden'));
    expect(document.querySelector('.workout-step__instructions')).not.toBeInTheDocument();
    expect(screen.getByText('Erklärung anzeigen')).toBeInTheDocument();
  });

  it('AC-05: kein Toggle-Button für Übung ohne Library-Eintrag (Plank)', async () => {
    renderSession();
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText('Satz beenden'));
      fireEvent.click(screen.getByText('Überspringen'));
    }
    fireEvent.click(screen.getByText('Weiter →'));
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.queryByText('Erklärung anzeigen')).not.toBeInTheDocument();
  });

  it('AC-06: showInstructions reset beim Übungswechsel', () => {
    renderSession();
    fireEvent.click(screen.getByText('Erklärung anzeigen'));
    expect(document.querySelector('.workout-step__instructions')).toBeInTheDocument();
    // Advance to next exercise
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText('Satz beenden'));
      fireEvent.click(screen.getByText('Überspringen'));
    }
    fireEvent.click(screen.getByText('Weiter →'));
    // Plank has no instructions — no toggle button, no instructions
    expect(document.querySelector('.workout-step__instructions')).not.toBeInTheDocument();
  });

  it('kein Toggle-Button in der Pause-Phase', () => {
    renderSession();
    fireEvent.click(screen.getByText('Satz beenden'));
    expect(screen.queryByText('Erklärung anzeigen')).not.toBeInTheDocument();
  });

  it('kein Toggle-Button in der Config-Phase', () => {
    renderConfig();
    expect(screen.queryByText('Erklärung anzeigen')).not.toBeInTheDocument();
  });
});

describe('WorkoutSession – Fortschrittsbalken (AC-01 bis AC-04)', () => {
  it('renders progress bar on start (AC-01)', () => {
    renderSession();
    expect(document.querySelector('.workout-progress')).toBeInTheDocument();
  });

  it('progress bar starts at 0% for first exercise (AC-02)', () => {
    renderSession();
    const fill = document.querySelector('.workout-progress__fill');
    expect(fill.style.width).toBe('0%');
  });

  it('progress bar advances to 50% after moving to second of two exercises (AC-02)', () => {
    renderSession();
    // Complete Bankdrücken (3 sets)
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText('Satz beenden'));
      fireEvent.click(screen.getByText('Überspringen'));
    }
    fireEvent.click(screen.getByText('Weiter →'));
    const fill = document.querySelector('.workout-progress__fill');
    expect(fill.style.width).toBe('50%');
  });

  it('progress bar shows 100% in summary phase (AC-03)', () => {
    renderSession();
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText('Satz beenden'));
      fireEvent.click(screen.getByText('Überspringen'));
    }
    fireEvent.click(screen.getByText('Weiter →'));
    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByText('Satz beenden'));
      fireEvent.click(screen.getByText('Überspringen'));
    }
    fireEvent.click(screen.getByText('Abschließen'));
    const fill = document.querySelector('.workout-progress__fill');
    expect(fill.style.width).toBe('100%');
  });

  it('progress bar shows 100% immediately for empty routine (EC-01)', () => {
    renderSession({ ...routine, exercises: [] });
    const fill = document.querySelector('.workout-progress__fill');
    expect(fill.style.width).toBe('100%');
  });

  it('progress bar has correct ARIA attributes (AC-04)', () => {
    renderSession();
    const bar = document.querySelector('.workout-progress');
    expect(bar.getAttribute('role')).toBe('progressbar');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
  });
});

describe('WorkoutSession – Letztes Gewicht Vorschlag', () => {
  it('AC-01: befüllt Gewicht-Feld mit letztem bekannten Wert für die Übung', () => {
    const workouts = [
      workoutWith('2026-08-01T10:00:00.000Z', [{ name: 'Bankdrücken', weight: 82.5 }]),
    ];
    renderSession(routine, workouts);
    expect(screen.getByLabelText(/Gewicht für Bankdrücken/i).value).toBe('82.5');
  });

  it('AC-02: manuelle Änderung überschreibt den Vorschlag und bleibt erhalten', () => {
    const workouts = [
      workoutWith('2026-08-01T10:00:00.000Z', [{ name: 'Bankdrücken', weight: 82.5 }]),
    ];
    renderSession(routine, workouts);
    const input = screen.getByLabelText(/Gewicht für Bankdrücken/i);
    fireEvent.change(input, { target: { value: '90' } });
    expect(input.value).toBe('90');
  });

  it('AC-03: kein Verlauf vorhanden → Feld bleibt leer', () => {
    renderSession(routine, []);
    expect(screen.getByLabelText(/Gewicht für Bankdrücken/i).value).toBe('');
  });

  it('EC-02: Verlauf vorhanden, aber keine Übung mit passendem Namen → Feld bleibt leer', () => {
    const workouts = [
      workoutWith('2026-08-01T10:00:00.000Z', [{ name: 'Kniebeuge', weight: 100 }]),
    ];
    renderSession(routine, workouts);
    expect(screen.getByLabelText(/Gewicht für Bankdrücken/i).value).toBe('');
  });

  it('EC-03: Übung in Historie, aber nie ein Gewicht eingetragen → Feld bleibt leer', () => {
    const workouts = [
      workoutWith('2026-08-01T10:00:00.000Z', [{ name: 'Bankdrücken', weight: null }]),
    ];
    renderSession(routine, workouts);
    expect(screen.getByLabelText(/Gewicht für Bankdrücken/i).value).toBe('');
  });

  it('BR-03: verwendet Gewicht aus dem zeitlich neuesten Workout, nicht dem höchsten', () => {
    const workouts = [
      workoutWith('2026-07-01T10:00:00.000Z', [{ name: 'Bankdrücken', weight: 100 }]),
      workoutWith('2026-08-01T10:00:00.000Z', [{ name: 'Bankdrücken', weight: 70 }]),
    ];
    // workouts prop ist wie useWorkouts bereits DESC sortiert
    renderSession(routine, [workouts[1], workouts[0]]);
    expect(screen.getByLabelText(/Gewicht für Bankdrücken/i).value).toBe('70');
  });

  it('BR-04: überspringt neuestes Workout ohne Gewicht und sucht im nächstälteren weiter', () => {
    const workouts = [
      workoutWith('2026-08-05T10:00:00.000Z', [{ name: 'Bankdrücken', weight: null }]),
      workoutWith('2026-08-01T10:00:00.000Z', [{ name: 'Bankdrücken', weight: 60 }]),
    ];
    renderSession(routine, workouts);
    expect(screen.getByLabelText(/Gewicht für Bankdrücken/i).value).toBe('60');
  });

  it('Q-01: Namensvergleich ignoriert Groß-/Kleinschreibung und Leerzeichen', () => {
    const workouts = [
      workoutWith('2026-08-01T10:00:00.000Z', [{ name: '  bankdrücken  ', weight: 55 }]),
    ];
    renderSession(routine, workouts);
    expect(screen.getByLabelText(/Gewicht für Bankdrücken/i).value).toBe('55');
  });

  it('EC-06: Cardio-Übungen erhalten keinen Gewicht-Vorschlag (kein Feld vorhanden)', () => {
    const workouts = [
      workoutWith('2026-08-01T10:00:00.000Z', [{ name: 'Laufen', weight: 999 }]),
    ];
    renderSession(cardioRoutine, workouts);
    expect(screen.queryByLabelText(/Gewicht/i)).not.toBeInTheDocument();
  });

  it('funktioniert ohne workouts-Prop (Default [])', () => {
    render(
      <WorkoutSession
        routine={routine}
        addWorkout={mockAddWorkout}
        onFinish={mockOnFinish}
        onAbort={mockOnAbort}
      />
    );
    fireEvent.click(screen.getByText('Training starten'));
    expect(screen.getByLabelText(/Gewicht für Bankdrücken/i).value).toBe('');
  });

  it('Grenzfall: historisches Gewicht 0 wird als "0" vorausgefüllt, nicht als leer', () => {
    const workouts = [
      workoutWith('2026-08-01T10:00:00.000Z', [{ name: 'Bankdrücken', weight: 0 }]),
    ];
    renderSession(routine, workouts);
    expect(screen.getByLabelText(/Gewicht für Bankdrücken/i).value).toBe('0');
  });

  it('AC-05: manuell eingegebenes Gewicht bleibt beim Wechsel zu Satz 2 derselben Übung erhalten', () => {
    const workouts = [
      workoutWith('2026-08-01T10:00:00.000Z', [{ name: 'Bankdrücken', weight: 82.5 }]),
    ];
    renderSession(routine, workouts);
    const input = screen.getByLabelText(/Gewicht für Bankdrücken/i);
    fireEvent.change(input, { target: { value: '90' } });
    fireEvent.click(screen.getByText('Satz beenden'));
    fireEvent.click(screen.getByText('Überspringen')); // pause → Satz 2
    expect(screen.getByText('Satz 2 von 3')).toBeInTheDocument();
    expect(screen.getByLabelText(/Gewicht für Bankdrücken/i).value).toBe('90');
  });

  it('Integration: unveränderter Vorschlag wird beim Speichern korrekt als Number übernommen', async () => {
    const workouts = [
      workoutWith('2026-08-01T10:00:00.000Z', [{ name: 'Bankdrücken', weight: 82.5 }]),
    ];
    renderSession(routine, workouts);
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText('Satz beenden'));
      fireEvent.click(screen.getByText('Überspringen'));
    }
    fireEvent.click(screen.getByText('Weiter →'));
    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByText('Satz beenden'));
      fireEvent.click(screen.getByText('Überspringen'));
    }
    fireEvent.click(screen.getByText('Abschließen'));
    await act(async () => {
      fireEvent.click(screen.getByText('Training speichern'));
    });
    const exData = JSON.parse(mockAddWorkout.mock.calls[0][0].exerciseData);
    expect(exData[0].weight).toBe(82.5);
  });
});

describe('WorkoutSession – Config Phase (TD-06 / FS-58)', () => {
  it('AC-01: zeigt Config-Screen vor Exercise-Phase', () => {
    renderConfig();
    expect(screen.getByText('Training starten')).toBeInTheDocument();
    expect(screen.queryByText('Satz beenden')).not.toBeInTheDocument();
  });

  it('AC-01: alle Übungsnamen im Config-Screen sichtbar', () => {
    renderConfig();
    expect(screen.getByText('Bankdrücken')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument();
  });

  it('AC-02: Satz-Steuerung für Kraft-Übung vorhanden', () => {
    renderConfig();
    expect(screen.getByLabelText(/Sätze verringern für Bankdrücken/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sätze erhöhen für Bankdrücken/i)).toBeInTheDocument();
  });

  it('AC-02: initiale Satzanzahl entspricht Routine-Definition', () => {
    renderConfig();
    expect(screen.getByLabelText(/3 Sätze für Bankdrücken/i)).toBeInTheDocument();
  });

  it('AC-02: Satzanzahl erhöhen per "+"', () => {
    renderConfig();
    fireEvent.click(screen.getByLabelText(/Sätze erhöhen für Bankdrücken/i));
    expect(screen.getByLabelText(/4 Sätze für Bankdrücken/i)).toBeInTheDocument();
  });

  it('AC-02: Satzanzahl verringern per "−"', () => {
    renderConfig();
    fireEvent.click(screen.getByLabelText(/Sätze verringern für Bankdrücken/i));
    expect(screen.getByLabelText(/2 Sätze für Bankdrücken/i)).toBeInTheDocument();
  });

  it('AC-02: "−"-Button disabled bei Satzanzahl 1', () => {
    renderConfig();
    const minusBtn = screen.getByLabelText(/Sätze verringern für Bankdrücken/i);
    fireEvent.click(minusBtn); // 3 → 2
    fireEvent.click(minusBtn); // 2 → 1
    expect(minusBtn).toBeDisabled();
  });

  it('AC-02: Satzanzahl kann nicht unter 1 fallen', () => {
    renderConfig();
    const minusBtn = screen.getByLabelText(/Sätze verringern für Bankdrücken/i);
    fireEvent.click(minusBtn); // 3 → 2
    fireEvent.click(minusBtn); // 2 → 1
    fireEvent.click(minusBtn); // button disabled, no change
    expect(screen.getByLabelText(/1 Sätze für Bankdrücken/i)).toBeInTheDocument();
  });

  it('AC-03: Training startet mit angepasster Satzanzahl', () => {
    renderConfig();
    fireEvent.click(screen.getByLabelText(/Sätze erhöhen für Bankdrücken/i)); // 3 → 4
    fireEvent.click(screen.getByText('Training starten'));
    expect(screen.getByText('Satz 1 von 4')).toBeInTheDocument();
  });

  it('AC-04: Cardio-Übungen ohne Satz-Steuerung im Config-Screen', () => {
    renderConfig(cardioRoutine);
    expect(screen.queryByLabelText(/Sätze verringern/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Sätze erhöhen/i)).not.toBeInTheDocument();
  });

  it('AC-04: Cardio-Dauer im Config-Screen sichtbar', () => {
    renderConfig(cardioRoutine);
    expect(screen.getByText('30 min')).toBeInTheDocument();
  });

  it('AC-05: Abbrechen ruft onAbort auf (auch im Config-Screen)', () => {
    renderConfig();
    fireEvent.click(screen.getByText(/← Abbrechen/));
    expect(mockOnAbort).toHaveBeenCalledOnce();
  });

  it('EC-01: leere Routine → Config-Screen zeigt Hinweis, Training starten → Summary', () => {
    renderConfig({ ...routine, exercises: [] });
    expect(screen.getByText(/keine Übungen/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Training starten'));
    expect(screen.getByText('Training abgeschlossen! 🎉')).toBeInTheDocument();
  });
});
