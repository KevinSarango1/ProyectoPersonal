export type Gender = 'M' | 'F' | 'O';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth: string;
  gender: Gender;
  address?: string;
  occupation?: string;
  createdAt: string;
  clinicalHistory?: ClinicalHistory;
  biometrics?: Biometrics[];
  anthropometry?: Anthropometry[];
  weeklyMenus?: WeeklyMenu[];
}

export interface PatientForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  dateOfBirth: string;
  gender: Gender;
  address?: string;
  occupation?: string;
}

export interface ClinicalHistory {
  id: string;
  patientId: string;
  date: string;
  medicalHistory?: string;
  surgicalHistory?: string;
  familyHistory?: string;
  currentComplaints?: string;
  pastDiseases?: string;
  dietaryHabits?: string;
  physicalActivity?: string;
  alcoholConsumption?: string;
  tobaccoUse?: string;
  currentMedications: string[];
  allergies: string[];
  foodIntolerances: string[];
  nutritionalObjective?: string;
  dietaryRestrictions?: string;
  observations?: string;
  recall24h?: Recall24h;
  updatedAt: string;
}

export interface Biometrics {
  id: string;
  patientId: string;
  testDate: string;
  createdAt: string;
  glucose?: number;
  hba1c?: number;
  insulin?: number;
  homaIndex?: number;
  totalCholesterol?: number;
  ldl?: number;
  hdl?: number;
  triglycerides?: number;
  vldl?: number;
  ast?: number;
  alt?: number;
  ggt?: number;
  bilirubin?: number;
  creatinine?: number;
  bun?: number;
  urea?: number;
  sodium?: number;
  potassium?: number;
  chloride?: number;
  totalProteins?: number;
  albumin?: number;
  prealbumin?: number;
  hemoglobin?: number;
  hematocrit?: number;
  wbc?: number;
  platelets?: number;
  vitaminB12?: number;
  vitaminD?: number;
  folacin?: number;
  iron?: number;
  ferritin?: number;
  zinc?: number;
  calcium?: number;
  magnesium?: number;
  phosphorus?: number;
  others?: string;
}

export interface Anthropometry {
  id: string;
  patientId: string;
  measurementDate: string;
  createdAt: string;
  weight: number;
  height: number;
  bmi: number;
  waistCircumference?: number;
  hipCircumference?: number;
  waistHipRatio?: number;
  armCircumference?: number;
  thighCircumference?: number;
  calfCircumference?: number;
  tricepsSkinfold?: number;
  bicepsSkinfold?: number;
  subscapularSkinfold?: number;
  suprailiacSkinfold?: number;
  bodyFatPercentage?: number;
  muscleMass?: number;
  boneMass?: number;
  waterPercentage?: number;
}

export interface Food {
  id: string;
  name: string;
  description?: string;
  grossWeight: number;
  netWeight: number;
  energyKcal: number;
  energyKj: number;
  protein: number;
  fats: number;
  carbohydrates: number;
  fiber: number;
}

export interface WeeklyMenu {
  id: string;
  patientId: string;
  weekStartDate: string;
  observations?: string;
  items: WeeklyMenuItem[];
  createdAt: string;
}

export interface WeeklyMenuItem {
  id: string;
  menuId: string;
  foodId: string;
  day: string;
  mealType: string;
  foodName: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  fiber: number;
}

export interface Recall24h {
  recallDate: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
}
