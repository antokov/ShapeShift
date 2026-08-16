import { useState, useEffect } from 'react';
import { generateId } from '../utils/uuid.js';
import { API_BASE } from '../utils/apiBase.js';

const API = `${API_BASE}/api`;

export function useRoutines(username = 'admin') {
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    apiFetch('/routines')
      .then(setRoutines)
      .catch(() => setError('Server nicht erreichbar. Bitte Backend starten.'))
      .finally(() => setLoading(false));
  }, [username]);

  async function addRoutine(routine) {
    const created = await apiFetch('/routines', {
      method: 'POST',
      body: JSON.stringify(routine),
    });
    setRoutines((prev) => [...prev, created]);
  }

  async function updateRoutine(id, routine) {
    const updated = await apiFetch(`/routines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(routine),
    });
    setRoutines((prev) => prev.map((r) => (r.id === id ? updated : r)));
  }

  async function deleteRoutine(id) {
    await apiFetch(`/routines/${id}`, { method: 'DELETE' });
    setRoutines((prev) => prev.filter((r) => r.id !== id));
  }

  async function importRoutines(file) {
    const text = await file.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('Die Datei ist kein gültiges JSON.');
    }
    if (!Array.isArray(parsed)) {
      throw new Error('Die Datei muss ein JSON-Array von Routinen enthalten.');
    }
    if (parsed.length === 0) {
      throw new Error('Die Datei enthält keine Routinen.');
    }

    const valid = parsed.filter((r) => r && typeof r.name === 'string' && r.name.trim());
    const skipped = parsed.length - valid.length;

    for (const raw of valid) {
      const routine = {
        id: generateId(),
        name: raw.name.trim(),
        description: raw.description ?? '',
        exercises: (raw.exercises ?? []).map((ex) => ({
          id: generateId(),
          name: ex.name ?? '',
          sets: Number(ex.sets) || 1,
          reps: ex.reps != null ? Number(ex.reps) : null,
          duration: ex.duration != null ? Number(ex.duration) : null,
        })),
        createdAt: raw.createdAt ?? new Date().toISOString(),
      };
      const created = await apiFetch('/routines', {
        method: 'POST',
        body: JSON.stringify(routine),
      });
      setRoutines((prev) => [...prev, created]);
    }
    return { imported: valid.length, skipped };
  }

  return { routines, loading, error, addRoutine, updateRoutine, deleteRoutine, importRoutines };
}
