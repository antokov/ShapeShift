from fastapi import FastAPI, HTTPException, Request, status
from pydantic import BaseModel
from typing import Optional
from contextlib import asynccontextmanager
import database
import garmin_service
import json
import os

try:
    from anthropic import Anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False


class Exercise(BaseModel):
    id: str
    name: str
    sets: Optional[int] = None
    reps: Optional[int] = None
    duration: Optional[int] = None
    durationMinutes: Optional[int] = None


class Routine(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    exercises: list[Exercise] = []
    createdAt: str
    routineType: str = "strength"


class Workout(BaseModel):
    id: str
    routineId: str
    routineName: str
    startedAt: str
    durationSeconds: int = 0
    totalSets: int = 0
    notes: str = ""
    exerciseData: str = ""


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.init_db()
    yield


app = FastAPI(title="FitnessApp API", lifespan=lifespan)


def get_user_id(request: Request) -> str:
    uid = request.headers.get("X-User-Id", "").strip()
    return uid if uid else "admin"


@app.get("/api/routines", response_model=list[Routine])
def list_routines(request: Request):
    return database.get_all_routines(get_user_id(request))


@app.post("/api/routines", response_model=Routine, status_code=status.HTTP_201_CREATED)
def create_routine(routine: Routine, request: Request):
    return database.create_routine(routine.model_dump(), get_user_id(request))


@app.get("/api/routines/{routine_id}", response_model=Routine)
def get_routine(routine_id: str, request: Request):
    routine = database.get_routine(routine_id, get_user_id(request))
    if not routine:
        raise HTTPException(status_code=404, detail="Routine nicht gefunden")
    return routine


@app.put("/api/routines/{routine_id}", response_model=Routine)
def update_routine(routine_id: str, routine: Routine, request: Request):
    updated = database.update_routine(routine_id, routine.model_dump(), get_user_id(request))
    if not updated:
        raise HTTPException(status_code=404, detail="Routine nicht gefunden")
    return updated


@app.delete("/api/routines/{routine_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_routine(routine_id: str, request: Request):
    if not database.delete_routine(routine_id, get_user_id(request)):
        raise HTTPException(status_code=404, detail="Routine nicht gefunden")


class CalendarEvent(BaseModel):
    id: str
    routineId: str
    routineName: str
    eventType: str
    date: Optional[str] = None
    startDate: Optional[str] = None
    recurrenceDays: list[str] = []


@app.get("/api/calendar")
def get_calendar(request: Request):
    return database.get_calendar_events(get_user_id(request))


@app.post("/api/calendar", status_code=status.HTTP_201_CREATED)
def create_calendar_event(event: CalendarEvent, request: Request):
    database.add_calendar_event(event.model_dump(), get_user_id(request))
    return event


@app.delete("/api/calendar/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_calendar_event(event_id: str, request: Request):
    database.delete_calendar_event(event_id, get_user_id(request))


@app.get("/api/workouts", response_model=list[Workout])
def list_workouts(request: Request):
    return database.get_all_workouts(get_user_id(request))


@app.post("/api/workouts", response_model=Workout, status_code=status.HTTP_201_CREATED)
def create_workout(workout: Workout, request: Request):
    return database.create_workout(workout.model_dump(), get_user_id(request))


@app.put("/api/workouts/{workout_id}", response_model=Workout)
def update_workout(workout_id: str, workout: Workout, request: Request):
    updated = database.update_workout(workout_id, workout.model_dump(), get_user_id(request))
    if not updated:
        raise HTTPException(status_code=404, detail="Training nicht gefunden")
    return updated


@app.delete("/api/workouts/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout(workout_id: str, request: Request):
    if not database.delete_workout(workout_id, get_user_id(request)):
        raise HTTPException(status_code=404, detail="Training nicht gefunden")


@app.get("/api/garmin/health")
def get_garmin_health(date: Optional[str] = None):
    try:
        return garmin_service.get_health(date)
    except garmin_service.GarminNotConfiguredError:
        raise HTTPException(status_code=503, detail="Garmin nicht konfiguriert")
    except garmin_service.GarminLoginError as e:
        raise HTTPException(status_code=502, detail=f"Garmin-Fehler: {e}")



@app.get("/api/garmin/health/history")
def get_garmin_health_history(metric: str, period: str = "7d"):
    try:
        return garmin_service.get_health_history(metric, period)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except garmin_service.GarminNotConfiguredError:
        raise HTTPException(status_code=503, detail="Garmin nicht konfiguriert")
    except garmin_service.GarminLoginError as e:
        raise HTTPException(status_code=502, detail=f"Garmin-Fehler: {e}")


class CoachReportRequest(BaseModel):
    workouts: list[dict] = []
    routines: list[dict] = []
    calendarEvents: list[dict] = []
    garminActivities: list[dict] = []
    profile: dict = {}
    weightLog: list[dict] = []
    garminHealth: Optional[dict] = None
    garminHealthHistory: Optional[dict] = None
    garmin_hrv: Optional[dict] = None


class CoachChatRequest(BaseModel):
    report: str
    messages: list[dict] = []


_DAY_TO_WEEKDAY = {'Mo': 0, 'Di': 1, 'Mi': 2, 'Do': 3, 'Fr': 4, 'Sa': 5, 'So': 6}

_GARMIN_TYPE_KEYWORDS: list[tuple[frozenset, frozenset]] = [
    (frozenset({'lauf', 'jogg', 'run'}),          frozenset({'running', 'treadmill_running'})),
    (frozenset({'kraft', 'gym', 'fitness', 'weight', 'stärke', 'training'}),
                                                    frozenset({'strength_training'})),
    (frozenset({'rad', 'bike', 'cycl', 'fahren'}), frozenset({'cycling', 'indoor_cycling'})),
    (frozenset({'swim', 'schwimm'}),                frozenset({'swimming', 'open_water_swimming'})),
    (frozenset({'walk', 'geh', 'hik', 'wander'}),  frozenset({'walking', 'hiking'})),
]


def _garmin_matches_routine(routine_name: str, activity_type: str, activity_name: str) -> bool:
    rname = routine_name.lower()
    gtype = (activity_type or '').lower()
    gname = (activity_name or '').lower()
    if rname and gname and (rname in gname or gname in rname):
        return True
    for keywords, garmin_types in _GARMIN_TYPE_KEYWORDS:
        if any(k in rname for k in keywords):
            return gtype in garmin_types
    return False


def _count_expected_series_sessions(start_date_str: str, recurrence_days: list[str], today_str: str) -> int | None:
    from datetime import date, timedelta
    try:
        start = date.fromisoformat(start_date_str)
        today = date.fromisoformat(today_str)
        yesterday = today - timedelta(days=1)
        if start > yesterday:
            return 0
        weekdays = {_DAY_TO_WEEKDAY[d] for d in recurrence_days if d in _DAY_TO_WEEKDAY}
        if not weekdays:
            return 0
        count = 0
        d = start
        while d <= yesterday:
            if d.weekday() in weekdays:
                count += 1
            d += timedelta(days=1)
        return count
    except (ValueError, TypeError, AttributeError):
        return None


def _compute_training_start(
    calendar_events: list[dict],
    workouts: list[dict],
    today_str: str,
) -> tuple[str, int]:
    """Returns (analysis_start_date, days_in_period), capped at 28 days."""
    from datetime import date, timedelta
    try:
        today = date.fromisoformat(today_str)
    except ValueError:
        return today_str, 0

    four_weeks_ago = today - timedelta(weeks=4)
    candidates: list[date] = []

    for e in calendar_events:
        raw = e.get('startDate') or e.get('date') or ''
        if raw:
            try:
                d = date.fromisoformat(raw[:10])
                if d <= today:
                    candidates.append(d)
            except ValueError:
                pass

    for w in workouts:
        raw = (w.get('startedAt') or '')[:10]
        if raw:
            try:
                d = date.fromisoformat(raw)
                if d <= today:
                    candidates.append(d)
            except ValueError:
                pass

    if not candidates:
        return four_weeks_ago.isoformat(), 28

    earliest = min(candidates)
    analysis_start = max(earliest, four_weeks_ago)
    days = (today - analysis_start).days
    return analysis_start.isoformat(), days


def _compute_adherence_per_series(
    series_events: list[dict],
    workouts: list[dict],
    today_str: str,
    garmin_activities: list[dict] | None = None,
) -> list[dict]:
    from datetime import date, timedelta
    try:
        today = date.fromisoformat(today_str)
        yesterday = (today - timedelta(days=1)).isoformat()
    except ValueError:
        return []

    results = []
    for event in series_events:
        routine_id = event.get('routineId', '')
        routine_name = event.get('routineName', '?')
        recurrence_days = event.get('recurrenceDays', [])
        start_date_str = event.get('startDate', '')

        expected = _count_expected_series_sessions(start_date_str, recurrence_days, today_str)
        if expected is None:
            continue

        # Collect dates covered by app workouts (deduplicated)
        counted_dates: set[str] = set()
        if start_date_str:
            for w in workouts:
                w_date = w.get('startedAt', '')[:10]
                if (w.get('routineId') == routine_id or w.get('routineName') == routine_name) \
                        and start_date_str <= w_date <= yesterday:
                    counted_dates.add(w_date)

        # Add Garmin activities on due weekdays not already covered
        if start_date_str and garmin_activities:
            due_weekdays = {_DAY_TO_WEEKDAY[d] for d in recurrence_days if d in _DAY_TO_WEEKDAY}
            for a in garmin_activities:
                g_date = (a.get('startTimeLocal') or '')[:10]
                if not g_date or g_date < start_date_str or g_date > yesterday:
                    continue
                if g_date in counted_dates:
                    continue
                try:
                    if date.fromisoformat(g_date).weekday() not in due_weekdays:
                        continue
                except ValueError:
                    continue
                if _garmin_matches_routine(routine_name, a.get('activityType', ''), a.get('activityName', '')):
                    counted_dates.add(g_date)

        completed = len(counted_dates)

        if expected == 0:
            status = 'Plan gerade gestartet – noch keine Session fällig'
        elif completed >= expected:
            status = f'✓ VOLLSTÄNDIG EINGEHALTEN ({completed}/{expected} Sessions)'
        else:
            deficit = expected - completed
            pct = round(completed / expected * 100)
            status = f'⚠ UNVOLLSTÄNDIG ({completed}/{expected} Sessions = {pct}%, {deficit} fehlend)'

        results.append({
            'routine_name': routine_name,
            'days': ', '.join(recurrence_days),
            'status': status,
        })
    return results


def format_calendar_events(events: list[dict]) -> str:
    if not events:
        return '  (keine Trainingsplanung vorhanden)'

    from datetime import date
    today = date.today().isoformat()

    series = [e for e in events if e.get('eventType') == 'series']
    single_future = sorted(
        [e for e in events if e.get('eventType') == 'single' and e.get('date', '') >= today],
        key=lambda x: x.get('date', '')
    )
    single_past = sorted(
        [e for e in events if e.get('eventType') == 'single' and e.get('date') and e['date'] < today],
        key=lambda x: x.get('date', ''), reverse=True
    )[:10]

    lines = []

    if series:
        lines.append('Regelmäßige Trainingsreihen:')
        for e in series:
            days = ', '.join(e.get('recurrenceDays', [])) or 'keine Wochentage angegeben'
            since = e.get('startDate', '?')
            expected = _count_expected_series_sessions(since, e.get('recurrenceDays', []), today)
            expected_str = f', bisher {expected} Session(s) fällig' if expected is not None else ''
            lines.append(f"  - Jeden {days}: {e.get('routineName', '?')} (seit {since}{expected_str})")

    if single_future:
        lines.append(f'Bevorstehende Einzeltermine ({len(single_future)}) – NOCH NICHT FÄLLIG, nicht verpasst:')
        for e in single_future:
            lines.append(f"  - {e.get('date', '?')}: {e.get('routineName', '?')}")

    if single_past:
        lines.append(f'Einzeltermine – vergangen, fällig gewesen (letzte {len(single_past)}):')
        for e in single_past:
            lines.append(f"  - {e.get('date', '?')}: {e.get('routineName', '?')}")

    return '\n'.join(lines) if lines else '  (keine Trainingsplanung vorhanden)'


def _fmt_pace(avg_speed_ms) -> str | None:
    if not avg_speed_ms:
        return None
    sec_per_km = round(1000 / avg_speed_ms)
    return f"{sec_per_km // 60}:{sec_per_km % 60:02d} /km"


def format_garmin_health(health: dict | None) -> str:
    if not health:
        return '  (keine Garmin-Gesundheitsdaten verfügbar)'

    def _mins(seconds):
        if seconds is None:
            return '?'
        return f'{round(seconds / 60)} min'

    sleep = health.get('sleep') or {}
    lines = []
    if health.get('steps') is not None:
        lines.append(f"  - Schritte: {health['steps']:,}".replace(',', '.'))
    if health.get('restingHeartRate') is not None:
        lines.append(f"  - Ruhepuls: {health['restingHeartRate']} bpm")
    if health.get('bodyBatteryHighest') is not None or health.get('bodyBatteryLowest') is not None:
        hi = health.get('bodyBatteryHighest', '?')
        lo = health.get('bodyBatteryLowest', '?')
        lines.append(f"  - Body Battery: {lo}–{hi}")
    if health.get('averageStressLevel') is not None:
        lines.append(f"  - Stresslevel (Ø): {health['averageStressLevel']}")
    if sleep.get('totalSeconds') is not None:
        total = _mins(sleep.get('totalSeconds'))
        deep = _mins(sleep.get('deepSeconds'))
        rem = _mins(sleep.get('remSeconds'))
        lines.append(f"  - Schlaf: {total} gesamt (Tiefschlaf {deep}, REM {rem})")
    if health.get('vo2max') is not None:
        lines.append(f"  - VO2max: {health['vo2max']} ml/kg")
    v = health.get('vigorousMinutes')
    m = health.get('moderateMinutes')
    if v is not None or m is not None:
        total_int = (v or 0) + (m or 0)
        lines.append(f"  - Intensitätsminuten: {total_int} min (intensiv: {v or 0}, moderat: {m or 0})")
    if health.get('floors') is not None:
        lines.append(f"  - Stockwerke: {health['floors']}")

    return '\n'.join(lines) if lines else '  (keine Garmin-Gesundheitsdaten verfügbar)'


_HEALTH_HISTORY_LABELS = {
    'steps': 'Schritte/Tag',
    'restingHeartRate': 'Ruhepuls (bpm)',
    'bodyBattery': 'Body Battery',
    'sleepDuration': 'Schlafdauer (h/Tag)',
    'averageStressLevel': 'Stresslevel (Ø)',
    'intensityMinutes': 'Intensitätsminuten/Tag',
}


def format_garmin_health_history(history: dict | None) -> str:
    if not history:
        return '  (keine Gesundheitshistorie vorhanden)'

    lines = []
    for metric, label in _HEALTH_HISTORY_LABELS.items():
        metric_data = history.get(metric)
        if not metric_data or not metric_data.get('data'):
            continue
        data = metric_data['data']
        weeks = [data[i * 7:(i + 1) * 7] for i in range(4)]
        week_parts = []
        for i, week in enumerate(weeks):
            vals = [e['value'] for e in week if e.get('value') is not None]
            if vals:
                avg = round(sum(vals) / len(vals))
                week_parts.append(f'W{i + 1}: {avg}')
        if week_parts:
            lines.append(f'  - {label}: {" | ".join(week_parts)}')

    return '\n'.join(lines) if lines else '  (keine Gesundheitshistorie vorhanden)'


def format_routines(routines: list) -> str:
    if not routines:
        return '  (keine Routinen definiert)'
    lines = []
    for r in routines:
        name = r.get('name', '?')
        rtype = r.get('routineType', 'strength')
        exercises = r.get('exercises', [])
        lines.append(f"  - {name} ({rtype}): {len(exercises)} Übungen")
    return '\n'.join(lines)


def format_garmin_hrv(hrv: dict | None) -> str | None:
    if not hrv:
        return None
    weekly = hrv.get('weeklyAvg')
    last_night = hrv.get('lastNight')
    if weekly is None and last_night is None:
        return None
    parts = []
    if weekly is not None:
        parts.append(f"wöchentlicher Ø: {weekly} ms")
    if last_night is not None:
        parts.append(f"letzte Nacht: {last_night} ms")
    return f"  - HRV: {', '.join(parts)}"


def _compute_age_from_birthday(geburtsdatum: str | None) -> str:
    if not geburtsdatum:
        return '?'
    try:
        from datetime import date
        birth = date.fromisoformat(geburtsdatum)
        today = date.today()
        age = today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
        return str(age)
    except Exception:
        return '?'


def build_coach_prompt(req: CoachReportRequest) -> str:
    from datetime import date
    heute = date.today().isoformat()

    training_start, training_days = _compute_training_start(req.calendarEvents, req.workouts, heute)
    if training_days < 28:
        period_label = f"seit {training_start} ({training_days} Tag{'e' if training_days != 1 else ''})"
        new_user_note = (
            f"\n**⚠️ NEUER NUTZER – NUR {training_days} TAG(E) DATEN:**\n"
            f"Dieser Nutzer ist ERST SEIT {training_days} TAG(EN) aktiv (Trainingsstart: {training_start}).\n"
            f"Du DARFST NICHT kritisieren, dass zu wenig in '4 Wochen' trainiert wurde.\n"
            f"Bewerte Frequenz und Adherenz AUSSCHLIESSLICH für den Zeitraum seit {training_start}.\n"
        )
    else:
        period_label = "letzte 4 Wochen"
        new_user_note = ""

    profile = req.profile

    def _fmt_workout_line(w):
        base = (
            f"  - {w.get('startedAt', '')[:10]}: {w.get('routineName', '?')} "
            f"({round(w.get('durationSeconds', 0) / 60)} min, {w.get('totalSets', 0)} Sätze)"
        )
        try:
            exercises = json.loads(w.get('exerciseData') or '[]')
            if not isinstance(exercises, list):
                exercises = []
        except Exception:
            exercises = []
        ex_parts = []
        for ex in exercises[:8]:
            name = ex.get('name', '?')
            sets = ex.get('sets')
            reps = ex.get('reps')
            weight = ex.get('weight')
            dur = ex.get('durationMinutes') or (round(ex.get('duration', 0) / 60) if ex.get('duration') else None)
            if dur:
                ex_parts.append(f"{name} {dur}min")
            elif sets and reps:
                wt = f"@{weight}kg" if weight else ""
                ex_parts.append(f"{name} {sets}x{reps}{wt}")
        if ex_parts:
            base += f" — {'; '.join(ex_parts)}"
        return base

    workout_lines = [_fmt_workout_line(w) for w in req.workouts]

    def _fmt_garmin_line(a):
        dur = round(a.get('duration', 0) / 60)
        name = a.get('activityName', a.get('activityType', '?'))
        parts = [f"{dur} min"]
        dist = a.get('distance')
        if dist:
            parts.append(f"{round(dist / 1000, 1)} km")
        hr = a.get('averageHR') or a.get('avgHR')
        if hr:
            parts.append(f"Ø {round(hr)} bpm")
        pace = _fmt_pace(a.get('avgSpeed'))
        if pace:
            parts.append(pace)
        return f"  - {a.get('startTimeLocal', '')[:10]}: {name} ({', '.join(parts)})"

    garmin_lines = [_fmt_garmin_line(a) for a in req.garminActivities]

    weight_lines = [
        f"  - {e.get('date', '')}: {e.get('weight', '?')} kg"
        for e in req.weightLog
    ]

    calendar_section = format_calendar_events(req.calendarEvents)
    health_section = format_garmin_health(req.garminHealth)
    health_history_section = format_garmin_health_history(req.garminHealthHistory)
    hrv_section = format_garmin_hrv(req.garmin_hrv)
    routines_section = format_routines(req.routines)

    series_events = [e for e in req.calendarEvents if e.get('eventType') == 'series']
    adherence_data = _compute_adherence_per_series(series_events, req.workouts, heute, req.garminActivities)
    adherence_lines = [
        f"  - {a['routine_name']} (jeden {a['days']}): {a['status']}"
        for a in adherence_data
    ]
    adherence_section = '\n'.join(adherence_lines) if adherence_lines else '  (keine Serien-Trainingspläne vorhanden)'

    equipment_list = ', '.join(profile.get('equipment', [])[:12]) or 'nicht angegeben'
    ziele_list = ', '.join(profile.get('ziele', [])) or 'nicht angegeben'

    return f"""Du bist ein erfahrener, motivierender Personal Trainer. Analysiere die folgenden Fitnessdaten deines Schützlings ({period_label}) und erstelle einen persönlichen Zwischenbericht auf Deutsch.

**Heute:** {heute}
**Analysezeitraum:** {period_label}

**Profil:**
- Name: {profile.get('vorname', 'Nutzer')}
- Alter: {_compute_age_from_birthday(profile.get('geburtsdatum'))} Jahre
- Größe: {profile.get('groesse', '?')} cm
- Erfahrungsstufe: {profile.get('erfahrungsstufe', 'nicht angegeben')}
- Trainingsziele: {ziele_list}
- Trainingstage/Woche (Plan): {profile.get('trainingsTageProWoche', '?')}
- Verletzungen/Einschränkungen: {profile.get('verletzungen') or 'keine'}
- Verfügbares Equipment: {equipment_list}

**Trainingsroutinen ({len(req.routines)} Routinen):**
{routines_section}

**App-Workouts ({period_label}, {len(req.workouts)} Einheiten):**
{chr(10).join(workout_lines) if workout_lines else '  (keine Workouts aufgezeichnet)'}

**Garmin-Aktivitäten ({period_label}, {len(req.garminActivities)} Aktivitäten):**
{chr(10).join(garmin_lines) if garmin_lines else '  (keine Garmin-Aktivitäten)'}

**Garmin-Gesundheitsdaten (heute):**
{health_section}
{(chr(10) + "**HRV (Heart Rate Variability):**" + chr(10) + hrv_section) if hrv_section else ""}
**Garmin-Gesundheitstrends (letzte 4 Wochen, Ø pro Woche – W1=älteste, W4=neueste):**
{health_history_section}

**Gewichtsverlauf ({period_label}):**
{chr(10).join(weight_lines) if weight_lines else '  (keine Einträge)'}

**Trainingsplan (Kalender):**
{calendar_section}

**VORBERECHNETE TRAININGSADHERENZ (verbindlich – nicht selbst berechnen):**
{adherence_section}

---

**WICHTIGER ZEITLICHER KONTEXT (Heute: {heute}):**
- Zukünftige Kalendertermine ("NOCH NICHT FÄLLIG") sind geplante Vorhaben – sie sind NICHT verpasst.
- "bisher X Session(s) fällig" zeigt, wie viele Einheiten einer Trainingsserie bis gestern erwartet wurden.
- Wenn bisher 0 oder sehr wenige Sessions fällig waren, befindet sich der Nutzer am Anfang seines Plans.{new_user_note}

**PFLICHT – ADHERENZ-BERECHNUNG:**
Du DARFST NICHT selbst Adherenz berechnen (z.B. Wochentage × Wochen × 4).
Verwende AUSSCHLIESSLICH die "VORBERECHNETE TRAININGSADHERENZ" oben für alle Aussagen über Trainingsfrequenz und Planeinhaltung.
Bei "✓ VOLLSTÄNDIG EINGEHALTEN" ist die Trainingsfrequenz POSITIV zu bewerten – formuliere KEINE Kritik an der Frequenz.

---

Erstelle jetzt den Zwischenbericht mit exakt diesen Abschnitten:

## 📊 Zusammenfassung
## 💪 Stärken & Fortschritte
## ⚠️ Handlungsbedarf
## 🎯 Empfehlungen für die nächsten 4 Wochen
## 📝 Fazit

Halte jeden Abschnitt auf 3-5 Sätze. Sprich die Person direkt mit du/dein an. Sei konkret und datenbasiert."""


def build_training_plan_prompt(req: CoachReportRequest) -> str:
    from datetime import date, timedelta
    heute = date.today().isoformat()
    profile = req.profile

    four_weeks_ago = date.today() - timedelta(days=28)
    recent_workouts = [w for w in req.workouts if w.get('startedAt', '')[:10] >= four_weeks_ago.isoformat()]
    workout_count = len(recent_workouts)
    avg_per_week = round(workout_count / 4, 1) if workout_count else 0

    routines_section = format_routines(req.routines)
    health_section = format_garmin_health(req.garminHealth)
    hrv_section = format_garmin_hrv(req.garmin_hrv)

    equipment_list = ', '.join(profile.get('equipment', [])[:12]) or 'nicht angegeben'
    ziele_list = ', '.join(profile.get('ziele', [])) or 'nicht angegeben'
    verletzungen = profile.get('verletzungen') or 'keine'
    injury_note = (
        f"- Berücksichtige zwingend diese Verletzung/Einschränkung: {verletzungen} — passe betroffene Übungen an oder vermeide sie.\n"
        if profile.get('verletzungen') else ""
    )

    return f"""Du bist ein erfahrener Personal Trainer und Trainingsplan-Experte. Erstelle auf Basis des folgenden Profils und aktuellen Trainingsstands einen konkreten, personalisierten Trainingsplan-VORSCHLAG auf Deutsch für {profile.get('vorname', 'den Nutzer')}. Dies ist eine vorwärtsgerichtete Empfehlung, KEINE Bewertung vergangener Leistung.

**Heute:** {heute}

**Profil:**
- Erfahrungsstufe: {profile.get('erfahrungsstufe', 'nicht angegeben')}
- Trainingsziele: {ziele_list}
- Trainingstage/Woche (gewünscht): {profile.get('trainingsTageProWoche', '?')}
- Verletzungen/Einschränkungen: {verletzungen}
- Verfügbares Equipment: {equipment_list}

**Bestehende Routinen ({len(req.routines)}):**
{routines_section}

**Aktueller Trainingsstand (letzte 4 Wochen):**
  - {workout_count} Workout(s) absolviert (Ø {avg_per_week}/Woche)

**Garmin-Gesundheitsdaten (heute, falls verfügbar):**
{health_section}
{(chr(10) + "**HRV:**" + chr(10) + hrv_section) if hrv_section else ""}

---

**WICHTIG:**
{injury_note}- Verwende AUSSCHLIESSLICH Equipment aus der obigen Liste (oder Körpergewichtsübungen, falls keine Angabe).
- Wenn noch keine Workout-Historie vorhanden ist, schlage einen Einstiegsplan passend zur Erfahrungsstufe vor, statt bestehende Gewohnheiten zu bewerten.
- Wenn bereits Routinen bestehen, beziehe dich darauf (ausbauen/anpassen statt komplett neu erfinden), sofern sie zu den Zielen passen.

Erstelle jetzt den Trainingsplan-Vorschlag mit exakt diesen Abschnitten:

## 🏋️ Trainingsplan-Vorschlag
## 📅 Wochenstruktur
## 🎯 Fokus & Begründung
## 📈 Progression (nächste 4 Wochen)
## ⚠️ Hinweise

Halte jeden Abschnitt kompakt (3-6 Sätze bzw. Stichpunkte). Sprich die Person direkt mit du/dein an."""


@app.post("/api/coach/plan")
def get_training_plan(req: CoachReportRequest):
    if not ANTHROPIC_AVAILABLE:
        raise HTTPException(status_code=503, detail="Coach nicht konfiguriert (anthropic package fehlt)")
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="Coach nicht konfiguriert")
    try:
        client = Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            messages=[{"role": "user", "content": build_training_plan_prompt(req)}]
        )
        return {"plan": message.content[0].text}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Trainingsplan fehlgeschlagen: {str(e)}")


@app.post("/api/coach/report")
def get_coach_report(req: CoachReportRequest):
    if not ANTHROPIC_AVAILABLE:
        raise HTTPException(status_code=503, detail="Coach nicht konfiguriert (anthropic package fehlt)")
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="Coach nicht konfiguriert")
    try:
        client = Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            messages=[{"role": "user", "content": build_coach_prompt(req)}]
        )
        return {"report": message.content[0].text}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Analyse fehlgeschlagen: {str(e)}")


