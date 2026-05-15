-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'NUTRITIONIST');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('M', 'F', 'O');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'NUTRITIONIST',
    "specialization" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "dateOfBirth" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "address" TEXT,
    "occupation" TEXT,
    "nutritionistId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_histories" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "medicalHistory" TEXT,
    "surgicalHistory" TEXT,
    "familyHistory" TEXT,
    "currentComplaints" TEXT,
    "pastDiseases" TEXT,
    "dietaryHabits" TEXT,
    "physicalActivity" TEXT,
    "alcoholConsumption" TEXT,
    "tobaccoUse" TEXT,
    "currentMedications" TEXT[],
    "allergies" TEXT[],
    "foodIntolerances" TEXT[],
    "nutritionalObjective" TEXT,
    "dietaryRestrictions" TEXT,
    "recall24h" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biometrics" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "glucose" DOUBLE PRECISION,
    "hba1c" DOUBLE PRECISION,
    "insulin" DOUBLE PRECISION,
    "homaIndex" DOUBLE PRECISION,
    "totalCholesterol" DOUBLE PRECISION,
    "ldl" DOUBLE PRECISION,
    "hdl" DOUBLE PRECISION,
    "triglycerides" DOUBLE PRECISION,
    "vldl" DOUBLE PRECISION,
    "ast" DOUBLE PRECISION,
    "alt" DOUBLE PRECISION,
    "ggt" DOUBLE PRECISION,
    "bilirubin" DOUBLE PRECISION,
    "creatinine" DOUBLE PRECISION,
    "bun" DOUBLE PRECISION,
    "urea" DOUBLE PRECISION,
    "sodium" DOUBLE PRECISION,
    "potassium" DOUBLE PRECISION,
    "chloride" DOUBLE PRECISION,
    "totalProteins" DOUBLE PRECISION,
    "albumin" DOUBLE PRECISION,
    "prealbumin" DOUBLE PRECISION,
    "hemoglobin" DOUBLE PRECISION,
    "hematocrit" DOUBLE PRECISION,
    "wbc" DOUBLE PRECISION,
    "platelets" DOUBLE PRECISION,
    "vitaminB12" DOUBLE PRECISION,
    "vitaminD" DOUBLE PRECISION,
    "folacin" DOUBLE PRECISION,
    "iron" DOUBLE PRECISION,
    "ferritin" DOUBLE PRECISION,
    "zinc" DOUBLE PRECISION,
    "calcium" DOUBLE PRECISION,
    "magnesium" DOUBLE PRECISION,
    "phosphorus" DOUBLE PRECISION,
    "testDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biometrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anthropometry" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "bmi" DOUBLE PRECISION NOT NULL,
    "waistCircumference" DOUBLE PRECISION,
    "hipCircumference" DOUBLE PRECISION,
    "waistHipRatio" DOUBLE PRECISION,
    "armCircumference" DOUBLE PRECISION,
    "thighCircumference" DOUBLE PRECISION,
    "calfCircumference" DOUBLE PRECISION,
    "tricepsSkinfold" DOUBLE PRECISION,
    "bicepsSkinfold" DOUBLE PRECISION,
    "subscapularSkinfold" DOUBLE PRECISION,
    "suprailiacSkinfold" DOUBLE PRECISION,
    "bodyFatPercentage" DOUBLE PRECISION,
    "muscleMass" DOUBLE PRECISION,
    "boneMass" DOUBLE PRECISION,
    "waterPercentage" DOUBLE PRECISION,
    "measurementDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anthropometry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "foods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "grossWeight" DOUBLE PRECISION NOT NULL,
    "netWeight" DOUBLE PRECISION NOT NULL,
    "energyKcal" DOUBLE PRECISION NOT NULL,
    "energyKj" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fats" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbohydrates" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fiber" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "foods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_menus" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "weekStartDate" TEXT NOT NULL,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_menu_items" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "mealType" TEXT NOT NULL,
    "foodName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "calories" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "fats" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fiber" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "weekly_menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "patients_email_key" ON "patients"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_histories_patientId_key" ON "clinical_histories"("patientId");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_histories" ADD CONSTRAINT "clinical_histories_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometrics" ADD CONSTRAINT "biometrics_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anthropometry" ADD CONSTRAINT "anthropometry_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_menus" ADD CONSTRAINT "weekly_menus_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_menu_items" ADD CONSTRAINT "weekly_menu_items_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "weekly_menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_menu_items" ADD CONSTRAINT "weekly_menu_items_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
