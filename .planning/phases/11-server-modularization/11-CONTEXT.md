# Phase 11: Server modularization — context

**Milestone:** v1.2  
**Requirement:** [REFACTOR-01](../../REQUIREMENTS.md) — incremental extraction from `server/index.ts` (no big-bang).

## Principles

- **KISS:** One new file per domain slice; thin `register*()` that only wires `alt.onClient`.
- **YAGNI:** No generic “event bus” or DI container; pass a small **context** object with only what handlers need.
- **SOLID (S):** Vehicle RPCs live in `registerVehicleClientEvents`; property RPCs in `registerPropertyClientEvents`; `index.ts` orchestrates startup.

## Non-goals (this phase)

- Moving `handleCommand` or auth/death/connect (later phases if needed).
- Changing behavior or RPC names.
- Client-side moves.

## Canonical file

- `src/plugins/gta-mysql-core/server/index.ts` (~1300 LOC) — shrink by **moving** contiguous `alt.onClient` blocks, not copying logic twice.

---

*Phase: 11-server-modularization*
