/**
 * ClawCompany 端到端测试
 * 
 * 测试真实的 sessions_spawn 流程
 * 
 * 运行方式：在 OpenClaw 环境中执行此脚本
 */

import { ClawCompanyOrchestrator } from '../src/orchestrator'

async function main() {
  console.log('🦞 ClawCompany 端到端测试\n')
  console.log('=' .repeat(50))
  console.log('测试时间:', new Date().toLocaleString('zh-CN'))
  console.log('=' .repeat(50))
  console.log()

  const orchestrator = new ClawCompanyOrchestrator({
    thinking: 'medium',
    model: 'glm-5'
  })

  // 测试 1: 简单需求
  console.log('📋 测试 1: 简单需求处理')
  console.log('-'.repeat(50))
  
  const result1 = await orchestrator.execute(
    '创建一个简单的 TypeScript 函数，计算两个数的和',
    '/tmp/clawcompany-test'
  )
  
  console.log('\n结果:')
  console.log('- 成功:', result1.success)
  console.log('- 任务数:', result1.tasks.length)
  console.log('- 摘要:', result1.summary)
  
  if (result1.results.length > 0) {
    console.log('\n详细结果:')
    result1.results.forEach((r, i) => {
      console.log(`  任务 ${i + 1}: ${r.task.title}`)
      console.log(`    - 文件: ${r.files.join(', ') || '无'}`)
      console.log(`    - 审查通过: ${r.review.approved}`)
      if (r.review.issues.length > 0) {
        console.log(`    - 问题: ${r.review.issues.join(', ')}`)
      }
    })
  }

  console.log('\n' + '='.repeat(50))
  console.log('✅ 端到端测试完成')
  console.log('='.repeat(50))
}

main().catch(console.error)
