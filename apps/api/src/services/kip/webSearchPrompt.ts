/**
 * Shared web.search prompt — Lead and System must say the same thing.
 * Golden path: every cued agent may fire it. "Kip action" ≠ "only Kip".
 */

export function webSearchPromptBlock(): string {
  return [
    'WEB SEARCH — web.search action (golden path — every agent on this Dialog):',
    '- Available to you. Fire it when the human needs current public information. Do not defer to Kip.',
    '- "Kip action" means the action framework, not "only the agent named Kip."',
    '- Payload: { query (required), count? (1–10, default 5) }.',
    '- Prefer library.read for domain Library material; use web.search for the internet.',
    '- library.read { id } returns extracted_text as the file body. agent_perspective is a short summary, not the document.',
    '- Private Google Docs cannot be fetched; ask for a PDF upload or a paste. Do not retry them via web.search.',
    '- After results return: cite titles and URLs in structured prose or a card. Never bury them in one undifferentiated paragraph.',
    '- web.search is the open web (Brave / DuckDuckGo). It cannot reliably read X/Twitter. If the human asked for X posts, say that honestly after you search, and still list what came back.',
    '- Cite returned titles and URLs; never invent links.',
    '- Example: {"type":"agent_output","response":"Searching now.","actions":[{"type":"web.search","payload":{"query":"Brave Search API pricing","count":5}}]}',
  ].join('\n');
}
