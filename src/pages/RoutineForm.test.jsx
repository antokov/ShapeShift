import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoutineForm from './RoutineForm.jsx';

vi.mock('../hooks/useExerciseLibrary.js', () => ({
  useExerciseLibrary: () => ({
    exercises: [
      { id: '0001', name: 'Bankdrücken (Langhantel)', category: 'strength', primaryMuscles: ['chest'], equipment: 'barbell' },
      { id: '0002', name: 'Plank', category: 'strength', primaryMuscles: ['abdominals'], equipment: 'body only' },
      { id: '0003', name: 'Laufen', category: 'cardio', primaryMuscles: ['cardiovascular system'], equipment: 'body only' },
    ],
    loading: false,
    error: null,
  }),
}));

const mockOnSave = vi.fn();
const mockOnCancel = vi.fn();

function renderForm(routine = null) {
  return render(
    <RoutineForm routine={routine} onSave={mockOnSave} onCancel={mockOnCancel} />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RoutineForm – validation', () => {
  it('shows name error when submitting empty name', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /speichern/i }));
    expect(await screen.findByText(/name ist erforderlich/i)).toBeInTheDocument();
  });

  it('shows exercise error when no exercises are present', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /✕/i }));
    fireEvent.click(screen.getByRole('button', { name: /speichern/i }));
    expect(await screen.findByText(/mindestens eine übung/i)).toBeInTheDocument();
  });

  it('calls onSave with correct data for reps exercise', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/name \*/i), 'Push Day');
    const exerciseInputs = screen.getAllByPlaceholderText(/kniebeuge/i);
    await user.type(exerciseInputs[0], 'Bankdrücken');

    const numberInputs = screen.getAllByRole('spinbutton');
    await user.clear(numberInputs[0]);
    await user.type(numberInputs[0], '3');
    await user.clear(numberInputs[1]);
    await user.type(numberInputs[1], '10');

    fireEvent.click(screen.getByRole('button', { name: /speichern/i }));
    expect(mockOnSave).toHaveBeenCalledOnce();
    const saved = mockOnSave.mock.calls[0][0];
    expect(saved.name).toBe('Push Day');
    expect(saved.exercises[0].sets).toBe(3);
    expect(saved.exercises[0].reps).toBe(10);
    expect(saved.exercises[0].duration).toBeNull();
  });

  it('calls onSave with duration when type is duration', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/name \*/i), 'Cardio');
    fireEvent.click(screen.getByText('Dauer'));

    const exerciseInputs = screen.getAllByPlaceholderText(/kniebeuge/i);
    await user.type(exerciseInputs[0], 'Plank');

    const numberInputs = screen.getAllByRole('spinbutton');
    await user.clear(numberInputs[0]);
    await user.type(numberInputs[0], '3');
    await user.clear(numberInputs[1]);
    await user.type(numberInputs[1], '60');

    fireEvent.click(screen.getByRole('button', { name: /speichern/i }));
    const saved = mockOnSave.mock.calls[0][0];
    expect(saved.exercises[0].duration).toBe(60);
    expect(saved.exercises[0].reps).toBeNull();
  });

  it('calls onCancel when back button is clicked', () => {
    renderForm();
    fireEvent.click(screen.getByText(/← zurück/i));
    expect(mockOnCancel).toHaveBeenCalledOnce();
  });
});

