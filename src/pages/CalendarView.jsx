import { useState } from 'react';
import { generateId } from '../utils/uuid.js';
import { getEventsForDate } from '../hooks/useCalendar.js';
import './CalendarView.css';

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
// JS getDay(): 0=Sun,1=Mon,...,6=Sat → Monday-first index
const JS_TO_COL = [6, 0, 1, 2, 3, 4, 5]; // Sun→col6, Mon→col0, ...

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

function toISO(date) {
  return date.toLocaleDateString('sv'); // YYYY-MM-DD
}

function getMondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function buildWeekCells(weekStartDate) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStartDate);
    d.setDate(d.getDate() + i);
    return { date: toISO(d), currentMonth: true };
  });
}

function formatWeekTitle(weekStartDate) {
  const end = new Date(weekStartDate);
  end.setDate(end.getDate() + 6);
  const startY = weekStartDate.getFullYear();
  const endY = end.getFullYear();
  const opts = { day: 'numeric', month: 'short' };
  const startStr = weekStartDate.toLocaleDateString('de-DE', opts);
  const endStr = end.toLocaleDateString('de-DE', opts);
  if (startY !== endY) return `${startStr} ${startY} – ${endStr} ${endY}`;
  return `${startStr} – ${endStr} ${endY}`;
}

function buildCells(year, month) {
  const firstDay = new Date(year, month, 1);
  const startCol = JS_TO_COL[firstDay.getDay()];
  const cells = [];
  for (let i = 0; i < startCol; i++) {
    const d = new Date(year, month, 1 - (startCol - i));
    cells.push({ date: toISO(d), currentMonth: false });
  }
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: toISO(new Date(year, month, d)), currentMonth: true });
  }
  let trailing = 1;
  while (cells.length < 42) {
    const d = new Date(year, month + 1, trailing++);
    cells.push({ date: toISO(d), currentMonth: false });
  }
  return cells;
}

function CalendarModal({ defaultDate, routines, onSave, onClose }) {
  const [tab, setTab] = useState('single');
  const [routineId, setRoutineId] = useState('');
  const [recurrenceDays, setRecurrenceDays] = useState([]);

  const selectedRoutine = routines.find((r) => r.id === routineId);

  function toggleDay(day) {
    setRecurrenceDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function canSave() {
    if (!routineId) return false;
    if (tab === 'series') return recurrenceDays.length > 0;
    return true;
  }

  function handleSave() {
    if (!canSave()) return;
    const event = {
      id: generateId(),
      routineId,
      routineName: selectedRoutine?.name ?? routineId,
      eventType: tab,
      date: tab === 'single' ? defaultDate : null,
      startDate: tab === 'series' ? defaultDate : null,
      recurrenceDays: tab === 'series' ? recurrenceDays : [],
    };
    onSave(event);
    onClose();
  }

  return (
    <>
      <div className="cal-modal-backdrop" onClick={onClose} />
      <div className="cal-modal" role="dialog" aria-modal="true">
        <div className="cal-modal__header">
          <h2 className="cal-modal__title">Termin anlegen</h2>
          <button className="cal-modal__close" onClick={onClose} aria-label="Schließen">✕</button>
        </div>

        <div className="cal-modal__date-label">
          {new Date(defaultDate + 'T12:00:00').toLocaleDateString('de-DE', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </div>

        <div className="cal-modal__tabs">
          <button
            className={`cal-modal__tab${tab === 'single' ? ' cal-modal__tab--active' : ''}`}
            onClick={() => setTab('single')}
          >Einmalig</button>
          <button
            className={`cal-modal__tab${tab === 'series' ? ' cal-modal__tab--active' : ''}`}
            onClick={() => setTab('series')}
          >Serie</button>
        </div>

        {tab === 'series' && (
          <div className="cal-modal__days">
            <div className="cal-modal__days-label">Wiederholung an:</div>
            <div className="cal-modal__day-chips">
              {WEEKDAY_LABELS.map((day) => (
                <button
                  key={day}
                  type="button"
                  className={`cal-day-chip${recurrenceDays.includes(day) ? ' cal-day-chip--active' : ''}`}
                  onClick={() => toggleDay(day)}
                >{day}</button>
              ))}
            </div>
          </div>
        )}

        <div className="cal-modal__routine-label">Routine:</div>
        {routines.length === 0 ? (
          <p className="cal-modal__no-routines">Keine Routinen vorhanden. Bitte zuerst eine Routine anlegen.</p>
        ) : (
          <div className="cal-modal__routine-list">
            {routines.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`cal-modal__routine-item${routineId === r.id ? ' cal-modal__routine-item--active' : ''}`}
                onClick={() => setRoutineId(r.id)}
              >
                <span className="cal-modal__routine-name">{r.name}</span>
                <span className="cal-modal__routine-count">{r.exercises?.length ?? 0} Üb.</span>
              </button>
            ))}
          </div>
        )}

        <div className="cal-modal__footer">
          <button className="btn btn--ghost btn--small" onClick={onClose}>Abbrechen</button>
          <button
            className="btn btn--primary btn--small"
            onClick={handleSave}
            disabled={!canSave()}
          >Speichern</button>
        </div>
      </div>
    </>
  );
}

