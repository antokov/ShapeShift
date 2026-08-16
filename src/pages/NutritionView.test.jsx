import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NutritionView from './NutritionView.jsx';

vi.mock('../hooks/useProfile.js', () => ({
  useProfile: vi.fn(() => ({
    profile: { vorname: 'Anton', ziele: ['Muskelaufbau'], trainingsTageProWoche: 4 },
  })),
}));

vi.mock('../hooks/useNutrition.js', () => ({
  useNutrition: vi.fn(),
}));

vi.mock('../utils/uuid.js', () => ({
  generateId: vi.fn(() => 'test-plan-id'),
}));

import { useNutrition } from '../hooks/useNutrition.js';

const SETTINGS_EMPTY = {
  ernährungsform: null, allergien: [], mahlzeitenProTag: 3,
  kalorienzielModus: 'auto', kalorienziel: null,
  lebensmittelMag: [], lebensmittelMagNicht: [],
};

const SETTINGS_DONE = {
  ernährungsform: 'Omnivor', allergien: [], mahlzeitenProTag: 3,
  kalorienzielModus: 'auto', kalorienziel: 2500,
  lebensmittelMag: ['Lachs'], lebensmittelMagNicht: [],
};

const FAKE_PLAN_TEXT = '## Montag, 16.06.2026 (Trainingstag – Push Day) — 2700 kcal | P: 180g | KH: 310g | F: 75g\n\n### Frühstück\n**Haferflocken mit Banane** — 520 kcal | P: 15g | KH: 90g | F: 8g\n- 80g Haferflocken\n- 1 Banane\n\n---\n\n## 🛒 Einkaufsliste (7 Tage)\n\n**Kohlenhydrate:**\n- Haferflocken (560g)';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ plan: FAKE_PLAN_TEXT }),
  });
});

/* ══ Wizard ═══════════════════════════════════════════════════ */

describe('NutritionView – Wizard (setup not done)', () => {
  beforeEach(() => {
    useNutrition.mockReturnValue({
      settings: SETTINGS_EMPTY,
      isSetupDone: false,
      saveSettings: vi.fn(),
    });
  });

  it('AC-01: renders wizard header', () => {
    render(<NutritionView />);
    expect(screen.getByText('Ernährungsplan einrichten')).toBeInTheDocument();
  });

  it('shows step 1 of 5', () => {
    render(<NutritionView />);
    expect(screen.getByText('Schritt 1 von 5')).toBeInTheDocument();
    expect(screen.getByText('Ernährungsform')).toBeInTheDocument();
  });

  it('Weiter disabled when no Ernährungsform selected (EC-01)', () => {
    render(<NutritionView />);
    expect(screen.getByText('Weiter →')).toBeDisabled();
  });

  it('Weiter enabled after selecting Ernährungsform', () => {
    render(<NutritionView />);
    fireEvent.click(screen.getByText('Omnivor'));
    expect(screen.getByText('Weiter →')).not.toBeDisabled();
  });

  it('advances to step 2 (Mahlzeiten)', () => {
    render(<NutritionView />);
    fireEvent.click(screen.getByText('Omnivor'));
    fireEvent.click(screen.getByText('Weiter →'));
    expect(screen.getByText('Schritt 2 von 5')).toBeInTheDocument();
    expect(screen.getByText('Mahlzeiten pro Tag')).toBeInTheDocument();
  });

  it('Zurück not shown on step 1', () => {
    render(<NutritionView />);
    expect(screen.queryByText('← Zurück')).not.toBeInTheDocument();
  });

  it('can go back from step 2 to step 1', () => {
    render(<NutritionView />);
    fireEvent.click(screen.getByText('Omnivor'));
    fireEvent.click(screen.getByText('Weiter →'));
    fireEvent.click(screen.getByText('← Zurück'));
    expect(screen.getByText('Schritt 1 von 5')).toBeInTheDocument();
  });

  it('step 3 shows Allergien chips', () => {
    render(<NutritionView />);
    fireEvent.click(screen.getByText('Omnivor'));
    fireEvent.click(screen.getByText('Weiter →'));
    fireEvent.click(screen.getByText('Weiter →'));
    expect(screen.getByText('Allergien & Unverträglichkeiten')).toBeInTheDocument();
    expect(screen.getByText('Gluten')).toBeInTheDocument();
  });

  it('step 4 shows food preference chips with 3-state toggle', () => {
    render(<NutritionView />);
    fireEvent.click(screen.getByText('Omnivor'));
    fireEvent.click(screen.getByText('Weiter →'));
    fireEvent.click(screen.getByText('Weiter →'));
    fireEvent.click(screen.getByText('Weiter →'));
    expect(screen.getByText('Lebensmittel-Präferenzen')).toBeInTheDocument();
    expect(screen.getByText('Lachs')).toBeInTheDocument();
    // Click once → Mag
    const lachsBtn = screen.getByLabelText('Lachs: Neutral');
    fireEvent.click(lachsBtn);
    expect(screen.getByLabelText('Lachs: Mag ich')).toBeInTheDocument();
    // Click again → Mag nicht
    fireEvent.click(screen.getByLabelText('Lachs: Mag ich'));
    expect(screen.getByLabelText('Lachs: Mag ich nicht')).toBeInTheDocument();
    // Click again → Neutral
    fireEvent.click(screen.getByLabelText('Lachs: Mag ich nicht'));
    expect(screen.getByLabelText('Lachs: Neutral')).toBeInTheDocument();
  });

  it('step 5 shows auto calorie option with computed value', () => {
    render(<NutritionView />);
    fireEvent.click(screen.getByText('Omnivor'));
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByText('Weiter →'));
    fireEvent.click(screen.getByText('Weiter →'));
    expect(screen.getByText('Kalorienziel')).toBeInTheDocument();
    expect(screen.getByText(/Automatisch/)).toBeInTheDocument();
  });

  it('completing wizard calls saveSettings', () => {
    const mockSave = vi.fn();
    useNutrition.mockReturnValue({ settings: SETTINGS_EMPTY, isSetupDone: false, saveSettings: mockSave });
    render(<NutritionView />);
    fireEvent.click(screen.getByText('Omnivor'));
    // step through to last
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByText('Weiter →'));
    // Step 5: auto is default, select it
    fireEvent.click(screen.getByText(/Automatisch/));
    fireEvent.click(screen.getByText('Fertigstellen'));
    expect(mockSave).toHaveBeenCalledOnce();
    expect(mockSave.mock.calls[0][0].ernährungsform).toBe('Omnivor');
  });
});

