import { NextRequest, NextResponse } from 'next/server'
import { FileSystemManager } from '@/lib/filesystem/manager'
import { InputValidator, RateLimiter } from '@/lib/security/utils'

/**
 * Files API - 文件操作接口
 * 
 * 功能：
 * - 创建/读取/更新/删除文件
 * - 列出文件
 * - 安全验证
 * - Rate Limiting
 * 
 * 安全措施：
 * - 路径验证（防路径遍历）
 * - 输入清理
 * - Rate Limiting
 */

const fsManager = new FileSystemManager(process.cwd())

/**
 * POST - 创建文件
 */
export async function POST(request: NextRequest) {
  try {
    // Rate Limiting
    const clientId = request.headers.get('x-forwarded-for') || 'unknown'
    if (!RateLimiter.isAllowed(clientId)) {
      return NextResponse.json({
        success: false,
        error: 'Rate limit exceeded'
      }, { status: 429 })
    }

    const body = await request.json()
    const { path, content } = body

    // 验证路径
    if (!InputValidator.validatePath(path)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file path'
      }, { status: 400 })
    }

    // 验证内容
    if (typeof content !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Content must be a string'
      }, { status: 400 })
    }

    // 创建文件
    const result = await fsManager.createFile(path, content)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      path: result.path,
      overwritten: result.overwritten
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET - 读取文件或列出文件
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')
    const list = searchParams.get('list')

    // 列出文件
    if (list === 'true') {
      const result = await fsManager.listFiles(path || '')
      
      return NextResponse.json({
        success: true,
        files: result.files
      })
    }

    // 读取文件
    if (!path) {
      return NextResponse.json({
        success: false,
        error: 'File path is required'
      }, { status: 400 })
    }

    if (!InputValidator.validatePath(path)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file path'
      }, { status: 400 })
    }

    const result = await fsManager.readFile(path)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      content: result.content,
      path: result.path
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * PUT - 更新文件
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { path, content } = body

    if (!InputValidator.validatePath(path)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file path'
      }, { status: 400 })
    }

    const result = await fsManager.updateFile(path, content)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      path: result.path
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * DELETE - 删除文件
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')

    if (!path || !InputValidator.validatePath(path)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file path'
      }, { status: 400 })
    }

    const result = await fsManager.deleteFile(path)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
