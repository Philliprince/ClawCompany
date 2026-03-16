import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * Git 管理器
 * 
 * 负责自动管理 Git 操作，包括：
 * - 自动 commit 生成的代码
 * - 推送到远程仓库
 * - 分支管理
 * - 状态检查
 * 
 * 安全策略：
 * 1. 只在项目目录内操作
 * 2. 检查 Git 仓库状态
 * 3. 避免敏感信息泄露
 */

export interface GitStatus {
  isRepo: boolean
  branch: string
  hasChanges: boolean
  files: string[]
  ahead: number
  behind: number
}

export interface CommitResult {
  success: boolean
  commitHash?: string
  message?: string
  error?: string
}

export class GitManager {
  private projectDir: string

  constructor(projectDir: string) {
    this.projectDir = projectDir
  }

  /**
   * 检查 Git 状态
   */
  async status(): Promise<GitStatus> {
    try {
      // 检查是否是 Git 仓库
      await this.exec('git rev-parse --git-dir')

      // 获取当前分支
      const { stdout: branch } = await this.exec('git rev-parse --abbrev-ref HEAD')

      // 获取变更文件
      const { stdout: status } = await this.exec('git status --porcelain')
      const files = status.split('\n').filter(f => f.trim()).map(f => f.substring(3))

      // 获取 ahead/behind
      const { stdout: upstream } = await this.exec('git rev-parse --abbrev-ref @{upstream} 2>/dev/null || echo ""')
      let ahead = 0
      let behind = 0

      if (upstream.trim()) {
        try {
          const { stdout: counts } = await this.exec(`git rev-list --left-right --count ${upstream.trim()}...HEAD`)
          const [behindCount, aheadCount] = counts.trim().split('\t').map(Number)
          ahead = aheadCount || 0
          behind = behindCount || 0
        } catch {
          // 忽略错误
        }
      }

      return {
        isRepo: true,
        branch: branch.trim(),
        hasChanges: files.length > 0,
        files,
        ahead,
        behind
      }
    } catch (error) {
      return {
        isRepo: false,
        branch: '',
        hasChanges: false,
        files: [],
        ahead: 0,
        behind: 0
      }
    }
  }

  /**
   * 添加文件到暂存区
   */
  async add(files?: string[]): Promise<void> {
    if (files && files.length > 0) {
      // 添加指定文件
      for (const file of files) {
        await this.exec(`git add "${file}"`)
      }
    } else {
      // 添加所有文件
      await this.exec('git add -A')
    }
  }

  /**
   * 提交更改
   */
  async commit(message: string): Promise<CommitResult> {
    try {
      // 检查是否有更改
      const status = await this.status()
      if (!status.hasChanges) {
        return {
          success: false,
          error: 'No changes to commit'
        }
      }

      // 添加所有更改
      await this.add()

      // 提交
      const { stdout } = await this.exec(`git commit -m "${message}"`)

      // 获取 commit hash
      const { stdout: hash } = await this.exec('git rev-parse HEAD')

      return {
        success: true,
        commitHash: hash.trim().substring(0, 7),
        message: `Committed ${status.files.length} files`
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * 推送到远程
   */
  async push(): Promise<CommitResult> {
    try {
      const status = await this.status()
      
      if (status.ahead === 0) {
        return {
          success: false,
          error: 'Nothing to push'
        }
      }

      await this.exec('git push')

      return {
        success: true,
        message: `Pushed ${status.ahead} commits`
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * 提交并推送
   */
  async commitAndPush(message: string): Promise<CommitResult> {
    const commitResult = await this.commit(message)
    
    if (!commitResult.success) {
      return commitResult
    }

    return await this.push()
  }

  /**
   * 创建新分支
   */
  async createBranch(branchName: string): Promise<void> {
    await this.exec(`git checkout -b ${branchName}`)
  }

  /**
   * 切换分支
   */
  async checkout(branchName: string): Promise<void> {
    await this.exec(`git checkout ${branchName}`)
  }

  /**
   * 获取提交历史
   */
  async log(limit: number = 10): Promise<Array<{
    hash: string
    message: string
    author: string
    date: string
  }>> {
    try {
      const { stdout } = await this.exec(
        `git log --pretty=format:"%H|%s|%an|%ai" -n ${limit}`
      )

      return stdout.split('\n').map(line => {
        const [hash, message, author, date] = line.split('|')
        return {
          hash: hash.substring(0, 7),
          message,
          author,
          date
        }
      })
    } catch (error) {
      return []
    }
  }

  /**
   * 执行 Git 命令
   */
  private async exec(command: string): Promise<{ stdout: string; stderr: string }> {
    return execAsync(command, { cwd: this.projectDir })
  }

  /**
   * 获取项目目录
   */
  getProjectDir(): string {
    return this.projectDir
  }
}
