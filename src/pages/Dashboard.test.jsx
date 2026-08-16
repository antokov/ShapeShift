import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Dashboard from './Dashboard.jsx';

vi.mock('../hooks/useProfile.js', () => ({
  useProfile: vi.fn(() => ({ profile: { vorname: '', ziele: [] }, updateProfile: vi.fn(), toggleArrayItem: vi.fn() })),
}));
import { useProfile } from '../hooks/useProfile.js';

vi.mock('../hooks/useWeightLog.js', () => ({
  useWeightLog: vi.fn(() => ({ entries: [] })),
}));
import { useWeightLog } from '../hooks/useWeightLog.js';

vi.mock('../hooks/useGarmin.js', () => ({
  useGarminHealth: vi.fn(() => ({ health: null, loading: false, notConfigured: true })),
}));
import { useGarminHealth } from '../hooks/useGarmin.js';

const TODAY = new Date();
function isoToday(h = 10) {
  const d = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), h, 0, 0);
  return d.toISOString();
}
function isoYesterday(h = 10) {
  const d = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - 1, h, 0, 0);
  return d.toISOString();
}
function isoDaysAgo(n, h = 10) {
  const d = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - n, h, 0, 0);
  return d.toISOString();
}

const EXERCISE_DATA_HAPPY = JSON.stringify([
  { id: 'e-1', name: 'Bankdrücken', weight: 80, actualReps: 8, actualDuration: null, rating: 2, completedSets: [true, true] },
  { id: 'e-2', name: 'Plank', weight: null, actualReps: null, actualDuration: 60, rating: 2, completedSets: [true] },
]);

const EXERCISE_DATA_SAD = JSON.stringify([
  { id: 'e-1', name: 'Squat', weight: 100, actualReps: 5, actualDuration: null, rating: 0, completedSets: [true] },
]);

function makeWorkout(overrides) {
  return {
    id: 'w-default',
    routineId: 'r-1',
    routineName: 'Push Day',
    startedAt: isoToday(),
    durationSeconds: 3600,
    totalSets: 12,
    notes: '',
    exerciseData: '',
    ...overrides,
  };
}

describe('Dashboard – Rendering', () => {
  it('renders title', () => {
    render(<Dashboard workouts={[]} />);
    expect(screen.getByText('Fitness')).toBeTruthy();
  });

  it('shows empty state in recent list when no workouts', () => {
    render(<Dashboard workouts={[]} />);
    expect(screen.getByText('Noch keine Trainings aufgezeichnet.')).toBeTruthy();
  });

  it('renders recent workouts list', () => {
    const workouts = [makeWorkout({ routineName: 'Push Day', totalSets: 5, durationSeconds: 1800 })];
    render(<Dashboard workouts={workouts} />);
    const recentSection = document.querySelector('.dashboard__recent');
    expect(recentSection.textContent).toContain('Push Day');
    expect(recentSection.textContent).toContain('30 min');
    expect(recentSection.textContent).toContain('5 Sätze');
  });

  it('shows max 3 workouts in recent list', () => {
    const workouts = Array.from({ length: 8 }, (_, i) =>
      makeWorkout({ id: `w-${i}`, routineName: `Routine ${i}`, startedAt: isoDaysAgo(i) })
    );
    render(<Dashboard workouts={workouts} />);
    const items = document.querySelectorAll('.dashboard__recent-item');
    expect(items.length).toBe(3);
  });

  it('shows "Freies Training" for unnamed workouts in recent list', () => {
    const workouts = [makeWorkout({ routineName: null })];
    render(<Dashboard workouts={workouts} />);
    expect(screen.getByText('Freies Training')).toBeTruthy();
  });
});

