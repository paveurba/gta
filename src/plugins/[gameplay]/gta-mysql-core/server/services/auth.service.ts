import bcrypt from 'bcryptjs';
import { authConfig } from '../database/config.js';
import { UserRepository } from '../repositories/user.repository.js';

export class AuthService {
    constructor(private readonly users: UserRepository) {}

    async register(email: string, password: string): Promise<number> {
        const existing = await this.users.findByEmail(email);
        if (existing) {
            throw new Error('User already exists');
        }

        const hash = await bcrypt.hash(password, authConfig.bcryptRounds);
        return this.users.create(email, hash);
    }

    async login(email: string, password: string): Promise<{ userId: number; email: string }> {
        const user = await this.users.findByEmail(email);
        if (!user) {
            throw new Error('Invalid credentials');
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            throw new Error('Invalid credentials');
        }

        await this.users.touchLastLogin(user.id);
        return { userId: user.id, email: user.email };
    }
}
