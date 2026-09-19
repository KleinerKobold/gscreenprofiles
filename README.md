# gScreenProfiles

**English** · [Deutsch](README.de.md)

A GNOME Shell 50 extension with a dual-monitor icon in the top bar.

[Source code](https://github.com/KleinerKobold/gscreenprofiles) · [Report an issue](https://github.com/KleinerKobold/gscreenprofiles/issues)

## Usage

- Click the icon and select “Save current configuration…”. Enter a unique name.
- Click a profile to restore its display configuration. GNOME asks whether to keep the change; without confirmation, the change is reverted.
- Turn off “Confirm changes” in the menu (enabled by default) to apply profiles immediately without a dialog or automatic rollback. This display configuration applies for the current session and is not saved as the GNOME default for the next login. The switch setting and saved profiles persist.
- The three dots next to a profile reveal the rename and delete buttons. Deleting immediately removes only the saved profile.

Profiles store active displays, resolution, refresh rate (including fixed/variable), scaling, rotation, position, primary display, mirroring, layout mode, and color mode and underscanning where available. Displays that are not active in the profile are disabled when it is applied. Missing or ambiguously identified active monitors and unavailable display modes result in an error message.

Profiles persist across logouts in GSettings. Brightness, Night Light, ICC profiles, and window positions are not included in a profile.

## Installation

Build the package from source (see the required tools below):

```sh
git clone https://github.com/KleinerKobold/gscreenprofiles.git
cd gscreenprofiles
npm run build
```

Then, from the project directory:

```sh
gnome-extensions install --force dist/gscreenprofiles@kleinerkobold.github.io.shell-extension.zip
```

For a first-time installation, log out and back in if necessary, then run:

```sh
gnome-extensions enable gscreenprofiles@kleinerkobold.github.io
```

When upgrading from an earlier local version, disable the corresponding old extension:

```sh
gnome-extensions disable gwidgetscreen@oliver.local
gnome-extensions disable gscreenprofiles@oliver.local
```

The original GSettings storage path is retained so that saved display profiles remain available.

## Languages

The interface, accessibility labels, and the extension's own error messages automatically follow the GNOME system language. Available languages are German, English, French, Spanish, Italian, and European and Brazilian Portuguese. English is the fallback for other languages. Profile names are preserved unchanged; system messages and the confirmation dialog are translated by GNOME.

Translations are stored as Gettext catalogs in `po/*.po`. English is the source language and does not need its own catalog. `npm run build` validates and compiles all catalogs and includes them in the installation package.

After changing interface text, run `npm run i18n:update` and update existing catalogs, for example with `msgmerge --update po/de.po po/gscreenprofiles.pot`. To add another language, copy the POT template to `po/<language-code>.po`, fill in the language header, and translate all entries. Named placeholders such as `{display}` must be preserved but may be reordered. `npm test` checks completeness and placeholders.

## Development and testing

Required tools: Node.js, Python 3, GNU Gettext (`xgettext`, `msgfmt`, `msgmerge`), GLib, and the GNOME extension tools.

```sh
npm test
npm run build
gjs -m tests/verify-live.js
```

The live test requires access to the GNOME session bus. It reads the current configuration, captures it as a profile, and asks Mutter to validate it using method 0 without changing the display configuration.

Manual functional test after enabling the extension: save a profile, change the arrangement in GNOME's display settings, then restore the profile and confirm. Next, test renaming and deleting via the three dots, cancellation, duplicate names, and a disconnected monitor. These interactive steps are not yet covered by automated tests.

## Interfaces and references

- [GNOME Mutter DisplayConfig](https://github.com/GNOME/mutter/blob/gnome-50/data/dbus-interfaces/org.gnome.Mutter.DisplayConfig.xml)
- [Creating GNOME Shell extensions](https://gjs.guide/extensions/development/creating.html)
- [GNOME Shell 50](https://gjs.guide/extensions/upgrading/gnome-shell-50.html)

## License

gScreenProfiles is licensed under the GNU General Public License, version 2 only (`GPL-2.0-only`). The full license text is available in [LICENSE](LICENSE).
