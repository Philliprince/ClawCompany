/**
 * Shadow Git Checkpoint — safe code exploration snapshots for Reviewers
 *
 * Each checkpoint is a self-contained shadow git repo stored at:
 *   ~/.clawcompany/checkpoints/{id}/
 *
 * Isolation is achieved via GIT_DIR + GIT_WORK_TREE env vars so the
 * project's own .git is never touched.
 *
 * Typical reviewer flow:
 *   1. const id = await createCheckpoint('/path/to/project', 'before applying fix')
 *   2. // apply the PR fix, run tests, explore safely
 *   3. await rollback(id)  // ← project is restored exactly
 *
 * Design differences from FileSnapshotManager (tasks/file-snapshot-manager.ts):
 *   - Each checkpoint is an independent git repo (not a single shared repo with
 *     multiple commits), making checkpoints portable and independently deletable.
 *   - Stored at ~/.clawcompany/checkpoints/{uuid}/ with a meta.json sidecar.
 *   - Public API uses `createCheckpoint / listCheckpoints / rollback` naming to
 *     match the Hermes-style checkpoint vocabulary.
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as crypto from 'crypto'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CheckpointMeta {
  /** Unique checkpoint id (UUID v4 short) */
  id: string
  /** Absolute path of the working directory that was snapshotted */
  workDir: string
  /** Human-readable label supplied by the caller */
  label: string
  /** ISO 8601 timestamp */
  createdAt: string
  /** Short git SHA of the snapshot commit */
  sha: string
}

// ─── Paths ────────────────────────────────────────────────────────────────────

const CHECKPOINTS_ROOT = path.join(os.homedir(), '.clawcompany', 'checkpoints')

function checkpointDir(id: string): string {
  return path.join(CHECKPOINTS_ROOT, id)
}

function gitDir(id: string): string {
  return path.join(checkpointDir(id), '.git')
}

function metaPath(id: string): string {
  return path.join(checkpointDir(id), 'meta.json')
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomBytes(8).toString('hex')
}

/**
 * Run a git command with GIT_DIR pointing at the checkpoint repo and
 * GIT_WORK_TREE pointing at the project directory.
 */
