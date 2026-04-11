/**
 * Independence Check — 防伪多 Agent 批判机制
 *
 * 核心问题：
 * 当 Dev Agent（Proposer）产出代码/分析，Review Agent（Critic）产出审查意见时，
 * 如果两者的内容高度相似（例如 Critic 直接复制 Proposer 的语言），
 * 则"对抗审查"退化为"伪对抗"——没有真正的批判价值。
 *
 * 本模块实现：
 * 1. 文本差异化检测（Divergence Point Count）
 * 2. 逻辑独立性评分（0-1）
 * 3. 高相似度时的处理策略（降低 DP Score vs 强制重审）
 *
 * 设计原则：
 * - 不使用 cosine similarity（需要 embedding，依赖外部模型）
 * - 使用轻量级文本分析：n-gram 重叠、关键词对比、逻辑分歧点计数
 * - 所有检测必须是确定性的，支持单元测试
 */

// ─── 类型定义 ─────────────────────────────────────────────────

/** Proposer（Dev Agent）的输出 */
export interface ProposerOutput {
  /** 代码内容或实现说明 */
  message: string
  /** 具体文件内容（可选，来自 DevAgentResponse.files） */
  files?: Array<{ path: string; content: string }>
  /** 实现摘要（可选） */
  summary?: string
}

/** Critic（Review Agent）的输出 */
export interface CriticOutput {
  /** 审查报告全文 */
  message: string
  /** 是否批准 */
  approved: boolean
  /** 具体问题列表 */
  issues?: string[]
  /** 改进建议 */
  suggestions?: string[]
  /** 质量评分 0-100 */
  score?: number
}

/** 逻辑分歧点——Critic 与 Proposer 的实质性不同意见 */
export interface DivergencePoint {
  /** 分歧类型 */
  type: 'contradiction' | 'addition' | 'omission' | 'reframing'
  /** 分歧描述 */
  description: string
  /** Critic 文本中的关键句 */
  criticEvidence: string
  /** 在 Proposer 文本中是否可以找到类似内容 */
  foundInProposer: boolean
}

/** Independence Check 结果 */
export interface IndependenceCheckResult {
  /** 独立性评分 0-1（越高越独立） */
  independenceScore: number
  /** 是否通过独立性检查 */
  passed: boolean
  /** 分歧点列表 */
  divergencePoints: DivergencePoint[]
  /** 分歧点数量 */
  divergenceCount: number
  /** n-gram 重叠率（0-1，越高越相似） */
  ngramOverlapRate: number
  /** 关键词独特性（Critic 独有的关键词比例） */
  criticUniqueKeywordRate: number
  /** 处理动作 */
  action: IndependenceCheckAction
  /** 人类可读的诊断信息 */
  diagnosis: string
  /** DP Score 惩罚（0-1，乘以原始得分以降低评分） */
  dpScorePenalty: number
}

/** 当独立性检查失败时的处理动作 */
export type IndependenceCheckAction =
  | 'pass'           // 通过，无需处理
  | 'warn'           // 警告，轻微惩罚
  | 'penalize'       // 降低 DP Score
  | 'force_rerun'    // 强制重新评估

/** Independence Check 配置 */
export interface IndependenceCheckConfig {
  /** 最低独立性评分阈值（低于此值则 penalize） */
  minIndependenceScore: number
  /** 强制重审的独立性评分阈值（低于此值则 force_rerun） */
  forceRerunThreshold: number
  /** 最低分歧点数量 */
  minDivergencePoints: number
  /** n-gram 窗口大小 */
  ngramSize: number
  /** n-gram 重叠率上限（超过则失败） */
  maxNgramOverlapRate: number
}

/** 默认配置 */
export const DEFAULT_INDEPENDENCE_CONFIG: IndependenceCheckConfig = {
  minIndependenceScore: 0.35,
  forceRerunThreshold: 0.15,
  minDivergencePoints: 2,
  ngramSize: 3,
  maxNgramOverlapRate: 0.60,
}

