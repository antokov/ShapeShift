import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CoachView from './CoachView.jsx';

vi.mock('../hooks/useProfile.js', () => ({
  useProfile: vi.fn(() => ({
    profile: { vorname: 'Anton', ziele: ['Muskelaufbau'], erfahrungsstufe: 'Fortgeschrittener', equipment: [] },
  })),
}));

vi.mock('../hooks/useWeightLog.js', () => ({
  useWeightLog: vi.fn(() => ({ entries: [] })),
}));

vi.mock('../utils/exportData.js', () => ({
  fetchGarminHealth: vi.fn(() => Promise.resolve(null)),
  fetchGarminHealthHistory: vi.fn(() => Promise.resolve({ steps: null, restingHeartRate: null, bodyBattery: null })),
  fetchGarminHRV: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../utils/uuid.js', () => ({
  generateId: vi.fn(() => 'test-uuid-' + Math.random()),
}));

const TODAY = new Date();
function isoDaysAgo(n, h = 10) {
  const d = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - n, h, 0, 0);
  return d.toISOString();
}

function makeWorkout(overrides = {}) {
  return {
    id: 'w-1', routineId: 'r-1', routineName: 'Push Day',
    startedAt: isoDaysAgo(1), durationSeconds: 3600, totalSets: 12,
    notes: '', exerciseData: '', ...overrides,
  };
}

const FAKE_REPORT = `## 📊 Zusammenfassung\nDu hast in den letzten 4 Wochen gut trainiert.\n\n## 💪 Stärken & Fortschritte\nRegelmäßige Einheiten sind erkennbar.`;

const mockFetch = vi.fn();
beforeEach(() => {
  global.fetch = mockFetch;
  localStorage.clear();
});
afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

/* Helper: generate a report → auto-opens in detail view */
async function generateReport(fakeReport = FAKE_REPORT) {
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ report: fakeReport }) });
  render(<CoachView />);
  fireEvent.click(screen.getByRole('button', { name: 'Zwischenbericht erstellen' }));
  await waitFor(() => expect(document.querySelector('.coach-section-card')).toBeTruthy());
}

/* ══════════════════════════════════════════════════════════
   Rendering — Page Layout
   ══════════════════════════════════════════════════════════ */

