<p align="center">
  <img src="https://img.shields.io/npm/v/free-coding-models?color=76b900&label=npm&logo=npm" alt="npm version">
  <img src="https://img.shields.io/node/v/free-coding-models?color=76b900&logo=node.js" alt="node version">
  <img src="https://img.shields.io/npm/l/free-coding-models?color=76b900" alt="license">
  <img src="https://img.shields.io/badge/nvidia%20nim%20models-44-76b900?logo=nvidia" alt="models count">
</p>

<h1 align="center">free-coding-models</h1>

<p align="center">
  <strong>Want to contribute or discuss the project?</strong> Join our <a href="https://discord.gg/U4vz7mYQ">Discord community</a>!
</p>

<p align="center">

```
1. Create a free API key on NVIDIA → https://build.nvidia.com
2. npm i -g free-coding-models
3. free-coding-models
```

</p>

<p align="center">
  <strong>Find the fastest coding LLM models in seconds</strong><br>
  <sub>Ping free NVIDIA NIM models in real-time — pick the best one for OpenCode, OpenClaw, or any AI coding assistant</sub>
</p>

<p align="center">
  <img src="demo.gif" alt="free-coding-models demo" width="100%">
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-requirements">Requirements</a> •
  <a href="#-installation">Installation</a> •
  <a href="#-usage">Usage</a> •
  <a href="#-models">Models</a> •
  <a href="#-opencode-integration">OpenCode</a> •
  <a href="#-openclaw-integration">OpenClaw</a> •
  <a href="#-how-it-works">How it works</a>
</p>

---

## ✨ Features

- **🎯 Coding-focused** — Only LLM models optimized for code generation, not chat or vision
- **🚀 Parallel pings** — All 44 models tested simultaneously via native `fetch`
- **📊 Real-time animation** — Watch latency appear live in alternate screen buffer
- **🏆 Smart ranking** — Top 3 fastest models highlighted with medals 🥇🥈🥉
- **⏱ Continuous monitoring** — Pings all models every 2 seconds forever, never stops
- **📈 Rolling averages** — Avg calculated from ALL successful pings since start
- **📊 Uptime tracking** — Percentage of successful pings shown in real-time
- **🔄 Auto-retry** — Timeout models keep getting retried, nothing is ever "given up on"
- **🎮 Interactive selection** — Navigate with arrow keys directly in the table, press Enter to act
- **🔀 Startup mode menu** — Choose between OpenCode and OpenClaw before the TUI launches
- **💻 OpenCode integration** — Auto-detects NIM setup, sets model as default, launches OpenCode
- **🦞 OpenClaw integration** — Sets selected model as default provider in `~/.openclaw/openclaw.json`
- **🎨 Clean output** — Zero scrollback pollution, interface stays open until Ctrl+C
- **📶 Status indicators** — UP ✅ · Timeout ⏳ · Overloaded 🔥 · Not Found 🚫
- **🔧 Multi-source support** — Extensible architecture via `sources.js` (add new providers easily)
- **🏷 Tier filtering** — Filter models by tier letter (S, A, B, C) with `--tier` flag or dynamically with E/D keys

---

## 📋 Requirements

Before using `free-coding-models`, make sure you have:

