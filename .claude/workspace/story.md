# Story: FS-03 — Integrationstest App.jsx: View-Wechsel + Edit-Flow (View-State-Machine)

## Story Type
Enabler (Testabdeckung — kein Feature-/Verhaltensänderung)

## User Story
Als **Entwickler, der an der view-State-Machine in `App.jsx` (`AppShell`) arbeitet**,
möchte ich **Integrationstests, die App.jsx als Ganzes rendern (echte `Sidebar`, `RoutineList`, `RoutineDetail`, `RoutineForm` — nicht gemockt) und die Navigation zwischen Views sowie den vollständigen Routinen-Bearbeiten-Flow end-to-end verifizieren**,
damit ich **Regressionen im Zusammenspiel dieser Komponenten erkenne** — Fehler, die bei isolierten Komponententests (z. B. FS-02 für `RoutineList` allein) unsichtbar bleiben, weil dort die Callback-Props gemockt sind, statt die echte `App.jsx`-Verdrahtung (`handleEdit`, `handleSave`, `handleCancel`, `setView`) zu durchlaufen.

Aktuell existiert **keine** Testdatei für `App.jsx` — dies ist die erste.

## Akzeptanzkriterien

1. **Given** die App ist geladen (eingeloggter Nutzer, Standardansicht „Dashboard"),
   **When** ich in der Sidebar auf „Routinen" klicke,
   **Then** wechselt die Ansicht zur Routinenliste (`RoutineList` wird gerendert, Dashboard verschwindet), und der Sidebar-Eintrag „Routinen" ist als aktiv markiert.

2. **Given** ich bin in der Routinenliste,
   **When** ich auf „+ Neue Routine" klicke, einen Namen eingebe und speichere,
   **Then** öffnet sich das leere Formular, nach dem Speichern (erfolgreicher Mock-POST) kehrt die Ansicht zur Liste zurück und zeigt die neu angelegte Routine.

3. **Given** die Routinenliste zeigt eine bestehende Routine,
   **When** ich auf deren „Bearbeiten"-Button klicke,
   **Then** öffnet sich das Formular vorausgefüllt mit den Daten dieser Routine (Name im Eingabefeld, Überschrift „Routine bearbeiten"); nach dem Speichern (erfolgreicher Mock-PUT) kehrt die Ansicht zur Liste zurück.

4. **Given** ich öffne eine Routine aus der Liste (Klick auf die Karte → Detailansicht) und klicke dort auf „Bearbeiten",
   **When** ich anschließend auf „Abbrechen" im Formular klicke,
   **Then** kehrt die Ansicht zur Liste zurück (nicht zur Detailansicht — bestehendes `handleCancel`-Verhalten, das immer `setView('list')` aufruft).

5. **Given** ich bin im Bearbeiten-Formular,
   **When** ich speichere und der Mock-Request fehlschlägt (Backend-Fehler),
   **Then** bleibt das Formular geöffnet und zeigt eine Fehlermeldung („Speichern fehlgeschlagen…"), die Ansicht wechselt **nicht** zur Liste.

## Out of Scope
- Tests für den Login-/Auth-Gate-Flow (`isInitializing`, `LoginView`, `handleNavigate('logout')`) — nur der bereits eingeloggte Zustand wird als Ausgangspunkt vorausgesetzt.
- Tests für alle übrigen Views (Garmin, Mein Coach, Ernährungsplan, Journal, Kalender, Übungsübersicht, Benutzer, Profil) — nur exemplarisch eine View-Wechsel-Navigation (AC-01) zur Verifikation der State-Machine selbst, nicht jede einzelne View.
- Tests für den Workout-Session-Flow (`handleStartWorkout`/`handleFinishWorkout`/`handleAbortWorkout`) — separates Thema, nicht Teil von „view-Wechsel + Edit-Flow".
- Tests für Löschen einer Routine aus der Liste heraus (bereits durch FS-02 auf Komponentenebene abgedeckt, hier nicht erneut auf Integrationsebene).
- Änderungen an `App.jsx` selbst — reine Testabdeckung, kein Bugfix, sofern kein Defekt auffällt.
