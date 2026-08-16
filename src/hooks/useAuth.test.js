import { describe, it, expect, beforeEach } from 'vitest';
import {
  initAuth,
  loginUser,
  logoutUser,
  getCurrentUser,
  createUser,
  getUsers,
  deleteUser,
  getActiveUsername,
} from './useAuth.js';

beforeEach(() => {
  localStorage.clear();
});

describe('initAuth', () => {
  it('creates admin user when no users exist', async () => {
    await initAuth();
    const users = getUsers();
    expect(users).toHaveLength(1);
    expect(users[0].username).toBe('admin');
  });

  it('does not duplicate admin on second call', async () => {
    await initAuth();
    await initAuth();
    expect(getUsers()).toHaveLength(1);
  });

  it('migrates fitnessapp_profile to fitnessapp_admin_profile', async () => {
    localStorage.setItem('fitnessapp_profile', JSON.stringify({ vorname: 'Test' }));
    await initAuth();
    expect(localStorage.getItem('fitnessapp_admin_profile')).toBe(JSON.stringify({ vorname: 'Test' }));
    expect(localStorage.getItem('fitnessapp_profile')).toBeNull();
  });

  it('migrates fitnessapp_weight_log to fitnessapp_admin_weight_log', async () => {
    localStorage.setItem('fitnessapp_weight_log', JSON.stringify([{ date: '2026-06-01', weight: 80 }]));
    await initAuth();
    expect(localStorage.getItem('fitnessapp_admin_weight_log')).not.toBeNull();
    expect(localStorage.getItem('fitnessapp_weight_log')).toBeNull();
  });

  it('does not overwrite existing admin data during migration', async () => {
    localStorage.setItem('fitnessapp_profile', JSON.stringify({ vorname: 'Old' }));
    localStorage.setItem('fitnessapp_admin_profile', JSON.stringify({ vorname: 'Existing' }));
    await initAuth();
    expect(JSON.parse(localStorage.getItem('fitnessapp_admin_profile')).vorname).toBe('Existing');
  });
});

describe('loginUser', () => {
  it('logs in with correct credentials', async () => {
    await initAuth();
    const user = await loginUser('admin', 'admin123');
    expect(user).toBe('admin');
  });

  it('throws on wrong password', async () => {
    await initAuth();
    await expect(loginUser('admin', 'wrong')).rejects.toThrow('Falsches Passwort');
  });

  it('throws on unknown username', async () => {
    await initAuth();
    await expect(loginUser('nobody', 'pass')).rejects.toThrow('Benutzername nicht gefunden');
  });

  it('sets session in localStorage after login', async () => {
    await initAuth();
    await loginUser('admin', 'admin123');
    const session = JSON.parse(localStorage.getItem('fitnessapp_session'));
    expect(session?.username).toBe('admin');
  });
});

describe('logoutUser', () => {
  it('removes session from localStorage', async () => {
    await initAuth();
    await loginUser('admin', 'admin123');
    logoutUser();
    expect(localStorage.getItem('fitnessapp_session')).toBeNull();
  });
});

describe('getCurrentUser', () => {
  it('returns null when no session', async () => {
    await initAuth();
    expect(getCurrentUser()).toBeNull();
  });

  it('returns username after login', async () => {
    await initAuth();
    await loginUser('admin', 'admin123');
    expect(getCurrentUser()).toBe('admin');
  });

  it('returns null after logout', async () => {
    await initAuth();
    await loginUser('admin', 'admin123');
    logoutUser();
    expect(getCurrentUser()).toBeNull();
  });
});

describe('createUser', () => {
  it('creates a new user successfully', async () => {
    await initAuth();
    await createUser('testuser', 'pass1234');
    expect(getUsers().find((u) => u.username === 'testuser')).toBeTruthy();
  });

  it('throws on duplicate username', async () => {
    await initAuth();
    await createUser('testuser', 'pass1234');
    await expect(createUser('testuser', 'other')).rejects.toThrow('bereits vergeben');
  });

  it('throws on username shorter than 2 chars', async () => {
    await initAuth();
    await expect(createUser('x', 'pass1234')).rejects.toThrow('mindestens 2 Zeichen');
  });

  it('throws on password shorter than 4 chars', async () => {
    await initAuth();
    await expect(createUser('newuser', 'ab')).rejects.toThrow('mindestens 4 Zeichen');
  });

  it('throws on invalid username characters', async () => {
    await initAuth();
    await expect(createUser('bad user!', 'pass1234')).rejects.toThrow('nur Buchstaben');
  });

  it('allows the new user to log in', async () => {
    await initAuth();
    await createUser('newuser', 'securepass');
    const user = await loginUser('newuser', 'securepass');
    expect(user).toBe('newuser');
  });
});

describe('deleteUser', () => {
  it('deletes a non-admin user', async () => {
    await initAuth();
    await createUser('todelete', 'pass1234');
    deleteUser('todelete');
    expect(getUsers().find((u) => u.username === 'todelete')).toBeUndefined();
  });

  it('throws when trying to delete admin', async () => {
    await initAuth();
    expect(() => deleteUser('admin')).toThrow('Admin-Benutzer kann nicht gelöscht werden');
  });

  it('throws when user does not exist', async () => {
    await initAuth();
    expect(() => deleteUser('ghost')).toThrow('Benutzer nicht gefunden');
  });
});

describe('getActiveUsername', () => {
  it('returns "admin" when no session', () => {
    expect(getActiveUsername()).toBe('admin');
  });

  it('returns current username when session exists', async () => {
    await initAuth();
    await loginUser('admin', 'admin123');
    expect(getActiveUsername()).toBe('admin');
  });

  it('returns "admin" when session is invalid JSON', () => {
    localStorage.setItem('fitnessapp_session', 'not-json');
    expect(getActiveUsername()).toBe('admin');
  });
});
