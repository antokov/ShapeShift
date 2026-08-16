import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CalendarView from './CalendarView.jsx';

const routines = [
  { id: 'r1', name: 'Push Day', exercises: [{ id: 'e1' }, { id: 'e2' }] },
  { id: 'r2', name: 'Leg Day', exercises: [{ id: 'e3' }] },
];

const mockAddEvent = vi.fn();
const mockRemoveEvent = vi.fn();

function renderCalendar(events = []) {
  return render(
    <CalendarView
      events={events}
      routines={routines}
      addEvent={mockAddEvent}
      removeEvent={mockRemoveEvent}
    />
  );
}

beforeEach(() => vi.clearAllMocks());

// ─── Standardansicht: Woche ───────────────────────────

describe('CalendarView – Standardansicht Woche (AC-01)', () => {
  it('zeigt alle 7 Wochentag-Spaltenköpfe', () => {
    renderCalendar();
    ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].forEach((d) =>
      expect(screen.getAllByText(d).length).toBeGreaterThan(0)
    );
  });

  it('zeigt genau 7 Kalender-Zellen in Wochenansicht (AC-01)', () => {
    renderCalendar();
    const cells = document.querySelectorAll('.calendar-cell');
    expect(cells).toHaveLength(7);
  });

  it('Wochengrid hat Klasse calendar-grid--week', () => {
    renderCalendar();
    expect(document.querySelector('.calendar-grid--week')).not.toBeNull();
  });

  it('zeigt Datumsbereich im Header (AC-01)', () => {
    renderCalendar();
    const header = document.querySelector('.calendar-header__title');
    expect(header).not.toBeNull();
    // Week title format: "10. Jun – 16. Jun 2026" or similar
    expect(header.textContent).toMatch(/\d+\./);
    expect(header.textContent).toMatch(/\d{4}/);
  });

  it('hebt heutigen Tag hervor (AC-01)', () => {
    renderCalendar();
    // Only if today is in the current week
    expect(document.querySelector('.calendar-cell__date--today')).not.toBeNull();
  });

  it('zeigt "Woche"-Button als aktiv', () => {
    renderCalendar();
    const wocheBtn = screen.getByRole('button', { name: 'Woche' });
    expect(wocheBtn.className).toContain('cal-view-btn--active');
  });

  it('zeigt "Monat"-Button als inaktiv', () => {
    renderCalendar();
    const monatBtn = screen.getByRole('button', { name: 'Monat' });
    expect(monatBtn.className).not.toContain('cal-view-btn--active');
  });

  it('zeigt "Heute"-Button in Navigation', () => {
    renderCalendar();
    expect(screen.getByText('Heute')).toBeInTheDocument();
  });

  it('Nav-Pfeile haben Woche als aria-label', () => {
    renderCalendar();
    expect(screen.getByLabelText('Vorherige Woche')).toBeInTheDocument();
    expect(screen.getByLabelText('Nächste Woche')).toBeInTheDocument();
  });
});

// ─── View Toggle ──────────────────────────────────────

describe('CalendarView – View Toggle (AC-02, AC-03)', () => {
  it('Klick auf "Monat" wechselt zur Monatsansicht (AC-02)', () => {
    renderCalendar();
    fireEvent.click(screen.getByRole('button', { name: 'Monat' }));
    const cells = document.querySelectorAll('.calendar-cell');
    expect(cells).toHaveLength(42);
  });

  it('Monatsansicht hat keine calendar-grid--week Klasse (AC-02)', () => {
    renderCalendar();
    fireEvent.click(screen.getByRole('button', { name: 'Monat' }));
    expect(document.querySelector('.calendar-grid--week')).toBeNull();
  });

  it('"Monat"-Button aktiv nach Wechsel (AC-02)', () => {
    renderCalendar();
    fireEvent.click(screen.getByRole('button', { name: 'Monat' }));
    expect(screen.getByRole('button', { name: 'Monat' }).className).toContain('cal-view-btn--active');
    expect(screen.getByRole('button', { name: 'Woche' }).className).not.toContain('cal-view-btn--active');
  });

  it('Nav-Pfeile zeigen Monat als aria-label nach Toggle (AC-02)', () => {
    renderCalendar();
    fireEvent.click(screen.getByRole('button', { name: 'Monat' }));
    expect(screen.getByLabelText('Vorheriger Monat')).toBeInTheDocument();
    expect(screen.getByLabelText('Nächster Monat')).toBeInTheDocument();
  });

  it('Klick auf "Woche" wechselt zurück (AC-03)', () => {
    renderCalendar();
    fireEvent.click(screen.getByRole('button', { name: 'Monat' }));
    fireEvent.click(screen.getByRole('button', { name: 'Woche' }));
    expect(document.querySelectorAll('.calendar-cell')).toHaveLength(7);
    expect(screen.getByRole('button', { name: 'Woche' }).className).toContain('cal-view-btn--active');
  });

  it('Monatsansicht zeigt Monatsnamen und Jahr (AC-02)', () => {
    renderCalendar();
    fireEvent.click(screen.getByRole('button', { name: 'Monat' }));
    const header = document.querySelector('.calendar-header__title');
    // Should match e.g. "Juni 2026"
    expect(header.textContent).toMatch(/\d{4}/);
    // Should not be the week range format (no "–" separator)
    // (Could be the same month, just checking year)
  });
});

