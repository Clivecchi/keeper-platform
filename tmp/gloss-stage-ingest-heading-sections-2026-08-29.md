Cursor · Ingest flattens headings to Points, not Sections (2026-08-29)

Gloss-only / not a build lock.

Chuck asked the same Stage-ingest question on Realm and Agent. Cloud answered twice with the same miss: it ran github_repo_read, then called dialog.read as an MCP tool. That tool does not exist. The Kip action dialog.read does. Cloud’s MCP ceiling is infra/GitHub — it does not include dialog.ro — so dialog_read is not one of Cloud’s MCP tools either. Same Cloud, both boards. Not a missing Document reader.

Current ingest truth (code, not a proposal):

Markdown → markdownToDraftPoints recognizes only # / ## / ###. Paragraphs, bullets, and blockquotes are body text under the current heading. ####+ is body, not a heading. One accepted Point per heading (cap 80). Heading level is used only to pick the Dialog title (first H1), then discarded. No Section is created from a heading.

Attach (working tree, not live) stamps every new Point with one pathGroupId from planIngestAttachSection — a Section named from the file title. Live attach leaves pathGroupId unset, so Chronicle puts the pile in Open (“Points that do not yet have a Section”). Kip may then dump that Open pile into one existing named Section (Implementation Contract). Document model, Chronicle, and Review & Reorganize already know Sections. The flatten is ingest + parser, not UI.

Desired: major headings establish Section membership. Smallest extension: keep the existing ingest path. Return heading level from the parser. A sibling to planIngestAttachSection calls createDocumentSection for each ## (when ## exists; otherwise later #), and sets pathGroupId on the child Points. Reuse document_paths, pathGroupId, Chronicle grouping, and Review & Reorganize for later placement. Do not invent a second ingest architecture. Do not ask Kip to invent structure after a flat dump.

The file-title Section already in the working tree is a safety default (do not land in Open / Implementation Contract). It is not the product behavior Chuck named.