describe('CoachView – Rendering', () => {
  it('shows page title "Mein Coach"', () => {
    render(<CoachView />);
    expect(screen.getByText('Mein Coach')).toBeTruthy();
  });

  it('shows subtitle "KI-Trainingsanalyse"', () => {
    render(<CoachView />);
    expect(screen.getByText('KI-Trainingsanalyse')).toBeTruthy();
  });

  it('has .coach-page as root element', () => {
    render(<CoachView />);
    expect(document.querySelector('.coach-page')).toBeTruthy();
  });

  it('renders without props (all defaults)', () => {
    render(<CoachView />);
    expect(screen.getByText('Mein Coach')).toBeTruthy();
  });

  it('no chat textarea visible', () => {
    render(<CoachView />);
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('no "Frage senden" button', () => {
    render(<CoachView />);
    expect(screen.queryByRole('button', { name: 'Frage senden' })).toBeNull();
  });

  it('shows "Zwischenbericht erstellen" as primary CTA button', () => {
    render(<CoachView />);
    expect(screen.getByRole('button', { name: 'Zwischenbericht erstellen' })).toBeTruthy();
  });
});

/* ══════════════════════════════════════════════════════════
   Empty State
   ══════════════════════════════════════════════════════════ */

describe('CoachView – Empty State', () => {
  it('shows empty state when no reports', () => {
    render(<CoachView />);
    expect(document.querySelector('.coach-page__empty')).toBeTruthy();
  });

  it('shows "Noch kein Bericht" in empty state', () => {
    render(<CoachView />);
    expect(screen.getByText('Noch kein Bericht')).toBeTruthy();
  });

  it('empty state disappears after report is generated', async () => {
    await generateReport();
    expect(document.querySelector('.coach-page__empty')).toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════
   Overview List (AC-01)
   ══════════════════════════════════════════════════════════ */

describe('CoachView – Übersichtsliste (AC-01)', () => {
  it('shows .coach-report-list-item when reports exist in localStorage', () => {
    const reports = [{ id: 'r1', createdAt: new Date().toISOString(), text: '## Kapitel 1\nInhalt.' }];
    localStorage.setItem('fitnessapp_admin_coach_reports', JSON.stringify(reports));
    render(<CoachView />);
    expect(document.querySelector('.coach-report-list-item')).toBeTruthy();
  });

  it('shows one list item per report', () => {
    const reports = [
      { id: 'r1', createdAt: new Date().toISOString(), text: '## A\nText.' },
      { id: 'r2', createdAt: new Date(Date.now() - 86400000).toISOString(), text: '## B\nText.' },
    ];
    localStorage.setItem('fitnessapp_admin_coach_reports', JSON.stringify(reports));
    render(<CoachView />);
    expect(document.querySelectorAll('.coach-report-list-item').length).toBe(2);
  });

  it('list item shows first chapter title as preview', () => {
    const reports = [{ id: 'r1', createdAt: new Date().toISOString(), text: '## Zusammenfassung\nText.' }];
    localStorage.setItem('fitnessapp_admin_coach_reports', JSON.stringify(reports));
    render(<CoachView />);
    expect(screen.getByText('Zusammenfassung')).toBeTruthy();
  });

  it('list item shows chapter count', () => {
    const reports = [{ id: 'r1', createdAt: new Date().toISOString(), text: '## A\nText.\n## B\nText.' }];
    localStorage.setItem('fitnessapp_admin_coach_reports', JSON.stringify(reports));
    render(<CoachView />);
    expect(screen.getByText('2 Kapitel')).toBeTruthy();
  });

  it('list item has "Bericht öffnen" aria-label', () => {
    const reports = [{ id: 'r1', createdAt: new Date().toISOString(), text: '## A\nText.' }];
    localStorage.setItem('fitnessapp_admin_coach_reports', JSON.stringify(reports));
    render(<CoachView />);
    expect(screen.getByRole('button', { name: 'Bericht öffnen' })).toBeTruthy();
  });
});

/* ══════════════════════════════════════════════════════════
   Detail View Navigation (AC-02, AC-03)
   ══════════════════════════════════════════════════════════ */

describe('CoachView – Detailansicht Navigation (AC-02, AC-03)', () => {
  it('AC-02: clicking list item opens detail view (.coach-detail)', () => {
    const reports = [{ id: 'r1', createdAt: new Date().toISOString(), text: '## Kapitel\nText.' }];
    localStorage.setItem('fitnessapp_admin_coach_reports', JSON.stringify(reports));
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Bericht öffnen' }));
    expect(document.querySelector('.coach-detail')).toBeTruthy();
  });

  it('AC-02: detail view shows section cards', () => {
    const reports = [{ id: 'r1', createdAt: new Date().toISOString(), text: '## Kapitel 1\nText.\n## Kapitel 2\nText.' }];
    localStorage.setItem('fitnessapp_admin_coach_reports', JSON.stringify(reports));
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Bericht öffnen' }));
    expect(document.querySelectorAll('.coach-section-card').length).toBe(2);
  });

  it('AC-02: detail view shows section card titles', () => {
    const reports = [{ id: 'r1', createdAt: new Date().toISOString(), text: '## Stärken\nText.' }];
    localStorage.setItem('fitnessapp_admin_coach_reports', JSON.stringify(reports));
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Bericht öffnen' }));
    expect(screen.getByText('Stärken')).toBeTruthy();
  });

  it('AC-02: detail view hides overview list', () => {
    const reports = [{ id: 'r1', createdAt: new Date().toISOString(), text: '## A\nText.' }];
    localStorage.setItem('fitnessapp_admin_coach_reports', JSON.stringify(reports));
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Bericht öffnen' }));
    expect(document.querySelector('.coach-report-list')).toBeNull();
  });

  it('AC-03: "← Übersicht" button returns to list', () => {
    const reports = [{ id: 'r1', createdAt: new Date().toISOString(), text: '## A\nText.' }];
    localStorage.setItem('fitnessapp_admin_coach_reports', JSON.stringify(reports));
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Bericht öffnen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zurück zur Übersicht' }));
    expect(document.querySelector('.coach-report-list')).toBeTruthy();
    expect(document.querySelector('.coach-detail')).toBeNull();
  });

  it('detail view shows "Bericht löschen" button', () => {
    const reports = [{ id: 'r1', createdAt: new Date().toISOString(), text: '## A\nText.' }];
    localStorage.setItem('fitnessapp_admin_coach_reports', JSON.stringify(reports));
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Bericht öffnen' }));
    expect(screen.getByRole('button', { name: 'Bericht löschen' })).toBeTruthy();
  });
});

/* ══════════════════════════════════════════════════════════
   Loading State
   ══════════════════════════════════════════════════════════ */

describe('CoachView – Loading State', () => {
  it('shows thinking indicator while report loads', async () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Zwischenbericht erstellen' }));
    await waitFor(() => expect(document.querySelector('.coach-msg__thinking')).toBeTruthy());
  });

  it('shows thinking bar container while loading', async () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Zwischenbericht erstellen' }));
    await waitFor(() => expect(document.querySelector('.coach-page__thinking-bar')).toBeTruthy());
  });

  it('button shows "Wird erstellt…" while loading', async () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Zwischenbericht erstellen' }));
    await waitFor(() => expect(screen.getByText('Wird erstellt…')).toBeTruthy());
  });

  it('button is disabled while loading', async () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<CoachView />);
    const btn = screen.getByRole('button', { name: 'Zwischenbericht erstellen' });
    fireEvent.click(btn);
    await waitFor(() => expect(btn.disabled).toBe(true));
  });

  it('second click while loading is ignored', async () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<CoachView />);
    const btn = screen.getByRole('button', { name: 'Zwischenbericht erstellen' });
    fireEvent.click(btn);
    fireEvent.click(btn);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
  });
});

