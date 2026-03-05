import * as alt from 'alt-server';
import { RuntimeContext } from '../../rebar/runtime';

export function registerJobsModule(context: RuntimeContext): void {
  alt.on('playerCommand', async (player, commandText) => {
    const [command, jobName] = commandText.trim().split(/\s+/);
    if (command !== 'job') {
      return;
    }

    const session = context.services.player.getSession(player);
    if (!session) {
      context.services.player.notify(player, 'Login first: /login <email> <password>');
      return;
    }

    if (!jobName) {
      const activeJob = await context.services.jobs.getActiveJob(session.userId);
      context.services.player.notify(player, `Active job: ${activeJob ?? 'none'}`);
      return;
    }

    await context.services.jobs.setActiveJob(session.userId, jobName.toLowerCase());
    context.services.player.notify(player, `Active job set to ${jobName.toLowerCase()}`);
  });
}
