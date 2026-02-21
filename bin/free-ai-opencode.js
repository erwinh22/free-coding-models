#!/usr/bin/env node
/**
 * @file free-ai-opencode.js
 * @description Live terminal availability checker for NVIDIA NIM LLM models with OpenCode integration.
 *
 * @details
 *   This CLI tool discovers and benchmarks NVIDIA NIM language models optimized for coding.
 *   It runs in an alternate screen buffer, pings all models in parallel, re-pings successful ones
 *   multiple times for reliable latency measurements, and prints a clean final table.
 *   During benchmarking, users can navigate with arrow keys and press Enter to launch OpenCode immediately.
 *
 *   🎯 Key features:
 *   - Parallel pings across 44 models with animated real-time updates
 *   - 4x latency measurements for accurate averages
 *   - Best-per-tier highlighting with medals (🥇🥈🥉)
 *   - Interactive navigation with arrow keys directly in the table
 *   - Instant OpenCode launch on Enter key press
 *   - Automatic OpenCode config detection and model setup
 *   - Persistent API key storage in ~/.free-ai-opencode
 *
 *   → Functions:
 *   - `loadApiKey` / `saveApiKey`: Manage persisted API key in ~/.free-ai-opencode
 *   - `promptApiKey`: Interactive wizard for first-time API key setup
 *   - `ping`: Perform HTTP request to NIM endpoint with timeout handling
 *   - `renderTable`: Generate ASCII table with colored latency indicators and status emojis
 *   - `getAvg`: Calculate average latency from ping results
 *   - `checkNvidiaNimConfig`: Check if NVIDIA NIM provider is configured in OpenCode
 *   - `startOpenCode`: Launch OpenCode with selected model
 *   - `main`: Orchestrates CLI flow, wizard, ping loops, animation, and output
 *
 *   📦 Dependencies:
 *   - Node.js 18+ (native fetch)
 *   - chalk: Terminal styling and colors
 *   - readline: Interactive input handling
 *
 *   ⚙️ Configuration:
 *   - API key stored in ~/.free-ai-opencode
 *   - OpenCode config: ~/.config/opencode/opencode.json
 *   - Ping timeout: 6s per attempt, max 2 retries (12s total)
 *   - Animation: 12 FPS with braille spinners
 *
 *   @see {@link https://build.nvidia.com} NVIDIA API key generation
 *   @see {@link https://github.com/opencode-ai/opencode} OpenCode repository
 */

import chalk from 'chalk'
import { createRequire } from 'module'
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { MODELS } from '../sources.js'

const require = createRequire(import.meta.url)
const readline = require('readline')

// ─── Config path ──────────────────────────────────────────────────────────────
const CONFIG_PATH = join(homedir(), '.free-ai-opencode')

function loadApiKey() {
  try {
    if (existsSync(CONFIG_PATH)) {
      return readFileSync(CONFIG_PATH, 'utf8').trim()
    }
  } catch {}
  return null
}

function saveApiKey(key) {
  try {
    writeFileSync(CONFIG_PATH, key, { mode: 0o600 })
  } catch {}
}

// ─── First-run wizard ─────────────────────────────────────────────────────────
async function promptApiKey() {
  console.log()
  console.log(chalk.dim('  🔑 Setup your NVIDIA API key'))
  console.log(chalk.dim('  📝 Get a free key at: ') + chalk.cyanBright('https://build.nvidia.com'))
  console.log(chalk.dim('  💾 Key will be saved to ~/.free-ai-opencode'))
  console.log()

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(chalk.bold('  Enter your API key: '), (answer) => {
      rl.close()
      const key = answer.trim()
      if (key) {
        saveApiKey(key)
        console.log()
        console.log(chalk.green('  ✅ API key saved to ~/.free-ai-opencode'))
        console.log()
      }
      resolve(key || null)
    })
  })
}

