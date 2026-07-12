import OpenAI from 'openai';

// Groq provee modelos open-source (Qwen, Llama) con API compatible con OpenAI
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const MODEL = 'llama-3.3-70b-versatile';

const BASE_SYSTEM = `Eres un asistente clínico de IA integrado en NutriApp, un sistema de gestión nutricional para profesionales de la salud. El usuario que te consulta es un NUTRICIONISTA LICENCIADO que gestiona pacientes con este sistema. \
Por lo tanto: NUNCA digas "consulta con un profesional", "visita a tu médico", "habla con un especialista" ni ninguna advertencia de ese tipo — quien te habla ya es el profesional calificado y toma las decisiones clínicas finales. \
Tu rol es asistirlo técnicamente: sugerir planes alimenticios detallados, interpretar datos clínicos y biométricos, y generar recomendaciones específicas con valores concretos. \
IMPORTANTE: Los datos clínicos del paciente se te entregan en el contexto del sistema — NO los repitas, NO los vuelvas a calcular ni a enlistar salvo que el nutricionista lo pida explícitamente. Ve directo a la respuesta o recomendación solicitada. \
Responde siempre en español, de forma técnica, directa y concisa.`;

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
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: BASE_SYSTEM,
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
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: BASE_SYSTEM,
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
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: BASE_SYSTEM,
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
      max_tokens: 800,
    });
    return response.choices[0].message.content;
  },

  // Chat libre (con contexto opcional del paciente e historial de conversación)
  chat: async (
    message: string,
    patientContext?: string,
    history?: { role: 'user' | 'assistant'; content: string }[],
  ) => {
    const systemContent = patientContext
      ? `${BASE_SYSTEM}\n\nDatos clínicos del paciente en consulta (referencia — no los repitas):\n\n${patientContext}`
      : BASE_SYSTEM;

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemContent },
        ...(history ?? []),
        { role: 'user', content: message },
      ],
      max_tokens: 700,
    });
    return response.choices[0].message.content;
  },
};