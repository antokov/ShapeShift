# Project Backlog

## 🔴 Technical Debt
<!-- Format: - [ ] TD-XX: description (introduced in: feature name, file: path) -->


---

## 🟡 Follow-up Stories
<!-- Format: - [ ] FS-XX: description -->

### Garmin
- [ ] FS-53: Garmin-Aktivitäten — dauerhafter Import in DB (aktuell ephemer/virtuell via mapGarminToEntry(); keine Persistenz; Garmin-Einträge im Journal verschwinden nach Refresh) (referenced in: FS-20)

### Workout / Geführtes Training
- [ ] FS-41: Satzanzahl — Max-Cap konfigurierbar machen (aktuell unbegrenzt; WorkoutSession erlaubt beliebig viele +/− Klicks)
- [ ] FS-42: Satzanzahl — angepasste Satzanzahl ins nächste Workout übernehmen ("zuletzt: 4 Sätze")
- [ ] FS-59: Geführtes Workout — Konfigurierbare Pausenzeit (Standard 60 s, einstellbar z.B. 30/60/90 s)
- [ ] FS-60: Geführtes Workout — Vorschläge aus letztem Workout ("letztes Mal: 80 kg / 8 Wdh.") in exercise phase
- [ ] FS-61: Geführtes Workout — Vibration-API / Audio-Signal nach Pause-Ende (native Browser)
- [ ] FS-38: Workout-Tracking — Gewicht/Wdh. pro Satz statt pro Übung (detaillierteres Tracking)
- [ ] FS-40: Workout-Tracking — Bewertungshistorie im Journal (alle Übungs-Ratings sehen, nicht nur Durchschnitt)
- [ ] FS-99: Übungsbilder-Wechsel — sanfter CSS-Fade-Übergang (opacity 0→1, ~300ms) zwischen den beiden Bildern (Out of Scope in Bildwechsel-Feature 2026-06-19)

### Journal
- [ ] FS-32: Journal — Sortierung/Filterung nach Datum oder Routine
- [ ] FS-33: Journal — Wochenstatistik (Trainingsvolumen pro Woche im Journal)
- [ ] FS-34: Journal — E2E-Test WorkoutSession → Journal auto-save flow
- [ ] FS-48: Journal Bearbeiten — exerciseData-Vorausfüllung testen (workoutToExDetails mit storedById-Match, E2E)
- [ ] FS-54: Journal Split View — Löschen aus dem Panel heraus (Delete-Button im Panel; derzeit nur auf der Karte)
- [ ] FS-55: Journal Split View — Mobile/Responsive Breakpoint: Split View unter ~768px zu Vollbild-Overlay kollabieren (aktuell nur 600px-Breakpoint für Padding)

### Dashboard
- [ ] FS-45: Dashboard — "Letzte Trainings" Einträge klickbar machen (Navigation ins Journal zum entsprechenden Eintrag)
- [ ] FS-46: Dashboard — Wochenziel-KPI (Soll-Ist Trainingsanzahl pro Woche, konfigurierbar)
- [ ] FS-51: Welcome-Kachel — UTC-Datum-Edge: `startedAt.slice(0,10)` liefert UTC-Datum; bei abendlichen Trainings (MEZ+1) fällt es auf den nächsten Tag. Fix: lokale Datumskomponenten statt `slice(0,10)`.
- [ ] FS-52: Welcome-Kachel — klickbar machen: "Heute geplant" → Kalender; "Heute erledigt" → Journal-Eintrag
- [ ] FS-95: Dashboard Garmin Health — Trend-Vergleich (gestern vs. 7-Tage-Durchschnitt) für Schritte/Schlaf/Ruhepuls

### Routinen & Übungen
- [ ] FS-82: Routinen drucken — `@media print` Sidebar-Ausblendung visuell testen (jsdom kann CSS @media print nicht rendern; Playwright E2E nötig)
- [ ] FS-01: Übungsreihenfolge per Drag & Drop änderbar machen (aktuell: fix wie eingegeben)
- [ ] FS-16: Übungsbibliothek — ESC-Taste schließt Picker (Keyboard-Accessibility)
- [ ] FS-17: Nutzerdefinierte Übungen zur Bibliothek hinzufügen
- [ ] FS-35: Routinen exportieren — bestehende Routinen als JSON-Datei herunterladen (Gegenstück zum Import)
- [ ] FS-36: Import-Vorschau — importierte Routinen vor dem Speichern anzeigen und einzeln deselektieren

### Benutzerverwaltung
- [ ] FS-89: Passwort ändern — eigenes Passwort in UsersView oder Profil ändern können (Out of Scope in FS-88)
- [ ] FS-90: Datenisolation für Garmin-Tokens — aktuell globaler Token-Cache; bei Mehrfachnutzern ggf. je User trennen

### Profil
- [ ] FS-100: Geschlecht im Coach-Prompt — `profile.geschlecht` in `build_coach_prompt()` einbauen (personalisierte Ansprache + trainingsrelevante Hinweise) (Out of Scope in Geschlechtsauswahl-Feature 2026-06-19)
- [ ] FS-29: Mein Profil — Equipment-Filter in der Übungsbibliothek (nur Equipment-kompatible Übungen zeigen); Voraussetzung erfüllt: Equipment speichert jetzt API-Keys direkt (barbell/cable/etc.)
- [ ] FS-31: Mein Profil — Routine-Empfehlungen basierend auf gewählten Zielen
- [ ] FS-56: Gewichtslogger — BMI aus Gewichtsverlauf + Körpergröße (Profilfeld) berechnen und anzeigen
- [ ] FS-57: Gewichtslogger — Ziel-Gewicht setzen + Differenz-Anzeige im Chart

### Tests & Qualität
- [ ] FS-04: Integrationstest RoutineList → onView Click (`.routine-card__info--clickable`)
- [ ] FS-05: Integrationstest App.jsx view='detail' Wechsel (Basis-Navigation zu 'detail' bereits als Zwischenschritt in FS-03s App.test.jsx abgedeckt — hier fehlen noch dedizierte Tests für z. B. handleBackFromDetail, viewingRoutine-Null-Safety)
- [ ] FS-06: Integrationstest App.jsx async handleSave (Frontend+Backend end-to-end)
- [ ] FS-07: saveError-Anzeige in RoutineForm testen (gemockter Fetch-Fehler) — inhaltlich bereits durch FS-03s App.test.jsx AC-05 abgedeckt (PUT schlägt fehl → saveError sichtbar, Formular bleibt offen); dieses Item bleibt offen für einen zusätzlichen isolierten RoutineForm-Komponententest mit direkt gesetztem saveError-Prop, falls gewünscht
- [x] FS-09: Unit-Tests für Sidebar.jsx (aktiver NavItem-State, disabled Items, onNavigate-Callback) ✓ implementiert (2026-06-19)
- [ ] FS-10: E2E-Test Navigationsfluss: Dashboard → Routinen → Routine anlegen → zurück zum Dashboard
- [ ] FS-11: Unit-Tests für RoutineDetail Stat-Badge-Klassen (--reps, --duration, --sets) — fehlen in RoutineDetail.test.jsx
- [ ] FS-12: Unit-Tests für RoutineList Grid-Layout und Empty-State SVG
- [ ] FS-37: Clipboard-Fallback-Test — `execCommand`-Kopier-Fallback in Browser-Tests (jsdom-Limitation)
- [ ] FS-49: Export — E2E-Test für vollständigen Download-Flow (jsdom unterstützt createObjectURL nicht — Playwright nötig)
- [ ] FS-50: Export — selektiver Export (nur letzte 30/90 Tage wählbar)

### Orphans (brauchen neue Heimat)
- [ ] FS-15: Volumen-Chart pro Übung über Zeit ⚠ ORPHAN: Fortschritt-Menüpunkt wurde 2026-06-13 entfernt. Feature braucht neue Heimat (z.B. Dashboard-Tab oder Journal-Statistik) bevor implementierbar.

---

