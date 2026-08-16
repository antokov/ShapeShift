import os
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta
from garminconnect import Garmin

METRIC_MAP = {
    "steps":              ("totalSteps",          "Schritte"),
    "restingHeartRate":   ("restingHeartRate",     "bpm"),
    "averageStressLevel": ("averageStressLevel",   ""),
    "calories":           ("totalKilocalories",    "kcal"),
    "distance":           ("totalDistanceMeters",  "km"),
    "bodyBattery":        (None,                   ""),
    "sleepDuration":      (None,                   "h"),
    "vo2max":             ("vo2MaxValue",           "ml/kg"),
    "intensityMinutes":   (None,                   "Min"),
    "hrv":                (None,                   "ms"),
}
VALID_PERIODS = {"7d": 7, "4w": 28}

TOKEN_DIR = "data/garmin_tokens"


class GarminNotConfiguredError(Exception):
    pass


class GarminLoginError(Exception):
    pass


def _fresh_login(email: str, password: str) -> Garmin:
    api = Garmin(email=email, password=password)
    api.login()
    os.makedirs(TOKEN_DIR, exist_ok=True)
    api.client.dump(TOKEN_DIR)
    return api


def _get_client(email: str, password: str) -> Garmin:
    if os.path.isdir(TOKEN_DIR):
        try:
            api = Garmin()
            api.login(TOKEN_DIR)
            return api
        except Exception:
            pass
    return _fresh_login(email, password)


def _map_activity(a: dict) -> dict:
    cadence = (
        a.get("averageRunningCadenceInStepsPerMinute") or
        a.get("averageBikingCadenceInRevPerMinute") or
        None
    )
    avg_speed = a.get("averageSpeed")
    return {
        "id": str(a.get("activityId", "")),
        "activityName": a.get("activityName", ""),
        "activityType": (a.get("activityType") or {}).get("typeKey", "other"),
        "startTimeLocal": a.get("startTimeLocal", ""),
        "duration": a.get("duration"),
        "distance": a.get("distance"),
        "calories": a.get("calories"),
        "averageHR": a.get("averageHR"),
        "maxHR": a.get("maxHR"),
        "elevationGain": a.get("elevationGain"),
        "avgSpeed": avg_speed,
        "cadence": round(cadence) if cadence else None,
    }


def _yesterday() -> str:
    return (date.today() - timedelta(days=1)).isoformat()


def _map_health(cdate: str, stats: dict, sleep_raw: dict) -> dict:
    sleep_dto = (sleep_raw or {}).get("dailySleepDTO") or {}
    vo2max = stats.get("vo2MaxValue")
    if vo2max == 0.0:
        vo2max = None

    resting_hr = stats.get("restingHeartRate")
    if resting_hr is not None and resting_hr <= 0:
        resting_hr = None

    avg_stress = stats.get("averageStressLevel")
    if avg_stress is not None and avg_stress < 0:
        avg_stress = None

    vigorous = stats.get("vigorousIntensityMinutes")
    moderate = stats.get("moderateIntensityMinutes")
    return {
        "date": cdate,
        "steps": stats.get("totalSteps"),
        "floors": stats.get("floorsAscended"),
        "totalCalories": stats.get("totalKilocalories"),
        "activeCalories": stats.get("activeKilocalories"),
        "distanceMeters": stats.get("totalDistanceMeters"),
        "restingHeartRate": resting_hr,
        "averageStressLevel": avg_stress,
        "bodyBatteryHighest": stats.get("bodyBatteryHighestValue"),
        "bodyBatteryLowest": stats.get("bodyBatteryLowestValue"),
        "vo2max": vo2max,
        "vigorousMinutes": vigorous,
        "moderateMinutes": moderate,
        "sleep": {
            "totalSeconds": sleep_dto.get("sleepTimeSeconds"),
            "deepSeconds": sleep_dto.get("deepSleepSeconds"),
            "lightSeconds": sleep_dto.get("lightSleepSeconds"),
            "remSeconds": sleep_dto.get("remSleepSeconds"),
            "awakeSeconds": sleep_dto.get("awakeSleepSeconds"),
        },
    }


def get_health(cdate: str | None = None) -> dict:
    yesterday = _yesterday()
    if not cdate or cdate > yesterday:
        cdate = yesterday
    email = os.environ.get("GARMIN_EMAIL")
    password = os.environ.get("GARMIN_PASSWORD")
    if not email or not password:
        raise GarminNotConfiguredError()
    try:
        api = _get_client(email, password)
        stats = api.get_stats(cdate) or {}
        sleep_raw = api.get_sleep_data(cdate) or {}
        return _map_health(cdate, stats, sleep_raw)
    except GarminNotConfiguredError:
        raise
    except Exception as e:
        raise GarminLoginError(str(e)) from e


