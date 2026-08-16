import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWorkouts } from './useWorkouts.js';

const WORKOUT = {
  id: 'w1',
  routineId: 'r1',
  routineName: 'Push Day',
  startedAt: '2026-06-11T10:00:00.000Z',
  durationSeconds: 3600,
  totalSets: 12,
};

function mockFetch(data, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  });
}

function mockFetchSequence(responses) {
  let i = 0;
  global.fetch = vi.fn().mockImplementation(() => {
    const { data, status = 200 } = responses[i++] ?? { data: [] };
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: async () => data,
    });
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useWorkouts – initial load', () => {
  it('starts with loading=true', () => {
    mockFetch([]);
    const { result } = renderHook(() => useWorkouts());
    expect(result.current.loading).toBe(true);
  });

  it('loading becomes false after fetch resolves', async () => {
    mockFetch([]);
    const { result } = renderHook(() => useWorkouts());
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('loads workouts from GET /api/workouts', async () => {
    mockFetch([WORKOUT]);
    const { result } = renderHook(() => useWorkouts());
    await waitFor(() => expect(result.current.workouts).toHaveLength(1));
    expect(result.current.workouts[0].routineName).toBe('Push Day');
  });

  it('sets empty array on fetch error (no crash)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useWorkouts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.workouts).toEqual([]);
  });
});

describe('useWorkouts – addWorkout', () => {
  it('POSTs to /api/workouts and adds to state', async () => {
    mockFetchSequence([
      { data: [] },
      { data: WORKOUT, status: 201 },
    ]);
    const { result } = renderHook(() => useWorkouts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addWorkout(WORKOUT);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/workouts',
      expect.objectContaining({ method: 'POST' })
    );
    expect(result.current.workouts).toHaveLength(1);
    expect(result.current.workouts[0].id).toBe('w1');
  });

  it('places new workout at top when it has the newest date', async () => {
    const older = { ...WORKOUT, id: 'w-old', startedAt: '2026-06-10T10:00:00.000Z' };
    const newer = { ...WORKOUT, id: 'w-new', startedAt: '2026-06-12T10:00:00.000Z' };
    mockFetchSequence([
      { data: [older] },
      { data: newer, status: 201 },
    ]);
    const { result } = renderHook(() => useWorkouts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addWorkout(newer);
    });

    expect(result.current.workouts[0].id).toBe('w-new');
    expect(result.current.workouts[1].id).toBe('w-old');
  });

  it('places past-date manual entry at correct position (not at top)', async () => {
    const recent = { ...WORKOUT, id: 'w-recent', startedAt: '2026-06-12T10:00:00.000Z' };
    const pastEntry = { ...WORKOUT, id: 'w-past', startedAt: '2026-06-09T12:00:00.000Z' };
    mockFetchSequence([
      { data: [recent] },
      { data: pastEntry, status: 201 },
    ]);
    const { result } = renderHook(() => useWorkouts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addWorkout(pastEntry);
    });

    expect(result.current.workouts[0].id).toBe('w-recent');
    expect(result.current.workouts[1].id).toBe('w-past');
  });

  it('throws when POST fails', async () => {
    mockFetchSequence([
      { data: [] },
      { data: {}, status: 500 },
    ]);
    const { result } = renderHook(() => useWorkouts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(async () => result.current.addWorkout(WORKOUT))
    ).rejects.toThrow();
  });
});

describe('useWorkouts – updateWorkout', () => {
  it('PUTs to /api/workouts/{id} and updates state', async () => {
    const updated = { ...WORKOUT, totalSets: 20 };
    mockFetchSequence([
      { data: [WORKOUT] },
      { data: updated },
    ]);
    const { result } = renderHook(() => useWorkouts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateWorkout(WORKOUT.id, updated);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `/api/workouts/${WORKOUT.id}`,
      expect.objectContaining({ method: 'PUT' })
    );
    expect(result.current.workouts[0].totalSets).toBe(20);
  });

  it('re-sorts after update when date changes', async () => {
    const older = { ...WORKOUT, id: 'w-old', startedAt: '2026-06-10T10:00:00.000Z' };
    const recent = { ...WORKOUT, id: 'w-new', startedAt: '2026-06-12T10:00:00.000Z' };
    const movedUp = { ...older, startedAt: '2026-06-13T12:00:00.000Z' };
    mockFetchSequence([
      { data: [recent, older] },
      { data: movedUp },
    ]);
    const { result } = renderHook(() => useWorkouts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateWorkout(older.id, movedUp);
    });

    expect(result.current.workouts[0].id).toBe('w-old');
    expect(result.current.workouts[1].id).toBe('w-new');
  });

  it('throws when PUT fails', async () => {
    mockFetchSequence([
      { data: [WORKOUT] },
      { data: {}, status: 404 },
    ]);
    const { result } = renderHook(() => useWorkouts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(async () => result.current.updateWorkout(WORKOUT.id, WORKOUT))
    ).rejects.toThrow();
  });
});
