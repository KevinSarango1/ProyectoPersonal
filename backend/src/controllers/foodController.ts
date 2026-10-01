import { Request, Response } from 'express';
import prisma from '../config/database';

// GET /api/foods?search=&grupo=&source=smae&limit=50&offset=0
export const getFoods = async (req: Request, res: Response) => {
  const { search, grupo, source, limit = '200', offset = '0' } = req.query as Record<string, string>;

  const where: any = {};

  if (search?.trim()) {
    where.name = { contains: search.trim(), mode: 'insensitive' };
  }
  if (grupo?.trim()) {
    where.grupoSmae = { contains: grupo.trim(), mode: 'insensitive' };
  }
  if (source?.toLowerCase() === 'smae') {
    where.source = 'SMAE';
  }

  const foods = await prisma.food.findMany({
    where,
    orderBy: [{ grupoSmae: 'asc' }, { name: 'asc' }],
    take: Math.min(parseInt(limit) || 200, 3000),
    skip: parseInt(offset) || 0,
  });

  res.json(foods);
};

// GET /api/foods/smae-groups — lista los grupos SMAE disponibles
export const getSmaeGroups = async (_req: Request, res: Response) => {
  const rows = await prisma.food.findMany({
    where: { source: 'SMAE', grupoSmae: { not: null } },
    select: { grupoSmae: true, subgrupoSmae: true },
    distinct: ['grupoSmae', 'subgrupoSmae'],
    orderBy: { grupoSmae: 'asc' },
  });

  // Build hierarchy: { grupo: subgrupos[] }
  const hierarchy: Record<string, (string | null)[]> = {};
  for (const row of rows) {
    const g = row.grupoSmae!;
    if (!hierarchy[g]) hierarchy[g] = [];
    if (!hierarchy[g].includes(row.subgrupoSmae)) {
      hierarchy[g].push(row.subgrupoSmae);
    }
  }

  res.json(hierarchy);
};

// GET /api/foods/:id
export const getFoodById = async (req: Request, res: Response) => {
  const food = await prisma.food.findUnique({ where: { id: req.params.id } });
  if (!food) return res.status(404).json({ message: 'Alimento no encontrado' });
  res.json(food);
};

// POST /api/foods
export const createFood = async (req: Request, res: Response) => {
  const {
    name, description,
    grossWeight, netWeight, energyKcal, energyKj,
    protein, fats, carbohydrates, fiber,
    grupoSmae, subgrupoSmae, porcionSugerida, unidadPorcion,
    indiceGlucemico, cargaGlucemica,
  } = req.body;

  if (!name || grossWeight == null || netWeight == null || energyKcal == null) {
    return res.status(400).json({ message: 'Nombre, pesos y energía son requeridos' });
  }

  const food = await prisma.food.create({
    data: {
      name, description,
      grossWeight, netWeight,
      energyKcal, energyKj: energyKj || 0,
      protein: protein || 0, fats: fats || 0,
      carbohydrates: carbohydrates || 0, fiber: fiber || 0,
      grupoSmae: grupoSmae || null,
      subgrupoSmae: subgrupoSmae || null,
      porcionSugerida: porcionSugerida ?? null,
      unidadPorcion: unidadPorcion || null,
      indiceGlucemico: indiceGlucemico ?? null,
      cargaGlucemica: cargaGlucemica ?? null,
      source: null,
    },
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
