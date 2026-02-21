<p align="center">
  <img src="https://img.shields.io/npm/v/free-coding-models?color=76b900&label=npm&logo=npm" alt="npm version">
  <img src="https://img.shields.io/node/v/free-coding-models?color=76b900&logo=node.js" alt="node version">
  <img src="https://img.shields.io/npm/l/free-coding-models?color=76b900" alt="license">
  <img src="https://img.shields.io/badge/models-44-76b900?logo=nvidia" alt="models count">
</p>

<h1 align="center">⚡ Free Coding Models</h1>

<p align="center">
  <strong>Find the fastest coding LLM models in seconds</strong><br>
  <sub>Ping free models from multiple providers — pick the best one for OpenCode, Cursor, or any AI coding assistant</sub>
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
  <a href="#-how-it-works">How it works</a>
</p>

---

## ✨ Features

- **🎯 Coding-focused** — Only LLM models optimized for code generation, not chat or vision
- **🚀 Parallel pings** — All 44 models tested simultaneously via native `fetch`
- **📊 Real-time animation** — Watch latency appear live in alternate screen buffer
- **🏆 Smart ranking** — Top 3 fastest models highlighted with medals 🥇🥈🥉
- **⏱ Continuous monitoring** — Pings all models every 10 seconds forever, never stops
- **📈 Rolling averages** — Avg calculated from ALL successful pings since start
- **🔄 Auto-retry** — Timeout models keep getting retried, nothing is ever "given up on"
- **🎮 Interactive selection** — Navigate with arrow keys directly in the table, press Enter to launch OpenCode
- **🔌 Auto-configuration** — Detects NVIDIA NIM setup, installs if missing, sets as default model
- **🎨 Clean output** — Zero scrollback pollution, interface stays open until Ctrl+C
- **📶 Status indicators** — UP ✅ · Timeout ⏱ · Down ❌
- **🔧 Multi-source support** — Extensible architecture via `sources.js` (add new providers easily)

---

## 📋 Requirements

Before using `free-coding-models`, make sure you have:

