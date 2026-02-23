<p align="center">
  <img src="https://img.shields.io/npm/v/free-coding-models?color=76b900&label=npm&logo=npm" alt="npm version">
  <img src="https://img.shields.io/node/v/free-coding-models?color=76b900&logo=node.js" alt="node version">
  <img src="https://img.shields.io/npm/l/free-coding-models?color=76b900" alt="license">
  <img src="https://img.shields.io/badge/models-101-76b900?logo=nvidia" alt="models count">
  <img src="https://img.shields.io/badge/providers-9-blue" alt="providers count">
</p>

<h1 align="center">free-coding-models</h1>

<p align="center">
  💬 <a href="https://discord.gg/5MbTnDC3Md">Let's talk about the project on Discord</a>
</p>

<p align="center">

```
1. Create a free API key (NVIDIA, Groq, or Cerebras)
2. npm i -g free-coding-models
3. free-coding-models
```

</p>

<p align="center">
  <strong>Find the fastest coding LLM models in seconds</strong><br>
  <sub>Ping free models from NVIDIA NIM, Groq, Cerebras, and SambaNova in real-time — pick the best one for OpenCode, OpenClaw, or any AI coding assistant</sub>
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
- **🌐 Multi-provider** — 101 models from NVIDIA NIM, Groq, Cerebras, SambaNova, OpenRouter, Codestral, Hyperbolic, Scaleway, and Google AI — all free to use
- **⚙️ Settings screen** — Press `P` to manage provider API keys, enable/disable providers, and test keys live
- **🚀 Parallel pings** — All models tested simultaneously via native `fetch`
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
- **📶 Status indicators** — UP ✅ · No Key 🔑 · Timeout ⏳ · Overloaded 🔥 · Not Found 🚫
- **🔍 Keyless latency** — Models are pinged even without an API key — a `🔑 NO KEY` status confirms the server is reachable with real latency shown, so you can compare providers before committing to a key
- **🏷 Tier filtering** — Filter models by tier letter (S, A, B, C) with `--tier` flag or dynamically with `T` key

---

## 📋 Requirements

Before using `free-coding-models`, make sure you have:

