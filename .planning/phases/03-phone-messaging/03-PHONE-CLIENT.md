# Phone — alt:V client (native UI)

**Source:** `src/plugins/gta-mysql-core/client/index.ts` (PHONE SYSTEM + draw loop)

## Architecture

- **Not Vue:** There is **no** phone page under `webview/`. The phone is a **native overlay**: `drawRect` / `drawTextLeft` in the client `alt.everyTick` render block (~lines 1955–2000).
- **Auth UI** uses the same pattern (separate from webview).

## Hotkey

- **Key code `77` = `M`**: toggles phone when `isLoggedIn`, unless `authOpen`, `chatOpen`, or `propertyInteractionOpen` (see keydown handler ~1164–1168).
- Opening blocked if `propertyInteractionOpen` inside `openPhone()` (~701–702).

## Open / close

- **`openPhone()`**: sets `phoneOpen`, shows cursor, disables game controls, **`alt.emitServer('phone:getData')`**.
- **`closePhone()`**: clears `phoneOpen`, hides cursor, re-enables controls.

## Server → client

- **`phone:data`**: assigns `phoneContacts`, `phoneMessages`, `phoneUnread` from payload.
- **`phone:newMessage`**: `unshift` message, increment `phoneUnread`, `addNotification`.

## Outbound (`alt.emitServer`)

| User action | Emitted event |
|-------------|----------------|
| Add contact (Enter on add tab) | `phone:addContact`, `phoneInput` (name), `phoneInput2` (number) |
| Send message (Enter on send tab) | `phone:sendMessage`, `parseInt(phoneInput)` as receiver id, `phoneInput2` as body |

## Navigation (`handlePhoneKey`)

- **ESC**: from `main` → `closePhone()`; sub-tabs → `phoneTab = 'main'`.
- **Main menu**: `1` contacts, `2` messages, `3` add contact, `4` send message.
- **Add / Send tabs**: **TAB** switches `activeInput` between `phone1` and `phone2`; **ENTER** submits; text via `handleTextInput`.

## On-screen copy

- Send tab labels the first field **To (Player ID):** — matches MySQL `players.id` semantics documented on the server.
