import { useState } from 'react';
import { useProfile } from '../hooks/useProfile.js';
import { useWeightLog } from '../hooks/useWeightLog.js';
import { getEventsForDate } from '../hooks/useCalendar.js';
import { useGarminHealth } from '../hooks/useGarmin.js';
import './Dashboard.css';

const PERIODS = [
  { id: '1d', label: '1 Tag' },
  { id: '7d', label: '7 Tage' },
  { id: '4w', label: '4 Wochen' },
  { id: '1y', label: '1 Jahr' },
];

const METRIC_TAGS = [
  { id: 'minutes', label: 'Trainingsminuten', unit: 'min' },
  { id: 'sets',    label: 'Sätze',            unit: '' },
  { id: 'rating',  label: 'Bewertung',         unit: '/2' },
  { id: 'weight',  label: 'Körpergewicht',     unit: 'kg' },
];

const GARMIN_TYPE_LABELS = {
  running: 'Laufen', cycling: 'Radfahren', swimming: 'Schwimmen',
  open_water_swimming: 'Freiwasser', strength_training: 'Krafttraining',
  hiking: 'Wandern', walking: 'Gehen', indoor_cycling: 'Indoor-Rad',
  treadmill_running: 'Laufband', elliptical: 'Elliptical', yoga: 'Yoga', other: 'Aktivität',
};

function normalizeGarminActivity(a) {
  if (!a.startTimeLocal) return null;
  return {
    startedAt: a.startTimeLocal.replace(' ', 'T'),
    durationSeconds: a.duration ? Math.round(a.duration) : 0,
    source: 'garmin',
  };
}

const DAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const WEEK_DAY_KEYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

function parseAvgRating(exerciseDataStr) {
  try {
    const arr = JSON.parse(exerciseDataStr || '[]');
    const vals = arr.map((e) => e.rating).filter((r) => r != null && typeof r === 'number');
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  } catch {
    return null;
  }
}

function workoutsInRange(workouts, from, to) {
  return workouts.filter((w) => {
    const d = new Date(w.startedAt);
    return d >= from && d < to;
  });
}

function computeChartData(workouts, period, metric) {
  const now = new Date();

  function buildSlots(count, slotStart) {
    return Array.from({ length: count }, (_, i) => slotStart(i));
  }

  function valueForSlot(bucket) {
    if (metric === 'minutes') {
      return bucket.reduce((sum, w) => sum + Math.round(w.durationSeconds / 60), 0);
    }
    if (metric === 'sets') {
      return bucket.reduce((sum, w) => sum + w.totalSets, 0);
    }
    const ratings = bucket.flatMap((w) => {
      const r = parseAvgRating(w.exerciseData);
      return r != null ? [r] : [];
    });
    return ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  }

  if (period === '1d') {
    return buildSlots(24, (i) => {
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), i, 0, 0, 0);
      const to = new Date(from.getTime() + 60 * 60 * 1000);
      return { label: `${i}h`, value: valueForSlot(workoutsInRange(workouts, from, to)) };
    });
  }

  if (period === '7d') {
    return buildSlots(7, (i) => {
      const day = new Date(now);
      day.setDate(now.getDate() - 6 + i);
      day.setHours(0, 0, 0, 0);
      const to = new Date(day.getTime() + 24 * 60 * 60 * 1000);
      return { label: DAY_LABELS[day.getDay()], value: valueForSlot(workoutsInRange(workouts, day, to)) };
    });
  }

  if (period === '4w') {
    return buildSlots(28, (i) => {
      const day = new Date(now);
      day.setDate(now.getDate() - 27 + i);
      day.setHours(0, 0, 0, 0);
      const to = new Date(day.getTime() + 24 * 60 * 60 * 1000);
      return { label: `${day.getDate()}.`, value: valueForSlot(workoutsInRange(workouts, day, to)) };
    });
  }

  return buildSlots(12, (i) => {
    const from = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const to = new Date(from.getFullYear(), from.getMonth() + 1, 1);
    return { label: MONTH_LABELS[from.getMonth()], value: valueForSlot(workoutsInRange(workouts, from, to)) };
  });
}