// ─── Alternate screen control ─────────────────────────────────────────────────
// 📖 \x1b[?1049h = enter alt screen  \x1b[?1049l = leave alt screen
// 📖 \x1b[?25l   = hide cursor       \x1b[?25h   = show cursor
// 📖 \x1b[H      = cursor to top     \x1b[2J     = clear screen
const ALT_ENTER  = '\x1b[?1049h\x1b[?25l'
const ALT_LEAVE  = '\x1b[?1049l\x1b[?25h'
const ALT_CLEAR  = '\x1b[H\x1b[2J'

// ─── Model registry ───────────────────────────────────────────────────────────
// 📖 [model_id, display_label, tier] — tiers based on Aider Polyglot benchmark scores
// 📖 Source: https://aider.chat/docs/leaderboards (Polyglot = 225 exercises, 6 languages)
// 📖 Confirmed scores: DeepSeek V3.2 74.2%, V3.1 ~76%, Qwen2.5-Coder 71.4%, Qwen3-Coder 61.8%
// 📖   Qwen3-235B 59.6%, Kimi-K2 59.1%, Llama3.3-70B 59.4%, Llama3.1-405B 66.2% (edit)
// 📖   GPT-OSS-120B 41.8%, QwQ-32B 20.9% (format penalty), Llama4-Maverick 15.6%
// 📖 Unconfirmed models estimated from model family, size, and published release benchmarks
// 📖 Tier scale: S+(75%+) S(62-75%) A+(54-62%) A(44-54%) A-(36-44%) B+(25-36%) B(14-25%) C(<14%)
const MODELS = [
  // ── S+ tier — Aider polyglot ≥75% or equivalent frontier coding performance ──
  ['deepseek-ai/deepseek-v3.1',                    'DeepSeek V3.1',       'S+'], // ~76.1% Aider polyglot (thinking mode)
  ['deepseek-ai/deepseek-v3.1-terminus',           'DeepSeek V3.1 Term',  'S+'], // same base, terminus variant
  ['deepseek-ai/deepseek-v3.2',                    'DeepSeek V3.2',       'S+'], // 74.2% Aider polyglot (reasoner)
  ['moonshotai/kimi-k2.5',                         'Kimi K2.5',           'S+'], // newer than K2 (59%), estimated S+
  ['mistralai/devstral-2-123b-instruct-2512',      'Devstral 2 123B',     'S+'], // coding-focused 123B, estimated S+
  ['nvidia/llama-3.1-nemotron-ultra-253b-v1',      'Nemotron Ultra 253B', 'S+'], // 253B NVIDIA flagship, estimated S+
  ['mistralai/mistral-large-3-675b-instruct-2512', 'Mistral Large 675B',  'S+'], // 675B frontier, estimated S+
  // ── S tier — Aider polyglot 62–74% ─────────────────────────────────────────
  ['qwen/qwen2.5-coder-32b-instruct',              'Qwen2.5 Coder 32B',   'S'],  // 71.4% Aider edit (best confirmed small coder)
  ['z-ai/glm5',                                    'GLM 5',               'S'],  // GLM flagship, estimated S
  ['qwen/qwen3.5-397b-a17b',                       'Qwen3.5 400B VLM',    'S'],  // 400B VLM, estimated S
  ['qwen/qwen3-coder-480b-a35b-instruct',          'Qwen3 Coder 480B',    'S'],  // 61.8% Aider polyglot
  ['qwen/qwen3-next-80b-a3b-thinking',             'Qwen3 80B Thinking',  'S'],  // 80B thinking, estimated S
  ['meta/llama-3.1-405b-instruct',                 'Llama 3.1 405B',      'S'],  // 66.2% Aider edit benchmark
  ['minimaxai/minimax-m2.1',                       'MiniMax M2.1',        'S'],  // M2.1 flagship, estimated S
  // ── A+ tier — Aider polyglot 54–62% ────────────────────────────────────────
  ['moonshotai/kimi-k2-thinking',                  'Kimi K2 Thinking',    'A+'], // thinking variant of K2 (59.1%)
  ['moonshotai/kimi-k2-instruct',                  'Kimi K2 Instruct',    'A+'], // 59.1% Aider polyglot (confirmed)
  ['qwen/qwen3-235b-a22b',                         'Qwen3 235B',          'A+'], // 59.6% Aider polyglot (confirmed)
  ['meta/llama-3.3-70b-instruct',                  'Llama 3.3 70B',       'A+'], // 59.4% Aider edit benchmark
  ['z-ai/glm4.7',                                  'GLM 4.7',             'A+'], // GLM 4.7, estimated A+
  ['qwen/qwen3-next-80b-a3b-instruct',             'Qwen3 80B Instruct',  'A+'], // 80B instruct, estimated A+
  // ── A tier — Aider polyglot 44–54% ─────────────────────────────────────────
  ['minimaxai/minimax-m2',                         'MiniMax M2',          'A'],  // MiniMax M2, estimated A
  ['mistralai/mistral-medium-3-instruct',          'Mistral Medium 3',    'A'],  // medium model, estimated A
  ['mistralai/magistral-small-2506',               'Magistral Small',     'A'],  // reasoning variant, estimated A
  ['nvidia/nemotron-3-nano-30b-a3b',               'Nemotron Nano 30B',   'A'],  // 30B NVIDIA, estimated A
  ['deepseek-ai/deepseek-r1-distill-qwen-32b',     'R1 Distill 32B',      'A'],  // 32B R1 distill, estimated A
  // ── A- tier — Aider polyglot 36–44% ────────────────────────────────────────
  ['openai/gpt-oss-120b',                          'GPT OSS 120B',        'A-'], // 41.8% Aider polyglot (confirmed)
  ['nvidia/llama-3.3-nemotron-super-49b-v1.5',     'Nemotron Super 49B',  'A-'], // 49B NVIDIA, estimated A-
  ['meta/llama-4-scout-17b-16e-instruct',          'Llama 4 Scout',       'A-'], // Scout 17B, estimated A-
  ['deepseek-ai/deepseek-r1-distill-qwen-14b',     'R1 Distill 14B',      'A-'], // 14B R1 distill, estimated A-
  ['igenius/colosseum_355b_instruct_16k',          'Colosseum 355B',      'A-'], // 355B MoE, estimated A-
  // ── B+ tier — Aider polyglot 25–36% ────────────────────────────────────────
  ['qwen/qwq-32b',                                 'QwQ 32B',             'B+'], // 20.9% Aider (format penalty — actually stronger)
  ['openai/gpt-oss-20b',                           'GPT OSS 20B',         'B+'], // smaller OSS variant, estimated B+
  ['stockmark/stockmark-2-100b-instruct',          'Stockmark 100B',      'B+'], // JP-specialized 100B, estimated B+
  ['bytedance/seed-oss-36b-instruct',              'Seed OSS 36B',        'B+'], // ByteDance 36B, estimated B+
  ['stepfun-ai/step-3.5-flash',                    'Step 3.5 Flash',      'B+'], // flash model, estimated B+
  // ── B tier — Aider polyglot 14–25% ─────────────────────────────────────────
  ['meta/llama-4-maverick-17b-128e-instruct',      'Llama 4 Maverick',    'B'],  // 15.6% Aider polyglot (confirmed)
  ['mistralai/mixtral-8x22b-instruct-v0.1',        'Mixtral 8x22B',       'B'],  // older MoE, estimated B
  ['mistralai/ministral-14b-instruct-2512',        'Ministral 14B',       'B'],  // 14B, estimated B
  ['ibm/granite-34b-code-instruct',                'Granite 34B Code',    'B'],  // IBM code model, estimated B
  ['deepseek-ai/deepseek-r1-distill-llama-8b',     'R1 Distill 8B',       'B'],  // 8B R1 distill, estimated B
  // ── C tier — Aider polyglot <14% or lightweight edge models ─────────────────
  ['deepseek-ai/deepseek-r1-distill-qwen-7b',      'R1 Distill 7B',       'C'],  // 7B, too small for complex coding
  ['google/gemma-2-9b-it',                         'Gemma 2 9B',          'C'],  // 9B, lightweight
  ['microsoft/phi-3.5-mini-instruct',              'Phi 3.5 Mini',        'C'],  // mini, edge-focused
  ['microsoft/phi-4-mini-instruct',                'Phi 4 Mini',          'C'],  // mini, edge-focused
]