@app.post("/api/coach/chat")
def get_coach_chat(req: CoachChatRequest):
    if not ANTHROPIC_AVAILABLE:
        raise HTTPException(status_code=503, detail="Coach nicht konfiguriert (anthropic package fehlt)")
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="Coach nicht konfiguriert")
    try:
        client = Anthropic(api_key=api_key)
        system_prompt = (
            "Du bist ein erfahrener Personal Trainer. Du hast gerade diesen Trainingsbericht erstellt:\n\n"
            + req.report
            + "\n\nBeantworte jetzt Rückfragen des Nutzers kurz und präzise auf Deutsch. "
            "Antworte in 2-4 Sätzen außer bei komplexen Fragen."
        )
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            system=system_prompt,
            messages=req.messages,
        )
        return {"reply": message.content[0].text}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Chat fehlgeschlagen: {str(e)}")


class NutritionPlanRequest(BaseModel):
    profile: dict = {}
    nutritionSettings: dict = {}
    calendarEvents: list[dict] = []


def _get_day_training(calendar_events: list, d) -> str | None:
    weekday_short = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'][d.weekday()]
    names = []
    for event in calendar_events:
        et = event.get('eventType')
        if et == 'single' and event.get('date') == d.isoformat():
            names.append(event.get('routineName', 'Training'))
        elif et == 'series':
            series_days = [x.strip() for x in event.get('days', '').split(',')]
            if weekday_short in series_days:
                start = event.get('startDate', '')
                if not start or start <= d.isoformat():
                    names.append(event.get('routineName', 'Training'))
    return ', '.join(names) if names else None


