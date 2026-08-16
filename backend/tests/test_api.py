import pytest
import database
import garmin_service
from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app

TEST_DB = "test_fitnessapp.db"

ROUTINE_1 = {
    "id": "r-001",
    "name": "Push Day",
    "description": "Brust und Schultern",
    "exercises": [
        {"id": "e-001", "name": "Bankdrücken", "sets": 4, "reps": 8, "duration": None}
    ],
    "createdAt": "2026-01-01T00:00:00",
}


@pytest.fixture(autouse=True)
def use_test_db(tmp_path, monkeypatch):
    db_file = str(tmp_path / "test.db")
    monkeypatch.setenv("DB_PATH", db_file)
    monkeypatch.setattr(database, "DB_PATH", db_file)
    database.init_db()
    yield
    # tmp_path is cleaned up by pytest automatically


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def client_with_routine(client):
    client.post("/api/routines", json=ROUTINE_1)
    return client


# ─── GET /api/routines ───────────────────────────────────

def test_list_routines_empty(client):
    r = client.get("/api/routines")
    assert r.status_code == 200
    assert r.json() == []


def test_list_routines_returns_all(client_with_routine):
    r = client_with_routine.get("/api/routines")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["name"] == "Push Day"


# ─── POST /api/routines ──────────────────────────────────

def test_create_routine_returns_201(client):
    r = client.post("/api/routines", json=ROUTINE_1)
    assert r.status_code == 201
    assert r.json()["id"] == "r-001"
    assert r.json()["name"] == "Push Day"


def test_create_routine_persists_exercises(client):
    r = client.post("/api/routines", json=ROUTINE_1)
    assert len(r.json()["exercises"]) == 1
    assert r.json()["exercises"][0]["name"] == "Bankdrücken"


def test_create_routine_empty_description(client):
    r = client.post("/api/routines", json={**ROUTINE_1, "description": ""})
    assert r.status_code == 201
    assert r.json()["description"] == ""


# ─── GET /api/routines/{id} ──────────────────────────────

def test_get_routine_by_id(client_with_routine):
    r = client_with_routine.get("/api/routines/r-001")
    assert r.status_code == 200
    assert r.json()["name"] == "Push Day"


def test_get_routine_not_found(client):
    r = client.get("/api/routines/nonexistent")
    assert r.status_code == 404


# ─── PUT /api/routines/{id} ──────────────────────────────

def test_update_routine(client_with_routine):
    updated = {**ROUTINE_1, "name": "Push Day Updated", "description": "Neu"}
    r = client_with_routine.put("/api/routines/r-001", json=updated)
    assert r.status_code == 200
    assert r.json()["name"] == "Push Day Updated"


def test_update_routine_not_found(client):
    r = client.put("/api/routines/nonexistent", json=ROUTINE_1)
    assert r.status_code == 404


# ─── DELETE /api/routines/{id} ───────────────────────────

def test_delete_routine_returns_204(client_with_routine):
    r = client_with_routine.delete("/api/routines/r-001")
    assert r.status_code == 204


def test_delete_routine_removes_from_list(client_with_routine):
    client_with_routine.delete("/api/routines/r-001")
    r = client_with_routine.get("/api/routines")
    assert r.json() == []


def test_delete_routine_not_found(client):
    r = client.delete("/api/routines/nonexistent")
    assert r.status_code == 404


# ─── Workout fixtures ────────────────────────────────────

WORKOUT_1 = {
    "id": "w-001",
    "routineId": "r-001",
    "routineName": "Push Day",
    "startedAt": "2026-06-11T10:00:00",
    "durationSeconds": 3600,
    "totalSets": 12,
}


@pytest.fixture
def client_with_workout(client_with_routine):
    client_with_routine.post("/api/workouts", json=WORKOUT_1)
    return client_with_routine


# ─── GET /api/workouts ───────────────────────────────────

def test_list_workouts_empty(client):
    r = client.get("/api/workouts")
    assert r.status_code == 200
    assert r.json() == []


def test_list_workouts_returns_all(client_with_workout):
    r = client_with_workout.get("/api/workouts")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["routineName"] == "Push Day"


# ─── POST /api/workouts ──────────────────────────────────

def test_create_workout_returns_201(client):
    r = client.post("/api/workouts", json=WORKOUT_1)
    assert r.status_code == 201
    assert r.json()["id"] == "w-001"
    assert r.json()["totalSets"] == 12


def test_create_workout_persists_duration(client):
    r = client.post("/api/workouts", json=WORKOUT_1)
    assert r.json()["durationSeconds"] == 3600


def test_create_workout_defaults_zero_sets(client):
    minimal = {**WORKOUT_1, "id": "w-002", "totalSets": 0, "durationSeconds": 0}
    r = client.post("/api/workouts", json=minimal)
    assert r.status_code == 201
    assert r.json()["totalSets"] == 0


def test_create_workout_with_notes(client):
    w = {**WORKOUT_1, "id": "w-003", "notes": "Fiel heute schwer"}
    r = client.post("/api/workouts", json=w)
    assert r.status_code == 201
    assert r.json()["notes"] == "Fiel heute schwer"


def test_create_workout_notes_defaults_empty(client):
    r = client.post("/api/workouts", json=WORKOUT_1)
    assert r.json()["notes"] == ""


def test_create_workout_with_exercise_data(client):
    ex_data = '[{"id":"e-1","name":"Bankdrücken","weight":80,"actualReps":8,"actualDuration":null,"rating":2,"completedSets":[true,true,false]}]'
    w = {**WORKOUT_1, "id": "w-005", "exerciseData": ex_data}
    r = client.post("/api/workouts", json=w)
    assert r.status_code == 201
    assert r.json()["exerciseData"] == ex_data


def test_create_workout_exercise_data_defaults_empty(client):
    r = client.post("/api/workouts", json=WORKOUT_1)
    assert r.json()["exerciseData"] == ""


def test_exercise_data_persists_in_list(client):
    ex_data = '[{"id":"e-1","rating":1}]'
    client.post("/api/workouts", json={**WORKOUT_1, "id": "w-006", "exerciseData": ex_data})
    r = client.get("/api/workouts")
    assert r.json()[0]["exerciseData"] == ex_data


def test_create_manual_workout_empty_routine_id(client):
    manual = {**WORKOUT_1, "id": "w-004", "routineId": "", "routineName": "Laufen"}
    r = client.post("/api/workouts", json=manual)
    assert r.status_code == 201
    assert r.json()["routineId"] == ""
    assert r.json()["routineName"] == "Laufen"


# ─── PUT /api/workouts/{id} ─────────────────────────────

def test_update_workout_returns_200(client_with_workout):
    updated = {**WORKOUT_1, "totalSets": 20, "notes": "Sehr gut"}
    r = client_with_workout.put("/api/workouts/w-001", json=updated)
    assert r.status_code == 200
    assert r.json()["totalSets"] == 20
    assert r.json()["notes"] == "Sehr gut"


def test_update_workout_persists(client_with_workout):
    updated = {**WORKOUT_1, "durationSeconds": 7200, "routineName": "Leg Day"}
    client_with_workout.put("/api/workouts/w-001", json=updated)
    r = client_with_workout.get("/api/workouts")
    assert r.json()[0]["durationSeconds"] == 7200
    assert r.json()[0]["routineName"] == "Leg Day"


def test_update_workout_not_found(client):
    r = client.put("/api/workouts/nonexistent", json=WORKOUT_1)
    assert r.status_code == 404
    assert "nicht gefunden" in r.json()["detail"]


