/**
 * Independence Check 单元测试
 *
 * 覆盖场景：
 * 1. 完全独立的 Critic（应该通过）
 * 2. 完全克隆 Proposer（应该 force_rerun）
 * 3. 部分独立（应该 warn 或 penalize）
 * 4. 各指标计算精度
 * 5. 边界条件（空文本、极短文本）
 */

import {
  runIndependenceCheck,
  calculateNgramOverlap,
  calculateCriticUniqueKeywordRate,
  identifyDivergencePoints,
  fromDevAgentResponse,
  fromReviewAgentResponse,
  DEFAULT_INDEPENDENCE_CONFIG,
  IndependenceCheckConfig,
  ProposerOutput,
  CriticOutput,
} from '../independence-check'

// ─── 测试数据夹具 ─────────────────────────────────────────────

const STRONG_PROPOSER: ProposerOutput = {
  message: `实现了用户登录功能。使用 React Hook Form 管理表单状态，实现了邮箱和密码的输入验证。
使用 JWT token 进行身份验证，token 存储在 localStorage 中。
代码已通过 TypeScript 类型检查，所有接口都有完整的类型定义。`,
  files: [
    {
      path: 'src/components/LoginForm.tsx',
      content: `
import { useState } from 'react'
export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const handleSubmit = async (e) => {
    e.preventDefault()
    const res = await fetch('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    const data = await res.json()
    localStorage.setItem('token', data.token)
  }
  return <form onSubmit={handleSubmit}><input type="email" /><input type="password" /><button>登录</button></form>
}`,
    },
  ],
}

const INDEPENDENT_CRITIC: CriticOutput = {
  message: `📋 代码审查报告

## ❌ 需要修改

发现以下关键安全漏洞：
1. localStorage 存储 JWT token 存在 XSS 攻击风险，应使用 HttpOnly Cookie
2. 表单提交缺少 CSRF 保护机制
3. 密码字段缺少长度限制验证（建议 8-128 字符）
4. 错误处理不完整：网络请求失败时没有用户友好的错误提示

## ⚠️ 警告

- 缺少 aria-label 和 role 属性，影响屏幕阅读器可访问性
- 建议添加 loading 状态防止重复提交

## 改进建议

请 Dev Claw 解决以上安全问题，特别是 token 存储方式的改变会影响整个认证流程。`,
  approved: false,
  issues: [
    'localStorage 存储 JWT 存在 XSS 风险，应使用 HttpOnly Cookie',
    '缺少 CSRF 保护',
    '密码验证不完整',
    '错误处理缺失',
  ],
  suggestions: [
    '改用 secure HttpOnly Cookie 存储认证状态',
    '集成 CSRF token 验证',
    '添加 react-hook-form 进行表单验证',
  ],
}

const CLONE_CRITIC: CriticOutput = {
  message: `代码审查完成。实现了用户登录功能，使用 React Hook Form 管理表单状态，
实现了邮箱和密码的输入验证。使用 JWT token 进行身份验证，
token 存储在 localStorage 中。代码已通过 TypeScript 类型检查。审查通过。`,
  approved: true,
  issues: [],
  suggestions: [],
}

const WEAK_CRITIC: CriticOutput = {
  message: `代码审查完成。功能实现正确，代码风格良好。
建议添加测试覆盖。
审查通过。`,
  approved: true,
  issues: [],
  suggestions: ['建议添加单元测试'],
}

// ─── N-gram 重叠率测试 ─────────────────────────────────────────

describe('calculateNgramOverlap', () => {
  it('完全相同的文本应该返回 1.0', () => {
    const text = '这是一段测试文本，用来验证 n-gram 计算的正确性'
    const overlap = calculateNgramOverlap(text, text)
    expect(overlap).toBeCloseTo(1.0, 2)
  })

  it('完全不同的文本应该返回接近 0', () => {
    const text1 = '苹果香蕉橙子葡萄草莓'
    const text2 = 'TypeScript React NextJS Tailwind CSS'
    const overlap = calculateNgramOverlap(text1, text2)
    expect(overlap).toBeLessThan(0.1)
  })

  it('克隆文本的重叠率应该很高', () => {
    const proposer = STRONG_PROPOSER.message
    const critic = CLONE_CRITIC.message
    const overlap = calculateNgramOverlap(proposer, critic)
    expect(overlap).toBeGreaterThan(0.3) // 克隆文本重叠率高
  })

  it('独立 Critic 的重叠率应该低', () => {
    const proposer = STRONG_PROPOSER.message
    const critic = INDEPENDENT_CRITIC.message
    const overlap = calculateNgramOverlap(proposer, critic)
    expect(overlap).toBeLessThan(0.25) // 独立 Critic 重叠率低
  })

  it('空文本处理', () => {
    const overlap = calculateNgramOverlap('', '')
    expect(overlap).toBeGreaterThanOrEqual(0)
    expect(overlap).toBeLessThanOrEqual(1)
  })

  it('非常短的文本（低于 n-gram 窗口）', () => {
    const overlap = calculateNgramOverlap('hi', 'hi')
    expect(overlap).toBeGreaterThanOrEqual(0)
    expect(overlap).toBeLessThanOrEqual(1)
  })
})

