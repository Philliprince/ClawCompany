/**
 * Tests for hybrid model strategy
 */

import {
  assessTaskComplexity,
  getModelForAgent,
  describeModelStrategy,
  CLAUDE_HAIKU,
  CLAUDE_SONNET,
} from '../model-strategy'

describe('assessTaskComplexity', () => {
  it('returns simple for short task with no keywords', () => {
    expect(assessTaskComplexity('Add a button')).toBe('simple')
  })

  it('returns complex when description >= 50 chars', () => {
    const longDesc = 'a'.repeat(50)
    expect(assessTaskComplexity(longDesc)).toBe('complex')
  })

  it('returns complex when security keyword present (Chinese)', () => {
    expect(assessTaskComplexity('实现安全登录')).toBe('complex')
  })

  it('returns complex when performance keyword present', () => {
    expect(assessTaskComplexity('fix performance issue')).toBe('complex')
  })

  it('returns complex when architecture keyword present', () => {
    expect(assessTaskComplexity('重构架构设计')).toBe('complex')
  })

  it('returns complex for migration keyword', () => {
    expect(assessTaskComplexity('数据库迁移脚本')).toBe('complex')
  })

  it('returns simple for short neutral task', () => {
    expect(assessTaskComplexity('Fix typo')).toBe('simple')
  })
})

describe('getModelForAgent', () => {
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    // Remove all CLAWCOMPANY_* vars for clean state
    delete process.env.CLAWCOMPANY_PM_MODEL
    delete process.env.CLAWCOMPANY_DEV_MODEL
    delete process.env.CLAWCOMPANY_REVIEWER_MODEL
    delete process.env.CLAWCOMPANY_DA_MODEL
    delete process.env.CLAWCOMPANY_ARBITER_MODEL
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it('PM defaults to Haiku', () => {
    expect(getModelForAgent('pm')).toBe(CLAUDE_HAIKU)
  })

  it('PM escalates to Sonnet for complex task', () => {
    expect(getModelForAgent('pm', '系统架构重构')).toBe(CLAUDE_SONNET)
  })

  it('PM stays Haiku for simple task', () => {
    expect(getModelForAgent('pm', 'Fix typo')).toBe(CLAUDE_HAIKU)
  })

  it('Dev always returns Sonnet', () => {
    expect(getModelForAgent('dev')).toBe(CLAUDE_SONNET)
  })

  it('Dev returns Sonnet even with no env override', () => {
    expect(getModelForAgent('dev', '短描述')).toBe(CLAUDE_SONNET)
  })

  it('Reviewer defaults to Haiku', () => {
    expect(getModelForAgent('review')).toBe(CLAUDE_HAIKU)
  })

  it('DA defaults to Sonnet', () => {
    expect(getModelForAgent('devil-advocate')).toBe(CLAUDE_SONNET)
  })

  it('Arbiter defaults to Sonnet', () => {
    expect(getModelForAgent('arbiter')).toBe(CLAUDE_SONNET)
  })

  it('env override respected for PM', () => {
    process.env.CLAWCOMPANY_PM_MODEL = CLAUDE_SONNET
    expect(getModelForAgent('pm', 'Fix typo')).toBe(CLAUDE_SONNET)
  })

  it('env override respected for Reviewer', () => {
    process.env.CLAWCOMPANY_REVIEWER_MODEL = CLAUDE_SONNET
    expect(getModelForAgent('review')).toBe(CLAUDE_SONNET)
  })

  it('Dev env override applied with warning (non-Sonnet)', () => {
    process.env.CLAWCOMPANY_DEV_MODEL = CLAUDE_HAIKU
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const result = getModelForAgent('dev')
    expect(result).toBe(CLAUDE_HAIKU)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Code quality may be degraded'))
    warnSpy.mockRestore()
  })

  it('Dev env override = Sonnet (same as default) → no warning', () => {
    process.env.CLAWCOMPANY_DEV_MODEL = CLAUDE_SONNET
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const result = getModelForAgent('dev')
    expect(result).toBe(CLAUDE_SONNET)
    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})

describe('describeModelStrategy', () => {
  it('returns a non-empty string', () => {
    const desc = describeModelStrategy()
    expect(typeof desc).toBe('string')
    expect(desc).toContain('pm')
    expect(desc).toContain('dev')
    expect(desc).toContain('review')
  })
})