function EventPopup({ event, anchorRect, onDelete, onClose }) {
  const isSeries = event.eventType === 'series';

  return (
    <>
      <div className="cal-event-backdrop" onClick={onClose} />
      <div className="cal-event-popup" style={{ top: anchorRect?.bottom + 4, left: anchorRect?.left }}>
        <div className="cal-event-popup__name">{event.routineName}</div>
        {isSeries && (
          <div className="cal-event-popup__meta">
            Wiederkehrend: {(event.recurrenceDays ?? []).join(', ')}
          </div>
        )}
        <button
          className="btn btn--danger btn--small"
          onClick={() => { onDelete(event.id); onClose(); }}
        >
          {isSeries ? 'Gesamte Serie löschen' : 'Termin löschen'}
        </button>
      </div>
    </>
  );
}

export default function CalendarView({ events, routines, addEvent, removeEvent }) {
  const today = toISO(new Date());

  // View state
  const [calView, setCalView] = useState('week'); // 'week' | 'month'

  // Week state
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date()));

  // Month state
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());

  // Modal / popup state
  const [modalDate, setModalDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [popupAnchor, setPopupAnchor] = useState(null);

  const cells = calView === 'week' ? buildWeekCells(weekStart) : buildCells(year, month);

  function prevPeriod() {
    if (calView === 'week') {
      setWeekStart((ws) => {
        const d = new Date(ws);
        d.setDate(d.getDate() - 7);
        return d;
      });
    } else {
      if (month === 0) { setMonth(11); setYear((y) => y - 1); }
      else setMonth((m) => m - 1);
    }
  }

  function nextPeriod() {
    if (calView === 'week') {
      setWeekStart((ws) => {
        const d = new Date(ws);
        d.setDate(d.getDate() + 7);
        return d;
      });
    } else {
      if (month === 11) { setMonth(0); setYear((y) => y + 1); }
      else setMonth((m) => m + 1);
    }
  }

  function goToday() {
    const now = new Date();
    if (calView === 'week') {
      setWeekStart(getMondayOf(now));
    } else {
      setYear(now.getFullYear());
      setMonth(now.getMonth());
    }
  }

  function switchToWeek() {
    setWeekStart(getMondayOf(new Date()));
    setCalView('week');
  }

  function switchToMonth() {
    // Show the month that contains the current weekStart
    setYear(weekStart.getFullYear());
    setMonth(weekStart.getMonth());
    setCalView('month');
  }

  function handleCellClick(date) {
    setModalDate(date);
  }

  function handleEventClick(e, event) {
    e.stopPropagation();
    setPopupAnchor(e.currentTarget.getBoundingClientRect());
    setSelectedEvent(event);
  }

  const prevLabel = calView === 'week' ? 'Vorherige Woche' : 'Vorheriger Monat';
  const nextLabel = calView === 'week' ? 'Nächste Woche' : 'Nächster Monat';
  const headerTitle = calView === 'week'
    ? formatWeekTitle(weekStart)
    : `${MONTH_NAMES[month]} ${year}`;

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <h1 className="calendar-header__title">{headerTitle}</h1>
        <div className="calendar-header__controls">
          <div className="cal-view-toggle">
            <button
              className={`cal-view-btn${calView === 'week' ? ' cal-view-btn--active' : ''}`}
              onClick={switchToWeek}
            >Woche</button>
            <button
              className={`cal-view-btn${calView === 'month' ? ' cal-view-btn--active' : ''}`}
              onClick={switchToMonth}
            >Monat</button>
          </div>
          <div className="calendar-header__nav">
            <button className="btn btn--ghost btn--small" onClick={prevPeriod} aria-label={prevLabel}>‹</button>
            <button className="btn btn--ghost btn--small" onClick={goToday}>Heute</button>
            <button className="btn btn--ghost btn--small" onClick={nextPeriod} aria-label={nextLabel}>›</button>
          </div>
        </div>
      </div>

      <div className="calendar-weekdays">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="calendar-weekday">{d}</div>
        ))}
      </div>

      <div className={`calendar-grid${calView === 'week' ? ' calendar-grid--week' : ''}`} role="grid">
        {cells.map((cell) => {
          const cellEvents = getEventsForDate(cell.date, events);
          const isToday = cell.date === today;
          const dayNum = parseInt(cell.date.slice(8), 10);
          return (
            <div
              key={cell.date}
              className={[
                'calendar-cell',
                !cell.currentMonth ? 'calendar-cell--other-month' : '',
                isToday ? 'calendar-cell--today' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => handleCellClick(cell.date)}
              role="gridcell"
              aria-label={cell.date}
            >
              <div className={`calendar-cell__date${isToday ? ' calendar-cell__date--today' : ''}`}>
                {dayNum}
              </div>
              <div className="calendar-cell__events">
                {cellEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className={`calendar-event${ev.eventType === 'series' ? ' calendar-event--series' : ''}`}
                    onClick={(e) => handleEventClick(e, ev)}
                    title={ev.routineName}
                  >
                    {ev.eventType === 'series' && <span className="calendar-event__series-dot">↻ </span>}
                    {ev.routineName}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {modalDate && (
        <CalendarModal
          defaultDate={modalDate}
          routines={routines}
          onSave={addEvent}
          onClose={() => setModalDate(null)}
        />
      )}

      {selectedEvent && (
        <EventPopup
          event={selectedEvent}
          anchorRect={popupAnchor}
          onDelete={removeEvent}
          onClose={() => { setSelectedEvent(null); setPopupAnchor(null); }}
        />
      )}
    </div>
  );
}