const NIM_URL      = 'https://integrate.api.nvidia.com/v1/chat/completions'
const PING_TIMEOUT  = 6_000    // 📖 6s per attempt before abort - models slower than this are unusable for coding
const PING_INTERVAL = 10_000   // 📖 Ping all models every 10 seconds in continuous mode
const FPS          = 12
const COL_MODEL    = 22
// 📖 COL_MS = dashes in hline per ping column = visual width including 2 padding spaces
// 📖 Max value: 12001ms = 7 chars. padStart(COL_MS-2) fits content, +2 spaces = COL_MS dashes
// 📖 COL_MS 11 → content padded to 9 → handles up to "12001ms" (7 chars) with room
const COL_MS       = 11

// ─── Styling ──────────────────────────────────────────────────────────────────
// 📖 Tier colors: green gradient (best) → yellow → orange → red (worst)
// 📖 Uses chalk.rgb() for fine-grained color control across 8 tier levels
const TIER_COLOR = {
  'S+': t => chalk.bold.rgb(0,   255,  80)(t),   // 🟢 bright neon green  — elite
  'S':  t => chalk.bold.rgb(80,  220,   0)(t),   // 🟢 green              — excellent
  'A+': t => chalk.bold.rgb(170, 210,   0)(t),   // 🟡 yellow-green       — great
  'A':  t => chalk.bold.rgb(240, 190,   0)(t),   // 🟡 yellow             — good
  'A-': t => chalk.bold.rgb(255, 130,   0)(t),   // 🟠 amber              — decent
  'B+': t => chalk.bold.rgb(255,  70,   0)(t),   // 🟠 orange-red         — average
  'B':  t => chalk.bold.rgb(210,  20,   0)(t),   // 🔴 red                — below avg
  'C':  t => chalk.bold.rgb(140,   0,   0)(t),   // 🔴 dark red           — lightweight
}

