// API 路由 - 处理聊天请求

import { NextRequest, NextResponse } from 'next/server'
import { agentManager } from '@/lib/agents/manager'
import { taskManager } from '@/lib/tasks/manager'
import { chatManager } from '@/lib/chat/manager'
import { AgentRole } from '@/lib/agents/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userMessage = body.message

    if (!userMessage) {
      return NextResponse.json(
        { error: '消息不能为空' },
        { status: 400 }
      )
    }

    // 用户发送消息
    chatManager.sendUserMessage(userMessage)

    // 创建初始任务给 PM Agent
    const initialTask = taskManager.createTask(
      userMessage, // title
      userMessage, // description
      'pm' as AgentRole, // assignedTo
      [], // dependencies
      [] // files
    )

    // 执行 PM Agent
    const pmResponse = await agentManager.executeAgent('pm', initialTask, {
      projectId: 'demo-project',
      tasks: taskManager.getAllTasks(),
      files: {},
      chatHistory: chatManager.getHistory()
    })

    // 记录 PM 的回复
    chatManager.broadcast('pm', pmResponse.message)

    // 添加 PM 生成的子任务
    if (pmResponse.tasks) {
      pmResponse.tasks.forEach(taskData => {
        taskManager.createTask(
          taskData.title,
          taskData.description,
          taskData.assignedTo,
          taskData.dependencies,
          taskData.files
        )
      })
    }

    // 返回所有任务和消息
    return NextResponse.json({
      success: true,
      message: pmResponse.message,
      tasks: taskManager.getAllTasks(),
      chatHistory: chatManager.getHistory()
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  // 获取当前状态
  return NextResponse.json({
    tasks: taskManager.getAllTasks(),
    chatHistory: chatManager.getHistory(),
    agents: agentManager.getAgentInfo()
  })
}
