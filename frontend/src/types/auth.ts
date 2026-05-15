export type Role = 'ADMIN' | 'NUTRITIONIST' | 'PATIENT';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  specialization?: string;
  phone?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface NutritionistForm {
  email: string;
  password: string;
  fullName: string;
  specialization?: string;
  phone?: string;
}