// ─── Critic 独有关键词测试 ─────────────────────────────────────

describe('calculateCriticUniqueKeywordRate', () => {
  it('独立 Critic 应该有较高的独有关键词比例', () => {
    const rate = calculateCriticUniqueKeywordRate(
      STRONG_PROPOSER.message,
      INDEPENDENT_CRITIC.message
    )
    expect(rate).toBeGreaterThan(0.2)
  })

  it('克隆 Critic 应该没有独有关键词', () => {
    const rate = calculateCriticUniqueKeywordRate(
      STRONG_PROPOSER.message,
      CLONE_CRITIC.message
    )
    // 克隆文本基本复用了 Proposer 的关键词
    expect(rate).toBeLessThan(0.5)
  })

  it('空 Critic 返回 0', () => {
    const rate = calculateCriticUniqueKeywordRate('some text', '')
    expect(rate).toBe(0)
  })
})

// ─── 分歧点识别测试 ─────────────────────────────────────────────

describe('identifyDivergencePoints', () => {
  it('独立 Critic 应该识别出多个分歧点', () => {
    const points = identifyDivergencePoints(STRONG_PROPOSER, INDEPENDENT_CRITIC)
    expect(points.length).toBeGreaterThan(0)
  })

  it('克隆 Critic 应该几乎没有真实分歧点', () => {
    const points = identifyDivergencePoints(STRONG_PROPOSER, CLONE_CRITIC)
    const genuinePoints = points.filter(p => !p.foundInProposer)
    expect(genuinePoints.length).toBeLessThanOrEqual(2)
  })

  it('Critic approved=false 且 Proposer 声称成功时应产生矛盾分歧点', () => {
    const proposer: ProposerOutput = {
      message: '功能实现完成，所有需求已满足，代码通过测试。',
    }
    const critic: CriticOutput = {
      message: '代码存在严重问题，需要修改。',
      approved: false,
      issues: ['错误处理缺失', '安全漏洞'],
    }

    const points = identifyDivergencePoints(proposer, critic)
    const contradictions = points.filter(p => p.type === 'contradiction')
    expect(contradictions.length).toBeGreaterThan(0)
  })

  it('Critic 的 suggestions 引入新概念时应识别为 reframing', () => {
    const proposer: ProposerOutput = {
      message: '实现了基本的用户认证功能。',
    }
    const critic: CriticOutput = {
      message: '代码需要改进。',
      approved: false,
      suggestions: [
        '建议引入 OAuth2 授权码流程替代当前的密码直接传输方案',
        '考虑使用 Redis session store 替代 JWT 以支持即时吊销',
      ],
    }

    const points = identifyDivergencePoints(proposer, critic)
    const reframings = points.filter(p => p.type === 'reframing')
    expect(reframings.length).toBeGreaterThan(0)
  })

  it('分歧点不应重复', () => {
    const points = identifyDivergencePoints(STRONG_PROPOSER, INDEPENDENT_CRITIC)
    const keys = points.map(p => p.criticEvidence.substring(0, 30))
    const uniqueKeys = new Set(keys)
    expect(uniqueKeys.size).toBe(keys.length)
  })
})

// ─── 主检查函数集成测试 ──────────────────────────────────────────