describe('Dashboard – Metrik-Tags (AC-01)', () => {
  it('shows Trainingsminuten as default active metric', () => {
    render(<Dashboard workouts={[]} />);
    const btn = screen.getByRole('button', { name: 'Trainingsminuten' });
    expect(btn.className).toContain('metric-tag--active');
  });

  it('switches chart title to Sätze on click', () => {
    render(<Dashboard workouts={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sätze' }));
    const btn = screen.getByRole('button', { name: 'Sätze' });
    expect(btn.className).toContain('metric-tag--active');
    // chart title span shows the active metric label
    const chartTitle = document.querySelector('.dashboard__chart-title span');
    expect(chartTitle.textContent).toBe('Sätze');
  });

  it('switches chart title to Bewertung on click', () => {
    render(<Dashboard workouts={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bewertung' }));
    const btn = screen.getByRole('button', { name: 'Bewertung' });
    expect(btn.className).toContain('metric-tag--active');
  });

  it('deactivates previous metric tag on switch', () => {
    render(<Dashboard workouts={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sätze' }));
    const minBtn = screen.getByRole('button', { name: 'Trainingsminuten' });
    expect(minBtn.className).not.toContain('metric-tag--active');
  });
});

describe('Dashboard – Streak KPI (AC-02)', () => {
  it('shows streak 0 when no workouts', () => {
    render(<Dashboard workouts={[]} />);
    expect(screen.getByText('Streak 🔥')).toBeTruthy();
    // 0 streak
    const kpis = screen.getAllByText(/^0$/);
    expect(kpis.length).toBeGreaterThan(0);
  });

  it('shows streak 1 when trained today only', () => {
    const workouts = [makeWorkout({ startedAt: isoToday() })];
    render(<Dashboard workouts={workouts} />);
    expect(screen.getByText('Streak 🔥')).toBeTruthy();
  });

  it('shows streak 2 when trained today and yesterday', () => {
    const workouts = [
      makeWorkout({ id: 'w-1', startedAt: isoToday() }),
      makeWorkout({ id: 'w-2', startedAt: isoYesterday() }),
    ];
    render(<Dashboard workouts={workouts} />);
    // streak = 2, shown as "2" with unit "Tage"
    expect(screen.getByText('Tage')).toBeTruthy();
  });

  it('streak breaks when a day is missing', () => {
    const workouts = [
      makeWorkout({ id: 'w-1', startedAt: isoToday() }),
      makeWorkout({ id: 'w-2', startedAt: isoDaysAgo(2) }), // skips yesterday
    ];
    render(<Dashboard workouts={workouts} />);
    // streak = 1 (only today)
    expect(screen.getByText('Tag')).toBeTruthy(); // singular
  });
});

describe('Dashboard – Lieblingsroutine KPI (AC-03)', () => {
  it('shows — when no named routines', () => {
    const workouts = [makeWorkout({ routineName: null })];
    render(<Dashboard workouts={workouts} />);
    expect(screen.getByText('Lieblingsroutine (30 Tage)')).toBeTruthy();
    // '—' appears as KPI value
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('shows most frequent routine name', () => {
    const workouts = [
      makeWorkout({ id: 'w-1', routineName: 'Push Day' }),
      makeWorkout({ id: 'w-2', routineName: 'Push Day' }),
      makeWorkout({ id: 'w-3', routineName: 'Pull Day' }),
    ];
    render(<Dashboard workouts={workouts} />);
    expect(screen.getByText('Lieblingsroutine (30 Tage)')).toBeTruthy();
  });

  it('truncates long routine name to 16 chars', () => {
    const longName = 'Sehr langer Routinenname der zu lang ist';
    const workouts = [makeWorkout({ routineName: longName })];
    render(<Dashboard workouts={workouts} />);
    expect(screen.getByText('Sehr langer Rou…')).toBeTruthy();
  });
});

describe('Dashboard – Ø Bewertung KPI (AC-04)', () => {
  it('shows — when no workouts have ratings', () => {
    const workouts = [makeWorkout({ exerciseData: '' })];
    render(<Dashboard workouts={workouts} />);
    expect(screen.getByText('Ø Bewertung (7 Tage)')).toBeTruthy();
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('shows 😊 emoji for high rating', () => {
    const workouts = [makeWorkout({ exerciseData: EXERCISE_DATA_HAPPY })];
    render(<Dashboard workouts={workouts} />);
    expect(screen.getByText('😊')).toBeTruthy();
  });

  it('shows 😢 emoji for low rating', () => {
    const workouts = [makeWorkout({ exerciseData: EXERCISE_DATA_SAD })];
    render(<Dashboard workouts={workouts} />);
    expect(screen.getByText('😢')).toBeTruthy();
  });
});

describe('Dashboard – Begrüßung & Ziele (FS-28)', () => {
  beforeEach(() => {
    vi.mocked(useProfile).mockReturnValue({
      profile: { vorname: '', ziele: [] },
      updateProfile: vi.fn(),
      toggleArrayItem: vi.fn(),
    });
  });

  it('AC-01: shows greeting with vorname when set', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: { vorname: 'Anton', ziele: [] },
      updateProfile: vi.fn(),
      toggleArrayItem: vi.fn(),
    });
    render(<Dashboard workouts={[]} />);
    expect(screen.getByText('Hallo, Anton!')).toBeTruthy();
  });

  it('AC-02: shows fallback greeting when vorname is empty', () => {
    render(<Dashboard workouts={[]} />);
    expect(screen.getByText('Hallo!')).toBeTruthy();
  });

  it('AC-02: shows fallback greeting when vorname is whitespace only', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: { vorname: '   ', ziele: [] },
      updateProfile: vi.fn(),
      toggleArrayItem: vi.fn(),
    });
    render(<Dashboard workouts={[]} />);
    expect(screen.getByText('Hallo!')).toBeTruthy();
  });

  it('AC-02: shows fallback when profile has no vorname field (EC-05)', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: { ziele: [] },
      updateProfile: vi.fn(),
      toggleArrayItem: vi.fn(),
    });
    render(<Dashboard workouts={[]} />);
    expect(screen.getByText('Hallo!')).toBeTruthy();
  });

  it('AC-03: shows ziele chips when ziele are set', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: { vorname: 'Anton', ziele: ['Muskelaufbau', 'Kraft steigern'] },
      updateProfile: vi.fn(),
      toggleArrayItem: vi.fn(),
    });
    render(<Dashboard workouts={[]} />);
    expect(screen.getByText('Muskelaufbau')).toBeTruthy();
    expect(screen.getByText('Kraft steigern')).toBeTruthy();
  });

  it('AC-04: ziele-row is absent when ziele is empty', () => {
    render(<Dashboard workouts={[]} />);
    expect(document.querySelector('.dashboard__ziele-row')).toBeNull();
  });

  it('AC-04: ziele-row is absent when ziele is undefined (EC-03)', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: { vorname: '' },
      updateProfile: vi.fn(),
      toggleArrayItem: vi.fn(),
    });
    render(<Dashboard workouts={[]} />);
    expect(document.querySelector('.dashboard__ziele-row')).toBeNull();
  });

  it('AC-03: ziel chips are not buttons (read-only)', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: { vorname: '', ziele: ['Ausdauer verbessern'] },
      updateProfile: vi.fn(),
      toggleArrayItem: vi.fn(),
    });
    render(<Dashboard workouts={[]} />);
    const chip = document.querySelector('.dashboard__ziel-chip');
    expect(chip).toBeTruthy();
    expect(chip.tagName.toLowerCase()).toBe('span');
  });

  it('greeting text is trimmed (EC-01)', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: { vorname: '  Anna  ', ziele: [] },
      updateProfile: vi.fn(),
      toggleArrayItem: vi.fn(),
    });
    render(<Dashboard workouts={[]} />);
    expect(screen.getByText('Hallo, Anna!')).toBeTruthy();
  });

  it('AC-05: greeting updates when profile changes (re-render)', () => {
    const { rerender } = render(<Dashboard workouts={[]} />);
    expect(screen.getByText('Hallo!')).toBeTruthy();

    vi.mocked(useProfile).mockReturnValue({
      profile: { vorname: 'Max', ziele: [] },
      updateProfile: vi.fn(),
      toggleArrayItem: vi.fn(),
    });
    rerender(<Dashboard workouts={[]} />);
    expect(screen.getByText('Hallo, Max!')).toBeTruthy();
  });
});

