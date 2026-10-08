#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-2.0-only
"""Check shexli findings, including its GNOME 51 false positive in 0.2.1."""
import importlib.metadata
import json
from pathlib import Path
import subprocess
import sys
import zipfile


VERSION_MESSAGE = ('Field `shell-version` contains invalid values, more than one '
                   'development release, or implausible future releases.')


def check_report(report, metadata, analyzer_version):
    findings = report['findings']
    if not isinstance(findings, list):
        raise ValueError('Invalid shexli findings')
    errors = 0
    for finding in findings:
        known_false_positive = (
            analyzer_version == '0.2.1'
            and report.get('spec_version') == '2026-04-02'
            and metadata.get('shell-version') == ['50', '51']
            and finding['rule_id'] == 'EGO-M-004'
            and finding['severity'] == 'error'
            and finding['message'] == VERSION_MESSAGE
            and len(finding.get('evidence', [])) == 1
            and finding['evidence'][0].get('snippet') == "shell-version=['50', '51']"
        )
        if known_false_positive:
            print('shexli 0.2.1: known GNOME 51 version-limit false positive '
                  '(EGO-M-004); metadata independently checked.')
            continue
        print(f"{finding['rule_id']} {finding['severity']}: {finding['message']}")
        if finding['severity'] == 'error':
            errors += 1
    return 1 if errors else 0


def main():
    archive = Path(sys.argv[1]).resolve()
    executable = Path(sys.executable).with_name('shexli')
    result = subprocess.run([str(executable), '--format', 'json', str(archive)],
                            check=True, capture_output=True, text=True)
    with zipfile.ZipFile(archive) as package:
        metadata = json.loads(package.read('metadata.json'))
    status = check_report(json.loads(result.stdout), metadata,
                          importlib.metadata.version('shexli'))
    if status:
        print('Package validation failed; build/install stopped.', file=sys.stderr)
    else:
        print('Package validation passed.')
    return status


if __name__ == '__main__':
    sys.exit(main())
