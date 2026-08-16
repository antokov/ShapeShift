# BA Analysis: FS-03 — Integrationstest App.jsx: View-Wechsel + Edit-Flow

## Business Rules

**BR-01:** `App.jsx` exportiert nur die Auth-Gate-Komponente `App` (Default-Export); `AppShell` (die eigentliche State-Machine) ist **nicht** separat exportiert. Um `AppShell` zu erreichen, muss der Test durch das echte Auth-Gate rendern (`App` importieren), nicht `AppShell` isoliert importieren — das ist ohnehin im Sinne eines „Integrationstests" (BR entspricht der Story-Intention, nicht nur der State-Machine isoliert, sondern inkl. Auth-Gate-Durchlauf zu testen).

**BR-02:** Der Auth-Gate-Durchlauf lässt sich **ohne Mocken von `useAuth.js`** realisieren: `initAuth()` ist rein `localStorage`-basiert und in der Testumgebung bereits nachweislich funktionsfähig (siehe `useAuth.test.js`, nutzt echtes `crypto.subtle`). Ein Test muss vor dem Rendern lediglich `localStorage` mit einer gültigen Session vorbereiten:
```js
await initAuth();               // bootstrapt admin-User
localStorage.setItem('fitnessapp_session', JSON.stringify({ username: 'admin' }));
```
Danach liefert `getCurrentUser()` synchron `'admin'`, und `App` rendert `AppShell` sofort nach dem `isInitializing`-`useEffect` (kein Mock von `useAuth.js` nötig — echte Auth-Logik läuft mit).

**BR-03:** `AppShell` lädt beim Mount **vier** Daten-Hooks parallel (`useRoutines`, `useWorkouts`, `useCalendar`, `useGarmin(50)`), jeder mit eigenem `fetch()`-Aufruf. Ein Test-Mock für `global.fetch` muss **alle vier** Endpunkte bedienen (`/api/routines`, `/api/workouts`, `/api/calendar`, `/api/garmin/activities?limit=50`), sonst bleiben Hooks im `loading`-Zustand hängen bzw. werfen unbehandelte Promise-Rejections. Zusätzlich müssen `POST /api/routines` (Neu-Anlage) und `PUT /api/routines/:id` (Bearbeiten) im Mock abgedeckt sein, je nach Testfall.

**BR-04:** `RoutineList` zeigt einen Ladezustand (`loading-state`-Text „Routinen werden geladen…"), solange `useRoutines`s initialer `GET /api/routines`-Fetch nicht aufgelöst ist. Tests müssen entsprechend mit `waitFor(...)` auf das Verschwinden dieses Ladezustands bzw. das Erscheinen der Liste warten, bevor sie mit Klicks interagieren (sonst schlägt `getByRole`/`getByText` fehl, weil `RoutineList` noch nicht im „geladen"-Zustand gerendert ist).

**BR-05:** `handleSave` (Zeile 100-113) unterscheidet Neu-Anlage (`editingId === null` → `addRoutine`) von Bearbeiten (`editingId` gesetzt → `updateRoutine`). Beide Pfade laufen nach Erfolg über denselben Code (`setView('list'); setEditingId(null);`), bei Fehler über `setSaveError(...)` **ohne** Navigation. Der Header-Titel des Formulars (`isEdit = Boolean(routine)` in `RoutineForm.jsx`) zeigt „Neue Routine" bzw. „Routine bearbeiten" — direkt aus `editingRoutine` abgeleitet (`editingId ? routines.find(...) : null`), ein zuverlässiger Prüfpunkt für AC-02 vs. AC-03.

**BR-06:** `handleCancel` (Zeile 115-119) navigiert **immer** zu `'list'`, unabhängig davon, ob man über die Liste (`handleEdit`) oder über die Detailansicht (`handleEditFromDetail`) ins Formular gelangt ist. Das ist **bestehendes, bereits im Code fixiertes Verhalten** (nicht als Bug zu behandeln) — AC-04 verifiziert genau das, nicht eine „Zurück-zur-Detailansicht"-Erwartung.

## Edge Cases

