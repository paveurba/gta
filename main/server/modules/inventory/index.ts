import * as alt from 'alt-server';
import { RuntimeContext } from '../../rebar/runtime';

export function registerInventoryModule(context: RuntimeContext): void {
  alt.on('playerCommand', async (player, commandText) => {
    const [command] = commandText.trim().split(/\s+/);
    if (command !== 'inv') {
      return;
    }

    const session = context.services.player.getSession(player);
    if (!session) {
      context.services.player.notify(player, 'Login first: /login <email> <password>');
      return;
    }

    const inventory = await context.services.inventory.getInventoryLine(session.userId);
    context.services.player.notify(player, inventory);
  });
}
