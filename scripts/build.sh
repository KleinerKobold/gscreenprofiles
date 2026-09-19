#!/bin/sh
# SPDX-License-Identifier: GPL-2.0-only
set -eu
cd "$(dirname "$0")/.."

for tool in python3 virtualenv glib-compile-schemas gnome-extensions msgfmt; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        printf 'Missing required tool: %s\n' "$tool" >&2
        printf 'Install Python 3, virtualenv, GLib, GNU Gettext and the GNOME extension tools.\n' >&2
        exit 1
    fi
done

if [ ! -x venv/bin/python ]; then
    virtualenv --python=python3 venv
fi
venv/bin/python -m pip install --upgrade shexli

python3 scripts/check-translations.py
glib-compile-schemas --strict schemas
mkdir -p dist
gnome-extensions pack --force --out-dir=dist --podir=po \
    --extra-source=profiles.js \
    --extra-source=displayConfig.js \
    --extra-source=icons \
    --extra-source=LICENSE

uuid=$(python3 -c 'import json; print(json.load(open("metadata.json"))["uuid"])')
archive="$(pwd)/dist/$uuid.shell-extension.zip"
test -s "$archive"
printf '\nChecking package with shexli...\n'
venv/bin/shexli "$archive"
printf '\nPackage ready: %s\n' "$archive"
printf 'Upload this ZIP at https://extensions.gnome.org/upload/\n'
