import { useState } from 'react';
import { useGarmin, useGarminHealth, useGarminHistory, useGarminHRV, useGarminActivityDetail } from '../hooks/useGarmin.js';
import './GarminView.css';

/* ─── Helpers ────────────────────────────────────────────── */

function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function batteryColor(v) {
  if (v == null) return '#888';
  if (v >= 75) return '#4caf50';
  if (v >= 50) return '#00bcd4';
  if (v >= 25) return '#ff9800';
  return '#ef4444';
}

function stressColor(v) {
  if (v == null) return '#888';
  if (v < 25) return '#4caf50';
  if (v < 50) return '#00bcd4';
  if (v < 75) return '#ff9800';
  return '#ef4444';
}

function formatPace(secPerKm) {
  if (!secPerKm || secPerKm <= 0) return null;
  const mins = Math.floor(secPerKm / 60);
  const secs = secPerKm % 60;
  return `${mins}:${String(secs).padStart(2, '0')} /km`;
}

/* ─── Metric metadata ───────────────────────────────────── */

const METRIC_META = {
  bodyBattery:        { label: 'Body Battery',        unit: '',       yMax: 100 },
  steps:              { label: 'Schritte',             unit: 'Schritte', yMax: 15000 },
  restingHeartRate:   { label: 'Ruhepuls',             unit: 'bpm',    yMax: 120 },
  averageStressLevel: { label: 'Stresslevel',          unit: '',       yMax: 100 },
  calories:           { label: 'Kalorien',             unit: 'kcal',   yMax: 3500 },
  distance:           { label: 'Distanz',              unit: 'km',     yMax: 15 },
  sleepDuration:      { label: 'Schlafdauer',          unit: 'h',      yMax: 12 },
  vo2max:             { label: 'VO2max',               unit: 'ml/kg',  yMax: 70 },
  intensityMinutes:   { label: 'Intensitätsminuten',   unit: 'Min',    yMax: 150 },
  hrv:                { label: 'HRV',                  unit: 'ms',     yMax: 120 },
};

/* ─── Activity helpers ───────────────────────────────────── */

const ACTIVITY_TYPES = {
  running: { label: 'Laufen', color: '#00bcd4' },
  cycling: { label: 'Radfahren', color: '#5c6bc0' },
  swimming: { label: 'Schwimmen', color: '#2196f3' },
  open_water_swimming: { label: 'Freiwasser', color: '#2196f3' },
  strength_training: { label: 'Krafttraining', color: '#ff9800' },
  hiking: { label: 'Wandern', color: '#4caf50' },
  walking: { label: 'Gehen', color: '#4caf50' },
  indoor_cycling: { label: 'Indoor-Rad', color: '#5c6bc0' },
  treadmill_running: { label: 'Laufband', color: '#00bcd4' },
  elliptical: { label: 'Elliptical', color: '#888' },
  yoga: { label: 'Yoga', color: '#9c27b0' },
  other: { label: 'Aktivität', color: '#888' },
};

function getType(typeKey) {
  return ACTIVITY_TYPES[typeKey] ?? ACTIVITY_TYPES.other;
}

