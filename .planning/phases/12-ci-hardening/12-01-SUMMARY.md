---
phase: 12-ci-hardening
plan: 01
subsystem: ci
tags: gsd, github-actions, test-02

requires:
  - 12-01-PLAN.md
provides:
  - .github/workflows/ci.yml
affects:
  - .planning/REQUIREMENTS.md
  - .planning/ROADMAP.md
  - .planning/STATE.md

tech-stack:
  added:
    - GitHub Actions (ubuntu-latest, Node 20, pnpm 10)
  patterns:
    - "pnpm install --frozen-lockfile --ignore-scripts then pnpm run compile:ts"

key-files:
  created:
    - .github/workflows/ci.yml

key-decisions:
  - "Skip lifecycle scripts: root postinstall runs altv-pkg + build:docker — unsuitable for default CI runner."
  - "TEST-02 scoped to compile gate only; lint/Prettier not in CI until a single script exists."

requirements-completed:
  - TEST-02

duration: n/a
completed: 2026-04-06
---

# Phase 12: Plan 12-01 Summary

**Shipped:** **`.github/workflows/ci.yml`** — **`push`** / **`pull_request`** to **`main`**, **pnpm 10**, **Node 20**, **`pnpm install --frozen-lockfile --ignore-scripts`**, **`pnpm run compile:ts`**.

## Verification

- Local: **`pnpm install --frozen-lockfile --ignore-scripts && pnpm run compile:ts`** exits **0**.

## Deviations

- Requirement text for **TEST-02** was *compile and lint*; repo has no eslint script — **lint** explicitly deferred in **REQUIREMENTS**.
