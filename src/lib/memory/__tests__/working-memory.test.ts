/**
 * Unit tests for WorkingMemory
 */

import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { WorkingMemory } from '../working-memory'

const TEST_DB = path.join(os.tmpdir(), `wm-test-${Date.now()}.db`)

describe('WorkingMemory', () => {
  let mem: WorkingMemory

  beforeEach(() => {
    WorkingMemory.resetInstance()
    mem = new WorkingMemory(TEST_DB)
  })

  afterEach(() => {
    // Clean up
    try { fs.unlinkSync(TEST_DB) } catch { /* ignore */ }
  })

  // ─── remember / recall ─────────────────────────────────────────

  it('should store and recall a memory entry', () => {
    mem.remember('sess-1', 'review', 'last_feedback', 'Missing error handling', 0.9)

    const entry = mem.recall('last_feedback', 'sess-1')
    expect(entry).not.toBeNull()
    expect(entry!.value).toBe('Missing error handling')
    expect(entry!.agentRole).toBe('review')
    expect(entry!.sessionId).toBe('sess-1')
    expect(entry!.importance).toBe(0.9)
  })

  it('should overwrite an existing (sessionId, agentRole, key) entry', () => {
    mem.remember('sess-1', 'review', 'feedback', 'First feedback', 0.5)
    mem.remember('sess-1', 'review', 'feedback', 'Updated feedback', 0.8)

    const entry = mem.recall('feedback', 'sess-1')
    expect(entry!.value).toBe('Updated feedback')
    expect(entry!.importance).toBe(0.8)
    expect(mem.count()).toBe(1) // only one row
  })

  it('recall without sessionId returns latest across sessions', () => {
    mem.remember('sess-A', 'dev', 'approach', 'Approach A', 0.6)
    // Small delay so timestamps differ
    mem.remember('sess-B', 'dev', 'approach', 'Approach B', 0.6)

    const entry = mem.recall('approach')
    expect(entry!.value).toBe('Approach B')
  })

  // ─── getTopMemories ────────────────────────────────────────────

  it('getTopMemories returns entries sorted by importance desc', () => {
    mem.remember('sess-1', 'pm', 'conventions', 'Use TypeScript strict mode', 0.7)
    mem.remember('sess-1', 'review', 'feedback', 'Need tests', 0.9)
    mem.remember('sess-1', 'dev', 'approach', 'Tried recursion', 0.4)

    const top = mem.getTopMemories('sess-1', 5)
    expect(top.length).toBe(3)
    expect(top[0].importance).toBe(0.9)
    expect(top[1].importance).toBe(0.7)
    expect(top[2].importance).toBe(0.4)
  })

  it('getTopMemories respects limit', () => {
    for (let i = 0; i < 6; i++) {
      mem.remember('sess-2', 'dev', `key-${i}`, `value-${i}`, i * 0.1)
    }

    const top = mem.getTopMemories('sess-2', 3)
    expect(top.length).toBe(3)
  })

  it('getTopMemories scopes to sessionId', () => {
    mem.remember('sess-X', 'dev', 'mykey', 'session X value', 0.8)
    mem.remember('sess-Y', 'dev', 'mykey', 'session Y value', 0.8)

    const topX = mem.getTopMemories('sess-X')
    expect(topX.every(e => e.sessionId === 'sess-X')).toBe(true)
    expect(topX.length).toBe(1)
  })

  // ─── getAgentMemories ──────────────────────────────────────────

  it('getAgentMemories filters by agentRole', () => {
    mem.remember('sess-1', 'review', 'r-key', 'review value', 0.9)
    mem.remember('sess-1', 'dev', 'd-key', 'dev value', 0.5)

    const reviewMems = mem.getAgentMemories('review', 'sess-1')
    expect(reviewMems.length).toBe(1)
    expect(reviewMems[0].key).toBe('r-key')
  })

  // ─── TTL / expiry ──────────────────────────────────────────────

  it('expired entries should not be recalled', async () => {
    // TTL of 1ms — effectively expires immediately
    mem.remember('sess-1', 'dev', 'temp-key', 'temp value', 0.5, 1)

    await new Promise(r => setTimeout(r, 5)) // wait 5ms

    const entry = mem.recall('temp-key', 'sess-1')
    expect(entry).toBeNull()
  })

  it('purgeExpired removes expired entries and returns count', async () => {
    mem.remember('sess-1', 'dev', 'keep', 'permanent', 0.5)
    mem.remember('sess-1', 'dev', 'expire-soon', 'will expire', 0.5, 1)

    await new Promise(r => setTimeout(r, 5))

    const deleted = mem.purgeExpired()
    expect(deleted).toBe(1)
    expect(mem.count()).toBe(1)
  })

  // ─── clear ────────────────────────────────────────────────────

  it('clear() with sessionId removes only that session', () => {
    mem.remember('sess-A', 'dev', 'k', 'v', 0.5)
    mem.remember('sess-B', 'dev', 'k', 'v', 0.5)

    mem.clear('sess-A')
    expect(mem.count()).toBe(1)
    expect(mem.recall('k', 'sess-B')).not.toBeNull()
  })

  it('clear() without sessionId removes all', () => {
    mem.remember('sess-A', 'dev', 'k1', 'v', 0.5)
    mem.remember('sess-B', 'dev', 'k2', 'v', 0.5)

    mem.clear()
    expect(mem.count()).toBe(0)
  })

  // ─── singleton ────────────────────────────────────────────────

  it('getInstance returns the same instance', () => {
    WorkingMemory.resetInstance()
    const a = WorkingMemory.getInstance(TEST_DB)
    const b = WorkingMemory.getInstance(TEST_DB)
    expect(a).toBe(b)
  })
})
