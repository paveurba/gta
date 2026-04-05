import * as alt from 'alt-client';

import { clientState } from './state';

alt.on('playerDeath', () => {
    clientState.isDead = true;
    clientState.deathTime = Date.now();
    alt.log('[gta-client] Player died');
});

alt.onServer('casino:slotsResult', (result: any) => {
    clientState.slotsResult = result;
    clientState.showCasinoResult = Date.now() + 5000;
});

alt.onServer('casino:rouletteResult', (result: any) => {
    clientState.rouletteResult = result;
    clientState.showCasinoResult = Date.now() + 5000;
});