# ─── DELETE /api/workouts/{id} ───────────────────────────

def test_delete_workout_returns_204(client_with_workout):
    r = client_with_workout.delete("/api/workouts/w-001")
    assert r.status_code == 204


def test_delete_workout_removes_from_list(client_with_workout):
    client_with_workout.delete("/api/workouts/w-001")
    r = client_with_workout.get("/api/workouts")
    assert r.json() == []


def test_delete_workout_not_found(client):
    r = client.delete("/api/workouts/nonexistent")
    assert r.status_code == 404
    assert "nicht gefunden" in r.json()["detail"]


# ─── Calendar fixtures ───────────────────────────────────

CALENDAR_SINGLE = {
    "id": "ev-001",
    "routineId": "r-001",
    "routineName": "Push Day",
    "eventType": "single",
    "date": "2026-06-21",
    "startDate": None,
    "recurrenceDays": [],
}

CALENDAR_SERIES = {
    "id": "ev-002",
    "routineId": "r-001",
    "routineName": "Push Day",
    "eventType": "series",
    "date": None,
    "startDate": "2026-06-21",
    "recurrenceDays": ["Mo", "Mi"],
}


@pytest.fixture
def client_with_event(client):
    client.post("/api/calendar", json=CALENDAR_SINGLE)
    return client


# ─── GET /api/calendar ───────────────────────────────────

def test_list_calendar_empty(client):
    r = client.get("/api/calendar")
    assert r.status_code == 200
    assert r.json() == []


def test_list_calendar_returns_created_event(client_with_event):
    r = client_with_event.get("/api/calendar")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["id"] == "ev-001"
    assert data[0]["routineName"] == "Push Day"


def test_list_calendar_returns_multiple_events(client):
    client.post("/api/calendar", json=CALENDAR_SINGLE)
    client.post("/api/calendar", json=CALENDAR_SERIES)
    r = client.get("/api/calendar")
    assert len(r.json()) == 2


# ─── POST /api/calendar ──────────────────────────────────

def test_create_calendar_single_returns_201(client):
    r = client.post("/api/calendar", json=CALENDAR_SINGLE)
    assert r.status_code == 201


def test_create_calendar_single_fields(client):
    r = client.post("/api/calendar", json=CALENDAR_SINGLE)
    body = r.json()
    assert body["id"] == "ev-001"
    assert body["eventType"] == "single"
    assert body["date"] == "2026-06-21"
    assert body["recurrenceDays"] == []


def test_create_calendar_series_returns_201(client):
    r = client.post("/api/calendar", json=CALENDAR_SERIES)
    assert r.status_code == 201


def test_create_calendar_series_recurrence_days_preserved(client):
    r = client.post("/api/calendar", json=CALENDAR_SERIES)
    body = r.json()
    assert body["eventType"] == "series"
    assert body["startDate"] == "2026-06-21"
    assert body["recurrenceDays"] == ["Mo", "Mi"]


def test_create_calendar_event_appears_in_list(client):
    client.post("/api/calendar", json=CALENDAR_SINGLE)
    r = client.get("/api/calendar")
    ids = [e["id"] for e in r.json()]
    assert "ev-001" in ids


# ─── DELETE /api/calendar/{id} ───────────────────────────

def test_delete_calendar_returns_204(client_with_event):
    r = client_with_event.delete("/api/calendar/ev-001")
    assert r.status_code == 204


def test_delete_calendar_removes_from_list(client_with_event):
    client_with_event.delete("/api/calendar/ev-001")
    r = client_with_event.get("/api/calendar")
    assert r.json() == []


def test_delete_calendar_nonexistent_returns_204(client):
    r = client.delete("/api/calendar/nonexistent")
    assert r.status_code == 204


# ─── Calendar User-Isolation ─────────────────────────────

def test_calendar_user_isolation(client):
    client.post("/api/calendar", json=CALENDAR_SINGLE, headers={"X-User-Id": "user-a"})
    r = client.get("/api/calendar", headers={"X-User-Id": "user-b"})
    assert r.json() == []


def test_calendar_user_sees_own_events(client):
    client.post("/api/calendar", json=CALENDAR_SINGLE, headers={"X-User-Id": "user-a"})
    r = client.get("/api/calendar", headers={"X-User-Id": "user-a"})
    assert len(r.json()) == 1
    assert r.json()[0]["id"] == "ev-001"


def test_calendar_delete_only_own_event(client):
    client.post("/api/calendar", json=CALENDAR_SINGLE, headers={"X-User-Id": "user-a"})
    client.delete("/api/calendar/ev-001", headers={"X-User-Id": "user-b"})
    r = client.get("/api/calendar", headers={"X-User-Id": "user-a"})
    assert len(r.json()) == 1


# ─── GET /api/garmin/activities ──────────────────────────

MOCK_ACTIVITIES = [
    {
        "id": "12345",
        "activityName": "Morgenlauf",
        "activityType": "running",
        "startTimeLocal": "2026-06-10 07:30:00",
        "duration": 2700.0,
        "distance": 7500.0,
        "calories": 350,
        "averageHR": 152.0,
    }
]


def test_garmin_activities_not_configured(client, monkeypatch):
    monkeypatch.delenv("GARMIN_EMAIL", raising=False)
    monkeypatch.delenv("GARMIN_PASSWORD", raising=False)
    r = client.get("/api/garmin/activities")
    assert r.status_code == 503
    assert "nicht konfiguriert" in r.json()["detail"]


def test_garmin_activities_login_error(client, monkeypatch):
    monkeypatch.setenv("GARMIN_EMAIL", "test@example.com")
    monkeypatch.setenv("GARMIN_PASSWORD", "wrong")
    with patch("garmin_service.get_activities", side_effect=garmin_service.GarminLoginError("auth failed")):
        r = client.get("/api/garmin/activities")
    assert r.status_code == 502
    assert "Garmin-Fehler" in r.json()["detail"]


def test_garmin_activities_returns_list(client, monkeypatch):
    monkeypatch.setenv("GARMIN_EMAIL", "test@example.com")
    monkeypatch.setenv("GARMIN_PASSWORD", "pass")
    with patch("garmin_service.get_activities", return_value=MOCK_ACTIVITIES):
        r = client.get("/api/garmin/activities")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["activityName"] == "Morgenlauf"
    assert data[0]["activityType"] == "running"


def test_garmin_activities_limit_clamped(client, monkeypatch):
    monkeypatch.setenv("GARMIN_EMAIL", "test@example.com")
    monkeypatch.setenv("GARMIN_PASSWORD", "pass")
    with patch("garmin_service.get_activities", return_value=[]) as mock:
        client.get("/api/garmin/activities?limit=9999")
        mock.assert_called_once_with(100)


def test_garmin_activities_limit_minimum(client, monkeypatch):
    monkeypatch.setenv("GARMIN_EMAIL", "test@example.com")
    monkeypatch.setenv("GARMIN_PASSWORD", "pass")
    with patch("garmin_service.get_activities", return_value=[]) as mock:
        client.get("/api/garmin/activities?limit=0")
        mock.assert_called_once_with(1)


# ─── GET /api/garmin/health ──────────────────────────────

MOCK_HEALTH = {
    "date": "2026-06-11",
    "steps": 8432,
    "floors": 12,
    "totalCalories": 2200,
    "activeCalories": 450,
    "distanceMeters": 6200.0,
    "restingHeartRate": 52,
    "averageStressLevel": 28,
    "bodyBatteryHighest": 85,
    "bodyBatteryLowest": 42,
    "sleep": {
        "totalSeconds": 27000,
        "deepSeconds": 5400,
        "lightSeconds": 14400,
        "remSeconds": 6300,
        "awakeSeconds": 900,
    },
}