function computeWeightChartData(weightEntries, period) {
  const now = new Date();
  const sorted = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));

  function lastInRange(from, to) {
    const inRange = sorted.filter((e) => {
      const d = new Date(e.date + 'T12:00:00');
      return d >= from && d < to;
    });
    return inRange.length > 0 ? inRange[inRange.length - 1].weight : null;
  }

  // 1d and 7d both show last 7 days (weight is daily, not hourly)
  if (period === '1d' || period === '7d') {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(now);
      day.setDate(now.getDate() - 6 + i);
      day.setHours(0, 0, 0, 0);
      const to = new Date(day.getTime() + 24 * 60 * 60 * 1000);
      return { label: DAY_LABELS[day.getDay()], value: lastInRange(day, to) };
    });
  }

  if (period === '4w') {
    return Array.from({ length: 28 }, (_, i) => {
      const day = new Date(now);
      day.setDate(now.getDate() - 27 + i);
      day.setHours(0, 0, 0, 0);
      const to = new Date(day.getTime() + 24 * 60 * 60 * 1000);
      return { label: `${day.getDate()}.`, value: lastInRange(day, to) };
    });
  }

  return Array.from({ length: 12 }, (_, i) => {
    const from = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const to = new Date(from.getFullYear(), from.getMonth() + 1, 1);
    return { label: MONTH_LABELS[from.getMonth()], value: lastInRange(from, to) };
  });
}

function computeStreak(workouts) {
  const trainedDays = new Set(
    workouts.map((w) => {
      const d = new Date(w.startedAt);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (trainedDays.has(key)) streak++;
    else break;
  }
  return streak;
}

function computeFavoriteRoutine(workouts) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const counts = {};
  workouts
    .filter((w) => w.routineName && new Date(w.startedAt) >= thirtyDaysAgo)
    .forEach((w) => { counts[w.routineName] = (counts[w.routineName] ?? 0) + 1; });
  const entries = Object.entries(counts);
  if (entries.length === 0) return '—';
  entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const name = entries[0][0];
  return name.length > 16 ? name.slice(0, 15) + '…' : name;
}

function ratingEmoji(avg) {
  if (avg >= 1.5) return '😊';
  if (avg >= 0.5) return '😐';
  return '😢';
}

// Returns { direction: 'up'|'down'|'neutral', label: string } | null
function makeTrend(current, prev) {
  if (prev === null || prev === undefined) return null;
  const diff = current - prev;
  const rounded = Math.round(diff * 10) / 10;
  if (rounded === 0 && current === 0) return null;
  if (rounded === 0) return { direction: 'neutral', label: '→ ±0' };
  const arrow = rounded > 0 ? '↑' : '↓';
  const sign = rounded > 0 ? '+' : '';
  const display = Number.isInteger(rounded) ? rounded : rounded.toFixed(1);
  return { direction: rounded > 0 ? 'up' : 'down', label: `${arrow} ${sign}${display}` };
}

function computeKpis(workouts, garminEntries) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const allEntries = [...workouts, ...(garminEntries ?? [])];
  const recentAll = allEntries.filter((w) => new Date(w.startedAt) >= sevenDaysAgo);
  const prevAll = allEntries.filter((w) => {
    const d = new Date(w.startedAt);
    return d >= fourteenDaysAgo && d < sevenDaysAgo;
  });

  const trainingsWeek = recentAll.length;
  const minutesWeek = recentAll.reduce((s, w) => s + Math.round(w.durationSeconds / 60), 0);
  const prevCount = prevAll.length;
  const prevMinutes = prevAll.reduce((s, w) => s + Math.round(w.durationSeconds / 60), 0);

  const streak = computeStreak([...workouts, ...(garminEntries ?? [])]);
  const favoriteRoutine = computeFavoriteRoutine(workouts);

  const recent = workouts.filter((w) => new Date(w.startedAt) >= sevenDaysAgo);
  const prevRecent = workouts.filter((w) => {
    const d = new Date(w.startedAt);
    return d >= fourteenDaysAgo && d < sevenDaysAgo;
  });

  const recentRatings = recent.flatMap((w) => {
    const r = parseAvgRating(w.exerciseData);
    return r != null ? [r] : [];
  });
  const prevRatings = prevRecent.flatMap((w) => {
    const r = parseAvgRating(w.exerciseData);
    return r != null ? [r] : [];
  });
  const avgRating =
    recentRatings.length > 0
      ? recentRatings.reduce((a, b) => a + b, 0) / recentRatings.length
      : null;
  const prevAvgRating =
    prevRatings.length > 0
      ? prevRatings.reduce((a, b) => a + b, 0) / prevRatings.length
      : null;

  return [
    { value: String(trainingsWeek), unit: '', label: 'Trainings (7 Tage)', trend: makeTrend(trainingsWeek, prevCount) },
    { value: String(minutesWeek), unit: 'min', label: 'Aktiv (7 Tage)', trend: makeTrend(minutesWeek, prevMinutes) },
    { value: String(streak), unit: streak === 1 ? 'Tag' : 'Tage', label: 'Streak 🔥', trend: null },
    {
      value: avgRating != null ? avgRating.toFixed(1) : '—',
      unit: avgRating != null ? ratingEmoji(avgRating) : '',
      label: 'Ø Bewertung (7 Tage)',
      trend: avgRating != null && prevAvgRating != null ? makeTrend(avgRating, prevAvgRating) : null,
    },
    { value: favoriteRoutine, unit: '', label: 'Lieblingsroutine (30 Tage)', trend: null },
    { value: String(workouts.length), unit: '', label: 'Gesamt', trend: null },
  ];
}

