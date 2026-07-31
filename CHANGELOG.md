# Changelog

## Unreleased

- Added automatic Kitty OSC 99 and iTerm2 OSC 9 notification support.
- Detects the terminal protocol separately for each attached tmux client while
  preserving OSC 777 as the default fallback.

## 1.0.0

- Desktop notifications for OpenCode over SSH in tmux via OSC 777.
- Writes directly to every attached tmux client TTY, so notifications
  reach Ghostty even when the originating session is inactive, hidden, or
  detached.
- Event titles: `OpenCode: Approval required`, `OpenCode: Answer required`,
  `OpenCode: Task complete`, and `OpenCode: Session error`.
- Notification body contains only short hostname, project basename, and tmux
  session/window/pane/window name. Event payload contents are never included.
- Top-level session filtering, child-session filtering by default, and
  duplicate idle suppression.
- Optional config file at `~/.config/opencode/opencode-tmux-notify.json`.
- Optional Prefix+Shift+O tmux binding via the `@opencode_notify_last_pane`
  global option.
- Zero runtime dependencies; Node-only (`node:child_process`, `node:fs`,
  `node:os`, `node:path`).
- TypeScript source, Bun tests, and ESM build.
