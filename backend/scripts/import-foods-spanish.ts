import prisma from '../src/config/database';

const spanishFoods = [
  {
    name: 'Arroz Blanco Cocido',
    description: 'Arroz blanco cocido sin sal',
    grossWeight: 150,
    netWeight: 150,
    energyKcal: 130,
    energyKj: 544,
    protein: 2.7,
    fats: 0.3,
    carbohydrates: 28,
    fiber: 0.4,
  },
  {
    name: 'Pollo sin Piel',
    description: 'Pechuga de pollo cocida sin piel',
    grossWeight: 100,
    netWeight: 100,
    energyKcal: 165,
    energyKj: 690,
    protein: 31,
    fats: 3.6,
    carbohydrates: 0,
    fiber: 0,
  },
  {
    name: 'Brócoli Cocido',
    description: 'Brócoli cocido al vapor',
    grossWeight: 100,
    netWeight: 100,
    energyKcal: 34,
    energyKj: 142,
    protein: 2.8,
    fats: 0.4,
    carbohydrates: 7,
    fiber: 2.4,
  },
  {
    name: 'Plátano Maduro',
    description: 'Plátano maduro crudo',
    grossWeight: 120,
    netWeight: 100,
    energyKcal: 89,
    energyKj: 372,
    protein: 1.1,
    fats: 0.3,
    carbohydrates: 23,
    fiber: 2.6,
  },
  {
    name: 'Huevo Cocido',
    description: 'Huevo de gallina cocido',
    grossWeight: 50,
    netWeight: 50,
    energyKcal: 155,
    energyKj: 649,
    protein: 13,
    fats: 11,
    carbohydrates: 1.1,
    fiber: 0,
  },
  {
    name: 'Lechuga Verde',
    description: 'Lechuga fresca cruda',
    grossWeight: 100,
    netWeight: 100,
    energyKcal: 15,
    energyKj: 63,
    protein: 1.2,
    fats: 0.2,
    carbohydrates: 2.9,
    fiber: 1.3,
  },
  {
    name: 'Atún Enlatado',
    description: 'Atún enlatado en agua',
    grossWeight: 100,
    netWeight: 100,
    energyKcal: 95,
    energyKj: 397,
    protein: 21,
    fats: 1,
    carbohydrates: 0,
    fiber: 0,
  },
  {
    name: 'Manzana Roja',
    description: 'Manzana roja fresca sin semillas',
    grossWeight: 182,
    netWeight: 182,
    energyKcal: 52,
    energyKj: 217,
    protein: 0.3,
    fats: 0.2,
    carbohydrates: 14,
    fiber: 2.4,
  },
  {
    name: 'Leche Desnatada',
    description: 'Leche de vaca desnatada',
    grossWeight: 200,
    netWeight: 200,
    energyKcal: 66,
    energyKj: 276,
    protein: 6.6,
    fats: 0.2,
    carbohydrates: 9.9,
    fiber: 0,
  },
  {
    name: 'Papa Cocida',
    description: 'Papa cocida con agua sin sal',
    grossWeight: 150,
    netWeight: 150,
    energyKcal: 82,
    energyKj: 343,
    protein: 1.7,
    fats: 0.1,
    carbohydrates: 17,
    fiber: 1.5,
  },
];

async function importFoods() {
  try {
    console.log('🍽️ Iniciando importación de alimentos...\n');

    for (const food of spanishFoods) {
      const created = await prisma.food.create({ data: food });
      console.log(`✅ ${food.name} - ${created.energyKcal} kcal`);
    }

    console.log(`\n🎉 Se insertaron ${spanishFoods.length} alimentos exitosamente!`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importFoods();
