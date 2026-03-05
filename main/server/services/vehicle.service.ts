import * as alt from 'alt-server';
import { VehicleRepository } from '../repositories/vehicle.repository';

export class VehicleService {
  public constructor(private readonly vehicles: VehicleRepository) {}

  public async spawnOwnedVehicle(player: alt.Player, userId: number, model: string): Promise<void> {
    const normalizedModel = model.trim().toLowerCase();
    if (!normalizedModel) {
      throw new Error('Model name is required');
    }

    const hash = alt.hash(normalizedModel);
    const vehicle = new alt.Vehicle(hash, player.pos.x + 2, player.pos.y, player.pos.z, 0, 0, player.rot.z);
    player.setIntoVehicle(vehicle, 1);

    await this.vehicles.createForUser(userId, normalizedModel);
  }
}