**EC-01:** Der Bearbeiten-Button auf der Routine-Karte in `RoutineList` hat **kein** routinen-spezifisches `aria-label` (identisch „Bearbeiten" für alle Karten, siehe FS-02-Analyse) — bei mehreren Routinen in der Test-Fixture muss über `getAllByRole('button', { name: 'Bearbeiten' })[index]` disambiguiert werden, exakt wie in `RoutineList.test.jsx` (FS-02) bereits etabliert.

**EC-02:** Nach dem Öffnen des Formulars über „+ Neue Routine" ist `editingRoutine === null`, das Namensfeld ist leer — ein Name muss im Test aktiv eingegeben werden, sonst verhindert `RoutineForm`s eigene Validierung (`errors.name`) das Absenden (Submit-Handler ruft `validate()` auf, bei Fehlern kein `onSave`-Aufruf). Mindestens eine Übung ist ebenfalls Pflicht (`errors.exercises`) — die Standard-`exercises`-Initialisierung in `RoutineForm` enthält bereits eine leere Übungszeile (`useState(() => [emptyExercise()])` wenn `!routine`), diese muss im Test mit gültigen Werten (Name, Sätze, Wdh.) befüllt werden, sonst schlägt die Validierung fehl und der Test-Flow für AC-02 kommt nie bei `onSave`/POST an.

**EC-03:** Der Mock für `POST /api/routines` muss ein vollständiges Routine-Objekt inkl. `id` zurückgeben (analog zu `RoutineList.test.jsx`s `useRoutines`-Tests, `CREATED_ROUTINE`-Fixture), da `addRoutine()` den Rückgabewert direkt in den lokalen State übernimmt (`setRoutines((prev) => [...prev, created])`) — ohne `id` im Mock-Response würde die neue Routine zwar in der Liste erscheinen, aber mit `undefined` als `key`/`id`, was zu React-Warnungen (nicht zwingend zu Test-Fehlern) führen kann.

**EC-04:** Fehlschlagender Save (AC-05) — der Mock für `PUT /api/routines/:id` muss einen Fehlerstatus (z. B. `500` oder `ok: false`) liefern, damit `apiFetch` in `useRoutines.js` `throw new Error(...)` auslöst, was `handleSave`s `catch`-Block über `setSaveError(...)` abfängt. Der Test muss danach verifizieren, dass **weiterhin** das Formular sichtbar ist (`view` bleibt `'form'`) und **nicht** `RoutineList` (kein Rücksprung zur Liste bei Fehler).

**EC-05:** `useGarmin(50)` fetcht `/api/garmin/activities?limit=50` beim Mount von `AppShell`, unabhängig davon, welche View initial aktiv ist (Hook wird immer aufgerufen, da `AppShell` selbst — nicht die einzelnen View-Komponenten — die Daten lädt und als Props durchreicht). Fehlt dieser Endpoint im Fetch-Mock, bleibt der Hook im `loading`-Zustand hängen, was für die hier getesteten Flows (Routinen-Liste/Formular) irrelevant ist, aber dennoch sauber gemockt werden muss, um unbehandelte Fetch-Fehler/Konsolen-Rauschen in Tests zu vermeiden.

## Data Model Implications

Keine — reine Frontend-Testdatei (`src/App.test.jsx`, neu), keine Produktionscode- oder Datenmodelländerung.

## Open Questions

**Q-01 (NON-BLOCKING):** Soll der Test-Fetch-Mock URL-Pattern-basiert (wie `mockFetchByUrl` in `GarminView.test.jsx`) oder Sequenz-basiert (wie `mockFetchSequence` in `RoutineList.test.jsx`s `useRoutines`-Tests) aufgebaut sein?
→ Assumption: URL-Pattern-basiert (`mockFetchByUrl`-Stil) — robuster gegenüber der tatsächlichen Aufruf-**Reihenfolge** der vier parallel startenden Hooks (`useRoutines`/`useWorkouts`/`useCalendar`/`useGarmin` feuern ihre Fetches nicht garantiert in fester Reihenfolge), zusätzlich mit Sonderbehandlung für Methode (`GET` vs. `POST`/`PUT`) pro Pfad, da `/api/routines` sowohl für den initialen `GET` als auch für `POST`/`PUT` im selben Testlauf gemockt werden muss.

**Q-02 (NON-BLOCKING):** Soll `crypto.subtle`/`initAuth()` in jedem Test real durchlaufen werden (langsamer, aber realistisch) oder soll die Session direkt ohne `initAuth()`-Aufruf vorbereitet werden?
→ Assumption: `initAuth()` real aufrufen (BR-02) — Kosten sind minimal (SHA-256 einmalig pro Test), und es deckt zusätzlich ab, dass der Auth-Bootstrap-Pfad mit dem AppShell-Rendering zusammenspielt, was dem Integrationstest-Charakter der Story entspricht.
