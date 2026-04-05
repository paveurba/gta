# Phase 05 — Casino (server reference)

Maps **CASI-01**, **CASI-02** to `CasinoService` and casino RPCs / chat in `index.ts`.

## Location (`CASINO_LOCATIONS`)

| x | y | z | name |
|---|----|---|------|
| 924.0 | 46.0 | 81.1 | Diamond Casino |

Pushed as `casinos` in **`gta:locations:update`**. Chat **`/casino`** teleports to these coordinates (logged-in check).

## Bet validation (`validateBet`)

- **Minimum:** $100 (`MIN_BET`)
- **Maximum:** $100,000 (`MAX_BET`)
- **Balance:** `amount > playerMoney` → failure

## Slots (`playSlots`)

1. Validates bet; draws **three** symbols from `SLOT_SYMBOLS` (emoji set).
2. **`combination = symbols.join('')`** — must match a key in **`SLOT_PAYOUTS`** for a win (e.g. `'🍒🍒🍒'` → multiplier **5**).
3. `winAmount = betAmount * multiplier` when `multiplier > 0`; else 0.
4. `newBalance = playerMoney - betAmount + winAmount`.
5. `UPDATE players SET money`; `logCasinoTransaction(..., 'SLOTS', ...)`.

Chat **`/slots <bet>`**: default bet **100** if first arg missing/invalid (`parseInt(args[0]) || 100`).

## Roulette (`playRoulette`)

**`betType`** (`number` | `color` | `odd` | `even`) and **`betValue`**:

| Type | `betValue` | Win rule | Multiplier notes (from source) |
|------|------------|----------|--------------------------------|
| `number` | winning number (0–36) | exact match | 35× bet |
| `color` | `red` / `black` / `green` | matches spin color | 2× red/black; **14×** green |
| `odd` | ignored for match | spin number odd (non-zero) | 2× |
| `even` | ignored | spin number even (non-zero) | 2× |

Chat **`/roulette <bet> <type> <value>`**: defaults `betType = 'color'`, `betValue = 'red'` if omitted.

**`number` bets:** `betValue` is parsed with `parseInt(String(betValue), 10)` so chat args like `7` work.

## Persistence

**`casino_transactions`:** `player_id`, `game_type` (`SLOTS` / `ROULETTE`), `bet_amount`, `win_amount`, `result` (string: slot combination or roulette summary).

**`transaction_logs`:** `transaction_type` `CASINO_SLOTS` / `CASINO_ROULETTE`, `amount` = `winAmount - betAmount`, description includes bet and win.

## RPCs

| Client → server | Notes |
|-----------------|--------|
| `casino:playSlots` | Same logic as `/slots`; emits `casino:slotsResult` on success path in `index.ts`. |
| `casino:playRoulette` | Same as `/roulette`; `casino:rouletteResult`. |
| `casino:getHistory` | Session → `getPlayerHistory` → `casino:history`. |

Session money updated in handlers when `result.newBalance` is set.

## Client

`client/index.ts`: listens for `casino:slotsResult` / `casino:rouletteResult`, shows transient on-screen feedback; casino blips for proximity UI.
