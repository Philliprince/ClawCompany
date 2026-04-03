import {
  ErrorRecovery,
  RecoveryStrategy,
  RecoveryResult,
  CircuitState,
} from '../error-recovery'
import { AppError, AgentError, LLMError, ErrorCategory, ErrorSeverity } from '../errors'

describe('ErrorRecovery', () => {
  let recovery: ErrorRecovery

  beforeEach(() => {
    recovery = new ErrorRecovery()
  })

  describe('handleError', () => {
    it('should return retry strategy for agent errors', async () => {
      const error = new AgentError('Agent timeout', 'dev', { taskId: 'task-1' })
      const result = await recovery.handleError(error)
      expect(result.strategy).toBe(RecoveryStrategy.RETRY)
      expect(result.recovered).toBe(false)
    })

    it('should return fallback strategy for LLM errors when fallback exists', async () => {
      const error = new LLMError('API error', 'glm')
      const result = await recovery.handleError(error, {
        fallback: async () => 'fallback result',
      })
      expect(result.strategy).toBe(RecoveryStrategy.FALLBACK)
      expect(result.recovered).toBe(true)
      expect(result.result).toBe('fallback result')
    })

    it('should return circuit_breaker strategy for repeated failures', async () => {
      const error = new LLMError('API error', 'glm')
      const key = 'llm-glm'
      for (let i = 0; i < 5; i++) {
        await recovery.handleError(error, { circuitKey: key })
      }
      const result = await recovery.handleError(error, { circuitKey: key })
      expect(result.strategy).toBe(RecoveryStrategy.CIRCUIT_BREAKER)
    })

    it('should return skip strategy for validation errors', async () => {
      const error = new AppError('VALIDATION', 'bad input', ErrorCategory.VALIDATION, {
        severity: ErrorSeverity.LOW,
      })
      const result = await recovery.handleError(error)
      expect(result.strategy).toBe(RecoveryStrategy.SKIP)
    })

    it('should return terminate strategy for critical errors', async () => {
      const error = new AppError('CRITICAL', 'system down', ErrorCategory.SYSTEM, {
        severity: ErrorSeverity.CRITICAL,
      })
      const result = await recovery.handleError(error)
      expect(result.strategy).toBe(RecoveryStrategy.TERMINATE)
    })
  })

  describe('circuit breaker', () => {
    it('should start in closed state', () => {
      expect(recovery.getCircuitState('test')).toBe(CircuitState.CLOSED)
    })

    it('should open after threshold failures', async () => {
      const error = new LLMError('fail', 'glm')
      for (let i = 0; i < 5; i++) {
        await recovery.handleError(error, { circuitKey: 'test-circuit' })
      }
      expect(recovery.getCircuitState('test-circuit')).toBe(CircuitState.OPEN)
    })

    it('should transition to half-open after cooldown', async () => {
      const shortRecovery = new ErrorRecovery({ circuitCooldown: 10 })
      const error = new LLMError('fail', 'glm')
      for (let i = 0; i < 5; i++) {
        await shortRecovery.handleError(error, { circuitKey: 'fast-circuit' })
      }
      expect(shortRecovery.getCircuitState('fast-circuit')).toBe(CircuitState.OPEN)
      await new Promise(r => setTimeout(r, 20))
      expect(shortRecovery.getCircuitState('fast-circuit')).toBe(CircuitState.HALF_OPEN)
    })

    it('should reset circuit on success', async () => {
      const error = new LLMError('fail', 'glm')
      for (let i = 0; i < 5; i++) {
        await recovery.handleError(error, { circuitKey: 'reset-circuit' })
      }
      expect(recovery.getCircuitState('reset-circuit')).toBe(CircuitState.OPEN)
      recovery.recordSuccess('reset-circuit')
      expect(recovery.getCircuitState('reset-circuit')).toBe(CircuitState.CLOSED)
    })
  })

  describe('recovery stats', () => {
    it('should track recovery statistics', async () => {
      const error = new AgentError('fail', 'dev')
      await recovery.handleError(error)
      await recovery.handleError(error)
      const stats = recovery.getStats()
      expect(stats.totalErrors).toBe(2)
      expect(stats.errorsByCategory[ErrorCategory.AGENT]).toBe(2)
    })
  })
})
