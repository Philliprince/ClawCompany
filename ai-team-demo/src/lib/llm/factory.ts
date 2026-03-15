// LLM Factory - 创建 LLM 提供者

import { LLMProvider, LLMConfig } from './types'
import { OpenAIProvider } from './openai'

export class LLMFactory {
  static createProvider(config: LLMConfig): LLMProvider {
    switch (config.provider) {
      case 'openai':
        return new OpenAIProvider(config)
      
      case 'anthropic':
        throw new Error('Anthropic provider not implemented yet')
      
      case 'glm':
        throw new Error('GLM provider not implemented yet')
      
      default:
        throw new Error(`Unknown LLM provider: ${config.provider}`)
    }
  }

  static createFromEnv(): LLMProvider | null {
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      console.warn('No LLM API key found in environment')
      return null
    }

    const provider = (process.env.LLM_PROVIDER as LLMConfig['provider']) || 'openai'
    const model = process.env.LLM_MODEL || 'gpt-4o-mini'
    const temperature = parseFloat(process.env.LLM_TEMPERATURE || '0.7')
    const maxTokens = parseInt(process.env.LLM_MAX_TOKENS || '2000', 10)

    return LLMFactory.createProvider({
      provider,
      apiKey,
      model,
      temperature,
      maxTokens,
    })
  }
}

// 单例实例
let llmProvider: LLMProvider | null = null

export function getLLMProvider(): LLMProvider | null {
  if (!llmProvider) {
    llmProvider = LLMFactory.createFromEnv()
  }
  return llmProvider
}

export function setLLMProvider(provider: LLMProvider): void {
  llmProvider = provider
}
