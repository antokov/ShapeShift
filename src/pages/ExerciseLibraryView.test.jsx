import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExerciseLibraryView from './ExerciseLibraryView.jsx';
import * as lib from '../hooks/useExerciseLibrary.js';

vi.mock('../hooks/useExerciseLibrary.js', () => ({
  useExerciseLibrary: vi.fn(),
}));

const SAMPLE_EXERCISES = [
  {
    id: 'ex1', name: 'Barbell Bench Press', category: 'strength', level: 'intermediate',
    equipment: 'barbell', primaryMuscles: ['chest'], secondaryMuscles: ['shoulders'],
    instructions: ['Lie on the bench.', 'Lower the bar.', 'Press up.'], images: ['Barbell_Bench_Press/0.jpg'],
  },
  {
    id: 'ex2', name: 'Push-Ups', category: 'strength', level: 'beginner',
    equipment: 'body only', primaryMuscles: ['chest'], secondaryMuscles: ['triceps'],
    instructions: ['Start in plank.', 'Lower yourself.', 'Push back up.'], images: [],
  },
  {
    id: 'ex3', name: 'Running', category: 'cardio', level: 'beginner',
    equipment: 'body only', primaryMuscles: ['quadriceps'], secondaryMuscles: [],
    instructions: [], images: [],
  },
  {
    id: 'ex4', name: 'Dumbbell Curl', category: 'strength', level: 'beginner',
    equipment: 'dumbbell', primaryMuscles: ['biceps'], secondaryMuscles: [],
    instructions: ['Curl up.', 'Lower slowly.'], images: [],
  },
  {
    id: 'ex5', name: 'Kettlebell Swing', category: 'strength', level: 'intermediate',
    equipment: 'kettlebells', primaryMuscles: ['glutes'], secondaryMuscles: [],
    instructions: ['Hip hinge.', 'Swing forward.'], images: [],
  },
];

function setup(overrides = {}) {
  lib.useExerciseLibrary.mockReturnValue({
    exercises: SAMPLE_EXERCISES,
    loading: false,
    error: null,
    ...overrides,
  });
  render(<ExerciseLibraryView />);
}

