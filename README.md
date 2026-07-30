# opencode-tmux-notify

Reliable desktop notifications for OpenCode running over SSH in active or
inactive tmux sessions.

This plugin sends Ghostty desktop notifications (OSC 777) directly to the TTY
of every attached tmux client. Because it writes to the client TTY rather than
the originating pane, notifications are delivered even when the OpenCode tmux
session is hidden, inactive, or running in a different window from the one you
are currently viewing. No `allow-passthrough` setting is required.

## Why this exists

Generic OpenCode notifiers write the notification sequence to the pane that
OpenCode is running in. Over SSH inside tmux, that only works when the
originating pane is the visible, active pane in an attached client. If the
session is detached, the window is hidden, or another session is active, the
sequence never reaches the Ghostty client on your laptop and no notification
appears.

`opencode-tmux-notify` resolves the originating tmux pane, enumerates the
currently attached tmux clients, and writes OSC 777 directly to each client
TTY. The originating session can be inactive, its window hidden, or the
session detached, as long as at least one tmux client remains attached over
SSH.

## How it works

```
OpenCode event
    |
    v
Identify originating tmux pane (TMUX_PANE, captured at startup)
    |
    v
Resolve pane location with tmux display-message
    |
    v
Enumerate attached tmux clients with tmux list-clients
    |
    v
Write OSC 777 directly to each client TTY
    |
    v
Ghostty displays the desktop notification
```

The notification never passes through the originating tmux pane, so tmux
passthrough is unnecessary. If OpenCode is not running inside tmux, the
sequence is written to `/dev/tty` as a fallback.

## Install

Add the package name to OpenCode's `~/.config/opencode/opencode.json` (or the
project configuration). OpenCode installs npm plugins automatically with Bun:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-tmux-notify"]
}
```

Restart OpenCode after changing the plugin list. OpenCode loads plugins only
at startup and does not hot-reload them.

### Migrate from terminal-visual-notify

If you previously used the local `terminal-visual-notify.js` plugin, remove it
so OpenCode does not load both and produce duplicate notifications:

```sh
rm -f ~/.config/opencode/plugins/terminal-visual-notify.js
```

No `allow-passthrough` tmux setting is needed with this plugin.

## Behavior

- Notifies on `permission.asked`, `question.asked`, `session.error`, and
  top-level `session.idle`.
- Notification titles:
  - `permission.asked` -> `OpenCode: Approval required`
  - `question.asked` -> `OpenCode: Answer required`
  - `session.idle` -> `OpenCode: Task complete`
  - `session.error` -> `OpenCode: Session error`
- The body contains only the short hostname, project basename, and tmux
  session, window index, pane index, and window name. Event payload contents
  (prompts, commands, permission arguments, file contents, question text) are
  never included, because Linux desktop notifications may appear on the lock
  screen.
- Repeated `session.idle` events for the same session are deduplicated within
  a short window so later commands still notify.
- Child sessions are ignored by default.
- Terminal control characters, OSC delimiters, and newlines are sanitized to
  prevent terminal injection.
- tmux, detached-client, and TTY errors are ignored. Notifications require a
  running tmux server with at least one attached client when OpenCode starts
  inside tmux. OSC cannot reach the laptop when SSH is completely disconnected.

## Optional configuration

The plugin works without a configuration file. Advanced users can create
`~/.config/opencode/opencode-tmux-notify.json`:

```json
{
  "events": {
    "permission.asked": true,
    "question.asked": true,
    "session.idle": true,
    "session.error": true
  },
  "notifyChildSessions": false,
  "notifyAllClients": true,
  "rememberLastTarget": true,
  "protocol": "osc777"
}
```

- All four events are enabled by default. The boolean event map can disable
  any event; an event omitted from the map keeps its default. For
  compatibility, an array of event names is also accepted.
- `notifyAllClients` defaults to `true`, sending to every attached client on
  the tmux server. Set it to `false` to limit notifications to clients
  attached to the origin session.
- `rememberLastTarget` controls the tmux global
  `@opencode_notify_last_pane` option used by the optional binding below.
- `protocol` is reserved; only `osc777` is supported.

## Optional tmux binding

The plugin maintains `@opencode_notify_last_pane` as a tmux global option on
every notification. It does not modify `.tmux.conf`. To opt in, add this
binding to your tmux config so Prefix+Shift+O switches to the originating
session, window, and pane:

```tmux
bind-key O run-shell '\
  target="$(tmux show-option -gqv @opencode_notify_last_pane)"; \
  if [ -n "$target" ]; then \
    tmux switch-client -t "$target"; \
  else \
    tmux display-message "No OpenCode notification target"; \
  fi'
```

The workflow becomes: click the notification to return to Ghostty, then press
the tmux prefix followed by Shift+O.

## Limitations

- Requires at least one attached tmux client. OSC cannot reach the laptop when
  SSH is completely disconnected.
- Targets Ghostty, which supports OSC 777 desktop notifications by default.
- No sounds, webhooks, Telegram, native `notify-send`, focus detection,
  icons, or elaborate templates. Those features already exist in generic
  notifier plugins; this plugin's differentiator is reliable delivery from
  remote inactive tmux sessions.
- Zero runtime dependencies. Node provides everything required
  (`node:child_process`, `node:fs`, `node:os`, `node:path`).

## Development

```sh
pnpm install
pnpm run typecheck
pnpm test
pnpm run build
```

The build emits the ESM entrypoint and TypeScript declarations in `dist/`.
Tests use Bun's test runner with dependency-injected tmux and filesystem
stubs so no real tmux is required.