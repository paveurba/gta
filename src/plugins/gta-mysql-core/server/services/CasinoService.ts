import * as alt from 'alt-server';
import mysql from 'mysql2/promise';

export interface SlotResult {
    symbols: string[];
    won: boolean;
    winAmount: number;
    multiplier: number;
}

export interface RouletteResult {
    number: number;
    color: 'red' | 'black' | 'green';
    won: boolean;
    winAmount: number;
}

export interface CasinoTransaction {
    id?: number;
    player_id: number;
    game_type: string;
    bet_amount: number;
    win_amount: number;
    result: string;
    played_at?: Date;
}

const SLOT_SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '🎰'];

const SLOT_PAYOUTS: { [key: string]: number } = {
    '🍒🍒🍒': 5,
    '🍋🍋🍋': 8,
    '🍊🍊🍊': 10,
    '🍇🍇🍇': 15,
    '💎💎💎': 25,
    '7️⃣7️⃣7️⃣': 50,
    '🎰🎰🎰': 100,
};

const ROULETTE_NUMBERS: { number: number; color: 'red' | 'black' | 'green' }[] = [
    { number: 0, color: 'green' },
    { number: 1, color: 'red' }, { number: 2, color: 'black' }, { number: 3, color: 'red' },
    { number: 4, color: 'black' }, { number: 5, color: 'red' }, { number: 6, color: 'black' },
    { number: 7, color: 'red' }, { number: 8, color: 'black' }, { number: 9, color: 'red' },
    { number: 10, color: 'black' }, { number: 11, color: 'black' }, { number: 12, color: 'red' },
    { number: 13, color: 'black' }, { number: 14, color: 'red' }, { number: 15, color: 'black' },
    { number: 16, color: 'red' }, { number: 17, color: 'black' }, { number: 18, color: 'red' },
    { number: 19, color: 'red' }, { number: 20, color: 'black' }, { number: 21, color: 'red' },
    { number: 22, color: 'black' }, { number: 23, color: 'red' }, { number: 24, color: 'black' },
    { number: 25, color: 'red' }, { number: 26, color: 'black' }, { number: 27, color: 'red' },
    { number: 28, color: 'black' }, { number: 29, color: 'black' }, { number: 30, color: 'red' },
    { number: 31, color: 'black' }, { number: 32, color: 'red' }, { number: 33, color: 'black' },
    { number: 34, color: 'red' }, { number: 35, color: 'black' }, { number: 36, color: 'red' },
];

export const CASINO_LOCATIONS = [
    { x: 924.0, y: 46.0, z: 81.1, name: 'Diamond Casino' },
];

export class CasinoService {
    private readonly MIN_BET = 100;
    private readonly MAX_BET = 100000;

    constructor(private pool: mysql.Pool) {}

    getCasinoLocations() {
        return CASINO_LOCATIONS;
    }

    isNearCasino(x: number, y: number, z: number, radius: number = 50): boolean {
        return CASINO_LOCATIONS.some(casino => {
            const dist = Math.sqrt(
                Math.pow(casino.x - x, 2) + 
                Math.pow(casino.y - y, 2) + 
                Math.pow(casino.z - z, 2)
            );
            return dist < radius;
        });
    }

    validateBet(amount: number, playerMoney: number): { valid: boolean; message: string } {
        if (amount < this.MIN_BET) {
            return { valid: false, message: `Minimum bet is $${this.MIN_BET}` };
        }
        if (amount > this.MAX_BET) {
            return { valid: false, message: `Maximum bet is $${this.MAX_BET}` };
        }
        if (amount > playerMoney) {
            return { valid: false, message: 'Not enough money' };
        }
        return { valid: true, message: '' };
    }

    // Slot Machine Game
    async playSlots(
        playerId: number,
        betAmount: number,
        playerMoney: number
    ): Promise<{ success: boolean; message: string; result?: SlotResult; newBalance?: number }> {
        const validation = this.validateBet(betAmount, playerMoney);
        if (!validation.valid) {
            return { success: false, message: validation.message };
        }

        // Spin the slots
        const symbols = [
            SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
            SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
            SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        ];

        const combination = symbols.join('');
        const multiplier = SLOT_PAYOUTS[combination] || 0;
        const won = multiplier > 0;
        const winAmount = won ? betAmount * multiplier : 0;

        // Calculate new balance
        const newBalance = playerMoney - betAmount + winAmount;

        // Update player money
        await this.pool.execute(
            'UPDATE players SET money = ? WHERE id = ?',
            [newBalance, playerId]
        );

        // Log transaction
        await this.logCasinoTransaction(playerId, 'SLOTS', betAmount, winAmount, combination);

        const result: SlotResult = { symbols, won, winAmount, multiplier };

        alt.log(`[CasinoService] Player ${playerId} played slots: bet $${betAmount}, won $${winAmount}`);
        return {
            success: true,
            message: won ? `You won $${winAmount}!` : 'Better luck next time!',
            result,
            newBalance,
        };
    }

