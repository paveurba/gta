# UAT checklist — client after refactor (Phase 14 + property fix)

**How to use:** Run **`pnpm run compile:ts`**, start **server + client**, then tick **`[ ]` → `[x]`** and note issues in **`16-VERIFICATION.md`**.

**Blocker** = must pass for “game usable”; **Standard** = important loops; **Optional** = nice-to-have.

---

## Bootstrap

| # | Severity | Step | Pass |
|---|----------|------|------|
| B1 | Blocker | Client resource loads; console shows **`[gta-client] Plugin loaded`** | [ ] |
| B2 | Blocker | **`pnpm test`** and **`pnpm run compile:ts`** were green before this run | [ ] |

## Auth & **T** key

| # | Severity | Step | Pass |
|---|----------|------|------|
| A1 | Blocker | Not logged in: **T** opens **Account** menu (login / register / forgot) | [ ] |
| A2 | Blocker | **ESC** backs out / closes without soft-locking cursor (try twice) | [ ] |
| A3 | Standard | **Login** succeeds; HUD shows **money** (top right) | [ ] |
| A4 | Standard | **Logout** from menu (or **`/logout`** if you use chat) clears session; **T** opens auth again | [ ] |
| A5 | Standard | After login, **T** opens **chat** input bar; **Enter** sends; **ESC** cancels | [ ] |

## Property menu edge (regression target)

| # | Severity | Step | Pass |
|---|----------|------|------|
| P1 | Blocker | Near a property: **E** opens property panel; **ESC** closes | [ ] |
| P2 | Blocker | Open property menu (**E**), walk **outside** interaction radius until panel disappears or you move away; **T** must open **auth** or **chat** (not dead input) | [ ] |
| P3 | Standard | **Enter property** / **exit** (if you own one) still works | [ ] |

## Shops & commerce

| # | Severity | Step | Pass |
|---|----------|------|------|
| S1 | Standard | Near weapon shop: **E** opens catalog; **ESC** closes | [ ] |
| S2 | Standard | Near clothing shop: **E** opens catalog; **ESC** closes | [ ] |
| S3 | Optional | Dealership **E** opens vehicle list; **ESC** closes | [ ] |
| S4 | Optional | Garage from owned property (if applicable) opens / closes | [ ] |

## Phone & misc HUD

| # | Severity | Step | Pass |
|---|----------|------|------|
| M1 | Standard | Logged in: **M** opens phone; **ESC** returns | [ ] |
| M2 | Standard | Help line **`T: Chat \| M: Phone \| E: Interact`** visible when appropriate | [ ] |
| M3 | Optional | **Nametag** visible on another player within ~22 m (needs 2 clients) | [ ] |

## Death / disconnect (quick)

| # | Severity | Step | Pass |
|---|----------|------|------|
| D1 | Optional | Die / respawn: death overlay then spawn (no permanent HUD stuck) | [ ] |
| D2 | Optional | Disconnect overlay / reconnect messaging (if you test network drop) | [ ] |

---

## Sign-off

- **Tester:** _______________
- **Client build / commit:** _______________
- **Date:** _______________
