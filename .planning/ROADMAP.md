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

**Goal:** Extract **vehicle** and **property** client RPC wiring from `server/index.ts` into `server/events/register*ClientEvents.ts` registrars with small typed **context** objects (KISS / SRP). No behavior change.

**Requirements:** REFACTOR-01

**Plans:** 2

Plans:

- [x] 11-01: **`registerVehicleClientEvents`** — all `vehicle:*` `alt.onClient` handlers
- [x] 11-02: **`registerPropertyClientEvents`** — all `property:*` `alt.onClient` handlers (after 11-01 pattern)

**Artifacts:** [`.planning/phases/11-server-modularization/11-CONTEXT.md`](phases/11-server-modularization/11-CONTEXT.md), `11-01-PLAN.md`, `11-02-PLAN.md`

---

### Backlog (from v1.1)

- **GSD-NYQUIST-01** — optional `*-VALIDATION.md`
- **CONCERNS.md** — TEST-01/02, full `server/index.ts` split

---

_Shipped v1.1: 2026-04-06. v1.2 opened: 2026-04-05._
