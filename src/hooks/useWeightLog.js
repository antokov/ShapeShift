import { useState } from 'react';
import { getActiveUsername } from './useAuth.js';

const STORAGE_KEY = (username) => `fitnessapp_${username}_weight_log`;

function todayISO() {
  return new Date().toLocaleDateString('sv');
}

function loadEntries(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntries(key, entries) {
  try {
    localStorage.setItem(key, JSON.stringify(entries));
  } catch {
    // silent fallback (Private Browsing / quota)
  }
}

export function useWeightLog(username) {
  const activeUser = username ?? getActiveUsername();
  const key = STORAGE_KEY(activeUser);

  const [entries, setEntries] = useState(() => loadEntries(key));

  function addEntry(weight, date = todayISO()) {
    if (!weight || weight <= 0) return;
    setEntries((prev) => {
      const filtered = prev.filter((e) => e.date !== date);
      const next = [{ date, weight: Number(weight) }, ...filtered]
        .sort((a, b) => b.date.localeCompare(a.date));
      saveEntries(key, next);
      return next;
    });
  }

  function removeEntry(date) {
    setEntries((prev) => {
      const next = prev.filter((e) => e.date !== date);
      saveEntries(key, next);
      return next;
    });
  }

  return { entries, addEntry, removeEntry };
}
