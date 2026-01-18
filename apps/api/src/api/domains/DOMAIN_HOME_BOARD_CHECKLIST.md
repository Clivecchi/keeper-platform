# Domain Home Board Verification Checklist

## Manual Checks
- Call `GET /api/domains/:domainId/home-board` twice; confirm the same `data.id` is returned.
- Call `GET /api/domains/by-slug/:slug/home-board`; confirm `data.domainId` matches the domain id.
- Confirm `data.boardType === "domain-home"` and `data.frames` is non-empty.
- Confirm no additional boards were created for the same `domainId` in the database.

## Creation Checks
- Create a new domain, then call `GET /api/domains/:domainId/home-board`.
- Confirm a new board is created with `boardType="domain-home"` and `domainId` set.

## Adoption Checks
- For a domain-scoped board with `slug="domain-management"` and no `boardType`, call the endpoint.
- Confirm the board is updated to `boardType="domain-home"` and retains its slug.
