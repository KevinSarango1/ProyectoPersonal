import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminExists = await prisma.user.findUnique({
    where: { email: 'admin@nutriapp.com' },
  });

  if (!adminExists) {
    await prisma.user.create({
      data: {
        email: 'admin@nutriapp.com',
        passwordHash: await bcrypt.hash(process.env.ADMIN_SEED_PASSWORD || 'Admin@NutriHealth2026!', 10),
        fullName: 'Administrador',
        role: 'ADMIN',
      },
    });
    console.log('Admin creado: admin@nutriapp.com');
  }

  const foodCount = await prisma.food.count();
  if (foodCount === 0) {
    await prisma.food.create({
      data: { name: 'Pollo Cocido', grossWeight: 200, netWeight: 180, energyKcal: 330, energyKj: 1381, protein: 29.6, fats: 23.2, carbohydrates: 0, fiber: 0 },
    });
    console.log('1 alimento inicial creado');
  }

  console.log('Seed completado');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
