import { DatabaseService } from '../services/database.service.js';
import { AuthService } from '../services/auth.service.js';
import { InventoryService } from '../services/inventory.service.js';
import { JobService } from '../services/job.service.js';
import { PlayerService } from '../services/player.service.js';
import { VehicleService } from '../services/vehicle.service.js';
import { InventoryRepository } from '../repositories/inventory.repository.js';
import { JobRepository } from '../repositories/job.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { VehicleRepository } from '../repositories/vehicle.repository.js';

export interface GameplayContext {
    services: {
        database: DatabaseService;
        auth: AuthService;
        player: PlayerService;
        vehicle: VehicleService;
        inventory: InventoryService;
        jobs: JobService;
    };
}

export function createContext(): GameplayContext {
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
    };
}