function git(
  args: string,
  checkpointId: string,
  workDir: string,
  extraEnv?: Record<string, string>,
): string {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_DIR: gitDir(checkpointId),
    GIT_WORK_TREE: workDir,
    GIT_TERMINAL_PROMPT: '0',
    GIT_AUTHOR_NAME: 'ClawCompany Checkpoint',
    GIT_AUTHOR_EMAIL: 'checkpoint@clawcompany.local',
    GIT_COMMITTER_NAME: 'ClawCompany Checkpoint',
    GIT_COMMITTER_EMAIL: 'checkpoint@clawcompany.local',
    ...(extraEnv as NodeJS.ProcessEnv),
  }

  try {
    return execSync(`git ${args}`, {
      cwd: workDir,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
      .toString()
      .trim()
  } catch (err) {
    const stderr =
      (err as { stderr?: Buffer }).stderr?.toString().trim() ?? ''
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(
      `[shadow-git] git ${args.split(' ')[0]} failed:\n${stderr || msg}`,
    )
  }
}

function readMeta(id: string): CheckpointMeta | null {
  const p = metaPath(id)
  if (!fs.existsSync(p)) return null
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as CheckpointMeta
  } catch {
    return null
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a new checkpoint of `workDir`.
 *
 * Initialises a fresh shadow git repo at ~/.clawcompany/checkpoints/{id}/,
 * stages all files (respecting the project's .gitignore), commits them, and
 * writes a meta.json sidecar.
 *
 * @param workDir   Absolute path to the project directory to snapshot.
 * @param label     Human-readable description, e.g. "before applying PR #42".
 * @returns         The checkpoint id (use this with `rollback`).
 */
export function createCheckpoint(workDir: string, label: string): string {
  const resolvedWorkDir = path.resolve(workDir)

  if (!fs.existsSync(resolvedWorkDir)) {
    throw new Error(`[shadow-git] workDir does not exist: ${resolvedWorkDir}`)
  }

  const id = generateId()
  const dir = checkpointDir(id)

  fs.mkdirSync(dir, { recursive: true })

  // Init bare-ish git repo — only the .git data dir lives inside the
  // checkpoint dir; the work tree is the original project.
  execSync(`git init --bare "${path.join(dir, '.git')}"`, { stdio: 'pipe' })

  // Configure identity (required for commits on machines without global config)
  execSync(`git config user.email "checkpoint@clawcompany.local"`, {
    env: { ...process.env, GIT_DIR: gitDir(id) },
    stdio: 'pipe',
  })
  execSync(`git config user.name "ClawCompany Checkpoint"`, {
    env: { ...process.env, GIT_DIR: gitDir(id) },
    stdio: 'pipe',
  })

  // Stage all project files
  git('add -A', id, resolvedWorkDir)

  // Commit (allow empty so the function is always idempotent)
  const safeLabel = label.replace(/"/g, "'")
  git(`commit --allow-empty -m "checkpoint: ${safeLabel}"`, id, resolvedWorkDir)

  const sha = git('rev-parse --short HEAD', id, resolvedWorkDir)

  const meta: CheckpointMeta = {
    id,
    workDir: resolvedWorkDir,
    label,
    createdAt: new Date().toISOString(),
    sha,
  }

  fs.writeFileSync(metaPath(id), JSON.stringify(meta, null, 2), 'utf8')

  return id
}

/**
 * List all checkpoints that were created for `workDir`.
 *
 * Results are sorted newest-first.
 *
 * @param workDir  Absolute path to the project directory.
 */
export function listCheckpoints(workDir: string): CheckpointMeta[] {
  const resolvedWorkDir = path.resolve(workDir)

  if (!fs.existsSync(CHECKPOINTS_ROOT)) return []

  const entries = fs.readdirSync(CHECKPOINTS_ROOT, { withFileTypes: true })

  return entries
    .filter((e) => e.isDirectory())
    .map((e) => readMeta(e.name))
    .filter((m): m is CheckpointMeta => m !== null && m.workDir === resolvedWorkDir)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
}

/**
 * Roll back `workDir` to the state captured in checkpoint `checkpointId`.
 *
 * This performs a hard checkout of the snapshot into the project work tree and
 * then removes any files that were not present at snapshot time via `git clean`.
 *
 * ⚠️  All uncommitted changes in `workDir` will be overwritten.
 *
 * @param checkpointId  Id returned by `createCheckpoint`.
 */
export function rollback(checkpointId: string): void {
  const meta = readMeta(checkpointId)
  if (!meta) {
    throw new Error(
      `[shadow-git] checkpoint '${checkpointId}' not found (missing meta.json)`,
    )
  }

  const { workDir, sha } = meta

  if (!fs.existsSync(workDir)) {
    throw new Error(
      `[shadow-git] original workDir no longer exists: ${workDir}`,
    )
  }

  // Verify the commit is still accessible
  let fullSha: string
  try {
    fullSha = git(`rev-parse --verify "${sha}^{commit}"`, checkpointId, workDir)
  } catch {
    throw new Error(
      `[shadow-git] snapshot commit '${sha}' not found in checkpoint '${checkpointId}'`,
    )
  }

  // Restore the working tree to the snapshot commit
  git(`checkout "${fullSha}" -- .`, checkpointId, workDir)

  // Remove files that did not exist at snapshot time
  git('clean -fd', checkpointId, workDir)
}

/**
 * Delete a checkpoint and its shadow git data.
 *
 * @param checkpointId  Id returned by `createCheckpoint`.
 */
export function deleteCheckpoint(checkpointId: string): void {
  const dir = checkpointDir(checkpointId)
  if (!fs.existsSync(dir)) {
    throw new Error(`[shadow-git] checkpoint '${checkpointId}' not found`)
  }
  fs.rmSync(dir, { recursive: true, force: true })
}
