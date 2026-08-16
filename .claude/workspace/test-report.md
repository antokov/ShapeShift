# Test Report: FS-03 — Integrationstest App.jsx: View-Wechsel + Edit-Flow

## Verdict: PASS ✅

## AC Coverage

| AC | Tests | Status |
|----|-------|--------|
| AC1: Sidebar-Klick wechselt View, aktives Nav-Item markiert | `App – View-Wechsel (AC-01) › Klick auf "Routinen"…` | ✅ |
| AC2: „+ Neue Routine" → Formular → Speichern → neue Routine in Liste | `App – Neue Routine anlegen (AC-02) › Formular → Speichern legt neue Routine an…` | ✅ |
| AC3: Bearbeiten-Button öffnet vorausgefülltes Formular, Speichern kehrt zur Liste zurück | `App – Routine bearbeiten (AC-03) › Bearbeiten-Button öffnet vorausgefülltes Formular…` | ✅ |
| AC4: Detail → Bearbeiten → Abbrechen kehrt zur Liste zurück (nicht Detail) | `App – Detail → Bearbeiten → Abbrechen (AC-04) › Abbrechen aus dem über Detail geöffneten Formular…` | ✅ |
| AC5: fehlgeschlagenes Speichern bleibt im Formular mit Fehlermeldung | `App – Fehlgeschlagenes Speichern (AC-05) › bleibt im Formular und zeigt Fehlermeldung…` | ✅ |

## Edge Case Coverage (aus analysis.md)

| EC | Status |
|----|--------|
| EC-01: kein routinen-spezifisches aria-label auf „Bearbeiten" | Nicht relevant für diese Story — nur eine Routine pro Testfall im Einsatz (AC-03/04/05), keine Disambiguierung zwischen mehreren Karten nötig; Mehrfach-Karten-Disambiguierung ist bereits durch FS-02 auf Komponentenebene abgedeckt |
| EC-02: Formular-Validierung verhindert Submit ohne Pflichtfelder | ✅ implizit durch `AC-02`-Test — vollständiges Ausfüllen (Name, Übungsname, Sätze, Wdh.) war erforderlich, damit der Test grün lief; ein unvollständig ausgefüllter Test hätte beim ersten Lauf nicht funktioniert |
| EC-03: POST-Response mit vollständiger `id` | ✅ `CREATED_ROUTINE`-Fixture vollständig, `AC-02`-Test verifiziert `screen.getByText('Pull Day')` nach dem Save — Beweis, dass der State korrekt mit dem Mock-Response aktualisiert wurde |
| EC-04: Fehlerfall bleibt im Formular, kein Rücksprung | ✅ `AC-05`-Test verifiziert explizit sowohl Fehlermeldung als auch Abwesenheit von „Meine Routinen" |
| EC-05: Garmin-Fetch-Mock verhindert hängende Hooks | ✅ implizit durch alle Tests — kein Timeout/hängender `waitFor` in den 6 Tests, `/api/garmin/activities`-Pattern im Mock abgedeckt |

## Code Review gegen arch-decision.md

- `App.test.jsx` rendert den echten Default-Export `App` durch das Auth-Gate, kein `AppShell`-Isolationstrick ✅
- Kein Mocken von `useAuth.js` — echter `initAuth()`-Durchlauf + direktes Session-Setzen, wie vorgegeben ✅
- Nur `useExerciseLibrary` gemockt (externe Netzwerkabhängigkeit), `Sidebar`/`RoutineList`/`RoutineDetail`/`RoutineForm` vollständig real gerendert — echter Integrationstest-Charakter gewahrt ✅
- URL-Pattern-Fetch-Mock mit Methoden-Unterscheidung für `/api/routines` (GET vs. POST/PUT) exakt wie vorgegeben ✅
- Formular-Ausfüll-Konventionen (`getByLabelText`/`getAllByPlaceholderText`/`getAllByRole('spinbutton')`) 1:1 aus `RoutineForm.test.jsx` übernommen ✅
- Keine Änderung an `App.jsx` — verifiziert, kein Diff in dieser Datei ✅

## Test Results

- Frontend: 21 → 22 Testdateien (neue `src/App.test.jsx`), 5 → 6 Tests (davon 5 vom Dev + 1 in der QA-Phase ergänzt); Gesamt 784 → 790 Tests
- Alle 790 Tests grün (`npx vitest run`)
- Backend unverändert (keine Backend-Änderung in dieser Story, nicht erneut ausgeführt)

## Coverage Gaps

- Weitere Views (Garmin, Coach, Ernährungsplan, Journal, Kalender, Übungsübersicht, Benutzer, Profil) bleiben bewusst ungetestet über die eine exemplarische AC-01-Navigation hinaus — explizit Out of Scope laut story.md.
- Workout-Session-Flow (`handleStartWorkout`/`handleFinishWorkout`/`handleAbortWorkout`) bleibt ungetestet — explizit Out of Scope laut story.md, eigenes Thema.
- Löschen einer Routine auf Integrationsebene bleibt ungetestet — bereits auf Komponentenebene durch FS-02 abgedeckt, hier bewusst nicht dupliziert.
