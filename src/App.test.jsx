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
 * URL-Pattern-basierter Fetch-Mock — deckt alle vier von AppShell geladenen
 * Endpunkte ab plus POST/PUT /api/routines für den Edit-Flow.
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
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Fitness' })).toBeInTheDocument());
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('App – View-Wechsel (AC-01)', () => {
  it('Klick auf "Routinen" in der Sidebar wechselt zur Routinenliste', async () => {
    await renderLoggedIn();
    fireEvent.click(screen.getByRole('button', { name: 'Routinen' }));
    await waitFor(() => expect(screen.getByText('Meine Routinen')).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: 'Fitness' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Routinen' })).toHaveAttribute('aria-current', 'page');
  });
});

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

describe('App – Sidebar-Navigation während offenem Formular (State-Machine)', () => {
  it('Direkter Sidebar-Klick weg vom Formular (statt Abbrechen) navigiert weg und setzt editingId beim Rücksprung zur Liste zurück', async () => {
    await renderLoggedIn();
    fireEvent.click(screen.getByRole('button', { name: 'Routinen' }));
    await waitFor(() => expect(screen.getByText('Push Day')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }));
    expect(screen.getByRole('heading', { name: 'Routine bearbeiten' })).toBeInTheDocument();

    // Statt "Abbrechen" im Formular zu klicken, direkt über die Sidebar wegnavigieren
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Fitness' })).toBeInTheDocument());

    // Zurück zu "Routinen" — Liste, nicht das noch offene Bearbeiten-Formular
    fireEvent.click(screen.getByRole('button', { name: 'Routinen' }));
    await waitFor(() => expect(screen.getByText('Meine Routinen')).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: 'Routine bearbeiten' })).not.toBeInTheDocument();
  });
});

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
