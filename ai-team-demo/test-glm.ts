// 测试 GLM 集成

import { GLMProvider } from './glm'

async function testGLM() {
  const apiKey = process.env.GLM_API_KEY

  if (!apiKey) {
    console.error('❌ GLM_API_KEY not found in environment')
    return
  }

  console.log('✅ GLM_API_KEY found:', apiKey.substring(0, 10) + '...')

  const provider = new GLMProvider({
    apiKey,
    model: 'glm-4',
    temperature: 0.7,
    maxTokens: 100,
  })

  try {
    console.log('\n🧪 Testing GLM API...')
    const response = await provider.chat([
      {
        role: 'system',
        content: '你是一个友好的助手。',
      },
      {
        role: 'user',
        content: '说"你好，我是 GLM-4！"这八个字',
      },
    ])

    console.log('✅ GLM Response:', response)
    console.log('\n🎉 GLM integration test passed!')
  } catch (error) {
    console.error('❌ GLM API test failed:', error)
  }
}

testGLM()
