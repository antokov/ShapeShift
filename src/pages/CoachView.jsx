import { useState } from 'react';
import { useProfile } from '../hooks/useProfile.js';
import { useWeightLog } from '../hooks/useWeightLog.js';
import { fetchGarminHealth, fetchGarminHealthHistory, fetchGarminHRV } from '../utils/exportData.js';
import { generateId } from '../utils/uuid.js';
import { API_BASE } from '../utils/apiBase.js';
import './CoachView.css';

const FOUR_WEEKS_MS = 28 * 24 * 60 * 60 * 1000;

function storageKey(username) {
  return `fitnessapp_${username}_coach_reports`;
}

function loadReports(username) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(username)) || '[]');
  } catch {
    return [];
  }
}

function saveReports(username, reports) {
  localStorage.setItem(storageKey(username), JSON.stringify(reports));
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

function parseReportSections(text) {
  const lines = text.split('\n');
  const sections = [];
  let current = null;

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current) sections.push(current);
      current = { title: line.slice(3).trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);

  if (sections.length === 0) {
    sections.push({ title: null, lines });
  }

  return sections.filter((s) => s.lines.some((l) => l.trim() !== ''));
}

function SectionCard({ title, lines }) {
  const elements = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('---') || line.trim() === '') continue;
    if (line.startsWith('- ') || line.startsWith('• ')) {
      elements.push(<p key={i} className="coach-section__bullet">• {renderInline(line.slice(2))}</p>);
    } else {
      elements.push(<p key={i} className="coach-section__para">{renderInline(line)}</p>);
    }
  }
  if (elements.length === 0) return null;
  return (
    <div className="coach-section-card">
      {title && <h3 className="coach-section-card__title">{title}</h3>}
      <div className="coach-section-card__body">{elements}</div>
    </div>
  );
}

function ReportListItem({ report, onOpen }) {
  const sections = parseReportSections(report.text);
  const firstTitle = sections[0]?.title || null;
  const isPlan = report.type === 'trainingsplan';
  return (
    <button
      className="coach-report-list-item"
      onClick={() => onOpen(report)}
      aria-label={isPlan ? 'Trainingsplan öffnen' : 'Bericht öffnen'}
    >
      <span className="coach-report-list-item__date">{formatDate(report.createdAt)}</span>
      {isPlan && <span className="coach-report-list-item__type-badge">🏋️ Trainingsplan</span>}
      {firstTitle && (
        <span className="coach-report-list-item__preview">{firstTitle}</span>
      )}
      <div className="coach-report-list-item__footer">
        <span className="coach-report-list-item__meta">{sections.length} Kapitel</span>
        <span className="coach-report-list-item__chevron" aria-hidden="true">→</span>
      </div>
    </button>
  );
}

function ReportDetailView({ report, onBack, onDelete }) {
  const sections = parseReportSections(report.text);
  const isPlan = report.type === 'trainingsplan';
  const deleteLabel = isPlan ? 'Trainingsplan löschen' : 'Bericht löschen';
  return (
    <div className="coach-detail">
      <div className="coach-detail__nav">
        <button
          className="btn btn--ghost"
          onClick={onBack}
          aria-label="Zurück zur Übersicht"
        >
          ← Übersicht
        </button>
        <button
          className="btn btn--danger"
          onClick={() => onDelete(report.id)}
          aria-label={deleteLabel}
        >
          Löschen
        </button>
      </div>
      <div className="coach-detail__date">{formatDate(report.createdAt)}</div>
      <div className="coach-detail__sections">
        {sections.map((s, i) => (
          <SectionCard key={i} title={s.title} lines={s.lines} />
        ))}
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="coach-msg__thinking" aria-label="Coach denkt nach">
      <span className="coach-msg__dot" />
      <span className="coach-msg__dot" />
      <span className="coach-msg__dot" />
    </div>
  );
}

