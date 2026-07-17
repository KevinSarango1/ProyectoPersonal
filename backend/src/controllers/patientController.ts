import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

// GET /api/patients
export const getPatients = async (_req: AuthRequest, res: Response) => {
  const patients = await prisma.patient.findMany({
    select: {
      id: true, firstName: true, lastName: true,
      dateOfBirth: true, gender: true, occupation: true, createdAt: true,
      clinicalHistory: {
        select: {
          nutritionalObjective: true, pastDiseases: true,
          allergies: true, foodIntolerances: true, currentMedications: true,
          physicalActivity: true, dietaryRestrictions: true, observations: true,
        },
      },
      anthropometry: {
        select: { weight: true, height: true, bmi: true, bodyFatPercentage: true, measurementDate: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      biometrics: {
        select: { glucose: true, hba1c: true, totalCholesterol: true, triglycerides: true, testDate: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(patients);
};

// GET /api/patients/:id
export const getPatientById = async (req: Request, res: Response) => {
  const patient = await prisma.patient.findUnique({
    where: { id: req.params.id },
    include: {
      clinicalHistory: true,
      biometrics: { orderBy: { createdAt: 'desc' } },
      anthropometry: { orderBy: { createdAt: 'desc' } },
      weeklyMenus: {
        include: { items: { include: { food: true } } },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
  if (!patient) return res.status(404).json({ message: 'Paciente no encontrado' });
  res.json(patient);
};

// POST /api/patients
export const createPatient = async (req: Request, res: Response) => {
  const { firstName, lastName, dateOfBirth, gender, occupation } = req.body;

  if (!firstName || !lastName || !dateOfBirth || !gender) {
    return res.status(400).json({ message: 'Faltan campos requeridos' });
  }

  const patient = await prisma.patient.create({
    data: {
      firstName, lastName, dateOfBirth, gender, occupation,
      clinicalHistory: {
        create: {
          date: new Date().toISOString().split('T')[0],
          currentMedications: [],
          allergies: [],
          foodIntolerances: [],
        },
      },
    },
    select: {
      id: true, firstName: true, lastName: true,
      dateOfBirth: true, gender: true, occupation: true, createdAt: true,
    },
  });

  res.status(201).json(patient);
};

// PUT /api/patients/:id
export const updatePatient = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { firstName, lastName, dateOfBirth, gender, occupation } = req.body;

  const patient = await prisma.patient.update({
    where: { id },
    data: { firstName, lastName, dateOfBirth, gender, occupation },
    select: {
      id: true, firstName: true, lastName: true,
      dateOfBirth: true, gender: true, occupation: true,
    },
  });

  res.json(patient);
};

// DELETE /api/patients/:id
export const deletePatient = async (req: Request, res: Response) => {
  await prisma.patient.delete({ where: { id: req.params.id } });
  res.status(204).send();
};

// PUT /api/patients/:id/clinical-history
export const updateClinicalHistory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    date, medicalHistory, surgicalHistory, familyHistory,
    currentComplaints, pastDiseases, dietaryHabits, physicalActivity,
    alcoholConsumption, tobaccoUse, currentMedications,
    allergies, foodIntolerances, nutritionalObjective, dietaryRestrictions,
    observations, recall24h,
  } = req.body;

  if (!date) return res.status(400).json({ message: 'La fecha de la consulta es requerida' });

  const data = {
    date, medicalHistory, surgicalHistory, familyHistory,
    currentComplaints, pastDiseases, dietaryHabits, physicalActivity,
    alcoholConsumption, tobaccoUse,
    currentMedications: currentMedications ?? [],
    allergies: allergies ?? [],
    foodIntolerances: foodIntolerances ?? [],
    nutritionalObjective, dietaryRestrictions, observations, recall24h,
  };

  const history = await prisma.clinicalHistory.upsert({
    where: { patientId: id },
    update: data,
    create: { ...data, patientId: id },
  });

  res.json(history);
};

// POST /api/patients/:id/biometrics
export const addBiometrics = async (req: Request, res: Response) => {
  if (!req.body.testDate) return res.status(400).json({ message: 'La fecha del examen es requerida' });
  const {
    glucose, hba1c, insulin, homaIndex,
    totalCholesterol, ldl, hdl, triglycerides, vldl,
    ast, alt, ggt, bilirubin,
    creatinine, urea, uricAcid,
    hemoglobin, hematocrit, leukocytes, platelets,
    tsh, t3, t4,
    vitaminD, vitaminB12, ferritin, iron,
    systolicBP, diastolicBP, heartRate,
    testDate, others,
  } = req.body;
  const record = await prisma.biometrics.create({
    data: {
      glucose, hba1c, insulin, homaIndex,
      totalCholesterol, ldl, hdl, triglycerides, vldl,
      ast, alt, ggt, bilirubin,
      creatinine, urea, uricAcid,
      hemoglobin, hematocrit, leukocytes, platelets,
      tsh, t3, t4,
      vitaminD, vitaminB12, ferritin, iron,
      systolicBP, diastolicBP, heartRate,
      testDate, others,
      patientId: req.params.id,
    },
  });
  res.status(201).json(record);
};

// GET /api/patients/:id/biometrics
export const getBiometrics = async (req: Request, res: Response) => {
  const records = await prisma.biometrics.findMany({
    where: { patientId: req.params.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(records);
};

// POST /api/patients/:id/anthropometry
export const addAnthropometry = async (req: Request, res: Response) => {
  const { weight, height, measurementDate } = req.body;
  if (!measurementDate) return res.status(400).json({ message: 'La fecha de medición es requerida' });
  if (!weight || weight <= 0) return res.status(400).json({ message: 'El peso debe ser mayor a 0' });
  if (!height || height <= 0) return res.status(400).json({ message: 'La talla debe ser mayor a 0' });
  const {
    waistCircumference, hipCircumference, waistHipRatio,
    armCircumference, thighCircumference, calfCircumference,
    tricepsSkinfold, bicepsSkinfold, subscapularSkinfold, suprailiacSkinfold,
    bodyFatPercentage, muscleMass, boneMass, waterPercentage,
  } = req.body;

  let bmi = req.body.bmi;
  if (weight && height && height > 0 && !bmi) {
    const hM = height / 100;
    bmi = Math.round((weight / (hM * hM)) * 10) / 10;
  }

  let whr = waistHipRatio;
  if (waistCircumference && hipCircumference && hipCircumference > 0 && !whr) {
    whr = Math.round((waistCircumference / hipCircumference) * 100) / 100;
  }

  const record = await prisma.anthropometry.create({
    data: {
      measurementDate, weight, height, bmi,
      waistCircumference, hipCircumference, waistHipRatio: whr,
      armCircumference, thighCircumference, calfCircumference,
      tricepsSkinfold, bicepsSkinfold, subscapularSkinfold, suprailiacSkinfold,
      bodyFatPercentage, muscleMass, boneMass, waterPercentage,
      patientId: req.params.id,
    },
  });
  res.status(201).json(record);
};

// GET /api/patients/:id/anthropometry
export const getAnthropometry = async (req: Request, res: Response) => {
  const records = await prisma.anthropometry.findMany({
    where: { patientId: req.params.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(records);
};

// GET /api/patients/:id/dietary-habits
export const getDietaryHabits = async (req: Request, res: Response) => {
  const patient = await prisma.patient.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!patient) return res.status(404).json({ message: 'Paciente no encontrado' });
  const record = await prisma.dietaryHabits.findUnique({ where: { patientId: req.params.id } });
  res.json(record ?? null);
};

// POST /api/patients/:id/dietary-habits
export const saveDietaryHabits = async (req: Request, res: Response) => {
  const { id } = req.params;
  const record = await prisma.dietaryHabits.upsert({
    where: { patientId: id },
    update: req.body,
    create: { ...req.body, patientId: id },
  });
  res.json(record);
};

// POST /api/patients/:id/weekly-menu
export const saveWeeklyMenu = async (req: Request, res: Response) => {
  const { weekStartDate, observations, items } = req.body;
  const patientId = req.params.id;

  const menu = await prisma.weeklyMenu.create({
    data: {
      patientId,
      weekStartDate,
      observations,
      items: {
        create: items.map((item: any) => ({
          foodId: item.foodId,
          day: item.day,
          mealType: item.mealType,
          foodName: item.foodName,
          quantity: item.quantity,
          unit: item.unit,
          calories: item.calories,
          protein: item.protein,
          fats: item.fats,
          carbs: item.carbs,
          fiber: item.fiber,
        })),
      },
    },
    include: { items: true },
  });

  res.status(201).json(menu);
};
