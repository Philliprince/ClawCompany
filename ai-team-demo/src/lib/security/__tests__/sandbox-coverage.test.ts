import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { SandboxedFileWriter } from '../sandbox'

describe('SandboxedFileWriter - UNC path rejection (lines 107-108)', () => {
  let writer: SandboxedFileWriter
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sandbox-cov-'))
    writer = new SandboxedFileWriter(tmpDir)
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('should reject UNC paths starting with //', () => {
    const result = writer.validatePath('//server/share/file.txt')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('UNC')
  })

  it('should reject UNC paths //192.168.1.1', () => {
    const result = writer.validatePath('//192.168.1.1/c$/secret')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('UNC')
  })
})

describe('SandboxedFileWriter - writeFile filesystem error (lines 206-210)', () => {
  let writer: SandboxedFileWriter
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sandbox-write-err-'))
    writer = new SandboxedFileWriter(tmpDir)
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('should catch filesystem write errors', async () => {
    const writeSpy = jest.spyOn(fs, 'writeFile').mockRejectedValue(
      new Error('Disk full')
    )

    const result = await writer.writeFile('error.txt', 'content')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Failed to write file')
    expect(result.error).toContain('Disk full')

    writeSpy.mockRestore()
  })
})

describe('SandboxedFileWriter - listFiles errors (lines 250-251)', () => {
  let writer: SandboxedFileWriter
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sandbox-list-err-'))
    writer = new SandboxedFileWriter(tmpDir)
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('should catch readdir errors during listFiles', async () => {
    await writer.writeFile('existing.txt', 'content')

    const readdirSpy = jest.spyOn(fs, 'readdir').mockRejectedValue(
      new Error('Permission denied')
    )

    const result = await writer.listFiles()
    expect(result.success).toBe(false)
    expect(result.error).toContain('Failed to list files')

    readdirSpy.mockRestore()
  })
})
