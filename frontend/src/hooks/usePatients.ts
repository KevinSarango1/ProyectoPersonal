import { useState, useCallback } from 'react';
import { Patient, PatientForm } from '../types/patient';
import { patientService } from '../services/patientService';

export const usePatients = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await patientService.getAll();
      setPatients(data);
    } catch {
      setError('Error al cargar pacientes');
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (form: PatientForm): Promise<Patient> => {
    const patient = await patientService.create(form);
    setPatients(prev => [patient, ...prev]);
    return patient;
  }, []);

  const update = useCallback(async (id: string, form: Partial<PatientForm>): Promise<Patient> => {
    const updated = await patientService.update(id, form);
    setPatients(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
    return updated;
  }, []);

  const remove = useCallback(async (id: string) => {
    await patientService.delete(id);
    setPatients(prev => prev.filter(p => p.id !== id));
  }, []);

  return { patients, loading, error, fetchAll, create, update, remove };
};