def build_nutrition_prompt(req: NutritionPlanRequest) -> str:
    from datetime import date, timedelta
    today = date.today()
    settings = req.nutritionSettings
    profile = req.profile

    day_names = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
    day_lines = []
    for i in range(7):
        d = today + timedelta(days=i)
        training = _get_day_training(req.calendarEvents, d)
        tag = f"TRAININGSTAG – {training}" if training else "Ruhetag"
        day_lines.append(f"  - {day_names[d.weekday()]}, {d.strftime('%d.%m.%Y')}: {tag}")

    ernährungsform = settings.get('ernährungsform', 'Omnivor')
    mahlzeiten = settings.get('mahlzeitenProTag', 3)
    kalorienziel = settings.get('kalorienziel', 2200)
    allergien = settings.get('allergien', [])
    mag = settings.get('lebensmittelMag', [])
    mag_nicht = settings.get('lebensmittelMagNicht', [])
    ziele = ', '.join(profile.get('ziele', [])) or 'nicht angegeben'
    vorname = profile.get('vorname', 'Nutzer')

    spezial = ''
    fruehstueck_hinweis = ''
    if ernährungsform == 'Keto':
        spezial = '\n⚠️ KETO: Maximal 50g Kohlenhydrate pro Tag. Gesunde Fette als Hauptenergiequelle.'
        fruehstueck_hinweis = 'Keto-Frühstück (kein Getreide): Rührei, Spiegelei, Avocado, Speck, Käse, Sahnejoghurt, Nüsse'
    elif ernährungsform == 'Vegan':
        spezial = '\n⚠️ VEGAN: Ausschließlich pflanzliche Lebensmittel. B12, Eisen, Omega-3 beachten.'
        fruehstueck_hinweis = 'Veganes Frühstück: Haferbrei mit Pflanzenmilch, Smoothie-Bowl, Vollkornbrot mit Avocado/Nussbutter, Chiapudding'
    elif ernährungsform == 'Vegetarisch':
        spezial = '\n⚠️ VEGETARISCH: Kein Fleisch und kein Fisch. Eier und Milchprodukte erlaubt.'
        fruehstueck_hinweis = 'Vegetarisches Frühstück: Haferflocken, Rührei, Joghurt/Quark, Vollkornbrot, Pancakes, Smoothies'
    else:
        fruehstueck_hinweis = 'Frühstück: Haferflocken/Müsli, Rührei/Spiegelei, Joghurt/Quark mit Früchten, Vollkornbrot, Pancakes, Smoothie'

    snack_hinweis = 'Obst, Nüsse, Quark, Joghurt, Proteinshake, Reiswaffeln mit Aufstrich, Hüttenkäse' if ernährungsform != 'Keto' else 'Nüsse, Käse, Sahnejoghurt, hartgekochtes Ei, Avocado'

    allergien_text = ', '.join(allergien) if allergien else 'keine'
    mag_text = ', '.join(mag[:15]) if mag else 'keine Angabe'
    mag_nicht_text = ', '.join(mag_nicht[:15]) if mag_nicht else 'keine'

    return f"""Du bist ein zertifizierter Ernährungsberater und Sporternährungsexperte mit kulinarischem Feingefühl. Erstelle einen detaillierten, personalisierten 7-Tage-Ernährungsplan auf Deutsch für {vorname}. Deine Pläne sind abwechslungsreich, alltagstauglich und würden so auch ein echter Ernährungsberater empfehlen.

**Profil:**
- Trainingsziele: {ziele}
- Ernährungsform: {ernährungsform}{spezial}
- Mahlzeiten pro Tag: {mahlzeiten}
- Tägliches Kalorienziel: ca. {kalorienziel} kcal
- Allergien/Unverträglichkeiten: {allergien_text}
- Lieblingslebensmittel (Orientierung, kein Muss): {mag_text}
- Zu meidende Lebensmittel (harte Einschränkung): {mag_nicht_text}

**Trainingskalender (nächste 7 Tage):**
{chr(10).join(day_lines)}

**MAHLZEIT-REGELN (PFLICHT — immer einhalten):**
- Frühstück: NUR morgengerechte Gerichte → {fruehstueck_hinweis}
  ❌ VERBOTEN zum Frühstück: Hühnchenbrust+Reis, Fleisch mit Beilage, klassische Mittag-/Abendessen-Gerichte
- Mittagessen: Vollständige Hauptmahlzeit (Protein-Quelle + Kohlenhydrat-Beilage + Gemüse)
- Abendessen: Ausgewogen, etwas leichter oder proteinbetonter als Mittagessen
- Snacks (nur wenn {mahlzeiten} > 3): {snack_hinweis}

**Anweisungen:**
1. Erstelle für jeden Tag genau {mahlzeiten} Mahlzeiten
2. TRAININGSTAGE: +10-15% Kalorien, mehr Kohlenhydrate (Energie vor/nach Training), ausreichend Protein
3. RUHETAGE: Basis-Kalorien, höherer Proteinanteil, etwas weniger Kohlenhydrate
4. Lieblingslebensmittel einbauen WO SINNVOLL (nur in mahlzeittypischen Kontexten) — du darfst und sollst frei weitere Lebensmittel verwenden
5. Zu meidende Lebensmittel komplett ausschließen
6. Gib Kalorien und Makronährstoffe (P/KH/F in Gramm) für jede Mahlzeit an
7. Verwende realistische, deutsche Portionsangaben (100g, 2 EL, 1 Scheibe, 1 Stück etc.)
8. Abwechslung: Nicht dasselbe Gericht mehr als 2× pro Woche

**Format (exakt einhalten):**

## [Wochentag], [TT.MM.JJJJ] ([Trainingstag – Routinename / Ruhetag]) — [kcal] kcal | P: [g]g | KH: [g]g | F: [g]g

### [Mahlzeit 1: z.B. Frühstück]
**[Gerichtname]** — [kcal] kcal | P: [g]g | KH: [g]g | F: [g]g
- [Zutat 1] ([Menge])
- [Zutat 2] ([Menge])

### [Mahlzeit 2: z.B. Mittagessen]
...

---

## [Nächster Tag]...

---

## 🛒 Einkaufsliste (7 Tage)

**[Kategorie]:**
- [Lebensmittel] ([Gesamtmenge])

Beginne jetzt mit dem vollständigen Plan:"""


