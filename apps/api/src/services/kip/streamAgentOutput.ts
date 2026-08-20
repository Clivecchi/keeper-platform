/**
 * Incremental extractor for the user-facing `response` string inside a
 * `{"type":"agent_output","response":"..."}` stream.
 *
 * Emits only decoded `response` characters so the Dialog can paint while the
 * model is still writing `actions` / closing braces.
 */

export type AgentResponseFieldExtractor = {
  push: (chunk: string) => string
  didEmit: () => boolean
}

type ExtractorMode = 'seek' | 'string' | 'escape' | 'done'

const RESPONSE_KEY = /"response"\s*:\s*"/

export function createAgentResponseFieldExtractor(): AgentResponseFieldExtractor {
  let mode: ExtractorMode = 'seek'
  let seekBuf = ''
  let emitted = false

  const push = (chunk: string): string => {
    if (!chunk || mode === 'done') return ''
    let text = chunk
    if (mode === 'seek') {
      seekBuf += chunk
      const match = RESPONSE_KEY.exec(seekBuf)
      if (!match) {
        if (seekBuf.length > 128) seekBuf = seekBuf.slice(-128)
        return ''
      }
      mode = 'string'
      text = seekBuf.slice(match.index + match[0].length)
      seekBuf = ''
      if (!text) return ''
    }

    let out = ''
    for (let i = 0; i < text.length; i += 1) {
      if (mode === 'done') break
      const ch = text[i]
      if (mode === 'escape') {
        const decoded = decodeJsonEscape(ch)
        out += decoded
        emitted = true
        mode = 'string'
        continue
      }
      if (ch === '\\') {
        mode = 'escape'
        continue
      }
      if (ch === '"') {
        mode = 'done'
        continue
      }
      out += ch
      emitted = true
    }
    return out
  }

  return {
    push,
    didEmit: () => emitted,
  }
}

function decodeJsonEscape(ch: string): string {
  switch (ch) {
    case 'n':
      return '\n'
    case 'r':
      return '\r'
    case 't':
      return '\t'
    case '"':
    case '\\':
    case '/':
      return ch
    default:
      return ch
  }
}
