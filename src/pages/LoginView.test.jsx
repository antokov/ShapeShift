import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginView from './LoginView.jsx';

vi.mock('../hooks/useAuth.js', () => ({
  loginUser: vi.fn(),
}));

import { loginUser } from '../hooks/useAuth.js';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('LoginView – Rendering', () => {
  it('shows brand name "ShapeShift"', () => {
    render(<LoginView onLogin={() => {}} />);
    expect(screen.getByText('ShapeShift')).toBeTruthy();
  });

  it('shows heading "Willkommen zurück"', () => {
    render(<LoginView onLogin={() => {}} />);
    expect(screen.getByText('Willkommen zurück')).toBeTruthy();
  });

  it('renders username and password fields', () => {
    render(<LoginView onLogin={() => {}} />);
    expect(screen.getByLabelText(/Benutzername/i)).toBeTruthy();
    expect(screen.getByLabelText(/Passwort/i)).toBeTruthy();
  });

  it('renders submit button', () => {
    render(<LoginView onLogin={() => {}} />);
    expect(screen.getByRole('button', { name: /Anmelden/i })).toBeTruthy();
  });

  it('submit button is disabled when fields are empty', () => {
    render(<LoginView onLogin={() => {}} />);
    expect(screen.getByRole('button', { name: /Anmelden/i }).disabled).toBe(true);
  });
});

describe('LoginView – Form Interaction', () => {
  it('enables submit button when both fields have values', () => {
    render(<LoginView onLogin={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Benutzername/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/Passwort/i), { target: { value: 'admin123' } });
    expect(screen.getByRole('button', { name: /Anmelden/i }).disabled).toBe(false);
  });

  it('calls loginUser with trimmed username and password on submit', async () => {
    loginUser.mockResolvedValue('admin');
    render(<LoginView onLogin={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Benutzername/i), { target: { value: '  admin  ' } });
    fireEvent.change(screen.getByLabelText(/Passwort/i), { target: { value: 'admin123' } });
    fireEvent.click(screen.getByRole('button', { name: /Anmelden/i }));
    await waitFor(() => expect(loginUser).toHaveBeenCalledWith('admin', 'admin123'));
  });

  it('calls onLogin with username after successful login', async () => {
    loginUser.mockResolvedValue('admin');
    const onLogin = vi.fn();
    render(<LoginView onLogin={onLogin} />);
    fireEvent.change(screen.getByLabelText(/Benutzername/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/Passwort/i), { target: { value: 'admin123' } });
    fireEvent.click(screen.getByRole('button', { name: /Anmelden/i }));
    await waitFor(() => expect(onLogin).toHaveBeenCalledWith('admin'));
  });

  it('shows error message on failed login', async () => {
    loginUser.mockRejectedValue(new Error('Falsches Passwort'));
    render(<LoginView onLogin={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Benutzername/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/Passwort/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /Anmelden/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toContain('Falsches Passwort');
  });

  it('shows "Anmelden…" while loading', async () => {
    loginUser.mockReturnValue(new Promise(() => {}));
    render(<LoginView onLogin={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Benutzername/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/Passwort/i), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /Anmelden/i }));
    await waitFor(() => expect(screen.getByText('Anmelden…')).toBeTruthy());
  });

  it('disables button while loading', async () => {
    loginUser.mockReturnValue(new Promise(() => {}));
    render(<LoginView onLogin={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Benutzername/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/Passwort/i), { target: { value: 'pass' } });
    const btn = screen.getByRole('button', { name: /Anmelden/i });
    fireEvent.click(btn);
    await waitFor(() => expect(btn.disabled).toBe(true));
  });
});
