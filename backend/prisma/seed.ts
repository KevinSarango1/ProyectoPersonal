import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { smaeFoods } from './smae_seed_data';

const prisma = new PrismaClient();

async function main() {
  // ── Admin user ─────────────────────────────────────────────────────────────
  const adminExists = await prisma.user.findUnique({
    where: { email: 'admin@nutriapp.com' },
  });

  if (!adminExists) {
    await prisma.user.create({
      data: {
        email: 'admin@nutriapp.com',
        passwordHash: await bcrypt.hash(
          process.env.ADMIN_SEED_PASSWORD || 'Admin@NutriHealth2026!',
          10,
        ),
        fullName: 'Administrador',
        role: 'ADMIN',
      },
    });
    console.log('Admin creado: admin@nutriapp.com');
  }

  // ── SMAE catalog ───────────────────────────────────────────────────────────
  const smaeCount = await prisma.food.count({ where: { source: 'SMAE' } });

  if (smaeCount === 0) {
    console.log(`Insertando ${smaeFoods.length} alimentos SMAE...`);

    // Batch insert in chunks of 100 for performance
    const CHUNK = 100;
    let inserted = 0;

    for (let i = 0; i < smaeFoods.length; i += CHUNK) {
      const chunk = smaeFoods.slice(i, i + CHUNK);
      await prisma.food.createMany({
        data: chunk.map((f) => ({
          name:            f.name,
          description:     `${f.grupoSmae}${f.subgrupoSmae ? ' — ' + f.subgrupoSmae : ''}`,
          grossWeight:     f.grossWeight,
          netWeight:       f.netWeight,
          energyKcal:      f.energyKcal,
          energyKj:        f.energyKj,
          protein:         f.protein,
          fats:            f.fats,
          carbohydrates:   f.carbohydrates,
          fiber:           f.fiber,
          grupoSmae:       f.grupoSmae,
          subgrupoSmae:    f.subgrupoSmae ?? null,
          porcionSugerida: f.porcionSugerida ?? null,
          unidadPorcion:   f.unidadPorcion ?? null,
          indiceGlucemico: f.indiceGlucemico ?? null,
          cargaGlucemica:  f.cargaGlucemica ?? null,
          source:          'SMAE',
        })),
        skipDuplicates: true,
      });
      inserted += chunk.length;
      process.stdout.write(`\r  ${inserted}/${smaeFoods.length}`);
    }

    console.log(`\n${inserted} alimentos SMAE insertados.`);
  } else {
    console.log(`SMAE ya cargado (${smaeCount} registros). Omitiendo.`);
  }

  console.log('Seed completado.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