// 📖 COL_MS - 2 = visual content width (the 2 padding spaces are handled by │ x │ template)
const CELL_W = COL_MS - 2  // 9 chars of content per ms cell

const msCell = (ms) => {
  if (ms === null) return chalk.dim('—'.padStart(CELL_W))
  const str = String(ms).padStart(CELL_W)
  if (ms === 'TIMEOUT') return chalk.red(str)
  if (ms < 500)  return chalk.greenBright(str)
  if (ms < 1500) return chalk.yellow(str)
  return chalk.red(str)
}

const FRAMES = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏']
// 📖 Spinner cell: braille (1-wide) + padding to fill CELL_W visual chars
const spinCell = (f, o = 0) => chalk.dim.yellow(FRAMES[(f + o) % FRAMES.length].padEnd(CELL_W))

// ─── Table renderer ───────────────────────────────────────────────────────────

const TIER_ORDER = ['S+', 'S', 'A+', 'A', 'A-', 'B+', 'B', 'C']
const getAvg = r => {
  // 📖 Calculate average from ALL successful pings (exclude timeouts)
  const successfulPings = (r.pings || []).filter(p => p !== null && p !== 'TIMEOUT')
  if (successfulPings.length === 0) return Infinity
  return Math.round(successfulPings.reduce((a, b) => a + b) / successfulPings.length)
}

