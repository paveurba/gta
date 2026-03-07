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

    // Properties table - with interior_heading and ipl columns
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
            interior_heading FLOAT DEFAULT 0,
            ipl VARCHAR(255) NULL,
            purchased_at TIMESTAMP NULL,
            FOREIGN KEY (owner_player_id) REFERENCES players(id) ON DELETE SET NULL
        )
    `);

    // Auth columns for UI-based auth (username, password reset, forced change)
    try {
        await pool.execute(`ALTER TABLE players ADD COLUMN username VARCHAR(255) NULL UNIQUE`);
    } catch (e) { /* Column already exists */ }
    try {
        await pool.execute(`ALTER TABLE players ADD COLUMN password_change_required BOOLEAN DEFAULT FALSE`);
    } catch (e) { /* Column already exists */ }
    try {
        await pool.execute(`ALTER TABLE players ADD COLUMN temp_password_hash VARCHAR(255) NULL`);
    } catch (e) { /* Column already exists */ }
    try {
        await pool.execute(`ALTER TABLE players ADD COLUMN temp_password_expires_at TIMESTAMP NULL`);
    } catch (e) { /* Column already exists */ }
    try {
        await pool.execute(`ALTER TABLE players ADD COLUMN last_login TIMESTAMP NULL`);
    } catch (e) { /* Column already exists */ }

    // Backfill empty usernames from email local part (e.g. pavlik@upanet.org -> pavlik)
    const [rows] = await pool.execute<{ id: number; email: string; username: string | null }[]>(
        "SELECT id, email, username FROM players WHERE username IS NULL OR TRIM(COALESCE(username, '')) = ''"
    );
    const toBackfill = Array.isArray(rows) ? rows : [];
    if (toBackfill.length > 0) {
        const used = new Set<string>();
        const [existing] = await pool.execute<{ username: string }[]>('SELECT username FROM players WHERE username IS NOT NULL AND TRIM(username) != ""');
        (Array.isArray(existing) ? existing : []).forEach((r) => { if (r.username) used.add(r.username.toLowerCase()); });
        for (const row of toBackfill) {
            const local = row.email.split('@')[0] || '';
            let base = local.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || `player${row.id}`;
            if (base.length < 3) base = `player${row.id}`;
            let username = base;
            let n = 2;
            while (used.has(username.toLowerCase())) {
                username = `${base.slice(0, 28)}_${n}`;
                n++;
            }
            used.add(username.toLowerCase());
            await pool.execute('UPDATE players SET username = ? WHERE id = ?', [username, row.id]);
            alt.log(`[migrations] Backfilled username for player ${row.id} (${row.email}) -> ${username}`);
        }
    }

    // Add columns if they don't exist (for existing databases)
    try {
        await pool.execute(`ALTER TABLE properties ADD COLUMN interior_heading FLOAT DEFAULT 0`);
    } catch (e) { /* Column already exists */ }
    
    try {
        await pool.execute(`ALTER TABLE properties ADD COLUMN ipl VARCHAR(255) NULL`);
    } catch (e) { /* Column already exists */ }

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

    // Player vehicles table
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS player_vehicles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            player_id INT NOT NULL,
            model VARCHAR(100) NOT NULL,
            model_hash BIGINT NOT NULL,
            color_primary INT DEFAULT 0,
            color_secondary INT DEFAULT 0,
            garage_property_id INT NULL,
            pos_x FLOAT NULL,
            pos_y FLOAT NULL,
            pos_z FLOAT NULL,
            rot_x FLOAT DEFAULT 0,
            rot_y FLOAT DEFAULT 0,
            rot_z FLOAT DEFAULT 0,
            is_spawned BOOLEAN DEFAULT FALSE,
            purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
            FOREIGN KEY (garage_property_id) REFERENCES properties(id) ON DELETE SET NULL
        )
    `);

    // Add garage_slots column to properties if not exists
    try {
        await pool.execute(`ALTER TABLE properties ADD COLUMN garage_slots INT DEFAULT 2`);
    } catch (e) { /* Column already exists */ }
    
    // Add garage spawn coordinates to properties
    try {
        await pool.execute(`ALTER TABLE properties ADD COLUMN garage_x FLOAT NULL`);
        await pool.execute(`ALTER TABLE properties ADD COLUMN garage_y FLOAT NULL`);
        await pool.execute(`ALTER TABLE properties ADD COLUMN garage_z FLOAT NULL`);
        await pool.execute(`ALTER TABLE properties ADD COLUMN garage_heading FLOAT DEFAULT 0`);
    } catch (e) { /* Columns already exist */ }

    // Check and update properties with correct coordinates
    const [existingProps] = await pool.execute('SELECT COUNT(*) as count FROM properties');
    if ((existingProps as any[])[0].count === 0) {
        // Seed default properties with accurate GTA V coordinates and garage locations
        await pool.execute(`
            INSERT INTO properties (name, price, pos_x, pos_y, pos_z, interior_x, interior_y, interior_z, interior_heading, ipl, garage_slots, garage_x, garage_y, garage_z, garage_heading) VALUES
            ('Unit 124 Popular St', 25000, -47.52, -585.86, 37.95, 266.04, -1007.47, -101.01, 70.0, 'apa_v_mp_h_01_a', 2, -50.0, -590.0, 37.5, 180.0),
            ('0115 Bay City Ave', 80000, -1447.06, -538.53, 34.74, 346.99, -1012.99, -99.20, 70.0, 'apa_v_mp_h_02_a', 4, -1450.0, -545.0, 34.5, 90.0),
            ('0504 S Mo Milton Dr', 150000, -774.01, 342.03, 211.40, 346.99, -1012.99, -99.20, 70.0, 'apa_v_mp_h_03_a', 6, -780.0, 338.0, 85.0, 270.0),
            ('0184 Milton Rd', 300000, -572.60, 653.54, 145.63, 346.99, -1012.99, -99.20, 70.0, 'apa_v_mp_h_04_a', 8, -575.0, 660.0, 145.0, 0.0),
            ('Eclipse Towers Penthouse', 500000, -777.14, 312.73, 223.26, 346.99, -1012.99, -99.20, 70.0, 'apa_v_mp_h_05_a', 10, -780.0, 308.0, 85.0, 180.0)
        `);
        alt.log('[migrations] Seeded default properties with garage coordinates');
    } else {
        // Update existing properties with correct coordinates
        await pool.execute(`
            UPDATE properties SET 
                pos_x = -47.52, pos_y = -585.86, pos_z = 37.95,
                interior_x = 266.04, interior_y = -1007.47, interior_z = -101.01,
                interior_heading = 70.0, ipl = 'apa_v_mp_h_01_a'
            WHERE id = 1
        `);
        await pool.execute(`
            UPDATE properties SET 
                pos_x = -1447.06, pos_y = -538.53, pos_z = 34.74,
                interior_x = 346.99, interior_y = -1012.99, interior_z = -99.20,
                interior_heading = 70.0, ipl = 'apa_v_mp_h_02_a'
            WHERE id = 2
        `);
        await pool.execute(`
            UPDATE properties SET 
                pos_x = -774.01, pos_y = 342.03, pos_z = 211.40,
                interior_x = 346.99, interior_y = -1012.99, interior_z = -99.20,
                interior_heading = 70.0, ipl = 'apa_v_mp_h_03_a'
            WHERE id = 3
        `);
        await pool.execute(`
            UPDATE properties SET 
                pos_x = -572.60, pos_y = 653.54, pos_z = 145.63,
                interior_x = 346.99, interior_y = -1012.99, interior_z = -99.20,
                interior_heading = 70.0, ipl = 'apa_v_mp_h_04_a'
            WHERE id = 4
        `);
        await pool.execute(`
            UPDATE properties SET 
                pos_x = -777.14, pos_y = 312.73, pos_z = 223.26,
                interior_x = 346.99, interior_y = -1012.99, interior_z = -99.20,
                interior_heading = 70.0, ipl = 'apa_v_mp_h_05_a'
            WHERE id = 5
        `);
        alt.log('[migrations] Updated existing properties with correct coordinates');
    }

    alt.log('[migrations] All migrations completed');
}
