# OpenCode Terminal Visual Notify

Zero-dependency visual desktop notifications for OpenCode terminal workflows.

This plugin emits terminal notification escape sequences instead of calling OS-specific notification tools. That makes it useful when you run OpenCode over SSH or inside tmux and want the local terminal to show a visual notification.

## What it supports

- Ghostty/iTerm-style OSC 9 notifications
- kitty-style OSC 99 notifications
- tmux passthrough wrapping when `TMUX` is set
- OpenCode events:
  - `session.idle`
  - `session.error`
  - `permission.asked`
  - `question.asked`

## What it does not do

- It does not request or play notification sounds.
- It does not call `notify-send`, `osascript`, `paplay`, or any other local OS command.
- It does not solve `opencode attach` client notifications; plugins run where OpenCode runs.

## Install

Copy the plugin into your OpenCode plugin directory:

```sh
mkdir -p ~/.config/opencode/plugins
cp terminal-visual-notify.js ~/.config/opencode/plugins/
```

Restart OpenCode.

OpenCode automatically loads local plugin files from `~/.config/opencode/plugins/`.

## Configuration

There is no runtime configuration.

The plugin auto-detects common terminal names from `TERM`:

- `kitty` → OSC 99
- `ghostty` → OSC 9
- anything else → emits both OSC 9 and OSC 99

If you want different events or messages, edit the `events` and `messages` constants at the top of `terminal-visual-notify.js`.

## tmux

If you use tmux, enable passthrough in your tmux config:

```tmux
set -g allow-passthrough on
```

Reload tmux config or restart tmux.

## Notes

This plugin is intentionally visual-only. If your desktop environment shows the notification silently, that is controlled by your local terminal/desktop notification policy.
