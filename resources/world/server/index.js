// World - smart location-based spawning, intensive traffic
import * as alt from "alt-server";

// Location zones with appropriate peds and vehicles
const ZONES = {
  beach: {
    bounds: { minX: -2000, maxX: -1000, minY: -1800, maxY: -800 },
    peds: ["a_m_y_beach_01", "a_m_y_beach_02", "a_f_y_beach_01", "a_m_y_surfer_01", "a_f_y_fitness_01", "a_m_y_runner_01", "a_f_y_runner_01", "a_m_y_yoga_01"],
    vehicles: ["bison", "sandking", "blazer", "seashark", "jetmax"],
  },
  downtown: {
    bounds: { minX: -800, maxX: 200, minY: -1200, maxY: -400 },
    peds: ["a_m_y_business_01", "a_m_y_business_02", "a_f_y_business_01", "a_f_y_business_02", "a_m_m_business_01", "a_f_m_business_02", "a_m_y_downtown_01", "a_f_y_downtown_01"],
    vehicles: ["oracle", "tailgater", "schafter2", "felon", "jackal", "exemplar", "fugitive", "stanier", "taxi"],
  },
  vinewood: {
    bounds: { minX: -200, maxX: 800, minY: -200, maxY: 800 },
    peds: ["a_m_y_vinewood_01", "a_f_y_vinewood_01", "a_m_m_bevhills_01", "a_f_y_bevhills_01", "a_m_y_hipster_01", "a_f_y_hipster_01", "a_m_y_hipster_02", "a_f_y_hipster_02"],
    vehicles: ["comet2", "infernus", "zentorno", "adder", "entityxf", "cheetah", "turismor", "osiris"],
  },
  airport: {
    bounds: { minX: -1800, maxX: -900, minY: -3500, maxY: -2400 },
    peds: ["s_m_y_airworker", "a_m_y_business_01", "a_f_y_tourist_01", "a_m_m_tourist_01"],
    vehicles: ["taxi", "stretch", "coach", "bus"],
  },
  industrial: {
    bounds: { minX: 800, maxX: 1500, minY: -2500, maxY: -1500 },
    peds: ["s_m_y_construct_01", "s_m_y_construct_02", "a_m_y_mexthug_01", "a_m_m_mexlabor_01", "s_m_m_trucker_01"],
    vehicles: ["benson", "mule", "phantom", "hauler", "packer", "flatbed", "mixer"],
  },
  default: {
    peds: ["a_m_y_downtown_01", "a_f_y_downtown_01", "a_m_m_business_01", "a_f_m_fatwhite_01", "a_m_y_hipster_01", "a_f_y_hipster_01"],
    vehicles: ["sultan", "buffalo", "oracle", "primo", "emperor", "stanier", "fugitive", "blista"],
  }
};

// Traffic vehicles (cars that drive)
const TRAFFIC_VEHICLES = ["taxi", "bus", "coach", "speedo", "rumpo", "pony", "minivan", "sultan", "buffalo", "oracle", "stanier", "fugitive", "premier", "intruder", "stratum", "ingot"];

// Airport planes
const AIRPORT_PLANES = [
  { x: -1538.0, y: -2954.0, z: 13.9, heading: 60, model: "luxor" },
  { x: -1580.0, y: -2990.0, z: 13.9, heading: 60, model: "shamal" },
  { x: -1620.0, y: -3030.0, z: 13.9, heading: 60, model: "vestra" },
  { x: -1660.0, y: -3070.0, z: 13.9, heading: 60, model: "mammatus" },
  { x: -1243.0, y: -3390.0, z: 13.9, heading: 120, model: "duster" },
  { x: -1145.0, y: -2864.0, z: 13.9, heading: 0, model: "maverick" },
  { x: -724.0, y: -1444.0, z: 5.0, heading: 230, model: "frogger" },
];

const spawnedPeds = new Map();
const spawnedVehicles = new Map();
const trafficVehicles = new Map();

const SPAWN_RADIUS = 120;
const DESPAWN_RADIUS = 200;
const MAX_PEDS = 30;
const MAX_PARKED = 15;
const MAX_TRAFFIC = 12;
const SPAWN_INTERVAL = 1500;

function getZone(pos) {
  for (const [name, zone] of Object.entries(ZONES)) {
    if (name === "default") continue;
    const b = zone.bounds;
    if (pos.x >= b.minX && pos.x <= b.maxX && pos.y >= b.minY && pos.y <= b.maxY) {
      return zone;
    }
  }
  return ZONES.default;
}

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomOffset(min, max) {
  return (Math.random() > 0.5 ? 1 : -1) * (min + Math.random() * (max - min));
}

// Get a position on the road (offset from player in a direction)
function getRoadPosition(playerPos, distance) {
  const angle = Math.random() * Math.PI * 2;
  const x = playerPos.x + Math.cos(angle) * distance;
  const y = playerPos.y + Math.sin(angle) * distance;
  // Snap to road-like positions (multiples of ~6 for lane width)
  const roadX = Math.round(x / 6) * 6;
  const roadY = Math.round(y / 6) * 6;
  return { x: roadX, y: roadY, z: playerPos.z, heading: angle + Math.PI / 2 };
}

