export type Gender = 'M' | 'F' | 'O';

export interface NutritionClassification {
  label: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

export function calculateBMI(weightKg: number, heightCm: number): number {
  if (!weightKg || !heightCm || heightCm <= 0) return 0;
  const hM = heightCm / 100;
  return Math.round((weightKg / (hM * hM)) * 10) / 10;
}

export function classifyBMI(bmi: number): NutritionClassification {
  if (!bmi || bmi <= 0)
    return { label: '—', colorClass: 'text-gray-500', bgClass: 'bg-gray-100', borderClass: 'border-gray-200' };
  if (bmi < 16.0)
    return { label: 'Delgadez severa', colorClass: 'text-blue-900', bgClass: 'bg-blue-100', borderClass: 'border-blue-300' };
  if (bmi < 17.0)
    return { label: 'Delgadez moderada', colorClass: 'text-blue-700', bgClass: 'bg-blue-50', borderClass: 'border-blue-200' };
  if (bmi < 18.5)
    return { label: 'Delgadez leve', colorClass: 'text-blue-600', bgClass: 'bg-blue-50', borderClass: 'border-blue-200' };
  if (bmi < 25.0)
    return { label: 'Normal', colorClass: 'text-green-700', bgClass: 'bg-green-50', borderClass: 'border-green-200' };
  if (bmi < 30.0)
    return { label: 'Sobrepeso', colorClass: 'text-yellow-700', bgClass: 'bg-yellow-50', borderClass: 'border-yellow-200' };
  if (bmi < 35.0)
    return { label: 'Obesidad I', colorClass: 'text-orange-700', bgClass: 'bg-orange-50', borderClass: 'border-orange-200' };
  if (bmi < 40.0)
    return { label: 'Obesidad II', colorClass: 'text-red-600', bgClass: 'bg-red-50', borderClass: 'border-red-200' };
  return { label: 'Obesidad III', colorClass: 'text-red-800', bgClass: 'bg-red-100', borderClass: 'border-red-300' };
}

export function calculateWHR(waistCm: number, hipCm: number): number {
  if (!waistCm || !hipCm || hipCm <= 0) return 0;
  return Math.round((waistCm / hipCm) * 100) / 100;
}

// OMS thresholds: M < 0.96 low, 0.96-1.0 moderate, > 1.0 high
//                 F < 0.81 low, 0.81-0.85 moderate, > 0.85 high
export function classifyWHR(whr: number, gender: Gender): NutritionClassification {
  if (!whr || whr <= 0)
    return { label: '—', colorClass: 'text-gray-500', bgClass: 'bg-gray-100', borderClass: 'border-gray-200' };
  const isMale = gender === 'M';
  const [lowThresh, highThresh] = isMale ? [0.96, 1.0] : [0.81, 0.85];
  if (whr < lowThresh)
    return { label: 'Riesgo bajo', colorClass: 'text-green-700', bgClass: 'bg-green-50', borderClass: 'border-green-200' };
  if (whr <= highThresh)
    return { label: 'Riesgo moderado', colorClass: 'text-yellow-700', bgClass: 'bg-yellow-50', borderClass: 'border-yellow-200' };
  return { label: 'Riesgo alto', colorClass: 'text-red-700', bgClass: 'bg-red-50', borderClass: 'border-red-200' };
}

export function getAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export function formatGender(gender: Gender): string {
  return gender === 'M' ? 'Masculino' : gender === 'F' ? 'Femenino' : 'Otro';
}
