import * as alt from 'alt-server';
import { createRuntimeContext } from './rebar/runtime';
import { plugins } from './rebar/plugins';

const context = createRuntimeContext();

async function bootstrap(): Promise<void> {
  await context.services.database.healthcheck();

  for (const plugin of plugins) {
    plugin.register(context);
    alt.log(`[Rebar] Plugin loaded: ${plugin.name}`);
  }

  alt.log('[Rebar] Server bootstrap completed');
}

bootstrap().catch((error) => {
  alt.logError(`[Rebar] Bootstrap failed: ${(error as Error).message}`);
});
