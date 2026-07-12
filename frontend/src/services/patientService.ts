import api from './api';
import {
  Patient, PatientForm,
  ClinicalHistory, Biometrics, Anthropometry, WeeklyMenu,
} from '../types/patient';

export const patientService = {
  getAll: async (): Promise<Patient[]> => {
    const { data } = await api.get<Patient[]>('/patients');
    return data;
  },

  getById: async (id: string): Promise<Patient> => {
    const { data } = await api.get<Patient>(`/patients/${id}`);
    return data;
  },

  create: async (form: PatientForm): Promise<Patient> => {
    const { data } = await api.post<Patient>('/patients', form);
    return data;
  },

  update: async (id: string, form: Partial<PatientForm>): Promise<Patient> => {
    const { data } = await api.put<Patient>(`/patients/${id}`, form);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/patients/${id}`);
  },

  // Historia clínica
  updateClinicalHistory: async (id: string, history: Partial<ClinicalHistory>): Promise<ClinicalHistory> => {
    const { data } = await api.put<ClinicalHistory>(`/patients/${id}/clinical-history`, history);
    return data;
  },

  // Biometría
  addBiometrics: async (id: string, record: Omit<Biometrics, 'id' | 'patientId' | 'createdAt'>): Promise<Biometrics> => {
    const { data } = await api.post<Biometrics>(`/patients/${id}/biometrics`, record);
    return data;
  },

  getBiometricsHistory: async (id: string): Promise<Biometrics[]> => {
    const { data } = await api.get<Biometrics[]>(`/patients/${id}/biometrics/history`);
    return data;
  },

  // Antropometría
  addAnthropometry: async (id: string, record: Omit<Anthropometry, 'id' | 'patientId' | 'createdAt'>): Promise<Anthropometry> => {
    const { data } = await api.post<Anthropometry>(`/patients/${id}/anthropometry`, record);
    return data;
  },

  getAnthropometryHistory: async (id: string): Promise<Anthropometry[]> => {
    const { data } = await api.get<Anthropometry[]>(`/patients/${id}/anthropometry/history`);
    return data;
  },

  // Hábitos dietéticos
  getDietaryHabits: async (id: string): Promise<any> => {
    const { data } = await api.get(`/patients/${id}/dietary-habits`);
    return data;
  },

  saveDietaryHabits: async (id: string, habits: any): Promise<any> => {
    const { data } = await api.post(`/patients/${id}/dietary-habits`, habits);
    return data;
  },

  // Menú semanal
  saveWeeklyMenu: async (id: string, menu: Omit<WeeklyMenu, 'id' | 'patientId' | 'createdAt'>): Promise<WeeklyMenu> => {
    const { data } = await api.post<WeeklyMenu>(`/patients/${id}/weekly-menu`, menu);
    return data;
  },
};
