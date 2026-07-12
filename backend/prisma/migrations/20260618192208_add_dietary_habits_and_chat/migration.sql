-- CreateTable
CREATE TABLE "dietary_habits" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "recordDate" TEXT NOT NULL,
    "breakfast" TEXT,
    "morningSnack" TEXT,
    "lunch" TEXT,
    "afternoonSnack" TEXT,
    "dinner" TEXT,
    "waterIntake" DOUBLE PRECISION,
    "mealsPerDay" INTEGER,
    "eatingOutFrequency" TEXT,
    "foodPreferences" TEXT,
    "foodAversions" TEXT,
    "cookingMethods" TEXT,
    "mealEnvironment" TEXT,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dietary_habits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dietary_habits_patientId_key" ON "dietary_habits"("patientId");

-- AddForeignKey
ALTER TABLE "dietary_habits" ADD CONSTRAINT "dietary_habits_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
