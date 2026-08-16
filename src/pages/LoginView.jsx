import { useState } from 'react';
import { loginUser } from '../hooks/useAuth.js';
import './LoginView.css';

export default function LoginView({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setError(null);
    setLoading(true);
    try {
      const user = await loginUser(username.trim(), password);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-brand__icon">⚡</span>
          <span className="login-brand__name">ShapeShift</span>
        </div>
        <h1 className="login-title">Willkommen zurück</h1>
        <form onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label className="login-field__label" htmlFor="login-username">Benutzername</label>
            <input
              id="login-username"
              type="text"
              className="login-field__input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>
          <div className="login-field">
            <label className="login-field__label" htmlFor="login-password">Passwort</label>
            <input
              id="login-password"
              type="password"
              className="login-field__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && <div className="login-error" role="alert">{error}</div>}
          <button
            type="submit"
            className="btn btn--primary login-submit"
            disabled={loading || !username.trim() || !password}
          >
            {loading ? 'Anmelden…' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  );
}
