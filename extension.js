// SPDX-License-Identifier: GPL-2.0-only
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {DisplayConfig} from './displayConfig.js';
import {capture, checkedName, formatMessage} from './profiles.js';

export default class ScreenProfiles extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._display = new DisplayConfig(_);
        this._dialogs = new Map();
        this._busy = false;
        this._button = new PanelMenu.Button(0.0, _('Display profiles'));
        this._button.add_child(new St.Icon({
            gicon: Gio.icon_new_for_string(`${this.path}/icons/dual-screen-symbolic.svg`),
            style_class: 'system-status-icon',
        }));
        Main.panel.addToStatusArea(this.uuid, this._button);
        this._changed = this._settings.connect('changed::profiles', () => this._render());
        this._confirmationChanged = this._settings.connect('changed::confirm-changes', () => {
            this._confirmationSwitch?.setToggleState(this._settings.get_boolean('confirm-changes'));
        });
        this._render();
    }

    _profiles() {
        const profiles = JSON.parse(this._settings.get_string('profiles'));
        if (!Array.isArray(profiles) || profiles.some(p =>
            typeof p.id !== 'string' || typeof p.name !== 'string' || !Array.isArray(p.logical)))
            throw new Error(_('Saved profiles could not be read.'));
        return profiles;
    }

    _write(profiles) {
        if (!this._settings.set_string('profiles', JSON.stringify(profiles)))
            throw new Error(_('Profiles could not be saved.'));
    }

    _error(error) {
        if (this._button)
            Main.notifyError('gScreenProfiles', error.message);
    }

    _iconButton(icon, label, action) {
        const button = new St.Button({
            style_class: 'button gsp-icon-button', can_focus: true,
            accessible_name: label,
            child: new St.Icon({icon_name: icon, icon_size: 16}),
        });
        button.connect('clicked', action);
        return button;
    }

    _render() {
        this._confirmationSwitch = null;
        this._button.menu.removeAll();
        this._button.menu.addMenuItem(new PopupMenu.PopupMenuItem(_('Display profiles'), {reactive: false}));
        let profiles;
        try { profiles = this._profiles(); }
        catch (error) {
            this._button.menu.addMenuItem(new PopupMenu.PopupMenuItem(error.message, {reactive: false}));
            return;
        }
        if (!profiles.length)
            this._button.menu.addMenuItem(new PopupMenu.PopupMenuItem(_('No profiles saved yet'), {reactive: false}));
        for (const profile of profiles) {
            // Separate buttons prevent editing actions from activating the profile.
            const row = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false});
            const apply = new St.Button({
                label: profile.name, x_expand: true, can_focus: true,
                accessible_name: formatMessage(_('Restore {name}'), {name: profile.name}),
                style_class: 'gsp-profile-button', reactive: !this._busy,
            });
            apply.connect('clicked', () => this._apply(profile));
            row.add_child(apply);
            const actions = new St.BoxLayout({style_class: 'gsp-actions', visible: false});
            actions.add_child(this._iconButton('document-edit-symbolic', _('Rename'), () => this._nameDialog(profile)));
            actions.add_child(this._iconButton('user-trash-symbolic', _('Delete'), () => {
                try { this._write(this._profiles().filter(p => p.id !== profile.id)); }
                catch (error) { this._error(error); }
            }));
            row.add_child(actions);
            row.add_child(this._iconButton('view-more-symbolic', _('Profile actions'), () => {
                actions.visible = !actions.visible;
            }));
            this._button.menu.addMenuItem(row);
        }
        this._button.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const save = new PopupMenu.PopupMenuItem(_('Save current configuration…'));
        save.setSensitive(!this._busy);
        save.connect('activate', () => this._nameDialog());
        this._button.menu.addMenuItem(save);
        this._button.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this._confirmationSwitch = new PopupMenu.PopupSwitchMenuItem(
            _('Confirm changes'), this._settings.get_boolean('confirm-changes'));
        this._confirmationSwitch.connect('toggled', (item, state) => {
            this._settings.set_boolean('confirm-changes', state);
            item.setToggleState(this._settings.get_boolean('confirm-changes'));
        });
        this._button.menu.addMenuItem(this._confirmationSwitch);
    }

    _nameDialog(profile = null) {
        this._button.menu.close();
        const dialog = new ModalDialog.ModalDialog({styleClass: 'gsp-dialog'});
        dialog.contentLayout.add_child(new St.Label({
            text: profile ? _('Rename profile') : _('Save display profile'),
            style_class: 'gsp-dialog-title',
        }));
        const entry = new St.Entry({text: profile?.name ?? '', hint_text: _('Profile name'), can_focus: true});
        dialog.contentLayout.add_child(entry);
        const errorLabel = new St.Label({text: '', style_class: 'gsp-error'});
        errorLabel.clutter_text.line_wrap = true;
        dialog.contentLayout.add_child(errorLabel);
        let pending = false;
        const submit = async () => {
            if (pending)
                return;
            pending = true;
            try {
                const name = checkedName(entry.get_text(), this._profiles(), profile?.id, _);
                if (profile) {
                    this._write(this._profiles().map(p => p.id === profile.id ? {...p, name} : p));
                } else {
                    const display = this._display;
                    const snapshot = capture(await display.getState(), _);
                    if (this._display !== display || !this._dialogs.has(dialog))
                        return;
                    const profiles = this._profiles();
                    checkedName(name, profiles, null, _);
                    this._write([...profiles, {...snapshot, id: GLib.uuid_string_random(), name}]);
                }
                dialog.close();
            } catch (error) {
                if (this._dialogs?.has(dialog))
                    errorLabel.text = error.message;
            } finally {
                pending = false;
            }
        };
        dialog.setButtons([
            {label: _('Cancel'), action: () => dialog.close(), key: Clutter.KEY_Escape},
            {label: _('Save'), action: submit, default: true},
        ]);
        const text = entry.clutter_text;
        const activateId = text.connect('activate', submit);
        const destroyId = dialog.connect('destroy', () => this._disconnectDialogSignals(dialog));
        this._dialogs.set(dialog, {text, activateId, destroyId});
        dialog.setInitialKeyFocus(entry);
        dialog.open();
    }

    _disconnectDialogSignals(dialog) {
        const signals = this._dialogs?.get(dialog);
        if (!signals)
            return;
        signals.text.disconnect(signals.activateId);
        dialog.disconnect(signals.destroyId);
        this._dialogs.delete(dialog);
    }

    async _apply(profile) {
        if (this._busy)
            return;
        this._busy = true;
        const display = this._display;
        this._button.menu.close();
        this._render();
        try { await display.apply(profile, this._settings.get_boolean('confirm-changes') ? 2 : 1); }
        catch (error) {
            if (this._display === display)
                this._error(error);
        } finally {
            if (this._display === display) {
                this._busy = false;
                this._render();
            }
        }
    }

    disable() {
        this._display?.destroy();
        this._display = null;
        for (const dialog of this._dialogs?.keys() ?? []) {
            this._disconnectDialogSignals(dialog);
            dialog.destroy();
        }
        this._dialogs = null;
        if (this._changed)
            this._settings.disconnect(this._changed);
        this._changed = null;
        if (this._confirmationChanged)
            this._settings.disconnect(this._confirmationChanged);
        this._confirmationChanged = null;
        this._confirmationSwitch?.destroy();
        this._confirmationSwitch = null;
        this._button?.destroy();
        this._button = null;
        this._settings = null;
    }
}
