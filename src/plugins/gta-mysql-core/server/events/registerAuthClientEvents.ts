import * as alt from 'alt-server';
import mysql from 'mysql2/promise';
import type { PlayerSession } from '../types/playerSession.js';
import type { AuthService, PlayerWeaponService, VehicleService } from '../services/index.js';

export type AuthHandlersContext = {
    authService: AuthService;
    playerSessions: Map<number, PlayerSession>;
    playersInProperty: Map<number, number>;
    weaponService: PlayerWeaponService;
    vehicleService: VehicleService;
    notifyPlayer: (player: alt.Player, message: string) => void;
    getMySQLPool: () => Promise<mysql.Pool>;
    completeLogin: (player: alt.Player, session: PlayerSession) => Promise<void>;
    clearExistingSession: (player: alt.Player) => Promise<void>;
};

export function registerAuthClientEvents(ctx: AuthHandlersContext): void {
    const {
        authService,
        playerSessions,
        playersInProperty,
        weaponService,
        vehicleService,
        notifyPlayer,
        getMySQLPool,
        completeLogin,
        clearExistingSession,
    } = ctx;

    alt.onClient('auth:register', async (player, username: string, email: string, password: string, confirmPassword: string) => {
        await clearExistingSession(player);
        if (password !== confirmPassword) {
            alt.emitClient(player, 'auth:registerResult', { success: false, message: 'Password and confirmation do not match.' });
            return;
        }
        await getMySQLPool();
        const result = await authService.register({ username, email, password });
        if (!result.success) {
            alt.emitClient(player, 'auth:registerResult', { success: false, message: result.message });
            return;
        }
        const session: PlayerSession = {
            oderId: result.session!.playerId,
            email: result.session!.email,
            money: result.session!.money,
            bank: result.session!.bank,
        };
        await completeLogin(player, session);
        alt.emitClient(player, 'auth:registerResult', { success: true, message: result.message });
        notifyPlayer(player, `Registered! Cash: $${session.money}`);
    });

    alt.onClient('auth:login', async (player, loginIdentifier: string, password: string) => {
        await getMySQLPool();
        await clearExistingSession(player);
        const result = await authService.login(loginIdentifier, password);
        if (!result.success) {
            alt.emitClient(player, 'auth:loginResult', { success: false, message: result.message, passwordChangeRequired: false });
            return;
        }
        const session: PlayerSession = {
            oderId: result.session!.playerId,
            email: result.session!.email,
            money: result.session!.money,
            bank: result.session!.bank,
        };
        if (result.session!.passwordChangeRequired) {
            playerSessions.set(player.id, session);
            player.setMeta('playerId', session.oderId);
            alt.emitClient(player, 'auth:loginResult', { success: true, message: 'You must set a new password.', passwordChangeRequired: true });
            notifyPlayer(player, 'You must change your password to continue.');
            return;
        }
        await completeLogin(player, session);
        alt.emitClient(player, 'auth:loginResult', { success: true, message: result.message, passwordChangeRequired: false });
        notifyPlayer(player, `Welcome back! Cash: $${session.money}`);
    });

    alt.onClient('auth:forgotPassword', async (player, email: string) => {
        const result = await authService.requestPasswordReset(email);
        alt.emitClient(player, 'auth:forgotPasswordResult', { success: result.success, message: result.message });
        if (result.success) notifyPlayer(player, result.message);
    });

    alt.onClient('auth:changePassword', async (player, currentPassword: string, newPassword: string, confirmPassword: string) => {
        const session = playerSessions.get(player.id);
        if (!session) {
            alt.emitClient(player, 'auth:changePasswordResult', { success: false, message: 'You must be logged in to change password.' });
            return;
        }
        const result = await authService.changePassword(session.oderId, currentPassword, newPassword, confirmPassword);
        if (!result.success) {
            alt.emitClient(player, 'auth:changePasswordResult', { success: false, message: result.message });
            return;
        }
        alt.emitClient(player, 'auth:changePasswordResult', { success: true, message: result.message });
        await completeLogin(player, session);
        notifyPlayer(player, 'Password changed. Welcome!');
    });

    alt.onClient('auth:logout', async (player) => {
        const session = playerSessions.get(player.id);
        if (!session) {
            notifyPlayer(player, 'You are not logged in.');
            return;
        }
        await getMySQLPool();
        try {
            await weaponService.savePlayerWeapons(player, session.oderId);
            await vehicleService.despawnAllPlayerVehicles(session.oderId);
            playerSessions.delete(player.id);
            playersInProperty.delete(player.id);
            player.deleteMeta('playerId');
            alt.emitClient(player, 'gta:logout');
            player.removeAllWeapons();
            notifyPlayer(player, 'You have been logged out. Press T to login again.');
        } catch (err) {
            notifyPlayer(player, `Error: ${(err as Error).message}`);
        }
    });
}
