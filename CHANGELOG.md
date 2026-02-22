# Changelog

---

## 0.1.9 — 2026-02-22

### Fixed
- **OpenCode spawn ENOENT**: Use `shell: true` when spawning `opencode` so the command resolves correctly on Windows (`.cmd`/`.bat` wrappers). Added friendly error message when `opencode` is not installed.
### Added
- Update available warning: red message shown above selection menu when a new npm version exists
- "Update now" menu choice in startup mode selection to install the latest version

---

## 0.1.4 — 2026-02-22

### Fixed
- **OpenClaw config structure**: `providers` was incorrectly written at the config root. Moved to `models.providers` per official OpenClaw docs (`docs.openclaw.ai/providers/nvidia`).
- **OpenClaw API key storage**: Removed `apiKey` from provider block (not a recognized field). API key is now stored under `env.NVIDIA_API_KEY` in the config.
- **OpenClaw models array**: Removed the `models: []` array from the provider block (OpenCode format, not valid in OpenClaw).
- **`openclaw restart` CLI command doesn't exist**: Replaced hint with correct commands — `openclaw models set` / `openclaw configure`. Gateway auto-reloads on config file changes.
- **OpenClaw model not allowed**: Model must be explicitly listed in `agents.defaults.models` allowlist — without this, OpenClaw rejects the model with "not allowed" even when set as primary.
- **README**: Updated OpenClaw integration section with correct JSON structure and correct CLI commands.

---

## 0.1.3 — 2026-02-22

### Added
- OpenClaw integration: set selected NIM model as default provider in `~/.openclaw/openclaw.json`
- Startup mode menu (no flags needed): interactive choice between OpenCode and OpenClaw at launch
- `--openclaw` flag: skip menu, go straight to OpenClaw mode
- `--tier` flag: filter models by tier letter (S, A, B, C)
- Tier badges shown next to model names in the TUI
- 44 models listed, ranked by Aider Polyglot benchmark

### Fixed
- CI permissions for git push in release workflow

---

## 0.1.2 — 2026-02-22

### Added
- `--fiable` flag: analyze 10 seconds, output the single most reliable model as `provider/model_id`
- `--best` flag: show only top-tier models (A+, S, S+)
- `--opencode` flag: explicit OpenCode mode
- Refactored CLI entry point, cleaner flag handling
- Updated release workflow

---

## 0.1.1 — 2026-02-21

### Added
- Continuous monitoring mode: re-pings all models every 2 seconds forever
- Rolling averages calculated from all successful pings since start
- Uptime percentage tracking per model
- Dynamic ping interval: W key to speed up, X key to slow down
- Sortable columns: R/T/O/M/P/A/S/V/U keys
- Verdict column with quality rating per model
- Interactive model selection with arrow keys + Enter
- OpenCode integration: auto-detects NIM setup, sets model as default, launches OpenCode
- `sources.js`: extensible architecture for adding new providers
- Demo GIF added to README
- Renamed CLI to `free-coding-models`

---

## 0.1.0 — 2026-02-21

### Added
- Initial release as `nimping` then renamed to `free-coding-models`
- Parallel pings of NVIDIA NIM coding models via native `fetch`
- Real-time terminal table with latency display
- Alternate screen buffer (no scrollback pollution)
- Top 3 fastest models highlighted with medals 🥇🥈🥉
- ASCII banner and clean UI
- OpenCode installer and interactive model selector
- npm publish workflow via GitHub Actions