1. **Node.js 18+** — Required for native `fetch` API
2. **NVIDIA NIM account** — Free tier available at [build.nvidia.com](https://build.nvidia.com)
3. **API key** — Generate one from Profile → API Keys → Generate API Key
4. **OpenCode** *(optional)* — [Install OpenCode](https://github.com/opencode-ai/opencode) to use the OpenCode integration
5. **OpenClaw** *(optional)* — [Install OpenClaw](https://openclaw.ai) to use the OpenClaw integration

> 💡 **Tip:** Without OpenCode/OpenClaw installed, you can still benchmark models and get latency data.

---

## 📦 Installation

```bash
# npm (global install — recommended)
npm install -g free-coding-models

# pnpm
pnpm add -g free-coding-models

# bun
bun add -g free-coding-models

# Or use directly with npx/pnpx/bunx
npx free-coding-models YOUR_API_KEY
pnpx free-coding-models YOUR_API_KEY
bunx free-coding-models YOUR_API_KEY
```

---

## 🚀 Usage

```bash
# Just run it — shows a startup menu to pick OpenCode or OpenClaw, prompts for API key if not set
free-coding-models

# Explicitly target OpenCode CLI (TUI + Enter launches OpenCode CLI)
free-coding-models --opencode

# Explicitly target OpenCode Desktop (TUI + Enter sets model & opens Desktop app)
free-coding-models --opencode-desktop

# Explicitly target OpenClaw (TUI + Enter sets model as default in OpenClaw)
free-coding-models --openclaw

# Show only top-tier models (A+, S, S+)
free-coding-models --best

# Analyze for 10 seconds and output the most reliable model
free-coding-models --fiable

# Filter models by tier letter
free-coding-models --tier S          # S+ and S only
free-coding-models --tier A          # A+, A, A- only
free-coding-models --tier B          # B+, B only
free-coding-models --tier C          # C only

# Combine flags freely
free-coding-models --openclaw --tier S
free-coding-models --opencode --best
```

### Startup mode menu

When you run `free-coding-models` without `--opencode` or `--openclaw`, you get an interactive startup menu:

```
  ⚡ Free Coding Models — Choose your tool

  ❯ 💻 OpenCode CLI
       Press Enter on a model → launch OpenCode CLI with it as default

    🖥 OpenCode Desktop
       Press Enter on a model → set model & open OpenCode Desktop app

    🦞 OpenClaw
       Press Enter on a model → set it as default in OpenClaw config

  ↑↓ Navigate  •  Enter Select  •  Ctrl+C Exit
```

Use `↑↓` arrows to select, `Enter` to confirm. Then the TUI launches with your chosen mode shown in the header badge.

**How it works:**
1. **Ping phase** — All 44 models are pinged in parallel
2. **Continuous monitoring** — Models are re-pinged every 2 seconds forever
3. **Real-time updates** — Watch "Latest", "Avg", and "Up%" columns update live
4. **Select anytime** — Use ↑↓ arrows to navigate, press Enter on a model to act
5. **Smart detection** — Automatically detects if NVIDIA NIM is configured in OpenCode or OpenClaw

Setup wizard:

```
  🔑 Setup your NVIDIA API key
  📝 Get a free key at: https://build.nvidia.com
  💾 Key will be saved to ~/.free-coding-models

  Enter your API key: nvapi-xxxx-xxxx

  ✅ API key saved to ~/.free-coding-models
```

### Other ways to provide the key

```bash
# Pass directly
free-coding-models nvapi-xxxx-your-key-here

# Use environment variable
NVIDIA_API_KEY=nvapi-xxx free-coding-models

# Or add to your shell profile
export NVIDIA_API_KEY=nvapi-xxxx-your-key-here
free-coding-models
```

### Get your free API key

1. **Create NVIDIA Account** — Sign up at [build.nvidia.com](https://build.nvidia.com) with your email
2. **Verify** — Confirm email, set privacy options, create NGC account, verify phone
3. **Generate Key** — Go to Profile → API Keys → Generate API Key
4. **Name it** — e.g., "free-coding-models" or "OpenCode-NIM"
5. **Set expiration** — Choose "Never" for convenience
6. **Copy securely** — Key is shown only once!

> 💡 **Free credits** — NVIDIA offers free credits for NIM models via their API Catalog for developers.

---

## 🤖 Coding Models

**44 coding models** across 8 tiers, ranked by [Aider Polyglot benchmark](https://aider.chat/docs/leaderboards) (225 coding exercises across C++/Go/Java/JS/Python/Rust). Models without a confirmed Aider score are estimated from model family, size, and published release benchmarks.

| Tier | Score | Count | Models |
|------|-------|-------|--------|
| **S+** | 75%+ | 7 | DeepSeek V3.1/Terminus, DeepSeek V3.2, Kimi K2.5, Devstral 2, Nemotron Ultra 253B, Mistral Large 675B |
| **S**  | 62–74% | 7 | Qwen2.5 Coder 32B, GLM 5, Qwen3.5 400B VLM, Qwen3 Coder 480B, Qwen3 80B Thinking, Llama 3.1 405B, MiniMax M2.1 |
| **A+** | 54–62% | 6 | Kimi K2 Thinking/Instruct, Qwen3 235B, Llama 3.3 70B, GLM 4.7, Qwen3 80B Instruct |
| **A**  | 44–54% | 5 | MiniMax M2, Mistral Medium 3, Magistral Small, Nemotron Nano 30B, R1 Distill 32B |
| **A-** | 36–44% | 5 | GPT OSS 120B, Nemotron Super 49B, Llama 4 Scout, R1 Distill 14B, Colosseum 355B |
| **B+** | 25–36% | 5 | QwQ 32B, GPT OSS 20B, Stockmark 100B, Seed OSS 36B, Step 3.5 Flash |
| **B**  | 14–25% | 5 | Llama 4 Maverick, Mixtral 8x22B, Ministral 14B, Granite 34B Code, R1 Distill 8B |
| **C**  | <14%  | 4 | R1 Distill 7B, Gemma 2 9B, Phi 3.5 Mini, Phi 4 Mini |

### Tier scale

- **S+/S** — Frontier coders, top Aider polyglot scores, best for complex refactors
- **A+/A** — Excellent alternatives, strong at most coding tasks
- **A-/B+** — Solid performers, good for targeted programming tasks
- **B/C** — Lightweight or older models, good for code completion on constrained infra

### Filtering by tier

Use `--tier` to focus on a specific capability band:

```bash
free-coding-models --tier S     # Only S+ and S (frontier models)
free-coding-models --tier A     # Only A+, A, A- (solid performers)
free-coding-models --tier B     # Only B+, B (lightweight options)
free-coding-models --tier C     # Only C (edge/minimal models)
```

#### Dynamic tier filtering with E/D keys

During runtime, use **E** and **D** keys to dynamically adjust the tier filter:

- **E** (Elevate) — Show fewer, higher-tier models (cycle: All → S → A → B → C → All)
- **D** (Descend) — Show more, lower-tier models (cycle: All → C → B → A → S → All)

Current tier filter is shown in the header badge (e.g., `[Tier S]`)

---

## 🔌 OpenCode Integration

**The easiest way** — let `free-coding-models` do everything:

1. **Run**: `free-coding-models --opencode` (or choose OpenCode from the startup menu)
2. **Wait** for models to be pinged (green ✅ status)
3. **Navigate** with ↑↓ arrows to your preferred model
4. **Press Enter** — tool automatically:
   - Detects if NVIDIA NIM is configured in OpenCode
   - Sets your selected model as default in `~/.config/opencode/opencode.json`
   - Launches OpenCode with the model ready to use

### Manual OpenCode Setup (Optional)

Create or edit `~/.config/opencode/opencode.json`:

```json
{
  "provider": {
    "nvidia": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "NVIDIA NIM",
      "options": {
        "baseURL": "https://integrate.api.nvidia.com/v1",
        "apiKey": "{env:NVIDIA_API_KEY}"
      }
    }
  },
  "model": "nvidia/deepseek-ai/deepseek-v3.2"
}
```

Then set the environment variable:

```bash
export NVIDIA_API_KEY=nvapi-xxxx-your-key-here
# Add to ~/.bashrc or ~/.zshrc for persistence
```

Run `/models` in OpenCode and select **NVIDIA NIM** provider and your chosen model.

> ⚠️ **Note:** Free models have usage limits based on NVIDIA's tier — check [build.nvidia.com](https://build.nvidia.com) for quotas.

### Automatic Installation Fallback

If NVIDIA NIM is not yet configured in OpenCode, the tool:
- Shows installation instructions in your terminal
- Creates a `prompt` file in `$HOME/prompt` with the exact configuration
- Launches OpenCode, which will detect and display the prompt automatically

---

## 🦞 OpenClaw Integration

OpenClaw is an autonomous AI agent daemon. `free-coding-models` can configure it to use NVIDIA NIM models as its default provider — no download or local setup needed, everything runs via the NIM remote API.

### Quick Start

```bash
free-coding-models --openclaw
```

Or run without flags and choose **OpenClaw** from the startup menu.

1. **Wait** for models to be pinged
2. **Navigate** with ↑↓ arrows to your preferred model
3. **Press Enter** — tool automatically:
   - Reads `~/.openclaw/openclaw.json`
   - Adds the `nvidia` provider block (NIM base URL + your API key) if missing
   - Sets `agents.defaults.model.primary` to `nvidia/<model-id>`
   - Saves config and prints next steps

### What gets written to OpenClaw config

```json
{
  "models": {
    "providers": {
      "nvidia": {
        "baseUrl": "https://integrate.api.nvidia.com/v1",
        "api": "openai-completions"
      }
    }
  },
  "env": {
    "NVIDIA_API_KEY": "nvapi-xxxx-your-key"
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "nvidia/deepseek-ai/deepseek-v3.2"
      },
      "models": {
        "nvidia/deepseek-ai/deepseek-v3.2": {}
      }
    }
  }
}
```

> ⚠️ **Note:** `providers` must be nested under `models.providers` — not at the config root. A root-level `providers` key is ignored by OpenClaw.

> ⚠️ **Note:** The model must also be listed in `agents.defaults.models` (the allowlist). Without this entry, OpenClaw rejects the model with *"not allowed"* even if it is set as primary.

### After updating OpenClaw config

OpenClaw's gateway **auto-reloads** config file changes (depending on `gateway.reload.mode`). To apply manually:

```bash
# Apply via CLI
openclaw models set nvidia/deepseek-ai/deepseek-v3.2

# Or re-run the interactive setup wizard
openclaw configure
```

> ⚠️ **Note:** `openclaw restart` does **not** exist as a CLI command. Kill and relaunch the process manually if you need a full restart.

> 💡 **Why use remote NIM models with OpenClaw?** NVIDIA NIM serves models via a fast API — no local GPU required, no VRAM limits, free credits for developers. You get frontier-class coding models (DeepSeek V3, Kimi K2, Qwen3 Coder) without downloading anything.

### Patching OpenClaw for full NVIDIA model support

**Problem:** By default, OpenClaw only allows a few specific NVIDIA models in its allowlist. If you try to use a model that's not in the list, you'll get this error:

```
Model "nvidia/mistralai/devstral-2-123b-instruct-2512" is not allowed. Use /models to list providers, or /models <provider> to list models.
```

**Solution:** Patch OpenClaw's configuration to add ALL 47 NVIDIA models from `free-coding-models` to the allowlist:

```bash
# From the free-coding-models package directory
node patch-openclaw.js
```

This script:
- Backs up `~/.openclaw/agents/main/agent/models.json` and `~/.openclaw/openclaw.json`
- Adds all 47 NVIDIA models with proper context window and token limits
- Preserves existing models and configuration
- Prints a summary of what was added

**After patching:**

1. Restart OpenClaw gateway:
   ```bash
   systemctl --user restart openclaw-gateway
   ```

2. Verify models are available:
   ```bash
   free-coding-models --openclaw
   ```

3. Select any model — no more "not allowed" errors!

**Why this is needed:** OpenClaw uses a strict allowlist system to prevent typos and invalid models. The `patch-openclaw.js` script populates the allowlist with all known working NVIDIA models, so you can freely switch between them without manually editing config files.

---

## ⚙️ How it works

```
┌─────────────────────────────────────────────────────────────┐
│  1. Enter alternate screen buffer (like vim/htop/less)      │
│  2. Ping ALL models in parallel                             │
│  3. Display real-time table with Latest/Avg/Up% columns     │
│  4. Re-ping ALL models every 2 seconds (forever)           │
│  5. Update rolling averages from ALL successful pings      │
│  6. User can navigate with ↑↓ and select with Enter       │
│  7. On Enter (OpenCode): set model, launch OpenCode        │
│  8. On Enter (OpenClaw): update ~/.openclaw/openclaw.json  │
└─────────────────────────────────────────────────────────────┘
```

**Result:** Continuous monitoring interface that stays open until you select a model or press Ctrl+C. Rolling averages give you accurate long-term latency data, uptime percentage tracks reliability, and you can configure your tool of choice with your chosen model in one keystroke.

---

## 📋 API Reference

| Parameter | Description |
|-----------|-------------|
| `NVIDIA_API_KEY` | Environment variable for API key |
| `<api-key>` | First positional argument |

**Configuration:**
- **Ping timeout**: 15 seconds per attempt (slow models get more time)
- **Ping interval**: 2 seconds between complete re-pings of all models (adjustable with W/X keys)
- **Monitor mode**: Interface stays open forever, press Ctrl+C to exit

**Flags:**

| Flag | Description |
|------|-------------|
| *(none)* | Show startup menu to choose OpenCode or OpenClaw |
| `--opencode` | OpenCode CLI mode — Enter launches OpenCode CLI with selected model |
| `--opencode-desktop` | OpenCode Desktop mode — Enter sets model & opens OpenCode Desktop app |
| `--openclaw` | OpenClaw mode — Enter sets selected model as default in OpenClaw |
| `--best` | Show only top-tier models (A+, S, S+) |
| `--fiable` | Analyze 10 seconds, output the most reliable model as `provider/model_id` |
| `--tier S` | Show only S+ and S tier models |
| `--tier A` | Show only A+, A, A- tier models |
| `--tier B` | Show only B+, B tier models |
| `--tier C` | Show only C tier models |

**Keyboard shortcuts:**
- **↑↓** — Navigate models
- **Enter** — Select model (launches OpenCode or sets OpenClaw default, depending on mode)
- **R/T/O/M/P/A/S/V/U** — Sort by Rank/Tier/Origin/Model/Ping/Avg/Status/Verdict/Uptime
- **W** — Decrease ping interval (faster pings)
- **X** — Increase ping interval (slower pings)
- **E** — Elevate tier filter (show fewer, higher-tier models)
- **D** — Descend tier filter (show more, lower-tier models)
- **Ctrl+C** — Exit

---

## 🔧 Development

```bash
git clone https://github.com/vava-nessa/free-coding-models
cd free-coding-models
npm install
npm start -- YOUR_API_KEY
```

### Releasing a new version

1. Make your changes and commit them with a descriptive message
2. Update `CHANGELOG.md` with the new version entry
3. Bump `"version"` in `package.json` (e.g. `0.1.3` → `0.1.4`)
4. Commit with **just the version number** as the message:

```bash
git add .
git commit -m "0.1.4"
git push
```

The GitHub Actions workflow automatically publishes to npm on every push to `main`.

---

## 📄 License

MIT © [vava](https://github.com/vava-nessa)

---

<p align="center">
  <sub>Built with ☕ and 🌹 by <a href="https://github.com/vava-nessa">vava</a></sub>
</p>

## 📬 Contribute
We welcome contributions! Feel free to open issues, submit pull requests, or get involved in the project.

**Q:** Can I use this with other providers?
**A:** Yes, the tool is designed to be extensible; see the source for examples of customizing endpoints.

**Q:** How accurate are the latency numbers?
**A:** They represent average round-trip times measured during testing; actual performance may vary based on network conditions.

**Q:** Do I need to download models locally for OpenClaw?
**A:** No — `free-coding-models` configures OpenClaw to use NVIDIA NIM's remote API, so models run on NVIDIA's infrastructure. No GPU or local setup required.

## 📧 Support
For questions or issues, open a GitHub issue or join our community Discord: https://discord.gg/QnR8xq9p