function computeTodayContext(workouts, routines, calendarEvents, garminEntries) {
  const today = new Date().toLocaleDateString('sv'); // YYYY-MM-DD

  const allEntries = [...workouts, ...(garminEntries ?? [])];
  const todayWorkouts = allEntries.filter((w) => w.startedAt.slice(0, 10) === today);
  const totalMinutes = todayWorkouts.reduce((s, w) => s + Math.round(w.durationSeconds / 60), 0);

  const todayEvents = getEventsForDate(today, calendarEvents ?? []);
  const plannedNames = todayEvents.map((e) => e.routineName);
  const plannedEvents = todayEvents.map((e) => ({ routineId: e.routineId, routineName: e.routineName }));

  return { count: todayWorkouts.length, totalMinutes, plannedNames, plannedEvents };
}

function formatRecentDate(isoStr) {
  return new Date(isoStr).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function LineChart({ data, yMax, yMin = 0 }) {
  const W = 700;
  const H = 150;
  const pad = { top: 20, right: 20, bottom: 36, left: 44 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const nonNull = data.filter((d) => d.value != null);
  const chartMin = yMin;
  const chartMax = Math.max(
    yMax ?? 0,
    ...nonNull.map((d) => d.value),
    chartMin + 1,
  );

  const xScale = (i) => pad.left + (i / Math.max(data.length - 1, 1)) * chartW;
  const yScale = (v) => pad.top + chartH - ((v - chartMin) / (chartMax - chartMin)) * chartH;

  let _pathStarted = false;
  const pathD = data.reduce((acc, d, i) => {
    if (d.value == null) return acc;
    const x = xScale(i).toFixed(1);
    const y = yScale(d.value).toFixed(1);
    const cmd = _pathStarted ? ` L ${x} ${y}` : ` M ${x} ${y}`;
    _pathStarted = true;
    return acc + cmd;
  }, '').trim();

  const gridValues = [0, 25, 50, 75, 100].map((pct, i) => ({
    key: i,
    v: Math.round(chartMin + ((chartMax - chartMin) * pct) / 100),
  }));

  const xLabelStep = Math.ceil(data.length / 6);
  const xLabels = data.filter((_, i) => i % xLabelStep === 0 || i === data.length - 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="dashboard__chart-svg" aria-hidden="true">
      {gridValues.map(({ key, v }) => (
        <line
          key={key}
          x1={pad.left}
          y1={yScale(v)}
          x2={W - pad.right}
          y2={yScale(v)}
          stroke="#f0f0f0"
          strokeWidth="1"
        />
      ))}
      {gridValues.map(({ key, v }) => (
        <text key={key} x={pad.left - 8} y={yScale(v) + 4} textAnchor="end" fontSize="10" fill="#b0b0b0">
          {v}
        </text>
      ))}
      {xLabels.map((d, idx) => {
        const origIdx = data.indexOf(d);
        return (
          <text key={idx} x={xScale(origIdx)} y={H - 6} textAnchor="middle" fontSize="10" fill="#b0b0b0">
            {d.label}
          </text>
        );
      })}
      {pathD && (
        <path d={pathD} fill="none" stroke="#FF5C1A" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      )}
      {data.length <= 14 &&
        data.map((d, i) => {
          if (d.value == null) return null;
          const cx = xScale(i);
          const cy = yScale(d.value);
          return (
            <circle
              key={i}
              cx={cx.toFixed(1)}
              cy={cy.toFixed(1)}
              r="3.5"
              fill="#FF5C1A"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          );
        })}
    </svg>
  );
}

export default function Dashboard({ workouts = [], routines = [], calendarEvents = [], garminActivities = [], onStartWorkout }) {
  const { profile } = useProfile();
  const { entries: weightEntries } = useWeightLog();
  const { health: garminHealth } = useGarminHealth();
  const [activePeriod, setActivePeriod] = useState('7d');
  const [activeMetric, setActiveMetric] = useState('minutes');

  const garminEntries = garminActivities.map(normalizeGarminActivity).filter(Boolean);
  const minuteEntries = [...workouts, ...garminEntries];

  const greeting = profile.vorname?.trim() ? `Hallo, ${profile.vorname.trim()}!` : 'Hallo!';
  const ziele = profile.ziele ?? [];
  const todayCtx = computeTodayContext(workouts, routines, calendarEvents, garminEntries);

  // CTA: only events whose routine still exists in the routines list
  const startableEvents = todayCtx.plannedEvents.filter(
    (e) => e.routineId && routines.some((r) => r.id === e.routineId)
  );

  // Garmin health KPIs — only rendered when health data is available
  const garminKpis = garminHealth ? [
    {
      value: garminHealth.steps != null ? Math.round(garminHealth.steps).toLocaleString('de-DE') : '—',
      unit: '',
      label: 'Schritte',
    },
    {
      value: garminHealth.sleepDuration != null ? garminHealth.sleepDuration.toFixed(1) : '—',
      unit: garminHealth.sleepDuration != null ? 'h' : '',
      label: 'Schlaf',
    },
    {
      value: garminHealth.restingHeartRate != null ? String(garminHealth.restingHeartRate) : '—',
      unit: garminHealth.restingHeartRate != null ? 'bpm' : '',
      label: 'Ruhepuls',
    },
  ] : null;

  const activeMetricTag = METRIC_TAGS.find((m) => m.id === activeMetric);
  const nonNullWeights = weightEntries.map((e) => e.weight);
  const weightYMin = nonNullWeights.length > 0 ? Math.max(0, Math.floor(Math.min(...nonNullWeights) - 5)) : 0;
  const weightYMax = nonNullWeights.length > 0 ? Math.ceil(Math.max(...nonNullWeights) + 5) : 100;
  const chartYMax = activeMetric === 'rating' ? 2 : activeMetric === 'weight' ? weightYMax : undefined;
  const chartYMin = activeMetric === 'weight' ? weightYMin : 0;
  const chartData = activeMetric === 'weight'
    ? computeWeightChartData(weightEntries, activePeriod)
    : activeMetric === 'minutes'
      ? computeChartData(minuteEntries, activePeriod, activeMetric)
      : computeChartData(workouts, activePeriod, activeMetric);
  const kpis = computeKpis(workouts, garminEntries);

  const showWelcomeRight = todayCtx.totalMinutes > 0 || (startableEvents.length > 0 && onStartWorkout);

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h1 className="dashboard__title">Fitness</h1>
      </div>

      <div className="dashboard__welcome-card">
        <span className="dashboard__welcome-greeting">{greeting}</span>
        {ziele.length > 0 && (
          <div className="dashboard__ziele-row">
            {ziele.map((ziel) => (
              <span key={ziel} className="dashboard__ziel-chip">{ziel}</span>
            ))}
          </div>
        )}
        {todayCtx.plannedNames.length > 0 && (
          <>
            <span className="dashboard__welcome-sep">·</span>
            <span className="dashboard__today-label">Heute geplant</span>
            <span className="dashboard__today-value">{todayCtx.plannedNames.join(', ')}</span>
          </>
        )}
        {todayCtx.plannedNames.length === 0 && todayCtx.count === 0 && (
          <span className="dashboard__today-label--muted">Kein Training geplant heute</span>
        )}
        {showWelcomeRight && (
          <div className="dashboard__welcome-right">
            {todayCtx.totalMinutes > 0 && (
              <span className="dashboard__welcome-minutes">
                <span className="dashboard__welcome-minutes-value">{todayCtx.totalMinutes}</span>
                <span className="dashboard__welcome-minutes-unit">min</span>
              </span>
            )}
            {startableEvents.length > 0 && onStartWorkout && (
              startableEvents.length === 1 ? (
                <button
                  className="btn btn--primary btn--small"
                  onClick={() => onStartWorkout(startableEvents[0].routineId)}
                >
                  ▶ Training starten
                </button>
              ) : (
                startableEvents.map((e) => (
                  <button
                    key={e.routineId}
                    className="btn btn--small"
                    onClick={() => onStartWorkout(e.routineId)}
                  >
                    ▶ {e.routineName}
                  </button>
                ))
              )
            )}
          </div>
        )}
      </div>

      <div className="dashboard__chart-section">
        <div className="dashboard__chart-header">
          <div className="dashboard__chart-title">
            <span>{activeMetricTag.label}</span>
            {activeMetricTag.unit && <span className="dashboard__chart-unit">{activeMetricTag.unit}</span>}
          </div>
          <div className="dashboard__period-pills">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                className={`dashboard__pill${activePeriod === p.id ? ' dashboard__pill--active' : ''}`}
                onClick={() => setActivePeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <LineChart data={chartData} yMax={chartYMax} yMin={chartYMin} />
        <div className="dashboard__metric-tags">
          {METRIC_TAGS.map((tag) => (
            <button
              key={tag.id}
              className={`metric-tag${activeMetric === tag.id ? ' metric-tag--active' : ''}`}
              onClick={() => setActiveMetric(tag.id)}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard__kpi-row">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="kpi-card">
            <div className="kpi-card__value">
              {kpi.value}
              {kpi.unit && <span className="kpi-card__unit">{kpi.unit}</span>}
            </div>
            <div className="kpi-card__label">{kpi.label}</div>
            {kpi.trend && (
              <div className={`kpi-card__trend kpi-card__trend--${kpi.trend.direction}`}>
                {kpi.trend.label}
              </div>
            )}
          </div>
        ))}
      </div>

      {garminKpis && (
        <div className="dashboard__garmin-section">
          <span className="dashboard__section-tag">Garmin · Heute</span>
          <div className="dashboard__garmin-kpi-row">
            {garminKpis.map((kpi) => (
              <div key={kpi.label} className="kpi-card">
                <div className="kpi-card__value">
                  {kpi.value}
                  {kpi.unit && <span className="kpi-card__unit">{kpi.unit}</span>}
                </div>
                <div className="kpi-card__label">{kpi.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dashboard__recent">
        <h2 className="dashboard__section-title">Letzte Trainings</h2>
        {workouts.length === 0 ? (
          <p className="dashboard__recent-empty">Noch keine Trainings aufgezeichnet.</p>
        ) : (
          workouts.slice(0, 3).map((w) => (
            <div key={w.id} className="dashboard__recent-item">
              <span className="dashboard__recent-date">{formatRecentDate(w.startedAt)}</span>
              <span className="dashboard__recent-name">{w.routineName || 'Freies Training'}</span>
              <span className="dashboard__recent-meta">
                {Math.round(w.durationSeconds / 60)} min · {w.totalSets} Sätze
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