def test_garmin_health_not_configured(client, monkeypatch):
    monkeypatch.delenv("GARMIN_EMAIL", raising=False)
    monkeypatch.delenv("GARMIN_PASSWORD", raising=False)
    r = client.get("/api/garmin/health")
    assert r.status_code == 503
    assert "nicht konfiguriert" in r.json()["detail"]


def test_garmin_health_returns_data(client, monkeypatch):
    monkeypatch.setenv("GARMIN_EMAIL", "test@example.com")
    monkeypatch.setenv("GARMIN_PASSWORD", "pass")
    with patch("garmin_service.get_health", return_value=MOCK_HEALTH):
        r = client.get("/api/garmin/health")
    assert r.status_code == 200
    data = r.json()
    assert data["steps"] == 8432
    assert data["restingHeartRate"] == 52
    assert data["sleep"]["totalSeconds"] == 27000


def test_garmin_health_with_date_param(client, monkeypatch):
    monkeypatch.setenv("GARMIN_EMAIL", "test@example.com")
    monkeypatch.setenv("GARMIN_PASSWORD", "pass")
    with patch("garmin_service.get_health", return_value=MOCK_HEALTH) as mock:
        client.get("/api/garmin/health?date=2026-06-11")
        mock.assert_called_once_with("2026-06-11")


def test_garmin_health_login_error(client, monkeypatch):
    monkeypatch.setenv("GARMIN_EMAIL", "test@example.com")
    monkeypatch.setenv("GARMIN_PASSWORD", "wrong")
    with patch("garmin_service.get_health", side_effect=garmin_service.GarminLoginError("auth")):
        r = client.get("/api/garmin/health")
    assert r.status_code == 502


# ─── GET /api/garmin/health/history ─────────────────────

MOCK_HISTORY = {
    "metric": "steps",
    "period": "7d",
    "unit": "Schritte",
    "data": [
        {"date": "2026-06-05", "value": 8000},
        {"date": "2026-06-06", "value": None},
        {"date": "2026-06-07", "value": 9500},
        {"date": "2026-06-08", "value": 7200},
        {"date": "2026-06-09", "value": 10100},
        {"date": "2026-06-10", "value": 6800},
        {"date": "2026-06-11", "value": 8432},
    ],
}


def test_garmin_history_not_configured(client, monkeypatch):
    monkeypatch.delenv("GARMIN_EMAIL", raising=False)
    monkeypatch.delenv("GARMIN_PASSWORD", raising=False)
    r = client.get("/api/garmin/health/history?metric=steps")
    assert r.status_code == 503
    assert "nicht konfiguriert" in r.json()["detail"]


def test_garmin_history_returns_data(client, monkeypatch):
    monkeypatch.setenv("GARMIN_EMAIL", "test@example.com")
    monkeypatch.setenv("GARMIN_PASSWORD", "pass")
    with patch("garmin_service.get_health_history", return_value=MOCK_HISTORY):
        r = client.get("/api/garmin/health/history?metric=steps&period=7d")
    assert r.status_code == 200
    data = r.json()
    assert data["metric"] == "steps"
    assert data["period"] == "7d"
    assert len(data["data"]) == 7
    assert data["data"][0]["value"] == 8000
    assert data["data"][1]["value"] is None


def test_garmin_history_invalid_metric(client, monkeypatch):
    monkeypatch.setenv("GARMIN_EMAIL", "test@example.com")
    monkeypatch.setenv("GARMIN_PASSWORD", "pass")
    with patch("garmin_service.get_health_history", side_effect=ValueError("Unbekannte Metrik: unknown")):
        r = client.get("/api/garmin/health/history?metric=unknown")
    assert r.status_code == 400
    assert "Unbekannte Metrik" in r.json()["detail"]


def test_garmin_history_invalid_period(client, monkeypatch):
    monkeypatch.setenv("GARMIN_EMAIL", "test@example.com")
    monkeypatch.setenv("GARMIN_PASSWORD", "pass")
    with patch("garmin_service.get_health_history", side_effect=ValueError("Unbekannte Periode: 99d")):
        r = client.get("/api/garmin/health/history?metric=steps&period=99d")
    assert r.status_code == 400


def test_garmin_history_default_period(client, monkeypatch):
    monkeypatch.setenv("GARMIN_EMAIL", "test@example.com")
    monkeypatch.setenv("GARMIN_PASSWORD", "pass")
    with patch("garmin_service.get_health_history", return_value=MOCK_HISTORY) as mock:
        client.get("/api/garmin/health/history?metric=steps")
        mock.assert_called_once_with("steps", "7d")


def test_garmin_history_login_error(client, monkeypatch):
    monkeypatch.setenv("GARMIN_EMAIL", "test@example.com")
    monkeypatch.setenv("GARMIN_PASSWORD", "wrong")
    with patch("garmin_service.get_health_history", side_effect=garmin_service.GarminLoginError("auth")):
        r = client.get("/api/garmin/health/history?metric=steps")
    assert r.status_code == 502


# ─── _fetch_stats_history() Unit-Tests (parallel) ────────

from garmin_service import _fetch_stats_history, _fetch_sleep_history
from datetime import date as dt_date
from types import SimpleNamespace


def _make_stats_api(day_values: dict, raise_on: set = None):
    """Mock api with get_stats(d) returning day_values[d], raising on raise_on dates."""
    raise_on = raise_on or set()
    def get_stats(d):
        if d in raise_on:
            raise RuntimeError("Garmin error")
        return {"totalSteps": day_values.get(d)}
    return SimpleNamespace(get_stats=get_stats)


def _make_sleep_api(day_values: dict, raise_on: set = None):
    """Mock api with get_sleep_data(d) returning sleep payload, raising on raise_on dates."""
    raise_on = raise_on or set()
    def get_sleep_data(d):
        if d in raise_on:
            raise RuntimeError("Garmin error")
        seconds = day_values.get(d)
        if seconds is None:
            return {}
        return {"dailySleepDTO": {"sleepTimeSeconds": seconds}}
    return SimpleNamespace(get_sleep_data=get_sleep_data)


def test_fetch_stats_history_returns_correct_count():
    start = dt_date(2026, 6, 5)
    api = _make_stats_api({"2026-06-05": 8000, "2026-06-06": 9000, "2026-06-07": 7000})
    result = _fetch_stats_history(api, start, 3, "totalSteps", False)
    assert len(result) == 3


def test_fetch_stats_history_chronological_order():
    start = dt_date(2026, 6, 5)
    api = _make_stats_api({"2026-06-05": 8000, "2026-06-06": 9000, "2026-06-07": 7000})
    result = _fetch_stats_history(api, start, 3, "totalSteps", False)
    dates = [r["date"] for r in result]
    assert dates == ["2026-06-05", "2026-06-06", "2026-06-07"]


def test_fetch_stats_history_correct_values():
    start = dt_date(2026, 6, 5)
    api = _make_stats_api({"2026-06-05": 8000, "2026-06-06": 9000, "2026-06-07": 7000})
    result = _fetch_stats_history(api, start, 3, "totalSteps", False)
    assert result[0]["value"] == 8000
    assert result[1]["value"] == 9000
    assert result[2]["value"] == 7000