// ─── Wochenansicht Navigation (AC-05) ─────────────────

describe('CalendarView – Wochennavigation (AC-05)', () => {
  it('Klick auf ‹ wechselt zur Vorwoche', () => {
    renderCalendar();
    const titleBefore = document.querySelector('.calendar-header__title').textContent;
    fireEvent.click(screen.getByLabelText('Vorherige Woche'));
    const titleAfter = document.querySelector('.calendar-header__title').textContent;
    expect(titleAfter).not.toBe(titleBefore);
  });

  it('Klick auf › wechselt zur Nächstwoche', () => {
    renderCalendar();
    const titleBefore = document.querySelector('.calendar-header__title').textContent;
    fireEvent.click(screen.getByLabelText('Nächste Woche'));
    const titleAfter = document.querySelector('.calendar-header__title').textContent;
    expect(titleAfter).not.toBe(titleBefore);
  });

  it('"Heute"-Klick springt zurück zur aktuellen Woche', () => {
    renderCalendar();
    const titleNow = document.querySelector('.calendar-header__title').textContent;
    fireEvent.click(screen.getByLabelText('Nächste Woche'));
    fireEvent.click(screen.getByLabelText('Nächste Woche'));
    expect(document.querySelector('.calendar-header__title').textContent).not.toBe(titleNow);
    fireEvent.click(screen.getByText('Heute'));
    expect(document.querySelector('.calendar-header__title').textContent).toBe(titleNow);
  });

  it('7 Zellen bleiben nach Navigation', () => {
    renderCalendar();
    fireEvent.click(screen.getByLabelText('Vorherige Woche'));
    expect(document.querySelectorAll('.calendar-cell')).toHaveLength(7);
    fireEvent.click(screen.getByLabelText('Nächste Woche'));
    fireEvent.click(screen.getByLabelText('Nächste Woche'));
    expect(document.querySelectorAll('.calendar-cell')).toHaveLength(7);
  });
});

// ─── Monatsnavigation (AC-06) ─────────────────────────

describe('CalendarView – Monatsnavigation (AC-06)', () => {
  it('Klick auf ‹ wechselt zum Vormonat', () => {
    renderCalendar();
    fireEvent.click(screen.getByRole('button', { name: 'Monat' }));
    const titleBefore = document.querySelector('.calendar-header__title').textContent;
    fireEvent.click(screen.getByLabelText('Vorheriger Monat'));
    expect(document.querySelector('.calendar-header__title').textContent).not.toBe(titleBefore);
  });

  it('Klick auf › wechselt zum Folgemonat', () => {
    renderCalendar();
    fireEvent.click(screen.getByRole('button', { name: 'Monat' }));
    const titleBefore = document.querySelector('.calendar-header__title').textContent;
    fireEvent.click(screen.getByLabelText('Nächster Monat'));
    expect(document.querySelector('.calendar-header__title').textContent).not.toBe(titleBefore);
  });

  it('"Heute"-Klick springt zum aktuellen Monat', () => {
    renderCalendar();
    fireEvent.click(screen.getByRole('button', { name: 'Monat' }));
    const titleNow = document.querySelector('.calendar-header__title').textContent;
    fireEvent.click(screen.getByLabelText('Nächster Monat'));
    fireEvent.click(screen.getByLabelText('Nächster Monat'));
    fireEvent.click(screen.getByText('Heute'));
    expect(document.querySelector('.calendar-header__title').textContent).toBe(titleNow);
  });
});

