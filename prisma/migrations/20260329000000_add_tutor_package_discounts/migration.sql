-- Add discount and free trial fields to TutorProfile
ALTER TABLE "TutorProfile" ADD COLUMN "discount5" INTEGER;
ALTER TABLE "TutorProfile" ADD COLUMN "discount10" INTEGER;
ALTER TABLE "TutorProfile" ADD COLUMN "discount20" INTEGER;
ALTER TABLE "TutorProfile" ADD COLUMN "offerFreeTrial" BOOLEAN NOT NULL DEFAULT false;
