import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  getExerciseImage,
  getExerciseImages,
  getExerciseInstructions,
} from './useExerciseLibrary.js';

const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

const MOCK_EXERCISES = [
  {
    name: 'Barbell Bench Press',
    images: ['barbell-bench-press/0.jpg', 'barbell-bench-press/1.jpg'],
    instructions: ['Auf der Bank liegen.', 'Hantel nach oben drücken.'],
  },
  {
    name: 'Squat',
    images: [],
    instructions: [],
  },
];

// ─── getExerciseImage ─────────────────────────────────────

describe('getExerciseImage', () => {
  it('returns null when name is empty string', () => {
    expect(getExerciseImage('', MOCK_EXERCISES)).toBeNull();
  });

  it('returns null when exercises array is empty', () => {
    expect(getExerciseImage('Barbell Bench Press', [])).toBeNull();
  });

  it('returns null when exercises is null/undefined', () => {
    expect(getExerciseImage('Barbell Bench Press', null)).toBeNull();
    expect(getExerciseImage('Barbell Bench Press', undefined)).toBeNull();
  });

  it('returns null when exercise is not found', () => {
    expect(getExerciseImage('Unknown Exercise', MOCK_EXERCISES)).toBeNull();
  });

  it('returns null when found exercise has no images', () => {
    expect(getExerciseImage('Squat', MOCK_EXERCISES)).toBeNull();
  });

  it('returns full URL for first image on match', () => {
    expect(getExerciseImage('Barbell Bench Press', MOCK_EXERCISES))
      .toBe(IMAGE_BASE + 'barbell-bench-press/0.jpg');
  });

  it('is case-insensitive', () => {
    expect(getExerciseImage('barbell bench press', MOCK_EXERCISES))
      .toBe(IMAGE_BASE + 'barbell-bench-press/0.jpg');
    expect(getExerciseImage('BARBELL BENCH PRESS', MOCK_EXERCISES))
      .toBe(IMAGE_BASE + 'barbell-bench-press/0.jpg');
  });
});

// ─── getExerciseImages ────────────────────────────────────

describe('getExerciseImages', () => {
  it('returns [] when name is empty string', () => {
    expect(getExerciseImages('', MOCK_EXERCISES)).toEqual([]);
  });

  it('returns [] when exercises array is empty', () => {
    expect(getExerciseImages('Barbell Bench Press', [])).toEqual([]);
  });

  it('returns [] when exercise has no images', () => {
    expect(getExerciseImages('Squat', MOCK_EXERCISES)).toEqual([]);
  });

  it('returns all image URLs with IMAGE_BASE prefix', () => {
    const result = getExerciseImages('Barbell Bench Press', MOCK_EXERCISES);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(IMAGE_BASE + 'barbell-bench-press/0.jpg');
    expect(result[1]).toBe(IMAGE_BASE + 'barbell-bench-press/1.jpg');
  });

  it('is case-insensitive', () => {
    expect(getExerciseImages('BARBELL BENCH PRESS', MOCK_EXERCISES)).toHaveLength(2);
  });
});

// ─── getExerciseInstructions ──────────────────────────────

describe('getExerciseInstructions', () => {
  it('returns [] when name is empty string', () => {
    expect(getExerciseInstructions('', MOCK_EXERCISES)).toEqual([]);
  });

  it('returns [] when exercises array is empty', () => {
    expect(getExerciseInstructions('Barbell Bench Press', [])).toEqual([]);
  });

  it('returns [] when exercise is not found', () => {
    expect(getExerciseInstructions('Unknown', MOCK_EXERCISES)).toEqual([]);
  });

  it('returns [] when exercise has empty instructions', () => {
    expect(getExerciseInstructions('Squat', MOCK_EXERCISES)).toEqual([]);
  });

  it('returns instructions array on match', () => {
    const result = getExerciseInstructions('Barbell Bench Press', MOCK_EXERCISES);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('Auf der Bank liegen.');
    expect(result[1]).toBe('Hantel nach oben drücken.');
  });

  it('is case-insensitive', () => {
    expect(getExerciseInstructions('barbell bench press', MOCK_EXERCISES)).toHaveLength(2);
  });
});

// ─── useExerciseLibrary Hook ──────────────────────────────

describe('useExerciseLibrary hook', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function importHook() {
    const mod = await import('./useExerciseLibrary.js');
    return mod.useExerciseLibrary;
  }

  it('starts with loading=true, exercises=[], error=null', async () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    const useExerciseLibrary = await importHook();
    const { result } = renderHook(() => useExerciseLibrary());
    expect(result.current.loading).toBe(true);
    expect(result.current.exercises).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('sets exercises and loading=false after successful fetch', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_EXERCISES,
    });
    const useExerciseLibrary = await importHook();
    const { result } = renderHook(() => useExerciseLibrary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.exercises).toHaveLength(2);
    expect(result.current.exercises[0].name).toBe('Barbell Bench Press');
    expect(result.current.error).toBeNull();
  });

  it('sets error message and loading=false on network failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const useExerciseLibrary = await importHook();
    const { result } = renderHook(() => useExerciseLibrary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Übungsdatenbank konnte nicht geladen werden.');
    expect(result.current.exercises).toEqual([]);
  });

  it('sets error message when HTTP response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => null,
    });
    const useExerciseLibrary = await importHook();
    const { result } = renderHook(() => useExerciseLibrary());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Übungsdatenbank konnte nicht geladen werden.');
    expect(result.current.exercises).toEqual([]);
  });
});