function renderTable(results, pendingPings, frame, cursor = null) {
  const up      = results.filter(r => r.status === 'up').length
  const down    = results.filter(r => r.status === 'down').length
  const timeout = results.filter(r => r.status === 'timeout').length
  const pending = results.filter(r => r.status === 'pending').length

  const phase = pending > 0
    ? chalk.dim(`discovering — ${pending} remaining…`)
    : pendingPings > 0
      ? chalk.dim(`pinging — ${pendingPings} in flight…`)
      : chalk.dim('continuous monitoring ✓')

  // 📖 Sort models by Tier (S+ to C) and then by AVG Latency within tier
  const sorted = [...results].sort((a, b) => {
    const tierA = TIER_ORDER.indexOf(a.tier)
    const tierB = TIER_ORDER.indexOf(b.tier)
    if (tierA !== tierB) return tierA - tierB
    return getAvg(a) - getAvg(b)
  })

  // 📖 Compute best model in each tier — only for UP models with all 4 pings complete
  const bestInTierIds = []
  for (const t of TIER_ORDER) {
    const inTier = results.filter(r => r.tier === t && r.status === 'up' && r.ping1 && r.ping2 && r.ping3 && r.ping4)
    if (inTier.length > 0) {
      const best = inTier.reduce((prev, curr) => getAvg(curr) < getAvg(prev) ? curr : prev)
      bestInTierIds.push(best.idx)
    }
  }

  const W  = COL_MODEL
  const W_PROVIDER = 12  // 📖 Width for Provider column
  const W_PING = COL_MS   // 📖 Width for Latest Ping column
  const W_AVG = COL_MS    // 📖 Width for Avg Ping column
  // 📖 col() — right-aligns text in a fixed-width column, no borders, just spaces
  const col = (txt, w) => txt.padStart(w)

  const lines = [
    '',
    `  ${chalk.bold('⚡ NIM Coding Models')}   ` +
      chalk.greenBright(`✅ ${up}`) + chalk.dim(' up  ') +
      chalk.yellow(`⏱ ${timeout}`) + chalk.dim(' timeout  ') +
      chalk.red(`❌ ${down}`) + chalk.dim(' down  ') +
      phase,
    '',
    // 📖 Header row — same spacing as data rows, dim text
    `  ${chalk.dim(col('#', 3))}  ${chalk.dim('Tier'.padEnd(4))}  ${chalk.dim('Provider'.padEnd(W_PROVIDER))}  ${chalk.dim('Model'.padEnd(W))}  ` +
      `  ${chalk.dim('Latest'.padStart(W_PING))}  ${chalk.dim('Avg'.padStart(W_AVG))}  ${chalk.dim('Status')}`,
    // 📖 Thin underline under header using dim dashes
    `  ${chalk.dim('─'.repeat(3))}  ${'─'.repeat(4)}  ${'─'.repeat(W_PROVIDER)}  ${'─'.repeat(W)}  ` +
      `  ${chalk.dim('─'.repeat(W_PING))}  ${chalk.dim('─'.repeat(W_AVG))}  ${chalk.dim('─'.repeat(9))}`,
  ]

  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i]
    const tierFn = TIER_COLOR[r.tier] ?? (t => chalk.white(t))
    
    // 📖 Cursor shown by background color only, keep the number
    const isCursor = cursor !== null && i === cursor
    const num = chalk.dim(String(r.idx).padStart(3))
    
    const tier   = tierFn(r.tier.padEnd(4))
    const provider = chalk.green('NVIDIA NIM'.padEnd(W_PROVIDER))
    
    // 📖 Emoji prefix for name: medal for best in tier, poop for slow (>3s avg)
    const isBest = bestInTierIds.includes(r.idx)
    let namePrefix = ''
    let nameWidth = W
    if (r.status === 'up' && r.ping1 && r.ping2 && r.ping3 && r.ping4) {
      const avg = getAvg(r)
      if (avg !== Infinity && avg > 3000) {
        namePrefix = '💩 '
        nameWidth = W - 2
      } else if (isBest) {
        namePrefix = '🥇 '
        nameWidth = W - 2
      }
    }
    const name = (namePrefix + r.label.slice(0, nameWidth)).padEnd(W)
    let latestCell, avgCell, status

    // 📖 Latest ping
    const latestPing = r.pings.length > 0 ? r.pings[r.pings.length - 1] : null
    
    if (latestPing === null) {
      latestCell = chalk.dim('—'.padStart(W_PING))
    } else if (latestPing === 'TIMEOUT') {
      latestCell = chalk.red('TIMEOUT'.padStart(W_PING))
    } else {
      const latestStr = String(latestPing).padStart(W_PING - 2) + 'ms'
      latestCell = msCell(latestPing)
    }

    // 📖 Avg ping from ALL successful pings (not timeouts)
    const avg = getAvg(r)
    const successfulPingCount = (r.pings || []).filter(p => p !== null && p !== 'TIMEOUT').length
    
    if (avg !== Infinity) {
      const avgStr = String(avg).padStart(W_AVG - 2) + 'ms'
      avgCell = isBest ? chalk.bold.white(avgStr) : chalk.bold.cyanBright(avgStr)
    } else {
      avgCell = chalk.dim('—'.padStart(W_AVG))
    }

    // 📖 Status column - show current state with ping count
    if (r.status === 'pending') {
      status = chalk.dim.yellow(`${FRAMES[frame % FRAMES.length]} wait`)
    } else if (r.status === 'up') {
      status = chalk.bold.greenBright('✅') + chalk.dim(` UP (${successfulPingCount})`)
    } else if (r.status === 'timeout') {
      status = chalk.bold.yellow('⏱') + chalk.dim(` TIMEOUT (${successfulPingCount})`)
    } else if (r.status === 'down') {
      const code = (r.httpCode ?? 'ERR').slice(0, 3)
      status = chalk.bold.red('❌') + chalk.red(` ${code}`)
    } else {
      status = chalk.dim('?')
    }

    // 📖 Dark green background for best models in each tier
    // 📖 Dark magenta background for cursor selection (more readable)
    const row = `  ${num}  ${tier}  ${provider}  ${name}  ${latestCell}  ${avgCell}  ${status}`
    
    if (isCursor) {
      lines.push(chalk.bgRgb(139, 0, 139)(row))  // Dark magenta (more readable)
    } else if (isBest && r.status === 'up') {
      lines.push(chalk.bgRgb(0, 40, 0)(row))
    } else {
      lines.push(row)
    }
  }

  lines.push('')
  return lines.join('\n')
}

