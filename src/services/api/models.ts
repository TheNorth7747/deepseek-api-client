/**
 * 模型规格与价格：整理自官方「模型 & 价格」页，用于请求参数、上下文预算提示与费用估算。
 * 价格单位：元 / 百万 tokens；缓存命中对应 cache_read_input_tokens。
 * 官方文档：https://api-docs.deepseek.com/zh-cn/quick_start/pricing
 */

/** 内置模型 ID；服务端新增模型时只要在 MODELS 里补一条即可，请求层接受任意字符串 */
export const MODEL_IDS = ['deepseek-flash', 'deepseek-v4-pro'] as const

/** 模型 ID：内置取值有补全，也接受后续新增的模型名 */
export type ModelId = (typeof MODEL_IDS)[number] | string

type PriceTier = { peak: number; idle: number }

export type ModelInfo = {
  id: ModelId
  /** 官方模型版本名，用于设置页展示 */
  version: string
  /** 上下文窗口（tokens） */
  contextTokens: number
  /** 单次输出上限（tokens，含思考） */
  maxOutputTokens: number
  /** 是否支持图片输入 */
  vision: boolean
  pricing: {
    /** 输入，缓存命中 */
    cacheHit: PriceTier
    /** 输入，缓存未命中 */
    cacheMiss: PriceTier
    /** 输出 */
    output: PriceTier
  }
}

export const MODELS: readonly ModelInfo[] = [
  {
    id: 'deepseek-flash',
    version: 'DeepSeek-V4.1-Flash-1017',
    contextTokens: 1_000_000,
    maxOutputTokens: 384_000,
    vision: true,
    pricing: {
      cacheHit: { peak: 0.04, idle: 0.02 },
      cacheMiss: { peak: 2, idle: 1 },
      output: { peak: 8, idle: 4 },
    },
  },
  {
    id: 'deepseek-v4-pro',
    version: 'DeepSeek-V4-Pro-0813',
    contextTokens: 1_000_000,
    maxOutputTokens: 384_000,
    vision: false,
    pricing: {
      cacheHit: { peak: 0.3, idle: 0.15 },
      cacheMiss: { peak: 9, idle: 4.5 },
      output: { peak: 27, idle: 13.5 },
    },
  },
]

export const DEFAULT_MODEL_ID: ModelId = 'deepseek-flash'

/** 未知模型名按默认模型处理，避免设置里的旧值让界面空白 */
export const getModel = (id: string | null | undefined): ModelInfo =>
  MODELS.find((model) => model.id === id) ?? MODELS[0]

/** 联网工具（搜索、抓取）按次计费：每 1000 次 5 元 */
const TOOL_PRICE_PER_CALL = 5 / 1000

const BEIJING_OFFSET = 8 * 60 * 60 * 1000

/**
 * 是否处于高峰时段：北京时间周一至周五（不含法定节假日）9:00-12:00、14:00-18:00。
 * 法定节假日无法从客户端判断，这里只按周末近似，费用仅作参考。
 */
export const isPeakTime = (at: Date = new Date()): boolean => {
  const beijing = new Date(at.getTime() + BEIJING_OFFSET)
  const day = beijing.getUTCDay()
  if (day === 0 || day === 6) {
    return false
  }
  const hour = beijing.getUTCHours() + beijing.getUTCMinutes() / 60
  return (hour >= 9 && hour < 12) || (hour >= 14 && hour < 18)
}

/** 一次请求的用量：input 不含缓存命中，cacheRead 为命中量，output 含思考 */
export type TokenUsage = { input: number; cacheRead: number; output: number; toolCalls: number }

/** 协议里的 usage 字段（只取估算需要的部分） */
export type UsageLike = {
  input_tokens?: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
  output_tokens?: number
  server_tool_use?: { web_search_requests?: number; web_fetch_requests?: number }
}

/** 协议字段转成估算用用量；cache_creation_input_tokens 目前恒为 0，一并计入命中 */
export const toTokenUsage = (usage: UsageLike): TokenUsage => ({
  input: usage.input_tokens ?? 0,
  cacheRead: (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0),
  output: usage.output_tokens ?? 0,
  toolCalls:
    (usage.server_tool_use?.web_search_requests ?? 0) +
    (usage.server_tool_use?.web_fetch_requests ?? 0),
})

/** 总输入 tokens = 未命中 + 命中 */
export const totalInputTokens = (usage: TokenUsage) => usage.input + usage.cacheRead

/** 本轮结束时的上下文大小 ≈ 输入 + 输出 */
export const usedContextTokens = (usage: TokenUsage) =>
  usage.input + usage.cacheRead + usage.output

/** 估算一次请求的费用（元） */
export const estimateCost = (
  model: ModelInfo,
  usage: TokenUsage,
  at: Date = new Date()
): number => {
  const tier = isPeakTime(at) ? 'peak' : 'idle'
  const { cacheHit, cacheMiss, output } = model.pricing
  return (
    (usage.input / 1e6) * cacheMiss[tier] +
    (usage.cacheRead / 1e6) * cacheHit[tier] +
    (usage.output / 1e6) * output[tier] +
    usage.toolCalls * TOOL_PRICE_PER_CALL
  )
}

/** 去掉整数值的小数点，1.0M → 1M */
const trimZero = (value: string) => value.replace(/\.0$/, '')

/** 紧凑的数值展示：1234 → 1.2K，1000000 → 1M */
export const formatTokens = (count: number): string => {
  if (count >= 1e6) {
    return `${trimZero((count / 1e6).toFixed(count >= 1e7 ? 0 : 1))}M`
  }
  if (count >= 1e3) {
    return `${trimZero((count / 1e3).toFixed(count >= 1e5 ? 0 : 1))}K`
  }
  return String(count)
}

/** 费用展示：不到 1 分钱时保留 4 位，避免显示成 0.00 */
export const formatCost = (cost: number): string =>
  cost >= 0.01 ? cost.toFixed(3) : cost.toFixed(4)
