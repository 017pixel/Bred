# Web Search Skill

## Beschreibung
Dieser Skill ermöglicht es, im Internet zu suchen, um aktuelle Informationen zu erhalten oder Fakten zu überprüfen. Er nutzt DuckDuckGo für freie, anonymisierte Suchen ohne API-Schlüssel.

## Suchmethode
Um eine Web-Suche durchzuführen, verwende folgende URL-Format:

```
https://duckduckgo.com/html/?q={search_terms}
```

Ersetze `{search_terms}` mit deiner Suchanfrage (URL-kodiert).

Alternativ kannst du auch `https://lite.duckduckgo.com/lite/?q={search_terms}` verwenden.

## Verwendung
Wenn der Benutzer nach aktuellen Informationen fragt, die du nicht aus deinem Trainingswissen beantworten kannst, oder wenn du Fakten überprüfen möchtest, verwende diesen Skill.

## Trigger
- Aktuelle Nachrichten, Ereignisse oder Entwicklungen
- Faktenüberprüfung von Statistiken, Daten oder Zahlen
- Informationen über Unternehmen, Produkte oder Dienstleistungen
- Technische Dokumentation oder aktuelle API-Änderungen
- Alle Fragen, bei denen du dir nicht sicher bist, ob dein Wissen aktuell genug ist

## Suchanfrage-Format
Verwende klare, präzise Suchbegriffe. Je genauer die Suchanfrage, desto besser die Ergebnisse.
Beispiel: Wenn der Benutzer nach "Python Programming" suchen möchte, verwende `https://duckduckgo.com/html/?q=Python+Programming`

## Antwortformat
Präsentiere die Ergebnisse in einer strukturierten Form:
- Titel der Quelle
- URL (als Referenz)
- Zusammenfassung der relevanten Informationen
- Datum der Quelle (wenn verfügbar)

## Einschränkungen
- Kein Zugriff auf paywalled oder eingeloggte Inhalte
- Keine Videos oder multimediareichen Inhalte
- Maximale Ergebnisse: 10 pro Suche
- Suche funktioniert am besten für textbasierte Informationen

## Wichtige Hinweise
- Zitiere immer deine Quellen
- Gib an, wann die Informationen gefunden wurden
- Sei vorsichtig bei veralteten Informationen
- Frage nach, wenn mehr Details benötigt werden