function formatDuration(seconds) {
  if (!seconds || seconds < 60) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function formatDistance(meters) {
  if (!meters || meters < 50) return null;
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(' ', 'T'));
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* ─── Shared: SetupHint ──────────────────────────────────── */

function SetupHint() {
  return (
    <div className="garmin-view__setup-hint">
      <h2>Garmin nicht konfiguriert</h2>
      <p>
        Trage deine Garmin Connect-Zugangsdaten in die Datei <strong>backend/.env</strong> ein
        und starte das Backend neu:
      </p>
      <code>{`GARMIN_EMAIL=deine@email.de\nGARMIN_PASSWORD=deinPasswort`}</code>
      <p className="hint-note">
        Die Zugangsdaten werden nur lokal gespeichert und nicht übertragen.
        Nach dem ersten Login werden OAuth-Tokens gecacht.
      </p>
    </div>
  );
}

/* ─── SplitsTable ────────────────────────────────────────── */

function SplitsTable({ splits }) {
  return (
    <div className="splits-section">
      <h3 className="splits-section__title">Splits</h3>
      <div className="splits-table-wrap">
        <table className="splits-table">
          <thead>
            <tr>
              <th>km</th>
              <th>Pace</th>
              <th>Puls</th>
              <th>Zeit</th>
            </tr>
          </thead>
          <tbody>
            {splits.map((s, i) => {
              const distKm = s.distance != null ? (s.distance / 1000).toFixed(2) : '—';
              const pace = s.avgPace ? formatPace(s.avgPace) : '—';
              const hr = s.avgHR ? Math.round(s.avgHR) : '—';
              const dur = s.duration ? (formatDuration(Math.round(s.duration)) ?? '—') : '—';
              return (
                <tr key={i}>
                  <td>{distKm}</td>
                  <td>{pace}</td>
                  <td>{hr}</td>
                  <td>{dur}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── ActivityDetailView ─────────────────────────────────── */

function ActivityDetailView({ activity, onBack }) {
  const { detail, loading, error } = useGarminActivityDetail(activity.id);
  const type = getType(activity.activityType);
  const duration = formatDuration(activity.duration);
  const distance = formatDistance(activity.distance);
  const pace = activity.avgSpeed && activity.avgSpeed > 0
    ? formatPace(Math.round(1000 / activity.avgSpeed))
    : null;

  return (
    <div className="activity-detail">
      <div className="activity-detail__header">
        <button className="btn--ghost" onClick={onBack}>← Zurück</button>
        <div className="activity-detail__title-group">
          <div className="activity-detail__type-dot" style={{ background: type.color }} />
          <h2 className="activity-detail__name">{activity.activityName || type.label}</h2>
        </div>
        <span className="activity-detail__date">{formatDate(activity.startTimeLocal)}</span>
      </div>

      <div className="activity-detail__stats">
        {duration && (
          <div className="activity-detail__stat">
            <span className="activity-detail__stat-label">Dauer</span>
            <span className="activity-detail__stat-value">{duration}</span>
          </div>
        )}
        {distance && (
          <div className="activity-detail__stat">
            <span className="activity-detail__stat-label">Distanz</span>
            <span className="activity-detail__stat-value">{distance}</span>
          </div>
        )}
        {pace && (
          <div className="activity-detail__stat">
            <span className="activity-detail__stat-label">Ø Pace</span>
            <span className="activity-detail__stat-value">{pace}</span>
          </div>
        )}
        {activity.averageHR > 0 && (
          <div className="activity-detail__stat">
            <span className="activity-detail__stat-label">Ø Puls</span>
            <span className="activity-detail__stat-value">{Math.round(activity.averageHR)} bpm</span>
          </div>
        )}
        {activity.maxHR > 0 && (
          <div className="activity-detail__stat">
            <span className="activity-detail__stat-label">Max Puls</span>
            <span className="activity-detail__stat-value">{Math.round(activity.maxHR)} bpm</span>
          </div>
        )}
        {activity.elevationGain > 0 && (
          <div className="activity-detail__stat">
            <span className="activity-detail__stat-label">Höhenmeter</span>
            <span className="activity-detail__stat-value">{Math.round(activity.elevationGain)} m</span>
          </div>
        )}
        {activity.calories > 0 && (
          <div className="activity-detail__stat">
            <span className="activity-detail__stat-label">Kalorien</span>
            <span className="activity-detail__stat-value">{Math.round(activity.calories)} kcal</span>
          </div>
        )}
        {activity.cadence > 0 && (
          <div className="activity-detail__stat">
            <span className="activity-detail__stat-label">Kadenz</span>
            <span className="activity-detail__stat-value">{activity.cadence} spm</span>
          </div>
        )}
      </div>

      {loading && <div className="loading-state" style={{ marginTop: '16px' }}>Splits werden geladen…</div>}
      {error && !loading && (
        <p className="garmin-view__empty" style={{ marginTop: '12px' }}>Splits konnten nicht geladen werden.</p>
      )}
      {!loading && detail && detail.splits.length > 0 && (
        <SplitsTable splits={detail.splits} />
      )}
      {!loading && !error && detail && detail.splits.length === 0 && (
        <p className="garmin-view__empty" style={{ marginTop: '12px' }}>Keine Splits für diese Aktivität.</p>
      )}
    </div>
  );
}

/* ─── Activities Tab ─────────────────────────────────────── */

function ActivityCard({ activity, onClick }) {
  const type = getType(activity.activityType);
  const duration = formatDuration(activity.duration);
  const distance = formatDistance(activity.distance);

  return (
    <div
      className="activity-card"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <div className="activity-card__type-dot" style={{ background: type.color }} />
      <div className="activity-card__body">
        <p className="activity-card__title">{activity.activityName || type.label}</p>
        <div className="activity-card__meta">
          <span className="activity-card__date">{formatDate(activity.startTimeLocal)}</span>
          <span className="activity-card__type-label" style={{ background: `${type.color}18`, color: type.color }}>
            {type.label}
          </span>
          {duration && <span className="activity-stat activity-stat--duration">{duration}</span>}
          {distance && <span className="activity-stat activity-stat--distance">{distance}</span>}
          {activity.calories > 0 && (
            <span className="activity-stat activity-stat--calories">{Math.round(activity.calories)} kcal</span>
          )}
          {activity.averageHR > 0 && (
            <span className="activity-stat activity-stat--hr">{Math.round(activity.averageHR)} bpm</span>
          )}
          {activity.maxHR > 0 && (
            <span className="activity-stat activity-stat--hr" style={{ opacity: 0.75 }}>Max {Math.round(activity.maxHR)}</span>
          )}
          {activity.avgSpeed > 0 && (
            <span className="activity-stat activity-stat--pace">
              {formatPace(Math.round(1000 / activity.avgSpeed))}
            </span>
          )}
        </div>
      </div>
      {onClick && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ color: '#ccc', flexShrink: 0 }}>
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

const ACTIVITY_PAGE_SIZE = 20;
const ACTIVITY_MAX_LIMIT = 100;

function ActivitiesSection({ onSelectActivity }) {
  const [limit, setLimit] = useState(ACTIVITY_PAGE_SIZE);
  const { activities, loading, error, notConfigured } = useGarmin(limit);
  if (notConfigured) return <SetupHint />;
  if (loading) return <div className="loading-state">Aktivitäten werden geladen…</div>;
  if (error) return <div className="garmin-view__error">{error}</div>;
  if (activities.length === 0) return <p className="garmin-view__empty">Keine Aktivitäten gefunden.</p>;
  return (
    <div>
      <div className="garmin-view__list">
        {activities.map((a) => (
          <ActivityCard key={a.id} activity={a} onClick={() => onSelectActivity(a)} />
        ))}
      </div>
      {limit < ACTIVITY_MAX_LIMIT && (
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            className="btn"
            onClick={() => setLimit((l) => Math.min(l + ACTIVITY_PAGE_SIZE, ACTIVITY_MAX_LIMIT))}
            disabled={loading}
          >
            {loading ? 'Wird geladen…' : 'Mehr laden'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Health Tab ─────────────────────────────────────────── */

function HealthKpi({ label, value, unit, color, sub, metric, onSelect }) {
  const display = value != null ? String(value) : '—';
  const clickable = metric && onSelect;
  return (
    <div
      className={`health-kpi${clickable ? ' health-kpi--clickable' : ''}`}
      onClick={clickable ? () => onSelect(metric) : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => e.key === 'Enter' && onSelect(metric) : undefined}
    >
      <div className="health-kpi__label">{label}</div>
      <div className="health-kpi__value-row">
        <span className="health-kpi__value" style={{ color }}>{display}</span>
        {unit && value != null && <span className="health-kpi__unit">{unit}</span>}
      </div>
      {sub && <div className="health-kpi__sub">{sub}</div>}
    </div>
  );
}

/* ─── MetricLineChart ────────────────────────────────────── */

function MetricLineChart({ data, yMax, unit = '' }) {
  const W = 700; const H = 200;
  const pad = { top: 16, right: 20, bottom: 40, left: 52 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const values = data.filter((d) => d.value != null).map((d) => d.value);
  if (values.length === 0) {
    return <p className="garmin-view__empty">Keine Daten verfügbar.</p>;
  }
  const chartMax = Math.max(yMax ?? 0, ...values, 1);
  const xScale = (i) => pad.left + (i / Math.max(data.length - 1, 1)) * chartW;
  const yScale = (v) => pad.top + chartH - (v / chartMax) * chartH;

  let pathD = '';
  let prevWasNull = true;
  for (let i = 0; i < data.length; i++) {
    if (data[i].value == null) { prevWasNull = true; continue; }
    const cmd = prevWasNull ? 'M' : 'L';
    pathD += ` ${cmd} ${xScale(i).toFixed(1)} ${yScale(data[i].value).toFixed(1)}`;
    prevWasNull = false;
  }
  pathD = pathD.trim();

  const gridLevels = [0, 0.33, 0.66, 1];
  const showDots = data.length <= 14;
  const labelEvery = data.length > 14 ? 7 : 1;

  return (
    <div className="metric-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {gridLevels.map((pct) => {
          const y = pad.top + chartH * (1 - pct);
          const val = Math.round(chartMax * pct);
          return (
            <g key={pct}>
              <line x1={pad.left} y1={y} x2={W - pad.right} y2={y} stroke="#e8e8e8" strokeWidth="1" />
              <text x={pad.left - 6} y={y + 4} textAnchor="end" fontSize="11" fill="#bbb">{val}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          if (i % labelEvery !== 0) return null;
          const dt = new Date(d.date + 'T12:00:00');
          const label = dt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
          return (
            <text key={d.date} x={xScale(i)} y={H - pad.bottom + 16} textAnchor="middle" fontSize="11" fill="#bbb">
              {label}
            </text>
          );
        })}
        {pathD && (
          <path d={pathD} fill="none" stroke="#5c6bc0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {showDots && data.map((d, i) => {
          if (d.value == null) return null;
          return <circle key={d.date} cx={xScale(i)} cy={yScale(d.value)} r="4" fill="#5c6bc0" />;
        })}
        {data.map((d, i) => {
          if (d.value == null) return null;
          const dt = new Date(d.date + 'T12:00:00');
          const dateLabel = dt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
          const valueLabel = unit ? `${d.value} ${unit}` : `${d.value}`;
          return (
            <circle
              key={`hit-${d.date}`}
              cx={xScale(i)}
              cy={yScale(d.value)}
              r="10"
              fill="transparent"
              className="metric-chart-hit"
            >
              <title>{`${dateLabel}: ${valueLabel}`}</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
}

/* ─── MetricSummary ──────────────────────────────────────── */

function MetricSummary({ data, unit }) {
  const values = data.filter((d) => d.value != null).map((d) => d.value);
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  return (
    <div className="metric-summary">
      {[['Min', min], ['Ø Durchschnitt', avg], ['Max', max]].map(([lbl, val]) => (
        <div key={lbl} className="metric-summary__stat">
          <div className="metric-summary__stat-label">{lbl}</div>
          <div className="metric-summary__stat-value">
            {val} {unit && <span>{unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── MetricDetail ───────────────────────────────────────── */

function MetricDetail({ metric, onBack }) {
  const [period, setPeriod] = useState('7d');
  const { history, loading, error, notConfigured } = useGarminHistory(metric, period);
  const meta = METRIC_META[metric];

  return (
    <div className="metric-detail">
      <div className="metric-detail__header">
        <button className="btn--ghost" onClick={onBack}>← Zurück</button>
        <h2>{meta.label}</h2>
      </div>
      <div className="metric-period-pills">
        {[['7d', '7 Tage'], ['4w', '4 Wochen']].map(([val, label]) => (
          <button
            key={val}
            className={`period-pill${period === val ? ' period-pill--active' : ''}`}
            onClick={() => setPeriod(val)}
          >
            {label}
          </button>
        ))}
      </div>
      {loading && <div className="loading-state">Wird geladen…</div>}
      {notConfigured && <SetupHint />}
      {error && !notConfigured && <div className="garmin-view__error">{error}</div>}
      {!loading && !error && !notConfigured && history && (
        <>
          <MetricLineChart data={history.data} yMax={meta.yMax} unit={meta.unit} />
          <MetricSummary data={history.data} unit={meta.unit} />
        </>
      )}
    </div>
  );
}

/* ─── SleepCard ──────────────────────────────────────────── */

function SleepCard({ sleep, onSelect }) {
  if (!sleep) return null;
  const total = sleep.totalSeconds;
  if (!total || total === 0) {
    return (
      <div className="sleep-card">
        <div className="sleep-card__header">
          <div className="sleep-card__title">Schlaf</div>
          {onSelect && (
            <button className="sleep-card__history-btn" onClick={onSelect}>Verlauf →</button>
          )}
        </div>
        <p className="garmin-view__empty">Keine Schlafdaten verfügbar.</p>
      </div>
    );
  }

  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const deep = sleep.deepSeconds || 0;
  const rem = sleep.remSeconds || 0;
  const light = sleep.lightSeconds || 0;
  const awake = sleep.awakeSeconds || 0;
  const tracked = deep + rem + light + awake || total;

  const pct = (s) => `${((s / tracked) * 100).toFixed(0)}%`;

  return (
    <div className="sleep-card">
      <div className="sleep-card__header">
        <div className="sleep-card__title">Schlaf</div>
        <div className="sleep-card__total">{h}h {m}min</div>
        {onSelect && (
          <button className="sleep-card__history-btn" onClick={onSelect}>Verlauf →</button>
        )}
      </div>
      <div className="sleep-bar">
        {deep > 0 && <div className="sleep-bar__deep" style={{ width: pct(deep) }} title={`Tiefschlaf: ${Math.round(deep/60)}min`} />}
        {rem > 0 && <div className="sleep-bar__rem" style={{ width: pct(rem) }} title={`REM: ${Math.round(rem/60)}min`} />}
        {light > 0 && <div className="sleep-bar__light" style={{ width: pct(light) }} title={`Leicht: ${Math.round(light/60)}min`} />}
        {awake > 0 && <div className="sleep-bar__awake" style={{ width: pct(awake) }} title={`Wach: ${Math.round(awake/60)}min`} />}
      </div>
      <div className="sleep-legend">
        {deep > 0 && <span className="sleep-legend__item sleep-legend__item--deep">Tief {Math.round(deep/60)}min</span>}
        {rem > 0 && <span className="sleep-legend__item sleep-legend__item--rem">REM {Math.round(rem/60)}min</span>}
        {light > 0 && <span className="sleep-legend__item sleep-legend__item--light">Leicht {Math.round(light/60)}min</span>}
        {awake > 0 && <span className="sleep-legend__item sleep-legend__item--awake">Wach {Math.round(awake/60)}min</span>}
      </div>
    </div>
  );
}

/* ─── HrvCard ────────────────────────────────────────────── */

function HrvCard({ hrv, onSelect }) {
  if (!hrv || (hrv.weeklyAvg == null && hrv.lastNight == null)) return null;
  return (
    <div className="hrv-card">
      <div className="hrv-card__header">
        <div className="hrv-card__title">HRV (Herzratenvariabilität)</div>
        {hrv.weeklyAvg != null && (
          <div className="hrv-card__value">{hrv.weeklyAvg} ms</div>
        )}
        {onSelect && (
          <button className="sleep-card__history-btn" onClick={onSelect}>Verlauf →</button>
        )}
      </div>
      {hrv.lastNight != null && (
        <div className="hrv-card__sub">Letzte Nacht: {hrv.lastNight} ms</div>
      )}
    </div>
  );
}

/* ─── HealthSection ──────────────────────────────────────── */

function HealthSection({ date, onDateChange, onSelectMetric }) {
  const { health, loading, error, notConfigured } = useGarminHealth(date);
  const { hrv } = useGarminHRV(date);
  const yesterday = yesterdayISO();

  function goDay(dir) {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + dir);
    const iso = d.toISOString().slice(0, 10);
    if (iso <= yesterday) onDateChange(iso);
  }

  const intensityTotal =
    (health?.vigorousMinutes ?? 0) + (health?.moderateMinutes ?? 0) || null;
  const intensitySub = health && (health.vigorousMinutes || health.moderateMinutes)
    ? `Intensiv ${health.vigorousMinutes ?? 0} + Moderat ${health.moderateMinutes ?? 0} Min`
    : null;

  return (
    <>
      <div className="health-date-nav">
        <button className="health-date-nav__btn" onClick={() => goDay(-1)}>‹</button>
        <span className="health-date-nav__label">{formatDateLabel(date)}</span>
        <button className="health-date-nav__btn" onClick={() => goDay(+1)} disabled={date >= yesterday}>›</button>
      </div>

      {loading && <div className="loading-state">Gesundheitsdaten werden geladen…</div>}
      {notConfigured && <SetupHint />}
      {error && !notConfigured && <div className="garmin-view__error">{error}</div>}

      {!loading && !error && !notConfigured && health && (
        <>
          <div className="health-kpis">
            <HealthKpi
              label="Body Battery"
              value={health.bodyBatteryHighest}
              unit=""
              color={batteryColor(health.bodyBatteryHighest)}
              sub={health.bodyBatteryLowest != null ? `Tief: ${health.bodyBatteryLowest}` : null}
              metric="bodyBattery"
              onSelect={onSelectMetric}
            />
            <HealthKpi
              label="Schritte"
              value={health.steps != null ? health.steps.toLocaleString('de-DE') : null}
              unit=""
              color="#5c6bc0"
              metric="steps"
              onSelect={onSelectMetric}
            />
            <HealthKpi
              label="Ruhepuls"
              value={health.restingHeartRate}
              unit="bpm"
              color="#ef4444"
              metric="restingHeartRate"
              onSelect={onSelectMetric}
            />
            <HealthKpi
              label="Stresslevel"
              value={health.averageStressLevel}
              unit=""
              color={stressColor(health.averageStressLevel)}
              metric="averageStressLevel"
              onSelect={onSelectMetric}
            />
            <HealthKpi
              label="Kalorien"
              value={health.totalCalories}
              unit="kcal"
              color="#ff9800"
              metric="calories"
              onSelect={onSelectMetric}
            />
            <HealthKpi
              label="Distanz"
              value={health.distanceMeters != null ? (health.distanceMeters / 1000).toFixed(1) : null}
              unit="km"
              color="#00bcd4"
              metric="distance"
              onSelect={onSelectMetric}
            />
            <HealthKpi
              label="VO2max"
              value={health.vo2max != null ? health.vo2max.toFixed(1) : null}
              unit="ml/kg"
              color="#4caf50"
              metric="vo2max"
              onSelect={onSelectMetric}
            />
            <HealthKpi
              label="Intensitätsmin."
              value={intensityTotal}
              unit="Min"
              color="#5c6bc0"
              sub={intensitySub}
              metric="intensityMinutes"
              onSelect={onSelectMetric}
            />
            <HealthKpi
              label="Stockwerke"
              value={health.floors}
              unit="Etagen"
              color="#ff9800"
            />
            <HealthKpi
              label="HRV"
              value={hrv?.weeklyAvg ?? null}
              unit="ms"
              color="#00bcd4"
              sub={hrv?.lastNight != null ? `Letzte Nacht: ${hrv.lastNight} ms` : null}
              metric={hrv ? 'hrv' : null}
              onSelect={hrv ? onSelectMetric : null}
            />
          </div>
          <SleepCard sleep={health.sleep} onSelect={() => onSelectMetric('sleepDuration')} />
          <HrvCard hrv={hrv} onSelect={() => onSelectMetric('hrv')} />
        </>
      )}
    </>
  );
}

/* ─── Root ───────────────────────────────────────────────── */

export default function GarminView() {
  const [tab, setTab] = useState('health');
  const [healthDate, setHealthDate] = useState(yesterdayISO);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);

  return (
    <div className="garmin-view">
      <div className="garmin-view__header">
        <h1>Garmin</h1>
        {!selectedMetric && !selectedActivity && (
          <div className="garmin-view__tabs">
            <button
              className={`garmin-tab${tab === 'health' ? ' garmin-tab--active' : ''}`}
              onClick={() => setTab('health')}
            >
              Gesundheit
            </button>
            <button
              className={`garmin-tab${tab === 'activities' ? ' garmin-tab--active' : ''}`}
              onClick={() => setTab('activities')}
            >
              Aktivitäten
            </button>
          </div>
        )}
      </div>

      {selectedMetric ? (
        <MetricDetail metric={selectedMetric} onBack={() => setSelectedMetric(null)} />
      ) : selectedActivity ? (
        <ActivityDetailView activity={selectedActivity} onBack={() => setSelectedActivity(null)} />
      ) : (
        <>
          {tab === 'health' && (
            <HealthSection
              date={healthDate}
              onDateChange={setHealthDate}
              onSelectMetric={setSelectedMetric}
            />
          )}
          {tab === 'activities' && (
            <ActivitiesSection onSelectActivity={setSelectedActivity} />
          )}
        </>
      )}
    </div>
  );
}