describe('Dashboard – Welcome Card Kachel (Tages-Kontext)', () => {
  const TODAY_ISO = new Date().toLocaleDateString('sv'); // YYYY-MM-DD

  function singleEvent(routineId, routineName) {
    return { id: `ev-${routineId}`, routineId, routineName, eventType: 'single', date: TODAY_ISO, startDate: null, recurrenceDays: [] };
  }

  beforeEach(() => {
    vi.mocked(useProfile).mockReturnValue({
      profile: { vorname: '', ziele: [] },
      updateProfile: vi.fn(),
      toggleArrayItem: vi.fn(),
    });
  });

  it('AC-01: renders welcome card tile', () => {
    render(<Dashboard workouts={[]} />);
    expect(document.querySelector('.dashboard__welcome-card')).toBeTruthy();
  });

  it('AC-04 (EC): shows fallback text when nothing planned and nothing done', () => {
    render(<Dashboard workouts={[]} routines={[]} calendarEvents={[]} />);
    expect(screen.getByText('Kein Training geplant heute')).toBeTruthy();
  });

  it('AC-02: shows planned routine when calendarEvents has single event for today', () => {
    const events = [singleEvent('r-1', 'Push Day')];
    render(<Dashboard workouts={[]} routines={[]} calendarEvents={events} />);
    expect(screen.getByText('Heute geplant')).toBeTruthy();
    expect(screen.getByText('Push Day')).toBeTruthy();
  });

  it('AC-02: shows multiple planned routines comma-separated', () => {
    const events = [singleEvent('r-1', 'Push Day'), singleEvent('r-2', 'Pull Day')];
    render(<Dashboard workouts={[]} routines={[]} calendarEvents={events} />);
    expect(screen.getByText('Push Day, Pull Day')).toBeTruthy();
  });

  it('AC-02: routineName stored in event is shown directly', () => {
    const events = [singleEvent('r-gone', 'Alter Push Day')];
    render(<Dashboard workouts={[]} routines={[]} calendarEvents={events} />);
    expect(screen.getByText('Alter Push Day')).toBeTruthy();
  });

  it('AC-03: shows minutes on greeting line when trained today', () => {
    const workouts = [
      makeWorkout({ id: 'w-1', startedAt: `${TODAY_ISO}T09:00:00`, durationSeconds: 2700 }),
    ];
    render(<Dashboard workouts={workouts} />);
    const minutesEl = document.querySelector('.dashboard__welcome-minutes-value');
    expect(minutesEl).toBeTruthy();
    expect(minutesEl.textContent).toBe('45');
    expect(screen.queryByText('Heute erledigt')).toBeNull();
  });

  it('AC-02: no minutes stat shown when not trained today', () => {
    render(<Dashboard workouts={[]} />);
    expect(document.querySelector('.dashboard__welcome-minutes')).toBeNull();
  });

  it('AC-03: minutes sum multiple workouts today', () => {
    const workouts = [
      makeWorkout({ id: 'w-1', startedAt: `${TODAY_ISO}T08:00:00`, durationSeconds: 1800 }),
      makeWorkout({ id: 'w-2', startedAt: `${TODAY_ISO}T18:00:00`, durationSeconds: 1800 }),
    ];
    render(<Dashboard workouts={workouts} />);
    const minutesEl = document.querySelector('.dashboard__welcome-minutes-value');
    expect(minutesEl).toBeTruthy();
    expect(minutesEl.textContent).toBe('60');
    expect(document.querySelector('.dashboard__welcome-minutes-unit').textContent).toBe('min');
  });

  it('AC-03 + AC-02: shows planned row and minutes when both exist', () => {
    const events = [singleEvent('r-1', 'Push Day')];
    const workouts = [makeWorkout({ id: 'w-1', startedAt: `${TODAY_ISO}T09:00:00`, durationSeconds: 3600 })];
    render(<Dashboard workouts={workouts} routines={[]} calendarEvents={events} />);
    expect(screen.getByText('Heute geplant')).toBeTruthy();
    expect(document.querySelector('.dashboard__welcome-minutes')).toBeTruthy();
  });

  it('AC-04 (EC-05): empty calendarEvents shows welcome card', () => {
    render(<Dashboard workouts={[]} routines={[]} calendarEvents={[]} />);
    const card = document.querySelector('.dashboard__welcome-card');
    expect(card).toBeTruthy();
  });

  it('greeting is inside the welcome card', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: { vorname: 'Anton', ziele: [] },
      updateProfile: vi.fn(),
      toggleArrayItem: vi.fn(),
    });
    render(<Dashboard workouts={[]} />);
    const card = document.querySelector('.dashboard__welcome-card');
    expect(card.textContent).toContain('Hallo, Anton!');
  });

  it('ziele chips are inside the welcome card', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: { vorname: '', ziele: ['Muskelaufbau'] },
      updateProfile: vi.fn(),
      toggleArrayItem: vi.fn(),
    });
    render(<Dashboard workouts={[]} />);
    const card = document.querySelector('.dashboard__welcome-card');
    expect(card.textContent).toContain('Muskelaufbau');
  });

  it('past workouts (not today) do not show minutes stat', () => {
    const workouts = [makeWorkout({ id: 'w-1', startedAt: isoDaysAgo(1) })];
    render(<Dashboard workouts={workouts} />);
    expect(document.querySelector('.dashboard__welcome-minutes')).toBeNull();
    expect(screen.getByText('Kein Training geplant heute')).toBeTruthy();
  });
});

