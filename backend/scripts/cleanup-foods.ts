import prisma from '../src/config/database';

const spanishFoodNames = [
  'Arroz Blanco Cocido',
  'Pollo sin Piel',
  'Brócoli Cocido',
  'Plátano Maduro',
  'Huevo Cocido',
  'Lechuga Verde',
  'Atún Enlatado',
  'Manzana Roja',
  'Leche Desnatada',
  'Papa Cocida',
];

async function cleanupFoods() {
  try {
    console.log('🗑️  Limpiando base de datos de alimentos...\n');

    // Obtener todos los alimentos
    const allFoods = await prisma.food.findMany();
    console.log(`Total de alimentos en BD: ${allFoods.length}`);

    // Eliminar todos excepto los 10 de ejemplo
    const foodsToDelete = allFoods.filter(f => !spanishFoodNames.includes(f.name));
    
    if (foodsToDelete.length === 0) {
      console.log('✅ No hay alimentos para eliminar, base de datos limpia.');
    } else {
      for (const food of foodsToDelete) {
        await prisma.food.delete({ where: { id: food.id } });
        console.log(`🗑️  Eliminado: ${food.name}`);
      }
      console.log(`\n✅ Se eliminaron ${foodsToDelete.length} alimentos`);
    }

    // Mostrar alimentos restantes
    const remainingFoods = await prisma.food.findMany();
    console.log(`\n📊 Alimentos restantes en BD: ${remainingFoods.length}`);
    remainingFoods.forEach(f => console.log(`  ✓ ${f.name}`));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupFoods();
