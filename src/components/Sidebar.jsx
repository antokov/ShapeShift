import './Sidebar.css';

const DASHBOARD_ITEM = {
  id: 'dashboard',
  label: 'Dashboard',
  color: '#2196f3',
  disabled: false,
  icon: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="1" width="7" height="7" rx="1.5" fill="currentColor" />
      <rect x="10" y="1" width="7" height="7" rx="1.5" fill="currentColor" />
      <rect x="1" y="10" width="7" height="7" rx="1.5" fill="currentColor" />
      <rect x="10" y="10" width="7" height="7" rx="1.5" fill="currentColor" />
    </svg>
  ),
};

const NAV_GROUPS = [
  {
    label: 'Training',
    items: [
      {
        id: 'list',
        label: 'Routinen',
        color: '#00bcd4',
        disabled: false,
        icon: (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="4" width="16" height="2" rx="1" fill="currentColor" />
            <rect x="1" y="8" width="16" height="2" rx="1" fill="currentColor" />
            <rect x="1" y="12" width="10" height="2" rx="1" fill="currentColor" />
          </svg>
        ),
      },
      {
        id: 'week',
        label: 'Trainingskalender',
        color: '#ff9800',
        disabled: false,
        icon: (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="3" width="16" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <line x1="1" y1="7" x2="17" y2="7" stroke="currentColor" strokeWidth="1.5" />
            <line x1="6" y1="1" x2="6" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="12" y1="1" x2="12" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="4" y="10" width="2" height="2" rx="0.5" fill="currentColor" />
            <rect x="8" y="10" width="2" height="2" rx="0.5" fill="currentColor" />
            <rect x="12" y="10" width="2" height="2" rx="0.5" fill="currentColor" />
          </svg>
        ),
      },
      {
        id: 'journal',
        label: 'Journal',
        color: '#7e57c2',
        disabled: false,
        icon: (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="3" y="1" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <line x1="6" y1="6" x2="12" y2="6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="6" y1="9" x2="12" y2="9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="6" y1="12" x2="10" y2="12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        id: 'exercises',
        label: 'Übungsübersicht',
        color: '#9c27b0',
        disabled: false,
        icon: (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="2" width="11" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <line x1="4" y1="6" x2="9" y2="6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="4" y1="9" x2="9" y2="9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="4" y1="12" x2="7" y2="12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="14.5" cy="13.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
            <line x1="16.3" y1="15.3" x2="17.5" y2="16.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Gesundheit',
    items: [
      {
        id: 'garmin',
        label: 'Garmin',
        color: '#5c6bc0',
        disabled: false,
        icon: (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M4 9 L6 9 L7.5 6 L9 12 L10.5 7 L12 9 L14 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        ),
      },
      {
        id: 'coach',
        label: 'Mein Coach',
        color: '#4caf50',
        disabled: false,
        icon: (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="7.5" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2 16c0-3 2.5-5 5.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M14 8l.4 1.2L15.6 9.6l-1.2.4L14 11.2l-.4-1.2L12.4 9.6l1.2-.4z" fill="currentColor" />
            <path d="M12 3.5l.3.9 1 .3-.9.3-.4 1-.3-.9-1-.3.9-.3z" fill="currentColor" />
          </svg>
        ),
      },
      {
        id: 'nutrition',
        label: 'Ernährungsplan',
        color: '#ff6f00',
        disabled: false,
        icon: (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M5 2v4l2 2v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 2v3M7 2v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M12 2c0 2 3 3 3 5.5S13.5 11 12 11v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Verwaltung',
    items: [
      {
        id: 'users',
        label: 'Benutzer',
        color: '#ff7043',
        disabled: false,
        icon: (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M1 15c0-2.761 2.239-5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="13" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 15c0-2.761 1.343-5 4-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ),
      },
    ],
  },
];

function NavButton({ item, view, onNavigate }) {
  return (
    <button
      className={[
        'sidebar__item',
        view === item.id ? 'sidebar__item--active' : '',
        item.disabled ? 'sidebar__item--disabled' : '',
      ].filter(Boolean).join(' ')}
      onClick={() => !item.disabled && onNavigate(item.id)}
      disabled={item.disabled}
      aria-current={view === item.id ? 'page' : undefined}
    >
      <span className="sidebar__item-icon">
        {item.icon}
      </span>
      <span className="sidebar__item-label">{item.label}</span>
    </button>
  );
}

export default function Sidebar({ view, onNavigate, username }) {
  return (
    <nav className="sidebar" aria-label="Hauptnavigation">
      <div className="sidebar__brand">
        <span className="sidebar__brand-icon">⚡</span>
        <span className="sidebar__brand-name">ShapeShift</span>
      </div>

      <ul className="sidebar__nav" role="list">

        {/* Dashboard — standalone, kein Gruppenheader */}
        <li className="sidebar__standalone">
          <NavButton item={DASHBOARD_ITEM} view={view} onNavigate={onNavigate} />
        </li>

        {/* Gruppen */}
        {NAV_GROUPS.map((group) => (
          <li key={group.label} className="sidebar__group">
            <div className="sidebar__group-label" aria-hidden="true">
              {group.label}
            </div>
            <ul className="sidebar__group-nav" role="list">
              {group.items.map((item) => (
                <li key={item.id}>
                  <NavButton item={item} view={view} onNavigate={onNavigate} />
                  {item.subItems && (
                    <ul className="sidebar__sub" role="list">
                      {item.subItems.map((sub) => (
                        <li key={sub}>
                          <button className="sidebar__sub-item" disabled>{sub}</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}

      </ul>

      <div className="sidebar__user">
        <button
          className={['sidebar__user-btn', view === 'profile' ? 'sidebar__user-btn--active' : ''].filter(Boolean).join(' ')}
          onClick={() => onNavigate('profile')}
          aria-label="Mein Profil"
          aria-current={view === 'profile' ? 'page' : undefined}
        >
          <span className="sidebar__user-avatar" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2 16c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <span className="sidebar__user-name">{username}</span>
        </button>
        <button
          className="sidebar__logout"
          onClick={() => onNavigate('logout')}
          aria-label="Abmelden"
        >
          <svg width="15" height="15" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M7 3H3a1 1 0 00-1 1v10a1 1 0 001 1h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M12 6l3 3-3 3M15 9H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