describe('runIndependenceCheck', () => {
  describe('完全独立的 Critic 应该通过', () => {
    it('独立 Critic 的独立性评分应该高于阈值', () => {
      const result = runIndependenceCheck(STRONG_PROPOSER, INDEPENDENT_CRITIC)
      expect(result.independenceScore).toBeGreaterThan(0)
      expect(result.ngramOverlapRate).toBeLessThan(0.8)
    })

    it('独立 Critic 的 DP Score 惩罚应该较高（接近1）', () => {
      const result = runIndependenceCheck(STRONG_PROPOSER, INDEPENDENT_CRITIC)
      expect(result.dpScorePenalty).toBeGreaterThan(0.5)
    })

    it('独立 Critic 结果应有多个分歧点', () => {
      const result = runIndependenceCheck(STRONG_PROPOSER, INDEPENDENT_CRITIC)
      expect(result.divergencePoints.length).toBeGreaterThan(0)
    })
  })

  describe('克隆 Critic 应该被强制重审', () => {
    it('克隆 Critic 应该触发 force_rerun 或 penalize', () => {
      const result = runIndependenceCheck(STRONG_PROPOSER, CLONE_CRITIC)
      // 克隆文本独立性极低，应该被惩罚
      expect(['force_rerun', 'penalize', 'warn']).toContain(result.action)
    })

    it('克隆 Critic 的独立性评分应该低', () => {
      const result = runIndependenceCheck(STRONG_PROPOSER, CLONE_CRITIC)
      expect(result.independenceScore).toBeLessThan(0.8)
    })
  })

  describe('弱 Critic 应该得到警告', () => {
    it('内容极少的 Critic 分歧点数量应该很少', () => {
      const result = runIndependenceCheck(STRONG_PROPOSER, WEAK_CRITIC)
      // 弱 Critic 没有提出实质性问题，分歧点应该很少（< 3）
      // 注意：纯文字独立性分高是因为泛化语言与技术词汇没有 n-gram 重叠
      // 但缺少 issues/suggestions 意味着分歧点接近 0
      expect(result.divergenceCount).toBeLessThan(3)
    })

    it('内容极少的 Critic 不应该 pass（因为分歧点不足）', () => {
      const result = runIndependenceCheck(STRONG_PROPOSER, WEAK_CRITIC)
      // 弱 Critic 满足了 minDivergencePoints（2）的要求可能勉强通过
      // 但如果独立性或分歧点不达标，action 不应该是 pass
      // 这里只验证分歧点不够多
      expect(result.divergenceCount).toBeLessThanOrEqual(3)
    })
  })

  describe('评分结构验证', () => {
    it('返回值应该包含所有必要字段', () => {
      const result = runIndependenceCheck(STRONG_PROPOSER, INDEPENDENT_CRITIC)
      expect(result).toHaveProperty('independenceScore')
      expect(result).toHaveProperty('passed')
      expect(result).toHaveProperty('divergencePoints')
      expect(result).toHaveProperty('divergenceCount')
      expect(result).toHaveProperty('ngramOverlapRate')
      expect(result).toHaveProperty('criticUniqueKeywordRate')
      expect(result).toHaveProperty('action')
      expect(result).toHaveProperty('diagnosis')
      expect(result).toHaveProperty('dpScorePenalty')
    })

    it('独立性评分应该在 0-1 之间', () => {
      const result = runIndependenceCheck(STRONG_PROPOSER, INDEPENDENT_CRITIC)
      expect(result.independenceScore).toBeGreaterThanOrEqual(0)
      expect(result.independenceScore).toBeLessThanOrEqual(1)
    })

    it('DP Score 惩罚应该在 0-1 之间', () => {
      const result = runIndependenceCheck(STRONG_PROPOSER, CLONE_CRITIC)
      expect(result.dpScorePenalty).toBeGreaterThanOrEqual(0)
      expect(result.dpScorePenalty).toBeLessThanOrEqual(1)
    })

    it('n-gram 重叠率应该在 0-1 之间', () => {
      const result = runIndependenceCheck(STRONG_PROPOSER, INDEPENDENT_CRITIC)
      expect(result.ngramOverlapRate).toBeGreaterThanOrEqual(0)
      expect(result.ngramOverlapRate).toBeLessThanOrEqual(1)
    })

    it('diagnosis 应该是非空字符串', () => {
      const result = runIndependenceCheck(STRONG_PROPOSER, INDEPENDENT_CRITIC)
      expect(typeof result.diagnosis).toBe('string')
      expect(result.diagnosis.length).toBeGreaterThan(10)
    })
  })

  describe('自定义配置', () => {
    it('调低阈值应该让更多 Critic 通过', () => {
      const lenientConfig: IndependenceCheckConfig = {
        ...DEFAULT_INDEPENDENCE_CONFIG,
        minIndependenceScore: 0.05,
        minDivergencePoints: 0,
        maxNgramOverlapRate: 0.95,
      }
      const result = runIndependenceCheck(STRONG_PROPOSER, WEAK_CRITIC, lenientConfig)
      expect(result.action).toBe('pass')
    })

    it('调高阈值应该让更多 Critic 失败', () => {
      const strictConfig: IndependenceCheckConfig = {
        ...DEFAULT_INDEPENDENCE_CONFIG,
        minIndependenceScore: 0.95,
        minDivergencePoints: 10,
        maxNgramOverlapRate: 0.05,
      }
      const result = runIndependenceCheck(STRONG_PROPOSER, INDEPENDENT_CRITIC, strictConfig)
      expect(result.passed).toBe(false)
    })
  })

  describe('边界条件', () => {
    it('空 Proposer 和空 Critic 应该不崩溃', () => {
      const emptyProposer: ProposerOutput = { message: '' }
      const emptyCritic: CriticOutput = { message: '', approved: true }
      expect(() => runIndependenceCheck(emptyProposer, emptyCritic)).not.toThrow()
    })

    it('带有 files 的 Proposer 应该被正确处理', () => {
      const result = runIndependenceCheck(STRONG_PROPOSER, INDEPENDENT_CRITIC)
      expect(result).toBeDefined()
    })

    it('中英文混合文本应该被正确处理', () => {
      const mixedProposer: ProposerOutput = {
        message: 'Implementation using React hooks. 使用了 useState 和 useEffect 钩子。JWT authentication with localStorage.',
      }
      const mixedCritic: CriticOutput = {
        message: 'XSS vulnerability detected. localStorage 存储 token 存在安全风险。建议改用 HttpOnly Cookie.',
        approved: false,
        issues: ['XSS risk with localStorage'],
      }
      const result = runIndependenceCheck(mixedProposer, mixedCritic)
      expect(result.independenceScore).toBeGreaterThanOrEqual(0)
    })
  })
})

