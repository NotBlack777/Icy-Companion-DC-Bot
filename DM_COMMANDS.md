# Icy Companion — DM Command System

Every command below works **two ways**:

```
@Icy Companion kick #1 123456789012345678 spamming
/kick server:#1 user:123456789012345678 reason:spamming
```

Both paths run the exact same code, so they can never drift apart.

---

## Setup

Add your Discord user ID to `.env`:

```env
TOKEN=your-bot-token
CLIENT_ID=your-application-id
SUPER_OWNER_ID=your-discord-user-id
```

`SUPER_OWNER_ID` is what unlocks the DM panel. Without it the bot logs a
warning on boot and no DM commands are usable.

Then DM the bot:

```
@Icy Companion help
```

---

## Targeting servers: `#N` vs server ID

Anywhere a command takes `<#N/serverid>` you can use either:

| Form   | Example                | Notes                                        |
| ------ | ---------------------- | -------------------------------------------- |
| `#N`   | `#1`                   | Config number, stable across restarts        |
| ID     | `1234567890123456789`  | Raw Discord guild ID                         |
| Name   | `My Server`            | Exact name match, convenient in DMs          |

Run `@bot servers` to see every server with its `#N`.

---

## Permission tiers

| Tier             | Who                          | Access                                    |
| ---------------- | ---------------------------- | ----------------------------------------- |
| 👑 Super Owner   | `SUPER_OWNER_ID`             | Everything                                |
| ⭐ Global Owner  | `@bot addowner <id>`         | Everything except Super-Owner-only actions |
| 🔹 Junior Owner  | `@bot addjunior <id>`        | Read-only: `help`, `invite`, `ownerlist`  |
| Everyone else    | —                            | Nothing. Commands stay completely silent.  |

Non-owners get **no response at all** — the bot never confirms a command
exists, so the panel is invisible to regular users.

---

## Command reference

### 📋 Info
```
@bot help
@bot invite
@bot servers
@bot status
@bot memstats
@bot config <#N/serverid>
@bot stafflist <#N/serverid>
@bot streaks <#N/serverid>
@bot attendance <#N/serverid>
@bot find <user id>
```

### 🗑️ Delete
```
@bot delete <msg id>
@bot sdelete <#N/serverid> <msg id>
@bot dmdelete <msg id>
@bot clear <#N/serverid> <channel id> <amount>
```
`clear` is capped at 100 and cannot remove messages older than 14 days
(a Discord API limit) — skipped messages are reported back to you.

### 📢 Broadcast
```
@bot broadcast <message>
@bot announce <#N/serverid> <channel id> <msg>
@bot dm <user id> <message>
```
`broadcast` picks the system channel, or the first channel the bot can
post in, and paces sends to stay under rate limits.

### ⚙️ Management
```
@bot leave <server id>
@bot kick <#N/serverid> <user id> [reason]
@bot ban <#N/serverid> <user id> [reason]
@bot setowner <#N/serverid> <user id>
@bot resetconfig <#N/serverid>
@bot resetattendance <#N/serverid>
@bot setremind <#N/serverid> <HH:MM>
```
`ban` works on users who already left, since it bans by ID.

### 📊 Reports
```
@bot remind <#N/serverid>
@bot report weekly <#N/serverid>
@bot report monthly <#N/serverid>
```
`remind` only DMs people who have **not** marked attendance today.

### 📨 DM Logger
```
@bot dm mode server <#N/serverid> <cat id>
@bot dm mode dm
@bot dm logger on
@bot dm logger off
@bot dm status
@bot dm blacklist add <id>
@bot dm blacklist remove <id>
@bot dm blacklist list
```

Logs everything a user does in the bot's DMs into a channel named after
them — messages, replies, edits, deletes and reactions.

#### Strict server + category scoping

`dm mode server` requires **both** a server and a category, and log
channels are **only ever created inside that category**:

```
@bot servers                          → find your server's #N
@bot dm mode server #1 555000111222   → set server + category
@bot dm status                        → confirm it is healthy
```

If the target server, category or permissions become invalid, the logger
**stops and writes nothing** rather than falling back to somewhere else.
You get one DM alert (rate-limited to once per 10 minutes) explaining
why, and `@bot dm status` shows the exact reason.

Out of the box nothing is configured, so **no DMs are logged anywhere**
until you run `dm mode server`.

#### What gets logged

| Event | Embed |
| --- | --- |
| New DM | 📩 New DM Received — user, time, type, message |
| Reply | ↩️ Reply to a message + a quote of what was replied to |
| Reaction | 😀 DM Reaction — who, emoji, time, reacted-on message |
| Reaction removed | 🚫 DM Reaction Removed |
| Edit | ✏️ DM Edited — before and after |
| Delete | 🗑️ DM Deleted (cached messages only) |

