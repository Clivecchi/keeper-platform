Cursor · Finding the Plot identity race (2026-09-16)

Gloss-only. Not a build lock. No federation. No independent storage. Stage and Composer should not close the door.

Raced one live object — Finding the Plot, a Dialog on ke3p — from Domain ownership through Stage rendering.

What already holds
Domain owns truth. Dialog.domain_id is required and cascaded. Stage composition lives on Domain.settings.keeperStage. Hostname already resolves Domain: ke3p.com and {slug}.keeper.domains both land on Domain.slug, then the Domain UUID. Object APIs nest under that Domain.
Object carries stable identity. Dialog.id is a durable cuid. It is not a Stage presence id, not a Theatre instance key, and not the conversation title.
Composer references/directs. Reach brings {kind, objectId, title}. It does not clone the Dialog. Selecting a presence sets Working on; a Dialog on Stage binds Talking in.
Stage owns Presence, not canonical truth. StagePresence.id is Stage-owned. objectId is the Keeper object. Dedup is kind:objectId. The filmstrip is presentation. The Document stays on the Dialog. Moment-sourced slides already live-resolve and fail honestly — they do not fall back to the stored copy.

Where today’s path would make later independent resolution through *.keeper.domains difficult
Every pointer after Domain is a bare local id. StagePresence.objectId, TalkingInRef.id, ChronicleSubject, Reach rows, ResolvedMeaning.about, stage.story.layout source.id. None name the home Domain or host. Resolution always means: current board domainId + Prisma row in this database.
Composer Reach only searches this Domain’s nav-index. dialog.read says “not found in this domain.” Chronicle fetchPresenceRecord for a Dialog always GETs /api/domains/:currentDomainId/kip/dialogs/:objectId. A foreign Dialog on Stage would 404 even if the id were valid elsewhere.
Copied labels are treated as current. StagePresence.title is snapshotted at bring-time and shown on the On Stage list without a live refresh. Filmstrip beats copy title/body except the Moment overlay. Do not let that become the pattern for Dialog/Document.
80-character caps on objectId and source.id are baked into the Stage PATCH and layout schemas. A later host-qualified pointer would not fit a full URL. Leave room, or keep ids opaque strings without assuming they are this database’s cuid.
Dialog has no Domain-stable public name. Title is mutable and not unique. There is no Dialog slug. Agents have slugs; services use slug as Chronicle identity; Dialogs do not. *.keeper.domains can name the Domain today. It cannot name Finding the Plot without a later extension.
GET /api/moments/:id is global in this store. That works while there is one Postgres. It is the opposite of Domain-qualified resolution.

Do not invent
Do not build federation. Do not add a second object store. Do not mint a new identity system. Do not put Document bodies on Stage JSON. Document identity is Dialog state — Working on Document using the Dialog id is correct.

Prefer extension
Keep StagePresence as presence id + kind + objectId. The next honest field, when needed, is the object’s home Domain (slug/host), the same idea DialogCastMember.homeDomainId already uses for Cast. Library source_ref and keeper://draft/{id} are already pointers — extend, don’t replace. Moment live-resolve is the filmstrip pattern to copy. Domain.slug + *.keeper.domains is already the Domain resolver; object resolvers should eventually go through that Domain, not around it.
