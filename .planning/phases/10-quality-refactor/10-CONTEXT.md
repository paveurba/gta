# Phase 10: Quality refactor — context

**Milestone:** v1.2 (quality & correctness)  
**Principles:** KISS, YAGNI, single responsibility for property interior rules in `PropertyService`.

## Problem

Owned property **enter** set `player.pos` on the **server** to IPL apartment coordinates. alt:V sync/navmesh handling can **snap** the player to an exterior location (often misreported as “police station” or similar). **Exit** duplicated teleport (server + client).

## Scope (10-01)

- Centralize interior validation + payload in `buildPropertyInteriorEnterPayload` / `hasConfiguredPropertyInterior`.
- **Do not** set server `player.pos` for interior enter or for exit; client already applies `setEntityCoordsNoOffset` / IPL delay.
- Align chat `enter` with RPC validation (reject unconfigured interiors before `playersInProperty`).

## Out of scope (later phases)

- Large `server/index.ts` split (CONCERNS) — incremental only when touched.
- Automated tests (TEST-01) — backlog.

---

*Phase: 10-quality-refactor*
