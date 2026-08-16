# Architecture Decision: FS-03 — Integrationstest App.jsx: View-Wechsel + Edit-Flow

## Files to Modify

Keine (nur neue Datei).

## New Files to Create

1. **`src/App.test.jsx`** — erste Testdatei für `App.jsx`, Integrationstests für view-Wechsel + Edit-Flow

---

## Exact Changes

### 1. `src/App.test.jsx` — Setup (Mocks, Fixtures, Helper)

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';
import { initAuth } from './hooks/useAuth.js';

// Vermeidet den echten GitHub-Fetch von useExerciseLibrary (wird in RoutineForm gerendert)
vi.mock('./hooks/useExerciseLibrary.js', () => ({
  useExerciseLibrary: () => ({ exercises: [], loading: false, error: null }),
}));

const ROUTINE_A = {
  id: 'r-1', name: 'Push Day', description: '', routineType: 'strength',
  exercises: [{ id: 'e-1', name: 'Bankdrücken', sets: 3, reps: 10, duration: null }],
  createdAt: '2026-06-01T00:00:00.000Z',
};

const CREATED_ROUTINE = {
  id: 'new-id', name: 'Pull Day', description: '', routineType: 'strength',
  exercises: [{ id: 'e-2', name: 'Klimmzüge', sets: 3, reps: 8, duration: null }],
  createdAt: '2026-08-05T00:00:00.000Z',
};

const UPDATED_ROUTINE = { ...ROUTINE_A, name: 'Push Day (aktualisiert)' };

/**
 * URL-Pattern-basierter Fetch-Mock (BR-03/Q-01) — deckt alle vier von AppShell
 * geladenen Endpunkte ab plus POST/PUT /api/routines für den Edit-Flow.
 * routinesGet: Rückgabe für GET /api/routines (Default: [ROUTINE_A])
 * onRoutinesWrite: optionaler Handler für POST/PUT, liefert { status, body }
 */
function mockAppFetch({ routinesGet = [ROUTINE_A], onRoutinesWrite } = {}) {
  global.fetch = vi.fn().mockImplementation((url, options = {}) => {
    const method = options.method ?? 'GET';
    if (url.includes('/api/routines') && method === 'GET') {
      return Promise.resolve({ ok: true, status: 200, json: async () => routinesGet });
    }
    if (url.includes('/api/routines') && (method === 'POST' || method === 'PUT')) {
      const { status, body } = onRoutinesWrite
        ? onRoutinesWrite(url, method, JSON.parse(options.body))
        : { status: 201, body: CREATED_ROUTINE };
      return Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body });
    }
    if (url.includes('/api/workouts')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => [] });
    }
    if (url.includes('/api/calendar')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => [] });
    }
    if (url.includes('/api/garmin/activities')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => [] });
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
  });
}

async function loginAsAdmin() {
  await initAuth();
  localStorage.setItem('fitnessapp_session', JSON.stringify({ username: 'admin' }));
}

async function renderLoggedIn(fetchOpts) {
  mockAppFetch(fetchOpts);
  await loginAsAdmin();
  render(<App />);
  await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});
