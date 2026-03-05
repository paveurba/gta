-- GTA alt:V Server - MySQL Schema
-- This schema is auto-created by the server migrations, but provided here for reference

-- Players table (core authentication and money)
CREATE TABLE IF NOT EXISTS players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    money INT DEFAULT 5000,
    bank INT DEFAULT 10000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- Player weapons persistence
CREATE TABLE IF NOT EXISTS player_weapons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    weapon_hash BIGINT NOT NULL,
    ammo INT DEFAULT 100,
    UNIQUE KEY unique_weapon (player_id, weapon_hash),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Player clothing persistence
CREATE TABLE IF NOT EXISTS player_clothes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    component INT NOT NULL,
    drawable INT NOT NULL,
    texture INT DEFAULT 0,
    UNIQUE KEY unique_cloth (player_id, component),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Properties system with interior coordinates and IPL support
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
);

-- Phone contacts
CREATE TABLE IF NOT EXISTS phone_contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Phone messages
CREATE TABLE IF NOT EXISTS phone_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Casino transaction history
CREATE TABLE IF NOT EXISTS casino_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    game_type VARCHAR(50) NOT NULL,
    bet_amount INT NOT NULL,
    win_amount INT DEFAULT 0,
    result VARCHAR(50),
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Transaction logs for auditing
CREATE TABLE IF NOT EXISTS transaction_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    amount INT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Default properties (seeded by server if table is empty)
-- These use accurate GTA V world coordinates for property entrances
-- Interior coordinates point to GTA Online apartment interiors
INSERT INTO properties (name, price, pos_x, pos_y, pos_z, interior_x, interior_y, interior_z, interior_heading, ipl) VALUES
    ('Unit 124 Popular St', 25000, -47.52, -585.86, 37.95, 266.04, -1007.47, -101.01, 70.0, 'apa_v_mp_h_01_a'),
    ('0115 Bay City Ave', 80000, -1447.06, -538.53, 34.74, 346.99, -1012.99, -99.20, 70.0, 'apa_v_mp_h_02_a'),
    ('0504 S Mo Milton Dr', 150000, -774.01, 342.03, 211.40, 346.99, -1012.99, -99.20, 70.0, 'apa_v_mp_h_03_a'),
    ('0184 Milton Rd', 300000, -572.60, 653.54, 145.63, 346.99, -1012.99, -99.20, 70.0, 'apa_v_mp_h_04_a'),
    ('Eclipse Towers Penthouse', 500000, -777.14, 312.73, 223.26, 346.99, -1012.99, -99.20, 70.0, 'apa_v_mp_h_05_a')
ON DUPLICATE KEY UPDATE id=id;
