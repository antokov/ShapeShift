import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UserProfile from './UserProfile.jsx';

beforeEach(() => {
  localStorage.clear();
});

describe('UserProfile – Rendering', () => {
  it('renders all three section headings', () => {
    render(<UserProfile />);
    expect(screen.getByText('Über mich')).toBeInTheDocument();
    expect(screen.getByText('Meine Trainingsziele')).toBeInTheDocument();
    expect(screen.getByText('Mein Equipment')).toBeInTheDocument();
  });

  it('renders the page title', () => {
    render(<UserProfile />);
    expect(screen.getByText('Mein Profil')).toBeInTheDocument();
  });

  it('renders all Ziele chips', () => {
    render(<UserProfile />);
    expect(screen.getByText('Muskelaufbau')).toBeInTheDocument();
    expect(screen.getByText('Gewichtsverlust')).toBeInTheDocument();
    expect(screen.getByText('Kraft steigern')).toBeInTheDocument();
    expect(screen.getByText('Flexibilität & Mobilität')).toBeInTheDocument();
  });

  it('renders Equipment chips (API-Werte)', () => {
    render(<UserProfile />);
    expect(screen.getByText('Langhantel')).toBeInTheDocument();
    expect(screen.getByText('Kurzhanteln')).toBeInTheDocument();
    expect(screen.getByText('Körpergewicht')).toBeInTheDocument();
    expect(screen.getByText('Kettlebell')).toBeInTheDocument();
  });

  it('renders personal data input fields', () => {
    render(<UserProfile />);
    expect(screen.getByLabelText(/Vorname/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Geburtstag/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Gewicht')).toBeInTheDocument();
    expect(screen.getByLabelText(/Körpergröße/i)).toBeInTheDocument();
  });
});

describe('UserProfile – Geburtstag & Alter-Berechnung', () => {
  it('AC-01: zeigt Geburtstag-Feld statt Alter-Zahlenfeld', () => {
    render(<UserProfile />);
    const input = screen.getByLabelText(/Geburtstag/i);
    expect(input.type).toBe('date');
  });

  it('AC-05: kein Alter-Hinweis wenn kein Geburtsdatum gesetzt', () => {
    render(<UserProfile />);
    expect(screen.queryByText(/Alter:/i)).not.toBeInTheDocument();
  });

  it('AC-02: zeigt berechnetes Alter nach Eingabe eines Geburtsdatums', () => {
    render(<UserProfile />);
    const input = screen.getByLabelText(/Geburtstag/i);
    fireEvent.change(input, { target: { value: '1990-01-01' } });
    expect(screen.getByText(/Alter:/i)).toBeInTheDocument();
  });

  it('AC-03: lädt gespeichertes Geburtsdatum aus localStorage', () => {
    localStorage.setItem('fitnessapp_admin_profile', JSON.stringify({
      vorname: '', geburtsdatum: '1988-05-20', groesse: null, gewicht: null, ziele: [], equipment: [],
      erfahrungsstufe: null, trainingsTageProWoche: null, verletzungen: '',
    }));
    render(<UserProfile />);
    expect(screen.getByLabelText(/Geburtstag/i).value).toBe('1988-05-20');
    expect(screen.getByText(/Alter:/i)).toBeInTheDocument();
  });

  it('AC-03: geburtsdatum wird in localStorage gespeichert', () => {
    render(<UserProfile />);
    fireEvent.change(screen.getByLabelText(/Geburtstag/i), { target: { value: '1995-08-12' } });
    const stored = JSON.parse(localStorage.getItem('fitnessapp_admin_profile'));
    expect(stored.geburtsdatum).toBe('1995-08-12');
  });

  it('löschen des Geburtsdatums entfernt Alter-Hinweis', () => {
    render(<UserProfile />);
    const input = screen.getByLabelText(/Geburtstag/i);
    fireEvent.change(input, { target: { value: '1990-01-01' } });
    expect(screen.getByText(/Alter:/i)).toBeInTheDocument();
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.queryByText(/Alter:/i)).not.toBeInTheDocument();
  });
});

describe('UserProfile – Chip-Interaktion (Ziele)', () => {
  it('chip becomes active when clicked', () => {
    render(<UserProfile />);
    const chip = screen.getByText('Muskelaufbau');
    expect(chip.className).not.toContain('chip--active');
    fireEvent.click(chip);
    expect(chip.className).toContain('chip--active');
  });

  it('chip deactivates on second click', () => {
    render(<UserProfile />);
    const chip = screen.getByText('Ausdauer verbessern');
    fireEvent.click(chip);
    fireEvent.click(chip);
    expect(chip.className).not.toContain('chip--active');
  });

  it('multiple chips can be active simultaneously', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByText('Muskelaufbau'));
    fireEvent.click(screen.getByText('Kraft steigern'));
    expect(screen.getByText('Muskelaufbau').className).toContain('chip--active');
    expect(screen.getByText('Kraft steigern').className).toContain('chip--active');
  });
});