Each channel opens with a pinned **📋 DM Log Channel** message, and every
embed footers with `User ID: … • Message ID: …`.

#### Replying

Anything you type in a log channel is **sent back to the user** as a
staff reply. Prefix with `//` for an internal note that is not sent.
✅ / ❌ reactions confirm delivery.

- **`dm mode dm`** — forward to your DMs instead of a category.
- **`dm logger off`** — pause logging entirely.

Owners are exempt — your own DMs are treated as commands, not modmail.

### 🔒 Privacy
```
@bot turn on privacy mode
@bot turn off privacy mode
@bot turn on otjoin mode
@bot turn off otjoin mode
@bot force restart
@bot shutdown
```
- **Privacy mode** — the bot appears offline but keeps working. Persists
  across restarts.
- **OTJoin mode** — the bot automatically leaves any new server it is
  added to, and DMs you who added it.
- **force restart** — exits the process. It only comes back if a process
  manager (pm2, systemd, Docker `restart: always`) is running.

### 🛡️ Security
```
@bot setpassword <password>
@bot unlock <password>
@bot lock
@bot setup-totp
@bot addowner <user id>
@bot removeowner <user id>
@bot addjunior <user id>
@bot removejunior <user id>
@bot ownerlist
```

**Locking.** Destructive commands (kick, ban, broadcast, clear, delete,
shutdown, restart, owner changes) are marked *secured*. Run `@bot lock`
and they all require `@bot unlock <password>` first. An unlock lasts
**30 minutes**.

**Passwords** are stored as salted scrypt hashes — never plaintext. The
bot deletes your `setpassword` message when it has permission to; in DMs
it cannot, so delete it yourself (the reply reminds you).

**2FA.** `@bot setup-totp` shows a QR code for Google Authenticator /
Authy / 1Password. Confirm with `@bot setup-totp <6-digit code>`. After
that, `@bot unlock <code>` accepts either the code or your password.
Codes tolerate ±30s of clock drift.

---

## Slash command names

Multi-word and conflicting commands are renamed for Discord, which does
not allow spaces in command names:

| DM command                 | Slash command        |
| -------------------------- | -------------------- |
| `report weekly`            | `/report-weekly`     |
| `report monthly`           | `/report-monthly`    |
| `dm mode server`           | `/dm-mode-server`    |
| `dm blacklist add`         | `/dm-blacklist-add`  |
| `turn on privacy mode`     | `/privacy-on`        |
| `turn off privacy mode`    | `/privacy-off`       |
| `turn on otjoin mode`      | `/otjoin-on`         |
| `force restart`            | `/force-restart`     |
| `help`                     | `/dm-help`           |
| `config`                   | `/dm-config`         |
| `attendance`               | `/dm-attendance`     |
| `status`                   | `/dm-status-bot`     |
| `remind`                   | `/dm-remind`         |

The last few are prefixed because a guild command with that name already
exists. All slash replies are **ephemeral** (only you see them).

---

## Server commands added alongside the DM system

These are normal in-server slash commands, shown in `/help`.

### 📋 Attendance
| Command | Description |
| --- | --- |
| `/top-staff [limit]` | Attendance streak leaderboard, ✅ marks who logged today |
| `/set-staff-role [role]` | Set the staff role (empty clears it) |
| `/set-attendance-channel [channel]` | Set the attendance channel (empty clears it) |

### ⚙️ Settings
| Command | Description |
| --- | --- |
| `/setprefix <prefix>` | Change the text prefix (shown in the `/help` footer) |
| `/ignore-role <role>` | Toggle a role being ignored |
| `/ignore-user <user>` | Toggle a user being ignored |
| `/ignore-channel [channel]` | Toggle a channel being ignored (defaults to here) |
| `/ignore-list` | View everything currently ignored |

The three `ignore-*` commands **toggle** — running one twice un-ignores.
Owners cannot be ignored, so nobody can lock themselves out.

### 🎲 Fun
| Command | Description |
| --- | --- |
| `/poll <question> [options]` | Reaction poll. Comma-separated options (2-10), or yes/no when omitted |

### Renamed commands (old names still work)

`/help` now lists hyphenated names. The originals are kept as aliases
running the same code, so nothing breaks:

| Shown in help | Also works |
| --- | --- |
| `/server-info` | `/serverinfo` |
| `/bot-info` | `/botinfo` |
| `/user-info` | `/userinfo` |
| `/member-count` | `/membercount` |
| `/owner` | `/owner-list` |
| `/add-extra-owner` | `/add-owner` |
| `/remove-extra-owner` | `/remove-owner` |
