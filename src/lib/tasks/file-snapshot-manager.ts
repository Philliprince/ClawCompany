/**
 * FileSnapshotManager — Shadow Git-based file snapshot and rollback for dev-agent workflows
 *
 * Design: Uses a separate "shadow" Git repo stored at ~/.clawcompany/snapshots/<projectHash>/
 * to capture snapshots of the project directory before dev-agent modifications.
 * On review REJECT (or any failure), the orchestrator can roll back to any prior snapshot.
 *
 * Usage:
 *   const mgr = FileSnapshotManager.forProject('/path/to/project')
 *   await mgr.init()
 *   const id = await mgr.snapshot('before dev-agent task-123')
 *   // ... dev-agent modifies files ...
 *   await mgr.rollback(id)   // undo all changes
 *   const history = mgr.listHistory()
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as crypto from 'crypto'

export interface SnapshotEntry {
  /** Git commit SHA (short) used as the stable snapshot ID */
  id: string
  /** Full 40-char commit SHA */
  sha: string
  /** Human-readable reason / label supplied at snapshot creation */
  reason: string
  /** ISO timestamp of when the snapshot was taken */
  timestamp: string
}

export class FileSnapshotManager {
  /** Absolute path of the project being tracked */
  private readonly projectDir: string
  /** Absolute path of the shadow git repo */
  private readonly shadowRepo: string

  constructor(projectDir: string) {
    this.projectDir = path.resolve(projectDir)
    const hash = crypto
      .createHash('sha256')
      .update(this.projectDir)
      .digest('hex')
      .slice(0, 16)
    this.shadowRepo = path.join(os.homedir(), '.clawcompany', 'snapshots', hash)
  }

  /** Factory helper — create a manager for the current project */
  static forProject(projectDir: string = process.cwd()): FileSnapshotManager {
    return new FileSnapshotManager(projectDir)
  }

  // ─── Private git helpers ──────────────────────────────────────

  private git(args: string, extraEnv?: Record<string, string>): string {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      GIT_DIR: path.join(this.shadowRepo, '.git'),
      GIT_WORK_TREE: this.projectDir,
      // Suppress interactive prompts
      GIT_TERMINAL_PROMPT: '0',
      ...(extraEnv as NodeJS.ProcessEnv),
    }
    try {
      return execSync(`git ${args}`, {
        cwd: this.shadowRepo,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
        .toString()
        .trim()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`[FileSnapshotManager] git ${args.split(' ')[0]} failed: ${msg}`)
    }
  }

  // ─── Public API ───────────────────────────────────────────────

  /**
   * Initialize the shadow git repo (idempotent).
   * Must be called once before snapshot() / rollback().
   */
  init(): void {
    if (!fs.existsSync(this.shadowRepo)) {
      fs.mkdirSync(this.shadowRepo, { recursive: true })
    }

    const gitDir = path.join(this.shadowRepo, '.git')
    if (!fs.existsSync(gitDir)) {
      execSync(`git init "${this.shadowRepo}"`, { stdio: 'pipe' })

      // Configure identity so commits don't fail on unconfigured machines
      this.git('config user.email "clawcompany-snapshot@local"')
      this.git('config user.name "ClawCompany Snapshot"')

      // Create an initial empty commit so rollback always has a base
      this.git('commit --allow-empty -m "chore: shadow repo initialized"', {
        GIT_DIR: path.join(this.shadowRepo, '.git'),
        GIT_WORK_TREE: this.projectDir,
        GIT_AUTHOR_NAME: 'ClawCompany Snapshot',
        GIT_AUTHOR_EMAIL: 'clawcompany-snapshot@local',
        GIT_COMMITTER_NAME: 'ClawCompany Snapshot',
        GIT_COMMITTER_EMAIL: 'clawcompany-snapshot@local',
      })
    }
  }

  /**
   * Capture the current state of the project as a new snapshot.
   * Returns a short SHA that can be used as a rollback target.
   *
   * @param reason  Human-readable label, e.g. "before dev-agent task-abc"
   * @returns short commit SHA (7 chars)
   */
  snapshot(reason: string = 'snapshot'): string {
    // Stage all tracked + untracked files (respects project's .gitignore)
    this.git('add -A')

    // Allow empty commits in case nothing changed (idempotent snapshots)
    const safeReason = reason.replace(/"/g, "'")
    this.git(
      `commit --allow-empty -m "snapshot: ${safeReason}"`,
      {
        GIT_DIR: path.join(this.shadowRepo, '.git'),
        GIT_WORK_TREE: this.projectDir,
        GIT_AUTHOR_NAME: 'ClawCompany Snapshot',
        GIT_AUTHOR_EMAIL: 'clawcompany-snapshot@local',
        GIT_COMMITTER_NAME: 'ClawCompany Snapshot',
        GIT_COMMITTER_EMAIL: 'clawcompany-snapshot@local',
      },
    )

    const shortSha = this.git('rev-parse --short HEAD')
    return shortSha
  }

  /**
   * Roll back the project working tree to the state at `snapshotId`.
   *
   * This performs a hard checkout of the snapshot commit into the project dir,
   * overwriting any current changes. Untracked files that were not present at
   * snapshot time are removed via `git clean`.
   *
   * @param snapshotId  Short or full SHA returned by snapshot()
   */
  rollback(snapshotId: string): void {
    // Verify the commit exists
    let fullSha: string
    try {
      fullSha = this.git(`rev-parse --verify "${snapshotId}^{commit}"`)
    } catch {
      throw new Error(`[FileSnapshotManager] snapshot '${snapshotId}' not found`)
    }

    // Restore the working tree to that commit
    this.git(`checkout "${fullSha}" -- .`)

    // Remove files that shouldn't exist at that snapshot
    this.git('clean -fd')
  }

  /**
   * List all snapshots in reverse chronological order.
   */
  listHistory(): SnapshotEntry[] {
    let logOutput: string
    try {
      logOutput = this.git(
        'log --format=%H|||%h|||%s|||%aI --no-walk=unsorted',
      )
      // Actually we want full log
      logOutput = this.git('log --format=%H|||%h|||%s|||%aI')
    } catch {
      return []
    }

    if (!logOutput) return []

    return logOutput
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [sha, id, subject, timestamp] = line.split('|||')
        // Strip the "snapshot: " prefix we add
        const reason = subject.startsWith('snapshot: ')
          ? subject.slice('snapshot: '.length)
          : subject
        return { id, sha, reason, timestamp }
      })
  }

  /** Return the shadow repo path (useful for debugging) */
  getShadowRepoPath(): string {
    return this.shadowRepo
  }
}
