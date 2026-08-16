import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWeightLog } from './useWeightLog.js';

beforeEach(() => {
  localStorage.clear();
});

describe('useWeightLog', () => {
  it('starts with empty entries when localStorage is empty', () => {
    const { result } = renderHook(() => useWeightLog());
    expect(result.current.entries).toEqual([]);
  });

  it('addEntry adds a new weight entry', () => {
    const { result } = renderHook(() => useWeightLog());
    act(() => result.current.addEntry(80, '2026-06-10'));
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0]).toEqual({ date: '2026-06-10', weight: 80 });
  });

  it('addEntry overwrites existing entry for the same date', () => {
    const { result } = renderHook(() => useWeightLog());
    act(() => result.current.addEntry(80, '2026-06-10'));
    act(() => result.current.addEntry(82, '2026-06-10'));
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].weight).toBe(82);
  });

  it('entries are sorted newest first', () => {
    const { result } = renderHook(() => useWeightLog());
    act(() => result.current.addEntry(78, '2026-06-08'));
    act(() => result.current.addEntry(80, '2026-06-10'));
    expect(result.current.entries[0].date).toBe('2026-06-10');
    expect(result.current.entries[1].date).toBe('2026-06-08');
  });

  it('removeEntry deletes the entry with matching date', () => {
    const { result } = renderHook(() => useWeightLog());
    act(() => result.current.addEntry(80, '2026-06-10'));
    act(() => result.current.removeEntry('2026-06-10'));
    expect(result.current.entries).toHaveLength(0);
  });

  it('persists entries to localStorage', () => {
    const { result } = renderHook(() => useWeightLog());
    act(() => result.current.addEntry(75.5, '2026-06-11'));
    const stored = JSON.parse(localStorage.getItem('fitnessapp_admin_weight_log'));
    expect(stored).toHaveLength(1);
    expect(stored[0].weight).toBe(75.5);
  });

  it('loads existing entries from localStorage on init', () => {
    localStorage.setItem(
      'fitnessapp_admin_weight_log',
      JSON.stringify([{ date: '2026-06-09', weight: 77 }])
    );
    const { result } = renderHook(() => useWeightLog());
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].weight).toBe(77);
  });

  it('ignores addEntry calls with weight <= 0', () => {
    const { result } = renderHook(() => useWeightLog());
    act(() => result.current.addEntry(0, '2026-06-10'));
    act(() => result.current.addEntry(-5, '2026-06-10'));
    expect(result.current.entries).toHaveLength(0);
  });
});
