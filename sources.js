/**
 * @file sources.js
 * @description Model sources for AI availability checker.
 *
 * @details
 *   This file contains all model definitions organized by provider/source.
 *   Each source has its own models array with [model_id, display_label, tier, swe_score, ctw].
 *   - model_id: The model identifier for API calls
 *   - display_label: Human-friendly name for display
 *   - tier: Performance tier (S+, S, A+, A, A-, B+, B, C)
 *   - swe_score: SWE-bench Verified score percentage
 *   - ctw: Context window size in tokens (e.g., "128k", "32k")
 *   
 *   Add new sources here to support additional providers beyond NIM.
 *
 *   🎯 Tier scale (based on SWE-bench Verified):
 *   - S+: 70%+ (elite frontier coders)
 *   - S:  60-70% (excellent)
 *   - A+: 50-60% (great)
 *   - A:  40-50% (good)
 *   - A-: 35-45% (decent)
 *   - B+: 30-40% (average)
 *   - B:  20-30% (below average)
 *   - C:  <20% (lightweight/edge)
 *
 *   📖 Source: https://www.swebench.com
 *
 *   @exports Object containing all sources and their models
 */

// 📖 NIM source - https://build.nvidia.com
export const nvidiaNim = [
  // ── S+ tier — SWE-bench Verified ≥70% ──
  ['deepseek-ai/deepseek-v3.1',                    'DeepSeek V3.1',       'S+', '49.2%', '128k'],
  ['deepseek-ai/deepseek-v3.1-terminus',           'DeepSeek V3.1 Term',  'S+', '49.2%', '128k'],
  ['deepseek-ai/deepseek-v3.2',                    'DeepSeek V3.2',       'S+', '73.1%', '128k'],
  ['moonshotai/kimi-k2.5',                         'Kimi K2.5',           'S+', '76.8%', '128k'],
  ['mistralai/devstral-2-123b-instruct-2512',      'Devstral 2 123B',     'S+', '62.0%', '128k'],
  ['nvidia/llama-3.1-nemotron-ultra-253b-v1',      'Nemotron Ultra 253B', 'S+', '56.0%', '128k'],
  ['mistralai/mistral-large-3-675b-instruct-2512', 'Mistral Large 675B',  'S+', '58.0%', '128k'],
  // ── S tier — SWE-bench Verified 50–70% ──
  ['qwen/qwen2.5-coder-32b-instruct',              'Qwen2.5 Coder 32B',   'S', '46.0%', '32k'],
  ['z-ai/glm5',                                    'GLM 5',               'S', '77.8%', '128k'],
  ['qwen/qwen3.5-397b-a17b',                       'Qwen3.5 400B VLM',    'S', '68.0%', '128k'],
  ['qwen/qwen3-coder-480b-a35b-instruct',          'Qwen3 Coder 480B',    'S', '72.0%', '128k'],
  ['qwen/qwen3-next-80b-a3b-thinking',             'Qwen3 80B Thinking',  'S', '68.0%', '128k'],
  ['meta/llama-3.1-405b-instruct',                 'Llama 3.1 405B',      'S', '44.0%', '128k'],
  ['minimaxai/minimax-m2.1',                       'MiniMax M2.1',        'S', '70.0%', '128k'],
  // ── A+ tier — SWE-bench Verified 60–70% ──
  ['moonshotai/kimi-k2-thinking',                  'Kimi K2 Thinking',    'A+', '67.0%', '128k'],
  ['moonshotai/kimi-k2-instruct',                  'Kimi K2 Instruct',    'A+', '65.8%', '128k'],
  ['qwen/qwen3-235b-a22b',                         'Qwen3 235B',          'A+', '70.0%', '128k'],
  ['meta/llama-3.3-70b-instruct',                  'Llama 3.3 70B',       'A+', '39.5%', '128k'],
  ['z-ai/glm4.7',                                  'GLM 4.7',             'A+', '73.8%', '128k'],
  ['qwen/qwen3-next-80b-a3b-instruct',             'Qwen3 80B Instruct',  'A+', '65.0%', '128k'],
  // ── A tier — SWE-bench Verified 45–60% ──
  ['minimaxai/minimax-m2',                         'MiniMax M2',          'A', '56.5%', '128k'],
  ['mistralai/mistral-medium-3-instruct',          'Mistral Medium 3',    'A', '48.0%', '128k'],
  ['mistralai/magistral-small-2506',               'Magistral Small',     'A', '45.0%', '32k'],
  ['nvidia/nemotron-3-nano-30b-a3b',               'Nemotron Nano 30B',   'A', '43.0%', '128k'],
  ['deepseek-ai/deepseek-r1-distill-qwen-32b',     'R1 Distill 32B',      'A', '43.9%', '128k'],
  // ── A- tier — SWE-bench Verified 35–45% ──
  ['openai/gpt-oss-120b',                          'GPT OSS 120B',        'A-', '60.0%', '128k'],
  ['nvidia/llama-3.3-nemotron-super-49b-v1.5',     'Nemotron Super 49B',  'A-', '49.0%', '128k'],
  ['meta/llama-4-scout-17b-16e-instruct',          'Llama 4 Scout',       'A-', '44.0%', '128k'],
  ['deepseek-ai/deepseek-r1-distill-qwen-14b',     'R1 Distill 14B',      'A-', '37.7%', '64k'],
  ['igenius/colosseum_355b_instruct_16k',          'Colosseum 355B',      'A-', '52.0%', '16k'],
  // ── B+ tier — SWE-bench Verified 30–40% ──
  ['qwen/qwq-32b',                                 'QwQ 32B',            'B+', '50.0%', '32k'],
  ['openai/gpt-oss-20b',                           'GPT OSS 20B',        'B+', '42.0%', '32k'],
  ['stockmark/stockmark-2-100b-instruct',          'Stockmark 100B',     'B+', '36.0%', '32k'],
  ['bytedance/seed-oss-36b-instruct',              'Seed OSS 36B',       'B+', '38.0%', '32k'],
  ['stepfun-ai/step-3.5-flash',                    'Step 3.5 Flash',      'B+', '74.4%', '32k'],
  // ── B tier — SWE-bench Verified 20–35% ──
  ['meta/llama-4-maverick-17b-128e-instruct',      'Llama 4 Maverick',    'B', '62.0%', '128k'],
  ['mistralai/mixtral-8x22b-instruct-v0.1',        'Mixtral 8x22B',       'B', '32.0%', '64k'],
  ['mistralai/ministral-14b-instruct-2512',        'Ministral 14B',       'B', '34.0%', '32k'],
  ['ibm/granite-34b-code-instruct',                'Granite 34B Code',    'B', '30.0%', '32k'],
  ['deepseek-ai/deepseek-r1-distill-llama-8b',     'R1 Distill 8B',       'B', '28.2%', '32k'],
  // ── C tier — SWE-bench Verified <25% or lightweight edge models ──
  ['deepseek-ai/deepseek-r1-distill-qwen-7b',      'R1 Distill 7B',       'C', '22.6%', '32k'],
  ['google/gemma-2-9b-it',                         'Gemma 2 9B',          'C', '18.0%', '8k'],
  ['microsoft/phi-3.5-mini-instruct',              'Phi 3.5 Mini',        'C', '12.0%', '128k'],
  ['microsoft/phi-4-mini-instruct',                'Phi 4 Mini',          'C', '14.0%', '128k'],
]

// 📖 All sources combined - used by the main script
export const sources = {
  nvidia: {
    name: 'NIM',
    models: nvidiaNim,
  },
}

// 📖 Flatten all models from all sources for backward compatibility
export const MODELS = []
for (const [sourceKey, sourceData] of Object.entries(sources)) {
  for (const [modelId, label, tier, sweScore, ctw] of sourceData.models) {
    MODELS.push([modelId, label, tier, sweScore, ctw])
  }
}
