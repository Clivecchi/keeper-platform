-- CreateTable UserVoicePreferences
CREATE TABLE "UserVoicePreferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "directness" TEXT,
    "conciseness" TEXT,
    "preamble" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserVoicePreferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserVoicePreferences_user_id_key" ON "UserVoicePreferences"("user_id");
CREATE INDEX "UserVoicePreferences_user_id_idx" ON "UserVoicePreferences"("user_id");

ALTER TABLE "UserVoicePreferences" ADD CONSTRAINT "UserVoicePreferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
