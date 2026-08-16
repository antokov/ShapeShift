import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildExportPayload, loadProfile, CLAUDE_PROMPT } from './exportData.js';

// ─── loadProfile ──────────────────────────────────────────────────────────────

describe('loadProfile', () => {
  const KEY = 'fitnessapp_admin_profile';

  afterEach(() => {
    localStorage.clear();
  });

  it('returns parsed object when key exists', () => {
    const profile = { vorname: 'Anton', alter: 35 };
    localStorage.setItem(KEY, JSON.stringify(profile));
    expect(loadProfile()).toEqual(profile);
  });

  it('returns empty object when key missing', () => {
    expect(loadProfile()).toEqual({});
  });

  it('returns empty object on invalid JSON', () => {
    localStorage.setItem(KEY, 'not-json{{{');
    expect(loadProfile()).toEqual({});
  });
});

// ─── CLAUDE_PROMPT ────────────────────────────────────────────────────────────

describe('CLAUDE_PROMPT', () => {
  it('is a non-empty string in German', () => {
    expect(typeof CLAUDE_PROMPT).toBe('string');
    expect(CLAUDE_PROMPT.length).toBeGreaterThan(50);
    expect(CLAUDE_PROMPT).toContain('Fitness');
  });
});

// ─── buildExportPayload ───────────────────────────────────────────────────────

describe('buildExportPayload', () => {
  const sampleWorkout = {
    id: 'w-1',
    routineId: 'r-1',
    routineName: 'Push Day',
    startedAt: '2026-06-01T09:00:00',
    durationSeconds: 3600,
    totalSets: 12,
    notes: '',
    exerciseData: '[{"id":"e-1","name":"Bench","rating":2}]',
  };

  const sampleRoutine = { id: 'r-1', name: 'Push Day', exercises: [] };

  const sampleCalendarEvents = [
    { id: 'ev-1', routineId: 'r-1', routineName: 'Push Day', eventType: 'single', date: '2026-06-01', startDate: null, recurrenceDays: [] },
    { id: 'ev-2', routineId: 'r-1', routineName: 'Push Day', eventType: 'series', date: null, startDate: '2026-06-01', recurrenceDays: ['Mo', 'Mi'] },
  ];

  it('sets _exportedAt to an ISO timestamp', () => {
    const payload = buildExportPayload({
      workouts: [],
      routines: [],
      calendarEvents: [],
      garminHealth: null,
    });
    expect(payload._exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('includes _prompt equal to CLAUDE_PROMPT', () => {
    const payload = buildExportPayload({
      workouts: [],
      routines: [],
      calendarEvents: [],
      garminHealth: null,
    });
    expect(payload._prompt).toBe(CLAUDE_PROMPT);
  });

  it('passes routines through unchanged', () => {
    const payload = buildExportPayload({
      workouts: [],
      routines: [sampleRoutine],
      calendarEvents: [],
      garminHealth: null,
    });
    expect(payload.routines).toEqual([sampleRoutine]);
  });

  it('parses exerciseData from JSON string to array', () => {
    const payload = buildExportPayload({
      workouts: [sampleWorkout],
      routines: [],
      calendarEvents: [],
      garminHealth: null,
    });
    expect(Array.isArray(payload.workouts[0].exerciseData)).toBe(true);
    expect(payload.workouts[0].exerciseData[0].name).toBe('Bench');
  });

  it('sets exerciseData to [] for invalid JSON', () => {
    const broken = { ...sampleWorkout, exerciseData: 'not-json' };
    const payload = buildExportPayload({
      workouts: [broken],
      routines: [],
      calendarEvents: [],
      garminHealth: null,
    });
    expect(payload.workouts[0].exerciseData).toEqual([]);
  });

  it('sets exerciseData to [] for null/undefined', () => {
    const noData = { ...sampleWorkout, exerciseData: null };
    const payload = buildExportPayload({
      workouts: [noData],
      routines: [],
      calendarEvents: [],
      garminHealth: null,
    });
    expect(payload.workouts[0].exerciseData).toEqual([]);
  });

  it('passes calendarEvents through unchanged', () => {
    const payload = buildExportPayload({
      workouts: [],
      routines: [sampleRoutine],
      calendarEvents: sampleCalendarEvents,
      garminHealth: null,
    });
    expect(payload.calendarEvents).toEqual(sampleCalendarEvents);
  });

  it('sets calendarEvents to [] when not provided', () => {
    const payload = buildExportPayload({
      workouts: [],
      routines: [],
      calendarEvents: undefined,
      garminHealth: null,
    });
    expect(payload.calendarEvents).toEqual([]);
  });

  it('includes garminHealth when provided', () => {
    const garmin = { steps: 8000, heartRate: 72 };
    const payload = buildExportPayload({
      workouts: [],
      routines: [],
      calendarEvents: [],
      garminHealth: garmin,
    });
    expect(payload.garminHealth).toEqual(garmin);
  });

  it('sets garminHealth to null when not provided', () => {
    const payload = buildExportPayload({
      workouts: [],
      routines: [],
      calendarEvents: [],
      garminHealth: null,
    });
    expect(payload.garminHealth).toBeNull();
  });

  it('handles empty workouts', () => {
    const payload = buildExportPayload({
      workouts: [],
      routines: [],
      calendarEvents: [],
      garminHealth: null,
    });
    expect(payload.workouts).toEqual([]);
  });

  it('includes profile from localStorage', () => {
    localStorage.setItem('fitnessapp_admin_profile', JSON.stringify({ vorname: 'Anton' }));
    const payload = buildExportPayload({
      workouts: [],
      routines: [],
      calendarEvents: [],
      garminHealth: null,
    });
    expect(payload.profile.vorname).toBe('Anton');
    localStorage.clear();
  });
});
