import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

const signToken = (userId: string, role: string) =>
  jwt.sign({ userId, role }, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any,
  });

// POST /api/auth/login
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email y contraseña son requeridos' });
  }

  // Buscar en usuarios (admin/nutricionistas)
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && await bcrypt.compare(password, user.passwordHash)) {
    const token = signToken(user.id, user.role);
    return res.json({
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    });
  }

  // Buscar en pacientes
  const patient = await prisma.patient.findUnique({ where: { email } });
  if (patient && patient.passwordHash && await bcrypt.compare(password, patient.passwordHash)) {
    const token = signToken(patient.id, 'PATIENT');
    return res.json({
      token,
      user: {
        id: patient.id,
        email: patient.email,
        fullName: `${patient.firstName} ${patient.lastName}`,
        role: 'PATIENT',
      },
    });
  }

  return res.status(401).json({ message: 'Email o contraseña incorrectos' });
};

// GET /api/auth/me
export const getMe = async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, fullName: true, role: true, specialization: true, phone: true },
  });
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
  res.json(user);
};

// POST /api/auth/users  (solo admin — crear nutricionista)
export const createNutritionist = async (req: Request, res: Response) => {
  const { email, password, fullName, specialization, phone } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({ message: 'Email, contraseña y nombre son requeridos' });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ message: 'Este email ya está registrado' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, fullName, specialization, phone, role: 'NUTRITIONIST' },
    select: { id: true, email: true, fullName: true, role: true, specialization: true, phone: true, createdAt: true },
  });

  res.status(201).json(user);
};

// GET /api/auth/users  (solo admin)
export const getNutritionists = async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    where: { role: 'NUTRITIONIST' },
    select: { id: true, email: true, fullName: true, specialization: true, phone: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
};

// PUT /api/auth/users/:id  (solo admin)
export const updateNutritionist = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { email, password, fullName, specialization, phone } = req.body;

  const data: any = { email, fullName, specialization, phone };
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, fullName: true, specialization: true, phone: true },
  });

  res.json(user);
};

// DELETE /api/auth/users/:id  (solo admin)
export const deleteNutritionist = async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.user.delete({ where: { id } });
  res.status(204).send();
};
