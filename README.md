# opencode-tmux-notify

Reliable desktop notifications for OpenCode in terminals and tmux, locally or
over SSH.

Notifications reach your desktop even when the OpenCode tmux session is
inactive or hidden. The plugin writes the selected notification protocol
directly to the terminal TTY, including each attached tmux client TTY, so no
tmux passthrough setup is required.

## Supported terminals

OSC 777 desktop notifications are supported by:

- [Ghostty](https://ghostty.org) (default on)
- [WezTerm](https://wezfurlong.org/wezterm/)
- [foot](https://codeberg.org/dnkl/foot)
- [rxvt-unicode](https://rxvt-unicode.sourceforge.net/) (with the `notify` Perl extension)

Kitty uses its own OSC 99 notification protocol and is supported automatically.
iTerm2 uses OSC 9 and is also supported automatically.

Kitty and iTerm2 use their own notification protocols (OSC 99 and OSC 9
respectively). Apple Terminal and Alacritty do not provide a portable
notification protocol supported by this plugin.

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
OpenCode event -> find attached tmux clients -> select one notification protocol per client -> write to the client TTY -> terminal notifies
```

The notification goes straight to the attached client, not the originating
pane, so the OpenCode session can be in the background.

`protocol: "auto"` is the default. It detects Kitty and iTerm2 from the
terminal environment or tmux client metadata, and uses OSC 777 otherwise.
Only one protocol is sent per client to avoid duplicate notifications in
terminals that support multiple protocols. You can explicitly set
`"osc777"`, `"osc99"`, or `"osc9"` if detection is unavailable over SSH.

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
  "protocol": "auto",
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

Zero runtime dependencies. A tmux-originated notification requires an attached
tmux client; a non-tmux OpenCode process writes directly to `/dev/tty`.
