import * as alt from 'alt-server';

const PARKED_VEHICLE_SPAWNS: Array<{ x: number; y: number; z: number; heading: number; model: string }> = [
    { x: 228.5, y: -789.5, z: 30.5, heading: 160, model: 'oracle' },
    { x: 232.1, y: -791.2, z: 30.5, heading: 160, model: 'tailgater' },
    { x: 235.7, y: -792.9, z: 30.5, heading: 160, model: 'schafter2' },
    { x: 215.3, y: -810.1, z: 30.5, heading: 250, model: 'felon' },
    { x: 211.8, y: -806.5, z: 30.5, heading: 250, model: 'buffalo' },

    { x: 338.9, y: -584.2, z: 28.8, heading: 70, model: 'ambulance' },
    { x: 297.5, y: -590.3, z: 43.2, heading: 160, model: 'oracle' },
    { x: 301.2, y: -592.1, z: 43.2, heading: 160, model: 'premier' },
    { x: 304.9, y: -593.9, z: 43.2, heading: 160, model: 'stanier' },

    { x: 284.5, y: 176.8, z: 104.5, heading: 70, model: 'comet2' },
    { x: 288.2, y: 178.5, z: 104.5, heading: 70, model: 'infernus' },
    { x: 291.9, y: 180.2, z: 104.5, heading: 70, model: 'zentorno' },
    { x: 295.6, y: 181.9, z: 104.5, heading: 70, model: 'adder' },

    { x: -1183.5, y: -1509.2, z: 4.4, heading: 305, model: 'bison' },
    { x: -1179.8, y: -1512.9, z: 4.4, heading: 305, model: 'sandking' },
    { x: -1176.1, y: -1516.6, z: 4.4, heading: 305, model: 'dubsta' },
    { x: -1172.4, y: -1520.3, z: 4.4, heading: 305, model: 'baller' },

    { x: -1267.8, y: -1329.5, z: 4.0, heading: 215, model: 'surfer' },
    { x: -1271.5, y: -1326.8, z: 4.0, heading: 215, model: 'blazer' },
    { x: -1275.2, y: -1324.1, z: 4.0, heading: 215, model: 'bifta' },

    { x: -662.5, y: -854.2, z: 24.5, heading: 0, model: 'sultan' },
    { x: -658.8, y: -854.2, z: 24.5, heading: 0, model: 'futo' },
    { x: -655.1, y: -854.2, z: 24.5, heading: 0, model: 'penumbra' },
    { x: -651.4, y: -854.2, z: 24.5, heading: 0, model: 'elegy2' },

    { x: 1035.2, y: -763.5, z: 57.5, heading: 270, model: 'minivan' },
    { x: 1035.2, y: -767.2, z: 57.5, heading: 270, model: 'prairie' },
    { x: 1035.2, y: -770.9, z: 57.5, heading: 270, model: 'blista' },

    { x: 112.5, y: -1961.8, z: 20.8, heading: 0, model: 'buccaneer' },
    { x: 116.2, y: -1961.8, z: 20.8, heading: 0, model: 'vigero' },
    { x: 119.9, y: -1961.8, z: 20.8, heading: 0, model: 'ruiner' },
    { x: 123.6, y: -1961.8, z: 20.8, heading: 0, model: 'sabregt' },

    { x: -1034.5, y: -2733.2, z: 20.2, heading: 150, model: 'stretch' },
    { x: -1030.8, y: -2736.9, z: 20.2, heading: 150, model: 'cognoscenti' },
    { x: -1027.1, y: -2740.6, z: 20.2, heading: 150, model: 'superd' },

    { x: -825.5, y: -186.2, z: 37.6, heading: 120, model: 'exemplar' },
    { x: -821.8, y: -189.9, z: 37.6, heading: 120, model: 'felon2' },
    { x: -818.1, y: -193.6, z: 37.6, heading: 120, model: 'jackal' },

    { x: 430.5, y: -1018.2, z: 28.5, heading: 90, model: 'sultan' },
    { x: 430.5, y: -1014.5, z: 28.5, heading: 90, model: 'buffalo' },
    { x: 430.5, y: -1010.8, z: 28.5, heading: 90, model: 'oracle' },
    { x: 430.5, y: -1007.1, z: 28.5, heading: 90, model: 'tailgater' },

    { x: 879.5, y: 12.2, z: 78.8, heading: 240, model: 'adder' },
    { x: 883.2, y: 14.9, z: 78.8, heading: 240, model: 'zentorno' },
    { x: 886.9, y: 17.6, z: 78.8, heading: 240, model: 't20' },
    { x: 890.6, y: 20.3, z: 78.8, heading: 240, model: 'osiris' },
];

const spawnedParkedVehicles: alt.Vehicle[] = [];

export function spawnStaticParkedVehicles(): void {
    spawnedParkedVehicles.forEach(v => { if (v?.valid) v.destroy(); });
    spawnedParkedVehicles.length = 0;

    for (const spawn of PARKED_VEHICLE_SPAWNS) {
        try {
            const vehicle = new alt.Vehicle(
                spawn.model,
                new alt.Vector3(spawn.x, spawn.y, spawn.z),
                new alt.Vector3(0, 0, spawn.heading * (Math.PI / 180))
            );
            vehicle.engineOn = false;
            vehicle.lockState = 1;
            spawnedParkedVehicles.push(vehicle);
        } catch (err) {
            alt.logWarning(`[gta-mysql-core] Failed to spawn ${spawn.model}: ${(err as Error).message}`);
        }
    }

    alt.log(`[gta-mysql-core] Spawned ${spawnedParkedVehicles.length} parked vehicles`);
}