def test_fetch_stats_history_null_on_exception():
    start = dt_date(2026, 6, 5)
    api = _make_stats_api({"2026-06-05": 8000}, raise_on={"2026-06-06"})
    result = _fetch_stats_history(api, start, 2, "totalSteps", False)
    assert result[0]["value"] == 8000
    assert result[1]["value"] is None
    assert result[1]["date"] == "2026-06-06"


def test_fetch_stats_history_all_null_on_all_exceptions():
    start = dt_date(2026, 6, 5)
    api = _make_stats_api({}, raise_on={"2026-06-05", "2026-06-06"})
    result = _fetch_stats_history(api, start, 2, "totalSteps", False)
    assert all(r["value"] is None for r in result)


def test_fetch_stats_history_distance_conversion():
    start = dt_date(2026, 6, 5)
    def get_stats(d):
        return {"totalDistanceMeters": 6200}
    api = SimpleNamespace(get_stats=get_stats)
    result = _fetch_stats_history(api, start, 1, "totalDistanceMeters", True)
    assert result[0]["value"] == 6.2


def test_fetch_stats_history_7d_has_seven_results():
    start = dt_date(2026, 6, 5)
    api = _make_stats_api({})
    result = _fetch_stats_history(api, start, 7, "totalSteps", False)
    assert len(result) == 7


def test_fetch_sleep_history_returns_hours():
    start = dt_date(2026, 6, 5)
    api = _make_sleep_api({"2026-06-05": 27000})  # 7.5h
    result = _fetch_sleep_history(api, start, 1)
    assert result[0]["value"] == 7.5


def test_fetch_sleep_history_chronological_order():
    start = dt_date(2026, 6, 5)
    api = _make_sleep_api({"2026-06-05": 27000, "2026-06-06": 28800, "2026-06-07": 25200})
    result = _fetch_sleep_history(api, start, 3)
    dates = [r["date"] for r in result]
    assert dates == ["2026-06-05", "2026-06-06", "2026-06-07"]


def test_fetch_sleep_history_null_on_empty_response():
    start = dt_date(2026, 6, 5)
    api = _make_sleep_api({"2026-06-05": None})
    result = _fetch_sleep_history(api, start, 1)
    assert result[0]["value"] is None


def test_fetch_sleep_history_null_on_exception():
    start = dt_date(2026, 6, 5)
    api = _make_sleep_api({}, raise_on={"2026-06-05"})
    result = _fetch_sleep_history(api, start, 1)
    assert result[0]["value"] is None
    assert result[0]["date"] == "2026-06-05"


def test_fetch_sleep_history_28d_returns_28_results():
    start = dt_date(2026, 5, 15)
    api = _make_sleep_api({})
    result = _fetch_sleep_history(api, start, 28)
    assert len(result) == 28


# ─── format_calendar_events() Unit-Tests ─────────────────

from main import format_calendar_events
from datetime import date, timedelta


def test_format_calendar_events_empty():
    result = format_calendar_events([])
    assert 'keine Trainingsplanung' in result


def test_format_calendar_events_series_with_days():
    events = [
        {
            'eventType': 'series',
            'routineName': 'Push Day',
            'startDate': '2026-06-01',
            'recurrenceDays': ['Mo', 'Mi', 'Fr'],
        }
    ]
    result = format_calendar_events(events)
    assert 'Regelmäßige Trainingsreihen' in result
    assert 'Mo, Mi, Fr' in result
    assert 'Push Day' in result
    assert '2026-06-01' in result


def test_format_calendar_events_series_no_recurrence_days():
    events = [
        {
            'eventType': 'series',
            'routineName': 'Freestyle',
            'startDate': '2026-06-01',
            'recurrenceDays': [],
        }
    ]
    result = format_calendar_events(events)
    assert 'keine Wochentage' in result
    assert 'Freestyle' in result


def test_format_calendar_events_future_single():
    future = (date.today() + timedelta(days=7)).isoformat()
    events = [
        {
            'eventType': 'single',
            'routineName': 'Leg Day',
            'date': future,
            'startDate': None,
            'recurrenceDays': [],
        }
    ]
    result = format_calendar_events(events)
    assert 'Bevorstehende' in result
    assert 'NOCH NICHT FÄLLIG' in result
    assert 'Leg Day' in result
    assert future in result


def test_format_calendar_events_past_single():
    past = (date.today() - timedelta(days=5)).isoformat()
    events = [
        {
            'eventType': 'single',
            'routineName': 'Pull Day',
            'date': past,
            'startDate': None,
            'recurrenceDays': [],
        }
    ]
    result = format_calendar_events(events)
    assert 'vergangen' in result
    assert 'Pull Day' in result
    assert past in result


def test_format_calendar_events_mixed_all_types():
    future = (date.today() + timedelta(days=3)).isoformat()
    past = (date.today() - timedelta(days=3)).isoformat()
    events = [
        {'eventType': 'series', 'routineName': 'Push Day', 'startDate': '2026-06-01', 'recurrenceDays': ['Mo']},
        {'eventType': 'single', 'routineName': 'Leg Day', 'date': future, 'startDate': None, 'recurrenceDays': []},
        {'eventType': 'single', 'routineName': 'Core Day', 'date': past, 'startDate': None, 'recurrenceDays': []},
    ]
    result = format_calendar_events(events)
    assert 'Regelmäßige Trainingsreihen' in result
    assert 'Bevorstehende' in result
    assert 'vergangen' in result
    assert 'Push Day' in result
    assert 'Leg Day' in result
    assert 'Core Day' in result


def test_format_calendar_events_only_series_no_single():
    events = [
        {'eventType': 'series', 'routineName': 'Run', 'startDate': '2026-05-01', 'recurrenceDays': ['Sa', 'So']},
    ]
    result = format_calendar_events(events)
    assert 'Regelmäßige Trainingsreihen' in result
    assert 'bevorstehend' not in result
    assert 'vergangen' not in result


# ─── _count_expected_series_sessions() Unit-Tests ────────

from main import _count_expected_series_sessions


def test_count_series_start_today_returns_zero():
    today = date.today().isoformat()
    result = _count_expected_series_sessions(today, ['Mo', 'Mi', 'Fr'], today)
    assert result == 0


def test_count_series_start_future_returns_zero():
    future = (date.today() + timedelta(days=7)).isoformat()
    today = date.today().isoformat()
    result = _count_expected_series_sessions(future, ['Mo', 'Mi'], today)
    assert result == 0


