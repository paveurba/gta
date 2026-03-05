import * as alt from 'alt-server';
import * as Utility from './utility/index.js';
import '../translate/index.js';
import { useTranslate } from '@Shared/translate.js';
import './rpc/index.js';
import './systems/tick.js';
import { useRebar } from './index.js';
import { useDatabase } from './database/index.js';
import { useConfig } from './config/index.js';

const Rebar = useRebar();
const { t } = useTranslate('en');
const { reconnect } = Utility.useDevReconnect();
const db = useDatabase();
const config = useConfig();

async function handleStart() {
    // Initialize MongoDB connection
    const mongoUri = config.getField('mongodb') || 'mongodb://127.0.0.1:27017';
    alt.log(`:: Connecting to MongoDB at ${mongoUri}`);
    const dbConnected = await db.init(mongoUri);
    if (!dbConnected) {
        alt.logError(':: Failed to connect to MongoDB! Server may not function correctly.');
    } else {
        alt.log(':: MongoDB Connected');
    }

    // Handle plugin loading
    alt.log(':: Loading Plugins');
    try {
        await import('./plugins.js');
        alt.log(':: Plugins Loaded');
    } catch (err) {
        alt.logError(err);
        alt.logWarning(`Failed to load any plugins, a plugin has errors in it.`);
    }

    // Handle local client reconnection, should always be called last...
    if (alt.debug) {
        reconnect();
    }

    alt.log(t('system.server.started'));

    if (!alt.getMeta('hotreload')) {
        return;
    }

    alt.log('Reloaded Core Resource');
    const onlinePlayers = Rebar.get.usePlayersGetter().online();

    for (let player of onlinePlayers) {
        const rPlayer = Rebar.usePlayer(player);
        rPlayer.notify.showNotification(`Reloaded Core Resource`);
        player.frozen = false;

        const character = rPlayer.character.get();
        alt.emit('rebar:playerCharacterBound', player, character);
    }
}

handleStart();