describe('UserProfile – Equipment (API-Werte)', () => {
  it('AC-01: rendert alle 12 API-Equipment-Chips', () => {
    render(<UserProfile />);
    expect(screen.getByText('Körpergewicht')).toBeInTheDocument();
    expect(screen.getByText('Langhantel')).toBeInTheDocument();
    expect(screen.getByText('Kurzhanteln')).toBeInTheDocument();
    expect(screen.getByText('Kabelzug')).toBeInTheDocument();
    expect(screen.getByText('Maschine')).toBeInTheDocument();
    expect(screen.getByText('Kettlebell')).toBeInTheDocument();
    expect(screen.getByText('Widerstandsbänder')).toBeInTheDocument();
    expect(screen.getByText('EZ-Stange')).toBeInTheDocument();
    expect(screen.getByText('Pezziball')).toBeInTheDocument();
    expect(screen.getByText('Foam Roller')).toBeInTheDocument();
    expect(screen.getByText('Medizinball')).toBeInTheDocument();
    expect(screen.getByText('Sonstiges')).toBeInTheDocument();
  });

  it('AC-02: alte Kategorie-Labels sind nicht mehr vorhanden', () => {
    render(<UserProfile />);
    expect(screen.queryByText('Freie Gewichte')).not.toBeInTheDocument();
    expect(screen.queryByText('Rack & Bänke')).not.toBeInTheDocument();
    expect(screen.queryByText('Lat Pulldown')).not.toBeInTheDocument();
    expect(screen.queryByText('Klimmzugstange')).not.toBeInTheDocument();
  });

  it('AC-04: Klick aktiviert Chip', () => {
    render(<UserProfile />);
    const chip = screen.getByText('Kettlebell');
    expect(chip.className).not.toContain('chip--active');
    fireEvent.click(chip);
    expect(chip.className).toContain('chip--active');
  });

  it('AC-05: speichert API-Key (nicht Label) in localStorage', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByText('Langhantel'));
    const stored = JSON.parse(localStorage.getItem('fitnessapp_admin_profile'));
    expect(stored.equipment).toContain('barbell');
    expect(stored.equipment).not.toContain('Langhantel');
  });

  it('AC-05: Kabelzug speichert API-Key "cable"', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByText('Kabelzug'));
    const stored = JSON.parse(localStorage.getItem('fitnessapp_admin_profile'));
    expect(stored.equipment).toContain('cable');
  });

  it('AC-04: mehrere Items gleichzeitig auswählbar', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByText('Langhantel'));
    fireEvent.click(screen.getByText('Kabelzug'));
    fireEvent.click(screen.getByText('Kettlebell'));
    const stored = JSON.parse(localStorage.getItem('fitnessapp_admin_profile'));
    expect(stored.equipment).toContain('barbell');
    expect(stored.equipment).toContain('cable');
    expect(stored.equipment).toContain('kettlebells');
  });

  it('AC-04: Deselect entfernt API-Key aus localStorage', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByText('Kurzhanteln'));
    fireEvent.click(screen.getByText('Kurzhanteln'));
    const stored = JSON.parse(localStorage.getItem('fitnessapp_admin_profile'));
    expect(stored.equipment).not.toContain('dumbbell');
  });

  it('AC-04: lädt gespeicherte API-Keys beim Mount und zeigt aktiven Chip', () => {
    localStorage.setItem('fitnessapp_admin_profile', JSON.stringify({
      vorname: '', geburtsdatum: null, gewicht: null, groesse: null,
      ziele: [], equipment: ['cable', 'kettlebells'],
      erfahrungsstufe: null, trainingsTageProWoche: null, verletzungen: '',
    }));
    render(<UserProfile />);
    expect(screen.getByText('Kabelzug').className).toContain('chip--active');
    expect(screen.getByText('Kettlebell').className).toContain('chip--active');
    expect(screen.getByText('Langhantel').className).not.toContain('chip--active');
  });
});