def _fetch_stats_history(api, start: date, days: int, field: str, is_distance: bool) -> list[dict]:
    dates = [(start + timedelta(days=i)).isoformat() for i in range(days)]

    def _fetch_one(d: str) -> dict:
        try:
            stats = api.get_stats(d) or {}
            raw = stats.get(field)
            if is_distance and raw is not None:
                raw = round(raw / 1000, 2)
            if raw is not None and isinstance(raw, (int, float)):
                if raw < 0:
                    raw = None
                elif field == "vo2MaxValue" and raw == 0.0:
                    raw = None
            return {"date": d, "value": raw}
        except Exception:
            return {"date": d, "value": None}

    with ThreadPoolExecutor(max_workers=min(days, 10)) as pool:
        return list(pool.map(_fetch_one, dates))


def _fetch_body_battery_history(api, startdate: str, enddate: str, days: int) -> list[dict]:
    by_date: dict[str, int] = {}
    try:
        raw = api.get_body_battery(startdate, enddate) or []
        for entry in raw:
            d = None
            val = None
            if isinstance(entry, dict):
                raw_date = (entry.get("date") or entry.get("calendarDate") or entry.get("startGMT") or "")
                d = str(raw_date)[:10]
                val = entry.get("value") or entry.get("bodyBatteryHighest")
                if val is None:
                    values_arr = entry.get("bodyBatteryValuesArray") or []
                    arr_vals = [
                        r[1] for r in values_arr
                        if isinstance(r, (list, tuple)) and len(r) >= 2
                        and r[1] is not None and r[1] >= 0
                    ]
                    if arr_vals:
                        val = max(arr_vals)
            elif isinstance(entry, (list, tuple)) and len(entry) >= 2:
                ts = entry[0]
                if isinstance(ts, (int, float)) and ts > 1_000_000_000_000:
                    from datetime import timezone as _tz
                    d = datetime.fromtimestamp(ts / 1000, tz=_tz.utc).strftime('%Y-%m-%d')
                else:
                    d = str(ts)[:10]
                val = entry[1]
            if d and val is not None and isinstance(val, (int, float)) and val >= 0:
                by_date[d] = max(by_date.get(d, 0), int(val))
    except Exception:
        pass
    start = date.fromisoformat(startdate)
    return [{"date": (start + timedelta(days=i)).isoformat(),
             "value": by_date.get((start + timedelta(days=i)).isoformat())}
            for i in range(days)]


def _fetch_sleep_history(api, start: date, days: int) -> list[dict]:
    dates = [(start + timedelta(days=i)).isoformat() for i in range(days)]

    def _fetch_one(d: str) -> dict:
        try:
            sleep_raw = api.get_sleep_data(d) or {}
            sleep_dto = (sleep_raw.get("dailySleepDTO") or {})
            total = sleep_dto.get("sleepTimeSeconds")
            val = round(total / 3600, 1) if total is not None else None
            return {"date": d, "value": val}
        except Exception:
            return {"date": d, "value": None}

    with ThreadPoolExecutor(max_workers=min(days, 10)) as pool:
        return list(pool.map(_fetch_one, dates))


def _fetch_hrv_history(api, start: date, days: int) -> list[dict]:
    if not hasattr(api, 'get_hrv_data'):
        return [{"date": (start + timedelta(days=i)).isoformat(), "value": None} for i in range(days)]
    dates = [(start + timedelta(days=i)).isoformat() for i in range(days)]

    def _fetch_one(d: str) -> dict:
        try:
            raw = api.get_hrv_data(d, d)
            if not raw or not isinstance(raw, dict):
                return {"date": d, "value": None}
            summaries = raw.get("hrvSummaries") or []
            val = None
            if summaries and isinstance(summaries, list):
                s = summaries[0]
                val = s.get("weeklyAvg") or s.get("lastNight")
            if val is None:
                val = raw.get("weeklyAvg") or raw.get("weeklyAvgHrv")
            return {"date": d, "value": round(val) if val is not None else None}
        except Exception:
            return {"date": d, "value": None}

    with ThreadPoolExecutor(max_workers=min(days, 10)) as pool:
        return list(pool.map(_fetch_one, dates))