1. **Node.js 18+** — Required for native `fetch` API
2. **OpenCode installed** — [Install OpenCode](https://github.com/opencode-ai/opencode) (`npm install -g opencode`)
3. **NVIDIA NIM account** — Free tier available at [build.nvidia.com](https://build.nvidia.com)
4. **API key** — Generate one from Profile → API Keys → Generate API Key

> 💡 **Tip:** Without OpenCode installed, you can still use the tool to benchmark models. OpenCode is only needed for the auto-launch feature.

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
# Just run it — will prompt for API key if not set
free-ai-opencode
```

**How it works:**
1. **Ping phase** — All 44 models are pinged in parallel
2. **Continuous monitoring** — Models are re-pinged every 10 seconds forever
3. **Real-time updates** — Watch "Latest" and "Avg" columns update live
4. **Select anytime** — Use ↑↓ arrows to navigate, press Enter on a model to launch OpenCode
5. **Smart detection** — Automatically detects if NVIDIA NIM is configured in OpenCode:
   - ✅ If configured → Sets model as default and launches OpenCode
   - ⚠️ If missing → Shows installation instructions and launches OpenCode

Setup wizard:

```
  🔑 Setup your NVIDIA API key
  📝 Get a free key at: https://build.nvidia.com
  💾 Key will be saved to ~/.free-ai-opencode

  Enter your API key: nvapi-xxxx-xxxx

  ✅ API key saved to ~/.free-ai-opencode
```

### Other ways to provide the key

```bash
# Pass directly
free-ai-opencode nvapi-xxxx-your-key-here

# Use environment variable
NVIDIA_API_KEY=nvapi-xxx free-ai-opencode

# Or add to your shell profile
export NVIDIA_API_KEY=nvapi-xxxx-your-key-here
free-ai-opencode
```

### Get your free API key

1. **Create NVIDIA Account** — Sign up at [build.nvidia.com](https://build.nvidia.com) with your email
2. **Verify** — Confirm email, set privacy options, create NGC account, verify phone
3. **Generate Key** — Go to Profile → API Keys → Generate API Key
4. **Name it** — e.g., "free-ai-opencode" or "OpenCode-NIM"
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

---

## 🔌 Use with OpenCode

**The easiest way** — let `free-ai-opencode` do everything:

1. **Run**: `free-ai-opencode`
2. **Wait** for models to be pinged (green ✅ status)
3. **Navigate** with ↑↓ arrows to your preferred model
4. **Press Enter** — tool automatically:
   - Detects if NVIDIA NIM is configured in OpenCode
   - Sets your selected model as default in `~/.config/opencode/opencode.json`
   - Launches OpenCode with the model ready to use

That's it! No manual config needed.

### Manual Setup (Optional)

If you prefer to configure OpenCode yourself:

#### Prerequisites

1. **OpenCode installed**: `npm install -g opencode` (or equivalent)
2. **NVIDIA NIM account**: Get a free account at [build.nvidia.com](https://build.nvidia.com)
3. **API key generated**: Go to Profile → API Keys → Generate API Key

#### 1. Find your model

Run `free-ai-opencode` to see which models are available and fast. The "Latest" column shows real-time latency, "Avg" shows rolling average.

#### 2. Configure OpenCode

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

#### 3. Set environment variable

```bash
export NVIDIA_API_KEY=nvapi-xxxx-your-key-here
# Add to ~/.bashrc or ~/.zshrc for persistence
```

#### 4. Use it

Run `/models` in OpenCode and select **NVIDIA NIM** provider and your chosen model.

> ⚠️ **Note:** Free models have usage limits based on NVIDIA's tier — check [build.nvidia.com](https://build.nvidia.com) for quotas.

### Automatic Installation

The tool includes a **smart fallback mechanism**:

1. **Primary**: Try to launch OpenCode with the selected model
2. **Fallback**: If NVIDIA NIM is not detected in `~/.config/opencode/opencode.json`, the tool:
   - Shows installation instructions in your terminal
   - Creates a `prompt` file in `$HOME/prompt` with the exact configuration to add
   - Launches OpenCode, which will detect and display the prompt automatically

This **"prompt" fallback** ensures that even if NVIDIA NIM isn't pre-configured, OpenCode will guide you through installation with the ready-to-use configuration already prepared.

#### Example prompt file created at `$HOME/prompt`:

```json
Please install NVIDIA NIM provider in OpenCode by adding this to ~/.config/opencode/opencode.json:

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
  }
}

Then set env var: export NVIDIA_API_KEY=your_key_here
```

OpenCode will automatically detect this file when launched and guide you through the installation.

---

## ⚙️ How it works

```
┌─────────────────────────────────────────────────────────────┐
│  1. Enter alternate screen buffer (like vim/htop/less)      │
│  2. Ping ALL models in parallel                             │
│  3. Display real-time table with Latest/Avg columns         │
│  4. Re-ping ALL models every 10 seconds (forever)          │
│  5. Update rolling averages from ALL successful pings      │
│  6. User can navigate with ↑↓ and select with Enter       │
│  7. On Enter: stop monitoring, exit alt screen            │
│  8. Detect NVIDIA NIM config in OpenCode                   │
│  9. If configured: update default model, launch OpenCode   │
│ 10. If missing: show install prompt, launch OpenCode      │
└─────────────────────────────────────────────────────────────┘
```

**Result:** Continuous monitoring interface that stays open until you select a model or press Ctrl+C. Rolling averages give you accurate long-term latency data, and you can launch OpenCode with your chosen model in one keystroke.

---

## 📋 API Reference

| Parameter | Description |
|-----------|-------------|
| `NVIDIA_API_KEY` | Environment variable for API key |
| `<api-key>` | First positional argument |

**Configuration:**
- **Ping timeout**: 6 seconds per attempt (models slower than this are unusable)
- **Retry policy**: 2 attempts max per ping cycle (12 seconds total before moving to next model)
- **Ping interval**: 10 seconds between complete re-pings of all models
- **Monitor mode**: Interface stays open forever, press Ctrl+C to exit

---

## 🔧 Development

```bash
git clone https://github.com/vava-nessa/free-ai-opencode
cd free-ai-opencode
npm install
npm start -- YOUR_API_KEY
```

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

## 📧 Support
For questions or issues, open a GitHub issue or join our community Discord: https://discord.gg/free-ai-opencode
