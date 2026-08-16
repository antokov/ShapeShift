import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProfile } from './useProfile.js';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('useProfile – initial state', () => {
  it('returns default profile when localStorage is empty', () => {
    const { result } = renderHook(() => useProfile());
    expect(result.current.profile.vorname).toBe('');
    expect(result.current.profile.geburtsdatum).toBeNull();
    expect(result.current.profile.ziele).toEqual([]);
    expect(result.current.profile.equipment).toEqual([]);
  });

  it('loads existing profile from localStorage on mount', () => {
    localStorage.setItem('fitnessapp_admin_profile', JSON.stringify({ vorname: 'Max', geburtsdatum: '1994-01-15', ziele: ['Muskelaufbau'], equipment: [] }));
    const { result } = renderHook(() => useProfile());
    expect(result.current.profile.vorname).toBe('Max');
    expect(result.current.profile.geburtsdatum).toBe('1994-01-15');
    expect(result.current.profile.ziele).toEqual(['Muskelaufbau']);
  });

  it('falls back to defaults if localStorage contains invalid JSON', () => {
    localStorage.setItem('fitnessapp_admin_profile', 'not-json');
    const { result } = renderHook(() => useProfile());
    expect(result.current.profile.vorname).toBe('');
    expect(result.current.profile.ziele).toEqual([]);
  });
});

describe('useProfile – updateProfile', () => {
  it('updates a single field', () => {
    const { result } = renderHook(() => useProfile());
    act(() => result.current.updateProfile({ vorname: 'Anton' }));
    expect(result.current.profile.vorname).toBe('Anton');
  });

  it('persists update to localStorage', () => {
    const { result } = renderHook(() => useProfile());
    act(() => result.current.updateProfile({ gewicht: 80 }));
    const stored = JSON.parse(localStorage.getItem('fitnessapp_admin_profile'));
    expect(stored.gewicht).toBe(80);
  });

  it('merges patch without overwriting unrelated fields', () => {
    const { result } = renderHook(() => useProfile());
    act(() => result.current.updateProfile({ vorname: 'Anton' }));
    act(() => result.current.updateProfile({ geburtsdatum: '1989-03-20' }));
    expect(result.current.profile.vorname).toBe('Anton');
    expect(result.current.profile.geburtsdatum).toBe('1989-03-20');
  });
});

describe('useProfile – toggleArrayItem', () => {
  it('adds item to empty array', () => {
    const { result } = renderHook(() => useProfile());
    act(() => result.current.toggleArrayItem('ziele', 'Muskelaufbau'));
    expect(result.current.profile.ziele).toContain('Muskelaufbau');
  });

  it('removes item that is already selected', () => {
    const { result } = renderHook(() => useProfile());
    act(() => result.current.toggleArrayItem('ziele', 'Muskelaufbau'));
    act(() => result.current.toggleArrayItem('ziele', 'Muskelaufbau'));
    expect(result.current.profile.ziele).not.toContain('Muskelaufbau');
  });

  it('allows multiple items to be selected', () => {
    const { result } = renderHook(() => useProfile());
    act(() => result.current.toggleArrayItem('equipment', 'Langhantel'));
    act(() => result.current.toggleArrayItem('equipment', 'Kurzhanteln'));
    expect(result.current.profile.equipment).toHaveLength(2);
  });

  it('persists toggled array to localStorage', () => {
    const { result } = renderHook(() => useProfile());
    act(() => result.current.toggleArrayItem('ziele', 'Kraft steigern'));
    const stored = JSON.parse(localStorage.getItem('fitnessapp_admin_profile'));
    expect(stored.ziele).toContain('Kraft steigern');
  });

  it('handles missing field gracefully (EC-03 variant)', () => {
    localStorage.setItem('fitnessapp_admin_profile', JSON.stringify({ vorname: 'Max' }));
    const { result } = renderHook(() => useProfile());
    act(() => result.current.toggleArrayItem('ziele', 'Ausdauer verbessern'));
    expect(result.current.profile.ziele).toContain('Ausdauer verbessern');
  });
});

describe('useProfile – localStorage unavailable (EC-03)', () => {
  it('does not throw when localStorage.setItem fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const { result } = renderHook(() => useProfile());
    expect(() =>
      act(() => result.current.updateProfile({ vorname: 'Test' }))
    ).not.toThrow();
    expect(result.current.profile.vorname).toBe('Test');
  });
});
