import OpenAI from 'openai';
import prisma from '../config/database';

// Groq provee modelos open-source (Qwen, Llama) con API compatible con OpenAI
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// openai/gpt-oss-120b: 120B params, 8000 TPM, best available model on this account.
const MODEL = 'openai/gpt-oss-120b';

// Compact system prompt: fewer tokens → more focused responses within the OTPM limit.
const BASE_SYSTEM = `Eres un asistente clínico IA de NutriApp para nutricionistas licenciados.

REGLAS: El usuario ES el profesional — NUNCA digas "consulta a un médico". Los datos clínicos ya están en el contexto; no los repitas. Responde en español técnico.

FORMATO OBLIGATORIO:
- Tablas markdown (| col | col |) para valores numéricos. Encabezados ## para secciones.
- Cálculos en UNA línea: GEB × FA = 1583 × 1.2 = **1900 kcal**.
- PROHIBIDO LaTeX ($$ \\times). Usa: × ÷ ≈ ± ≤ ≥ →
- Sin introducción ni resumen final. Directo al resultado.

CAPACIDADES: Mifflin-St Jeor, Harris-Benedict, FAO/OMS; SMAE 4a ed. (grupos, porciones, IG/CG); bioquímica (glucémico HbA1c/HOMA, lipídico CT/LDL/HDL/TG, hepático AST/ALT, renal Cr/BUN/TFG, hematológico); IMC, ICC, %GC Durnin-Womersley/Siri/Lean. Integra todas las condiciones activas del paciente.`;

// Builds a compact SMAE reference block fetching PER-GROUP to ensure all groups are represented.
// A global take() would only return foods from the first alphabetical group (Aceites y grasas).
async function buildSmaeContext(grupos?: string[]): Promise<string> {
  const targetGroups = grupos ?? [
    'Verduras', 'Frutas', 'Cereales', 'Leguminosas', 'AOA', 'Leche', 'Aceites y grasas',
  ];
  const perGroup = 10; // 7 groups × 10 = 70 foods — good coverage without token overflow

  const select = {
    name: true,
    grupoSmae: true,
    subgrupoSmae: true,
    porcionSugerida: true,
    unidadPorcion: true,
    energyKcal: true,
    protein: true,
    fats: true,
    carbohydrates: true,
    fiber: true,
    indiceGlucemico: true,
  };

  const perGroupResults = await Promise.all(
    targetGroups.map(g =>
      prisma.food.findMany({
        where: { source: 'SMAE', grupoSmae: g },
        select,
        orderBy: { name: 'asc' },
        take: perGroup,
      })
    )
  );

  const foods = perGroupResults.flat();
  if (!foods.length) return '';

  const lines: string[] = ['[Base SMAE 4a. ed. — alimentos disponibles]'];
  let lastGroup = '';
  for (const f of foods) {
    const g = `${f.grupoSmae}${f.subgrupoSmae ? ' / ' + f.subgrupoSmae : ''}`;
    if (g !== lastGroup) { lines.push(`\n## ${g}`); lastGroup = g; }
    const porcion = f.porcionSugerida != null && f.unidadPorcion
      ? `${f.porcionSugerida} ${f.unidadPorcion}`
      : '';
    const ig = f.indiceGlucemico != null ? ` IG:${f.indiceGlucemico}` : '';
    lines.push(
      `- ${f.name}${porcion ? ' (' + porcion + ')' : ''}: ` +
      `${f.energyKcal}kcal P:${f.protein}g G:${f.fats}g HC:${f.carbohydrates}g Fib:${f.fiber}g${ig}`
    );
  }

  return lines.join('\n');
}

