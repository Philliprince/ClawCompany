// API 路由 - 查看生成的文件

import { NextRequest, NextResponse } from 'next/server'
import { fileSystemManager } from '@/lib/filesystem/manager'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const filePath = searchParams.get('path')

  if (!filePath) {
    // 列出所有文件
    const files = await fileSystemManager.listFiles('generated')
    return NextResponse.json({ files })
  }

  // 读取特定文件
  const fileInfo = await fileSystemManager.readFile(filePath)
  
  if (!fileInfo.exists) {
    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    path: fileInfo.path,
    content: fileInfo.content,
    size: fileInfo.size,
    modifiedAt: fileInfo.modifiedAt,
  })
}
