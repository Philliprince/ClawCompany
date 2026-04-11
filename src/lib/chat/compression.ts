/**
 * Context Compression — lightweight Hermes-style history compressor
 *
 * Trigger conditions (either):
 *   - message count > COMPRESSION_TRIGGER_COUNT (20)
 *   - estimated token count > COMPRESSION_TRIGGER_TOKENS (50K)
 *
 * Compression strategy:
 *   1. Keep last RECENT_KEEP (5) messages verbatim
 *   2. Summarise older messages via LLM (≤ SUMMARY_MAX_CHARS chars)
 *   3. Return: [summary message] + [last 5 messages]
 *
 * Falls back to a simple tail-truncation summary when no LLM is available.
 */

import { ChatMessage } from '../core/types'
import { getLLMProvider } from '../llm/factory'

// ─── Thresholds ────────────────────────────────────────────────────────────────

/** Trigger compression when stored message count exceeds this. */
export const COMPRESSION_TRIGGER_COUNT = 20

/**
 * Trigger compression when estimated token count exceeds this.
 * Token estimate: characters / 4 (rough but safe for mixed CJK+Latin text).
 */
export const COMPRESSION_TRIGGER_TOKENS = 50_000

/** Number of most-recent messages to keep verbatim after compression. */
export const RECENT_KEEP = 5

/**
 * Maximum character budget for the LLM-generated summary
 * (~2000 tokens × 4 chars/token for mixed CJK).
 */
export const SUMMARY_MAX_CHARS = 8_000

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Rough token estimate: 1 token ≈ 4 chars (safe for CJK + English mix). */
function estimateTokens(messages: ChatMessage[]): number {
  return Math.ceil(
    messages.reduce((sum, m) => sum + m.content.length, 0) / 4,
  )
}

/** Returns true when the history is large enough to warrant compression. */
export function shouldCompress(messages: ChatMessage[]): boolean {
  return (
    messages.length > COMPRESSION_TRIGGER_COUNT ||
    estimateTokens(messages) > COMPRESSION_TRIGGER_TOKENS
  )
}

/** Simple fallback summary when LLM is unavailable. */
function buildFallbackSummary(messages: ChatMessage[]): string {
  const lines = messages
    .slice(-10)
    .map(m => `[${m.agent}]: ${m.content.slice(0, 200)}`)
    .join('\n')
  return (
    `[历史摘要 - 共 ${messages.length} 条消息，以下为最近 10 条摘录]\n${lines}`
  )
}

// ─── Main export ───────────────────────────────────────────────────────────────

/**
 * Compress chat history if it exceeds configured thresholds.
 *
 * Returns the original array unchanged when compression is not needed.
 * When compression is triggered:
 *   - Calls the LLM to summarise older messages (or uses fallback)
 *   - Returns [summaryMessage, ...last-5-messages]
 *
 * @param messages  Full chat history from ChatManager.getHistory()
 * @param llm       Optional LLM provider override (defaults to getLLMProvider())
 */