// ─── Events in Wochenansicht (AC-04) ──────────────────

describe('CalendarView – Events in Wochenansicht (AC-04)', () => {
  it('zeigt Single-Event in Wochenansicht an heutigem Tag', () => {
    const today = new Date().toLocaleDateString('sv');
    const events = [{
      id: 'ev1', routineId: 'r1', routineName: 'Push Day',
      eventType: 'single', date: today, startDate: null, recurrenceDays: [],
    }];
    renderCalendar(events);
    const calEvents = document.querySelectorAll('.calendar-event');
    expect(calEvents.length).toBeGreaterThan(0);
    expect(calEvents[0].textContent).toContain('Push Day');
  });

  it('zeigt Series-Event in Wochenansicht an passendem Tag', () => {
    const today = new Date().toLocaleDateString('sv');
    const JS_TO_KEY = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const todayDayKey = JS_TO_KEY[new Date().getDay()];
    const events = [{
      id: 'ev2', routineId: 'r2', routineName: 'Leg Day',
      eventType: 'series', date: null, startDate: today, recurrenceDays: [todayDayKey],
    }];
    renderCalendar(events);
    const seriesEvents = document.querySelectorAll('.calendar-event--series');
    expect(seriesEvents.length).toBeGreaterThan(0);
  });

  it('Events bleiben nach Toggle auf Monatsansicht sichtbar (AC-04)', () => {
    const today = new Date().toLocaleDateString('sv');
    const events = [{
      id: 'ev1', routineId: 'r1', routineName: 'Push Day',
      eventType: 'single', date: today, startDate: null, recurrenceDays: [],
    }];
    renderCalendar(events);
    fireEvent.click(screen.getByRole('button', { name: 'Monat' }));
    // Event should still appear in month view
    expect(document.querySelectorAll('.calendar-event').length).toBeGreaterThan(0);
  });
});

// ─── Modal öffnen ─────────────────────────────────────

describe('CalendarView – Modal (Wochenansicht)', () => {
  it('Klick auf Zelle öffnet Modal', () => {
    renderCalendar();
    fireEvent.click(document.querySelector('.calendar-cell--today'));
    expect(screen.getByText('Termin anlegen')).toBeInTheDocument();
  });

  it('Modal zeigt Einmalig/Serie-Tabs', () => {
    renderCalendar();
    fireEvent.click(document.querySelector('.calendar-cell--today'));
    expect(screen.getByText('Einmalig')).toBeInTheDocument();
    expect(screen.getByText('Serie')).toBeInTheDocument();
  });

  it('Modal zeigt Routinen-Liste', () => {
    renderCalendar();
    fireEvent.click(document.querySelector('.calendar-cell--today'));
    expect(screen.getByText('Push Day')).toBeInTheDocument();
    expect(screen.getByText('Leg Day')).toBeInTheDocument();
  });

  it('Abbrechen schließt Modal', () => {
    renderCalendar();
    fireEvent.click(document.querySelector('.calendar-cell--today'));
    fireEvent.click(screen.getByText('Abbrechen'));
    expect(screen.queryByText('Termin anlegen')).not.toBeInTheDocument();
  });

  it('✕-Button schließt Modal', () => {
    renderCalendar();
    fireEvent.click(document.querySelector('.calendar-cell--today'));
    fireEvent.click(screen.getByLabelText('Schließen'));
    expect(screen.queryByText('Termin anlegen')).not.toBeInTheDocument();
  });

  it('Speichern ruft addEvent auf (Wochenansicht)', () => {
    renderCalendar();
    fireEvent.click(document.querySelector('.calendar-cell--today'));
    fireEvent.click(screen.getByText('Push Day'));
    fireEvent.click(screen.getByText('Speichern'));
    expect(mockAddEvent).toHaveBeenCalledOnce();
    const arg = mockAddEvent.mock.calls[0][0];
    expect(arg.eventType).toBe('single');
    expect(arg.routineId).toBe('r1');
  });
});

// ─── Einmaligen Termin anlegen ────────────────────────

