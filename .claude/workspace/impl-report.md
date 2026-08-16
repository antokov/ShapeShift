# Implementation Report: FS-03 — Integrationstest App.jsx: View-Wechsel + Edit-Flow

## Approach

Neue Testdatei `src/App.test.jsx` (erste für `App.jsx`, das bisher komplett ungetestet war). Rendert die App über den echten Default-Export `App` (inkl. Auth-Gate) — kein `AppShell`-Export, kein Mocken von `useAuth.js`. Login wird über einen echten `initAuth()`-Aufruf + direktes Setzen der `fitnessapp_session`-localStorage-Variable simuliert. Ein URL-Pattern-basierter `global.fetch`-Mock (`mockAppFetch`) bedient alle vier von `AppShell` parallel geladenen Endpunkte (`/api/routines`, `/api/workouts`, `/api/calendar`, `/api/garmin/activities`) sowie `POST`/`PUT /api/routines` für den Edit-Flow, mit Methoden-Unterscheidung. `useExerciseLibrary` wird gemockt (externe GitHub-Netzwerkabhängigkeit), alle übrigen Komponenten (`Sidebar`, `RoutineList`, `RoutineDetail`, `RoutineForm`) sind echt — kein internes Mocking, um den Integrationstest-Charakter zu wahren.

## Files Changed

- `src/App.test.jsx` — **neu**, 5 Tests in 5 `describe`-Blöcken (View-Wechsel, Neue Routine, Bearbeiten, Detail→Bearbeiten→Abbrechen, Fehlgeschlagenes Speichern)

## Assumptions

- Q-01: Fetch-Mock URL-Pattern-basiert mit Methoden-Unterscheidung (robuster gegen die nicht-deterministische Aufruf-Reihenfolge der vier parallel startenden Hooks).
- Q-02: `initAuth()` real durchlaufen lassen statt `useAuth.js` zu mocken — minimaler Zeitaufwand, deckt zusätzlich den Auth-Bootstrap-Pfad ab.
- Dashboard-Titel ist `<h1>Fitness</h1>` (nicht „Dashboard" — das ist nur das Sidebar-Label) — verifiziert vor Implementierung durch Lesen von `Dashboard.jsx:427`, `renderLoggedIn()`-Helper wartet entsprechend auf `getByRole('heading', { name: 'Fitness' })`.

## Deviations

Keine inhaltlichen Abweichungen von `arch-decision.md` — alle 5 Test-Skelette wurden wie vorgegeben implementiert und liefen **beim ersten Testlauf ohne Anpassung** grün (verifizierte Annahmen aus der Architect-Phase zu Labels/ARIA-Attributen/Placeholder-Texten waren korrekt).

## Edge Cases Handled

- BR-04 (Ladezustand): alle Tests warten korrekt via `waitFor(...)` auf das Erscheinen von „Push Day"/„Meine Routinen", bevor sie interagieren — kein Race gegen den initialen `GET /api/routines`-Fetch.
- EC-02 (Formular-Validierung): AC-02-Test befüllt Name, Übungsname UND Sätze/Wdh. vollständig, sonst hätte die eingebaute `RoutineForm`-Validierung den Submit verhindert (verifiziert durch grünen Testlauf — kein hängender Test durch fehlgeschlagene Validierung).
- EC-03 (POST-Response mit `id`): `CREATED_ROUTINE`-Fixture enthält vollständige `id`/`exercises`/`createdAt`-Felder.
- EC-04 (Fehlerfall bleibt im Formular): AC-05-Test verifiziert sowohl das Erscheinen der Fehlermeldung als auch explizit `queryByText('Meine Routinen')` → `null` (kein Rücksprung).
- EC-05 (Garmin-Fetch-Mock): `/api/garmin/activities`-Pattern im Mock abgedeckt, kein Hängenbleiben/Konsolen-Rauschen beobachtet.

## Tech Debt

Keine neuen Einträge.

## Open Items

Keine.

## Test Delta

- Frontend: 21 → 22 Testdateien (neue `App.test.jsx`), 5 neue Tests; Gesamt 784 → 789 Tests
- Alle 789 Tests grün (`npx vitest run`), keine Regressionen
- Backend unverändert (keine Backend-Änderung in dieser Story)
