/**
 * Authentication service: register, login, forgot password, change password.
 * Uses bcrypt for password hashing. Supports username + email and forced password change after reset.
 */

import * as alt from 'alt-server';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

import { isValidEmail, isValidUsername } from '../auth/authValidation.js';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
const TEMP_PASSWORD_EXPIRY_MINUTES = parseInt(process.env.TEMP_PASSWORD_EXPIRY_MINUTES || '60', 10);

export interface PlayerRow {
    id: number;
    email: string;
    username: string | null;
    password_hash: string;
    money: number;
    bank: number;
    password_change_required: boolean;
    temp_password_hash: string | null;
    temp_password_expires_at: Date | null;
}

export interface AuthSession {
    playerId: number;
    email: string;
    username: string | null;
    money: number;
    bank: number;
    passwordChangeRequired: boolean;
}

export interface RegisterInput {
    username: string;
    email: string;
    password: string;
}

export interface RegisterResult {
    success: boolean;
    message: string;
    session?: AuthSession;
}

export interface LoginResult {
    success: boolean;
    message: string;
    session?: AuthSession;
}

export interface ForgotPasswordResult {
    success: boolean;
    message: string;
}

export interface ChangePasswordResult {
    success: boolean;
    message: string;
}

export class AuthService {
    constructor(private pool: mysql.Pool) {}

    async hashPassword(plain: string): Promise<string> {
        return bcrypt.hash(plain, BCRYPT_ROUNDS);
    }

    async comparePassword(plain: string, hash: string): Promise<boolean> {
        return bcrypt.compare(plain, hash);
    }

    async findById(id: number): Promise<PlayerRow | null> {
        const [rows] = await this.pool.execute(
            'SELECT id, email, username, password_hash, money, bank, password_change_required, temp_password_hash, temp_password_expires_at FROM players WHERE id = ?',
            [id],
        );
        const arr = rows as PlayerRow[];
        return arr.length > 0 ? arr[0] : null;
    }

    async findByEmail(email: string): Promise<PlayerRow | null> {
        const [rows] = await this.pool.execute(
            'SELECT id, email, username, password_hash, money, bank, password_change_required, temp_password_hash, temp_password_expires_at FROM players WHERE email = ?',
            [email],
        );
        const arr = rows as PlayerRow[];
        return arr.length > 0 ? arr[0] : null;
    }

    async findByUsername(username: string): Promise<PlayerRow | null> {
        const [rows] = await this.pool.execute(
            'SELECT id, email, username, password_hash, money, bank, password_change_required, temp_password_hash, temp_password_expires_at FROM players WHERE username = ?',
            [username],
        );
        const arr = rows as PlayerRow[];
        return arr.length > 0 ? arr[0] : null;
    }

    /** Find by email or username (for login field). */
    async findByEmailOrUsername(login: string): Promise<PlayerRow | null> {
        if (login.includes('@')) {
            return this.findByEmail(login);
        }
        return this.findByUsername(login);
    }

    private rowToSession(row: PlayerRow): AuthSession {
        return {
            playerId: row.id,
            email: row.email,
            username: row.username,
            money: row.money,
            bank: row.bank,
            passwordChangeRequired: Boolean(row.password_change_required),
        };
    }

    async register(input: RegisterInput): Promise<RegisterResult> {
        const { username, email, password } = input;

        if (!username || !email || !password) {
            return { success: false, message: 'All fields are required.' };
        }

        const trimmedUsername = username.trim();
        const trimmedEmail = email.trim().toLowerCase();

        if (!isValidUsername(trimmedUsername)) {
            return { success: false, message: 'Username must be 3–32 characters (letters, numbers, _ -).' };
        }
        if (!isValidEmail(trimmedEmail)) {
            return { success: false, message: 'Please enter a valid email address.' };
        }
        if (password.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters.' };
        }

        const existingEmail = await this.findByEmail(trimmedEmail);
        if (existingEmail) {
            return { success: false, message: 'This email is already registered.' };
        }

        const existingUsername = await this.findByUsername(trimmedUsername);
        if (existingUsername) {
            return { success: false, message: 'This username is already taken.' };
        }

        const passwordHash = await this.hashPassword(password);

        try {
            await this.pool.execute(
                'INSERT INTO players (username, email, password_hash, money, bank) VALUES (?, ?, ?, 5000, 10000)',
                [trimmedUsername, trimmedEmail, passwordHash],
            );
        } catch (err) {
            alt.logError(`[AuthService] Register insert failed: ${(err as Error).message}`);
            return { success: false, message: 'Registration failed. Please try again.' };
        }

        const row = await this.findByEmail(trimmedEmail);
        if (!row) {
            return { success: false, message: 'Registration failed. Please try again.' };
        }

        return {
            success: true,
            message: 'Account created successfully.',
            session: this.rowToSession(row),
        };
    }

