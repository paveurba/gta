import { DatabaseService } from '../services/database.service.js';

export class VehicleRepository {
    constructor(private readonly database: DatabaseService) {}

    async createForUser(userId: number, model: string): Promise<void> {
        await this.database.execute('INSERT INTO player_vehicles (user_id, model) VALUES (:user_id, :model)', {
            user_id: userId,
            model,
        });
    }
}
