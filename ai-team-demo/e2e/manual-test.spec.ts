import { test } from '@playwright/test'

test('手动验证 PM Agent 响应', async ({ page }) => {
  // 打开浏览器并保持
  await page.goto('/team')
  await page.waitForLoadState('networkidle')

  // 输入需求
  const chatInput = page.getByPlaceholder(/输入你的需求/i)
  await chatInput.fill('做一个简单的计数器')

  // 点击发送
  const sendButton = page.getByRole('button', { name: /发送/i })
  await sendButton.click()

  // 等待 5 分钟（手动观察）
  await page.waitForTimeout(300000)
})
