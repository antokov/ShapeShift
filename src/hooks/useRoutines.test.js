import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRoutines } from './useRoutines.js';

const ROUTINE = {
  id: 'r1',
  name: 'Push Day',
  description: '',
  exercises: [{ id: 'e1', name: 'Bankdrücken', sets: 3, reps: 10, duration: null }],
  createdAt: '2026-01-01T00:00:00.000Z',
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

describe('useRoutines – initial load', () => {
  it('starts with loading=true', () => {
    mockFetch([]);
    const { result } = renderHook(() => useRoutines());
    expect(result.current.loading).toBe(true);
  });

  it('loading becomes false after fetch resolves', async () => {
    mockFetch([]);
    const { result } = renderHook(() => useRoutines());
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('loads routines from GET /api/routines', async () => {
    mockFetch([ROUTINE]);
    const { result } = renderHook(() => useRoutines());
    await waitFor(() => expect(result.current.routines).toHaveLength(1));
    expect(result.current.routines[0].name).toBe('Push Day');
  });

  it('sets error when fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useRoutines());
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.loading).toBe(false);
  });
});

describe('useRoutines – addRoutine', () => {
  it('POSTs to /api/routines and updates state', async () => {
    mockFetchSequence([
      { data: [] },           // initial GET
      { data: ROUTINE, status: 201 }, // POST
    ]);
    const { result } = renderHook(() => useRoutines());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addRoutine(ROUTINE);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/routines',
      expect.objectContaining({ method: 'POST' })
    );
    expect(result.current.routines).toHaveLength(1);
  });

  it('throws when POST fails', async () => {
    mockFetchSequence([
      { data: [] },
      { data: {}, status: 500 },
    ]);
    const { result } = renderHook(() => useRoutines());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(async () => result.current.addRoutine(ROUTINE))
    ).rejects.toThrow();
  });
});

describe('useRoutines – updateRoutine', () => {
  it('PUTs to /api/routines/{id} and updates state', async () => {
    const updated = { ...ROUTINE, name: 'Updated' };
    mockFetchSequence([
      { data: [ROUTINE] },
      { data: updated },
    ]);
    const { result } = renderHook(() => useRoutines());
    await waitFor(() => expect(result.current.routines).toHaveLength(1));

    await act(async () => {
      await result.current.updateRoutine('r1', updated);
    });

    expect(result.current.routines[0].name).toBe('Updated');
  });
});

describe('useRoutines – deleteRoutine', () => {
  it('DELETEs /api/routines/{id} and removes from state', async () => {
    mockFetchSequence([
      { data: [ROUTINE] },
      { data: null, status: 204 },
    ]);
    const { result } = renderHook(() => useRoutines());
    await waitFor(() => expect(result.current.routines).toHaveLength(1));

    await act(async () => {
      await result.current.deleteRoutine('r1');
    });

    expect(result.current.routines).toHaveLength(0);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/routines/r1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
