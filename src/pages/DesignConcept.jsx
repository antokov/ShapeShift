import './DesignConcept.css';

/* ─── Mock Data ─────────────────────────────────────────── */

const ROUTINE_CARDS = [
  {
    id: '1',
    name: 'Push Day A',
    tag: 'Kraft',
    tagColor: '#5c6bc0',
    exercises: 6,
    lastDone: 'Gestern',
    durationMin: 45,
  },
  {
    id: '2',
    name: 'HIIT Cardio',
    tag: 'Ausdauer',
    tagColor: '#00bcd4',
    exercises: 8,
    lastDone: 'vor 3 Tagen',
    durationMin: 30,
  },
  {
    id: '3',
    name: 'Mobility & Dehnen',
    tag: 'Regeneration',
    tagColor: '#4caf50',
    exercises: 5,
    lastDone: 'vor 1 Woche',
    durationMin: 20,
  },
];

const EXERCISES = [
  { idx: 1, name: 'Kniebeuge', sets: 4, value: '8 Wdh.', type: 'reps' },
  { idx: 2, name: 'Bankdrücken', sets: 3, value: '10 Wdh.', type: 'reps' },
  { idx: 3, name: 'Plank', sets: 3, value: '60 Sek.', type: 'duration' },
  { idx: 4, name: 'Klimmzüge', sets: 4, value: '6 Wdh.', type: 'reps' },
];

const KPIS = [
  { value: '72', unit: 'bpm', label: 'Herzfrequenz', trend: '+2' },
  { value: '85', unit: '%', label: 'Body Battery', trend: null },
  { value: '7,5', unit: 'h', label: 'Schlaf', trend: '+0,5' },
  { value: '8.432', unit: '', label: 'Schritte', trend: null },
];

const STATUS_SAMPLES = [
  { label: 'Aktiv', color: '#4caf50', bg: 'rgba(76,175,80,0.1)' },
  { label: 'Geplant', color: '#5c6bc0', bg: 'rgba(92,107,192,0.1)' },
  { label: 'Abgeschlossen', color: '#999', bg: '#f0f0f0' },
  { label: 'Kraft', color: '#5c6bc0', bg: 'rgba(92,107,192,0.1)' },
  { label: 'Ausdauer', color: '#00bcd4', bg: 'rgba(0,188,212,0.1)' },
  { label: 'Regeneration', color: '#4caf50', bg: 'rgba(76,175,80,0.1)' },
];

/* ─── Sub-Components ────────────────────────────────────── */

function SectionLabel({ children }) {
  return <div className="dc-section-label">{children}</div>;
}