export const aiService = {
  // Generar recomendación nutricional
  generateNutritionRecommendation: async (patientData: {
    name: string;
    age: number;
    gender: string;
    weight: number;
    height: number;
    objective?: string;
  }) => {
    const smaeCtx = await buildSmaeContext([
      'Verduras', 'Frutas', 'Cereales', 'Leguminosas', 'AOA', 'Leche',
    ]);

    const systemContent = smaeCtx
      ? `${BASE_SYSTEM}\n\n${smaeCtx}`
      : BASE_SYSTEM;

    const prompt = `
Genera una recomendación nutricional profesional usando equivalentes SMAE para:

Nombre: ${patientData.name}
Edad: ${patientData.age}
Sexo: ${patientData.gender}
Peso: ${patientData.weight} kg
Altura: ${patientData.height} cm
Objetivo: ${patientData.objective || 'Salud general'}

Incluye:
- GET estimado (kcal/día)
- Distribución de macros
- Número de equivalentes por grupo SMAE
- Alimentos concretos del catálogo SMAE con su porción sugerida
`;

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: prompt },
      ],
      max_tokens: 4000,
      temperature: 0.3,
    });

    return response.choices[0].message.content;
  },

  // Analizar alimento
  analyzeFood: async (foodName: string, quantity: number) => {
    // Look up in SMAE catalog first
    const dbFood = await prisma.food.findFirst({
      where: { name: { contains: foodName, mode: 'insensitive' }, source: 'SMAE' },
    });

    const extraCtx = dbFood
      ? `\n\nEste alimento está en el catálogo SMAE:\n` +
        `- Grupo: ${dbFood.grupoSmae}${dbFood.subgrupoSmae ? ' / ' + dbFood.subgrupoSmae : ''}\n` +
        `- Porción equivalente: ${dbFood.porcionSugerida ?? '—'} ${dbFood.unidadPorcion ?? ''} (${dbFood.netWeight}g neto)\n` +
        `- Por equivalente: ${dbFood.energyKcal}kcal, P:${dbFood.protein}g, G:${dbFood.fats}g, HC:${dbFood.carbohydrates}g, Fib:${dbFood.fiber}g\n` +
        `- Cantidad solicitada: ${quantity}g`
      : '';

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: BASE_SYSTEM + extraCtx },
        {
          role: 'user',
          content: `Analiza nutricionalmente: ${foodName} (${quantity} gramos). Incluye equivalentes SMAE si aplica.`,
        },
      ],
      max_tokens: 4000,
      temperature: 0.3,
    });

    return response.choices[0].message.content;
  },

  // Generar plan alimenticio con equivalentes SMAE
  generateMealPlan: async (preferences: {
    calories: number;
    restrictions?: string[];
    meals: number;
  }) => {
    const smaeCtx = await buildSmaeContext();

    const systemContent = smaeCtx
      ? `${BASE_SYSTEM}\n\n${smaeCtx}`
      : BASE_SYSTEM;

    const prompt = `
Genera un plan alimenticio diario usando equivalentes SMAE:

Calorías objetivo: ${preferences.calories} kcal
Restricciones: ${preferences.restrictions?.join(', ') || 'Ninguna'}
Número de comidas: ${preferences.meals}

Para cada tiempo de comida indica:
1. Nombre del platillo/preparación
2. Alimentos en porciones SMAE concretas (usa nombres del catálogo disponible)
3. Total kcal, proteínas, grasas e hidratos del tiempo
4. Total diario
`;

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: prompt },
      ],
      max_tokens: 4000,
      temperature: 0.3,
    });

    return response.choices[0].message.content;
  },

  // Chat con documento — RAG pipeline
  chatWithDocument: async (message: string, documentText: string, fileName: string) => {
    const systemPrompt = documentText
      ? `${BASE_SYSTEM}\n\nSe te ha proporcionado el documento "${fileName}" como contexto:\n\n---\n${documentText}\n---\n\nResponde basándote en el documento y los datos clínicos disponibles.`
      : BASE_SYSTEM;

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      max_tokens: 4000,
      temperature: 0.3,
    });
    return response.choices[0].message.content;
  },

  // Chat libre (con contexto opcional del paciente e historial)
  chat: async (
    message: string,
    patientContext?: string,
    history?: { role: 'user' | 'assistant'; content: string }[],
  ) => {
    // Inject SMAE context when message mentions nutrition/plan/alimento keywords
    const nutritionKeywords = /plan|aliment|SMAE|equivalente|menú|menú|dieta|kcal|macros?|cereal|verdura|fruta|proteína|legum/i;
    let smaeSnippet = '';
    if (nutritionKeywords.test(message)) {
      smaeSnippet = await buildSmaeContext(); // uses all 7 groups, 10 per group
    }

    const systemContent = [
      BASE_SYSTEM,
      patientContext
        ? `\nDatos clínicos del paciente en consulta (referencia — no los repitas):\n\n${patientContext}`
        : '',
      smaeSnippet
        ? `\n\n${smaeSnippet}`
        : '',
    ].join('');

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemContent },
        ...(history ?? []),
        { role: 'user', content: message },
      ],
      max_tokens: 4000,
      temperature: 0.3,
    });
    return response.choices[0].message.content;
  },
};
