# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend (from repo root)
npm run dev          # Vite dev server → http://localhost:5173
npm run test         # Vitest (22 test files)

# Backend (from backend/)
py -m uvicorn main:app --reload --port 8000
py -m pytest tests/ -v   # 169 passed
py -m pip install -r requirements.txt
```

> Use `py` (not `python`) — Python 3.12.6 on Windows via py launcher.

## Architecture

```
fitnessApp/
├── src/                          React 18 + Vite (JavaScript/JSX, no TypeScript)
│   ├── App.jsx                   Root: auth gate + view-state router (see Views below)
│   ├── components/
│   │   ├── Sidebar.jsx           Persistent dark sidebar (#1a1a2e), grouped nav, logout
│   │   └── Sidebar.css
│   ├── hooks/
│   │   ├── useAuth.js            Auth: SHA-256 hashed passwords, localStorage, multi-user, session
│   │   ├── useRoutines.js        CRUD for routines against /api/routines
│   │   ├── useWorkouts.js        CRUD for workouts against /api/workouts
│   │   ├── useCalendar.js        CRUD for calendar events against /api/calendar
│   │   ├── useGarmin.js          Garmin activities + health (read-only, /api/garmin)
│   │   ├── useExerciseLibrary.js External exercise DB (yuhonas/free-exercise-db on GitHub), module-level cache
│   │   ├── useNutrition.js       Per-user nutrition settings — localStorage only (no backend)
│   │   ├── useProfile.js         User profile — localStorage only (no backend)
│   │   └── useWeightLog.js       Weight log — localStorage only (no backend)
│   ├── pages/
│   │   ├── Dashboard.jsx         KPIs, SVG line chart (4 metrics), streak, recent list
│   │   ├── CalendarView.jsx      Training calendar — week/month toggle, series + single events
│   │   ├── ExerciseLibraryView.jsx Browse external exercise DB with images + instructions
│   │   ├── GarminView.jsx        Garmin health (KPIs, sleep card, metric history charts)
│   │   ├── CoachView.jsx         AI coach report + follow-up chat (Anthropic claude-haiku via backend proxy)
│   │   ├── JournalView.jsx       Workout log — split view, date groups, Garmin merge
│   │   ├── LoginView.jsx         Login screen — shown before auth; bootstraps admin on first load
│   │   ├── NutritionView.jsx     AI 7-day nutrition plan generator (Anthropic claude-haiku via backend proxy)
│   │   ├── WorkoutSession.jsx    Guided workout — phase state machine (exercise|pause|rate|summary)
│   │   ├── UserProfile.jsx       Profile, goals, equipment, weight log
│   │   ├── UsersView.jsx         Admin: create / delete users (admin-only)
│   │   ├── RoutineList.jsx       Routine grid + import
│   │   ├── RoutineDetail.jsx     Routine detail + exercise descriptions (collapsible)
│   │   ├── RoutineForm.jsx       Create/edit routine (strength + cardio)
│   │   ├── RoutinePrint.jsx      Print-friendly routine view
│   │   └── DesignConcept.jsx     Living design reference (developer only, not in sidebar)
│   ├── utils/
│   │   ├── exportData.js         JSON export, fetchGarminHealth(), fetchGarminHealthHistory()
│   │   └── uuid.js               Browser-safe UUID generation
│   ├── data/
│   │   ├── exerciseLibrary.js    62 exercises in 6 categories (strength + cardio), with descriptions
│   │   └── foodLibrary.js        Food database for nutrition features
│   └── styles/
│       ├── globals.css           Design tokens (CSS custom properties) + button system
│       └── app.css               Layout (.app-layout, .app-main, .app light-theme wrapper)
├── backend/
│   ├── main.py                   FastAPI, all routes prefixed /api (see API Routes below)
│   ├── database.py               sqlite3 stdlib, DB at data/fitnessapp.db, via python-dotenv
│   ├── garmin_service.py         Garmin Connect integration (garminconnect 0.3.5, token cache)
│   └── tests/test_api.py         140 pytest tests
└── vite.config.js                Proxy: /api → http://localhost:8000 (no CORS needed)
```

### Views (App.jsx state machine)

App renders `LoginView` when no session is active. Once authenticated, `AppShell` manages these views:

| State | Component | Description |
|-------|-----------|-------------|
| `'dashboard'` | Dashboard | Default view |
| `'list'` | RoutineList | Routine overview |
| `'detail'` | RoutineDetail | Routine detail |
| `'form'` | RoutineForm | Create / edit routine |
| `'workout'` | WorkoutSession | Guided workout session |
| `'journal'` | JournalView | Workout log |
| `'week'` | CalendarView | Training calendar (state key is `'week'`, not `'calendar'`) |
| `'garmin'` | GarminView | Garmin health data |
| `'coach'` | CoachView | AI coach report + chat |
| `'nutrition'` | NutritionView | AI 7-day nutrition plan |
| `'exercises'` | ExerciseLibraryView | Browse external exercise database |
| `'users'` | UsersView | User management (admin) |
| `'profile'` | UserProfile | User profile |

### API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/routines` | List / create routines |
| GET/PUT/DELETE | `/api/routines/{id}` | Single routine |
| GET/POST | `/api/calendar` | List / create calendar events |
| DELETE | `/api/calendar/{id}` | Delete calendar event |
| GET/POST | `/api/workouts` | List / create workout logs |
| PUT/DELETE | `/api/workouts/{id}` | Update / delete workout log |
| GET | `/api/garmin/health` | Today's health snapshot (`?date=YYYY-MM-DD`) |
| GET | `/api/garmin/health/history` | Metric history (`?metric=steps&period=7d\|4w`) |
| GET | `/api/garmin/activities` | Recent Garmin activities (`?limit=N`) |
| GET | `/api/garmin/activities/{id}` | Single Garmin activity detail |
| GET | `/api/garmin/hrv` | Garmin HRV data (`?date=YYYY-MM-DD`) |
| POST | `/api/coach/report` | AI coach report (Anthropic proxy) |
| POST | `/api/coach/chat` | AI coach follow-up chat (uses prior report as system prompt) |
| POST | `/api/coach/plan` | AI training plan suggestion (Anthropic proxy, response field `"plan"`) |
| POST | `/api/nutrition/plan` | AI 7-day nutrition plan (Anthropic proxy) |

### Key Patterns

- **No react-router** — view state machine in App.jsx
- **No ORM** — sqlite3 stdlib; exercises stored as JSON column; migrations are idempotent (`ADD COLUMN IF NOT EXISTS`)
- **No chart library** — SVG inline (Dashboard.jsx, GarminView.jsx `MetricLineChart`)
- **Chart tooltips** — native SVG `<title>` child elements on invisible per-point hit-circles (`GarminView.jsx` `MetricLineChart`), not a custom overlay component; same pattern as the `title` attribute already used on `sleep-bar__*` segments — browser renders the tooltip natively, no extra state/JS
- **No additional npm packages** without discussion
- **Vite proxy** eliminates CORS config in dev
- **Auth** — browser-side only (`useAuth.js`); SHA-256 + random salt via `crypto.subtle`; users stored in `fitnessapp_users` (localStorage); session in `fitnessapp_session`; default admin user bootstrapped on first load (password: `admin123`); `X-User-Id` header sent to backend for data isolation
- **localStorage keys** — all namespaced by username: `fitnessapp_{username}_profile`, `fitnessapp_{username}_weight_log`, `fitnessapp_{username}_nutrition_settings`; `fitnessapp_users` + `fitnessapp_session` are global (not per-user)
- **Garmin** — backend-only (`garmin_service.py`); token cache in `data/garmin_tokens/`; three error modes: 503 not configured / 502 login error / 200 OK
- **Garmin history** — parallel fetches via `ThreadPoolExecutor(max_workers=min(days, 10))` in `_fetch_stats_history()` + `_fetch_sleep_history()`
- **Garmin normalization** — Garmin gibt `-1` für fehlende Metriken zurück (kein null); `_map_health` normalisiert `restingHeartRate ≤ 0` und `averageStressLevel < 0` zu `None`; `_fetch_stats_history` filtert alle negativen Werte + vo2MaxValue=0.0; `_fetch_body_battery_history` unterstützt dict-Format (`"date"`+`"bodyBatteryValuesArray"`) und unix-ms-Timestamps; `_fetch_intensity_history` clampt Minuten auf ≥ 0
- **AI Coach** — Anthropic `claude-haiku-4-5-20251001` via backend proxy; prompt built in `build_coach_prompt()`; pre-computed adherence table prevents hallucinated calculations; follow-up chat via `POST /api/coach/chat`
- **AI training plan suggestion** — `POST /api/coach/plan`, prompt built in `build_training_plan_prompt()` (forward-looking suggestion, deliberately does NOT reuse the adherence-table logic from `build_coach_prompt()`); in `CoachView.jsx`, both report and plan history items share one list and one localStorage key (`fitnessapp_{username}_coach_reports`), distinguished by a `type: 'bericht' | 'trainingsplan'` field — items without `type` (pre-feature data) default to `'bericht'`; both "Zwischenbericht"/"Trainingsplan" buttons share a single `loadingAction` state so only one generation request can run at a time
- **AI Nutrition** — Anthropic `claude-haiku-4-5-20251001` via `POST /api/nutrition/plan`; settings (diet type, calories, allergies, preferences) stored per-user in localStorage via `useNutrition`
- **External exercise library** — `useExerciseLibrary` fetches from `yuhonas/free-exercise-db` on GitHub at runtime; module-level cache avoids re-fetching across renders; images served from same GitHub repo
- **Garmin activities in Journal** — virtual/ephemeral via `mapGarminToEntry()`; not persisted in DB
- **Workout weight prefill** — `WorkoutSession` accepts a `workouts` prop (workout history) and prefills each exercise's weight field with the value from the most recent past workout matching by **exercise name** (not `id` — routine exercise IDs are randomly generated per row, so the same exercise has different IDs across routines); computed once in the `exercises` `useState` initializer, no `useEffect`
- **Journal save errors** — `JournalView` orchestrates `addWorkout`/`updateWorkout` itself (unlike `RoutineForm`, where `App.jsx` owns `saveError` and passes it down as a prop); `JournalView` therefore keeps its own local `saveError` state, set in `handleSubmit`'s `catch` and cleared on new submit / cancel / opening a new or different entry

---

## Design System

**All UI work must follow these rules.** The living reference is `src/pages/DesignConcept.jsx`.

### Theme

Light theme throughout:

| Role | Value |
|------|-------|
| Page background | `#f0f0f0` |
| Card / surface | `#ffffff` |
| Border | `#e8e8e8` |
| Text primary | `#1a1a1a` |
| Text secondary | `#555555` |
| Text muted | `#999999` |
| Sidebar background | `#1a1a2e` |

### Typography

Font family: `'Inter', 'Roboto', system-ui, sans-serif` (Inter via Google Fonts).

| Level | Size | Weight | Color |
|-------|------|--------|-------|
| Page title (H1) | 28px | 300 | #1a1a1a |
| Section heading | 18px | 600 | #1a1a1a |
| Card title | 15–16px | 600 | #1a1a1a |
| Body | 14px | 400 | #444 |
| Meta / label | 12px | 400 | #888 |
| Section tag | 11px | 600, uppercase | #999 |

### Accent Colors

| Purpose | Color |
|---------|-------|
| Primary accent (focus, pills, badges, hover) | `#5c6bc0` (Indigo) |
| Indigo muted background | `rgba(92, 107, 192, 0.10)` |
| Primary CTA button | `#FF5C1A → #FF8C42` (Orange gradient — **only for CTAs**) |
| Teal (duration stats, cardio badges) | `#00bcd4` |
| Green (status: active, Garmin entries) | `#4caf50` |
| Error / danger | `#EF4444` |

### Cards

```css
background: #ffffff;
border: 1px solid #e8e8e8;
border-radius: 12px;   /* large cards */
border-radius: 8px;    /* small items/rows */
/* NO box-shadow */
```

Hover state: `border-color: #d0d0d0` — no shadow, no glow.

### Buttons

Four tiers — use the right tier, never substitute:

| Tier | When to use | Style |
|------|------------|-------|
| **Primary** `.btn--primary` | ONE per view, the main action | Orange gradient + glow |
| **Secondary** `.btn` | Neutral actions (Edit, secondary nav) | White bg, #d8d8d8 border |
| **Ghost** `.btn--ghost` | Navigation (Back), Cancel | Transparent, #555 text |
| **Danger** `.btn--danger` | Destructive actions (Delete) | Red muted bg, red text |

Inside `.app` wrapper, `.btn--primary` / `.btn--danger` / `.btn--accent` have explicit restore-overrides in `app.css` — do not remove them.

### Form Fields

```css
background: #ffffff;
border: 1px solid #d8d8d8;
border-radius: 8px;
/* Focus: */
border-color: #5c6bc0;
box-shadow: 0 0 0 3px rgba(92, 107, 192, 0.15);
/* Error: */
border-color: #EF4444;
box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
```

Labels: 11px, 600 weight, uppercase, #999, letter-spacing 0.07em.

### Exercise Stats / Badges

- Sets: grey background `#f0f0f0`, grey text `#888`
- Reps: Indigo `rgba(92,107,192,0.1)` bg, `#5c6bc0` text
- Duration / Cardio: Teal `rgba(0,188,212,0.1)` bg, `#00bcd4` text

### Spacing

8px grid. Key values:

| px | Use |
|----|-----|
| 8 | Gap between buttons |
| 12 | Chip padding |
| 16 | Card padding, field gap |
| 24 | Section internal spacing |
| 32 | Page padding top/bottom |
| 48 | Page padding (desktop) |

### DO NOT

- No `box-shadow` on cards (only CTA buttons have glow)
- No `var(--color-*)` dark tokens in page CSS — use hardcoded light values
- No chart libraries — SVG only
- No `transform: translateY` on card hover — only on primary buttons
- No additional npm packages without discussing first
- Do not modify `globals.css` design tokens or button system

---

## Agile Workflow

- `/sm <feature description>` — full SAFe pipeline (PO → BA → Architect → Dev → Tester → Architect Review). Workspace artifacts in `.claude/workspace/`. Backlog in `.claude/backlog.md`.
- `/backlog` — audit and clean up `.claude/backlog.md` against actual codebase state.
