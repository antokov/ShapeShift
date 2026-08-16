import { useState } from 'react';
import { useProfile } from '../hooks/useProfile.js';
import { useWeightLog } from '../hooks/useWeightLog.js';
import './UserProfile.css';

const ERFAHRUNGSSTUFEN = ['Anfänger', 'Fortgeschrittener', 'Profi'];
const GESCHLECHT = ['männlich', 'weiblich', 'divers'];

const ZIELE = [
  'Muskelaufbau',
  'Gewichtsverlust',
  'Kraft steigern',
  'Ausdauer verbessern',
  'Allgemeine Fitness',
  'Flexibilität & Mobilität',
];

const EQUIPMENT_OPTIONS = [
  { value: 'body only',     label: 'Körpergewicht' },
  { value: 'barbell',       label: 'Langhantel' },
  { value: 'dumbbell',      label: 'Kurzhanteln' },
  { value: 'cable',         label: 'Kabelzug' },
  { value: 'machine',       label: 'Maschine' },
  { value: 'kettlebells',   label: 'Kettlebell' },
  { value: 'bands',         label: 'Widerstandsbänder' },
  { value: 'e-z curl bar',  label: 'EZ-Stange' },
  { value: 'exercise ball', label: 'Pezziball' },
  { value: 'foam roll',     label: 'Foam Roller' },
  { value: 'medicine ball', label: 'Medizinball' },
  { value: 'other',         label: 'Sonstiges' },
];

function todayISO() {
  return new Date().toLocaleDateString('sv');
}

function computeAge(geburtsdatum) {
  if (!geburtsdatum) return null;
  const today = new Date();
  const birth = new Date(geburtsdatum + 'T00:00:00');
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) age--;
  return age;
}