```

- `mockAppFetch` deckt BR-03 vollständig ab (alle vier Read-Endpunkte + Routine-Write-Pfade).
- `loginAsAdmin` realisiert BR-02 ohne `useAuth.js`-Mock (echter `initAuth()`-Durchlauf, Q-02).
- `renderLoggedIn` wartet auf „Dashboard" (Sidebar-Item, das nach dem Laden des `AppShell` sichtbar ist) als Signal, dass der Auth-Gate-Übergang abgeschlossen ist.

### 2. `src/App.test.jsx` — AC-01 (View-Wechsel)

```jsx
describe('App – View-Wechsel (AC-01)', () => {
  it('Klick auf "Routinen" in der Sidebar wechselt zur Routinenliste', async () => {
    await renderLoggedIn();
    fireEvent.click(screen.getByRole('button', { name: 'Routinen' }));
    await waitFor(() => expect(screen.getByText('Meine Routinen')).toBeInTheDocument());
    expect(screen.queryByText('Dashboard', { selector: 'h1' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Routinen' })).toHaveAttribute('aria-current', 'page');
  });
});
```

*(Falls „Dashboard" als `h1`-Titeltext nicht existiert, an Dashboard.jsx-Konvention anpassen — Dev prüft beim Implementieren; primäre Assertion ist das Erscheinen von „Meine Routinen" und `aria-current` auf dem Sidebar-Button.)*

### 3. `src/App.test.jsx` — AC-02 (Neue Routine anlegen)

```jsx
describe('App – Neue Routine anlegen (AC-02)', () => {
  it('Formular → Speichern legt neue Routine an und kehrt zur Liste zurück', async () => {
    const user = userEvent.setup();
    await renderLoggedIn();
    fireEvent.click(screen.getByRole('button', { name: 'Routinen' }));
    await waitFor(() => expect(screen.getByText('Meine Routinen')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /\+ neue routine/i }));
    expect(screen.getByRole('heading', { name: 'Neue Routine' })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/name \*/i), 'Pull Day');
    const exerciseInputs = screen.getAllByPlaceholderText(/kniebeuge/i);
    await user.type(exerciseInputs[0], 'Klimmzüge');
    const numberInputs = screen.getAllByRole('spinbutton');
    await user.clear(numberInputs[0]);
    await user.type(numberInputs[0], '3');
    await user.clear(numberInputs[1]);
    await user.type(numberInputs[1], '8');

    fireEvent.click(screen.getByRole('button', { name: /^speichern$/i }));
    await waitFor(() => expect(screen.getByText('Meine Routinen')).toBeInTheDocument());
    expect(screen.getByText('Pull Day')).toBeInTheDocument();
  });
});
```

### 4. `src/App.test.jsx` — AC-03 (Bestehende Routine bearbeiten)

```jsx
describe('App – Routine bearbeiten (AC-03)', () => {
  it('Bearbeiten-Button öffnet vorausgefülltes Formular, Speichern kehrt zur Liste zurück', async () => {
    await renderLoggedIn({
      onRoutinesWrite: (url, method) =>
        method === 'PUT' ? { status: 200, body: UPDATED_ROUTINE } : { status: 201, body: CREATED_ROUTINE },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Routinen' }));
    await waitFor(() => expect(screen.getByText('Push Day')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }));
    expect(screen.getByRole('heading', { name: 'Routine bearbeiten' })).toBeInTheDocument();
    expect(screen.getByLabelText(/name \*/i)).toHaveValue('Push Day');

    fireEvent.click(screen.getByRole('button', { name: /^speichern$/i }));
    await waitFor(() => expect(screen.getByText('Meine Routinen')).toBeInTheDocument());
  });
});
```

### 5. `src/App.test.jsx` — AC-04 (Detail → Bearbeiten → Abbrechen)

```jsx
describe('App – Detail → Bearbeiten → Abbrechen (AC-04)', () => {
  it('Abbrechen aus dem über Detail geöffneten Formular kehrt zur Liste zurück (nicht Detail)', async () => {
    await renderLoggedIn();
    fireEvent.click(screen.getByRole('button', { name: 'Routinen' }));
    await waitFor(() => expect(screen.getByText('Push Day')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /push day ansehen/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Push Day' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }));
    expect(screen.getByRole('heading', { name: 'Routine bearbeiten' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /abbrechen/i }));
    await waitFor(() => expect(screen.getByText('Meine Routinen')).toBeInTheDocument());
  });
});
```

*(Aria-label des Karten-Klick-Ziels in `RoutineList.jsx` prüfen — Zeile 221: `aria-label={`${routine.name} ansehen`}` — Dev übernimmt exakten Wortlaut.)*

### 6. `src/App.test.jsx` — AC-05 (Fehlgeschlagenes Speichern)

```jsx
describe('App – Fehlgeschlagenes Speichern (AC-05)', () => {
  it('bleibt im Formular und zeigt Fehlermeldung wenn PUT fehlschlägt', async () => {
    await renderLoggedIn({
      onRoutinesWrite: (url, method) =>
        method === 'PUT' ? { status: 500, body: { detail: 'Serverfehler' } } : { status: 201, body: CREATED_ROUTINE },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Routinen' }));
    await waitFor(() => expect(screen.getByText('Push Day')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }));
    fireEvent.click(screen.getByRole('button', { name: /^speichern$/i }));

    await waitFor(() => expect(screen.getByText(/speichern fehlgeschlagen/i)).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Routine bearbeiten' })).toBeInTheDocument();
    expect(screen.queryByText('Meine Routinen')).not.toBeInTheDocument();
  });
});
```

---

## Patterns to Follow

- URL-Pattern-Fetch-Mock im Stil von `GarminView.test.jsx`s `mockFetchByUrl`, erweitert um Methoden-Unterscheidung (`GET` vs. `POST`/`PUT`), da `/api/routines` mehrfach mit unterschiedlichen Methoden im selben Testlauf gemockt werden muss (Q-01).
- Formular-Interaktion exakt nach dem in `RoutineForm.test.jsx` etablierten Muster: `getByLabelText(/name \*/i)` für den Routinen-Namen, `getAllByPlaceholderText(/kniebeuge/i)` für Übungsnamen, `getAllByRole('spinbutton')` für Zahlenfelder (Sätze/Wdh.) — **nicht** `getByLabelText` für Übungsfelder, da diese `<label>`-Elemente kein `htmlFor` haben.
- `vi.mock('./hooks/useExerciseLibrary.js', …)` exakt wie in `RoutineForm.test.jsx`, um den externen GitHub-Fetch zu vermeiden.
- Kein Mocken von `useAuth.js` — echter `initAuth()`-Durchlauf + direktes Setzen der Session in `localStorage` (BR-02).

## Constraints (DO NOT)

- KEINE Änderung an `App.jsx` — reine Testabdeckung, kein Bugfix, sofern kein Defekt auffällt (Analyse hat keinen gefunden).
- KEIN separater Export von `AppShell` nur um das Testen zu vereinfachen — Test rendert `App` (Default-Export) durch das echte Auth-Gate (BR-01).
- KEIN Mocken von `RoutineList`/`RoutineDetail`/`RoutineForm`/`Sidebar` — das widerspräche dem Integrationstest-Charakter der Story; nur `useExerciseLibrary` wird gemockt (externe Netzwerkabhängigkeit, kein interner Komponentencode).
- KEIN globaler `beforeEach`-Mock für `window.confirm` — in dieser Story nicht benötigt (kein Löschen-Test, siehe Out of Scope).
- KEINE Tests für andere Views (Garmin, Coach, etc.) über AC-01 hinaus — Umfang exakt wie in story.md Out-of-Scope festgelegt.

## Reference Files

- `src/App.jsx` (vollständig gelesen — `AppShell`-State-Machine, `handleEdit`/`handleEditFromDetail`/`handleSave`/`handleCancel`)
- `src/pages/RoutineForm.jsx` (Zeilen 56-135 — Formular-Struktur, Validierung, `isEdit`-Titel-Logik)
- `src/pages/RoutineForm.test.jsx` (vollständig gelesen — `vi.mock('../hooks/useExerciseLibrary.js', …)`-Muster, Formular-Ausfüll-Konventionen mit `getAllByPlaceholderText`/`getAllByRole('spinbutton')`)
- `src/pages/RoutineList.jsx` (Zeilen 214-289 — Karten-Struktur, `aria-label`s für Ansehen/Bearbeiten/Drucken/Löschen)
- `src/pages/RoutineDetail.jsx` (Zeilen 17-35 — „Bearbeiten"-Button ohne routinen-spezifisches Label, da `onEdit` bereits als no-arg-Callback von `App.jsx` gebunden wird)
- `src/hooks/useAuth.js` + `src/hooks/useAuth.test.js` (Auth-Bootstrap-Muster ohne Mock)
- `src/pages/GarminView.test.jsx` (`mockFetchByUrl`-Muster als Vorlage für den URL-Pattern-Fetch-Mock)
- `.claude/workspace/story.md`
- `.claude/workspace/analysis.md`
