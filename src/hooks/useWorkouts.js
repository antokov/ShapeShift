import { useState, useEffect } from 'react';

const API = '/api';

function sortDesc(workouts) {
  return [...workouts].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function useWorkouts(username = 'admin') {
  const [workouts, setWorkouts] = useState([]);
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
    apiFetch('/workouts')
      .then(setWorkouts)
      .catch(() => setWorkouts([]))
      .finally(() => setLoading(false));
  }, [username]);

  async function addWorkout(workout) {
    const created = await apiFetch('/workouts', {
      method: 'POST',
      body: JSON.stringify(workout),
    });
    setWorkouts((prev) => sortDesc([created, ...prev]));
  }

  async function updateWorkout(id, workout) {
    const updated = await apiFetch(`/workouts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(workout),
    });
    setWorkouts((prev) => sortDesc(prev.map((w) => (w.id === id ? updated : w))));
  }

  async function deleteWorkout(id) {
    await apiFetch(`/workouts/${id}`, { method: 'DELETE' });
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  }

  return { workouts, loading, addWorkout, updateWorkout, deleteWorkout };
}
