import * as alt from 'alt-server';
import mysql from 'mysql2/promise';

export async function runMigrations(pool: mysql.Pool): Promise<void> {
    alt.log('[migrations] Running database migrations...');

    // Players table
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS players (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            money INT DEFAULT 5000,
            bank INT DEFAULT 10000,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP NULL
        )
    `);

    // Player weapons table
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS player_weapons (
            id INT AUTO_INCREMENT PRIMARY KEY,
            player_id INT NOT NULL,
            weapon_hash BIGINT NOT NULL,
            ammo INT DEFAULT 100,
            UNIQUE KEY unique_weapon (player_id, weapon_hash),
            FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
        )
    `);

    // Player clothes table
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS player_clothes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            player_id INT NOT NULL,
            component INT NOT NULL,
            drawable INT NOT NULL,
            texture INT DEFAULT 0,
            UNIQUE KEY unique_cloth (player_id, component),
            FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
        )
    `);

    // Properties table
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS properties (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            price INT NOT NULL,
            owner_player_id INT NULL,
            pos_x FLOAT NOT NULL,
            pos_y FLOAT NOT NULL,
            pos_z FLOAT NOT NULL,
            interior_x FLOAT NOT NULL,
            interior_y FLOAT NOT NULL,
            interior_z FLOAT NOT NULL,
            purchased_at TIMESTAMP NULL,
            FOREIGN KEY (owner_player_id) REFERENCES players(id) ON DELETE SET NULL
        )
    `);

    // Phone contacts table
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS phone_contacts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            player_id INT NOT NULL,
            contact_name VARCHAR(255) NOT NULL,
            contact_number VARCHAR(20) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
        )
    `);

    // Phone messages table
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS phone_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sender_id INT NOT NULL,
            receiver_id INT NOT NULL,
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES players(id) ON DELETE CASCADE,
            FOREIGN KEY (receiver_id) REFERENCES players(id) ON DELETE CASCADE
        )
    `);

    // Casino transactions log
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS casino_transactions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            player_id INT NOT NULL,
            game_type VARCHAR(50) NOT NULL,
            bet_amount INT NOT NULL,
            win_amount INT DEFAULT 0,
            result VARCHAR(50),
            played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
        )
    `);

    // Transaction logs for auditing
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS transaction_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            player_id INT NOT NULL,
            transaction_type VARCHAR(50) NOT NULL,
            amount INT NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
        )
    `);

    // Seed default properties if none exist
    const [existingProps] = await pool.execute('SELECT COUNT(*) as count FROM properties');
    if ((existingProps as any[])[0].count === 0) {
        await pool.execute(`
            INSERT INTO properties (name, price, pos_x, pos_y, pos_z, interior_x, interior_y, interior_z) VALUES
            ('Cheap Apartment', 25000, -35.0, -580.0, 38.0, -32.0, -576.0, 80.0),
            ('Del Perro Apartment', 80000, -1447.0, -538.0, 34.7, -1452.0, -540.0, 74.0),
            ('Vinewood House', 150000, -174.0, 502.0, 137.4, -174.0, 497.0, 137.4),
            ('Beach House', 300000, -1905.0, -570.0, 11.8, -1905.0, -573.0, 11.8),
            ('Luxury Penthouse', 500000, -140.0, -620.0, 168.8, -140.0, -628.0, 168.8)
        `);
        alt.log('[migrations] Seeded default properties');
    }

    alt.log('[migrations] All migrations completed');
}
