#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-2.0-only
"""Check catalog coverage, placeholders and compiled gettext lookups."""
import gettext
import json
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent.parent

with tempfile.TemporaryDirectory(prefix='gscreenprofiles-i18n-') as tmp:
    template = Path(tmp) / 'messages.pot'
    subprocess.run([
        'xgettext', '--language=JavaScript', '--from-code=UTF-8', '--keyword=_',
        '--no-wrap', f'--output={template}',
        'extension.js', 'profiles.js',
    ], cwd=ROOT, check=True)
    messages = {json.loads(match) for match in re.findall(
        r'^msgid (".*")$', template.read_text(), re.MULTILINE)}
    messages.discard('')
    assert messages, 'No translatable messages found'
    placeholders = lambda s: sorted(re.findall(r'\{\w+\}', s))
    catalogs = sorted((ROOT / 'po').glob('*.po'))
    assert catalogs, 'No translations found'
    for source in catalogs:
        compiled = Path(tmp) / f'{source.stem}.mo'
        subprocess.run(['msgfmt', '--check', f'--output-file={compiled}', str(source)], check=True)
        with compiled.open('rb') as stream:
            translation = gettext.GNUTranslations(stream)
        catalog = {key: value for key, value in translation._catalog.items() if key}
        assert set(catalog) == messages, f'{source.name}: missing or obsolete messages'
        for message in messages:
            translated = translation.gettext(message)
            assert translated, f'{source.name}: empty translation of {message}'
            assert placeholders(message) == placeholders(translated), (source.name, message)
        print(f'{source.name}: {len(messages)} translations checked')
    fallback = gettext.translation('gscreenprofiles', localedir=tmp, languages=['xx'], fallback=True)
    assert fallback.gettext('Display profiles') == 'Display profiles'
