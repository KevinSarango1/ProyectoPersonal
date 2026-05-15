import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

// GET /api/patients
export const getPatients = async (req: AuthRequest, res: Response) => {
  const patients = await prisma.patient.findMany({
    select: {
      id: true, firstName: true, lastName: true, email: true,
      phone: true, dateOfBirth: true, gender: true, createdAt: true,
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

  const { passwordHash, ...safe } = patient as any;
  res.json(safe);
};

// POST /api/patients
export const createPatient = async (req: Request, res: Response) => {
  const { firstName, lastName, email, password, phone, dateOfBirth, gender, address, occupation } = req.body;

  if (!firstName || !lastName || !email || !password || !dateOfBirth || !gender) {
    return res.status(400).json({ message: 'Faltan campos requeridos' });
  }

  const exists = await prisma.patient.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ message: 'Este email ya está registrado' });

  const passwordHash = await bcrypt.hash(password, 10);
  const patient = await prisma.patient.create({
    data: {
      firstName, lastName, email, passwordHash, phone, dateOfBirth,
      gender, address, occupation,
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
      id: true, firstName: true, lastName: true, email: true,
      phone: true, dateOfBirth: true, gender: true, createdAt: true,
    },
  });

  res.status(201).json(patient);
};

// PUT /api/patients/:id
export const updatePatient = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { firstName, lastName, email, password, phone, dateOfBirth, gender, address, occupation } = req.body;

  if (email) {
    const exists = await prisma.patient.findFirst({ where: { email, NOT: { id } } });
    if (exists) return res.status(409).json({ message: 'Este email ya está en uso' });
  }

  const data: any = { firstName, lastName, email, phone, dateOfBirth, gender, address, occupation };
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

  const patient = await prisma.patient.update({
    where: { id },
    data,
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, dateOfBirth: true, gender: true },
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
  const data = req.body;

  const history = await prisma.clinicalHistory.upsert({
    where: { patientId: id },
    update: data,
    create: { ...data, patientId: id },
  });

  res.json(history);
};

// POST /api/patients/:id/biometrics
export const addBiometrics = async (req: Request, res: Response) => {
  const record = await prisma.biometrics.create({
    data: { ...req.body, patientId: req.params.id },
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
  const data = { ...req.body, patientId: req.params.id };

  if (data.weight && data.height && data.height > 0 && !data.bmi) {
    const hM = data.height / 100;
    data.bmi = Math.round((data.weight / (hM * hM)) * 10) / 10;
  }

  if (data.waistCircumference && data.hipCircumference && data.hipCircumference > 0 && !data.waistHipRatio) {
    data.waistHipRatio = Math.round((data.waistCircumference / data.hipCircumference) * 100) / 100;
  }

  const record = await prisma.anthropometry.create({ data });
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