function DividerLine({ label }) {
  return (
    <div className="dc-divider">
      <span>{label}</span>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────── */

export default function DesignConcept() {
  return (
    <div className="dc">
      {/* ─── Page Header ─── */}
      <div className="dc-page-header">
        <div>
          <div className="dc-breadcrumb">Design-System / Konzept</div>
          <h1 className="dc-page-title">Content-Darstellung</h1>
          <p className="dc-page-subtitle">
            Patterns und Komponenten für ShapeShift — wie Inhalte strukturiert und visuell präsentiert werden.
          </p>
        </div>
      </div>

      {/* ─── 1. TYPOGRAFIE ─── */}
      <section className="dc-section">
        <SectionLabel>01 · Typografie-Hierarchie</SectionLabel>
        <div className="dc-card">
          <div className="dc-typo-row">
            <span className="dc-typo-label">Page Title</span>
            <span className="dc-typo-sample dc-t-page">Push Day A</span>
            <span className="dc-typo-meta">28px · weight 300 · #1a1a1a</span>
          </div>
          <div className="dc-typo-row">
            <span className="dc-typo-label">Section Heading</span>
            <span className="dc-typo-sample dc-t-section">Übungen</span>
            <span className="dc-typo-meta">18px · weight 600 · #1a1a1a</span>
          </div>
          <div className="dc-typo-row">
            <span className="dc-typo-label">Card Title</span>
            <span className="dc-typo-sample dc-t-card">Kniebeuge</span>
            <span className="dc-typo-meta">15px · weight 600 · #1a1a1a</span>
          </div>
          <div className="dc-typo-row">
            <span className="dc-typo-label">Body Text</span>
            <span className="dc-typo-sample dc-t-body">Fokus auf Oberkörper — Brust, Schultern, Trizeps. 3× pro Woche.</span>
            <span className="dc-typo-meta">14px · weight 400 · #444</span>
          </div>
          <div className="dc-typo-row">
            <span className="dc-typo-label">Label / Meta</span>
            <span className="dc-typo-sample dc-t-meta">6 Übungen · Gestern</span>
            <span className="dc-typo-meta">12px · weight 400 · #888</span>
          </div>
          <div className="dc-typo-row">
            <span className="dc-typo-label">Section Tag</span>
            <span className="dc-typo-sample dc-t-tag">ÜBUNGEN</span>
            <span className="dc-typo-meta">11px · weight 600 · uppercase · #999</span>
          </div>
        </div>
      </section>

      {/* ─── 2. ROUTINE CARDS ─── */}
      <section className="dc-section">
        <SectionLabel>02 · Routine-Karte</SectionLabel>
        <p className="dc-section-desc">
          Karten zeigen den wichtigsten Inhalt auf einen Blick. Name prominent, Meta-Infos dezent, Aktionen rechts.
        </p>

        <div className="dc-concept-cards">
          {ROUTINE_CARDS.map((r) => (
            <div key={r.id} className="dc-routine-card">
              <div className="dc-routine-card__top">
                <span
                  className="dc-routine-card__tag"
                  style={{ color: r.tagColor, background: r.tagColor + '18' }}
                >
                  {r.tag}
                </span>
                <span className="dc-routine-card__duration">{r.durationMin} min</span>
              </div>
              <div className="dc-routine-card__name">{r.name}</div>
              <div className="dc-routine-card__meta">
                {r.exercises} Übungen · {r.lastDone}
              </div>
              <div className="dc-routine-card__footer">
                <button className="dc-btn-ghost">Ansehen</button>
                <button className="dc-btn-icon" title="Bearbeiten">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M9.5 1.5l3 3-8 8H1.5v-3l8-8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        <DividerLine label="Listenansicht (kompakt)" />

        <div className="dc-card" style={{ padding: 0, overflow: 'hidden' }}>
          {ROUTINE_CARDS.map((r, i) => (
            <div key={r.id} className={`dc-routine-row${i < ROUTINE_CARDS.length - 1 ? ' dc-routine-row--border' : ''}`}>
              <div className="dc-routine-row__left">
                <div className="dc-routine-row__name">{r.name}</div>
                <div className="dc-routine-row__meta">{r.exercises} Übungen · {r.lastDone}</div>
              </div>
              <span
                className="dc-routine-row__tag"
                style={{ color: r.tagColor, background: r.tagColor + '18' }}
              >
                {r.tag}
              </span>
              <div className="dc-routine-row__actions">
                <button className="dc-btn-ghost dc-btn-ghost--sm">Bearbeiten</button>
                <button className="dc-btn-danger-sm">Löschen</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 3. ÜBUNGSANZEIGE ─── */}
      <section className="dc-section">
        <SectionLabel>03 · Übungs-Anzeige</SectionLabel>
        <p className="dc-section-desc">
          Übungen in der Detailansicht — klare Zahlen, Typ-Unterscheidung durch Farbe.
        </p>

        <div className="dc-card">
          <div className="dc-exercises-header">
            <span className="dc-exercises-label">4 Übungen</span>
          </div>
          <ul className="dc-exercise-list">
            {EXERCISES.map((ex) => (
              <li key={ex.idx} className="dc-exercise-item">
                <span className="dc-exercise-item__idx">{ex.idx}</span>
                <span className="dc-exercise-item__name">{ex.name}</span>
                <div className="dc-exercise-item__stats">
                  <span className="dc-stat dc-stat--sets">{ex.sets} Sätze</span>
                  <span className="dc-stat-sep">×</span>
                  <span className={`dc-stat ${ex.type === 'duration' ? 'dc-stat--duration' : 'dc-stat--reps'}`}>
                    {ex.value}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── 4. METRIKEN / KPIs ─── */}
      <section className="dc-section">
        <SectionLabel>04 · Metriken & KPIs</SectionLabel>
        <p className="dc-section-desc">
          Große Zahlenwerte mit Einheit und Label. Optionaler Trend-Indikator.
        </p>

        <div className="dc-kpi-grid">
          {KPIS.map((k) => (
            <div key={k.label} className="dc-kpi">
              <div className="dc-kpi__value">
                {k.value}
                {k.unit && <span className="dc-kpi__unit">{k.unit}</span>}
              </div>
              <div className="dc-kpi__label">{k.label}</div>
              {k.trend && (
                <div className="dc-kpi__trend dc-kpi__trend--up">{k.trend} heute</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── 5. STATUS-PILLS & BADGES ─── */}
      <section className="dc-section">
        <SectionLabel>05 · Status-Pills & Kategorie-Tags</SectionLabel>
        <p className="dc-section-desc">
          Kleine Chips zur Kennzeichnung von Kategorie, Status oder Typ. Outlined oder filled.
        </p>

        <div className="dc-card">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {STATUS_SAMPLES.map((s) => (
              <span
                key={s.label}
                className="dc-pill"
                style={{ color: s.color, background: s.bg, borderColor: s.color + '40' }}
              >
                {s.label}
              </span>
            ))}
          </div>
          <DividerLine label="Outlined (nur Border)" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
            {STATUS_SAMPLES.slice(0, 4).map((s) => (
              <span
                key={s.label}
                className="dc-pill dc-pill--outlined"
                style={{ color: s.color, borderColor: s.color + '60' }}
              >
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 6. EMPTY STATES ─── */}
      <section className="dc-section">
        <SectionLabel>06 · Leer-Zustände</SectionLabel>
        <p className="dc-section-desc">
          Wenn keine Daten vorhanden sind — klare Botschaft mit konkretem Handlungsaufruf.
        </p>

        <div className="dc-card dc-empty-state">
          <div className="dc-empty-state__icon">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect x="6" y="10" width="28" height="22" rx="3" stroke="#d0d0d0" strokeWidth="2" />
              <path d="M13 19h14M13 24h8" stroke="#d0d0d0" strokeWidth="2" strokeLinecap="round" />
              <circle cx="30" cy="10" r="6" fill="#f0f0f0" stroke="#d0d0d0" strokeWidth="1.5" />
              <path d="M30 7v3l2 1.5" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="dc-empty-state__title">Noch keine Routinen</div>
          <div className="dc-empty-state__body">
            Erstelle deine erste Trainingsroutine und leg direkt los.
          </div>
          <button className="dc-btn-primary">+ Neue Routine</button>
        </div>
      </section>

      {/* ─── 7. FORMULAR-ELEMENTE ─── */}
      <section className="dc-section">
        <SectionLabel>07 · Formular-Elemente</SectionLabel>
        <p className="dc-section-desc">
          Saubere, minimalistische Inputs. Focus-Ring in Indigo. Fehler in Rot.
        </p>

        <div className="dc-card">
          <div className="dc-form-demo">
            <div className="dc-field">
              <label className="dc-field__label">Name *</label>
              <input className="dc-field__input" type="text" defaultValue="Push Day A" />
            </div>
            <div className="dc-field">
              <label className="dc-field__label">Beschreibung</label>
              <input className="dc-field__input dc-field__input--focus" type="text" defaultValue="Fokus Oberkörper" readOnly />
              <span className="dc-field__hint">Focus-State: Indigo-Border + dezenter Glow</span>
            </div>
            <div className="dc-field">
              <label className="dc-field__label">Pflichtfeld fehlt</label>
              <input className="dc-field__input dc-field__input--error" type="text" defaultValue="" placeholder="z. B. Push Day" readOnly />
              <span className="dc-field__error">Name ist erforderlich.</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: '12px', alignItems: 'end' }}>
              <div className="dc-field">
                <label className="dc-field__label">Übung</label>
                <input className="dc-field__input" type="text" defaultValue="Kniebeuge" />
              </div>
              <div className="dc-field">
                <label className="dc-field__label">Sätze</label>
                <input className="dc-field__input dc-field__input--center" type="number" defaultValue="4" />
              </div>
              <div className="dc-field">
                <label className="dc-field__label">Wdh.</label>
                <input className="dc-field__input dc-field__input--center" type="number" defaultValue="8" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 8. BUTTON-SYSTEM ─── */}
      <section className="dc-section">
        <SectionLabel>08 · Button-Hierarchie</SectionLabel>
        <p className="dc-section-desc">
          Klare Hierarchie: Primary CTA orange, sekundäre Aktionen neutral, destruktiv rot.
        </p>

        <div className="dc-card">
          <div className="dc-btn-row">
            <div className="dc-btn-demo">
              <button className="dc-btn-primary">Speichern</button>
              <span className="dc-btn-desc">Primary — Orange-Gradient. Einmal pro View.</span>
            </div>
            <div className="dc-btn-demo">
              <button className="dc-btn-secondary">Bearbeiten</button>
              <span className="dc-btn-desc">Secondary — Weiß mit Border. Für sekundäre Aktionen.</span>
            </div>
            <div className="dc-btn-demo">
              <button className="dc-btn-ghost-demo">← Zurück</button>
              <span className="dc-btn-desc">Ghost — Transparent. Navigation, Cancel.</span>
            </div>
            <div className="dc-btn-demo">
              <button className="dc-btn-danger-demo">Löschen</button>
              <span className="dc-btn-desc">Danger — Rot. Destruktive Aktionen.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 9. SPACING-RHYTHMUS ─── */}
      <section className="dc-section">
        <SectionLabel>09 · Abstand-Rhythmus</SectionLabel>
        <p className="dc-section-desc">
          Konsistentes 8px-Grid. Inhaltsabstand innerhalb einer Sektion: 16px. Zwischen Sektionen: 32px.
        </p>

        <div className="dc-card">
          <div className="dc-spacing-demo">
            {[4, 8, 12, 16, 24, 32, 48, 64].map((s) => (
              <div key={s} className="dc-spacing-row">
                <div className="dc-spacing-bar" style={{ width: s * 2, background: '#5c6bc0' + '55', border: '1px solid #5c6bc0' }} />
                <span className="dc-spacing-val">{s}px</span>
                <span className="dc-spacing-use">
                  {s === 4 ? 'gap innerhalb Chips' :
                   s === 8 ? 'gap zwischen Buttons' :
                   s === 12 ? 'padding Tags/Badges' :
                   s === 16 ? 'Card Padding, Abstand Felder' :
                   s === 24 ? 'Abstand Sektionen' :
                   s === 32 ? 'Page Padding top/bottom' :
                   s === 48 ? 'Page Padding (Desktop)' :
                   'Vertikaler Seitenabstand'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 10. FARBPALETTE ─── */}
      <section className="dc-section">
        <SectionLabel>10 · Farbpalette (Light Theme)</SectionLabel>

        <div className="dc-color-grid">
          {[
            { name: 'Background', hex: '#f0f0f0', border: false },
            { name: 'Surface (Card)', hex: '#ffffff', border: true },
            { name: 'Border', hex: '#e8e8e8', border: true },
            { name: 'Text Primary', hex: '#1a1a1a', border: false, light: true },
            { name: 'Text Secondary', hex: '#555555', border: false, light: true },
            { name: 'Text Muted', hex: '#999999', border: false, light: true },
            { name: 'Indigo (Akzent)', hex: '#5c6bc0', border: false, light: true },
            { name: 'Indigo Muted', hex: 'rgba(92,107,192,0.12)', border: true },
            { name: 'Orange CTA', hex: '#FF5C1A', border: false, light: true },
            { name: 'Teal', hex: '#00bcd4', border: false, light: true },
            { name: 'Green', hex: '#4caf50', border: false, light: true },
            { name: 'Error', hex: '#EF4444', border: false, light: true },
          ].map((c) => (
            <div key={c.name} className="dc-color-swatch">
              <div
                className="dc-color-swatch__block"
                style={{
                  background: c.hex,
                  border: c.border ? '1px solid #d8d8d8' : 'none',
                }}
              />
              <div className="dc-color-swatch__name">{c.name}</div>
              <div className="dc-color-swatch__hex">{c.hex}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ height: 48 }} />
    </div>
  );
}
