import * as alt from 'alt-client';
import * as native from 'natives';

import { clientState } from './state.js';
import { SAFE_SPAWN } from './constants.js';
import {
    drawAuthOverlay,
    drawDeathScreen,
    drawDealershipMenu,
    drawDealershipMarkers,
    drawGarageMenu,
    drawPlayerNametags,
    drawPropertyMarkers,
    drawPropertyMenu,
    drawRect,
    drawShopMenuUi,
    drawShopMarkers,
    drawText,
    drawTextLeft,
} from './draw.js';
import { disableAmbientPopulation, forceSafeGroundSpawn } from './worldClient.js';

alt.everyTick(() => {
    disableAmbientPopulation();

    if (clientState.isDisconnected) {
        drawRect(0.5, 0.5, 1.0, 1.0, 0, 0, 0, 220);
        drawRect(0.5, 0.5, 0.4, 0.22, 25, 25, 35, 245);
        drawTextLeft('Connection lost', 0.32, 0.38, 0.55, 255, 100, 100);
        drawTextLeft('Reconnecting...', 0.32, 0.46, 0.4, 255, 255, 255);
        drawTextLeft(`Attempt ${clientState.reconnectAttempts}`, 0.32, 0.52, 0.32, 180, 180, 180);
        drawTextLeft('If this does not reconnect, use the server list to reconnect.', 0.32, 0.62, 0.28, 150, 150, 150);
        return;
    }

    if (clientState.authOpen) {
        alt.showCursor(true);
        alt.toggleGameControls(false);
        drawAuthOverlay();
        return;
    }

    if (clientState.isDead) {
        drawDeathScreen();
        return;
    }

    if (clientState.isLoggedIn) {
        drawText(`$${clientState.playerMoney.toLocaleString()}`, 0.98, 0.02, 0.5, 114, 204, 114);
        drawText(`Bank: $${clientState.playerBank.toLocaleString()}`, 0.98, 0.055, 0.35, 200, 200, 200);
    } else {
        drawText('Login required', 0.98, 0.02, 0.35, 255, 255, 255);
    }

    drawPlayerNametags();

    drawPropertyMarkers();

    drawShopMarkers();

    drawPropertyMenu();

    drawShopMenuUi();

    drawDealershipMenu();

    drawGarageMenu();

    drawDealershipMarkers();

    if (clientState.showCasinoResult > Date.now()) {
        drawRect(0.5, 0.3, 0.3, 0.15, 0, 0, 0, 200);
        if (clientState.slotsResult) {
            const sr = clientState.slotsResult;
            drawTextLeft(`[ ${sr.symbols.join(' | ')} ]`, 0.38, 0.26, 0.6, 255, 215, 0);
            const resultColor = sr.won ? [100, 255, 100] : [255, 100, 100];
            drawTextLeft(sr.won ? `WIN: $${sr.winAmount}` : 'No win', 0.42, 0.32, 0.5, resultColor[0], resultColor[1], resultColor[2]);
        }
        if (clientState.rouletteResult) {
            const rr = clientState.rouletteResult;
            const colorMap: { [k: string]: number[] } = { red: [255, 50, 50], black: [50, 50, 50], green: [50, 255, 50] };
            const col = colorMap[rr.color] || [255, 255, 255];
            drawTextLeft(`${rr.number} (${rr.color})`, 0.42, 0.26, 0.6, col[0], col[1], col[2]);
            const resultColor = rr.won ? [100, 255, 100] : [255, 100, 100];
            drawTextLeft(rr.won ? `WIN: $${rr.winAmount}` : 'No win', 0.42, 0.32, 0.5, resultColor[0], resultColor[1], resultColor[2]);
        }
    }

    if (clientState.phoneOpen) {
        drawRect(0.5, 0.5, 0.25, 0.5, 30, 30, 40, 240);
        drawTextLeft('PHONE', 0.4, 0.28, 0.5, 100, 200, 255);

        if (clientState.phoneTab === 'main') {
            drawTextLeft('[1] Contacts', 0.4, 0.35, 0.4, 255, 255, 255);
            drawTextLeft('[2] Messages' + (clientState.phoneUnread > 0 ? ` (${clientState.phoneUnread})` : ''), 0.4, 0.4, 0.4, 255, 255, 255);
            drawTextLeft('[3] Add Contact', 0.4, 0.45, 0.4, 255, 255, 255);
            drawTextLeft('[4] Send Message', 0.4, 0.5, 0.4, 255, 255, 255);
            drawTextLeft('[ESC] Close', 0.4, 0.6, 0.35, 150, 150, 150);
        } else if (clientState.phoneTab === 'contacts') {
            drawTextLeft('CONTACTS', 0.4, 0.35, 0.4, 100, 200, 255);
            clientState.phoneContacts.slice(0, 5).forEach((c, i) => {
                drawTextLeft(`${c.contact_name}: ${c.contact_number}`, 0.4, 0.4 + i * 0.04, 0.35, 255, 255, 255);
            });
            if (clientState.phoneContacts.length === 0) drawTextLeft('No contacts', 0.4, 0.4, 0.35, 150, 150, 150);
            drawTextLeft('[ESC] Back', 0.4, 0.6, 0.35, 150, 150, 150);
        } else if (clientState.phoneTab === 'messages') {
            drawTextLeft('MESSAGES', 0.4, 0.35, 0.4, 100, 200, 255);
            clientState.phoneMessages.slice(0, 4).forEach((m, i) => {
                const preview = m.message.length > 20 ? m.message.slice(0, 20) + '...' : m.message;
                drawTextLeft(
                    `From ${m.sender_id}: ${preview}`,
                    0.4,
                    0.4 + i * 0.04,
                    0.3,
                    m.is_read ? 150 : 255,
                    m.is_read ? 150 : 255,
                    m.is_read ? 150 : 255
                );
            });
            if (clientState.phoneMessages.length === 0) drawTextLeft('No messages', 0.4, 0.4, 0.35, 150, 150, 150);
            drawTextLeft('[ESC] Back', 0.4, 0.6, 0.35, 150, 150, 150);
        } else if (clientState.phoneTab === 'addContact') {
            drawTextLeft('ADD CONTACT', 0.4, 0.35, 0.4, 100, 200, 255);
            drawTextLeft('Name:', 0.4, 0.42, 0.35, 200, 200, 200);
            drawRect(
                0.5,
                0.465,
                0.2,
                0.03,
                clientState.activeInput === 'phone1' ? 60 : 40,
                clientState.activeInput === 'phone1' ? 60 : 40,
                clientState.activeInput === 'phone1' ? 80 : 50,
                255
            );
            drawTextLeft(clientState.phoneInput + (clientState.activeInput === 'phone1' ? '_' : ''), 0.41, 0.455, 0.35, 255, 255, 255);
            drawTextLeft('Number:', 0.4, 0.5, 0.35, 200, 200, 200);
            drawRect(
                0.5,
                0.525,
                0.2,
                0.03,
                clientState.activeInput === 'phone2' ? 60 : 40,
                clientState.activeInput === 'phone2' ? 60 : 40,
                clientState.activeInput === 'phone2' ? 80 : 50,
                255
            );
            drawTextLeft(clientState.phoneInput2 + (clientState.activeInput === 'phone2' ? '_' : ''), 0.41, 0.515, 0.35, 255, 255, 255);
            drawTextLeft('[TAB] Switch | [ENTER] Save | [ESC] Back', 0.4, 0.6, 0.3, 150, 150, 150);
        } else if (clientState.phoneTab === 'sendMessage') {
            drawTextLeft('SEND MESSAGE', 0.4, 0.35, 0.4, 100, 200, 255);
            drawTextLeft('To (Player ID):', 0.4, 0.42, 0.35, 200, 200, 200);
            drawRect(
                0.5,
                0.465,
                0.2,
                0.03,
                clientState.activeInput === 'phone1' ? 60 : 40,
                clientState.activeInput === 'phone1' ? 60 : 40,
                clientState.activeInput === 'phone1' ? 80 : 50,
                255
            );
            drawTextLeft(clientState.phoneInput + (clientState.activeInput === 'phone1' ? '_' : ''), 0.41, 0.455, 0.35, 255, 255, 255);
            drawTextLeft('Message:', 0.4, 0.5, 0.35, 200, 200, 200);
            drawRect(
                0.5,
                0.525,
                0.2,
                0.03,
                clientState.activeInput === 'phone2' ? 60 : 40,
                clientState.activeInput === 'phone2' ? 60 : 40,
                clientState.activeInput === 'phone2' ? 80 : 50,
                255
            );
            drawTextLeft(clientState.phoneInput2 + (clientState.activeInput === 'phone2' ? '_' : ''), 0.41, 0.515, 0.35, 255, 255, 255);
            drawTextLeft('[TAB] Switch | [ENTER] Send | [ESC] Back', 0.4, 0.6, 0.3, 150, 150, 150);
        }
    }

    if (!clientState.phoneOpen && !clientState.propertyInteractionOpen) {
        for (let i = 0; i < Math.min(clientState.chatHistory.length, 5); i++) {
            const alpha = 255 - i * 40;
            native.setTextFont(4);
            native.setTextScale(0.35, 0.35);
            native.setTextColour(255, 255, 255, alpha);
            native.setTextOutline();
            native.beginTextCommandDisplayText('STRING');
            native.addTextComponentSubstringPlayerName(clientState.chatHistory[i]);
            native.endTextCommandDisplayText(0.02, 0.8 + i * 0.025, 0);
        }
    }

    if (clientState.chatOpen) {
        drawRect(0.5, 0.95, 0.6, 0.04, 0, 0, 0, 180);
        const displayText =
            clientState.chatInput.length > 0 ? clientState.chatInput + '_' : 'Type message... (Enter to send, Esc to cancel)';
        native.setTextFont(4);
        native.setTextScale(0.35, 0.35);
        native.setTextColour(255, 255, 255, 255);
        native.beginTextCommandDisplayText('STRING');
        native.addTextComponentSubstringPlayerName(displayText);
        native.endTextCommandDisplayText(0.22, 0.94, 0);
    }

    if (clientState.isLoggedIn && !clientState.chatOpen && !clientState.phoneOpen && !clientState.propertyInteractionOpen) {
        drawTextLeft('T: Chat | M: Phone | E: Interact | /help', 0.02, 0.02, 0.3, 150, 150, 150);
    }
});

alt.setInterval(() => {
    const player = alt.Player.local;
    if (!player || !player.valid) return;
    if (player.pos.z < -20) {
        forceSafeGroundSpawn(SAFE_SPAWN.x, SAFE_SPAWN.y, SAFE_SPAWN.z).catch(() => {});
    }
}, 3000);
