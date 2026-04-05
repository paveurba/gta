import * as alt from 'alt-client';

import type { AuthScreen } from './types';
import { clientState, resetAuthForm } from './state';

const AUTH_FIELDS: Record<AuthScreen, (keyof typeof clientState.authForm)[]> = {
    menu: [],
    login: ['loginId', 'loginPassword'],
    register: ['regUsername', 'regEmail', 'regPassword', 'regConfirm'],
    forgot: ['forgotEmail'],
    changePassword: ['changeCurrent', 'changeNew', 'changeConfirm'],
};

export function getActiveAuthFieldKey(): keyof typeof clientState.authForm | null {
    const keys = AUTH_FIELDS[clientState.authScreen];
    if (!keys.length || clientState.activeAuthFieldIndex >= keys.length) return null;
    return keys[clientState.activeAuthFieldIndex];
}

export function openAuth(screen: AuthScreen = 'menu'): void {
    clientState.authOpen = true;
    clientState.authScreen = screen;
    clientState.authMessage = '';
    clientState.activeAuthFieldIndex = 0;
    if (screen === 'menu') clientState.authRequirePasswordChange = false;
    alt.showCursor(true);
    alt.toggleGameControls(false);
}

export function closeAuth(): void {
    if (clientState.authRequirePasswordChange) return;
    clientState.authOpen = false;
    clientState.authScreen = 'menu';
    clientState.authMessage = '';
    resetAuthForm();
    clientState.activeAuthFieldIndex = 0;
    alt.showCursor(false);
    alt.toggleGameControls(true);
}

export function authBack(): void {
    if (clientState.authRequirePasswordChange && clientState.authScreen === 'changePassword') return;
    if (clientState.authScreen === 'menu') closeAuth();
    else {
        clientState.authScreen = 'menu';
        clientState.authMessage = '';
        clientState.activeAuthFieldIndex = 0;
    }
}

export function submitAuthForm(): void {
    const f = clientState.authForm;
    if (clientState.authScreen === 'login') {
        alt.emitServer('auth:login', f.loginId.trim(), f.loginPassword);
    } else if (clientState.authScreen === 'register') {
        alt.emitServer('auth:register', f.regUsername.trim(), f.regEmail.trim(), f.regPassword, f.regConfirm);
    } else if (clientState.authScreen === 'forgot') {
        alt.emitServer('auth:forgotPassword', f.forgotEmail.trim());
    } else if (clientState.authScreen === 'changePassword') {
        alt.emitServer('auth:changePassword', f.changeCurrent, f.changeNew, f.changeConfirm);
    }
}

export function handleAuthTextInput(key: number, shiftPressed: boolean): void {
    const field = getActiveAuthFieldKey();
    if (!field) return;
    let input = clientState.authForm[field];

    if (key === 8) input = input.slice(0, -1);
    else if (key >= 65 && key <= 90) {
        const char = String.fromCharCode(key);
        input += shiftPressed ? char : char.toLowerCase();
    } else if (key >= 48 && key <= 57) {
        if (shiftPressed) {
            const shiftNumbers: { [k: number]: string } = {
                48: ')',
                49: '!',
                50: '@',
                51: '#',
                52: '$',
                53: '%',
                54: '^',
                55: '&',
                56: '*',
                57: '(',
            };
            input += shiftNumbers[key] || '';
        } else input += String.fromCharCode(key);
    } else if (key === 32) input += ' ';
    else {
        const specialKeys: { [k: number]: [string, string] } = {
            190: ['.', '>'],
            188: [',', '<'],
            191: ['/', '?'],
            189: ['-', '_'],
            187: ['=', '+'],
            192: ['`', '~'],
            219: ['[', '{'],
            221: [']', '}'],
            220: ['\\', '|'],
            186: [';', ':'],
            222: ["'", '"'],
        };
        if (specialKeys[key]) input += shiftPressed ? specialKeys[key][1] : specialKeys[key][0];
    }

    clientState.authForm = { ...clientState.authForm, [field]: input };
}

export { AUTH_FIELDS };

alt.onServer('auth:registerResult', (result: { success: boolean; message: string }) => {
    clientState.authMessage = result.message;
    if (result.success) closeAuth();
});

alt.onServer('auth:loginResult', (result: { success: boolean; message: string; passwordChangeRequired: boolean }) => {
    clientState.authMessage = result.message;
    if (result.success && result.passwordChangeRequired) {
        clientState.authRequirePasswordChange = true;
        clientState.authScreen = 'changePassword';
        clientState.authForm.changeCurrent = '';
        clientState.authForm.changeNew = '';
        clientState.authForm.changeConfirm = '';
        clientState.activeAuthFieldIndex = 0;
    } else if (result.success) {
        closeAuth();
    }
});

alt.onServer('auth:forgotPasswordResult', (result: { success: boolean; message: string }) => {
    clientState.authMessage = result.message;
});

alt.onServer('auth:changePasswordResult', (result: { success: boolean; message: string }) => {
    clientState.authMessage = result.message;
    if (result.success) {
        clientState.authRequirePasswordChange = false;
        closeAuth();
    }
});
