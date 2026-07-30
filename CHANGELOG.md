# Changelog

## 1.0.0

- Renamed package to `opencode-tmux-notify` and repositioned as reliable
  desktop notifications for OpenCode running over SSH in inactive tmux
  sessions.
- Replaced pane `/dev/tty` and tmux passthrough delivery with direct OSC 777
  writes to every attached tmux client TTY, so notifications reach Ghostty
  even when the originating session is inactive, hidden, or detached.
- Removed `allow-passthrough` requirement.
- Added event titles: `OpenCode: Approval required`, `OpenCode: Answer
  required`, `OpenCode: Task complete`, and `OpenCode: Session error`.
- Notification body contains only short hostname, project basename, and tmux
  session/window/pane/window name. Event payload contents are never included.
- Added top-level session filtering, child-session filtering by default,
  duplicate idle suppression within a short window, and optional config file
  at `~/.config/opencode/opencode-tmux-notify.json`.
- Added optional Prefix+Shift+O tmux binding via the `@opencode_notify_last_pane`
  global option.
- Zero runtime dependencies; Node-only (`node:child_process`, `node:fs`,
  `node:os`, `node:path`).
- Added TypeScript source, Bun tests, build, and package metadata.