describe('RoutineForm – Übungsbibliothek', () => {
  it('zeigt "Bibliothek"-Button in jeder Übungszeile', () => {
    renderForm();
    expect(screen.getByRole('button', { name: /bibliothek/i })).toBeInTheDocument();
  });

  it('öffnet Picker mit Suchfeld beim Klick auf Bibliothek', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /bibliothek/i }));
    expect(screen.getByPlaceholderText('Suchen…')).toBeInTheDocument();
  });

  it('filtert Ergebnisse nach Suchbegriff', async () => {
    const user = userEvent.setup();
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /bibliothek/i }));
    await user.type(screen.getByPlaceholderText('Suchen…'), 'Plank');
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.queryByText('Bankdrücken (Langhantel)')).not.toBeInTheDocument();
  });

  it('zeigt "Keine Übungen gefunden" bei leerem Suchergebnis', async () => {
    const user = userEvent.setup();
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /bibliothek/i }));
    await user.type(screen.getByPlaceholderText('Suchen…'), 'xyzxyz');
    expect(screen.getByText('Keine Übungen gefunden.')).toBeInTheDocument();
  });

  it('übernimmt Übungsname und schließt Picker bei Klick', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /bibliothek/i }));
    fireEvent.click(screen.getByText('Bankdrücken (Langhantel)'));
    expect(screen.getByDisplayValue('Bankdrücken (Langhantel)')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Suchen…')).not.toBeInTheDocument();
  });

  it('schließt Picker beim Klick auf Backdrop', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /bibliothek/i }));
    expect(screen.getByPlaceholderText('Suchen…')).toBeInTheDocument();
    const backdrop = document.querySelector('.exercise-picker__backdrop');
    fireEvent.click(backdrop);
    expect(screen.queryByPlaceholderText('Suchen…')).not.toBeInTheDocument();
  });
});

describe('RoutineForm – Picker zeigt Equipment als Kurzinfo', () => {
  it('zeigt equipment unterhalb des Übungsnamens im Picker', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /bibliothek/i }));
    const descEl = document.querySelector('.exercise-picker__item-desc');
    expect(descEl).not.toBeNull();
    expect(descEl.textContent).toMatch(/barbell|body only/i);
  });

  it('Picker-Item hat item-name und item-desc spans', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /bibliothek/i }));
    expect(document.querySelector('.exercise-picker__item-name')).not.toBeNull();
    expect(document.querySelector('.exercise-picker__item-desc')).not.toBeNull();
  });
});

describe('RoutineForm – Cardio', () => {
  it('zeigt Kraft/Cardio-Toggle im Formular', () => {
    renderForm();
    expect(screen.getByRole('button', { name: /^kraft$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cardio$/i })).toBeInTheDocument();
  });

  it('wechselt in Cardio-Modus und zeigt Min.-Feld', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /^cardio$/i }));
    expect(screen.getByLabelText(/^min\./i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/sätze/i)).not.toBeInTheDocument();
  });

  it('speichert Cardio-Routine mit routineType und durationMinutes', async () => {
    const user = userEvent.setup();
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /^cardio$/i }));

    await user.type(screen.getByLabelText(/name \*/i), 'Cardio Tag');
    const inputs = screen.getAllByPlaceholderText(/laufen/i);
    await user.type(inputs[0], 'Laufen');
    const minInput = screen.getByLabelText(/^min\./i);
    await user.clear(minInput);
    await user.type(minInput, '30');

    fireEvent.click(screen.getByRole('button', { name: /speichern/i }));
    expect(mockOnSave).toHaveBeenCalledOnce();
    const saved = mockOnSave.mock.calls[0][0];
    expect(saved.routineType).toBe('cardio');
    expect(saved.exercises[0].durationMinutes).toBe(30);
    expect(saved.exercises[0].sets).toBeUndefined();
  });

  it('zeigt Validierungsfehler bei fehlendem durationMinutes', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /^cardio$/i }));

    await userEvent.setup().type(screen.getByLabelText(/name \*/i), 'Cardio');
    const inputs = screen.getAllByPlaceholderText(/laufen/i);
    fireEvent.change(inputs[0], { target: { value: 'Laufen' } });

    fireEvent.click(screen.getByRole('button', { name: /speichern/i }));
    expect(await screen.findByText(/≥ 1 min\./i)).toBeInTheDocument();
  });
});

describe('RoutineForm – edit mode', () => {
  const existing = {
    id: 'r1',
    name: 'Leg Day',
    description: 'Beine',
    exercises: [{ id: 'e1', name: 'Kniebeuge', sets: 4, reps: 8, duration: null }],
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('pre-fills name and description', () => {
    renderForm(existing);
    expect(screen.getByDisplayValue('Leg Day')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Beine')).toBeInTheDocument();
  });

  it('shows "Routine bearbeiten" title in edit mode', () => {
    renderForm(existing);
    expect(screen.getByText('Routine bearbeiten')).toBeInTheDocument();
  });
});