/* ══════════════════════════════════════════════════════════
   AC-04: Neuer Bericht öffnet sich automatisch
   ══════════════════════════════════════════════════════════ */

describe('CoachView – Auto-Open nach Generierung (AC-04)', () => {
  it('AC-04: after generating, detail view opens automatically', async () => {
    await generateReport();
    expect(document.querySelector('.coach-detail')).toBeTruthy();
  });

  it('AC-04: generated report shows section cards in detail', async () => {
    await generateReport();
    const cards = document.querySelectorAll('.coach-section-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('AC-04: section card titles from generated report visible', async () => {
    await generateReport();
    await waitFor(() => {
      const titles = document.querySelectorAll('.coach-section-card__title');
      expect(titles[0].textContent).toContain('Zusammenfassung');
    });
  });

  it('AC-04: back button after generate shows 1 list item', async () => {
    await generateReport();
    fireEvent.click(screen.getByRole('button', { name: 'Zurück zur Übersicht' }));
    await waitFor(() => {
      const items = document.querySelectorAll('.coach-report-list-item');
      expect(items.length).toBe(1);
    });
  });

  it('AC-04: new report prepended in list (newest first)', async () => {
    const older = [{ id: 'r-old', createdAt: new Date(Date.now() - 86400000).toISOString(), text: '## Alt\nAlter Bericht.' }];
    localStorage.setItem('fitnessapp_admin_coach_reports', JSON.stringify(older));

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ report: FAKE_REPORT }) });
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Zwischenbericht erstellen' }));
    await waitFor(() => document.querySelector('.coach-section-card'));

    fireEvent.click(screen.getByRole('button', { name: 'Zurück zur Übersicht' }));
    await waitFor(() => {
      expect(document.querySelectorAll('.coach-report-list-item').length).toBe(2);
    });

    const stored = JSON.parse(localStorage.getItem('fitnessapp_admin_coach_reports') || '[]');
    expect(stored[0].text).toBe(FAKE_REPORT);
    expect(stored[1].id).toBe('r-old');
  });
});

/* ══════════════════════════════════════════════════════════
   Inline-Markdown Renderer
   ══════════════════════════════════════════════════════════ */