// ─── 工具函数 ─────────────────────────────────────────────────

/**
 * 将文本规范化：小写、去除标点、分词
 */
function normalizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, ' ') // 保留中文、英文、数字
    .split(/\s+/)
    .filter(w => w.length > 1)
}

/**
 * 生成 n-gram 集合
 */
function getNgrams(tokens: string[], n: number): Set<string> {
  const ngrams = new Set<string>()
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.add(tokens.slice(i, i + n).join('_'))
  }
  return ngrams
}

/**
 * 计算两个集合的 Jaccard 相似度
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1.0
  if (a.size === 0 || b.size === 0) return 0.0

  let intersectionSize = 0
  for (const item of a) {
    if (b.has(item)) intersectionSize++
  }

  const unionSize = a.size + b.size - intersectionSize
  return intersectionSize / unionSize
}

/**
 * 提取技术关键词（编程相关的专业词汇）
 */
function extractTechKeywords(text: string): Set<string> {
  const keywords = new Set<string>()

  // 中文技术词
  const chinesePatterns = [
    /错误处理/g, /类型安全/g, /性能优化/g, /安全漏洞/g, /代码风格/g,
    /测试覆盖/g, /内存泄漏/g, /异步处理/g, /依赖注入/g, /设计模式/g,
    /边界条件/g, /竞态条件/g, /死锁/g, /重构/g, /可维护性/g,
    /可扩展性/g, /向后兼容/g, /接口设计/g, /抽象层/g, /耦合度/g,
  ]

  // 英文技术词（camelCase、snake_case、常见关键词）
  const englishPattern = /\b(null|undefined|async|await|Promise|try|catch|throw|error|exception|interface|type|generic|abstract|override|extends|implements|readonly|const|let|var|function|class|return|import|export|default)\b/gi

  chinesePatterns.forEach(p => {
    const matches = text.match(p)
    if (matches) matches.forEach(m => keywords.add(m))
  })

  const englishMatches = text.match(englishPattern)
  if (englishMatches) {
    englishMatches.forEach(m => keywords.add(m.toLowerCase()))
  }

  return keywords
}

/**
 * 检测否定/批判语言（Critic 应该有，Proposer 通常没有）
 */
function extractCriticalLanguage(text: string): string[] {
  const criticalPhrases: string[] = []

  const patterns = [
    // 中文批判词
    /(?:存在|发现|检测到|注意到)[^。！\n]{3,50}(?:问题|漏洞|缺陷|风险|隐患)/g,
    /(?:建议|应该|需要|必须)[^。！\n]{3,50}(?:改进|修复|优化|重构|添加)/g,
    /(?:缺少|缺乏|没有|未)[^。！\n]{3,30}(?:处理|验证|测试|检查)/g,
    /(?:可能|潜在)[^。！\n]{3,30}(?:导致|引起|造成)/g,
    // 英文批判词
    /\b(?:missing|lacks?|should|must|needs?|consider|avoid|warning|critical|issue|bug|vulnerability)\b[^.!?\n]{5,60}/gi,
    /\b(?:instead of|rather than|prefer|better to|recommend)\b[^.!?\n]{5,60}/gi,
  ]

  patterns.forEach(p => {
    const matches = text.match(p)
    if (matches) criticalPhrases.push(...matches.map(m => m.trim()))
  })

  return criticalPhrases
}

// ─── 核心算法 ─────────────────────────────────────────────────

/**
 * 计算 n-gram 重叠率
 * 衡量 Critic 文本与 Proposer 文本的字面重叠程度
 */
