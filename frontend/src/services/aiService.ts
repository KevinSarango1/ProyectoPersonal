import api from './api';

export const aiService = {
  // Generar recomendación nutricional
  generateRecommendation: async (patientData: {
    name: string;
    age: number;
    gender: string;
    weight: number;
    height: number;
    objective?: string;
  }): Promise<{ recommendation: string }> => {
    const { data } = await api.post<{ recommendation: string }>('/ai/recommendation', patientData);
    return data;
  },

  // Analizar un alimento
  analyzeFood: async (foodName: string, quantity: number): Promise<{ analysis: string }> => {
    const { data } = await api.post<{ analysis: string }>('/ai/analyze-food', {
      foodName,
      quantity,
    });
    return data;
  },

  // Generar plan de comidas
  generateMealPlan: async (preferences: {
    calories: number;
    restrictions?: string[];
    meals: number;
  }): Promise<{ mealPlan: string }> => {
    const { data } = await api.post<{ mealPlan: string }>('/ai/meal-plan', preferences);
    return data;
  },

  // Chat libre
  chat: async (message: string): Promise<{ reply: string }> => {
    const { data } = await api.post<{ reply: string }>('/ai/chat', { message });
    return data;
  },
};
