import * as alt from 'alt-server';
import { RuntimeContext } from '../../rebar/runtime';

export function registerAuthenticationModule(context: RuntimeContext): void {
  alt.on('playerConnect', (player) => {
    context.services.player.notify(player, 'Use /register <email> <password> or /login <email> <password>');
  });

  alt.on('playerCommand', async (player, commandText) => {
    const [command, email, password] = commandText.trim().split(/\s+/);

    try {
      if (command === 'register') {
        if (!email || !password) {
          context.services.player.notify(player, 'Usage: /register <email> <password>');
          return;
        }

        const userId = await context.services.auth.register(email, password);
        context.services.player.setSession(player, { userId, email });
        context.services.player.spawnDefault(player);
        context.services.player.notify(player, 'Registered and logged in');
        return;
      }

      if (command === 'login') {
        if (!email || !password) {
          context.services.player.notify(player, 'Usage: /login <email> <password>');
          return;
        }

        const session = await context.services.auth.login(email, password);
        context.services.player.setSession(player, session);
        context.services.player.spawnDefault(player);
        context.services.player.notify(player, 'Login successful');
      }
    } catch (error) {
      context.services.player.notify(player, (error as Error).message);
    }
  });
}
