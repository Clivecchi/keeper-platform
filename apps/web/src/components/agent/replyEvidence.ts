/**
 * Conversational reply versus technical payload.
 * Directory listings, file bodies, and tool JSON stay reachable.
 * They do not sit in the sentence the room is speaking.
 */

export type ReplyEvidenceSplit = {
  prose: string
  evidence: string | null
}

const FENCE = /```[\s\S]*?```/g

function isPathLine(line: string): boolean {
  if (line.length > 180) return false
  if (/^(?:[\w.@+-]+\/)+[\w.@+/-]*$/.test(line)) return true
  return /^[\w.+-]+\.(?:ts|tsx|js|jsx|md|json|css|prisma)$/.test(line)
}

function isJsonDocument(block: string): boolean {
  const trimmed = block.trim()
  if (
    !(
      (trimmed.startsWith("{") && trimmed.endsWith("}"))
      || (trimmed.startsWith("[") && trimmed.endsWith("]"))
    )
  ) {
    return false
  }
  try {
    JSON.parse(trimmed)
    return true
  } catch {
    return false
  }
}

function isEvidenceLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (isPathLine(trimmed)) return true
  if (isJsonDocument(trimmed)) return true
  return /"sha"\s*:/.test(trimmed) && /"path"\s*:/.test(trimmed)
}

function partitionBlock(block: string): { prose: string[]; evidence: string[] } {
  if (block.startsWith("```") || isJsonDocument(block)) {
    return { prose: [], evidence: [block] }
  }
  const prose: string[] = []
  const evidence: string[] = []
  let run: string[] = []
  const flush = () => {
    if (run.length === 0) return
    const pathCount = run.filter((line) => isPathLine(line.trim())).length
    const technical = run.length >= 3 && pathCount >= 3
      || run.every((line) => isEvidenceLine(line))
    if (technical) evidence.push(run.join("\n"))
    else prose.push(...run)
    run = []
  }
  for (const line of block.split("\n")) {
    if (isEvidenceLine(line)) run.push(line)
    else {
      flush()
      prose.push(line)
    }
  }
  flush()
  return {
    prose: prose.filter((line) => line.trim()),
    evidence,
  }
}

function blocksOf(text: string): string[] {
  const blocks: string[] = []
  let last = 0
  for (const match of text.matchAll(FENCE)) {
    const index = match.index ?? 0
    if (index > last) {
      blocks.push(...text.slice(last, index).split(/\n\n+/))
    }
    blocks.push(match[0])
    last = index + match[0].length
  }
  if (last < text.length) blocks.push(...text.slice(last).split(/\n\n+/))
  return blocks.map((block) => block.trim()).filter(Boolean)
}

export function separateReplyEvidence(text: string): ReplyEvidenceSplit {
  const trimmed = text.trim()
  if (!trimmed) return { prose: "", evidence: null }
  const prose: string[] = []
  const evidence: string[] = []
  for (const block of blocksOf(trimmed)) {
    const part = partitionBlock(block)
    if (part.prose.length) prose.push(part.prose.join("\n"))
    evidence.push(...part.evidence)
  }
  const spoken = prose.join("\n\n").trim()
  const payload = evidence.join("\n\n").trim()
  if (!spoken && payload) {
    return { prose: "The detail is in Evidence.", evidence: payload }
  }
  return { prose: spoken, evidence: payload || null }
}
