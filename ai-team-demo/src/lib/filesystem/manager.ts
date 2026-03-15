// File System Manager - 文件系统管理器

import * as fs from 'fs/promises'
import * as path from 'path'

export interface FileInfo {
  path: string
  content: string
  exists: boolean
  size?: number
  modifiedAt?: Date
}

export class FileSystemManager {
  private projectRoot: string

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot
  }

  private getFullPath(relativePath: string): string {
    return path.join(this.projectRoot, relativePath)
  }

  async readFile(relativePath: string): Promise<FileInfo> {
    const fullPath = this.getFullPath(relativePath)
    
    try {
      const content = await fs.readFile(fullPath, 'utf-8')
      const stats = await fs.stat(fullPath)
      
      return {
        path: relativePath,
        content,
        exists: true,
        size: stats.size,
        modifiedAt: stats.mtime,
      }
    } catch (error) {
      return {
        path: relativePath,
        content: '',
        exists: false,
      }
    }
  }

  async writeFile(relativePath: string, content: string): Promise<FileInfo> {
    const fullPath = this.getFullPath(relativePath)
    const dir = path.dirname(fullPath)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(fullPath, content, 'utf-8')
    
    const stats = await fs.stat(fullPath)
    
    return {
      path: relativePath,
      content,
      exists: true,
      size: stats.size,
      modifiedAt: stats.mtime,
    }
  }

  async deleteFile(relativePath: string): Promise<boolean> {
    const fullPath = this.getFullPath(relativePath)
    
    try {
      await fs.unlink(fullPath)
      return true
    } catch {
      return false
    }
  }

  async listFiles(dirPath: string = '.'): Promise<string[]> {
    const fullPath = this.getFullPath(dirPath)
    
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true })
      const files: string[] = []
      
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name)
        if (entry.isDirectory()) {
          const subFiles = await this.listFiles(entryPath)
          files.push(...subFiles)
        } else {
          files.push(entryPath)
        }
      }
      
      return files
    } catch {
      return []
    }
  }

  async exists(relativePath: string): Promise<boolean> {
    const fullPath = this.getFullPath(relativePath)
    
    try {
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  }
}

// 默认实例 - 项目根目录
export const fileSystemManager = new FileSystemManager(
  process.env.PROJECT_ROOT || process.cwd()
)