1. **Node.js 18+** — Required for native `fetch` API
2. **At least one free API key** — pick any or all of:
   - **NVIDIA NIM** — [build.nvidia.com](https://build.nvidia.com) → Profile → API Keys → Generate
   - **Groq** — [console.groq.com/keys](https://console.groq.com/keys) → Create API Key
   - **Cerebras** — [cloud.cerebras.ai](https://cloud.cerebras.ai) → API Keys → Create
   - **SambaNova** — [cloud.sambanova.ai/apis](https://cloud.sambanova.ai/apis) → API Keys → Create ($5 free trial, 3 months)
   - **OpenRouter** — [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys) → Create key (50 free req/day)
   - **Mistral Codestral** — [codestral.mistral.ai](https://codestral.mistral.ai) → API Keys (30 req/min, 2000/day — phone required)
   - **Hyperbolic** — [app.hyperbolic.ai/settings](https://app.hyperbolic.ai/settings) → API Keys ($1 free trial)
   - **Scaleway** — [console.scaleway.com/iam/api-keys](https://console.scaleway.com/iam/api-keys) → IAM → API Keys (1M free tokens)
   - **Google AI Studio** — [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → Get API key (free Gemma models, 14.4K req/day)
3. **OpenCode** *(optional)* — [Install OpenCode](https://github.com/opencode-ai/opencode) to use the OpenCode integration
4. **OpenClaw** *(optional)* — [Install OpenClaw](https://openclaw.ai) to use the OpenClaw integration

> 💡 **Tip:** You don't need all four providers. One key is enough to get started. Add more later via the Settings screen (`P` key). Models without a key still show real latency (`🔑 NO KEY`) so you can evaluate providers before signing up.

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
1. **Ping phase** — All enabled models are pinged in parallel (up to 101 across 9 providers)
2. **Continuous monitoring** — Models are re-pinged every 2 seconds forever
3. **Real-time updates** — Watch "Latest", "Avg", and "Up%" columns update live
4. **Select anytime** — Use ↑↓ arrows to navigate, press Enter on a model to act
5. **Smart detection** — Automatically detects if NVIDIA NIM is configured in OpenCode or OpenClaw

Setup wizard (first run — walks through all 9 providers):

```
  🔑 First-time setup — API keys
  Enter keys for any provider you want to use. Press Enter to skip one.

  ● NVIDIA NIM
    Free key at: https://build.nvidia.com
    Profile → API Keys → Generate
  Enter key (or Enter to skip): nvapi-xxxx

  ● Groq
    Free key at: https://console.groq.com/keys
    API Keys → Create API Key
  Enter key (or Enter to skip): gsk_xxxx

  ● Cerebras
    Free key at: https://cloud.cerebras.ai
    API Keys → Create
  Enter key (or Enter to skip):

  ● SambaNova
    Free key at: https://cloud.sambanova.ai/apis
    API Keys → Create ($5 free trial, 3 months)
  Enter key (or Enter to skip):

  ✅ 2 key(s) saved to ~/.free-coding-models.json
  You can add or change keys anytime with the P key in the TUI.
```

You don't need all four — skip any provider by pressing Enter. At least one key is required.

### Adding or changing keys later

Press **`P`** to open the Settings screen at any time:

```
  ⚙  Settings

  Providers

  ❯ [ ✅ ] NIM         nvapi-••••••••••••3f9a  [Test ✅]
    [ ✅ ] Groq        (no key set)            [Test —]
    [ ✅ ] Cerebras    (no key set)            [Test —]

  ↑↓ Navigate  •  Enter Edit key  •  Space Toggle enabled  •  T Test key  •  Esc Close
```

- **↑↓** — navigate providers
- **Enter** — enter inline key edit mode (type your key, Enter to save, Esc to cancel)
- **Space** — toggle provider enabled/disabled
- **T** — fire a real test ping to verify the key works (shows ✅/❌)
- **Esc** — close settings and reload models list

Keys are saved to `~/.free-coding-models.json` (permissions `0600`).

### Environment variable overrides

Env vars always take priority over the config file:

```bash
NVIDIA_API_KEY=nvapi-xxx free-coding-models
GROQ_API_KEY=gsk_xxx free-coding-models
CEREBRAS_API_KEY=csk_xxx free-coding-models
```

### Get your free API keys

**NVIDIA NIM** (44 models, S+ → C tier):
1. Sign up at [build.nvidia.com](https://build.nvidia.com)
2. Go to Profile → API Keys → Generate API Key
3. Name it (e.g. "free-coding-models"), set expiry to "Never"
4. Copy — shown only once!

**Groq** (6 models, fast inference):
1. Sign up at [console.groq.com](https://console.groq.com)
2. Go to API Keys → Create API Key

**Cerebras** (3 models, ultra-fast silicon):
1. Sign up at [cloud.cerebras.ai](https://cloud.cerebras.ai)
2. Go to API Keys → Create

> 💡 **Free credits** — All three providers offer free tiers for developers.

---

## 🤖 Coding Models

**101 coding models** across 9 providers and 8 tiers, ranked by [SWE-bench Verified](https://www.swebench.com) — the industry-standard benchmark measuring real GitHub issue resolution. Scores are self-reported by providers unless noted.

### NVIDIA NIM (44 models)

| Tier | SWE-bench | Models |
|------|-----------|--------|
| **S+** ≥70% | GLM 5 (77.8%), Kimi K2.5 (76.8%), Step 3.5 Flash (74.4%), MiniMax M2.1 (74.0%), GLM 4.7 (73.8%), DeepSeek V3.2 (73.1%), Devstral 2 (72.2%), Kimi K2 Thinking (71.3%), Qwen3 Coder 480B (70.6%), Qwen3 235B (70.0%) |
| **S** 60–70% | MiniMax M2 (69.4%), DeepSeek V3.1 Terminus (68.4%), Qwen3 80B Thinking (68.0%), Qwen3.5 400B (68.0%), Kimi K2 Instruct (65.8%), Qwen3 80B Instruct (65.0%), DeepSeek V3.1 (62.0%), Llama 4 Maverick (62.0%), GPT OSS 120B (60.0%) |
| **A+** 50–60% | Mistral Large 675B (58.0%), Nemotron Ultra 253B (56.0%), Colosseum 355B (52.0%), QwQ 32B (50.0%) |
| **A** 40–50% | Nemotron Super 49B (49.0%), Mistral Medium 3 (48.0%), Qwen2.5 Coder 32B (46.0%), Magistral Small (45.0%), Llama 4 Scout (44.0%), Llama 3.1 405B (44.0%), Nemotron Nano 30B (43.0%), R1 Distill 32B (43.9%), GPT OSS 20B (42.0%) |
| **A-** 35–40% | Llama 3.3 70B (39.5%), Seed OSS 36B (38.0%), R1 Distill 14B (37.7%), Stockmark 100B (36.0%) |
| **B+** 30–35% | Ministral 14B (34.0%), Mixtral 8x22B (32.0%), Granite 34B Code (30.0%) |
| **B** 20–30% | R1 Distill 8B (28.2%), R1 Distill 7B (22.6%) |
| **C** <20% | Gemma 2 9B (18.0%), Phi 4 Mini (14.0%), Phi 3.5 Mini (12.0%) |

### Groq (6 models)

| Tier | SWE-bench | Model |
|------|-----------|-------|
| **S** 60–70% | Kimi K2 Instruct (65.8%), Llama 4 Maverick (62.0%) |
| **A+** 50–60% | QwQ 32B (50.0%) |
| **A** 40–50% | Llama 4 Scout (44.0%), R1 Distill 70B (43.9%) |
| **A-** 35–40% | Llama 3.3 70B (39.5%) |

### Cerebras (3 models)

| Tier | SWE-bench | Model |
|------|-----------|-------|
| **A+** 50–60% | Qwen3 32B (50.0%) |
| **A** 40–50% | Llama 4 Scout (44.0%) |
| **A-** 35–40% | Llama 3.3 70B (39.5%) |

### Tier scale

- **S+/S** — Elite frontier coders (≥60% SWE-bench), best for complex real-world tasks and refactors
- **A+/A** — Great alternatives, strong at most coding tasks
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

**Environment variables (override config file):**

| Variable | Provider |
|----------|----------|
| `NVIDIA_API_KEY` | NVIDIA NIM |
| `GROQ_API_KEY` | Groq |
| `CEREBRAS_API_KEY` | Cerebras |

**Config file:** `~/.free-coding-models.json` (created automatically, permissions `0600`)

```json
{
  "apiKeys": {
    "nvidia":   "nvapi-xxx",
    "groq":     "gsk_xxx",
    "cerebras": "csk_xxx"
  },
  "providers": {
    "nvidia":   { "enabled": true },
    "groq":     { "enabled": true },
    "cerebras": { "enabled": true }
  }
}
```

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

**Keyboard shortcuts (main TUI):**
- **↑↓** — Navigate models
- **Enter** — Select model (launches OpenCode or sets OpenClaw default, depending on mode)
- **R/Y/O/M/L/A/S/N/H/V/U** — Sort by Rank/Tier/Origin/Model/LatestPing/Avg/SWE/Ctx/Health/Verdict/Uptime
- **T** — Cycle tier filter (All → S+ → S → A+ → A → A- → B+ → B → C → All)
- **Z** — Cycle mode (OpenCode CLI → OpenCode Desktop → OpenClaw)
- **P** — Open Settings (manage API keys, enable/disable providers)
- **W** — Decrease ping interval (faster pings)
- **X** — Increase ping interval (slower pings)
- **Ctrl+C** — Exit

**Keyboard shortcuts (Settings screen — `P` key):**
- **↑↓** — Navigate providers
- **Enter** — Edit API key inline (type key, Enter to save, Esc to cancel)
- **Space** — Toggle provider enabled/disabled
- **T** — Test current provider's API key (fires a live ping)
- **Esc** — Close settings and return to main TUI

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

For questions or issues, open a [GitHub issue](https://github.com/vava-nessa/free-coding-models/issues).

💬 Let's talk about the project on Discord: https://discord.gg/5MbTnDC3Md

> ⚠️ **free-coding-models is a BETA TUI** — it might crash or have problems. Use at your own risk and feel free to report issues!
