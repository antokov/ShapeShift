import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RoutineList from './RoutineList.jsx';

const ROUTINES = [
  { id: 'r-1', name: 'Push Day', description: 'Brust & Schultern', exercises: [{ id: 'e-1', name: 'Bankdrücken', sets: 3, reps: 10, duration: null }] },
  { id: 'r-2', name: 'Pull Day', description: '', exercises: [] },
];

function renderList(routines = ROUTINES, extra = {}) {
  const onNew = vi.fn();
  const onView = vi.fn();
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const onImport = vi.fn().mockResolvedValue({ imported: 1, skipped: 0 });
  render(
    <RoutineList
      routines={routines}
      onNew={onNew}
      onView={onView}
      onEdit={onEdit}
      onDelete={onDelete}
      onImport={onImport}
      {...extra}
    />
  );
  return { onNew, onView, onEdit, onDelete, onImport };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────
// Import-Button
// ─────────────────────────────────────────────────────────────

describe('RoutineList – Import-Button', () => {
  it('renders Importieren button', () => {
    renderList();
    expect(screen.getByRole('button', { name: /importieren/i })).toBeInTheDocument();
  });

  it('calls onImport with selected file', async () => {
    const { onImport } = renderList();
    const file = new File(['[]'], 'routines.json', { type: 'application/json' });
    onImport.mockResolvedValue({ imported: 0, skipped: 0 });

    const input = document.querySelector('[data-testid="file-input"]');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(onImport).toHaveBeenCalledWith(file));
  });

  it('shows success status after import', async () => {
    const { onImport } = renderList();
    onImport.mockResolvedValue({ imported: 2, skipped: 0 });
    const file = new File(['[]'], 'r.json', { type: 'application/json' });

    const input = document.querySelector('[data-testid="file-input"]');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByText(/2 routine\(n\) erfolgreich importiert/i)).toBeInTheDocument()
    );
  });

  it('shows skipped count when some routines were skipped', async () => {
    const { onImport } = renderList();
    onImport.mockResolvedValue({ imported: 3, skipped: 1 });
    const file = new File(['[]'], 'r.json', { type: 'application/json' });

    const input = document.querySelector('[data-testid="file-input"]');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByText(/3 routine\(n\) importiert, 1 übersprungen/i)).toBeInTheDocument()
    );
  });

  it('shows error status when onImport throws', async () => {
    const { onImport } = renderList();
    onImport.mockRejectedValue(new Error('Die Datei ist kein gültiges JSON.'));
    const file = new File(['not json'], 'bad.json', { type: 'application/json' });

    const input = document.querySelector('[data-testid="file-input"]');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByText(/die datei ist kein gültiges json/i)).toBeInTheDocument()
    );
  });

  it('disables button while importing', async () => {
    let resolveImport;
    const { onImport } = renderList();
    onImport.mockReturnValue(new Promise((res) => { resolveImport = res; }));

    const file = new File(['[]'], 'r.json', { type: 'application/json' });
    const input = document.querySelector('[data-testid="file-input"]');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /importieren…/i })).toBeDisabled()
    );

    resolveImport({ imported: 1, skipped: 0 });
  });
});

// ─────────────────────────────────────────────────────────────
// Infobox
// ─────────────────────────────────────────────────────────────

describe('RoutineList – Import-Infobox', () => {
  it('infobox is hidden by default', () => {
    renderList();
    expect(screen.queryByText(/routinen mit claude erstellen/i)).not.toBeInTheDocument();
  });

  it('opens infobox on ? button click', () => {
    renderList();
    fireEvent.click(screen.getByRole('button', { name: /import-hilfe anzeigen/i }));
    expect(screen.getByText(/routinen mit claude erstellen/i)).toBeInTheDocument();
  });

  it('closes infobox on ✕ button click', () => {
    renderList();
    fireEvent.click(screen.getByRole('button', { name: /import-hilfe anzeigen/i }));
    fireEvent.click(screen.getByRole('button', { name: /schließen/i }));
    expect(screen.queryByText(/routinen mit claude erstellen/i)).not.toBeInTheDocument();
  });

  it('shows the Claude prompt text', () => {
    renderList();
    fireEvent.click(screen.getByRole('button', { name: /import-hilfe anzeigen/i }));
    expect(screen.getByText(/erstelle eine json-datei mit trainingsroutinen/i)).toBeInTheDocument();
  });

  it('shows Kopieren button inside infobox', () => {
    renderList();
    fireEvent.click(screen.getByRole('button', { name: /import-hilfe anzeigen/i }));
    expect(screen.getByRole('button', { name: /kopieren/i })).toBeInTheDocument();
  });

  it('shows Kopiert! after clicking Kopieren', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    renderList();
    fireEvent.click(screen.getByRole('button', { name: /import-hilfe anzeigen/i }));
    fireEvent.click(screen.getByRole('button', { name: /^kopieren$/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /✓ kopiert!/i })).toBeInTheDocument()
    );
  });
});

