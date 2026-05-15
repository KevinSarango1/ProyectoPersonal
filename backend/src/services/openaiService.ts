import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const generateNutritionRecommendation = async (prompt: string) => {
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Eres un nutricionista profesional especializado en planes alimenticios saludables.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 500,
  });

  return response.choices[0].message.content;
};