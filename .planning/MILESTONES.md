# Milestones

## v1.1 — gap closure (Shipped: 2026-04-06)

**Phases:** 7–9 · **Roadmap plan rows:** 7 (verification retrofit, retro summaries, trust + docs).

**Delivered:**

- **Phase 7:** `VERIFICATION.md` in each historical phase dir `01-…`–`06-…` (GSD **AUD-VERIFY-01**).
- **Phase 8:** Retroactive `NN-MM-SUMMARY.md` for all executed plans in phases 4–6 (**AUD-SUMM-01**).
- **Phase 9:** Server `buyVehicle` catalog enforcement (**AUD-TRUST-01** / INT-02); `vehicle:spawnFromGarage` property + garage checks (**AUD-TRUST-02** / INT-03); **WEBV-01** archive + `06-WEBVIEW.md` traceability (**AUD-DOC-01** / INT-01).

**Archives:** [Roadmap](milestones/v1.1-ROADMAP.md) · [Requirements](milestones/v1.1-REQUIREMENTS.md)

**Git tag:** `v1.1`

**Audit source:** [v1.0-MILESTONE-AUDIT.md](v1.0-MILESTONE-AUDIT.md) (gaps addressed in v1.1; Nyquist / other items remain optional backlog).

---

## v1.0 — Shipped 2026-04-06

**Phases:** 1–6 (18 plans). **v1 requirements:** 34/34 complete.

**Delivered:**

- **Platform:** Docker Compose stack, MySQL migrations/init path, `pnpm refresh` / compile documented and exercised.
- **Identity & economy:** Auth UI (**T**), bcrypt, session → MySQL; cash/bank persistence.
- **Phone:** Contacts, SMS by `players.id`, native phone UI (**M**).
- **Properties & vehicles:** Buy/sell/enter/exit, garages, dealership, persistence; docs under `.planning/phases/04-properties-vehicles/`.
- **Shops & casino:** Weapons, clothing, slots/roulette + DB; roulette number-bet parsing fix.
- **World & webview:** Map blips, 46 static parked vehicles, hospital respawn ($500 / 5 s), ambient population off; Vue webview build path documented (`resources/webview`).

**Archives:** [Roadmap](milestones/v1.0-ROADMAP.md) · [Requirements](milestones/v1.0-REQUIREMENTS.md)

**Git tag:** `v1.0`

---
