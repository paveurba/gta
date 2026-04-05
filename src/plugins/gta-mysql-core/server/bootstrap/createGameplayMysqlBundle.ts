import * as alt from 'alt-server';
import mysql from 'mysql2/promise';
import { runMigrations } from '../database/migrations.js';
import {
    PlayerWeaponService,
    PropertyService,
    WeaponShopService,
    ClothingShopService,
    PhoneService,
    CasinoService,
    VehicleService,
    AuthService,
    AppearanceService,
} from '../services/index.js';

export type GameplayMysqlBundle = {
    pool: mysql.Pool;
    weaponService: PlayerWeaponService;
    propertyService: PropertyService;
    weaponShopService: WeaponShopService;
    clothingShopService: ClothingShopService;
    phoneService: PhoneService;
    casinoService: CasinoService;
    vehicleService: VehicleService;
    authService: AuthService;
    appearanceService: AppearanceService;
};

export async function createGameplayMysqlBundle(): Promise<GameplayMysqlBundle> {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'mysql',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'gta',
        password: process.env.DB_PASSWORD || 'gta_password',
        database: process.env.DB_NAME || 'gta_rebar',
        waitForConnections: true,
        connectionLimit: 10,
    });

    await runMigrations(pool);

    const weaponService = new PlayerWeaponService(pool);
    const propertyService = new PropertyService(pool);
    const weaponShopService = new WeaponShopService(pool, weaponService);
    const clothingShopService = new ClothingShopService(pool);
    const phoneService = new PhoneService(pool);
    const casinoService = new CasinoService(pool);
    const vehicleService = new VehicleService(pool);
    const authService = new AuthService(pool);
    const appearanceService = new AppearanceService(pool);

    alt.log('[gta-mysql-core] MySQL pool and services initialized');

    return {
        pool,
        weaponService,
        propertyService,
        weaponShopService,
        clothingShopService,
        phoneService,
        casinoService,
        vehicleService,
        authService,
        appearanceService,
    };
}
