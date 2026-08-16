import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import GarminView from './GarminView.jsx';

/* ─── Fetch mock helpers ─────────────────────────────────── */

const HEALTH_200 = {
  date: '2026-06-11',
  steps: 8432,
  floors: 12,
  totalCalories: 2200,
  activeCalories: 450,
  distanceMeters: 6200,
  restingHeartRate: 52,
  averageStressLevel: 28,
  bodyBatteryHighest: 85,
  bodyBatteryLowest: 42,
  sleep: { totalSeconds: 27000, deepSeconds: 5400, lightSeconds: 14400, remSeconds: 6300, awakeSeconds: 900 },
};

const ACTIVITIES_200 = [
  {
    id: '1', activityName: 'Morgenlauf', activityType: 'running',
    startTimeLocal: '2026-06-10 07:30:00', duration: 2700, distance: 7500, calories: 350, averageHR: 152,
  },
  {
    id: '2', activityName: 'Ganzkörper A', activityType: 'strength_training',
    startTimeLocal: '2026-06-09 18:00:00', duration: 3600, distance: null, calories: 280, averageHR: null,
  },
];

function mockFetchByUrl(responses) {
  global.fetch = vi.fn().mockImplementation((url) => {
    for (const [pattern, { status, body }] of responses) {
      if (url.includes(pattern)) {
        return Promise.resolve({
          status,
          ok: status >= 200 && status < 300,
          json: () => Promise.resolve(body),
        });
      }
    }
    return Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve({}) });
  });
}

function mockBothOk() {
  mockFetchByUrl([
    ['garmin/health', { status: 200, body: HEALTH_200 }],
    ['garmin/activities', { status: 200, body: ACTIVITIES_200 }],
  ]);
}

function mockBoth503() {
  mockFetchByUrl([
    ['garmin/health', { status: 503, body: { detail: 'Garmin nicht konfiguriert' } }],
    ['garmin/activities', { status: 503, body: { detail: 'Garmin nicht konfiguriert' } }],
  ]);
}

beforeEach(() => vi.clearAllMocks());

/* ─── Tab structure ──────────────────────────────────────── */

describe('GarminView – Tabs', () => {
  it('zeigt beide Tabs', () => {
    mockBothOk();
    render(<GarminView />);
    expect(screen.getByText('Gesundheit')).toBeInTheDocument();
    expect(screen.getByText('Aktivitäten')).toBeInTheDocument();
  });

  it('startet im Gesundheit-Tab', () => {
    mockBothOk();
    render(<GarminView />);
    expect(screen.getByText('Gesundheit').className).toContain('garmin-tab--active');
  });

  it('wechselt zum Aktivitäten-Tab beim Klick', async () => {
    mockBothOk();
    render(<GarminView />);
    fireEvent.click(screen.getByText('Aktivitäten'));
    await waitFor(() => expect(screen.getByText('Morgenlauf')).toBeInTheDocument());
  });
});

/* ─── Health Tab ─────────────────────────────────────────── */