describe('CoachView – Inline-Markdown', () => {
  it('renders **bold** as <strong>', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ report: '## Abschnitt\nDu hast **sehr gut** trainiert.' }),
    });
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Zwischenbericht erstellen' }));
    await waitFor(() => {
      const strong = document.querySelector('.coach-section-card__body strong');
      expect(strong.textContent).toBe('sehr gut');
    });
  });

  it('renders bullet lines as .coach-section__bullet', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ report: '## Punkte\n- Erster Punkt\n- Zweiter Punkt' }),
    });
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Zwischenbericht erstellen' }));
    await waitFor(() => {
      const bullets = document.querySelectorAll('.coach-section__bullet');
      expect(bullets.length).toBe(2);
    });
  });

  it('report without ## sections renders as single card without title', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ report: 'Fließtext ohne Kapitel.' }),
    });
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Zwischenbericht erstellen' }));
    await waitFor(() => {
      const cards = document.querySelectorAll('.coach-section-card');
      expect(cards.length).toBe(1);
      expect(document.querySelector('.coach-section-card__title')).toBeNull();
    });
  });
});

/* ══════════════════════════════════════════════════════════
   Fehlerbehandlung
   ══════════════════════════════════════════════════════════ */

describe('CoachView – Fehlerbehandlung', () => {
  it('config error appears as .coach-page__error with ANTHROPIC_API_KEY hint', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'Coach nicht konfiguriert' }),
    });
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Zwischenbericht erstellen' }));
    await waitFor(() => {
      const err = document.querySelector('.coach-page__error');
      expect(err).toBeTruthy();
      expect(err.textContent).toContain('ANTHROPIC_API_KEY');
    });
  });

  it('generic API error appears in .coach-page__error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'Interner Fehler' }),
    });
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Zwischenbericht erstellen' }));
    await waitFor(() => {
      const err = document.querySelector('.coach-page__error');
      expect(err).toBeTruthy();
      expect(err.textContent).toContain('Interner Fehler');
    });
  });

  it('network error appears in .coach-page__error', async () => {
    mockFetch.mockRejectedValue(new Error('network error'));
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Zwischenbericht erstellen' }));
    await waitFor(() => expect(document.querySelector('.coach-page__error')).toBeTruthy());
  });

  it('error does not add report to history or open detail', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ detail: 'Fehler' }) });
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Zwischenbericht erstellen' }));
    await waitFor(() => document.querySelector('.coach-page__error'));
    expect(document.querySelector('.coach-detail')).toBeNull();
    expect(document.querySelector('.coach-section-card')).toBeNull();
  });

  it('error clears when next report succeeds', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ detail: 'Fehler' }) });
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Zwischenbericht erstellen' }));
    await waitFor(() => expect(document.querySelector('.coach-page__error')).toBeTruthy());

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ report: FAKE_REPORT }) });
    fireEvent.click(screen.getByRole('button', { name: 'Zwischenbericht erstellen' }));
    await waitFor(() => expect(document.querySelector('.coach-page__error')).toBeNull());
  });
});

/* ══════════════════════════════════════════════════════════
   Daten-Filterung (API-Payload)
   ══════════════════════════════════════════════════════════ */