describe('UserProfile – Textfelder', () => {
  it('vorname input updates and persists', () => {
    render(<UserProfile />);
    const input = screen.getByLabelText(/Vorname/i);
    fireEvent.change(input, { target: { value: 'Anton' } });
    expect(input.value).toBe('Anton');
    const stored = JSON.parse(localStorage.getItem('fitnessapp_admin_profile'));
    expect(stored.vorname).toBe('Anton');
  });

  it('geburtstag input stores date string', () => {
    render(<UserProfile />);
    const input = screen.getByLabelText(/Geburtstag/i);
    fireEvent.change(input, { target: { value: '1990-06-16' } });
    const stored = JSON.parse(localStorage.getItem('fitnessapp_admin_profile'));
    expect(stored.geburtsdatum).toBe('1990-06-16');
  });

  it('loads saved profile on re-render (EC-04)', () => {
    localStorage.setItem('fitnessapp_admin_profile', JSON.stringify({
      vorname: 'Max', geburtsdatum: '1997-03-10', gewicht: 75, groesse: 180, ziele: ['Muskelaufbau'], equipment: [],
    }));
    render(<UserProfile />);
    expect(screen.getByLabelText(/Vorname/i).value).toBe('Max');
    expect(screen.getByText('Muskelaufbau').className).toContain('chip--active');
  });
});

describe('UserProfile – Trainingsprofil (neue Felder)', () => {
  it('renders Trainingsprofil section heading', () => {
    render(<UserProfile />);
    expect(screen.getByText('Mein Trainingsstand')).toBeInTheDocument();
  });

  it('renders all three Erfahrungsstufe chips', () => {
    render(<UserProfile />);
    expect(screen.getByText('Anfänger')).toBeInTheDocument();
    expect(screen.getByText('Fortgeschrittener')).toBeInTheDocument();
    expect(screen.getByText('Profi')).toBeInTheDocument();
  });

  it('Erfahrungsstufe chip becomes active on click (AC-01)', () => {
    render(<UserProfile />);
    const chip = screen.getByText('Fortgeschrittener');
    expect(chip.className).not.toContain('chip--active');
    fireEvent.click(chip);
    expect(chip.className).toContain('chip--active');
  });

  it('only one Erfahrungsstufe chip active at a time (AC-01)', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByText('Anfänger'));
    fireEvent.click(screen.getByText('Profi'));
    expect(screen.getByText('Anfänger').className).not.toContain('chip--active');
    expect(screen.getByText('Profi').className).toContain('chip--active');
  });

  it('clicking active Erfahrungsstufe chip deselects it (EC-01)', () => {
    render(<UserProfile />);
    const chip = screen.getByText('Anfänger');
    fireEvent.click(chip);
    expect(chip.className).toContain('chip--active');
    fireEvent.click(chip);
    expect(chip.className).not.toContain('chip--active');
  });

  it('Erfahrungsstufe persists to localStorage (AC-04)', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByText('Fortgeschrittener'));
    const stored = JSON.parse(localStorage.getItem('fitnessapp_admin_profile'));
    expect(stored.erfahrungsstufe).toBe('Fortgeschrittener');
  });

  it('renders Trainingstage field (AC-02)', () => {
    render(<UserProfile />);
    expect(screen.getByLabelText(/Trainingstage/i)).toBeInTheDocument();
  });

  it('Trainingstage input saves valid value (AC-02)', () => {
    render(<UserProfile />);
    const input = screen.getByLabelText(/Trainingstage/i);
    fireEvent.change(input, { target: { value: '4' } });
    const stored = JSON.parse(localStorage.getItem('fitnessapp_admin_profile'));
    expect(stored.trainingsTageProWoche).toBe(4);
  });

  it('Trainingstage outside 1–7 is not saved (EC-02)', () => {
    render(<UserProfile />);
    const input = screen.getByLabelText(/Trainingstage/i);
    fireEvent.change(input, { target: { value: '8' } });
    const stored = JSON.parse(localStorage.getItem('fitnessapp_admin_profile'));
    expect(stored?.trainingsTageProWoche ?? null).toBeNull();
  });

  it('renders Verletzungen textarea (AC-03)', () => {
    render(<UserProfile />);
    expect(screen.getByLabelText(/Verletzungen/i)).toBeInTheDocument();
  });

  it('Verletzungen textarea saves text (AC-03 + AC-04)', () => {
    render(<UserProfile />);
    const ta = screen.getByLabelText(/Verletzungen/i);
    fireEvent.change(ta, { target: { value: 'linke Schulter' } });
    const stored = JSON.parse(localStorage.getItem('fitnessapp_admin_profile'));
    expect(stored.verletzungen).toBe('linke Schulter');
  });

  it('loads Erfahrungsstufe from localStorage on mount (AC-01)', () => {
    localStorage.setItem('fitnessapp_admin_profile', JSON.stringify({
      vorname: '', alter: null, gewicht: null, groesse: null,
      ziele: [], equipment: [],
      erfahrungsstufe: 'Profi', trainingsTageProWoche: 5, verletzungen: 'Knie',
    }));
    render(<UserProfile />);
    expect(screen.getByText('Profi').className).toContain('chip--active');
    expect(screen.getByLabelText(/Trainingstage/i).value).toBe('5');
    expect(screen.getByLabelText(/Verletzungen/i).value).toBe('Knie');
  });

  it('clearing Verletzungen stores empty string (EC-01 related)', () => {
    render(<UserProfile />);
    const ta = screen.getByLabelText(/Verletzungen/i);
    fireEvent.change(ta, { target: { value: 'Knie' } });
    fireEvent.change(ta, { target: { value: '' } });
    const stored = JSON.parse(localStorage.getItem('fitnessapp_admin_profile'));
    expect(stored.verletzungen).toBe('');
  });
});

