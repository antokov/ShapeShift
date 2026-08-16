import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RoutineDetail from './RoutineDetail.jsx';

vi.mock('../hooks/useExerciseLibrary.js', () => ({
  useExerciseLibrary: () => ({
    exercises: [
      {
        id: '0001',
        name: 'Bankdrücken',
        images: ['0001/0.jpg'],
        instructions: ['Step 1 text.', 'Step 2 text.'],
      },
    ],
    loading: false,
    error: null,
  }),
  getExerciseImage: (name, exercises) => {
    const found = exercises?.find((e) => e.name.toLowerCase() === name?.toLowerCase());
    if (!found?.images?.length) return null;
    return `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${found.images[0]}`;
  },
  getExerciseInstructions: (name, exercises) => {
    const found = exercises?.find((e) => e.name.toLowerCase() === name?.toLowerCase());
    return found?.instructions ?? [];
  },
}));

const mockOnBack = vi.fn();
const mockOnEdit = vi.fn();

const routine = {
  id: 'r1',
  name: 'Push Day',
  description: 'Brust und Schultern',
  exercises: [
    { id: 'e1', name: 'Bankdrücken', sets: 4, reps: 8, duration: null },
    { id: 'e2', name: 'Schulterdrücken', sets: 3, reps: 10, duration: null },
    { id: 'e3', name: 'Plank', sets: 3, reps: null, duration: 60 },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderDetail(r = routine) {
  return render(<RoutineDetail routine={r} onBack={mockOnBack} onEdit={mockOnEdit} />);
}

beforeEach(() => vi.clearAllMocks());

describe('RoutineDetail – content', () => {
  it('renders routine name', () => {
    renderDetail();
    expect(screen.getByText('Push Day')).toBeInTheDocument();
  });

  it('renders description when present', () => {
    renderDetail();
    expect(screen.getByText('Brust und Schultern')).toBeInTheDocument();
  });

  it('does not render description element when absent', () => {
    renderDetail({ ...routine, description: '' });
    expect(screen.queryByText('Brust und Schultern')).not.toBeInTheDocument();
  });

  it('renders all exercises', () => {
    renderDetail();
    expect(screen.getByText('Bankdrücken')).toBeInTheDocument();
    expect(screen.getByText('Schulterdrücken')).toBeInTheDocument();
    expect(screen.getByText('Plank')).toBeInTheDocument();
  });

  it('renders reps exercise stats correctly', () => {
    renderDetail();
    expect(screen.getByText('4 Sätze')).toBeInTheDocument();
    expect(screen.getByText('8 Wdh.')).toBeInTheDocument();
  });

  it('renders duration exercise stats correctly', () => {
    renderDetail();
    expect(screen.getByText('60 Sek.')).toBeInTheDocument();
  });

  it('renders singular "Satz" for 1 set', () => {
    const r = { ...routine, exercises: [{ id: 'e1', name: 'Sit-ups', sets: 1, reps: 20, duration: null }] };
    renderDetail(r);
    expect(screen.getByText('1 Satz')).toBeInTheDocument();
  });

  it('shows exercise count label', () => {
    renderDetail();
    expect(screen.getByText('3 Übungen')).toBeInTheDocument();
  });

  it('shows empty state when no exercises', () => {
    renderDetail({ ...routine, exercises: [] });
    expect(screen.getByText('Keine Übungen vorhanden.')).toBeInTheDocument();
  });

  it('has no input or textarea elements (read-only)', () => {
    renderDetail();
    expect(document.querySelectorAll('input, textarea')).toHaveLength(0);
  });
});

describe('RoutineDetail – Cardio', () => {
  const cardioRoutine = {
    id: 'r2',
    name: 'Cardio Tag',
    routineType: 'cardio',
    exercises: [
      { id: 'ce1', name: 'Laufen', durationMinutes: 30 },
      { id: 'ce2', name: 'Radfahren', durationMinutes: 45 },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('zeigt XX min für Cardio-Übungen', () => {
    renderDetail(cardioRoutine);
    expect(screen.getByText('30 min')).toBeInTheDocument();
    expect(screen.getByText('45 min')).toBeInTheDocument();
  });

  it('zeigt keine Sätze-Badge für Cardio-Übungen', () => {
    renderDetail(cardioRoutine);
    expect(screen.queryByText(/Satz/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Wdh\./i)).not.toBeInTheDocument();
  });
});


describe('RoutineDetail – navigation', () => {
  it('calls onBack when "Zurück" is clicked', () => {
    renderDetail();
    fireEvent.click(screen.getByText(/← Zurück/i));
    expect(mockOnBack).toHaveBeenCalledOnce();
  });

  it('calls onEdit when "Bearbeiten" is clicked', () => {
    renderDetail();
    fireEvent.click(screen.getByText('Bearbeiten'));
    expect(mockOnEdit).toHaveBeenCalledOnce();
  });
});

describe('RoutineDetail – Übungsdetail-Expand (AC-01 bis AC-05)', () => {
  it('AC-01: alle Übungen haben role="button" und sind klickbar', () => {
    renderDetail();
    const items = screen.getAllByRole('button', { hidden: true });
    const exerciseButtons = items.filter((el) => el.tagName === 'LI');
    expect(exerciseButtons.length).toBe(routine.exercises.length);
  });

  it('AC-01: expanded-Bereich ist initial nicht sichtbar', () => {
    renderDetail();
    expect(document.querySelector('.exercise-item__expanded')).not.toBeInTheDocument();
  });

  it('AC-01: Klick auf Übung öffnet Expanded-Bereich', () => {
    renderDetail();
    fireEvent.click(screen.getByText('Bankdrücken').closest('li'));
    expect(document.querySelector('.exercise-item__expanded')).toBeInTheDocument();
  });

  it('AC-01: Chevron bekommt --open Klasse beim Aufklappen', () => {
    renderDetail();
    fireEvent.click(screen.getByText('Bankdrücken').closest('li'));
    expect(document.querySelector('.exercise-item__toggle--open')).toBeInTheDocument();
  });

  it('AC-01: aria-expanded wechselt auf true beim Aufklappen', () => {
    renderDetail();
    const li = screen.getByText('Bankdrücken').closest('li');
    expect(li.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(li);
    expect(li.getAttribute('aria-expanded')).toBe('true');
  });

  it('AC-04: zweiter Klick auf dieselbe Übung klappt sie wieder ein', () => {
    renderDetail();
    const li = screen.getByText('Bankdrücken').closest('li');
    fireEvent.click(li);
    expect(document.querySelector('.exercise-item__expanded')).toBeInTheDocument();
    fireEvent.click(li);
    expect(document.querySelector('.exercise-item__expanded')).not.toBeInTheDocument();
  });

  it('AC-04: Klick auf andere Übung schließt vorherige', () => {
    renderDetail();
    fireEvent.click(screen.getByText('Bankdrücken').closest('li'));
    expect(document.querySelector('.exercise-item__expanded')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Schulterdrücken').closest('li'));
    // Nur eine Expanded-Box sichtbar
    expect(document.querySelectorAll('.exercise-item__expanded').length).toBe(1);
    // Bankdrücken ist wieder eingeklappt
    expect(screen.getByText('Bankdrücken').closest('li').getAttribute('aria-expanded')).toBe('false');
  });

  it('AC-02: zeigt Bild für Bankdrücken (in Library)', () => {
    renderDetail();
    fireEvent.click(screen.getByText('Bankdrücken').closest('li'));
    const img = screen.getByRole('img', { name: /Bankdrücken/i });
    expect(img).toBeInTheDocument();
    expect(img.src).toContain('0001/0.jpg');
  });

  it('AC-03: zeigt Anweisungen für Bankdrücken als ol', () => {
    renderDetail();
    fireEvent.click(screen.getByText('Bankdrücken').closest('li'));
    expect(screen.getByText('Step 1 text.')).toBeInTheDocument();
    expect(screen.getByText('Step 2 text.')).toBeInTheDocument();
    expect(document.querySelector('.exercise-item__instructions')).toBeInTheDocument();
  });

  it('AC-05: Schulterdrücken (kein Library-Eintrag) zeigt kein Bild', () => {
    renderDetail();
    fireEvent.click(screen.getByText('Schulterdrücken').closest('li'));
    expect(document.querySelector('.exercise-item__expanded')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('AC-05: Schulterdrücken (kein Library-Eintrag) zeigt keine Anweisungen', () => {
    renderDetail();
    fireEvent.click(screen.getByText('Schulterdrücken').closest('li'));
    expect(document.querySelector('.exercise-item__instructions')).not.toBeInTheDocument();
  });
});
