// SPDX-License-Identifier: GPL-2.0-only
// Read and verify only: method 0 never changes the monitor configuration.
import GLib from 'gi://GLib';
import {DisplayConfig} from '../displayConfig.js';
import {capture} from '../profiles.js';
const loop = new GLib.MainLoop(null, false);
const display = new DisplayConfig();
let failed = false;
(async () => {
    try {
        const profile = capture(await display.getState());
        await display.apply(profile, 0);
        print(`OK: ${profile.logical.length} Bildschirmgruppen ausgelesen und von Mutter validiert.`);
    } catch (error) {
        printerr(error.message);
        failed = true;
    } finally {
        display.destroy();
        loop.quit();
    }
})();
loop.run();
if (failed)
    throw new Error('Live-Verifikation fehlgeschlagen');
