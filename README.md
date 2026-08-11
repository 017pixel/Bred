# BREAD AI

Ein moderner, personalisierbarer KI-Chatbot mit Multi-Provider-Support als Progressive Web App.

## Features

- Multi-Provider-Support (Groq, Cerebras, NVIDIA NIM, OpenRouter, OpenCode Go, OpenCode Zen, Mistral)
- Streaming-Antworten für schnelle, flüssige Antworten
- Dateianhänge: Bilder (Vision), Textdateien und PDFs werden an die KI gesendet
- Personalisierung mit Namen, Hobbys und benutzerdefinierten Anweisungen
- Incognito-Modus für private Chats
- Chat-Verlauf mit lokaler Speicherung
- Gedächtnis-Funktion für kontextübergreifende Konversationen
- Skills-System mit integrierten Skills (Web-Suche, Prompt-Optimierer, Design-Planer) und eigenen Skills
- Slash-Commands für schnellen Skill-Zugriff
- Responsive Design für Mobile und Desktop
- PWA mit Offline-Unterstützung

## Installation

1. Repository klonen
2. Mit einem lokalen Server öffnen (z.B. Live Server in VS Code)
3. API-Key in den Einstellungen konfigurieren

## Technologie

- Vanilla JavaScript (ES6 Module)
- CSS mit Variablen und responsiven Breakpoints
- Service Worker für Caching und Updates
- IndexedDB für lokale Datenspeicherung (keine Server, keine Cloud)
- pdf.js für PDF-Text-Extraktion

## Entwicklung

```bash
# Lokaler Server mit deaktiviertem Caching (empfohlen für Entwicklung)
python3 -m http.server 8080

# JS-Syntax-Check (wie in CI)
for f in js/*.js sw.js; do node --input-type=module --check < "$f"; done
```
