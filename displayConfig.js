// SPDX-License-Identifier: GPL-2.0-only
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {plan} from './profiles.js';

export class DisplayConfig {
    constructor(translate = message => message) {
        this._translate = translate;
        this.cancellable = new Gio.Cancellable();
    }

    call(method, parameters = null) {
        return new Promise((resolve, reject) => {
            Gio.DBus.session.call('org.gnome.Mutter.DisplayConfig',
                '/org/gnome/Mutter/DisplayConfig', 'org.gnome.Mutter.DisplayConfig',
                method, parameters, null, Gio.DBusCallFlags.NONE, 10000,
                this.cancellable, (connection, result) => {
                    try { resolve(connection.call_finish(result).deepUnpack()); }
                    catch (error) { reject(error); }
                });
        });
    }

    getState() {
        return this.call('GetCurrentState');
    }

    async apply(profile, method = 2) {
        const config = plan(profile, await this.getState(), this._translate);
        const wrap = props => Object.fromEntries(Object.entries(props).map(([key, val]) =>
            [key, new GLib.Variant(typeof val === 'boolean' ? 'b' : 'u', val)]));
        for (const group of config.logical)
            for (const output of group[5])
                output[2] = wrap(output[2]);
        // Persistent application uses GNOME Shell's own confirmation/revert dialog.
        // Method 1 applies for this session without confirmation or timed rollback.
        return this.call('ApplyMonitorsConfig', new GLib.Variant('(uua(iiduba(ssa{sv}))a{sv})',
            [config.serial, method, config.logical, wrap(config.properties)]));
    }

    destroy() {
        this.cancellable.cancel();
    }
}
