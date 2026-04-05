# Requirements: GTA (alt:V Rebar server)

**Active milestone:** **v1.1 — gap closure** (from [v1.0 audit](v1.0-MILESTONE-AUDIT.md))

**Shipped baseline:** **[v1.0 requirements archive](milestones/v1.0-REQUIREMENTS.md)** — 34 capabilities complete (phases 1–6); unchanged.

## v1.1 — Audit gap closure

| ID | Description |
|----|-------------|
| **AUD-VERIFY-01** | Every phase folder `01-…` through `06-…` contains **`VERIFICATION.md`** with REQ mapping and retrospective status for GSD audit. |
| **AUD-SUMM-01** | Executed plans in phases **4–6** have **`NN-MM-SUMMARY.md`** with `requirements-completed` frontmatter. |
| **AUD-TRUST-01** | Server enforces **vehicle catalog** price (and model hash where applicable) on purchase — closes audit **INT-02**. |
| **AUD-TRUST-02** | **`vehicle:spawnFromGarage`** verifies **property owner** matches session before spawn — closes audit **INT-03**. |
| **AUD-DOC-01** | **WEBV-01** wording and README clearly state: **native client** for phone/core HUD; **Vue webview** is Rebar shell / future plugins — closes audit **INT-01**. |

### Checklist

- [ ] **AUD-VERIFY-01**
- [ ] **AUD-SUMM-01**
- [ ] **AUD-TRUST-01**
- [ ] **AUD-TRUST-02**
- [ ] **AUD-DOC-01**

## Traceability (v1.1)

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUD-VERIFY-01 | Phase 7 | Pending |
| AUD-SUMM-01 | Phase 8 | Pending |
| AUD-TRUST-01 | Phase 9 | Pending |
| AUD-TRUST-02 | Phase 9 | Pending |
| AUD-DOC-01 | Phase 9 | Pending |

**Coverage:** 5 gap-closure requirements → phases 7–9.

## v2 backlog (unchanged)

| ID | Theme | Summary |
|----|--------|---------|
| TEST-01 | Hardening | Automated tests for critical services or repositories |
| TEST-02 | Hardening | CI runs compile and lint on push |
| MAIL-01 | Email | Optional SMTP-based verification or notifications in production |

## Out of scope (unchanged)

| Feature | Reason |
|---------|--------|
| Native mobile client | Web + alt:V client only |
| Rockstar official Online sync | Independent server |
| Real-money gambling | Gameplay currency only |

---

_Updated: 2026-04-06 — `$gsd-plan-milestone-gaps`_
