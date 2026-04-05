# Phone & messaging — server reference

**Source:** `src/plugins/gta-mysql-core/server/services/PhoneService.ts`, `src/plugins/gta-mysql-core/server/events/registerPhoneClientEvents.ts` (wired from `server/index.ts`)

## MySQL tables

| Table | Used by |
|-------|---------|
| `phone_contacts` | `getContacts`, `addContact`, `deleteContact`, `updateContact`, `getPhoneData` |
| `phone_messages` | `getMessages`, `getConversation`, `sendMessage`, `markAsRead`, `getUnreadCount`, `deleteMessage`, `getPhoneData` |

## Client → server events

All handlers require `playerSessions.get(player.id)` (logged-in); they use `session.oderId` as **MySQL `players.id`**.

| Event | Handler behavior |
|-------|------------------|
| `phone:getData` | `phoneService.getPhoneData(session.oderId)` → `alt.emitClient(player, 'phone:data', data)` |
| `phone:addContact` | `(name, number)` → `addContact` → notify; on success refresh `getPhoneData` → `phone:data` |
| `phone:deleteContact` | `contactId` → `deleteContact` → notify (no auto `phone:data` emit) |
| `phone:sendMessage` | `(receiverId, message)` → `sendMessage(session.oderId, receiverId, message)` → notify sender |

## Chat commands (`handleChatCommand`)

| Command | Usage string | Behavior |
|---------|----------------|----------|
| `contact` | `Usage: /contact <name> <number>` | `phoneService.addContact(session.oderId, name, number)` |
| `contacts` | (none) | Lists contacts via `getContacts`; prints `No contacts` if empty |
| `sms` | `Usage: /sms <playerId> <message>` | `parseInt(args[0])` → `sendMessage(session.oderId, receiverId, message)` |

## ID semantics (critical)

- **`playerId` in `/sms` and `phone:sendMessage`** is **`players.id`** (persisted account id), the same value stored in `player.setMeta('playerId', ...)` after login.
- It is **not** alt:V’s transient `alt.Player.id` (connection slot).
- **`contact_number`** is a free-form string in the DB; for messaging another player you typically store their **`players.id`** as the number (UI labels it “To (Player ID)” on the client).

## Receiver notification (`sendMessage`)

After `INSERT INTO phone_messages`, if the receiver is online:

- Find `alt.Player` where `p.getMeta('playerId') === receiverId` (receiver’s DB id).
- `alt.emitClient(receiverPlayer, 'phone:newMessage', messageData)`.

Sender does not receive `phone:newMessage`; they get `notifyPlayer` with `result.message` only.
