#!/usr/bin/env node
/**
 * @file free-coding-models.js
 * @description Live terminal availability checker for coding LLM models with OpenCode & OpenClaw integration.
 *
 * @details
 *   This CLI tool discovers and benchmarks language models optimized for coding.
 *   It runs in an alternate screen buffer, pings all models in parallel, re-pings successful ones
 *   multiple times for reliable latency measurements, and prints a clean final table.
 *   During benchmarking, users can navigate with arrow keys and press Enter to act on the selected model.
 *
 *   🎯 Key features:
 *   - Parallel pings across all models with animated real-time updates
 *   - Continuous monitoring with 2-second ping intervals (never stops)
 *   - Rolling averages calculated from ALL successful pings since start
 *   - Best-per-tier highlighting with medals (🥇🥈🥉)
 *   - Interactive navigation with arrow keys directly in the table
 *   - Instant OpenCode OR OpenClaw action on Enter key press
 *   - Startup mode menu (OpenCode CLI vs OpenCode Desktop vs OpenClaw) when no flag is given
 *   - Automatic config detection and model setup for both tools
 *   - Persistent API key storage in ~/.free-coding-models
 *   - Multi-source support via sources.js (easily add new providers)
 *   - Uptime percentage tracking (successful pings / total pings)
 *   - Sortable columns (R/T/O/M/P/A/S/V/U keys)
 *   - Tier filtering via --tier S/A/B/C flags
 *
 *   → Functions:
 *   - `loadApiKey` / `saveApiKey`: Manage persisted API key in ~/.free-coding-models
 *   - `promptApiKey`: Interactive wizard for first-time API key setup
 *   - `promptModeSelection`: Startup menu to choose OpenCode vs OpenClaw
 *   - `ping`: Perform HTTP request to NIM endpoint with timeout handling
 *   - `renderTable`: Generate ASCII table with colored latency indicators and status emojis
 *   - `getAvg`: Calculate average latency from all successful pings
 *   - `getVerdict`: Determine verdict string based on average latency (Overloaded for 429)
 *   - `getUptime`: Calculate uptime percentage from ping history
 *   - `sortResults`: Sort models by various columns
 *   - `checkNvidiaNimConfig`: Check if NVIDIA NIM provider is configured in OpenCode
 *   - `startOpenCode`: Launch OpenCode CLI with selected model (configures if needed)
 *   - `startOpenCodeDesktop`: Set model in shared config & open OpenCode Desktop app
 *   - `loadOpenClawConfig` / `saveOpenClawConfig`: Manage ~/.openclaw/openclaw.json
 *   - `startOpenClaw`: Set selected model as default in OpenClaw config (remote, no launch)
 *   - `filterByTier`: Filter models by tier letter prefix (S, A, B, C)
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
 *   - OpenClaw config: ~/.openclaw/openclaw.json
 *   - Ping timeout: 15s per attempt
 *   - Ping interval: 2 seconds (continuous monitoring mode)
 *   - Animation: 12 FPS with braille spinners
 *
 *   🚀 CLI flags:
 *   - (no flag): Show startup menu → choose OpenCode or OpenClaw
 *   - --opencode: OpenCode CLI mode (launch CLI with selected model)
 *   - --opencode-desktop: OpenCode Desktop mode (set model & open Desktop app)
 *   - --openclaw: OpenClaw mode (set selected model as default in OpenClaw)
 *   - --best: Show only top-tier models (A+, S, S+)
 *   - --fiable: Analyze 10s and output the most reliable model
 *   - --tier S/A/B/C: Filter models by tier letter (S=S+/S, A=A+/A/A-, B=B+/B, C=C)
 *
 *   @see {@link https://build.nvidia.com} NVIDIA API key generation
 *   @see {@link https://github.com/opencode-ai/opencode} OpenCode repository
 *   @see {@link https://openclaw.ai} OpenClaw documentation
 */

import chalk from 'chalk'
import { createRequire } from 'module'
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { join, dirname } from 'path'
import { MODELS } from '../sources.js'
import { patchOpenClawModelsJson } from '../patch-openclaw-models.js'
import { getAvg, getVerdict, getUptime, sortResults, filterByTier, findBestModel, parseArgs, TIER_ORDER, VERDICT_ORDER, TIER_LETTER_MAP } from '../lib/utils.js'

const require = createRequire(import.meta.url)
const readline = require('readline')

// ─── Version check ────────────────────────────────────────────────────────────
const pkg = require('../package.json')
const LOCAL_VERSION = pkg.version