/* ══ Overview ════════════════════════════════════════════════ */

describe('NutritionView – Overview (setup done)', () => {
  beforeEach(() => {
    useNutrition.mockReturnValue({
      settings: SETTINGS_DONE,
      isSetupDone: true,
      saveSettings: vi.fn(),
    });
  });

  it('AC-05: renders page title and settings badges', () => {
    render(<NutritionView />);
    expect(screen.getByText('Ernährungsplan')).toBeInTheDocument();
    expect(screen.getByText('Omnivor')).toBeInTheDocument();
    expect(screen.getByText('3× täglich')).toBeInTheDocument();
    expect(screen.getByText('~2500 kcal')).toBeInTheDocument();
  });

  it('shows empty state when no plans', () => {
    render(<NutritionView />);
    expect(screen.getByText('Noch kein Plan vorhanden.')).toBeInTheDocument();
  });

  it('AC-02: clicking Neuer Plan calls /api/nutrition/plan', async () => {
    render(<NutritionView />);
    fireEvent.click(screen.getByText('+ Neuer Plan'));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/nutrition/plan', expect.objectContaining({ method: 'POST' }));
    });
  });

  it('shows loading state during generation', async () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<NutritionView />);
    fireEvent.click(screen.getByText('+ Neuer Plan'));
    expect(screen.getByText('Plan wird erstellt…')).toBeInTheDocument();
    expect(screen.getByText('Plan wird erstellt…')).toBeDisabled();
  });

  it('AC-03: generated plan appears in list and is selected', async () => {
    render(<NutritionView />);
    fireEvent.click(screen.getByText('+ Neuer Plan'));
    await waitFor(() => expect(screen.getByText('7-Tage-Plan')).toBeInTheDocument());
    expect(screen.getByText(/Montag/)).toBeInTheDocument();
  });

  it('AC-04: can switch to Einkaufsliste tab', async () => {
    render(<NutritionView />);
    fireEvent.click(screen.getByText('+ Neuer Plan'));
    await waitFor(() => expect(screen.getByText('🛒 Einkaufsliste')).toBeInTheDocument());
    fireEvent.click(screen.getByText('🛒 Einkaufsliste'));
    expect(screen.getByText(/Haferflocken/)).toBeInTheDocument();
  });

  it('shows error state on API failure', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({ detail: 'Coach nicht konfiguriert' }) });
    render(<NutritionView />);
    fireEvent.click(screen.getByText('+ Neuer Plan'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText('Coach nicht konfiguriert')).toBeInTheDocument();
  });

  it('Einstellungen button shows wizard again', () => {
    render(<NutritionView />);
    fireEvent.click(screen.getByText('Einstellungen'));
    expect(screen.getByText('Ernährungsplan einrichten')).toBeInTheDocument();
  });

  it('request body contains profile and nutritionSettings', async () => {
    render(<NutritionView />);
    fireEvent.click(screen.getByText('+ Neuer Plan'));
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.nutritionSettings.ernährungsform).toBe('Omnivor');
    expect(body.profile).toBeDefined();
  });
});
