import api from './api';
import { Food } from '../types/patient';

export interface SmaeGroups {
  [grupo: string]: (string | null)[];
}

export const foodService = {
  getAll: async (params?: { search?: string; grupo?: string; source?: string; limit?: number }): Promise<Food[]> => {
    const { data } = await api.get<Food[]>('/foods', { params });
    return data;
  },

  getSmae: async (grupo?: string): Promise<Food[]> => {
    return foodService.getAll({ source: 'smae', grupo, limit: 500 });
  },

  getSmaeGroups: async (): Promise<SmaeGroups> => {
    const { data } = await api.get<SmaeGroups>('/foods/smae-groups');
    return data;
  },

  getById: async (id: string): Promise<Food> => {
    const { data } = await api.get<Food>(`/foods/${id}`);
    return data;
  },

  create: async (food: Omit<Food, 'id' | 'createdAt' | 'updatedAt'>): Promise<Food> => {
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
