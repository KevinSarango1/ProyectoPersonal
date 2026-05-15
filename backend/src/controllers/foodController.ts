import { Request, Response } from 'express';
import prisma from '../config/database';

// GET /api/foods
export const getFoods = async (_req: Request, res: Response) => {
  const foods = await prisma.food.findMany({ orderBy: { name: 'asc' } });
  res.json(foods);
};

// POST /api/foods
export const createFood = async (req: Request, res: Response) => {
  const { name, description, grossWeight, netWeight, energyKcal, energyKj, protein, fats, carbohydrates, fiber } = req.body;

  if (!name || !grossWeight || !netWeight || !energyKcal) {
    return res.status(400).json({ message: 'Nombre, pesos y energía son requeridos' });
  }

  const food = await prisma.food.create({
    data: { name, description, grossWeight, netWeight, energyKcal, energyKj: energyKj || 0, protein: protein || 0, fats: fats || 0, carbohydrates: carbohydrates || 0, fiber: fiber || 0 },
  });

  res.status(201).json(food);
};

// PUT /api/foods/:id
export const updateFood = async (req: Request, res: Response) => {
  const food = await prisma.food.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(food);
};

// DELETE /api/foods/:id
export const deleteFood = async (req: Request, res: Response) => {
  await prisma.food.delete({ where: { id: req.params.id } });
  res.status(204).send();
};
