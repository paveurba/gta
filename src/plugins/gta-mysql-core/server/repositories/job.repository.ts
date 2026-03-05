import { RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../services/database.service.js';

interface ActiveJobRow extends RowDataPacket {
    job_name: string;
}

export class JobRepository {
    constructor(private readonly database: DatabaseService) {}

    async activateJob(userId: number, jobName: string): Promise<void> {
        await this.database.execute('UPDATE player_jobs SET is_active = 0 WHERE user_id = :user_id', { user_id: userId });

        await this.database.execute(
            `INSERT INTO player_jobs (user_id, job_name, is_active)
             VALUES (:user_id, :job_name, 1)
             ON DUPLICATE KEY UPDATE is_active = VALUES(is_active), updated_at = CURRENT_TIMESTAMP`,
            { user_id: userId, job_name: jobName },
        );
    }

    async getActiveJob(userId: number): Promise<string | null> {
        const rows = await this.database.query<ActiveJobRow[]>(
            'SELECT job_name FROM player_jobs WHERE user_id = :user_id AND is_active = 1 LIMIT 1',
            { user_id: userId },
        );

        return rows[0]?.job_name ?? null;
    }
}
