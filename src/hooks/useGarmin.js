import { useState, useEffect } from 'react';

function useGarminFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notConfigured, setNotConfigured] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setNotConfigured(false);
    setData(null);
    fetch(url)
      .then((r) => {
        if (r.status === 503) { setNotConfigured(true); return null; }
        if (!r.ok) return r.json().then((b) => { throw new Error(b.detail || 'Garmin-Fehler'); });
        return r.json();
      })
      .then((d) => { if (d !== null) setData(d); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [url]);

  return { data, loading, error, notConfigured };
}

export function useGarmin(limit = 20) {
  const { data, loading, error, notConfigured } = useGarminFetch(`/api/garmin/activities?limit=${limit}`);
  return { activities: data ?? [], loading, error, notConfigured };
}

export function useGarminHealth(date) {
  const url = date ? `/api/garmin/health?date=${date}` : '/api/garmin/health';
  const { data, loading, error, notConfigured } = useGarminFetch(url);
  return { health: data, loading, error, notConfigured };
}

export function useGarminHistory(metric, period) {
  const url = `/api/garmin/health/history?metric=${metric}&period=${period}`;
  const { data, loading, error, notConfigured } = useGarminFetch(url);
  return { history: data, loading, error, notConfigured };
}

export function useGarminHRV(date) {
  const url = date ? `/api/garmin/hrv?date=${date}` : '/api/garmin/hrv';
  const { data, loading, error, notConfigured } = useGarminFetch(url);
  return { hrv: data && Object.keys(data).length > 0 ? data : null, loading, error, notConfigured };
}

export function useGarminActivityDetail(id) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setDetail(null);
    fetch(`/api/garmin/activities/${id}`)
      .then((r) => {
        if (!r.ok) return r.json().then((b) => { throw new Error(b.detail || 'Fehler'); });
        return r.json();
      })
      .then((d) => setDetail(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  return { detail, loading, error };
}