describe('CoachView – Daten-Filterung', () => {
  it('sendet nur Workouts der letzten 4 Wochen', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ report: 'OK' }) });
    const recentWorkout = makeWorkout({ id: 'w-recent', startedAt: isoDaysAgo(10) });
    const oldWorkout = makeWorkout({ id: 'w-old', startedAt: isoDaysAgo(60) });
    render(<CoachView workouts={[recentWorkout, oldWorkout]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Zwischenbericht erstellen' }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.workouts.length).toBe(1);
    expect(body.workouts[0].id).toBe('w-recent');
  });

  it('sendet Garmin-Aktivitäten ohne startTimeLocal nicht mit', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ report: 'OK' }) });
    const validGarmin = { id: 1, startTimeLocal: `${isoDaysAgo(5).slice(0, 10)} 07:00:00`, duration: 1800 };
    const nullGarmin = { id: 2, startTimeLocal: null, duration: 900 };
    render(<CoachView garminActivities={[validGarmin, nullGarmin]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Zwischenbericht erstellen' }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.garminActivities.length).toBe(1);
    expect(body.garminActivities[0].id).toBe(1);
  });

  it('sendet profile und weightLog im Request', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ report: 'OK' }) });
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Zwischenbericht erstellen' }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.profile).toBeDefined();
    expect(body.weightLog).toBeDefined();
  });

  it('sendet garminHealth im Request', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ report: 'OK' }) });
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Zwischenbericht erstellen' }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(Object.prototype.hasOwnProperty.call(body, 'garminHealth')).toBe(true);
  });

  it('sendet garminHealthHistory im Request', async () => {
    const { fetchGarminHealthHistory } = await import('../utils/exportData.js');
    const historyData = { steps: { data: [{ date: '2026-05-01', value: 8000 }] }, restingHeartRate: null, bodyBattery: null };
    fetchGarminHealthHistory.mockResolvedValueOnce(historyData);
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ report: 'OK' }) });
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Zwischenbericht erstellen' }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.garminHealthHistory).toEqual(historyData);
  });
});

/* ══════════════════════════════════════════════════════════
   Historisierung — localStorage
   ══════════════════════════════════════════════════════════ */

describe('CoachView – Historisierung', () => {
  it('generated report is saved to localStorage', async () => {
    await generateReport();
    const stored = JSON.parse(localStorage.getItem('fitnessapp_admin_coach_reports') || '[]');
    expect(stored.length).toBe(1);
    expect(stored[0].text).toBe(FAKE_REPORT);
  });

  it('reports are loaded from localStorage on mount — shows list items', () => {
    const existing = [{ id: 'r1', createdAt: new Date().toISOString(), text: '## Test\nInhalt.' }];
    localStorage.setItem('fitnessapp_admin_coach_reports', JSON.stringify(existing));
    render(<CoachView />);
    expect(document.querySelector('.coach-report-list-item')).toBeTruthy();
  });

  it('corrupt localStorage returns empty array (no crash)', () => {
    localStorage.setItem('fitnessapp_admin_coach_reports', 'KEIN_JSON');
    render(<CoachView />);
    expect(document.querySelector('.coach-page__empty')).toBeTruthy();
  });
});

/* ══════════════════════════════════════════════════════════
   Löschen (AC-05)
   ══════════════════════════════════════════════════════════ */

describe('CoachView – Bericht löschen (AC-05)', () => {
  it('AC-05: deleting from detail returns to overview', async () => {
    await generateReport();
    fireEvent.click(screen.getByRole('button', { name: 'Bericht löschen' }));
    await waitFor(() => {
      expect(document.querySelector('.coach-detail')).toBeNull();
      expect(document.querySelector('.coach-report-list')).toBeNull();
    });
  });

  it('AC-05: deleting last report shows empty state', async () => {
    await generateReport();
    fireEvent.click(screen.getByRole('button', { name: 'Bericht löschen' }));
    await waitFor(() => expect(document.querySelector('.coach-page__empty')).toBeTruthy());
  });

  it('AC-05: delete updates localStorage', async () => {
    await generateReport();
    fireEvent.click(screen.getByRole('button', { name: 'Bericht löschen' }));
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('fitnessapp_admin_coach_reports') || '[]');
      expect(stored.length).toBe(0);
    });
  });

  it('AC-05: deletes correct report when multiple exist', () => {
    const reports = [
      { id: 'r1', createdAt: new Date().toISOString(), text: '## Neu\nNeuer Bericht.' },
      { id: 'r2', createdAt: new Date(Date.now() - 86400000).toISOString(), text: '## Alt\nAlter Bericht.' },
    ];
    localStorage.setItem('fitnessapp_admin_coach_reports', JSON.stringify(reports));
    render(<CoachView />);

    const openButtons = screen.getAllByRole('button', { name: 'Bericht öffnen' });
    fireEvent.click(openButtons[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Bericht löschen' }));

    const stored = JSON.parse(localStorage.getItem('fitnessapp_admin_coach_reports') || '[]');
    expect(stored.length).toBe(1);
    expect(stored[0].id).toBe('r2');
  });
});

