import api from './api';
import { LoginCredentials, LoginResponse, NutritionistForm, User } from '../types/auth';

export const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>('/auth/login', credentials);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem('user');
    return data ? JSON.parse(data) : null;
  },

  isAuthenticated: (): boolean => !!localStorage.getItem('token'),

  getNutritionists: async (): Promise<User[]> => {
    const { data } = await api.get<User[]>('/auth/users');
    return data;
  },

  createNutritionist: async (form: NutritionistForm): Promise<User> => {
    const { data } = await api.post<User>('/auth/users', form);
    return data;
  },

  updateNutritionist: async (id: string, form: Partial<NutritionistForm>): Promise<User> => {
    const { data } = await api.put<User>(`/auth/users/${id}`, form);
    return data;
  },

  deleteNutritionist: async (id: string): Promise<void> => {
    await api.delete(`/auth/users/${id}`);
  },
};
