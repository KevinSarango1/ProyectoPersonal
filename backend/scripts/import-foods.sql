-- Script para importar alimentos del USDA Foundation Foods a NutriApp
-- Este script SQL importa directamente desde los datos del USDA

BEGIN;

-- Temporary tables
CREATE TEMP TABLE food_import AS
SELECT 
  f.fdc_id::text as fdc_id,
  SUBSTRING(f.description FROM 1 FOR 255) as name,
  f.food_category_id::text as category
FROM (
  -- Read food.csv
  -- Necesita el archivo food.csv como input
  SELECT * FROM pg_read_csv('food.csv')
) f;

-- Import foods with energy data
INSERT INTO foods (name, description, grossWeight, netWeight, energyKcal, energyKj, protein, fats, carbohydrates, fiber)
SELECT DISTINCT
  COALESCE(f.description, 'Unknown Food')::text as name,
  f.food_category_id::text as description,
  100.0 as grossWeight,
  100.0 as netWeight,
  COALESCE(MAX(CASE WHEN fn.nutrient_id = '1008' THEN fn.amount::float END), 0) as energyKcal,
  COALESCE(MAX(CASE WHEN fn.nutrient_id = '1062' THEN fn.amount::float END), 0) as energyKj,
  COALESCE(MAX(CASE WHEN fn.nutrient_id = '1003' THEN fn.amount::float END), 0) as protein,
  COALESCE(MAX(CASE WHEN fn.nutrient_id = '1004' THEN fn.amount::float END), 0) as fats,
  COALESCE(MAX(CASE WHEN fn.nutrient_id = '1005' THEN fn.amount::float END), 0) as carbohydrates,
  COALESCE(MAX(CASE WHEN fn.nutrient_id = '1079' THEN fn.amount::float END), 0) as fiber
FROM food_import f
GROUP BY f.fdc_id, f.name, f.category
ON CONFLICT DO NOTHING;

COMMIT;

-- Ver resultados
SELECT COUNT(*) as total_foods, 
       AVG(energyKcal) as avg_kcal,
       COUNT(DISTINCT name) as unique_foods
FROM foods;
