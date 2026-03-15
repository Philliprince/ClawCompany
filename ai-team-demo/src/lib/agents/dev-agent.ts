// Dev Agent - 开发 Agent

import { BaseAgent } from './base'
import { Task, AgentResponse, AgentContext } from './types'

export class DevAgent extends BaseAgent {
  constructor() {
    super(
      'dev-agent-1',
      'Dev Agent',
      'dev',
      '负责代码实现和功能开发'
    )
  }

  async execute(task: Task, context: AgentContext): Promise<AgentResponse> {
    this.log(`开始开发: ${task.title}`)

    // Dev Agent 的核心逻辑：
    // 1. 理解任务需求
    // 2. 生成/修改代码
    // 3. 提交给 Review Agent

    const response = await this.implement(task, context)

    return response
  }

  private async implement(task: Task, context: AgentContext): Promise<AgentResponse> {
    // 根据任务类型生成代码
    const code = this.generateCode(task, context)

    return {
      agent: 'dev',
      message: this.generateImplementationMessage(task, code),
      files: code ? [code] : undefined,
      nextAgent: 'review',
      status: 'success'
    }
  }

  private generateCode(
    task: Task,
    context: AgentContext
  ): { path: string; content: string; action: 'create' | 'modify' | 'delete' } | null {
    // 模拟代码生成逻辑
    const title = task.title.toLowerCase()

    if (title.includes('表单') || title.includes('form')) {
      return {
        path: `src/components/${this.toPascalCase(task.title)}.tsx`,
        content: this.generateFormComponent(task),
        action: 'create'
      }
    }

    if (title.includes('api') || title.includes('接口')) {
      return {
        path: `src/app/api/${this.toKebabCase(task.title)}/route.ts`,
        content: this.generateAPIRoute(task),
        action: 'create'
      }
    }

    // 默认生成一个通用组件
    return {
      path: `src/components/${this.toPascalCase(task.title)}.tsx`,
      content: this.generateGenericComponent(task),
      action: 'create'
    }
  }

  private generateFormComponent(task: Task): string {
    const componentName = this.toPascalCase(task.title)
    
    return `"use client";

import { useState } from 'react';

export default function ${componentName}() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: 实现提交逻辑
    console.log('Form submitted:', formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          邮箱
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          required
        />
      </div>
      
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          密码
        </label>
        <input
          type="password"
          id="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          required
        />
      </div>
      
      <button
        type="submit"
        className="w-full bg-primary-500 text-white py-2 px-4 rounded-md hover:bg-primary-600"
      >
        提交
      </button>
    </form>
  );
}
`
  }

  private generateAPIRoute(task: Task): string {
    return `import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // TODO: 实现业务逻辑
    // ${task.description}
    
    return NextResponse.json({ 
      success: true,
      message: 'API endpoint created for: ${task.title}'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'API endpoint for: ${task.title}'
  });
}
`
  }

  private generateGenericComponent(task: Task): string {
    const componentName = this.toPascalCase(task.title)
    
    return `export default function ${componentName}() {
  return (
    <div className="p-4">
      <h1>${task.title}</h1>
      <p>${task.description}</p>
    </div>
  );
}
`
  }

  private generateImplementationMessage(
    task: Task,
    code: { path: string; content: string; action: 'create' | 'modify' | 'delete' } | null
  ): string {
    let message = `✅ 我已完成 **${task.title}** 的实现。\n\n`

    if (code) {
      message += `创建的文件：\n`
      message += `- \`${code.path}\`\n\n`
      message += `主要功能：\n`
      message += `- 响应式设计\n`
      message += `- 表单验证\n`
      message += `- 错误处理\n\n`
      message += `Review Agent，请帮我审查代码质量。`
    }

    return message
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^(.)/, (c) => c.toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, '')
  }

  private toKebabCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
  }
}
