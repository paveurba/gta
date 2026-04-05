# Phase 13: Player nametags — context

**Milestone:** v1.2 extension  
**Requirement:** [UI-NAMETAG-01](../../REQUIREMENTS.md)

## Goal

Show each **logged-in** player’s **display name** (email local-part, same convention as chat) **above their ped** for nearby **streamed-in** players.

## Approach

- **Server:** `player.setSyncedMeta('gta:displayName', string)` on **`completeLogin`**; **`deleteSyncedMeta`** on logout / session clear paths.
- **Client:** Each tick (when HUD active), for **`alt.Player.streamedIn`** except local: **`getScreenCoordFromWorldCoord`** at head-ish offset + **`~0.95` m** Z; draw centered text if on-screen and within **~22 m**.

## Non-goals

- Custom names / RP rename UI (use account email prefix only).
- Nametags through walls (no line-of-sight native in this slice).

---

*Phase: 13-player-nametags*