@app.post("/api/nutrition/plan")
def create_nutrition_plan(req: NutritionPlanRequest):
    if not ANTHROPIC_AVAILABLE:
        raise HTTPException(status_code=503, detail="Coach nicht konfiguriert (anthropic package fehlt)")
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="Coach nicht konfiguriert")
    try:
        client = Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4000,
            messages=[{"role": "user", "content": build_nutrition_prompt(req)}]
        )
        return {"plan": message.content[0].text}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Plangenerierung fehlgeschlagen: {str(e)}")


@app.get("/api/garmin/activities")
def get_garmin_activities(limit: int = 20):
    limit = max(1, min(100, limit))
    try:
        return garmin_service.get_activities(limit)
    except garmin_service.GarminNotConfiguredError:
        raise HTTPException(status_code=503, detail="Garmin nicht konfiguriert")
    except garmin_service.GarminLoginError as e:
        raise HTTPException(status_code=502, detail=f"Garmin-Fehler: {e}")


@app.get("/api/garmin/activities/{activity_id}")
def get_garmin_activity_detail(activity_id: str):
    try:
        return garmin_service.get_activity_detail(activity_id)
    except garmin_service.GarminNotConfiguredError:
        raise HTTPException(status_code=503, detail="Garmin nicht konfiguriert")
    except garmin_service.GarminLoginError as e:
        raise HTTPException(status_code=502, detail=f"Garmin-Fehler: {e}")


@app.get("/api/garmin/hrv")
def get_garmin_hrv(date: Optional[str] = None):
    try:
        result = garmin_service.get_hrv(date or garmin_service._yesterday())
        return result if result is not None else {}
    except garmin_service.GarminNotConfiguredError:
        raise HTTPException(status_code=503, detail="Garmin nicht konfiguriert")
    except garmin_service.GarminLoginError as e:
        raise HTTPException(status_code=502, detail=f"Garmin-Fehler: {e}")
