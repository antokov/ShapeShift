const USERS_KEY = 'fitnessapp_users';
const SESSION_KEY = 'fitnessapp_session';

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function generateSalt() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(salt + password);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function migrateAdminData() {
  const migrations = [
    ['fitnessapp_profile', 'fitnessapp_admin_profile'],
    ['fitnessapp_weight_log', 'fitnessapp_admin_weight_log'],
    ['fitnessapp_coach_reports', 'fitnessapp_admin_coach_reports'],
  ];
  for (const [oldKey, newKey] of migrations) {
    const existing = localStorage.getItem(oldKey);
    if (existing && !localStorage.getItem(newKey)) {
      localStorage.setItem(newKey, existing);
    }
    if (existing) localStorage.removeItem(oldKey);
  }
}

export async function initAuth() {
  const users = loadUsers();
  if (users.length === 0) {
    const salt = generateSalt();
    const passwordHash = await hashPassword('admin123', salt);
    saveUsers([{ username: 'admin', passwordHash, salt, createdAt: new Date().toISOString() }]);
    migrateAdminData();
  }
}

export async function loginUser(username, password) {
  const users = loadUsers();
  const user = users.find((u) => u.username === username);
  if (!user) throw new Error('Benutzername nicht gefunden');
  const hash = await hashPassword(password, user.salt);
  if (hash !== user.passwordHash) throw new Error('Falsches Passwort');
  localStorage.setItem(SESSION_KEY, JSON.stringify({ username }));
  return username;
}

export function logoutUser() {
  localStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    const username = session?.username;
    if (!username) return null;
    const users = loadUsers();
    return users.find((u) => u.username === username) ? username : null;
  } catch {
    return null;
  }
}

export async function createUser(username, password) {
  const trimmed = username.trim();
  if (trimmed.length < 2) throw new Error('Benutzername muss mindestens 2 Zeichen haben');
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) throw new Error('Benutzername darf nur Buchstaben, Ziffern, - und _ enthalten');
  if (password.length < 4) throw new Error('Passwort muss mindestens 4 Zeichen haben');
  const users = loadUsers();
  if (users.find((u) => u.username === trimmed)) throw new Error('Benutzername bereits vergeben');
  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);
  const newUser = { username: trimmed, passwordHash, salt, createdAt: new Date().toISOString() };
  saveUsers([...users, newUser]);
  return { username: trimmed, createdAt: newUser.createdAt };
}

export function getUsers() {
  return loadUsers().map((u) => ({ username: u.username, createdAt: u.createdAt }));
}

export function deleteUser(username) {
  if (username === 'admin') throw new Error('Der Admin-Benutzer kann nicht gelöscht werden');
  const users = loadUsers();
  if (!users.find((u) => u.username === username)) throw new Error('Benutzer nicht gefunden');
  saveUsers(users.filter((u) => u.username !== username));
}

export function getActiveUsername() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')?.username ?? 'admin';
  } catch {
    return 'admin';
  }
}
