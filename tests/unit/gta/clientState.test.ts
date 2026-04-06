import { beforeEach, describe, expect, it } from 'vitest';

import { clientState, resetAuthForm, resetTransientClientUiState } from '../../../src/plugins/gta-mysql-core/client/state.js';

describe('client transient state reset', () => {
    beforeEach(() => {
        resetAuthForm();
        resetTransientClientUiState();
    });

    it('clears stale UI flags and auth inputs that can block hotkeys', () => {
        clientState.propertyInteractionOpen = true;
        clientState.shopMenuOpen = true;
        clientState.dealershipMenuOpen = true;
        clientState.garageMenuOpen = true;
        clientState.phoneOpen = true;
        clientState.chatOpen = true;
        clientState.authOpen = true;
        clientState.authScreen = 'login';
        clientState.authRequirePasswordChange = true;
        clientState.authMessage = 'bad password';
        clientState.authForm.loginId = 'demo@example.com';
        clientState.authForm.loginPassword = 'secret';
        clientState.justOpened = true;
        clientState.shiftPressed = true;

        resetTransientClientUiState();

        expect(clientState.propertyInteractionOpen).toBe(false);
        expect(clientState.shopMenuOpen).toBe(false);
        expect(clientState.dealershipMenuOpen).toBe(false);
        expect(clientState.garageMenuOpen).toBe(false);
        expect(clientState.phoneOpen).toBe(false);
        expect(clientState.chatOpen).toBe(false);
        expect(clientState.authOpen).toBe(false);
        expect(clientState.authScreen).toBe('menu');
        expect(clientState.authRequirePasswordChange).toBe(false);
        expect(clientState.authMessage).toBe('');
        expect(clientState.authForm.loginId).toBe('');
        expect(clientState.authForm.loginPassword).toBe('');
        expect(clientState.justOpened).toBe(false);
        expect(clientState.shiftPressed).toBe(false);
    });
});
