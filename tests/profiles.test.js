// SPDX-License-Identifier: GPL-2.0-only
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {capture, plan, checkedName} from '../profiles.js';

const spec = ['DP-1', 'ACME', 'Display', '123'];
const mode = ['mode', 1920, 1080, 60, 1, [1, 1.25, 2], {'is-current': true}];
const state = () => [42, [[spec, [mode], {'color-mode': 0, 'supported-color-modes': [0]}]],
    [[0, 0, 1.25, 1, true, [spec], {}]], {'layout-mode': 1, 'supports-changing-layout-mode': true}];

test('round trip preserves layout, primary, rotation, scale and color', () => {
    const result = plan(capture(state()), state());
    assert.deepEqual(result, {serial: 42,
        logical: [[0, 0, 1.25, 1, true, [['DP-1', 'mode', {'color-mode': 0}]]]],
        properties: {'layout-mode': 1}});
});
test('monitor can move ports but a different display cannot replace it', () => {
    const profile = capture(state());
    const moved = state();
    moved[1][0][0] = ['DP-3', ...spec.slice(1)];
    assert.equal(plan(profile, moved).logical[0][5][0][0], 'DP-3');
    moved[1][0][0] = ['DP-1', 'Other', 'Display', '999'];
    assert.throws(() => plan(profile, moved), /missing/);
});
test('missing monitor, unavailable scale and refresh mode are rejected', () => {
    const profile = capture(state());
    assert.throws(() => plan(profile, [43, [], [], {}]), /missing/);
    profile.logical[0].scale = 1.5;
    assert.throws(() => plan(profile, state()), /scaling/);
    profile.logical[0].scale = 1.25;
    profile.logical[0].monitors[0].mode.refreshMode = 'variable';
    assert.throws(() => plan(profile, state()), /refresh rate/);
});
test('mirroring is preserved and disabled monitors remain omitted', () => {
    const s = state();
    const second = ['HDMI-1', 'ACME', 'Display', '456'];
    s[1].push([second, [mode], {}]);
    assert.equal(plan(capture(s), s).logical[0][5].length, 1);
    s[2][0][5] = [spec, second];
    assert.equal(plan(capture(s), s).logical[0][5].length, 2);
});
test('names are trimmed, nonempty and unique except on own rename', () => {
    assert.equal(checkedName('  Büro  ', []), 'Büro');
    assert.throws(() => checkedName(' ', []));
    assert.throws(() => checkedName('BÜRO', [{id: 'a', name: 'Büro'}]));
    assert.equal(checkedName('Büro', [{id: 'a', name: 'Büro'}], 'a'), 'Büro');
});

test('profile validation translates messages and preserves hardware values', () => {
    const translate = message => ({
        'No display is active.': 'Kein Bildschirm aktiv.',
        'The current mode of {connector} is unknown.': 'Unbekannter Modus: {connector}.',
        'Display {display} ({connector}) is missing or ambiguous.': '{connector}: {display} fehlt.',
        'This profile name is already in use.': 'Name bereits vergeben.',
    })[message] ?? message;
    assert.throws(() => capture([0, [], [], {}], translate), {message: 'Kein Bildschirm aktiv.'});
    const noMode = state();
    noMode[1][0][1] = [];
    assert.throws(() => capture(noMode, translate), {message: 'Unbekannter Modus: DP-1.'});
    assert.throws(() => plan(capture(state()), [43, [], [], {}], translate),
        {message: 'DP-1: Display fehlt.'});
    assert.throws(() => checkedName('Büro', [{id: 'a', name: 'Büro'}], null, translate),
        {message: 'Name bereits vergeben.'});
    assert.equal(checkedName('  Büro  ', [], null, translate), 'Büro');
});

test('message formatting supports reordering and leaves inserted text literal', async () => {
    const {formatMessage} = await import('../profiles.js');
    assert.equal(formatMessage('{connector}: {display}; {connector}',
        {display: 'Panel {connector} $&', connector: 'DP-1'}),
    'DP-1: Panel {connector} $&; DP-1');
});
