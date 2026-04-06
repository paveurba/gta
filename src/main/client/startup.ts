import * as alt from 'alt-client';
import '../translate/index.js';

// Load all other files after translate
import './controllers/index.js';
import './menus/world/index.js';
import './player/controls.js';
import './rmlui/index.js';
import './screen/index.js';
import './system/index.js';
import './system/vscodeTransmitter.js';
import './virtualEntities/index.js';
import { useWebview } from './webview/index.js';

async function start() {
    useWebview();

    alt.log(':: Loading Client Plugins');
    await import('./plugins.js');
    alt.log(':: Loaded Client Plugins');
}

void start().catch((err) => {
    alt.log(`[core] Client startup failed: ${err}`);
    console.error(err);
});
