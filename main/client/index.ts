import * as alt from 'alt-client';
import { ClientEvents } from '../shared/events';

alt.onServer(ClientEvents.SystemMessage, (message: string) => {
  alt.log(`[SERVER] ${message}`);
});
