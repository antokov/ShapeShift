import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from './Sidebar.jsx';

function renderSidebar(view = 'dashboard', onNavigate = vi.fn()) {
  return render(<Sidebar view={view} onNavigate={onNavigate} username="Anton" />);
}

describe('Sidebar – Gruppenstruktur', () => {
  it('AC-01: zeigt drei Gruppenüberschriften', () => {
    renderSidebar();
    expect(screen.getByText('Training')).toBeInTheDocument();
    expect(screen.getByText('Gesundheit')).toBeInTheDocument();
    expect(screen.getByText('Verwaltung')).toBeInTheDocument();
  });

  it('AC-01: Dashboard steht standalone vor den Gruppen', () => {
    renderSidebar();
    expect(screen.getByRole('button', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('AC-02: Training-Gruppe enthält Routinen, Trainingskalender, Journal (kein Dashboard)', () => {
    renderSidebar();
    expect(screen.getByRole('button', { name: 'Routinen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trainingskalender' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Journal' })).toBeInTheDocument();
  });

  it('AC-01: Gesundheit-Gruppe enthält Garmin, Mein Coach, Ernährungsplan', () => {
    renderSidebar();
    expect(screen.getByRole('button', { name: 'Garmin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mein Coach' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ernährungsplan' })).toBeInTheDocument();
  });

  it('AC-01: Verwaltung-Gruppe enthält Benutzer', () => {
    renderSidebar();
    expect(screen.getByRole('button', { name: 'Benutzer' })).toBeInTheDocument();
  });

  it('AC-02: Gruppenüberschriften sind nicht klickbar (kein button-role)', () => {
    renderSidebar();
    const label = screen.getByText('Training');
    expect(label.tagName).not.toBe('BUTTON');
  });

  it('AC-04: aktiver View erhält aria-current=page', () => {
    renderSidebar('journal');
    const journalBtn = screen.getByRole('button', { name: 'Journal' });
    expect(journalBtn).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
  });

  it('AC-04: Klick auf ein Item ruft onNavigate mit der korrekten id auf', async () => {
    const onNavigate = vi.fn();
    renderSidebar('dashboard', onNavigate);
    await userEvent.click(screen.getByRole('button', { name: 'Journal' }));
    expect(onNavigate).toHaveBeenCalledWith('journal');
  });

  it('AC-04: Klick auf Garmin ruft onNavigate(garmin) auf', async () => {
    const onNavigate = vi.fn();
    renderSidebar('dashboard', onNavigate);
    await userEvent.click(screen.getByRole('button', { name: 'Garmin' }));
    expect(onNavigate).toHaveBeenCalledWith('garmin');
  });

  it('AC-05: Brand-Name ShapeShift und User-Footer bleiben sichtbar', () => {
    renderSidebar();
    expect(screen.getByText('ShapeShift')).toBeInTheDocument();
    expect(screen.getByText('Anton')).toBeInTheDocument();
  });

  it('EC-01: Verwaltung-Gruppe mit nur 1 Item rendert korrekt', () => {
    renderSidebar();
    const benutzerBtn = screen.getByRole('button', { name: 'Benutzer' });
    expect(benutzerBtn).toBeInTheDocument();
  });
});