/* ══════════════════════════════════════════════════════════
   FS-74 — Trainingsplan vorschlagen
   ══════════════════════════════════════════════════════════ */

const FAKE_PLAN = `## 🏋️ Trainingsplan-Vorschlag\nEin 4er-Split passend zu deinen Zielen.\n\n## 📅 Wochenstruktur\nMo/Di/Do/Fr Training.`;

async function generatePlan(fakePlan = FAKE_PLAN) {
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ plan: fakePlan }) });
  render(<CoachView />);
  fireEvent.click(screen.getByRole('button', { name: 'Trainingsplan vorschlagen' }));
  await waitFor(() => expect(document.querySelector('.coach-section-card')).toBeTruthy());
}

describe('CoachView – Trainingsplan Button (FS-74, AC-01)', () => {
  it('shows "Trainingsplan vorschlagen" button', () => {
    render(<CoachView />);
    expect(screen.getByRole('button', { name: 'Trainingsplan vorschlagen' })).toBeTruthy();
  });

  it('clicking calls POST /api/coach/plan', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ plan: FAKE_PLAN }) });
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Trainingsplan vorschlagen' }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(mockFetch.mock.calls[0][0]).toBe('/api/coach/plan');
  });

  it('sends profile, routines and workouts in the request body', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ plan: FAKE_PLAN }) });
    const workout = makeWorkout({ startedAt: isoDaysAgo(2) });
    render(<CoachView workouts={[workout]} routines={[{ id: 'r-1', name: 'Push Day', exercises: [] }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Trainingsplan vorschlagen' }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.profile).toBeDefined();
    expect(body.routines).toEqual([{ id: 'r-1', name: 'Push Day', exercises: [] }]);
    expect(body.workouts.length).toBe(1);
  });

  it('AC-01: opens detail view automatically after generating', async () => {
    await generatePlan();
    expect(document.querySelector('.coach-detail')).toBeTruthy();
  });

  it('AC-01: renders plan section cards in detail view', async () => {
    await generatePlan();
    const titles = document.querySelectorAll('.coach-section-card__title');
    expect(titles[0].textContent).toContain('Trainingsplan-Vorschlag');
  });
});