// ─────────────────────────────────────────────────────────────
// Cardio routines
// ─────────────────────────────────────────────────────────────

const CARDIO_ROUTINE = {
  id: 'r-c1',
  name: 'Cardio Tag',
  routineType: 'cardio',
  exercises: [
    { id: 'ce-1', name: 'Laufen', durationMinutes: 30 },
    { id: 'ce-2', name: 'Radfahren', durationMinutes: 20 },
  ],
};

describe('RoutineList – Cardio', () => {
  it('zeigt Cardio-Badge für Cardio-Routinen', () => {
    renderList([CARDIO_ROUTINE]);
    expect(screen.getByText('Cardio')).toBeInTheDocument();
  });

  it('zeigt Gesamtminuten statt Übungsanzahl für Cardio', () => {
    renderList([CARDIO_ROUTINE]);
    expect(screen.getByText('50 min')).toBeInTheDocument();
  });

  it('zeigt Übungsanzahl für Kraft-Routinen (keine Regression)', () => {
    renderList(ROUTINES);
    expect(screen.getByText('1 Übung')).toBeInTheDocument();
    expect(screen.queryByText('Cardio')).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────
// Löschen & Bearbeiten (FS-02)
// ─────────────────────────────────────────────────────────────

describe('RoutineList – Löschen & Bearbeiten', () => {
  it('AC-01: ruft onDelete mit der richtigen id auf wenn confirm() true liefert', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { onDelete } = renderList(ROUTINES);
    const deleteButtons = screen.getAllByRole('button', { name: 'Löschen' });
    fireEvent.click(deleteButtons[0]); // Push Day (ROUTINES[0])
    expect(onDelete).toHaveBeenCalledWith('r-1');
  });

  it('AC-01: löscht die richtige Karte bei mehreren Routinen (zweite Karte)', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { onDelete } = renderList(ROUTINES);
    const deleteButtons = screen.getAllByRole('button', { name: 'Löschen' });
    fireEvent.click(deleteButtons[1]); // Pull Day (ROUTINES[1])
    expect(onDelete).toHaveBeenCalledWith('r-2');
  });

  it('AC-02: ruft onDelete NICHT auf wenn confirm() false liefert', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { onDelete } = renderList(ROUTINES);
    const deleteButtons = screen.getAllByRole('button', { name: 'Löschen' });
    fireEvent.click(deleteButtons[0]);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('AC-03: confirm() wird mit dem Routinennamen im Text aufgerufen', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderList(ROUTINES);
    const deleteButtons = screen.getAllByRole('button', { name: 'Löschen' });
    fireEvent.click(deleteButtons[0]);
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('Push Day'));
  });

  it('AC-03: confirm() enthält den Namen der zweiten Karte, nicht den der ersten', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderList(ROUTINES);
    const deleteButtons = screen.getAllByRole('button', { name: 'Löschen' });
    fireEvent.click(deleteButtons[1]);
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('Pull Day'));
    expect(confirmSpy).not.toHaveBeenCalledWith(expect.stringContaining('Push Day'));
  });

  it('AC-04: ruft onEdit mit der richtigen id auf', () => {
    const { onEdit } = renderList(ROUTINES);
    const editButtons = screen.getAllByRole('button', { name: 'Bearbeiten' });
    fireEvent.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalledWith('r-1');
  });

  it('AC-04: bearbeitet die richtige Karte bei mehreren Routinen (zweite Karte)', () => {
    const { onEdit } = renderList(ROUTINES);
    const editButtons = screen.getAllByRole('button', { name: 'Bearbeiten' });
    fireEvent.click(editButtons[1]);
    expect(onEdit).toHaveBeenCalledWith('r-2');
  });

  it('AC-05: Klick auf Löschen löst NICHT onView aus (confirm=true)', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { onView } = renderList(ROUTINES);
    const deleteButtons = screen.getAllByRole('button', { name: 'Löschen' });
    fireEvent.click(deleteButtons[0]);
    expect(onView).not.toHaveBeenCalled();
  });

  it('AC-05: Klick auf Löschen löst NICHT onView aus (confirm=false)', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { onView } = renderList(ROUTINES);
    const deleteButtons = screen.getAllByRole('button', { name: 'Löschen' });
    fireEvent.click(deleteButtons[0]);
    expect(onView).not.toHaveBeenCalled();
  });

  it('AC-05: Klick auf Bearbeiten löst NICHT onView aus', () => {
    const { onView } = renderList(ROUTINES);
    const editButtons = screen.getAllByRole('button', { name: 'Bearbeiten' });
    fireEvent.click(editButtons[0]);
    expect(onView).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// Drucken pro Karte
// ─────────────────────────────────────────────────────────────

describe('RoutineList – Drucken pro Karte', () => {
  it('zeigt Drucker-Button für jede Routine-Karte', () => {
    renderList(ROUTINES);
    const printBtns = screen.getAllByRole('button', { name: /drucken/i });
    expect(printBtns).toHaveLength(ROUTINES.length);
  });

  it('kein globaler Drucken-Button im Header', () => {
    renderList(ROUTINES);
    expect(screen.queryByRole('button', { name: /^routinen drucken$/i })).not.toBeInTheDocument();
  });

  it('Drucker-Button pro Karte hat korrektes aria-label', () => {
    renderList(ROUTINES);
    expect(screen.getByRole('button', { name: /push day drucken/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pull day drucken/i })).toBeInTheDocument();
  });

  it('ruft window.print() beim Klick auf Karten-Drucker-Button auf', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderList(ROUTINES);
    fireEvent.click(screen.getByRole('button', { name: /push day drucken/i }));
    await waitFor(() => expect(printSpy).toHaveBeenCalledTimes(1));
    printSpy.mockRestore();
  });

  it('Klick auf Drucker-Button propagiert nicht zum Karten-Klick (onView)', () => {
    const { onView } = renderList(ROUTINES);
    vi.spyOn(window, 'print').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: /push day drucken/i }));
    expect(onView).not.toHaveBeenCalled();
  });

  it('zeigt keine Drucken-Buttons wenn keine Routinen vorhanden', () => {
    renderList([]);
    expect(screen.queryByRole('button', { name: /drucken/i })).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────
// RoutinePrint – Drucklayout
// ─────────────────────────────────────────────────────────────

import RoutinePrint from './RoutinePrint.jsx';

const PRINT_ROUTINES = [
  {
    id: 'rp-1',
    name: 'Push Day',
    description: 'Brust & Schultern',
    routineType: 'strength',
    exercises: [
      { id: 'ep-1', name: 'Bankdrücken', sets: 4, reps: 8, duration: null },
      { id: 'ep-2', name: 'Trizeps Pushdown', sets: 3, reps: null, duration: 45 },
    ],
  },
  {
    id: 'rp-2',
    name: 'Cardio Tag',
    description: '',
    routineType: 'cardio',
    exercises: [
      { id: 'ep-3', name: 'Laufen', durationMinutes: 30 },
    ],
  },
];

describe('RoutinePrint – Drucklayout', () => {
  it('rendert alle Routinen-Namen', () => {
    render(<RoutinePrint routines={PRINT_ROUTINES} />);
    expect(screen.getByText('Push Day')).toBeInTheDocument();
    expect(screen.getByText('Cardio Tag')).toBeInTheDocument();
  });

  it('rendert Beschreibung wenn vorhanden', () => {
    render(<RoutinePrint routines={PRINT_ROUTINES} />);
    expect(screen.getByText('Brust & Schultern')).toBeInTheDocument();
  });

  it('rendert Kraftübung mit Sätze × Wdh.', () => {
    render(<RoutinePrint routines={PRINT_ROUTINES} />);
    expect(screen.getByText('4 × 8 Wdh.')).toBeInTheDocument();
  });

  it('rendert Kraftübung mit Sätze × Sek. wenn duration gesetzt', () => {
    render(<RoutinePrint routines={PRINT_ROUTINES} />);
    expect(screen.getByText('3 × 45 Sek.')).toBeInTheDocument();
  });

  it('rendert Cardio-Übung mit Dauer in Minuten', () => {
    render(<RoutinePrint routines={PRINT_ROUTINES} />);
    expect(screen.getByText('30 min')).toBeInTheDocument();
  });

  it('zeigt Kraft-Spaltenköpfe: Sätze × Wdh., Gewicht, Bewertung, Notizen', () => {
    render(<RoutinePrint routines={[PRINT_ROUTINES[0]]} />);
    expect(screen.getByText(/sätze × wdh\./i)).toBeInTheDocument();
    expect(screen.getByText(/gewicht/i)).toBeInTheDocument();
    expect(screen.getByText(/bew\. \/5/i)).toBeInTheDocument();
    expect(screen.getAllByText(/notizen/i).length).toBeGreaterThan(0);
  });

  it('zeigt Cardio-Spaltenköpfe: Dauer + Notizen (ohne Gewicht/Bewertung)', () => {
    render(<RoutinePrint routines={[PRINT_ROUTINES[1]]} />);
    expect(screen.getByText(/dauer/i)).toBeInTheDocument();
    expect(screen.queryByText(/gewicht/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/bew\. \/5/i)).not.toBeInTheDocument();
  });

  it('rendert "Keine Übungen" für leere Routine', () => {
    const emptyRoutine = { id: 'r-empty', name: 'Leer', exercises: [], routineType: 'strength' };
    render(<RoutinePrint routines={[emptyRoutine]} />);
    expect(screen.getByText('Keine Übungen')).toBeInTheDocument();
  });

  it('rendert leere Liste ohne Fehler', () => {
    const { container } = render(<RoutinePrint routines={[]} />);
    expect(container.querySelector('.routine-print-only')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────
// useRoutines – importRoutines
// ─────────────────────────────────────────────────────────────

import { renderHook, act, waitFor as waitForHook } from '@testing-library/react';
import { useRoutines } from '../hooks/useRoutines.js';

const VALID_JSON = JSON.stringify([
  { name: 'Push Day', description: 'Test', exercises: [{ name: 'Bankdrücken', sets: 3, reps: 10 }] },
]);

function makeFile(content, name = 'routines.json') {
  const file = new File([content], name, { type: 'application/json' });
  // jsdom does not implement Blob.text() — polyfill for tests
  file.text = () => Promise.resolve(content);
  return file;
}

function mockFetchSequence(responses) {
  let i = 0;
  global.fetch = vi.fn().mockImplementation(() => {
    const { data, status = 200 } = responses[i++] ?? { data: [] };
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: async () => data,
    });
  });
}

const CREATED_ROUTINE = {
  id: 'new-id',
  name: 'Push Day',
  description: 'Test',
  exercises: [{ id: 'e-id', name: 'Bankdrücken', sets: 3, reps: 10, duration: null }],
  createdAt: '2026-06-12T00:00:00.000Z',
};

describe('useRoutines – importRoutines', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws for invalid JSON', async () => {
    mockFetchSequence([{ data: [] }]);
    const { result } = renderHook(() => useRoutines());
    await waitForHook(() => expect(result.current.loading).toBe(false));

    await expect(
      act(() => result.current.importRoutines(makeFile('not-json')))
    ).rejects.toThrow('Die Datei ist kein gültiges JSON.');
  });

  it('throws when JSON is not an array', async () => {
    mockFetchSequence([{ data: [] }]);
    const { result } = renderHook(() => useRoutines());
    await waitForHook(() => expect(result.current.loading).toBe(false));

    await expect(
      act(() => result.current.importRoutines(makeFile(JSON.stringify({ name: 'oops' }))))
    ).rejects.toThrow('Die Datei muss ein JSON-Array von Routinen enthalten.');
  });

  it('throws for empty array', async () => {
    mockFetchSequence([{ data: [] }]);
    const { result } = renderHook(() => useRoutines());
    await waitForHook(() => expect(result.current.loading).toBe(false));

    await expect(
      act(() => result.current.importRoutines(makeFile('[]')))
    ).rejects.toThrow('Die Datei enthält keine Routinen.');
  });

  it('imports valid routines and updates state', async () => {
    mockFetchSequence([
      { data: [] },
      { data: CREATED_ROUTINE, status: 201 },
    ]);
    const { result } = renderHook(() => useRoutines());
    await waitForHook(() => expect(result.current.loading).toBe(false));

    let importResult;
    await act(async () => {
      importResult = await result.current.importRoutines(makeFile(VALID_JSON));
    });

    expect(importResult).toEqual({ imported: 1, skipped: 0 });
    expect(result.current.routines).toHaveLength(1);
    expect(result.current.routines[0].name).toBe('Push Day');
  });

  it('skips routines without a name', async () => {
    const json = JSON.stringify([{ name: 'Valid' }, { description: 'no name' }]);
    mockFetchSequence([
      { data: [] },
      { data: { ...CREATED_ROUTINE, name: 'Valid' }, status: 201 },
    ]);
    const { result } = renderHook(() => useRoutines());
    await waitForHook(() => expect(result.current.loading).toBe(false));

    let importResult;
    await act(async () => {
      importResult = await result.current.importRoutines(makeFile(json));
    });

    expect(importResult).toEqual({ imported: 1, skipped: 1 });
  });

  it('POSTs to /api/routines', async () => {
    mockFetchSequence([
      { data: [] },
      { data: CREATED_ROUTINE, status: 201 },
    ]);
    const { result } = renderHook(() => useRoutines());
    await waitForHook(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.importRoutines(makeFile(VALID_JSON));
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/routines',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