describe('UserProfile – Gewichtsverlauf', () => {
  it('renders the Gewichtsverlauf section heading', () => {
    render(<UserProfile />);
    expect(screen.getByText('Gewichtsverlauf')).toBeInTheDocument();
  });

  it('shows empty state when no entries', () => {
    render(<UserProfile />);
    expect(screen.getByText(/Noch keine Einträge/i)).toBeInTheDocument();
  });

  it('adds a weight entry and displays it', () => {
    render(<UserProfile />);
    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '80' } });
    fireEvent.click(screen.getByText('Eintragen'));
    expect(screen.getByText('80 kg')).toBeInTheDocument();
  });

  it('persists entry to localStorage', () => {
    render(<UserProfile />);
    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '75.5' } });
    fireEvent.click(screen.getByText('Eintragen'));
    const stored = JSON.parse(localStorage.getItem('fitnessapp_admin_weight_log'));
    expect(stored).toHaveLength(1);
    expect(stored[0].weight).toBe(75.5);
  });

  it('delete button removes the entry', () => {
    render(<UserProfile />);
    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '90' } });
    fireEvent.click(screen.getByText('Eintragen'));
    expect(screen.getByText('90 kg')).toBeInTheDocument();
    const delBtn = screen.getByRole('button', { name: /Gewichtseintrag .* löschen/i });
    fireEvent.click(delBtn);
    expect(screen.queryByText('90 kg')).not.toBeInTheDocument();
  });

  it('Eintragen button disabled when weight field is empty', () => {
    render(<UserProfile />);
    const btn = screen.getByText('Eintragen');
    expect(btn).toBeDisabled();
  });
});

describe('UserProfile – Geschlechtsauswahl', () => {
  it('AC-01: rendert alle drei Geschlecht-Chips', () => {
    render(<UserProfile />);
    expect(screen.getByRole('button', { name: 'männlich' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'weiblich' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'divers' })).toBeInTheDocument();
  });

  it('AC-01: Geschlecht-Label ist sichtbar', () => {
    render(<UserProfile />);
    expect(screen.getByText('Geschlecht')).toBeInTheDocument();
  });

  it('AC-02: kein Chip initial aktiv (EC-01)', () => {
    render(<UserProfile />);
    expect(screen.getByRole('button', { name: 'männlich' }).className).not.toContain('chip--active');
    expect(screen.getByRole('button', { name: 'weiblich' }).className).not.toContain('chip--active');
    expect(screen.getByRole('button', { name: 'divers' }).className).not.toContain('chip--active');
  });

  it('AC-02: Klick auf Chip aktiviert ihn (Single-Select)', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: 'weiblich' }));
    expect(screen.getByRole('button', { name: 'weiblich' }).className).toContain('chip--active');
  });

  it('AC-02: nur ein Chip gleichzeitig aktiv', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: 'männlich' }));
    fireEvent.click(screen.getByRole('button', { name: 'divers' }));
    expect(screen.getByRole('button', { name: 'männlich' }).className).not.toContain('chip--active');
    expect(screen.getByRole('button', { name: 'divers' }).className).toContain('chip--active');
  });

  it('AC-03: Auswahl wird in localStorage gespeichert', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: 'weiblich' }));
    const stored = JSON.parse(localStorage.getItem('fitnessapp_admin_profile'));
    expect(stored.geschlecht).toBe('weiblich');
  });

  it('AC-03: Deselect setzt geschlecht auf null (EC-03)', () => {
    render(<UserProfile />);
    fireEvent.click(screen.getByRole('button', { name: 'männlich' }));
    fireEvent.click(screen.getByRole('button', { name: 'männlich' }));
    const stored = JSON.parse(localStorage.getItem('fitnessapp_admin_profile'));
    expect(stored.geschlecht).toBeNull();
  });

  it('AC-04: gespeichertes Geschlecht wird beim Laden vorbelegt', () => {
    localStorage.setItem('fitnessapp_admin_profile', JSON.stringify({
      vorname: '', geburtsdatum: null, geschlecht: 'divers',
      gewicht: null, groesse: null, ziele: [], equipment: [],
      erfahrungsstufe: null, trainingsTageProWoche: null, verletzungen: '',
    }));
    render(<UserProfile />);
    expect(screen.getByRole('button', { name: 'divers' }).className).toContain('chip--active');
    expect(screen.getByRole('button', { name: 'männlich' }).className).not.toContain('chip--active');
  });

  it('AC-05: Profil ohne geschlecht-Key lädt fehlerfrei (EC-02)', () => {
    localStorage.setItem('fitnessapp_admin_profile', JSON.stringify({
      vorname: 'Alt', geburtsdatum: null, gewicht: null, groesse: null,
      ziele: [], equipment: [], erfahrungsstufe: null, trainingsTageProWoche: null, verletzungen: '',
    }));
    render(<UserProfile />);
    expect(screen.getByRole('button', { name: 'männlich' }).className).not.toContain('chip--active');
  });
});

