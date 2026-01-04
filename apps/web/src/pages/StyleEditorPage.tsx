"use client"

import React, { useState, useEffect } from 'react'
import { StyleOverrideProvider, useStyleOverride } from '../v0/styles/StyleOverrideProvider'
import { listStyles, getStyleDefinition, type StyleId, type StyleTokens } from '../v0/styles/styleRegistry'
import { Copy, RefreshCw } from 'lucide-react'

function StyleEditorContent() {
  const { currentStyleId, overrides, setOverride, clearOverrides, setCurrentStyle, exportTokens, importTokens } = useStyleOverride()
  const [previewFrame, setPreviewFrame] = useState<'cover' | 'moment'>('cover')
  const [importText, setImportText] = useState('')

  const styles = listStyles()
  const currentStyle = getStyleDefinition(currentStyleId)
  const tokenCategories = {
    'Surface': ['surface.page', 'surface.paper', 'surface.panel', 'surface.elevated'],
    'Ink': ['ink.primary', 'ink.secondary', 'ink.tertiary', 'ink.placeholder'],
    'Lines': ['line.hairline', 'line.ruled'],
    'Borders': ['border.soft', 'border.strong'],
    'Effects': ['shadow.soft', 'focus.ring', 'hover.surface', 'press.surface'],
    'Layout': ['radius.sheet', 'space.framePadding', 'space.sheetPadding'],
  }

  const getTokenValue = (token: keyof StyleTokens): string => {
    return overrides[token] || currentStyle?.tokens[token] || ''
  }

  const handleTokenChange = (token: keyof StyleTokens, value: string) => {
    setOverride(token, value)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('Copied to clipboard!')
    } catch (err) {
      alert('Failed to copy to clipboard')
    }
  }

  const handleExportTokens = () => {
    if (!currentStyle) return '{}'
    return JSON.stringify(exportTokens(currentStyle.tokens), null, 2)
  }

  const handleImportTokens = () => {
    try {
      const tokens = JSON.parse(importText)
      importTokens(tokens)
      setImportText('')
      alert('Tokens imported successfully!')
    } catch (err) {
      alert('Invalid JSON format')
    }
  }

  const handleDownloadTokens = () => {
    const data = handleExportTokens()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `v0-style-${currentStyleId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Create a cache-busting parameter to force iframe reload when overrides change
  const overrideTimestamp = Object.keys(overrides).length + JSON.stringify(overrides).length
  const previewUrl = previewFrame === 'cover'
    ? `/v0?style=${currentStyleId}&overrides=${overrideTimestamp}`
    : `/v0?frame=moment&style=${currentStyleId}&overrides=${overrideTimestamp}`

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">V0 Style Editor</h1>
          <p className="text-gray-600">Live token editor for V0 Cover and Moment surfaces</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Editor */}
          <div className="space-y-6">
            {/* Style Selector */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Style Selection</h2>
              <div className="space-y-2">
                {styles.map((style) => (
                  <label key={style.id} className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="style"
                      value={style.id}
                      checked={currentStyleId === style.id}
                      onChange={(e) => setCurrentStyle(e.target.value as StyleId)}
                      className="text-blue-600"
                    />
                    <span className="text-sm">
                      <strong>{style.name}</strong> <span className="text-gray-500">({style.tone})</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Token Editor */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Token Editor</h2>
                <button
                  onClick={clearOverrides}
                  className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
              </div>

              <div className="space-y-6">
                {Object.entries(tokenCategories).map(([category, tokens]) => (
                  <div key={category}>
                    <h3 className="font-medium text-gray-900 mb-3">{category}</h3>
                    <div className="space-y-3">
                      {tokens.map((token) => (
                        <div key={token} className="flex items-center space-x-3">
                          <label className="text-sm font-mono text-gray-600 w-32 flex-shrink-0">
                            {token}
                          </label>
                          <input
                            type="text"
                            value={getTokenValue(token as keyof StyleTokens)}
                            onChange={(e) => handleTokenChange(token as keyof StyleTokens, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm font-mono"
                            placeholder="Enter value..."
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Export/Import */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Export/Import</h2>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <button
                    onClick={() => copyToClipboard(handleExportTokens())}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy JSON</span>
                  </button>
                  <button
                    onClick={handleDownloadTokens}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    <span>💾</span>
                    <span>Download JSON</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Import Tokens</label>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="w-full h-32 px-3 py-2 border border-gray-300 rounded text-sm font-mono"
                    placeholder="Paste token JSON here..."
                  />
                  <button
                    onClick={handleImportTokens}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                  >
                    Import Tokens
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Current Tokens (Read-only)</label>
                  <textarea
                    readOnly
                    value={handleExportTokens()}
                    className="w-full h-48 px-3 py-2 border border-gray-300 rounded text-sm font-mono bg-gray-50"
                    placeholder="Token JSON will appear here..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Live Preview</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPreviewFrame('cover')}
                    className={`px-3 py-1 text-sm rounded ${
                      previewFrame === 'cover'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Cover
                  </button>
                  <button
                    onClick={() => setPreviewFrame('moment')}
                    className={`px-3 py-1 text-sm rounded ${
                      previewFrame === 'moment'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Moment
                  </button>
                </div>
              </div>

              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <iframe
                  key={`${currentStyleId}-${previewFrame}-${overrideTimestamp}`}
                  src={previewUrl}
                  className="w-full h-96 border-0"
                  title={`${previewFrame} preview`}
                />
              </div>

              <div className="mt-4 text-sm text-gray-600">
                <strong>Current URL:</strong> {window.location.origin}{previewUrl}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StyleEditorPage() {
  return (
    <StyleOverrideProvider initialStyleId="neutral">
      <StyleEditorContent />
    </StyleOverrideProvider>
  )
}