export default function CoachView({ username = 'admin', workouts = [], routines = [], calendarEvents = [], garminActivities = [] }) {
  const { profile } = useProfile(username);
  const { entries: weightEntries } = useWeightLog(username);
  const [reports, setReports] = useState(() => loadReports(username));
  const [selectedReport, setSelectedReport] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null); // null | 'bericht' | 'trainingsplan'
  const [error, setError] = useState(null);

  async function buildCoachPayload() {
    const fourWeeksAgo = new Date(Date.now() - FOUR_WEEKS_MS);
    const recentWorkouts = workouts.filter((w) => new Date(w.startedAt) >= fourWeeksAgo);
    const recentGarmin = garminActivities.filter((a) => {
      if (!a.startTimeLocal) return false;
      return new Date(a.startTimeLocal.replace(' ', 'T')) >= fourWeeksAgo;
    });
    const recentWeight = weightEntries.filter((e) => new Date(e.date + 'T12:00:00') >= fourWeeksAgo);
    const [garminHealth, garminHealthHistory, garminHrv] = await Promise.all([
      fetchGarminHealth(),
      fetchGarminHealthHistory(),
      fetchGarminHRV(),
    ]);
    return {
      workouts: recentWorkouts,
      routines,
      calendarEvents,
      garminActivities: recentGarmin,
      profile,
      weightLog: recentWeight,
      garminHealth,
      garminHealthHistory,
      garminHrv,
    };
  }

  async function handleGenerate(type) {
    if (loadingAction) return;
    setLoadingAction(type);
    setError(null);
    try {
      const payload = await buildCoachPayload();
      const endpoint = type === 'trainingsplan' ? `${API_BASE}/api/coach/plan` : `${API_BASE}/api/coach/report`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const detail = body.detail || `Fehler ${res.status}`;
        const label = type === 'trainingsplan' ? 'Trainingsplans' : 'Berichts';
        const msg = detail === 'Coach nicht konfiguriert'
          ? 'Der AI-Coach ist nicht konfiguriert. Bitte ANTHROPIC_API_KEY in backend/.env eintragen.'
          : `Fehler beim Erstellen des ${label}: ${detail}`;
        throw new Error(msg);
      }

      const data = await res.json();
      const newItem = {
        id: generateId(),
        createdAt: new Date().toISOString(),
        text: type === 'trainingsplan' ? data.plan : data.report,
        type,
      };
      const updated = [newItem, ...reports];
      setReports(updated);
      saveReports(username, updated);
      setSelectedReport(newItem);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingAction(null);
    }
  }

  function handleOpenReport(report) {
    setSelectedReport(report);
  }

  function handleBack() {
    setSelectedReport(null);
  }

  function handleDelete(id) {
    const updated = reports.filter((r) => r.id !== id);
    setReports(updated);
    saveReports(username, updated);
    setSelectedReport(null);
  }

  return (
    <div className="coach-page">
      <div className="coach-page__header">
        <div className="coach-page__header-left">
          <h1 className="coach-page__title">Mein Coach</h1>
          <span className="coach-page__sub">KI-Trainingsanalyse</span>
        </div>
        <div className="coach-page__header-actions">
          <button
            className="btn btn--primary"
            onClick={() => handleGenerate('bericht')}
            disabled={loadingAction !== null}
            aria-label="Zwischenbericht erstellen"
          >
            {loadingAction === 'bericht' ? 'Wird erstellt…' : '📊 Zwischenbericht erstellen'}
          </button>
          <button
            className="btn"
            onClick={() => handleGenerate('trainingsplan')}
            disabled={loadingAction !== null}
            aria-label="Trainingsplan vorschlagen"
          >
            {loadingAction === 'trainingsplan' ? 'Wird erstellt…' : '🏋️ Trainingsplan vorschlagen'}
          </button>
        </div>
      </div>

      {loadingAction && (
        <div className="coach-page__thinking-bar">
          <ThinkingIndicator />
          <span className="coach-page__thinking-text">
            {loadingAction === 'trainingsplan' ? 'Erstelle Trainingsplan…' : 'Analysiere Trainingsdaten…'}
          </span>
        </div>
      )}

      {error && (
        <div className="coach-page__error" role="alert">{error}</div>
      )}

      <div className="coach-page__content">
        {selectedReport ? (
          <ReportDetailView
            report={selectedReport}
            onBack={handleBack}
            onDelete={handleDelete}
          />
        ) : reports.length === 0 && loadingAction === null ? (
          <div className="coach-page__empty">
            <div className="coach-page__empty-icon">📊</div>
            <h2 className="coach-page__empty-title">Noch kein Bericht</h2>
            <p className="coach-page__empty-sub">
              Erstelle deinen ersten Zwischenbericht mit dem Button oben.
            </p>
          </div>
        ) : (
          <div className="coach-report-list">
            {reports.map((r) => (
              <ReportListItem key={r.id} report={r} onOpen={handleOpenReport} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