async function checkForUpdate() {
  try {
    const res = await fetch('https://registry.npmjs.org/free-coding-models/latest', { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const data = await res.json()
    if (data.version && data.version !== LOCAL_VERSION) return data.version
  } catch {}
  return null
}

function runUpdate(latestVersion) {
  const { execSync } = require('child_process')
  console.log()
  console.log(chalk.bold.cyan('  ⬆ Updating free-coding-models to v' + latestVersion + '...'))
  console.log()
  
  try {
    // 📖 Force install from npm registry (ignore local cache)
    // 📖 Use --prefer-online to ensure we get the latest published version
    execSync(`npm i -g free-coding-models@${latestVersion} --prefer-online`, { stdio: 'inherit' })
    console.log()
    console.log(chalk.green('  ✅ Update complete! Version ' + latestVersion + ' installed.'))
    console.log()
    console.log(chalk.dim('  🔄 Restarting with new version...'))
    console.log()
    
    // 📖 Relaunch automatically with the same arguments
    const args = process.argv.slice(2)
    execSync(`node bin/free-coding-models.js ${args.join(' ')}`, { stdio: 'inherit' })
    process.exit(0)
  } catch (err) {
    console.log()
    // 📖 Check if error is permission-related (EACCES or EPERM)
    const isPermissionError = err.code === 'EACCES' || err.code === 'EPERM' || 
                             (err.stderr && (err.stderr.includes('EACCES') || err.stderr.includes('permission') || 
                                              err.stderr.includes('EACCES'))) ||
                             (err.message && (err.message.includes('EACCES') || err.message.includes('permission')))
    
    if (isPermissionError) {
      console.log(chalk.yellow('  ⚠️ Permission denied. Retrying with sudo...'))
      console.log()
      try {
        execSync(`sudo npm i -g free-coding-models@${latestVersion} --prefer-online`, { stdio: 'inherit' })
        console.log()
        console.log(chalk.green('  ✅ Update complete with sudo! Version ' + latestVersion + ' installed.'))
        console.log()
        console.log(chalk.dim('  🔄 Restarting with new version...'))
        console.log()
        
        // 📖 Relaunch automatically with the same arguments
        const args = process.argv.slice(2)
        execSync(`node bin/free-coding-models.js ${args.join(' ')}`, { stdio: 'inherit' })
        process.exit(0)
      } catch (sudoErr) {
        console.log()
        console.log(chalk.red('  ✖ Update failed even with sudo. Try manually:'))
        console.log(chalk.dim('    sudo npm i -g free-coding-models@' + latestVersion))
        console.log()
      }
    } else {
      console.log(chalk.red('  ✖ Update failed. Try manually: npm i -g free-coding-models@' + latestVersion))
      console.log()
    }
  }
  process.exit(1)
}

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

// ─── Update notification menu ──────────────────────────────────────────────
// 📖 Shown ONLY when a new version is available, to prompt user to update
// 📖 Centered, clean presentation that doesn't block normal usage
// 📖 Returns 'update', 'changelogs', or null to continue without update
async function promptUpdateNotification(latestVersion) {
  if (!latestVersion) return null

  return new Promise((resolve) => {
    let selected = 0
    const options = [
      {
        label: 'Update now',
        icon: '⬆',
        description: `Update free-coding-models to v${latestVersion}`,
      },
      {
        label: 'Read Changelogs',
        icon: '📋',
        description: 'Open GitHub changelog',
      },
      {
        label: 'Continue without update',
        icon: '▶',
        description: 'Use current version',
      },
    ]

    // 📖 Centered render function
    const render = () => {
      process.stdout.write('\x1b[2J\x1b[H') // clear screen + cursor home
      
      // 📖 Calculate centering
      const terminalWidth = process.stdout.columns || 80
      const maxWidth = Math.min(terminalWidth - 4, 70)
      const centerPad = ' '.repeat(Math.max(0, Math.floor((terminalWidth - maxWidth) / 2)))
      
      console.log()
      console.log(centerPad + chalk.bold.red('  ⚠ UPDATE AVAILABLE'))
      console.log(centerPad + chalk.red(`  Version ${latestVersion} is ready to install`))
      console.log()
      console.log(centerPad + chalk.bold('  ⚡ Free Coding Models') + chalk.dim(` v${LOCAL_VERSION}`))
      console.log()
      
      for (let i = 0; i < options.length; i++) {
        const isSelected = i === selected
        const bullet = isSelected ? chalk.bold.cyan('  ❯ ') : chalk.dim('    ')
        const label = isSelected
          ? chalk.bold.white(options[i].icon + ' ' + options[i].label)
          : chalk.dim(options[i].icon + ' ' + options[i].label)
        
        console.log(centerPad + bullet + label)
        console.log(centerPad + chalk.dim('       ' + options[i].description))
        console.log()
      }
      
      console.log(centerPad + chalk.dim('  ↑↓ Navigate  •  Enter Select  •  Ctrl+C Continue'))
      console.log()
    }

    render()

    readline.emitKeypressEvents(process.stdin)
    if (process.stdin.isTTY) process.stdin.setRawMode(true)

    const onKey = (_str, key) => {
      if (!key) return
      if (key.ctrl && key.name === 'c') {
        if (process.stdin.isTTY) process.stdin.setRawMode(false)
        process.stdin.removeListener('keypress', onKey)
        resolve(null) // Continue without update
        return
      }
      if (key.name === 'up' && selected > 0) {
        selected--
        render()
      } else if (key.name === 'down' && selected < options.length - 1) {
        selected++
        render()
      } else if (key.name === 'return') {
        if (process.stdin.isTTY) process.stdin.setRawMode(false)
        process.stdin.removeListener('keypress', onKey)
        process.stdin.pause()
        
        if (selected === 0) resolve('update')
        else if (selected === 1) resolve('changelogs')
        else resolve(null) // Continue without update
      }
    }

    process.stdin.on('keypress', onKey)
  })
}

// ─── Alternate screen control ─────────────────────────────────────────────────
// 📖 \x1b[?1049h = enter alt screen  \x1b[?1049l = leave alt screen
// 📖 \x1b[?25l   = hide cursor       \x1b[?25h   = show cursor
// 📖 \x1b[H      = cursor to top
// 📖 NOTE: We avoid \x1b[2J (clear screen) because Ghostty scrolls cleared
// 📖 content into the scrollback on the alt screen, pushing the header off-screen.
// 📖 Instead we overwrite in place: cursor home, then \x1b[K (erase to EOL) per line.
// 📖 \x1b[?7l disables auto-wrap so wide rows clip at the right edge instead of
// 📖 wrapping to the next line (which would double the row height and overflow).
const ALT_ENTER  = '\x1b[?1049h\x1b[?25l\x1b[?7l'
const ALT_LEAVE  = '\x1b[?7h\x1b[?1049l\x1b[?25h'
const ALT_HOME   = '\x1b[H'

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

// 📖 Core logic functions (getAvg, getVerdict, getUptime, sortResults, etc.)
// 📖 are imported from lib/utils.js for testability

// ─── Viewport calculation ────────────────────────────────────────────────────
// 📖 Computes the visible slice of model rows that fits in the terminal.
// 📖 Fixed lines: 5 header + 5 footer = 10 lines always consumed.
// 📖 Header: empty, title, empty, column headers, separator (5)
// 📖 Footer: empty, hints, empty, credit, empty (5)
// 📖 When scroll indicators are needed, they each consume 1 line from the model budget.
function calculateViewport(terminalRows, scrollOffset, totalModels) {
  if (terminalRows <= 0) return { startIdx: 0, endIdx: totalModels, hasAbove: false, hasBelow: false }
  let maxSlots = terminalRows - 10  // 5 header + 5 footer
  if (maxSlots < 1) maxSlots = 1
  if (totalModels <= maxSlots) return { startIdx: 0, endIdx: totalModels, hasAbove: false, hasBelow: false }

  const hasAbove = scrollOffset > 0
  const hasBelow = scrollOffset + maxSlots - (hasAbove ? 1 : 0) < totalModels
  // Recalculate with indicator lines accounted for
  const modelSlots = maxSlots - (hasAbove ? 1 : 0) - (hasBelow ? 1 : 0)
  const endIdx = Math.min(scrollOffset + modelSlots, totalModels)
  return { startIdx: scrollOffset, endIdx, hasAbove, hasBelow }
}

// 📖 renderTable: mode param controls footer hint text (opencode vs openclaw)
function renderTable(results, pendingPings, frame, cursor = null, sortColumn = 'avg', sortDirection = 'asc', pingInterval = PING_INTERVAL, lastPingTime = Date.now(), mode = 'opencode', tierFilterMode = 0, scrollOffset = 0, terminalRows = 0) {
  // 📖 Filter out hidden models for display
  const visibleResults = results.filter(r => !r.hidden)

  const up      = visibleResults.filter(r => r.status === 'up').length
  const down    = visibleResults.filter(r => r.status === 'down').length
  const timeout = visibleResults.filter(r => r.status === 'timeout').length
  const pending = visibleResults.filter(r => r.status === 'pending').length

  // 📖 Calculate seconds until next ping
  const timeSinceLastPing = Date.now() - lastPingTime
  const timeUntilNextPing = Math.max(0, pingInterval - timeSinceLastPing)
  const secondsUntilNext = Math.ceil(timeUntilNextPing / 1000)

  const phase = pending > 0
    ? chalk.dim(`discovering — ${pending} remaining…`)
    : pendingPings > 0
      ? chalk.dim(`pinging — ${pendingPings} in flight…`)
      : chalk.dim(`next ping ${secondsUntilNext}s`)

  // 📖 Mode badge shown in header so user knows what Enter will do
  // 📖 Now includes key hint for mode toggle
  let modeBadge
  if (mode === 'openclaw') {
    modeBadge = chalk.bold.rgb(255, 100, 50)(' [🦞 OpenClaw]')
  } else if (mode === 'opencode-desktop') {
    modeBadge = chalk.bold.rgb(0, 200, 255)(' [🖥 Desktop]')
  } else {
    modeBadge = chalk.bold.rgb(0, 200, 255)(' [💻 CLI]')
  }
  
  // 📖 Add mode toggle hint
  const modeHint = chalk.dim.yellow(' (Z to toggle)')

  // 📖 Tier filter badge shown when filtering is active
  let tierBadge = ''
  if (tierFilterMode > 0) {
    const tierNames = ['All', 'S+/S', 'A+/A/A-', 'B+/B', 'C']
    tierBadge = chalk.bold.rgb(255, 200, 0)(` [${tierNames[tierFilterMode]}]`)
  }

  // 📖 Column widths (generous spacing with margins)
  const W_RANK = 6
  const W_TIER = 6
  const W_CTW = 6
  const W_SOURCE = 14
  const W_MODEL = 26
  const W_SWE = 9
  const W_PING = 14
  const W_AVG = 11
  const W_STATUS = 18
  const W_VERDICT = 14
  const W_UPTIME = 6

  // 📖 Sort models using the shared helper
  const sorted = sortResults(visibleResults, sortColumn, sortDirection)

  const lines = [
    '',
    `  ${chalk.bold('⚡ Free Coding Models')} ${chalk.dim('v' + LOCAL_VERSION)}${modeBadge}${modeHint}${tierBadge}   ` +
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
  const sweH     = sortColumn === 'swe' ? dir + ' SWE%' : 'SWE%'
  const ctwH     = sortColumn === 'ctw' ? dir + ' CTW' : 'CTW'
  const pingH    = sortColumn === 'ping' ? dir + ' Latest Ping' : 'Latest Ping'
  const avgH     = sortColumn === 'avg' ? dir + ' Avg Ping' : 'Avg Ping'
  const healthH  = sortColumn === 'condition' ? dir + ' Health' : 'Health'
  const verdictH = sortColumn === 'verdict' ? dir + ' Verdict' : 'Verdict'
  const uptimeH  = sortColumn === 'uptime' ? dir + ' Up%' : 'Up%'

  // 📖 Helper to colorize first letter for keyboard shortcuts
  // 📖 IMPORTANT: Pad PLAIN TEXT first, then apply colors to avoid alignment issues
  const colorFirst = (text, width, colorFn = chalk.yellow) => {
    const first = text[0]
    const rest = text.slice(1)
    const plainText = first + rest
    const padding = ' '.repeat(Math.max(0, width - plainText.length))
    return colorFn(first) + chalk.dim(rest + padding)
  }

  // 📖 Now colorize after padding is calculated on plain text
  const rankH_c    = colorFirst(rankH, W_RANK)
  const tierH_c    = colorFirst('Tier', W_TIER)
  const originH_c  = sortColumn === 'origin' ? chalk.bold.cyan(originH.padEnd(W_SOURCE)) : colorFirst(originH, W_SOURCE)
  const modelH_c   = colorFirst(modelH, W_MODEL)
  const sweH_c     = sortColumn === 'swe' ? chalk.bold.cyan(sweH.padEnd(W_SWE)) : colorFirst(sweH, W_SWE)
  const ctwH_c     = sortColumn === 'ctw' ? chalk.bold.cyan(ctwH.padEnd(W_CTW)) : colorFirst(ctwH, W_CTW)
  const pingH_c    = sortColumn === 'ping' ? chalk.bold.cyan(pingH.padEnd(W_PING)) : colorFirst('Latest Ping', W_PING)
  const avgH_c     = sortColumn === 'avg' ? chalk.bold.cyan(avgH.padEnd(W_AVG)) : colorFirst('Avg Ping', W_AVG)
  const healthH_c  = sortColumn === 'condition' ? chalk.bold.cyan(healthH.padEnd(W_STATUS)) : colorFirst('Health', W_STATUS)
  const verdictH_c = sortColumn === 'verdict' ? chalk.bold.cyan(verdictH.padEnd(W_VERDICT)) : colorFirst(verdictH, W_VERDICT)
  const uptimeH_c  = sortColumn === 'uptime' ? chalk.bold.cyan(uptimeH.padStart(W_UPTIME)) : colorFirst(uptimeH, W_UPTIME, chalk.green)

  // 📖 Header with proper spacing (column order: Rank, Tier, SWE%, CTW, Model, Origin, Latest Ping, Avg Ping, Health, Verdict, Up%)
  lines.push('  ' + rankH_c + '  ' + tierH_c + '  ' + sweH_c + '  ' + ctwH_c + '  ' + modelH_c + '  ' + originH_c + '  ' + pingH_c + '  ' + avgH_c + '  ' + healthH_c + '  ' + verdictH_c + '  ' + uptimeH_c)

  // 📖 Separator line
  lines.push(
    '  ' +
    chalk.dim('─'.repeat(W_RANK)) + '  ' +
    chalk.dim('─'.repeat(W_TIER)) + '  ' +
    chalk.dim('─'.repeat(W_SWE)) + '  ' +
    chalk.dim('─'.repeat(W_CTW)) + '  ' +
    '─'.repeat(W_MODEL) + '  ' +
    '─'.repeat(W_SOURCE) + '  ' +
    chalk.dim('─'.repeat(W_PING)) + '  ' +
    chalk.dim('─'.repeat(W_AVG)) + '  ' +
    chalk.dim('─'.repeat(W_STATUS)) + '  ' +
    chalk.dim('─'.repeat(W_VERDICT)) + '  ' +
    chalk.dim('─'.repeat(W_UPTIME))
  )

  // 📖 Viewport clipping: only render models that fit on screen
  const vp = calculateViewport(terminalRows, scrollOffset, sorted.length)

  if (vp.hasAbove) {
    lines.push(chalk.dim(`  ... ${vp.startIdx} more above ...`))
  }

  for (let i = vp.startIdx; i < vp.endIdx; i++) {
    const r = sorted[i]
    const tierFn = TIER_COLOR[r.tier] ?? (t => chalk.white(t))

    const isCursor = cursor !== null && i === cursor

    // 📖 Left-aligned columns - pad plain text first, then colorize
    const num = chalk.dim(String(r.idx).padEnd(W_RANK))
    const tier = tierFn(r.tier.padEnd(W_TIER))
    const source = chalk.green('NIM'.padEnd(W_SOURCE))
    const name = r.label.slice(0, W_MODEL).padEnd(W_MODEL)
    const sweScore = r.sweScore ?? '—'
    const sweCell = sweScore !== '—' && parseFloat(sweScore) >= 50 
      ? chalk.greenBright(sweScore.padEnd(W_SWE))
      : sweScore !== '—' && parseFloat(sweScore) >= 30
      ? chalk.yellow(sweScore.padEnd(W_SWE))
      : chalk.dim(sweScore.padEnd(W_SWE))
    
    // 📖 Context window column - colorized by size (larger = better)
    const ctwRaw = r.ctw ?? '—'
    const ctwCell = ctwRaw !== '—' && (ctwRaw.includes('128k') || ctwRaw.includes('200k') || ctwRaw.includes('1m'))
      ? chalk.greenBright(ctwRaw.padEnd(W_CTW))
      : ctwRaw !== '—' && (ctwRaw.includes('32k') || ctwRaw.includes('64k'))
      ? chalk.cyan(ctwRaw.padEnd(W_CTW))
      : chalk.dim(ctwRaw.padEnd(W_CTW))

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

    // 📖 Build row with double space between columns (order: Rank, Tier, SWE%, CTW, Model, Origin, Latest Ping, Avg Ping, Health, Verdict, Up%)
    const row = '  ' + num + '  ' + tier + '  ' + sweCell + '  ' + ctwCell + '  ' + name + '  ' + source + '  ' + pingCell + '  ' + avgCell + '  ' + status + '  ' + speedCell + '  ' + uptimeCell

    if (isCursor) {
      lines.push(chalk.bgRgb(139, 0, 139)(row))
    } else {
      lines.push(row)
    }
  }

  if (vp.hasBelow) {
    lines.push(chalk.dim(`  ... ${sorted.length - vp.endIdx} more below ...`))
  }

  lines.push('')
  const intervalSec = Math.round(pingInterval / 1000)

  // 📖 Footer hints adapt based on active mode
  const actionHint = mode === 'openclaw'
    ? chalk.rgb(255, 100, 50)('Enter→SetOpenClaw')
    : mode === 'opencode-desktop'
      ? chalk.rgb(0, 200, 255)('Enter→OpenDesktop')
      : chalk.rgb(0, 200, 255)('Enter→OpenCode')
  lines.push(chalk.dim(`  ↑↓ Navigate  •  `) + actionHint + chalk.dim(`  •  R/T/O/M/L/A/S/C/H/V/U Sort  •  W↓/X↑ Interval (${intervalSec}s)  •  T Tier  •  Z Mode  •  Ctrl+C Exit`))
  lines.push('')
  lines.push(chalk.dim('  Made with ') + '💖 & ☕' + chalk.dim(' by ') + '\x1b]8;;https://github.com/vava-nessa\x1b\\vava-nessa\x1b]8;;\x1b\\' + chalk.dim('  •  ') + '💬 ' + chalk.cyanBright('\x1b]8;;https://discord.gg/WKA3TwYVuZ\x1b\\Join Free-Coding-Models Discord!\x1b]8;;\x1b\\') + chalk.dim('  •  ') + '⭐ ' + '\x1b]8;;https://github.com/vava-nessa/free-coding-models\x1b\\Read the docs on GitHub\x1b]8;;\x1b\\')
  lines.push('')
  // 📖 Append \x1b[K (erase to EOL) to each line so leftover chars from previous
  // 📖 frames are cleared. Then pad with blank cleared lines to fill the terminal,
  // 📖 preventing stale content from lingering at the bottom after resize.
  const EL = '\x1b[K'
  const cleared = lines.map(l => l + EL)
  const remaining = terminalRows > 0 ? Math.max(0, terminalRows - cleared.length) : 0
  for (let i = 0; i < remaining; i++) cleared.push(EL)
  return cleared.join('\n')
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
// 📖 Platform-specific config path
const isWindows = process.platform === 'win32'
const isMac = process.platform === 'darwin'
const isLinux = process.platform === 'linux'

// 📖 OpenCode config location varies by platform
// 📖 Windows: %APPDATA%\opencode\opencode.json (or sometimes ~/.config/opencode)
// 📖 macOS/Linux: ~/.config/opencode/opencode.json
const OPENCODE_CONFIG = isWindows 
  ? join(homedir(), 'AppData', 'Roaming', 'opencode', 'opencode.json')
  : join(homedir(), '.config', 'opencode', 'opencode.json')

// 📖 Fallback to .config on Windows if AppData doesn't exist
const OPENCODE_CONFIG_FALLBACK = join(homedir(), '.config', 'opencode', 'opencode.json')

function getOpenCodeConfigPath() {
  if (existsSync(OPENCODE_CONFIG)) return OPENCODE_CONFIG
  if (isWindows && existsSync(OPENCODE_CONFIG_FALLBACK)) return OPENCODE_CONFIG_FALLBACK
  return OPENCODE_CONFIG
}

function loadOpenCodeConfig() {
  const configPath = getOpenCodeConfigPath()
  if (!existsSync(configPath)) return { provider: {} }
  try {
    return JSON.parse(readFileSync(configPath, 'utf8'))
  } catch {
    return { provider: {} }
  }
}

function saveOpenCodeConfig(config) {
  const configPath = getOpenCodeConfigPath()
  const dir = dirname(configPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(configPath, JSON.stringify(config, null, 2))
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
    const backupPath = `${getOpenCodeConfigPath()}.backup-${Date.now()}`

    // 📖 Backup current config
    if (existsSync(getOpenCodeConfigPath())) {
      copyFileSync(getOpenCodeConfigPath(), backupPath)
      console.log(chalk.dim(`  💾 Backup: ${backupPath}`))
    }

    // 📖 Update default model to nvidia/model_id
    config.model = `nvidia/${model.modelId}`

    // 📖 Register the model in the nvidia provider's models section
    // 📖 OpenCode requires models to be explicitly listed in provider.models
    // 📖 to recognize them — without this, it falls back to the previous default
    if (config.provider?.nvidia) {
      if (!config.provider.nvidia.models) config.provider.nvidia.models = {}
      config.provider.nvidia.models[model.modelId] = {
        name: model.label,
      }
    }

    saveOpenCodeConfig(config)

    // 📖 Verify config was saved correctly
    const savedConfig = loadOpenCodeConfig()
    console.log(chalk.dim(`  📝 Config saved to: ${getOpenCodeConfigPath()}`))
    console.log(chalk.dim(`  📝 Default model in config: ${savedConfig.model || 'NOT SET'}`))
    console.log()
    
    if (savedConfig.model === config.model) {
      console.log(chalk.green(`  ✓ Default model set to: nvidia/${model.modelId}`))
    } else {
      console.log(chalk.yellow(`  ⚠ Config might not have been saved correctly`))
    }
    console.log()
    console.log(chalk.dim('  Starting OpenCode…'))
    console.log()

    // 📖 Launch OpenCode and wait for it
    // 📖 Use --model flag to ensure the model is selected
    const { spawn } = await import('child_process')
    const child = spawn('opencode', ['--model', `nvidia/${model.modelId}`], {
      stdio: 'inherit',
      shell: true,
      detached: false
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

    const configPath = getOpenCodeConfigPath()
    const installPrompt = `Please install NVIDIA NIM provider in OpenCode by adding this to ${configPath}:

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

${isWindows ? 'set NVIDIA_API_KEY=your_key_here' : 'export NVIDIA_API_KEY=your_key_here'}

After installation, you can use: opencode --model nvidia/${model.modelId}`

    console.log(chalk.cyan(installPrompt))
    console.log()
    console.log(chalk.dim('  Starting OpenCode…'))
    console.log()

    const { spawn } = await import('child_process')
    const child = spawn('opencode', [], {
      stdio: 'inherit',
      shell: true,
      detached: false
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

// ─── Start OpenCode Desktop ─────────────────────────────────────────────────────
// 📖 startOpenCodeDesktop: Same config logic as startOpenCode, but opens the Desktop app.
// 📖 OpenCode Desktop shares config at the same location as CLI.
// 📖 No need to wait for exit — Desktop app stays open independently.
async function startOpenCodeDesktop(model) {
  const hasNim = checkNvidiaNimConfig()

  if (hasNim) {
    console.log(chalk.green(`  🖥 Setting ${chalk.bold(model.label)} as default for OpenCode Desktop…`))
    console.log(chalk.dim(`  Model: nvidia/${model.modelId}`))
    console.log()

    const config = loadOpenCodeConfig()
    const backupPath = `${getOpenCodeConfigPath()}.backup-${Date.now()}`

    if (existsSync(getOpenCodeConfigPath())) {
      copyFileSync(getOpenCodeConfigPath(), backupPath)
      console.log(chalk.dim(`  💾 Backup: ${backupPath}`))
    }

    config.model = `nvidia/${model.modelId}`

    if (config.provider?.nvidia) {
      if (!config.provider.nvidia.models) config.provider.nvidia.models = {}
      config.provider.nvidia.models[model.modelId] = {
        name: model.label,
      }
    }

    saveOpenCodeConfig(config)

    // 📖 Verify config was saved correctly
    const savedConfig = loadOpenCodeConfig()
    console.log(chalk.dim(`  📝 Config saved to: ${getOpenCodeConfigPath()}`))
    console.log(chalk.dim(`  📝 Default model in config: ${savedConfig.model || 'NOT SET'}`))
    console.log()
    
    if (savedConfig.model === config.model) {
      console.log(chalk.green(`  ✓ Default model set to: nvidia/${model.modelId}`))
    } else {
      console.log(chalk.yellow(`  ⚠ Config might not have been saved correctly`))
    }
    console.log()
    console.log(chalk.dim('  Opening OpenCode Desktop…'))
    console.log()

    // 📖 Launch Desktop app based on platform
    const { exec } = await import('child_process')
    
    let command
    if (isMac) {
      command = 'open -a OpenCode'
    } else if (isWindows) {
      // 📖 On Windows, try common installation paths
      // 📖 User installation: %LOCALAPPDATA%\Programs\OpenCode\OpenCode.exe
      // 📖 System installation: C:\Program Files\OpenCode\OpenCode.exe
      command = 'start "" "%LOCALAPPDATA%\\Programs\\OpenCode\\OpenCode.exe" 2>nul || start "" "%PROGRAMFILES%\\OpenCode\\OpenCode.exe" 2>nul || start OpenCode'
    } else if (isLinux) {
      // 📖 On Linux, try different methods with model flag
      // 📖 Check if opencode-desktop exists, otherwise try xdg-open
      command = `opencode-desktop --model nvidia/${model.modelId} 2>/dev/null || flatpak run ai.opencode.OpenCode --model nvidia/${model.modelId} 2>/dev/null || snap run opencode --model nvidia/${model.modelId} 2>/dev/null || xdg-open /usr/share/applications/opencode.desktop 2>/dev/null || echo "OpenCode not found"`
    }

    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error(chalk.red('  ✗ Could not open OpenCode Desktop'))
        if (isWindows) {
          console.error(chalk.dim('    Make sure OpenCode is installed from https://opencode.ai'))
        } else if (isLinux) {
          console.error(chalk.dim('    Install via: snap install opencode OR flatpak install ai.opencode.OpenCode'))
          console.error(chalk.dim('    Or download from https://opencode.ai'))
        } else {
          console.error(chalk.dim('    Is it installed at /Applications/OpenCode.app?'))
        }
      }
    })
  } else {
    console.log(chalk.yellow('  ⚠ NVIDIA NIM not configured in OpenCode'))
    console.log(chalk.dim('  Please configure it first. Config is shared between CLI and Desktop.'))
    console.log()
    
    const configPath = getOpenCodeConfigPath()
    const installPrompt = `Add this to ${configPath}:

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

${isWindows ? 'set NVIDIA_API_KEY=your_key_here' : 'export NVIDIA_API_KEY=your_key_here'}`
    console.log(chalk.cyan(installPrompt))
    console.log()
  }
}

// ─── OpenClaw integration ──────────────────────────────────────────────────────
// 📖 OpenClaw config: ~/.openclaw/openclaw.json (JSON format, may be JSON5 in newer versions)
// 📖 To set a model: set agents.defaults.model.primary = "nvidia/model-id"
// 📖 Providers section uses baseUrl + apiKey + api: "openai-completions" format
// 📖 See: https://docs.openclaw.ai/gateway/configuration
const OPENCLAW_CONFIG = join(homedir(), '.openclaw', 'openclaw.json')

function loadOpenClawConfig() {
  if (!existsSync(OPENCLAW_CONFIG)) return {}
  try {
    // 📖 JSON.parse works for standard JSON; OpenClaw may use JSON5 but base config is valid JSON
    return JSON.parse(readFileSync(OPENCLAW_CONFIG, 'utf8'))
  } catch {
    return {}
  }
}

function saveOpenClawConfig(config) {
  const dir = join(homedir(), '.openclaw')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(OPENCLAW_CONFIG, JSON.stringify(config, null, 2))
}

// 📖 startOpenClaw: sets the selected NVIDIA NIM model as default in OpenClaw config.
// 📖 Also ensures the nvidia provider block is present with the NIM base URL.
// 📖 Does NOT launch OpenClaw — OpenClaw runs as a daemon, so config changes are picked up on restart.
async function startOpenClaw(model, apiKey) {
  console.log(chalk.rgb(255, 100, 50)(`  🦞 Setting ${chalk.bold(model.label)} as OpenClaw default…`))
  console.log(chalk.dim(`  Model: nvidia/${model.modelId}`))
  console.log()

  const config = loadOpenClawConfig()

  // 📖 Backup existing config before touching it
  if (existsSync(OPENCLAW_CONFIG)) {
    const backupPath = `${OPENCLAW_CONFIG}.backup-${Date.now()}`
    copyFileSync(OPENCLAW_CONFIG, backupPath)
    console.log(chalk.dim(`  💾 Backup: ${backupPath}`))
  }

  // 📖 Patch models.json to add all NVIDIA models (fixes "not allowed" errors)
  const patchResult = patchOpenClawModelsJson()
  if (patchResult.wasPatched) {
    console.log(chalk.dim(`  ✨ Added ${patchResult.added} NVIDIA models to allowlist (${patchResult.total} total)`))
    if (patchResult.backup) {
      console.log(chalk.dim(`  💾 models.json backup: ${patchResult.backup}`))
    }
  }

  // 📖 Ensure models.providers section exists with nvidia NIM block.
  // 📖 Per OpenClaw docs (docs.openclaw.ai/providers/nvidia), providers MUST be nested under
  // 📖 "models.providers", NOT at the config root. Root-level "providers" is ignored by OpenClaw.
  // 📖 API key is NOT stored in the provider block — it's read from env var NVIDIA_API_KEY.
  // 📖 If needed, it can be stored under the root "env" key: { env: { NVIDIA_API_KEY: "nvapi-..." } }
  if (!config.models) config.models = {}
  if (!config.models.providers) config.models.providers = {}
  if (!config.models.providers.nvidia) {
    config.models.providers.nvidia = {
      baseUrl: 'https://integrate.api.nvidia.com/v1',
      api: 'openai-completions',
    }
    console.log(chalk.dim('  ➕ Added nvidia provider block to OpenClaw config (models.providers.nvidia)'))
  }

  // 📖 Store API key in the root "env" section so OpenClaw can read it as NVIDIA_API_KEY env var.
  // 📖 Only writes if not already set to avoid overwriting an existing key.
  const resolvedKey = apiKey || process.env.NVIDIA_API_KEY
  if (resolvedKey) {
    if (!config.env) config.env = {}
    if (!config.env.NVIDIA_API_KEY) {
      config.env.NVIDIA_API_KEY = resolvedKey
      console.log(chalk.dim('  🔑 Stored NVIDIA_API_KEY in config env section'))
    }
  }

  // 📖 Set as the default primary model for all agents.
  // 📖 Format: "provider/model-id" — e.g. "nvidia/deepseek-ai/deepseek-v3.2"
  // 📖 Set as the default primary model for all agents.
  // 📖 Format: "provider/model-id" — e.g. "nvidia/deepseek-ai/deepseek-v3.2"
  if (!config.agents) config.agents = {}
  if (!config.agents.defaults) config.agents.defaults = {}
  if (!config.agents.defaults.model) config.agents.defaults.model = {}
  config.agents.defaults.model.primary = `nvidia/${model.modelId}`

  // 📖 REQUIRED: OpenClaw requires the model to be explicitly listed in agents.defaults.models
  // 📖 (the allowlist). Without this entry, OpenClaw rejects the model with "not allowed".
  // 📖 See: https://docs.openclaw.ai/gateway/configuration-reference
  if (!config.agents.defaults.models) config.agents.defaults.models = {}
  config.agents.defaults.models[`nvidia/${model.modelId}`] = {}

  saveOpenClawConfig(config)

  console.log(chalk.rgb(255, 140, 0)(`  ✓ Default model set to: nvidia/${model.modelId}`))
  console.log()
  console.log(chalk.dim('  📄 Config updated: ' + OPENCLAW_CONFIG))
  console.log()
  // 📖 "openclaw restart" does NOT exist. The gateway auto-reloads on config file changes.
  // 📖 To apply manually: use "openclaw models set" or "openclaw configure"
  // 📖 See: https://docs.openclaw.ai/gateway/configuration
  console.log(chalk.dim('  💡 OpenClaw will reload config automatically (gateway.reload.mode).'))
  console.log(chalk.dim('     To apply manually: openclaw models set nvidia/' + model.modelId))
  console.log(chalk.dim('     Or run the setup wizard: openclaw configure'))
  console.log()
}

// ─── Helper function to find best model after analysis ────────────────────────
// 📖 findBestModel is imported from lib/utils.js

// ─── Function to run in fiable mode (10-second analysis then output best model) ──
async function runFiableMode(apiKey) {
  console.log(chalk.cyan('  ⚡ Analyzing models for reliability (10 seconds)...'))
  console.log()

  let results = MODELS.map(([modelId, label, tier, sweScore, ctw], i) => ({
    idx: i + 1, modelId, label, tier, sweScore, ctw,
    status: 'pending',
    pings: [],
    httpCode: null,
  }))

  const startTime = Date.now()
  const analysisDuration = 10000 // 10 seconds

  // 📖 Run initial pings
  const pingPromises = results.map(r => ping(apiKey, r.modelId).then(({ code, ms }) => {
    r.pings.push({ ms, code })
    if (code === '200') {
      r.status = 'up'
    } else if (code === '000') {
      r.status = 'timeout'
    } else {
      r.status = 'down'
      r.httpCode = code
    }
  }))

  await Promise.allSettled(pingPromises)

  // 📖 Continue pinging for the remaining time
  const remainingTime = Math.max(0, analysisDuration - (Date.now() - startTime))
  if (remainingTime > 0) {
    await new Promise(resolve => setTimeout(resolve, remainingTime))
  }

  // 📖 Find best model
  const best = findBestModel(results)

  if (!best) {
    console.log(chalk.red('  ✖ No reliable model found'))
    process.exit(1)
  }

  // 📖 Output in format: provider/name
  const provider = 'nvidia' // Always NVIDIA NIM for now
  console.log(chalk.green(`  ✓ Most reliable model:`))
  console.log(chalk.bold(`    ${provider}/${best.modelId}`))
  console.log()
  console.log(chalk.dim(`  📊 Stats:`))
  console.log(chalk.dim(`    Avg ping: ${getAvg(best)}ms`))
  console.log(chalk.dim(`    Uptime: ${getUptime(best)}%`))
  console.log(chalk.dim(`    Status: ${best.status === 'up' ? '✅ UP' : '❌ DOWN'}`))

  process.exit(0)
}

// 📖 filterByTier and TIER_LETTER_MAP are imported from lib/utils.js
// 📖 Wrapper that exits on invalid tier (utils version returns null instead)
function filterByTierOrExit(results, tierLetter) {
  const filtered = filterByTier(results, tierLetter)
  if (filtered === null) {
    console.error(chalk.red(`  ✖ Unknown tier "${tierLetter}". Valid tiers: S, A, B, C`))
    process.exit(1)
  }
  return filtered
}

async function main() {
  // 📖 Simple CLI without flags - just API key handling
  let apiKey = process.env.NVIDIA_API_KEY || loadApiKey()

  if (!apiKey) {
    apiKey = await promptApiKey()
    if (!apiKey) {
      console.log()
      console.log(chalk.red('  ✖ No API key provided.'))
      console.log(chalk.dim('  Run `free-coding-models` again or set NVIDIA_API_KEY env var.'))
      console.log()
      process.exit(1)
    }
  }

  // 📖 Skip update check during development to avoid blocking menus
  // 📖 In production, this will work correctly when versions are published
  const latestVersion = null // Skip update check for now

  // 📖 Default mode: OpenCode CLI
  let mode = 'opencode'

  // 📖 AUTO-UPDATE: Disabled during development
  // 📖 Will be re-enabled when versions are properly published

  // 📖 This section is now handled by the update notification menu above

  // 📖 Create results array with all models initially visible
  let results = MODELS.map(([modelId, label, tier, sweScore, ctw], i) => ({
    idx: i + 1, modelId, label, tier, sweScore, ctw,
    status: 'pending',
    pings: [],  // 📖 All ping results (ms or 'TIMEOUT')
    httpCode: null,
    hidden: false,  // 📖 Simple flag to hide/show models
  }))

  // 📖 No initial filters - all models visible by default

  // 📖 Clamp scrollOffset so cursor is always within the visible viewport window.
  // 📖 Called after every cursor move, sort change, and terminal resize.
  const adjustScrollOffset = (st) => {
    const total = st.results.length
    let maxSlots = st.terminalRows - 10  // 5 header + 5 footer
    if (maxSlots < 1) maxSlots = 1
    if (total <= maxSlots) { st.scrollOffset = 0; return }
    // Ensure cursor is not above the visible window
    if (st.cursor < st.scrollOffset) {
      st.scrollOffset = st.cursor
    }
    // Ensure cursor is not below the visible window
    // Account for indicator lines eating into model slots
    const hasAbove = st.scrollOffset > 0
    const tentativeBelow = st.scrollOffset + maxSlots - (hasAbove ? 1 : 0) < total
    const modelSlots = maxSlots - (hasAbove ? 1 : 0) - (tentativeBelow ? 1 : 0)
    if (st.cursor >= st.scrollOffset + modelSlots) {
      st.scrollOffset = st.cursor - modelSlots + 1
    }
    // Final clamp
    const maxOffset = Math.max(0, total - maxSlots)
    if (st.scrollOffset > maxOffset) st.scrollOffset = maxOffset
    if (st.scrollOffset < 0) st.scrollOffset = 0
  }

  // 📖 Add interactive selection state - cursor index and user's choice
  // 📖 sortColumn: 'rank'|'tier'|'origin'|'model'|'ping'|'avg'|'status'|'verdict'|'uptime'
  // 📖 sortDirection: 'asc' (default) or 'desc'
  // 📖 pingInterval: current interval in ms (default 2000, adjustable with W/X keys)
  // 📖 tierFilter: current tier filter letter (null = all, 'S' = S+/S, 'A' = A+/A/A-, etc.)
  const state = {
    results,
    pendingPings: 0,
    frame: 0,
    cursor: 0,
    selectedModel: null,
    sortColumn: 'avg',
    sortDirection: 'asc',
    pingInterval: PING_INTERVAL,  // 📖 Track current interval for W/X keys
    lastPingTime: Date.now(),     // 📖 Track when last ping cycle started
    mode,                         // 📖 'opencode' or 'openclaw' — controls Enter action
    scrollOffset: 0,              // 📖 First visible model index in viewport
    terminalRows: process.stdout.rows || 24,  // 📖 Current terminal height
  }

  // 📖 Re-clamp viewport on terminal resize
  process.stdout.on('resize', () => {
    state.terminalRows = process.stdout.rows || 24
    adjustScrollOffset(state)
  })

  // 📖 Enter alternate screen — animation runs here, zero scrollback pollution
  process.stdout.write(ALT_ENTER)

  // 📖 Ensure we always leave alt screen cleanly (Ctrl+C, crash, normal exit)
  const exit = (code = 0) => {
    clearInterval(ticker)
    clearTimeout(state.pingIntervalObj)
    process.stdout.write(ALT_LEAVE)
    process.exit(code)
  }
  process.on('SIGINT',  () => exit(0))
  process.on('SIGTERM', () => exit(0))

  // 📖 Tier filtering system - cycles through filter modes
  let tierFilterMode = 0 // 0=all, 1=S+/S, 2=A+/A/A-, 3=B+/B, 4=C
  function applyTierFilter() {
    state.results.forEach(r => {
      switch (tierFilterMode) {
        case 0: // All tiers visible
          r.hidden = false
          break
        case 1: // S+ and S only
          r.hidden = !(r.tier === 'S+' || r.tier === 'S')
          break
        case 2: // A+, A, A- only
          r.hidden = !(r.tier === 'A+' || r.tier === 'A' || r.tier === 'A-')
          break
        case 3: // B+ and B only
          r.hidden = !(r.tier === 'B+' || r.tier === 'B')
          break
        case 4: // C only
          r.hidden = r.tier !== 'C'
          break
      }
    })
    
    return state.results
  }

  // 📖 Setup keyboard input for interactive selection during pings
  // 📖 Use readline with keypress event for arrow key handling
  process.stdin.setEncoding('utf8')
  process.stdin.resume()

  let userSelected = null

  const onKeyPress = async (str, key) => {
    if (!key) return

    // 📖 Sorting keys: R=rank, T=tier, O=origin, M=model, L=latest ping, A=avg ping, S=SWE-bench, C=context window, H=health, V=verdict, U=uptime
    const sortKeys = {
      'r': 'rank', 't': 'tier', 'o': 'origin', 'm': 'model',
      'l': 'ping', 'a': 'avg', 's': 'swe', 'c': 'ctw', 'h': 'condition', 'v': 'verdict', 'u': 'uptime'
    }

    if (sortKeys[key.name]) {
      const col = sortKeys[key.name]
      // 📖 Toggle direction if same column, otherwise reset to asc
      if (state.sortColumn === col) {
        state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc'
      } else {
        state.sortColumn = col
        state.sortDirection = 'asc'
      }
      adjustScrollOffset(state)
      return
    }

    // 📖 Interval adjustment keys: W=decrease (faster), X=increase (slower)
    // 📖 Minimum 1s, maximum 60s
    if (key.name === 'w') {
      state.pingInterval = Math.max(1000, state.pingInterval - 1000)
    } else if (key.name === 'x') {
      state.pingInterval = Math.min(60000, state.pingInterval + 1000)
    }

    // 📖 Tier toggle key: T = cycle through tier filters (all → S+/S → A+/A/A- → B+/B → C → all)
    if (key.name === 't') {
      tierFilterMode = (tierFilterMode + 1) % 5
      applyTierFilter()
      adjustScrollOffset(state)
      return
    }

    // 📖 Mode toggle key: Z = cycle through modes (CLI → Desktop → OpenClaw)
    if (key.name === 'z') {
      const modeOrder = ['opencode', 'opencode-desktop', 'openclaw']
      const currentIndex = modeOrder.indexOf(state.mode)
      const nextIndex = (currentIndex + 1) % modeOrder.length
      state.mode = modeOrder[nextIndex]
      return
    }

    if (key.name === 'x') {
      state.pingInterval = Math.min(60000, state.pingInterval + 1000)
      return
    }

    if (key.name === 'up') {
      if (state.cursor > 0) {
        state.cursor--
        adjustScrollOffset(state)
      }
      return
    }

    if (key.name === 'down') {
      if (state.cursor < results.length - 1) {
        state.cursor++
        adjustScrollOffset(state)
      }
      return
    }

    if (key.name === 'c' && key.ctrl) { // Ctrl+C
      exit(0)
      return
    }

    if (key.name === 'return') { // Enter
      // 📖 Use the same sorting as the table display
      const sorted = sortResults(results, state.sortColumn, state.sortDirection)
      const selected = sorted[state.cursor]
      // 📖 Allow selecting ANY model (even timeout/down) - user knows what they're doing
      userSelected = { modelId: selected.modelId, label: selected.label, tier: selected.tier }

      // 📖 Stop everything and act on selection immediately
      clearInterval(ticker)
      clearTimeout(state.pingIntervalObj)
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

      // 📖 Dispatch to the correct integration based on active mode
      if (state.mode === 'openclaw') {
        await startOpenClaw(userSelected, apiKey)
      } else if (state.mode === 'opencode-desktop') {
        await startOpenCodeDesktop(userSelected)
      } else {
        await startOpenCode(userSelected)
      }
      process.exit(0)
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
    process.stdout.write(ALT_HOME + renderTable(state.results, state.pendingPings, state.frame, state.cursor, state.sortColumn, state.sortDirection, state.pingInterval, state.lastPingTime, state.mode, tierFilterMode, state.scrollOffset, state.terminalRows))
  }, Math.round(1000 / FPS))

  process.stdout.write(ALT_HOME + renderTable(state.results, state.pendingPings, state.frame, state.cursor, state.sortColumn, state.sortDirection, state.pingInterval, state.lastPingTime, state.mode, tierFilterMode, state.scrollOffset, state.terminalRows))

  // ── Continuous ping loop — ping all models every N seconds forever ──────────

  // 📖 Single ping function that updates result
  const pingModel = async (r) => {
    const { code, ms } = await ping(apiKey, r.modelId)

    // 📖 Store ping result as object with ms and code
    // 📖 ms = actual response time (even for errors like 429)
    // 📖 code = HTTP status code ('200', '429', '500', '000' for timeout)
    r.pings.push({ ms, code })

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
  const initialPing = Promise.all(state.results.map(r => pingModel(r)))

  // 📖 Continuous ping loop with dynamic interval (adjustable with W/X keys)
  const schedulePing = () => {
    state.pingIntervalObj = setTimeout(async () => {
      state.lastPingTime = Date.now()

      state.results.forEach(r => {
        pingModel(r).catch(() => {
          // Individual ping failures don't crash the loop
        })
      })

      // 📖 Schedule next ping with current interval
      schedulePing()
    }, state.pingInterval)
  }

  // 📖 Start the ping loop
  state.pingIntervalObj = null
  schedulePing()

  await initialPing

  // 📖 Keep interface running forever - user can select anytime or Ctrl+C to exit
  // 📖 The pings continue running in background with dynamic interval
  // 📖 User can press W to decrease interval (faster pings) or X to increase (slower)
  // 📖 Current interval shown in header: "next ping Xs"
}

main().catch((err) => {
  process.stdout.write(ALT_LEAVE)
  console.error(err)
  process.exit(1)
})
