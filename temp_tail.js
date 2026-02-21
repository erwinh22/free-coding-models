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
      // 📖 Use the same sorting as the table display
      const sorted = sortResults(results, state.sortColumn, state.sortDirection)
      const selected = sorted[state.cursor]
      // 📖 Allow selecting ANY model (even timeout/down) - user knows what they're doing
      if (true) {
        userSelected = { modelId: selected.modelId, label: selected.label, tier: selected.tier }
        // 📖 Stop everything and launch OpenCode immediately
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
    process.stdout.write(ALT_CLEAR + renderTable(state.results, state.pendingPings, state.frame, state.cursor, state.sortColumn, state.sortDirection, state.pingInterval, state.lastPingTime))
  }, Math.round(1000 / FPS))

  process.stdout.write(ALT_CLEAR + renderTable(state.results, state.pendingPings, state.frame, state.cursor, state.sortColumn, state.sortDirection, state.pingInterval, state.lastPingTime))

  // ── Continuous ping loop — ping all models every 10 seconds forever ──────────
  
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
  const initialPing = Promise.all(results.map(r => pingModel(r)))
  
  // 📖 Continuous ping loop with dynamic interval (adjustable with W/X keys)
  const schedulePing = () => {
    state.pingIntervalObj = setTimeout(async () => {
      state.lastPingTime = Date.now()
      
      results.forEach(r => {
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

// 📖 Helper function to find best model after analysis
function findBestModel(results) {
  // 📖 Sort by avg ping (fastest first), then by uptime percentage (most reliable)
  const sorted = [...results].sort((a, b) => {
    const avgA = getAvg(a)
    const avgB = getAvg(b)
    const uptimeA = getUptime(a)
    const uptimeB = getUptime(b)
    
    // 📖 Priority 1: Models that are up (status === 'up')
    if (a.status === 'up' && b.status !== 'up') return -1
    if (a.status !== 'up' && b.status === 'up') return 1
    
    // 📖 Priority 2: Fastest average ping
    if (avgA !== avgB) return avgA - avgB
    
    // 📖 Priority 3: Highest uptime percentage
    return uptimeB - uptimeA
  })
  
  return sorted.length > 0 ? sorted[0] : null
}

// 📖 Function to run in fiable mode (10-second analysis then output best model)
async function runFiableMode(apiKey) {
  console.log(chalk.cyan('  ⚡ Analyzing models for reliability (10 seconds)...'))
  console.log()
  
  let results = MODELS.map(([modelId, label, tier], i) => ({
    idx: i + 1, modelId, label, tier,
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

async function main() {
  // 📖 Priority: CLI arg > env var > saved config > wizard
  let apiKey = process.argv[2] || process.env.NVIDIA_API_KEY || loadApiKey()
  
  // 📖 Check for CLI flags
  const bestMode = process.argv.includes('--BEST') || process.argv.includes('--best')
  const fiableMode = process.argv.includes('--FABLE') || process.argv.includes('--fiable')
  
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
  
  // 📖 Handle fiable mode first (it exits after analysis)
  if (fiableMode) {
    await runFiableMode(apiKey)
  }