export function calculateNgramOverlap(
  proposerText: string,
  criticText: string,
  ngramSize: number = 3
): number {
  const proposerTokens = normalizeText(proposerText)
  const criticTokens = normalizeText(criticText)

  if (proposerTokens.length < ngramSize || criticTokens.length < ngramSize) {
    // 文本太短，无法计算有意义的 n-gram
    return calculateSimpleSentenceOverlap(proposerText, criticText)
  }

  const proposerNgrams = getNgrams(proposerTokens, ngramSize)
  const criticNgrams = getNgrams(criticTokens, ngramSize)

  return jaccardSimilarity(proposerNgrams, criticNgrams)
}

/**
 * 当文本太短时的备选方案：句子级别的重叠检测
 */
function calculateSimpleSentenceOverlap(text1: string, text2: string): number {
  const sentences1 = text1.split(/[。！？.!?\n]+/).filter(s => s.trim().length > 5)
  const sentences2 = text2.split(/[。！？.!?\n]+/).filter(s => s.trim().length > 5)

  if (sentences1.length === 0 || sentences2.length === 0) return 0

  let overlapCount = 0
  for (const s1 of sentences1) {
    for (const s2 of sentences2) {
      // 超过 70% 字符相同则认为重叠
      const longer = Math.max(s1.length, s2.length)
      const shorter = Math.min(s1.length, s2.length)
      if (shorter / longer > 0.7 && s1.includes(s2.substring(0, Math.floor(s2.length * 0.5)))) {
        overlapCount++
        break
      }
    }
  }

  return overlapCount / Math.max(sentences1.length, sentences2.length)
}

/**
 * 计算 Critic 独有关键词比例
 * 如果 Critic 提出了 Proposer 没有提到的技术关键词，说明有新视角
 */
export function calculateCriticUniqueKeywordRate(
  proposerText: string,
  criticText: string
): number {
  const proposerKeywords = extractTechKeywords(proposerText)
  const criticKeywords = extractTechKeywords(criticText)

  if (criticKeywords.size === 0) return 0

  let uniqueCount = 0
  for (const kw of criticKeywords) {
    if (!proposerKeywords.has(kw)) {
      uniqueCount++
    }
  }

  return uniqueCount / criticKeywords.size
}

/**
 * 识别逻辑分歧点
 * 关键：分歧点不是"文字不同"，而是"逻辑立场不同"
 */
