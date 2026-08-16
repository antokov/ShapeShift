import { getActiveUsername } from '../hooks/useAuth.js';

export const CLAUDE_PROMPT = `Ich nutze eine Fitness-App und möchte personalisierte Trainingsempfehlungen von dir.

Im Anhang ist eine JSON-Datei mit meinen vollständigen Fitnessdaten:
• Persönliches Profil (Name, Alter, Gewicht, Größe, Ziele, Equipment)
• Meine Trainingsroutinen mit allen Übungen
• Meine komplette Trainingshistorie (Workouts mit Sätzen, Gewichten, Bewertungen)
• Mein Wochentrainingsplan
• Garmin-Gesundheitsdaten (falls verfügbar)

Bitte analysiere meine Daten und gib mir:
1. Konkrete Trainingsempfehlungen basierend auf meiner Historie und meinen Zielen
2. Analyse meiner Fortschritte sowie identifizierte Stärken und Schwächen
3. Vorschläge zur Verbesserung oder Ergänzung meiner Routinen
4. Allgemeine Gesundheits- und Trainingsempfehlungen passend zu meinem Profil

Bitte lade die JSON-Datei hoch und beginne deine Analyse.`;

export function loadProfile() {
  try {
    const username = getActiveUsername();
    const raw = localStorage.getItem(`fitnessapp_${username}_profile`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function parseExerciseData(str) {
  try {
    const parsed = JSON.parse(str || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function buildExportPayload({ workouts, routines, calendarEvents, garminHealth }) {
  const profile = loadProfile();

  const enrichedWorkouts = workouts.map((w) => ({
    ...w,
    exerciseData: parseExerciseData(w.exerciseData),
  }));

  return {
    _exportedAt: new Date().toISOString(),
    _prompt: CLAUDE_PROMPT,
    profile,
    routines,
    workouts: enrichedWorkouts,
    calendarEvents: calendarEvents ?? [],
    garminHealth: garminHealth ?? null,
  };
}

export function downloadJson(payload, filename) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function fetchGarminHealth() {
  try {
    const r = await fetch('/api/garmin/health');
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
}

export async function fetchGarminHealthHistory(metrics = ['steps', 'restingHeartRate', 'bodyBattery', 'sleepDuration', 'averageStressLevel', 'intensityMinutes']) {
  const results = await Promise.allSettled(
    metrics.map((m) =>
      fetch(`/api/garmin/health/history?metric=${m}&period=4w`).then((r) => (r.ok ? r.json() : null))
    )
  );
  const history = {};
  metrics.forEach((m, i) => {
    const r = results[i];
    history[m] = r.status === 'fulfilled' ? r.value : null;
  });
  return history;
}

export async function fetchGarminHRV() {
  try {
    const r = await fetch('/api/garmin/hrv');
    if (!r.ok) return null;
    const data = await r.json();
    return Object.keys(data).length > 0 ? data : null;
  } catch {
    return null;
  }
}