describe('GarminView – Gesundheit', () => {
  it('zeigt Ladetext während fetch läuft', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<GarminView />);
    expect(screen.getByText(/werden geladen/i)).toBeInTheDocument();
  });

  it('zeigt KPI-Karten nach dem Laden', async () => {
    mockBothOk();
    render(<GarminView />);
    await waitFor(() => expect(screen.getByText('Body Battery')).toBeInTheDocument());
    expect(screen.getByText('Schritte')).toBeInTheDocument();
    expect(screen.getByText('Ruhepuls')).toBeInTheDocument();
    expect(screen.getByText('Stresslevel')).toBeInTheDocument();
    expect(screen.getByText('Kalorien')).toBeInTheDocument();
  });

  it('zeigt Body Battery Wert', async () => {
    mockBothOk();
    render(<GarminView />);
    await waitFor(() => expect(screen.getByText('85')).toBeInTheDocument());
  });

  it('zeigt Ruhepuls', async () => {
    mockBothOk();
    render(<GarminView />);
    await waitFor(() => expect(screen.getByText('52')).toBeInTheDocument());
  });

  it('zeigt Schlaf-Karte mit Gesamtdauer', async () => {
    mockBothOk();
    render(<GarminView />);
    await waitFor(() => expect(screen.getByText('Schlaf')).toBeInTheDocument());
    expect(screen.getByText('7h 30min')).toBeInTheDocument();
  });

  it('zeigt Schlaf-Legende mit Phasen', async () => {
    mockBothOk();
    render(<GarminView />);
    await waitFor(() => expect(screen.getByText(/Tief \d+min/)).toBeInTheDocument());
    expect(screen.getByText(/REM \d+min/)).toBeInTheDocument();
    expect(screen.getByText(/Leicht \d+min/)).toBeInTheDocument();
  });

  it('zeigt Setup-Hinweis bei 503', async () => {
    mockBoth503();
    render(<GarminView />);
    await waitFor(() => expect(screen.getByText(/Garmin nicht konfiguriert/i)).toBeInTheDocument());
  });

  it('zeigt "—" für fehlende Werte (null)', async () => {
    mockFetchByUrl([
      ['garmin/health', { status: 200, body: { ...HEALTH_200, restingHeartRate: null } }],
      ['garmin/activities', { status: 200, body: [] }],
    ]);
    render(<GarminView />);
    await waitFor(() => expect(screen.getByText('Ruhepuls')).toBeInTheDocument());
    const kpis = document.querySelectorAll('.health-kpi');
    const hrKpi = Array.from(kpis).find(el => el.textContent.includes('Ruhepuls'));
    expect(hrKpi.textContent).toContain('—');
  });

  it('zeigt Datum-Navigation', async () => {
    mockBothOk();
    render(<GarminView />);
    await waitFor(() => expect(screen.getByText('Gesundheit')).toBeInTheDocument());
    expect(screen.getByText('‹')).toBeInTheDocument();
    expect(screen.getByText('›')).toBeInTheDocument();
  });

  it('Vorwärts-Button bei gestern disabled', async () => {
    mockBothOk();
    render(<GarminView />);
    await waitFor(() => expect(screen.getByText('›')).toBeInTheDocument());
    expect(screen.getByText('›')).toBeDisabled();
  });

  it('zeigt keine Schlafdaten wenn totalSeconds null', async () => {
    mockFetchByUrl([
      ['garmin/health', { status: 200, body: { ...HEALTH_200, sleep: { totalSeconds: null } } }],
      ['garmin/activities', { status: 200, body: [] }],
    ]);
    render(<GarminView />);
    await waitFor(() => expect(screen.getByText('Schlaf')).toBeInTheDocument());
    expect(screen.getByText(/Keine Schlafdaten/i)).toBeInTheDocument();
  });

  it('SleepCard zeigt Verlauf-Button', async () => {
    mockBothOk();
    render(<GarminView />);
    await waitFor(() => expect(screen.getByText('Verlauf →')).toBeInTheDocument());
  });

  it('Klick auf Verlauf öffnet MetricDetail für Schlafdauer', async () => {
    const sleepHistory = {
      metric: 'sleepDuration', period: '7d', unit: 'h',
      data: [{ date: '2026-06-11', value: 7.5 }],
    };
    mockFetchByUrl([
      ['garmin/health/history', { status: 200, body: sleepHistory }],
      ['garmin/health', { status: 200, body: HEALTH_200 }],
      ['garmin/activities', { status: 200, body: ACTIVITIES_200 }],
    ]);
    render(<GarminView />);
    await waitFor(() => expect(screen.getByText('Verlauf →')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Verlauf →'));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Schlafdauer' })).toBeInTheDocument());
  });
});

/* ─── Datum-Navigation (FS-21) ───────────────────────────── */

function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** dateToBody: { [iso]: { status, body } } — matched against the `date=` query param in the health URL. */
function mockHealthByDate(dateToBody, activitiesBody = []) {
  global.fetch = vi.fn().mockImplementation((url) => {
    if (url.includes('garmin/activities')) {
      return Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve(activitiesBody) });
    }
    if (url.includes('garmin/health') && !url.includes('history')) {
      const match = url.match(/date=([\d-]+)/);
      const date = match ? match[1] : null;
      const entry = date && dateToBody[date];
      if (entry) {
        return Promise.resolve({
          status: entry.status,
          ok: entry.status >= 200 && entry.status < 300,
          json: () => Promise.resolve(entry.body),
        });
      }
      return Promise.resolve({ status: 404, ok: false, json: () => Promise.resolve({ detail: 'kein Mock für dieses Datum' }) });
    }
    // hrv, health/history (unused in these tests) — default empty/ok
    return Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve({}) });
  });
}

