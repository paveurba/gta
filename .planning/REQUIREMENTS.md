# Requirements: GTA (alt:V Rebar server)

**Active milestone:** **v1.2 — quality & correctness** (see [ROADMAP](ROADMAP.md)).

## Shipped baselines

| Milestone | Scope | Archive |
|-----------|--------|---------|
| **v1.0** | 34 gameplay / ops requirements (phases 1–6) | [v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md) |
| **v1.1** | 5 audit gap-closure IDs (AUD-VERIFY-01 … AUD-DOC-01) | [v1.1-REQUIREMENTS.md](milestones/v1.1-REQUIREMENTS.md) |

## v1.2 — Quality & correctness

| ID | Description |
|----|-------------|
| **PROP-INT-01** | Property **enter**: no server-side `player.pos` to IPL interior coords; client teleports from `property:enterResult`. **Exit**: client-only exterior teleport. Chat `enter` validates interior like RPC. |
| **REFACTOR-01** | Incrementally extract handlers from `server/index.ts` into small modules (single responsibility); no speculative abstractions. _(Phase 11 — not started)_ |

### Checklist (v1.2)

- [x] **PROP-INT-01**
- [x] **REFACTOR-01**

## Traceability (v1.2)

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROP-INT-01 | 10 | Complete |
| REFACTOR-01 | 11 | Complete _(vehicle + property registrars)_ |

## v2 backlog (reference)

| ID | Theme | Summary |
|----|--------|---------|
| TEST-01 | Hardening | Automated tests for critical services or repositories |
| TEST-02 | Hardening | CI runs compile and lint on push |
| MAIL-01 | Email | Optional SMTP-based verification or notifications in production |

## Out of scope (reference)

| Feature | Reason |
|---------|--------|
| Native mobile client | Web + alt:V client only |
| Rockstar official Online sync | Independent server |
| Real-money gambling | Gameplay currency only |

---

_Updated: 2026-04-05 — **v1.2** active (PROP-INT-01 complete)._
