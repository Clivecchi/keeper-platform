import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DesignFrame } from './DesignFrame'
import { ThemeSwitcher } from './ThemeSwitcher'

// Mock the StyleScope component
vi.mock('../styles/StyleScope', () => ({
  StyleScope: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

// Mock theme registry
vi.mock('../themes/themeRegistry', () => ({
  listAvailableThemes: () => [
    { slug: 'neutral', label: 'Neutral' },
    { slug: 'diary-paper', label: 'Diary Paper' }
  ]
}))

describe('DesignFrame', () => {
  it('renders children content', () => {
    const testContent = 'Test content'
    render(
      <DesignFrame>
        <div>{testContent}</div>
      </DesignFrame>
    )

    expect(screen.getByText(testContent)).toBeInTheDocument()
  })

  it('renders title and subtitle when provided', () => {
    const title = 'Test Title'
    const subtitle = 'Test Subtitle'

    render(
      <DesignFrame title={title} subtitle={subtitle}>
        <div>Content</div>
      </DesignFrame>
    )

    expect(screen.getByText(title)).toBeInTheDocument()
    expect(screen.getByText(subtitle)).toBeInTheDocument()
  })

  it('renders theme switcher when themeSwitcherSlot is provided', () => {
    render(
      <DesignFrame themeSwitcherSlot={<ThemeSwitcher />}>
        <div>Content</div>
      </DesignFrame>
    )

    // The theme switcher should render a button with "Neutral" text by default
    expect(screen.getByRole('button', { name: /select theme/i })).toBeInTheDocument()
  })

  it('renders right slot content when provided', () => {
    const rightSlotContent = 'Right slot content'

    render(
      <DesignFrame rightSlot={<button>{rightSlotContent}</button>}>
        <div>Content</div>
      </DesignFrame>
    )

    expect(screen.getByText(rightSlotContent)).toBeInTheDocument()
  })
})