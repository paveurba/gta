import * as alt from 'alt-server';
import { RuntimeContext } from '../../rebar/runtime';

export function registerPlayerManagementModule(context: RuntimeContext): void {
  alt.on('playerDisconnect', (player) => {
    context.services.player.clearSession(player);
  });
}
