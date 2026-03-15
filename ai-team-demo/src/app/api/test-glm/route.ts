// API 路由 - 测试 GLM 集成

import { NextRequest, NextResponse } from 'next/server'
import { GLMProvider } from '@/lib/llm/glm'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GLM_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GLM_API_KEY not configured' },
        { status: 500 }
      )
    }

    const provider = new GLMProvider({
      apiKey,
      model: 'glm-4',
      temperature: 0.7,
      maxTokens: 100,
    })

    const response = await provider.chat([
      {
        role: 'system',
        content: '你是一个友好的助手。',
      },
      {
        role: 'user',
        content: '说"你好，我是 GLM-4！"',
      },
    ])

    return NextResponse.json({
      success: true,
      message: 'GLM integration test passed!',
      response,
    })

  } catch (error) {
    console.error('GLM test error:', error)
    return NextResponse.json(
      {
        error: 'GLM test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