// ─── HTTP ping ────────────────────────────────────────────────────────────────

async function ping(apiKey, modelId) {
  const ctrl  = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), PING_TIMEOUT)
  const t0    = performance.now()
  try {
    const resp = await fetch(NIM_URL, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelId, messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
    })
    return { code: String(resp.status), ms: Math.round(performance.now() - t0) }
  } catch (err) {
    const isTimeout = err.name === 'AbortError'
    return { 
      code: isTimeout ? '000' : 'ERR', 
      ms: isTimeout ? 'TIMEOUT' : Math.round(performance.now() - t0) 
    }
  } finally {
    clearTimeout(timer)
  }
}

// ─── OpenCode integration ──────────────────────────────────────────────────────
const OPENCODE_CONFIG = join(homedir(), '.config/opencode/opencode.json')

function loadOpenCodeConfig() {
  if (!existsSync(OPENCODE_CONFIG)) return { provider: {} }
  try {
    return JSON.parse(readFileSync(OPENCODE_CONFIG, 'utf8'))
  } catch {
    return { provider: {} }
  }
}

function saveOpenCodeConfig(config) {
  const dir = join(homedir(), '.config/opencode')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(OPENCODE_CONFIG, JSON.stringify(config, null, 2))
}

// ─── Check NVIDIA NIM in OpenCode config ───────────────────────────────────────
// 📖 Checks if NVIDIA NIM provider is configured in OpenCode config file
// 📖 OpenCode uses 'provider' (singular) not 'providers' (plural)
// 📖 Returns true if found, false otherwise
function checkNvidiaNimConfig() {
  const config = loadOpenCodeConfig()
  if (!config.provider) return false
  // 📖 Check for nvidia/nim provider by key name or display name (case-insensitive)
  const providerKeys = Object.keys(config.provider)
  return providerKeys.some(key => 
    key === 'nvidia' || key === 'nim' ||
    config.provider[key]?.name?.toLowerCase().includes('nvidia') ||
    config.provider[key]?.name?.toLowerCase().includes('nim')
  )
}

