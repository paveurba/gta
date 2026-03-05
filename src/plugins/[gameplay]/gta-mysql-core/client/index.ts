import * as alt from 'alt-client';
import * as native from 'natives';

// Keep ambient world alive for local testing (traffic + pedestrians).
alt.everyTick(() => {
    native.setVehicleDensityMultiplierThisFrame(1.0);
    native.setRandomVehicleDensityMultiplierThisFrame(1.0);
    native.setParkedVehicleDensityMultiplierThisFrame(1.0);
    native.setPedDensityMultiplierThisFrame(1.0);
    native.setScenarioPedDensityMultiplierThisFrame(1.0, 1.0);
    native.setGarbageTrucks(true);
    native.setRandomBoats(true);
    native.setCreateRandomCops(true);
});

alt.on('keyup', (key) => {
    // F5 register, F6 login, F7 vehicle, F8 inventory, F9 job.
    if (key === 116) {
        alt.emitServer('gta:auth:registerQuick');
        return;
    }

    if (key === 117) {
        alt.emitServer('gta:auth:loginQuick');
        return;
    }

    if (key === 118) {
        alt.emitServer('gta:veh:spawnQuick');
        return;
    }

    if (key === 119) {
        alt.emitServer('gta:inv:showQuick');
        return;
    }

    if (key === 120) {
        alt.emitServer('gta:job:quick');
    }
});