## 🟢 Feature Ideas
<!-- Format: - [ ] FI-XX: description -->
- [x] FI-04: Mein Coach — sleepDuration + averageStressLevel in `fetchGarminHealthHistory()` ergänzen ✓ implementiert (2026-06-16, auch intensityMinutes ergänzt)
- [ ] FI-05: useCalendar-Hook Tests — `src/hooks/useCalendar.js` hat kein `.test.js`-Pendant; `getEventsForDate()` + optimistisches UI-Update sind testbar

---

## 🔵 Open Questions
<!-- Unresolved assumptions from BA analysis -->

---

## 🏛️ Architecture Log
<!-- One-line per feature: key structural decision made -->

- **2026-08-05** — App.jsx Integrationstests (FS-03): erste Testdatei für `App.jsx` (`src/App.test.jsx`), bisher komplett ungetestet; rendert den echten `App`-Default-Export durch das Auth-Gate statt `AppShell` isoliert zu testen (kein separater Export nötig) — Login simuliert über echten `initAuth()`-Aufruf + direktes Setzen von `fitnessapp_session` in localStorage, **kein** Mock von `useAuth.js`; einziger Mock ist `useExerciseLibrary` (externe GitHub-Netzwerkabhängigkeit in `RoutineForm`) — `Sidebar`/`RoutineList`/`RoutineDetail`/`RoutineForm` laufen vollständig real; URL-Pattern-Fetch-Mock mit GET/POST/PUT-Unterscheidung deckt alle 4 parallel ladenden `AppShell`-Hooks ab; 6 Tests decken View-Wechsel, Neuanlage, Bearbeiten, Detail→Bearbeiten→Abbrechen (bestätigt: `handleCancel` geht immer zu 'list', nie zurück zu 'detail'), Sidebar-Navigation während offenem Formular, und fehlgeschlagenes Speichern ab; deckt inhaltlich auch einen Teil von FS-05 (Detail-Navigation) und FS-07 (saveError-Anzeige) ab, beide bleiben aber als eigenständige, engere Backlog-Items bestehen; 790 Frontend-Tests gesamt (21→22 Testdateien), alle grün.
- **2026-08-05** — RoutineList Löschen/Bearbeiten-Tests (FS-02): reine Testabdeckungs-Story, kein Produktionscode-Diff (`handleDelete`/`onEdit`-Wiring bereits korrekt); neue `describe('RoutineList – Löschen & Bearbeiten', …)`-Gruppe nutzt bestehende `renderList()`-Helper + `ROUTINES`-Fixture; Disambiguierung zwischen Karten über `getAllByRole(...)[index]`, da weder Löschen- noch Bearbeiten-Button ein routinen-spezifisches aria-label tragen (im Gegensatz zum Drucken-Button, der `aria-label={`${routine.name} drucken`}` hat); `window.confirm` lokal pro Test gemockt (`vi.spyOn`), kein globaler Mock, konsistent mit `JournalView.test.jsx`; 10 neue Tests (36→46 in `RoutineList.test.jsx`), 784 Frontend-Tests gesamt, alle grün.
- **2026-08-05** — Garmin Historien Tooltip (FS-25): `MetricLineChart` bekommt neue `unit`-Prop (von `MetricDetail` aus `METRIC_META[metric].unit` durchgereicht, vorher nur an `MetricSummary` weitergegeben); pro Datenpunkt mit `value != null` ein unsichtbarer Hit-Circle (`r=10`, `fill="transparent"`, Klasse `.metric-chart-hit`) mit nativem SVG-`<title>`-Kindelement (`TT.MM.JJJJ: Wert Einheit`) — kein neuer State/Event-Handler/Tooltip-Overlay, konsistent mit dem bereits etablierten `title`-Attribut-Muster bei `sleep-bar__*`; Hit-Circle-Schicht läuft unabhängig von `showDots` (funktioniert auch bei 28 Datenpunkten/4-Wochen-Ansicht, wo keine sichtbaren Punkt-Marker gezeichnet werden) und steht im DOM nach den sichtbaren Punkten (Z-Order); 6 neue Tests (49→55 in `GarminView.test.jsx`), 774 Frontend-Tests gesamt, alle grün.
- **2026-08-05** — FS-23 (Garmin SpO2-Karte) aus Backlog entfernt: Item war selbstwidersprüchlich (Titel forderte Umsetzung, eigene Notiz sagte „Out-of-Scope bis Sensor verbreitet" — bewusste Entscheidung vom 2026-06-16 beim HRV-Split). `garminconnect`-Library exponiert zwar `get_spo2_data()` (technisch machbar), aber die vorherige Produktentscheidung wurde nicht revidiert; auf Rückfrage bestätigt der Nutzer die Entfernung statt Umsetzung — kein Code geändert.
- **2026-08-05** — Garmin Datum-Navigation-Tests (FS-21): reine Testabdeckungs-Story, kein Produktionscode-Diff (`goDay()`/`useGarminHealth()`/`useGarminHRV()` bereits korrekt); neuer Mock-Helper `mockHealthByDate(dateToBody)` in `GarminView.test.jsx` matched den `date`-Query-Parameter per Regex aus der Fetch-URL (statt wie der bestehende `mockFetchByUrl()` nur auf URL-Teilstrings), ermöglicht datumsabhängige Mock-Antworten für echte Klick→Fetch→Re-Render-Tests; alle Testdaten relativ zu `todayISO()`/`addDays()` berechnet statt hartkodiert; 7 neue Tests (Klick-Navigation, Round-Trip, disabled-Grenzfall, kumulative 3-Tage-Navigation, 503- und generischer Fehlerzustand, Datumslabel-Änderung); 42→49 Tests in `GarminView.test.jsx`, 768 Frontend-Tests gesamt, alle grün.
- **2026-08-05** — Mein Coach Trainingsplan-Vorschlag (FS-74): Backend `build_training_plan_prompt(req: CoachReportRequest)` (wiederverwendet bestehendes Request-Modell, keine Adherenz-Pflicht-Logik — vorwärtsgerichteter Vorschlag statt rückwärtsgerichteter Analyse) + `POST /api/coach/plan` (Response-Feld `"plan"`, nicht `"report"`); Frontend `CoachView.jsx`: `isLoading`-Boolean → `loadingAction` (`null|'bericht'|'trainingsplan'`), gemeinsame `buildCoachPayload()` extrahiert aus bisherigem `handleGenerateReport`, generischer `handleGenerate(type)`-Handler; beide Historientypen (Zwischenbericht/Trainingsplan) teilen sich Liste + localStorage-Key `fitnessapp_{username}_coach_reports`, unterschieden über neues `type`-Feld — fehlendes `type` bei Alteinträgen gilt als `'bericht'` (volle Rückwärtskompatibilität, keine Migration); 9 neue Backend-Tests (160→169), 19 neue Frontend-Tests in `CoachView.test.jsx` (51→70); 761 Frontend- + 169 Backend-Tests gesamt, alle grün.
- **2026-08-05** — Journal Bearbeiten Fehlermeldung (FS-47): `saveError`-State bewusst **lokal** in `JournalView` gehalten (nicht als Prop von `App.jsx` wie bei `RoutineForm`), da `JournalView` `addWorkout`/`updateWorkout` selbst orchestriert statt an den Parent zu delegieren; `handleSubmit`'s bestehender `try/finally` bekommt einen `catch`-Zweig, Erfolgs-Reset bleibt exklusiv im `try`; Reset zusätzlich in `handleOpenNewEntry`/`handleEdit`/`handleCancel`; neue Klasse `.journal-form__save-error` in `JournalView.css` statt `RoutineForm.css`-Import; 8 neue Tests (83→91 in `JournalView.test.jsx`); 742 Frontend-Tests gesamt, alle grün.
- **2026-08-05** — Letztes Gewicht als Vorschlag in WorkoutSession: `getLastKnownWeight(exerciseName, workouts)` (Modulfunktion) durchsucht die bereits DESC-sortierte `workouts`-Liste, parst `exerciseData` JSON und matched über normalisierten `name` (nicht `id`, da Übungs-IDs pro Routinen-Zeile zufällig generiert werden); Prefill erfolgt einmalig im `useState`-Initializer des `exercises`-State (gleiches Pattern wie `actualReps: ex.reps ?? ''`), kein `useEffect` nötig; neue optionale Prop `workouts = []` an `WorkoutSession`, durchgereicht aus dem in `App.jsx` bereits geladenen `useWorkouts`-Hook; 12 neue Tests (87→99 in `WorkoutSession.test.jsx`); 734 Frontend-Tests gesamt, alle grün.
- **2026-06-21** — Garmin-Normalisierung: `_map_health` filtert `restingHeartRate ≤ 0` und `averageStressLevel < 0` zu `None`; `_fetch_stats_history` filtert negative Werte + vo2MaxValue=0.0; `_fetch_body_battery_history` parst dict-Format mit `"date"`+`"bodyBatteryValuesArray"` und unix-ms-Timestamps; `_fetch_intensity_history` clampt vigorous/moderate ≥ 0; 20 neue Backend-Tests; 140→160.
- **2026-06-21** — useExerciseLibrary Tests (TD-10): `useExerciseLibrary.test.js` (NEU); 22 Tests für `getExerciseImage`/`getExerciseImages`/`getExerciseInstructions` (sync) + `useExerciseLibrary` Hook (async, `vi.resetModules()`+dynamischer Import für Cache-Isolation); 699→721 Frontend-Tests, 20→21 Testdateien.
- **2026-06-21** — Calendar API Tests (TD-09): 14 pytest-Tests für GET/POST/DELETE `/api/calendar`; `CALENDAR_SINGLE`/`CALENDAR_SERIES` Konstanten; `client_with_event` Fixture; User-Isolation-Tests mit `X-User-Id`-Header; 126→140 Backend-Tests grün.
- **2026-06-21** — WeekPlan Dead Code Cleanup (TD-07+TD-08): `WeekPlan.jsx`/`.css`/`.test.jsx` + `useWeekPlan.js` gelöscht; `week_plan`-Tabelle + `get_week_plan()`/`save_week_plan()`/`_DAYS`/`_EMPTY_PLAN` aus `database.py` entfernt; 3 fehlschlagende Backend-Tests gelöscht; Frontend 699/699 (20 files), Backend 126/126; CLAUDE.md aktualisiert.
- **2026-06-21** — Gewichtslinie verbundene Punkte (Bug Fix): `_pathStarted`-Boolean in `LineChart.pathD` ersetzt `prevValid = data[i-1].value != null`; alle nicht-null Punkte nach dem ersten erhalten L statt M; pre-existing TD-01-Tests rect→circle korrigiert; 5 neue Tests; 708/708 grün.
- **2026-06-19** — Dashboard Export-Button entfernen: `buildExportPayload/downloadJson/fetchGarminHealth/CLAUDE_PROMPT`-Import entfernt; `exporting/showExportPrompt/copied` States entfernt; `handleExport()/handleCopyPrompt()` entfernt; Export-Button-JSX + Prompt-Panel-JSX entfernt; 6 CSS-Klassen entfernt (`.dashboard__export-btn`, `.dashboard__prompt-*`); `vi.mock(exportData)` + `describe('Export ...')` (9 Tests) aus Dashboard.test.jsx entfernt; `waitFor`-Import entfernt; 703/703 grün.
- **2026-06-19** — Übungsübersicht UX: volle Breite (`max-width` entfernt); `FilterRow`+Chips → single-line `<select>`-Bar (5 Controls in einem Flex-Row); `.exercise-card__thumb` (155px, object-fit:cover) + SVG-Platzhalter bei fehlendem Bild; `expandedId` → `expandedExercise` (Objekt); `ExerciseModal` (position:fixed, z-index:1000, Backdrop+Escape+×); sekundäre Muskeln als grau-Badge im Modal; 47 Tests; 712/712 grün.
- **2026-06-19** — Übungsübersicht: `ExerciseLibraryView.jsx` + `.css` (NEU); 5 Filter (Suche/Kategorie/Level/Equipment/Muskelgruppe) via `useMemo`; Pagination `limit`-Slice (PAGE_SIZE=30); Single-Expand mit Anweisungen + Bild; nur `useExerciseLibrary()` verwendet (kein eigener Fetch); 'exercises' View-State in App.jsx + Guard; `NAV_GROUPS[0]` (Training) +4. Item; lila Icon (#9c27b0); 29 neue Tests; 703/703 grün.
- **2026-06-19** — Equipment auf API-Werte begrenzen: `EQUIPMENT_CATEGORIES` (6 Gruppen, 37 Items) → `EQUIPMENT_OPTIONS` (12 `{value,label}` API-Keys); `EquipmentSection` entfernt; `ChipGroup` rückwärtskompatibel auf `{value,label}[]` erweitert; localStorage speichert API-Keys; Tests angepasst; 674/674 grün.
- **2026-06-19** — Dashboard standalone in Sidebar: `DASHBOARD_ITEM` aus NAV_GROUPS herausgelöst; als `<li class="sidebar__standalone">` vor den Gruppen gerendert; `NavButton` Hilfskomponente extrahiert; `.sidebar__standalone { margin-bottom: 16px }`; Training-Gruppe hat jetzt 3 Items; Test angepasst; 674/674 grün.
- **2026-06-19** — Kontrastreicher Chip-Auswahlzustand: `.chip--active` + `.nutrition-chip--selected/food-mag/food-mag-nicht` von `rgba`-Transparenz auf Solid-Fill (`#5c6bc0`/`#4caf50`/`#ef4444`) + `color:#fff` umgestellt; 673/673 grün.
- **2026-06-19** — Geschlechtsauswahl in Mein Profil: `geschlecht: null` in DEFAULT_PROFILE; `GESCHLECHT`-Konstante + `SingleChipGroup` im "Über mich"-Abschnitt (nach profile-grid); kein neues CSS; 9 neue Tests; 673/673 grün.
- **2026-06-19** — Sidebar-Gruppenstruktur: `NAV_ITEMS` (flat) → `NAV_GROUPS` (3 Gruppen: Training/Gesundheit/Verwaltung); `.sidebar__group-label` (10px, 600, uppercase, rgba(255,255,255,0.3)); `.sidebar__group-nav` innere list; `Sidebar.test.jsx` neu (10 Tests, schließt FS-09); 664/664 grün.
- **2026-06-19** — Übungserklärung Toggle in WorkoutSession: `showInstructions`-State (false); Reset im bestehenden Interval-Effect `[phase, activeExIdx]`; Instructions-IIFE → Toggle-Button + bedingte `<ol>`; `.workout-step__instructions-toggle` CSS (Indigo-Akzent); 9 neue Tests; 654/654 grün.
- **2026-06-19** — Übungsdetail-Expand in RoutineDetail: `useExerciseLibrary`+`getExerciseImage`+`getExerciseInstructions` in RoutineDetail.jsx; `expandedId`-State (Toggle, single-expand); IIFE-Pattern konsistent mit WorkoutSession; bestehende CSS-Klassen `exercise-item--expandable/__toggle/__toggle--open` wiederverwendet; 3 neue CSS-Klassen; 11 neue Tests; 651/651 grün.
- **2026-06-19** — Übungsbild unkeschneiden: `max-height`+`object-fit:cover` → `height:auto; display:block`; Bild skaliert jetzt auf Containerbreite bei nativer Höhe, kein Clipping; 640/640 grün.
- **2026-06-19** — Vollbild-Bild + Übungsanweisungen: `getExerciseInstructions()` als Named Export in `useExerciseLibrary.js`; `.workout-step__ex-img` auf `object-fit:cover` + kein `background` (grauer Rand weg); Anweisungs-IIFE nach Bild-IIFE im exercise-Phase-Render; `.workout-step__instructions ol/li` CSS; 6 neue Tests; 640/640 grün.
- **2026-06-19** — Abwechselnde Übungsbilder: `getExerciseImages()` als neuer Named Export in `useExerciseLibrary.js`; `imgIdx`-State + `setInterval`-Effect in WorkoutSession (deps: `[phase, activeExIdx]`, `libExercises` bewusst ausgeschlossen wegen Mock-Instabilität und module-cache-Stabilität in Production); IIFE-Pattern für Render-Block erhalten; 6 neue Tests; 634/634 grün.
- **2026-06-18** — Übungsbilder in WorkoutSession: `getExerciseImage(name, exercises)` als Named-Export in `useExerciseLibrary.js`; case-insensitiver Name-Lookup; `IMAGE_BASE` + `images[0]` aus free-exercise-db; IIFE-Pattern für inline imgUrl; `loading="lazy"` + `onError`-Handler; 628/628 grün.
- **2026-06-18** — URL-Fix useExerciseLibrary: `yuhonas.github.io`-URL → `raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json` (dokumentierter Endpunkt laut Repo-README); 625/625 grün.
- **2026-06-18** — free-exercise-db Integration: `useExerciseLibrary.js` mit module-level Cache; kein API-Key, kein Backend-Proxy; `exerciseLibrary.js` + `exerciseDesc.js` + Tests gelöscht; Picker grouped by `primaryMuscles[0]`; Cardio-Filter via `category === 'cardio'`; Equipment als Kurzinfo-Text; 625/625 grün.
- **2026-06-18** — Dashboard CTA + Trends + Garmin Health: `makeTrend()` pure function + `computeKpis()` mit Vorwochenvergleich (fourteenDaysAgo); `computeTodayContext()` +`plannedEvents`; `startableEvents`-Filter gegen routines; `useGarminHealth()` direkt in Dashboard.jsx (kein Prop-Drilling); `dashboard__welcome-right` Wrapper löst `margin-left:auto` auf `welcome-minutes` ab; 31 neue Tests; 652/652 grün.
- **2026-06-16** — Ernährungsplan Prompt-Fix (FS-94): `build_nutrition_prompt()` überarbeitet — `fruehstueck_hinweis`+`snack_hinweis` je Ernährungsform; neuer MAHLZEIT-REGELN-Block mit ❌-Verbot für Fleisch+Beilage zum Frühstück; Präferenz-Instruktion von "Pflicht" zu "Orientierung" (WO SINNVOLL, freie Wahl erlaubt); Framing "kulinarischem Feingefühl"; harte Einschränkung nur für lebensmittelMagNicht; Abwechslungs-Instruktion; 626/626 grün.
- **2026-06-16** — Ernährungsplan (FS-93): `foodLibrary.js` (ERNÄHRUNGSFORMEN/ALLERGENE/FOOD_CATEGORIES); `useNutrition.js` (localStorage `fitnessapp_{u}_nutrition_settings`, DEFAULT_SETTINGS, isSetupDone=`ernährungsform!==null`); `NutritionView.jsx` (5-Schritt-Wizard mit `isEditing`-Pattern statt resetSetup; 3-State FoodChip neutral→mag→mag-nicht; `parsePlanSections()` splits `## ` → DayPlanCard/Einkaufsliste-Tab); `POST /api/nutrition/plan` (NutritionPlanRequest, `_get_day_training()` für 7-Tage-Trainingskontext, `build_nutrition_prompt()`, claude-haiku-4-5-20251001, max_tokens=4000); Pläne in localStorage `fitnessapp_{u}_nutrition_plans`; `computeAutoCalories()` base=1800+tage×100 ±goal-delta; 22 neue Tests; 626/626 grün.
- **2026-06-16** — Profil in Sidebar-Fußzeile: `{ id: 'profile' }` aus NAV_ITEMS entfernt; `sidebar__user-info` div → `<button className="sidebar__user-btn">` mit `onNavigate('profile')` + active-state via `view === 'profile'`; `.sidebar__user-info` CSS ersetzt durch `.sidebar__user-btn` + hover/active; kein nested-button-Problem (logout bleibt Geschwister); 606/606 grün.
- **2026-06-16** — Coach Datenanreicherung: `CoachReportRequest` +`garmin_hrv`; neue Hilfsfunktionen `_fmt_pace()`, `format_routines()`, `format_garmin_hrv()`; `format_garmin_health()` +vo2max/Intensitätsminuten/Stockwerke; `_HEALTH_HISTORY_LABELS` +sleepDuration/averageStressLevel/intensityMinutes; `_fmt_garmin_line()` mit Distanz/HF/Pace; `_fmt_workout_line()` mit exerciseData-Parse (8 Übungen, Kraft/Cardio); Prompt +Routinen-Sektion +HRV-Sektion; `fetchGarminHRV()` in exportData.js; CoachView +`garminHrv` in Promise.all und Request-Body; CoachView.test.jsx +Mock; 606/606 grün.
- **2026-06-16** — Vollständige Garmin-Daten: `_map_health()` + `_map_activity()` um neue Felder erweitert (VO2max, Intensitätsminuten, Stockwerke, maxHR, elevationGain, avgSpeed→pace, cadence); `get_activity_detail()` + `get_hrv()` in garmin_service.py; 2 neue Endpoints (`GET /api/garmin/activities/{id}`, `GET /api/garmin/hrv`); `useGarminActivityDetail(id)` + `useGarminHRV(date)` Hooks; GarminView: 10 Health-KPIs, HrvCard, klickbare ActivityCard → ActivityDetailView mit SplitsTable; Journal: GarminEntryDetail mit erweiterter Stats-Zeile + Splits-Fetch; alle Guards (hasattr, try/except, 0.0→None); 606/606 grün.
- **2026-06-16** — Benutzerverwaltung (FS-88): Browser-side auth via Web Crypto API (SHA-256+salt); `useAuth.js` mit initAuth/login/logout/createUser/deleteUser; `fitnessapp_users`+`fitnessapp_session` in localStorage; alle Hook-Keys auf `fitnessapp_{username}_{type}` umgestellt; `X-User-Id` Header für Backend-Isolation; `user_id` Spalte auf routines/workouts/calendar_events (idempotente Migration); App-Gate: isInitializing→LoginView→AppShell; Sidebar: User-Display + Logout-Icon + "Benutzer"-NavItem; 32 neue Tests (useAuth + LoginView); 606/606 grün.
- **2026-06-16** — Geburtstag statt Alter (Mein Profil): `alter` aus DEFAULT_PROFILE entfernt → `geburtsdatum: null`; `computeAge()` in UserProfile.jsx; Alter-Hint `.profile-field__hint` unterhalb date-Input; `_compute_age_from_birthday()` in main.py für Coach-Prompt; 6 neue Tests; 570/570 grün.
- **2026-06-16** — Mein Profil volle Content-Breite: `max-width:760px` aus `.user-profile__sections` entfernt; `flex-direction:column` → `display:grid; grid-template-columns:repeat(2,1fr); gap:24px`; neuer Breakpoint 768px→1col; bestehender 600px-Breakpoint (Padding) erhalten; reine CSS-Änderung, 564/564 grün.
- **2026-06-16** — Coach-Übersicht Kachel-Grid: `.coach-report-list` auf `repeat(4,1fr)` Grid; `ReportListItem` von horizontal (Zeile) auf vertikal (Card) umgestellt; `__info`+`__right` → `__date`, `__preview`, `__footer`; Breakpoints 900px→2col, 600px→1col; 564/564 grün.
- **2026-06-16** — Coach volle Content-Breite: `max-width:860px` + `margin-inline:auto` aus `.coach-page` entfernt; padding auf 32px 40px erhöht; `.coach-detail__sections` auf `repeat(4,1fr)` + Breakpoints 900px→2col, 600px→1col; 564/564 grün.
- **2026-06-16** — Bericht-Kacheln Grid-Layout (TD): `.coach-detail__sections` von `flex-direction:column` auf `display:grid; grid-template-columns:repeat(auto-fill, minmax(185px, 1fr)); gap:12px` umgestellt; `@media (max-width:600px) → 1fr`; max 4 Kacheln nebeneinander bei 796px Content-Breite; reine CSS-Änderung, 564/564 grün.
- **2026-06-16** — Coach-Bericht Übersichtsseite (FS-85): `selectedReport: null|report` State-Machine in CoachView; `null` = Übersicht (`.coach-report-list-item` kompakte Karten), `report` = Detailansicht (`.coach-detail` + SectionCards); `ReportListItem` als `<button>` mit Datum, erstem Kapitel-Titel, Kapitel-Count + Chevron; `ReportDetailView` mit "← Übersicht" (ghost) + "Löschen" (danger); nach Generierung auto-open via `setSelectedReport(newReport)`; 51 CoachView-Tests; 564/564 grün.
- **2026-06-16** — Coach-Bericht redesign (FS-75): Chat-UI vollständig entfernt (Textarea, Senden-Button, messages-Array, /api/coach/chat Frontend-Aufruf); `parseReportSections()` teilt Markdown per `## ` in `{title, lines}[]`; `SectionCard` rendert jedes Kapitel als eigene Kachel (Card-Design-System); `ReportEntry` mit ISO-Datum-Header + Löschen-Button; localStorage `fitnessapp_coach_reports` als `[{id, createdAt, text}]`, neuester zuerst; 37 neue Tests; 555/555 grün.
- **2026-06-15** — Coach Analysezeitraum dynamisch (FS-84): `_compute_training_start()` findet frühestes Kalender/Workout-Datum (cap 28 Tage); `build_coach_prompt()` nutzt `period_label` statt hartem "letzte 4 Wochen"; `new_user_note`-Warnblock bei < 28 Tagen; 11 neue Backend-Tests; 126/126 (+ 3 pre-existing) grün.
- **2026-06-15** — Einzelne Routine drucken (FS-83): globaler Drucken-Header-Button entfernt; Drucker-Icon-Button pro Karte (`.routine-card__btn-print`); `printRoutine` State + `useEffect` für Print-Timing; afterprint-Event cleared State; `RoutinePrint` bekommt `[printRoutine]` statt alle; 3 neue Tests; 553/553 grün.
- **2026-06-15** — Routinen drucken (FS-81): `RoutinePrint.jsx` + `RoutinePrint.css` (neue Dateien); `.routine-print-only { display:none }` auf Screen, `@media print` zeigt es; `app.css @media print` blendet `.sidebar` aus; `window.print()` als einzige Browser-API; Drucken-Button conditionell (routines.length > 0); Kraft-/Cardio-Tabellenschema; 12 neue Tests; 550/550 grün.
- **2026-06-14** — Mein Coach Chat-Funktion (FS-73): `POST /api/coach/chat` mit `CoachChatRequest` (report + messages); System-Prompt enthält Bericht-Text als Kontext (kein Re-Send der Rohdaten); max_tokens=512; Frontend: 4 neue State-Variablen + `handleSendChat()`; Chat-UI unterhalb Report-Card; Enter sendet / Shift+Enter neue Zeile; neuer Bericht resettet Chat; 11 neue Tests; 535/535 grün.
- **2026-06-14** — Garmin Aktivitäten Pagination (FS-18): `ActivitiesSection` mit `useState(20)` für `limit`; `ACTIVITY_PAGE_SIZE=20` / `ACTIVITY_MAX_LIMIT=100`; "Mehr laden"-Button (`btn`) mit `disabled={loading}` erscheint solange `limit < 100`; kein CSS-Change; 4 neue Tests; 524/524 grün.
- **2026-06-14** — WorkoutSession Pre-Start-Konfiguration (TD-06/FS-58): `phase='config'` als neue initiale Phase vor `exercise`; `adjustSets(idx, delta)` modifiziert `completedSets.length` direkt (min 1); `handleStartWorkout()` resettet `startedAtRef` + setzt phase; CSS `.workout-config__*`; `renderSession()` in Tests erweitert; 13 neue Tests; 520/520 grün.
- **2026-06-14** — Dashboard Dots Threshold (TD-01): `data.length <= 28` → `data.length <= 14` in `LineChart`; entspricht GarminView.jsx-Pattern; 4 neue Tests (507/507 grün).
- **2026-06-14** — Garmin Historien – Parallele API-Calls (FS-24/TD-05): `_fetch_stats_history()` + `_fetch_sleep_history()` von seriell auf `ThreadPoolExecutor.map(max_workers=min(days,10))` umgestellt; `_fetch_body_battery_history()` unberührt (Range-Call); stdlib `concurrent.futures`, kein neues Paket; 13 neue Unit-Tests; 115/118 Backend grün.
- **2026-06-14** — Garmin – Schlafdauer-Verlauf: `sleepDuration` in METRIC_MAP + `_fetch_sleep_history()` (tagesweise `get_sleep_data()`, Konvertierung zu h); Dispatch in `get_health_history()`; METRIC_META `{yMax:12}`; SleepCard `onSelect`-Prop mit "Verlauf →"-Button (`.sleep-card__history-btn`); HealthSection übergibt `onSelectMetric('sleepDuration')`; 2 neue Frontend-Tests; 503/503 grün.
- **2026-06-14** — Mein Coach – Garmin-Gesundheitstrends 4 Wochen: `fetchGarminHealthHistory()` in exportData.js (Promise.allSettled, 3 Metriken parallel); CoachView ruft History parallel zu garminHealth ab; `CoachReportRequest.garminHealthHistory` (Optional); `format_garmin_health_history()` mit 4 Wochenavg-Buckets; neuer Prompt-Block "Garmin-Gesundheitstrends". 11 Backend + 1 Frontend Tests, 103+501 grün.
- **2026-06-14** — Mein Coach – Garmin-Aktivitäten in Adherenz: `_GARMIN_TYPE_KEYWORDS` Lookup-Tabelle (Routine-Keyword → Garmin-activityType); `_garmin_matches_routine()` (Name-Containment + Keyword-Typ-Match, beide Seiten non-empty Guard); `_compute_adherence_per_series()` zählt Garmin-Aktivitäten auf Plantagen wenn Typ passt (Set-Dedup verhindert App+Garmin-Doppelzählung). 14 neue Tests, 94/97 grün.
- **2026-06-14** — Mein Coach – Vorberechnete Adherenz-Tabelle: `_compute_adherence_per_series()` zählt completed Workouts per Serie (routineId/routineName-Match, startDate bis gestern); Prompt erhält "VORBERECHNETE TRAININGSADHERENZ"-Block + imperatives "PFLICHT – DARFST NICHT selbst berechnen"-Verbot. 11 neue Tests, 82/85 grün (3 pre-existing week_plan failures).
- **2026-06-14** — Mein Coach – Zeitlicher Kontext: `_count_expected_series_sessions()` berechnet fällige Sessions; `format_calendar_events()` zeigt "bisher X fällig" + "NOCH NICHT FÄLLIG"-Label; `build_coach_prompt()` mit Datumsanker + WICHTIGER ZEITLICHER KONTEXT Instruktionsblock. Rein backend-seitig. 12 neue Tests, 72/75 grün.
- **2026-06-13** — Garmin-Aktivitäten im Journal: `useGarmin(50)` in App.jsx; `garminActivities` Prop an JournalView; `mapGarminToEntry()` + Merge-Sort mit lokalen Workouts; `GarminEntryDetail` (km/kcal/bpm); read-only (kein Edit/Delete); `.journal-badge--garmin/--distance`; 10 neue Tests; 322/322 grün.
- **2026-06-13** — Fortschritt-Menüpunkt entfernt: `id: 'progress'`-Eintrag aus NAV_ITEMS in Sidebar.jsx gelöscht; kein Code referenziert diesen State; 312/312 Tests grün.
- **2026-06-13** — Cardio Routinen: `routineType: 'strength'|'cardio'` in DB/API/Frontend; idempotente SQLite-Migration; Kraft/Cardio-Toggle in RoutineForm; Cardio-Übungszeile (Name + Min.); türkise Badges in RoutineDetail; "Erledigt"-Button in WorkoutSession (kein Pause-Countdown); 14 neue Tests; 312/312 grün.
- **2026-06-13** — Light-Theme-Token-Set (TD-02+TD-03): `.theme-light {}` in globals.css (17 Tokens + `.theme-light .btn` Overrides); `app-main theme-light` als Scope-Wurzel; 5 CSS-Dateien vollständig tokenisiert; `.routines-page .btn`-Spezifitäts-Hack entfernt. 298 Tests grün.
- **2026-06-12** — Layout-Korrektur (volle Breite): `max-width: 1000px` von Seitenwrappern entfernt; Zentrierung ausschließlich über innere Elemente mit eigenem max-width + `margin-inline: auto`; `.app-main { background: #f0f0f0 }` bleibt.
- **2026-06-12** — Gesundheitswert-Historien: `get_health_history(metric, period)` mit `METRIC_MAP`-Allowlist; body battery via `get_body_battery(range)`, andere via serieller `get_stats()`-Calls (jetzt parallel via ThreadPoolExecutor); `MetricDetail` inline in GarminView.jsx; `selectedMetric` State im Root; SVG-Chart mit Null-Gap-Unterstützung; `mockFetchByUrl`-Pattern: specific before general.
- **2026-06-12** — Garmin Gesundheitsdaten: `get_health()` kombiniert `get_stats()` + `get_sleep_data()`; `useGarminFetch()` als interner Basis-Hook; GarminView Tab-Switcher (Gesundheit/Aktivitäten), KPI-Grid (3-spaltig), Schlaf-Balken + Legende, Datums-Navigation.
- **2026-06-12** — Garmin-Integration: externes `garminconnect 0.3.5`-Paket (Backend-only); Token-Cache in `data/garmin_tokens/`; drei Fehlermodi (503 nicht konfiguriert / 502 Login-Fehler / 200 OK); Sidebar "Aktivitäten" → "Garmin" aktiviert.
- **2026-06-12** — Mein Profil: Neuer View 'profile' in App.jsx; `useProfile`-Hook mit localStorage-Persistenz (Key: `fitnessapp_profile`); UserProfile.jsx mit 3 Sektionen (Persönliche Daten, Ziele, Equipment); Chip-Toggle-Komponente (Mehrfachauswahl); Auto-Save; kein Backend nötig.
- **2026-06-12** — Daten-Export für Claude-Analyse: Client-seitiger JSON-Export; `src/utils/exportData.js` mit `buildExportPayload()`, `downloadJson()`, `fetchGarminHealth()`; `CLAUDE_PROMPT` als konstanter deutscher Prompt; Dashboard zeigt Prompt-Panel nach Export; kein Backend-Change.
- **2026-06-12** — Trainingsjournal: Neuer View 'journal'; `useWorkouts`-Hook; `DELETE /api/workouts/{id}`; JournalView mit manuellem Formular + window.confirm-Delete-Guard; Sidebar-Eintrag "Journal" (#7e57c2).
- **2026-06-12** — Dashboard überarbeiten: Schaltbare Chart-Metriken (Minuten/Sätze/Bewertung/Gewicht); Streak via Set; Lieblingsroutine 30d; KPI Ø Bewertung; "Letzte Trainings"-Sektion.
- **2026-06-12** — Journal-Einträge bearbeiten: `PUT /api/workouts/{id}`; `updateWorkout()` in useWorkouts.js; `JournalView editingWorkout`-State; dual-mode `handleSubmit`.
- **2026-06-12** — Gewichtslogger: `useWeightLog` (localStorage); `WeightLogger` in UserProfile.jsx; Dashboard 4. Metrik-Tab "Körpergewicht"; `computeWeightChartData()`; `LineChart` mit `yMin`.
- **2026-06-12** — Journal Split View: `JournalPanel` Komponent (sticky, flex:1); `JournalEntry` ohne inline-expand; `.journal-body--has-panel` Modifier; edit-button im Panel.
- **2026-06-12** — Garmin-Entkopplung Routinen: garminCategory/garminExerciseName + push_workout + POST /api/garmin/workouts entfernt. Garmin bleibt als reine Gesundheitsdaten-Quelle.
- **2026-06-13** — Geführtes Workout: State machine `phase: exercise|pause|rate|summary`; 60s Countdown; 41 neue Tests. Workout-Fortschrittsbalken (`.workout-progress`, 6px, ARIA progressbar).
- **2026-06-13** — Übungsbeschreibungen: `description`-Feld zu 62 EXERCISE_LIBRARY-Einträgen; `findExDesc()` in exerciseDesc.js (EXACT + NORMALIZED Map); aufklappbar per Klick in RoutineDetail + WorkoutSession.
- **2026-06-13** — Journal Datums-Gruppierung: `groupByDate()` + `.journal-day__header` sticky; `formatGroupDate()` mit Noon-Trick.
- **2026-06-13** — Journal UI-Verschönerung: pill-badges, hover-reveal actions, chevron SVG, garmin green left-accent.
- **2026-06-13** — Detaillierte Ausrüstungsliste: `EQUIPMENT_CATEGORIES` (6 Kategorien, 37 Items); `EquipmentSection` Component.
- **2026-06-13** — Profil-Ergänzung für KI-Kontext: Erfahrungsstufe (`SingleChipGroup`), Trainingstage/Woche, Verletzungen-Textarea (maxLength=300).
- **2026-06-13** — Outlook-Kalender: `calendar_events` Tabelle; GET/POST/DELETE `/api/calendar`; `useCalendar.js`; `CalendarView.jsx` Monatsgitter 6×7 + Wochenansicht; Modal Einmalig/Serie-Tabs.
- **2026-06-13** — ShapeShift-Umbenennung: Find-and-Replace an 5 Stellen; localStorage-Keys `fitnessapp_*` bewusst NICHT umbenannt.
- **2026-06-13** — Mein Coach: Backend-Proxy für Anthropic API (claude-haiku-4-5-20251001); `build_coach_prompt()` 5-Abschnitte-Prompt; eigener Markdown-Renderer (kein npm-Paket).
- **2026-06-11** — React 18 + Vite Greenfield; kein Backend, kein react-router; localStorage via useRoutines Hook; CSS-Variablen + .btn-System in globals.css etabliert.
- **2026-06-11** — Python Backend: FastAPI + SQLite; exercises als JSON-Spalte; Vite-Proxy ersetzt CORS; `python-dotenv` für DB_PATH; `data/` gitignored.

---

## ✅ Done

- [x] FS-03: Integrationstest App.jsx — view-Wechsel + Edit-Flow (view-State-Machine) — neue Datei `src/App.test.jsx` (erste Testdatei für App.jsx); rendert echten `App`-Default-Export durch das Auth-Gate (kein `useAuth.js`-Mock, echter `initAuth()`-Durchlauf + Session in localStorage); URL-Pattern-Fetch-Mock deckt alle 4 parallelen AppShell-Hooks + POST/PUT /api/routines ab; 6 Tests (View-Wechsel, Neu anlegen, Bearbeiten, Detail→Bearbeiten→Abbrechen, Sidebar-Navigation während offenem Formular, fehlgeschlagenes Speichern) ✓ implementiert (2026-08-05)
- [x] FS-02: Komponententests für RoutineList — delete-confirm (window.confirm-Mock), edit-Button-Klick — 10 neue Tests (`getAllByRole(...)[index]`-Disambiguierung bei mehreren Karten, da weder Löschen- noch Bearbeiten-Button ein routinen-spezifisches aria-label haben) ✓ implementiert (2026-08-05)
- [x] FS-25: Garmin Historien — Tooltip bei Hover auf Datenpunkt (Datum + Wert) — native SVG-`<title>`-Hit-Circles pro Datenpunkt in `MetricLineChart`, unabhängig von `showDots` gerendert (auch bei 28 Datenpunkten/4 Wochen); Tooltip-Format `TT.MM.JJJJ: Wert Einheit` ✓ implementiert (2026-08-05)
- [x] FS-21: Garmin Gesundheit — Datum-Navigation-Tests (‹ ›-Click mit waitFor + neue Health-Daten) — neuer Mock-Helper `mockHealthByDate()` (matched `date`-Query-Parameter statt nur URL-Teilstring); 7 neue Tests für Klick-Navigation, Round-Trip, disabled-Grenzfall, kumulative Navigation, Fehler-/503-Zustände ✓ implementiert (2026-08-05)
- [x] FS-74: Mein Coach — Trainingsplan vorschlagen lassen (basierend auf Profil + aktuellem Stand) — neuer Endpoint `POST /api/coach/plan` + `build_training_plan_prompt()`; zweiter Header-Button „Trainingsplan vorschlagen" neben Zwischenbericht; beide Historientypen teilen sich Liste + localStorage-Key, unterschieden über `type`-Feld (`'bericht'`/`'trainingsplan'`) ✓ implementiert (2026-08-05)
- [x] FS-47: Journal Bearbeiten — Fehlermeldung anzeigen wenn PUT fehlschlägt (lokaler `saveError`-State in `JournalView`, analog zum Anzeigemuster von `RoutineForm`) ✓ implementiert (2026-08-05)
- [x] Letztes Gewicht als Vorschlag im geführten Workout — Gewicht-Feld wird beim Start einer Übung mit dem zuletzt verwendeten Gewicht dieser Übung vorausgefüllt (Namens-Match über Workout-Historie, `getLastKnownWeight()`); manuelle Eingabe überschreibt Vorschlag dauerhaft ✓ implementiert (2026-08-05)
- [x] Eigene Übungsbibliothek durch free-exercise-db ersetzt — `exerciseLibrary.js` + `exerciseDesc.js` gelöscht; `useExerciseLibrary.js` (CDN-Fetch, module-cache); Picker grouped by primaryMuscles; equipment als Kurzinfo ✓ implementiert (2026-06-18)

### Technical Debt
- [x] TD-02: Light-Theme-Token-Set etabliert (2026-06-13)
- [x] TD-03: .routines-page .btn Spezifitäts-Hack entfernt (2026-06-13, Teil von TD-02)
- [x] TD-04: WorkoutSession Set-Toggle obsolet — geführter Flow hat kein Toggle mehr, immer vorwärts (2026-06-13)
- [x] TD-06: WorkoutSession — Pre-Start-Konfiguration Satzanzahl (`config`-Phase + adjustSets + handleStartWorkout) ✓ implementiert (2026-06-14) — löst FS-58
- [x] TD-01: Dashboard.jsx showDots-Threshold-Guard `data.length <= 28` → `data.length <= 14` (Konsistenz mit GarminView.jsx) ✓ implementiert (2026-06-14)
- [x] TD-05: `_fetch_stats_history()` + `_fetch_sleep_history()` parallelisiert via ThreadPoolExecutor (FS-24, 2026-06-14)

### Follow-up Stories
- [x] FS-08: Unit-Tests Dashboard.jsx — Dashboard.test.jsx mit 69 Tests (Zeitraum-Wechsel, Streak, KPI, Bewertung, Export, Begrüßung, Gewicht) implementiert (2026-06-12/13)
- [x] FS-13: Unit-Tests Dashboard computeKpis()/computeChartData() — indirekt durch Dashboard.test.jsx vollständig abgedeckt; MOCK_DATA-Referenz obsolet (Daten kommen vom Backend) (2026-06-12/13)
- [x] FS-14: Aktivitäten-Log — vergangene Workouts auflisten ✓ als Journal implementiert (2026-06-12)
- [x] FS-20: Garmin-Aktivitäten im Journal anzeigen (read-only, ephemer) ✓ implementiert (2026-06-13) — dauerhafter Import in DB als FS-53 offen
- [x] FS-22: Garmin Gesundheit — Wochensicht (7-Tage-Chart) ✓ MetricDetail zeigt 7d/4w für alle Metriken (2026-06-12)
- [x] FS-18: Garmin-Aktivitätsliste — "Mehr laden"-Button (Pagination) ✓ implementiert (2026-06-14)
- [x] FS-24: Garmin Historien — Parallele API-Calls (ThreadPoolExecutor) ✓ TD-05 geschlossen (2026-06-14)
- [x] FS-58: Geführtes Workout — Pre-Start-Konfiguration: Satz +/− pro Übung vor dem Start anpassen ✓ implementiert (2026-06-14) — löst TD-06
- [x] FS-28: Mein Profil — Profildaten im Dashboard (Begrüßung, Ziele) ✓ implementiert
- [x] FS-39: Vorschläge aus vorherigem Workout — DUPLIKAT von FS-60 (FS-60 spezifischer: "in exercise phase des geführten Workouts")
- [x] FS-30: BMI-Anzeige — DUPLIKAT von FS-56 (zusammengeführt in FS-56)
- [x] FS-43: Journal Übungsdetails — Satzanzahl im manuellen Formular anpassen ✓ implementiert
- [x] FS-44: Journal Übungsdetails — Drill-Down in Journal-Entry ✓ implementiert
- [x] FS-62: Übungsbeschreibungen in RoutineDetail anzeigen ✓ implementiert (2026-06-13)
- [x] FS-63: Beschreibungen für bestehende Routinen (fuzzy/normalized Lookup via exerciseDesc.js) ✓ implementiert (2026-06-13)
- [x] FS-64: Profil-Ergänzung für KI-Kontext (Erfahrungsstufe, Trainingstage/Woche, Verletzungen) ✓ implementiert (2026-06-13)
- [x] FS-65: Detaillierte Ausrüstungsliste (37 Items, 6 Kategorien) ✓ implementiert (2026-06-13)
- [x] FS-66: Outlook-Kalender — Monatsgitter, Einzel- & Serienroutinen, Modal, Event-Popup ✓ implementiert (2026-06-13)
- [x] FS-67: Kalender Wochen- und Monatsansicht ✓ implementiert (2026-06-13)
- [x] FS-68: Umbenennung "Trainingswoche" → "Trainingskalender" ✓ implementiert (2026-06-13)
- [x] FS-69: Gewicht-Feld read-only aus Gewichtstracker ✓ implementiert (2026-06-13)
- [x] FS-70: App-Umbenennung FitnessApp → ShapeShift ✓ implementiert (2026-06-13)
- [x] FS-71: Dashboard Garmin-Minuten-Bug ✓ implementiert (2026-06-13)
- [x] FS-72: Mein Coach — KI-Zwischenbericht per Knopfdruck ✓ implementiert (2026-06-13)
- [x] FS-76: Mein Coach — Vollständiger Trainingsplan im Prompt ✓ implementiert (2026-06-14)
- [x] FS-77: Mein Coach — Zeitlicher Kontext (Datumsanker + Adherenz-Instruktion) ✓ implementiert (2026-06-14)
- [x] FS-78: Mein Coach — Vorberechnete Adherenz-Tabelle ✓ implementiert (2026-06-14)
- [x] FS-79: Mein Coach — Garmin-Aktivitäten in Adherenz ✓ implementiert (2026-06-14)
- [x] FS-80: Mein Coach — Garmin-Gesundheitstrends 4 Wochen ✓ implementiert (2026-06-14)
- [x] FS-73: Mein Coach — Chat-Funktion (Rückfragen an Coach, Konversations-History) ✓ implementiert (2026-06-14)
- [x] FS-81: Routinen drucken — A4-Trainingsplan mit Kraft/Cardio-Tabelle, leere Felder für Gewicht/Bewertung/Notizen ✓ implementiert (2026-06-15)
- [x] FS-83: Einzelne Routine drucken — Drucker-Icon pro Karte, globaler Button entfernt, printRoutine State ✓ implementiert (2026-06-15)
- [x] FS-84: Coach Analysezeitraum dynamisch — `_compute_training_start()` + period_label + new_user_note für Kurzzeit-Nutzer ✓ implementiert (2026-06-15)
- [x] FS-75: Mein Coach — Berichte speichern und History anzeigen ✓ implementiert (2026-06-16)
- [x] FS-85: Mein Coach — Bericht-Übersichtsseite mit Detailansicht ✓ implementiert (2026-06-16)
- [x] FS-86: Mein Profil — volle Content-Breite + 2-Spalten-Grid (gleiche Behandlung wie Coach-Seite) ✓ implementiert (2026-06-16)
- [x] FS-87: Mein Profil — Geburtstag-Feld statt Alter; Alter aus Geburtsdatum berechnet ✓ implementiert (2026-06-16)
- [x] FS-88: Komplette Benutzerverwaltung — Login-Screen, Multi-User, Admin-Migration, Datenisolation localStorage + Backend ✓ implementiert (2026-06-16)
- [x] FS-19: Garmin-Aktivitätsdetail — Klick auf Karte → ActivityDetailView (Stats-Grid + SplitsTable); GPS-Karte out-of-scope ✓ implementiert (2026-06-16)
- [x] FS-91: Coach Datenanreicherung — Aktivitätsdetails/VO2max/Intensitätsminuten/HRV/Übungsdetails/Routinen im Coach-Prompt ✓ implementiert (2026-06-16)
- [x] FS-92: Profil in Sidebar-Fußzeile — "Mein Profil" aus NAV_ITEMS entfernt; Benutzername-Bereich als klickbarer Profil-Button mit Active-State ✓ implementiert (2026-06-16)
- [x] FS-94: Ernährungsplan Prompt-Fix — Mahlzeit-Regeln, Frühstücks-Verbot für Dinner-Gerichte, Präferenzen als Orientierung statt Pflicht ✓ implementiert (2026-06-16)
- [x] FS-93: Ernährungsplan — neuer Menüpunkt; 5-Schritt-Wizard (Ernährungsform/Mahlzeiten/Allergien/Lebensmittelprefs/Kalorien); AI 7-Tage-Plan mit Trainingskalender-Integration; Einkaufsliste-Tab; localStorage-Persistenz ✓ implementiert (2026-06-16)
- [x] FS-96: Dashboard CTA — "▶ Training starten"-Button im Welcome-Card für heute geplante Routinen (1 Event=primär, mehrere=sekundär, Filter gegen routines-Array) ✓ implementiert (2026-06-18)
- [x] FS-97: Dashboard KPI-Trends — Woche-vs-Vorwoche Trend-Badges (↑/↓/→) auf Trainings, Aktiv-Minuten, Ø Bewertung via `makeTrend()` ✓ implementiert (2026-06-18)
- [x] FS-98: Dashboard Garmin Health KPIs — Schritte, Schlaf (h), Ruhepuls (bpm) via `useGarminHealth()` als eigene Section (nur wenn Garmin konfiguriert) ✓ implementiert (2026-06-18)
- [x] Übungsbilder in WorkoutSession — `getExerciseImage()` name-lookup gegen free-exercise-db Cache; `<img loading="lazy">` mit onError-Fallback in exercise-Phase ✓ implementiert (2026-06-18)
- [x] Abwechselnde Übungsbilder in WorkoutSession — `getExerciseImages()` + `imgIdx`-State + 2s-Intervall-Toggle; Reset bei Übungswechsel; nur in exercise-Phase; 6 neue Tests ✓ implementiert (2026-06-19)
- [x] Vollbild-Übungsbild + API-Übungsanweisungen — `object-fit:cover` (kein grauer Rand); `getExerciseInstructions()` → `<ol>` unter Bild; nur exercise-Phase; 6 neue Tests ✓ implementiert (2026-06-19)
- [x] Übungsbild unabgeschnitten — `max-height`+`object-fit:cover` → `height:auto; display:block`; volles Bild sichtbar bei natürlichem Seitenverhältnis ✓ implementiert (2026-06-19)
- [x] Übungsdetail-Expand in RoutineDetail — Klick auf Übung klappt Bild + Anweisungen auf; Single-expand; Toggle; aria-expanded; 11 neue Tests ✓ implementiert (2026-06-19)
- [x] Equipment auf API-Werte begrenzen — `EQUIPMENT_OPTIONS` (12 API-Keys: barbell/dumbbell/cable/machine/kettlebells/bands/e-z curl bar/exercise ball/foam roll/medicine ball/body only/other); localStorage speichert API-Key; FS-29 damit nutzbar ✓ implementiert (2026-06-19)
- [x] Dashboard standalone in Sidebar — aus Training-Gruppe herausgelöst, standalone über den Gruppen; NavButton Hilfskomponente; 674/674 grün ✓ implementiert (2026-06-19)
- [x] Kontrastreicher Chip-Auswahlzustand — `.chip--active` + Nutrition-Chips auf Solid-Fill umgestellt (Indigo/Grün/Rot + weiße Schrift); 673/673 grün ✓ implementiert (2026-06-19)
- [x] Geschlechtsauswahl in Mein Profil — `geschlecht: null` in DEFAULT_PROFILE; SingleChipGroup (männlich/weiblich/divers) im "Über mich"-Block; 9 neue Tests ✓ implementiert (2026-06-19)
- [x] Sidebar-Gruppenstruktur — NAV_GROUPS mit 3 Gruppen (Training/Gesundheit/Verwaltung); Gruppenüberschriften (10px/uppercase/rgba30%); Sidebar.test.jsx neu (10 Tests); schließt FS-09 ✓ implementiert (2026-06-19)
- [x] Übungserklärung Toggle in WorkoutSession — initial ausgeblendet; "Erklärung anzeigen/ausblenden"-Button; Reset bei Übungswechsel; 9 neue Tests ✓ implementiert (2026-06-19)
- [x] Übungsübersicht — neuer Menüpunkt in Training-Gruppe; ExerciseLibraryView mit 5 Filtern (Suche/Kategorie/Level/Equipment/Muskelgruppe); Pagination 30er-Seiten; Single-Expand mit Anweisungen; 29 neue Tests; 703/703 grün ✓ implementiert (2026-06-19)
- [x] Übungsübersicht UX-Verbesserungen — volle Breite (max-width entfernt); Filterzeile einzeilig (select-Dropdowns statt Chip-Rows); Vorschaubild auf jeder Karte + Platzhalter; Modal-Popup statt Inline-Expand (Escape/Backdrop/×-Schließen); 47 Tests (712/712 grün) ✓ implementiert (2026-06-19)
- [x] Garmin-Gesundheitsdaten Normalisierung: `_map_health` (-1 → None für HR/Stress), `_fetch_stats_history` (negative Werte + vo2max=0.0 → None), `_fetch_body_battery_history` (dict+unix-ms Parsing), `_fetch_intensity_history` (clamp ≥ 0); 20 neue Tests; 160/160 grün ✓ implementiert (2026-06-21)
- [x] TD-10: `useExerciseLibrary.js` Unit-Tests — 22 Tests für 3 Pure Functions + Hook; `vi.resetModules()` + dynamischer Import für Cache-Isolation; 721/721 grün ✓ implementiert (2026-06-21)
- [x] TD-09: Backend-Tests für `/api/calendar` GET/POST/DELETE — 14 neue Tests (3×GET, 5×POST, 3×DELETE, 3×User-Isolation); `CALENDAR_SINGLE`/`CALENDAR_SERIES` Konstanten + `client_with_event` Fixture; 140/140 grün ✓ implementiert (2026-06-21)
- [x] TD-07: `WeekPlan.jsx`, `WeekPlan.test.jsx`, `WeekPlan.css`, `useWeekPlan.js` gelöscht — Dead Code vollständig entfernt; 9 Frontend-Tests gelöscht; 20 Testdateien, 699/699 grün ✓ implementiert (2026-06-21)
- [x] TD-08: `week_plan`-Tabelle aus `init_db()`, `get_week_plan()`, `save_week_plan()`, `_DAYS`, `_EMPTY_PLAN` aus `database.py` entfernt; 3 fehlschlagende Backend-Tests gelöscht; 126/126 grün ✓ implementiert (2026-06-21)
- [x] Körpergewicht-Grafik verbundene Linie — `_pathStarted`-Boolean fix in `LineChart`; nicht-benachbarte Punkte werden mit L verbunden statt doppeltem M; 5 neue Tests + 4 TD-01-Tests korrigiert (rect→circle); 708/708 grün ✓ implementiert (2026-06-21)
- [x] Dashboard Export-Button entfernt — Button, Prompt-Panel, 3 States, 2 Funktionen, exportData-Import, totes CSS und 9 Export-Tests gelöscht; exportData.js bleibt; 703/703 grün ✓ implementiert (2026-06-19)

### Feature Ideas
- [x] FI-01: Workout-Tracking mit Timer und Fortschrittsanzeige ✓ implementiert (WorkoutSession, 2026-06-11/13)
- [x] FI-02: Übungshistorie / Logs ✓ implementiert als Journal (2026-06-12)
- [x] FI-03: Vordefinierte Übungsbibliothek ✓ implementiert (2026-06-11)
