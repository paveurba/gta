# Roadmap: GTA (alt:V Rebar server)

## Active work: v1.1 gap closure (audit-driven)

Phases **7–9** close items from [`.planning/v1.0-MILESTONE-AUDIT.md`](v1.0-MILESTONE-AUDIT.md) (`gaps_found` = **process + integration debt**, not “unship v1.0”).

**Depends on:** v1.0 shipped (see below)

### Phase 7: GSD verification artifacts (retrofit)

**Goal:** Each historical phase directory (`01-platform-persistence` … `06-world-webview`) contains a **`VERIFICATION.md`** that records retrospective verification status, mapped REQ IDs, evidence pointers (SUMMARY, `*-SERVER.md`, README, code paths), and **passed | gaps_found** for GSD re-audit.

**Gap closure:** `GSD-VERIFY-01`, `requirements_formal_trace` (audit YAML)

**Requirements:** AUD-VERIFY-01

**Plans:** 2 plans (suggested)

Plans:

- [x] 07-01: VERIFICATION.md for phases **01–03** (platform, identity/economy, phone)
- [x] 07-02: VERIFICATION.md for phases **04–06** (properties/vehicles, shops/casino, world/webview)

### Phase 8: Retroactive plan summaries (phases 4–6)

**Goal:** Add **`PLAN-SUMMARY.md`** (or `NN-NN-SUMMARY.md`) for each executed plan in phases 4–6 so SUMMARY frontmatter **`requirements-completed`** exists for GSD three-source checks.

**Gap closure:** Phases 4–6 execution debt (audit tech_debt list)

**Requirements:** AUD-SUMM-01

**Plans:** 3 plans (suggested)

Plans:

- [x] 08-01: Summaries for **04-01 … 04-04**
- [x] 08-02: Summaries for **05-01 … 05-03**
- [x] 08-03: Summaries for **06-01 … 06-03**

### Phase 9: Server trust model & WEBV wording

**Goal:** Address audit **integration** items: server validates **vehicle purchase** price (and hash if practical) against `VEHICLE_CATALOG`; **`vehicle:spawnFromGarage`** enforces **property ownership**; align **WEBV-01** / README text with **native phone** vs **Vue webview** shell (`INT-01`–`INT-03`).

**Requirements:** AUD-TRUST-01, AUD-TRUST-02, AUD-DOC-01

**Plans:** 2 plans (suggested)

Plans:

- [ ] 09-01: `vehicle:buy` / `buyVehicle` catalog enforcement + tests or manual checklist in VERIFICATION
- [ ] 09-02: `vehicle:spawnFromGarage` ownership guard + WEBV-01 / README doc alignment

### Deferred (optional, not scheduled)

- **`GSD-NYQUIST-01`:** Add `*-VALIDATION.md` per phase — run **`$gsd-validate-phase`** or plan a dedicated phase when Nyquist compliance is required.
- **CONCERNS.md:** TEST-01/02, `server/index.ts` split — remain **v2 backlog** unless promoted via **`$gsd-new-milestone`**.

---

## Shipped: v1.0 (2026-04-05 — 2026-04-06)

**Scope:** Six GSD phases — platform & persistence through world & webview — **18 plans**, **34 v1 requirements** (all complete).

- **Full phase goals, success criteria, and plan checklist:** [`.planning/milestones/v1.0-ROADMAP.md`](milestones/v1.0-ROADMAP.md)
- **Archived v1 requirements + traceability:** [`.planning/milestones/v1.0-REQUIREMENTS.md`](milestones/v1.0-REQUIREMENTS.md)

---

_Live roadmap: v1.1 gap phases added 2026-04-06 (`$gsd-plan-milestone-gaps`)._
