import sqlite3
import json
import os
from contextlib import contextmanager
from datetime import datetime, timezone

from dotenv import load_dotenv

load_dotenv()

DB_PATH = os.environ.get("DB_PATH", "data/fitnessapp.db")
DATABASE_URL = os.environ.get("DATABASE_URL")
USE_POSTGRES = bool(DATABASE_URL)

if USE_POSTGRES:
    import psycopg
    from psycopg.rows import dict_row


def _q(sql: str) -> str:
    """Translate sqlite `?` placeholders to psycopg `%s` when on Postgres."""
    return sql.replace("?", "%s") if USE_POSTGRES else sql


def get_connection():
    if USE_POSTGRES:
        return psycopg.connect(DATABASE_URL, row_factory=dict_row)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def _conn():
    """Yields a connection and always closes it. Callers commit explicitly."""
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    if not USE_POSTGRES:
        db_dir = os.path.dirname(DB_PATH)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)
    with _conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS routines (
                id           TEXT PRIMARY KEY,
                name         TEXT NOT NULL,
                description  TEXT DEFAULT '',
                exercises    TEXT DEFAULT '[]',
                created_at   TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS workouts (
                id               TEXT PRIMARY KEY,
                routine_id       TEXT NOT NULL,
                routine_name     TEXT NOT NULL,
                started_at       TEXT NOT NULL,
                duration_seconds INTEGER NOT NULL DEFAULT 0,
                total_sets       INTEGER NOT NULL DEFAULT 0
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS calendar_events (
                id              TEXT PRIMARY KEY,
                routine_id      TEXT NOT NULL,
                routine_name    TEXT NOT NULL,
                event_type      TEXT NOT NULL CHECK(event_type IN ('single','series')),
                date            TEXT,
                start_date      TEXT,
                recurrence_days TEXT DEFAULT '[]'
            )
        """)
        conn.commit()

        # Idempotent column migrations
        _add_column(conn, "workouts", "notes", "TEXT DEFAULT ''")
        _add_column(conn, "workouts", "exercise_data", "TEXT DEFAULT ''")
        _add_column(conn, "routines", "routine_type", "TEXT NOT NULL DEFAULT 'strength'")
        _add_column(conn, "routines", "user_id", "TEXT NOT NULL DEFAULT 'admin'")
        _add_column(conn, "workouts", "user_id", "TEXT NOT NULL DEFAULT 'admin'")
        _add_column(conn, "calendar_events", "user_id", "TEXT NOT NULL DEFAULT 'admin'")
        _add_column(conn, "calendar_events", "created_at", "TEXT DEFAULT ''")


def _add_column(conn, table: str, column: str, definition: str) -> None:
    try:
        conn.execute(_q(f"ALTER TABLE {table} ADD COLUMN {column} {definition}"))
        conn.commit()
    except Exception:
        conn.rollback()  # Column already exists (or Postgres aborted the tx)


def row_to_dict(row) -> dict:
    d = dict(row)
    d["exercises"] = json.loads(d["exercises"])
    d["createdAt"] = d.pop("created_at")
    d["routineType"] = d.pop("routine_type", "strength") or "strength"
    d.pop("user_id", None)
    return d


def get_all_routines(user_id: str = "admin") -> list[dict]:
    with _conn() as conn:
        rows = conn.execute(
            _q("SELECT * FROM routines WHERE user_id = ? ORDER BY created_at"), (user_id,)
        ).fetchall()
    return [row_to_dict(r) for r in rows]


def get_routine(routine_id: str, user_id: str = "admin") -> dict | None:
    with _conn() as conn:
        row = conn.execute(
            _q("SELECT * FROM routines WHERE id = ? AND user_id = ?"), (routine_id, user_id)
        ).fetchone()
    return row_to_dict(row) if row else None


def create_routine(routine: dict, user_id: str = "admin") -> dict:
    with _conn() as conn:
        conn.execute(
            _q("INSERT INTO routines (id, name, description, exercises, created_at, routine_type, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)"),
            (
                routine["id"],
                routine["name"],
                routine.get("description", ""),
                json.dumps(routine.get("exercises", [])),
                routine["createdAt"],
                routine.get("routineType", "strength"),
                user_id,
            ),
        )
        conn.commit()
    return get_routine(routine["id"], user_id)


def update_routine(routine_id: str, routine: dict, user_id: str = "admin") -> dict | None:
    if not get_routine(routine_id, user_id):
        return None
    with _conn() as conn:
        conn.execute(
            _q("UPDATE routines SET name=?, description=?, exercises=?, created_at=?, routine_type=? WHERE id=? AND user_id=?"),
            (
                routine["name"],
                routine.get("description", ""),
                json.dumps(routine.get("exercises", [])),
                routine["createdAt"],
                routine.get("routineType", "strength"),
                routine_id,
                user_id,
            ),
        )
        conn.commit()
    return get_routine(routine_id, user_id)


def delete_routine(routine_id: str, user_id: str = "admin") -> bool:
    if not get_routine(routine_id, user_id):
        return False
    with _conn() as conn:
        conn.execute(_q("DELETE FROM routines WHERE id = ? AND user_id = ?"), (routine_id, user_id))
        conn.commit()
    return True


def workout_row_to_dict(row) -> dict:
    d = dict(row)
    d["startedAt"] = d.pop("started_at")
    d["routineId"] = d.pop("routine_id")
    d["routineName"] = d.pop("routine_name")
    d["durationSeconds"] = d.pop("duration_seconds")
    d["totalSets"] = d.pop("total_sets")
    d.setdefault("notes", "")
    d["exerciseData"] = d.pop("exercise_data", "") or ""
    d.pop("user_id", None)
    return d


def get_all_workouts(user_id: str = "admin") -> list[dict]:
    with _conn() as conn:
        rows = conn.execute(
            _q("SELECT * FROM workouts WHERE user_id = ? ORDER BY started_at DESC"), (user_id,)
        ).fetchall()
    return [workout_row_to_dict(r) for r in rows]


def get_calendar_events(user_id: str = "admin") -> list[dict]:
    with _conn() as conn:
        rows = conn.execute(
            _q("SELECT * FROM calendar_events WHERE user_id = ? ORDER BY created_at ASC"), (user_id,)
        ).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        d["routineId"] = d.pop("routine_id")
        d["routineName"] = d.pop("routine_name")
        d["eventType"] = d.pop("event_type")
        d["startDate"] = d.pop("start_date")
        d["recurrenceDays"] = json.loads(d.pop("recurrence_days") or "[]")
        d.pop("user_id", None)
        d.pop("created_at", None)
        result.append(d)
    return result


def add_calendar_event(event: dict, user_id: str = "admin") -> dict:
    with _conn() as conn:
        conn.execute(
            _q(
                "INSERT INTO calendar_events(id, routine_id, routine_name, event_type, date, start_date, recurrence_days, user_id, created_at) "
                "VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)"
            ),
            (
                event["id"],
                event["routineId"],
                event["routineName"],
                event["eventType"],
                event.get("date"),
                event.get("startDate"),
                json.dumps(event.get("recurrenceDays", [])),
                user_id,
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        conn.commit()
    return event


def delete_calendar_event(event_id: str, user_id: str = "admin") -> bool:
    with _conn() as conn:
        row = conn.execute(
            _q("SELECT id FROM calendar_events WHERE id = ? AND user_id = ?"), (event_id, user_id)
        ).fetchone()
        if not row:
            return False
        conn.execute(_q("DELETE FROM calendar_events WHERE id = ? AND user_id = ?"), (event_id, user_id))
        conn.commit()
    return True


def create_workout(workout: dict, user_id: str = "admin") -> dict:
    with _conn() as conn:
        conn.execute(
            _q(
                "INSERT INTO workouts (id, routine_id, routine_name, started_at, duration_seconds, total_sets, notes, exercise_data, user_id) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
            ),
            (
                workout["id"],
                workout["routineId"],
                workout["routineName"],
                workout["startedAt"],
                workout.get("durationSeconds", 0),
                workout.get("totalSets", 0),
                workout.get("notes", ""),
                workout.get("exerciseData", ""),
                user_id,
            ),
        )
        conn.commit()
    with _conn() as conn:
        row = conn.execute(_q("SELECT * FROM workouts WHERE id = ?"), (workout["id"],)).fetchone()
    return workout_row_to_dict(row)


def update_workout(workout_id: str, workout: dict, user_id: str = "admin") -> dict | None:
    with _conn() as conn:
        row = conn.execute(
            _q("SELECT id FROM workouts WHERE id = ? AND user_id = ?"), (workout_id, user_id)
        ).fetchone()
        if not row:
            return None
        conn.execute(
            _q(
                """UPDATE workouts
                   SET routine_id=?, routine_name=?, started_at=?,
                       duration_seconds=?, total_sets=?, notes=?, exercise_data=?
                   WHERE id=? AND user_id=?"""
            ),
            (
                workout["routineId"],
                workout["routineName"],
                workout["startedAt"],
                workout.get("durationSeconds", 0),
                workout.get("totalSets", 0),
                workout.get("notes", ""),
                workout.get("exerciseData", ""),
                workout_id,
                user_id,
            ),
        )
        conn.commit()
    with _conn() as conn:
        row = conn.execute(_q("SELECT * FROM workouts WHERE id = ?"), (workout_id,)).fetchone()
    return workout_row_to_dict(row)


def delete_workout(workout_id: str, user_id: str = "admin") -> bool:
    with _conn() as conn:
        row = conn.execute(
            _q("SELECT id FROM workouts WHERE id = ? AND user_id = ?"), (workout_id, user_id)
        ).fetchone()
        if not row:
            return False
        conn.execute(_q("DELETE FROM workouts WHERE id = ? AND user_id = ?"), (workout_id, user_id))
        conn.commit()
    return True
