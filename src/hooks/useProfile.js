import { useState } from 'react';
import { getActiveUsername } from './useAuth.js';

const STORAGE_KEY = (username) => `fitnessapp_${username}_profile`;

const DEFAULT_PROFILE = {
  vorname: '',
  geburtsdatum: null,
  geschlecht: null,
  gewicht: null,
  groesse: null,
  ziele: [],
  equipment: [],
  erfahrungsstufe: null,
  trainingsTageProWoche: null,
  verletzungen: '',
};

function loadFromStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : { ...DEFAULT_PROFILE };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // EC-03: localStorage not available (Private Browsing) — silent fallback
  }
}

export function useProfile(username) {
  const activeUser = username ?? getActiveUsername();
  const key = STORAGE_KEY(activeUser);

  const [profile, setProfile] = useState(() => loadFromStorage(key));

  function updateProfile(patch) {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      saveToStorage(key, next);
      return next;
    });
  }

  function toggleArrayItem(field, value) {
    setProfile((prev) => {
      const arr = prev[field] ?? [];
      const next = arr.includes(value)
        ? arr.filter((v) => v !== value)
        : [...arr, value];
      const updated = { ...prev, [field]: next };
      saveToStorage(key, updated);
      return updated;
    });
  }

  return { profile, updateProfile, toggleArrayItem };
}