    // Roulette Game
    async playRoulette(
        playerId: number,
        betAmount: number,
        betType: 'number' | 'color' | 'odd' | 'even',
        betValue: number | string,
        playerMoney: number
    ): Promise<{ success: boolean; message: string; result?: RouletteResult; newBalance?: number }> {
        const validation = this.validateBet(betAmount, playerMoney);
        if (!validation.valid) {
            return { success: false, message: validation.message };
        }

        // Spin the wheel
        const spinResult = ROULETTE_NUMBERS[Math.floor(Math.random() * ROULETTE_NUMBERS.length)];
        let won = false;
        let multiplier = 0;

        switch (betType) {
            case 'number':
                if (spinResult.number === betValue) {
                    won = true;
                    multiplier = 35; // 35:1 for exact number
                }
                break;
            case 'color':
                if (spinResult.color === betValue) {
                    won = true;
                    multiplier = spinResult.color === 'green' ? 14 : 2; // 2:1 for red/black, 14:1 for green
                }
                break;
            case 'odd':
                if (spinResult.number !== 0 && spinResult.number % 2 === 1) {
                    won = true;
                    multiplier = 2;
                }
                break;
            case 'even':
                if (spinResult.number !== 0 && spinResult.number % 2 === 0) {
                    won = true;
                    multiplier = 2;
                }
                break;
        }

        const winAmount = won ? betAmount * multiplier : 0;
        const newBalance = playerMoney - betAmount + winAmount;

        // Update player money
        await this.pool.execute(
            'UPDATE players SET money = ? WHERE id = ?',
            [newBalance, playerId]
        );

        // Log transaction
        await this.logCasinoTransaction(
            playerId,
            'ROULETTE',
            betAmount,
            winAmount,
            `${betType}:${betValue} -> ${spinResult.number}(${spinResult.color})`
        );

        const result: RouletteResult = {
            number: spinResult.number,
            color: spinResult.color,
            won,
            winAmount,
        };

        alt.log(`[CasinoService] Player ${playerId} played roulette: bet $${betAmount} on ${betType}:${betValue}, result: ${spinResult.number}(${spinResult.color}), won $${winAmount}`);
        return {
            success: true,
            message: won ? `${spinResult.number} ${spinResult.color}! You won $${winAmount}!` : `${spinResult.number} ${spinResult.color}. Better luck next time!`,
            result,
            newBalance,
        };
    }

    // Get player's casino history
    async getPlayerHistory(playerId: number, limit: number = 20): Promise<CasinoTransaction[]> {
        const [rows] = await this.pool.execute(
            'SELECT * FROM casino_transactions WHERE player_id = ? ORDER BY played_at DESC LIMIT ?',
            [playerId, limit]
        );
        return rows as CasinoTransaction[];
    }

    // Get player's total winnings/losses
    async getPlayerStats(playerId: number): Promise<{ totalBet: number; totalWon: number; netProfit: number }> {
        const [rows] = await this.pool.execute(
            `SELECT 
                COALESCE(SUM(bet_amount), 0) as totalBet,
                COALESCE(SUM(win_amount), 0) as totalWon
             FROM casino_transactions WHERE player_id = ?`,
            [playerId]
        );
        const stats = (rows as any[])[0];
        return {
            totalBet: stats.totalBet,
            totalWon: stats.totalWon,
            netProfit: stats.totalWon - stats.totalBet,
        };
    }

    private async logCasinoTransaction(
        playerId: number,
        gameType: string,
        betAmount: number,
        winAmount: number,
        result: string
    ): Promise<void> {
        await this.pool.execute(
            'INSERT INTO casino_transactions (player_id, game_type, bet_amount, win_amount, result) VALUES (?, ?, ?, ?, ?)',
            [playerId, gameType, betAmount, winAmount, result]
        );

        // Also log to general transaction log
        await this.pool.execute(
            'INSERT INTO transaction_logs (player_id, transaction_type, amount, description) VALUES (?, ?, ?, ?)',
            [playerId, `CASINO_${gameType}`, winAmount - betAmount, `Bet: $${betAmount}, Won: $${winAmount}`]
        );
    }
}
