-- Optional invitation notes so Domain agents can know the person.
ALTER TABLE "DomainInvitation" ADD COLUMN "seed" JSONB;
