# Phase 06 — Vue webview and Rebar integration

Maps **WEBV-01**.

## Build pipeline

Full compile uses **`scripts/compile.js`** (invoked by **`pnpm refresh`**, **`pnpm start`**, and Docker **`build:docker`**):

1. **`node ./scripts/buildPluginDependencies.js`**
2. Clean **`resources/core`**, **`resources/webview`**, and related public folders
3. **`node ./scripts/webview.js`**
4. **`pnpm -C webview run build`** — Vite **`outDir`: `../resources/webview`** (`webview/vite.config.ts`)
5. Sucrase TypeScript → **`resources/core`**
6. **`node ./scripts/env.js`**, **`node ./scripts/copyFiles.js`**
7. **`buildPluginImports.js`**, **`pathResolver.js`**

**`pnpm refresh`** = **`pnpm compile:ts`** (TS-only to `resources/core`) **+** **`docker compose up --build -d`** — for Docker, prefer the documented full refresh so the image runs **`compile.js`** and includes a fresh webview build inside the image.

**Dev:** **`pnpm webview:dev`** runs plugin deps + copy + webview script + Vite dev server for UI work.

## Plugin registration

**`webview/pages/plugins.ts`** exports **`PLUGIN_IMPORTS`** — **auto-generated**; currently **empty `{}`**. Rebar merges this into the webview page registry; **no custom Vue pages** are registered in this repo snapshot.

**`src/main/shared/webview/index.ts`** and **`src/main/client/webview/index.ts`** bridge Rebar’s webview events (`SystemEvents.player.webview` in shared types): page show/hide, RPC, localStorage, etc.

## Requirements traceability

**WEBV-01** (archived [v1.0 requirements](../../milestones/v1.0-REQUIREMENTS.md)) is satisfied by the pipeline above and this section: Vue is the Rebar webview **shell**; gameplay UIs listed under **Native vs Vue** are **not** implemented as Vue pages in this repo. Audit **INT-01** / **AUD-DOC-01** — README + milestone wording aligned in v1.1 gap closure.

## Native vs Vue (scope)

Primary gameplay UIs in **`gta-mysql-core/client/index.ts`** are **native** (drawn with GTA natives): **auth**, **phone**, **property**, **shops**, **dealership**, **chat**, death overlay, HUD.

The **Vue** app under **`webview/`** is the standard Rebar webview shell; with empty **`PLUGIN_IMPORTS`**, operators should still verify the bundle **builds** and **loads** without errors (F8 / client log) after **`pnpm refresh`**.

## Smoke checklist

1. Run **`pnpm refresh`** (or **`pnpm build:docker`** / image build used in compose).
2. Connect with alt:V client.
3. Confirm no repeated webview load failures in client console; open Rebar webview features if your fork registers pages later.
