Cursor · OpenAI chat models (2026-10-09)

Gloss-only. Not a build lock.

Kip’s last failed turn was OpenAI model gpt-4o returning no reply text, then the same empty result three more times. The chat menu still offered GPT-4o and GPT-4o Mini.

The offered OpenAI chat models are now GPT-6.1 Sol (default), GPT-6 Luna, and GPT-6 Astra. A stored GPT-4o preference runs as Sol. GPT-4o Mini runs as Luna. Cockpit and Chronicle Config do not list the retired ids.

Those requests omit sampling temperature and use max_completion_tokens. Sol uses a low reasoning effort and a larger output floor so the budget is not spent before a reply is written. An empty completion is not retried. One sibling model is tried.

This does not change a live agent row until the API with this code is deployed. Saving the model in Cockpit stores the new id. Until then, the redirect applies at the call.
