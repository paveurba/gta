import { RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../services/database.service.js';

interface UserRow extends RowDataPacket {
    id: number;
    email: string;
    password_hash: string;
}

export class UserRepository {
    constructor(private readonly database: DatabaseService) {}

    async findByEmail(email: string): Promise<UserRow | null> {
        const rows = await this.database.query<UserRow>(
            'SELECT id, email, password_hash FROM users WHERE email = :email LIMIT 1',
            { email },
        );

        return rows[0] ?? null;
    }

    async create(email: string, passwordHash: string): Promise<number> {
        await this.database.execute('INSERT INTO users (email, password_hash) VALUES (:email, :password_hash)', {
            email,
            password_hash: passwordHash,
        });

        const created = await this.findByEmail(email);
        if (!created) {
            throw new Error('User creation failed');
        }

        return created.id;
    }

    async touchLastLogin(userId: number): Promise<void> {
        await this.database.execute('UPDATE users SET last_login_at = NOW() WHERE id = :id', { id: userId });
    }
}