def test_count_series_start_yesterday_one_day():
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    today = date.today().isoformat()
    result = _count_expected_series_sessions(yesterday, ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'], today)
    assert result == 1


def test_count_series_unknown_days_returns_zero():
    past = (date.today() - timedelta(days=14)).isoformat()
    today = date.today().isoformat()
    result = _count_expected_series_sessions(past, ['XX', 'YY'], today)
    assert result == 0


def test_count_series_invalid_start_date_returns_none():
    today = date.today().isoformat()
    result = _count_expected_series_sessions('not-a-date', ['Mo'], today)
    assert result is None


def test_count_series_empty_days_returns_zero():
    past = (date.today() - timedelta(days=7)).isoformat()
    today = date.today().isoformat()
    result = _count_expected_series_sessions(past, [], today)
    assert result == 0


def test_count_series_fourteen_days_all_weekdays():
    # 14 days ago, Mo–Fr only: should be exactly 10 weekdays
    fourteen_ago = (date.today() - timedelta(days=14)).isoformat()
    today = date.today().isoformat()
    result = _count_expected_series_sessions(fourteen_ago, ['Mo', 'Di', 'Mi', 'Do', 'Fr'], today)
    assert isinstance(result, int)
    assert 8 <= result <= 12  # depends on day of week, but always 10 in a full 14-day block minus today


def test_format_calendar_series_shows_expected_count():
    past = (date.today() - timedelta(days=14)).isoformat()
    events = [{'eventType': 'series', 'routineName': 'Push', 'startDate': past, 'recurrenceDays': ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']}]
    result = format_calendar_events(events)
    assert 'fällig' in result
    assert 'bisher' in result


def test_format_calendar_series_start_today_shows_zero():
    today = date.today().isoformat()
    events = [{'eventType': 'series', 'routineName': 'Run', 'startDate': today, 'recurrenceDays': ['Mo', 'Mi', 'Fr']}]
    result = format_calendar_events(events)
    assert 'bisher 0 Session(s) fällig' in result


def test_format_calendar_future_singles_labeled_not_missed():
    future = (date.today() + timedelta(days=3)).isoformat()
    events = [{'eventType': 'single', 'date': future, 'routineName': 'Yoga'}]
    result = format_calendar_events(events)
    assert 'NOCH NICHT FÄLLIG' in result
    assert 'nicht verpasst' in result


def test_build_coach_prompt_contains_today():
    from main import build_coach_prompt, CoachReportRequest
    req = CoachReportRequest()
    prompt = build_coach_prompt(req)
    today = date.today().isoformat()
    assert today in prompt


def test_build_coach_prompt_contains_adherence_instruction():
    from main import build_coach_prompt, CoachReportRequest
    req = CoachReportRequest()
    prompt = build_coach_prompt(req)
    assert 'ZEITLICHER KONTEXT' in prompt
    assert 'NOCH NICHT FÄLLIG' in prompt or 'nicht verpasst' in prompt


# ─── _compute_training_start() Unit-Tests ────────────────

from main import _compute_training_start


def test_compute_training_start_no_data_returns_28_days():
    today = date.today().isoformat()
    start, days = _compute_training_start([], [], today)
    assert days == 28


def test_compute_training_start_recent_calendar_series():
    today = date.today()
    three_days_ago = (today - timedelta(days=3)).isoformat()
    events = [{'eventType': 'series', 'startDate': three_days_ago, 'routineName': 'Laufen', 'recurrenceDays': ['Mo']}]
    start, days = _compute_training_start(events, [], today.isoformat())
    assert days == 3
    assert start == three_days_ago


def test_compute_training_start_from_workout():
    today = date.today()
    five_days_ago = (today - timedelta(days=5)).isoformat()
    workouts = [{'startedAt': five_days_ago + 'T10:00:00', 'routineName': 'Push'}]
    start, days = _compute_training_start([], workouts, today.isoformat())
    assert days == 5
    assert start == five_days_ago


def test_compute_training_start_capped_at_28_days():
    today = date.today()
    sixty_days_ago = (today - timedelta(days=60)).isoformat()
    events = [{'eventType': 'series', 'startDate': sixty_days_ago, 'routineName': 'Push', 'recurrenceDays': ['Mo']}]
    start, days = _compute_training_start(events, [], today.isoformat())
    assert days == 28


def test_compute_training_start_future_event_ignored():
    today = date.today()
    tomorrow = (today + timedelta(days=1)).isoformat()
    events = [{'eventType': 'single', 'date': tomorrow, 'routineName': 'Push'}]
    start, days = _compute_training_start(events, [], today.isoformat())
    assert days == 28  # future event ignored → fallback to 4 weeks


def test_compute_training_start_invalid_date_ignored():
    today = date.today().isoformat()
    events = [{'eventType': 'series', 'startDate': 'not-a-date', 'routineName': 'X', 'recurrenceDays': ['Mo']}]
    start, days = _compute_training_start(events, [], today)
    assert days == 28  # invalid date ignored → fallback


def test_compute_training_start_picks_earliest_of_multiple():
    today = date.today()
    two_days_ago = (today - timedelta(days=2)).isoformat()
    ten_days_ago = (today - timedelta(days=10)).isoformat()
    events = [{'eventType': 'series', 'startDate': two_days_ago, 'routineName': 'A', 'recurrenceDays': ['Mo']}]
    workouts = [{'startedAt': ten_days_ago + 'T08:00:00', 'routineName': 'B'}]
    start, days = _compute_training_start(events, workouts, today.isoformat())
    assert days == 10
    assert start == ten_days_ago


def test_build_coach_prompt_period_label_new_user():
    from main import build_coach_prompt, CoachReportRequest
    today = date.today()
    three_days_ago = (today - timedelta(days=3)).isoformat()
    req = CoachReportRequest(
        calendarEvents=[{'eventType': 'series', 'startDate': three_days_ago, 'routineName': 'Laufen', 'recurrenceDays': ['Mo']}]
    )
    prompt = build_coach_prompt(req)
    assert three_days_ago in prompt
    assert '3 Tage' in prompt or '3 Tag' in prompt


def test_build_coach_prompt_new_user_note_included():
    from main import build_coach_prompt, CoachReportRequest
    today = date.today()
    three_days_ago = (today - timedelta(days=3)).isoformat()
    req = CoachReportRequest(
        calendarEvents=[{'eventType': 'series', 'startDate': three_days_ago, 'routineName': 'Laufen', 'recurrenceDays': ['Mo']}]
    )
    prompt = build_coach_prompt(req)
    assert 'NEUER NUTZER' in prompt
    assert 'DARFST NICHT' in prompt


def test_build_coach_prompt_no_new_user_note_for_4_week_user():
    from main import build_coach_prompt, CoachReportRequest
    today = date.today()
    thirty_days_ago = (today - timedelta(days=30)).isoformat()
    req = CoachReportRequest(
        calendarEvents=[{'eventType': 'series', 'startDate': thirty_days_ago, 'routineName': 'Push', 'recurrenceDays': ['Mo']}]
    )
    prompt = build_coach_prompt(req)
    assert 'NEUER NUTZER' not in prompt
    assert 'letzte 4 Wochen' in prompt


def test_build_coach_prompt_period_label_no_data_is_4_weeks():
    from main import build_coach_prompt, CoachReportRequest
    req = CoachReportRequest()
    prompt = build_coach_prompt(req)
    assert 'letzte 4 Wochen' in prompt
    assert 'NEUER NUTZER' not in prompt


# ─── _compute_adherence_per_series() Unit-Tests ──────────

from main import _compute_adherence_per_series


def _yesterday():
    return (date.today() - timedelta(days=1)).isoformat()


def _n_days_ago(n):
    return (date.today() - timedelta(days=n)).isoformat()


def test_adherence_no_series_returns_empty():
    result = _compute_adherence_per_series([], [], date.today().isoformat())
    assert result == []


def test_adherence_plan_started_today_no_session_due():
    today = date.today().isoformat()
    series = [{'routineId': 'r1', 'routineName': 'Push', 'recurrenceDays': ['Mo', 'Do'], 'startDate': today}]
    result = _compute_adherence_per_series(series, [], today)
    assert len(result) == 1
    assert 'gerade gestartet' in result[0]['status']


def test_adherence_fully_completed():
    yesterday = _yesterday()
    series = [{'routineId': 'r1', 'routineName': 'Push', 'recurrenceDays': ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'], 'startDate': yesterday}]
    workouts = [{'routineId': 'r1', 'routineName': 'Push', 'startedAt': yesterday + 'T10:00:00'}]
    today = date.today().isoformat()
    result = _compute_adherence_per_series(series, workouts, today)
    assert len(result) == 1
    assert '✓' in result[0]['status']
    assert 'VOLLSTÄNDIG' in result[0]['status']


def test_adherence_incomplete():
    start = _n_days_ago(7)
    today = date.today().isoformat()
    series = [{'routineId': 'r1', 'routineName': 'Laufen', 'recurrenceDays': ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'], 'startDate': start}]
    result = _compute_adherence_per_series(series, [], today)
    assert len(result) == 1
    assert '⚠' in result[0]['status']
    assert 'UNVOLLSTÄNDIG' in result[0]['status']


def test_adherence_matches_by_routine_name_fallback():
    yesterday = _yesterday()
    series = [{'routineId': 'r1', 'routineName': 'Kraft', 'recurrenceDays': ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'], 'startDate': yesterday}]
    workouts = [{'routineId': 'DIFFERENT_ID', 'routineName': 'Kraft', 'startedAt': yesterday + 'T09:00:00'}]
    today = date.today().isoformat()
    result = _compute_adherence_per_series(series, workouts, today)
    assert '✓' in result[0]['status']


def test_adherence_workout_before_start_not_counted():
    start = _n_days_ago(3)
    before_start = _n_days_ago(5)
    yesterday = _yesterday()
    today = date.today().isoformat()
    series = [{'routineId': 'r1', 'routineName': 'Run', 'recurrenceDays': ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'], 'startDate': start}]
    workouts = [{'routineId': 'r1', 'routineName': 'Run', 'startedAt': before_start + 'T08:00:00'}]
    result = _compute_adherence_per_series(series, workouts, today)
    assert '⚠' in result[0]['status']


def test_adherence_invalid_today_returns_empty():
    series = [{'routineId': 'r1', 'routineName': 'X', 'recurrenceDays': ['Mo'], 'startDate': '2026-01-01'}]
    result = _compute_adherence_per_series(series, [], 'not-a-date')
    assert result == []


def test_build_coach_prompt_contains_adherence_section():
    from main import build_coach_prompt, CoachReportRequest
    req = CoachReportRequest()
    prompt = build_coach_prompt(req)
    assert 'VORBERECHNETE TRAININGSADHERENZ' in prompt
    assert 'keine Serien-Trainingspläne' in prompt


def test_build_coach_prompt_adherence_forbids_own_calculation():
    from main import build_coach_prompt, CoachReportRequest
    req = CoachReportRequest()
    prompt = build_coach_prompt(req)
    assert 'DARFST NICHT' in prompt or 'PFLICHT' in prompt


def test_build_coach_prompt_adherence_shows_vollstaendig():
    from main import build_coach_prompt, CoachReportRequest
    yesterday = _yesterday()
    today = date.today().isoformat()
    req = CoachReportRequest(
        calendarEvents=[{
            'id': 'e1', 'routineId': 'r1', 'routineName': 'Push',
            'eventType': 'series', 'recurrenceDays': ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
            'startDate': yesterday,
        }],
        workouts=[{
            'id': 'w1', 'routineId': 'r1', 'routineName': 'Push',
            'startedAt': yesterday + 'T10:00:00', 'durationSeconds': 2700, 'totalSets': 15,
            'notes': '', 'exerciseData': '',
        }],
    )
    prompt = build_coach_prompt(req)
    assert 'VOLLSTÄNDIG' in prompt


# ─── format_garmin_health() Unit-Tests ───────────────────

from main import format_garmin_health


# ─── _garmin_matches_routine() Unit-Tests ────────────────

from main import _garmin_matches_routine, _DAY_TO_WEEKDAY


def test_garmin_matches_running_by_type():
    assert _garmin_matches_routine('Joggen', 'running', '') is True


def test_garmin_matches_running_treadmill():
    assert _garmin_matches_routine('Laufen', 'treadmill_running', '') is True


def test_garmin_no_match_wrong_type():
    assert _garmin_matches_routine('Kraft', 'running', '') is False


def test_garmin_matches_strength_training():
    assert _garmin_matches_routine('Krafttraining', 'strength_training', '') is True


def test_garmin_matches_by_name_containment():
    assert _garmin_matches_routine('Joggen', '', 'Joggen am See') is True


def test_garmin_no_match_empty_inputs():
    assert _garmin_matches_routine('', 'running', '') is False


def test_garmin_matches_cycling():
    assert _garmin_matches_routine('Radfahren', 'cycling', '') is True


# ─── Garmin-Adherenz-Szenarien ───────────────────────────

def test_adherence_garmin_run_counts_for_joggen_serie():
    yesterday = _yesterday()
    today = date.today().isoformat()
    # Serie: Joggen jeden Tag (damit gestern immer ein Plantag ist)
    series = [{'routineId': 'r1', 'routineName': 'Joggen',
                'recurrenceDays': ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
                'startDate': yesterday}]
    garmin = [{'startTimeLocal': yesterday + ' 08:00:00', 'activityType': 'running', 'activityName': 'Morning Run'}]
    result = _compute_adherence_per_series(series, [], today, garmin)
    assert len(result) == 1
    assert '✓' in result[0]['status']
    assert 'VOLLSTÄNDIG' in result[0]['status']


def test_adherence_garmin_wrong_weekday_not_counted():
    # Serie nur Fr/Sa; Garmin-Lauf gestern auf anderem Wochentag
    yesterday = _yesterday()
    today_d = date.today()
    today = today_d.isoformat()
    # Wir brauchen gestern auf einem Wochentag der NICHT in recurrenceDays ist
    # Gestern = heute - 1 Tag. Wir nutzen Wochentage die gestern-day NICHT enthält.
    yesterday_weekday = (today_d - timedelta(days=1)).weekday()
    # Alle Wochentage außer gestern
    all_keys = list(_DAY_TO_WEEKDAY.keys())
    not_yesterday = [k for k, v in _DAY_TO_WEEKDAY.items() if v != yesterday_weekday][:2]
    if not not_yesterday:
        return  # edge case: skip if all weekdays are covered
    series = [{'routineId': 'r1', 'routineName': 'Joggen',
                'recurrenceDays': not_yesterday,
                'startDate': _n_days_ago(7)}]
    garmin = [{'startTimeLocal': yesterday + ' 08:00:00', 'activityType': 'running', 'activityName': ''}]
    result = _compute_adherence_per_series(series, [], today, garmin)
    assert '⚠' in result[0]['status']


def test_adherence_no_double_count_app_and_garmin_same_day():
    yesterday = _yesterday()
    today = date.today().isoformat()
    series = [{'routineId': 'r1', 'routineName': 'Laufen',
                'recurrenceDays': ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
                'startDate': yesterday}]
    workouts = [{'routineId': 'r1', 'routineName': 'Laufen', 'startedAt': yesterday + 'T09:00:00'}]
    garmin = [{'startTimeLocal': yesterday + ' 18:00:00', 'activityType': 'running', 'activityName': ''}]
    result = _compute_adherence_per_series(series, workouts, today, garmin)
    assert '1/1' in result[0]['status']


def test_adherence_garmin_wrong_type_not_counted():
    yesterday = _yesterday()
    today = date.today().isoformat()
    series = [{'routineId': 'r1', 'routineName': 'Kraft',
                'recurrenceDays': ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
                'startDate': yesterday}]
    garmin = [{'startTimeLocal': yesterday + ' 08:00:00', 'activityType': 'running', 'activityName': ''}]
    result = _compute_adherence_per_series(series, [], today, garmin)
    assert '⚠' in result[0]['status']


def test_adherence_none_garmin_activities_no_crash():
    yesterday = _yesterday()
    today = date.today().isoformat()
    series = [{'routineId': 'r1', 'routineName': 'Joggen',
                'recurrenceDays': ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
                'startDate': yesterday}]
    result = _compute_adherence_per_series(series, [], today, None)
    assert '⚠' in result[0]['status']  # no garmin, 0 completed


# ─── format_garmin_health() Unit-Tests ───────────────────

def test_format_garmin_health_none():
    result = format_garmin_health(None)
    assert 'keine Garmin-Gesundheitsdaten' in result


def test_format_garmin_health_empty_dict():
    result = format_garmin_health({})
    assert 'keine Garmin-Gesundheitsdaten' in result


def test_format_garmin_health_steps():
    result = format_garmin_health({'steps': 8500})
    assert 'Schritte' in result
    assert '8.500' in result


def test_format_garmin_health_resting_hr():
    result = format_garmin_health({'restingHeartRate': 52})
    assert 'Ruhepuls' in result
    assert '52 bpm' in result


def test_format_garmin_health_body_battery():
    result = format_garmin_health({'bodyBatteryHighest': 90, 'bodyBatteryLowest': 15})
    assert 'Body Battery' in result
    assert '15' in result
    assert '90' in result


def test_format_garmin_health_stress():
    result = format_garmin_health({'averageStressLevel': 35})
    assert 'Stresslevel' in result
    assert '35' in result


def test_format_garmin_health_sleep():
    result = format_garmin_health({
        'sleep': {'totalSeconds': 27000, 'deepSeconds': 5400, 'remSeconds': 4800, 'lightSeconds': None}
    })
    assert 'Schlaf' in result
    assert '450 min' in result  # 27000/60
    assert '90 min' in result   # 5400/60 deep
    assert '80 min' in result   # 4800/60 REM


def test_format_garmin_health_sleep_missing_seconds():
    result = format_garmin_health({
        'sleep': {'totalSeconds': 25200, 'deepSeconds': None, 'remSeconds': None}
    })
    assert 'Schlaf' in result
    assert '420 min' in result
    assert '?' in result  # missing deep/REM shown as ?


def test_format_garmin_health_full():
    health = {
        'steps': 10000,
        'restingHeartRate': 55,
        'bodyBatteryHighest': 85,
        'bodyBatteryLowest': 20,
        'averageStressLevel': 28,
        'sleep': {'totalSeconds': 28800, 'deepSeconds': 6000, 'remSeconds': 5400},
    }
    result = format_garmin_health(health)
    assert 'Schritte' in result
    assert 'Ruhepuls' in result
    assert 'Body Battery' in result
    assert 'Stresslevel' in result
    assert 'Schlaf' in result


# ─── format_garmin_health_history() Unit-Tests ───────────

from main import format_garmin_health_history


def _make_history(metric, values):
    data = [{'date': f'2026-05-{i+1:02d}', 'value': v} for i, v in enumerate(values)]
    return {metric: {'metric': metric, 'period': '4w', 'data': data}}


def test_health_history_none_returns_no_data():
    result = format_garmin_health_history(None)
    assert 'keine' in result


def test_health_history_empty_dict_returns_no_data():
    result = format_garmin_health_history({})
    assert 'keine' in result


def test_health_history_steps_four_weeks():
    # 28 values, week 1 avg=100, week 2 avg=200, week 3 avg=300, week 4 avg=400
    values = [100]*7 + [200]*7 + [300]*7 + [400]*7
    result = format_garmin_health_history(_make_history('steps', values))
    assert 'Schritte' in result
    assert 'W1: 100' in result
    assert 'W4: 400' in result


def test_health_history_skips_all_null_week():
    values = [None]*7 + [8000]*7 + [None]*14
    result = format_garmin_health_history(_make_history('steps', values))
    assert 'W2' in result
    assert 'W1' not in result


def test_health_history_resting_hr_label():
    values = [60]*28
    result = format_garmin_health_history(_make_history('restingHeartRate', values))
    assert 'Ruhepuls' in result


def test_health_history_body_battery_label():
    values = [70]*28
    result = format_garmin_health_history(_make_history('bodyBattery', values))
    assert 'Body Battery' in result


def test_health_history_multiple_metrics():
    history = {
        'steps': {'data': [{'date': '2026-05-01', 'value': 9000}] * 28},
        'restingHeartRate': {'data': [{'date': '2026-05-01', 'value': 58}] * 28},
        'bodyBattery': None,
    }
    result = format_garmin_health_history(history)
    assert 'Schritte' in result
    assert 'Ruhepuls' in result
    assert 'Body Battery' not in result


def test_build_coach_prompt_contains_health_history_section():
    from main import build_coach_prompt, CoachReportRequest
    req = CoachReportRequest(
        garminHealthHistory={
            'steps': {'data': [{'date': '2026-05-01', 'value': 8000}] * 28},
        }
    )
    prompt = build_coach_prompt(req)
    assert 'Garmin-Gesundheitstrends' in prompt
    assert 'Schritte' in prompt


def test_build_coach_prompt_health_history_none_no_crash():
    from main import build_coach_prompt, CoachReportRequest
    req = CoachReportRequest(garminHealthHistory=None)
    prompt = build_coach_prompt(req)
    assert 'Garmin-Gesundheitstrends' in prompt
    assert 'keine Gesundheitshistorie' in prompt


# ─── build_training_plan_prompt() Unit-Tests (FS-74) ─────


def test_build_training_plan_prompt_contains_today():
    from main import build_training_plan_prompt, CoachReportRequest
    req = CoachReportRequest()
    prompt = build_training_plan_prompt(req)
    today = date.today().isoformat()
    assert today in prompt


def test_build_training_plan_prompt_contains_required_sections():
    from main import build_training_plan_prompt, CoachReportRequest
    req = CoachReportRequest()
    prompt = build_training_plan_prompt(req)
    for section in [
        '## 🏋️ Trainingsplan-Vorschlag',
        '## 📅 Wochenstruktur',
        '## 🎯 Fokus & Begründung',
        '## 📈 Progression (nächste 4 Wochen)',
        '## ⚠️ Hinweise',
    ]:
        assert section in prompt


def test_build_training_plan_prompt_no_data_no_crash():
    from main import build_training_plan_prompt, CoachReportRequest
    req = CoachReportRequest()
    prompt = build_training_plan_prompt(req)
    assert '0 Workout(s)' in prompt
    assert '(keine Routinen definiert)' in prompt


def test_build_training_plan_prompt_includes_profile_fields():
    from main import build_training_plan_prompt, CoachReportRequest
    req = CoachReportRequest(profile={
        'vorname': 'Anton',
        'erfahrungsstufe': 'Fortgeschrittener',
        'ziele': ['Muskelaufbau', 'Kraft steigern'],
        'trainingsTageProWoche': '4',
        'equipment': ['barbell', 'dumbbell'],
    })
    prompt = build_training_plan_prompt(req)
    assert 'Anton' in prompt
    assert 'Fortgeschrittener' in prompt
    assert 'Muskelaufbau, Kraft steigern' in prompt
    assert 'barbell, dumbbell' in prompt


def test_build_training_plan_prompt_includes_injury_note_when_present():
    from main import build_training_plan_prompt, CoachReportRequest
    req = CoachReportRequest(profile={'verletzungen': 'Knieprobleme rechts'})
    prompt = build_training_plan_prompt(req)
    assert 'Knieprobleme rechts' in prompt
    assert 'Berücksichtige zwingend diese Verletzung' in prompt


def test_build_training_plan_prompt_no_injury_note_when_absent():
    from main import build_training_plan_prompt, CoachReportRequest
    req = CoachReportRequest(profile={})
    prompt = build_training_plan_prompt(req)
    assert 'Berücksichtige zwingend diese Verletzung' not in prompt


def test_build_training_plan_prompt_includes_existing_routines():
    from main import build_training_plan_prompt, CoachReportRequest
    req = CoachReportRequest(routines=[
        {'name': 'Push Day', 'routineType': 'strength', 'exercises': [{'id': 'e1'}, {'id': 'e2'}]},
    ])
    prompt = build_training_plan_prompt(req)
    assert 'Push Day' in prompt


def test_build_training_plan_prompt_counts_recent_workouts():
    from main import build_training_plan_prompt, CoachReportRequest
    today = date.today()
    recent = (today - timedelta(days=5)).isoformat() + 'T10:00:00'
    old = (today - timedelta(days=60)).isoformat() + 'T10:00:00'
    req = CoachReportRequest(workouts=[
        {'startedAt': recent, 'routineName': 'Push'},
        {'startedAt': old, 'routineName': 'Pull'},
    ])
    prompt = build_training_plan_prompt(req)
    assert '1 Workout(s)' in prompt


def test_build_training_plan_prompt_does_not_use_adherence_language():
    from main import build_training_plan_prompt, CoachReportRequest
    req = CoachReportRequest()
    prompt = build_training_plan_prompt(req)
    assert 'VORBERECHNETE TRAININGSADHERENZ' not in prompt
    assert 'NEUER NUTZER' not in prompt


# ─── Garmin-Normalisierung Unit-Tests ────────────────────

from garmin_service import _map_health, _fetch_body_battery_history, _fetch_intensity_history
from types import SimpleNamespace


def _make_intensity_api(vigorous, moderate):
    def get_stats(d):
        return {
            "vigorousIntensityMinutes": vigorous,
            "moderateIntensityMinutes": moderate,
        }
    return SimpleNamespace(get_stats=get_stats)


def test_map_health_negative_resting_hr_becomes_none():
    result = _map_health("2026-06-20", {"restingHeartRate": -1}, {})
    assert result["restingHeartRate"] is None


def test_map_health_zero_resting_hr_becomes_none():
    result = _map_health("2026-06-20", {"restingHeartRate": 0}, {})
    assert result["restingHeartRate"] is None


def test_map_health_valid_resting_hr_preserved():
    result = _map_health("2026-06-20", {"restingHeartRate": 52}, {})
    assert result["restingHeartRate"] == 52


def test_map_health_negative_stress_becomes_none():
    result = _map_health("2026-06-20", {"averageStressLevel": -1}, {})
    assert result["averageStressLevel"] is None


def test_map_health_zero_stress_is_valid():
    result = _map_health("2026-06-20", {"averageStressLevel": 0}, {})
    assert result["averageStressLevel"] == 0


def test_map_health_valid_stress_preserved():
    result = _map_health("2026-06-20", {"averageStressLevel": 35}, {})
    assert result["averageStressLevel"] == 35


def test_map_health_vo2max_zero_becomes_none():
    result = _map_health("2026-06-20", {"vo2MaxValue": 0.0}, {})
    assert result["vo2max"] is None


def test_map_health_vo2max_valid_preserved():
    result = _map_health("2026-06-20", {"vo2MaxValue": 48.5}, {})
    assert result["vo2max"] == 48.5


def test_fetch_stats_history_negative_value_becomes_none():
    start = dt_date(2026, 6, 5)
    def get_stats(d):
        return {"restingHeartRate": -1}
    api = SimpleNamespace(get_stats=get_stats)
    from garmin_service import _fetch_stats_history
    result = _fetch_stats_history(api, start, 1, "restingHeartRate", False)
    assert result[0]["value"] is None


def test_fetch_stats_history_vo2max_zero_becomes_none():
    start = dt_date(2026, 6, 5)
    def get_stats(d):
        return {"vo2MaxValue": 0.0}
    api = SimpleNamespace(get_stats=get_stats)
    from garmin_service import _fetch_stats_history
    result = _fetch_stats_history(api, start, 1, "vo2MaxValue", False)
    assert result[0]["value"] is None


def test_fetch_stats_history_vo2max_valid_preserved():
    start = dt_date(2026, 6, 5)
    def get_stats(d):
        return {"vo2MaxValue": 48.5}
    api = SimpleNamespace(get_stats=get_stats)
    from garmin_service import _fetch_stats_history
    result = _fetch_stats_history(api, start, 1, "vo2MaxValue", False)
    assert result[0]["value"] == 48.5


def test_fetch_intensity_history_negative_vigorous_clamped():
    api = _make_intensity_api(vigorous=-1, moderate=10)
    result = _fetch_intensity_history(api, dt_date(2026, 6, 5), 1)
    assert result[0]["value"] == 10


def test_fetch_intensity_history_negative_moderate_clamped():
    api = _make_intensity_api(vigorous=5, moderate=-1)
    result = _fetch_intensity_history(api, dt_date(2026, 6, 5), 1)
    assert result[0]["value"] == 5


def test_fetch_intensity_history_both_zero_returns_none():
    api = _make_intensity_api(vigorous=0, moderate=0)
    result = _fetch_intensity_history(api, dt_date(2026, 6, 5), 1)
    assert result[0]["value"] is None


def test_fetch_body_battery_history_dict_with_date_key():
    api = SimpleNamespace(get_body_battery=lambda s, e: [
        {"date": "2026-06-05", "bodyBatteryValuesArray": [[1717545600000, 85, 10, 5], [1717549200000, 72, 5, 8]]}
    ])
    result = _fetch_body_battery_history(api, "2026-06-05", "2026-06-05", 1)
    assert result[0]["date"] == "2026-06-05"
    assert result[0]["value"] == 85


def test_fetch_body_battery_history_dict_with_direct_value():
    api = SimpleNamespace(get_body_battery=lambda s, e: [
        {"calendarDate": "2026-06-05", "value": 78}
    ])
    result = _fetch_body_battery_history(api, "2026-06-05", "2026-06-05", 1)
    assert result[0]["value"] == 78


def test_fetch_body_battery_history_unix_ms_timestamp():
    from datetime import datetime, timezone
    ts_ms = int(datetime(2026, 6, 5, tzinfo=timezone.utc).timestamp() * 1000)
    api = SimpleNamespace(get_body_battery=lambda s, e: [[ts_ms, 90]])
    result = _fetch_body_battery_history(api, "2026-06-05", "2026-06-05", 1)
    assert result[0]["value"] == 90


def test_fetch_body_battery_history_no_data_returns_none():
    api = SimpleNamespace(get_body_battery=lambda s, e: [])
    result = _fetch_body_battery_history(api, "2026-06-05", "2026-06-05", 1)
    assert result[0]["value"] is None


def test_fetch_body_battery_history_api_exception_returns_none():
    def raise_exc(s, e):
        raise RuntimeError("API error")
    api = SimpleNamespace(get_body_battery=raise_exc)
    result = _fetch_body_battery_history(api, "2026-06-05", "2026-06-05", 1)
    assert result[0]["value"] is None


def test_fetch_body_battery_history_max_per_day():
    api = SimpleNamespace(get_body_battery=lambda s, e: [
        {"date": "2026-06-05", "bodyBatteryValuesArray": [[1000000000001, 30], [1000000000002, 95], [1000000000003, 60]]}
    ])
    result = _fetch_body_battery_history(api, "2026-06-05", "2026-06-05", 1)
    assert result[0]["value"] == 95