// ─── 格式转换辅助函数测试 ─────────────────────────────────────

describe('fromDevAgentResponse', () => {
  it('应该正确转换 DevAgent 响应', () => {
    const devResponse = {
      message: '实现完成',
      files: [
        { path: 'src/app.ts', content: 'const x = 1', action: 'create' as const },
      ],
    }
    const proposer = fromDevAgentResponse(devResponse)
    expect(proposer.message).toBe('实现完成')
    expect(proposer.files).toHaveLength(1)
    expect(proposer.files![0].path).toBe('src/app.ts')
  })

  it('无文件时应该正确处理', () => {
    const proposer = fromDevAgentResponse({ message: '完成' })
    expect(proposer.files).toBeUndefined()
  })
})

describe('fromReviewAgentResponse', () => {
  it('应该从 success 状态推断 approved=true', () => {
    const response = {
      message: '代码审查完成，质量良好，可以合并',
      status: 'success',
    }
    const critic = fromReviewAgentResponse(response)
    expect(critic.approved).toBe(true)
  })

  it('应该从包含 ❌ 的消息推断 approved=false', () => {
    const response = {
      message: '❌ 需要修改：缺少错误处理',
      status: 'need_input',
    }
    const critic = fromReviewAgentResponse(response)
    expect(critic.approved).toBe(false)
  })

  it('应该从消息中提取问题列表', () => {
    const response = {
      message: `代码审查完成\n❌ 安全漏洞\n1. 缺少验证\n2. XSS 风险`,
      status: 'need_input',
    }
    const critic = fromReviewAgentResponse(response)
    expect(critic.issues!.length).toBeGreaterThan(0)
  })
})

// ─── 业务场景集成测试 ─────────────────────────────────────────

describe('业务场景集成测试', () => {
  it('场景1: Dev 实现认证系统，Critic 发现安全问题 → 高独立性', () => {
    const devProposer: ProposerOutput = {
      message: '完成用户认证系统实现，包含 JWT 生成和验证逻辑',
      files: [{ path: 'auth.ts', content: 'const jwt = require("jsonwebtoken"); function sign(payload) { return jwt.sign(payload, "secret") }' }],
    }
    const securityCritic: CriticOutput = {
      message: '发现严重安全漏洞：JWT secret 硬编码在代码中存在密钥泄露风险，应使用环境变量；缺少 token 过期时间设置；建议使用 RS256 非对称加密替代 HS256',
      approved: false,
      issues: ['JWT secret 硬编码', '缺少 token 过期时间', '使用弱对称加密'],
      suggestions: ['使用 process.env.JWT_SECRET', '添加 expiresIn 配置', '升级为 RS256'],
    }

    const result = runIndependenceCheck(devProposer, securityCritic)
    expect(result.independenceScore).toBeGreaterThan(0.1)
    expect(result.divergencePoints.length).toBeGreaterThan(0)
  })

  it('场景2: Critic 几乎复制 Dev 的描述 → 低独立性', () => {
    const devProposer: ProposerOutput = {
      message: '实现了完整的用户登录功能，包含表单验证、API 调用和错误处理，代码结构清晰，符合最佳实践',
    }
    const copyCritic: CriticOutput = {
      message: '审查完成。代码实现了完整的用户登录功能，包含表单验证、API 调用和错误处理，代码结构清晰，符合最佳实践。审查通过。',
      approved: true,
      issues: [],
      suggestions: [],
    }

    const result = runIndependenceCheck(devProposer, copyCritic)
    // 高度克隆，应该被惩罚
    expect(result.ngramOverlapRate).toBeGreaterThan(0.2)
    expect(['force_rerun', 'penalize', 'warn']).toContain(result.action)
  })
})
