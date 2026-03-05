// World client - ped behavior, traffic driving, wanted system
import * as alt from "alt-client";
import * as native from "natives";

alt.log("[world] CLIENT SCRIPT LOADED");

alt.on("connectionComplete", () => {
  alt.log("[world] Loading interiors...");
  alt.loadDefaultIpls();
});

// Make peds wander when they stream in
alt.on("gameEntityCreate", (entity) => {
  if (entity instanceof alt.Ped) {
    alt.setTimeout(() => {
      const ped = entity.scriptID;
      if (native.doesEntityExist(ped) && !native.isPedInAnyVehicle(ped, false)) {
        native.taskWanderStandard(ped, 10.0, 10);
      }
    }, 500);
  }
});

// Handle traffic - put driver in vehicle and make them drive
alt.onServer("world:setDriver", (pedId, vehicleId) => {
  alt.setTimeout(() => {
    const allPeds = alt.Ped.all;
    const allVehicles = alt.Vehicle.all;
    
    const ped = allPeds.find(p => p.id === pedId);
    const vehicle = allVehicles.find(v => v.id === vehicleId);
    
    if (ped && vehicle) {
      const pedScript = ped.scriptID;
      const vehScript = vehicle.scriptID;
      
      if (native.doesEntityExist(pedScript) && native.doesEntityExist(vehScript)) {
        native.setPedIntoVehicle(pedScript, vehScript, -1);
        native.taskVehicleDriveWander(pedScript, vehScript, 15.0, 786603);
      }
    }
  }, 1000);
});