export async function compressHistory(
  messages: ChatMessage[],
  llm?: ReturnType<typeof getLLMProvider>,
): Promise<ChatMessage[]> {
  if (!shouldCompress(messages)) return messages

  const recentMessages = messages.slice(-RECENT_KEEP)
  const olderMessages = messages.slice(0, -RECENT_KEEP)

  // Edge case: nothing old enough to summarise
  if (olderMessages.length === 0) return messages

  let summaryContent: string

  // Detect if the first message is already a compaction summary (for iterative update)
  const firstMsg = olderMessages[0]
  const isPreviousSummary =
    firstMsg?.metadata?.taskId === 'context-compression-summary' &&
    firstMsg.content.startsWith('[历史摘要')

  const provider = llm ?? getLLMProvider()
  if (provider) {
    try {
      const historyText = olderMessages
        .map(m => `[${m.agent}]: ${m.content}`)
        .join('\n')
        // Guard: don't feed absurdly large text to the LLM
        .slice(0, 60_000)

      // Estimate a token budget for the summary (~2000 tokens × 4 chars/token)
      const summaryBudget = Math.min(2000, Math.floor(SUMMARY_MAX_CHARS / 4))

      // ─── Hermes-style 8-section summary prompts ─────────────────────────
      const SECTION_TEMPLATE = `## Goal
[What the multi-agent team is trying to accomplish for the user]

## Constraints & Preferences
[User preferences, coding style, constraints, important decisions, tech stack choices]

## Progress
### Done
[Completed work — include specific file paths, commands run, results obtained]
### In Progress
[Work currently underway or partially completed]
### Blocked
[Any blockers, errors, or issues encountered]

## Key Decisions
[Important technical decisions made by PM/dev/review agents and why]

## Relevant Files
[Files read, modified, or created — with brief note on each]

## Next Steps
[What needs to happen next to continue the work]

## Critical Context
[Any specific values, error messages, configuration details, or data that would be lost without explicit preservation]

## Tools & Patterns
[Which agent roles were used, how tasks were delegated, any workflow patterns or discoveries]`

      let systemPrompt: string
      let userPrompt: string

      if (isPreviousSummary) {
        // Iterative update: incorporate new turns into existing summary
        const previousSummary = firstMsg.content
        const newTurnsText = olderMessages
          .slice(1)
          .map(m => `[${m.agent}]: ${m.content}`)
          .join('\n')
          .slice(0, 50_000)

        systemPrompt = `You are updating a context compaction summary for a multi-agent coding system (ClawCompany). A previous compaction produced the summary below. New conversation turns have occurred since then and need to be incorporated.`

        userPrompt = `PREVIOUS SUMMARY:
${previousSummary}

NEW TURNS TO INCORPORATE:
${newTurnsText}

Update the summary using this exact structure. PRESERVE all existing information that is still relevant. ADD new progress. Move items from "In Progress" to "Done" when completed. Remove information only if it is clearly obsolete.

${SECTION_TEMPLATE}

Target ~${summaryBudget} tokens. Be specific — include file paths, command outputs, error messages, and concrete values rather than vague descriptions. The goal is to prevent agents from repeating work or losing important details.

Write only the summary body. Do not include any preamble or prefix.`
      } else {
        // First compression
        systemPrompt = `You are a context compaction assistant for ClawCompany, a multi-agent software development system. Create a structured handoff summary so agents can continue work after earlier turns are compacted.`

        userPrompt = `TURNS TO SUMMARIZE:
${historyText}

Use this exact structure:

${SECTION_TEMPLATE}

Target ~${summaryBudget} tokens. Be specific — include file paths, command outputs, error messages, and concrete values rather than vague descriptions. The goal is to prevent agents from repeating work or losing important details.

Write only the summary body. Do not include any preamble or prefix.`
      }
      // ────────────────────────────────────────────────────────────────────

      const response = await provider.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ])

      summaryContent = response
        ? `[历史摘要 - 已压缩 ${olderMessages.length} 条消息]\n${response}`
        : buildFallbackSummary(olderMessages)
    } catch {
      summaryContent = buildFallbackSummary(olderMessages)
    }
  } else {
    summaryContent = buildFallbackSummary(olderMessages)
  }

  // Clamp summary to character budget
  if (summaryContent.length > SUMMARY_MAX_CHARS) {
    summaryContent = summaryContent.slice(0, SUMMARY_MAX_CHARS) + '\n[摘要已截断]'
  }

  const summaryMessage: ChatMessage = {
    agent: 'pm' as const,
    content: summaryContent,
    type: 'text',
    // Use oldest message's timestamp so ordering is preserved
    timestamp: olderMessages[0]?.timestamp ?? new Date(),
    metadata: {
      taskId: 'context-compression-summary',
    },
  }

  return [summaryMessage, ...recentMessages]
}
