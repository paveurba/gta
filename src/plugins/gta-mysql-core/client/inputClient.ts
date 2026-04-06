import * as alt from 'alt-client';

import { AUTH_FIELDS, authBack, closeAuth, getActiveAuthFieldKey, handleAuthTextInput, openAuth, submitAuthForm } from './authClient.js';
import {
    closeChat,
    closePhone,
    handlePhoneKey,
    handleTextInput,
    openChat,
    openPhone,
    addNotification,
} from './chatPhoneClient.js';
import {
    closeDealershipMenu,
    closeGarageMenu,
    closeShopMenu,
    handleDealershipMenuKey,
    handleGarageMenuKey,
    handleShopMenuKey,
    openDealershipMenu,
    openGarageMenu,
    openShopMenu,
} from './commerceClient.js';
import { closePropertyMenu, handlePropertyAction, openPropertyMenu } from './propertyClient.js';
import { clientState } from './state.js';

export function handlePropertyMenuKey(key: number): void {
    if (!clientState.nearbyProperty) return;

    if (key === 27) {
        closePropertyMenu();
        return;
    }

    const isOwned = clientState.nearbyProperty.owner_player_id === clientState.currentPlayerId;
    const isForSale = clientState.nearbyProperty.owner_player_id === null;

    if (key === 49) {
        if (isForSale) handlePropertyAction('buy');
        return;
    }
    if (key === 50) {
        if (isOwned) handlePropertyAction('enter');
        return;
    }
    if (key === 51) {
        if (isOwned) handlePropertyAction('sell');
        return;
    }
    if (key === 52) {
        if (isOwned) {
            closePropertyMenu();
            openGarageMenu(clientState.nearbyProperty.id);
        }
        return;
    }
}

alt.on('keydown', (key) => {
    const keyNum = key as number;
    if (keyNum === 16 || keyNum === 160 || keyNum === 161) clientState.shiftPressed = true;
});

alt.on('keyup', (key) => {
    const keyNum = key as number;
    if (keyNum === 16 || keyNum === 160 || keyNum === 161) {
        clientState.shiftPressed = false;
        return;
    }

    if (key === 69 && !clientState.chatOpen && !clientState.phoneOpen && !clientState.propertyInteractionOpen && !clientState.shopMenuOpen && !clientState.dealershipMenuOpen && !clientState.garageMenuOpen && clientState.nearbyDealership) {
        openDealershipMenu();
        return;
    }

    if (clientState.dealershipMenuOpen) {
        handleDealershipMenuKey(key);
        return;
    }

    if (clientState.garageMenuOpen) {
        handleGarageMenuKey(key);
        return;
    }

    if (key === 69 && !clientState.chatOpen && !clientState.phoneOpen && !clientState.propertyInteractionOpen && !clientState.shopMenuOpen && !clientState.dealershipMenuOpen && !clientState.garageMenuOpen && clientState.nearbyShop && clientState.nearbyShopType) {
        if (clientState.nearbyShopType === 'weapon') {
            openShopMenu('weapon');
            alt.emitServer('weaponshop:getCatalog');
        } else if (clientState.nearbyShopType === 'clothing') {
            openShopMenu('clothing');
            alt.emitServer('clothingshop:getCatalog');
        } else if (clientState.nearbyShopType === 'casino') {
            addNotification('Casino: Use /slots <bet> or /roulette <bet> <type> <value>');
        }
        return;
    }

    if (clientState.shopMenuOpen) {
        handleShopMenuKey(key);
        return;
    }

    if (key === 69 && !clientState.chatOpen && !clientState.phoneOpen && !clientState.propertyInteractionOpen && !clientState.shopMenuOpen && !clientState.dealershipMenuOpen && !clientState.garageMenuOpen && clientState.nearbyProperty) {
        openPropertyMenu();
        return;
    }

    if (clientState.propertyInteractionOpen) {
        handlePropertyMenuKey(key);
        return;
    }

    if (key === 77 && !clientState.authOpen && !clientState.chatOpen && !clientState.propertyInteractionOpen) {
        if (clientState.phoneOpen) closePhone();
        else if (clientState.isLoggedIn) openPhone();
        return;
    }

    if (key === 84 && !clientState.authOpen && !clientState.chatOpen && !clientState.phoneOpen && !clientState.propertyInteractionOpen) {
        if (!clientState.isLoggedIn || clientState.authRequirePasswordChange) {
            openAuth(clientState.authRequirePasswordChange ? 'changePassword' : 'menu');
        } else {
            openChat();
            clientState.activeInput = 'chat';
        }
        clientState.justOpened = true;
        alt.setTimeout(() => {
            clientState.justOpened = false;
        }, 100);
        return;
    }

    if (clientState.justOpened) return;

    if (clientState.authOpen) {
        if (key === 27) {
            authBack();
            return;
        }
        if (clientState.authScreen === 'menu') {
            if (key === 49) {
                openAuth('login');
                clientState.authForm.loginId = '';
                clientState.authForm.loginPassword = '';
                clientState.activeAuthFieldIndex = 0;
                return;
            }
            if (key === 50) {
                openAuth('register');
                clientState.authForm.regUsername = '';
                clientState.authForm.regEmail = '';
                clientState.authForm.regPassword = '';
                clientState.authForm.regConfirm = '';
                clientState.activeAuthFieldIndex = 0;
                return;
            }
            if (key === 51) {
                openAuth('forgot');
                clientState.authForm.forgotEmail = '';
                clientState.activeAuthFieldIndex = 0;
                return;
            }
            if (key === 52 && clientState.currentPlayerId > 0) {
                alt.emitServer('auth:logout');
                return;
            }
        }
        if (key === 9) {
            const keys = AUTH_FIELDS[clientState.authScreen];
            if (keys.length) {
                clientState.activeAuthFieldIndex = (clientState.activeAuthFieldIndex + 1) % keys.length;
            }
            return;
        }
        if (key === 13) {
            submitAuthForm();
            return;
        }
        const field = getActiveAuthFieldKey();
        if (field !== null) {
            handleAuthTextInput(key, clientState.shiftPressed);
        }
        return;
    }

    if (clientState.phoneOpen) {
        handlePhoneKey(key);
        return;
    }

    if (clientState.chatOpen) {
        handleTextInput(key, 'chat');
    }
});
