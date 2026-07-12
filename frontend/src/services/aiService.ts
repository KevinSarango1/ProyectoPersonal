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

  // Chat libre (con historial por paciente y contexto clínico opcional)
  chat: async (message: string, patientId?: string | null, patientContext?: string): Promise<{ reply: string }> => {
    const { data } = await api.post<{ reply: string }>('/ai/chat', { message, patientId, patientContext });
    return data;
  },

  // Historial de chat por paciente
  getChatHistory: async (patientId: string): Promise<{ id: string; role: string; content: string; fileName?: string; createdAt: string }[]> => {
    const { data } = await api.get(`/ai/chat-history/${patientId}`);
    return data;
  },

  // Limpiar historial de chat
  clearChatHistory: async (patientId: string): Promise<void> => {
    await api.delete(`/ai/chat-history/${patientId}`);
  },

  // Chat con documento PDF/TXT (RAG)
  chatWithFile: async (message: string, file: File, patientId?: string | null): Promise<{ reply: string; fileName: string }> => {
    const form = new FormData();
    form.append('file', file);
    if (message) form.append('message', message);
    if (patientId) form.append('patientId', patientId);
    const { data } = await api.post('/ai/chat-upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
