import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    const prompt = `
Genera una recomendación nutricional profesional para:

Nombre: ${patientData.name}
Edad: ${patientData.age}
Sexo: ${patientData.gender}
Peso: ${patientData.weight} kg
Altura: ${patientData.height} cm
Objetivo: ${patientData.objective || 'Salud general'}

Incluye:
- calorías recomendadas
- macronutrientes
- consejos saludables
- alimentos recomendados
`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un nutricionista profesional.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 500,
    });

    return response.choices[0].message.content;
  },

  // Analizar alimento
  analyzeFood: async (foodName: string, quantity: number) => {
    const prompt = `
Analiza nutricionalmente este alimento:

Alimento: ${foodName}
Cantidad: ${quantity} gramos

Incluye:
- calorías
- proteínas
- grasas
- carbohidratos
- recomendaciones
`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un nutricionista profesional.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 400,
    });

    return response.choices[0].message.content;
  },

  // Generar plan alimenticio
  generateMealPlan: async (preferences: {
    calories: number;
    restrictions?: string[];
    meals: number;
  }) => {
    const prompt = `
Genera un plan alimenticio diario:

Calorías: ${preferences.calories}
Restricciones: ${preferences.restrictions?.join(', ') || 'Ninguna'}
Número de comidas: ${preferences.meals}

Incluye desayuno, almuerzo, cena y snacks si aplica.
`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un nutricionista profesional.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 600,
    });

    return response.choices[0].message.content;
  },

  // Chat libre
  chat: async (message: string) => {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un nutricionista profesional especializado en planes alimenticios saludables. Responde en español de forma clara y concisa.',
        },
        {
          role: 'user',
          content: message,
        },
      ],
      max_tokens: 600,
    });
    return response.choices[0].message.content;
  },
};