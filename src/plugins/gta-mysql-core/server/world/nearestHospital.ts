/** Street-level spawn points in front of each hospital (not on roof or inside building). */
export type HospitalSpawn = {
    x: number;
    y: number;
    z: number;
    heading: number;
    name: string;
};

export const HOSPITAL_SPAWNS: HospitalSpawn[] = [
    { x: 307.32, y: -595.38, z: 43.29, heading: 70, name: 'Pillbox Hill Medical Center' },
    { x: -449.67, y: -340.55, z: 34.51, heading: 0, name: 'Mount Zonah Medical Center' },
    { x: 1839.44, y: 3672.71, z: 34.28, heading: 0, name: 'Sandy Shores Medical Center' },
    { x: -247.46, y: 6331.23, z: 32.43, heading: 0, name: 'Paleto Bay Medical Center' },
];

export function getNearestHospital(x: number, y: number, z: number, spawns: HospitalSpawn[] = HOSPITAL_SPAWNS): HospitalSpawn {
    let nearest = spawns[0];
    let minDist = Infinity;

    for (const hospital of spawns) {
        const dist = Math.sqrt(
            Math.pow(hospital.x - x, 2) + Math.pow(hospital.y - y, 2) + Math.pow(hospital.z - z, 2)
        );
        if (dist < minDist) {
            minDist = dist;
            nearest = hospital;
        }
    }

    return nearest;
}
