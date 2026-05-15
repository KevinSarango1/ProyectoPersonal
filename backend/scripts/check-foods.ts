import prisma from '../src/config/database';

async function checkFoods() {
  try {
    const foods = await prisma.food.findMany();
    console.log(`\n📊 Total de alimentos en BD: ${foods.length}\n`);
    
    if (foods.length === 0) {
      console.log('❌ No hay alimentos registrados\n');
    } else {
      console.log('Alimentos registrados:');
      foods.forEach((f, i) => {
        console.log(`${i + 1}. ${f.name} - ${f.energyKcal} kcal`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFoods();