// ─── Start OpenCode ────────────────────────────────────────────────────────────
// 📖 Launches OpenCode with the selected NVIDIA NIM model
// 📖 If NVIDIA NIM is configured, use --model flag, otherwise show install prompt
// 📖 Model format: { modelId, label, tier }
async function startOpenCode(model) {
  const hasNim = checkNvidiaNimConfig()
  
  if (hasNim) {
    // 📖 NVIDIA NIM already configured - launch with model flag
    console.log(chalk.green(`  🚀 Setting ${chalk.bold(model.label)} as default…`))
    console.log(chalk.dim(`  Model: nvidia/${model.modelId}`))
    console.log()
    
    const config = loadOpenCodeConfig()
    const backupPath = `${OPENCODE_CONFIG}.backup-${Date.now()}`
    
    // 📖 Backup current config
    if (existsSync(OPENCODE_CONFIG)) {
      copyFileSync(OPENCODE_CONFIG, backupPath)
      console.log(chalk.dim(`  💾 Backup: ${backupPath}`))
    }
    
    // 📖 Update default model to nvidia/model_id
    config.model = `nvidia/${model.modelId}`
    saveOpenCodeConfig(config)
    
    console.log(chalk.green(`  ✓ Default model set to: nvidia/${model.modelId}`))
    console.log()
    console.log(chalk.dim('  Starting OpenCode…'))
    console.log()
    
    // 📖 Launch OpenCode and wait for it
    const { spawn } = await import('child_process')
    const child = spawn('opencode', [], {
      stdio: 'inherit',
      shell: false
    })
    
    // 📖 Wait for OpenCode to exit
    await new Promise((resolve, reject) => {
      child.on('exit', resolve)
      child.on('error', reject)
    })
  } else {
    // 📖 NVIDIA NIM not configured - show install prompt and launch
    console.log(chalk.yellow('  ⚠ NVIDIA NIM not configured in OpenCode'))
    console.log()
    console.log(chalk.dim('  Starting OpenCode with installation prompt…'))
    console.log()
    
    const installPrompt = `Please install NVIDIA NIM provider in OpenCode by adding this to ~/.config/opencode/opencode.json:

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

After installation, you can use: opencode --model nvidia/${model.modelId}`
    
    console.log(chalk.cyan(installPrompt))
    console.log()
    console.log(chalk.dim('  Starting OpenCode…'))
    console.log()
    
    const { spawn } = await import('child_process')
    const child = spawn('opencode', [], {
      stdio: 'inherit',
      shell: false
    })
    
    // 📖 Wait for OpenCode to exit
    await new Promise((resolve, reject) => {
      child.on('exit', resolve)
      child.on('error', reject)
    })
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 📖 Priority: CLI arg > env var > saved config > wizard
  let apiKey = process.argv[2] || process.env.NVIDIA_API_KEY || loadApiKey()

  if (!apiKey) {
    apiKey = await promptApiKey()
    if (!apiKey) {
      console.log()
      console.log(chalk.red('  ✖ No API key provided.'))
      console.log(chalk.dim('  Run `free-ai-opencode` again or set NVIDIA_API_KEY env var.'))
      console.log()
      process.exit(1)
    }
  }

  const results = MODELS.map(([modelId, label, tier], i) => ({
    idx: i + 1, modelId, label, tier,
    status: 'pending',
    pings: [],  // 📖 All ping results (ms or 'TIMEOUT')
    httpCode: null,
  }))

  // 📖 Add interactive selection state - cursor index and user's choice
  const state = { results, pendingPings: 0, frame: 0, cursor: 0, selectedModel: null }

  // 📖 Enter alternate screen — animation runs here, zero scrollback pollution
  process.stdout.write(ALT_ENTER)

  // 📖 Ensure we always leave alt screen cleanly (Ctrl+C, crash, normal exit)
  const exit = (code = 0) => {
    clearInterval(ticker)
    process.stdout.write(ALT_LEAVE)
    process.exit(code)
  }
  process.on('SIGINT',  () => exit(0))
  process.on('SIGTERM', () => exit(0))

  // 📖 Setup keyboard input for interactive selection during pings
  // 📖 Use readline with keypress event for arrow key handling
  process.stdin.setEncoding('utf8')
  process.stdin.resume()
  
  let userSelected = null
  
  const onKeyPress = async (str, key) => {
    if (!key) return
    
    if (key.name === 'up') {
      if (state.cursor > 0) {
        state.cursor--
      }
      return
    }
    
    if (key.name === 'down') {
      if (state.cursor < results.length - 1) {
        state.cursor++
      }
      return
    }
    
    if (key.name === 'c' && key.ctrl) { // Ctrl+C
      exit(0)
      return
    }
    
    if (key.name === 'return') { // Enter
      const sorted = [...results].sort((a, b) => {
        const tierA = TIER_ORDER.indexOf(a.tier)
        const tierB = TIER_ORDER.indexOf(b.tier)
        if (tierA !== tierB) return tierA - tierB
        return getAvg(a) - getAvg(b)
      })
      const selected = sorted[state.cursor]
      // 📖 Allow selecting ANY model (even timeout/down) - user knows what they're doing
      if (true) {
        userSelected = { modelId: selected.modelId, label: selected.label, tier: selected.tier }
        // 📖 Stop everything and launch OpenCode immediately
        clearInterval(ticker)
        clearInterval(pingInterval)
        readline.emitKeypressEvents(process.stdin)
        process.stdin.setRawMode(true)
        process.stdin.pause()
        process.stdin.removeListener('keypress', onKeyPress)
        process.stdout.write(ALT_LEAVE)
        
        // 📖 Show selection with status
        if (selected.status === 'timeout') {
          console.log(chalk.yellow(`  ⚠ Selected: ${selected.label} (currently timing out)`))
        } else if (selected.status === 'down') {
          console.log(chalk.red(`  ⚠ Selected: ${selected.label} (currently down)`))
        } else {
          console.log(chalk.cyan(`  ✓ Selected: ${selected.label}`))
        }
        console.log()
        
        // 📖 Wait for OpenCode to finish before exiting
        await startOpenCode(userSelected)
        process.exit(0)
      }
    }
  }
  
  // 📖 Enable keypress events on stdin
  readline.emitKeypressEvents(process.stdin)
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true)
  }
  
  process.stdin.on('keypress', onKeyPress)

  // 📖 Animation loop: clear alt screen + redraw table at FPS with cursor
  const ticker = setInterval(() => {
    state.frame++
    process.stdout.write(ALT_CLEAR + renderTable(state.results, state.pendingPings, state.frame, state.cursor))
  }, Math.round(1000 / FPS))

  process.stdout.write(ALT_CLEAR + renderTable(state.results, state.pendingPings, state.frame, state.cursor))

  // ── Continuous ping loop — ping all models every 10 seconds forever ──────────
  
  // 📖 Single ping function that updates result
  const pingModel = async (r) => {
    const { code, ms } = await ping(apiKey, r.modelId)
    
    // 📖 Add ping result to history
    r.pings.push(ms === 'TIMEOUT' ? 'TIMEOUT' : ms)
    
    // 📖 Update status based on latest ping
    if (code === '200') {
      r.status = 'up'
    } else if (code === '000') {
      r.status = 'timeout'
    } else {
      r.status = 'down'
      r.httpCode = code
    }
  }

  // 📖 Initial ping of all models
  const initialPing = Promise.all(results.map(r => pingModel(r)))
  
  // 📖 Continuous ping loop every 10 seconds
  const pingInterval = setInterval(() => {
    results.forEach(r => {
      pingModel(r).catch(() => {
        // Individual ping failures don't crash the loop
      })
    })
  }, PING_INTERVAL)

  await initialPing

  // 📖 Keep interface running forever - user can select anytime or Ctrl+C to exit
  // 📖 The pings continue running in background every 10 seconds
  // 📖 User can press Enter at any time to select a model and launch OpenCode
}

main().catch((err) => {
  process.stdout.write(ALT_LEAVE)
  console.error(err)
  process.exit(1)
})
