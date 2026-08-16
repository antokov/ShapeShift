---
name: backlog
description: Backlog-Cleanup Skill. Prüft backlog.md auf Korrektheit gegen den tatsächlichen Codestand, entfernt obsolete/abgeschlossene Items, verschiebt done Items in den Done-Bereich, und schlägt neue Feature Ideas vor. Aufruf: /backlog
tools: Read, Write, Edit, Glob, Grep, Bash
---

# Backlog-Cleanup Skill

Du bist ein erfahrener Tech Lead, der das Projekt-Backlog gegen den echten Codestand auditiert.

Dein Ziel: `.claude/backlog.md` so aktuell und sauber halten, dass es als zuverlässige Entscheidungsgrundlage dient.

---

## Ablauf (5 Phasen, alle ausführen)

---

### Phase 1 — Lesen & Inventarisieren

1. Lies `.claude/backlog.md` vollständig
2. Lies `CLAUDE.md` (Architektur-Überblick)
3. Erstelle intern eine Liste aller Items mit:
   - ID (TD-XX / FS-XX / FI-XX)
   - Status (`[ ]` offen / `[x]` erledigt)
   - Beschreibung (kurz)

Gib keine Ausgabe — nur interne Vorbereitung.

---

### Phase 2 — Verifikation gegen Codestand

Für jedes **offene** `[ ]`-Item: prüfe durch Code-Suche, ob es schon implementiert oder obsolet geworden ist.

**Suche-Strategie:**

| Item-Typ | Was prüfen |
|----------|-----------|
| TD (Tech Debt) | Grep nach dem beschriebenen Pattern/Funktion/Datei. Existiert der Fix bereits im Code? |
| FS (Follow-up Story) | Grep nach Komponenten, State-Variablen, API-Endpoints, CSS-Klassen die die Story beschreibt. Ist das Feature da? |
| FI (Feature Idea) | Wie FS — wurde die Idee in einer späteren Story umgesetzt? |

**Klassifikation pro Item:**

- `DONE` — Im Code vorhanden / implementiert → markiere als `[x]`, verschiebe zu Done
- `ORPHAN` — Ursprüngliche Seite/Komponente wurde entfernt, Feature hat keine Heimat mehr → füge `⚠ ORPHAN`-Hinweis hinzu
- `DUPLICATE` — Inhaltlich identisch mit einem anderen Item → mergen oder als Duplikat markieren
- `KEEP` — Offen, legitim, kein Handlungsbedarf

Lies dabei die relevanten Source-Files (nicht nur greppen) um sicher zu sein.

---

### Phase 3 — Aufräumen der Struktur

Führe die folgenden Bereinigungen durch:

1. **Done-Items konsolidieren**: Alle `[x]`-Items aus TD / FS / FI, die NICHT im `✅ Done`-Abschnitt stehen, dorthin verschieben (Kurzform: ID + Titel + Datum wenn bekannt)

2. **Doppelte Architecture-Log-Sektionen entfernen**: Die aktuelle `backlog.md` hat zwei `## 🟢 Architecture Log`-Header — einen davon entfernen

3. **Orphan-Items kennzeichnen**: `⚠ ORPHAN`-Hinweis wenn Heimat-Seite/-Komponente entfernt wurde

4. **Duplikate zusammenführen**: Wenn zwei Items denselben Scope haben, das neuere behalten und das ältere als Duplikat in Done verschieben

5. **Konsistenz**: Alle erledigten FS/TD Items, die im Architecture Log erwähnt sind aber in der FS/TD-Liste noch als `[ ]` stehen → auf `[x]` setzen

---

### Phase 4 — Neue Feature Ideas entdecken

Scanne den Code auf Lücken und Optimierungspotenzial, die noch NICHT im Backlog stehen:

Suche in diesen Bereichen:
- `// TODO` oder `// FIXME` Kommentare im Code
- Komponenten die hart-kodierte Limits haben (z.B. `limit=20`, `max 10`, `max 5`)
- Fehlende Tests (Dateien ohne `.test.`-Pendant)
- UX-Patterns die in einem View existieren aber in ähnlichen Views fehlen
- Metriken/Daten die gesammelt aber nie angezeigt werden

Für jeden Fund: prüfe ob er bereits als FS/FI/TD im Backlog steht.
Nur wirklich neue Items ergänzen — kein Padding.
Weise neuen FI-Items die nächste freie `FI-XX`-Nummer zu.

---

### Phase 5 — Backlog schreiben

Schreibe `.claude/backlog.md` neu mit allen Änderungen aus Phase 2–4.

**Reihenfolge der Sektionen (beibehalten):**

```
## 🔴 Technical Debt
## 🟢 Architecture Log      ← NUR EINE dieser Sektionen
## 🟡 Follow-up Stories
## 🟢 Feature Ideas
## 🔵 Open Questions
## 🏛️ Architecture Log      ← NUR EINE dieser Sektionen
## ✅ Done
```

**Regeln:**
- Offene Items (`[ ]`): nur wirklich offene, legitime Items
- Architecture Log: nur EINE Sektion (die längere/vollständigere behalten)
- Done-Sektion: alle erledigten Items als Einzeiler `- [x] XX-YY: Titel (Datum)`
- Keine leeren Sektionen stehenlassen

---

### Abschließende Ausgabe

Gib dem Nutzer einen kompakten Bericht:

```
## Backlog-Cleanup abgeschlossen

**Neu als Done markiert:** [N Items] — [Liste der IDs]
**Orphans gekennzeichnet:** [N Items] — [Liste der IDs]
**Duplikate aufgelöst:** [N Items]
**Neue FI-Items:** [N Items] — [Liste der IDs + Titel]
**Sonstiges:** [strukturelle Fixes wie doppelter Arch-Log-Header]
```

---

## Regeln

- Nie ein Item löschen ohne Begründung — lieber zu Done verschieben
- Nie einen Architecture-Log-Eintrag entfernen — der ist historisch wertvoll
- Nie `[x]`-Items aus der Done-Sektion entfernen
- Immer den aktuellen Codestand über Backlog-Text stellen — Code lügt nicht
- Neue FI-Items nur wenn wirklich neu und nicht bereits im Backlog
