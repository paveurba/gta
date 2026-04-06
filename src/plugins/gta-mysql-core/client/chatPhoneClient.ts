import * as alt from 'alt-client';
import * as native from 'natives';

import { MAX_CHAT_HISTORY } from './constants.js';
import { clientState } from './state.js';

export function addNotification(msg: string): void {
    clientState.chatHistory.unshift(`> ${msg}`);
    if (clientState.chatHistory.length > MAX_CHAT_HISTORY) clientState.chatHistory.pop();
}

export function openChat(): void {
    if (clientState.chatOpen || clientState.phoneOpen || clientState.propertyInteractionOpen) return;
    clientState.chatOpen = true;
    clientState.chatInput = '';
    alt.showCursor(true);
    alt.toggleGameControls(false);
}

export function closeChat(): void {
    if (!clientState.chatOpen) return;
    clientState.chatOpen = false;
    clientState.chatInput = '';
    alt.showCursor(false);
    alt.toggleGameControls(true);
}

export function sendChat(): void {
    if (clientState.chatInput.trim().length === 0) {
        closeChat();
        return;
    }
    const msg = clientState.chatInput.trim();
    clientState.chatHistory.unshift(msg);
    if (clientState.chatHistory.length > MAX_CHAT_HISTORY) clientState.chatHistory.pop();
    alt.emitServer('gta:chat:send', msg);
    closeChat();
}

export function openPhone(): void {
    if (clientState.phoneOpen || clientState.propertyInteractionOpen) return;
    clientState.phoneOpen = true;
    clientState.phoneTab = 'main';
    clientState.phoneInput = '';
    clientState.phoneInput2 = '';
    alt.showCursor(true);
    alt.toggleGameControls(false);
    alt.emitServer('phone:getData');
}

export function closePhone(): void {
    if (!clientState.phoneOpen) return;
    clientState.phoneOpen = false;
    alt.showCursor(false);
    alt.toggleGameControls(true);
}

export function handleTextInput(key: number, target: 'chat' | 'phone1' | 'phone2'): void {
    let input = target === 'chat' ? clientState.chatInput : target === 'phone1' ? clientState.phoneInput : clientState.phoneInput2;

    if (key === 13 && target === 'chat') {
        sendChat();
        return;
    }
    if (key === 27 && target === 'chat') {
        closeChat();
        return;
    }
    if (key === 8) {
        input = input.slice(0, -1);
    } else if (key >= 65 && key <= 90) {
        const char = String.fromCharCode(key);
        input += clientState.shiftPressed ? char : char.toLowerCase();
    } else if (key >= 48 && key <= 57) {
        if (clientState.shiftPressed) {
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
        } else {
            input += String.fromCharCode(key);
        }
    } else if (key === 32) {
        input += ' ';
    } else {
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
        if (specialKeys[key]) input += clientState.shiftPressed ? specialKeys[key][1] : specialKeys[key][0];
    }

    if (target === 'chat') clientState.chatInput = input;
    else if (target === 'phone1') clientState.phoneInput = input;
    else clientState.phoneInput2 = input;
}

export function handlePhoneKey(key: number): void {
    if (key === 27) {
        if (clientState.phoneTab === 'main') closePhone();
        else clientState.phoneTab = 'main';
        return;
    }

    if (clientState.phoneTab === 'main') {
        if (key === 49) {
            clientState.phoneTab = 'contacts';
            return;
        }
        if (key === 50) {
            clientState.phoneTab = 'messages';
            return;
        }
        if (key === 51) {
            clientState.phoneTab = 'addContact';
            clientState.phoneInput = '';
            clientState.phoneInput2 = '';
            clientState.activeInput = 'phone1';
            return;
        }
        if (key === 52) {
            clientState.phoneTab = 'sendMessage';
            clientState.phoneInput = '';
            clientState.phoneInput2 = '';
            clientState.activeInput = 'phone1';
            return;
        }
    }

    if (key === 9 && (clientState.phoneTab === 'addContact' || clientState.phoneTab === 'sendMessage')) {
        clientState.activeInput = clientState.activeInput === 'phone1' ? 'phone2' : 'phone1';
        return;
    }

    if (key === 13) {
        if (clientState.phoneTab === 'addContact' && clientState.phoneInput && clientState.phoneInput2) {
            alt.emitServer('phone:addContact', clientState.phoneInput, clientState.phoneInput2);
            clientState.phoneTab = 'main';
        } else if (clientState.phoneTab === 'sendMessage' && clientState.phoneInput && clientState.phoneInput2) {
            const receiverId = parseInt(clientState.phoneInput, 10);
            if (receiverId) {
                alt.emitServer('phone:sendMessage', receiverId, clientState.phoneInput2);
                clientState.phoneTab = 'main';
            }
        }
        return;
    }

    if (clientState.phoneTab === 'addContact' || clientState.phoneTab === 'sendMessage') {
        handleTextInput(key, clientState.activeInput);
    }
}

alt.onServer('gta:notify', (message: string) => {
    native.beginTextCommandThefeedPost('STRING');
    native.addTextComponentSubstringPlayerName(message);
    native.endTextCommandThefeedPostTicker(false, false);
    addNotification(message);
});

alt.onServer('phone:data', (data: { contacts: any[]; messages: any[]; unreadCount: number }) => {
    clientState.phoneContacts = data.contacts;
    clientState.phoneMessages = data.messages;
    clientState.phoneUnread = data.unreadCount;
});

alt.onServer('phone:newMessage', (msg: any) => {
    clientState.phoneMessages.unshift(msg);
    clientState.phoneUnread++;
    addNotification(`New message from ${msg.sender_id}`);
});
