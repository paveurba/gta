import { DatabaseService } from '../services/database.service';
import { AuthService } from '../services/auth.service';
import { InventoryService } from '../services/inventory.service';
import { JobService } from '../services/job.service';
import { PlayerService } from '../services/player.service';
import { VehicleService } from '../services/vehicle.service';
import { InventoryRepository } from '../repositories/inventory.repository';
import { JobRepository } from '../repositories/job.repository';
import { UserRepository } from '../repositories/user.repository';
import { VehicleRepository } from '../repositories/vehicle.repository';

export interface RuntimeContext {
  services: {
    database: DatabaseService;
    auth: AuthService;
    player: PlayerService;
    vehicle: VehicleService;
    inventory: InventoryService;
    jobs: JobService;
  };
  repositories: {
    users: UserRepository;
    vehicles: VehicleRepository;
    inventory: InventoryRepository;
    jobs: JobRepository;
  };
}

export interface RebarPlugin {
  name: string;
  register(context: RuntimeContext): void;
}

export function createRuntimeContext(): RuntimeContext {
  const database = new DatabaseService();

  const users = new UserRepository(database);
  const vehicles = new VehicleRepository(database);
  const inventory = new InventoryRepository(database);
  const jobs = new JobRepository(database);

  return {
    services: {
      database,
      auth: new AuthService(users),
      player: new PlayerService(),
      vehicle: new VehicleService(vehicles),
      inventory: new InventoryService(inventory),
      jobs: new JobService(jobs),
    },
    repositories: {
      users,
      vehicles,
      inventory,
      jobs,
    },
  };
}