describe('GarminView – Datum-Navigation (FS-21)', () => {
  it('AC-01: Klick auf ‹ lädt Daten des Vortags', async () => {
    const yesterday = addDays(todayISO(), -1);
    const dayBefore = addDays(yesterday, -1);
    mockHealthByDate({
      [yesterday]: { status: 200, body: { ...HEALTH_200, steps: 8432 } },
      [dayBefore]: { status: 200, body: { ...HEALTH_200, steps: 5000 } },
    });
    render(<GarminView />);
    await waitFor(() => expect(screen.getByText('8.432')).toBeInTheDocument());
    fireEvent.click(screen.getByText('‹'));
    await waitFor(() => expect(screen.getByText('5.000')).toBeInTheDocument());
  });

  it('AC-02: Klick auf › nach ‹ navigiert zurück zum Ausgangsdatum', async () => {
    const yesterday = addDays(todayISO(), -1);
    const dayBefore = addDays(yesterday, -1);
    mockHealthByDate({
      [yesterday]: { status: 200, body: { ...HEALTH_200, steps: 8432 } },
      [dayBefore]: { status: 200, body: { ...HEALTH_200, steps: 5000 } },
    });
    render(<GarminView />);
    await waitFor(() => expect(screen.getByText('8.432')).toBeInTheDocument());
    fireEvent.click(screen.getByText('‹'));
    await waitFor(() => expect(screen.getByText('5.000')).toBeInTheDocument());
    fireEvent.click(screen.getByText('›'));
    await waitFor(() => expect(screen.getByText('8.432')).toBeInTheDocument());
  });

  it('AC-03: Klick auf disabled › (Ausgangszustand) löst keinen neuen Fetch aus', async () => {
    const yesterday = addDays(todayISO(), -1);
    mockHealthByDate({ [yesterday]: { status: 200, body: HEALTH_200 } });
    render(<GarminView />);
    await waitFor(() => expect(screen.getByText('Body Battery')).toBeInTheDocument());
    const callsBefore = global.fetch.mock.calls.length;
    fireEvent.click(screen.getByText('›'));
    expect(global.fetch.mock.calls.length).toBe(callsBefore);
  });

  it('AC-04: mehrfaches ‹-Klicken navigiert kumulativ 3 Tage zurück', async () => {
    const yesterday = addDays(todayISO(), -1);
    const d1 = addDays(yesterday, -1);
    const d2 = addDays(yesterday, -2);
    const d3 = addDays(yesterday, -3);
    mockHealthByDate({
      [yesterday]: { status: 200, body: { ...HEALTH_200, steps: 1000 } },
      [d1]: { status: 200, body: { ...HEALTH_200, steps: 2000 } },
      [d2]: { status: 200, body: { ...HEALTH_200, steps: 3000 } },
      [d3]: { status: 200, body: { ...HEALTH_200, steps: 4000 } },
    });
    render(<GarminView />);
    await waitFor(() => expect(screen.getByText('1.000')).toBeInTheDocument());
    fireEvent.click(screen.getByText('‹'));
    await waitFor(() => expect(screen.getByText('2.000')).toBeInTheDocument());
    fireEvent.click(screen.getByText('‹'));
    await waitFor(() => expect(screen.getByText('3.000')).toBeInTheDocument());
    fireEvent.click(screen.getByText('‹'));
    await waitFor(() => expect(screen.getByText('4.000')).toBeInTheDocument());
  });

  it('AC-05: Navigation zu einem nicht-konfigurierten Datum zeigt SetupHint statt alter KPIs', async () => {
    const yesterday = addDays(todayISO(), -1);
    const dayBefore = addDays(yesterday, -1);
    mockHealthByDate({
      [yesterday]: { status: 200, body: { ...HEALTH_200, steps: 8432 } },
      [dayBefore]: { status: 503, body: { detail: 'Garmin nicht konfiguriert' } },
    });
    render(<GarminView />);
    await waitFor(() => expect(screen.getByText('8.432')).toBeInTheDocument());
    fireEvent.click(screen.getByText('‹'));
    await waitFor(() => expect(screen.getByText(/Garmin nicht konfiguriert/i)).toBeInTheDocument());
    expect(screen.queryByText('8.432')).not.toBeInTheDocument();
  });

  it('AC-05: generischer Fehler (kein 503) beim Navigieren zeigt Fehlermeldung statt alter KPIs', async () => {
    const yesterday = addDays(todayISO(), -1);
    const dayBefore = addDays(yesterday, -1);
    mockHealthByDate({
      [yesterday]: { status: 200, body: { ...HEALTH_200, steps: 8432 } },
      [dayBefore]: { status: 500, body: { detail: 'Interner Fehler' } },
    });
    render(<GarminView />);
    await waitFor(() => expect(screen.getByText('8.432')).toBeInTheDocument());
    fireEvent.click(screen.getByText('‹'));
    await waitFor(() => expect(document.querySelector('.garmin-view__error')).toBeInTheDocument());
    expect(screen.queryByText('8.432')).not.toBeInTheDocument();
  });

  it('Datumslabel aktualisiert sich nach Navigation (EC-04)', async () => {
    const yesterday = addDays(todayISO(), -1);
    const dayBefore = addDays(yesterday, -1);
    mockHealthByDate({
      [yesterday]: { status: 200, body: HEALTH_200 },
      [dayBefore]: { status: 200, body: HEALTH_200 },
    });
    render(<GarminView />);
    await waitFor(() => expect(screen.getByText('Body Battery')).toBeInTheDocument());
    const labelBefore = document.querySelector('.health-date-nav__label').textContent;
    fireEvent.click(screen.getByText('‹'));
    await waitFor(() => {
      const labelAfter = document.querySelector('.health-date-nav__label').textContent;
      expect(labelAfter).not.toBe(labelBefore);
    });
  });
});

