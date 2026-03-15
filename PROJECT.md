# Project Description

## Overview

This repository is a **GTA V multiplayer server** for **alt:V** (Alternative Multiplayer). It is built on the **Rebar framework**, written in **TypeScript**, and uses **MySQL** for game data persistence.

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Multiplayer** | [alt:V](https://altv.mp) — GTA V multiplayer mod / server |
| **Framework** | [Rebar](https://rebarv.com) — TypeScript plugin architecture for alt:V |
| **Language** | **TypeScript** — compiled to JavaScript for server, client, and shared code |
| **Database** | **MySQL 8** — player data, money, weapons, properties, phone, auth |
| **Rebar core** | MongoDB — character/account documents (framework requirement) |
| **Frontend** | Vue 3 + Vite — in-game webviews (e.g. HUD, menus) |

## Architecture

- **Rebar** provides the core runtime: documents (character, account, vehicle), services (currency, items, death, notifications, etc.), RPC, permissions, and event system (`rebar:*` events).
- **TypeScript** source lives in `src/` and is compiled into `resources/core/` (JS) for the alt:V server.
- **MySQL** is used via the **gta-mysql-core** plugin for:
  - Authentication (users, sessions)
  - Characters (linked to Rebar character documents)
  - Money, bank, inventory
  - Properties, vehicles, weapon ownership
  - Phone (contacts, messages)
  - Clothing, casino, weapon shops
- **MongoDB** is used by Rebar for its own document storage (accounts, characters, vehicles); the game layer syncs and extends this with MySQL for richer persistence.

## Project Structure (high level)

- `src/` — TypeScript source (main + plugins)
  - `main/` — core Rebar-based server/client/shared code
  - `plugins/gta-mysql-core/` — MySQL-backed services (auth, vehicles, properties, phone, etc.)
- `resources/core/` — Compiled output and alt:V resource manifest (`resource.toml`)
- `webview/` — Vue 3 frontend for in-game UI
- `scripts/` — Build, compile, Docker, and Rebar upgrade scripts

## Summary

A **GTA V alt:V server** using the **Rebar framework** and **TypeScript**, with **MySQL** as the primary database for game features (auth, economy, properties, vehicles, phone, shops) and MongoDB for Rebar’s core documents.
