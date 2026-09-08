// SPDX-License-Identifier: GPL-2.0-only
// Pure profile conversion, shared by the extension and tests.
const value = v => v?.deepUnpack ? v.deepUnpack() : v;
const sameHardware = (a, b) => a.slice(1).every((v, i) => v === b[i + 1]);

export function capture(state, _ = message => message) {
    const [, monitors, logical, properties] = state;
    if (!logical.length)
        throw new Error(_('No display is active.'));
    return {
        layoutMode: value(properties['layout-mode']) ?? 1,
        logical: logical.map(([x, y, scale, transform, primary, specs]) => ({
            x, y, scale, transform, primary,
            monitors: specs.map(spec => {
                const monitor = monitors.find(([s]) => s.every((v, i) => v === spec[i]));
                const mode = monitor?.[1].find(m => value(m[6]['is-current']));
                if (!mode)
                    throw new Error(formatMessage(_('The current mode of {connector} is unknown.'), {connector: spec[0]}));
                const props = monitor[2];
                return {
                    spec, mode: {id: mode[0], width: mode[1], height: mode[2],
                        refresh: mode[3], interlaced: value(mode[6]['is-interlaced']) ?? false,
                        refreshMode: value(mode[6]['refresh-rate-mode']) ?? 'fixed'},
                    underscanning: value(props['is-underscanning']),
                    colorMode: value(props['color-mode']),
                };
            }),
        })),
    };
}

export function plan(profile, state, _ = message => message) {
    const [serial, monitors, , properties] = state;
    const used = new Set();
    if (!profile.logical?.length)
        throw new Error(_('The profile contains no active displays.'));
    const logical = profile.logical.map(group => {
        const outputs = group.monitors.map(saved => {
            const candidates = monitors.filter(([spec]) => sameHardware(spec, saved.spec));
            const monitor = candidates.find(([spec]) => spec[0] === saved.spec[0]) ??
                (candidates.length === 1 ? candidates[0] : null);
            if (!monitor || used.has(monitor[0][0]))
                throw new Error(formatMessage(_('Display {display} ({connector}) is missing or ambiguous.'), {display: saved.spec[2], connector: saved.spec[0]}));
            const [spec, modes, props] = monitor;
            used.add(spec[0]);
            const matches = m => m[1] === saved.mode.width && m[2] === saved.mode.height &&
                Math.abs(m[3] - saved.mode.refresh) < 0.01 &&
                (value(m[6]['refresh-rate-mode']) ?? 'fixed') === saved.mode.refreshMode &&
                (value(m[6]['is-interlaced']) ?? false) === saved.mode.interlaced;
            const mode = modes.find(m => m[0] === saved.mode.id && matches(m)) ?? modes.find(matches);
            if (!mode || !mode[5].some(s => Math.abs(s - group.scale) < 0.00001))
                throw new Error(formatMessage(_('Resolution, refresh rate or scaling for {display} is unavailable.'), {display: spec[2]}));
            const outputProps = {};
            if (saved.underscanning !== undefined) {
                if (props['is-underscanning'] === undefined && saved.underscanning)
                    throw new Error(formatMessage(_('Underscanning for {display} is unavailable.'), {display: spec[2]}));
                if (props['is-underscanning'] !== undefined)
                    outputProps.underscanning = saved.underscanning;
            }
            if (saved.colorMode !== undefined) {
                const supported = value(props['supported-color-modes']);
                if (supported && !supported.includes(saved.colorMode))
                    throw new Error(formatMessage(_('Color mode for {display} is unavailable.'), {display: spec[2]}));
                outputProps['color-mode'] = saved.colorMode;
            }
            return [spec[0], mode[0], outputProps];
        });
        return [group.x, group.y, group.scale, group.transform, group.primary, outputs];
    });
    const globalProps = {};
    if (value(properties['supports-changing-layout-mode']))
        globalProps['layout-mode'] = profile.layoutMode;
    else if (profile.layoutMode !== (value(properties['layout-mode']) ?? 1))
        throw new Error(_('The saved layout mode is not supported.'));
    return {serial, logical, properties: globalProps};
}

export function checkedName(name, profiles, exceptId = null, _ = message => message) {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 80)
        throw new Error(_('Enter a name with 1 to 80 characters.'));
    if (profiles.some(p => p.id !== exceptId && p.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase()))
        throw new Error(_('This profile name is already in use.'));
    return trimmed;
}

// Named placeholders let translators reorder values without translating user data.
export function formatMessage(message, values) {
    return message.replace(/\{(\w+)\}/g, (token, key) =>
        Object.hasOwn(values, key) ? String(values[key]) : token);
}
