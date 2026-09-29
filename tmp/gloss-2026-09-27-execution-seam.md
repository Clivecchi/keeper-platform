Cursor · Chat execution seam (2026-09-27)

Gloss only. Not a build lock.

Keeper already has one chat seam: executeRegisteredChat() in front of resolveExecutionPlan(). Member Agent turns, guest companion, and the prose half of preserve-discovery use it. Rendr Frame expression, library perspective, and the Designer conversation do not. They call a provider directly.

That seam should stay chat-shaped. Image, voice, embeddings, and Jev evaluation are different kinds of inference and should not be forced through it.

The smallest next change is to let that chat function accept a purpose, a caller, and a fallback policy, and to log them, without choosing a different model yet. Then move the chat bypasses onto it with today’s model still explicit, so sibling fallback and TypeSafe substitution do not silently change Rendr or library text.

Structure JSON (Together guided schema, then Anthropic) stays beside the seam until the provider call can carry a schema. Jev stays a tool.
