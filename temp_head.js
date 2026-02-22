#!/usr/bin/env node
/**
 * @file free-coding-models.js
 * @description Live terminal availability checker for coding LLM models with OpenCode integration.
 *
 * @details
 *   This CLI tool discovers and benchmarks language models optimized for coding.
 *   It runs in an alternate screen buffer, pings all models in parallel, re-pings successful ones
 *   multiple times for reliable latency measurements, and prints a clean final table.
 *   During benchmarking, users can navigate with arrow keys and press Enter to launch OpenCode immediately.
 *
 *   🎯 Key features:
 *   - Parallel pings across all models with animated real-time updates
 *   - Continuous monitoring with 10-second ping intervals (never stops)
 *   - Rolling averages calculated from ALL successful pings since start
 *   - Best-per-tier highlighting with medals (🥇🥈🥉)
 *   - Interactive navigation with arrow keys directly in the table
 *   - Instant OpenCode launch on Enter key press (any model, even timeout/down)
 *   - Automatic OpenCode config detection and model setup
 *   - Persistent API key storage in ~/.free-coding-models
 *   - Multi-source support via sources.js (easily add new providers)
 *   - Uptime percentage tracking (successful pings / total pings)
 *   - Sortable columns (R/T/O/M/P/A/S/V/U keys)
 *
 *   → Functions:
 *   - `loadApiKey` / `saveApiKey`: Manage persisted API key in ~/.free-coding-models
 *   - `promptApiKey`: Interactive wizard for first-time API key setup
 *   - `ping`: Perform HTTP request to NIM endpoint with timeout handling
 *   - `renderTable`: Generate ASCII table with colored latency indicators and status emojis
 *   - `getAvg`: Calculate average latency from all successful pings
 *   - `getVerdict`: Determine verdict string based on average latency (Overloaded for 429)
 *   - `getUptime`: Calculate uptime percentage from ping history
 *   - `sortResults`: Sort models by various columns
 *   - `checkNvidiaNimConfig`: Check if NVIDIA NIM provider is configured in OpenCode
 *   - `startOpenCode`: Launch OpenCode with selected model (configures if needed)
 *   - `main`: Orchestrates CLI flow, wizard, ping loops, animation, and output
 *
 *   📦 Dependencies:
 *   - Node.js 18+ (native fetch)
 *   - chalk: Terminal styling and colors
 *   - readline: Interactive input handling
 *   - sources.js: Model definitions from all providers
 *
 *   ⚙️ Configuration:
 *   - API key stored in ~/.free-coding-models
 *   - Models loaded from sources.js (extensible for new providers)
 *   - OpenCode config: ~/.config/opencode/opencode.json
 *   - Ping timeout: 6s per attempt, max 2 retries (12s total)
 *   - Ping interval: 10 seconds (continuous monitoring mode)
 *   - Animation: 12 FPS with braille spinners
 *   - Reliability: Green → Yellow → Orange → Red → Black (degrades with instability)
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
const CONFIG_PATH = join(homedir(), '.free-coding-models')

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
  console.log(chalk.dim('  💾 Key will be saved to ~/.free-coding-models'))
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
        console.log(chalk.green('  ✅ API key saved to ~/.free-coding-models'))
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

// ─── API Configuration ───────────────────────────────────────────────────────────
// 📖 Models are now loaded from sources.js to support multiple providers
// 📖 This allows easy addition of new model sources beyond NVIDIA NIM

const NIM_URL      = 'https://integrate.api.nvidia.com/v1/chat/completions'
const PING_TIMEOUT  = 15_000   // 📖 15s per attempt before abort - slow models get more time
const PING_INTERVAL = 2_000    // 📖 Ping all models every 2 seconds in continuous mode

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
  // 📖 Calculate average only from successful pings (code 200)
  // 📖 pings are objects: { ms, code }
  const successfulPings = (r.pings || []).filter(p => p.code === '200')
  if (successfulPings.length === 0) return Infinity
  return Math.round(successfulPings.reduce((a, b) => a + b.ms, 0) / successfulPings.length)
}

// 📖 Verdict order for sorting
const VERDICT_ORDER = ['Perfect', 'Normal', 'Slow', 'Very Slow', 'Overloaded', 'Unstable', 'Not Active', 'Pending']

// 📖 Get verdict for a model result
const getVerdict = (r) => {
  const avg = getAvg(r)
  const wasUpBefore = r.pings.length > 0 && r.pings.some(p => p.code === '200')
  
  // 📖 429 = rate limited = Overloaded
  if (r.httpCode === '429') return 'Overloaded'
  if ((r.status === 'timeout' || r.status === 'down') && wasUpBefore) return 'Unstable'
  if (r.status === 'timeout' || r.status === 'down') return 'Not Active'
  if (avg === Infinity) return 'Pending'
  if (avg < 400) return 'Perfect'
  if (avg < 1000) return 'Normal'
  if (avg < 3000) return 'Slow'
  if (avg < 5000) return 'Very Slow'
  if (avg < 10000) return 'Unstable'
  return 'Unstable'
}

// 📖 Calculate uptime percentage (successful pings / total pings)
// 📖 Only count code 200 responses
const getUptime = (r) => {
  if (r.pings.length === 0) return 0
  const successful = r.pings.filter(p => p.code === '200').length
  return Math.round((successful / r.pings.length) * 100)
}

// 📖 Sort results using the same logic as renderTable - used for both display and selection
const sortResults = (results, sortColumn, sortDirection) => {
  return [...results].sort((a, b) => {
    let cmp = 0
    
    switch (sortColumn) {
      case 'rank':
        cmp = a.idx - b.idx
        break
      case 'tier':
        cmp = TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier)
        break
      case 'origin':
        cmp = 'NVIDIA NIM'.localeCompare('NVIDIA NIM') // All same for now
        break
      case 'model':
        cmp = a.label.localeCompare(b.label)
        break
      case 'ping': {
        const aLast = a.pings.length > 0 ? a.pings[a.pings.length - 1] : null
        const bLast = b.pings.length > 0 ? b.pings[b.pings.length - 1] : null
        const aPing = aLast?.code === '200' ? aLast.ms : Infinity
        const bPing = bLast?.code === '200' ? bLast.ms : Infinity
        cmp = aPing - bPing
        break
      }
      case 'avg':
        cmp = getAvg(a) - getAvg(b)
        break
      case 'status':
        cmp = a.status.localeCompare(b.status)
        break
      case 'verdict': {
        const aVerdict = getVerdict(a)
        const bVerdict = getVerdict(b)
        cmp = VERDICT_ORDER.indexOf(aVerdict) - VERDICT_ORDER.indexOf(bVerdict)
        break
      }
      case 'uptime':
        cmp = getUptime(a) - getUptime(b)
        break
    }
    
    return sortDirection === 'asc' ? cmp : -cmp
  })
}

function renderTable(results, pendingPings, frame, cursor = null, sortColumn = 'avg', sortDirection = 'asc', pingInterval = PING_INTERVAL, lastPingTime = Date.now()) {
  const up      = results.filter(r => r.status === 'up').length
  const down    = results.filter(r => r.status === 'down').length
  const timeout = results.filter(r => r.status === 'timeout').length
  const pending = results.filter(r => r.status === 'pending').length

  // 📖 Calculate seconds until next ping
  const timeSinceLastPing = Date.now() - lastPingTime
  const timeUntilNextPing = Math.max(0, pingInterval - timeSinceLastPing)
  const secondsUntilNext = Math.ceil(timeUntilNextPing / 1000)

  const phase = pending > 0
    ? chalk.dim(`discovering — ${pending} remaining…`)
    : pendingPings > 0
      ? chalk.dim(`pinging — ${pendingPings} in flight…`)
      : chalk.dim(`next ping ${secondsUntilNext}s`)

  // 📖 Column widths (generous spacing with margins)
  const W_RANK = 6
  const W_TIER = 6
  const W_SOURCE = 14
  const W_MODEL = 26
  const W_PING = 14
  const W_AVG = 11
  const W_STATUS = 18
  const W_VERDICT = 14
  const W_UPTIME = 6

  // 📖 Sort models using the shared helper
  const sorted = sortResults(results, sortColumn, sortDirection)

  const lines = [
    '',
    `  ${chalk.bold('⚡ Free Coding Models')}   ` +
      chalk.greenBright(`✅ ${up}`) + chalk.dim(' up  ') +
      chalk.yellow(`⏱ ${timeout}`) + chalk.dim(' timeout  ') +
      chalk.red(`❌ ${down}`) + chalk.dim(' down  ') +
      phase,
    '',
  ]

  // 📖 Header row with sorting indicators
  // 📖 NOTE: padEnd on chalk strings counts ANSI codes, breaking alignment
  // 📖 Solution: build plain text first, then colorize
  const dir = sortDirection === 'asc' ? '↑' : '↓'
  
  const rankH    = 'Rank'
  const tierH    = 'Tier'
  const originH  = 'Origin'
  const modelH   = 'Model'
  const pingH    = sortColumn === 'ping' ? dir + ' Latest Ping' : 'Latest Ping'
  const avgH     = sortColumn === 'avg' ? dir + ' Avg Ping' : 'Avg Ping'
  const statusH  = sortColumn === 'status' ? dir + ' Status' : 'Status'
  const verdictH = sortColumn === 'verdict' ? dir + ' Verdict' : 'Verdict'
  const uptimeH  = sortColumn === 'uptime' ? dir + ' Up%' : 'Up%'
  
  // 📖 Now colorize after padding is calculated on plain text
  const rankH_c    = chalk.dim(rankH.padEnd(W_RANK))
  const tierH_c    = chalk.dim(tierH.padEnd(W_TIER))
  const originH_c  = sortColumn === 'origin' ? chalk.bold.cyan(originH.padEnd(W_SOURCE)) : chalk.dim(originH.padEnd(W_SOURCE))
  const modelH_c   = chalk.dim(modelH.padEnd(W_MODEL))
  const pingH_c    = sortColumn === 'ping' ? chalk.bold.cyan(pingH.padEnd(W_PING)) : chalk.dim(pingH.padEnd(W_PING))
  const avgH_c     = sortColumn === 'avg' ? chalk.bold.cyan(avgH.padEnd(W_AVG)) : chalk.dim(avgH.padEnd(W_AVG))
  const statusH_c  = sortColumn === 'status' ? chalk.bold.cyan(statusH.padEnd(W_STATUS)) : chalk.dim(statusH.padEnd(W_STATUS))
  const verdictH_c = sortColumn === 'verdict' ? chalk.bold.cyan(verdictH.padEnd(W_VERDICT)) : chalk.dim(verdictH.padEnd(W_VERDICT))
  const uptimeH_c  = sortColumn === 'uptime' ? chalk.bold.cyan(uptimeH.padStart(W_UPTIME)) : chalk.dim(uptimeH.padStart(W_UPTIME))
  
  // 📖 Header with proper spacing
  lines.push('  ' + rankH_c + '  ' + tierH_c + '  ' + originH_c + '  ' + modelH_c + '  ' + pingH_c + '  ' + avgH_c + '  ' + statusH_c + '  ' + verdictH_c + '  ' + uptimeH_c)
  
  // 📖 Separator line
  lines.push(
    '  ' + 
    chalk.dim('─'.repeat(W_RANK)) + '  ' +
    chalk.dim('─'.repeat(W_TIER)) + '  ' +
    '─'.repeat(W_SOURCE) + '  ' +
    '─'.repeat(W_MODEL) + '  ' +
    chalk.dim('─'.repeat(W_PING)) + '  ' +
    chalk.dim('─'.repeat(W_AVG)) + '  ' +
    chalk.dim('─'.repeat(W_STATUS)) + '  ' +
    chalk.dim('─'.repeat(W_VERDICT)) + '  ' +
    chalk.dim('─'.repeat(W_UPTIME))
  )

  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i]
    const tierFn = TIER_COLOR[r.tier] ?? (t => chalk.white(t))
    
    const isCursor = cursor !== null && i === cursor
    
    // 📖 Left-aligned columns - pad plain text first, then colorize
    const num = chalk.dim(String(r.idx).padEnd(W_RANK))
    const tier = tierFn(r.tier.padEnd(W_TIER))
    const source = chalk.green('NVIDIA NIM'.padEnd(W_SOURCE))
    const name = r.label.slice(0, W_MODEL).padEnd(W_MODEL)

    // 📖 Latest ping - pings are objects: { ms, code }
    // 📖 Only show response time for successful pings, "—" for errors (error code is in Status column)
    const latestPing = r.pings.length > 0 ? r.pings[r.pings.length - 1] : null
    let pingCell
    if (!latestPing) {
      pingCell = chalk.dim('—'.padEnd(W_PING))
    } else if (latestPing.code === '200') {
      // 📖 Success - show response time
      const str = String(latestPing.ms).padEnd(W_PING)
      pingCell = latestPing.ms < 500 ? chalk.greenBright(str) : latestPing.ms < 1500 ? chalk.yellow(str) : chalk.red(str)
    } else {
      // 📖 Error or timeout - show "—" (error code is already in Status column)
      pingCell = chalk.dim('—'.padEnd(W_PING))
    }

    // 📖 Avg ping (just number, no "ms")
    const avg = getAvg(r)
    let avgCell
    if (avg !== Infinity) {
      const str = String(avg).padEnd(W_AVG)
      avgCell = avg < 500 ? chalk.greenBright(str) : avg < 1500 ? chalk.yellow(str) : chalk.red(str)
    } else {
      avgCell = chalk.dim('—'.padEnd(W_AVG))
    }

    // 📖 Status column - build plain text with emoji, pad, then colorize
    // 📖 Different emojis for different error codes
    let statusText, statusColor
    if (r.status === 'pending') {
      statusText = `${FRAMES[frame % FRAMES.length]} wait`
      statusColor = (s) => chalk.dim.yellow(s)
    } else if (r.status === 'up') {
      statusText = `✅ UP`
      statusColor = (s) => s
    } else if (r.status === 'timeout') {
      statusText = `⏳ TIMEOUT`
      statusColor = (s) => chalk.yellow(s)
    } else if (r.status === 'down') {
      const code = r.httpCode ?? 'ERR'
      // 📖 Different emojis for different error codes
      const errorEmojis = {
        '429': '🔥',  // Rate limited / overloaded
        '404': '🚫',  // Not found
        '500': '💥',  // Internal server error
        '502': '🔌',  // Bad gateway
        '503': '🔒',  // Service unavailable
        '504': '⏰',  // Gateway timeout
      }
      const emoji = errorEmojis[code] || '❌'
      statusText = `${emoji} ${code}`
      statusColor = (s) => chalk.red(s)
    } else {
      statusText = '?'
      statusColor = (s) => chalk.dim(s)
    }
    const status = statusColor(statusText.padEnd(W_STATUS))

    // 📖 Verdict column - build plain text with emoji, pad, then colorize
    const wasUpBefore = r.pings.length > 0 && r.pings.some(p => p.code === '200')
    let verdictText, verdictColor
    if (r.httpCode === '429') {
      verdictText = '🔥 Overloaded'
      verdictColor = (s) => chalk.yellow.bold(s)
    } else if ((r.status === 'timeout' || r.status === 'down') && wasUpBefore) {
      verdictText = '⚠️ Unstable'
      verdictColor = (s) => chalk.magenta(s)
    } else if (r.status === 'timeout' || r.status === 'down') {
      verdictText = '👻 Not Active'
      verdictColor = (s) => chalk.dim(s)
    } else if (avg === Infinity) {
      verdictText = '⏳ Pending'
      verdictColor = (s) => chalk.dim(s)
    } else if (avg < 400) {
      verdictText = '🚀 Perfect'
      verdictColor = (s) => chalk.greenBright(s)
    } else if (avg < 1000) {
      verdictText = '✅ Normal'
      verdictColor = (s) => chalk.cyan(s)
    } else if (avg < 3000) {
      verdictText = '🐢 Slow'
      verdictColor = (s) => chalk.yellow(s)
    } else if (avg < 5000) {
      verdictText = '🐌 Very Slow'
      verdictColor = (s) => chalk.red(s)
    } else {
      verdictText = '💀 Unusable'
      verdictColor = (s) => chalk.red.bold(s)
    }
    const speedCell = verdictColor(verdictText.padEnd(W_VERDICT))

    // 📖 Uptime column - percentage of successful pings
    const uptimePercent = getUptime(r)
    const uptimeStr = uptimePercent + '%'
    let uptimeCell
    if (uptimePercent >= 90) {
      uptimeCell = chalk.greenBright(uptimeStr.padStart(W_UPTIME))
    } else if (uptimePercent >= 70) {
      uptimeCell = chalk.yellow(uptimeStr.padStart(W_UPTIME))
    } else if (uptimePercent >= 50) {
      uptimeCell = chalk.rgb(255, 165, 0)(uptimeStr.padStart(W_UPTIME)) // orange
    } else {
      uptimeCell = chalk.red(uptimeStr.padStart(W_UPTIME))
    }

    // 📖 Build row with double space between columns
    const row = '  ' + num + '  ' + tier + '  ' + source + '  ' + name + '  ' + pingCell + '  ' + avgCell + '  ' + status + '  ' + speedCell + '  ' + uptimeCell
    
    if (isCursor) {
      lines.push(chalk.bgRgb(139, 0, 139)(row))
    } else {
      lines.push(row)
    }
  }

  lines.push('')
  const intervalSec = Math.round(pingInterval / 1000)
  lines.push(chalk.dim(`  ↑↓ Navigate  •  Enter Select  •  R/T/O/M/P/A/S/V/U Sort  •  W↓/X↑ Interval (${intervalSec}s)  •  Ctrl+C Exit`))
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
      shell: true
    })
    
    // 📖 Wait for OpenCode to exit
    await new Promise((resolve, reject) => {
      child.on('exit', resolve)
      child.on('error', (err) => {
        if (err.code === 'ENOENT') {
          console.error(chalk.red('\n  ✗ Could not find "opencode" — is it installed and in your PATH?'))
          console.error(chalk.dim('    Install: npm i -g opencode   or see https://opencode.ai'))
          resolve(1)
        } else {
          reject(err)
        }
      })
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
      shell: true
    })
    
    // 📖 Wait for OpenCode to exit
    await new Promise((resolve, reject) => {
      child.on('exit', resolve)
      child.on('error', (err) => {
        if (err.code === 'ENOENT') {
          console.error(chalk.red('\n  ✗ Could not find "opencode" — is it installed and in your PATH?'))
          console.error(chalk.dim('    Install: npm i -g opencode   or see https://opencode.ai'))
          resolve(1)
        } else {
          reject(err)
        }
      })
    })
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
