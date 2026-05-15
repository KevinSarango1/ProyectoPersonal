import api from './api';
import { Food } from '../types/patient';

export const foodService = {
  getAll: async (): Promise<Food[]> => {
    const { data } = await api.get<Food[]>('/foods');
    return data;
  },

  create: async (food: Omit<Food, 'id'>): Promise<Food> => {
    const { data } = await api.post<Food>('/foods', food);
    return data;
  },

  update: async (id: string, food: Partial<Food>): Promise<Food> => {
    const { data } = await api.put<Food>(`/foods/${id}`, food);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/foods/${id}`);
  },
};
