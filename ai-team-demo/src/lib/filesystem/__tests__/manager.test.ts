import { FileSystemManager } from '../manager'

describe('FileSystemManager', () => {
  let fsManager: FileSystemManager
  const testDir = '/tmp/clawcompany-test'

  beforeEach(() => {
    fsManager = new FileSystemManager(testDir)
  })

  afterEach(async () => {
    // 清理测试文件
    await fsManager.cleanup()
  })

  describe('createFile', () => {
    it('should create a file successfully', async () => {
      const result = await fsManager.createFile('test.ts', 'console.log("test")')
      
      expect(result.success).toBe(true)
      expect(result.path).toContain('test.ts')
    })

    it('should create nested directories if needed', async () => {
      const result = await fsManager.createFile(
        'src/components/Button.tsx',
        'export const Button = () => {}'
      )
      
      expect(result.success).toBe(true)
      expect(result.path).toContain('src/components/Button.tsx')
    })

    it('should reject malicious paths', async () => {
      const result = await fsManager.createFile(
        '../../../etc/passwd',
        'malicious content'
      )
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid path')
    })

    it('should handle existing files', async () => {
      await fsManager.createFile('exists.ts', 'original')
      const result = await fsManager.createFile('exists.ts', 'updated')
      
      expect(result.success).toBe(true)
      expect(result.overwritten).toBe(true)
    })
  })

  describe('readFile', () => {
    it('should read an existing file', async () => {
      await fsManager.createFile('read.ts', 'content')
      const result = await fsManager.readFile('read.ts')
      
      expect(result.success).toBe(true)
      expect(result.content).toBe('content')
    })

    it('should handle non-existent files', async () => {
      const result = await fsManager.readFile('not-exist.ts')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('File not found')
    })
  })

  describe('updateFile', () => {
    it('should update an existing file', async () => {
      await fsManager.createFile('update.ts', 'old content')
      const result = await fsManager.updateFile('update.ts', 'new content')
      
      expect(result.success).toBe(true)
      const read = await fsManager.readFile('update.ts')
      expect(read.content).toBe('new content')
    })
  })

  describe('deleteFile', () => {
    it('should delete an existing file', async () => {
      await fsManager.createFile('delete.ts', 'content')
      const result = await fsManager.deleteFile('delete.ts')
      
      expect(result.success).toBe(true)
      const read = await fsManager.readFile('delete.ts')
      expect(read.success).toBe(false)
    })
  })

  describe('listFiles', () => {
    it('should list all files in directory', async () => {
      await fsManager.createFile('file1.ts', 'content')
      await fsManager.createFile('file2.ts', 'content')
      
      const result = await fsManager.listFiles()
      
      expect(result.files).toContainEqual(expect.stringContaining('file1.ts'))
      expect(result.files).toContainEqual(expect.stringContaining('file2.ts'))
    })
  })

  describe('security', () => {
    it('should reject absolute paths outside project', async () => {
      const result = await fsManager.createFile('/etc/passwd', 'hacked')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid path')
    })

    it('should reject paths with .. traversal', async () => {
      const result = await fsManager.createFile('../../etc/passwd', 'hacked')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid path')
    })
  })
})
