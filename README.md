# opencode-tmux-notify

Reliable desktop notifications for OpenCode running over SSH in tmux.

Notifications reach your laptop even when the OpenCode tmux session is
inactive, hidden, or detached. The plugin writes OSC 777 directly to every
attached tmux client TTY, so it works with any OSC 777-capable terminal
without any tmux passthrough setup.

## Supported terminals

OSC 777 desktop notifications are supported by:

- [Ghostty](https://ghostty.org) (default on)
- [WezTerm](https://wezfurlong.org/wezterm/)
- [foot](https://codeberg.org/dnkl/foot)
- [rxvt-unicode](https://rxvt-unicode.sourceforge.net/) (with the `notify` Perl extension)

Kitty and iTerm2 use their own notification protocols (OSC 99 and OSC 9
respectively) and are not supported. Alacritty has no desktop notification
support.

## Install

Build the plugin and copy it into OpenCode's global plugin directory:

```sh
git clone https://github.com/christian-taillon/opencode-tmux-notify.git
cd opencode-tmux-notify
pnpm install && pnpm run build
mkdir -p ~/.config/opencode/plugins
cp dist/index.js ~/.config/opencode/plugins/opencode-tmux-notify.js
```

Restart OpenCode. That's it. OpenCode auto-discovers any `*.js` file in
`~/.config/opencode/plugins/` at startup, so no `opencode.json` entry is
needed.

## How it works

```
OpenCode event -> find attached tmux clients -> write OSC 777 to each client TTY -> terminal notifies
```

The notification goes straight to the attached client, not the originating
pane, so the OpenCode session can be in the background.

## Notifications

| Event             | Notification                |
| ----------------- | --------------------------- |
| `permission.asked`| OpenCode: Approval required |
| `question.asked`  | OpenCode: Answer required    |
| `session.idle`    | OpenCode: Task complete      |
| `session.error`   | OpenCode: Session error      |

The body shows the host, project, and tmux session/window/pane. No prompt
contents, commands, or file contents are included.

## Optional configuration

Works out of the box. To customize, create
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
  "rememberLastTarget": true
}
```

## Optional tmux binding

Jump back to the pane that triggered the notification. Add to `.tmux.conf`:

```tmux
bind-key O run-shell '\
  target="$(tmux show-option -gqv @opencode_notify_last_pane)"; \
  if [ -n "$target" ]; then \
    tmux switch-client -t "$target"; \
  else \
    tmux display-message "No OpenCode notification target"; \
  fi'
```

Then Prefix + Shift+O switches to the originating session, window, and pane.

## Development

```sh
pnpm install
pnpm run typecheck
pnpm test
pnpm run build
```

Zero runtime dependencies. Requires at least one attached tmux client.