/* ─── MetricDetail ───────────────────────────────────────── */

const HISTORY_200 = {
  metric: 'steps',
  period: '7d',
  unit: 'Schritte',
  data: [
    { date: '2026-06-05', value: 8000 },
    { date: '2026-06-06', value: null },
    { date: '2026-06-07', value: 9500 },
    { date: '2026-06-08', value: 7200 },
    { date: '2026-06-09', value: 10100 },
    { date: '2026-06-10', value: 6800 },
    { date: '2026-06-11', value: 8432 },
  ],
};

describe('GarminView – MetricDetail', () => {
  async function openMetricDetail(metric = 'Schritte') {
    mockFetchByUrl([
      ['garmin/health/history', { status: 200, body: HISTORY_200 }],
      ['garmin/health', { status: 200, body: HEALTH_200 }],
      ['garmin/activities', { status: 200, body: ACTIVITIES_200 }],
    ]);
    render(<GarminView />);
    await waitFor(() => expect(screen.getByText(metric)).toBeInTheDocument());
    fireEvent.click(screen.getByText(metric));
    await waitFor(() => expect(screen.getByText('← Zurück')).toBeInTheDocument());
  }

  it('öffnet MetricDetail beim Klick auf KPI-Karte', async () => {
    await openMetricDetail('Schritte');
    expect(screen.getByRole('heading', { name: 'Schritte' })).toBeInTheDocument();
  });

  it('versteckt Tabs in MetricDetail', async () => {
    await openMetricDetail('Schritte');
    expect(screen.queryByText('Aktivitäten')).not.toBeInTheDocument();
  });

  it('zeigt Zurück-Button', async () => {
    await openMetricDetail('Schritte');
    expect(screen.getByText('← Zurück')).toBeInTheDocument();
  });

  it('kehrt zur Übersicht zurück', async () => {
    await openMetricDetail('Schritte');
    fireEvent.click(screen.getByText('← Zurück'));
    await waitFor(() => expect(screen.getByText('Gesundheit')).toBeInTheDocument());
    expect(screen.getByText('Aktivitäten')).toBeInTheDocument();
  });

  it('zeigt Perioden-Pills 7 Tage und 4 Wochen', async () => {
    await openMetricDetail('Schritte');
    expect(screen.getByText('7 Tage')).toBeInTheDocument();
    expect(screen.getByText('4 Wochen')).toBeInTheDocument();
  });

  it('7 Tage ist standardmäßig aktiv', async () => {
    await openMetricDetail('Schritte');
    expect(screen.getByText('7 Tage').className).toContain('period-pill--active');
  });

  it('wechselt zu 4 Wochen Periode', async () => {
    await openMetricDetail('Schritte');
    fireEvent.click(screen.getByText('4 Wochen'));
    expect(screen.getByText('4 Wochen').className).toContain('period-pill--active');
  });

  it('zeigt SVG-Chart', async () => {
    await openMetricDetail('Schritte');
    expect(document.querySelector('svg')).not.toBeNull();
  });

  it('zeigt Zusammenfassung mit Min/Max/Ø', async () => {
    await openMetricDetail('Schritte');
    await waitFor(() => expect(screen.getByText('Min')).toBeInTheDocument());
    expect(screen.getByText('Max')).toBeInTheDocument();
    expect(screen.getByText('Ø Durchschnitt')).toBeInTheDocument();
  });

  it('zeigt korrekten Min-Wert', async () => {
    await openMetricDetail('Schritte');
    await waitFor(() => {
      const stats = document.querySelectorAll('.metric-summary__stat');
      const minStat = Array.from(stats).find(el => el.textContent.includes('Min'));
      expect(minStat.textContent).toContain('6800');
    });
  });

  it('zeigt korrekten Max-Wert', async () => {
    await openMetricDetail('Schritte');
    await waitFor(() => {
      const stats = document.querySelectorAll('.metric-summary__stat');
      const maxStat = Array.from(stats).find(el => el.textContent.includes('Max'));
      expect(maxStat.textContent).toContain('10100');
    });
  });

  it('zeigt Setup-Hinweis bei 503 in MetricDetail', async () => {
    mockFetchByUrl([
      ['garmin/health/history', { status: 503, body: { detail: 'Garmin nicht konfiguriert' } }],
      ['garmin/health', { status: 200, body: HEALTH_200 }],
      ['garmin/activities', { status: 200, body: ACTIVITIES_200 }],
    ]);
    render(<GarminView />);
    await waitFor(() => expect(screen.getByText('Schritte')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Schritte'));
    await waitFor(() => expect(screen.getByText(/Garmin nicht konfiguriert/i)).toBeInTheDocument());
  });

  it('alle 8 Metriken sind klickbar', async () => {
    mockBothOk();
    render(<GarminView />);
    await waitFor(() => expect(screen.getByText('Body Battery')).toBeInTheDocument());
    const kpis = document.querySelectorAll('.health-kpi--clickable');
    expect(kpis.length).toBe(8);
  });

  /* ─── FS-25: Tooltip bei Hover auf Datenpunkt ──────────── */

  it('AC-01: rendert für jeden gültigen Datenpunkt einen Hit-Circle mit Tooltip (Datum + Wert + Einheit)', async () => {
    await openMetricDetail('Schritte');
    const hits = document.querySelectorAll('.metric-chart-hit');
    // HISTORY_200 hat 7 Einträge, davon 1 mit value:null (2026-06-06) → 6 Hit-Circles
    expect(hits.length).toBe(6);
    const titles = Array.from(hits).map((h) => h.querySelector('title').textContent);
    expect(titles).toContain('05.06.2026: 8000 Schritte');
    expect(titles).toContain('11.06.2026: 8432 Schritte');
  });

  it('AC-02: Hit-Circles werden unabhängig von showDots auch bei 28 Datenpunkten (4 Wochen) gerendert', async () => {
    const history28 = {
      metric: 'steps', period: '4w', unit: 'Schritte',
      data: Array.from({ length: 28 }, (_, i) => ({
        date: `2026-05-${String(i + 1).padStart(2, '0')}`,
        value: 5000 + i,
      })),
    };
    mockFetchByUrl([
      ['garmin/health/history', { status: 200, body: history28 }],
      ['garmin/health', { status: 200, body: HEALTH_200 }],
      ['garmin/activities', { status: 200, body: ACTIVITIES_200 }],
    ]);
    render(<GarminView />);
    await waitFor(() => expect(screen.getByText('Schritte')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Schritte'));
    fireEvent.click(screen.getByText('4 Wochen'));
    await waitFor(() => expect(document.querySelectorAll('.metric-chart-hit').length).toBe(28));
    // sichtbare Punkt-Marker (r="4") bleiben bei >14 Punkten ausgeblendet (showDots-Verhalten unverändert)
    const visibleDots = Array.from(document.querySelectorAll('circle')).filter((c) => c.getAttribute('r') === '4');
    expect(visibleDots.length).toBe(0);
  });

  it('AC-03: kein Hit-Circle für Datenpunkte mit value:null', async () => {
    await openMetricDetail('Schritte');
    // 2026-06-06 hat value:null in HISTORY_200
    const hits = document.querySelectorAll('.metric-chart-hit');
    const titles = Array.from(hits).map((h) => h.querySelector('title').textContent);
    expect(titles.some((t) => t.startsWith('06.06.2026'))).toBe(false);
  });

  it('AC-04: Tooltip ohne Einheitssuffix bei Metrik mit leerer unit (Body Battery)', async () => {
    const bbHistory = {
      metric: 'bodyBattery', period: '7d', unit: '',
      data: [{ date: '2026-06-11', value: 82 }],
    };
    mockFetchByUrl([
      ['garmin/health/history', { status: 200, body: bbHistory }],
      ['garmin/health', { status: 200, body: HEALTH_200 }],
      ['garmin/activities', { status: 200, body: ACTIVITIES_200 }],
    ]);
    render(<GarminView />);
    await waitFor(() => expect(screen.getByText('Body Battery')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Body Battery'));
    await waitFor(() => expect(document.querySelector('.metric-chart-hit')).not.toBeNull());
    const title = document.querySelector('.metric-chart-hit title').textContent;
    expect(title).toBe('11.06.2026: 82');
  });

  it('EC-04: Hit-Circles stehen im DOM nach den sichtbaren Punkt-Markern (Z-Order)', async () => {
    await openMetricDetail('Schritte');
    const allCircles = Array.from(document.querySelectorAll('svg circle'));
    const lastVisibleDotIdx = allCircles.map((c) => c.getAttribute('r')).lastIndexOf('4');
    const firstHitIdx = allCircles.findIndex((c) => c.classList.contains('metric-chart-hit'));
    expect(firstHitIdx).toBeGreaterThan(lastVisibleDotIdx);
  });

  it('AC-05: Dezimalwert im Tooltip unverändert (kein zusätzliches Runden)', async () => {
    const vo2History = {
      metric: 'vo2max', period: '7d', unit: 'ml/kg',
      data: [{ date: '2026-06-11', value: 47.3 }],
    };
    mockFetchByUrl([
      ['garmin/health/history', { status: 200, body: vo2History }],
      ['garmin/health', { status: 200, body: HEALTH_200 }],
      ['garmin/activities', { status: 200, body: ACTIVITIES_200 }],
    ]);
    render(<GarminView />);
    await waitFor(() => expect(screen.getByText('VO2max')).toBeInTheDocument());
    fireEvent.click(screen.getByText('VO2max'));
    await waitFor(() => expect(document.querySelector('.metric-chart-hit')).not.toBeNull());
    const title = document.querySelector('.metric-chart-hit title').textContent;
    expect(title).toBe('11.06.2026: 47.3 ml/kg');
  });
});

/* ─── Activities Tab ─────────────────────────────────────── */

describe('GarminView – Aktivitäten', () => {
  async function openActivities() {
    mockBothOk();
    render(<GarminView />);
    fireEvent.click(screen.getByText('Aktivitäten'));
    await waitFor(() => expect(screen.getByText('Morgenlauf')).toBeInTheDocument());
  }

  it('zeigt Aktivitätsnamen', async () => {
    await openActivities();
    expect(screen.getByText('Ganzkörper A')).toBeInTheDocument();
  });

  it('zeigt Typ-Labels', async () => {
    await openActivities();
    expect(screen.getByText('Laufen')).toBeInTheDocument();
    expect(screen.getByText('Krafttraining')).toBeInTheDocument();
  });

  it('zeigt Dauer-Badge für Lauf', async () => {
    await openActivities();
    expect(screen.getByText('45min')).toBeInTheDocument();
  });

  it('zeigt Distanz-Badge für Lauf', async () => {
    await openActivities();
    expect(screen.getByText('7.50 km')).toBeInTheDocument();
  });

  it('zeigt kein Distanz-Badge für Krafttraining (distance=null)', async () => {
    await openActivities();
    const cards = document.querySelectorAll('.activity-card');
    const strengthCard = cards[1];
    expect(strengthCard.querySelector('.activity-stat--distance')).toBeNull();
  });

  it('zeigt kein HR-Badge wenn averageHR null', async () => {
    await openActivities();
    const cards = document.querySelectorAll('.activity-card');
    const strengthCard = cards[1];
    expect(strengthCard.querySelector('.activity-stat--hr')).toBeNull();
  });

  it('zeigt Kalorien-Badge', async () => {
    await openActivities();
    expect(screen.getByText('350 kcal')).toBeInTheDocument();
  });

  it('zeigt Leermeldung wenn keine Aktivitäten', async () => {
    mockFetchByUrl([
      ['garmin/health', { status: 200, body: HEALTH_200 }],
      ['garmin/activities', { status: 200, body: [] }],
    ]);
    render(<GarminView />);
    fireEvent.click(screen.getByText('Aktivitäten'));
    await waitFor(() => expect(screen.getByText(/keine aktivitäten/i)).toBeInTheDocument());
  });

  it('zeigt Setup-Hinweis bei 503', async () => {
    mockBoth503();
    render(<GarminView />);
    fireEvent.click(screen.getByText('Aktivitäten'));
    await waitFor(() => expect(screen.getByText(/Garmin nicht konfiguriert/i)).toBeInTheDocument());
  });

  it('AC-01: zeigt "Mehr laden"-Button wenn Aktivitäten vorhanden und limit < 100', async () => {
    await openActivities();
    expect(screen.getByRole('button', { name: 'Mehr laden' })).toBeInTheDocument();
  });

  it('AC-02: kein "Mehr laden"-Button wenn Aktivitätsliste leer ist', async () => {
    mockFetchByUrl([
      ['garmin/health', { status: 200, body: HEALTH_200 }],
      ['garmin/activities', { status: 200, body: [] }],
    ]);
    render(<GarminView />);
    fireEvent.click(screen.getByText('Aktivitäten'));
    await waitFor(() => expect(screen.getByText(/keine aktivitäten/i)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Mehr laden' })).not.toBeInTheDocument();
  });

  it('AC-03: Klick auf "Mehr laden" startet neuen Fetch mit limit=40', async () => {
    await openActivities();
    fireEvent.click(screen.getByRole('button', { name: 'Mehr laden' }));
    await waitFor(() => {
      const urls = global.fetch.mock.calls.map(([url]) => url);
      expect(urls.some((u) => u.includes('limit=40'))).toBe(true);
    });
  });

  it('AC-04: kein "Mehr laden"-Button wenn limit = 100 erreicht', async () => {
    mockFetchByUrl([
      ['garmin/health', { status: 200, body: HEALTH_200 }],
      ['garmin/activities', { status: 200, body: ACTIVITIES_200 }],
    ]);
    render(<GarminView />);
    fireEvent.click(screen.getByText('Aktivitäten'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mehr laden' })).toBeInTheDocument());
    // Click 4 times: 20→40→60→80→100
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Mehr laden' }));
      await waitFor(() => expect(screen.getByText('Morgenlauf')).toBeInTheDocument());
    }
    expect(screen.queryByRole('button', { name: 'Mehr laden' })).not.toBeInTheDocument();
  });
});
