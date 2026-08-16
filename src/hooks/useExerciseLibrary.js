import { useState, useEffect } from 'react';

const URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

export function getExerciseImage(name, exercises) {
  if (!name || !exercises?.length) return null;
  const lower = name.toLowerCase();
  const found = exercises.find((e) => e.name.toLowerCase() === lower);
  if (!found?.images?.length) return null;
  return IMAGE_BASE + found.images[0];
}

export function getExerciseImages(name, exercises) {
  if (!name || !exercises?.length) return [];
  const lower = name.toLowerCase();
  const found = exercises.find((e) => e.name.toLowerCase() === lower);
  if (!found?.images?.length) return [];
  return found.images.map((img) => IMAGE_BASE + img);
}

export function getExerciseInstructions(name, exercises) {
  if (!name || !exercises?.length) return [];
  const lower = name.toLowerCase();
  const found = exercises.find((e) => e.name.toLowerCase() === lower);
  return found?.instructions ?? [];
}

let _cache = null;
let _promise = null;

export function useExerciseLibrary() {
  const [exercises, setExercises] = useState(_cache ?? []);
  const [loading, setLoading] = useState(_cache === null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (_cache !== null) {
      setExercises(_cache);
      setLoading(false);
      return;
    }
    if (!_promise) {
      _promise = fetch(URL)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((data) => {
          _cache = data;
          return data;
        })
        .catch((err) => {
          _promise = null;
          throw err;
        });
    }
    _promise
      .then((data) => {
        setExercises(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Übungsdatenbank konnte nicht geladen werden.');
        setLoading(false);
      });
  }, []);

  return { exercises, loading, error };
}
