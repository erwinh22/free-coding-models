/**
 * @file test/test.js
 * @description Unit tests for free-coding-models using Node.js built-in test runner.
 *
 * 📖 Run with: `node --test test/test.js` or `pnpm test`
 * 📖 Uses node:test + node:assert (zero dependencies, works on Node 18+)
 *
 * @functions
 *   → sources.js data integrity — validates model array structure, tiers, uniqueness
 *   → Core logic — getAvg, getVerdict, getUptime, filterByTier, sortResults, findBestModel
 *   → CLI arg parsing — parseArgs covers all flag combinations
 *   → Package & CLI sanity — package.json fields, bin entry, shebang, imports
 *
 * @see lib/utils.js — the functions under test
 * @see sources.js — model data validated here
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, accessSync, constants } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// 📖 Import modules under test
import { nvidiaNim, sources, MODELS } from '../sources.js'
import {
  getAvg, getVerdict, getUptime, getP95, getJitter, getStabilityScore,
  sortResults, filterByTier, findBestModel, parseArgs,
  TIER_ORDER, VERDICT_ORDER, TIER_LETTER_MAP
} from '../lib/utils.js'

// ─── Helper: create a mock model result ──────────────────────────────────────
// 📖 Builds a minimal result object matching the shape used by the main script
function mockResult(overrides = {}) {
  return {
    idx: 1,
    modelId: 'test/model',
    label: 'Test Model',
    tier: 'S',
    sweScore: '50.0%',
    ctx: '128k',
    status: 'up',
    pings: [],
    httpCode: null,
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📖 1. SOURCES.JS DATA INTEGRITY
// ═══════════════════════════════════════════════════════════════════════════════
describe('sources.js data integrity', () => {
  const VALID_TIERS = ['S+', 'S', 'A+', 'A', 'A-', 'B+', 'B', 'C']

  it('nvidiaNim is a non-empty array', () => {
    assert.ok(Array.isArray(nvidiaNim))
    assert.ok(nvidiaNim.length > 0, 'nvidiaNim should have models')
  })

  it('every model entry has [modelId, label, tier, sweScore, ctx] structure', () => {
    for (const entry of nvidiaNim) {
      assert.ok(Array.isArray(entry), `Entry should be an array: ${JSON.stringify(entry)}`)
      assert.equal(entry.length, 5, `Entry should have 5 elements: ${JSON.stringify(entry)}`)
      assert.equal(typeof entry[0], 'string', `modelId should be string: ${entry[0]}`)
      assert.equal(typeof entry[1], 'string', `label should be string: ${entry[1]}`)
      assert.equal(typeof entry[2], 'string', `tier should be string: ${entry[2]}`)
      assert.equal(typeof entry[3], 'string', `sweScore should be string: ${entry[3]}`)
      assert.equal(typeof entry[4], 'string', `ctx should be string: ${entry[4]}`)
    }
  })

  it('all tiers are valid', () => {
    for (const [modelId, , tier] of nvidiaNim) {
      assert.ok(VALID_TIERS.includes(tier), `Invalid tier "${tier}" for model "${modelId}"`)
    }
  })

  it('no duplicate model IDs', () => {
    const ids = nvidiaNim.map(m => m[0])
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
    assert.deepEqual(dupes, [], `Duplicate model IDs found: ${dupes.join(', ')}`)
  })

  it('MODELS flat array matches sources count', () => {
    let totalFromSources = 0
    for (const s of Object.values(sources)) {
      totalFromSources += s.models.length
    }
    assert.equal(MODELS.length, totalFromSources, 'MODELS length should match sum of all source models')
  })

  it('sources object has nvidia key with correct structure', () => {
    assert.ok(sources.nvidia, 'sources.nvidia should exist')
    assert.equal(sources.nvidia.name, 'NIM')
    assert.ok(Array.isArray(sources.nvidia.models))
    assert.equal(sources.nvidia.models, nvidiaNim)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 📖 2. CORE LOGIC FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════
describe('getAvg', () => {
  it('returns Infinity when no pings', () => {
    assert.equal(getAvg(mockResult({ pings: [] })), Infinity)
  })

  it('returns Infinity when no successful pings', () => {
    assert.equal(getAvg(mockResult({ pings: [{ ms: 500, code: '500' }] })), Infinity)
  })

  it('calculates average from successful pings only', () => {
    const r = mockResult({
      pings: [
        { ms: 200, code: '200' },
        { ms: 400, code: '200' },
        { ms: 999, code: '500' }, // 📖 should be ignored
      ]
    })
    assert.equal(getAvg(r), 300)
  })

  it('rounds to integer', () => {
    const r = mockResult({
      pings: [{ ms: 333, code: '200' }, { ms: 334, code: '200' }]
    })
    assert.equal(getAvg(r), 334) // 📖 (333+334)/2 = 333.5 → 334
  })
})

describe('getVerdict', () => {
  it('returns Overloaded for 429 status', () => {
    assert.equal(getVerdict(mockResult({ httpCode: '429', pings: [{ ms: 100, code: '429' }] })), 'Overloaded')
  })

  it('returns Perfect for fast avg (<400ms)', () => {
    assert.equal(getVerdict(mockResult({ pings: [{ ms: 200, code: '200' }] })), 'Perfect')
  })

  it('returns Normal for avg 400-999ms', () => {
    assert.equal(getVerdict(mockResult({ pings: [{ ms: 500, code: '200' }] })), 'Normal')
  })

  it('returns Slow for avg 1000-2999ms', () => {
    assert.equal(getVerdict(mockResult({ pings: [{ ms: 2000, code: '200' }] })), 'Slow')
  })

  it('returns Very Slow for avg 3000-4999ms', () => {
    assert.equal(getVerdict(mockResult({ pings: [{ ms: 4000, code: '200' }] })), 'Very Slow')
  })

  it('returns Unstable for timeout with prior success', () => {
    assert.equal(getVerdict(mockResult({
      status: 'timeout',
      pings: [{ ms: 200, code: '200' }, { ms: 0, code: '000' }]
    })), 'Unstable')
  })

  it('returns Not Active for timeout without prior success', () => {
    assert.equal(getVerdict(mockResult({ status: 'timeout', pings: [{ ms: 0, code: '000' }] })), 'Not Active')
  })

  it('returns Pending when no successful pings and status is up', () => {
    assert.equal(getVerdict(mockResult({ status: 'up', pings: [] })), 'Pending')
  })
})

describe('getUptime', () => {
  it('returns 0 when no pings', () => {
    assert.equal(getUptime(mockResult({ pings: [] })), 0)
  })

  it('returns 100 when all pings succeed', () => {
    assert.equal(getUptime(mockResult({
      pings: [{ ms: 100, code: '200' }, { ms: 200, code: '200' }]
    })), 100)
  })

  it('returns 50 when half succeed', () => {
    assert.equal(getUptime(mockResult({
      pings: [{ ms: 100, code: '200' }, { ms: 0, code: '500' }]
    })), 50)
  })

  it('returns 0 when none succeed', () => {
    assert.equal(getUptime(mockResult({
      pings: [{ ms: 0, code: '500' }, { ms: 0, code: '429' }]
    })), 0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 📖 2b. STABILITY FUNCTIONS (p95, jitter, stability score)
// ═══════════════════════════════════════════════════════════════════════════════
describe('getP95', () => {
  it('returns Infinity when no pings', () => {
    assert.equal(getP95(mockResult({ pings: [] })), Infinity)
  })

  it('returns Infinity when no successful pings', () => {
    assert.equal(getP95(mockResult({ pings: [{ ms: 500, code: '500' }] })), Infinity)
  })

  it('returns the single value when one ping', () => {
    assert.equal(getP95(mockResult({ pings: [{ ms: 300, code: '200' }] })), 300)
  })

  it('returns the highest value for small sets', () => {
    // With 5 pings: ceil(5 * 0.95) - 1 = 4 → last element
    const r = mockResult({
      pings: [
        { ms: 100, code: '200' }, { ms: 200, code: '200' },
        { ms: 300, code: '200' }, { ms: 400, code: '200' },
        { ms: 5000, code: '200' },
      ]
    })
    assert.equal(getP95(r), 5000)
  })

  it('ignores non-200 pings', () => {
    const r = mockResult({
      pings: [
        { ms: 100, code: '200' }, { ms: 200, code: '200' },
        { ms: 99999, code: '500' }, // should be ignored
      ]
    })
    assert.equal(getP95(r), 200)
  })

  it('catches tail latency spikes with 20 pings', () => {
    // With 20 pings: p95 index = ceil(20 * 0.95) - 1 = 18
    // Need at least 2 high values so index 18 hits the spike
    const pings = Array.from({ length: 18 }, () => ({ ms: 200, code: '200' }))
    pings.push({ ms: 5000, code: '200' })
    pings.push({ ms: 5000, code: '200' })
    const r = mockResult({ pings })
    assert.equal(getP95(r), 5000)
  })
})

describe('getJitter', () => {
  it('returns 0 when no pings', () => {
    assert.equal(getJitter(mockResult({ pings: [] })), 0)
  })

  it('returns 0 when only one ping', () => {
    assert.equal(getJitter(mockResult({ pings: [{ ms: 500, code: '200' }] })), 0)
  })

  it('returns 0 when all pings are identical', () => {
    const r = mockResult({
      pings: [{ ms: 300, code: '200' }, { ms: 300, code: '200' }, { ms: 300, code: '200' }]
    })
    assert.equal(getJitter(r), 0)
  })

  it('calculates correct jitter for known values', () => {
    // pings: 100, 300 → mean = 200, variance = ((100-200)^2 + (300-200)^2)/2 = 10000, σ = 100
    const r = mockResult({
      pings: [{ ms: 100, code: '200' }, { ms: 300, code: '200' }]
    })
    assert.equal(getJitter(r), 100)
  })

  it('ignores non-200 pings', () => {
    const r = mockResult({
      pings: [
        { ms: 300, code: '200' }, { ms: 300, code: '200' },
        { ms: 99999, code: '500' }, // should be ignored
      ]
    })
    assert.equal(getJitter(r), 0)
  })

  it('returns high jitter for spiky latencies', () => {
    const r = mockResult({
      pings: [
        { ms: 100, code: '200' }, { ms: 100, code: '200' },
        { ms: 100, code: '200' }, { ms: 5000, code: '200' },
      ]
    })
    // mean = 1325, large std dev
    const jitter = getJitter(r)
    assert.ok(jitter > 1000, `Expected high jitter, got ${jitter}`)
  })
})

describe('getStabilityScore', () => {
  it('returns -1 when no successful pings', () => {
    assert.equal(getStabilityScore(mockResult({ pings: [] })), -1)
    assert.equal(getStabilityScore(mockResult({ pings: [{ ms: 0, code: '500' }] })), -1)
  })

  it('returns high score for consistent fast model', () => {
    const r = mockResult({
      pings: [
        { ms: 200, code: '200' }, { ms: 210, code: '200' },
        { ms: 190, code: '200' }, { ms: 205, code: '200' },
        { ms: 195, code: '200' },
      ]
    })
    const score = getStabilityScore(r)
    assert.ok(score >= 80, `Expected high stability score, got ${score}`)
  })

  it('returns low score for spiky model', () => {
    const r = mockResult({
      pings: [
        { ms: 100, code: '200' }, { ms: 100, code: '200' },
        { ms: 100, code: '200' }, { ms: 8000, code: '200' },
        { ms: 100, code: '200' }, { ms: 7000, code: '200' },
      ]
    })
    const score = getStabilityScore(r)
    assert.ok(score < 60, `Expected low stability score for spiky model, got ${score}`)
  })

  it('penalizes low uptime', () => {
    const good = mockResult({
      pings: [
        { ms: 200, code: '200' }, { ms: 200, code: '200' },
        { ms: 200, code: '200' }, { ms: 200, code: '200' },
      ]
    })
    const flaky = mockResult({
      pings: [
        { ms: 200, code: '200' }, { ms: 0, code: '500' },
        { ms: 0, code: '500' }, { ms: 0, code: '500' },
      ]
    })
    assert.ok(getStabilityScore(good) > getStabilityScore(flaky))
  })

  it('Model B (consistent 400ms) scores higher than Model A (avg 250ms, spiky p95)', () => {
    // The motivating example from the issue
    const modelA = mockResult({
      pings: [
        { ms: 100, code: '200' }, { ms: 100, code: '200' },
        { ms: 100, code: '200' }, { ms: 100, code: '200' },
        { ms: 100, code: '200' }, { ms: 100, code: '200' },
        { ms: 100, code: '200' }, { ms: 100, code: '200' },
        { ms: 100, code: '200' }, { ms: 6000, code: '200' }, // p95 spike!
      ]
    })
    const modelB = mockResult({
      pings: [
        { ms: 400, code: '200' }, { ms: 380, code: '200' },
        { ms: 420, code: '200' }, { ms: 410, code: '200' },
        { ms: 390, code: '200' }, { ms: 400, code: '200' },
        { ms: 395, code: '200' }, { ms: 405, code: '200' },
        { ms: 400, code: '200' }, { ms: 400, code: '200' },
      ]
    })
    assert.ok(
      getStabilityScore(modelB) > getStabilityScore(modelA),
      `Model B (consistent) should score higher than Model A (spiky)`
    )
  })

  it('score is between 0 and 100 for valid data', () => {
    const r = mockResult({
      pings: [{ ms: 500, code: '200' }, { ms: 1000, code: '200' }]
    })
    const score = getStabilityScore(r)
    assert.ok(score >= 0 && score <= 100, `Score should be 0-100, got ${score}`)
  })
})

describe('getVerdict stability-aware', () => {
  it('returns Spiky for normal avg but terrible p95 (≥3 pings)', () => {
    // 18 pings at 200ms + 2 at 8000ms
    // avg = (18*200 + 2*8000)/20 = (3600+16000)/20 = 980ms → Normal range
    // p95 index = ceil(20*0.95)-1 = 18, sorted[18] = 8000 → p95 > 5000 → Spiky
    const pings = Array.from({ length: 18 }, () => ({ ms: 200, code: '200' }))
    pings.push({ ms: 8000, code: '200' })
    pings.push({ ms: 8000, code: '200' })
    const r = mockResult({ pings })
    assert.equal(getVerdict(r), 'Spiky')
  })

  it('still returns Perfect for fast avg when p95 is fine', () => {
    const r = mockResult({
      pings: [
        { ms: 200, code: '200' }, { ms: 210, code: '200' },
        { ms: 190, code: '200' }, { ms: 205, code: '200' },
      ]
    })
    assert.equal(getVerdict(r), 'Perfect')
  })

  it('does not flag Spiky with only 1-2 pings (not enough data)', () => {
    const r = mockResult({
      pings: [{ ms: 100, code: '200' }, { ms: 5000, code: '200' }]
    })
    // avg = 2550 which is > 1000 but < 3000, so verdict is Slow (not Spiky)
    // The avg pushes it out of the "fast" range entirely
    const verdict = getVerdict(r)
    assert.ok(verdict !== 'Spiky', `Should not be Spiky with 2 pings, got ${verdict}`)
  })

  it('Spiky is in VERDICT_ORDER', () => {
    assert.ok(VERDICT_ORDER.includes('Spiky'), 'VERDICT_ORDER should include Spiky')
  })
})

describe('filterByTier', () => {
  const results = [
    mockResult({ tier: 'S+', label: 'A' }),
    mockResult({ tier: 'S', label: 'B' }),
    mockResult({ tier: 'A+', label: 'C' }),
    mockResult({ tier: 'A', label: 'D' }),
    mockResult({ tier: 'A-', label: 'E' }),
    mockResult({ tier: 'B+', label: 'F' }),
    mockResult({ tier: 'B', label: 'G' }),
    mockResult({ tier: 'C', label: 'H' }),
  ]

  it('filters S tier (S+ and S)', () => {
    const filtered = filterByTier(results, 'S')
    assert.equal(filtered.length, 2)
    assert.ok(filtered.every(r => ['S+', 'S'].includes(r.tier)))
  })

  it('filters A tier (A+, A, A-)', () => {
    const filtered = filterByTier(results, 'A')
    assert.equal(filtered.length, 3)
  })

  it('filters B tier (B+, B)', () => {
    const filtered = filterByTier(results, 'B')
    assert.equal(filtered.length, 2)
  })

  it('filters C tier (C only)', () => {
    const filtered = filterByTier(results, 'C')
    assert.equal(filtered.length, 1)
  })

  it('is case-insensitive', () => {
    const filtered = filterByTier(results, 's')
    assert.equal(filtered.length, 2)
  })

  it('returns null for invalid tier', () => {
    assert.equal(filterByTier(results, 'X'), null)
  })
})

describe('sortResults', () => {
  it('sorts by avg ascending', () => {
    const results = [
      mockResult({ label: 'Slow', pings: [{ ms: 500, code: '200' }] }),
      mockResult({ label: 'Fast', pings: [{ ms: 100, code: '200' }] }),
    ]
    const sorted = sortResults(results, 'avg', 'asc')
    assert.equal(sorted[0].label, 'Fast')
    assert.equal(sorted[1].label, 'Slow')
  })

  it('sorts by avg descending', () => {
    const results = [
      mockResult({ label: 'Fast', pings: [{ ms: 100, code: '200' }] }),
      mockResult({ label: 'Slow', pings: [{ ms: 500, code: '200' }] }),
    ]
    const sorted = sortResults(results, 'avg', 'desc')
    assert.equal(sorted[0].label, 'Slow')
  })

  it('sorts by tier', () => {
    const results = [
      mockResult({ tier: 'C', label: 'C' }),
      mockResult({ tier: 'S+', label: 'S+' }),
    ]
    const sorted = sortResults(results, 'tier', 'asc')
    assert.equal(sorted[0].tier, 'S+')
  })

  it('sorts by model name', () => {
    const results = [
      mockResult({ label: 'Zeta' }),
      mockResult({ label: 'Alpha' }),
    ]
    const sorted = sortResults(results, 'model', 'asc')
    assert.equal(sorted[0].label, 'Alpha')
  })

  it('sorts by ctx (context window) ascending', () => {
    const results = [
      mockResult({ label: 'Small', ctx: '8k' }),
      mockResult({ label: 'Large', ctx: '128k' }),
      mockResult({ label: 'Medium', ctx: '32k' }),
    ]
    const sorted = sortResults(results, 'ctx', 'asc')
    assert.equal(sorted[0].label, 'Small')
    assert.equal(sorted[1].label, 'Medium')
    assert.equal(sorted[2].label, 'Large')
  })

  it('sorts by ctx with million tokens', () => {
    const results = [
      mockResult({ label: 'K', ctx: '128k' }),
      mockResult({ label: 'M', ctx: '1m' }),
    ]
    const sorted = sortResults(results, 'ctx', 'asc')
    assert.equal(sorted[0].label, 'K')
    assert.equal(sorted[1].label, 'M')
  })

  it('does not mutate original array', () => {
    const results = [
      mockResult({ label: 'B', pings: [{ ms: 500, code: '200' }] }),
      mockResult({ label: 'A', pings: [{ ms: 100, code: '200' }] }),
    ]
    const original = [...results]
    sortResults(results, 'avg', 'asc')
    assert.equal(results[0].label, original[0].label)
  })

  it('sorts by stability descending (most stable first)', () => {
    const stable = mockResult({
      label: 'Stable',
      pings: [
        { ms: 200, code: '200' }, { ms: 210, code: '200' },
        { ms: 190, code: '200' }, { ms: 205, code: '200' },
      ]
    })
    const spiky = mockResult({
      label: 'Spiky',
      pings: [
        { ms: 100, code: '200' }, { ms: 100, code: '200' },
        { ms: 100, code: '200' }, { ms: 8000, code: '200' },
      ]
    })
    const sorted = sortResults([spiky, stable], 'stability', 'desc')
    assert.equal(sorted[0].label, 'Stable')
  })
})

describe('findBestModel', () => {
  it('returns null for empty array', () => {
    assert.equal(findBestModel([]), null)
  })

  it('prefers model that is up', () => {
    const results = [
      mockResult({ label: 'Down', status: 'down', pings: [{ ms: 50, code: '200' }] }),
      mockResult({ label: 'Up', status: 'up', pings: [{ ms: 500, code: '200' }] }),
    ]
    assert.equal(findBestModel(results).label, 'Up')
  })

  it('prefers fastest avg when both up', () => {
    const results = [
      mockResult({ label: 'Slow', status: 'up', pings: [{ ms: 500, code: '200' }] }),
      mockResult({ label: 'Fast', status: 'up', pings: [{ ms: 100, code: '200' }] }),
    ]
    assert.equal(findBestModel(results).label, 'Fast')
  })

  it('prefers higher uptime when avg is equal', () => {
    const results = [
      mockResult({ label: 'Flaky', status: 'up', pings: [{ ms: 300, code: '200' }, { ms: 0, code: '500' }] }),
      mockResult({ label: 'Stable', status: 'up', pings: [{ ms: 300, code: '200' }, { ms: 300, code: '200' }] }),
    ]
    assert.equal(findBestModel(results).label, 'Stable')
  })

  it('prefers more stable model when avg is equal', () => {
    // Both have same avg (300ms) but different stability
    const results = [
      mockResult({
        label: 'Spiky',
        status: 'up',
        pings: [
          { ms: 100, code: '200' }, { ms: 100, code: '200' },
          { ms: 100, code: '200' }, { ms: 900, code: '200' },
        ]
      }),
      mockResult({
        label: 'Consistent',
        status: 'up',
        pings: [
          { ms: 300, code: '200' }, { ms: 300, code: '200' },
          { ms: 300, code: '200' }, { ms: 300, code: '200' },
        ]
      }),
    ]
    assert.equal(findBestModel(results).label, 'Consistent')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 📖 3. CLI ARG PARSING
// ═══════════════════════════════════════════════════════════════════════════════
describe('parseArgs', () => {
  // 📖 parseArgs expects argv starting from index 0 (like process.argv)
  // 📖 so we prepend ['node', 'script'] to simulate real argv
  const argv = (...args) => ['node', 'script', ...args]

  it('extracts API key from first non-flag arg', () => {
    const result = parseArgs(argv('nvapi-xxx'))
    assert.equal(result.apiKey, 'nvapi-xxx')
  })

  it('returns null apiKey when none given', () => {
    const result = parseArgs(argv('--best'))
    assert.equal(result.apiKey, null)
  })

  it('detects --best flag', () => {
    assert.equal(parseArgs(argv('--best')).bestMode, true)
    assert.equal(parseArgs(argv()).bestMode, false)
  })

  it('detects --fiable flag', () => {
    assert.equal(parseArgs(argv('--fiable')).fiableMode, true)
  })

  it('detects --opencode flag', () => {
    assert.equal(parseArgs(argv('--opencode')).openCodeMode, true)
  })

  it('detects --openclaw flag', () => {
    assert.equal(parseArgs(argv('--openclaw')).openClawMode, true)
  })

  it('detects --opencode-desktop flag', () => {
    assert.equal(parseArgs(argv('--opencode-desktop')).openCodeDesktopMode, true)
    assert.equal(parseArgs(argv()).openCodeDesktopMode, false)
  })

  it('detects --no-telemetry flag', () => {
    assert.equal(parseArgs(argv('--no-telemetry')).noTelemetry, true)
    assert.equal(parseArgs(argv()).noTelemetry, false)
  })

  it('parses --tier value', () => {
    assert.equal(parseArgs(argv('--tier', 'S')).tierFilter, 'S')
    assert.equal(parseArgs(argv('--tier', 'a')).tierFilter, 'A') // 📖 uppercased
  })

  it('returns null tierFilter when --tier has no value', () => {
    assert.equal(parseArgs(argv('--tier')).tierFilter, null)
    assert.equal(parseArgs(argv('--tier', '--best')).tierFilter, null) // 📖 next arg is a flag
  })

  it('does not capture --tier value as apiKey', () => {
    assert.equal(parseArgs(argv('--tier', 'S')).apiKey, null)
    assert.equal(parseArgs(argv('--opencode', '--tier', 'A')).apiKey, null)
  })

  it('handles multiple flags together', () => {
    const result = parseArgs(argv('nvapi-key', '--opencode', '--best', '--tier', 'S'))
    assert.equal(result.apiKey, 'nvapi-key')
    assert.equal(result.openCodeMode, true)
    assert.equal(result.bestMode, true)
    assert.equal(result.tierFilter, 'S')
  })

  it('flags are case-insensitive', () => {
    assert.equal(parseArgs(argv('--BEST')).bestMode, true)
    assert.equal(parseArgs(argv('--OpenCode')).openCodeMode, true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 📖 4. PACKAGE & CLI SANITY
// ═══════════════════════════════════════════════════════════════════════════════
describe('package.json sanity', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))

  it('has required fields', () => {
    assert.ok(pkg.name, 'name is required')
    assert.ok(pkg.version, 'version is required')
    assert.ok(pkg.main, 'main is required')
    assert.ok(pkg.bin, 'bin is required')
    assert.ok(pkg.license, 'license is required')
  })

  it('version matches semver pattern', () => {
    assert.match(pkg.version, /^\d+\.\d+\.\d+$/)
  })

  it('bin entry points to existing file', () => {
    const binPath = join(ROOT, pkg.bin['free-coding-models'])
    assert.ok(existsSync(binPath), `bin entry ${pkg.bin['free-coding-models']} should exist`)
  })

  it('main entry points to existing file', () => {
    const mainPath = join(ROOT, pkg.main)
    assert.ok(existsSync(mainPath), `main entry ${pkg.main} should exist`)
  })

  it('type is module (ESM)', () => {
    assert.equal(pkg.type, 'module')
  })

  it('engines requires node >= 18', () => {
    assert.ok(pkg.engines?.node, 'engines.node should be set')
    assert.match(pkg.engines.node, /18/)
  })
})

describe('CLI entry point sanity', () => {
  const binContent = readFileSync(join(ROOT, 'bin/free-coding-models.js'), 'utf8')

  it('has shebang line', () => {
    assert.ok(binContent.startsWith('#!/usr/bin/env node'), 'Should start with shebang')
  })

  it('imports from sources.js', () => {
    assert.ok(binContent.includes("from '../sources.js'"), 'Should import sources.js')
  })

  it('imports from lib/utils.js', () => {
    assert.ok(binContent.includes("from '../lib/utils.js'"), 'Should import lib/utils.js')
  })
})

describe('constants consistency', () => {
  it('TIER_ORDER covers all tiers used in sources', () => {
    const tiersInModels = [...new Set(MODELS.map(m => m[2]))]
    for (const tier of tiersInModels) {
      assert.ok(TIER_ORDER.includes(tier), `Tier "${tier}" from models not in TIER_ORDER`)
    }
  })

  it('TIER_LETTER_MAP covers all tier letters', () => {
    assert.deepEqual(Object.keys(TIER_LETTER_MAP).sort(), ['A', 'B', 'C', 'S'])
  })

  it('all TIER_LETTER_MAP values are subsets of TIER_ORDER', () => {
    for (const [letter, tiers] of Object.entries(TIER_LETTER_MAP)) {
      for (const tier of tiers) {
        assert.ok(TIER_ORDER.includes(tier), `TIER_LETTER_MAP['${letter}'] has invalid tier "${tier}"`)
      }
    }
  })
})