function formatWeightDate(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('de-DE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function ProfileField({ label, id, type = 'text', value, unit, onChange, ...rest }) {
  return (
    <div className="profile-field">
      <label className="profile-field__label" htmlFor={id}>{label}</label>
      <div className="profile-field__input-wrap">
        <input
          id={id}
          type={type}
          value={value ?? ''}
          onChange={onChange}
          className="profile-field__input"
          {...rest}
        />
        {unit && <span className="profile-field__unit">{unit}</span>}
      </div>
    </div>
  );
}

function SingleChipGroup({ items, selected, onSelect }) {
  return (
    <div className="chip-group">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          className={['chip', selected === item ? 'chip--active' : ''].filter(Boolean).join(' ')}
          onClick={() => onSelect(selected === item ? null : item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function ChipGroup({ items, selected, onToggle }) {
  return (
    <div className="chip-group">
      {items.map((item) => {
        const value = typeof item === 'string' ? item : item.value;
        const label = typeof item === 'string' ? item : item.label;
        return (
          <button
            key={value}
            type="button"
            className={['chip', selected.includes(value) ? 'chip--active' : ''].filter(Boolean).join(' ')}
            onClick={() => onToggle(value)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function WeightLogger({ entries, addEntry, removeEntry }) {
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(todayISO);

  function handleAdd(e) {
    e.preventDefault();
    const w = parseFloat(weight);
    if (!w || w <= 0) return;
    addEntry(w, date);
    setWeight('');
    setDate(todayISO());
  }

  const canSubmit = weight !== '' && parseFloat(weight) > 0;

  return (
    <section className="profile-card">
      <div className="profile-card__tag">Körper</div>
      <h2 className="profile-card__heading">Gewichtsverlauf</h2>
      <form className="weight-log__form" onSubmit={handleAdd} noValidate>
        <div className="weight-log__inputs">
          <div className="profile-field">
            <label className="profile-field__label" htmlFor="wl-weight">Gewicht (kg)</label>
            <div className="profile-field__input-wrap">
              <input
                id="wl-weight"
                type="number"
                min="1"
                max="500"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="profile-field__input"
                placeholder="75.0"
              />
            </div>
          </div>
          <div className="profile-field">
            <label className="profile-field__label" htmlFor="wl-date">Datum</label>
            <div className="profile-field__input-wrap">
              <input
                id="wl-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="profile-field__input"
              />
            </div>
          </div>
        </div>
        <button
          type="submit"
          className="btn btn--primary btn--small"
          disabled={!canSubmit}
        >
          Eintragen
        </button>
      </form>
      {entries.length > 0 ? (
        <ul className="weight-log__list">
          {entries.slice(0, 10).map((entry) => (
            <li key={entry.date} className="weight-log__item">
              <span className="weight-log__date">{formatWeightDate(entry.date)}</span>
              <span className="weight-log__value">{entry.weight} kg</span>
              <button
                type="button"
                className="weight-log__delete"
                aria-label={`Gewichtseintrag ${entry.date} löschen`}
                onClick={() => removeEntry(entry.date)}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10"
                    stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="weight-log__empty">Noch keine Einträge. Trage dein erstes Gewicht ein.</p>
      )}
    </section>
  );
}

export default function UserProfile({ username = 'admin' }) {
  const { profile, updateProfile, toggleArrayItem } = useProfile(username);
  const { entries: weightEntries, addEntry, removeEntry } = useWeightLog(username);

  function handleNumberChange(field, value) {
    const parsed = value === '' ? null : Number(value);
    updateProfile({ [field]: parsed });
  }

  return (
    <div className="user-profile">
      <div className="user-profile__header">
        <h1 className="user-profile__title">Mein Profil</h1>
        <p className="user-profile__subtitle">Deine persönlichen Angaben werden lokal gespeichert.</p>
      </div>

      <div className="user-profile__sections">

        {/* ─── Persönliche Daten ─────────────────────────── */}
        <section className="profile-card">
          <div className="profile-card__tag">Persönliche Daten</div>
          <h2 className="profile-card__heading">Über mich</h2>
          <div className="profile-grid">
            <ProfileField
              label="Vorname"
              id="profile-vorname"
              value={profile.vorname}
              maxLength={50}
              placeholder="z. B. Max"
              onChange={(e) => updateProfile({ vorname: e.target.value })}
            />
            <div className="profile-field">
              <label className="profile-field__label" htmlFor="profile-geburtstag">Geburtstag</label>
              <div className="profile-field__input-wrap">
                <input
                  id="profile-geburtstag"
                  type="date"
                  value={profile.geburtsdatum ?? ''}
                  onChange={(e) => updateProfile({ geburtsdatum: e.target.value || null })}
                  className="profile-field__input"
                  max={todayISO()}
                />
              </div>
              {profile.geburtsdatum && (
                <p className="profile-field__hint">Alter: {computeAge(profile.geburtsdatum)} Jahre</p>
              )}
            </div>
            <div className="profile-field">
              <label className="profile-field__label" htmlFor="profile-gewicht">Gewicht</label>
              <div className="profile-field__input-wrap">
                <input
                  id="profile-gewicht"
                  type="number"
                  value={weightEntries[0]?.weight ?? ''}
                  readOnly
                  className="profile-field__input profile-field__input--readonly"
                  aria-label="Aktuelles Gewicht (aus Gewichtsverlauf)"
                />
                <span className="profile-field__unit">kg</span>
              </div>
              {weightEntries[0] ? (
                <p className="profile-field__hint">Stand: {formatWeightDate(weightEntries[0].date)}</p>
              ) : (
                <p className="profile-field__hint">Im Gewichtsverlauf eintragen</p>
              )}
            </div>
            <ProfileField
              label="Körpergröße"
              id="profile-groesse"
              type="number"
              value={profile.groesse}
              unit="cm"
              min="0"
              max="300"
              placeholder="175"
              onChange={(e) => handleNumberChange('groesse', e.target.value)}
            />
          </div>
          <div className="profile-field" style={{ marginTop: 16 }}>
            <p className="profile-card__hint">Geschlecht</p>
            <SingleChipGroup
              items={GESCHLECHT}
              selected={profile.geschlecht}
              onSelect={(val) => updateProfile({ geschlecht: val })}
            />
          </div>
        </section>

        {/* ─── Ziele ─────────────────────────────────────── */}
        <section className="profile-card">
          <div className="profile-card__tag">Ziele</div>
          <h2 className="profile-card__heading">Meine Trainingsziele</h2>
          <p className="profile-card__hint">Wähle alle Ziele aus, die für dich zutreffen.</p>
          <ChipGroup
            items={ZIELE}
            selected={profile.ziele}
            onToggle={(item) => toggleArrayItem('ziele', item)}
          />
        </section>

        {/* ─── Trainingsprofil ───────────────────────────── */}
        <section className="profile-card">
          <div className="profile-card__tag">Trainingsprofil</div>
          <h2 className="profile-card__heading">Mein Trainingsstand</h2>
          <p className="profile-card__hint">Erfahrungsstufe</p>
          <SingleChipGroup
            items={ERFAHRUNGSSTUFEN}
            selected={profile.erfahrungsstufe}
            onSelect={(val) => updateProfile({ erfahrungsstufe: val })}
          />
          <div className="profile-grid" style={{ marginTop: 16 }}>
            <ProfileField
              label="Trainingstage / Woche"
              id="profile-tage"
              type="number"
              value={profile.trainingsTageProWoche}
              unit="Tage"
              min="1"
              max="7"
              placeholder="3"
              onChange={(e) => {
                const v = e.target.value === '' ? null : Number(e.target.value);
                if (v === null || (v >= 1 && v <= 7)) updateProfile({ trainingsTageProWoche: v });
              }}
            />
          </div>
          <div className="profile-field" style={{ marginTop: 16 }}>
            <label className="profile-field__label" htmlFor="profile-verletzungen">
              Verletzungen / Einschränkungen
            </label>
            <textarea
              id="profile-verletzungen"
              className="profile-field__input"
              value={profile.verletzungen ?? ''}
              maxLength={300}
              rows={3}
              placeholder="z. B. linke Schulter, kein Overhead-Drücken"
              onChange={(e) => updateProfile({ verletzungen: e.target.value })}
            />
          </div>
        </section>

        {/* ─── Equipment ─────────────────────────────────── */}
        <section className="profile-card">
          <div className="profile-card__tag">Equipment</div>
          <h2 className="profile-card__heading">Mein Equipment</h2>
          <p className="profile-card__hint">Wähle alles aus, was dir zur Verfügung steht.</p>
          <ChipGroup
            items={EQUIPMENT_OPTIONS}
            selected={profile.equipment}
            onToggle={(v) => toggleArrayItem('equipment', v)}
          />
        </section>

        {/* ─── Gewichtsverlauf ────────────────────────────── */}
        <WeightLogger
          entries={weightEntries}
          addEntry={addEntry}
          removeEntry={removeEntry}
        />

      </div>
    </div>
  );
}