    async login(loginIdentifier: string, password: string): Promise<LoginResult> {
        const trimmed = loginIdentifier.trim();
        if (!trimmed || !password) {
            return { success: false, message: 'Username/email and password are required.' };
        }

        const row = await this.findByEmailOrUsername(trimmed);
        if (!row) {
            return { success: false, message: 'Invalid username/email or password.' };
        }

        const passwordMatches = await this.comparePassword(password, row.password_hash);
        const tempValid =
            row.temp_password_hash &&
            row.temp_password_expires_at &&
            new Date() < new Date(row.temp_password_expires_at);
        const tempMatches =
            tempValid && row.temp_password_hash ? await this.comparePassword(password, row.temp_password_hash) : false;

        if (!passwordMatches && !tempMatches) {
            return { success: false, message: 'Invalid username/email or password.' };
        }

        await this.pool.execute('UPDATE players SET last_login = NOW() WHERE id = ?', [row.id]);

        const session = this.rowToSession(row);
        if (tempMatches) {
            session.passwordChangeRequired = true;
        }
        return { success: true, message: 'Logged in.', session };
    }

    async requestPasswordReset(email: string): Promise<ForgotPasswordResult> {
        const trimmed = email.trim().toLowerCase();
        if (!isValidEmail(trimmed)) {
            return { success: false, message: 'Please enter a valid email address.' };
        }

        const row = await this.findByEmail(trimmed);
        if (!row) {
            return { success: true, message: 'If that email is registered, you will receive a temporary password.' };
        }

        const { sendTemporaryPasswordEmail } = await import('./EmailService.js');
        const tempPassword = this.generateTemporaryPassword();
        const tempHash = await this.hashPassword(tempPassword);
        const expiresAt = new Date(Date.now() + TEMP_PASSWORD_EXPIRY_MINUTES * 60 * 1000);

        await this.pool.execute(
            'UPDATE players SET temp_password_hash = ?, temp_password_expires_at = ?, password_change_required = TRUE WHERE id = ?',
            [tempHash, expiresAt, row.id],
        );

        alt.log(`[AuthService] Sending password reset email to ${row.email}`);
        const mailResult = await sendTemporaryPasswordEmail(row.email, tempPassword);
        if (!mailResult.success) {
            await this.pool.execute(
                'UPDATE players SET temp_password_hash = NULL, temp_password_expires_at = NULL, password_change_required = FALSE WHERE id = ?',
                [row.id],
            );
            const message =
                mailResult.error === 'Mail not configured'
                    ? 'Password reset emails are not configured on this server. Contact the administrator.'
                    : 'Could not send email. Please try again later.';
            return { success: false, message };
        }

        return { success: true, message: 'If that email is registered, you will receive a temporary password.' };
    }

    generateTemporaryPassword(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        let result = '';
        for (let i = 0; i < 12; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    async changePassword(
        playerId: number,
        currentPassword: string,
        newPassword: string,
        confirmPassword: string,
    ): Promise<ChangePasswordResult> {
        if (newPassword !== confirmPassword) {
            return { success: false, message: 'New password and confirmation do not match.' };
        }
        if (newPassword.length < 6) {
            return { success: false, message: 'New password must be at least 6 characters.' };
        }

        const row = await this.findById(playerId);
        if (!row) {
            return { success: false, message: 'Account not found.' };
        }

        const mainMatches = await this.comparePassword(currentPassword, row.password_hash);
        const tempValid =
            row.temp_password_hash &&
            row.temp_password_expires_at &&
            new Date() < new Date(row.temp_password_expires_at);
        const tempMatches =
            tempValid && row.temp_password_hash
                ? await this.comparePassword(currentPassword, row.temp_password_hash)
                : false;

        if (!mainMatches && !tempMatches) {
            return { success: false, message: 'Current password is incorrect.' };
        }

        const newHash = await this.hashPassword(newPassword);
        await this.pool.execute(
            'UPDATE players SET password_hash = ?, temp_password_hash = NULL, temp_password_expires_at = NULL, password_change_required = FALSE WHERE id = ?',
            [newHash, playerId],
        );

        return { success: true, message: 'Password changed successfully.' };
    }
}