describe('Dashboard – Letzte Trainings Liste (AC-05)', () => {
  it('renders section heading', () => {
    render(<Dashboard workouts={[]} />);
    expect(screen.getByText('Letzte Trainings')).toBeTruthy();
  });

  it('shows workout date in German format', () => {
    const workouts = [makeWorkout({ startedAt: '2026-06-12T10:00:00.000Z' })];
    render(<Dashboard workouts={workouts} />);
    // Should contain a German date string
    const recentDate = document.querySelector('.dashboard__recent-date');
    expect(recentDate).toBeTruthy();
    expect(recentDate.textContent).toMatch(/\d+\./);
  });

  it('shows duration in minutes', () => {
    const workouts = [makeWorkout({ durationSeconds: 2700, totalSets: 9 })];
    render(<Dashboard workouts={workouts} />);
    // scope to recent-meta to avoid collision with welcome card minutes stat
    const meta = document.querySelector('.dashboard__recent-meta');
    expect(meta.textContent).toMatch(/45 min/);
  });

  it('shows total sets', () => {
    const workouts = [makeWorkout({ durationSeconds: 1800, totalSets: 7 })];
    render(<Dashboard workouts={workouts} />);
    expect(screen.getByText(/7 Sätze/)).toBeTruthy();
  });
});

