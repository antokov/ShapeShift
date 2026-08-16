# Blockers

## BLOCKER-EX-01 — ExerciseDB Endpoint (ExerciseDB Integration)

**Phase:** Architect (Phase 3)
**Status:** GESCHLOSSEN — gelöst mit free-exercise-db (2026-06-18)

→ Nutzer wählte https://github.com/yuhonas/free-exercise-db (statisches JSON, kein API-Key nötig).

---

## BLOCKER-02 — Garmin-Authentifizierung (Garmin-Daten-Ansicht)

**Phase:** BA
**Status:** OFFEN — wartet auf Entscheidung des Nutzers

### Kontext

Die Garmin-Integration benötigt gültige Zugangsdaten für Garmin Connect. Die Bibliothek `python-garminconnect` authentifiziert sich mit E-Mail und Passwort. Diese müssen in `backend/.env` hinterlegt werden.

Zusätzlich muss geklärt werden, ob **Multi-Faktor-Authentifizierung (MFA)** auf dem Garmin-Account aktiv ist — denn MFA erfordert einen interaktiven Schritt, der serverseitig nicht automatisierbar ist.

### Offene Fragen

**OQ-03 (BLOCKING):** Ist MFA auf dem Garmin-Account aktiv?
- **Nein** → Standard-Login mit Email + Passwort funktioniert automatisch
- **Ja** → Komplizierter: Bibliothek benötigt einen einmaligen manuellen MFA-Schritt; danach werden OAuth-Tokens gecacht

**OQ-04 (BLOCKING):** Welche Garmin E-Mail-Adresse soll verwendet werden?
- Die Zugangsdaten müssen in `backend/.env` eingetragen werden als `GARMIN_EMAIL` und `GARMIN_PASSWORD`

---
**→ Bitte antworten:**
1. Ist MFA (Google Authenticator / SMS-Code) auf deinem Garmin-Account aktiv?
2. Welche E-Mail und welches Passwort soll die App verwenden? (Diese werden nur lokal in backend/.env gespeichert)

---

## BLOCKER-01 — Datenbanktyp und Setup-Methode (Python Backend Enabler)

**Phase:** BA / Architect
**Status:** OFFEN — wartet auf Entscheidung des Nutzers

### Kontext
Das Backend nutzt aktuell SQLite (`fitnessapp.db` im `backend/`-Verzeichnis).
Die Story verlangt eine "vollwertige lokale Datenbank".

### Systemzustand (geprüft)
- PostgreSQL: **nicht installiert** (`pg_isready` / `psql` nicht gefunden)
- Docker: **installiert** (v28.4.0) aber **Docker Desktop nicht gestartet** (Engine-Pipe fehlt)
- SQLite: **läuft** — alle 12 Tests grün

### Drei Optionen — Entscheidung nötig

**Option A — Docker (PostgreSQL-Container)**
- Docker Desktop starten → `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres`
- Vorteil: kein lokales PostgreSQL-Install, reproduzierbar
- Voraussetzung: Docker Desktop muss gestartet werden

**Option B — PostgreSQL lokal installieren**
- Download von postgresql.org, Setup-Wizard
- Vorteil: läuft immer, kein Docker nötig
- Aufwand: Installation + Service konfigurieren

**Option C — SQLite professioneller einrichten**
- SQLite behalten, aber: `.env`-Datei für `DB_PATH`, `data/`-Ordner, Gitignore-Eintrag
- Vorteil: sofort fertig, kein Install
- Nachteil: kein vollwertiger DB-Server

---
**→ Welche Option soll umgesetzt werden?**
