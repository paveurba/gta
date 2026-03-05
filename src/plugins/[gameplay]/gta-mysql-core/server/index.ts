import * as alt from 'alt-server';
import { createContext } from './shared/context.js';
import { registerAuthenticationModule } from './modules/authentication/index.js';
import { registerPlayerManagementModule } from './modules/player-management/index.js';
import { registerVehiclesModule } from './modules/vehicles/index.js';
import { registerInventoryModule } from './modules/inventory/index.js';
import { registerJobsModule } from './modules/jobs/index.js';

const context = createContext();

async function bootstrap() {
    await context.services.database.healthcheck();

    registerAuthenticationModule(context);
    registerPlayerManagementModule(context);
    registerVehiclesModule(context);
    registerInventoryModule(context);
    registerJobsModule(context);

    alt.log('[gta-mysql-core] Plugin initialized');
}

bootstrap().catch((err) => {
    alt.logError(`[gta-mysql-core] Bootstrap failed: ${(err as Error).message}`);
});

alt.on('resourceStop', async () => {
    await context.services.database.close();
    alt.log('[gta-mysql-core] Database pool closed');
});
