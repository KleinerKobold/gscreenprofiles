# SPDX-License-Identifier: GPL-2.0-only
import contextlib
import copy
import importlib.util
import io
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location(
    'check_package', Path(__file__).resolve().parents[1] / 'scripts/check-package.py')
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


class PackageValidationTests(unittest.TestCase):
    def setUp(self):
        self.metadata = {'shell-version': ['50', '51']}
        self.finding = {'rule_id': 'EGO-M-004', 'severity': 'error',
                        'message': checker.VERSION_MESSAGE,
                        'evidence': [{'snippet': "shell-version=['50', '51']"}]}
        self.report = {'spec_version': '2026-04-02', 'findings': [self.finding]}

    def check(self, report=None, metadata=None, version='0.2.1'):
        with contextlib.redirect_stdout(io.StringIO()):
            return checker.check_report(report if report is not None else self.report,
                                        metadata if metadata is not None else self.metadata,
                                        version)

    def test_known_false_positive_and_clean_report_pass(self):
        self.assertEqual(self.check(), 0)
        self.assertEqual(self.check({'findings': []}), 0)

    def test_other_errors_still_stop_installation(self):
        self.report['findings'].append({'rule_id': 'EGO-M-003',
                                       'severity': 'error', 'message': 'Invalid UUID'})
        self.assertEqual(self.check(), 1)

    def test_invalid_or_future_versions_are_not_exempt(self):
        for versions in ([], ['50', '52'], ['50', 51], ['50', '51', '52']):
            self.assertEqual(self.check(metadata={'shell-version': versions}), 1)

    def test_new_analyzer_or_different_finding_is_not_exempt(self):
        self.assertEqual(self.check(version='0.2.2'), 1)
        report = copy.deepcopy(self.report)
        report['findings'][0]['message'] = 'Invalid metadata'
        self.assertEqual(self.check(report), 1)
        report = copy.deepcopy(self.report)
        report['findings'][0]['evidence'] = []
        self.assertEqual(self.check(report), 1)

    def test_warning_does_not_fail_build(self):
        self.assertEqual(self.check({'findings': [
            {'rule_id': 'warning', 'severity': 'warning', 'message': 'Review'}]}), 0)

    def test_invalid_report_fails_closed(self):
        with self.assertRaises((KeyError, ValueError)):
            self.check({})
        with self.assertRaises(ValueError):
            self.check({'findings': None})


if __name__ == '__main__':
    unittest.main()
