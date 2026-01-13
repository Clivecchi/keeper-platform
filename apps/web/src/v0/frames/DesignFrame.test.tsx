import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DesignFrame } from './DesignFrame'
import { ThemeSwitcher } from './ThemeSwitcher'
import { createDraftMoment } from '../api/v0Moments'

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

// Mock the API
vi.mock('../api/v0Moments', () => ({
  createDraftMoment: vi.fn()
}))

// Mock React Router
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/', search: '' })
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

  it('calls createDraftMoment when Write a Moment is clicked in Cover', async () => {
    const mockDraft = {
      id: 'draft-123',
      title: '',
      body: '',
      status: 'draft' as const,
      themeSlug: 'diary-paper',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }

    const mockCreateDraftMoment = vi.mocked(createDraftMoment)
    mockCreateDraftMoment.mockResolvedValue(mockDraft)

    // Import CoverBody for testing
    const { CoverBody } = await import('./cover/CoverBody')

    render(
      <CoverBody
        themeSlug="diary-paper"
        onNavigate={mockNavigate}
      />
    )

    const writeMomentButton = screen.getByText('Write a Moment')
    fireEvent.click(writeMomentButton)

    // Verify API was called
    await waitFor(() => {
      expect(mockCreateDraftMoment).toHaveBeenCalledWith({
        themeSlug: 'diary-paper'
      })
    })

    // Verify navigation occurred
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/v0?frame=moment&draftId=draft-123&theme=diary-paper')
    })
  })
})