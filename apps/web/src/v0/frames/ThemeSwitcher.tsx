"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { ChevronDown } from "lucide-react"
import { listAvailableThemes } from "../themes/themeRegistry"

export function ThemeSwitcher() {
  const navigate = useNavigate()
  const location = useLocation()
  const [currentTheme, setCurrentTheme] = useState<string>("")
  const [isOpen, setIsOpen] = useState(false)
  const themes = listAvailableThemes()

  // Get current theme from URL on mount and URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search)
    const themeParam = urlParams.get('theme') || 'neutral'
    setCurrentTheme(themeParam)
  }, [location.search])

  const handleThemeChange = (themeSlug: string) => {
    setCurrentTheme(themeSlug)
    setIsOpen(false)

    // Update URL with new theme
    const urlParams = new URLSearchParams(location.search)
    if (themeSlug === 'neutral') {
      urlParams.delete('theme')
    } else {
      urlParams.set('theme', themeSlug)
    }

    const newSearch = urlParams.toString()
    navigate(`${location.pathname}${newSearch ? `?${newSearch}` : ''}`, { replace: true })
  }

  const currentThemeData = themes.find(t => t.slug === currentTheme)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-sm border border-transparent px-3 py-1 text-sm shadow-sm backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--theme-focus-ring))] focus-visible:ring-offset-[hsl(var(--theme-surface-paper))] hover:border-[hsl(var(--theme-border-soft))] hover:bg-[hsl(var(--theme-hover-surface))] hover:text-[var(--theme-ink-primary-color)]"
        style={{
          color: "var(--theme-ink-tertiary-color)",
          backgroundColor: "hsl(var(--theme-surface-elevated) / 0.92)",
        }}
        aria-label="Select theme"
      >
        <span>{currentThemeData?.label || 'Neutral'}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div
            className="absolute right-0 top-full mt-1 z-50 w-48 rounded-md border shadow-lg"
            style={{
              backgroundColor: "hsl(var(--theme-surface-paper))",
              borderColor: "hsl(var(--theme-border-soft))",
              boxShadow: "var(--theme-shadow-soft)",
            }}
          >
            {themes.map((theme) => (
              <button
                key={theme.slug}
                type="button"
                onClick={() => handleThemeChange(theme.slug)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-opacity-50 transition-colors first:rounded-t-md last:rounded-b-md"
                style={{
                  color: "var(--theme-ink-primary)",
                  backgroundColor: currentTheme === theme.slug ? "var(--theme-surface-elevated)" : "transparent",
                }}
              >
                {theme.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}