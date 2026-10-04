Cursor · One Stage room, two center pipelines (2026-10-03)

Gloss only. Not a build lock. No product code.

Contract. There is one Stage. Arrival, Story, Moment, and Orientation are presentations of that Stage, stored as KeeperStageComposition.

Code proof. Realm arrival, Domain arrival, and Open Stage all set workspaceSurface to "stage" and mount KeeperStageCanvas inside KeeperDialogFrame. They share the curtain split, the composer pit, and KeeperStageProvider, which loads Domain.settings.keeperStage for the current domain. On /home that domain is the anchor domain.

They do not share the center. An arriving admin (stageArriving, audience admin) never mounts StagePresentationScreen. Realm home renders RealmWhereWeAreStage from every Domain’s dialogs, settings.keeperStage titles, and the Realm feed. A Domain renders WhereWeAreStage from that Domain’s dialogs, with story titles only as trail text. Open Stage, and any non-admin arrival, renders the story filmstrip from KeeperStageComposition.story plus a cover root added at render time.

stageArriving is a one-shot session flag. It is not on the composition. Leaving Stage clears it. Open Stage does not set it, so Open Stage cannot show Where are we?. Mobile keeps Arrival Stage and immediately leaves Open Stage. The Stage nav item exists only on the Realm board.

Where are we? occupies the Stage slot. It is not a composition on that Stage.
