# Roadmap: GTA (alt:V Rebar server)

## Milestones

| Version | Summary | Archive |
|---------|---------|---------|
| **v1.0** | Phases 1–6 — platform through world & webview (**18** plans, **34** reqs) | [v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) |
| **v1.1** | Gap closure — phases 7–9 (audit artifacts, trust, docs) | [v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md) |
| **v1.2** | **Active** — quality, clean-code-oriented refactors, gameplay correctness | _(in progress)_ |

## Active work: v1.2 — quality & correctness

**Goal:** Safer patterns (KISS / SOLID / YAGNI), fix known gameplay bugs, reduce `server/index.ts` risk incrementally.

**Depends on:** v1.1 shipped

### Phase 10: Property interior + validation extraction

**Goal:** Client-authoritative IPL/interior teleport; shared `PropertyService` helpers; chat/RPC parity.

**Requirements:** PROP-INT-01

Plans:

- [x] 10-01: Interior enter/exit without server `player.pos` snap; `buildPropertyInteriorEnterPayload`

### Phase 11: Server modularization (incremental)

**Goal:** Move **`alt.onClient`** and core **`alt.on`** gameplay wiring out of `server/index.ts` into **`register*()`** modules and **`handleChatCommand`** (KISS / SRP). No behavior change.

**Requirements:** **REFACTOR-01** (11-01, 11-02), **REFACTOR-02** (11-03), **REFACTOR-03** (11-04)

**Plans:** 4

Plans:

- [x] 11-01: **`registerVehicleClientEvents`** — all `vehicle:*` `alt.onClient` handlers
- [x] 11-02: **`registerPropertyClientEvents`** — all `property:*` `alt.onClient` handlers (after 11-01 pattern)
- [x] 11-03: **Lifecycle + auth + chat + shops + phone + casino** — `registerPlayerLifecycleEvents`, `registerAuthClientEvents`, `registerChatClientEvents`, `handleChatCommand`, shop/phone/casino registrars; shared **`PlayerSession`**
- [x] 11-04: **Bootstrap + runtime + world** — `createGameplayMysqlBundle`, `createPlayerRuntime`, `spawnStaticParkedVehicles`; **`index.ts`** wiring only

**Artifacts:** [`.planning/phases/11-server-modularization/11-CONTEXT.md`](phases/11-server-modularization/11-CONTEXT.md), `11-01-PLAN.md` … `11-04-PLAN.md`

### Phase 12: CI hardening

**Goal:** **TEST-02** — push/PR CI runs **`pnpm run compile:ts`** so compile breaks are visible before merge.

**Requirements:** TEST-02

**Plans:** 1

Plans:

- [x] **12-01:** **`.github/workflows/ci.yml`** — Node + pnpm + **`compile:ts`** (`pnpm install --frozen-lockfile --ignore-scripts`)

**Artifacts:** [`.planning/phases/12-ci-hardening/12-CONTEXT.md`](phases/12-ci-hardening/12-CONTEXT.md), `12-01-PLAN.md`, `12-01-SUMMARY.md`

---

### Backlog (from v1.1)

- **GSD-NYQUIST-01** — optional `*-VALIDATION.md`
- **CONCERNS.md** — TEST-01/02; **`index.ts`** still holds parked spawns + session/login helpers (optional future slice)

---

_Shipped v1.1: 2026-04-06. v1.2 opened: 2026-04-05._
