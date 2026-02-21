/**
 * @file sources.js
 * @description Model sources for AI availability checker.
 *
 * @details
 *   This file contains all model definitions organized by provider/source.
 *   Each source has its own models array with [model_id, display_label, tier].
 *   Add new sources here to support additional providers beyond NVIDIA NIM.
 *
 *   🎯 Tier scale (based on Aider Polyglot benchmark):
 *   - S+: 75%+ (elite frontier coders)
 *   - S:  62-74% (excellent)
 *   - A+: 54-62% (great)
 *   - A:  44-54% (good)
 *   - A-: 36-44% (decent)
 *   - B+: 25-36% (average)
 *   - B:  14-25% (below average)
 *   - C:  <14% (lightweight/edge)
 *
 *   📖 Source: https://aider.chat/docs/leaderboards (Polyglot = 225 exercises, 6 languages)
 *
 *   @exports Object containing all sources and their models
 */

// 📖 NVIDIA NIM source - https://build.nvidia.com
export const nvidiaNim = [
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
  ['qwen/qwq-32b',                                 'QwQ 32B',            'B+'], // 20.9% Aider (format penalty — actually stronger)
  ['openai/gpt-oss-20b',                           'GPT OSS 20B',        'B+'], // smaller OSS variant, estimated B+
  ['stockmark/stockmark-2-100b-instruct',          'Stockmark 100B',     'B+'], // JP-specialized 100B, estimated B+
  ['bytedance/seed-oss-36b-instruct',              'Seed OSS 36B',       'B+'], // ByteDance 36B, estimated B+
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

// 📖 All sources combined - used by the main script
export const sources = {
  nvidia: {
    name: 'NVIDIA NIM',
    models: nvidiaNim,
  },
  // 📖 Add more sources here in the future, for example:
  // openai: {
  //   name: 'OpenAI',
  //   models: [...],
  // },
  // anthropic: {
  //   name: 'Anthropic',
  //   models: [...],
  // },
}

// 📖 Flatten all models from all sources for backward compatibility
export const MODELS = []
for (const [sourceKey, sourceData] of Object.entries(sources)) {
  for (const [modelId, label, tier] of sourceData.models) {
    MODELS.push([modelId, label, tier])
  }
}
