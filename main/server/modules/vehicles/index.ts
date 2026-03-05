import * as alt from 'alt-server';
import { RuntimeContext } from '../../rebar/runtime';

export function registerVehiclesModule(context: RuntimeContext): void {
  alt.on('playerCommand', async (player, commandText) => {
    const [command, model] = commandText.trim().split(/\s+/);
    if (command !== 'veh') {
      return;
    }

    const session = context.services.player.getSession(player);
    if (!session) {
      context.services.player.notify(player, 'Login first: /login <email> <password>');
      return;
    }

    try {
      await context.services.vehicle.spawnOwnedVehicle(player, session.userId, model ?? 'sultan');
      context.services.player.notify(player, `Spawned vehicle: ${model ?? 'sultan'}`);
    } catch (error) {
      context.services.player.notify(player, (error as Error).message);
    }
  });
}
