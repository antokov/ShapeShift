import { useState } from 'react';
import { getUsers, createUser, deleteUser } from '../hooks/useAuth.js';
import './UsersView.css';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function UsersView({ currentUser }) {
  const [users, setUsers] = useState(() => getUsers());
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await createUser(newUsername, newPassword);
      setUsers(getUsers());
      setNewUsername('');
      setNewPassword('');
      setSuccess(`Benutzer „${newUsername.trim()}" wurde angelegt.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDelete(username) {
    if (!window.confirm(`Benutzer „${username}" wirklich löschen?`)) return;
    try {
      deleteUser(username);
      setUsers(getUsers());
      setSuccess(`Benutzer „${username}" wurde gelöscht.`);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  const canSubmit = newUsername.trim().length >= 2 && newPassword.length >= 4 && !loading;

  return (
    <div className="users-page">
      <div className="users-page__header">
        <h1 className="users-page__title">Benutzerverwaltung</h1>
        <p className="users-page__subtitle">Benutzerkonten anlegen und verwalten.</p>
      </div>

      <div className="users-page__body">
        {/* ─── Benutzerliste ─── */}
        <section className="profile-card">
          <div className="profile-card__tag">Benutzer</div>
          <h2 className="profile-card__heading">Alle Benutzer</h2>
          <ul className="users-list">
            {users.map((u) => (
              <li key={u.username} className="users-list__item">
                <div className="users-list__info">
                  <span className="users-list__name">
                    {u.username}
                    {u.username === currentUser && (
                      <span className="users-list__you"> (Du)</span>
                    )}
                  </span>
                  <span className="users-list__date">seit {formatDate(u.createdAt)}</span>
                </div>
                {u.username !== 'admin' && u.username !== currentUser && (
                  <button
                    type="button"
                    className="btn btn--danger users-list__delete"
                    onClick={() => handleDelete(u.username)}
                    aria-label={`Benutzer ${u.username} löschen`}
                  >
                    Löschen
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* ─── Neuer Benutzer ─── */}
        <section className="profile-card">
          <div className="profile-card__tag">Neu</div>
          <h2 className="profile-card__heading">Benutzer anlegen</h2>
          {error && <div className="users-error" role="alert">{error}</div>}
          {success && <div className="users-success" role="status">{success}</div>}
          <form onSubmit={handleCreate} noValidate>
            <div className="profile-grid">
              <div className="profile-field">
                <label className="profile-field__label" htmlFor="new-username">Benutzername</label>
                <div className="profile-field__input-wrap">
                  <input
                    id="new-username"
                    type="text"
                    className="profile-field__input"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="z. B. max"
                    minLength={2}
                  />
                </div>
              </div>
              <div className="profile-field">
                <label className="profile-field__label" htmlFor="new-password">Passwort</label>
                <div className="profile-field__input-wrap">
                  <input
                    id="new-password"
                    type="password"
                    className="profile-field__input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="min. 4 Zeichen"
                    minLength={4}
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              className="btn btn--primary"
              style={{ marginTop: 16 }}
              disabled={!canSubmit}
            >
              {loading ? 'Wird angelegt…' : 'Benutzer anlegen'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
