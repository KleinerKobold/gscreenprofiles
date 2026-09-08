# gScreenProfiles

[English](README.md) · **Deutsch**

GNOME-Shell-50-Erweiterung mit einem Dualscreen-Symbol in der oberen Leiste.

[Quellcode](https://github.com/KleinerKobold/gscreenprofiles) · [Fehler melden](https://github.com/KleinerKobold/gscreenprofiles/issues)

## Bedienung

- Symbol anklicken und „Aktuelle Einstellung speichern …“ wählen. Einen eindeutigen Namen eingeben.
- Ein Profil anklicken, um dessen Bildschirmkonfiguration wiederherzustellen. GNOME fragt, ob die Änderung beibehalten werden soll; ohne Bestätigung wird sie zurückgenommen.
- Die drei Punkte neben einem Profil blenden die Icons für Umbenennen und Löschen ein. Löschen entfernt sofort nur das gespeicherte Profil.

Gespeichert werden aktive Bildschirme, Auflösung, Frequenz (inklusive fest/variabel), Skalierung, Rotation, Position, Hauptbildschirm, Spiegelung, Layoutmodus sowie Farbmodus und Underscanning, sofern verfügbar. Nicht im Profil aktive Bildschirme werden beim Anwenden deaktiviert. Fehlende oder nicht eindeutig erkennbare aktive Monitore und nicht mehr verfügbare Modi führen zu einer Fehlermeldung.

Profile bleiben über Abmeldungen hinweg in GSettings erhalten. Helligkeit, Nachtmodus, ICC-Profile und Fensterpositionen gehören nicht zum Profil.

## Installation

Das Paket aus dem Quellcode bauen (benötigte Werkzeuge siehe unten):

```sh
git clone https://github.com/KleinerKobold/gscreenprofiles.git
cd gscreenprofiles
npm run build
```

Anschließend im Projektverzeichnis:

```sh
gnome-extensions install --force dist/gscreenprofiles@kleinerkobold.github.io.shell-extension.zip
```

Bei erstmaliger Installation gegebenenfalls abmelden und wieder anmelden, danach:

```sh
gnome-extensions enable gscreenprofiles@kleinerkobold.github.io
```

Bei einem Wechsel von einer lokalen Vorgängerversion die zutreffende bisherige Erweiterung deaktivieren:

```sh
gnome-extensions disable gwidgetscreen@oliver.local
gnome-extensions disable gscreenprofiles@oliver.local
```

Der bisherige GSettings-Speicherpfad bleibt erhalten, damit gespeicherte Bildschirmprofile weiter verfügbar sind.

## Sprachen

Die Oberfläche, Bedienhilfen und eigenen Fehlermeldungen folgen automatisch der GNOME-Systemsprache. Verfügbar sind Deutsch, Englisch, Französisch, Spanisch, Italienisch sowie europäisches und brasilianisches Portugiesisch. Für andere Sprachen dient Englisch als Rückfallsprache. Profilnamen werden unverändert übernommen; Systemmeldungen und der Bestätigungsdialog werden von GNOME übersetzt.

Übersetzungen liegen als Gettext-Kataloge in `po/*.po`. Englisch ist die Quellsprache und benötigt keinen eigenen Katalog. `npm run build` prüft und kompiliert alle Kataloge und nimmt sie in das Installationspaket auf.

Nach Änderungen an Oberflächentexten `npm run i18n:update` ausführen und bestehende Kataloge beispielsweise mit `msgmerge --update po/de.po po/gscreenprofiles.pot` aktualisieren. Für eine weitere Sprache die POT-Vorlage als `po/<Sprachcode>.po` übernehmen, den Sprachkopf ausfüllen und alle Einträge übersetzen. Benannte Platzhalter wie `{display}` müssen erhalten bleiben, dürfen aber umgestellt werden. `npm test` prüft Vollständigkeit und Platzhalter.

## Entwicklung und Prüfung

Benötigt werden Node.js, Python 3, GNU Gettext (`xgettext`, `msgfmt`, `msgmerge`), GLib und die GNOME-Erweiterungswerkzeuge.

```sh
npm test
npm run build
gjs -m tests/verify-live.js
```

Der Live-Test benötigt Zugriff auf den GNOME-Sitzungsbus. Er liest die aktuelle Konfiguration, erstellt daraus ein Profil und lässt Mutter dieses mit Methode 0 prüfen, ohne die Anzeige zu verändern.

Manueller Funktionstest nach Aktivierung: Profil speichern, in GNOMEs Anzeigeeinstellungen die Anordnung ändern, Profil wiederherstellen und bestätigen. Danach Umbenennen/Löschen über die drei Punkte sowie Abbrechen, doppelte Namen und einen abgezogenen Monitor prüfen. Diese interaktiven Schritte sind noch nicht automatisch getestet.

## Schnittstellen

- [GNOME-Mutter DisplayConfig](https://github.com/GNOME/mutter/blob/gnome-50/data/dbus-interfaces/org.gnome.Mutter.DisplayConfig.xml)
- [GNOME-Shell-Erweiterungen erstellen](https://gjs.guide/extensions/development/creating.html)
- [GNOME Shell 50](https://gjs.guide/extensions/upgrading/gnome-shell-50.html)

## Lizenz

gScreenProfiles steht unter der GNU General Public License, ausschließlich Version 2 (`GPL-2.0-only`). Der vollständige Lizenztext liegt in [LICENSE](LICENSE).
