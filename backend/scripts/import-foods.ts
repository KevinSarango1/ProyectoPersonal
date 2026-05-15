import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createReadStream } from 'fs';
import prisma from '../src/config/database';

interface FoodRecord {
  fdc_id: string;
  description: string;
  food_category_id?: string;
  [key: string]: any;
}

interface NutrientRecord {
  fdc_id: string;
  nutrient_id: string;
  amount: string;
  [key: string]: any;
}

interface NutrientDef {
  id: string;
  name: string;
  unit_name: string;
  [key: string]: any;
}

// Map nutrient IDs to field names (USDA standard IDs)
const NUTRIENT_MAP: Record<string, string> = {
  '1008': 'energyKcal',      // Energy (kcal)
  '1062': 'energyKj',        // Energy (kJ)
  '1003': 'protein',         // Protein
  '1004': 'fats',            // Total lipid (fat)
  '1005': 'carbohydrates',   // Carbohydrate
  '1079': 'fiber',           // Fiber, total dietary
};

async function parseCSV(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const records: any[] = [];
    let isFirstLine = true;
    let headers: string[] = [];

    const stream = createReadStream(filePath, { encoding: 'utf8' });
    let buffer = '';

    stream.on('data', (chunk: string | Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      lines.forEach((line: string) => {
        if (!line.trim()) return;

        if (isFirstLine) {
          headers = parseCSVLine(line);
          isFirstLine = false;
        } else {
          const values = parseCSVLine(line);
          if (values.length === headers.length) {
            const record: any = {};
            headers.forEach((header, idx) => {
              record[header] = values[idx];
            });
            records.push(record);
          }
        }
      });
    });

    stream.on('end', () => {
      if (buffer.trim()) {
        const values = parseCSVLine(buffer);
        if (values.length === headers.length) {
          const record: any = {};
          headers.forEach((header, idx) => {
            record[header] = values[idx];
          });
          records.push(record);
        }
      }
      resolve(records);
    });

    stream.on('error', reject);
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

async function importFoods() {
  try {
    console.log('🚀 Iniciando importación de alimentos del USDA...\n');

    const basePath = path.join(
      process.env.HOME || process.env.USERPROFILE || '',
      'Downloads/foundation_foods/FoodData_Central_foundation_food_csv_2026-04-30'
    );

    const foodCsvPath = path.join(basePath, 'food.csv');
    const nutrientCsvPath = path.join(basePath, 'food_nutrient.csv');
    const nutrientDefPath = path.join(basePath, 'nutrient.csv');

    if (!fs.existsSync(foodCsvPath)) {
      throw new Error(`No se encontró: ${foodCsvPath}`);
    }

    console.log('📖 Leyendo alimentos...');
    const foods = await parseCSV(foodCsvPath);
    console.log(`   ✅ ${foods.length} alimentos cargados\n`);

    console.log('📊 Leyendo nutrientes...');
    const nutrients = await parseCSV(nutrientCsvPath);
    console.log(`   ✅ ${nutrients.length} registros de nutrientes cargados\n`);

    console.log('🏷️  Leyendo definiciones de nutrientes...');
    const nutrientDefs = await parseCSV(nutrientDefPath);
    console.log(`   ✅ ${nutrientDefs.length} definiciones de nutrientes cargadas\n`);

    // Create nutrient lookup
    const nutrientLookup: Record<string, Record<string, number>> = {};

    for (const nutrient of nutrients) {
      const fdcId = nutrient.fdc_id;
      const nutrientId = nutrient.nutrient_id;
      const amount = parseFloat(nutrient.amount) || 0;

      if (!nutrientLookup[fdcId]) {
        nutrientLookup[fdcId] = {};
      }

      // Map standard USDA nutrient IDs
      if (NUTRIENT_MAP[nutrientId]) {
        nutrientLookup[fdcId][NUTRIENT_MAP[nutrientId]] = amount;
      }
    }

    // Import foods
    let successCount = 0;
    let skipCount = 0;
    const batch: any[] = [];
    const BATCH_SIZE = 100;

    console.log('💾 Insertando alimentos en PostgreSQL...\n');

    for (let i = 0; i < foods.length; i++) {
      const food = foods[i];
      const nutrients = nutrientLookup[food.fdc_id] || {};

      const foodData = {
        name: food.description?.substring(0, 255) || 'Unnamed',
        description: food.food_category_id ? `Categoría: ${food.food_category_id}` : undefined,
        grossWeight: 100, // Default portion
        netWeight: 100,
        energyKcal: nutrients.energyKcal || 0,
        energyKj: nutrients.energyKj || 0,
        protein: nutrients.protein || 0,
        fats: nutrients.fats || 0,
        carbohydrates: nutrients.carbohydrates || 0,
        fiber: nutrients.fiber || 0,
      };

      // Skip foods without minimum data (al menos energía)
      if (foodData.energyKcal === 0 && foodData.energyKj === 0) {
        skipCount++;
        continue;
      }

      batch.push(foodData);

      if (batch.length >= BATCH_SIZE || i === foods.length - 1) {
        try {
          await prisma.food.createMany({
            data: batch,
            skipDuplicates: true,
          });
          successCount += batch.length;
          console.log(`   ✅ ${successCount} alimentos insertados (${Math.round((successCount / (foods.length - skipCount)) * 100)}%)`);
          batch.length = 0;
        } catch (err: any) {
          console.error(`   ❌ Error en lote: ${err.message}`);
        }
      }
    }

    console.log(`\n✨ Importación completada:`);
    console.log(`   ✅ Insertados: ${successCount}`);
    console.log(`   ⏭️  Saltados (sin nutrientes): ${skipCount}`);
    console.log(`   📊 Total procesados: ${foods.length}\n`);

    // Show sample
    const sample = await prisma.food.findMany({ take: 5 });
    console.log('📋 Muestra de alimentos importados:');
    sample.forEach((f) => {
      console.log(`   • ${f.name} - ${f.energyKcal} kcal`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importFoods();
