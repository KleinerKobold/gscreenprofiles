#!/bin/sh
# SPDX-License-Identifier: GPL-2.0-only
set -eu
cd "$(dirname "$0")/.."
python3 scripts/check-translations.py
glib-compile-schemas --strict schemas
gnome-extensions pack --force --out-dir=dist --podir=po --extra-source=profiles.js --extra-source=displayConfig.js --extra-source=icons --extra-source=LICENSE
