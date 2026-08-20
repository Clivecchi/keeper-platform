import { describe, expect, it } from 'vitest'
import { createAgentResponseFieldExtractor } from './streamAgentOutput.js'

describe('createAgentResponseFieldExtractor', () => {
  it('emits the response field from a complete envelope', () => {
    const extractor = createAgentResponseFieldExtractor()
    const visible = extractor.push(
      '{"type":"agent_output","response":"Hello there.","actions":[]}',
    )
    expect(visible).toBe('Hello there.')
    expect(extractor.didEmit()).toBe(true)
  })

  it('emits incrementally across chunks', () => {
    const extractor = createAgentResponseFieldExtractor()
    expect(extractor.push('{"type":"agent_output","res')).toBe('')
    expect(extractor.push('ponse":"Hel')).toBe('Hel')
    expect(extractor.push('lo"}')).toBe('lo')
    expect(extractor.didEmit()).toBe(true)
  })

  it('decodes escaped quotes and newlines', () => {
    const extractor = createAgentResponseFieldExtractor()
    const visible = extractor.push(
      '{"response":"Line 1\\nHe said \\"hi\\"."}',
    )
    expect(visible).toBe('Line 1\nHe said "hi".')
  })

  it('still finds response when actions come first', () => {
    const extractor = createAgentResponseFieldExtractor()
    const visible = extractor.push(
      '{"type":"agent_output","actions":[{"type":"draft.read"}],"response":"Here it is."}',
    )
    expect(visible).toBe('Here it is.')
  })

  it('does not emit for plain prose', () => {
    const extractor = createAgentResponseFieldExtractor()
    const visible = extractor.push('Here is a conversational reply without JSON.')
    expect(visible).toBe('')
    expect(extractor.didEmit()).toBe(false)
  })
})
