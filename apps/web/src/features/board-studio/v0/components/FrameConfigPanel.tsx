"use client"

import React from 'react'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { ScrollArea } from './ui/scroll-area'
import type { StudioFrame, PatternId } from '../types'
import { PATTERNS } from '../patterns/registry'
import { useBoardStudio } from '../context/BoardStudioContext'

/**
 * FrameConfigPanel - Right sidebar panel for frame configuration
 * 
 * Shows configuration options for the currently active frame:
 * - Frame name (editable)
 * - Pattern selector
 * - Props list (read-only for now)
 * 
 * When no frame is active, shows a friendly empty state.
 */
export function FrameConfigPanel() {
  const { activeFrameId, frames, updateFrame, mode } = useBoardStudio()

  // Only show in studio mode
  if (mode !== 'studio') {
    return null
  }

  const activeFrame = frames.find(f => f.id === activeFrameId)

  if (!activeFrame) {
    return (
      <aside className="w-80 bg-white border-l">
        <div className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Frame Configuration</h3>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-600 mb-2">No frame selected</p>
            <p className="text-xs text-gray-500">
              Select a frame from the canvas to configure it
            </p>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-80 bg-white border-l flex flex-col">
      <div className="p-4 border-b">
        <h3 className="text-sm font-semibold text-gray-900">Frame Configuration</h3>
        <p className="text-xs text-gray-500 mt-1">Configure the selected frame</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Frame Name */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Frame Name
            </label>
            <Input
              value={activeFrame.name}
              onChange={(e) => {
                console.log("✏️ Update frame", { frameId: activeFrame.id, field: 'name', value: e.target.value })
                updateFrame(activeFrame.id, { name: e.target.value })
              }}
              placeholder="Enter frame name"
              className="w-full bg-background"
            />
            <p className="text-xs text-gray-500 mt-1">
              The name of this frame (visible in tabs)
            </p>
          </div>

          {/* Frame Role */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Frame Role
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
              {activeFrame.role === 'cover' && 'Cover Frame'}
              {activeFrame.role === 'settings' && 'Settings Frame'}
              {activeFrame.role === 'custom' && 'Custom Frame'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {activeFrame.role === 'cover' && 'The main cover/landing frame'}
              {activeFrame.role === 'settings' && 'Board settings and configuration'}
              {activeFrame.role === 'custom' && 'User-created content frame'}
            </p>
          </div>

          {/* Engagement Pattern */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Engagement Pattern
            </label>
            <Select
              value={activeFrame.pattern}
              onValueChange={(pattern: PatternId) => {
                console.log("✏️ Update frame", { frameId: activeFrame.id, field: 'pattern', value: pattern })
                updateFrame(activeFrame.id, { pattern })
              }}
            >
              <SelectTrigger className="bg-background border ring-0 shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                {Object.values(PATTERNS).map((pattern) => (
                  <SelectItem key={pattern.id} value={pattern.id}>
                    <div>
                      <div className="font-medium">{pattern.name}</div>
                      <div className="text-xs text-gray-500">{pattern.summary}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              When to use: {PATTERNS[activeFrame.pattern].whenToUse.join(', ')}
            </p>
          </div>

          {/* Props List */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Frame Props ({activeFrame.props.length})
            </label>
            {activeFrame.props.length === 0 ? (
              <div className="px-3 py-6 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center">
                <p className="text-sm text-gray-500">No props added yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Add props from the Props Library
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeFrame.props.map((prop, index) => (
                  <div
                    key={prop.id}
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-500">
                        #{index + 1}
                      </span>
                      <span className="text-xs font-medium text-gray-900">
                        {prop.type}
                      </span>
                    </div>
                    {Object.keys(prop.config).length > 0 && (
                      <div className="text-xs text-gray-600 mt-1">
                        {Object.entries(prop.config)
                          .slice(0, 2)
                          .map(([key, value]) => (
                            <div key={key} className="truncate">
                              <span className="font-medium">{key}:</span>{' '}
                              {String(value).substring(0, 30)}
                              {String(value).length > 30 ? '...' : ''}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Per-prop editing coming soon
            </p>
          </div>

          {/* Future sections (placeholder) */}
          <div className="pt-4 border-t border-gray-200">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Advanced Options
            </label>
            <div className="text-sm text-gray-500 italic">
              Pattern options, data bindings, and visibility settings coming soon...
            </div>
          </div>
        </div>
      </ScrollArea>
    </aside>
  )
}


