# Phase 14 — Client modularization

## Goal

Split **`gta-mysql-core/client/index.ts`** (~2k lines) into **small modules** under **`client/`**, mirroring the server’s phase-11 “register* / single responsibility” style, **without gameplay or UI behavior changes**.

## Approach

- **`clientState` singleton** (`state.ts`) — one mutable object for all former top-level `let` bindings so ES modules can share assignments safely.
- **Domain files** own their helpers and **`alt.onServer` / `alt.on`** registrations where natural; **`index.ts`** only imports side-effect modules in a fixed order and logs load.
- **Drawing** consolidated in **`draw.ts`** (primitives, world markers, menus, auth/phone/chat overlays) to avoid circular imports between HUD and many small draw files.

## Non-goals

- New features, visual redesign, or chat/auth UX changes.
- Further splitting **`draw.ts`** in this phase (optional follow-up).

## Verification

- **`pnpm run compile:ts`** passes.
- Manual smoke: login, HUD, property marker, shop E, nametag (unchanged visually).