// Spawn ped appropriate for location
function spawnPedNearPlayer(player) {
  const peds = spawnedPeds.get(player.id) || [];
  if (peds.length >= MAX_PEDS) return;

  const pos = player.pos;
  const zone = getZone(pos);
  
  const spawnPos = new alt.Vector3(
    pos.x + getRandomOffset(20, SPAWN_RADIUS),
    pos.y + getRandomOffset(20, SPAWN_RADIUS),
    pos.z
  );

  try {
    const model = getRandom(zone.peds);
    const ped = new alt.Ped(model, spawnPos, new alt.Vector3(0, 0, Math.random() * Math.PI * 2));
    peds.push({ ped, time: Date.now() });
    spawnedPeds.set(player.id, peds);
  } catch (e) {}
}

// Spawn parked vehicle on road
function spawnParkedVehicle(player) {
  const vehicles = spawnedVehicles.get(player.id) || [];
  if (vehicles.length >= MAX_PARKED) return;

  const pos = player.pos;
  const zone = getZone(pos);
  const roadPos = getRoadPosition(pos, 30 + Math.random() * 60);

  try {
    const model = getRandom(zone.vehicles);
    const vehicle = new alt.Vehicle(
      model,
      new alt.Vector3(roadPos.x, roadPos.y, pos.z - 0.5),
      new alt.Vector3(0, 0, roadPos.heading)
    );
    vehicle.engineOn = false;
    vehicles.push({ vehicle, time: Date.now() });
    spawnedVehicles.set(player.id, vehicles);
  } catch (e) {}
}

// Spawn driving traffic
function spawnTraffic(player) {
  const traffic = trafficVehicles.get(player.id) || [];
  if (traffic.length >= MAX_TRAFFIC) return;

  const pos = player.pos;
  const roadPos = getRoadPosition(pos, 50 + Math.random() * 70);

  try {
    const model = getRandom(TRAFFIC_VEHICLES);
    const vehicle = new alt.Vehicle(
      model,
      new alt.Vector3(roadPos.x, roadPos.y, pos.z),
      new alt.Vector3(0, 0, roadPos.heading)
    );
    
    // Create driver with appropriate clothes for zone
    const zone = getZone(pos);
    const driverModel = getRandom(zone.peds);
    const driver = new alt.Ped(driverModel, new alt.Vector3(roadPos.x, roadPos.y, pos.z), new alt.Vector3(0, 0, roadPos.heading));
    
    // Tell client to put driver in vehicle and drive
    alt.emitAllClients("world:setDriver", driver.id, vehicle.id);
    
    traffic.push({ vehicle, driver, time: Date.now() });
    trafficVehicles.set(player.id, traffic);
  } catch (e) {}
}

// Cleanup distant entities
function cleanupEntities(player) {
  const pos = player.pos;
  
  const peds = spawnedPeds.get(player.id) || [];
  spawnedPeds.set(player.id, peds.filter(({ ped }) => {
    if (!ped?.valid) return false;
    const dist = Math.hypot(ped.pos.x - pos.x, ped.pos.y - pos.y);
    if (dist > DESPAWN_RADIUS) { ped.destroy(); return false; }
    return true;
  }));
  
  const vehicles = spawnedVehicles.get(player.id) || [];
  spawnedVehicles.set(player.id, vehicles.filter(({ vehicle }) => {
    if (!vehicle?.valid) return false;
    const dist = Math.hypot(vehicle.pos.x - pos.x, vehicle.pos.y - pos.y);
    if (dist > DESPAWN_RADIUS) { vehicle.destroy(); return false; }
    return true;
  }));
  
  const traffic = trafficVehicles.get(player.id) || [];
  trafficVehicles.set(player.id, traffic.filter(({ vehicle, driver }) => {
    if (!vehicle?.valid) return false;
    const dist = Math.hypot(vehicle.pos.x - pos.x, vehicle.pos.y - pos.y);
    if (dist > DESPAWN_RADIUS) {
      if (driver?.valid) driver.destroy();
      vehicle.destroy();
      return false;
    }
    return true;
  }));
}

function updateSpawns() {
  for (const player of alt.Player.all) {
    if (!player?.valid) continue;
    
    cleanupEntities(player);
    
    // More aggressive spawning for intensive traffic
    if (Math.random() > 0.3) spawnPedNearPlayer(player);
    if (Math.random() > 0.3) spawnPedNearPlayer(player);
    if (Math.random() > 0.4) spawnParkedVehicle(player);
    if (Math.random() > 0.3) spawnTraffic(player);
    if (Math.random() > 0.4) spawnTraffic(player);
  }
}

// Spawn airport planes
function spawnAirportVehicles() {
  for (const spawn of AIRPORT_PLANES) {
    try {
      new alt.Vehicle(spawn.model, new alt.Vector3(spawn.x, spawn.y, spawn.z), new alt.Vector3(0, 0, spawn.heading * Math.PI / 180));
    } catch (e) {}
  }
  alt.log("[world] Airport vehicles spawned");
}

// Cleanup on disconnect
alt.on("playerDisconnect", (player) => {
  [spawnedPeds, spawnedVehicles, trafficVehicles].forEach(map => {
    const items = map.get(player.id) || [];
    items.forEach(item => {
      if (item.ped?.valid) item.ped.destroy();
      if (item.vehicle?.valid) item.vehicle.destroy();
      if (item.driver?.valid) item.driver.destroy();
    });
    map.delete(player.id);
  });
});

alt.on("resourceStart", () => {
  alt.setTimeout(spawnAirportVehicles, 2000);
});

alt.setInterval(updateSpawns, SPAWN_INTERVAL);

alt.log("[world] Smart world system loaded.");
