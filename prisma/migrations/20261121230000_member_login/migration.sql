-- Member portal login: an email and a password hash on the member record.
ALTER TABLE "Member" ADD COLUMN "email" TEXT;
ALTER TABLE "Member" ADD COLUMN "passwordHash" TEXT;
CREATE UNIQUE INDEX "Member_email_key" ON "Member"("email");
