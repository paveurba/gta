# Phase 12: CI hardening — context

**Milestone:** v1.2 (extension) — or next minor once **`$gsd-complete-milestone`** archives v1.2; align with [ROADMAP](../../ROADMAP.md).

**Requirement:** [TEST-02](../../REQUIREMENTS.md) — *CI runs compile (and formatting check where practical) on push.*

## Why now

- Refactors (**phase 11**) increased module count; **compile regressions** should surface on **PR/push**, not only locally.
- [CONCERNS.md](../../codebase/CONCERNS.md) already flags missing automated tests; **TEST-02** is the smallest **signal** step before **TEST-01** (service tests).

## Principles

- **KISS:** One workflow file; **`pnpm run compile:ts`** as the required gate (matches local dev).
- **YAGNI:** No Docker-based alt:V server in CI unless needed; no flaky integration tests in **12-01**.
- **SOLID:** Workflow lives under **`.github/workflows/`**; docs point to the script name owners already use.

## Non-goals (12-01)

- **TEST-01** (Vitest/Jest against services) — later plan **12-02** or v1.3.
- Full **`pnpm build:docker`** in CI (heavy, optional follow-up).
- Replacing existing **Retype** Pages workflow — **add** a separate **`ci`** workflow.

## References

- Root **`package.json`** — **`compile:ts`** script (Sucrase + plugin scripts).
- Existing **`.github/workflows/retype-action.yml`** — pattern for `ubuntu-latest`, checkout.

---

*Phase: 12-ci-hardening*
