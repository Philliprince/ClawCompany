import { render, screen } from '@testing-library/react'
import Home from '../page'

describe('Landing Page', () => {
  it('应该显示主标题', () => {
    render(<Home />)
    
    expect(screen.getByText(/One Person/i)).toBeInTheDocument()
    expect(screen.getByText(/Infinite Power/i)).toBeInTheDocument()
  })

  it('应该显示 CTA 按钮', () => {
    render(<Home />)
    
    expect(screen.getByRole('link', { name: /Try Demo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Learn More/i })).toBeInTheDocument()
  })

  it('应该显示三个 Agent 卡片', () => {
    render(<Home />)
    
    expect(screen.getByText('PM Agent')).toBeInTheDocument()
    expect(screen.getByText('Dev Agent')).toBeInTheDocument()
    expect(screen.getByText('Review Agent')).toBeInTheDocument()
  })

  it('应该显示 Agent 角色描述', () => {
    render(<Home />)
    
    expect(screen.getByText('Product Manager')).toBeInTheDocument()
    expect(screen.getByText('Developer')).toBeInTheDocument()
    expect(screen.getByText('Code Reviewer')).toBeInTheDocument()
  })

  it('CTA 按钮应该链接到 /demo', () => {
    render(<Home />)
    
    const demoLink = screen.getByRole('link', { name: /Try Demo/i })
    expect(demoLink).toHaveAttribute('href', '/demo')
  })
})
