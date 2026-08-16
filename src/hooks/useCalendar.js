import { useState, useEffect } from 'react';
import { API_BASE } from '../utils/apiBase.js';

const API = `${API_BASE}/api`;

// Sunday=0 in JS, Monday=1...Saturday=6, Sunday=0
const JS_DAY_TO_KEY = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

export function getEventsForDate(dateStr, events) {
  const d = new Date(dateStr + 'T12:00:00');
  const dayKey = JS_DAY_TO_KEY[d.getDay()];
  return events.filter((e) => {
    if (e.eventType === 'single') return e.date === dateStr;
    if (e.eventType === 'series') {
      return (
        dateStr >= e.startDate &&
        (e.recurrenceDays ?? []).includes(dayKey)
      );
    }
    return false;
  });
}

export function useCalendar(username = 'admin') {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  async function apiFetch(path, options = {}) {
    const r = await fetch(`${API}${path}`, {
      headers: { 'Content-Type': 'application/json', 'X-User-Id': username },
      ...options,
    });
    if (!r.ok) throw new Error(`API ${r.status}: ${path}`);
    if (r.status === 204) return null;
    return r.json();
  }

  useEffect(() => {
    apiFetch('/calendar')
      .then((data) => setEvents(data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username]);

  async function addEvent(event) {
    setEvents((prev) => [...prev, event]);
    try {
      await apiFetch('/calendar', { method: 'POST', body: JSON.stringify(event) });
    } catch {
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
    }
  }

  async function removeEvent(id) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    try {
      await apiFetch(`/calendar/${id}`, { method: 'DELETE' });
    } catch {
      // silent — event already removed from UI
    }
  }

  return { events, loading, addEvent, removeEvent };
}