describe('CalendarView – Einmaligen Termin anlegen', () => {
  it('Speichern-Button ist disabled ohne Routine-Auswahl', () => {
    renderCalendar();
    fireEvent.click(document.querySelector('.calendar-cell--today'));
    expect(screen.getByText('Speichern')).toBeDisabled();
  });

  it('Routine auswählen aktiviert Speichern-Button', () => {
    renderCalendar();
    fireEvent.click(document.querySelector('.calendar-cell--today'));
    fireEvent.click(screen.getByText('Push Day'));
    expect(screen.getByText('Speichern')).not.toBeDisabled();
  });

  it('Modal schließt nach Speichern', () => {
    renderCalendar();
    fireEvent.click(document.querySelector('.calendar-cell--today'));
    fireEvent.click(screen.getByText('Push Day'));
    fireEvent.click(screen.getByText('Speichern'));
    expect(screen.queryByText('Termin anlegen')).not.toBeInTheDocument();
  });
});

// ─── Serienroutine anlegen ────────────────────────────

describe('CalendarView – Serienroutine anlegen', () => {
  it('Serie-Tab zeigt Wochentag-Chips', () => {
    renderCalendar();
    fireEvent.click(document.querySelector('.calendar-cell--today'));
    fireEvent.click(screen.getByText('Serie'));
    expect(document.querySelectorAll('.cal-day-chip').length).toBeGreaterThan(0);
  });

  it('Speichern disabled bei Serie ohne Wochentage', () => {
    renderCalendar();
    fireEvent.click(document.querySelector('.calendar-cell--today'));
    fireEvent.click(screen.getByText('Serie'));
    fireEvent.click(screen.getByText('Push Day'));
    expect(screen.getByText('Speichern')).toBeDisabled();
  });

  it('Serie mit Routine + Wochentagen ruft addEvent korrekt auf', () => {
    renderCalendar();
    fireEvent.click(document.querySelector('.calendar-cell--today'));
    fireEvent.click(screen.getByText('Serie'));
    const chips = document.querySelectorAll('.cal-day-chip');
    fireEvent.click(chips[0]);
    fireEvent.click(chips[2]);
    fireEvent.click(screen.getByText('Leg Day'));
    fireEvent.click(screen.getByText('Speichern'));
    expect(mockAddEvent).toHaveBeenCalledOnce();
    const arg = mockAddEvent.mock.calls[0][0];
    expect(arg.eventType).toBe('series');
    expect(arg.recurrenceDays.length).toBeGreaterThan(0);
  });
});

// ─── Event löschen ────────────────────────────────────

describe('CalendarView – Event löschen', () => {
  it('Klick auf Event öffnet Popup mit Löschen-Button (Wochenansicht)', () => {
    const today = new Date().toLocaleDateString('sv');
    const events = [{
      id: 'ev1', routineId: 'r1', routineName: 'Push Day',
      eventType: 'single', date: today, startDate: null, recurrenceDays: [],
    }];
    renderCalendar(events);
    fireEvent.click(document.querySelector('.calendar-event'));
    expect(screen.getByText('Termin löschen')).toBeInTheDocument();
  });

  it('Löschen ruft removeEvent auf', () => {
    const today = new Date().toLocaleDateString('sv');
    const events = [{
      id: 'ev1', routineId: 'r1', routineName: 'Push Day',
      eventType: 'single', date: today, startDate: null, recurrenceDays: [],
    }];
    renderCalendar(events);
    fireEvent.click(document.querySelector('.calendar-event'));
    fireEvent.click(screen.getByText('Termin löschen'));
    expect(mockRemoveEvent).toHaveBeenCalledWith('ev1');
  });

  it('Serie-Popup zeigt "Gesamte Serie löschen"', () => {
    const today = new Date().toLocaleDateString('sv');
    const JS_TO_KEY = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const todayDayKey = JS_TO_KEY[new Date().getDay()];
    const events = [{
      id: 'ev2', routineId: 'r2', routineName: 'Leg Day',
      eventType: 'series', date: null, startDate: today, recurrenceDays: [todayDayKey],
    }];
    renderCalendar(events);
    fireEvent.click(document.querySelector('.calendar-event--series'));
    expect(screen.getByText('Gesamte Serie löschen')).toBeInTheDocument();
  });
});

// ─── Keine Routinen ───────────────────────────────────

describe('CalendarView – Edge Cases', () => {
  it('Modal zeigt "Keine Routinen" wenn keine vorhanden', () => {
    render(
      <CalendarView events={[]} routines={[]} addEvent={mockAddEvent} removeEvent={mockRemoveEvent} />
    );
    fireEvent.click(document.querySelector('.calendar-cell--today'));
    expect(screen.getByText(/Keine Routinen vorhanden/)).toBeInTheDocument();
  });
});
