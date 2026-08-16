import { useState } from 'react';
import { useProfile } from '../hooks/useProfile.js';
import { useNutrition } from '../hooks/useNutrition.js';
import { generateId } from '../utils/uuid.js';
import { ERNÄHRUNGSFORMEN, ALLERGENE, FOOD_CATEGORIES } from '../data/foodLibrary.js';
import './NutritionView.css';

const MAHLZEITEN_OPTIONS = [3, 4, 5];

function plansKey(username) { return `fitnessapp_${username}_nutrition_plans`; }
function loadPlans(u) {
  try { return JSON.parse(localStorage.getItem(plansKey(u)) || '[]'); } catch { return []; }
}
function savePlans(u, p) { localStorage.setItem(plansKey(u), JSON.stringify(p)); }

function computeAutoCalories(profile) {
  const ziele = profile?.ziele || [];
  const tage = parseInt(profile?.trainingsTageProWoche) || 3;
  const base = 1800 + tage * 100;
  if (ziele.includes('Muskelaufbau')) return base + 300;
  if (ziele.includes('Gewichtsverlust')) return Math.max(base - 400, 1400);
  if (ziele.includes('Kraft steigern')) return base + 200;
  if (ziele.includes('Ausdauer verbessern')) return base + 150;
  return base;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function parsePlanSections(text) {
  const sections = [];
  let current = null;
  for (const line of (text || '').split('\n')) {
    if (line.startsWith('## ')) {
      if (current) sections.push(current);
      current = { title: line.slice(3).trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

function renderPlanLines(lines) {
  return lines.map((line, i) => {
    if (!line.trim()) return null;
    if (line.startsWith('### ')) return <h4 key={i} className="nutrition-plan__meal-title">{line.slice(4)}</h4>;
    if (line.match(/^\*\*.*\*\*/)) return <p key={i} className="nutrition-plan__dish">{line.replace(/\*\*/g, '')}</p>;
    if (line.startsWith('- ')) return <p key={i} className="nutrition-plan__ingredient">• {line.slice(2)}</p>;
    if (line.startsWith('---')) return <hr key={i} className="nutrition-plan__divider" />;
    return <p key={i} className="nutrition-plan__line">{line}</p>;
  }).filter(Boolean);
}

// ── Chip components ──────────────────────────────────────────────

function SingleChip({ label, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`nutrition-chip${selected ? ' nutrition-chip--selected' : ''}`}
      onClick={onSelect}
    >
      {label}
    </button>
  );
}

function FoodChip({ item, magList, magNichtList, onToggle }) {
  const isMag = magList.includes(item);
  const isMagNicht = magNichtList.includes(item);
  const state = isMag ? 'mag' : isMagNicht ? 'mag-nicht' : 'neutral';
  return (
    <button
      type="button"
      className={`nutrition-chip nutrition-chip--food nutrition-chip--food-${state}`}
      onClick={() => onToggle(item)}
      aria-label={`${item}: ${state === 'mag' ? 'Mag ich' : state === 'mag-nicht' ? 'Mag ich nicht' : 'Neutral'}`}
    >
      {state === 'mag' && <span aria-hidden="true">✓ </span>}
      {state === 'mag-nicht' && <span aria-hidden="true">✗ </span>}
      {item}
    </button>
  );
}

// ── Wizard steps ─────────────────────────────────────────────────

function WizardStep0({ s, onUpdate }) {
  return (
    <>
      <h2 className="nutrition-wizard__step-title">Ernährungsform</h2>
      <p className="nutrition-wizard__step-sub">Wie ernährst du dich?</p>
      <div className="nutrition-wizard__chips">
        {ERNÄHRUNGSFORMEN.map(form => (
          <SingleChip key={form} label={form} selected={s.ernährungsform === form}
            onSelect={() => onUpdate({ ...s, ernährungsform: form })} />
        ))}
      </div>
    </>
  );
}

function WizardStep1({ s, onUpdate }) {
  return (
    <>
      <h2 className="nutrition-wizard__step-title">Mahlzeiten pro Tag</h2>
      <p className="nutrition-wizard__step-sub">Wie viele Mahlzeiten möchtest du täglich essen?</p>
      <div className="nutrition-wizard__chips">
        {MAHLZEITEN_OPTIONS.map(n => (
          <SingleChip key={n} label={`${n} Mahlzeiten`} selected={s.mahlzeitenProTag === n}
            onSelect={() => onUpdate({ ...s, mahlzeitenProTag: n })} />
        ))}
      </div>
    </>
  );
}

function WizardStep2({ s, onUpdate }) {
  function toggle(item) {
    const updated = s.allergien.includes(item)
      ? s.allergien.filter(x => x !== item)
      : [...s.allergien, item];
    onUpdate({ ...s, allergien: updated });
  }
  return (
    <>
      <h2 className="nutrition-wizard__step-title">Allergien & Unverträglichkeiten</h2>
      <p className="nutrition-wizard__step-sub">Was verträgst du nicht? (optional — mehrere möglich)</p>
      <div className="nutrition-wizard__chips">
        {ALLERGENE.map(a => (
          <SingleChip key={a} label={a} selected={s.allergien.includes(a)} onSelect={() => toggle(a)} />
        ))}
      </div>
      {s.allergien.length === 0 && (
        <p className="nutrition-wizard__hint">Nichts ausgewählt = keine Einschränkungen</p>
      )}
    </>
  );
}

function WizardStep3({ s, onUpdate }) {
  function toggle(item) {
    const isMag = s.lebensmittelMag.includes(item);
    const isMagNicht = s.lebensmittelMagNicht.includes(item);
    if (!isMag && !isMagNicht) {
      onUpdate({ ...s, lebensmittelMag: [...s.lebensmittelMag, item] });
    } else if (isMag) {
      onUpdate({
        ...s,
        lebensmittelMag: s.lebensmittelMag.filter(x => x !== item),
        lebensmittelMagNicht: [...s.lebensmittelMagNicht, item],
      });
    } else {
      onUpdate({ ...s, lebensmittelMagNicht: s.lebensmittelMagNicht.filter(x => x !== item) });
    }
  }
  return (
    <>
      <h2 className="nutrition-wizard__step-title">Lebensmittel-Präferenzen</h2>
      <p className="nutrition-wizard__step-sub">
        1× klicken: <strong className="nutrition-wizard__mag">✓ Mag ich</strong> ·
        2× klicken: <strong className="nutrition-wizard__magnicht">✗ Mag ich nicht</strong> ·
        3× zum Zurücksetzen. (optional)
      </p>
      {Object.entries(FOOD_CATEGORIES).map(([cat, foods]) => (
        <div key={cat} className="nutrition-wizard__food-group">
          <div className="nutrition-wizard__food-label">{cat}</div>
          <div className="nutrition-wizard__chips">
            {foods.map(food => (
              <FoodChip key={food} item={food}
                magList={s.lebensmittelMag} magNichtList={s.lebensmittelMagNicht}
                onToggle={toggle} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function WizardStep4({ s, onUpdate, profile }) {
  const auto = computeAutoCalories(profile);
  return (
    <>
      <h2 className="nutrition-wizard__step-title">Kalorienziel</h2>
      <p className="nutrition-wizard__step-sub">Wie viele Kalorien pro Tag?</p>
      <div className="nutrition-wizard__chips">
        <SingleChip
          label={`Automatisch (~${auto} kcal)`}
          selected={s.kalorienzielModus === 'auto'}
          onSelect={() => onUpdate({ ...s, kalorienzielModus: 'auto', kalorienziel: auto })}
        />
        <SingleChip
          label="Manuell eingeben"
          selected={s.kalorienzielModus === 'manuell'}
          onSelect={() => onUpdate({ ...s, kalorienzielModus: 'manuell' })}
        />
      </div>
      {s.kalorienzielModus === 'manuell' && (
        <div className="nutrition-wizard__calorie-input">
          <label className="nutrition-wizard__label">Tägliches Kalorienziel (kcal)</label>
          <input
            type="number"
            className="nutrition-wizard__input"
            value={s.kalorienziel || ''}
            onChange={e => onUpdate({ ...s, kalorienziel: parseInt(e.target.value) || null })}
            placeholder="z.B. 2500"
            min="1000"
            max="6000"
          />
        </div>
      )}
      {s.kalorienzielModus === 'auto' && (
        <p className="nutrition-wizard__hint">
          Basierend auf: {(profile?.ziele || []).join(', ') || 'keine Ziele'}, {profile?.trainingsTageProWoche || '?'} Trainingstage/Woche.
        </p>
      )}
    </>
  );
}

const WIZARD_STEPS = [
  { title: 'Ernährungsform', Component: WizardStep0 },
  { title: 'Mahlzeiten', Component: WizardStep1 },
  { title: 'Allergien', Component: WizardStep2 },
  { title: 'Lebensmittel', Component: WizardStep3 },
  { title: 'Kalorienziel', Component: WizardStep4 },
];

// ── Plan card ────────────────────────────────────────────────────

function DayPlanCard({ section }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="nutrition-day-card">
      <button className="nutrition-day-card__header" onClick={() => setOpen(o => !o)}>
        <span className="nutrition-day-card__title">{section.title}</span>
        <span className="nutrition-day-card__chevron" aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="nutrition-day-card__body">{renderPlanLines(section.lines)}</div>}
    </div>
  );
}

// ── Main view ────────────────────────────────────────────────────

export default function NutritionView({ username = 'admin', calendarEvents = [] }) {
  const { settings, isSetupDone, saveSettings } = useNutrition(username);
  const { profile } = useProfile(username);

  const [isEditing, setIsEditing] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardSettings, setWizardSettings] = useState(() => ({ ...settings }));
  const [plans, setPlans] = useState(() => loadPlans(username));
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('plan');

  function handleWizardComplete() {
    const toSave = {
      ...wizardSettings,
      kalorienziel: wizardSettings.kalorienzielModus === 'auto'
        ? computeAutoCalories(profile)
        : (wizardSettings.kalorienziel || computeAutoCalories(profile)),
    };
    saveSettings(toSave);
    setIsEditing(false);
  }

  function handleEditSettings() {
    setWizardSettings({ ...settings });
    setWizardStep(0);
    setIsEditing(true);
  }

  async function handleGeneratePlan() {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/nutrition/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, nutritionSettings: settings, calendarEvents }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Fehler ${res.status}`);
      }
      const data = await res.json();
      const newPlan = { id: generateId(), createdAt: new Date().toISOString(), text: data.plan };
      const updated = [newPlan, ...plans];
      setPlans(updated);
      savePlans(username, updated);
      setSelectedPlan(newPlan);
      setActiveTab('plan');
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleDeletePlan(id) {
    const updated = plans.filter(p => p.id !== id);
    setPlans(updated);
    savePlans(username, updated);
    if (selectedPlan?.id === id) setSelectedPlan(updated[0] || null);
  }

  // ── Wizard ──────────────────────────────────────────────────
  if (!isSetupDone || isEditing) {
    const { Component } = WIZARD_STEPS[wizardStep];
    const isLast = wizardStep === WIZARD_STEPS.length - 1;
    const canProceed = wizardStep === 0
      ? !!wizardSettings.ernährungsform
      : wizardStep === 4
        ? wizardSettings.kalorienzielModus === 'auto' || (!!wizardSettings.kalorienziel && wizardSettings.kalorienziel >= 1000)
        : true;

    return (
      <div className="nutrition-page">
        <div className="nutrition-wizard">
          <div className="nutrition-wizard__header">
            <h1 className="nutrition-wizard__main-title">Ernährungsplan einrichten</h1>
            <div className="nutrition-wizard__progress" aria-label="Wizard-Fortschritt">
              {WIZARD_STEPS.map((_, i) => (
                <div key={i} className={`nutrition-wizard__dot${i === wizardStep ? ' nutrition-wizard__dot--active' : i < wizardStep ? ' nutrition-wizard__dot--done' : ''}`} />
              ))}
            </div>
            <p className="nutrition-wizard__step-count">Schritt {wizardStep + 1} von {WIZARD_STEPS.length}</p>
          </div>
          <div className="nutrition-wizard__body">
            <Component s={wizardSettings} onUpdate={setWizardSettings} profile={profile} />
          </div>
          <div className="nutrition-wizard__footer">
            {wizardStep > 0
              ? <button className="btn btn--ghost" onClick={() => setWizardStep(s => s - 1)}>← Zurück</button>
              : <span />
            }
            <button
              className="btn btn--primary"
              onClick={() => isLast ? handleWizardComplete() : setWizardStep(s => s + 1)}
              disabled={!canProceed}
            >
              {isLast ? 'Fertigstellen' : 'Weiter →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Overview ────────────────────────────────────────────────
  const allSections = selectedPlan ? parsePlanSections(selectedPlan.text) : [];
  const daySections = allSections.filter(s => !s.title.includes('Einkaufsliste'));
  const shoppingSection = allSections.find(s => s.title.includes('Einkaufsliste'));

  return (
    <div className="nutrition-page">
      <div className="nutrition-header">
        <h1 className="nutrition-page__title">Ernährungsplan</h1>
        <button className="btn btn--ghost" onClick={handleEditSettings}>Einstellungen</button>
      </div>

      <div className="nutrition-settings-summary">
        <span className="nutrition-badge">{settings.ernährungsform}</span>
        <span className="nutrition-badge">{settings.mahlzeitenProTag}× täglich</span>
        <span className="nutrition-badge">~{settings.kalorienziel} kcal</span>
        {settings.allergien.length > 0 && (
          <span className="nutrition-badge nutrition-badge--warn">⚠ {settings.allergien.join(', ')}</span>
        )}
      </div>

      <div className="nutrition-body">
        <div className="nutrition-list-col">
          <button
            className="btn btn--primary nutrition-generate-btn"
            onClick={handleGeneratePlan}
            disabled={isLoading}
          >
            {isLoading ? 'Plan wird erstellt…' : '+ Neuer Plan'}
          </button>
          {error && <div className="nutrition-error" role="alert">{error}</div>}
          {plans.length === 0 && !isLoading && (
            <div className="nutrition-empty">
              <p>Noch kein Plan vorhanden.</p>
              <p>Klicke auf "+ Neuer Plan" um einen KI-generierten 7-Tage-Ernährungsplan zu erstellen.</p>
            </div>
          )}
          {plans.map(plan => (
            <button
              key={plan.id}
              className={`nutrition-plan-item${selectedPlan?.id === plan.id ? ' nutrition-plan-item--active' : ''}`}
              onClick={() => { setSelectedPlan(plan); setActiveTab('plan'); }}
            >
              <span className="nutrition-plan-item__date">{formatDate(plan.createdAt)}</span>
              <span className="nutrition-plan-item__label">7-Tage-Plan</span>
            </button>
          ))}
        </div>

        {selectedPlan ? (
          <div className="nutrition-detail">
            <div className="nutrition-detail__header">
              <div className="nutrition-detail__tabs">
                <button
                  className={`nutrition-tab${activeTab === 'plan' ? ' nutrition-tab--active' : ''}`}
                  onClick={() => setActiveTab('plan')}
                >
                  Wochenplan
                </button>
                <button
                  className={`nutrition-tab${activeTab === 'shopping' ? ' nutrition-tab--active' : ''}`}
                  onClick={() => setActiveTab('shopping')}
                >
                  🛒 Einkaufsliste
                </button>
              </div>
              <button className="btn btn--danger" onClick={() => handleDeletePlan(selectedPlan.id)}>
                Löschen
              </button>
            </div>

            {activeTab === 'plan' && (
              <div className="nutrition-plan">
                {daySections.length > 0
                  ? daySections.map((section, i) => <DayPlanCard key={i} section={section} />)
                  : <p className="nutrition-empty">Plan enthält keine Tagesabschnitte.</p>
                }
              </div>
            )}

            {activeTab === 'shopping' && (
              <div className="nutrition-shopping">
                {shoppingSection
                  ? renderPlanLines(shoppingSection.lines)
                  : <p className="nutrition-empty">Keine Einkaufsliste gefunden.</p>
                }
              </div>
            )}
          </div>
        ) : (
          plans.length > 0 && (
            <div className="nutrition-detail nutrition-detail--empty">
              <p className="nutrition-empty">Wähle einen Plan aus der Liste.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