describe('CoachView – Trainingsplan in Liste markiert (FS-74, AC-02)', () => {
  it('AC-02: plan item shows type badge "Trainingsplan" in list', async () => {
    await generatePlan();
    fireEvent.click(screen.getByRole('button', { name: 'Zurück zur Übersicht' }));
    const badge = document.querySelector('.coach-report-list-item__type-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain('Trainingsplan');
  });

  it('AC-02: plan and report appear together in one list, newest first', async () => {
    const olderReport = [{ id: 'r-old', createdAt: new Date(Date.now() - 86400000).toISOString(), text: '## Alt\nBericht.', type: 'bericht' }];
    localStorage.setItem('fitnessapp_admin_coach_reports', JSON.stringify(olderReport));
    await generatePlan();
    fireEvent.click(screen.getByRole('button', { name: 'Zurück zur Übersicht' }));
    expect(document.querySelectorAll('.coach-report-list-item').length).toBe(2);
    const stored = JSON.parse(localStorage.getItem('fitnessapp_admin_coach_reports') || '[]');
    expect(stored[0].type).toBe('trainingsplan');
    expect(stored[1].id).toBe('r-old');
  });

  it('AC-02: plan list item has "Trainingsplan öffnen" aria-label', async () => {
    const plans = [{ id: 'p1', createdAt: new Date().toISOString(), text: '## A\nText.', type: 'trainingsplan' }];
    localStorage.setItem('fitnessapp_admin_coach_reports', JSON.stringify(plans));
    render(<CoachView />);
    expect(screen.getByRole('button', { name: 'Trainingsplan öffnen' })).toBeTruthy();
  });

  it('AC-04: opening a pre-stored plan from the list shows its detail view', () => {
    const plans = [{ id: 'p1', createdAt: new Date().toISOString(), text: '## 🏋️ Trainingsplan-Vorschlag\nEin Vorschlag.', type: 'trainingsplan' }];
    localStorage.setItem('fitnessapp_admin_coach_reports', JSON.stringify(plans));
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Trainingsplan öffnen' }));
    expect(document.querySelector('.coach-detail')).toBeTruthy();
    expect(screen.getByText(/Trainingsplan-Vorschlag/)).toBeTruthy();
  });

  it('legacy report without type field shows no badge and "Bericht öffnen" (EC-06)', () => {
    const reports = [{ id: 'r1', createdAt: new Date().toISOString(), text: '## A\nText.' }];
    localStorage.setItem('fitnessapp_admin_coach_reports', JSON.stringify(reports));
    render(<CoachView />);
    expect(screen.getByRole('button', { name: 'Bericht öffnen' })).toBeTruthy();
    expect(document.querySelector('.coach-report-list-item__type-badge')).toBeNull();
  });
});

describe('CoachView – Trainingsplan Fehlerbehandlung (FS-74, AC-03)', () => {
  it('AC-03: shows error and adds no item when plan request fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ detail: 'Interner Fehler' }) });
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Trainingsplan vorschlagen' }));
    await waitFor(() => {
      const err = document.querySelector('.coach-page__error');
      expect(err).toBeTruthy();
      expect(err.textContent).toContain('Interner Fehler');
    });
    expect(document.querySelector('.coach-detail')).toBeNull();
    const stored = JSON.parse(localStorage.getItem('fitnessapp_admin_coach_reports') || '[]');
    expect(stored.length).toBe(0);
  });

  it('AC-03: config error shows ANTHROPIC_API_KEY hint', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ detail: 'Coach nicht konfiguriert' }) });
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Trainingsplan vorschlagen' }));
    await waitFor(() => {
      const err = document.querySelector('.coach-page__error');
      expect(err.textContent).toContain('ANTHROPIC_API_KEY');
    });
  });

  it('AC-03: network error while generating plan appears in .coach-page__error', async () => {
    mockFetch.mockRejectedValue(new Error('network error'));
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Trainingsplan vorschlagen' }));
    await waitFor(() => expect(document.querySelector('.coach-page__error')).toBeTruthy());
  });
});

describe('CoachView – Gemeinsamer Ladezustand (FS-74, AC-05)', () => {
  it('AC-05: both buttons disabled while plan is loading', async () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Trainingsplan vorschlagen' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Zwischenbericht erstellen' }).disabled).toBe(true);
      expect(screen.getByRole('button', { name: 'Trainingsplan vorschlagen' }).disabled).toBe(true);
    });
  });

  it('AC-05: both buttons disabled while report is loading', async () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Zwischenbericht erstellen' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Zwischenbericht erstellen' }).disabled).toBe(true);
      expect(screen.getByRole('button', { name: 'Trainingsplan vorschlagen' }).disabled).toBe(true);
    });
  });

  it('AC-05: clicking report button while plan is loading is ignored', async () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Trainingsplan vorschlagen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zwischenbericht erstellen' }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
  });

  it('shows "Erstelle Trainingsplan…" thinking text while plan loads', async () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'Trainingsplan vorschlagen' }));
    await waitFor(() => expect(screen.getByText('Erstelle Trainingsplan…')).toBeTruthy());
  });
});

describe('CoachView – Löschen von Trainingsplänen (FS-74, AC-04)', () => {
  it('AC-04: plan detail shows "Trainingsplan löschen" aria-label', async () => {
    await generatePlan();
    expect(screen.getByRole('button', { name: 'Trainingsplan löschen' })).toBeTruthy();
  });

  it('AC-04: deleting a plan removes it and shows empty state', async () => {
    await generatePlan();
    fireEvent.click(screen.getByRole('button', { name: 'Trainingsplan löschen' }));
    await waitFor(() => expect(document.querySelector('.coach-page__empty')).toBeTruthy());
    const stored = JSON.parse(localStorage.getItem('fitnessapp_admin_coach_reports') || '[]');
    expect(stored.length).toBe(0);
  });
});