export function identifyDivergencePoints(
  proposerOutput: ProposerOutput,
  criticOutput: CriticOutput
): DivergencePoint[] {
  const points: DivergencePoint[] = []
  const proposerFull = buildProposerFullText(proposerOutput)

  // 1. 从 Critic 的批判语言中提取分歧
  const criticalPhrases = extractCriticalLanguage(criticOutput.message)
  for (const phrase of criticalPhrases.slice(0, 10)) { // 最多取10个
    const foundInProposer = proposerFull.includes(phrase.substring(0, Math.min(20, phrase.length)))
    points.push({
      type: 'contradiction',
      description: phrase.length > 80 ? phrase.substring(0, 80) + '...' : phrase,
      criticEvidence: phrase,
      foundInProposer,
    })
  }

  // 2. 检查 Critic 是否提出了 issues（Proposer 通常没有 issues）
  if (criticOutput.issues && criticOutput.issues.length > 0) {
    for (const issue of criticOutput.issues.slice(0, 5)) {
      const foundInProposer = proposerFull.toLowerCase().includes(
        issue.toLowerCase().substring(0, Math.min(15, issue.length))
      )
      if (!foundInProposer) {
        points.push({
          type: 'addition',
          description: `Critic 新增问题: ${issue.substring(0, 60)}`,
          criticEvidence: issue,
          foundInProposer: false,
        })
      }
    }
  }

  // 3. 检查 Critic 是否拒绝了（approved=false）但 Proposer 表达了成功
  const proposerClaimsSuccess = /完成|成功|实现|done|success/i.test(proposerFull)
  if (!criticOutput.approved && proposerClaimsSuccess) {
    points.push({
      type: 'contradiction',
      description: 'Critic 拒绝了 Proposer 声称已完成的实现',
      criticEvidence: '审查未通过 (approved: false)',
      foundInProposer: false,
    })
  }

  // 4. 检查 Critic 的建议是否引入了新概念
  if (criticOutput.suggestions && criticOutput.suggestions.length > 0) {
    for (const suggestion of criticOutput.suggestions.slice(0, 3)) {
      const suggestionTokens = normalizeText(suggestion)
      const proposerTokens = normalizeText(proposerFull)
      const newTokens = suggestionTokens.filter(t => !proposerTokens.includes(t) && t.length > 2)

      if (newTokens.length > 2) {
        points.push({
          type: 'reframing',
          description: `Critic 建议引入新概念: ${newTokens.slice(0, 5).join(', ')}`,
          criticEvidence: suggestion.substring(0, 80),
          foundInProposer: false,
        })
      }
    }
  }

  // 去重（基于 criticEvidence 前30字符）
  const seen = new Set<string>()
  return points.filter(p => {
    const key = p.criticEvidence.substring(0, 30)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * 将 ProposerOutput 转换为完整文本
 */
function buildProposerFullText(proposer: ProposerOutput): string {
  let text = proposer.message || ''
  if (proposer.summary) text += '\n' + proposer.summary
  if (proposer.files) {
    proposer.files.forEach(f => {
      text += '\n' + f.content
    })
  }
  return text
}

/**
 * 将 CriticOutput 转换为完整文本
 */
function buildCriticFullText(critic: CriticOutput): string {
  let text = critic.message || ''
  if (critic.issues) text += '\n' + critic.issues.join('\n')
  if (critic.suggestions) text += '\n' + critic.suggestions.join('\n')
  return text
}

// ─── 主检查函数 ─────────────────────────────────────────────────

/**
 * 执行 Independence Check
 *
 * 独立性评分计算公式：
 * independenceScore = (
 *   (1 - ngramOverlapRate) * 0.4         // 文字独立性（权重40%）
 *   + criticUniqueKeywordRate * 0.3       // 新视角（权重30%）
 *   + min(divergenceCount / 5, 1) * 0.3  // 分歧点（权重30%，上限5个满分）
 * )
 */
export function runIndependenceCheck(
  proposer: ProposerOutput,
  critic: CriticOutput,
  config: IndependenceCheckConfig = DEFAULT_INDEPENDENCE_CONFIG
): IndependenceCheckResult {
  const proposerText = buildProposerFullText(proposer)
  const criticText = buildCriticFullText(critic)

  // 1. 计算各指标
  const ngramOverlapRate = calculateNgramOverlap(proposerText, criticText, config.ngramSize)
  const criticUniqueKeywordRate = calculateCriticUniqueKeywordRate(proposerText, criticText)
  const divergencePoints = identifyDivergencePoints(proposer, critic)

  // 只计算"非 Proposer 文本中已有"的分歧点
  const genuineDivergences = divergencePoints.filter(p => !p.foundInProposer)
  const divergenceCount = genuineDivergences.length

  // 2. 综合评分
  const textIndependence = 1 - ngramOverlapRate
  const newPerspective = criticUniqueKeywordRate
  const divergenceScore = Math.min(divergenceCount / 5, 1)

  const independenceScore = (
    textIndependence * 0.4
    + newPerspective * 0.3
    + divergenceScore * 0.3
  )

  // 3. 判断动作
  let action: IndependenceCheckAction
  let dpScorePenalty: number
  let passed: boolean

  if (independenceScore >= config.minIndependenceScore
    && ngramOverlapRate <= config.maxNgramOverlapRate
    && divergenceCount >= config.minDivergencePoints) {
    action = 'pass'
    dpScorePenalty = 1.0
    passed = true
  } else if (independenceScore <= config.forceRerunThreshold) {
    action = 'force_rerun'
    dpScorePenalty = 0.0
    passed = false
  } else if (independenceScore < config.minIndependenceScore * 0.7) {
    action = 'penalize'
    dpScorePenalty = independenceScore / config.minIndependenceScore
    passed = false
  } else {
    action = 'warn'
    dpScorePenalty = 0.8
    passed = false
  }

  // 4. 生成诊断信息
  const diagnosis = buildDiagnosis({
    independenceScore,
    ngramOverlapRate,
    criticUniqueKeywordRate,
    divergenceCount,
    action,
    passed,
  })

  return {
    independenceScore: Math.round(independenceScore * 1000) / 1000,
    passed,
    divergencePoints,
    divergenceCount,
    ngramOverlapRate: Math.round(ngramOverlapRate * 1000) / 1000,
    criticUniqueKeywordRate: Math.round(criticUniqueKeywordRate * 1000) / 1000,
    action,
    diagnosis,
    dpScorePenalty: Math.round(dpScorePenalty * 1000) / 1000,
  }
}

function buildDiagnosis(params: {
  independenceScore: number
  ngramOverlapRate: number
  criticUniqueKeywordRate: number
  divergenceCount: number
  action: IndependenceCheckAction
  passed: boolean
}): string {
  const lines: string[] = []

  lines.push(`🔍 Independence Check Report`)
  lines.push(``)
  lines.push(`独立性评分: ${(params.independenceScore * 100).toFixed(1)}%`)
  lines.push(`N-gram 重叠率: ${(params.ngramOverlapRate * 100).toFixed(1)}%（越低越独立）`)
  lines.push(`Critic 新关键词比例: ${(params.criticUniqueKeywordRate * 100).toFixed(1)}%`)
  lines.push(`逻辑分歧点数量: ${params.divergenceCount}`)
  lines.push(``)

  if (params.passed) {
    lines.push(`✅ 通过独立性检查 — Critic 展现了独立视角`)
  } else {
    switch (params.action) {
      case 'warn':
        lines.push(`⚠️ 警告：Critic 独立性偏低，审查结果可信度有所降低`)
        break
      case 'penalize':
        lines.push(`🚨 惩罚：Critic 严重依赖 Proposer 的表述，DP Score 将被降低`)
        break
      case 'force_rerun':
        lines.push(`🔴 强制重审：Critic 几乎复制了 Proposer 的输出，判定为伪对抗，拒绝本次审查`)
        break
    }
  }

  return lines.join('\n')
}

// ─── 集成辅助：将 AgentResponse 转换为检查输入 ─────────────────

/**
 * 从 AgentResponse 构建 ProposerOutput
 * 适配 DevAgent 的输出格式
 */
export function fromDevAgentResponse(response: {
  message: string
  files?: Array<{ path: string; content: string; action?: string }>
}): ProposerOutput {
  return {
    message: response.message,
    files: response.files?.map(f => ({ path: f.path, content: f.content })),
  }
}

/**
 * 从 AgentResponse 构建 CriticOutput
 * 适配 ReviewAgent 的输出格式
 */
export function fromReviewAgentResponse(response: {
  message: string
  status: string
  metadata?: Record<string, unknown>
}): CriticOutput {
  // 从 message 中提取 approved 状态
  const approved = response.status === 'success'
    && !response.message.includes('需要修改')
    && !response.message.includes('❌')

  // 从 message 中提取问题（❌ 开头的行）
  const issues: string[] = []
  const suggestions: string[] = []

  const lines = response.message.split('\n')
  for (const line of lines) {
    if (line.startsWith('❌') || line.match(/^\d+\. /)) {
      const text = line.replace(/^[❌\d\.\s]+/, '').trim()
      if (text) issues.push(text)
    }
    if (line.startsWith('⚠️') || line.startsWith('建议')) {
      const text = line.replace(/^[⚠️\s建议]+/, '').trim()
      if (text) suggestions.push(text)
    }
  }

  return {
    message: response.message,
    approved,
    issues,
    suggestions,
  }
}