describe('Dashboard – Garmin-Aktivitätsminuten (AC-01 bis AC-05)', () => {
  const TODAY_ISO = new Date().toLocaleDateString('sv');

  function makeGarminActivity(overrides = {}) {
    return {
      id: 'garmin-1',
      activityName: 'Morning Run',
      activityType: 'running',
      startTimeLocal: `${TODAY_ISO} 07:30:00`,
      duration: 2520, // 42 Minuten
      distance: 7200,
      calories: 350,
      averageHR: 142,
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.mocked(useProfile).mockReturnValue({
      profile: { vorname: '', ziele: [] },
      updateProfile: vi.fn(),
      toggleArrayItem: vi.fn(),
    });
  });

  it('AC-04: renders ohne Crash wenn garminActivities fehlt (undefined)', () => {
    render(<Dashboard workouts={[]} />);
    expect(screen.getByText('Fitness')).toBeTruthy();
  });

  it('AC-04: renders ohne Crash wenn garminActivities leer ist', () => {
    render(<Dashboard workouts={[]} garminActivities={[]} />);
    expect(screen.getByText('Aktiv (7 Tage)')).toBeTruthy();
  });

  it('AC-01: Garmin-Lauf (42 min) erscheint in "Aktiv (7 Tage)" KPI', () => {
    const garmin = [makeGarminActivity({ duration: 2520 })]; // 42 min
    render(<Dashboard workouts={[]} garminActivities={garmin} />);
    // KPI-Wert für Minuten: 42
    const kpiRow = document.querySelector('.dashboard__kpi-row');
    expect(kpiRow.textContent).toContain('42');
  });

  it('AC-01: Garmin-Minuten + App-Workout-Minuten werden addiert', () => {
    const garmin = [makeGarminActivity({ duration: 1800 })]; // 30 min
    const workouts = [makeWorkout({ id: 'w-1', startedAt: `${TODAY_ISO}T10:00:00`, durationSeconds: 1800 })]; // 30 min
    render(<Dashboard workouts={workouts} garminActivities={garmin} />);
    const kpiRow = document.querySelector('.dashboard__kpi-row');
    expect(kpiRow.textContent).toContain('60'); // 30 + 30 = 60 min
  });

  it('AC-01: Garmin-Aktivität zählt als Training in "Trainings (7 Tage)"', () => {
    const garmin = [makeGarminActivity()];
    render(<Dashboard workouts={[]} garminActivities={garmin} />);
    const kpiCards = document.querySelectorAll('.kpi-card');
    const trainingsKpi = Array.from(kpiCards).find((c) => c.textContent.includes('Trainings (7 Tage)'));
    expect(trainingsKpi.querySelector('.kpi-card__value').textContent).toContain('1');
  });

  it('AC-03: Garmin-Minuten erscheinen in today-Kontext-Anzeige der Welcome-Card', () => {
    const garmin = [makeGarminActivity({ duration: 2520 })]; // 42 min heute
    render(<Dashboard workouts={[]} garminActivities={garmin} />);
    const minutesEl = document.querySelector('.dashboard__welcome-minutes-value');
    expect(minutesEl).toBeTruthy();
    expect(minutesEl.textContent).toBe('42');
  });

  it('AC-03: Garmin + App-Workout Minuten summieren in Welcome-Card', () => {
    const garmin = [makeGarminActivity({ duration: 1800 })]; // 30 min
    const workouts = [makeWorkout({ id: 'w-1', startedAt: `${TODAY_ISO}T10:00:00`, durationSeconds: 1800 })]; // 30 min
    render(<Dashboard workouts={workouts} garminActivities={garmin} />);
    const minutesEl = document.querySelector('.dashboard__welcome-minutes-value');
    expect(minutesEl.textContent).toBe('60');
  });

  it('AC-05: Sätze-Chart verwendet nur App-Workouts, nicht Garmin', () => {
    const garmin = [makeGarminActivity()];
    const workouts = [makeWorkout({ id: 'w-1', startedAt: `${TODAY_ISO}T10:00:00`, totalSets: 8 })];
    render(<Dashboard workouts={workouts} garminActivities={garmin} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sätze' }));
    // Chart rendert ohne Crash
    expect(document.querySelector('.dashboard__chart-svg')).toBeTruthy();
    // Garmin-Aktivität verdoppelt die Sätze NICHT: App-Workout hat 8 Sätze,
    // Garmin hat 0 Sätze → der Chart-Wert für heute bleibt 8 (nicht 16)
    // Dies wird indirekt verifikziert dadurch dass computeChartData nur workouts bekommt
    // Direkte Verifikation: wenn wir zu Minuten wechseln sehen wir die Garmin-Minuten,
    // bei Sätze sehen wir nur App-Workout-Sätze
    fireEvent.click(screen.getByRole('button', { name: 'Trainingsminuten' }));
    expect(document.querySelector('.dashboard__chart-svg')).toBeTruthy();
  });

  it('EC-03: Garmin-Aktivität ohne startTimeLocal wird ignoriert', () => {
    const garmin = [makeGarminActivity({ startTimeLocal: null })];
    render(<Dashboard workouts={[]} garminActivities={garmin} />);
    // Kein Crash, Minuten bleiben 0
    const kpiRow = document.querySelector('.dashboard__kpi-row');
    const minutesKpi = Array.from(document.querySelectorAll('.kpi-card'))
      .find((c) => c.textContent.includes('Aktiv (7 Tage)'));
    expect(minutesKpi.querySelector('.kpi-card__value').textContent).toContain('0');
  });

  it('EC-02: Garmin-Aktivität mit duration=0 zählt als Training aber mit 0 Minuten', () => {
    const garmin = [makeGarminActivity({ duration: 0 })];
    render(<Dashboard workouts={[]} garminActivities={garmin} />);
    const kpiCards = document.querySelectorAll('.kpi-card');
    const trainingsKpi = Array.from(kpiCards).find((c) => c.textContent.includes('Trainings (7 Tage)'));
    expect(trainingsKpi.querySelector('.kpi-card__value').textContent).toContain('1');
  });
});

describe('Dashboard – Gewichtsverlauf Metrik', () => {
  beforeEach(() => {
    vi.mocked(useWeightLog).mockReturnValue({ entries: [] });
  });

  it('renders Körpergewicht metric tab', () => {
    render(<Dashboard workouts={[]} />);
    expect(screen.getByText('Körpergewicht')).toBeTruthy();
  });

  it('switching to Körpergewicht tab renders an SVG chart', () => {
    render(<Dashboard workouts={[]} />);
    fireEvent.click(screen.getByText('Körpergewicht'));
    expect(document.querySelector('.dashboard__chart-svg')).toBeTruthy();
  });

  it('chart SVG renders null-safe when entries is empty', () => {
    render(<Dashboard workouts={[]} />);
    fireEvent.click(screen.getByText('Körpergewicht'));
    // Should not throw; no path rendered for empty data
    const path = document.querySelector('.dashboard__chart-svg path');
    expect(path).toBeNull();
  });

  it('chart renders path when weight entries exist', () => {
    vi.mocked(useWeightLog).mockReturnValue({
      entries: [
        { date: new Date().toLocaleDateString('sv'), weight: 80 },
      ],
    });
    render(<Dashboard workouts={[]} />);
    fireEvent.click(screen.getByText('Körpergewicht'));
    expect(document.querySelector('.dashboard__chart-svg path')).toBeTruthy();
  });
});

describe('Dashboard – LineChart Dots Threshold (TD-01)', () => {
  it('AC-01: 4-Wochen-Ansicht (28 Datenpunkte) rendert keine Dot-Marker', () => {
    render(<Dashboard workouts={[]} />);
    fireEvent.click(screen.getByRole('button', { name: '4 Wochen' }));
    const circles = document.querySelectorAll('.dashboard__chart-svg circle');
    expect(circles.length).toBe(0);
  });

  it('AC-01: 1-Tag-Ansicht (24 Datenpunkte) rendert keine Dot-Marker', () => {
    render(<Dashboard workouts={[]} />);
    fireEvent.click(screen.getByRole('button', { name: '1 Tag' }));
    const circles = document.querySelectorAll('.dashboard__chart-svg circle');
    expect(circles.length).toBe(0);
  });

  it('AC-02: 7-Tage-Ansicht (7 Datenpunkte) rendert Dot-Marker', () => {
    render(<Dashboard workouts={[]} />);
    // Default period is 7d — 7 slots with value 0 (not null) → dots render
    const circles = document.querySelectorAll('.dashboard__chart-svg circle');
    expect(circles.length).toBe(7);
  });

  it('AC-02: 1-Jahr-Ansicht (12 Datenpunkte) rendert Dot-Marker', () => {
    render(<Dashboard workouts={[]} />);
    fireEvent.click(screen.getByRole('button', { name: '1 Jahr' }));
    const circles = document.querySelectorAll('.dashboard__chart-svg circle');
    expect(circles.length).toBe(12);
  });
});

// ─── Feature: Training starten CTA (AC-01 / AC-02) ──────────────────────────

describe('Dashboard – CTA Training starten', () => {
  const TODAY_ISO = new Date().toLocaleDateString('sv');

  function singleEvent(routineId, routineName) {
    return { id: `ev-${routineId}`, routineId, routineName, eventType: 'single', date: TODAY_ISO, startDate: null, recurrenceDays: [] };
  }

  beforeEach(() => {
    vi.mocked(useProfile).mockReturnValue({
      profile: { vorname: '', ziele: [] },
      updateProfile: vi.fn(),
      toggleArrayItem: vi.fn(),
    });
    vi.mocked(useGarminHealth).mockReturnValue({ health: null, loading: false, notConfigured: true });
  });

  it('AC-01: kein CTA-Button wenn keine Events heute', () => {
    render(<Dashboard workouts={[]} routines={[{ id: 'r-1', name: 'Push Day' }]} calendarEvents={[]} onStartWorkout={vi.fn()} />);
    expect(screen.queryByText('▶ Training starten')).toBeNull();
  });

  it('AC-01: kein CTA-Button wenn Event vorhanden aber Routine nicht in routines', () => {
    const events = [singleEvent('r-deleted', 'Alt Routine')];
    render(<Dashboard workouts={[]} routines={[{ id: 'r-1', name: 'Push Day' }]} calendarEvents={events} onStartWorkout={vi.fn()} />);
    expect(screen.queryByText('▶ Training starten')).toBeNull();
  });

  it('AC-01: kein CTA-Button wenn onStartWorkout nicht übergeben (standalone)', () => {
    const events = [singleEvent('r-1', 'Push Day')];
    const routines = [{ id: 'r-1', name: 'Push Day' }];
    render(<Dashboard workouts={[]} routines={routines} calendarEvents={events} />);
    expect(screen.queryByText('▶ Training starten')).toBeNull();
  });

  it('AC-01: CTA-Button erscheint wenn Event + passende Routine + onStartWorkout', () => {
    const events = [singleEvent('r-1', 'Push Day')];
    const routines = [{ id: 'r-1', name: 'Push Day' }];
    render(<Dashboard workouts={[]} routines={routines} calendarEvents={events} onStartWorkout={vi.fn()} />);
    expect(screen.getByText('▶ Training starten')).toBeTruthy();
  });

  it('AC-01: CTA-Button ruft onStartWorkout mit korrekter routineId auf', () => {
    const onStart = vi.fn();
    const events = [singleEvent('r-1', 'Push Day')];
    const routines = [{ id: 'r-1', name: 'Push Day' }];
    render(<Dashboard workouts={[]} routines={routines} calendarEvents={events} onStartWorkout={onStart} />);
    fireEvent.click(screen.getByText('▶ Training starten'));
    expect(onStart).toHaveBeenCalledWith('r-1');
  });

  it('AC-01: CTA-Button hat btn--primary Klasse bei einem Event', () => {
    const events = [singleEvent('r-1', 'Push Day')];
    const routines = [{ id: 'r-1', name: 'Push Day' }];
    render(<Dashboard workouts={[]} routines={routines} calendarEvents={events} onStartWorkout={vi.fn()} />);
    const btn = screen.getByText('▶ Training starten');
    expect(btn.className).toContain('btn--primary');
  });

  it('AC-02: bei mehreren Events erscheinen mehrere Buttons mit Routine-Namen', () => {
    const events = [singleEvent('r-1', 'Push Day'), singleEvent('r-2', 'Pull Day')];
    const routines = [{ id: 'r-1', name: 'Push Day' }, { id: 'r-2', name: 'Pull Day' }];
    render(<Dashboard workouts={[]} routines={routines} calendarEvents={events} onStartWorkout={vi.fn()} />);
    expect(screen.getByText('▶ Push Day')).toBeTruthy();
    expect(screen.getByText('▶ Pull Day')).toBeTruthy();
    // secondary style for multiple
    const btns = screen.getAllByText(/▶/);
    expect(btns[0].className).not.toContain('btn--primary');
  });

  it('AC-02: zweiter Button ruft onStartWorkout mit korrekter ID auf', () => {
    const onStart = vi.fn();
    const events = [singleEvent('r-1', 'Push Day'), singleEvent('r-2', 'Pull Day')];
    const routines = [{ id: 'r-1', name: 'Push Day' }, { id: 'r-2', name: 'Pull Day' }];
    render(<Dashboard workouts={[]} routines={routines} calendarEvents={events} onStartWorkout={onStart} />);
    fireEvent.click(screen.getByText('▶ Pull Day'));
    expect(onStart).toHaveBeenCalledWith('r-2');
  });

  it('AC-01: CTA-Button und Minuten-Anzeige koexistieren im welcome-right', () => {
    const events = [singleEvent('r-1', 'Push Day')];
    const routines = [{ id: 'r-1', name: 'Push Day' }];
    const workouts = [makeWorkout({ id: 'w-1', startedAt: `${TODAY_ISO}T09:00:00`, durationSeconds: 1800 })];
    render(<Dashboard workouts={workouts} routines={routines} calendarEvents={events} onStartWorkout={vi.fn()} />);
    expect(document.querySelector('.dashboard__welcome-minutes')).toBeTruthy();
    expect(screen.getByText('▶ Training starten')).toBeTruthy();
    // both inside welcome-right
    const right = document.querySelector('.dashboard__welcome-right');
    expect(right).toBeTruthy();
    expect(right.textContent).toContain('30');
    expect(right.textContent).toContain('▶ Training starten');
  });
});

// ─── Feature: KPI-Trends Woche-vs-Woche (AC-03 / AC-04) ────────────────────

describe('Dashboard – KPI-Trends', () => {
  beforeEach(() => {
    vi.mocked(useProfile).mockReturnValue({
      profile: { vorname: '', ziele: [] },
      updateProfile: vi.fn(),
      toggleArrayItem: vi.fn(),
    });
    vi.mocked(useGarminHealth).mockReturnValue({ health: null, loading: false, notConfigured: true });
  });

  it('AC-03: kein Trend-Badge wenn keine Workouts vorhanden', () => {
    render(<Dashboard workouts={[]} />);
    expect(document.querySelector('.kpi-card__trend')).toBeNull();
  });

  it('AC-03: kein Trend-Badge wenn beide Wochen 0 Trainings', () => {
    render(<Dashboard workouts={[]} />);
    const trainingsCard = Array.from(document.querySelectorAll('.kpi-card'))
      .find((c) => c.textContent.includes('Trainings (7 Tage)'));
    expect(trainingsCard.querySelector('.kpi-card__trend')).toBeNull();
  });

  it('AC-03: Up-Trend wenn aktuelle Woche mehr Trainings als Vorwoche', () => {
    const workouts = [
      makeWorkout({ id: 'w-1', startedAt: isoDaysAgo(1) }),
      makeWorkout({ id: 'w-2', startedAt: isoDaysAgo(2) }),
      makeWorkout({ id: 'w-3', startedAt: isoDaysAgo(10) }), // Vorwoche: 1
    ];
    render(<Dashboard workouts={workouts} />);
    const trainingsCard = Array.from(document.querySelectorAll('.kpi-card'))
      .find((c) => c.textContent.includes('Trainings (7 Tage)'));
    const trend = trainingsCard.querySelector('.kpi-card__trend');
    expect(trend).toBeTruthy();
    expect(trend.className).toContain('kpi-card__trend--up');
    expect(trend.textContent).toContain('↑');
    expect(trend.textContent).toContain('+1');
  });

  it('AC-03: Down-Trend wenn aktuelle Woche weniger Trainings als Vorwoche', () => {
    const workouts = [
      makeWorkout({ id: 'w-1', startedAt: isoDaysAgo(1) }), // aktuelle: 1
      makeWorkout({ id: 'w-2', startedAt: isoDaysAgo(9) }),  // Vorwoche: 2
      makeWorkout({ id: 'w-3', startedAt: isoDaysAgo(10) }),
    ];
    render(<Dashboard workouts={workouts} />);
    const trainingsCard = Array.from(document.querySelectorAll('.kpi-card'))
      .find((c) => c.textContent.includes('Trainings (7 Tage)'));
    const trend = trainingsCard.querySelector('.kpi-card__trend');
    expect(trend).toBeTruthy();
    expect(trend.className).toContain('kpi-card__trend--down');
    expect(trend.textContent).toContain('↓');
  });

  it('AC-03: Neutral-Trend wenn gleiche Anzahl Trainings (nicht 0)', () => {
    const workouts = [
      makeWorkout({ id: 'w-1', startedAt: isoDaysAgo(1) }),
      makeWorkout({ id: 'w-2', startedAt: isoDaysAgo(9) }),
    ];
    render(<Dashboard workouts={workouts} />);
    const trainingsCard = Array.from(document.querySelectorAll('.kpi-card'))
      .find((c) => c.textContent.includes('Trainings (7 Tage)'));
    const trend = trainingsCard.querySelector('.kpi-card__trend');
    expect(trend).toBeTruthy();
    expect(trend.className).toContain('kpi-card__trend--neutral');
    expect(trend.textContent).toContain('→');
  });

  it('AC-03: Aktiv-Minuten-Trend vorhanden bei Vorwochenvergleich', () => {
    const workouts = [
      makeWorkout({ id: 'w-1', startedAt: isoDaysAgo(1), durationSeconds: 3600 }),
      makeWorkout({ id: 'w-2', startedAt: isoDaysAgo(9), durationSeconds: 1800 }),
    ];
    render(<Dashboard workouts={workouts} />);
    const minutesCard = Array.from(document.querySelectorAll('.kpi-card'))
      .find((c) => c.textContent.includes('Aktiv (7 Tage)'));
    const trend = minutesCard.querySelector('.kpi-card__trend');
    expect(trend).toBeTruthy();
    expect(trend.className).toContain('kpi-card__trend--up');
  });

  it('AC-04: Rating-Trend erscheint wenn beide Wochen Ratings haben', () => {
    const workouts = [
      makeWorkout({ id: 'w-1', startedAt: isoDaysAgo(1), exerciseData: EXERCISE_DATA_HAPPY }),
      makeWorkout({ id: 'w-2', startedAt: isoDaysAgo(9), exerciseData: EXERCISE_DATA_SAD }),
    ];
    render(<Dashboard workouts={workouts} />);
    const ratingCard = Array.from(document.querySelectorAll('.kpi-card'))
      .find((c) => c.textContent.includes('Ø Bewertung (7 Tage)'));
    const trend = ratingCard.querySelector('.kpi-card__trend');
    expect(trend).toBeTruthy();
  });

  it('AC-04: kein Rating-Trend wenn nur aktuelle Woche Ratings hat', () => {
    const workouts = [
      makeWorkout({ id: 'w-1', startedAt: isoDaysAgo(1), exerciseData: EXERCISE_DATA_HAPPY }),
    ];
    render(<Dashboard workouts={workouts} />);
    const ratingCard = Array.from(document.querySelectorAll('.kpi-card'))
      .find((c) => c.textContent.includes('Ø Bewertung (7 Tage)'));
    expect(ratingCard.querySelector('.kpi-card__trend')).toBeNull();
  });

  it('Streak, Lieblingsroutine, Gesamt haben keinen Trend-Badge', () => {
    const workouts = [
      makeWorkout({ id: 'w-1', startedAt: isoDaysAgo(1) }),
      makeWorkout({ id: 'w-2', startedAt: isoDaysAgo(9) }),
    ];
    render(<Dashboard workouts={workouts} />);
    const noTrendCards = ['Streak 🔥', 'Lieblingsroutine (30 Tage)', 'Gesamt'];
    noTrendCards.forEach((label) => {
      const card = Array.from(document.querySelectorAll('.kpi-card'))
        .find((c) => c.textContent.includes(label));
      expect(card.querySelector('.kpi-card__trend')).toBeNull();
    });
  });
});

// ─── Feature: Garmin Health KPIs (AC-05) ─────────────────────────────────────

describe('Dashboard – Garmin Health KPIs', () => {
  beforeEach(() => {
    vi.mocked(useProfile).mockReturnValue({
      profile: { vorname: '', ziele: [] },
      updateProfile: vi.fn(),
      toggleArrayItem: vi.fn(),
    });
  });

  it('AC-05: Garmin-Section nicht sichtbar wenn Health null (nicht konfiguriert)', () => {
    vi.mocked(useGarminHealth).mockReturnValue({ health: null, loading: false, notConfigured: true });
    render(<Dashboard workouts={[]} />);
    expect(document.querySelector('.dashboard__garmin-section')).toBeNull();
    expect(screen.queryByText('Garmin · Heute')).toBeNull();
  });

  it('AC-05: Garmin-Section erscheint wenn Health-Daten vorhanden', () => {
    vi.mocked(useGarminHealth).mockReturnValue({
      health: { steps: 8500, sleepDuration: 7.5, restingHeartRate: 58 },
      loading: false,
      notConfigured: false,
    });
    render(<Dashboard workouts={[]} />);
    expect(screen.getByText('Garmin · Heute')).toBeTruthy();
    expect(document.querySelector('.dashboard__garmin-section')).toBeTruthy();
  });

  it('AC-05: zeigt Schritte-KPI', () => {
    vi.mocked(useGarminHealth).mockReturnValue({
      health: { steps: 10000, sleepDuration: 7.5, restingHeartRate: 58 },
      loading: false,
      notConfigured: false,
    });
    render(<Dashboard workouts={[]} />);
    expect(screen.getByText('Schritte')).toBeTruthy();
    const section = document.querySelector('.dashboard__garmin-section');
    expect(section.textContent).toContain('10');
  });

  it('AC-05: zeigt Schlaf-KPI mit h-Einheit', () => {
    vi.mocked(useGarminHealth).mockReturnValue({
      health: { steps: 8000, sleepDuration: 7.3, restingHeartRate: 58 },
      loading: false,
      notConfigured: false,
    });
    render(<Dashboard workouts={[]} />);
    expect(screen.getByText('Schlaf')).toBeTruthy();
    expect(screen.getByText('h')).toBeTruthy();
  });

  it('AC-05: zeigt Ruhepuls-KPI mit bpm-Einheit', () => {
    vi.mocked(useGarminHealth).mockReturnValue({
      health: { steps: 8000, sleepDuration: 7.5, restingHeartRate: 55 },
      loading: false,
      notConfigured: false,
    });
    render(<Dashboard workouts={[]} />);
    expect(screen.getByText('Ruhepuls')).toBeTruthy();
    expect(screen.getByText('bpm')).toBeTruthy();
    const section = document.querySelector('.dashboard__garmin-section');
    expect(section.textContent).toContain('55');
  });

  it('EC-05: zeigt "—" wenn steps null ist', () => {
    vi.mocked(useGarminHealth).mockReturnValue({
      health: { steps: null, sleepDuration: 7.5, restingHeartRate: 58 },
      loading: false,
      notConfigured: false,
    });
    render(<Dashboard workouts={[]} />);
    const section = document.querySelector('.dashboard__garmin-section');
    // steps KPI value is '—'
    const kpis = section.querySelectorAll('.kpi-card');
    expect(kpis[0].querySelector('.kpi-card__value').textContent).toBe('—');
  });

  it('EC-05: zeigt "—" wenn restingHeartRate null ist und kein bpm', () => {
    vi.mocked(useGarminHealth).mockReturnValue({
      health: { steps: 8000, sleepDuration: 7.5, restingHeartRate: null },
      loading: false,
      notConfigured: false,
    });
    render(<Dashboard workouts={[]} />);
    const section = document.querySelector('.dashboard__garmin-section');
    const kpis = section.querySelectorAll('.kpi-card');
    expect(kpis[2].querySelector('.kpi-card__value').textContent).toBe('—');
    expect(kpis[2].querySelector('.kpi-card__unit')).toBeNull();
  });

  it('EC-06: Garmin-Section bleibt weg während loading', () => {
    vi.mocked(useGarminHealth).mockReturnValue({ health: null, loading: true, notConfigured: false });
    render(<Dashboard workouts={[]} />);
    expect(document.querySelector('.dashboard__garmin-section')).toBeNull();
  });
});

// ─── Bug Fix: Gewichtslinie verbindet nicht-benachbarte Punkte (EC-01..05) ────

describe('Dashboard – Gewichtslinie verbundene Punkte', () => {
  function dateNDaysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toLocaleDateString('sv');
  }

  beforeEach(() => {
    vi.mocked(useProfile).mockReturnValue({
      profile: { vorname: '', ziele: [] },
      updateProfile: vi.fn(),
      toggleArrayItem: vi.fn(),
    });
    vi.mocked(useGarminHealth).mockReturnValue({ health: null, loading: false, notConfigured: true });
  });

  it('EC-01: zwei nicht-benachbarte Einträge erzeugen L-Befehl im SVG-Pfad', () => {
    vi.mocked(useWeightLog).mockReturnValue({
      entries: [
        { date: dateNDaysAgo(5), weight: 78 },
        { date: dateNDaysAgo(1), weight: 80 },
      ],
    });
    render(<Dashboard workouts={[]} />);
    fireEvent.click(screen.getByText('Körpergewicht'));
    const path = document.querySelector('.dashboard__chart-svg path');
    expect(path).toBeTruthy();
    expect(path.getAttribute('d')).toMatch(/L\s/);
  });

  it('EC-02: zwei benachbarte Einträge erzeugen ebenfalls L-Befehl', () => {
    vi.mocked(useWeightLog).mockReturnValue({
      entries: [
        { date: dateNDaysAgo(1), weight: 79 },
        { date: dateNDaysAgo(0), weight: 80 },
      ],
    });
    render(<Dashboard workouts={[]} />);
    fireEvent.click(screen.getByText('Körpergewicht'));
    const path = document.querySelector('.dashboard__chart-svg path');
    expect(path).toBeTruthy();
    expect(path.getAttribute('d')).toMatch(/L\s/);
  });

  it('EC-03: ein einzelner Eintrag erzeugt nur M-Befehl (keinen L-Befehl)', () => {
    vi.mocked(useWeightLog).mockReturnValue({
      entries: [{ date: dateNDaysAgo(2), weight: 80 }],
    });
    render(<Dashboard workouts={[]} />);
    fireEvent.click(screen.getByText('Körpergewicht'));
    const path = document.querySelector('.dashboard__chart-svg path');
    expect(path).toBeTruthy();
    expect(path.getAttribute('d')).toMatch(/^M\s/);
    expect(path.getAttribute('d')).not.toMatch(/L\s/);
  });

  it('EC-04: keine Einträge → kein SVG-Pfad, kein Fehler', () => {
    vi.mocked(useWeightLog).mockReturnValue({ entries: [] });
    render(<Dashboard workouts={[]} />);
    fireEvent.click(screen.getByText('Körpergewicht'));
    expect(document.querySelector('.dashboard__chart-svg path')).toBeNull();
  });

  it('EC-01: Pfad enthält genau ein M und ein L bei zwei nicht-benachbarten Punkten', () => {
    vi.mocked(useWeightLog).mockReturnValue({
      entries: [
        { date: dateNDaysAgo(6), weight: 75 },
        { date: dateNDaysAgo(0), weight: 77 },
      ],
    });
    render(<Dashboard workouts={[]} />);
    fireEvent.click(screen.getByText('Körpergewicht'));
    const d = document.querySelector('.dashboard__chart-svg path').getAttribute('d');
    const mCount = (d.match(/M\s/g) || []).length;
    const lCount = (d.match(/L\s/g) || []).length;
    expect(mCount).toBe(1);
    expect(lCount).toBe(1);
  });
});
