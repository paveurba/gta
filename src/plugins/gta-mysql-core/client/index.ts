import * as alt from 'alt-client';
import * as native from 'natives';

const SAFE_SPAWN = { x: 425.1, y: -979.5, z: 30.7 };

alt.onServer('gta:notify', (message: string) => {
    alt.log(`[gta] ${message}`);
    native.beginTextCommandThefeedPost('STRING');
    native.addTextComponentSubstringPlayerName(message);
    native.endTextCommandThefeedPostTicker(false, false);
});

async function forceSafeGroundSpawn(x: number, y: number, z: number): Promise<void> {
    const player = alt.Player.local;
    if (!player || !player.valid) {
        return;
    }

    native.requestCollisionAtCoord(x, y, z);
    native.setFocusPosAndVel(x, y, z + 50, 0, 0, 0);

    let groundZ = z;
    for (let scan = 0; scan <= 600; scan += 25) {
        const [found, result] = native.getGroundZFor3dCoord(x, y, scan, 0, false, false);
        if (found) {
            groundZ = result;
            break;
        }
    }

    native.setEntityCoordsNoOffset(player.scriptID, x, y, groundZ + 1.2, false, false, false);
    native.clearFocus();
}

alt.onServer('gta:spawn:safe', (x: number, y: number, z: number) => {
    forceSafeGroundSpawn(x, y, z).catch((err) => alt.logWarning(`[gta] safe spawn failed: ${(err as Error).message}`));
});

// Keep ambient world alive for local testing (traffic + pedestrians).
alt.everyTick(() => {
    native.setPedPopulationBudget(2);
    native.setVehiclePopulationBudget(3);
    native.setVehicleDensityMultiplierThisFrame(1.0);
    native.setRandomVehicleDensityMultiplierThisFrame(1.0);
    native.setParkedVehicleDensityMultiplierThisFrame(1.0);
    native.setPedDensityMultiplierThisFrame(1.0);
    native.setScenarioPedDensityMultiplierThisFrame(1.0, 1.0);
    native.setGarbageTrucks(true);
    native.setRandomBoats(true);
    native.setCreateRandomCops(true);
});

function processHotkey(key: number): void {
    // F5 register, F6 login, F7 vehicle, F8 inventory, F9 job.
    if (key === 116 || key === alt.KeyCode.F5) {
        alt.emitServer('gta:auth:registerQuick');
        return;
    }

    if (key === 117 || key === alt.KeyCode.F6) {
        alt.emitServer('gta:auth:loginQuick');
        return;
    }

    if (key === 118 || key === alt.KeyCode.F7) {
        alt.emitServer('gta:veh:spawnQuick');
        return;
    }

    if (key === 119 || key === alt.KeyCode.F8) {
        alt.emitServer('gta:inv:showQuick');
        return;
    }

    if (key === 120 || key === alt.KeyCode.F9) {
        alt.emitServer('gta:job:quick');
    }
}

alt.on('keyup', (key) => {
    processHotkey(key);
});

alt.on('keydown', (key) => {
    processHotkey(key);
});

// Last-resort protection if the player still lands below the world.
alt.setInterval(() => {
    const player = alt.Player.local;
    if (!player || !player.valid) {
        return;
    }

    if (player.pos.z < -20) {
        forceSafeGroundSpawn(SAFE_SPAWN.x, SAFE_SPAWN.y, SAFE_SPAWN.z).catch((err) =>
            alt.logWarning(`[gta] under-map recovery failed: ${(err as Error).message}`),
        );
    }
}, 3000);
