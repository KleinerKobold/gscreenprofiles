#!/bin/sh
# SPDX-License-Identifier: GPL-2.0-only
set -eu
cd "$(dirname "$0")/.."

sh scripts/build.sh

uuid=$(python3 -c 'import json; print(json.load(open("metadata.json"))["uuid"])')
archive="$(pwd)/dist/$uuid.shell-extension.zip"
gnome-extensions install --force "$archive"

printf '\nInstalled locally: %s\n' "$uuid"
printf 'Log out and back in to load the installed version, then enable it with:\n'
printf '  gnome-extensions enable %s\n' "$uuid"
