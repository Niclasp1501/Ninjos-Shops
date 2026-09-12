"""Den Changelog-Abschnitt dieser Version als Release-Text herausschneiden.

Vorher stand `body_path: CHANGELOG.md` im Workflow, und damit lag die **ganze**
Datei im Release, rund 40 KB. Wer ein Update angeboten bekommt und darauf klickt,
will wissen, was sich in dieser Version geaendert hat, und nicht die Geschichte
des Moduls von vorne lesen.

Die Ueberschriften heissen hier `## 14.2609.91 - 2026-09-12`, ohne Klammern. Die
Vorlage aus der DnD5e-Uebersetzung sucht `## [14.2609.91]`; beide Formen gehen
durch, damit ein spaeterer Wechsel der Schreibweise das Release nicht leert.
"""
import os
import re
import sys

version = os.environ["VERSION"]
text = open("CHANGELOG.md", encoding="utf-8").read()

# Der Abschnitt dieser Version, bis zur naechsten Versionsueberschrift oder zum Dateiende.
muster = r"^## \[?%s\]?[^\n]*\n(.*?)(?=^## |\Z)" % re.escape(version)
treffer = re.search(muster, text, re.S | re.M)
notizen = treffer.group(1).strip() if treffer else ""

if not notizen:
    # Nicht scheitern, aber auch nicht stillschweigend leer bleiben.
    notizen = "No changelog section found for %s." % version
    print("WARNUNG: %s" % notizen, file=sys.stderr)

open("release-notes.md", "w", encoding="utf-8").write(notizen + "\n")
print("Release-Text: %d Zeichen" % len(notizen))