describe('UserProfile – Gewicht-Feld readonly (AC-01 bis AC-04)', () => {
  it('AC-02: Gewicht-Feld ist readOnly', () => {
    render(<UserProfile />);
    const input = screen.getByLabelText('Gewicht');
    expect(input.readOnly).toBe(true);
  });

  it('AC-02: Gewicht-Feld hat readonly-Klasse', () => {
    render(<UserProfile />);
    const input = screen.getByLabelText('Gewicht');
    expect(input.className).toContain('profile-field__input--readonly');
  });

  it('AC-03: zeigt leeren Zustand wenn kein Gewichtseintrag vorhanden', () => {
    render(<UserProfile />);
    expect(screen.getByText('Im Gewichtsverlauf eintragen')).toBeInTheDocument();
    const input = screen.getByLabelText('Gewicht');
    expect(input.value).toBe('');
  });

  it('AC-01: zeigt neuesten Gewichtseintrag aus Gewichtsverlauf', () => {
    localStorage.setItem('fitnessapp_admin_weight_log', JSON.stringify([
      { date: '2026-06-13', weight: 82.5 },
      { date: '2026-06-10', weight: 83.0 },
    ]));
    render(<UserProfile />);
    const input = screen.getByLabelText('Gewicht');
    expect(input.value).toBe('82.5');
  });

  it('AC-04: zeigt Datum des neuesten Eintrags als Hinweis', () => {
    localStorage.setItem('fitnessapp_admin_weight_log', JSON.stringify([
      { date: '2026-06-13', weight: 82.5 },
    ]));
    render(<UserProfile />);
    expect(screen.getByText(/Stand:/)).toBeInTheDocument();
  });

  it('AC-01: Gewicht-Feld aktualisiert sich nach Eintragen im Verlauf', () => {
    render(<UserProfile />);
    // Before entry: empty
    expect(screen.getByLabelText('Gewicht').value).toBe('');
    // Add an entry via the WeightLogger
    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '78' } });
    fireEvent.click(screen.getByText('Eintragen'));
    // Now the readonly field should show 78
    expect(screen.getByLabelText('Gewicht').value).toBe('78');
  });

  it('AC-03: Hinweis verschwindet wenn Eintrag vorhanden (AC-04 Datum erscheint)', () => {
    render(<UserProfile />);
    expect(screen.getByText('Im Gewichtsverlauf eintragen')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '77' } });
    fireEvent.click(screen.getByText('Eintragen'));
    expect(screen.queryByText('Im Gewichtsverlauf eintragen')).not.toBeInTheDocument();
    expect(screen.getByText(/Stand:/)).toBeInTheDocument();
  });

  it('EC-02: zeigt leeren Zustand wenn letzter Eintrag gelöscht wird', () => {
    render(<UserProfile />);
    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '80' } });
    fireEvent.click(screen.getByText('Eintragen'));
    expect(screen.getByLabelText('Gewicht').value).toBe('80');
    const delBtn = screen.getByRole('button', { name: /Gewichtseintrag .* löschen/i });
    fireEvent.click(delBtn);
    expect(screen.getByLabelText('Gewicht').value).toBe('');
    expect(screen.getByText('Im Gewichtsverlauf eintragen')).toBeInTheDocument();
  });
});