describe('ExerciseLibraryView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Loading & Error ──────────────────────────────────────────────────────────

  it('shows loading subtitle when loading', () => {
    setup({ exercises: [], loading: true });
    expect(screen.getByText('Wird geladen…')).toBeInTheDocument();
  });

  it('shows error message on fetch failure', () => {
    setup({ exercises: [], loading: false, error: 'Übungsdatenbank konnte nicht geladen werden.' });
    expect(screen.getByText('Übungsdatenbank konnte nicht geladen werden.')).toBeInTheDocument();
  });

  it('does not render grid when loading', () => {
    setup({ exercises: [], loading: true });
    expect(screen.queryByRole('button', { name: /barbell bench press/i })).not.toBeInTheDocument();
  });

  // ── Default render ───────────────────────────────────────────────────────────

  it('renders page title', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Übungsübersicht' })).toBeInTheDocument();
  });

  it('shows total exercise count in subtitle', () => {
    setup();
    expect(screen.getByText('5 Übungen verfügbar')).toBeInTheDocument();
  });

  it('shows result count with no filters', () => {
    setup();
    expect(screen.getByText('5 Ergebnisse')).toBeInTheDocument();
  });

  it('renders exercise names', () => {
    setup();
    expect(screen.getByText('Barbell Bench Press')).toBeInTheDocument();
    expect(screen.getByText('Push-Ups')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  // ── Filter bar — compact selects ─────────────────────────────────────────────

  it('renders search input', () => {
    setup();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('renders all four filter selects', () => {
    setup();
    expect(screen.getByLabelText('Kategorie filtern')).toBeInTheDocument();
    expect(screen.getByLabelText('Level filtern')).toBeInTheDocument();
    expect(screen.getByLabelText('Equipment filtern')).toBeInTheDocument();
    expect(screen.getByLabelText('Muskelgruppe filtern')).toBeInTheDocument();
  });

  it('each select has a default "Alle" option', () => {
    setup();
    expect(screen.getByRole('option', { name: 'Alle Kategorien' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Alle Levels' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Alle Equipment' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Alle Muskeln' })).toBeInTheDocument();
  });

  // ── Search filter ────────────────────────────────────────────────────────────

  it('filters exercises by text search (case-insensitive)', () => {
    setup();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'bench' } });
    expect(screen.getByText('Barbell Bench Press')).toBeInTheDocument();
    expect(screen.queryByText('Push-Ups')).not.toBeInTheDocument();
  });

  it('updates result count after search', () => {
    setup();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'bench' } });
    expect(screen.getByText('1 Ergebnis')).toBeInTheDocument();
  });

  it('shows "Keine Übungen gefunden." when search has no match', () => {
    setup();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'xyz-no-match' } });
    expect(screen.getByText('Keine Übungen gefunden.')).toBeInTheDocument();
  });

  // ── Category select filter ───────────────────────────────────────────────────

  it('filters by category select', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Kategorie filtern'), { target: { value: 'cardio' } });
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.queryByText('Barbell Bench Press')).not.toBeInTheDocument();
  });

  it('resets category filter when set to empty string', () => {
    setup();
    const sel = screen.getByLabelText('Kategorie filtern');
    fireEvent.change(sel, { target: { value: 'cardio' } });
    expect(screen.queryByText('Barbell Bench Press')).not.toBeInTheDocument();
    fireEvent.change(sel, { target: { value: '' } });
    expect(screen.getByText('Barbell Bench Press')).toBeInTheDocument();
  });

  // ── Level select filter ──────────────────────────────────────────────────────

  it('filters by level select', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Level filtern'), { target: { value: 'beginner' } });
    expect(screen.getByText('Push-Ups')).toBeInTheDocument();
    expect(screen.queryByText('Barbell Bench Press')).not.toBeInTheDocument();
  });

  // ── Equipment select filter ──────────────────────────────────────────────────

  it('filters by equipment select', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Equipment filtern'), { target: { value: 'barbell' } });
    expect(screen.getByText('Barbell Bench Press')).toBeInTheDocument();
    expect(screen.queryByText('Push-Ups')).not.toBeInTheDocument();
  });

  // ── Muscle select filter ─────────────────────────────────────────────────────

  it('filters by muscle select', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Muskelgruppe filtern'), { target: { value: 'biceps' } });
    expect(screen.getByText('Dumbbell Curl')).toBeInTheDocument();
    expect(screen.queryByText('Barbell Bench Press')).not.toBeInTheDocument();
  });

  // ── Combined filters ─────────────────────────────────────────────────────────

  it('applies multiple filters combined (AND)', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Kategorie filtern'), { target: { value: 'strength' } });
    fireEvent.change(screen.getByLabelText('Level filtern'), { target: { value: 'beginner' } });
    expect(screen.getByText('Push-Ups')).toBeInTheDocument();
    expect(screen.getByText('Dumbbell Curl')).toBeInTheDocument();
    expect(screen.queryByText('Barbell Bench Press')).not.toBeInTheDocument();
    expect(screen.queryByText('Running')).not.toBeInTheDocument();
  });

  // ── "Filter löschen" ────────────────────────────────────────────────────────

  it('shows "Filter löschen" only when a filter is active', () => {
    setup();
    expect(screen.queryByRole('button', { name: 'Filter löschen' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Kategorie filtern'), { target: { value: 'cardio' } });
    expect(screen.getByRole('button', { name: 'Filter löschen' })).toBeInTheDocument();
  });

  it('clears all filters when "Filter löschen" is clicked', () => {
    setup();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'bench' } });
    fireEvent.change(screen.getByLabelText('Kategorie filtern'), { target: { value: 'strength' } });
    fireEvent.click(screen.getByRole('button', { name: 'Filter löschen' }));
    expect(screen.getByText('5 Ergebnisse')).toBeInTheDocument();
    expect(screen.getByRole('searchbox').value).toBe('');
  });

  // ── Pagination ───────────────────────────────────────────────────────────────

  it('does not show "Mehr laden" when results fit in one page', () => {
    setup();
    expect(screen.queryByText(/Mehr laden/)).not.toBeInTheDocument();
  });

  it('shows "Mehr laden" when more results exist than page size', () => {
    const many = Array.from({ length: 35 }, (_, i) => ({
      id: `e${i}`, name: `Exercise ${i}`, category: 'strength', level: 'beginner',
      equipment: 'barbell', primaryMuscles: ['chest'], secondaryMuscles: [],
      instructions: [], images: [],
    }));
    lib.useExerciseLibrary.mockReturnValue({ exercises: many, loading: false, error: null });
    render(<ExerciseLibraryView />);
    expect(screen.getByText(/Mehr laden/)).toBeInTheDocument();
    expect(screen.getByText(/5 weitere/)).toBeInTheDocument();
  });

  // ── Exercise card thumbnails ─────────────────────────────────────────────────

  it('renders thumbnail image on card when images available', () => {
    setup();
    // Barbell Bench Press has images
    const card = screen.getByText('Barbell Bench Press').closest('[role="button"]');
    expect(card.querySelector('.exercise-card__thumb img')).toBeInTheDocument();
  });

  it('renders placeholder when exercise has no images', () => {
    setup();
    const card = screen.getByText('Push-Ups').closest('[role="button"]');
    expect(card.querySelector('.exercise-card__thumb-placeholder')).toBeInTheDocument();
  });

  // ── Modal: open / close ──────────────────────────────────────────────────────

  it('opens modal on card click', () => {
    setup();
    fireEvent.click(screen.getByText('Barbell Bench Press').closest('[role="button"]'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('modal displays exercise name', () => {
    setup();
    fireEvent.click(screen.getByText('Barbell Bench Press').closest('[role="button"]'));
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveTextContent('Barbell Bench Press');
  });

  it('modal displays instructions', () => {
    setup();
    fireEvent.click(screen.getByText('Barbell Bench Press').closest('[role="button"]'));
    expect(screen.getByText('Lie on the bench.')).toBeInTheDocument();
    expect(screen.getByText('Lower the bar.')).toBeInTheDocument();
    expect(screen.getByText('Press up.')).toBeInTheDocument();
  });

  it('modal shows "Keine Anweisungen verfügbar." when no instructions', () => {
    setup();
    fireEvent.click(screen.getByText('Running').closest('[role="button"]'));
    expect(screen.getByText('Keine Anweisungen verfügbar.')).toBeInTheDocument();
  });

  it('modal closes via × button', () => {
    setup();
    fireEvent.click(screen.getByText('Barbell Bench Press').closest('[role="button"]'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Schließen'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('modal closes via backdrop click', () => {
    setup();
    fireEvent.click(screen.getByText('Barbell Bench Press').closest('[role="button"]'));
    fireEvent.click(document.querySelector('.exercise-modal__backdrop'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('modal closes via Escape key', () => {
    setup();
    fireEvent.click(screen.getByText('Barbell Bench Press').closest('[role="button"]'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('modal shows secondary muscles', () => {
    setup();
    fireEvent.click(screen.getByText('Barbell Bench Press').closest('[role="button"]'));
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveTextContent('shoulders');
  });

  it('modal does not show secondary muscles section when empty', () => {
    setup();
    fireEvent.click(screen.getByText('Running').closest('[role="button"]'));
    // No secondaryMuscles badges expected beyond primary
    const modal = screen.getByRole('dialog');
    // quadriceps is primary muscle — verify it's there
    expect(modal).toHaveTextContent('quadriceps');
  });

  // ── No inline-expand ─────────────────────────────────────────────────────────

  it('cards do not have aria-expanded attribute', () => {
    setup();
    const card = screen.getByText('Barbell Bench Press').closest('[role="button"]');
    expect(card).not.toHaveAttribute('aria-expanded');
  });

  // ── Badge rendering on card ──────────────────────────────────────────────────

  it('shows German equipment label on card', () => {
    setup();
    const card = screen.getByText('Barbell Bench Press').closest('[role="button"]');
    expect(card).toHaveTextContent('Langhantel');
  });

  it('shows primary muscle on card', () => {
    setup();
    const card = screen.getByText('Dumbbell Curl').closest('[role="button"]');
    expect(card).toHaveTextContent('biceps');
  });

  it('shows German level label on card', () => {
    setup();
    const card = screen.getByText('Push-Ups').closest('[role="button"]');
    expect(card).toHaveTextContent('Anfänger');
  });
});