def _fetch_intensity_history(api, start: date, days: int) -> list[dict]:
    dates = [(start + timedelta(days=i)).isoformat() for i in range(days)]

    def _fetch_one(d: str) -> dict:
        try:
            stats = api.get_stats(d) or {}
            vigorous = max(stats.get("vigorousIntensityMinutes") or 0, 0)
            moderate = max(stats.get("moderateIntensityMinutes") or 0, 0)
            total = vigorous + moderate
            return {"date": d, "value": total if (vigorous or moderate) else None}
        except Exception:
            return {"date": d, "value": None}

    with ThreadPoolExecutor(max_workers=min(days, 10)) as pool:
        return list(pool.map(_fetch_one, dates))


def get_health_history(metric: str, period: str) -> dict:
    if metric not in METRIC_MAP:
        raise ValueError(f"Unbekannte Metrik: {metric}")
    if period not in VALID_PERIODS:
        raise ValueError(f"Unbekannte Periode: {period}")
    email = os.environ.get("GARMIN_EMAIL")
    password = os.environ.get("GARMIN_PASSWORD")
    if not email or not password:
        raise GarminNotConfiguredError()
    try:
        api = _get_client(email, password)
        days = VALID_PERIODS[period]
        yesterday = _yesterday()
        end = date.fromisoformat(yesterday)
        start = end - timedelta(days=days - 1)
        _, unit = METRIC_MAP[metric]
        if metric == "sleepDuration":
            data = _fetch_sleep_history(api, start, days)
        elif metric == "bodyBattery":
            data = _fetch_body_battery_history(api, start.isoformat(), end.isoformat(), days)
        elif metric == "hrv":
            data = _fetch_hrv_history(api, start, days)
        elif metric == "intensityMinutes":
            data = _fetch_intensity_history(api, start, days)
        else:
            field, _ = METRIC_MAP[metric]
            data = _fetch_stats_history(api, start, days, field, metric == "distance")
        return {"metric": metric, "period": period, "unit": unit, "data": data}
    except (GarminNotConfiguredError, ValueError):
        raise
    except Exception as e:
        raise GarminLoginError(str(e)) from e


def get_activities(limit: int = 20) -> list[dict]:
    email = os.environ.get("GARMIN_EMAIL")
    password = os.environ.get("GARMIN_PASSWORD")
    if not email or not password:
        raise GarminNotConfiguredError()
    try:
        api = _get_client(email, password)
        raw = api.get_activities(0, limit)
        return [_map_activity(a) for a in raw]
    except GarminNotConfiguredError:
        raise
    except Exception as e:
        raise GarminLoginError(str(e)) from e


def get_activity_detail(activity_id: str) -> dict:
    email = os.environ.get("GARMIN_EMAIL")
    password = os.environ.get("GARMIN_PASSWORD")
    if not email or not password:
        raise GarminNotConfiguredError()
    try:
        api = _get_client(email, password)
        splits = []
        if hasattr(api, 'get_activity_splits'):
            try:
                raw_splits = api.get_activity_splits(int(activity_id)) or {}
                lap_dtos = raw_splits.get("lapDTOs") or []
                for lap in lap_dtos:
                    speed = lap.get("averageSpeed")
                    avg_pace = round(1000 / speed) if speed and speed > 0 else None
                    splits.append({
                        "lapIndex": lap.get("lapIndex", 0),
                        "distance": lap.get("distance"),
                        "duration": lap.get("duration"),
                        "avgHR": lap.get("averageHR"),
                        "avgPace": avg_pace,
                    })
            except Exception:
                splits = []
        return {"activityId": activity_id, "splits": splits}
    except GarminNotConfiguredError:
        raise
    except Exception as e:
        raise GarminLoginError(str(e)) from e


def get_hrv(cdate: str) -> dict | None:
    email = os.environ.get("GARMIN_EMAIL")
    password = os.environ.get("GARMIN_PASSWORD")
    if not email or not password:
        raise GarminNotConfiguredError()
    try:
        api = _get_client(email, password)
        if not hasattr(api, 'get_hrv_data'):
            return None
        try:
            raw = api.get_hrv_data(cdate, cdate)
            if not raw or not isinstance(raw, dict):
                return None
            summaries = raw.get("hrvSummaries") or []
            weekly_avg = None
            last_night = None
            if summaries and isinstance(summaries, list):
                s = summaries[0]
                weekly_avg = s.get("weeklyAvg")
                last_night = s.get("lastNight")
            if weekly_avg is None:
                weekly_avg = raw.get("weeklyAvg") or raw.get("weeklyAvgHrv")
            if weekly_avg is None and last_night is None:
                return None
            return {
                "weeklyAvg": round(weekly_avg) if weekly_avg is not None else None,
                "lastNight": round(last_night) if last_night is not None else None,
            }
        except AttributeError:
            return None
    except GarminNotConfiguredError:
        raise
    except Exception as e:
        raise GarminLoginError(str(e)) from e
